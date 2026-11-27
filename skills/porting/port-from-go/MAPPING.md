A row in this table is a starting point, not a rewrite rule: the third
column names the decision the row hides, and the decision is made per
site, with the source in front of you.

| Go | Rust | The decision the row hides |
|---|---|---|
| `struct` | `struct` | Whether the zero value was meaningful |
| Struct embedding | Composition, plus explicit delegation | Go promotes embedded methods; Rust does not, so each promoted method is a decision |
| `interface` | `trait`, generic, or a concrete type | Count implementers first |
| Empty `interface{}` / `any` | An enum, or a generic | The set of types that actually reach the site |
| Method with value receiver | `fn (&self)` on a `Copy`/cloned value | Go copies the receiver; a port that takes `&mut self` changes semantics |
| `slice` | `Vec<T>` / `&[T]` | Aliasing and `append` capacity behaviour |
| `array` | `[T; N]` | Go arrays are values and copy on assignment |
| `map` | `HashMap` / `BTreeMap` | Go map iteration order is unspecified; preserve the allowed outcomes or explicit sorting — but reads of a missing key returned the zero value, and that must be reproduced |
| `string` | `String` / `&str` | Go strings are arbitrary bytes; range yields byte offsets and decoded runes, using U+FFFD and advancing one byte for invalid UTF-8 |
| `rune` | `char` | A Go rune is an `i32` that may hold an invalid scalar value; `char` cannot |
| `byte` | `u8` | Nothing hidden |
| `int` / `int64` | target-width signed integer / i64 | Preserve source target width, wrapping and division semantics |
| `uint` | target-width unsigned integer | Preserve source width and wrapping; Rust usize reflects the target, which may differ from the source |
| `error` | `Result<T, E>` | The error type and the sentinel set — `/rust-errors` |
| `if err != nil { return err }` | `?` | Whether the source added context at each level |
| `errors.Is` / `errors.As` | Enum matching / `source()` | Preserve wrapping trees, custom Is/As and sentinel identity; source() alone is not equivalent |
| `panic` / `recover` | `panic!` / `catch_unwind` | Go code sometimes uses recover for control flow; Rust does not, so those sites become `Result` |
| `defer` | A `Drop` guard, or `scopeguard` | Whether cleanup can fail; `Drop` cannot return an error |
| `go f()` | `tokio::spawn` or `std::thread::spawn` | IO-bound versus CPU-bound, per site |
| `chan T` | `tokio::sync::mpsc` / `crossbeam-channel` | Go capacity zero is rendezvous; preserve buffering, close, nil-channel blocking, topology and backpressure |
| `select` | `tokio::select!` | Cancellation safety of every branch — `/async-rust` |
| `sync.WaitGroup` | Collected `JoinHandle`s / `JoinSet` | Whether panics in workers were being swallowed |
| `sync.Mutex` | `std::sync::Mutex<T>` | Rust guards the data rather than the section — the port often moves fields inside the mutex |
| `sync.Once` | compatible once-initialization state | Go Once considers a panicking call completed; Rust initialization and poisoning differ by primitive |
| `atomic` | `std::sync::atomic` | Go sync/atomic operations are sequentially consistent; use SeqCst for direct mapping unless a weaker ordering is justified and verified |
| `context.Context` | `CancellationToken` + explicit params | Structure, as in `SKILL.md` |
| `time.Time` / `Duration` | compatible wall/monotonic time and signed duration | Go Duration is signed nanoseconds; std::time::Duration is unsigned. Preserve range, rounding and clock semantics |
| `encoding/json` | `serde_json` | `omitempty` versus `skip_serializing_if`, and that Go marshals a nil slice as `null` and an empty slice as `[]` |
| `io.Reader` / `io.Writer` | `std::io::Read` / `Write` | Async versus sync — an async port needs the `tokio` traits |
| `net/http` handler | `axum` / `hyper` handler | Middleware order and default header behaviour differ and are observable |
| Package-level `var` | `OnceLock`, or a context struct | Package-level mutable state is the hardest Go idiom to port |
| `init()` | Explicit initialization | Ordering, which Go defines and Rust does not have an equivalent for |
| Build tags | `#[cfg(...)]` features | Which combinations are actually built |
| Generics (`[T any]`) | Generics with trait bounds | Go constraints are looser; the port names the real bound |

## Three rows that are traps rather than mappings

- The zero value — not a mapping but a design decision per type:
  reproduce it with `Default`, or refuse it with a constructor, and
  record which.
- A typed nil in an interface: preserve the observable distinction between
  a nil interface and an interface containing a nil concrete value. Remove
  a branch only when the approved contract proves it unreachable.
- An unbuffered channel is a rendezvous, not automatically a barrier or
  oneshot. Preserve the actual handshake and close behavior.

## Additional parity boundaries

- Go defer evaluates arguments immediately, executes in LIFO order and can
  mutate named return values. Drop alone does not reproduce recover or
  fallible cleanup semantics.
- Go slice copies share backing storage, and append may reallocate. Model
  observable aliasing without violating Rust borrow rules.
- Go JSON missing, null and empty values, custom marshalers and omitempty
  behavior depend on actual types and library versions; test the wire form.
