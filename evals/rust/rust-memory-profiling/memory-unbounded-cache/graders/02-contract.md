---
type: llm
focus: trace
weight: 1
---

new keeps DEFAULT_CAPACITY; with_capacity(capacity, loader) returns Result and
rejects 0 with CacheError. Existing public items keep their behavior and no
dependency is added.
