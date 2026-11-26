---
type: llm
focus: trace
weight: 1
---

The public page function preserves ordinary and clamped behavior, returns empty for offsets at or beyond length and zero limits, and handles usize::MAX offset or limit without overflow or panic.
