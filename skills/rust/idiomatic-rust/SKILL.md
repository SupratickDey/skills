---
name: idiomatic-rust
description: Write Rust that reads like Rust — iterator pipelines over index loops, From/Into over ad-hoc converters, derives over hand-written impls, newtypes over bare primitives. Use when writing new Rust, when reviewing Rust that reads like a translation from another language, when reaching for a classic design pattern (strategy, command, visitor) or a try/finally cleanup in Rust, when naming a constructor, accessor, iterator, or error type, or when the user asks how to make Rust code more idiomatic or less repetitive.
---

# Idiomatic Rust

This skill is about *expression*: what form does a Rust reader expect to see?

Three principles sit under every choice here. Readability beats writeability: pick the
form that is quickest to read, even if it is longer to type. Uniformity beats cleverness:
when similar code takes the same shape everywhere, a tool or a scripted sweep can change
it in one pass, and rustfmt settles layout so reviews skip it. And consistency with the
ecosystem beats local taste: follow the conventions the Rust project and the standard
library already set, except where the repo has a settled convention that differs.

## The shape of idiomatic Rust

Prefer expressions over statements: a `match` that returns a value beats one that
assigns to a `let mut` in every arm, and a chain that produces the answer beats a
flag variable set in a loop and checked after it — let the type system carry
invariants instead of runtime checks. `let ... else` keeps an early return at the
top instead of drifting the happy path rightward under a nested `if let`;
`matches!` is the boolean test on a pattern. If-let chains compose conditions where
the toolchain supports them — a recent edition, so check the repo MSRV first.

## Iterators

Prefer direct iteration or an iterator pipeline to manual indexing when it makes the
operation clearer and preserves behaviour. Iterating over a slice avoids indexing
that slice manually; indexing inside a closure can still panic. Use `get` when an
index may be absent, and handle the returned `Option`. `zip` stops when either input
ends, so check lengths first when equal lengths are part of the contract. Preserve
ordering, error handling and side effects when replacing an existing loop.
Think of a pipeline as a source (`iter`, a range), then adapters that reshape lazily
(`filter`, `map`, `take`, `zip`), then one consumer that drives it and produces a result
(`collect`, `sum`, `fold`, `find`, `any`). Nothing runs until the consumer does. The
pipeline says *what* the result is; the loop with a mutable accumulator says *how* to
build it, and the first is what a reader wants. Collect into the type you
want, not a `Vec` you then convert:

```rust,ignore
// Reads like a translation.
let mut names = Vec::new();
for user in &users {
    names.push(user.name.clone());
}

// Reads like Rust.
let names: Vec<String> = users.iter().map(|u| u.name.clone()).collect();
```

`collect` also targets `HashMap`, `HashSet`, `String`, and `Result<Vec<_>, _>` —
that last is how `?` composes with iteration.

```rust
use std::num::ParseIntError;

fn parse_all(lines: &[&str]) -> Result<Vec<i64>, ParseIntError> {
    lines.iter().map(|line| line.parse::<i64>()).collect::<Result<Vec<_>, _>>()
}
```

Prefer the plain `for` loop when the body has real side effects or an early exit a
combinator would obscure, and also when the body is long or does more than one job —
a closure that filters, logs, and accumulates reads better as a loop with named steps.
Clarity beats iterator purity.

## Conversions

When one type can be built from another, implement `From` — `Into` comes free
through the blanket impl, so never write both directions by hand. Never implement `Into` or `TryInto`
directly either: implement `From` or `TryFrom` and the blanket impl supplies the
other side. When the
conversion can fail, implement `TryFrom` instead of `From` plus a panic or a
sentinel value.

In a generic bound, `T: Into<Foo>` accepts every type with a `From` impl (since the
blanket impl supplies `Into`), but not a type that only has `TryFrom`; ask for
`TryInto<Foo>` when failure is acceptable to the caller. Prefer `From` as the thing you
implement and `Into` as the thing you ask for. Absence is `Option`, never a magic value
such as `-1` or an empty string, and a fallible result is `Result`. The inherent
constructor that may sit beside an important `From` impl is covered in `NAMING.md`.

Use `From` for infallible, lossless, value-preserving and obvious conversions, such
as `u32::from(x_u16)`. Use `TryFrom` for fallible conversions such as narrowing
`u32` to `u16`. A wider representation is not necessarily lossless, particularly
when converting integers to floating-point values.

```rust
fn widen(x: u16) -> u32 {
    u32::from(x)
}

fn narrow(x: u32) -> Option<u16> {
    u16::try_from(x).ok()
}
```

```rust
struct Celsius(f64);
struct Fahrenheit(f64);

impl From<Celsius> for Fahrenheit {
    fn from(c: Celsius) -> Self {
        Fahrenheit(c.0 * 9.0 / 5.0 + 32.0)
    }
}
```

## Derives before hand-written impls

Reach for `#[derive(Debug, Clone, PartialEq, Default, Hash)]` before writing it by
hand — a derived impl is generated from the actual fields, so it stays in sync as
the struct changes. Write the manual version only when the derive would be wrong:

- A `Default` that must preserve an invariant the field-wise default breaks (a
  `Percentage` summing to 100, not zero per field).
- A `Debug` that must redact a secret field (an API key, a password) rather than
  print it.
- `PartialEq` where logically-equal values can differ in a field that shouldn't
  count (a cached hash, a timestamp).

The comparison and copy traits come with rules of their own:

- **`Copy`** suits plain data a few words wide, where duplicating the bits is both
  correct and inexpensive. Skip it for a large type or one that owns a resource; adding
  it is a promise that removing it later breaks every caller.
- **`Clone`** is skipped for a type that stands for unique access to something (a lock
  guard, a file handle) and for secret key material, where a silent duplicate is a leak.
- **`Eq`** goes with `PartialEq` for any type whose equality is total. Never for a type
  with floats, since `NaN != NaN`.
- **`Hash`** must agree with `Eq`: values that compare equal hash equal. Derive both
  together, or write both by hand over the same fields.
- **`Ord`** requires `PartialOrd`, `Eq` and a total order. For a genuinely partial
  order, implement `PartialOrd` without `Ord` and return `None` for incomparable
  values. When implementing both manually, implement `PartialOrd` as
  `Some(self.cmp(other))` and ensure comparison and equality agree. A partial order
  alone does not satisfy the `Ord` bound of `sort` or `BTreeMap` insertion.

For an enum, `#[derive(Default)]` with `#[default]` on the intended variant is the
same rule — `BOILERPLATE.md` in this directory has the pair.

## Newtypes

A newtype costs nothing at runtime and makes a swapped-argument call a type error.
Reach for one wherever a bare `u64`, `String`, or `f64` stands in for a domain
concept (an ID, a currency amount) rather than a number. A type alias does none of this — the alias and the original are
interchangeable, so a swap still compiles. Reach for a newtype, not an alias, when the
meaning differs. Also reach for one when the type needs its own API, or when the
underlying representation may change later and callers should not notice. A newtype is
also the way past the orphan rule: when neither the trait nor the type is yours, wrap
the type in a local newtype and implement the trait on the wrapper.

## Naming

Names earn every word: `Inventory`, not `InventoryManager` — `Service`, `Manager`,
`Helper`, `Util`, `Data`, and `Info` mark a name nobody finished. The
`as_`/`to_`/`into_` prefixes promise a cost — free view, allocation, consumption.
No `get_` on a field accessor; acronyms are words (`HttpClient`, `Uuid`); a helper
that does not need `Self` is a free function, not an `impl` block used as a
namespace. The tiers table and worked pairs live in `NAMING.md`, along with the
naming families readers guess from `std`: `new` / `with_*` / `from_*` constructors,
`name` / `name_mut` / `set_name` / `take_name` accessors, iterator types named after
their method, verb-object-`Error` error names, and `Ext` extension traits (owned by the crate that owns the extended type). The
case convention per item kind, the `as_`/`to_`/`into_` table with receivers, and the rules for `with_*` constructors,
`new` beside `Default`, and `get_unchecked` live there too.

## Patterns

Most classic design patterns shrink in Rust: a one-method strategy is a closure
parameter, a command is an enum, and `try`/`finally` is a guard type whose `Drop` runs
on every exit path. A visitor earns its keep only over a tree of differing node kinds
walked by several passes. Write the small form first — `PATTERNS.md` has each pattern,
the point where it graduates to the named form, and the small idioms (a `dyn` without a
`Box`, choosing what a `move` closure captures, `Option` as an iterator).

## Readability

Bind a value in the test instead of checking then unwrapping; annotate the binding
where `.parse()`, `.into()`, or `.collect()` hide the type; prefer `TryFrom` to `as`,
which truncates without a word; build strings with `format!`, not `+`; name tuple
fields once a tuple outlives one line; keep long iterator chains out of `for` headers.
`READABILITY.md` has each one with its before-and-after, plus the import conventions.

## Boilerplate that is actually a design signal

Not all repetition is a `derive` away from disappearing — five near-identical
`match` arms, or a wrapper with ten forwarding methods, can point at a missing
abstraction. See `BOILERPLATE.md` for the pairs, including the `Deref` trap.

## Deferrals

This skill governs expression, not decision-making: the clone-versus-borrow call is
`/ownership-not-clone`, error type shape is `/rust-errors`, making an illegal
state unrepresentable is `/type-driven-design`, and builders, visibility, and what
the crate exports are `/rust-api-design`.

## Verification

Preserve observable behaviour, including error paths and edge cases. Add a focused
regression test when a rewrite changes traversal or comparison logic. Inspect the
workspace, supported feature combinations, edition and MSRV, and use the project's
configured checks. For a typical single-crate project, run:

```bash
cargo clippy --all-targets   # add -- -D warnings only if the repo has no lint config
cargo fmt --check
cargo test
```

Run the trio at the lint level the repo configures; treat `clippy::pedantic`
findings as proposals, not violations, unless the repo opted into that group.

Format only the files you changed: `rustfmt <file>` or `cargo fmt -- <files>`. If
`cargo fmt --check` flags files you did not touch, leave them alone and mention
it in your report instead of reformatting the crate. Reformatting untouched code
buries the real change in the diff and rewrites code nobody asked to change.
