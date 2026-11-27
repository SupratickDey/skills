---
type: llm
focus: trace
weight: 1
---

display_name no longer unwraps to_str and does not panic on non-UTF-8 paths
(for example it uses Path::display or to_string_lossy). Public function names,
parameter types and ExportError are unchanged and no dependency is added. The
agent does not claim Windows behavior was executed unless it ran on Windows.
