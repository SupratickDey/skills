# rewrite-rs-skills

## 0.3.0

2026-11-27

The promoted set grows from 28 to 43 skills, adding architecture, security,
refactoring, planning, configuration, debugging and nine specialized
production skills, each with a compiled, tested reference example. The plugin
installs from one repository into both Claude Code and Codex. Evaluation now
runs paired baseline and skills arms in either agent with an automated judge,
and covers every specialized skill with an eval case.

### Minor Changes

- 67eb7fb: Add application engineering skills covering network APIs, persistence, runtime resilience and production readiness.
- d001d62: Add shared fixture discovery, paired Claude and Codex CLI execution, evidence-based weighted grading and comparison reports with offline tests.
- 4466a16: Add production engineering skills for architecture, application security, behavior-preserving refactoring and specification-driven implementation planning.
- eca2006: Make the cross-agent evaluation runner produce valid comparisons: run each case's own scaffold in a workspace outside the repository, pass the case tool allowlist to Claude Code, verify which skills each arm can see and mark contaminated runs invalid, capture diffs, file edits and skill activations, stop timed-out process groups, and add an arm-blind automated judge and aggregated reports. Add an installation check for both agents and run it in CI with pinned CLIs, validate marketplaces, frontmatter limits and install wording, add Codex plugin interface metadata, harden the main pre-merge gate and protected-file watch list, move CI to Node 22, and add compiled, tested examples to the resilience, CLI, API pagination, distributed ordering and cross-platform path skills.
- 53ecb11: Add Rust runtime configuration and systematic debugging skills with synchronized installation, routing and agent metadata.
- 45ad5d1: Add profile-driven selective Rust acceleration, end-to-end performance acceptance, safe differential fixtures and explicit rollback policies to existing skills.
- d59946f: Add workspace management, cross-platform development, CLI engineering, memory profiling and distributed systems skills.
- e2f6701: Add verified reference examples to rust-database, rust-memory-profiling, rust-production-readiness and rust-workspace-management, and add an eval case for each of the nine specialized skills (API pagination, database lost updates, retry budgets, production readiness review, workspace inheritance, cross-platform paths, CLI exit status, unbounded cache retention and redelivered messages).

### Patch Changes

- 57e2b1a: Correct API compatibility, domain invariant enforcement and Serde wire validation guidance, including downstream tests and resource limits.
- 3bfb2dc: Strengthen C migration guidance for pointer provenance, allocation, native ABI, callbacks, representation, embedded targets and verification.
- 994eb0d: Preserve C++ ownership, cleanup, move and exception semantics and strengthen native ABI, CXX and integration verification guidance.
- 567c0b0: Synchronize explicit Claude Code and Codex skill inventories, reject broad or drifting Codex declarations, and document cross-agent acceptance and progressive disclosure.
- e81f887: Point installation instructions at the maintained fork, add a collision-safe promoted-only copy installer, and guard duplicate skill names and experimental content in Codex discovery.
- 566f4e9: Preserve Go integer, nil, channel, cancellation, error and cgo boundary semantics during Rust migration.
- 58f4048: Correct idiomatic Rust guidance on iterator bounds, unequal lengths, conversion semantics and partial ordering. Preserve behaviour during expression-level rewrites and use repository-aware verification.
- c7ff80a: Correct the install instructions: sharing the Claude Code plugin through a repository needs the committed project settings plus a one-time marketplace add by each teammate, and the gh skill route requires GitHub CLI 2.90.0 or later and installs from the latest tagged release.
- 41f5f7d: Preserve Java arithmetic, identity, collection, framework and concurrency contracts and strengthen JNI/FFM lifetime and packaging guidance.
- 9125624: Correct JavaScript coercion, presence and ordering parity, native addon lifecycle, WebAssembly host capabilities and distribution verification.
- 336405e: Correct Python integer and mapping parity, interpreter attachment, free-threaded synchronization, native data lifetimes and wheel verification guidance.
- 7e34846: Strengthen observability, unsafe Rust, macro hygiene and executable documentation guidance.
- 07bbfd6: Correct cancellation, task lifecycle, bounded concurrency, lock and atomic-ordering guidance; document graceful shutdown and verification limits.
- 0df00a7: Strengthen dependency risk assessment, build-host security, advisory triage, reproducible resolution and owner-approved risk exceptions.
- ecd5b18: Clarify clone and shared-state semantics, lifetime bounds, borrow splitting and compatibility-aware verification.
- 5556f9f: Correct panic and foreign unwind semantics, preserve recovery invariants and protect sensitive diagnostics across error, FFI and unsafe skills.
- e714092: Continue evidence-based static reviews when checks are blocked, preserve correctness severity despite documented defects, and add a regression evaluation.
- 01a3ce8: Prevent destructive skill-link collisions in the Claude Code and Codex development harness and add isolated regression tests.
- 01b0068: Share repository authoring and engineering instructions across Claude Code and Codex while retaining the original skill rules.
- 442b9fd: Simplify the fork release process with local Changesets preparation, ordinary maintainer release PRs and read-only changeset checks, retaining repository validation and main branch safeguards.
- 483a918: Correct workspace lint inheritance, package-specific CI verification and non-destructive pre-commit setup and testing.

## 0.2.0

2026-11-18

Every skill was broadened. Ten skills gained new companion files, the rest
gained rules and reworked examples, and the porting skills and the Rust code
review now ship with eval cases. The README now explains how the set works and
lists every install route. The promoted set is unchanged at 28 skills.

### Skills — `skills/rust/`

- `idiomatic-rust` — new `PATTERNS` (common idioms with worked examples) and `READABILITY` files; `NAMING` extended with conversion, getter, and iterator naming rules; formatting now covers only the files you changed
- `rust-api-design` — new `CONSTRUCTION` (constructors, builders, defaults), `STANDARD-TRAITS` (which common traits a public type should implement), and `FEATURES` (additive Cargo features) files; `SURFACE` and `SEMVER` extended
- `rust-errors` — new `PANICS` file covering when a panic is the right answer and how to document it; `ERROR-TYPES` extended
- `type-driven-design` — new `MODELLING` file on turning a domain into types, with typestate and numerics notes tightened
- `ownership-not-clone` — new `LIFETIMES` file; the shared-state guidance extended
- `rust-docs` — new `COMMENTS` (when a plain comment beats a doc comment) and `PACKAGING` (crate metadata and docs.rs setup) files
- `async-rust` — keeping futures small, with a size test, and library rules for staying runtime-agnostic
- `unsafe-rust` — module-level soundness, plus rules against `transmute` shortcuts and `unsafe impl Send` used to silence a compiler error
- `rust-concurrency` — lock discipline (scope, ordering, never returning a guard) and a position on poisoned mutexes
- `rust-performance` — deciding whether speed matters at all, `black_box` in benchmarks, hasher choice, and batch entry points
- `rust-observability` — standard attribute names for fields, and keeping telemetry out of hot loops

### Skills — `skills/porting/`

- `port-to-rust` — `ANTIPATTERNS` extended with proportionality rules, so the port is sized to the source and does not grow extra layers; a `PORTING.md` reviewer-notes deliverable; `PARITY-CONTRACT` extended

### Skills — `skills/workflow/`

- `rust-code-review` — decides scope first, then reviews in a fixed priority order; short and long report formats in a new `REPORT-FORMAT` file, where each long finding carries Consequence, Standard, and Change; a larger smells table; `#[expect]` advice applies only at MSRV 1.81 or later
- `setup-rust-skills` — a wider default lint set, tagged lib or app and regrouped by category; `expect_used` stays at deny, with the alternative documented; new `WORKSPACE` file on lint and layout choices for multi-crate workspaces
- `rust-testing` — examples as compiled usage samples, fuzzing for untrusted input, feature-combination and per-platform testing, and following the test framework the repo already uses

### Skills — `skills/misc/`

- `setup-rust-ci` — CI job guidance and an extended `WORKFLOWS` file
- `rust-macros` — new `ITEM-MACROS` file on macros that generate items
- `rust-ffi` — new `SYS-CRATES` file on `-sys` crates and their safe wrappers
- `rust-serde` — an opt-in `serde` feature for library crates
- `rust-supply-chain` — what version requirements allow, why duplicate crates appear, and the cost of each added dependency

### Fixes

- `rust-macros` — the `min_of!` example evaluated its arguments twice; it now binds each argument once

### Evals

- Eval cases for all seven porting skills (`port-to-rust`, `port-from-python`, `port-from-typescript`, `port-from-go`, `port-from-java`, `port-from-cpp`, `port-from-c`), each with inputs, a prompt, and graders
- Two eval cases for `rust-code-review`
- Each grader says where its numbers come from

### Install and docs

- README: how the set works, a before and after example, and a testing section
- Install routes: Claude Code plugin, `npx`, `gh skill install rewrite-rs/skills --all`, Gemini CLI, manual copy, and claude.ai zips
- Codex plugin manifest and marketplace file (untested)

## 0.1.0-alpha.1

2026-08-16

Initial alpha release: 28 promoted agent skills for writing real Rust and
porting into it. The `skills/in-progress/` set ships in neither install
route and is not part of this count. Each skill is listed with the
one-liner from its frontmatter, trigger conditions stripped.

The full set, by bucket:

### Language craft — `skills/rust/`

- `idiomatic-rust` — write Rust that reads like Rust — iterator pipelines over index loops, From/Into over ad-hoc converters, derives over hand-written impls, newtypes over bare primitives
- `ownership-not-clone` — use ownership and borrowing instead of reaching for clone, Rc, RefCell, or Arc<Mutex<\_>> to silence the borrow checker; every clone must be explainable
- `rust-errors` — design Rust error types and panic policy — Result over unwrap, thiserror for libraries, anyhow for binaries, context that survives the call stack
- `type-driven-design` — make illegal states unrepresentable — enums instead of boolean and string flags, newtypes instead of bare primitives, parsed types instead of validated ones, typestate for protocol order
- `rust-api-design` — design a Rust public API — trait design, generics versus dyn, sealed traits, what is exported, and which changes break semver
- `async-rust` — write correct async Rust — runtime choice, Send and Sync bounds, cancellation safety, blocking work inside async contexts, and shared state across tasks
- `unsafe-rust` — justify, document, and verify unsafe Rust — safety invariants on every unsafe block, sound safe wrappers, undefined behaviour hazards, and verification with Miri
- `rust-performance` — profile before optimizing, cut allocation out of hot paths, and treat LTO, codegen-units, PGO and target-cpu as the last five percent
- `rust-concurrency` — pick the concurrency model from the workload shape — rayon for data parallelism, scoped threads for borrowed stack data, channels for handoff, shared state last — and use the weakest correct atomic ordering
- `rust-observability` — logs are structured events with named fields, not formatted strings — tracing over log over println!, spans for async context, error chains logged once, and never a secret in a field
- `rust-docs` — doc comments as API contract — a one-line first sentence, module-level docs, Examples, Errors, Panics and Safety sections, doctests that actually run, and intra-doc links

### Porting — `skills/porting/`

- `port-to-rust` — run a port into Rust without losing behaviour — define the parity contract, sequence the phases, migrate incrementally behind a stable boundary, and prove parity differentially
- `port-from-python` — port Python into Rust — construct mapping, the semantic traps (integer width, floor division, str versus bytes, exceptions to Result), and the seam, which is a process boundary for a standalone replacement and PyO3 when Python keeps calling the code
- `port-from-typescript` — port TypeScript or JavaScript into Rust — construct mapping against runtime semantics, the traps (every number is an f64, two kinds of absent, structural typing, regex feature gaps), and the napi-rs and wasm-bindgen boundaries
- `port-from-go` — port Go into Rust — goroutines and channels onto tasks and async, interfaces onto traits, error values onto Result, and the value-semantics traps (zero values, integer wraparound, slice aliasing, nil)
- `port-from-java` — port Java into Rust — class hierarchies onto enums and composition, exceptions onto Result, collections and streams onto Rust equivalents, and the traps (UTF-16 strings, silent integer wraparound, null, equals/hashCode contracts)
- `port-from-cpp` — port C++ into Rust — RAII and smart pointers onto ownership, templates onto generics and traits, exceptions onto Result, the STL onto Rust collections, and the traps (move semantics, implicit conversions, undefined behaviour, iterator invalidation)
- `port-from-c` — port C into Rust — recovering the ownership, lifetime, nullability, and length that C never recorded, mapping pointers to references and slices, tag-plus-union to enums, return codes and errno to Result, and linking Rust into the existing build with bindgen and cbindgen

### Workflow — `skills/workflow/`

- `rust-testing` — design Rust tests that catch real regressions — unit, integration, doc, property, snapshot, and golden tests, and differential tests that prove a port matches its source
- `rust-code-review` — review Rust changes on two axes at once — standards (idioms, ownership, errors, API surface, unsafe) and spec (does the change do what was asked) — with a Rust smell baseline layered on the repo lint configuration
- `setup-rust-skills` — configure a Rust repo for this skill set — lint and format configuration, and a recorded project posture (edition, MSRV, async runtime, no_std, unsafe policy) at docs/agents/rust.md
- `rust-skills-map` — the router for this skill set — which Rust skill covers which decision, how they relate, and which one to reach for from where you are

### Setup and audit — `skills/misc/`

- `setup-rust-ci` — write a GitHub Actions workflow for a Rust repo — format, clippy at the configured level, tests, and an MSRV job, derived from the posture the repo already recorded
- `setup-rust-pre-commit` — set up fast pre-commit hooks for a Rust repo — format and lint the staged changes only, with CI left as the real gate
- `rust-supply-chain` — audit a Rust dependency tree — advisories, licences, banned and duplicate crates, and unmaintained dependencies — and turn each finding into a decision
- `rust-macros` — write a macro only when a function, a trait, or a generic cannot do the job — then by-example before proc-macro, with hygiene, a `_private` helper module, and spanned compile errors instead of panics
- `rust-serde` — serde as the boundary where untrusted input becomes a domain type — rename_all, default, skip_serializing_if, flatten, the four enum representations, deny_unknown_fields, and try_from validation
- `rust-ffi` — design an FFI boundary meant to last — a thin translation layer with the logic in core crates, no panic across the boundary, explicit ownership on every pointer, repr(transparent) newtypes, and unsafe extern in edition 2024
