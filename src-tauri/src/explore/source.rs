use engram::{
    RetrievalOutcome, RetrievalRequest, Retrieved, Source, SourceFuture, ValidationMetadata,
    ValidationOutcome, ValidationRequest,
};
use reqwest::{Client, Response, StatusCode, Url, header};
use serde::de::DeserializeOwned;
use std::{
    marker::PhantomData,
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::{Mutex, Semaphore};

pub type OriginError = std::io::Error;
pub fn origin_error(message: impl Into<String>) -> OriginError {
    OriginError::other(message.into())
}

#[derive(Clone)]
pub struct Transport {
    client: Client,
    images: Client,
    downloads: Client,
    permits: Arc<Semaphore>,
    image_slots: Arc<Semaphore>,
    retry_at: Arc<AtomicU64>,
}

impl Transport {
    pub fn new() -> Result<Self, OriginError> {
        let builder = || {
            Client::builder()
                .user_agent(concat!(
                    "Izyawastaken/Tachyon/",
                    env!("CARGO_PKG_VERSION"),
                    " (https://github.com/Izyawastaken/Tachyon)"
                ))
                .timeout(Duration::from_secs(15))
                .connect_timeout(Duration::from_secs(5))
                .pool_idle_timeout(Duration::from_secs(60))
        };
        let client = builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| origin_error(e.to_string()))?;
        // Descriptions can reference creator-hosted banners. Validate DNS at
        // connection time, including every redirect, to keep private hosts out.
        let images = builder()
            .https_only(true)
            .no_proxy()
            .dns_resolver(Arc::new(super::media::PublicImageDns))
            .redirect(reqwest::redirect::Policy::custom(|attempt| {
                if attempt.previous().len() >= 3
                    || super::media::media_url(attempt.url().as_str()).is_err()
                {
                    attempt.error("Unsupported image redirect")
                } else {
                    attempt.follow()
                }
            }))
            .build()
            .map_err(|e| origin_error(e.to_string()))?;
        let downloads = builder()
            .timeout(Duration::from_secs(600))
            .read_timeout(Duration::from_secs(30))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| origin_error(e.to_string()))?;
        Ok(Self {
            client,
            images,
            downloads,
            permits: Arc::new(Semaphore::new(6)),
            image_slots: Arc::new(Semaphore::new(2)),
            retry_at: Arc::new(AtomicU64::new(0)),
        })
    }

    pub(super) async fn download_response(
        &self,
        url: Url,
    ) -> Result<(Response, tokio::sync::OwnedSemaphorePermit), OriginError> {
        let permit = self
            .permits
            .clone()
            .acquire_owned()
            .await
            .map_err(|_| origin_error("Catalog is closing."))?;
        let response = self
            .downloads
            .get(url)
            .header(header::ACCEPT_ENCODING, "identity")
            .send()
            .await
            .map_err(|_| {
                origin_error("Could not start the download. Check your connection and retry.")
            })?;
        let response = response
            .error_for_status()
            .map_err(|_| origin_error("The release file is unavailable."))?;
        if response.status() != StatusCode::OK {
            return Err(origin_error("The release file could not be downloaded."));
        }
        Ok((response, permit))
    }

    pub async fn get_image(&self, url: Url) -> Result<WireResponse, OriginError> {
        let _permit = self
            .permits
            .acquire()
            .await
            .map_err(|_| origin_error("Catalog is closing."))?;
        let response = self
            .images
            .get(url)
            .send()
            .await
            .map_err(|_| origin_error("Could not load the project image."))?;
        let status = response.status();
        if status != StatusCode::NOT_FOUND && !status.is_success() {
            return Err(origin_error("The project image is unavailable."));
        }
        Ok(WireResponse {
            status,
            metadata: ValidationMetadata::default(),
            bytes: bounded_body(response, 32 * 1024 * 1024).await?,
        })
    }

    pub async fn image_permit(&self) -> Result<tokio::sync::SemaphorePermit<'_>, OriginError> {
        self.image_slots
            .acquire()
            .await
            .map_err(|_| origin_error("Catalog is closing."))
    }

    pub async fn get(
        &self,
        url: Url,
        validation: Option<&ValidationMetadata>,
        max_bytes: usize,
    ) -> Result<WireResponse, OriginError> {
        let _permit = self
            .permits
            .acquire()
            .await
            .map_err(|_| origin_error("Catalog is closing."))?;
        if now() < self.retry_at.load(Ordering::Relaxed) {
            return Err(origin_error("The catalog is busy. Try again shortly."));
        }
        let mut request = self
            .client
            .get(url)
            .header("X-Client", concat!("Tachyon/", env!("CARGO_PKG_VERSION")));
        if let Some(meta) = validation {
            if let Some(etag) = &meta.etag {
                request = request.header(header::IF_NONE_MATCH, etag);
            }
            if let Ok(modified) = std::str::from_utf8(&meta.opaque)
                && !modified.is_empty()
            {
                request = request.header(header::IF_MODIFIED_SINCE, modified);
            }
        }
        let response = request.send().await.map_err(|_| {
            origin_error("Could not reach the catalog. Check your connection and retry.")
        })?;
        if matches!(
            response.status(),
            StatusCode::TOO_MANY_REQUESTS | StatusCode::SERVICE_UNAVAILABLE
        ) {
            let delay = response
                .headers()
                .get(header::RETRY_AFTER)
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(30)
                .max(1);
            self.retry_at
                .store(now().saturating_add(delay), Ordering::Relaxed);
            return Err(origin_error("The catalog is busy. Try again shortly."));
        }
        let status = response.status();
        let metadata = ValidationMetadata {
            etag: response
                .headers()
                .get(header::ETAG)
                .and_then(|v| v.to_str().ok())
                .map(str::to_owned),
            opaque: response
                .headers()
                .get(header::LAST_MODIFIED)
                .map(|v| v.as_bytes().to_vec())
                .unwrap_or_default(),
            ..Default::default()
        };
        if status != StatusCode::NOT_MODIFIED
            && status != StatusCode::NOT_FOUND
            && !status.is_success()
        {
            return Err(origin_error(format!(
                "The catalog returned {}. Try again later.",
                status.as_u16()
            )));
        }
        let bytes = bounded_body(response, max_bytes).await?;
        Ok(WireResponse {
            status,
            metadata,
            bytes,
        })
    }
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

async fn bounded_body(mut response: Response, limit: usize) -> Result<Vec<u8>, OriginError> {
    if response
        .content_length()
        .is_some_and(|size| size > limit as u64)
    {
        return Err(origin_error("Catalog response exceeds the size limit."));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| origin_error("Catalog response was interrupted."))?
    {
        if bytes.len() + chunk.len() > limit {
            return Err(origin_error("Catalog response exceeds the size limit."));
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}

pub struct WireResponse {
    pub status: StatusCode,
    pub metadata: ValidationMetadata,
    pub bytes: Vec<u8>,
}

pub struct JsonSource<T> {
    transport: Transport,
    url: Url,
    pending: Mutex<Option<RetrievalOutcome<T>>>,
    marker: PhantomData<T>,
}

impl<T: DeserializeOwned> JsonSource<T> {
    pub fn new(transport: Transport, url: Url) -> Self {
        Self {
            transport,
            url,
            pending: Mutex::new(None),
            marker: PhantomData,
        }
    }
    fn decode(wire: WireResponse) -> Result<RetrievalOutcome<T>, OriginError> {
        if wire.status == StatusCode::NOT_FOUND {
            return Ok(RetrievalOutcome::NotFound);
        }
        let value = serde_json::from_slice(&wire.bytes)
            .map_err(|_| origin_error("The catalog returned an unreadable catalog response."))?;
        Ok(RetrievalOutcome::Retrieved(Retrieved {
            value,
            validation: Some(wire.metadata),
        }))
    }
}

impl<T: DeserializeOwned + Send + Sync> Source<T> for JsonSource<T> {
    type Error = OriginError;
    fn validate<'a>(
        &'a self,
        request: ValidationRequest<'a, T>,
    ) -> SourceFuture<'a, Result<ValidationOutcome, OriginError>> {
        Box::pin(async move {
            let wire = match self
                .transport
                .get(self.url.clone(), request.validation, 6 * 1024 * 1024)
                .await
            {
                Ok(wire) => wire,
                Err(_) => return Ok(ValidationOutcome::Unavailable),
            };
            if wire.status == StatusCode::NOT_MODIFIED {
                // A 304 need not repeat its validators. Keep those retained by
                // Engram, otherwise the next V1 would fall back to a full GET.
                let mut metadata = wire.metadata;
                if let Some(previous) = request.validation {
                    if metadata.etag.is_none() {
                        metadata.etag = previous.etag.clone();
                    }
                    if metadata.opaque.is_empty() {
                        metadata.opaque = previous.opaque.clone();
                    }
                    if metadata.last_modified_unix_ms.is_none() {
                        metadata.last_modified_unix_ms = previous.last_modified_unix_ms;
                    }
                }
                return Ok(ValidationOutcome::Fresh {
                    validation: Some(metadata),
                });
            }
            // V1 may receive a full changed representation. Hand it to R1, avoiding a second GET.
            *self.pending.lock().await = Some(Self::decode(wire)?);
            Ok(ValidationOutcome::Changed)
        })
    }
    fn retrieve<'a>(
        &'a self,
        _request: RetrievalRequest<'a>,
    ) -> SourceFuture<'a, Result<RetrievalOutcome<T>, OriginError>> {
        Box::pin(async move {
            if let Some(value) = self.pending.lock().await.take() {
                return Ok(value);
            }
            Self::decode(
                self.transport
                    .get(self.url.clone(), None, 6 * 1024 * 1024)
                    .await?,
            )
        })
    }
}
