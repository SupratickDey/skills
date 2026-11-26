## What it does

HTTP and RPC contracts, request boundaries and idempotency. It works within the approved project contracts and existing tools,
without automatically introducing infrastructure or dependencies.

## When to reach for it

Model-invoked: Design or implement Rust HTTP or RPC service endpoints, handlers, middleware, pagination, request validation, error mapping and idempotency. Not for public Rust library APIs, general component architecture or security policy changes. Users can invoke it directly by name.

## Decisions and verification

### Start from the contract

Inspect the approved HTTP or RPC schema, existing routes, framework versions,
authentication and authorization policy, request limits, clients, and error
conventions. Preserve paths, methods, field names, status codes and
compatibility guarantees. Change the contract only with approval. Use the
existing framework and serialization stack; do not select axum, actix-web,
tonic or a new dependency merely because a skill mentions it.

### Request and response boundaries

Keep transport adapters thin: decode bounded input, establish authenticated
context, validate request shape and domain constraints, invoke the use case,
and translate its result into the documented response. Resource authorization
belongs at the trusted operation boundary; user-provided identifiers and
headers never establish permissions. Route policy design to `/rust-security`.
Avoid holding locks or database transactions across unrelated network calls.

For axum and Tower, inspect actual router and middleware layering, state
extraction, body ownership and error mapping using the pinned versions. For
gRPC, preserve protobuf field numbers, reserved fields and documented status
semantics; use the established generator rather than editing generated code.
Do not expose internal errors, credentials or raw input in responses.

### Pagination and mutations

Use deterministic ordering and a unique tie-breaker. Bind cursor semantics to
the authorized query and filters; validate limits and malformed or stale
cursors. Specify consistency expectations when data changes between pages.
Offset pagination may be adequate for a small stable dataset. Do not promise
snapshot consistency without a supporting storage contract.

Define idempotency scope, request fingerprint, retention and response replay
for operations that must tolerate duplicate delivery. Ensure concurrent
requests cannot both acquire the same operation using the approved atomic
storage mechanism. Reject reuse for a different request. Treat unknown
completion after a timeout as ambiguous, not as proof of failure. Coordinate
transaction design with `/rust-database` and retry policy with
`/rust-resilience`. Do not implement idempotency with an unbounded in-memory
map unless its limitations explicitly fit the contract.



## Common questions

**Does the skill authorize changing an existing contract?** No. Obtain approval
for material changes and preserve existing behavior outside the requested scope.

**Are mock tests sufficient?** Only for the behavior they actually exercise.
Report missing integration or deployment evidence separately.

## It's working if

- Contracts and status mappings remain compatible.
- Denied and invalid operations cannot mutate protected state.
- Pagination has deterministic order and bounded input.
- Concurrent idempotency and actual route behavior are tested where required.

## Where it fits

Use `/rust-api-design` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.
