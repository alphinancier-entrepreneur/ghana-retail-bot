# Ghana Retail WhatsApp Bot

A WhatsApp assistant for small retail shop owners in Ghana. Shopkeepers manage inventory and sales through natural conversation — for example, "add 50 tins of milk", "I sold 3 milo this morning", or "what's in stock?".

## What it will do

- Add products and stock to inventory
- Record sales (stock reduces automatically)
- Show today's sales summary
- Show current stock levels
- Set low-stock alerts per product

## Tech stack

- **Node.js** — backend server
- **Supabase** — PostgreSQL database
- **Twilio** — WhatsApp messaging
- **Claude (Anthropic)** — understands natural language messages
- **GitHub** — version control (set up in a later step)

## Project status

**Step 1:** Done — project skeleton, dependencies list, environment variable template.

**Step 2:** Done — database schema SQL migration (see `supabase/migrations/` and `supabase/SCHEMA.md`). Apply it in your Supabase project when ready.

**Step 3:** Done — Node.js connects to Supabase.

**Step 4:** Done — Express web server + Twilio WhatsApp webhook.

**Step 5:** Done — Claude parses messages into structured actions.

**Step 6:** Done — Actions save to Supabase (stock, sales, `inventory_log`, low-stock alerts).

**Menu & bulk:** Text-only on `hi`, bulk stock add in one message, shop voice (`src/copy/shop-voice.js`), selling prices. Run migrations `20260521110000` and `20260521120000` in Supabase.

**Deploy:** See [DEPLOY.md](DEPLOY.md) — GitHub + Render (free tier), bot runs without your laptop.

Follow the step-by-step instructions in your Cursor chat. Do not skip ahead.

## Environment variables

Copy `.env.example` to `.env` and fill in your real keys when your accounts are ready. Never commit `.env` to GitHub.
