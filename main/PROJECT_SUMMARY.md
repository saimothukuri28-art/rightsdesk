# RightsDesk — Project Summary (living doc)

> Paste this whole file into any AI chat (ChatGPT, Gemini, another Claude session, etc.)
> to instantly catch it up on where this project stands. Update the "Last session" section
> after each work session.

## What this is

Entry for the TKS Prompt to Product Challenge (deadline: Sun July 26, 2026, 12:00 PM ET).
An AI tool that helps Michigan renters (starting with Troy, MI) understand their legal
rights around habitability issues (no heat, no hot water, burst pipes, etc.) and drafts a
ready-to-send formal notice to their landlord, grounded in real Michigan statute (MCL 554.139
and related). Real, current local hook: recurring documented issues at the Residences of
Troy Apartments (heat outages, inconsistent hot water, burst pipes — previously investigated
by the MI Attorney General under the complex's old name).

## Why this idea, over the alternatives considered

- Started with a general "community problem-solving app" idea → too vague, judges can't
  evaluate impact without seeing real usage data we won't have in 72 hours.
- Considered a Troy pothole-jurisdiction router (city vs county vs state road reporting) →
  good idea but also needs real-world confirmation/testing to demo convincingly and the
  "AI sends it for you" framing oversold what's feasible for government portals without APIs.
- Considered a Michigan driving-test adaptive tutor → solid, fully self-contained, no data
  needed — but user wanted the "community/local problem" angle to stay central and not be
  about driving specifically.
- **Landed on RightsDesk** because: (1) zero crowdsourced data needed — fully demoable live
  in the 2-minute pitch just by using it, (2) grounded in a real, current, verifiable local
  news story, (3) AI's job is unmistakable — multi-step reasoning (rights lookup → drafting →
  escalation path), not just a static form, (4) produces something with real teeth (an actual
  usable letter), not just information.

## Judging rubric this is designed against (from the challenge doc)

Problem & Impact / Creativity & Originality / Use of AI & Prompting / Product Execution /
Clarity of Pitch / Potential to grow. RightsDesk's differentiation vs generic "AI explains a
document" tools: it produces a ready-to-use legal document, not just a summary.

## Constraints

- Must be $0 cost, no credit card anywhere in the stack.
- Building solo in VS Code, no prior npm/pip setup assumed.
- Must publish via a working HTML/GitHub link (GitHub Pages).
- Must include a 2-minute video pitch covering: what you built, why, how you used AI/prompting.
- Deadline: Sunday July 26, 2026, 12:00 PM ET.

## Architecture decided

- Frontend: `index.html` / `style.css` / `app.js`. No framework, no build step.
- AI: Google Gemini API free tier (`gemini-2.5-flash`).
- IMPORTANT CHANGE from the first version: originally called Gemini directly from the browser,
  which meant every visitor needed their own free API key — bad for public use, since real
  chatbots never require this. Fixed by adding `functions/api/generate.js`, a Cloudflare Pages
  Function that holds the real key server-side as an environment variable. The browser now
  calls our own `/api/generate` endpoint; visitors never see the key. `app.js` still has a
  "local dev key" fallback (Settings panel) purely for testing in VS Code Live Server, where
  the serverless function isn't running.
- Grounding: `data/mi_tenant_law.json` — a hand-built knowledge base of real MI statutes
  (MCL 554.139 implied warranty of habitability, repair-and-deduct rules, security deposit
  law, entry notice, retaliation protection) plus a 4-step escalation path (landlord notice →
  Troy code enforcement → MI Attorney General consumer complaint → Michigan Legal Help).
  The AI is instructed to ONLY use facts from this file, not invent statutes.
- Hosting: **Cloudflare Pages** (free, no card), not GitHub Pages — GitHub Pages is static-only
  and can't run the serverless function that hides the API key. Cloudflare Pages still deploys
  straight from the same GitHub repo, so submit both the `.pages.dev` live link and the GitHub
  repo link to judges.

## Design direction

Civic/document aesthetic — navy (#1B2A4A), warm paper (#F7F3EA), brass accent (#C08A2E),
alert red (#B4432F). Serif (Fraunces) for headers, sans (Inter) for UI, monospace (Courier
Prime) for the letter itself so it reads like an actual typed document. Signature visual
element: a "DRAFT" stamp on the generated letter that flips to "READY TO SEND" once the AI
finishes generating — reinforces that the output is a real, usable artifact, not just chat text.

## Status as of last session

**Scaffolded and functional (not yet tested live):**
- [x] `index.html` — full two-panel layout (intake form left, rights + letter + escalation right)
- [x] `style.css` — full civic/document design system
- [x] `app.js` — calls `/api/generate` by default, local-dev-key fallback for VS Code testing
- [x] `functions/api/generate.js` — Cloudflare Pages Function, holds the key server-side
- [x] `data/mi_tenant_law.json` — MI tenant law knowledge base with real MCL citations
- [x] `README.md` — setup + Cloudflare deploy instructions

**Not yet done:**
- [ ] Test end-to-end locally (Live Server + local dev key first — /api/generate itself needs a
      real Cloudflare deployment to exist)
- [ ] Push to GitHub, connect to Cloudflare Pages, set GEMINI_API_KEY env var, confirm the public
      `.pages.dev` link works for a visitor with NO key of their own (test in incognito)
- [ ] Record the 2-minute pitch video
- [ ] Stretch: PDF export, more MI cities in the knowledge base, localStorage case history

## Next session should start here

1. Local sanity check: run via VS Code Live Server, paste a free Gemini key into the local-dev
   Settings field, submit the form, confirm rights/letter/escalation all render correctly.
2. Push to GitHub, connect the repo to Cloudflare Pages (dash.cloudflare.com → Workers & Pages →
   Create → Pages → Connect to Git).
3. In Cloudflare Pages project settings, add environment variable GEMINI_API_KEY = your real key.
4. Open the `.pages.dev` link in an incognito window (no local dev key set) and confirm it works
   with zero setup — this proves the public-access requirement is actually met.
5. Script and record the 2-min pitch.
