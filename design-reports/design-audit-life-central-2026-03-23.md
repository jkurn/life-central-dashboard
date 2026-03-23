# Design Audit: Life Central Planning Dashboard

**URL:** https://jkurn.github.io/life-central-dashboard/
**Date:** 2026-03-23
**Scope:** Full site (12 sections, single-page app)
**Mode:** Full audit

---

## Headline Scores

| Metric | Score |
|--------|-------|
| **Design Score** | **C+** |
| **AI Slop Score** | **C** |

---

## First Impression

- **The site communicates:** "personal productivity tool built by an engineer, not a designer."
- **I notice:** the teal color palette is pleasant and consistent, but the page is overwhelmingly long (9,132px) with 45 textareas and 113 inputs. It feels like a form, not a dashboard.
- **The first 3 things my eye goes to are:** (1) the teal "Life Central Planning Dashboard" title, (2) the Project Command status cards (Active: 10, Complete: 3, etc.), (3) the floating action bar at bottom-right.
- **If I had to describe this in one word:** "Overwhelming."

The Project Command table and Cost Center are strong additions that give it operational utility. But 12 vertically-stacked sections with uniform styling creates a "scrolling forever" experience. A dashboard should show density at a glance — this shows one thing at a time.

---

## Inferred Design System

### Fonts
| Font | Usage |
|------|-------|
| Inter | Primary (body, headings, labels) |
| JetBrains Mono | Time block slots |
| Times (fallback) | Renders when Inter hasn't loaded yet |
| Arial (fallback) | System fallback |

**Issue:** No `@font-face` declaration or Google Fonts import for Inter. The font loads only if the user's system has it. No `<link rel="preconnect">` or font preloading. Many users will see system fonts instead.

### Colors
| Color | Usage |
|-------|-------|
| `#008080` (teal) | Primary accent, headings, badges, buttons |
| `#1a1a1a` | Body text |
| `#555` | Secondary text |
| `#888` | Muted text, labels |
| `#F6F5EF` | Page background (warm off-white) |
| `#FFFFFF` | Card backgrounds |
| `#e0ddd5` | Borders |
| `#22c55e` | Active status, green metrics |
| `#f59e0b` | Pending/warning status |
| `#dc2626` (inferred) | Blocked status |

**Verdict:** Coherent warm-teal palette. 15+ unique colors but most are semantic status indicators — acceptable. The warm off-white background (#F6F5EF) is a nice touch that avoids sterile white.

### Heading Scale
| Level | Size | Weight | Color |
|-------|------|--------|-------|
| H1 | 35.2px | 800 | teal |
| H2 | 20.8px | 700 | #1a1a1a |
| H3 | 16px | 700 | #1a1a1a |
| H4 | 15.2px / 14.4px | 700 | teal |

**Issue:** H4 has two different sizes (15.2px in Stack, 14.4px in Buckets). Not consistent. The jump from H3 (16px) to H4 (15.2px) is barely perceptible — doesn't create meaningful hierarchy.

### Spacing
- Container max-width: 1400px with 2rem padding
- Card padding: 1.5rem
- Grid gap: 1.25rem
- Section margin-bottom: 3rem

Spacing is consistent and uses a reasonable scale. No arbitrary values detected.

---

## Findings

### FINDING-001: Massive page length destroys dashboard utility (HIGH)
**Category:** Visual Hierarchy
**What:** 9,132px tall, 12 sections stacked vertically, 45 textareas, 113 inputs. Users must scroll through ~12 screens to see everything.
**Why it matters:** A "central dashboard" should provide at-a-glance visibility. This is a long-form document, not a dashboard. The word "dashboard" implies density, overview, and quick access — this delivers the opposite.
**Fix:** Restructure into a tabbed/panel layout. Show Project Command + Costs + Today's Plan as the default view. Move Deep Life content into a "Life System" tab. Move Habits + Time Block into a "Daily" tab. One screen should contain the most actionable information.

### FINDING-002: Inter font not imported — falls back to Times (HIGH)
**Category:** Typography
**What:** No Google Fonts `<link>` or `@font-face` for Inter. Users without Inter installed locally see Times New Roman.
**Fix:** Add `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">` to `<head>`.

### FINDING-003: `transition: all` on 803 elements (MEDIUM)
**Category:** Motion / Performance
**What:** Nearly every element has `transition: all` instead of specific properties. Animates layout properties (width, height, padding) unnecessarily.
**Fix:** Replace with specific properties: `transition: box-shadow 0.2s, background-color 0.2s, border-color 0.2s, color 0.2s`.

### FINDING-004: 144 undersized touch targets (MEDIUM)
**Category:** Interaction States
**What:** Nav links at 32px height (below 44px WCAG minimum). Checkboxes at default browser size (~16px).
**Fix:** Increase nav link padding to achieve 44px min height. Add larger click area around checkboxes.

### FINDING-005: Empty textareas dominate visual weight (MEDIUM)
**Category:** Content Quality
**What:** 45 empty textareas with dashed borders create visual noise. The page looks like an unfilled template rather than an active tool.
**Fix:** Collapse empty fields by default. Show a compact "Click to add" prompt. Expand on focus. Filled fields should be prominent; empty fields should be subtle.

### FINDING-006: Floating action bar overlaps content on mobile (MEDIUM)
**Category:** Responsive
**What:** The 4-button action bar (Clear All, Export JSON, Print/PDF, Save) overlaps the project table and content at bottom of mobile viewport.
**Fix:** On mobile, dock the action bar as a full-width bottom bar with smaller buttons, or collapse into a single floating menu button.

### FINDING-007: Quote blocks use colored left-border pattern (POLISH)
**Category:** AI Slop
**What:** `.quote-block` uses `border-left: 3px solid teal` — a recognizable AI-generated design pattern.
**Fix:** Use a proper blockquote with quotation mark glyph, or an indented italic style without the colored border.

### FINDING-008: Hero badge pill pattern (POLISH)
**Category:** AI Slop
**What:** The "DEEP LIFE STACK V2.0 + MULTI-SCALE PLANNING + SLOW PRODUCTIVITY" pill badge is a classic AI-generated hero element.
**Fix:** Remove it. The subtitle already communicates the same thing. If keeping, make it contextual (e.g., show current quarter or today's date instead).

### FINDING-009: H4 sizes inconsistent across sections (POLISH)
**Category:** Typography
**What:** H4 is 15.2px in Deep Life Stack but 14.4px in Life Buckets.
**Fix:** Unify to a single H4 size (15.2px or 14.4px, pick one).

### FINDING-010: No `prefers-reduced-motion` support (POLISH)
**Category:** Motion
**What:** Animations run regardless of user preference.
**Fix:** Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }`.

---

## Category Grades

| Category | Grade | Notes |
|----------|-------|-------|
| Visual Hierarchy | **C** | Good section structure, but flat scrolling layout kills dashboard utility |
| Typography | **C+** | Inter is professional but not imported. Inconsistent H4. Line-length ~78 chars (over ideal 75) |
| Color & Contrast | **B+** | Coherent teal palette, warm background, good semantic colors for status |
| Spacing & Layout | **B** | Consistent grid and spacing scale. Cards are well-structured |
| Interaction States | **C** | Undersized touch targets. No visible focus rings inspected. `transition: all` is lazy |
| Responsive | **B-** | Works on mobile, no h-scroll, but action bar overlaps content. Nav truncates |
| Content Quality | **C+** | 45 empty textareas create "unfilled template" feel. Project table is strong |
| AI Slop | **C** | Quote left-borders, hero pill badge, centered hero, uniform section rhythm |
| Motion | **C-** | 803 elements with `transition: all`. No reduced-motion support |
| Performance | **C+** | No font preloading. Massive DOM (158+ interactive elements). Zero images (good) |

---

## AI Slop Assessment

**Score: C — "Template-adjacent. Shows some design thinking but relies on patterns that read as AI-generated."**

Detected patterns:
- Colored left-border on quote blocks
- Hero pill badge with uppercase text
- Centered hero section
- Uniform section rhythm (every section same structure: header + badge + toggle + body)
- Dashed-border textareas as primary UI pattern

Not detected (good):
- No purple/violet gradients
- No 3-column icon-in-circle feature grids
- No decorative blobs or wavy dividers
- No emoji as design elements (removed from buckets)
- Color scheme is tasteful, not default AI rainbow

---

## Strategic Design Recommendation

**The fundamental problem isn't styling — it's information architecture.**

This dashboard tries to serve two very different needs on one long page:
1. **Operational command center** (Projects, Costs, Today's Plan, Habits) — needs density and at-a-glance visibility
2. **Life design workbook** (Vision, Values, Deep Life Stack, Personal Code) — needs space and reflection

Mixing these creates a 9,000px page that's neither a good dashboard nor a good workbook.

### Recommended Architecture

```
+---+---------------------------+
|   |  [Projects] [Costs]       |  <-- always-visible top bar
| S |  [Today]   [Habits]       |
| I |                           |
| D |  Main content area        |  <-- changes based on sidebar selection
| E |  (one panel at a time)    |
| B |                           |
| A |                           |
| R |                           |
+---+---------------------------+
```

- **Sidebar nav** replaces top horizontal nav
- **Default view:** Project Command + Cost Summary + Today's Top 3 + Habit Tracker (all on one screen)
- **Life System tab:** Vision + Stack + Buckets + Values (workbook mode)
- **Planning tab:** Multi-Scale Planning with quarterly/weekly/daily
- **Daily tab:** Time Block + Shutdown Ritual

This cuts perceived page length by 75% and makes it a real dashboard.

---

## Quick Wins (5 highest-impact, <30 min each)

1. **Import Inter font** — add one `<link>` tag. Fixes font fallback for all users.
2. **Replace `transition: all`** — one find-and-replace in CSS. Fixes 803 elements.
3. **Add `prefers-reduced-motion`** — 3 lines of CSS.
4. **Collapse empty textareas** — JS to add `.empty` class + CSS to minimize height. Dramatically reduces visual noise.
5. **Fix mobile action bar** — add `@media (max-width: 768px)` rule to dock it as bottom bar.

---

*Report generated: 2026-03-23*
*Tool: /design-review*
