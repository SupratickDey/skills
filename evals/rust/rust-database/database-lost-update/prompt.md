---
tags: [rust-database]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

reserve oversells stock. StockStore models a database table shared by several service instances, so another instance can change a row between this function's read and its write, and production shows lost reservations as well as stock that should have been refused. Fix reserve: a reservation must never overwrite a concurrent change (return ReserveError::Conflict and let the caller decide whether to retry), and a quantity above the available stock must return ReserveError::InsufficientStock without writing. Use the conditional update the store already provides. Keep the StockStore trait, InMemoryStore and the reserve signature. Do not add dependencies. Add regression tests, including one where another writer changes the row between the read and the write, and run the project checks.

Input files: Cargo.toml, src/lib.rs
