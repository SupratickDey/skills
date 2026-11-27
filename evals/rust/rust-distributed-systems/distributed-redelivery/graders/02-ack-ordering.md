---
type: llm
focus: trace
weight: 1
---

No path acknowledges a message whose effect has not been stored, and the
applied sequence never advances separately from the balance (no second write
or local counter outside the ledger). The Ledger trait, InMemoryLedger,
Delivery and Ack are unchanged and no dependency is added.
