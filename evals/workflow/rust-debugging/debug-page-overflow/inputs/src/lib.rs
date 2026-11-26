pub fn page(data: &[u8], offset: usize, limit: usize) -> &[u8] {
    let end = (offset + limit).min(data.len());
    &data[offset..end]
}

pub fn is_empty(data: &[u8]) -> bool {
    data.is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_page() {
        assert_eq!(page(b"abcd", 1, 2), b"bc");
    }

    #[test]
    fn page_clamps_to_end() {
        assert_eq!(page(b"abcd", 2, 9), b"cd");
    }
}
