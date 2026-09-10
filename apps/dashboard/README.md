# Admin dashboard — prototype

Seat 2's admin dashboard, running on **seeded fake data with no backend**.

Two jobs, both real:

1. **A demo for discovery calls.** Something to show a centre director this
   month rather than describing it.
2. **The spec David builds against.** It shows exactly what each screen reads
   and writes — see [../../docs/interface-contract.md](../../docs/interface-contract.md).

Nothing here is precious. When the data model is stable (DECISIONS.md 0004),
the screens get rebuilt on it.

## Run it

    npm install
    npm run dev

Then open the printed URL. `npm run build` typechecks and builds.

## What's in it

| Screen | Owner | State |
|---|---|---|
| Today / Documents / Payments — the chase queue with escalation | Ismail | Prototyped |
| Timetable — group schedules, cancel and re-slot | Ismail | Prototyped |
| Setup — sites, age bands, ratios, WhatsApp links, import | Ismail | Prototyped |
| Rota & ratios | David | Shown as the admin would read it; the engine is his |
| Safeguarding audit trail | David | Same — illustrative only |

The last two are included so the demo shows a whole product. They are not a
claim on Seat 1's scope.

## The data is fake, and says so

Every student, parent, staff member, payment and incident in
[src/data/seed.ts](src/data/seed.ts) is invented, and the generator is
deterministic so a demo doesn't reshuffle mid-conversation. Screens that
could be mistaken for live usage carry a visible "Demonstration data" note.

This matters commercially as much as ethically: PRODUCT.md records that there
are no customers, no usage data and no case study yet. A demo must not imply
otherwise.

## Design

The visual world is the **Ordnance Survey sheet** — paper ground, hairline
rules, a live legend, and colour used only to mean something. Tokens and the
reasoning are in [src/styles/tokens.css](src/styles/tokens.css); composition
rules are at the top of [src/styles/app.css](src/styles/app.css).

Three things to preserve if you change it:

- **The key filters the sheet.** The legend is the primary filter control,
  not a colour chart printed beside one.
- **One language for urgency.** The five-step density ramp. No second badge,
  pill or icon competing with it.
- **Escalation prints into the record.** It is an entry in the chase log in
  sequence, the way an incident book works — not a badge bolted on the row.
