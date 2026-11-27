# Workspace inheritance

Read this when consolidating package metadata, dependency declarations or
lints at the workspace root. The manifests below are a complete two-member
workspace; the comments mark the rules that most often surprise.

Root `Cargo.toml`:

```toml
[workspace]
members = ["crates/core", "crates/cli"]
# Edition 2024 workspaces default to resolver 3; state it so a virtual
# manifest (no root package) does not fall back to an older resolver.
resolver = "3"

[workspace.package]
version = "0.4.0"
edition = "2024"
rust-version = "1.85"
license = "MIT OR Apache-2.0"

[workspace.dependencies]
# A path dependency shared by members. Keep `version` alongside `path` if
# the dependent crate is published; crates.io rejects path-only dependencies.
example-core = { path = "crates/core", version = "0.4.0" }
# Declared without default features. A member can add features, but it can
# never remove a default feature that the workspace declaration enables.
serde = { version = "1", default-features = false }

[workspace.lints.rust]
unsafe_code = "forbid"

[workspace.lints.clippy]
unwrap_used = "deny"
```

Member `crates/cli/Cargo.toml`:

```toml
[package]
name = "example-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true

[dependencies]
example-core.workspace = true
# Adds a feature on top of the inherited declaration.
serde = { workspace = true, features = ["derive"] }

# Lint inheritance is all or nothing: with `workspace = true` a member cannot
# also declare its own [lints.rust] or [lints.clippy] tables.
[lints]
workspace = true
```

Inheritance shares a declaration, not a resolved graph. Two members that
inherit the same requirement can still unify features differently from what
either manifest suggests, because Cargo unifies features across every package
it builds together. Check the resolved result, not the manifests:

```bash
cargo metadata --format-version 1 --no-deps   # package inventory and inherited values
cargo tree -e features -p example-cli         # features actually enabled for one member
cargo tree -d                                 # duplicate versions in the graph
cargo check -p example-cli                    # the member alone, without feature help from others
```

Building one member with `-p` catches a member that compiles only because a
sibling enabled a feature it needs.
