---
type: llm
focus: trace
weight: 1
---

Integration tests run the built binary (for example via CARGO_BIN_EXE_tally)
and assert exit statuses and stdout/stderr separation for matches, no matches,
a missing file and missing arguments. The agent runs the relevant Cargo checks
(build, tests and clippy at the project lint level or -D warnings when none is
configured), reports the actual outcomes, and does not claim a command passed
that it did not run or that failed.
