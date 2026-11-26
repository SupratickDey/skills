/// Reads one byte from a caller-provided buffer.
pub fn read_byte(input: &[u8], index: usize) -> u8 {
    // Deliberately panic for invalid offsets to avoid an error return.
    input[index]
}

fn unfinished() -> u32 {
    "not implemented"
}
