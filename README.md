# 🔦 Beacon — *Help, made obvious*

Beacon is an AI tool that makes **local community support obvious**. You describe
what you're going through in plain words; Beacon's AI figures out what kind of help
you need, shows you real free support **nearby**, tells you **exactly what to say**
when you reach out, and gives you concrete next steps.

Built for the High School **"AI for Everyday Good"** track —
*Community: Help is Hard to Find — Make Support Obvious.*

> **Not a crisis service.** Beacon is a demo. If you or someone else is in immediate
> danger, call **911**. In the U.S. you can call or text **988** any time.

---

## ✨ Features
- **Plain-language input** (type or 🎙️ speak) → AI understands the situation.
- **Matched local resources** with one-tap call, directions, hours & "free" status.
- **"What to say" script** written in the first person for you to read aloud.
- **Gated crisis support** — 988 / crisis lines surface for genuine crisis,
  mental-health or safety situations, never for ordinary material hardship.
- **Dashboard, Resources directory, saved "My Support", History, Messages, Settings.**
- **Private by design** — no account, nothing leaves your device on the offline path.

## 🧠 How the AI works (3 graceful tiers)
Beacon never breaks, wherever it runs:

1. **Local Ollama** — free, on-device AI for local development. *(recommended for the demo)*
2. **Anthropic Claude** — used on the deployed site **if** `ANTHROPIC_API_KEY` is set.
3. **Built-in offline matcher** — a keyword/rules engine in the browser. Zero config,
   works everywhere, so the live site is useful even with no AI backend at all.

The frontend calls `/api/triage`; the backend tries (1) → (2) → and otherwise tells the
client to use (3).

## 🛠️ Tech
- **Frontend:** Vite + vanilla JS (single `index.html`), Leaflet map, no framework lock-in.
- **Backend:** Vercel serverless functions in [`/api`](./api), sharing [`/lib/core.js`](./lib/core.js).
- **No runtime dependencies** — uses built-in `fetch` (needs **Node 18+**).

---

## 🚀 Run it locally
```bash
npm install
npm run dev
# open http://localhost:4179
```
**For real AI locally** install [Ollama](https://ollama.com) and pull a small model:
```bash
ollama pull llama3.2
```
No Ollama? No problem — the app falls back to the offline matcher automatically.

Build a production bundle:
```bash
npm run build      # outputs to dist/
npm run preview    # serve the built site
```


## 📁 Structure
```
index.html        the whole app (UI + client logic, inline)
api/
  triage.js       POST /api/triage   — AI triage
  ai-status.js    GET  /api/ai-status — which AI backend is live
lib/
  core.js         shared AI logic (Ollama → Claude → fallback)
  http.js         req/res helpers (works in Vercel + Vite dev)
vite.config.js    dev server + dev-only API middleware
vercel.json       tells Vercel this is a Vite project
```

## 🔐 Privacy
On the offline path nothing you type leaves your device. With Ollama, it stays on your
machine. With the optional Claude key, your message is sent to Anthropic only to
generate the response. No accounts, no tracking, no database.
