use std::collections::VecDeque;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub port: u16,
    pub api_token: String,
}

impl Config {
    /// Reads configuration through `get`, which returns an environment variable.
    pub fn from_env(get: impl Fn(&str) -> Option<String>) -> Config {
        let port = get("WORKER_PORT").unwrap_or_else(|| "8080".to_owned()).parse().unwrap();
        let api_token = get("WORKER_API_TOKEN").unwrap_or_else(|| "dev-token".to_owned());
        Config { port, api_token }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Job {
    pub id: u64,
    pub payload: String,
}

#[derive(Default)]
pub struct Worker {
    queue: VecDeque<Job>,
    stopping: bool,
}

impl Worker {
    pub fn submit(&mut self, job: Job) {
        self.queue.push_back(job);
    }

    pub fn process_one(&mut self) -> Option<Job> {
        self.queue.pop_front()
    }

    pub fn queued(&self) -> usize {
        self.queue.len()
    }

    /// Called when SIGTERM arrives.
    pub fn shutdown(&mut self) {
        self.stopping = true;
        self.queue.clear();
    }

    pub fn is_stopping(&self) -> bool {
        self.stopping
    }
}

/// Served at GET /health.
pub fn health() -> (u16, &'static str) {
    (200, "ok")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn processes_jobs_in_order() {
        let mut worker = Worker::default();
        worker.submit(Job { id: 1, payload: "a".into() });
        worker.submit(Job { id: 2, payload: "b".into() });
        assert_eq!(worker.process_one().map(|job| job.id), Some(1));
        assert_eq!(worker.queued(), 1);
    }

    #[test]
    fn reads_port_and_token() {
        let config = Config::from_env(|key| match key {
            "WORKER_PORT" => Some("9000".into()),
            "WORKER_API_TOKEN" => Some("secret".into()),
            _ => None,
        });
        assert_eq!(config.port, 9000);
    }
}
