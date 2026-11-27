A row in this table is a starting point, not a rewrite rule: the third
column names the decision the row hides, and the decision is made per site,
with the source in front of you. The C corollary sharpens that — nearly every
row hides a decision C never wrote down, so the mapping is a set of questions
rather than a translation table.

| C | Rust | The decision |
|---|---|---|
| `T*` (owning) | owning foreign handle or compatible Rust owner | Verify allocator, layout, destructor and release operation |
| `T*` (borrowing) | verified reference or raw handle | Prove validity, lifetime and aliasing before borrowing |
| `T*` (nullable) | raw ABI pointer; validated optional owner/borrow internally | Nullability alone does not prove reference validity |
| `T*` + `size_t len` | verified slice or raw buffer view | Check units, bounds, alignment, provenance, initialization, null/zero length and aliasing |
| `char*` | `&CStr` / `CString` / `&str` / `&[u8]` | Encoding and NUL termination |
| `void*` | A generic, an enum, or `*mut c_void` | The set of types that actually reach the site |
| Fixed array `T[N]` | `[T; N]` | Whether it decays anywhere |
| `malloc` / `free` | `Box`, `Vec`, or an allocator API | Whether the allocation was for one value or many |
| `realloc` | compatible owner or Vec growth for Rust-owned data | Preserve failure ownership, zero-size contract and invalidated interior pointers |
| `memcpy` between structs | Assignment / `Clone` | Whether the types were really compatible |
| `struct` | `struct` | `#[repr(C)]` only if it crosses the boundary |
| Bitfields | `bitflags`, or explicit masking | `#[repr(C)]` does not reproduce bitfield layout |
| `union` | `enum` with data | Tag plus union is an enum — the big row |
| Bare `union` (no tag) | `union` (unsafe) or an enum | Whether the reader can know the active arm |
| `enum` | ABI-compatible integer and validated internal enum | Verify native representation; never create a Rust enum from an unchecked discriminant |
| `typedef` | Type alias or newtype | Whether the alias carried meaning — `/type-driven-design` |
| Function pointer | exact extern ABI function pointer, optional if nullable | Preserve calling convention, signature, lifetime and context; Rust closures are not C function pointers |
| Callback + `void* user_data` | ABI trampoline and owned context | Verify registration, reentry, concurrency, unregistration and in-flight callback lifetime |
| `int` return code | `Result<(), E>` | The code-to-variant mapping |
| Out-parameter | The return value | Whether it was written on the error path too |
| `errno` | Error enum variants | Which codes callers actually branch on |
| `goto cleanup` | `?` + `Drop` | Whether the cleanup order mattered |
| `static` file-scope variable | `OnceLock` / a context struct | Whether the state was per-process or per-caller |
| `extern` global | A field, or a `OnceLock` | Same |
| `#define` constant | `const` | Type, which the macro did not have |
| Function-like `#define` | `fn` / `const fn` | Whether it was called with side-effecting arguments |
| Code-generating macro | `macro_rules!` / build script | Whether the generated code is still needed |
| `#ifdef` | `#[cfg(...)]` / features | Which combinations are actually built |
| `#include` | Modules and `use` | What was really public |
| `size_t` | `usize` | Nothing hidden |
| `int` / `long` | target C ABI types or verified fixed-width integers | Preserve target data model, promotions and defined arithmetic; signed overflow is not a parity requirement |
| Unsigned wraparound | `wrapping_*` | Whether the wrap was intentional |
| Implicit conversion / promotion | Explicit `as` or `TryFrom` | Every truncation the source never showed |
| `volatile` | reviewed volatile device access or appropriate synchronization | Volatile is not atomic, mutual exclusion or a hardware memory barrier |
| `pthread` | `std::thread` | Nothing hidden |
| `pthread_mutex` | `Mutex<T>` | Rust guards data, so fields move inside |
| `atomic` builtins | `std::sync::atomic` | Memory ordering, which both expose |
| `setjmp` / `longjmp` | No mapping | The control flow is redesigned |
| Signal handler | `signal_hook` and a channel | Async-signal safety, which the C handler may have violated |
| `FILE*` / `open` | `std::fs` / `std::io` | Buffering behaviour, if observable |

## The rows that are traps rather than mappings

- A pointer whose ownership genuinely varies at runtime — the C API is the
  bug; the port fixes it at the boundary and records the change.
- Native shared layout requires verified size, alignment, offsets and ABI.
  Serialized data needs its own explicit format, not raw repr(C) bytes.
- Anything that was undefined behaviour in C — no mapping; a contract
  decision, recorded.

## Additional boundary decisions

- Flexible array members: verify actual allocation extent, checked element
  offset and length; do not infer storage from sizeof(header).
- Bitfields, packed fields and unions: use compatible generated declarations
  or native accessors; avoid creating unaligned references.
- memcpy and memmove differ on overlap. Preserve byte-level effects only
  with valid initialized ranges and compatible representations.
- C macros can evaluate arguments multiple times or conditionally. Preserve
  defined side effects and evaluation behavior instead of blindly using fn.
