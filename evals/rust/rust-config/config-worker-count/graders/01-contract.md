---
type: llm
focus: trace
weight: 1
---

The implementation returns Ok(4) only as the absent-value default, accepts explicit ASCII digit strings whose parsed values are 1 through 64, and returns ConfigError for empty, malformed, overflowing, zero or out-of-range values. It does not expose the raw value.
