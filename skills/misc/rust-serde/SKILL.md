---
name: rust-serde
description: Serde as the boundary where untrusted input becomes a domain type — rename_all, default, skip_serializing_if, flatten, the four enum representations, deny_unknown_fields, and try_from validation. Use when deriving Serialize or Deserialize, when choosing an enum wire representation, when a JSON or YAML shape does not match the Rust type, or when the user asks how to validate deserialized data.
---

# Rust Serde

A derived deserializer checks the represented shape and field types, not every
domain rule. Validate untrusted data before constructing a trusted domain value.

## Deserialization is a parse

The type you deserialize into is the type the rest of the program trusts, so it
is the last place validation is cheap. A `Config` that deserializes with a
`String` port and checks it in `run()` has moved the failure past every layer
that could have reported it usefully. What the validated type should be is
`/type-driven-design`; this skill owns the boundary that type crosses.

## `#[serde(try_from = "...")]` is the mechanism

Deserialize into a raw shape, convert with `TryFrom` into the validated type,
and the conversion failure becomes a deserialization error — the read fails,
not the first use of the value. The conversion error must implement `Display`; implementing `std::error::Error`
is optional for this Serde attribute.

```rust
#[derive(serde::Deserialize)]
struct RawConfig {
    workers: u32,
}

#[derive(serde::Deserialize)]
#[serde(try_from = "RawConfig")]
struct WorkerCount(u32);

#[derive(Debug)]
struct ZeroWorkers;

impl std::fmt::Display for ZeroWorkers {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "workers must be at least one")
    }
}

impl std::error::Error for ZeroWorkers {}

impl TryFrom<RawConfig> for WorkerCount {
    type Error = ZeroWorkers;

    fn try_from(raw: RawConfig) -> Result<Self, Self::Error> {
        if raw.workers == 0 { Err(ZeroWorkers) } else { Ok(WorkerCount(raw.workers)) }
    }
}
```

## Naming across the boundary

`#[serde(rename_all = "camelCase")]` on the type, not `rename` on every field:
the Rust name follows Rust convention, the attribute carries the wire convention,
so neither side distorts the other.

## Optionality has three meanings, and they are different

- `#[serde(default)]` — the field may be absent and has a sensible zero;
  `T::default()` fills it when absent. Explicit null is handled by the field's
deserializer, which may accept it (for example Option) or reject it.
- `Option<T>` — absent and null both land in `None`, erasing the distinction;
  when the code must say which it means, the field is not a bare `Option`.
- `#[serde(skip_serializing_if = "Option::is_none")]` — do not emit the key at
  all on the way out.

Getting these wrong produces a round-trip that is not one — the bug that shows
up in a system you do not run, failing on a payload you produced.

## The four enum representations

| Representation | On the wire | Constraint |
|---|---|---|
| External — the default | `{"Named": "x"}`: a one-key wrapper around the variant | the wrapper key is noise when the payload already says what it is |
| Internal — `tag = "type"` | `{"type": "Named", "name": "x"}`: the tag inside the variant | does not support tuple variants; newtype variants need a compatible map or struct representation |
| Adjacent — `tag` plus `content` | `{"type": "Named", "value": "x"}`: tag and payload as siblings | the tag key is reserved in the envelope — a wire shape that already spends it at the top level cannot use this representation |
| Untagged | the variant shape as-is, no marker | tries every variant in order and reports a useless error when all fail — last resort, never for input you must diagnose |

External is the default; internal and adjacent are what a self-describing
message needs; untagged is for a shape no representation fits.

## `deny_unknown_fields` is a decision, not a default

Denying catches typos in a config file the user writes — a silently ignored
key is a support ticket. Accepting lets a producer add a field without
breaking every consumer. Choose per type: a config file usually denies, a
message from a service you do not control usually accepts.

## `flatten` and what it costs

It composes a shared struct into several types without repeating the fields,
and it costs twice: it is unsupported with `deny_unknown_fields` on either participating struct,
and may require buffering during deserialization. Worth it for composition, not
for saving four lines.

## Serde in a library crate

A library whose public types describe data (records, messages, configuration
shapes) should let callers serialize them: implement `Serialize` and
`Deserialize` on those types. Make it opt-in, because most users never touch
a wire format and should not compile serde for it. The feature carries the
bare name `serde`, so downstream crates enable it by the name they already
expect, and the derives are gated on it:

```rust,ignore
#[derive(Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Reading {
    pub sensor: String,
    pub celsius: f64,
}
```

The feature must stay additive: enabling it adds impls and changes nothing
else, and the attributes inside the type stay behind `cfg_attr` too. The
dependency itself is optional and declared with `features = ["derive"]`.
Types that are not plain data (handles, guards, anything holding a
resource) get no impls, because a wire form for them would be a lie.

## Schema evolution and resource limits

Treat wire compatibility separately from Rust source compatibility. Preserve
existing field names, enum tags, defaults and missing/null distinctions unless
a migration is approved. Use aliases for accepted historical names when suitable;
choose emitted names deliberately. Test old producer and consumer fixtures in
the supported directions, including unknown fields, duplicate keys, unknown tags,
invalid domain values and ambiguous untagged variants. Do not infer compatibility
from a self-round-trip.

Apply byte, nesting, collection and decompression limits at the appropriate
transport/parser boundary before expensive allocation or processing. A conversion
that rejects an oversized collection after deserialization does not bound the
allocation that already happened. Use existing bounded readers or visitors where
needed. Keep parser errors and raw payloads out of sensitive diagnostics.

## Errors from the boundary

A deserialization failure is user-facing input error, not a bug: it carries the
reason — and, in JSON, a line and column once the failure sits in a nested
field — and it goes into the crate error type as its own kind, not a
stringified message. Shaping that kind is `/rust-errors`.

## Deferrals

What the validated type should be is `/type-driven-design`; whether it is
public API is `/rust-api-design`; custom derive mechanics are `/rust-macros`;
numeric range validation is the numerics companion of `/type-driven-design`.

## Verification

Run at the lint level the target repo configures; the fallback applies only
when the repo configures no lints at all:

```bash
cargo test                   # round-trip tests: serialize, deserialize, compare
cargo clippy --all-targets   # at the level the repo configures
```

Plus the check the compiler cannot do: for every type crossing a wire, a test
that a real payload from the other side deserializes — a round-trip that only
round-trips your own output proves the type agrees with itself.
