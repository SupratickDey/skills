# Differential testing

The mechanism a port uses to prove parity: the same inputs through both
implementations, the outputs compared. This file supplies the harness. The
parity contract — which differences are acceptable, and what "done" means for
the port — belongs to `/port-to-rust`.

## Three harness shapes

| Shape | How it works | Tradeoff |
|---|---|---|
| Recorded corpus | Capture approved, sanitized inputs and source outputs; retain them in an authorized fixture store; assert the Rust implementation reproduces them | Cheapest to build; covers only what was recorded |
| Side-by-side execution | Invoke both implementations on each input in the same test run | Catches inputs no one thought to record; requires the source implementation to stay runnable |
| Property-driven | Generate inputs with `proptest` over a shared generator; assert both produce equal output | Finds the edge cases nobody wrote down; needs a generator that produces *valid* inputs or it tests error paths only |

Which to build is a question of what is still available. Start with the
recorded corpus — it is the baseline CI can run forever, after the source
runtime is gone. Add side-by-side while the source implementation is still
runnable; it is the bridge that catches what the corpus missed, and it retires
with the source. Add property-driven for input spaces the corpus is thin on —
malformed-but-parseable structures, edge-sized integers — where generating
*valid* inputs is the hard part.

## Corpus quality and privacy

Capture only authorized data; prefer synthetic fixtures and approved redaction
that preserves the behaviour being tested. Do not commit credentials, personal
information, confidential payloads or raw production traces. Keep access and
retention appropriate to the data, and report case IDs rather than sensitive
payloads. Derive expected results from the independent source, not the port.
Keep a representative validation partition out of implementation prompts and
fixture-driven tuning; freeze it before implementation and record its revision.

Exercise empty and large inputs, Unicode and encoding boundaries, signed and
unsigned integer limits, overflow, malformed inputs, ordering, error classes,
and NaN, infinities and signed zero when the contract admits those values.
Use domain-approved absolute and relative tolerances for finite floats; do not
silently equate NaN, infinity or signed zero. Compare side effects only through
isolated, deterministic test doubles or replay that cannot repeat live writes.
Report the actual counts by input class, mismatches and skips. Required parity
checks must fail if the source cannot run or if no cases were compared; an
optional local run may report a skip but is not evidence of parity.

## Normalizing before comparing

Differences that are not behaviour differences must be normalized in the
comparison, and each normalization written down with why it is safe:

- **Map iteration order** — sort keys before comparing; safe because the
  contract is the set of entries, not their order.
- **Float formatting** — parse both sides back to numbers and compare with a
  stated tolerance; safe because the contract is the value, not the rendering.
- **Timestamps** — redact to a fixed value; safe because the contract never
  names a specific instant.
- **Absolute paths** — strip the workspace root from both sides; safe because
  the contract is the path structure, not the checkout location.
- **Line endings** — normalize to `\n`; safe because the contract is the text,
  not the platform that rendered it.

An undocumented normalization is how a real difference gets sanded away. The
normalizer lives with the test and is reviewed like the test — a normalization
that hides the bug the port introduced makes the green suite worse than no
suite.

## Recording a difference

When the outputs disagree, the disagreement is triaged before it is fixed.
Two legitimate answers: the source behaviour is the contract and the port is
wrong, or the source behaviour is a bug being faithfully reproduced and the
port is deliberately different. Both answers are legitimate; neither is
decided silently by the agent doing the port.

The record for each difference: the input that triggered it, both outputs
with sensitive values removed or stored only in the authorized fixture store, which side is the contract and why, and the decision — fix the port,
or name the difference as one the parity contract must rule on. The contract
itself is not written here; it belongs to `/port-to-rust`.
A quarantined input with no written reason is a difference the team has
agreed to ignore.

## Worked example: side-by-side over a corpus

A small test that shells out to the source implementation, feeds both a corpus
directory, and reports the first differing case with both outputs:

```rust,ignore
// tests/differential.rs
use std::io::Write;

const CORPUS: &str = "tests/fixtures/diff-corpus";

#[test]
fn matches_source_on_recorded_corpus() {
    let inputs = std::fs::read_dir(CORPUS)
        .expect("corpus directory committed")
        .map(|entry| entry.expect("corpus entry").path())
        .collect::<Vec<_>>();

    let mut not_run = Vec::new();

    for input in inputs {
        let raw = std::fs::read_to_string(&input).expect("corpus input readable");
        let name = input.file_name().expect("input has a name").to_string_lossy().to_string();

        let Some(source_out) = run_source(&raw) else {
            not_run.push(format!(
                "check did not run for {name}: python3 is missing on this machine, \
                so the source implementation could not be invoked"
            ));
            continue;
        };

        let rust_out = normalize(&mycrate::process(&raw));
        let source_out = normalize(&source_out);

        assert_eq!(
            rust_out, source_out,
            "first difference on {name}: rust = {rust_out:?}, source = {source_out:?}",
        );
    }

    for line in not_run {
        println!("{line}");
    }
}

fn run_source(raw: &str) -> Option<String> {
    let mut child = std::process::Command::new("python3")
        .arg("source/processor.py")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .ok()?; // python3 is not on this machine: report it, do not fail red

    child.stdin
        .as_mut()
        .expect("stdin open")
        .write_all(raw.as_bytes())
        .expect("input written");
    let output = child.wait_with_output().expect("source process exits");
    Some(String::from_utf8(output.stdout).expect("source output is utf-8"))
}

/// The record of normalizations, each with why it is safe.
fn normalize(out: &str) -> String {
    // path separator: the contract is the component sequence, not the OS
    out.replace('\\', "/")
}
```

This illustrative harness is suitable only for an optional local check when the
source toolchain is unavailable. For a required parity gate, fail on missing
runtime, non-successful source execution or an empty corpus. Close stdin and
check exit status and stderr according to the contract. Never treat a passing
run with skipped cases as parity evidence. Report counts and skips explicitly;
`cargo test` captures output from passing tests unless run with `--nocapture`.
