---
type: llm
focus: trace
weight: 1
---

Tests use a fake Clock (no real sleeps) and cover success after a transient
failure, Rejected, RateLimited, the attempt limit, the deadline and the per-
attempt timeout. The agent runs the relevant Cargo checks (build, tests and
clippy at the project lint level or -D warnings when none is configured),
reports the actual outcomes, and does not claim a command passed that it did
not run or that failed.
