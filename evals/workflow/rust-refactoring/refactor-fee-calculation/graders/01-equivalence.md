---
type: llm
focus: trace
weight: 1
---

The helper preserves the original validation order, checked multiplication, rates 3 and 2 and integer division. Negative amounts including i64::MIN return Negative; i64::MAX returns Overflow for both wrappers. Zero and ordinary values behave identically.
