---
type: llm
focus: trace
weight: 1
---

Effective settings are unchanged for existing members: ledger still has
missing_docs at warn (for example by keeping its own complete lint tables
rather than combining lints.workspace with a member table), report and audit
do not gain missing_docs, and versions, editions, rust-version and license are
identical to before. Package names and the resolver are unchanged and no
external dependency is added.
