# WB card → Product mapping and defaults

**Parent goal:** [Master plan](./README.md)

**Navigation:** [Previous](./03-database-schema-wb-fields-and-sync-state.md) · [Index](./README.md) · [Next](./05-sync-service-incremental-and-reconciliation.md)

## Objective

Define deterministic mapping from a Wildberries card payload to `Product` create/update data (Prisma-shaped or API-shaped), including safe defaults for required Voice Toys fields.

## Scope

**In scope**

- Mapping reference fields: `nmID`, `vendorCode`, `brand`, `title`, `description`, `dimensions`, `characteristics`, sizes/SKUs, `createdAt`, `updatedAt`, `subjectName`, photos/media URLs.
- Output must satisfy DB constraints and existing validation patterns:
  - **Explore:** `validateProductData` and `transformProductFromDB` in `src/lib/product-utils.ts`; `CreateProductRequest` in `src/components/entities/product/model/types.ts`.
- Required Voice Toys fields without a natural WB source need documented defaults, e.g.:
  - `breadcrumbs`: e.g. `[brand, subjectName].filter(Boolean)` or `["Wildberries", subjectName]`.
  - `images`: array of WB photo URLs (validate non-empty or placeholder policy).
  - `price`: if card lacks retail price, define rule (e.g. 0 forbidden by validator — may need to relax validation for WB rows or fetch prices elsewhere; **call out as decision** in implementation).
  - `pickupAvailability` / `deliveryAvailability` / `returnDetails`: static Russian strings or configurable constants until fulfillment integration exists.
- Map WB characteristics into `ProductCharacteristic` key/value pairs (normalize names).
- Set `wbNmId`, `wbCardUpdatedAt`, `isActive: true` on create/update from WB.

**Out of scope**

- Calling HTTP (subtask 02) and orchestration (subtask 05).

## Background

- WB card structure may be nested; use defensive extraction and unit tests with **fixture JSON** (sanitized, no secrets).
- Admin-created products may remain without `wbNmId`; sync must not overwrite them unless explicitly out of scope (default: **only touch** rows with matching `wbNmId` or create new rows for new nmIDs).

## Implementation notes

1. Add `src/lib/wb/map-card-to-product.ts` (or similar) exporting pure functions for testability.
2. Compare `wbCardUpdatedAt` with DB before heavy writes if optimization is needed.
3. Document any **intentional** divergence from WB (e.g. stripping HTML, truncating description).
4. If `validateProductData` blocks legitimate WB rows, introduce a **`validateWbProductPayload`** or WB-specific bypass used only on sync path — prefer tightening defaults over weakening global validation.

## Acceptance criteria

- Given a representative fixture card, mapper produces data that `prisma.product.create` / `update` accepts.
- Unit tests cover edge cases: missing optional fields, empty photos, long description.
- Mapping table (comment or short docstring in code) lists WB field → `Product` field.

## Handoff

Subtask **05** imports the mapper for each card returned by the client and applies transactions/upserts.
