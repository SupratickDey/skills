---
type: llm
focus: trace
weight: 1
---

The root declares workspace.package (version, edition, rust-version, license),
a workspace.dependencies entry for ledger and workspace lints for unsafe_code
= forbid and clippy unwrap_used = deny, and the members inherit them.
crates/audit exists, depends on ledger through the workspace entry and exposes
audit_total returning ledger::total.
