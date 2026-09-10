# Interface contract — what Seat 2's screens need from Seat 1's data model

**Owner of this document:** Ismail (states the need) · **Owner of the answer:** David (designs the model)

Ismail is building the document & payment reminder tracker, group & activity
timetabling, and the centre setup & configuration screens. All three sit on
top of David's data model.

This document exists so David designs that model knowing what has to be read
off it, instead of finding out later. It is a **statement of need, not a
schema** — the actual field names, types and relationships are David's.

Where a line below is wrong or unnecessary, say so and we cut it. Where
something is missing, add it. The point is to have the argument now, on one
page, rather than in three months across two half-built features.

---

## 1. Document & payment reminder tracker

The core loop: *for every outstanding thing, who owes it, when is it due, has
it been chased, and does it need escalating yet.*

**Needs to exist:**

- A **student**, belonging to a centre and a season, with a parent/guardian
  contact to send reminders to.
- A **required document** per student — medical form, consent form, passport
  copy, and whatever else a centre configures. Each one needs: what it is,
  whether it's in, when it's due, and when it was received.
- A **payment** against a booking: amount owed, amount paid, due date. Enough
  to answer "is this balance overdue and by how much".
- A **staff DBS / qualification record** with an expiry date — DBS renewals
  appear in the same tracker as student documents.
- A **reminder log** — what was sent, to whom, when. Without this we can't
  show "chased twice, no response", which is the whole point of escalation,
  and we can't prove we chased if a centre is ever asked.
- An **escalation state** per item, and who it escalates to.

**Behaviour this has to support:**

- Safeguarding-critical items escalate **faster** than administrative ones.
  So an item has to carry some notion of *how critical it is* — that
  classification is Kebba's to define (see CONTRIBUTING), but the model has to
  have somewhere to put it.
- Thresholds are **configurable per centre**, not hardcoded.

**Open questions for David:**

- Is "outstanding item" one table with a type, or separate document/payment/DBS
  tables that a view unions? Affects how the tracker screen queries.
- Where does reminder *sending* live — my screen, or a service you own?
  I'd assume a service you own; I trigger it and read its log.

---

## 2. Group & activity timetabling

The core loop: *every age-banded group has a live schedule, and when something
is cancelled only the affected groups get re-slotted.*

**Needs to exist:**

- A **group**, tied to an age band, with students in it.
- An **activity** — what it is, where, capacity, and any staffing or
  qualification requirement it carries.
- A **scheduled session**: activity + group + time + location, and the staff
  rota'd onto it.
- A **cancellation reason and re-slot history** — so a re-slotted session can
  be told apart from an originally-scheduled one, and so we can show a centre
  what changed today.

**Behaviour this has to support:**

- Re-slotting affects **only the groups actually affected**, not the whole
  timetable.
- A session's staffing has to be checkable against required ratios. **I do not
  compute this** — the rota/ratio-compliance engine is David's. I need to be
  able to *ask* it whether a session is compliant and show the answer.

**Open questions for David:**

- What's the call I make to ask "is this session compliant?" — a function, an
  endpoint, a flag you maintain on the session?
- Does re-slotting go through your rota engine (because it changes staffing)
  or do I own the re-slot and call you to re-check?
  **This is the biggest boundary question between us.** Worth settling early.

---

## 3. Centre setup & configuration

The core loop: *get a new centre's world into the system in the short window
before term starts.*

**Needs to exist:**

- A **centre**, and **sites** under it (multi-site is in scope — Decision 0002).
- **Age bands** per centre, since these vary.
- **Ratio rules** per age band — the *shape* configured here, the *rules*
  specified by Kebba in October.
- **WhatsApp channel links** per group or site.
- **Role-based access** for centre staff on the dashboard.
- A **data import** path for students, staff and groups from the centre's
  existing spreadsheets — this is what the setup fee pays for and it runs in a
  compressed window before term.

**Open questions for David:**

- Import: do I build the upload/mapping UI against an import service you own,
  or do I own the whole path? Onboarding is Kebba's lane operationally, so
  whatever we pick, she needs to be able to run it without either of us.
- Is configuration versioned? If a centre changes an age band mid-season,
  does history survive — and does the audit trail need it to?

---

## What I'm doing until this is settled

Prototyping against **seeded fake data**, so the screens and their logic can
be designed, demoed to prospects, and argued about now, without me building on
a schema that's still moving (Decision 0004). The prototype doubles as the
spec: it shows David exactly what the screens read and write.

When the model is stable, the prototype gets rebuilt on it. Nothing in the
prototype is precious.
