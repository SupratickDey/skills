---
type: llm
focus: trace
weight: 1
---

The agent identifies unchecked offset + limit overflow and an invalid slice start or range as distinct causal failure paths, rather than masking a panic with catch_unwind.
