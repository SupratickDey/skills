# Allocation regression tests

Read this when a measured fix removes allocations from a hot path and the
result should stay fixed. A profiler run shows the improvement once; a test
that counts allocations keeps it from regressing.

The counting allocator below wraps the system allocator and counts per
thread, so tests running in parallel do not disturb each other. It is
installed only in the test build, but it still replaces the allocator for
that test binary: get the same approval you would for any other
instrumentation, and keep it out of release builds.

What a count can and cannot show: it proves that a code path performs no
heap allocation after warmup, or at most a known number. It says nothing
about retained capacity, resident memory, native or FFI allocations, or
memory held by other threads. Measure those with the profiler as before.

```rust
/// Normalizes whitespace into a caller-owned buffer, so a caller that
/// reuses the buffer pays for its capacity once rather than per call.
pub fn normalize_into(input: &str, out: &mut String) {
    out.clear();
    for word in input.split_whitespace() {
        if !out.is_empty() {
            out.push(' ');
        }
        out.push_str(word);
    }
}

#[cfg(test)]
mod counting_allocator {
    use std::alloc::{GlobalAlloc, Layout, System};
    use std::cell::Cell;

    thread_local! {
        static ALLOCATIONS: Cell<usize> = const { Cell::new(0) };
    }

    pub struct Counting;

    // SAFETY: every call forwards to `System` with the same arguments; the
    // counter update neither allocates nor touches the returned memory.
    unsafe impl GlobalAlloc for Counting {
        unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
            // `try_with` fails only during thread teardown; skip counting then.
            let _ = ALLOCATIONS.try_with(|count| count.set(count.get() + 1));
            unsafe { System.alloc(layout) }
        }
        unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
            unsafe { System.dealloc(ptr, layout) }
        }
        unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
            let _ = ALLOCATIONS.try_with(|count| count.set(count.get() + 1));
            unsafe { System.realloc(ptr, layout, new_size) }
        }
    }

    #[global_allocator]
    static GLOBAL: Counting = Counting;

    /// Number of allocations and reallocations `f` performs on this thread.
    pub fn allocations_in(f: impl FnOnce()) -> usize {
        let before = ALLOCATIONS.with(Cell::get);
        f();
        ALLOCATIONS.with(Cell::get) - before
    }
}

#[cfg(test)]
mod tests {
    use super::counting_allocator::allocations_in;
    use super::normalize_into;

    #[test]
    fn steady_state_normalization_does_not_allocate() {
        let mut buffer = String::with_capacity(64);
        normalize_into("  warm   up  ", &mut buffer);
        let count = allocations_in(|| {
            for _ in 0..100 {
                normalize_into(" a  b\tc ", &mut buffer);
            }
        });
        assert_eq!(count, 0);
        assert_eq!(buffer, "a b c");
    }

    #[test]
    fn the_counter_sees_allocations() {
        assert!(allocations_in(|| drop(String::from("allocates"))) >= 1);
    }
}
```

Keep the second test: a counter that silently stopped counting would make
the first one pass forever. Run the suite in the configuration that matters
(release profile, if that is where the path is hot) and keep the profiler
measurement as the evidence for the original improvement.
