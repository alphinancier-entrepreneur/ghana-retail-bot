# Ghana Retail Bot — Operations Guide

**Production URL:** https://ghana-retail-bot.onrender.com  
**Health check:** https://ghana-retail-bot.onrender.com/health  
**Twilio webhook:** https://ghana-retail-bot.onrender.com/webhook/whatsapp (POST)

---

## 1. Waking up the bot (cloud / Render)

Use this before shop testing or if WhatsApp feels dead / Twilio shows error **11200**.

1. Open a browser.
2. Go to: **https://ghana-retail-bot.onrender.com/health**
3. Wait until you see: `{"ok":true,"service":"ghana-retail-bot"}`
   - First load after idle can take **30–60 seconds** on the free Render plan.
4. Send **hi** on WhatsApp to your Twilio number.
5. If no reply, wait 30 seconds and send **hi** again once.

**Reminder:** Twilio webhook should stay on Render (not ngrok) while shops are testing.

You do **not** need your laptop on for this — only the browser step wakes Render.

---

## 2. Test changes locally, then update the cloud

### Option A — Test on your laptop (ngrok)

**Warning:** If you point Twilio at ngrok, shops using the cloud bot **stop working** until you switch the webhook back to Render.

1. Open the project folder in Cursor.
2. Edit files (e.g. `src/copy/shop-voice.js` for bot wording).
3. In a terminal:
   ```
   npm start
   ```
4. Start ngrok: `ngrok http 3000`
5. Copy the **https** ngrok URL into local `.env` as `PUBLIC_WEBHOOK_BASE_URL`.
6. In Twilio, temporarily set webhook to:  
   `https://YOUR-NGROK-URL/webhook/whatsapp` (POST)
7. Test from **your** phone only.
8. **Switch Twilio webhook back** to:  
   `https://ghana-retail-bot.onrender.com/webhook/whatsapp`
9. Stop ngrok and `npm start` when done.

### Option B — Update the cloud (recommended while pilots are live)

1. Edit code on your laptop.
2. **GitHub Desktop:** Commit to main → **Push origin**
3. **Render:** Open ghana-retail-bot → wait until status is **Live** (2–5 minutes)
4. **Wake the bot:** open `/health` in browser
5. Test on WhatsApp — that is what shops use

Twilio webhook stays on Render — no change needed each deploy.

---

## 3. Environment variable reminder (Render)

| Variable | Value |
|----------|--------|
| `PUBLIC_WEBHOOK_BASE_URL` | `https://ghana-retail-bot.onrender.com` (no `/webhook` path) |
| Twilio inbound URL | `https://ghana-retail-bot.onrender.com/webhook/whatsapp` |

Wrong base URL can cause Twilio **11200** or no replies.

---

## 4. Quick reference

| Goal | Action |
|------|--------|
| Wake cloud bot | Browser → `/health` → WhatsApp **hi** |
| Ship an update | Edit → GitHub push → Render **Live** → `/health` → test |
| Pilots testing | Keep Twilio on Render URL only |

---

## 5. Two workflows (summary)

| | Testing (laptop) | Production (cloud) |
|--|------------------|-------------------|
| Server | `npm start` + ngrok | Render 24/7 |
| Twilio webhook | ngrok URL (temporary) | ghana-retail-bot.onrender.com |
| Laptop | Must be on for ngrok | Can be off |

---

*Generated for Ghana Retail WhatsApp Bot — keep this guide private (contains operational URLs).*
