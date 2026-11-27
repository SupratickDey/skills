---
type: llm
focus: trace
weight: 1
---

Tests cover each rejected form, accepted nested names and the .csv extension,
with Windows prefix cases under cfg(windows). The agent runs the relevant
Cargo checks (build, tests and clippy at the project lint level or -D warnings
when none is configured), reports the actual outcomes, and does not claim a
command passed that it did not run or that failed.
