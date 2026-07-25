# RightsDesk

An AI agent that helps Michigan renters understand their legal rights and drafts
a ready-to-send formal notice to their landlord — grounded in real Michigan
statutes (MCL 554.139 and related), not guesswork.

Built for the TKS Prompt to Product Challenge. Zero cost to build or run.

## Why this exists

Troy, MI renters (e.g. the Residences of Troy Apartments) have had recurring,
documented issues with heat, hot water, and burst pipes. Most tenants don't
know their legal rights or how to document a problem in a way that actually
protects them. RightsDesk closes that gap in under a minute, for free.

## Tech stack (all free, no credit card anywhere)

- **Frontend:** plain HTML / CSS / JS — no framework, no build step, no `npm install`, no `pip install`.
- **AI:** [Google Gemini API free tier](https://aistudio.google.com/apikey) — genuinely free, no card required.
- **Serverless proxy:** a Cloudflare Pages Function (`functions/api/generate.js`) holds the real API
  key server-side, so **public visitors never need their own key** — same pattern every real chatbot uses.
- **Hosting:** Cloudflare Pages — free, no card, deploys straight from this GitHub repo, hosts the
  static site and the function together.

You do **not** need Python, pip, or Node installed locally. The only "install" is a VS Code extension.

## Local setup (VS Code)

1. Install the **Live Server** extension in VS Code (free, from the Extensions tab — search "Live Server" by Ritwick Dey).
2. Open this folder in VS Code.
3. Right-click `index.html` → **Open with Live Server**. It'll open in your browser at `localhost:5500` or similar.
4. Get a free Gemini API key:
   - Go to https://aistudio.google.com/apikey
   - Sign in with any Google account, click "Create API key." No credit card, no billing setup.
5. In the running app, click the ⚙ icon top-right, paste your key, click Save.
6. Fill out the form and submit — it calls Gemini directly from your browser.

That's the whole loop. No servers to run, no `.env` files, no dependencies to install.

## Deploying so the PUBLIC can use it, no key required (Cloudflare Pages)

This is the real deployment path — it makes the site usable by any stranger who clicks your link,
with zero setup on their end.

```bash
git init
git add .
git commit -m "RightsDesk initial version"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rightsdesk.git
git push -u origin main
```

Then:

1. Go to **dash.cloudflare.com** and sign up free (no card needed).
2. **Workers & Pages → Create → Pages → Connect to Git** → pick your `rightsdesk` repo.
3. Build settings: Framework preset **None**, build command **empty**, output directory **/** (root).
   Cloudflare auto-detects the `functions/` folder and deploys it as serverless functions.
4. Click **Save and Deploy**. You'll get a live link like `https://rightsdesk.pages.dev`.
5. Add your real API key as a secret: Pages project → **Settings → Environment variables** →
   add `GEMINI_API_KEY` = your key, for both Production and Preview. Redeploy (or just push again —
   every push auto-redeploys).

That's it — `https://rightsdesk.pages.dev` now works for anyone, instantly, with no key prompt.
**This is the link to submit as your "working HTML" link.** Also submit your GitHub repo link
alongside it so judges can see the code.

**Note on local testing:** `/api/generate` only exists once deployed to Cloudflare (or run through
their `wrangler` CLI, which needs npm — skip that if you want to stay install-free). For quick local
UI testing in VS Code Live Server, use the "local dev key" field in Settings — that's the one case
where pasting in your own key is expected. Don't leave it filled in on the deployed version.

## Security note

- The real key lives only as a Cloudflare environment variable — never in a file, never committed
  to git, never visible to visitors. That's what makes it safe to deploy publicly.
- The "local dev key" field in the app is stored only in your own browser's `localStorage`, purely
  for your own local testing, and is never sent anywhere but Google's API directly from your machine.
- Google's free tier has daily rate limits — unlikely to matter for a 2-day judging window, but
  worth knowing if the link gets heavy traffic.

## Roadmap / what to build next (if time allows)

- [ ] PDF export of the letter (free lib: jsPDF, loaded from a CDN — no install needed)
- [ ] "Copy as certified mail cover sheet" option
- [ ] Multi-language letter generation (Gemini can translate on request)
- [ ] Save past letters locally (localStorage) so a tenant can track their case over time
- [ ] Expand the `data/mi_tenant_law.json` file with city-specific code enforcement contacts
      for more Michigan cities beyond Troy — this is the easiest way to grow scope for "Potential"

## Files

```
rightsdesk/
├── index.html                    # UI structure
├── style.css                     # civic/document visual design
├── app.js                        # form handling + calls /api/generate + rendering
├── functions/
│   └── api/
│       └── generate.js           # serverless proxy — holds the real key, public visitors don't need one
├── data/
│   └── mi_tenant_law.json        # grounding data — the AI only cites facts from here
├── README.md                     # this file
└── PROJECT_SUMMARY.md            # running project log — paste into any AI to resume work
```
