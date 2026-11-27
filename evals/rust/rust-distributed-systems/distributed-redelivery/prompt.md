---
tags: [rust-distributed-systems]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Account balances drift. The broker delivers each message at least once and can reorder messages for the same account; the producer gives every account's messages a sequence number starting at 1 with no gaps. handle currently applies every delivery, so redeliveries are counted twice and reordered messages are applied out of order. Fix handle so that each account's messages take effect exactly once and in sequence order: acknowledge a redelivered message without applying it again, apply the next expected message and then acknowledge it, and return Ack::Retry without applying anything for a message that arrives before an earlier one. Ledger::apply stores the amount and the account's applied sequence in one atomic write; use it. Keep the Ledger trait, InMemoryLedger, Delivery and Ack unchanged and do not add dependencies. Add regression tests and run the project checks.

Input files: Cargo.toml, src/lib.rs
