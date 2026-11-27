## What it does

Maps the JavaScript runtime to Rust — the construct mapping is
written against the values the runtime actually produces, since
TypeScript types are erased before anything runs — and carries the
mechanics of the two boundaries: napi-rs for Node, Deno, and Bun,
wasm-bindgen for the browser and the edge. The defining constraint:
it maps the JavaScript runtime rather than the TypeScript type
system, and every process question is deferred — the parity
contract, the phases, and the anti-patterns are `/port-to-rust`.

## When to reach for it

Model-invoked: the agent pulls this in when TypeScript or JavaScript
code is moving into Rust — a Node, Deno, or Bun service, an Express
app, a JS CLI or library, or a hot JS module being replaced by a
native addon or a WebAssembly build — and the question is what a
TypeScript or JavaScript construct becomes, or how the boundary
works. It does not cover how a port is run (that is `/port-to-rust`),
the differential harness (`/rust-testing`), or the shape of the Rust
that comes out (`/idiomatic-rust` and the other craft skills). There
is no separate JavaScript skill: JavaScript is the same runtime
without the erased layer. The user can run it directly, as
`/port-from-typescript`.

## Prerequisites

A runnable TypeScript or JavaScript implementation and its test
suite, a Cargo project, and a decided end state — `/port-to-rust` is
run first, because whether a binding layer exists at all is settled
there. Under end state B or C, also a decision about the target
runtime — Node, Deno, or Bun versus a browser or edge runtime —
because it selects the boundary.

## The traps

| Trap | What actually differs |
|---|---|
| Every `number` is an `f64` | Number is binary64, with a safe integer range of -(2⁵³-1) through 2⁵³-1. BigInt is a separate type. Number bitwise operators use 32-bit conversions (unsigned for `>>>` and unsigned shift counts) — so `x \| 0` is a documented truncation the port must reproduce or deliberately drop. Decide per field: `i64`, `f64`, or `i32`, and record which in the contract |
| Two kinds of absent | `undefined` and `null` are distinct, and most codebases use both without a rule. Use a distinct missing/null/value representation where observable; Option alone collapses absence. JSON object omission and array null substitution have different rules. |
| Sorting | `Array.prototype.sort` with no comparator sorts by UTF-16 string conversion, so `[10, 9].sort()` is `[10, 9]`. A port that uses a numeric sort produces a different, *better*, and non-parity result |
| Regex | JavaScript regexes use backtracking and support lookaround and backreferences; the `regex` crate does not. Any source pattern using them needs a different crate or a restructured matcher, and this is found at port time, not at review time |
| Exceptions carry anything | `throw` accepts any value, and `catch` receives it untyped. Mapping to `Result` means naming the error cases the source never named — `/rust-errors` — and the ones that were thrown from library code are the ones no test covers |

## Bindings, or no bindings

The end state decides whether a binding layer appears at all:

| End state | In TypeScript and JavaScript terms | Binding layer |
|---|---|---|
| A. Replacement | A Rust binary or crate takes over; nothing imports it from JavaScript afterwards, and the seam is the CLI, route, or worker that already exists | Neither napi-rs nor wasm appears |
| B. Rust core, the npm package is the product | The module keeps its name and its exported signatures; the engine underneath becomes Rust | Permanent public surface — signatures, error types, prebuilds per platform, semver |
| C. Scaffold | The port ends standalone, but JavaScript calls the Rust module while the migration is under way | Temporary, and deleted at cut-over |

Under B and C choose a native Node-API addon or WebAssembly according to
actual runtime support, loader, permissions, host capabilities and deployment
requirements. Preserve the public package interface. WebAssembly threading,
filesystem and network access depend on target and host; conversions have
measurable costs. Under B the binding is permanent public API; under C it
is a temporary but safety-critical compatibility surface. Under A there is no
binding layer at any point and the seam is the process boundary the
system already has — an HTTP route, a CLI subcommand, a queue or cron
worker — with the differential harness running process-to-process.
The mechanics are in `BOUNDARY.md`.

## Runtime and package compatibility

Preserve Number coercions, BigInt behavior, signed zero, UTF-16 indexing,
sparse arrays and observable property order. Check missing/null/value
distinctions and actual JSON output. Preserve callback initiation, Promise
settlement and cancellation semantics. Native addons need supported
environment and thread lifetimes; WebAssembly views need ownership and
memory-growth handling. Verify the packed package from clean consumer
projects, including supported runtime, ESM/CJS exports and actual host tests.

## Common questions

**Does a JavaScript or TypeScript port have to produce a native
addon or a wasm bundle?** No. That is end state B or C, the cases
where JavaScript keeps calling the code after the port. A standalone
Rust binary is end state A and is never imported from JavaScript;
its seam is the process boundary.

**Is there a separate JavaScript skill?** No. TypeScript is
JavaScript plus types on the same runtime — same async model, same
boundary — and the types are erased before anything runs, so the
mapping is identical. One skill, `port-from-typescript`, covers both.

**What happens to a regex that uses lookahead or a backreference?**
The `regex` crate does not support them, so the source pattern does
not port as-is: it needs a different crate or a restructured matcher.
This is found at port time, not at review time, so the source
patterns are inventoried before the first one is translated.

**Can both undefined and null map to Option<T>?** Only if their distinction
is irrelevant to the approved contract. Otherwise represent missing, null and
value separately and test omission and explicit null.

**Can the TypeScript types be trusted?** No. They are erased before
anything runs: an annotation is a claim the runtime never checked, so
`any`, `as` casts, and unchecked JSON boundaries are unknown input,
and the mapping follows the runtime values, not the annotations.

## It's working if

- The end state was chosen before any Rust was written, and no addon
  or wasm target exists under end state A.
- Under B and C, the existing JavaScript or TypeScript suite still
  passes with the Rust module loaded.
- The differential corpus covers a value above 2⁵³, both flavours of
  absent (`null` and `undefined`), and a coercion case.
- Unions became enums rather than structs with optional fields.
- JSON output key order and number formatting were checked against
  the source, not assumed.
- The boundary choice is written down with its consequences.

## Where it fits

`port-from-typescript` is the TypeScript and JavaScript member of
the per-language porting skills: it owns the construct mapping and
the two boundaries, and defers everything common to a port to
`/port-to-rust`, the harness mechanism to `/rust-testing`, and the
target-side judgment to the craft skills (`/rust-errors`,
`/type-driven-design`, `/async-rust`, `/idiomatic-rust`). Its
neighbours are the other per-language skills — Python, C, C++,
Go, and Java — which share its
three-file shape but carry different traps and a different
boundary. See `rust-skills-map` for how the full set relates.
