---
type: llm
focus: trace
weight: 1
---

Attempts never exceed max_attempts, no sleep ends after the deadline, and each
attempt timeout is min(30 s, remaining). When attempts or time run out, the
last error is returned. Delay arithmetic is capped at max_delay and cannot
overflow or panic.
