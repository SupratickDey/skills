---
type: llm
focus: trace
weight: 1
---

A delivery with sequence at or below the stored applied sequence returns
Ack::Ack without changing the balance. The next sequence is applied once
through Ledger::apply and acknowledged. A later sequence returns Ack::Retry
and changes nothing. Accounts are tracked independently.
