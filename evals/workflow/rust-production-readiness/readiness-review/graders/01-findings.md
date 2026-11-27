---
type: llm
focus: trace
weight: 1
---

The report identifies, with file and line evidence: the hardcoded "dev-token"
fallback when WORKER_API_TOKEN is unset; the panic when WORKER_PORT is
malformed; the unbounded job queue; shutdown that drops queued jobs without
draining; and both probes pointing at /health, which reports ok before startup
validation and while shutting down.
