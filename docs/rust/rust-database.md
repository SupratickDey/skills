## What it does

Transactions, queries, migrations and persistence boundaries. It works within the approved project contracts and existing tools,
without automatically introducing infrastructure or dependencies.

## When to reach for it

Model-invoked: Design or implement persistence in Rust using an existing database and driver. Use for SQL queries, transactions, isolation, migrations, connection pools, indexes and repository boundaries. Not for choosing domain architecture, general retry policies or changing production data without authorization. Users can invoke it directly by name.

## Decisions and verification

### Inspect the persistence contract

Read the schema, migrations, driver version, database engine, tenancy policy,
existing repository interfaces, consistency requirements and query workload.
Preserve the approved database and driver. Do not introduce an ORM, query
builder or generic repository without a demonstrated need. Identify which
operation owns the transaction and which invariants the database enforces.

### Queries and connection ownership

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

### Transactions and concurrent changes

Place the complete atomic database operation on one transaction/connection.
Do not call a helper that silently obtains another pooled connection.
Choose isolation, constraints, locks or conditional updates from the actual
race and engine semantics. Prefer enforced uniqueness and referential
constraints over unprotected check-then-write logic. Read
CONCURRENT-UPDATES.md for a compiled, tested conditional update that turns a
lost write into a reported conflict. Roll back on failure;
with SQLx, an unfinished Transaction initiates rollback on drop, which does
not make arbitrary remote side effects atomic. Check commit results and
reconcile ambiguous completion before retrying a mutation. Retry the complete
transaction only when the documented error and operation contract allow it.

For a database update plus message publication, consider an approved
transactional outbox when atomic persistence and eventual delivery are
required. Delivery may still duplicate messages. Do not promise exactly-once
external effects without a verified protocol.

### Schema changes and performance

Never edit an applied migration. Use a new migration, compatible rollout
order, backfill limits, and an approved recovery plan. Verify lock and
transaction behavior for the actual engine. For destructive or irreversible
changes obtain explicit approval and verify recovery evidence. Use query
plans and representative data to justify indexes and batch sizes. Do not
run mutating EXPLAIN ANALYZE or schema operations against production without
authorization.



## Common questions

**Does the skill authorize changing an existing contract?** No. Obtain approval
for material changes and preserve existing behavior outside the requested scope.

**Are mock tests sufficient?** Only for the behavior they actually exercise.
Report missing integration or deployment evidence separately.

## It's working if

- Queries use bound values and trusted scope.
- Atomic operations use one transaction and preserve constraints.
- Migrations are forward-only additions with reviewed rollout and recovery.
- Engine-specific integration tests distinguish execution from mocks.

## Where it fits

Use `/rust-architecture` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.
