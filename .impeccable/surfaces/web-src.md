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

OWN-WORLD: Paper, plum ink and butter, taken from heidihealth.com (pinned by
the user 11 Sep 2026, replacing the dark ink/acid world). Ground #FCFAF8, text
#28030F — a near-black carrying a plum cast rather than neutral grey —
secondary #755760, one butter accent #FBF582 and a deep green #194B22 for
anything settled. Primary actions are ink pills; butter is the secondary.
Surfaces are white, large-radius (6/12/18/24/36) and softly shadowed
(0 5px 40px), never bordered slabs. Two faces: Geist for UI and data, and
Instrument Serif italic at weight 400 for one display accent set at the same
size as the sans beside it. State colour was retuned for a light ground —
the dark values failed contrast on paper: oxide #C0341A stays reserved for
safeguarding-critical, ochre #9A6A12 for overdue admin, forest for clear.

STORY: An admin arrives, is greeted by name, and picks the one thing they came
to do. Every screen answers who is here, who is cleared, what is scheduled, and
what is missing — with the safeguarding-critical answer always the loudest thing
on the rule.

FIRST VIEWPORT: Centred lede on bare paper — the greeting with its first
words in serif italic, the day's count beneath, an ink pill and a butter pill
side by side, then the season and the demonstration note. Below it one large
36px-radius stage carrying a painted wash (cool at top left, butter at top
right, warm paper at the foot), holding the shortcut pills and the two white
panels: what needs doing, and Ask Kadia. The blue circuit photograph is
retired from this surface — a dark image cannot sit on a warm light ground
without fighting it — and stays in public/ if the direction reverses.

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
- The rota runs Monday to Saturday, not one day. A session is 90 minutes, and
  weekly hours are counted off that same rota, so the number on the staff
  screen and the sessions on the timetable can never disagree. Sessions live
  in the shared store for the same reason: cancelling one has to lower the
  hours the staff screen reports.
- Three rota rules the generator enforces, each of which was wrong first:
  nobody is booked into two groups in the same slot; only cleared DBS staff
  are drafted; and the safeguarding lead and welfare officer hold duty roles
  rather than activity sessions. Without the first, weekly hours ran to 57h
  and the schedule grid showed 14 shifts for 31 sessions.
- Hours are rota'd, never paid — payroll is out of scope (DECISIONS 0001).
  Anything past the 48h working-time limit is flagged as needing a signed
  opt-out rather than silently scheduled.
- The assistant section is called **Ask Kadia**; Kadia alone is the assistant's
  name inside its own copy.
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
