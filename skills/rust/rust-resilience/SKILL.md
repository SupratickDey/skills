---
name: rust-resilience
description: Design or improve Rust runtime failure handling across service calls, queues and background tasks. Use for deadlines, retry budgets, circuit breakers, backpressure, bulkheads and recovery after ambiguous outcomes. Not for fixing an unrelated defect, general async syntax or deployment readiness assessment.
---

# Rust Resilience

Apply the following guidance within the authorized task and existing project
contracts. A skill does not independently authorize edits or deployment.

## Establish the failure contract

Identify dependencies, operation side effects, retryable errors, cancellation
behavior, user-visible outcomes, and existing service-level objectives.
Respect the caller's overall deadline and downstream budgets. Distinguish
transient unavailability, permanent validation or authorization failures,
overload, and unknown completion. Do not invent reliability targets or add
a resilience framework without need.

## Bound work and time

Propagate an overall deadline; derive per-attempt and acquisition timeouts
from the remaining budget. Include DNS, connection establishment, request
processing and response handling as applicable. A timeout of a Rust future
is not proof that remote work stopped. Check cancellation safety, task
ownership and blocking behavior with `/async-rust`. Do not detach abandoned
tasks or hold permits and locks longer than intended.

Use bounded queues, concurrency permits and explicit admission policy.
Specify what happens when a queue is full: reject, shed, wait within a
deadline, or persist according to the contract. Isolate resource pools
where failure domains justify it. Preserve required work and audit semantics;
never silently drop data that must be delivered.

## Retry only when safe

Use bounded attempts and total time, capped exponential backoff with jitter,
and the documented retry-after semantics where relevant. Avoid retrying
authentication, validation or permanent failures. A mutation may already
have committed even when the client observes a timeout. Retry only with
a verified idempotency or reconciliation strategy; coordinate with
`/rust-api-development` and `/rust-database`. Choose one retry owner for
each call chain to avoid multiplicative load. Stop when cancelled or the
budget is exhausted; do not spawn unbounded retries.

Read RETRY.md before writing or reviewing a retry loop: it has a compiled,
tested loop with a deadline budget, a retryability classifier, capped
jittered backoff and an injected clock.

Use a circuit breaker only where repeated dependency failures merit it.
Define the failure classifier, opening condition, recovery probe concurrency,
state scope and observable behavior. Half-open probes must be bounded;
fallbacks must not bypass authorization, corrupt data or falsely report
success. Keep settings typed and validated via `/rust-config`.

## Verification

Test transient recovery, permanent errors, exhausted deadline, cancellation,
ambiguous completion, queue saturation and concurrent recovery probes as
applicable. Prefer controllable clocks and deterministic jitter injection
using existing test seams. Verify the attempt count, resource cleanup and
absence of duplicate side effects, not merely the final return value.
Measure representative overload behavior before claiming throughput or
availability. Run configured format, clippy and tests across the supported
matrix, using -D warnings only without a lint policy. Report unexecuted
fault-injection and live dependency checks separately.
