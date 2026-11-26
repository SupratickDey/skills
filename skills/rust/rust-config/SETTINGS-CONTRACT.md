# Settings contract

Use the project's documentation location and format. Do not create another
config reference if one already exists.

| Field | Record |
|---|---|
| Name and source | Canonical key, supported aliases, source precedence |
| Type and units | For example positive duration in milliseconds |
| Default | Safe default or required, never an actual secret |
| Validation | Allowed range, dependencies on other settings |
| Sensitivity | Public, internal, secret reference; redaction policy |
| Lifecycle | Startup only, reloadable, or controlled resource replacement |
| Compatibility | Deprecated name, migration, removal policy |

Example: REQUEST_TIMEOUT_MS is an optional positive integer in milliseconds.
If absent, the existing documented default applies; empty or malformed input
is rejected. The permitted range is a project decision. The resulting value is
a Duration passed to the relevant client. The example is illustrative, not a
recommended universal timeout.

## Edge cases

- Lower-priority value is valid, explicit higher-priority value is invalid.
- Missing required secret, unreadable secret file, or rotation failure.
- Integer conversion overflow, unit mismatch, zero capacity, contradictory
  timeout or retry settings.
- Duplicate keys, unknown keys, conflicting old and new aliases.
- Invalid reload while current requests use a valid snapshot.
- Error formatting, nested error sources and structured log fields contain no
  sentinel secret used in the test.

A startup-only configuration need not acquire a global mutable store, a reload
watcher or a new dependency simply to centralize its values.
