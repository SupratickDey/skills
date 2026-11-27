---
type: llm
focus: trace
weight: 1
---

A missing limit uses 20. A limit of 0 or above MAX_LIMIT returns
PageError::InvalidLimit and is not clamped silently. Malformed cursors return
PageError::InvalidCursor without panicking. The public list_orders signature,
Order, Page, PageError and the constants are unchanged and no dependency is
added.
