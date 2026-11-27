---
type: llm
focus: trace
weight: 1
---

Tests show the size stays at capacity after many more distinct ids, that a
recently used entry survives eviction and that capacity 0 is rejected. The
agent runs the Cargo checks and reports results, and it does not claim a
measured memory or performance improvement unless it actually measured one.
