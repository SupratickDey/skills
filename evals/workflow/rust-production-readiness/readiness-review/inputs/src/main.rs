use readiness_review::{health, Config, Job, Worker};

fn main() {
    let config = Config::from_env(|key| std::env::var(key).ok());
    let mut worker = Worker::default();
    println!("listening on {} ({})", config.port, health().1);
    for id in 0..3 {
        worker.submit(Job { id, payload: format!("job-{id}") });
    }
    while let Some(job) = worker.process_one() {
        println!("processed {}", job.id);
    }
    worker.shutdown();
}
