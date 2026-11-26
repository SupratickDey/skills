---
tags: [rust-refactoring]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Refactor the duplicate validation and checked fee calculation in invoice_fee and refund_fee into a private helper. Preserve every existing public signature, input acceptance, error variant, evaluation order and result. Do not fix unrelated issues or introduce abstractions beyond the shared invariant. Retain existing tests, add characterization cases for validation order and integer overflow, and run applicable checks.

Input files: Cargo.toml, src/lib.rs
