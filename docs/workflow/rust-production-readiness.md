## What it does

Release evidence, health semantics, shutdown and rollback. It works within the approved project contracts and existing tools,
without automatically introducing infrastructure or dependencies.

## When to reach for it

Model-invoked: Assess a Rust application for deployment readiness and implement authorized readiness improvements. Use for startup validation, health probes, graceful shutdown, operational checklists, release evidence, rollback and recovery. Not for authorizing deployment, replacing CI setup or redesigning resilience mechanisms. Users can invoke it directly by name.

## Decisions and verification

### Establish readiness criteria

Read the approved deployment topology, configuration, service objectives,
security policy, dependency contracts, artifact pipeline and operating
procedures. Separate required evidence from optional improvements. A passing
unit test or static review is not permission to deploy. Do not introduce
Kubernetes, containers or external monitoring if the project does not use
them.

### Startup, health and shutdown

Validate required settings and prerequisites before accepting work. Distinguish
startup completion, readiness to serve and liveness of the process. A
dependency outage may make readiness false without warranting process
restart; design probes according to the actual orchestrator and recovery
contract. Keep probes bounded, lightweight, safe to call repeatedly and
free of sensitive details. For Kubernetes, check configured probe thresholds,
startup behavior and termination grace period against the application.

On shutdown, stop admission, signal cancellation, drain or persist accepted
work according to its durability requirements, join owned tasks and close
resources within the approved deadline. Distinguish completed, retriable and
unknown operations. Read LIFECYCLE.md for a compiled, tested admission gate
with separate readiness and liveness, a bounded drain and a verdict table. Do not rely on async work in Drop, assume all blocking
tasks abort, or silently discard mandatory audit events. Test the actual
service lifecycle where possible.

### Artifacts, rollout and recovery

Verify the candidate commit, supported target, toolchain, feature selection,
dependency and lockfile policy, artifact identity and deployment configuration.
Inspect secret injection, least privilege, supply-chain checks, logging and
metric bounds. Route specific concerns to `/rust-security`,
`/rust-supply-chain`, `/rust-observability` and `/rust-resilience`.
Check database migration compatibility across old and new versions. Define
rollout stages, stop conditions, rollback or forward recovery, owner and
required backup/restore evidence. A code rollback alone may not reverse a
data migration. Do not execute deployment, destructive migrations or live
fault tests without separate authorization.



## Common questions

**Does the skill authorize changing an existing contract?** No. Obtain approval
for material changes and preserve existing behavior outside the requested scope.

**Are mock tests sufficient?** Only for the behavior they actually exercise.
Report missing integration or deployment evidence separately.

## It's working if

- Startup, readiness and liveness semantics match deployment.
- Shutdown preserves accepted work according to the durability contract.
- Rollout and recovery decisions have owners and evidence.
- Failed or blocked gates prevent a ready verdict.

## Where it fits

Use `/setup-rust-ci` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.
