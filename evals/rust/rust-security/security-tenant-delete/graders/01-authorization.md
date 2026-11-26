---
type: llm
focus: trace
weight: 1
---

The operation enforces can_delete and selects the resource by both authenticated tenant and id before mutation. An out-of-tenant record cannot be removed, including when the same id exists in two tenants.
