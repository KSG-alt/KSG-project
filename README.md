# Summer School Operations Platform

Automation-first operations software for summer schools and language centres.
Built by Kadia Systems Group.

**Goal:** at least one signed, configured and live pilot centre for the **Summer 2027 season** (June–August 2027).

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

    docs/           Specs, decisions, ownership. Read before building.
    docs/source/    Original business overview + launch roadmap (.docx originals)
    .github/        CODEOWNERS, PR template

Application layout is **David's call** and is not fixed here yet — see
[Decision 0004](DECISIONS.md). Once he sets it, the paths in CODEOWNERS get
updated to match.

## Start here

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
