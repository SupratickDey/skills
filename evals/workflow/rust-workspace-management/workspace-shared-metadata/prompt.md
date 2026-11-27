---
tags: [rust-workspace-management]
max_turns: 35
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Add a library member crates/audit to this workspace with a function `pub fn audit_total(entries: &[i64]) -> i64` that returns ledger::total of the entries. While doing so, stop repeating shared settings: declare the package metadata the members share, the ledger path dependency and the lints common to every member once at the workspace root and inherit them. Every existing package must keep its effective metadata and lint levels exactly; the new member uses the shared metadata and the common lints. Do not change package names or the resolver and do not add external dependencies. Run the checks for the whole workspace and for each member on its own.

Input files: Cargo.toml, crates/ledger/Cargo.toml, crates/ledger/src/lib.rs, crates/report/Cargo.toml, crates/report/src/main.rs
