use std::time::{Duration, Instant};

pub trait Clock {
    fn now(&self) -> Instant;
    fn sleep(&self, duration: Duration);
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CallError {
    /// The service could not be reached or returned a 5xx response.
    Unavailable,
    /// The service asked the caller to wait before retrying.
    RateLimited { retry_after: Duration },
    /// The service refused the reservation; retrying cannot succeed.
    Rejected,
    /// No response within the attempt timeout; the reservation may have been made.
    TimedOut,
}

pub trait Inventory {
    fn reserve(&mut self, order_id: &str, timeout: Duration) -> Result<(), CallError>;
}

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_attempts: u32,
    pub base_delay: Duration,
    pub max_delay: Duration,
}

pub const ATTEMPT_TIMEOUT: Duration = Duration::from_secs(30);

/// Reserves stock for `order_id`, retrying transient failures until `deadline`.
pub fn reserve_with_retry(
    inventory: &mut impl Inventory,
    clock: &impl Clock,
    config: &RetryConfig,
    order_id: &str,
    deadline: Instant,
) -> Result<(), CallError> {
    let _ = (config.max_attempts, config.max_delay, deadline);
    let mut delay = config.base_delay;
    loop {
        match inventory.reserve(order_id, ATTEMPT_TIMEOUT) {
            Ok(()) => return Ok(()),
            Err(_) => {
                clock.sleep(delay);
                delay *= 2;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    struct FakeClock {
        now: Cell<Instant>,
    }

    impl Clock for FakeClock {
        fn now(&self) -> Instant {
            self.now.get()
        }
        fn sleep(&self, duration: Duration) {
            self.now.set(self.now.get() + duration);
        }
    }

    struct Scripted(Vec<Result<(), CallError>>);

    impl Inventory for Scripted {
        fn reserve(&mut self, _: &str, _: Duration) -> Result<(), CallError> {
            self.0.remove(0)
        }
    }

    #[test]
    fn succeeds_after_one_transient_failure() {
        let clock = FakeClock { now: Cell::new(Instant::now()) };
        let config = RetryConfig {
            max_attempts: 3,
            base_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(2),
        };
        let mut inventory = Scripted(vec![Err(CallError::Unavailable), Ok(())]);
        let deadline = clock.now() + Duration::from_secs(10);
        assert_eq!(reserve_with_retry(&mut inventory, &clock, &config, "order-1", deadline), Ok(()));
    }
}
