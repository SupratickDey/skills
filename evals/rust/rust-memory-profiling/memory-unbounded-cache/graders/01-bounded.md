---
type: llm
focus: trace
weight: 1
---

The cache never holds more than its capacity; when full it evicts the least
recently used entry, where a hit counts as a use. Eviction work is bounded by
the capacity, not by the number of ids ever seen. get returns the loader
result, and repeated ids within capacity do not call the loader again.
