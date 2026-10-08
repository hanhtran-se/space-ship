# SpaceShip — Business Rules & Functional Flows (Phase 1)

This document describes **what the system does and why** — the business rules that govern pricing and points, and the step-by-step flows for both the admin (owner) and the customer. It is the functional companion to the database schema.

---

## Part 1 — Business Rules

### BR-1. Space types
- The space can offer multiple **space types** (single desks in the shared area, private rooms such as the "Cornell Room").
- Each space type is charged in one of two modes:
  - **per_person** — single desks; one session = one person.
  - **per_room** — rooms; one session = the whole room. One person books and pays the room price, regardless of how many people use it.
- Each space type has its own independent price list. Both modes are priced by the same rules (BR-2); only the price list differs.

### BR-2. Pricing by hours and combos
- Each space type's price list has three kinds of price, all set by the owner:
  - an **hourly price** (one hour),
  - up to **three combos** (bundles such as 3 hours or 4 hours at a set price),
  - a **full-day price**.
- **Rounding.** A stay is rounded to whole billable hours using the owner's **rounding threshold** (default 30 minutes): leftover minutes above the threshold round up, otherwise they round down. The minimum charge is 1 hour.
- **Combos.** The system uses the largest combo that fits inside the billable hours and charges every remaining hour at the hourly price. If no combo fits, every hour is charged at the hourly price.
- **Full day.** A stay of more than the **full-day threshold** (default 8 billable hours) is charged the full-day price. Below that threshold the price is not capped at the full-day price.
- Prices are stored as **data**, not hardcoded. The owner adds space types and changes prices from the admin area (Prices); no code change is involved.
- A price list is edited as a whole: saving a space type replaces all of its prices. Two combos on the same space type cannot have the same number of hours.

Example, with a desk priced at 15,000 per hour, a 4-hour combo at 50,000 and a full day at 80,000:

| Actual stay | Billable hours | Price |
|---|---|---|
| 20 minutes | 1 | 15,000 |
| 1 h 30 min | 1 | 15,000 |
| 1 h 31 min | 2 | 30,000 |
| 4 h | 4 | 50,000 (combo) |
| 4 h 40 min | 5 | 65,000 (combo + 1 hour) |
| 8 h 40 min | 9 | 80,000 (full day) |

### BR-3. Discount campaigns
- Discounts are modeled as **campaigns**. Each campaign has a name, a note on when to use it, a discount (percent or fixed amount), and an on/off switch.
- Multiple campaigns may exist at once. The owner creates and edits them from the admin area (Campaigns).
- A campaign is never deleted, only switched off, because past bills still refer to it. A campaign that is off cannot be picked at checkout.
- A percent discount is between 1 and 100; a fixed amount is greater than zero.
- **Phase 1 rule:** at checkout the **owner picks** at most one active campaign for the bill. The system computes the discount from the campaign and shows it as its own line on the bill (price, minus discount, total).
- A discount can never exceed the price; the total is never below zero.
- Applying campaigns automatically by day/date, and stacking several campaigns, are deferred to Phase 2.

### BR-4. Loyalty points
- A session earns **1 point** if its actual duration (not the rounded billable hours) meets or exceeds a configurable **threshold** (currently 3 hours).
- The threshold lives in `settings` (`point_threshold_hours`) and can be changed without code.
- Points are recorded in a **ledger**: every credit or debit is a separate entry. A customer's balance is the sum of their entries.
- Changing the earning rule only affects **future** entries; past points are never recalculated.

### BR-5. Point redemption *(Phase 2)*
- A customer with enough points can redeem a **free full-day card** (voucher). Redeeming debits points (a negative ledger entry) and creates a voucher.
- Cards are retained as individual records so they can later support a membership tier based on card count.

### BR-6. Price integrity
- When a session is closed, its price is **frozen** onto the session as fixed numbers: the price before discount (`base_price`), the discount (`discount_amount`) and the total (`final_price`).
- Later changes to prices, campaigns or thresholds never alter the recorded price of past sessions.

### BR-7. Access & roles
- **Admin (owner):** one privileged account. Protected by HTTP Basic Auth; credentials live in environment variables, never in code. The owner signs in through a form in the admin app, which keeps the credentials only for that browser tab.
- **Customer:** no login. Accesses a **read-only** view via a long, unguessable magic-link token. A token only ever exposes that one customer's own data. Deactivating a customer disables their link.

### BR-8. Occupancy
- A customer can have only **one open session** at a time.
- A room (`per_room`) with an open session is **occupied**: it is hidden from the list of available spaces at check-in and cannot be booked again until that session is closed.
- Desks (`per_person`) are shared and are always available.
- A space type that has someone seated cannot be removed. Removing one hides it from check-in but keeps its past sessions.

### BR-9. Owner-adjustable thresholds
The owner can change these numbers at any time; changes only affect sessions closed afterwards.

| Setting | Default | Used by |
|---|---|---|
| `rounding_threshold_minutes` | 30 | Rounding to billable hours (BR-2) |
| `full_day_threshold_hours` | 8 | Switching to the full-day price (BR-2) |
| `point_threshold_hours` | 3 | Earning a point (BR-4) |

### BR-10. Customer identity
- A customer is recorded with a **name and a phone number**. The phone number tells apart customers who share a name.
- Phone numbers are stored as digits only (spaces, dots and dashes are dropped; a leading `+` is kept) and must be 8 to 15 digits.
- A phone number belongs to **one customer only**. Creating a customer with a number already in use, or changing a customer's number to one already in use, is refused and names the customer who holds it.
- The owner can change a customer's name and phone number later.
- Customers are found by name, by phone number, or by both at once: every word typed must match the name or the phone (e.g. `lan 0901`).

---

## Part 2 — The Pricing Engine

The heart of the system, living in the service layer (`spaceship_BE/app/services/pricing_engine.py`). It is a set of pure functions with no database access:

```
inputs:  the space type's price tiers, duration, the thresholds, (chosen campaign)
output:  billable hours, price before discount, discount
```

**Steps:**
1. Round the duration to billable hours using the rounding threshold (minimum 1 hour).
2. If the billable hours exceed the full-day threshold, the price is the full-day price.
3. Otherwise take the largest combo that fits, and add the hourly price for each remaining hour.
4. If the owner picked a campaign, compute its discount (percent of the price, or a fixed amount), limited to the price.
5. (Phase 2) Apply point redemption if a free-day card is used.

Steps 1–3 also produce the "running estimate" shown during a session. The campaign is applied only at checkout.

If a space type has no hourly price and the stay needs one, the engine cannot price it and checkout is refused until the price list is fixed.

---

## Part 3 — Admin Flows (owner, daily)

### Flow A-0. Admin login
1. Owner opens the admin area and sees the sign-in screen.
2. Owner enters username / password; the app sends them as HTTP Basic Auth.
3. Credentials are checked against environment values.
4. On success, the owner reaches the admin dashboard; on failure, the screen says the username or password is wrong.
5. Closing the browser tab signs the owner out.

### Flow A-1. Setup (and later changes)
All four steps are done from the admin area and can be repeated at any time.
1. **Prices:** create **space types** (name, description, pricing mode, capacity for rooms).
2. **Prices:** enter the **price list** for each space type: hourly price, up to three combos, optional full-day price. A space type can be edited or removed later (BR-8).
3. **Campaigns:** create **campaigns** and switch them on or off (BR-3).
4. **Settings:** configure the **thresholds** (BR-9).

A seed script (`spaceship_BE/scripts/seed.py`) can load sample space types and campaigns for local development; it is not needed in production.

### Flow A-2. Add a customer
1. Owner enters the customer's name and phone number.
2. System checks the phone number is not already in use (BR-10), generates a unique magic-link **token** and creates the customer.
3. Owner copies the link (and/or shows a QR code) to share with the customer.

### Flow A-2b. Find or update a customer
1. Owner searches the customer list by name, phone number, or both.
2. Owner opens a customer to see their link, QR code, points and number of visits.
3. Owner can change the name or phone number; a phone number already in use is refused.

### Flow A-3. Start a session (check-in)
1. Owner selects a customer, searching by name or phone number. Customers who are already seated cannot be selected.
2. Owner selects a space type from the **available** list. Occupied rooms do not appear, so the owner can tell the customer that room is taken.
3. Owner presses **Start**.
4. System records `started_at` and creates an open session (`ended_at` empty).

The system refuses the check-in if the customer already has an open session or the room is occupied (BR-8).

### Flow A-4. See who is seated
1. Owner opens the "currently seated" view.
2. System lists each open session: customer, space type, check-in time, billable hours so far, and a running price estimate (computed by the pricing engine, before any campaign).

### Flow A-5. Close a session (check-out)
1. Owner selects an open session, optionally picks a campaign, and presses **Close**.
2. System records `ended_at` as the server's current time. The owner cannot enter the time by hand.
3. System computes the price and the campaign discount, and **freezes** them onto the session (BR-6).
4. System checks the duration against the point threshold; if met, it writes a `+1` entry to the points ledger.
5. System returns the bill: duration, billable hours, price, campaign and discount, total, and points earned.

---

## Part 4 — Customer Flow (read-only, via magic link)

### Flow C-1. View my activity
1. Customer opens their magic link (`/s/{token}`).
2. System resolves the token to that one customer.
3. The page displays, for that customer only:
   - **Active session** (if any): "Checked in at 9:00" — no live timer, just the check-in time.
   - **Session history**: each past session's check-in / check-out times, and the hours derived from them.
   - **Totals**: total hours studied and total number of sessions attended.
   - **Points**: the customer's current point balance.
4. The page is strictly read-only — the customer cannot start, change, or close anything. Prices are not shown.

---

## Part 5 — Scope Boundary (deferred to Phase 2)

Deliberately **not** in Phase 1, so the core loop ships first:
- Point redemption & voucher/card management (BR-5).
- Deleting a campaign, or restoring a removed space type, from the admin area.
- Other ways for customers to follow their activity: email updates, a customer app, a staff-facing web app (Phase 1 uses the magic link only).
- Applying campaigns automatically by day/date, and discount stacking (Phase 1: the owner picks one campaign).
- Correcting or cancelling a session after the fact, including entering a check-out time by hand.
- Advance room booking with a calendar.
- Recurring payment notifications for the B2B rental model.
- Membership tiers based on accumulated cards.
- Revenue statistics / reporting.
- Full authentication for the owner (Phase 1 uses a single Basic-Auth account).

This boundary is a judgment call, not an omission: a working end-to-end loop is worth more than a wider set of half-finished features.
