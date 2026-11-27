## What it does

Maps Java constructs to Rust and carries the mechanics of the seam — a
process boundary when the Rust replaces the JVM service outright, and JNI
when the JVM keeps calling the code. The defining constraint: it maps
Java behaviour and refuses to map Java structure — hierarchies, DI
graphs, and annotation frameworks are not reproduced. Every process
question is deferred to `/port-to-rust`.

## When to reach for it

Model-invoked: the agent pulls this in when Java code is moving into
Rust — a JVM service, a Spring or Jakarta application, a Java library,
or a JVM component being replaced by a Rust one behind the same
interface — and the question is what a Java construct becomes, or how
the seam works. It does not cover how a port is run (that is
`/port-to-rust`), the differential harness (`/rust-testing`), or the
shape of the Rust that comes out (`/idiomatic-rust` and the other craft
skills). The user can run it directly, as `/port-from-java`.

## Prerequisites

A runnable Java implementation and its test suite, a Cargo project, and
a decided end state — `/port-to-rust` is run first, because whether a
JNI layer exists at all is settled there.

## The traps

| Trap | What actually differs |
|---|---|
| Integer overflow | Java int and long arithmetic wraps at its promoted width, except operations with explicit error contracts such as Math.addExact. byte, short and char generally promote to int. Rust overflow checks depend on the build policy; preserve the source arithmetic and conversion semantics |
| Strings are UTF-16 | `String.length()`, `charAt`, and `substring` count UTF-16 code units, so anything outside the basic multilingual plane counts as two. Rust String is UTF-8 and does not support integer indexing. Preserve UTF-16 code units, including isolated surrogates, when observable; supplementary characters occupy two units |
| `null` is everywhere and untyped | Any reference may be null, so the port must decide per field whether `Option` reproduces a real absence or papers over a state that should not exist — the second is `/type-driven-design`. Mapping every reference to `Option` produces Rust that is worse than the Java |
| `equals`/`hashCode` contracts | Derived `PartialEq`/`Hash` in Rust compare all fields; a hand-written Java `equals` often compares a subset, and collections branch on it. A port that derives where the source hand-wrote changes set and map behaviour silently |
| Checked versus unchecked exceptions | Checked exceptions are a declared contract and map to `Result` variants. Unchecked ones (`NullPointerException`, `IllegalStateException`, `IndexOutOfBoundsException`) were often *caught anyway* somewhere up the stack; grep for the catch sites before deciding any of them is a panic |

## Hierarchies, frameworks, and what not to reproduce

A base class with a fixed set of subclasses becomes a Rust enum with a
variant per subclass — that translation is where a Java port stops
reading like Java. A base class with an open set of implementations
becomes a trait only when the implementations genuinely vary at runtime,
and an abstract class carrying state maps to a struct field plus a
trait, never to a supertrait with fields, because Rust has none.

Inventory the behavior of Spring, Jakarta and annotation-driven wiring,
including security, transaction, validation and lifecycle interceptors.
Preserve those contracts explicitly rather than reproducing a container.
Dependency injection becomes explicit construction, usually a single
`App` struct built in `main`. The most common failed Java port is
reproducing the DI container in Rust: a trait-object graph nobody can
follow, solving a problem the language does not have.

## Runtime and native boundaries

Preserve promoted-width arithmetic, masked shifts, MIN division overflow,
UTF-16 code units, reference identity, decimal scale and error precedence.
Check monitor reentrancy, condition waiting, interruption and futures before
selecting synchronization or an executor. JNI environments are thread-bound;
local and global references have different lifetimes. Preserve pending Java
exceptions, native buffer ownership, callback shutdown and class loading.
FFM is an option only when the approved JDK and ABI contract support it.
Test the packaged native library in the actual supported JVM matrix.

## Common questions

**Does a Java port need JNI?** Usually not. End state A — a standalone
Rust binary behind an HTTP or gRPC boundary the system already has —
has no binding layer at all. JNI appears only under B, where the
deliverable really is a JVM-importable artifact, and under C, where it
is scaffold deleted at cut-over.

**Does this skill cover Kotlin or Scala?** No. The JVM is shared, the
idioms are not; this skill maps Java only.

**What happens to Spring wiring?** Prefer explicit construction, but
preserve security, transaction, validation and lifecycle behavior that the
framework previously provided.

**How do you reproduce Java integer wraparound?** Per arithmetic site:
`wrapping_*` operators to reproduce the wrap, or checked arithmetic
plus a new error path the source never had. Every site is a decision,
and the differential corpus needs a case at a wraparound boundary.

**May a hand-written `equals` be replaced with a derive?** Only after
checking every collection that uses the type as a key. A derived
`PartialEq`/`Hash` compares all fields; a hand-written `equals` often
compares a subset, and sets and maps branch on it.

## It's working if

- The end state was chosen before any Rust was written.
- No DI container was reproduced — the wiring is explicit
  construction.
- Hierarchy changes preserve identity, dispatch and public contracts.
- Overflow behaviour was decided per arithmetic site and written down.
- Observable UTF-16 indexing and encoding behavior are preserved.
- Every hand-written `equals` was either reproduced by hand or its
  replacement justified in the contract.

## Where it fits

`port-from-java` is the Java member of the per-language porting
skills: it owns the construct mapping and the Java boundary — the
process seam as default, JNI with its real costs — and defers
everything common to a port to `/port-to-rust`, the harness mechanism
to `/rust-testing`, and the target-side judgment to the craft skills
(`/rust-errors`, `/type-driven-design`, `/ownership-not-clone`,
`/async-rust`). Its neighbours are the other per-language skills —
C, C++, Python, TypeScript, and Go — which share its
three-file shape but carry different traps and a different boundary.
See `rust-skills-map` for how the full set relates.
