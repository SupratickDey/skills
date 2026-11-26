# Panics

The depth for the panic policy in `SKILL.md`: which panics are legitimate, the
infallible-plus-fallible pairing, what `catch_unwind` may and may not do, and the
minimum panic-safety every function owes.

## Which panics are legitimate

Panicking tells the runtime to abandon the current computation, and often the
whole process, immediately. The cases where that is the right call:

- a detected bug or broken contract, where no caller could respond correctly;
- a `const` context where the API deliberately requires an invariant violation
  to fail evaluation; fallible const APIs may also return `Result`;
- a method whose name says it unwraps on request, so the caller asked for the
  panic by choosing it;
- a poisoned lock when the explicit policy is to abandon the affected computation;
  poisoning indicates a possible invariant violation, not necessarily a dead thread.
  Recover only after checking or restoring the protected invariants;
- a developer-facing tool or script, where a non-fatal error may end the run
  because the only reader is the developer at the terminal;
- a test, where a panic is the assertion mechanism.

Everything else that can fail because of input, the environment, or another
party is a `Result`. A message such as `expect("cache is filled before the first read")` suits
the first case, because it names the invariant that was broken, as
`ERROR-TYPES.md` describes; a message that only says the line is unreachable
gives the reader nothing to check.

## Pairing the infallible and the fallible

When a function panics on misuse because checking would be a burden for callers
who already know the value is fine, ship a fallible sibling for callers who do
not. The panicking one documents the condition under a `# Panics` heading; the
fallible one returns the error:

```rust
#[derive(Debug)]
pub struct EmptyInput;

/// Returns the largest reading.
///
/// # Panics
///
/// Panics if `readings` is empty. Use [`try_peak`] when that is possible.
pub fn peak(readings: &[f64]) -> f64 {
    try_peak(readings).expect("peak called with an empty slice")
}

pub fn try_peak(readings: &[f64]) -> Result<f64, EmptyInput> {
    readings.iter().copied().reduce(f64::max).ok_or(EmptyInput)
}
```

The panicking version is a thin wrapper, so the two cannot drift. Do not add the
panicking version by default; offer it only when a real caller base wants the
shorter call.

## `catch_unwind`

Catching a panic and continuing as if nothing happened is the one thing never
done inside first-party logic: the unwound code may have left data half-updated,
and the catch hides exactly the bug the panic was reporting. Three places are
acceptable:

| Place | Why it is allowed |
|---|---|
| A non-unwinding FFI boundary | An escaping Rust panic aborts; a foreign unwind entering Rust is undefined behaviour. Catch an unwinding Rust panic if the contract requires translating it to an error instead of aborting. |
| A server, per request | One bad request must not take down the others, but the catch is followed by a controlled restart of the worker or process, not by trusting its state. |
| Defence in depth | A last backstop that logs and stops cleanly, where no correctness depends on it ever firing. |

Under `panic = "abort"`, `catch_unwind` cannot catch the panic. A panic hook
can run before the catch; keep diagnostics free of sensitive data. The panic
payload itself may panic on drop, so boundary translation must account for its
lifetime. Do not use `catch_unwind` to catch foreign exceptions: the result is
not portable. A boundary that intentionally permits unwinding requires an
appropriate unwind ABI and an explicitly designed interoperability contract.
Libraries must not silently recover from inconsistent state; documented
isolation or error translation must uphold invariants and the caller contract.

## Minimum panic-safety

Even code that expects to stop on panic must not make the stop worse. A function
that can panic partway should not leave a shared structure in a state that
breaks its invariants for whoever observes it afterwards — a lock guard that
poisons, a buffer length updated before the contents are written, a counter
bumped before the fallible step. Order the work so every intermediate state is
valid: do the fallible part first, commit with infallible steps last. The
stricter treatment inside `unsafe` code is in `/unsafe-rust`.
