# tally

Counts the lines of a file that contain a pattern.

```
tally PATTERN FILE
```

Prints `FILE: COUNT` on standard output.

Exit status:

- 0: at least one line matched.
- 1: no line matched.
- 2: usage error (missing or extra arguments) or the file could not be read.

Diagnostics are written to standard error and never to standard output, so
scripts can parse standard output. If standard output is closed early, for
example by `tally x big.log | head -c 1`, tally stops quietly with the exit
status it would otherwise have returned.
