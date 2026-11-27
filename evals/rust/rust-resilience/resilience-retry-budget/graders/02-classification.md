---
type: llm
focus: trace
weight: 1
---

Unavailable and TimedOut are retried, Rejected returns immediately without
sleeping, and RateLimited waits at least retry_after (still bounded by the
deadline). The public signature, Clock and Inventory traits, CallError and
RetryConfig are unchanged; no dependency is added.
