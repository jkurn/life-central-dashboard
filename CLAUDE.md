# Life Central — working notes for Claude

Operating doctrine for this repo. Short on purpose.

## The repo

Static site. One `index.html` + three JS modules + one SQL file. Deployed to GitHub Pages on push to `main` (see `.github/workflows/deploy.yml`). Supabase handles auth + persistence; state falls back to `localStorage` when offline or unconfigured. No build step, no bundler, no test framework. Don't add one unless the feature genuinely needs it.

## Where things live

- `index.html` — shell, all CSS, all panel HTML, bootstrap script.
- `js/config.js` — Supabase URL + anon key placeholders.
- `js/auth.js` — thin wrapper over `supabase.auth`.
- `js/dashboard-data.js` — reads `[data-key]` fields into a JSONB blob and persists to Supabase, with `localStorage` fallback.
- `js/emotion-regulation.js` — Regulate panel + compliance gate. State stored in hidden `#er-state` field, so it flows through `DashboardData` for free.
- `supabase-setup.sql` — one-time setup.
- `.semgrep.yml`, `.github/workflows/backpressure.yml` — deterministic quality gates.

## How to work on this repo

### 1. Backpressure over prompts

Per Aidan Morgan: don't ask the LLM nicely to write good code — enforce it. Before adding a new pattern, ask whether a **binary** check can enforce it. If yes, add it to `.semgrep.yml` or the Actions workflow. If no, don't pretend a prose rule here will.

Current gates (fast, binary):
- `node --check` on every `js/*.js` — fails on syntax errors.
- `semgrep --config .semgrep.yml --error --strict .` — fails on banned patterns.

Run both before pushing:

```
for f in js/*.js; do node --check "$f"; done
semgrep --config .semgrep.yml --error --strict .
```

Both must exit 0.

### 2. Constraint, not ideas

Per Hormozi: identify *the* thing blocking the next step; solve that. Don't chase shiny side-quests. When a feature request arrives, first ask: "what's the constraint?" If the ask is vague, pin it down before writing code. Vague briefs silently become scope creep.

### 3. Test fast and light

Separate identity from results. Ship a small, crappy end-to-end version first. See if it's right. Then polish. Don't spend an hour designing the "correct" abstraction for something that might get deleted tomorrow.

### 4. Zoom in / zoom out

Before starting: one sentence on why this feature exists (zoom out). During: work on the smallest concrete change (zoom in). After: re-read the diff with fresh eyes (zoom out).

### 5. Don't interfere with the loop

Let the coding loop go fast. Human/LLM interference in the middle of a change is slower than running the gates at the end. If you catch yourself asking the LLM "are you sure?" twelve times, write a rule instead.

## Feature: Regulate panel

Brackett's RULER applied to this dashboard. Formula: `ER = G + S = f(E + P + C)`.

- 3 check-ins/day (morning/midday/evening windows).
- Red quadrant forces a 4-step Meta-Moment (sense → pause 90s → best self → respond) before the gate lifts.
- End-of-day reflection required after 19:00.
- Streak + compliance visible in the topbar.
- State lives in `#er-state` hidden textarea — this intentionally reuses the existing `DashboardData` persistence so we don't introduce a second storage path.

The gate is a hard gate. That's intentional: the point of the feature is to make the practice non-optional. If you're tempted to add a "skip" button, don't — add a `bestSelfTomorrow` note instead.

## Things to resist

- Adding a build step, framework, or bundler.
- Adding a fallback / shim for a scenario that can't happen.
- Adding a "pro mode" that lets the user disable the gate. The gate is the product.
- Adding more lint rules than earn their keep. Every noisy rule trains people to ignore gates.
