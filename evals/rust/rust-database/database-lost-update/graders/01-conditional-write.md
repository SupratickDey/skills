---
type: llm
focus: trace
weight: 1
---

reserve writes through update_if_version using the version it read and treats
zero affected rows as ReserveError::Conflict (or UnknownSku when the row is
gone). It no longer calls the unconditional put for a reservation, so a
concurrent change is never overwritten.
