---
tags: [rust-api-development]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Clients report that orders go missing when they page through the order list and several orders share a created_at timestamp, and a client sending limit=100000 makes requests slow. Fix list_orders so that paging with the returned cursor visits every order exactly once, newest first, with ties broken by descending id. The default limit stays 20; a limit of 0 or above MAX_LIMIT must be rejected with PageError::InvalidLimit, and a malformed cursor with PageError::InvalidCursor. The cursor format may change. Keep the public function, types and constants. Do not add dependencies. Add regression tests and run the project checks.

Input files: Cargo.toml, src/lib.rs
