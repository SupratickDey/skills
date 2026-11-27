use std::fs;
use std::process::Command;

#[test]
fn counts_matching_lines() {
    let dir = std::env::temp_dir().join(format!("tally-test-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let file = dir.join("input.txt");
    fs::write(&file, "alpha\nbeta\nalphabet\n").unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_tally"))
        .arg("alpha")
        .arg(&file)
        .output()
        .unwrap();
    assert!(String::from_utf8_lossy(&output.stdout).ends_with(": 2\n"));
    fs::remove_dir_all(&dir).unwrap();
}
