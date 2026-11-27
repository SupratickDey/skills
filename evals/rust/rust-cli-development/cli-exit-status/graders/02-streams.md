---
type: llm
focus: trace
weight: 1
---

Writing to a closed stdout does not panic (for example writes handle
BrokenPipe instead of using println!), and the resulting status follows
README.md. Arguments are read without unwrap on untrusted input. No dependency
is added.
