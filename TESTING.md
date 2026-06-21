# Testing guide — local to online

Quick checklist for testing Mariam on your laptop (RetailBot-Dev + ngrok), then pushing and verifying on Render (RetailBot-Pro).

For full setup, env vars, and troubleshooting, see [DEPLOY.md](DEPLOY.md).

---

## Before you start (one-time)

- Copy `.env.example` to `.env` and fill in **RetailBot-Dev** Twilio credentials
- Apply all Supabase migrations in order (see [README.md](README.md) → Database migrations)
- Install [ngrok](https://ngrok.com/) and join the **Dev** WhatsApp sandbox on your test phone
- Know the split: **Dev** (local + ngrok) and **Pro** (Render) share Supabase but use separate Twilio subaccounts

---

## Reset a test user (replay onboarding)

Supabase **blocks deleting rows** in the Table Editor — that is intentional. Every table has a `forbid_delete()` trigger so shop records are never hard-deleted in production.

The `retailers` table has **no soft-delete column** (unlike `products`, which uses `is_active`). So you cannot delete a retailer from the UI.

Mariam treats you as a **new user only when no row exists for your phone** (`isNew` in the app). Clearing `name` or resetting `retailer_sessions` is **not enough** — if your phone is still in `retailers`, you get the returning-user flow, not Akwaaba onboarding.

### Archive your phone (recommended)

In Supabase → **SQL Editor**, run this with your exact phone from the `retailers` table (E.164 format, e.g. `+233533766171`):

```sql
-- Replace +233533766171 with your test phone
UPDATE public.retailers
SET
  name = NULL,
  phone = phone || '.archived.' || left(replace(id::text, '-', ''), 8)
WHERE phone = '+233533766171';
```

What this does:

- Renames the old row’s phone so your real number is free again
- Old shop data (products, sales, etc.) stays on the **archived** row
- Your **next WhatsApp message** creates a **new empty** retailer → `isNew: true` → Akwaaba + shop name flow

**Important:** replay onboarding gives you a fresh empty shop — not your old stock/sales. The original data remains on the archived row until you unarchive (below).

Optional — only if you are re-testing usage limits or waitlist:

```sql
DELETE FROM public.user_usage WHERE phone_number = '+233533766171';
DELETE FROM public.waitlist WHERE phone_number = '+233533766171';
```

### Unarchive (restore original shop)

If you archived and then messaged (creating a duplicate row), restore your original retailer and shop data:

```sql
-- Find your rows first
SELECT id, phone, created_at FROM public.retailers
WHERE phone LIKE '%233533766171%'
ORDER BY created_at;

-- 1) Archive the newer duplicate (the one with phone = '+233533766171' that is NOT your original)
UPDATE public.retailers
SET phone = phone || '.archived.' || left(replace(id::text, '-', ''), 8)
WHERE phone = '+233533766171'
  AND id != 'YOUR_ORIGINAL_RETAILER_ID';

-- 2) Restore the original row (replace id with your original from the SELECT above)
UPDATE public.retailers
SET phone = '+233533766171'
WHERE id = 'YOUR_ORIGINAL_RETAILER_ID';

-- 3) Clear usage and reset session
DELETE FROM public.user_usage WHERE phone_number = '+233533766171';
UPDATE public.retailer_sessions
SET mode = 'idle', updated_at = now()
WHERE retailer_id = 'YOUR_ORIGINAL_RETAILER_ID';
```

Verify: exactly one row with `phone = '+233533766171'`; older rows keep `.archived.` in the phone column.

### Alternative (no SQL)

Message from a **different WhatsApp number** that is not in `retailers` yet — you get the new-user flow immediately with no database changes.

---

## Account deletion (in-app)

Users can close their shop by messaging **delete my account**. Mariam asks for confirmation before anything is removed.

| Step | Send | What happens |
| ---- | ---- | ------------ |
| 1 | `delete my account` | Confirm prompt — reply **DELETE** or **CANCEL** |
| 2a | `DELETE` | Account archived; phone freed for a fresh shop on the same number |
| 2b | `CANCEL` | Confirm cancelled; account unchanged |
| 2c | Any other message (e.g. `Hi`, `sold 3 milo`) | Confirm cancelled silently; message handled normally |

**Stuck after asking to delete?** If you only see delete reminders and normal messages do not work, your session may still be in confirm mode (older builds). Send **CANCEL**, or any normal message after deploying the latest code — both exit confirm mode. Only **DELETE** completes removal.

**Same number after a real delete:** The old row’s phone becomes `+233....deleted.{suffix}`. Your next WhatsApp message creates a **new** retailer → Akwaaba onboarding.

Test the full cycle:

```
delete my account → DELETE → Hi
```

Expect the done message, then Akwaaba as a new user.

To reset without deleting (keep your shop), use the archive SQL in [Reset a test user](#reset-a-test-user-replay-onboarding) instead.

---

## Open testing (unlimited for all numbers)

To skip the bot’s per-user daily cap and internal Twilio cap gate for **every** phone (only Twilio error **63038** can still block replies):

1. **Local (Dev)** — in `.env`:

```
DISABLE_USAGE_LIMITS=true
```

Restart the server after changing `.env` (`Ctrl+C`, then `npm start`).

2. **Render (Pro)** — Dashboard → **ghana-retail-bot** → **Environment** → set:

```
DISABLE_USAGE_LIMITS=true
```

Save and **Manual Deploy** (or wait for auto-deploy). A running instance does not pick up env changes until redeployed.

3. **Optional** — clear all usage counters in Supabase SQL Editor:

```sql
DELETE FROM public.user_usage;
```

### Still seeing limit messages?

- Check which Twilio account you are messaging — **Dev** (ngrok) vs **Pro** (Render). Each needs `DISABLE_USAGE_LIMITS=true` in its own environment.
- Restart local dev or redeploy Render after setting the variable.
- `UNLIMITED_USERS` only exempts listed phones — use `DISABLE_USAGE_LIMITS=true` for everyone.

---

## 1. Test locally (RetailBot-Dev)

- **Install dependencies**

```powershell
cd "C:\Users\Asus Gaming\.cursor\projects\ghana-retail-bot"
npm install
```

- **Run checks**

```powershell
npm test
npm run verify:twilio
npm run verify:claude
npm run verify:twilio-quota
```

- **Start the server**

```powershell
npm start
```

Or `npm run dev` for auto-restart on file changes.

- **Confirm health** — open `http://localhost:3000/health` → should show `"ok": true`
- **Start ngrok** (separate terminal)

```powershell
ngrok http 3000
```

Copy the **HTTPS** URL (e.g. `https://abc123.ngrok-free.dev`).

- **Update `.env`** — set `PUBLIC_WEBHOOK_BASE_URL` to the ngrok base URL only (no `/webhook` path). Restart `npm start`.
- **Point Dev Twilio webhook** — RetailBot-Dev → **Messaging → Try it out → WhatsApp sandbox** → **When a message comes in:**

```
https://YOUR-NGROK-URL.ngrok-free.dev/webhook/whatsapp
```

Method: **POST**

- **Send test messages** on WhatsApp (Dev sandbox number):


| Send                                | What to expect                                  |
| ----------------------------------- | ----------------------------------------------- |
| `hi` (first time from a new number) | Akwaaba onboarding + shop name question         |
| Your shop name                      | Name saved confirmation                         |
| `add 20 tins milo @ 8`              | Stock added (Mariam voice or template fallback) |
| `sold 3 milo`                       | Sale logged, stock reduced                      |
| `what's in stock?`                  | Stock list                                      |
| `today's sales`                     | Daily summary with GH₵ totals                   |
| `thanks`                            | Thank-you reply                                 |


- **Check terminal logs** — look for `reply via twiml` and `writer ok` or `writer fallback`; no crashes

### If you get no reply locally

- ngrok URL changed since last session? Update `.env` and restart the server
- Twilio webhook set to the full path `/webhook/whatsapp` with method **POST**?
- Terminal shows `Rejected webhook: invalid Twilio signature`? Fix `PUBLIC_WEBHOOK_BASE_URL` to match ngrok exactly
- Twilio error **63038**? Dev daily cap hit — wait ~24h or run `npm run verify:twilio-quota`

---

## 2. Push to GitHub

- Commit your changes (GitHub Desktop or git)
- Push to `main` (or your deploy branch)
- Confirm the push appears on GitHub

---

## 3. Test online (RetailBot-Pro on Render)

- **Wait for deploy** — Render dashboard shows **Live** (usually 2–5 minutes after push)
- **Wake and verify** — open:

```
https://ghana-retail-bot.onrender.com/health
```

Expect: `"ok": true`, `"replyMode": "twiml"`, and `"commit"` matching your latest push.

- **Confirm Pro env on Render** — Environment tab uses **Pro** (not Dev) values for:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_NUMBER`
  - `PUBLIC_WEBHOOK_BASE_URL` = `https://ghana-retail-bot.onrender.com` (no `/webhook`)
- **Confirm Pro webhook** (one-time; should already be set) — RetailBot-Pro → WhatsApp sandbox → **When a message comes in:**

```
https://ghana-retail-bot.onrender.com/webhook/whatsapp
```

Method: **POST**

- **Send WhatsApp on Pro test number** — repeat the message checklist from section 1
- **Check Render Logs** — each handled message should show `reply via twiml`. First message after idle may take 30–60 seconds (free tier cold start)

### If you get no reply on Pro

- Open `/health` first to wake the server, then send WhatsApp again
- Render **Logs** for crashes or missing env vars
- See [DEPLOY.md](DEPLOY.md) → Troubleshooting (11200, 63038, Outgoing API vs Reply)

---

## Day-to-day loop

```
Dev + ngrok → test → commit → push → Render redeploys Pro → /health → WhatsApp on Pro
```

You do **not** need to change the Pro Twilio webhook after each push.

---

## Useful commands


| Command                                 | When                                        |
| --------------------------------------- | ------------------------------------------- |
| `npm test`                              | Before every push                           |
| `npm run verify:twilio`                 | Twilio credentials not working              |
| `npm run verify:claude`                 | Claude/API key issues                       |
| `npm run verify:twilio-quota`           | Hitting 63038 or cap confusion              |
| `MARIAM_WRITER_ENABLED=false` in `.env` | Faster/cheaper local tests (templates only) |
| `DISABLE_USAGE_LIMITS=true` in `.env`   | Skip bot caps for **all** numbers (Dev **and** Render) |


---

## When something breaks


| Problem                         | Where to look                                           |
| ------------------------------- | ------------------------------------------------------- |
| Deploy failed                   | Render Logs — often a missing env var                   |
| Twilio 11200                    | [DEPLOY.md](DEPLOY.md) → Twilio error 11200             |
| Twilio 63038                    | [DEPLOY.md](DEPLOY.md) → Message limits                 |
| Still seeing free limit messages | `DISABLE_USAGE_LIMITS=true` on Dev **and** Render; restart/redeploy |
| Outgoing API vs Reply confusion | [DEPLOY.md](DEPLOY.md) → Outgoing API vs Reply          |
| Full env var reference          | [DEPLOY.md](DEPLOY.md) → Message limits, Mariam's voice |


