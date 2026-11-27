use std::env;
use std::fs;

fn main() {
    let pattern = env::args().nth(1).unwrap();
    let file = env::args().nth(2).unwrap();
    let text = fs::read_to_string(&file).unwrap();
    let count = text.lines().filter(|line| line.contains(&pattern)).count();
    if count == 0 {
        println!("warning: no lines matched");
    }
    println!("{file}: {count}");
}
