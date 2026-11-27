---
tags: [rust-memory-profiling]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

Memory in the profile service grows for as long as it runs. Every distinct user id ever requested stays in ProfileCache, and user ids are unbounded. Bound the cache: it must hold at most its capacity, evicting the least recently used entry. new keeps a capacity of DEFAULT_CAPACITY; add `pub fn with_capacity(capacity: usize, loader: F) -> Result<Self, CacheError>` that rejects a capacity of 0. get must keep returning what the loader returns and keep serving repeated ids from the cache. Eviction cost must not grow with the total number of ids ever requested. Do not add dependencies. Add regression tests showing the bound holds after many distinct ids and that recently used entries survive, run the project checks, and state what you measured and what you did not.

Input files: Cargo.toml, src/lib.rs
