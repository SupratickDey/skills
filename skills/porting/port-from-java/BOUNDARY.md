Under end state A there is no binding layer — only the process-seam
section applies. Under C, JNI carries the migration and is deleted at
cut-over. Under B, the JNI surface is the product and every signature is
public API. The end-state decision is `/port-to-rust`.

## The process seam, which is the default for Java

Put the Rust binary behind a boundary the system already has — one HTTP
or gRPC endpoint, one queue consumer, one batch job — with both
implementations reachable for approved isolated comparison. Never mirror
mutating live operations without verified side-effect isolation. The differential
harness runs request-to-request. Why this is the default: it costs no
JNI, it keeps the JVM crash surface at zero, and JVM systems almost
always already have such a boundary.

## JNI and JVM lifecycle

Use the project's pinned jni crate and JDK. Preserve generated or registered
native signatures and the platform calling convention, including the correct
export attribute for the Rust edition. Verify the JNI method descriptor,
static versus instance receiver, argument types and return sentinel.
Do not expose a safe Rust interface that allows invalid native handles.
Document all unsafe preconditions using /unsafe-rust and /rust-ffi.

JNIEnv belongs to the attached thread and must not be transferred to another
thread. Use the supported JavaVM attachment mechanism for native workers;
scope attachment and detachment according to ownership, and stop workers
before VM shutdown. Local references are limited to their thread and frame.
Use local frames or explicit release for loops; promote references to global
or weak global references only when lifetime requirements justify them.
Release owned global references with the supported API. Check weak reference
liveness before use. Preserve class-loader context, especially in native
threads and multiple-loader applications.

Inspect pending Java exceptions after fallible JNI operations. Do not keep
calling ordinary JNI functions while an exception is pending. Preserve an
existing exception unless the approved translation contract replaces it.
Do not allow Rust panics to cross a non-unwinding ABI: an escaping Rust
panic aborts, and a foreign unwind through such an ABI is undefined behavior.
Where translation is required, catch unwinding Rust panics at a suitable
boundary and handle panic payloads safely. catch_unwind cannot catch aborts.
Use explicit errors for expected failures.

The Foreign Function and Memory API is an alternative where the approved
JDK supports it (finalized in JDK 22). Verify native access settings,
linker descriptors, arena lifetimes, thread confinement and callback
lifecycle. FFM does not remove Rust ABI or pointer safety obligations.

## Errors across the boundary

A Rust `Err` becomes a thrown Java exception, and which exception
matters: the existing `catch (SomeSpecificException e)` blocks are the
contract. Map the error enum to the exception classes callers already
catch, and never let a Rust panic be the mechanism.

## Data crossing the boundary

Distinguish JNI modified UTF-8 from standard UTF-8 and Java UTF-16 code units.
Preserve embedded NUL and lone surrogates where required using appropriate
UTF-16 APIs. Array access may copy or pin; release acquired elements with
the correct mode on all applicable exits. Critical array/string access has
strict restrictions on blocking and JNI calls. Verify actual pinned APIs.
Direct buffers need an explicit allocation owner, bounds, alignment,
mutability and lifetime contract; do not expose freed Rust memory or retain
a Java buffer address without the required reference and lifetime guarantees.
Batch only where end-to-end profiling demonstrates benefit.

## Packaging and CI

Under B the native library ships per platform and classifier, matching
every platform the JAR supported, with the loading strategy — bundled in
the JAR and extracted, or installed separately — decided rather than
discovered. Under C it is temporary but safety and required parity remain mandatory. Under A there is nothing
beyond the Rust binary. In all three, the differential job builds both
sides fresh.

Verify native libraries on each approved JDK, operating system, architecture
and loader configuration. Inspect dependency availability and package the
actual library with its intended classifier. Test the public Java artifact in
a clean JVM, including exceptions, repeated calls, reference cleanup,
concurrent invocation and shutdown. Use JVM JNI checking options where
supported. A Rust-only build is not JVM integration evidence. Never publish
or deploy without authorization.
