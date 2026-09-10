---
version: 1
slug: "web-src"
primary_target: "web/src"
related_targets: []
---

## Scope

The web admin dashboard prototype (`web/`), React + Vite on seeded fake data.
Visitor mode: **Operate**. Nine routes: Home, Reminders, Students, New
arrivals, Room allocations, Staff, Timetable, Bookings, Kadia. Navigation is a single top-left control opening a
full-surface sheet (pinned to rudo.co.uk, 10 Sep 2026); the left rail is
retired.

Audience: centre admin staff, in a centre office during a 4-8 week season,
working a queue under time pressure. Secondary: the safeguarding lead reading
DBS and ratio state, and a centre director being shown the tool.

## Direction contract

THESIS: The season's register, kept honestly, in the reference site's
material. This surface owns the ruled register a centre already runs its season
on — dates, names, ratios, marks — and refuses both the SaaS card-grid of KPI
tiles and the AI-product default of near-black plus one neon glow.

OWN-WORLD: Ink, greige and acid, taken from getspot.com (pinned by the user
10 Sep 2026, replacing the earlier slate-and-chalk world). Ground #111820,
type #E6E7D9, one acid #F3FD00 that means interactive and nothing else —
primary action, current section, focus ring. Informational blue #7FB2D9 is
kept separate from acid so a status mark never reads as a control. Structure is
ruled greige hairlines at 11-24%, never cards or drop shadows. One face: **Geist**
(user-pinned 10 Sep 2026 from a neo-grotesque sample), carrying display, UI,
labels and data. Tabular figures do the column alignment a mono would
otherwise be hired for; the earlier Azeret Mono body voice is retired. Controls are fully-rounded
pills; panels take a 6px corner. Display sets at line-height 0.94, tighter than
its own size. State colour: oxide #F2542D reserved for safeguarding-critical
and marked with a triangle rather than a square, ochre #C9922E for overdue
admin, pulled well clear of acid, sage #7FB069 for clear.

STORY: An admin arrives, is greeted by name, and picks the one thing they came
to do. Every screen answers who is here, who is cleared, what is scheduled, and
what is missing — with the safeguarding-critical answer always the loudest thing
on the rule.

FIRST VIEWPORT: The photograph is the ground, not a decoration behind a card.
A supplied blue circuit image fills the viewport, held by a two-stop scrim — a
100deg wash from 96% to 60% opacity across, and a vertical wash landing the
bottom edge on --ink so the menu column reads as one surface with the rest of
the app. Over it: the season in mono caps, then the greeting set large and left
at up to 4.5rem, line-height 0.94. Below, one ruled column of five menu
entries; a drawn 20px icon at the left as identity, the label at 1.5rem, the
blurb in mono, and the reference's circular arrow badge at the right edge
filling acid on hover or focus. No tiles, no counts, no hero metric. The menu
is the primary action.

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
- Visual world replaced 10 Sep 2026 on a user pin to getspot.com, plus a
  supplied hero image. The rail's home control reads **Home**, not Register.
- Reminders are **derived** from the seeded records, never authored: overdue
  student documents, uncleared or expiring DBS, receiptless bookings, and
  sessions the rota engine calls non-compliant. Medical and consent forms
  count as safeguarding; passports are admin. 29 rows at the seeded date, 17
  of them safeguarding. Complete marks the row done and opens the screen where
  the work is actually done; the task panel carries Edit, Cancel and a
  two-step Delete.
- The Complete pill is outlined, not filled. A column of filled acid buttons
  out-shouts the oxide severity marks, and safeguarding has to stay the
  loudest thing on the row.
- Room allocations: three houses, one per age band, rooms sized to that
  band's actual demand plus a spare, three beds each. Exactly two on-site
  students are left unallocated on purpose so the safeguarding reminder for a
  student with no bed has something real to catch. Whether a centre also rooms
  by gender is a per-centre configuration Kebba specifies in October, so it is
  recorded as unmodelled rather than invented.
- New arrivals groups everyone still to come by the day they land, and answers
  one question per row: can this student be admitted? `readiness()` treats no
  bed and a missing medical or consent form as BLOCKING (safeguarding); a
  passport copy, missing travel consent and an outstanding balance are a WATCH.
  Room allocations carries the same list as a "Still to arrive" view so the
  residence can see which incoming students already have a bed.
- Arrival reminders fire only for students who have NOT landed (1-7 days out).
  A student arriving today is already on site, and their missing document is
  raised once by the document rule rather than twice.
- Dates are formatted from local calendar components, never `toISOString()`.
  The UTC round-trip shifted every arrival and leaving date back a day under
  BST, which silently mislabelled the whole season by one day.
- Guardian records are internally consistent by construction: language and
  address country both derive from the student's own country, and relationship
  labels are neutral (Parent, Guardian, Grandparent, Aunt or uncle) because the
  generated forenames carry no gender. Randomising these independently produced
  records like "Kenji Berkmann · Grandmother, language Norwegian, address in
  Poland" for an Italian student, which reads as broken data to a prospect.
- Hero contrast is measured, not eyeballed: the text is hidden, the background
  plate is captured, and the brightest pixel under each text box is compared to
  its computed colour. Tightest measured ratio 4.58:1 on the first blurb.
  Re-run that probe if the image or the scrim changes.
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
