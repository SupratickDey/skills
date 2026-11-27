# Cursor pagination

Read this when adding or changing a paginated list endpoint. The example is
framework-free; the handler in an existing framework only maps request
parameters into `parse_page` and the result into the response.

What it enforces:

- A default page size and a hard maximum. A request above the maximum is
  rejected rather than silently clamped, so the documented contract stays the
  real one.
- Stable ordering on a unique key (here the record id). Paging on a
  non-unique key skips or repeats rows at page boundaries.
- An opaque, versioned cursor that is bound to the query that produced it.
  A cursor from another filter or tenant is rejected, not reinterpreted.
  The cursor is not a security boundary: authorization and tenant filtering
  still apply to every page.
- One extra row fetched to decide whether a next page exists, instead of a
  separate count query.

```rust
use std::fmt;

pub const DEFAULT_LIMIT: usize = 50;
pub const MAX_LIMIT: usize = 200;

#[derive(Debug, PartialEq, Eq)]
pub enum PageError {
    InvalidLimit,
    LimitTooLarge { max: usize },
    InvalidCursor,
}

impl fmt::Display for PageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PageError::InvalidLimit => write!(f, "limit must be a positive integer"),
            PageError::LimitTooLarge { max } => write!(f, "limit must not exceed {max}"),
            PageError::InvalidCursor => write!(f, "cursor is invalid for this query"),
        }
    }
}

impl std::error::Error for PageError {}

#[derive(Debug, PartialEq, Eq)]
pub struct PageRequest {
    pub limit: usize,
    /// Return records with an id greater than this one.
    pub after: Option<u64>,
}

/// `query_key` identifies the tenant and filter, for example a hash of them
/// computed by the handler. It is embedded in every cursor.
pub fn parse_page(limit: Option<&str>, cursor: Option<&str>, query_key: u64) -> Result<PageRequest, PageError> {
    let limit = match limit {
        None => DEFAULT_LIMIT,
        Some(raw) => raw.parse::<usize>().ok().filter(|n| *n > 0).ok_or(PageError::InvalidLimit)?,
    };
    if limit > MAX_LIMIT {
        return Err(PageError::LimitTooLarge { max: MAX_LIMIT });
    }
    let after = cursor.map(|raw| decode_cursor(raw, query_key)).transpose()?;
    Ok(PageRequest { limit, after })
}

fn encode_cursor(query_key: u64, after: u64) -> String {
    format!("v1.{query_key:016x}.{after:016x}")
}

fn decode_cursor(raw: &str, query_key: u64) -> Result<u64, PageError> {
    let mut parts = raw.split('.');
    let (Some("v1"), Some(key), Some(after), None) = (parts.next(), parts.next(), parts.next(), parts.next()) else {
        return Err(PageError::InvalidCursor);
    };
    let key = u64::from_str_radix(key, 16).map_err(|_| PageError::InvalidCursor)?;
    let after = u64::from_str_radix(after, 16).map_err(|_| PageError::InvalidCursor)?;
    if key != query_key {
        return Err(PageError::InvalidCursor);
    }
    Ok(after)
}

pub struct Page<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<String>,
}

/// `fetch(after, n)` returns up to `n` records ordered by ascending id. In a
/// database this is `WHERE id > $after ORDER BY id LIMIT $n` plus the
/// tenant and filter predicates.
pub fn load_page<T>(
    request: &PageRequest,
    query_key: u64,
    id_of: impl Fn(&T) -> u64,
    fetch: impl FnOnce(Option<u64>, usize) -> Vec<T>,
) -> Page<T> {
    let mut items = fetch(request.after, request.limit + 1);
    let has_more = items.len() > request.limit;
    items.truncate(request.limit);
    let next_cursor = match items.last() {
        Some(last) if has_more => Some(encode_cursor(query_key, id_of(last))),
        _ => None,
    };
    Page { items, next_cursor }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fetch_from(ids: &[u64]) -> impl FnOnce(Option<u64>, usize) -> Vec<u64> + '_ {
        move |after, n| ids.iter().copied().filter(|id| after.is_none_or(|a| *id > a)).take(n).collect()
    }

    #[test]
    fn pages_cover_every_record_once() {
        let ids = [3, 5, 8, 13, 21];
        let mut seen = Vec::new();
        let mut cursor = None;
        loop {
            let request = parse_page(Some("2"), cursor.as_deref(), 7).unwrap();
            let page = load_page(&request, 7, |id| *id, fetch_from(&ids));
            seen.extend(page.items);
            match page.next_cursor {
                Some(next) => cursor = Some(next),
                None => break,
            }
        }
        assert_eq!(seen, ids);
    }

    #[test]
    fn rejects_oversized_limits_and_foreign_cursors() {
        assert_eq!(parse_page(Some("500"), None, 7), Err(PageError::LimitTooLarge { max: MAX_LIMIT }));
        assert_eq!(parse_page(Some("0"), None, 7), Err(PageError::InvalidLimit));
        let cursor = encode_cursor(7, 5);
        assert_eq!(parse_page(None, Some(&cursor), 8), Err(PageError::InvalidCursor));
        assert_eq!(parse_page(None, Some("v1.zz.00"), 7), Err(PageError::InvalidCursor));
    }
}
```

Cover the first page, the last page, an empty result, an exact multiple of
the page size, a limit at and above the maximum, and a cursor from another
filter. If records can be inserted or deleted between requests, state the
consistency the endpoint promises and test it.
