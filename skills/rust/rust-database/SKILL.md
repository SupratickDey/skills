---
name: rust-database
description: Design or implement persistence in Rust using an existing database and driver. Use for SQL queries, transactions, isolation, migrations, connection pools, indexes and repository boundaries. Not for choosing domain architecture, general retry policies or changing production data without authorization.
---

# Rust Database Engineering

Apply the following guidance within the authorized task and existing project
contracts. A skill does not independently authorize edits or deployment.

## Inspect the persistence contract

Read the schema, migrations, driver version, database engine, tenancy policy,
existing repository interfaces, consistency requirements and query workload.
Preserve the approved database and driver. Do not introduce an ORM, query
builder or generic repository without a demonstrated need. Identify which
operation owns the transaction and which invariants the database enforces.

## Queries and connection ownership

Bind values through the driver; identifiers and ordering expressions require
an allowlisted mapping rather than value placeholders. Scope tenant and
resource constraints in queries using trusted context. Map row counts,
nullable fields, uniqueness and error codes into the documented domain
contract. Use bounded results and deterministic ordering. Avoid selecting
unneeded sensitive columns or emitting parameter values in logs.

Size pools against the total connection budget across application replicas,
workers and administrative capacity. Define bounded acquisition and query
deadlines using driver-supported mechanisms. Do not retain a connection while
performing unrelated external work. Understand driver cancellation, connection
reuse and transaction state before assuming timeout cleanup.

## Transactions and concurrent changes

Place the complete atomic database operation on one transaction/connection.
Do not call a helper that silently obtains another pooled connection.
Choose isolation, constraints, locks or conditional updates from the actual
race and engine semantics. Prefer enforced uniqueness and referential
constraints over unprotected check-then-write logic. Roll back on failure;
with SQLx, an unfinished Transaction initiates rollback on drop, which does
not make arbitrary remote side effects atomic. Check commit results and
reconcile ambiguous completion before retrying a mutation. Retry the complete
transaction only when the documented error and operation contract allow it.

For a database update plus message publication, consider an approved
transactional outbox when atomic persistence and eventual delivery are
required. Delivery may still duplicate messages. Do not promise exactly-once
external effects without a verified protocol.

## Schema changes and performance

Never edit an applied migration. Use a new migration, compatible rollout
order, backfill limits, and an approved recovery plan. Verify lock and
transaction behavior for the actual engine. For destructive or irreversible
changes obtain explicit approval and verify recovery evidence. Use query
plans and representative data to justify indexes and batch sizes. Do not
run mutating EXPLAIN ANALYZE or schema operations against production without
authorization.

## Verification

Run configured formatting, clippy and tests with the existing lint policy
(-D warnings only when none exists). Test against an isolated instance of the
supported engine where required, including migration from the prior schema,
constraint violations, rollback, concurrent writers, tenant scope, pool
exhaustion and ambiguous failure handling. Use synthetic data. Verify actual
queries and transaction ownership; mocks alone cannot establish engine
isolation or migration compatibility. Report commands and blockers.
