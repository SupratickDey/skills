#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Order {
    pub id: u64,
    pub created_at: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub enum PageError {
    InvalidLimit,
    InvalidCursor,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Page {
    pub orders: Vec<Order>,
    pub next_cursor: Option<String>,
}

pub const DEFAULT_LIMIT: usize = 20;
pub const MAX_LIMIT: usize = 100;

/// Lists one page of a tenant's orders, newest first. `orders` holds the
/// tenant's orders in storage order; `cursor` is the `next_cursor` of the
/// previous page.
pub fn list_orders(orders: &[Order], limit: Option<usize>, cursor: Option<&str>) -> Result<Page, PageError> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT);
    let before: Option<u64> = match cursor {
        Some(raw) => Some(raw.parse().map_err(|_| PageError::InvalidCursor)?),
        None => None,
    };
    let mut page: Vec<Order> = orders
        .iter()
        .filter(|order| before.map_or(true, |b| order.created_at < b))
        .cloned()
        .collect();
    page.sort_by_key(|order| std::cmp::Reverse(order.created_at));
    let has_more = page.len() > limit;
    page.truncate(limit);
    let next_cursor = if has_more {
        page.last().map(|order| order.created_at.to_string())
    } else {
        None
    };
    Ok(Page { orders: page, next_cursor })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn order(id: u64, created_at: u64) -> Order {
        Order { id, created_at }
    }

    #[test]
    fn pages_distinct_timestamps_newest_first() {
        let orders = vec![order(1, 10), order(2, 30), order(3, 20)];
        let first = list_orders(&orders, Some(2), None).unwrap();
        assert_eq!(first.orders, vec![order(2, 30), order(3, 20)]);
        let second = list_orders(&orders, Some(2), first.next_cursor.as_deref()).unwrap();
        assert_eq!(second.orders, vec![order(1, 10)]);
        assert_eq!(second.next_cursor, None);
    }
}
