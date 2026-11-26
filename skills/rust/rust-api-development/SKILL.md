---
name: rust-api-development
description: Design or implement Rust HTTP or RPC service endpoints, handlers, middleware, pagination, request validation, error mapping and idempotency. Not for public Rust library APIs, general component architecture or security policy changes.
---

# Rust API Development

Apply the following guidance within the authorized task and existing project
contracts. A skill does not independently authorize edits or deployment.

## Start from the contract

Inspect the approved HTTP or RPC schema, existing routes, framework versions,
authentication and authorization policy, request limits, clients, and error
conventions. Preserve paths, methods, field names, status codes and
compatibility guarantees. Change the contract only with approval. Use the
existing framework and serialization stack; do not select axum, actix-web,
tonic or a new dependency merely because a skill mentions it.

## Request and response boundaries

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

## Pagination and mutations

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

## Verification

Test actual routes or RPC adapters with representative requests, including
invalid input, oversized bodies, unauthenticated and unauthorized calls,
stable pagination order, duplicate submissions and documented response/error
shapes. Verify the real middleware order and error responses. Exercise
concurrent idempotency where applicable and check that rejected requests
produce no unauthorized side effects. Run the configured format, clippy and
test commands for supported packages/features; add -D warnings only without
a configured lint policy. Distinguish mock tests from live integration and
report missing evidence.
