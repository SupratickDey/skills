---
type: llm
focus: trace
weight: 1
---

Paging with the returned cursors visits every order exactly once in newest-
first order with ties on created_at broken by descending id, including when
tied orders straddle a page boundary. The cursor carries both created_at and
id; the comparison is not a strict filter on created_at alone.
