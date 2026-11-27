---
tags: [rust-cli-development]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Grep, Glob, Skill, Bash, Write, Edit]
---

tally does not follow its documented contract in README.md: it exits 0 even when nothing matched, prints errors to stdout where scripts parse the counts, and panics with status 101 on a missing argument or an unreadable file. Fix it so it matches README.md exactly, including not panicking when its standard output is closed early (for example when piped into head). Keep the output format and argument order. Do not add dependencies. Add integration tests that run the built binary and check exit statuses and which stream each message goes to, and run the project checks.

Input files: Cargo.toml, README.md, src/main.rs, tests/cli.rs
