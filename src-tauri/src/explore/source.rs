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
    permits: Arc<Semaphore>,
    retry_at: Arc<AtomicU64>,
}

impl Transport {
    pub fn new() -> Result<Self, OriginError> {
        let client = Client::builder()
            .user_agent(concat!(
                "Izyawastaken/Tachyon/",
                env!("CARGO_PKG_VERSION"),
                " (https://github.com/Izyawastaken/Tachyon)"
            ))
            .timeout(Duration::from_secs(15))
            .connect_timeout(Duration::from_secs(5))
            .pool_idle_timeout(Duration::from_secs(60))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| origin_error(e.to_string()))?;
        Ok(Self {
            client,
            permits: Arc::new(Semaphore::new(6)),
            retry_at: Arc::new(AtomicU64::new(0)),
        })
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
            return Err(origin_error(
                "Modrinth is rate limiting requests. Try again shortly.",
            ));
        }
        let mut request = self.client.get(url);
        if let Some(meta) = validation {
            if let Some(etag) = &meta.etag {
                request = request.header(header::IF_NONE_MATCH, etag);
            }
            if let Ok(modified) = std::str::from_utf8(&meta.opaque) {
                if !modified.is_empty() {
                    request = request.header(header::IF_MODIFIED_SINCE, modified);
                }
            }
        }
        let response = request.send().await.map_err(|_| {
            origin_error("Could not reach Modrinth. Check your connection and retry.")
        })?;
        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            let delay = response
                .headers()
                .get(header::RETRY_AFTER)
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(30)
                .clamp(1, 300);
            self.retry_at.store(now() + delay, Ordering::Relaxed);
            return Err(origin_error(
                "Modrinth is rate limiting requests. Try again shortly.",
            ));
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
        let content_type = response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or_default()
            .split(';')
            .next()
            .unwrap_or_default()
            .to_owned();
        if status != StatusCode::NOT_MODIFIED
            && status != StatusCode::NOT_FOUND
            && !status.is_success()
        {
            return Err(origin_error(format!(
                "Modrinth returned {}. Try again later.",
                status.as_u16()
            )));
        }
        let bytes = bounded_body(response, max_bytes).await?;
        Ok(WireResponse {
            status,
            metadata,
            bytes,
            content_type,
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
    pub content_type: String,
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
            .map_err(|_| origin_error("Modrinth returned an unreadable catalog response."))?;
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
                return Ok(ValidationOutcome::Fresh {
                    validation: Some(wire.metadata),
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
