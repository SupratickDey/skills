---
name: rust-security
description: Design or strengthen application-level security controls in Rust. Use for authentication and authorization boundaries, tenant isolation, untrusted input, secrets, sensitive operations, audit trails and security threat assessment. Not for unsafe memory soundness or dependency advisory triage, which have separate skills.
---

# Rust Security

Memory safety is not application security. Identify the trust boundary and enforce the authorized operation against the correct subject, resource and context before performing side effects.

## Model the threat and contract

Read the project's security policy, data classification, access-control
requirements, interfaces and deployment trust assumptions. Identify assets,
subjects, actions, resources, trust boundaries and possible misuse. Trace
authentication, authorization, validation, storage, output and audit paths.
For a changed sensitive operation, record the relevant abuse cases and
required negative tests. Ask the owner before changing security policy,
privileges, privacy guarantees, signing, or tenant boundaries.

## Authorize each operation

Authentication establishes identity; authorization decides whether that identity
may perform an action on a particular resource. Deny by default. Derive the
principal and tenant from verified identity or trusted server-side context,
not request fields. A requested tenant or object identifier is a selector,
not proof of access. Apply resource ownership, role and policy constraints
at every relevant access path, including background tasks, exports, bulk
operations and alternate entry points. Do not rely on UI visibility or
middleware alone. Use shared policy evaluation without bypassing enforcement.

Scope queries and mutations to the authorized tenant and resource; use
parameterized SQL. Avoid check-then-use races by enforcing constraints within
the transaction or equivalent atomic boundary when needed. Define how
revocation, stale authorization, cache keys and service identities behave.
If a required policy service is unavailable, fail closed according to the
approved contract, never silently grant access.

## Validate input and constrain resources

Parse untrusted data into validated types; check semantic bounds, length,
encoding, allowed values and cross-field constraints. Bound request bodies,
decompression, recursion, allocation, queues and processing time before
expensive work. Do not pass untrusted strings into shell commands, query
syntax or filesystem paths. Validate destinations against the actual
filesystem or network trust policy when necessary; lexical path checks alone
do not establish confinement. Use established parsers and cryptographic
libraries rather than implementing custom cryptography. Preserve signature
verification and TLS identity validation; no insecure fallback.

## Protect secrets and audit

Load credentials through approved providers with minimal permissions.
Do not commit or log credentials, tokens, private keys, full sensitive
payloads or unnecessary personal data. Check Debug, Display, error sources,
tracing fields, crash output and fixtures; a redacted wrapper is helpful but
does not prevent every disclosure. Record necessary security events with safe
identifiers, outcome and correlation context under the approved audit policy.
Keep operational telemetry separate from mandatory audit guarantees.
Protect audit integrity and retention; do not silently discard a required
audit event or invent a transaction guarantee.

## Verification

When performing a review, provide findings with affected path, impact,
evidence, confidence and proposed remediation; do not edit without authority.
For an authorized implementation, run the project's configured formatting,
clippy, tests and integration checks across supported targets and features.
Add -D warnings only where no lint policy exists. Exercise denied, allowed,
cross-tenant, unauthenticated, revoked or expired access where relevant;
assert denied operations cannot perform side effects. Test malformed inputs,
resource limits, secret redaction and audit behavior. Use isolated synthetic
data and never probe production without authorization. Run configured
security checks; missing tools or hardware evidence remain explicit gaps.
A passing scan is not proof of security.

Route dependency provenance and advisories to `/rust-supply-chain`,
memory invariants to `/unsafe-rust`, configuration to `/rust-config`, and
logging implementation to `/rust-observability`.
