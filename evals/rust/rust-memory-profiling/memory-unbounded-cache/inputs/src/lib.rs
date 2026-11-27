use std::collections::HashMap;
use std::sync::Arc;

pub const DEFAULT_CAPACITY: usize = 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Profile {
    pub user_id: String,
    pub display_name: String,
}

#[derive(Debug, PartialEq, Eq)]
pub struct CacheError;

/// Caches profiles loaded by `loader`.
pub struct ProfileCache<F> {
    loader: F,
    entries: HashMap<String, Arc<Profile>>,
}

impl<F: FnMut(&str) -> Profile> ProfileCache<F> {
    pub fn new(loader: F) -> Self {
        Self { loader, entries: HashMap::new() }
    }

    pub fn get(&mut self, user_id: &str) -> Arc<Profile> {
        if let Some(profile) = self.entries.get(user_id) {
            return Arc::clone(profile);
        }
        let profile = Arc::new((self.loader)(user_id));
        self.entries.insert(user_id.to_owned(), Arc::clone(&profile));
        profile
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn load(user_id: &str) -> Profile {
        Profile { user_id: user_id.to_owned(), display_name: user_id.to_uppercase() }
    }

    #[test]
    fn repeated_ids_are_served_from_the_cache() {
        let mut calls = 0;
        let mut cache = ProfileCache::new(|id: &str| {
            calls += 1;
            load(id)
        });
        assert_eq!(cache.get("ada").display_name, "ADA");
        assert_eq!(cache.get("ada").display_name, "ADA");
        drop(cache);
        assert_eq!(calls, 1);
    }
}
