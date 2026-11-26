# Rust standard library sources

## ownership-not-clone: ownership and clone semantics

- [Clone](https://doc.rust-lang.org/std/clone/trait.Clone.html): clone semantics depend on the implementation; reference-counted handles can share state.
- [Arc](https://doc.rust-lang.org/std/sync/struct.Arc.html): atomic reference counting and conditional Send/Sync.
- [Lifetime bounds](https://doc.rust-lang.org/reference/trait-bounds.html#lifetime-bounds): distinguish reference lifetime and type outlives bound.
- [Mutex](https://doc.rust-lang.org/std/sync/struct.Mutex.html): synchronization and poisoning.

## idiomatic-rust: traversal, conversion and ordering

- [Iterator::zip](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.zip): iteration stops when either input is exhausted.
- [Slice::get](https://doc.rust-lang.org/std/primitive.slice.html#method.get): checked access returns an option; indexing can panic.
- [From](https://doc.rust-lang.org/std/convert/trait.From.html): conversions should be infallible, lossless, value-preserving and obvious.
- [PartialOrd](https://doc.rust-lang.org/std/cmp/trait.PartialOrd.html): partial comparison can return None; comparison implementations must agree.
- [Ord](https://doc.rust-lang.org/std/cmp/trait.Ord.html): total ordering requires consistent equality and partial ordering.
- [Cargo features](https://doc.rust-lang.org/cargo/reference/features.html): choose checks for supported feature configurations.

## Performance and selective migration

- [fast-anything README](https://github.com/EL4CTEO/fast-anything/blob/bca1c15ad90efec263a6b3f3479a6d9843ac325b/README.md) and [skill](https://github.com/EL4CTEO/fast-anything/blob/bca1c15ad90efec263a6b3f3479a6d9843ac325b/skills/fast-anything/SKILL.md): inspiration for measured hotspot selection, held-out replay, reversible activation and A/A controls. Independently worded guidance; no dependency or claimed benchmark transfer.
- [Rust Iterator](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.zip): unequal lengths terminate zip early.
- [Rust Cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html): release and benchmark build settings.
- [Rust f64](https://doc.rust-lang.org/std/primitive.f64.html): floating-point special values and comparison semantics.

## Panic safety and FFI

- [Rust Reference: panic](https://doc.rust-lang.org/reference/panic.html): abort and unwind strategies, foreign unwinding.
- [Rust Reference: functions and ABI](https://doc.rust-lang.org/reference/items/functions.html): non-unwinding and unwinding ABI behaviour.
- [Rustonomicon: FFI](https://doc.rust-lang.org/nomicon/ffi.html): interoperable unwind boundaries.
- [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html): unwind-only handling, panic hooks, payload lifetime and foreign exception limits.

## Async and thread concurrency

- [Tokio select](https://docs.rs/tokio/latest/tokio/macro.select.html): polling, cancellation safety and fairness.
- [Tokio JoinHandle](https://docs.rs/tokio/latest/tokio/task/struct.JoinHandle.html): detaching versus aborting and observing termination.
- [Tokio spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html): bounded concurrency and non-abortable started work.
- [Tokio Mutex](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html): lock choice, FIFO and cancelled waits.
- [Rust atomic Ordering](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html): ordering contracts.

## Dependency and supply-chain risk

- [Cargo resolver](https://doc.rust-lang.org/cargo/reference/resolver.html): version unification, feature resolution, MSRV and yanked releases.
- [Cargo build](https://doc.rust-lang.org/cargo/commands/cargo-build.html): locked builds and target/feature selection.
- [Cargo build scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html): build-host execution.
- [RustSec](https://rustsec.org/): advisory database scope.
- [cargo-deny checks](https://embarkstudios.github.io/cargo-deny/checks/index.html): advisories, licenses, bans and sources, with default configuration.
- [cargo-deny common options](https://embarkstudios.github.io/cargo-deny/cli/common.html): no-fetch and lockfile behaviour.

## Runtime configuration and focused debugging

- [std::env::var](https://doc.rust-lang.org/std/env/fn.var.html) and [Rust 2024 newly unsafe functions](https://doc.rust-lang.org/edition-guide/rust-2024/newly-unsafe-functions.html): missing versus invalid Unicode and process environment mutation.
- [Serde container attributes](https://serde.rs/container-attrs.html): validated conversion and unknown-field policies.
- [Rust API Guidelines: dependability](https://rust-lang.github.io/api-guidelines/dependability.html): input validation and predictable failure.
- [OWASP secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): secret lifecycle, access and redaction.

## Production engineering: architecture, security, refactoring and planning

- [Rust Book: packages, crates and modules](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html): Rust module and crate boundaries.
- [Cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html): workspace organization and package selection.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): deny by default, per-request checks and authorization testing.
- [OWASP Authorization Patterns](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html): policy decisions and enforcement boundaries.
- [Martin Fowler: Refactoring](https://martinfowler.com/books/refactoring.html) and [Refactoring Boundary](https://martinfowler.com/bliki/RefactoringBoundary.html): small behavior-preserving transformations.
- [NIST Secure Software Development Framework](https://csrc.nist.gov/Projects/ssdf) and [SSDF mapping](https://pages.nist.gov/nccoe-devsecops/mapping-ssdf.html): security requirements, risks and design traceability.

## API evolution, invariants and serialization

- [Cargo SemVer compatibility](https://doc.rust-lang.org/cargo/reference/semver.html): downstream method ambiguity, dyn compatibility and API evolution.
- [Rust assert](https://doc.rust-lang.org/std/macro.assert.html) and [debug_assert](https://doc.rust-lang.org/std/macro.debug_assert.html): release-mode invariant enforcement.
- [Serde container attributes](https://serde.rs/container-attrs.html) and [field attributes](https://serde.rs/field-attrs.html): Display conversion errors, defaults and aliases.
- [Serde flatten](https://serde.rs/attr-flatten.html): incompatible unknown-field policy.

## Runtime instrumentation, unsafe contracts, macros and documentation

- Rust standard library pointer, MaybeUninit and slice safety documentation: https://doc.rust-lang.org/std/ptr/ and https://doc.rust-lang.org/std/mem/union.MaybeUninit.html and https://doc.rust-lang.org/std/slice/fn.from_raw_parts_mut.html
- Rust Reference macro hygiene and procedural macros: https://doc.rust-lang.org/reference/macros-by-example.html and https://doc.rust-lang.org/reference/procedural-macros.html
- Rustdoc documentation tests: https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html
- Miri project documentation: https://github.com/rust-lang/miri
- tracing instrumentation and OpenTelemetry metrics concepts: https://docs.rs/tracing/latest/tracing/ and https://opentelemetry.io/docs/concepts/signals/metrics/

## Workspace configuration, CI and commit-hook safety

- Cargo workspaces and lint inheritance: https://doc.rust-lang.org/cargo/reference/workspaces.html and https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section
- Cargo metadata and feature selection: https://doc.rust-lang.org/cargo/commands/cargo-metadata.html and https://doc.rust-lang.org/cargo/reference/features.html
- GitHub Actions secure use: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- Git staged changes and hooks: https://git-scm.com/docs/git-diff and https://git-scm.com/docs/githooks

## Application engineering: service contracts, persistence and operations

- Axum middleware and state: https://docs.rs/axum/latest/axum/middleware/ and https://docs.rs/axum/latest/axum/extract/struct.State.html
- SQLx transaction semantics: https://docs.rs/sqlx/latest/sqlx/struct.Transaction.html
- AWS Well-Architected retry limits: https://docs.aws.amazon.com/wellarchitected/2022-03-31/framework/rel_mitigate_interaction_failure_limit_retries.html
- Kubernetes probe semantics and pod lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/probes/ and https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
