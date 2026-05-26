# Deploy guide (plain English)

Your bot is a small web server. **Render.com** hosts it for free so it keeps running when your laptop is off. **GitHub** stores the code; when you push updates, Render redeploys automatically.

## Two workflows (what you heard is correct)

| Testing (laptop) | Production (cloud) |
|------------------|-------------------|
| `npm start` + ngrok | Render runs `npm start` 24/7 |
| Twilio webhook → ngrok URL | Twilio webhook → `https://YOUR-APP.onrender.com/webhook/whatsapp` |
| Good for trying changes | Good for real shop owners |

---

## One-time setup

### Step 1 — Put code on GitHub

1. On GitHub (tab you have open): **New repository** → name it `ghana-retail-bot` → **Private** → Create (no README if the folder already has files).
2. Copy the repo URL (looks like `https://github.com/YOUR_USERNAME/ghana-retail-bot.git`).
3. In a terminal, from the project folder:

```powershell
cd "C:\Users\Asus Gaming\.cursor\projects\empty-window\ghana-retail-bot"
git init
git add .
git commit -m "Initial commit — Ghana retail WhatsApp bot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ghana-retail-bot.git
git push -u origin main
```

Use GitHub Desktop instead if you prefer clicking over commands.

### Step 2 — Create Render account

1. Go to [https://render.com](https://render.com) and sign up (GitHub login is easiest).
2. **New +** → **Web Service** → connect your GitHub account → pick **ghana-retail-bot**.
3. Settings (Render often fills these from `render.yaml`):
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Plan:** Free

### Step 3 — Add secrets on Render (not in GitHub)

In the Render service → **Environment** → add each variable (copy values from your local `.env`):

| Key | Notes |
|-----|--------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as local |
| `TWILIO_ACCOUNT_SID` | Same as local |
| `TWILIO_AUTH_TOKEN` | Same as local |
| `TWILIO_WHATSAPP_NUMBER` | Same as local |
| `ANTHROPIC_API_KEY` | Same as local |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` (optional) |
| `PUBLIC_WEBHOOK_BASE_URL` | **After first deploy:** `https://YOUR-SERVICE-NAME.onrender.com` (no trailing slash) |

Do **not** upload `.env` to GitHub.

### Step 4 — Deploy and test

1. Click **Deploy**. Wait until status is **Live**.
2. Open `https://YOUR-SERVICE-NAME.onrender.com/health` in a browser — you should see `{"ok":true,...}`.
3. Update `PUBLIC_WEBHOOK_BASE_URL` on Render if you used a placeholder, then **Manual Deploy** once.

### Step 5 — Point Twilio at production

1. Twilio Console → WhatsApp (sandbox or your sender) → **When a message comes in**:
   - URL: `https://YOUR-SERVICE-NAME.onrender.com/webhook/whatsapp`
   - Method: **POST**
2. Send a WhatsApp message — you should get a reply without ngrok or your laptop.

---

## Day-to-day

1. Test locally with ngrok when changing code.
2. When happy: `git add .` → `git commit -m "describe change"` → `git push`.
3. Render rebuilds in a few minutes — same webhook URL, no Twilio change needed.

---

## Free tier notes (Render)

- The service **spins down after ~15 minutes** of no traffic on the free plan. The **first message after idle** can take 30–60 seconds to wake up — fine for testing, mention to pilot shops.
- Upgrade to a paid plan when you need always-fast replies and more traffic.
- Twilio **trial** is still ~50 messages/day — upgrade Twilio for real onboarding volume.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Deploy failed | Render **Logs** tab — often a missing env var |
| **Twilio 11200** | See section below |
| 403 from Twilio | `PUBLIC_WEBHOOK_BASE_URL` must match your Render URL exactly |
| No reply | `/health` works? Twilio webhook URL correct? |
| Slow first reply | Free tier cold start — normal |

### Twilio error 11200 (HTTP retrieval failure)

Twilio could not get a **2xx** response from your webhook in time. Check in this order:

1. **Wake the server** — open `https://ghana-retail-bot.onrender.com/health` in a browser, wait until you see `ok: true`, then send WhatsApp again (free Render sleeps after ~15 min; first message can fail with 11200).

2. **Twilio webhook URL** (Messaging → WhatsApp sandbox):
   - `https://ghana-retail-bot.onrender.com/webhook/whatsapp`
   - Method: **POST**
   - Not ngrok unless you are testing locally.

3. **`PUBLIC_WEBHOOK_BASE_URL` on Render** — base only, **no path**:
   - Correct: `https://ghana-retail-bot.onrender.com`
   - Wrong: `https://ghana-retail-bot.onrender.com/webhook/whatsapp` (causes signature fail → 11200)

4. **Render Logs** when you send a message — look for `Rejected webhook: invalid Twilio signature` or crash errors.

5. **Still 11200 on first message only** — cold start + slow reply; send `hi` twice, or upgrade Render plan later.
