use super::{Backend, models::SearchInput};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::{sync::Mutex, task::JoinHandle};

#[derive(Default)]
pub struct Window {
    inner: Mutex<WindowState>,
}
#[derive(Default)]
struct WindowState {
    family: String,
    generation: u64,
    jobs: HashMap<u32, JoinHandle<()>>,
}

pub fn next_pages(offset: u32, total: u32) -> Vec<u32> {
    [offset.saturating_add(24), offset.saturating_add(48)]
        .into_iter()
        .filter(|offset| *offset < total && *offset <= 10_000)
        .collect()
}

impl Window {
    pub async fn begin(&self, input: &SearchInput) -> u64 {
        let mut family = input.clone();
        family.offset = 0;
        let family = serde_json::to_string(&family).unwrap_or_default();
        let mut state = self.inner.lock().await;
        if state.family != family {
            for (_, job) in state.jobs.drain() {
                job.abort();
            }
            state.family = family;
        }
        state.generation += 1;
        state.generation
    }

    pub async fn schedule(
        &self,
        backend: Arc<Backend>,
        input: SearchInput,
        total: u32,
        generation: u64,
    ) {
        let mut state = self.inner.lock().await;
        if state.generation != generation {
            return;
        }
        let desired = next_pages(input.offset, total);
        state.jobs.retain(|offset, job| {
            if job.is_finished() {
                return false;
            }
            if *offset == input.offset || desired.contains(offset) {
                return true;
            }
            job.abort();
            false
        });
        for offset in desired {
            if state.jobs.contains_key(&offset) {
                continue;
            }
            let mut request = input.clone();
            request.offset = offset;
            let service = backend.clone();
            state.jobs.insert(
                offset,
                tokio::spawn(async move {
                    let Ok(_permit) = service.background_slots.acquire().await else {
                        return;
                    };
                    // Normal resolve promotes a saved page from L2, or fills both tiers
                    // through Engram's single-flight V1/R1 pipeline.
                    let _ = service.search(request).await;
                }),
            );
        }
    }
}

impl Drop for Window {
    fn drop(&mut self) {
        for job in self.inner.get_mut().jobs.values() {
            job.abort();
        }
    }
}
