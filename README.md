# Ghana Retail WhatsApp Bot

A WhatsApp assistant for small retail shop owners in Ghana. Shopkeepers manage inventory, sales, expenses, and cash flow through natural conversation — for example, "add 50 tins of milk", "sold 3 milo", or "what's in stock?".

## Features

- **Inventory** — add stock, bulk add many lines at once, check stock levels
- **Sales** — record sales (stock reduces automatically)
- **Prices** — set selling price per product
- **Low-stock alerts** — warn when stock drops below a threshold
- **Cash flow** — today's sales, expenses, and net for the day
- **Expenses** — log restock vs operational spending
- **Usage limits** — free daily message cap per user with waitlist keyword
- **Text-only** — plain WhatsApp messages (no buttons or templates)

## Tech stack

- **Node.js** + **Express** — webhook server
- **Supabase** — PostgreSQL database
- **Twilio** — WhatsApp messaging (TwiML replies)
- **Claude (Anthropic)** — natural language understanding

## Quick start (local)

1. Copy `.env.example` to `.env` and fill in your keys.
2. Apply all SQL migrations in `supabase/migrations/` (in filename order) via Supabase SQL Editor.
3. Install and run:

```powershell
npm install
npm start
```

4. For local WhatsApp testing, set `PUBLIC_WEBHOOK_BASE_URL` to your ngrok HTTPS URL and point Twilio's webhook to `{ngrok-url}/webhook/whatsapp`.

## Database migrations (apply in order)

1. `20260521000000_initial_schema.sql`
2. `20260521110000_product_sell_price.sql`
3. `20260521120000_retailer_sessions.sql`
4. `20260521130000_user_usage_waitlist.sql`
5. `20260526100000_expenditures.sql`
6. `20260526110000_twilio_send_log.sql`
7. `20260527100000_webhook_dedup.sql`
8. `20260527110000_expenditures_retailer_id.sql`

See `supabase/SCHEMA.md` for table reference.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Run the server |
| `npm run dev` | Run with nodemon (auto-restart) |
| `npm test` | Run automated tests |
| `npm run verify:twilio` | Check Twilio credentials |
| `npm run verify:claude` | Check Anthropic API |

## Deploy

See [DEPLOY.md](DEPLOY.md) — GitHub + Render (free tier).

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env` to GitHub.
