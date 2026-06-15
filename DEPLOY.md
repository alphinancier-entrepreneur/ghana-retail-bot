# Deploy guide (plain English)

Your bot is a small web server. **Render.com** hosts it for free so it keeps running when your laptop is off. **GitHub** stores the code; when you push updates, Render redeploys automatically.

## Two workflows (what you heard is correct)

| Testing (laptop) | Production (cloud) |
|------------------|-------------------|
| `npm start` + ngrok | Render runs `npm start` 24/7 |
| Twilio webhook → ngrok URL | Twilio webhook → `https://YOUR-APP.onrender.com/webhook/whatsapp` |
| Good for trying changes | Good for real shop owners |

---

## Dev vs Pro (two Twilio subaccounts)

You use **two Twilio subaccounts** with the **same Supabase database**. That is a good setup:

| | **RetailBot-Dev** | **RetailBot-Pro** |
|--|-------------------|-------------------|
| **Runs on** | Your laptop (`npm start`) | Render (`ghana-retail-bot.onrender.com`) |
| **Public URL** | ngrok URL in local `.env` | `https://ghana-retail-bot.onrender.com` |
| **Credentials** | Dev `TWILIO_ACCOUNT_SID` / token in `.env` | Pro credentials in **Render Environment** |
| **WhatsApp sender** | Dev sandbox / number | Pro sandbox / number |
| **Webhook URL** | `https://YOUR-NGROK.ngrok-free.dev/webhook/whatsapp` | `https://ghana-retail-bot.onrender.com/webhook/whatsapp` |

**Day-to-day:** test on Dev + ngrok. When happy, `git push` → Render redeploys Pro automatically. You do **not** need to change the Pro Twilio webhook after each push.

**Shared Supabase:** both accounts use the same shop data (`retailers`, `sales`, etc.). Twilio quota counters (`twilio_send_log`, `twilio_quota_state`) are now **per `TWILIO_ACCOUNT_SID`** so Dev testing does not burn Pro’s cap.

### RetailBot-Pro checklist (one-time)

In **RetailBot-Pro** Twilio Console → **Messaging → Try it out → WhatsApp sandbox**:

1. **When a message comes in:** `https://ghana-retail-bot.onrender.com/webhook/whatsapp` — method **POST**
2. Confirm there is **no** Studio flow, Function, or Messaging Service also sending replies on the same sender
3. On Render → **Environment**, use **Pro** (not Dev) values for `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
4. `PUBLIC_WEBHOOK_BASE_URL` = `https://ghana-retail-bot.onrender.com` (no `/webhook` path)
5. `NODE_ENV` = `production`

---

## Message limits (env vars)

Three settings control how many messages flow. Set them in **local `.env`** (Dev) and **Render Environment** (Pro).

| Variable | Example | What it does |
|----------|---------|--------------|
| `DAILY_FREE_LIMIT` | `10` | Per shopkeeper phone: max inbound messages per day that get a full bot reply. Resets at **Ghana midnight**. |
| `UNLIMITED_USERS` | `+233204256533` | Comma-separated phones that **skip** `DAILY_FREE_LIMIT` (your Pro test number, admins). |
| `TWILIO_DAILY_MESSAGE_CAP` | `50` | Bot’s **Twilio account** outbound cap (trial ≈ 50 / rolling 24h). Tracked per `TWILIO_ACCOUNT_SID` in Supabase. |

**Order in code:** unlimited users skip the per-user gate → everyone else counted in `user_usage` → every reply logged once in `twilio_send_log` for that Twilio account.

Check counts anytime:

```powershell
npm run verify:twilio-quota
```

---

## One-time setup

### Step 1 — Put code on GitHub

1. On GitHub: **New repository** → name it `ghana-retail-bot` → **Private** → Create.
2. Push from the project folder (or use GitHub Desktop).

### Step 2 — Create Render account

1. Go to [https://render.com](https://render.com) and sign up (GitHub login is easiest).
2. **New +** → **Web Service** → connect GitHub → pick **ghana-retail-bot**.
3. Settings:
   - **Build command:** `npm ci` or `npm install`
   - **Start command:** `npm start`
   - **Plan:** Free

Use your existing **Web Service** dashboard — not the “New Blueprint” page.

### Step 3 — Add secrets on Render (not in GitHub)

In Render → **Environment** → add each variable (Pro credentials for production):

| Key | Notes |
|-----|--------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as local |
| `TWILIO_ACCOUNT_SID` | **Pro** subaccount SID |
| `TWILIO_AUTH_TOKEN` | **Pro** auth token |
| `TWILIO_WHATSAPP_NUMBER` | **Pro** WhatsApp sender |
| `ANTHROPIC_API_KEY` | Same as local |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` (optional) |
| `PUBLIC_WEBHOOK_BASE_URL` | `https://ghana-retail-bot.onrender.com` (no trailing slash, no `/webhook`) |
| `DAILY_FREE_LIMIT` | e.g. `10` |
| `UNLIMITED_USERS` | Comma-separated tester phones |
| `TWILIO_DAILY_MESSAGE_CAP` | e.g. `50` |

Remove any old `TWILIO_CONTENT_SID_*` variables — the bot is text-only.

Do **not** upload `.env` to GitHub.

### Step 4 — Deploy and test

1. Deploy and wait until status is **Live**.
2. Open `https://ghana-retail-bot.onrender.com/health` — you should see `ok: true`, `replyMode: "twiml"`, and `commit` (git hash on Render).
3. Send a WhatsApp message on **Pro** — you should get a reply without ngrok.

### Step 5 — Point Twilio Pro at production

RetailBot-Pro → WhatsApp sandbox → **When a message comes in** → Render URL above, **POST**.

---

## Day-to-day

1. Test locally with ngrok on **RetailBot-Dev**.
2. When happy: commit → push to GitHub.
3. Render rebuilds in a few minutes — same webhook URL, no Twilio change needed.

---

## Free tier notes (Render)

- The service **spins down after ~15 minutes** of no traffic. First message after idle can take 30–60 seconds — normal on free tier.
- Twilio **trial** is ~50 messages/day per subaccount — upgrade for real onboarding volume.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Deploy failed | Render **Logs** — often a missing env var |
| **Twilio 11200** | See section below |
| 403 from Twilio | `PUBLIC_WEBHOOK_BASE_URL` must match your public URL exactly |
| No reply | `/health` works? Correct Twilio account webhook? Render logs? |
| Slow first reply | Free tier cold start |
| **Twilio 63038** | Daily cap hit — wait ~24h or upgrade trial |
| Logs show **Outgoing API** | See section below — bot should only use **Reply** (TwiML) |

### Twilio error 11200 (HTTP retrieval failure)

1. **Wake the server** — open `/health`, wait for `ok: true`, send WhatsApp again.
2. **Webhook URL** must be `https://ghana-retail-bot.onrender.com/webhook/whatsapp` (POST) on **Pro**.
3. **`PUBLIC_WEBHOOK_BASE_URL`** — base only: `https://ghana-retail-bot.onrender.com` (not `.../webhook/whatsapp`).
4. **Render Logs** — look for `Rejected webhook: invalid Twilio signature` or crashes.
5. First message only fails — cold start; send twice or upgrade Render later.

### Outgoing API vs Reply (TwiML investigation)

This bot sends **one reply per message via TwiML** in the webhook response — not the REST API. In Twilio logs you want **Reply** (`outbound-reply`), not **Outgoing API** (`outbound-api`).

**If you see Outgoing API on a Pro message:**

1. Open the message in Twilio → **Message Details** → **Request Inspector**.
2. On the **incoming** message: check whether the webhook response body contains TwiML:
   - Good: `<Response><Message>...</Message></Response>`
   - Bad: empty `<Response/>` or no webhook response
3. On the **outbound** message: look for `POST .../Messages.json` — that is a REST send (not from our TwiML-only code).
4. On **Render → Logs**, send a test message — you should see `reply via twiml` with the `MessageSid`.
5. Confirm `/health` shows `replyMode: "twiml"` and a `commit` matching your latest GitHub push.
6. Run `npm run verify:twilio-quota` locally with **Pro** credentials in `.env` temporarily — compare `outbound-api` vs `outbound-reply` counts.

If TwiML is present in the webhook response but Twilio still logs `outbound-api`, check for a duplicate integration (Studio, Function, Messaging Service) on the Pro sender.

---

## After code updates (migrations)

Run new migration files in Supabase SQL Editor (in order), or apply via Supabase CLI:

1. `supabase/migrations/20260527100000_webhook_dedup.sql`
2. `supabase/migrations/20260527110000_expenditures_retailer_id.sql`
3. `supabase/migrations/20260527120000_twilio_quota_per_account.sql`

Then restart locally or redeploy Render.

### Verify locally

```powershell
cd "C:\Users\Asus Gaming\.cursor\projects\ghana-retail-bot"
npm test
npm run verify:twilio
npm run verify:twilio-quota
npm run verify:claude
npm start
```

### Verify on Render

- Pro Twilio credentials in Environment (not Dev).
- No `TWILIO_CONTENT_SID_*` env vars.
- `DAILY_FREE_LIMIT`, `UNLIMITED_USERS`, `TWILIO_DAILY_MESSAGE_CAP` set.
- `/health` returns `commit` + `replyMode: "twiml"`.
- Send WhatsApp on Pro; Render logs show `reply via twiml`.
