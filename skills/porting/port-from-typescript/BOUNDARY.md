Under end state A there is no binding layer: the rest of this file
does not apply, and the seam is the process boundary in the
second-to-last section. The end-state decision itself is
`/port-to-rust`. Under C the binding layer is scaffolding that gets
deleted at cut-over, but must remain safe and preserve required parity; under B it is the published
package surface, and every choice below is a public API decision.

## napi-rs, the Node route (B and C)

A native addon is a cdylib exposed through Node-API. Confirm the host's
supported Node-API version, permissions, platform and module loader. Preserve
public ESM/CJS exports, types and package entry points with compatible glue.
The following snippets illustrate a pinned major API shape; use the actual
project's build setup and dependency policy.

```rust,ignore
use napi_derive::napi;

#[napi]
pub fn normalize(input: String) -> napi::Result<String> {
    Ok(input.trim().to_lowercase())
}
```

with the build fragments beside it — `Cargo.toml` declares the crate
type, `package.json` the build script:

```toml
[lib]
name = "fastcore"
crate-type = ["cdylib"]

[dependencies]
napi = "3"
napi-derive = "3"
```

```json
{
  "name": "fastcore",
  "version": "0.1.0",
  "devDependencies": {
    "@napi-rs/cli": "^3.0.0"
  },
  "scripts": {
    "build": "napi build --release"
  }
}
```

Inspect generated addon artifacts and glue with the pinned napi CLI.
Do not assume generated exports match the public package. Supported async
bindings can return Promises; inspect the actual runtime and worker executor.
Keep long blocking or CPU work off the event loop using bounded approved
execution resources. Treat JavaScript environment handles and references as
thread-affine unless the API explicitly permits transfer. Use supported
thread-safe callback mechanisms, and verify cancellation, environment cleanup
and worker teardown. Never retain a JavaScript handle past its valid lifetime.

## wasm-bindgen, the browser and edge route

Verify the actual host, target triple, imports and capabilities. wasm32-unknown-unknown
does not supply general host filesystem or socket APIs; WASI and other hosts
have different contracts and are not interchangeable with browser glue.
Threads and shared memory need compatible toolchains, hosts and deployment
configuration, including browser cross-origin isolation where required.
Check host-specific APIs, limits, startup and binary size before choosing
a target. Edge runtimes are not uniformly Node-compatible.

Choose wasm-bindgen/wasm-pack output for the actual consumer: web, bundler,
nodejs or another supported configuration. Verify initialization and module
loading in the deployed host. Measure boundary conversions and copies;
not every scalar is serialized, and a typed view is not automatically an
owned buffer.

```rust,ignore
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn process_data(input: &str) -> String {
    format!("processed: {}", input)
}
```

## Errors across the boundary

A Rust `Err` becomes a thrown JavaScript value, and the existing
`catch` blocks may branch on `instanceof` or on a `code` property. Map
the error enum to the shape callers already handle rather than
accepting the default, which stringifies — a port that throws a plain
`Error` where the source threw a `TypeError` breaks the `catch`
branches the corpus never covers.

## Data crossing the boundary

Buffers and typed arrays may be borrowed or transferred only under the
binding's explicit lifetime, alignment, ownership and mutability contract.
Check offsets, lengths, detachment, shared memory, concurrent mutation and
external-buffer finalizers. A WebAssembly memory grow can invalidate or
leave stale JavaScript views; reacquire views as required by the host.
Do not return a view of temporary Rust storage. Verify how the pinned
binding handles UTF-16, UTF-8, lone surrogates, BigInt and Number conversions.
JSON conversion can change numeric and presence semantics; use it only
where compatible with the contract. Measure actual copies and end-to-end cost.

## The no-bindings route, for end state A

The seam is a boundary the system already has — an HTTP route, a CLI
subcommand, a queue or cron worker — and the Rust binary takes one at
a time while Node keeps the rest. The differential harness runs
process-to-process: the same request, or argv and stdin, through
both, with responses, stdout, and exit codes compared. What this
costs relative to bindings: the comparison happens over serialized
output, and the granularity is the existing boundary rather than a
function. What it buys: no addon to build, no prebuilds to publish,
no wasm size budget, and a port that ends with one runtime instead of
two.

## Packaging and CI

Under B verify the approved OS, architecture, libc, Node-API/runtime and
module-system matrix, or actual WebAssembly host and bundler combinations.
Install the packed artifact into clean consumer projects and verify public
exports, declarations, loader behavior, supported fallback, and integration
suite. Inspect package contents and lockfile policy; a local addon import
is not distribution verification. Under C rebuild and verify the fresh
scaffold on required hosts. Under A verify the standalone artifact. Report
missing runtime evidence and never publish without authorization.
