# Modelling choices

The depth for `SKILL.md`: how to state a choice in a parameter, which standard
type to reach for, what a newtype can do beyond carrying an invariant, invariant enforcement, and what to do instead of runtime reflection.

## Absence, choices, and flags

**Absence is `Option`, never a sentinel.** A `-1` for "no index", an empty string
for "no name", a zero for "no limit" are values the compiler cannot tell from real
ones, and every caller must remember the convention. `Option<T>` makes the
missing case a type the caller has to handle. If the reason for absence matters,
the type is `Result`, not `Option`; that call is `/rust-errors`.

**A choice in a parameter position gets a name.** `render(doc, true, false)` is
unreadable at the call site, and `bool`, `u8`, or `Option` in a parameter says
nothing about what the value means. Pick by how the choice may change:

| The choice is | Use | Why |
|---|---|---|
| Two options today, a third plausible | An enum | Adding a variant later is a localized change; callers already write the name. |
| Boolean for good, and passed in a place where `true` is opaque | A newtype around `bool` | The call site names it, and no third state is invited. |
| Several independent on/off switches | A flags type (the `bitflags` crate), or separate named fields | An enum holds one value from a closed set at a time; independent switches would multiply its variants. |

```rust
enum Visibility {
    Public,
    Private,
}

enum Compression {
    None,
    Fast,
    Best,
}

fn publish(name: &str, visibility: Visibility, compression: Compression) {}

fn main() {
    // Reads as prose; swapping the last two arguments does not compile.
    publish("report", Visibility::Private, Compression::Fast);
}
```

An enum can express additional choices without changing the parameter type,
but adding a variant can break exhaustive downstream matches.
When a parameter has to stay a `bool`, a short comment at the call site naming
it is the fallback, not the goal. When an enum is fixed in a wire format or a C
interface, give its variants explicit discriminants so the numbers are a decision
written in the source and not an accident of declaration order.

## The strongest standard type

Before inventing a type, check whether `std` already has the exact one. A
filesystem location is a `Path` or `PathBuf`, not a `String`, because OS paths
need not be valid UTF-8. A span of time is a `Duration`, a point in it an
`Instant`, a network endpoint a `SocketAddr`. A plain count that carries no
invariant stays a plain integer; `NUMERICS.md` covers when that holds at a public
boundary.

## Newtypes: beyond the invariant

A type alias gives a second name and nothing more: `type UserId = u64` and
`type OrderId = u64` are interchangeable, and the compiler accepts one where the
other is expected. When
the difference is a semantic one that a mix-up would turn into a bug, use a
newtype; reserve aliases for shortening a long type.

A newtype also chooses which traits the wrapped type exposes. Wrapping a secret
and implementing `Debug` by hand to print `[redacted]`, or deriving neither
`Clone` nor `Display`, stops the value leaking through a log line or a careless
copy. There is no runtime cost; the price is forwarding the methods you do want
to the inner value by hand.

```rust
use std::fmt;

struct ApiToken(String);

impl fmt::Debug for ApiToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("ApiToken([redacted])")
    }
}

impl ApiToken {
    fn as_header_value(&self) -> &str {
        &self.0
    }
}
```

An invariant newtype whose bounds are fixed at compile time may expose a
panicking `const fn new` for use in constants, where the panic becomes a build
error. Pair it with a fallible constructor for runtime input, and do not give it
an infallible `From`; conversion that can fail is `TryFrom` or `FromStr`:

```rust
#[derive(Debug, Clone, Copy)]
struct Month(u8);

impl Month {
    const fn new(value: u8) -> Self {
        assert!(value >= 1 && value <= 12, "month must be in 1..=12");
        Month(value)
    }

    fn try_new(value: u8) -> Option<Self> {
        (1..=12).contains(&value).then_some(Month(value))
    }
}

const LAUNCH: Month = Month::new(7);
```

## Invariant enforcement

Prefer a type that represents only valid states, backed by checked runtime
construction wherever input cannot be proven statically. Keep runtime validation
for facts that can change after construction. Check all safe constructors,
conversions, deserializers and mutations, including arithmetic and mutable
accessors. Debug assertions are supplementary diagnostics, not validation
required in optimized builds.

An unchecked construction path must not let safe callers create values that
violate the promised invariant. If an unchecked path has a memory-safety
precondition, use an unsafe interface with an explicit safety contract and
justify the need. For non-safety-related preconditions, prefer a checked
constructor or a separately named raw representation rather than a trusted
type that can contain invalid values.

## Invariants written as comments

A comment such as `// must be None if the mode is Manual` or `// offsets are
zero unless compressed` is an invariant the compiler cannot see. Whenever a field
comment says "must be X if Y", replace the pair of fields with an enum whose
variants carry only the data that is valid in each case, so the forbidden
combination cannot be written.

```rust
// Before: the comment is the only thing preventing a bad state.
struct Backup {
    compressed: bool,
    /// Must be Some if `compressed` is true, None otherwise.
    level: Option<u8>,
}

// After: `level` exists exactly where it means something.
enum Payload {
    Plain,
    Compressed { level: u8 },
}
```

## Reflection: use traits instead

Rust has no general runtime reflection: a value cannot be asked for its fields or
methods by name. Three narrow tools exist, and none fills the gap.
`std::any::type_name` returns a string meant for diagnostics; its text is not
guaranteed stable and must not drive logic. `TypeId` and `Any::downcast_ref`
work only on a value already stored behind `dyn Any`, and only to recover a type
you can already name:

```rust
use std::any::Any;

fn as_count(value: &dyn Any) -> Option<u32> {
    value.downcast_ref::<u32>().copied()
}
```

Instead of asking what a value is, state what it must do. Put required behaviour
in a trait, mark a property with an empty marker trait (`Send`, or your own),
and generate per-type code at compile time with a derive macro. The compiler then
checks at build time what reflection would discover at run time.
