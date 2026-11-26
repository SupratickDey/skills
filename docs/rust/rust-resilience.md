## What it does

Deadlines, bounded retries, backpressure and failure isolation. It works within the approved project contracts and existing tools,
without automatically introducing infrastructure or dependencies.

## When to reach for it

Model-invoked: Design or improve Rust runtime failure handling across service calls, queues and background tasks. Use for deadlines, retry budgets, circuit breakers, backpressure, bulkheads and recovery after ambiguous outcomes. Not for fixing an unrelated defect, general async syntax or deployment readiness assessment. Users can invoke it directly by name.

## Decisions and verification

### Establish the failure contract

Identify dependencies, operation side effects, retryable errors, cancellation
behavior, user-visible outcomes, and existing service-level objectives.
Respect the caller's overall deadline and downstream budgets. Distinguish
transient unavailability, permanent validation or authorization failures,
overload, and unknown completion. Do not invent reliability targets or add
a resilience framework without need.

### Bound work and time

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

### Retry only when safe

Use bounded attempts and total time, capped exponential backoff with jitter,
and the documented retry-after semantics where relevant. Avoid retrying
authentication, validation or permanent failures. A mutation may already
have committed even when the client observes a timeout. Retry only with
a verified idempotency or reconciliation strategy; coordinate with
`/rust-api-development` and `/rust-database`. Choose one retry owner for
each call chain to avoid multiplicative load. Stop when cancelled or the
budget is exhausted; do not spawn unbounded retries.

Use a circuit breaker only where repeated dependency failures merit it.
Define the failure classifier, opening condition, recovery probe concurrency,
state scope and observable behavior. Half-open probes must be bounded;
fallbacks must not bypass authorization, corrupt data or falsely report
success. Keep settings typed and validated via `/rust-config`.



## Common questions

**Does the skill authorize changing an existing contract?** No. Obtain approval
for material changes and preserve existing behavior outside the requested scope.

**Are mock tests sufficient?** Only for the behavior they actually exercise.
Report missing integration or deployment evidence separately.

## It's working if

- Retries and queues have explicit bounds.
- Mutating retries require an idempotency or reconciliation contract.
- Cancellation and resource cleanup are verified.
- Overload behavior and fallback semantics are observable.

## Where it fits

Use `/async-rust` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.
