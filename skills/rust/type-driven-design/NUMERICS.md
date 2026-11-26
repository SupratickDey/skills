# Numerics

The type family, the overflow operators, and the worked example — the depth
for the numeric modelling in `SKILL.md`.

## Pick the type family first

Before any of the tools below, ask what the value is: counted, measured,
identified, or money. A count is an unsigned integer; a measurement is a float
only if it genuinely is one; an identifier is a newtype over whatever it wraps
and never arithmetic; money is an integer of minor units. Most numeric bugs
start with a value that was given a type because it fit, not because it meant
that — a `u64` that counted requests and, two files later, prices.

## `NonZero` for the value that cannot be zero

`NonZeroUsize` for a capacity, a batch size, a divisor. It removes a check at
every use site and makes the constructor the one place the invariant is
enforced — the skill thesis applied to a primitive:

```rust,ignore
let size = NonZeroUsize::new(n)?; // handled once, at the boundary
// every later use goes through size.get(); no zero-check is possible
```

### At a public API boundary

Inside a crate, `NonZero` is the default for a value that cannot be zero, and so
is it for storage that benefits from the niche (`Option<NonZeroU32>` is as small
as a `u32`). On a public signature the question changes, because the type is now
something every caller must build. A public parameter takes `NonZero*` only when
both hold: zero is a caller bug the type should rule out, and callers can make the
value easily (a literal, or a constant they already have). Otherwise accept the
plain integer and return an error for zero, so a caller holding a runtime `usize`
is not forced to unwrap a conversion first. `Saturating<T>` follows the same
test: it belongs in a public signature only when callers genuinely hold or want
that wrapper; otherwise the plain integer goes in and saturation happens inside.

## Checked, saturating, wrapping — say which

Plain integer addition follows the configured overflow-check policy. It
normally checks in debug profiles and wraps in release profiles; a project
can override that policy. Pick the operator that
names the semantics:

- `checked_add` when the overflow is a real failure the caller must handle;
- `saturating_add` when clamping to the limit is the intended result;
- `wrapping_add` when wrapping is genuinely intended — a hash, a counter, an
  index into a power-of-two ring buffer.

Choosing explicitly is the point; the arithmetic is the same either way. A
reader seeing `a + b` cannot tell which of the three was wanted.

## `TryFrom` over `as`

A narrowing integer `as` conversion can truncate silently; signedness changes
can reinterpret values. Widening lossless conversions are different. `u64 as u32` on a value above
`u32::MAX` produces a number, and there is no evidence anywhere that it was
ever wrong. `u32::try_from(n)?` at the boundary, once, is the whole fix:
after the boundary the value is a `u32`, and no call site has to remember it
came from somewhere wider.

## Floats compare badly

Use exact equality when the contract calls for exact representable values.
For approximate numerical comparisons, choose absolute and/or relative
thresholds from the domain and define NaN, infinity and signed-zero handling.
Use total_cmp when a total ordering is intended, including its NaN and
signed-zero distinctions — and for anything that is money or a count, the family pick above has
already removed the float.

## Where the newtype pays for itself

One complete example: a `Cents(i64)` that cannot be added to a `Meters(i64)`,
with the constructor doing the validating:

```rust
#[derive(Debug, Clone, Copy)]
struct Cents(i64);

#[derive(Debug, Clone, Copy)]
struct Meters(i64);

impl Cents {
    // The constructor is the one place the invariant is enforced: a total
    // the domain can actually use.
    fn new(value: i64) -> Option<Self> {
        const LIMIT: i64 = 100_000_000_000; // one billion dollars, in cents
        (-LIMIT..=LIMIT).contains(&value).then_some(Cents(value))
    }

    fn plus(self, other: Self) -> Option<Self> {
        self.0.checked_add(other.0).and_then(Self::new)
    }

    fn as_cents(self) -> i64 {
        self.0
    }
}

impl Meters {
    // Anything beyond the circumference of the earth is not a measurement here.
    fn new(value: i64) -> Option<Self> {
        const LIMIT: i64 = 40_000_000;
        (-LIMIT..=LIMIT).contains(&value).then_some(Meters(value))
    }

    fn as_meters(self) -> i64 {
        self.0
    }
}

fn main() {
    let price = Cents::new(1_999).unwrap();
    let height = Meters::new(2).unwrap();

    // price.plus(height) is a compile error: `plus` takes a `Cents`, and no
    // operator is defined across the two types, so the wrong sum cannot be
    // written at all.
    let doubled = price.plus(price).unwrap();
    assert!(Cents::new(100_000_000_000).unwrap().plus(price).is_none());
    println!("doubled: {} cents, height: {} m", doubled.as_cents(), height.as_meters());
}
```

The private field is the load-bearing part, as in `SKILL.md`: without it, a
literal outside the defining module could bypass the range check. The
arithmetic method must also preserve the range; a sum can exceed the domain
limit without overflowing i64.
