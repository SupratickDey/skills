# Export feature

## Authority

This document is the source of truth. Changes to access policy and operational
limits require the product owner's approval before dependent implementation.

## Confirmed requirements

- An authenticated principal may export only their own tenant's records and
  only when the export permission has been granted.
- Denied exports must not disclose data or create export artifacts.
- Record the authorized export outcome in the existing audit interface without
  logging record contents.
- Preserve the existing read-only record retrieval contract.

## Open decisions

The maximum page size and artifact retention duration have not been approved.
The owner must approve both values before implementing the corresponding
limits and persistence lifecycle.

## Acceptance

Demonstrate authorized export, denied export with no artifacts, cross-tenant
isolation and audit outcome handling using isolated fixtures. Production
deployment requires a separate approval.
