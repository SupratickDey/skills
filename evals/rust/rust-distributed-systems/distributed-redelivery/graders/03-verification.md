---
type: llm
focus: trace
weight: 1
---

Tests cover a duplicate delivery, a gap followed by the missing message and
then the held message, and two accounts interleaved. The agent runs the
relevant Cargo checks (build, tests and clippy at the project lint level or -D
warnings when none is configured), reports the actual outcomes, and does not
claim a command passed that it did not run or that failed.
