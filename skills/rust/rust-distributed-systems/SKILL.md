---
name: rust-distributed-systems
description: Design or implement Rust distributed application behavior involving messaging, replication, leases, ordering, consistency, deduplication and recovery across independent processes. Use for distributed coordination, broker integration and durable event processing. Not for routine local concurrency, retry mechanics alone or speculative service decomposition.
---

# Rust Distributed Systems

Apply this guidance within the authorized task, supported environments and
existing project contracts. Do not introduce dependencies or operations
without the required approval.

## Identify the distributed contract

Read the approved topology, transport or broker, storage guarantees,
failure model, consistency needs, ownership of state and protocol versions.
Define the invariant, scope and durability requirement of each operation.
Do not assume synchronized clocks, reliable networks, unique message
delivery or a global event order. Do not introduce a broker, consensus
protocol or distributed lock when the existing design does not require it.

Distinguish transport acknowledgment, persisted state, completed side effect
and client-visible success. A missing acknowledgment may follow a committed
operation. Route network endpoint semantics to `/rust-api-development`,
atomic storage operations to `/rust-database` and retry budgets to
`/rust-resilience`.

## Delivery, ordering and replay

Document the actual broker and consumer delivery guarantees and their scope.
At-least-once delivery can duplicate events. Make handlers idempotent where
required using a stable operation identity and an atomic durable update
with deduplication state. Define deduplication retention and replay policy.
Do not acknowledge a message before the required durable effect is committed.
For an outbox or inbox pattern, distinguish the atomic local transaction from
external publication and its potential duplicate delivery.

Define ordering by key, partition, stream or another explicit scope.
Handle gaps, duplicates, reordering and poison messages according to the
domain contract. Use bounded replay and recovery procedures. Do not silently
drop required events or promise exactly-once effects beyond the protocol and
systems that establish them. Preserve schema evolution and versioned message
contracts with `/rust-serde`.

## Consistency and coordination

Select consistency requirements per operation and verify the actual store or
coordination system provides them. Explain what may be stale, when a read can
observe its own write, and what happens during partition or failover.
Do not equate eventual consistency with arbitrary lost updates.
For leases or leader election, expiration alone does not prevent a paused
or partitioned former leader from issuing writes. Where correctness requires
exclusive access, enforce fencing or an equivalent verified mechanism at
the resource that accepts the operation. Use established coordination
systems instead of implementing consensus from scratch without an approved
need. Keep tenant identity and authorization independent of message metadata.

## Verification

Test duplicate delivery, reordering, replay, crash before and after commit
or acknowledgment, stale ownership, partition and recovery where applicable.
Use isolated representative systems and controlled fault injection, never
unapproved live disruption. Verify persistent invariants and side effects,
not only response codes. Use the actual supported broker/storage versions
for integration evidence. Run configured format, clippy and tests across
the supported matrix, with -D warnings only if no lint policy exists.
Distinguish model tests, simulations, integration tests and deployment
validation. Record unverified consistency or failover guarantees explicitly.
