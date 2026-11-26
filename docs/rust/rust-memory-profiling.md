## What it does

Allocation profiles, retained memory and peak resource budgets. It applies to the approved project and its supported environments,
not to speculative changes or unrequested tooling.

## When to reach for it

Model-invoked: Measure and diagnose Rust memory consumption, allocation churn, retention, leaks, queue growth and allocator behavior. Use for high RSS, increasing heap, memory pressure or excessive allocations. Not for general CPU optimization, ownership design without measurement, or proving unsafe code soundness. Users can invoke it directly by name.

## Decisions and verification

### Define the memory symptom

Record representative input, concurrency, warmup, duration, build profile,
platform, allocator and resource budget. Distinguish peak resident memory,
live heap, allocation rate, retained capacity, mapped files, thread stacks,
native allocations and process/container accounting. RSS remaining high after
freeing values does not alone prove a leak; allocators may retain memory for
reuse. A low allocation count does not prove a low memory footprint.

Reproduce in a release-like build with symbols where needed. Use an existing
supported heap profiler, allocation instrumentation or platform tool; for
example heaptrack on supported Linux environments, Instruments on macOS,
or a compatible allocator profiler. Do not install a profiler, replace the
allocator or enable global instrumentation without approval. Record overhead
and distinguish profiler observations from uninstrumented measurements.

### Find ownership and retention

Locate the allocation sites and the owners keeping data alive. Inspect
unbounded caches and queues, retained buffers, task lifetimes, Arc/Rc cycles,
pending messages, collection capacities and native resource ownership.
Use `/ownership-not-clone` for ownership corrections and `/rust-resilience`
for admission/backpressure. Distinguish intentional caching from unreachable
or unnecessarily retained state. Rust memory safety does not prevent memory
leaks or resource exhaustion.

For a growing workload, sample after equivalent lifecycle points and after
drain or cleanup. Check repeated operation cycles and the effect of varying
concurrency and input sizes. Avoid treating one process snapshot as proof
of a growth trend. Include FFI allocations and GPU or shared memory where
the workload uses them; a Rust heap profiler may not see these resources.

### Make a measured correction

Choose bounds, reuse, streaming, ownership changes or eviction according to
the measured cause and domain requirements. Do not trim caches blindly,
discard required work, change allocator settings or trade correctness for
lower RSS. Assess latency, CPU and allocation trade-offs; use fallible
allocation APIs where the application contract can handle allocation
failure. Do not promise recovery from every out-of-memory condition.
Route general benchmarking to `/rust-performance` and memory safety to
`/unsafe-rust`.

### Verification

Repeat the same representative workload and lifecycle, with the same
measurement method, sample counts and environment. Compare peak and steady
memory, allocation and retention measures, throughput and latency as relevant.
Verify cleanup after repeated cycles and overload behavior against the
agreed budget. Run configured format, clippy and tests (-D warnings only
without an existing policy) and preserve behavior. Report raw measurement
context, variance, profiler limitations and unobserved memory. If no
profiler or representative workload is available, report hypotheses rather
than a measured improvement.

## Common questions

**Does this skill authorize a new dependency or supported environment?** No.
Inspect existing choices and obtain approval for a material change.

**What if the required verification environment is unavailable?** Report
what was inspected or simulated, and distinguish the missing execution evidence.

## It's working if

- Memory metrics are defined and compared at equivalent lifecycle points.
- Retention has a demonstrated owner or allocation path.
- Changes respect the workload's correctness and resource requirements.
- Measured memory outcomes include overhead and unobserved resources.

## Where it fits

Use `/rust-performance` for related concerns. See [rust-skills-map](../workflow/rust-skills-map.md)
for the full routing table.
