## What it does

Designs typed application configuration and validates it at the application
boundary before dependent work begins. The defining constraint is a single
validated settings snapshot with explicit source precedence and narrow
dependency injection, rather than ambient environment access in business code.

## When to reach for it

Model-invoked for changes to runtime settings, environment variables,
configuration files, startup validation, secret references or reload.
Users can invoke it directly by name. It does not configure Cargo lints or
toolchains (setup-rust-skills), own domain models (type-driven-design), or
choose a wire representation (rust-serde).

## Loading and lifecycle

Keep operational settings separate from domain policy and secrets. Preserve
the existing deployment contract; document source precedence, units, ranges
and defaults. Reject invalid explicit overrides rather than silently replacing
them. Resolve and validate before starting services, then inject the narrow
typed settings that each needs. Prefer immutable snapshots unless the
requirements call for reload. Validate a complete replacement before publishing
it and retain the last known good state if validation fails.

## Common questions

**Must everything come from environment variables?** No. Preserve the approved
configuration sources and precedence; files, environment, command-line options
and designated secret providers may each serve a different purpose.

**Should configuration tests call set_var?** Prefer injected maps or child
processes with explicit environments, avoiding global process mutation.

## It's working if

- The loader rejects missing required values, malformed overrides and invalid
  cross-field combinations before dependent side effects.
- Each operational setting is documented with its units, range and lifecycle.
- Tests cover precedence, compatibility and secret redaction.
- No mandatory security control can be disabled by an unauthorized setting.
- Applicable repository checks and safe startup or reload tests are reported.

## Where it fits

Works alongside type-driven-design, rust-serde, rust-errors and
rust-observability. See rust-skills-map for the full routing table.
