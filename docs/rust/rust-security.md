## What it does

Memory safety is not application security. Identify the trust boundary and enforce the authorized operation against the correct subject, resource and context before performing side effects.

## When to reach for it

Model-invoked. Design or strengthen application-level security controls in Rust. Use for authentication and authorization boundaries, tenant isolation, untrusted input, secrets, sensitive operations, audit trails and security threat assessment. Not for unsafe memory soundness or dependency advisory triage, which have separate skills. Users can also invoke it directly by name.
The skill supplies guidance for the authorized task, not permission to edit.

## Security decisions

Trace the trusted principal, resource and operation before authorizing a
side effect. Enforce tenant and resource constraints at trusted boundaries,
use bounded input parsing, protect secrets, and test denial paths as well
as allowed paths. Identify risks and evidence gaps rather than weakening
controls.

## Common questions

**Does authentication prove access to a resource?** No. Check authorization for the requested operation and resource.

**Can a failed authorization service grant access temporarily?** No. Use the approved fail-closed policy and report the availability failure.

## It's working if

- Authorization derives identity from trusted context and denies by default.
- Cross-tenant and denied operations do not cause unauthorized side effects.
- Sensitive inputs and diagnostics are protected, including test fixtures.
- Negative tests and actual verification outcomes are reported.

## Where it fits

Works alongside unsafe-rust, rust-supply-chain, rust-config and rust-observability. See rust-skills-map for the full routing table.
