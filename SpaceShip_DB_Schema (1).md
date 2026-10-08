# SpaceShip — Database Schema (Phase 1)

Data design for the MVP. Each table below maps directly to one SQLAlchemy model in `spaceship_BE/app/models/` (one class = one table). The service layer sits on top with the pricing engine — the familiar N-layer structure.

**Conventions**
- Every table has a primary key `id`.
- Money (`price`, `base_price`, `discount_amount`, `final_price`, and `discount_value` when it is an amount) is stored as **integer VND** (e.g. `10000`), never floats, to avoid rounding errors.
- All timestamps are stored in **UTC** (timezone-aware).
- `is_active` is used for soft delete: deactivate a row without truly deleting it, so historical records still resolve correctly.
- The database is **PostgreSQL**. Schema changes are tracked as Alembic migrations in `spaceship_BE/alembic/` and are applied automatically when the API starts in production.

---

## 1. `customers`

People who use the space. They access the read-only view through a magic link — no login required.

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `name` | string | Customer name |
| `phone` | string (unique), nullable | Phone number, digits only with an optional leading `+`. Tells apart customers who share a name. Required when a customer is created; nullable only for customers created before the column existed |
| `token` | string (unique) | Long random string for the magic link (`/s/{token}`). Must be hard to guess |
| `created_at` | datetime | Creation time |
| `is_active` | bool | Soft delete. Deactivating a customer also disables their magic link |

---

## 2. `space_types`

Single desks in the shared area and private rooms (e.g. "Cornell Room") are all rows in this table.

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `name` | string | Type name (e.g. "Single Desk", "Cornell Room") |
| `description` | string | Description (amenities, location...) |
| `capacity` | int | Capacity (single desk = 1; room = 5, 10...). Informational; it does not affect the price |
| `pricing_mode` | string | `"per_room"` or `"per_person"`. Both are priced by the same rules from their own price tiers. The flag decides occupancy: a `per_room` type can hold only one open session at a time |
| `is_active` | bool | Soft delete. Removing a space type in the admin area sets this to false; its past sessions still point at the row |

---

## 3. `price_tiers`

The price list of a space type, one row per price. Because pricing is **data**, adding a new space type is just a few rows — no code changes.

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `space_type_id` | int (FK → `space_types.id`) | Which space type this tier belongs to |
| `kind` | string | `"hourly"`, `"combo"` or `"full_day"` — tells the pricing engine how to use this row |
| `label` | string | Display label (e.g. "1 hour", "Combo 4 hours", "Full day") |
| `duration_minutes` | int | Tier duration in minutes (hourly = 60) |
| `price` | int (VND) | Price for this tier |

Each space type should have:
- **one `hourly` row** — the price of a single hour. Required: any hour not covered by a combo is charged at this rate.
- **up to three `combo` rows** — owner-defined bundles (e.g. 3 hours, 4 hours).
- **at most one `full_day` row** — charged when the stay exceeds the full-day threshold. Optional.

> The owner edits a space type and its price list together in the admin area (`POST` / `PUT /admin/space-types`). Saving **replaces all of that space type's rows** in this table; the API enforces the three-combo limit and distinct combo durations. Nothing else references a price tier (sessions store their own frozen price), so replacing rows never affects past bills.

---

## 4. `sessions`

The operational core. One session = one stay (single desk: one person; room: the whole room).

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `customer_id` | int (FK → `customers.id`) | The session's customer |
| `space_type_id` | int (FK → `space_types.id`) | Space type in use |
| `campaign_id` | int (FK → `campaigns.id`), nullable | Discount campaign the owner picked at checkout (if any) |
| `started_at` | datetime | Check-in time |
| `ended_at` | datetime, nullable | Check-out time; empty while the session is active |
| `base_price` | int (VND), nullable | Price before discount, frozen at checkout |
| `discount_amount` | int (VND), nullable | Discount from the chosen campaign, frozen at checkout (`0` if none) |
| `final_price` | int (VND), nullable | **Frozen price** = `base_price − discount_amount`. Stored as a number, NOT a reference to the price table — so if rates change later, past sessions still read correctly |
| `created_at` | datetime | Creation time |

The three price columns are empty while the session is open and are written once, at checkout.

---

## 5. `point_entries`

Points are stored as a **ledger**: each credit/debit is one row, rather than a single total. A customer's total = the sum of their rows. Changing the earning rule never corrupts past data.

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `customer_id` | int (FK → `customers.id`) | Whose points |
| `session_id` | int (FK → `sessions.id`), nullable | Session that generated the points (if any) |
| `change` | int | Point delta: `+1`, `-10`... |
| `reason` | string | Reason (e.g. "sat 3+ hours", "redeemed free-day card") |
| `created_at` | datetime | Record time |

---

## 6. `vouchers`

The "free full day" card redeemed from points. Each card is one row, so counting them later for a membership tier (Phase 2) needs no new data.

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `customer_id` | int (FK → `customers.id`) | Card owner |
| `type` | string | Reward type (e.g. "free full day") |
| `is_used` | bool | Used or not |
| `expires_at` | datetime, nullable | Expiry (if any) |
| `created_at` | datetime | Creation time |

> Note: the table exists in Phase 1 but nothing reads or writes it yet. Point redemption is Phase 2.

---

## 7. `campaigns`

The owner's list of discounts. At checkout the owner picks at most one campaign for the bill; the system computes the discount from it.

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `name` | string | Campaign name (e.g. "Sunday discount", "Back-to-school") |
| `condition` | string | Free-text note for the owner about when to use it (e.g. "Sundays"). The system does **not** evaluate it |
| `discount_type` | string | `"percent"` or `"amount"` |
| `discount_value` | int | Discount: `5` (if percent) or VND amount (if amount) |
| `is_active` | bool | Enable/disable the campaign. Only active campaigns can be picked |

> The owner creates and edits campaigns in the admin area (`POST` / `PUT /admin/campaigns`). Rows are never deleted, only switched off with `is_active`, because `sessions.campaign_id` still refers to them.
>
> Phase 1: one campaign per bill, chosen by the owner. Automatic matching by day/date and stacking several campaigns are deferred to Phase 2.

---

## 8. `settings`

Key–value store for operational numbers the owner needs to change without touching code. Editable through the admin API (`PUT /admin/settings/{key}`).

| Field | Type | Description |
|---|---|---|
| `id` | int (PK) | Primary key |
| `key` | string (unique) | Setting name |
| `value` | string | Value (e.g. `"3"`) |

Keys used in Phase 1 (the default applies when no row exists):

| Key | Default | Meaning |
|---|---|---|
| `rounding_threshold_minutes` | `30` | Leftover minutes **above** this round the stay up to the next hour; otherwise it rounds down. Must be 0–59 |
| `full_day_threshold_hours` | `8` | A stay of **more than** this many billable hours is charged the full-day price |
| `point_threshold_hours` | `3` | Sitting at least this many hours earns 1 point |

---

## Relationships

- `customers` **1 — n** `sessions` (a customer has many sessions)
- `customers` **1 — n** `point_entries` (a customer has many point rows)
- `customers` **1 — n** `vouchers` (a customer has many cards)
- `space_types` **1 — n** `price_tiers` (a space type has many price tiers)
- `space_types` **1 — n** `sessions` (a space type is used by many sessions)
- `sessions` **1 — n** `point_entries` (a session may generate points)
- `campaigns` **1 — n** `sessions` (a campaign applies to many sessions)
- `settings` stands alone (configuration table, no foreign keys)
