# Summer School Operations Platform

Automation-first operations software for summer schools and language centres.
Built by Kadia Systems Group.

**Goal:** at least one signed, configured and live pilot centre for the **Summer 2027 season** (June–August 2027).

## See it

**Live demo: [ksg-alt.github.io/KSG-project/kadia-demo-centre.html](https://ksg-alt.github.io/KSG-project/kadia-demo-centre.html)**

A working prototype of the **centre admin dashboard**, running on seeded fake
data. It opens in any browser, on any device, with nothing to install. It is a
demonstration, not the product: no real student, staff member or centre is in
it, and the staff mobile app and the head office side are not in it. What a
viewer can do in it is in [docs/DEMO.md](docs/DEMO.md).

## Who owns what

Three seats, each owning a lane end-to-end. This split is the whole reason
this repo exists — we are building separate parts of one system, so the
boundaries need to be written down, not assumed.

| Seat | Owner | Owns in this repo |
|---|---|---|
| 1 — Technical / Build | **David** | Architecture, data model, staff mobile app (all of it), rota builder + ratio-compliance engine, safeguarding audit trail, payment matching |
| 2 — Sales & Client-Facing, plus build | **Ismail** | Document & payment reminder tracker (incl. escalation), group & activity timetabling (incl. auto re-slotting), centre setup & configuration screens |
| 3 — Safeguarding & Frontline Ops | **Kebba** | Functional spec (ratio rules, DBS/qualification checks, escalation thresholds, audit-trail contents), onboarding + training materials, acceptance testing |

Enforced in [.github/CODEOWNERS](.github/CODEOWNERS). See [docs/ownership.md](docs/ownership.md)
for the detail and for what happens when a change crosses a boundary.

## Repo layout

    web/            The admin dashboard prototype — TypeScript + React (Vite), seeded fake data
    docs/           Specs, decisions, ownership. Read before building.
    docs/source/    Original business overview + launch roadmap (.docx originals)
    docs/kadia-demo-centre.html   The demo as one self-contained file (built from web/)
    docs/DEMO.md    What the demo shows, and how to rebuild it
    branding/       The KSG mark
    .github/        CODEOWNERS, PR template, the `check` workflow

The stack in `web/` is a **proposal, not a settled decision** — architecture
and the data model are David's call ([Decision 0004](DECISIONS.md)). The
prototype is built so it can be moved onto his schema rather than thrown
away. Once he sets the real layout, the paths in CODEOWNERS get updated to
match.

To run it locally: `cd web && npm install && npm run dev`. To rebuild the
demo file after a change: `cd web && npm run demo`.

## Start here

0. Open the [live demo](https://ksg-alt.github.io/KSG-project/kadia-demo-centre.html) — five minutes in it explains the product faster than any document.
1. Read [docs/source/Summer_School_Platform_Business_Overview.docx](docs/source/Summer_School_Platform_Business_Overview.docx) — what we're building and why.
2. Read [docs/source/launch-roadmap-2026-09-10.docx](docs/source/launch-roadmap-2026-09-10.docx) — the plan and the dates.
3. Read [DECISIONS.md](DECISIONS.md) — what's already locked, so we don't relitigate it.
4. Read [CONTRIBUTING.md](CONTRIBUTING.md) — branch and PR workflow.
5. Read [docs/interface-contract.md](docs/interface-contract.md) — what Ismail's screens need from David's data model. **This is the one that stops us blocking each other.**

## The dates that matter

| When | What |
|---|---|
| Oct 2026 | Kebba joins. Week 1 = the ratio/DBS/audit-trail functional spec, which unblocks David's compliance build. |
| **End Nov 2026** | Honest build checkpoint. If behind, the levers are more capacity or a later go-live — **not** less scope. |
| **Dec 2026 – Jan 2027** | A pilot must be signed by roughly here, or there isn't runway to configure, migrate and train before term. |
| Feb–Mar 2027 | Contracting and pre-season configuration. |
| Apr–May 2027 | Onboarding, training, dry run. |
| Jun–Aug 2027 | Live pilot season. |
