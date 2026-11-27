---
name: port-from-java
description: Port Java into Rust — class hierarchies onto enums and composition, exceptions onto Result, collections and streams onto Rust equivalents, and the traps (UTF-16 strings, silent integer wraparound, null, equals/hashCode contracts). Use when porting, rewriting, or migrating Java, a JVM service, a Spring or Jakarta application, or a Java library into Rust, when replacing a JVM component with a Rust one behind the same interface, or when the user asks how a Java construct translates to Rust.
---

# Port from Java

## A construct mapping and a boundary, nothing else

This skill maps Java to Rust and owns the Java boundary — a process seam
under end state A, and JNI under B and C. The parity contract, the five
phases, and the anti-patterns are `/port-to-rust`, which runs first and
stays running through the port. It covers Java, not Kotlin and not Scala —
the JVM is shared, the idioms are not.

## The end state, and why Java usually lands on A or B-as-a-service

| End state | In Java terms | JNI |
|---|---|---|
| A. Replacement | A standalone Rust binary or crate replaces a JVM service; the seam is the HTTP or gRPC boundary the system already has | Never appears |
| B. Rust core, JVM artifact is the product | The importable artifact keeps its name and its signatures; the engine underneath becomes Rust | Permanent public surface — signatures, exception classes, native libraries per platform, semver |
| C. Scaffold | The port ends standalone, but the JVM calls the Rust code while the migration is under way | Temporary, and deleted at cut-over |

The end-state decision is /port-to-rust. Prefer the existing process seam
when it meets the approved contract. JNI adds native lifetime, deployment
and failure risks; quantify boundary costs rather than assuming an ordering
of FFI performance. See BOUNDARY.md.

## The traps that break parity silently

The body carries these five because each one produces a port that passes a
naive test suite and is wrong; the full table is `MAPPING.md`.

| Trap | What actually differs |
|---|---|
| Integer overflow | Java int and long arithmetic wraps at its promoted width, except operations with explicit error contracts such as Math.addExact. byte, short and char generally promote to int. Rust overflow checks depend on the build policy; preserve the source arithmetic and conversion semantics |
| Strings are UTF-16 | `String.length()`, `charAt`, and `substring` count UTF-16 code units, so anything outside the basic multilingual plane counts as two. Rust String is UTF-8 and does not support integer indexing. Preserve UTF-16 code units, including isolated surrogates, when observable; supplementary characters occupy two units |
| `null` is everywhere and untyped | Any reference may be null, so the port must decide per field whether `Option` reproduces a real absence or papers over a state that should not exist — the second is `/type-driven-design`. Mapping every reference to `Option` produces Rust that is worse than the Java |
| `equals`/`hashCode` contracts | Derived `PartialEq`/`Hash` in Rust compare all fields; a hand-written Java `equals` often compares a subset, and collections branch on it. A port that derives where the source hand-wrote changes set and map behaviour silently |
| Checked versus unchecked exceptions | Checked exceptions are a declared contract and map to `Result` variants. Unchecked ones (`NullPointerException`, `IllegalStateException`, `IndexOutOfBoundsException`) were often *caught anyway* somewhere up the stack; grep for the catch sites before deciding any of them is a panic |

## Mapping, in one line

`MAPPING.md` holds the full table; a row is a starting point, not a
rewrite rule, and the Java corollary is that the port maps behaviour, not
structure — a row that reproduces a class hierarchy has failed even when
it compiles.

## Inheritance is the port, and the answer is usually an enum

A base class with a fixed set of subclasses is a Rust enum with a variant
per subclass, and that translation is where a Java port stops reading like
Java — `/type-driven-design`. A base class with an open set of
implementations is a trait, but only when the implementations genuinely
vary at runtime. Abstract classes carrying state map to a struct field
plus a trait, never to a supertrait with fields, because Rust has none,
and deep hierarchies flatten: three levels of inheritance is usually one
enum and two functions.

## The framework is not the program

Inventory the behavior provided by Spring, Jakarta and annotation-driven
wiring before replacing it. Interceptors can enforce authorization,
transactions, validation, retries and lifecycle obligations. Preserve these
contracts explicitly using the existing Rust architecture.
Dependency injection becomes explicit construction, usually a single
`App` struct built in `main`. Annotation processors and reflection-driven
mapping become derive macros or explicit code; the most common failed
Java port is reproducing the DI container in Rust, which produces a
trait-object graph nobody can follow, to solve a problem the language does
not have.

## The test suite is the corpus

JUnit cases are characterization input, and Java suites are usually the
richest in this set — mock-heavy, which means the mocks encode assumptions
worth reading. Mockito-based tests do not port; the behaviour they pinned
does. Harness shapes are `/rust-testing`.

## Collections, streams, and the ordering that leaks

`ArrayList` is `Vec`, `HashMap` is `HashMap`, but iteration order differs
between the two and Java code sometimes leaks it into output;
LinkedHashMap can use insertion or access order; preserve eviction behavior.
TreeMap may use a comparator inconsistent with equals; preserve key identity
and comparison semantics. Preserve stream laziness, encounter order,
short-circuiting, side effects and resource closure. Parallel execution is
not automatically required or safe; inspect the actual synchronization.

## Numeric, identity and concurrency contracts

Java integer division truncates toward zero. For int and long, MIN / -1
returns MIN and remainder zero; a zero divisor throws ArithmeticException.
Shift counts are masked to five bits for int and six bits for long; unsigned
right shift requires an unsigned intermediate. Preserve narrowing casts,
numeric promotion and exact-arithmetic exceptions deliberately.

```rust
fn java_int_divmod(a: i32, b: i32) -> Option<(i32, i32)> {
    if b == 0 {
        return None;
    }
    Some((a.wrapping_div(b), a.wrapping_rem(b)))
}
```

This helper models Java int results only. Map None to the contracted
exception or error at the caller boundary. Java floating-point equality,
boxed Double equality, comparison and hashing differ for NaN and signed
zero; characterize the operation rather than using a universal f64 mapping.
BigDecimal requires scale, precision, rounding and equality contracts,
including the distinction between equals and compareTo.

Preserve reference identity when Java == compares objects, array identity,
aliasing and mutable shared state. Do not delete identity-sensitive branches.
Java synchronized monitors are reentrant and wait releases/reacquires the
monitor; Rust Mutex does not provide those semantics directly. Characterize
happens-before, volatile access, atomic operations, condition predicates,
interrupt status, executor shutdown and cancellation. CompletableFuture
initiation and dependent-stage execution differ from lazy Rust futures.
Cancellation need not interrupt underlying work. Select the existing
runtime and route ownership to /async-rust and /rust-concurrency.

## Verification

Both sides:

```bash
cargo test
cargo clippy --all-targets   # add -- -D warnings only if the target repo has no lint config
mvn test        # or: ./gradlew test — the source still passes while both implementations run
```

Then the differential run over the recorded corpus, reported with its
denominator. The corpus must carry one case per trap: arithmetic at a
wraparound boundary; a string with a character outside the basic
multilingual plane; a null-bearing field; a `HashMap` key with a
hand-written `equals` comparing a subset of fields; an input that
triggered an unchecked exception in the source. A corpus that never
crosses those has not tested the port, it has tested the happy path.

Select the supported feature, target and JDK matrix. Run the existing source
build and tests with its actual wrapper. Verify UTF-16 and surrogate cases,
masked shifts, exact arithmetic, reference identity, comparator collisions,
exception causes and suppressed exceptions, concurrent cancellation and
framework-provided authorization/transaction behavior. For JNI or FFM,
verify the fresh native artifact in a real JVM and report blocked checks.
