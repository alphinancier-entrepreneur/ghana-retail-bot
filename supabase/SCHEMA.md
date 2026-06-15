# Database schema

Full SQL is in `migrations/`. Apply files in filename order in the Supabase SQL Editor (or `supabase db push`).

## Tables

### Core (initial migration)

| Table | Purpose |
|-------|---------|
| **retailers** | Shop owner (WhatsApp phone, consent). `name`, `plan` reserved for future use. |
| **products** | Items sold (`name`, `unit`, `unit_sell_price`, `is_active`). `category` reserved. |
| **inventory** | Current quantity + low-stock threshold per product |
| **sales** | Immutable sale records (`price_at_sale` cannot change) |
| **retailer_settings** | Currency (GHS), WhatsApp alerts on/off. `momo_phone`, `subscription_plan` reserved. |
| **inventory_log** | Append-only stock change history |
| **product_history** | **Reserved / future-use** — for product deactivation audit (no app writes yet) |

### Sessions & usage

| Table | Purpose |
|-------|---------|
| **retailer_sessions** | Conversation mode (e.g. `awaiting_bulk_inventory`) |
| **user_usage** | Per-phone daily message count (Ghana midnight reset) |
| **waitlist** | Users who typed WAITLIST when at free limit |

### Business tracking

| Table | Purpose |
|-------|---------|
| **expenditures** | Restock vs operational expenses (`retailer_id` + legacy `phone_number`) |

### Twilio quota & webhook safety

| Table | Purpose |
|-------|---------|
| **twilio_send_log** | Append-only outbound message count for account cap |
| **twilio_quota_state** | Daily Twilio cap state (warned 90%, hard cap flag) |
| **webhook_events** | Processed Twilio `MessageSid` — prevents duplicate handling on retries |

## Rules built into the database

1. **No hard deletes** — `DELETE` blocked on all tables (triggers).
2. **Soft-delete products** — set `is_active = false`.
3. **Immutable sale price** — `price_at_sale` cannot be updated.
4. **Append-only logs** — `inventory_log`, `product_history`, `twilio_send_log`, `webhook_events`.

## Application-enforced rules

- Every stock change inserts into `inventory_log`.
- Product deactivation should insert into `product_history` (not implemented yet).
