# Decisions

One line per decision, newest at the bottom. Recorded so we don't relitigate
settled things, and so Kebba can see in October what was decided before she
joined.

Format: what was decided, when, and *why* — the why is the part that's worth
having later.

---

## 0001 — Payroll integration is out of scope

**Decided:** before 10 Sep 2026 · **Status:** locked

The staff mobile app has no "My Pay". Pay continues to be handled by the
centre outside the platform.

**Why:** it removes one of the two hardest integrations from the build, and
removes the payroll-dependency risk named in the original business overview.
We sync with nothing and carry no payroll compliance liability.

---

## 0002 — The pilot gets the full system, not an MVP

**Decided:** before 10 Sep 2026 · **Status:** locked

Every automation named in the business overview — document-chasing reminders
with escalation, payment reconciliation/matching, rota generation against
availability/qualifications/ratios, automatic activity re-slotting, the
safeguarding audit trail, notifications — and every core feature, including
multi-site support, is built and genuinely working for the pilot. Nothing is
deferred to a later release.

**Why:** a half-built or manually-faked system doesn't prove the thing we need
proven in Summer 2027.

**Consequence, stated plainly:** there is no scope-cutting lever left. If the
build falls behind, the levers are extra build capacity or a later go-live
date. This is the single biggest execution risk in the plan and the end-of-
November 2026 checkpoint exists to catch it.

---

## 0003 — Target market is both lanes in parallel

**Decided:** before 10 Sep 2026 · **Status:** locked

Pursue an easy, fast-closing independent centre (100–500 students, no existing
system) *and* a large-scale operator conversation at the same time — not one
then the other.

**Why:** independents close fastest and are the safest route to a Summer 2027
pilot; large operators are the long-term ambition but bring longer procurement
and possibly an incumbent system to displace. Running them in parallel means a
slow enterprise conversation can't by itself cost us the season.

Carry **two** warm prospects into contracting, not one, so a single drop-out
doesn't sink the proof of concept.

---

## 0004 — Application stack and layout: David's call, not yet set

**Decided:** 10 Sep 2026 · **Status:** open

This repo currently holds docs only. The stack, the data model and the
directory layout are Seat 1's to decide.

**Why it's recorded as open:** Ismail's three pieces (reminder tracker,
timetabling, config screens) build on David's data model. Until it's stable,
Ismail prototypes against fake data rather than building on a schema that's
still moving.

**Unblocks when:** David lands the core data model — students, staff, groups,
bookings, payments. Then CODEOWNERS paths get updated to the real layout and
[docs/interface-contract.md](docs/interface-contract.md) gets checked against
what he actually built.

---

## 0005 — Medication and allergies: declared at booking, verified by head office

**Decided:** 16 Sep 2026 · **Status:** settled for the prototype

Clinical data enters the platform from the family, with the booking, and
becomes a record the centre may act on only when a named person in the senior
team verifies it. Centre staff read it and record what they gave. Nobody at
the centre can enter, edit or delete a medication.

**Why:** the family holds the facts, so asking them is the only way to get the
dose right first time, and it costs the centre nothing. But a parent's
free-text declaration is not a clinical instruction, and a seasonal member of
staff retyping a dose off a WhatsApp message is exactly how the wrong amount
of insulin gets given. Verification sits with head office because they are
continuous across the season, they can ring the family or ask for a GP letter,
and they are the smallest group that can hold the liability.

**What it means in the product:** every health record carries where it came
from (`booking` or `senior`), a state (`declared`, `verified`, `queried`) and
the name of whoever verified it. Unverified records and medication held
without written consent appear in the reminder queue as safeguarding items.
Role access splits reading (`welfareDetail`) from changing the record
(`welfareEdit`), and every read of the clinical record is written to the audit
trail.

**Open:** whether an agent-booked student's declaration arrives through the
agent or direct from the family. Agents book most students, so this decides
who the portal link is sent to.
