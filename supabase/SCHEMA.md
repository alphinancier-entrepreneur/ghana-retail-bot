# Database schema (Step 2)

Plain-English guide to the seven tables. Full SQL is in `migrations/20260521000000_initial_schema.sql`.

## Tables

| Table | What it stores |
|-------|----------------|
| **retailers** | Each shop owner (WhatsApp phone, name, free/paid plan, consent date) |
| **products** | Items they sell (name, category, unit, active or hidden) |
| **inventory** | How many of each product are in stock right now |
| **sales** | Every sale (quantity, price at that moment, when it sold) |
| **retailer_settings** | Preferences: currency (GHS), WhatsApp alerts, MoMo number |
| **inventory_log** | History of every stock change (add / remove / sale) |
| **product_history** | History when a product is hidden (`is_active = false`) |

## Rules built into the database

1. **No hard deletes** — `DELETE` is blocked on every table.
2. **Soft-delete products** — set `is_active = false`; never remove the row.
3. **Immutable sale price** — `price_at_sale` cannot be changed after insert.
4. **Append-only logs** — `inventory_log` and `product_history` cannot be updated or deleted.

## Rules enforced in application code (later steps)

- Every stock change must insert a row into `inventory_log`.
- Every product deactivation must insert a row into `product_history`.

## How to apply this migration

1. Create a project at [supabase.com](https://supabase.com) if you have not already.
2. Open **SQL Editor** in the Supabase dashboard.
3. Copy the entire contents of `migrations/20260521000000_initial_schema.sql` and run it.
4. Confirm under **Table Editor** that all seven tables appear.

Or, with Supabase CLI linked to your project:

```bash
supabase db push
```
