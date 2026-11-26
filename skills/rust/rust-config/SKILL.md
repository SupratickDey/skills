---
name: rust-config
description: Design typed runtime configuration for Rust applications. Use when adding environment variables, deployment settings, config files, CLI overrides, startup validation, secret references, or configuration reload. Not for Cargo lint or toolchain setup, generic domain modeling, or unrelated serialization work.
---

# Rust Configuration

Resolve deployment settings at the application boundary, validate the resulting
snapshot, then pass the relevant typed values into the components that use them.
Do not make every consumer read the process environment or depend on the entire
application configuration.

## Inspect before changing

Read the existing configuration loader, deployment manifests, documented
settings, startup sequence, tests and project specification. Identify whether
the setting is operational configuration, a domain invariant, tenant policy or a
secret. Preserve existing names, units, precedence, default values and
deployment compatibility unless a change is authorized. Do not introduce a
configuration framework when the current mechanism is sufficient.

| Kind | Owner |
|---|---|
| Timeout, queue capacity, endpoint, worker count | Validated deployment settings |
| Domain limit that is part of a business contract | Domain model or approved business policy |
| Tenant-specific value | Authorized tenant policy store, not an untrusted request header |
| Credential, signing key, token | Approved secret provider with restricted access |
| Cargo lint, edition, toolchain | setup-rust-skills |

## Load, resolve, validate, inject

1. Define a schema with explicit units, required fields and permitted ranges.
2. Read the approved sources once at startup. Document their precedence,
   including whether an empty value is distinct from an absent value. For new
   projects, a possible policy is defaults, file, environment, then explicitly
   supplied CLI options; do not impose it on an existing application.
3. Distinguish missing values, malformed values, inaccessible files and invalid
   encodings. Defaults apply only to genuinely absent optional settings. An
   invalid explicit override is an error, not a reason to silently use a default.
4. Validate individual fields and cross-field constraints before starting
   listeners, workers or external side effects. Use types such as Duration,
   NonZeroUsize, SocketAddr or a validated application type when appropriate.
5. Inject the smallest required configuration into services. Libraries accept
   settings from callers instead of reading ambient environment by default.

Run the `/rust-serde` skill for deserialization details and
`/type-driven-design` for invariants.
Choose unknown-field handling deliberately: reject typos in owned config files
unless a forward-compatible contract requires accepting unknown fields.

## Security and lifecycle

Keep secret values out of example files, source, error chains, Debug/Display
output, logs and command arguments. Use secret references or the approved
provider; redact diagnostics and report field names rather than raw values.
Never use a configuration option to bypass mandatory authentication, signing,
authorization, isolation or approval controls. A feature flag is not a
substitute for authorization.

Keep immutable snapshots by default. If hot reload is required, validate the
whole candidate before publishing it atomically, retain the last known good
snapshot on rejection, and define how existing connections, credentials and
in-flight requests transition. Record a safe revision identifier and the
result, not the complete settings. Do not promise hot reload for fields whose
resources require restart or controlled replacement.

## Test and document

Keep pure parsing/merging/validation functions separate from I/O. Inject a
source or map in unit tests; use child-process environments for startup
integration tests. Do not mutate global process environment in parallel tests.
In Rust 2024, set_var and remove_var are unsafe; avoid using them as test
convenience even in earlier editions.

Read SETTINGS-CONTRACT.md for the documentation schema and edge-case checklist.
Use synthetic secrets in redaction tests. Test source precedence, missing versus
empty versus malformed input, numeric limits, cross-field conflicts and rejected
reloads. For changed settings, test the old deployment contract or document
the approved migration.

## Verification

Run the target project's format check, configured clippy and relevant tests
using its supported workspace members, features and MSRV. For a simple crate:

```bash
cargo fmt --check
cargo clippy --all-targets
cargo test
```

Add -D warnings only if the target repository has no lint configuration.
Where the application exposes a documented config-check mode, exercise it with
valid and invalid synthetic inputs without connecting to production. Verify
startup rejects invalid settings before side effects and diagnostics do not
contain test secrets. Report unexecuted startup or reload checks separately.
