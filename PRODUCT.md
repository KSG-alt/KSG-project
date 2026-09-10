# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

The product spans two surfaces with different design languages: the **admin
dashboard is web**, and the **staff app is native iOS and Android**
(confirmed 10 Sep 2026). All current build work is the web dashboard; the
native references apply when the staff app is designed.

## Stack

**Delegated.** The user asked for whatever makes sense for the overall
project rather than nominating a stack.

Chosen: a **TypeScript + React (Vite) web admin dashboard** against a
**Node/Express + Postgres API**, with the native iOS and Android staff apps
consuming that same API. Reasoning: the API has to serve a web dashboard and
two native clients, so a plain server-rendered app would be the wrong shape;
React is the conventional choice for a dense, table-heavy operations UI; and
Ismail has already shipped a Node/Express + SQLite app (`setterops-app`), so
the server half is a stack he can maintain rather than a new language.

Two qualifications:

- **David confirms.** Architecture and the data model are Seat 1's decision
  (DECISIONS.md 0004). This is a recommendation with reasoning attached, not
  a settled fact, and it changes if he picks otherwise.
- The **September prototype is the same React app running on seeded fake
  data**, so it ports onto his schema rather than being thrown away.

## Users

**Primary: centre admin staff.** The people who chase documents and payments
every day of a season. Their job is repetitive queue work under time pressure
— a centre with 150–300 students has well over a thousand individual
documents to collect and verify before students arrive, currently chased
manually, one email at a time. The dashboard is a work surface for them, not
a reporting tool.

Secondary, confirmed but not the design lead:

- **Centre directors / management** — currently see a true picture of
  readiness only via an end-of-week manual pull.
- **Safeguarding leads** — ratio compliance, DBS status, inspection
  readiness.
- **Activity and management staff** — the native app audience, not the
  dashboard's.

## Product Purpose

Replace the spreadsheets, email threads and WhatsApp coordination that summer
schools and language centres currently run their seasons on, with one
operations platform that automates the highest-friction manual work:
document chasing with escalation, payment reconciliation, and rota generation
against availability, qualifications and required ratios.

Success is a season run without a safeguarding-critical failure, with
documented time and cost savings against the centre's prior process.

## Positioning

Purpose-built around the actual shape of a summer season, which is what
neither alternative offers: existing options are generic school or camp
management software not built for a short, seasonal, safeguarding-heavy
programme, or no system at all.

Three things a neighbouring product could not truthfully claim:

- Onboarding designed to complete inside the short window before term begins,
  matching the compressed timeline centres already work to.
- Ratio and safeguarding compliance built in rather than bolted on.
- A staff experience that meets people in WhatsApp, where they already
  communicate, instead of asking seasonal staff to adopt a new messaging tool
  for eight weeks.

## Operating Context

- Seasons are short and intense — typically **4 to 8 weeks**, roughly
  June–August.
- Centres run 100–500 students per season.
- Current tooling is spreadsheets, email and WhatsApp, because the season is
  too short and too seasonal to justify buying or building a system.
- Staff are largely **seasonal**, which constrains anything requiring
  training or app installation.
- Onboarding a new centre means importing student, staff and group data out
  of existing spreadsheets, then configuring age bands, ratio requirements and
  WhatsApp channel links per group or site — inside that pre-term window.
- The sales cycle is slow and trust-driven; operators are risk-averse and
  closely connected to each other, so word of mouth carries weight in both
  directions.

## Capabilities and Constraints

**Admin dashboard (web).** Task and reminder tracker showing every
outstanding item — form, payment, DBS renewal — against its due date, with
automatic escalation to management past a threshold, and safeguarding-critical
items escalating faster than administrative ones. Group and activity
timetabling, where each age-banded group has its own live schedule and a
cancelled or weather-affected activity re-slots only the groups actually
affected. Rota builder with ratio-compliance flagging against staff
availability, qualifications and required ratios per age band. Safeguarding
audit trail: a timestamped record of ratios, DBS status and incident
handling, built for inspection.

**Staff app (native iOS/Android).** My Shifts, My Team (which doubles as a
safeguarding accountability record), one tap through to the relevant group or
site WhatsApp channel, and notifications for shift changes, cover requests,
compliance reminders and management broadcasts.

**Confirmed constraints:**

- **No payroll.** "My Pay" was dropped from the staff app; pay stays with the
  centre, outside the platform. This is deliberate — it avoids compliance
  liability the platform isn't built to carry (DECISIONS.md 0001).
- **No cut-down version.** The pilot gets every named automation and feature,
  including multi-site. There is no scope-reduction lever
  (DECISIONS.md 0002).
- **WhatsApp group membership is not automated.** When rotas change, the
  platform does not update WhatsApp groups; centres need an internal process
  to keep them in sync. Known gap, not a bug.
- Multi-site support is in scope from the pilot.
- Role-based access on the dashboard.

**Commercial model:** setup fee (covers onboarding and spreadsheet migration)
plus monthly per-centre subscription, tiered by season enrolment — indicative
bands under 150, 150–400, and 400+ students. Higher tiers include multi-site
and priority support during peak enrolment and arrival weeks.

**Terminology:** *centre* (not school or client), *season*, *age band*,
*group*, *ratio*, *DBS*, *safeguarding lead*, *centre director*.

## Brand Commitments

Built by **Kadia Systems Group**. The product itself has **no confirmed name**
— "Summer School Operations Platform" is a description used in the founding
documents, not a decided brand. Undecided, not chosen.

No logo, visual identity, palette, typography or voice has been established.
Nothing is binding yet.

## Evidence on Hand

**No customers, no pilot, no usage data, no testimonials, no benchmarks, and
no case study exist.** As of 10 Sep 2026 this is pre-pilot: the first signed
centre is the goal, not a fact. Future work must not fabricate any of these,
and must not put invented logos, quotes or numbers into a demo shown to a
prospect.

What is real:

- Direct frontline experience on the founding team — Kebba's safeguarding and
  summer-school staffing background, and Ismail's own summer-school activity
  management experience. The team has worked the workflows being automated.
- Founding documents in `docs/source/`: the business overview (2 Aug 2026) and
  the launch roadmap (10 Sep 2026).
- Sector relationships and referral routes to centre directors and
  safeguarding leads.

The September prototype runs on **seeded fake data**, and anything shown to a
prospect must be visibly a demonstration rather than implied live usage.

## Product Principles

1. **The admin's queue is the product.** The dashboard's job is to answer
   "what do I chase next" faster than a spreadsheet does. Overview and
   reporting are secondary to getting through the work.
2. **Safeguarding outranks admin, everywhere.** Wherever items compete for
   attention, escalation speed, or screen space, the safeguarding-critical
   one wins. This is the difference between an inconvenience and an incident.
3. **Meet centres where they already are.** WhatsApp, their existing
   spreadsheets, their existing payroll. Every new tool a seasonal workforce
   has to adopt is friction the season cannot absorb.
4. **Automate the chase, not the judgement.** The platform sends reminders,
   matches payments and drafts rotas. A human decides what is compliant and
   what is safe.
5. **The compressed window is a design constraint, not a caveat.** Onboarding,
   configuration and training all have to work inside the weeks before term.

## Accessibility & Inclusion

**No specific standard has been established** — undecided, and recorded here
rather than invented. Worth settling before a pilot: centres are education
providers, and UK public-sector-adjacent procurement commonly expects
WCAG 2.1 AA.

Two known product-specific needs, distinct from any standard:

- Seasonal staff onboard onto the native app in days, with minimal training —
  first-run comprehension matters more than depth.
- Parents receiving automated document and payment reminders are not users of
  the system, have not been trained, and may not read English as a first
  language. Reminder content has to work cold.
