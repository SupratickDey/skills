---
tags: [rust-resilience]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

reserve_with_retry can retry forever, retries requests the inventory service has rejected, and keeps sleeping after the caller's deadline. Fix it. Requirements: at most config.max_attempts attempts; never start a sleep that would end after the deadline, and return the last error when the budget or attempts run out; each attempt gets a timeout of 30 seconds or the remaining time until the deadline, whichever is smaller; retry Unavailable and TimedOut (the inventory service deduplicates reservations by order id, so retrying a timed-out reservation is safe); return Rejected immediately; on RateLimited wait at least retry_after; otherwise back off exponentially from base_delay, capped at max_delay. Keep the public signature, traits and types and do not add dependencies. Add regression tests that use a fake Clock rather than real sleeps, and run the project checks.

Input files: Cargo.toml, src/lib.rs
