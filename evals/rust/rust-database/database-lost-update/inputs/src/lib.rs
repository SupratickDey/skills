use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Stock {
    pub available: u32,
    pub version: u64,
}

/// A table shared by several service instances.
pub trait StockStore {
    fn get(&self, sku: &str) -> Option<Stock>;
    /// Unconditional write, used by administrative imports.
    fn put(&mut self, sku: &str, stock: Stock);
    /// `UPDATE stock SET available = $3, version = version + 1
    ///  WHERE sku = $1 AND version = $2`; returns the affected-row count.
    fn update_if_version(&mut self, sku: &str, expected_version: u64, available: u32) -> u64;
}

#[derive(Default)]
pub struct InMemoryStore {
    rows: HashMap<String, Stock>,
}

impl StockStore for InMemoryStore {
    fn get(&self, sku: &str) -> Option<Stock> {
        self.rows.get(sku).copied()
    }

    fn put(&mut self, sku: &str, stock: Stock) {
        self.rows.insert(sku.to_owned(), stock);
    }

    fn update_if_version(&mut self, sku: &str, expected_version: u64, available: u32) -> u64 {
        match self.rows.get_mut(sku) {
            Some(row) if row.version == expected_version => {
                row.available = available;
                row.version += 1;
                1
            }
            _ => 0,
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReserveError {
    UnknownSku,
    InsufficientStock,
    Conflict,
}

/// Reserves `quantity` units of `sku` and returns the stock after the reservation.
pub fn reserve(store: &mut impl StockStore, sku: &str, quantity: u32) -> Result<Stock, ReserveError> {
    let current = store.get(sku).ok_or(ReserveError::UnknownSku)?;
    let next = Stock {
        available: current.available.saturating_sub(quantity),
        version: current.version + 1,
    };
    store.put(sku, next);
    Ok(next)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reserves_available_stock() {
        let mut store = InMemoryStore::default();
        store.put("sku-1", Stock { available: 5, version: 1 });
        assert_eq!(reserve(&mut store, "sku-1", 2), Ok(Stock { available: 3, version: 2 }));
        assert_eq!(store.get("sku-1"), Some(Stock { available: 3, version: 2 }));
    }

    #[test]
    fn unknown_sku_is_reported() {
        let mut store = InMemoryStore::default();
        assert_eq!(reserve(&mut store, "missing", 1), Err(ReserveError::UnknownSku));
    }
}
