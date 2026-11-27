---
name: port-from-typescript
description: Port TypeScript or JavaScript into Rust — construct mapping against runtime semantics, the traps (every number is an f64, two kinds of absent, structural typing, regex feature gaps), and the napi-rs and wasm-bindgen boundaries. Use when porting, rewriting, or migrating TypeScript, JavaScript, Node, Deno, Bun, Express, or a JS CLI or library into Rust, when replacing a hot JS module with a native addon or WebAssembly, or when the user asks how a TypeScript or JavaScript construct translates to Rust.
---

# Port from TypeScript

## A construct mapping and two boundaries, nothing else

This skill maps the JavaScript runtime to Rust and owns the two
boundaries, napi-rs and wasm-bindgen. The parity contract, the
phases, and the anti-patterns are `/port-to-rust`. TypeScript and
JavaScript are one skill because they are one runtime: the types
are erased before anything runs, so the mapping is the same and
the annotations are evidence about intent, not guarantees about values.

## The end state decides whether a binding layer appears at all

`/port-to-rust` names three end states, and this skill asks rather than
assumes.

| End state | In TypeScript and JavaScript terms | Binding layer |
|---|---|---|
| A. Replacement | A Rust binary or crate takes over; nothing imports it from JavaScript afterwards, and the seam is the CLI, route, or worker that already exists | Neither napi-rs nor wasm appears |
| B. Rust core, the npm package is the product | The module keeps its name and its exported signatures; the engine underneath becomes Rust | Permanent public surface — signatures, error types, prebuilds per platform, semver |
| C. Scaffold | The port ends standalone, but JavaScript calls the Rust module while the migration is under way | Temporary, and deleted at cut-over |

## Two boundaries, and the target decides which

Under B or C, consider napi-rs for a supported Node-API runtime, or
wasm-bindgen for an appropriate WebAssembly host. Node, Deno, Bun, browsers
and edge runtimes differ in addon support, imports, permissions and host APIs.
WebAssembly capabilities depend on the target and host. Verify compatibility
and conversion costs before choosing a boundary. See BOUNDARY.md.

## The traps that break parity silently

| Trap | What actually differs |
|---|---|
| Every `number` is an `f64` | Number is binary64, with a safe integer range of -(2⁵³-1) through 2⁵³-1. BigInt is a separate type. Number bitwise operators use 32-bit conversions (unsigned for `>>>` and unsigned shift counts) — so `x \| 0` is a documented truncation the port must reproduce or deliberately drop. Decide per field: `i64`, `f64`, or `i32`, and record which in the contract |
| Two kinds of absent | `undefined` and `null` are distinct, and most codebases use both without a rule. Use a distinct missing/null/value representation where observable; Option alone collapses absence. JSON object omission and array null substitution have different rules. |
| Sorting | `Array.prototype.sort` with no comparator sorts by UTF-16 string conversion, so `[10, 9].sort()` is `[10, 9]`. A port that uses a numeric sort produces a different, *better*, and non-parity result |
| Regex | JavaScript regexes use backtracking and support lookaround and backreferences; the `regex` crate does not. Any source pattern using them needs a different crate or a restructured matcher, and this is found at port time, not at review time |
| Exceptions carry anything | `throw` accepts any value, and `catch` receives it untyped. Mapping to `Result` means naming the error cases the source never named — `/rust-errors` — and the ones that were thrown from library code are the ones no test covers |

## Preserve runtime coercions

Characterize Number rounding, NaN, infinities, signed zero, remainder,
ToInt32/ToUint32 and masked shift counts before mapping arithmetic.
For a Number bitwise conversion, non-finite values and either zero become
zero; finite values are truncated toward zero and reduced modulo 2^32.
Do not rely on Rust's saturating float-to-integer casts for this conversion.
Keep BigInt arithmetic and its mixing/type errors separate.

```rust
fn js_to_int32(value: f64) -> i32 {
    if !value.is_finite() || value == 0.0 {
        return 0;
    }
    let reduced = value.trunc() % 4_294_967_296.0;
    // The signed remainder lies strictly between -2^32 and 2^32.
    let unsigned = (reduced as i64).rem_euclid(4_294_967_296) as u32;
    unsigned as i32
}
```

This models Number conversion only, not JavaScript object coercion or
BigInt bitwise operators. Preserve UTF-16 code-unit indexing, lone surrogates
and default sort order where observable. A Rust UTF-8 string or byte
comparison is not an interchangeable representation. Characterize sparse
array holes, undefined, null, property enumeration, SameValueZero equality
and JSON behavior before choosing Rust data types.

## Mapping, in one line

`MAPPING.md` holds the full table; a mapping row is a starting
point, not a rewrite rule. Read the runtime values, not the
annotations: the type was erased before anything ran, so `any`, an
`as` cast, and an unchecked JSON boundary are unknown input.

## Unions are the win, and they are `/type-driven-design`

A discriminated union with a `kind` field is a Rust enum, and
translating it is where a TypeScript port stops reading like
TypeScript. A non-discriminated union (`string | number`) is a
design question the source deferred and the port must answer.
Structural typing maps to a trait only with several implementations;
an `interface` with one implementing type is a `struct`.

Objects carry the same judgment: a plain object with known keys is
a `struct`; `Record<string, T>` with a dynamic key set is a
`HashMap`; `Map` preserves insertion order where `HashMap` does not,
so insertion-order iteration requires an insertion-ordered representation,
not BTreeMap's sorted keys. Ordinary object property enumeration also has
special ordering for array-index keys. Getting this
wrong shows up as reordered JSON output, which is a contract question.

## The test suite is the corpus

Jest or Vitest cases are characterization input, not the parity
contract. JavaScript suites are especially thin on the coercion
edges — `""`, `0`, `NaN`, `undefined` versus a missing key — exactly
where a port narrows behaviour. Harness shapes are `/rust-testing`.

## The event loop was doing work you now have to do

An event loop does not prevent races across await points, callback reentry,
or shared memory in workers. Inspect ownership, ordering, cancellation and
runtime requirements. A Promise constructor executes its executor immediately;
calling an async function starts execution through its first suspension.
Rust async function bodies begin when polled, and dropping a future does not
necessarily cancel independently spawned work. Preserve observable initiation,
settlement and cancellation behavior. Use the existing Rust runtime and
route task ownership to `/async-rust`.

## Verification

```bash
cargo test
cargo clippy --all-targets   # add -- -D warnings only if no lint policy exists
npm test                   # only when this is the project's actual test command
```

Select supported features and targets and the existing host package manager.
For B/C build the fresh artifact and verify the public package entry point,
loaded artifact provenance and supported runtime integration. For A run
process-to-process parity. Report blocked host or target checks explicitly.

Then the differential run with its denominator, plus the
language-specific corpus requirement: at least one case per trap —
a number above 2⁵³, a `null` where `undefined` also occurs, an
unsorted numeric array, a regex input that used lookahead, and a
thrown non-`Error` value.
