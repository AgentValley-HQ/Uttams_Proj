# Session Post Studio

Everyone in the room learned the same thing. This tool takes attendees' picks +
their own words, generates a LinkedIn post in their voice with Claude, and
renders a downloadable Instagram story image — so the ones who post it walk out
with proof of their thinking, not just notes.

Built for the "Becoming an AI First Professional" session by Uttam Gupta.

## Stack

- **Frontend**: Vite + React 18 (plain CSS with design tokens, no Tailwind)
- **AI**: Anthropic Claude Haiku 4.5 via `/api/generate` serverless function
- **Hosting**: Vercel (static frontend + Node serverless function)

Handles 100+ concurrent users out of the box — Vercel serverless auto-scales, and Claude Haiku's rate limits sit well above the traffic.

## Prerequisites

- Node.js 18 or newer — https://nodejs.org
- An Anthropic API key — https://console.anthropic.com (paid, ~$0.001–0.005 per generation on Haiku)
- (For deploy) A Vercel account — https://vercel.com/signup
- (Recommended) A GitHub account for auto-deploy

## Run it locally

```powershell
cd c:\Users\SWANAND\Desktop\Uttam_Proj
npm install
```

Create a `.env` file (copy from `.env.example`) and paste your key:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx...
```

Then, in **two separate terminals**:

```powershell
# Terminal 1 — frontend
npm run dev
```

```powershell
# Terminal 2 — the serverless function locally
npx vercel dev
```

The first `vercel dev` will ask you to link a project; pick "Create new" and follow prompts. From then on, open **http://localhost:3000** (Vercel dev port) — that proxies to both the React app and the `/api/generate` function.

*(If you don't need the AI, `npm run dev` alone on port 5173 works — the Generate button will fail but the rest of the UI renders and the template fallback still shows.)*

## Deploy to Vercel

### Option A — GitHub → Vercel auto-deploy (recommended)

1. Create a new repo on GitHub (empty).
2. From this folder:

   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```

3. Go to https://vercel.com/new, import the repo.
4. In the "Environment Variables" step, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-…` key
   - Environments: check all three (Production, Preview, Development)
5. Click **Deploy**. Every future `git push` re-deploys automatically.

### Option B — Vercel CLI from terminal

```powershell
npm i -g vercel
vercel login
vercel deploy
```

On first run it links a project. To add the key:

```powershell
vercel env add ANTHROPIC_API_KEY
```

Paste the key when prompted, pick all three environments. Then re-deploy:

```powershell
vercel deploy --prod
```

## Configuration

Everything session-specific is in **[src/constants.js](src/constants.js)**:

- `CONFIG.hostName`, `CONFIG.sessionTitle`, `CONFIG.hostLinkedIn`, `CONFIG.communityLink`, `CONFIG.hostInstagram`
- `POOL` — the 26 talking points from the session
- `FLAGSHIP` — indexes of the 6 shown as checkboxes

Change and redeploy.

## Files

```
├── api/generate.js       # Serverless function → Claude Haiku
├── src/
│   ├── App.jsx           # Main React component (form, tabs, canvas render)
│   ├── Logo.jsx          # Inline SVG modernschool.ai wordmark
│   ├── constants.js      # Session config + talking points
│   ├── main.jsx          # React entry
│   └── styles.css        # Design tokens + base styles
├── index.html            # Vite entry + Google Fonts
├── package.json
├── vite.config.js
├── vercel.json           # Function config (30s max duration)
├── .env.example
└── .gitignore
```

## Cost & scale notes

- Each "Generate my post" call is ~800 output tokens on Haiku 4.5 → **≈ $0.003 per generation** at current pricing.
- 100 users generating 3 posts each = ~$1 total.
- Vercel Hobby free tier covers the traffic; only bump to Pro if you exceed 100 GB bandwidth / month or need custom domains beyond the free one.
- Anthropic rate limits on Tier 1 already handle far above 100 concurrent — no queueing needed.

## Swapping the logo for the real PNG

The logo is rendered as inline SVG in [src/Logo.jsx](src/Logo.jsx). If you want the exact PNG:

1. Save the PNG to `public/logo.png`
2. Replace the SVG block in `Logo.jsx` with `<img src="/logo.png" alt="modernschool.ai" style={{ height, display: 'block' }} />`
