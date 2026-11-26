---
type: llm
focus: trace
weight: 1
---

The implementation gives validation and calculation a cohesive private boundary and leaves submit as an orchestrator that uses Ledger.record. No unnecessary trait, process, new dependency or public helper is introduced.
