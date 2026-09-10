---
version: 1
slug: "web-src"
primary_target: "web/src"
related_targets: []
---

## Scope

The web admin dashboard prototype (`web/`), React + Vite on seeded fake data.
Visitor mode: **Operate**. Six routes: Home, Students, Staff, Timetable,
Bookings, Kadia.

Audience: centre admin staff, in a centre office during a 4-8 week season,
working a queue under time pressure. Secondary: the safeguarding lead reading
DBS and ratio state, and a centre director being shown the tool.

## Direction contract

THESIS: The season's register, kept honestly. This surface owns the ruled
register a centre already runs its season on — dates, names, ratios, marks —
and refuses both the SaaS card-grid of KPI tiles and the AI-product default of
near-black plus one neon glow.

OWN-WORLD: Slate and chalk. Warm chalk (#F2EFE6) on a cold slate ground
(#0F1113); structure carried by chalk-tinted hairlines at 8-12% and a visibly
ruled grid, never by cards or drop shadows. One family, Archivo, with tabular
numerals doing the work a mono would otherwise cosplay. Colour is spent only on
state: oxide #F2542D reserved for safeguarding-critical, amber #E3A33C for
overdue admin, sage #7FB069 for clear, chalk-blue #8FA8C8 for current. Status
reads as a mark on the rule, not a pill on a card.

STORY: An admin arrives, is greeted by name, and picks the one thing they came
to do. Every screen answers who is here, who is cleared, what is scheduled, and
what is missing — with the safeguarding-critical answer always the loudest thing
on the rule.

FIRST VIEWPORT: Slate field, generous top margin. "Welcome, Ismail" set large
and left, the season named quietly beneath it. Below it one ruled column of five
menu entries, each full-width with a hairline above, label at 1.5rem. A drawn
20px icon sits at the LEFT edge as the entry's identity, and a drawn arrow
appears at the right edge on hover or focus as the affordance — corrected from
this contract's first draft, which put the icon on the right and left the row
with no arrival cue. No tiles, no counts, no hero metric. The menu is the
primary action.

FORM: The ruled register / blackboard — candidate 1 of my grounded list. The
brief pinned this direction (cerebrium restraint, dark, explicitly not
AI-looking), and a brief-pinned direction beats the roll, so it displaces the
roll's assigned candidate 5. Seed key f763cd4c.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction and motion

The register rule: on entering a section a chalk hairline draws across the
head (200ms, 220ms on the home column), and the rows stagger in beneath it at
180ms exponential ease-out, as if the page were being ruled. This is the ONE
authored moment — there is deliberately no page-level fade on top of it, so no
two sections share an identical entrance. Killed under
`prefers-reduced-motion`. All other transitions 140-200ms.

## Decisions taken with the user (10 Sep 2026)

- The timetable chat and Kadia assistant call the **live Anthropic API** with a
  key entered in-UI and held only in `localStorage` — the pattern already
  proven in the Solone demo. No key in the repo.
- Home is a **pure menu, no counts**.
- A receipt **blocks confirmation** of an activity booking. Hard gate.

## Constraints carried from PRODUCT.md

- Seeded fake data only, and the surface must read visibly as a demonstration
  rather than implied live usage.
- No fabricated customers, testimonials, benchmarks or logos.
- Ratio compliance is David's engine — this surface *asks* and displays; it
  never computes. The call site is a marked seam.
- Terminology: centre, season, age band, group, ratio, DBS, safeguarding lead.

## Unresolved

- Google connection in Kadia is UI + honest disconnected state only; real OAuth
  needs a backend and a Google Cloud project that do not exist yet.
- No product name and no brand exist (PRODUCT.md). "Kadia" here is the
  assistant's name, per the user, not a decided product brand.
