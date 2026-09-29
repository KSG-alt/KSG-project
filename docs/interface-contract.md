# Interface contract — what Seat 2's screens need from Seat 1's data model

**Owner of this document:** Ismail (states the need) · **Owner of the answer:** David (designs the model)

**Revised 29 Sep 2026.** The first version was written on 10 Sep, before three
weeks of prototype work. That prototype has since grown from three features to
sixteen sections, and most of what it learned is not in the original document.
This revision replaces it. Sections 1–3 are the original three features,
corrected where the prototype proved the first statement wrong. Sections 4–10
are new and are the larger half of the change.

Ismail is building the document & payment reminder tracker, group & activity
timetabling, and the centre setup & configuration screens. All three sit on
top of David's data model, and the prototype has since demonstrated that they
cannot be built without the clinical record, transport, incidents and rooming
sitting on the same model.

This document exists so David designs that model knowing what has to be read
off it, instead of finding out later. It is a **statement of need, not a
schema** — the actual field names, types and relationships are David's.

Where a line below is wrong or unnecessary, say so and we cut it. Where
something is missing, add it. The point is to have the argument now, on one
page, rather than in three months across two half-built features.

**Reading the prototype alongside this.** Every section cites the prototype
file that makes the claim. Those files are seeded fake data and throwaway
code, but the *shape* in them is three weeks of argument and is the thing
worth reading. `web/src/data/` holds the records; `web/src/lib/` holds the
solvers that read them.

---

## What changed since 10 Sep, in one list

If you read nothing else, read this. Each line is something the model has to
hold that the first version of this document did not mention.

1. **The queue is derived, not stored.** Reminders are recomputed from the
   records every time they are read. There is no reminder table.
2. **Escalation fires on a threshold, not on a button.** It is a computed
   state, and the fact that it fired is written to the audit trail by the
   system, not by a user.
3. **A clinical record exists**, with a provenance, a verification state and a
   named verifier (Decision 0005). It is the single most safeguarding-critical
   thing in the model and it was absent from the first draft.
4. **Medication administration is a log**, dose by dose, with a witness.
5. **Staff have contracts with start and end dates**, separate from their
   away days. Seasonal staff are hired for a stretch of the season, not all of
   it, and rota'ing outside those dates is the same class of error as rota'ing
   somebody on holiday.
6. **Transport is a supplier relationship**, not a field on a student:
   rate cards, free waiting allowances, disputed invoices, receipts.
7. **Flights exist**, in both directions, with unaccompanied-minor status.
8. **Incidents exist**, and the two timestamps that matter are when the
   safeguarding lead was told and when the parents were told.
9. **Rooming is a constraint problem**, with a reason recorded for each
   placement.
10. **Payments arrive unmatched.** Reconciliation is the job, not a field.

---

## 1. The outstanding-work queue

The core loop: *for every outstanding thing, who owes it, when is it due, has
it been chased, and does it need escalating yet.*

### Corrected: the queue is a view, not a table

The first version of this document implied a stored list of outstanding items.
The prototype built it that way, and it was wrong. A queue built once and
never recomputed is a spreadsheet with extra steps, which is the exact thing
this product exists to replace.

**What the prototype does instead** (`web/src/lib/reminders.ts`): every row is
derived from the records on every read. Fix the DBS and the row disappears;
attach the receipt and the row disappears. Twenty-one kinds of row currently
derive from eleven record types, and adding a twelfth kind means adding a
derivation, not a table.

**What this means for the model:** you do not need a reminders table. You need
every underlying record to carry enough to answer *is this outstanding, since
when, and who is it on*. What does need storing is only what a person did to a
row that cannot be derived — completed it early, reworded it, deleted it, sent
a chase. The prototype keeps that as an overlay keyed by a derived id, which
is a hack that a real model should replace with something better.

**Open question for David:** if the queue is derived, what is a reminder's
stable identity across recomputations? The prototype builds ids like
`doc-s-0147` and `incident-dsl-inc-3`. That works because the derivation is
deterministic; it breaks the moment two rows derive from the same record for
different reasons. Worth settling before anything writes against an id.

### Corrected: escalation is automatic

**Needs to exist:**

- A **severity** per outstanding item. The prototype uses three —
  `safeguarding`, `overdue`, `admin` — and the classification is Kebba's to
  define, but the model has to have somewhere to put it.
- An **escalation threshold per severity, per centre.** The prototype defaults
  to 1 day for safeguarding, 3 for overdue, 7 for admin, and lets the setup
  screen change them.
- A **target per severity** — who it escalates to.
- A **chase log**: what was sent, to whom, when, by which channel. Without it
  the screen cannot say "chased twice, no response", which is the whole basis
  for escalating, and the centre cannot prove it chased if asked.

**Behaviour this has to support:**

- Escalation **fires on the threshold without a person pressing anything**.
  This is the one piece of automation the product is named for, and the
  prototype originally got it wrong: it computed the right answer and then
  waited for an admin to notice and click. An admin who has to spot the
  overdue item and escalate it by hand is doing the job the system claimed to
  do.
- The escalation is written to the audit trail **attributed to the platform,
  not to whoever happened to be logged in**. Nobody did it, which is the
  point.
- A manual escalate stays available for escalating something *early*, which is
  a judgement a button should carry.

**Open questions for David:**

- Where does reminder *sending* live — my screen, or a service you own? I'd
  assume a service you own; I trigger it and read its log. Unchanged from the
  first version and still unanswered.
- If escalation is derived, is the *fact that it escalated* an event you
  persist, or is the audit entry the only record? The prototype writes an
  audit entry and holds nothing else, which means the trail is load-bearing.

---

## 2. Group & activity timetabling

The core loop: *every age-banded group has a live schedule, and when something
is cancelled only the affected groups get re-slotted.*

**Needs to exist** (unchanged from the first version, plus):

- A **group**, tied to an age band, with students in it.
- An **activity** — what it is, where, **capacity**, and any staffing or
  qualification requirement it carries. Capacity was in the first draft as a
  word; the prototype found it was never read, and a session over capacity is
  a real failure the screen now flags.
- A **scheduled session**: activity + group + time + location, and the staff
  rota'd onto it.
- A **cancellation reason and re-slot history**.
- **Duty shifts** as a separate thing from sessions. Night duty, wake-up duty
  and meal supervision are rota'd, count towards hours, and are not activities.
  The prototype models them separately (`web/src/data/duty.ts`) and both feed
  the same weekly hours total.

**Behaviour this has to support:**

- Re-slotting affects **only the groups actually affected**.
- A session's staffing has to be checkable against required ratios. **I do not
  compute this** — the engine is David's. `web/src/lib/ratio.ts` is a labelled
  stand-in that answers the same question shape, so the call sites do not move
  when the real engine lands. Replace the body, keep the signature.
- **Every ratio and hours check must filter on the session's date.** The
  prototype had a bug where it counted every student on the books rather than
  every student on site that day, which made a mid-season session look
  understaffed by fifty children. Anything that counts people needs to know
  which day it is counting.
- **Weekly hours are capped.** The prototype uses 48h and checks it when
  rota'ing, when finding cover and when planning next week — three separate
  places that each got the week wrong at least once. If the cap lives in the
  model, the week it applies to has to be a parameter, not an assumption.

**Open questions for David** (unchanged, still the biggest boundary between
us):

- What's the call I make to ask "is this session compliant?"
- Does re-slotting go through your rota engine, or do I own the re-slot and
  call you to re-check?

---

## 3. Centre setup & configuration

The core loop: *get a new centre's world into the system in the short window
before term starts.*

**Needs to exist:**

- A **centre**, and **sites** under it (Decision 0002).
- **Age bands** per centre. The prototype uses 8–11, 12–14, 15–17.
- **Ratio rules per age band** — and the prototype found there are **three
  ratios, not one**: day, night, and off-site. They differ materially (the
  youngest band is 1:8 by day, 1:12 at night, 1:6 off site) and a single
  number cannot express the rule.
- **Escalation thresholds per severity**, configurable per centre.
- **WhatsApp channel links** per group or site.
- **Role-based access.** The prototype runs five roles and has found that
  access is not one permission but at least four independent ones: which
  sections you see, whether you can read welfare detail, whether you can
  *change* the clinical record, and whether you can edit records at all. Those
  four do not collapse into a rank — the centre administrator can edit records
  but must not touch the clinical record, and head office is the reverse of
  the usual assumption about seniority.
- A **data import** path for students, staff and groups.

**Open questions for David:**

- Import: do I build the upload/mapping UI against an import service you own,
  or do I own the whole path?
- Is configuration versioned? If a centre changes an age band mid-season, does
  history survive — and does the audit trail need it to?

---

## 4. The clinical record — NEW

Settled in Decision 0005 and absent from the first version of this document.
This is the most safeguarding-critical structure in the model and the one
where getting the shape wrong is most expensive to fix later.

**Needs to exist** (`web/src/data/health.ts`):

- A **health record per student**, carrying:
  - **where it came from** — declared by the family at booking, or entered by
    head office;
  - a **state** — `declared`, `verified` or `queried`;
  - **who verified it and when**, by name;
  - the text of any **query** raised against it.
- **Allergies**, each with a severity (`mild` / `severe` / `anaphylaxis`),
  what the reaction actually looks like in the family's own words, the
  treatment, whether an auto-injector is carried, and **where it is kept**. A
  pen in a locked office is not a pen.
- **Medications**, each with dose, route, the local times a dose is due,
  whether it is as-required rather than routine, whether it is taken with
  food, whether the child self-carries or the centre holds it, the dates it
  runs between, and **whether written guardian consent exists**.
- An **administration log** — one row per dose per day: when it was due, when
  it was given, by whom, **witnessed by whom**, or refused, with a note.

**Behaviour this has to support:**

- A record that is not `verified` **must not be actionable**. The centre may
  read it; it may not treat it as a clinical instruction. The screens say so
  in those words.
- **Nobody at the centre may enter, edit or delete a medication.** Centre staff
  read it and record what they gave. Changing the record is head office's.
- **No consent, no dose.** Medication held without written consent appears in
  the queue as a safeguarding item and the screen refuses to let it be given.
- **Every read of the clinical record is written to the audit trail.** Not
  every write — every read.
- A dose is "missed" only when its due time has **passed** and it was recorded
  neither as given nor as refused. The prototype got this wrong in one place
  and generated twenty-two phantom safeguarding rows for doses that were not
  due yet.

**Open questions for David:**

- An agent books most students. Does the declaration arrive through the agent
  or direct from the family? This decides who the portal link is sent to and
  it is the open half of Decision 0005.
- Is the clinical record versioned? A verified record that the family then
  amends is a different record, and the centre may have acted on the old one.
- Does the administration log need to survive a student's record being
  deleted? I assume yes, for the same reason the audit trail does.

---

## 5. Documents and the parent portal — NEW detail

The first version had "a required document per student". The prototype found
the chase is a state machine, not a flag.

**Needs to exist** (`web/src/data/portal.ts`):

- A **request** per document per student, carrying its own lifecycle: sent,
  opened, uploaded, decided. Each of those is a timestamp, not a boolean.
- The **link token** a real portal would put in the URL.
- A **rejection reason in words a parent can act on**, when a document comes
  back.
- A **reminder count** per request.

**Behaviour this has to support:**

- The portal splits three ways and the split is the product: **waiting on
  them**, **waiting on us to verify**, and **accepted**. There is deliberately
  no "everything" view, because the useful question is always which of those
  three piles something is in.
- A link **chased twice and never opened** means the email address is wrong,
  not that the parent is ignoring you. The system should say so rather than
  chase a third time.
- Documents waiting on *us* are the cheapest rows in the queue to clear and
  the most embarrassing to leave.

**Open question for David:** does the document store live behind your API or
is it a third party we call? The prototype has no file store at all and says
so on screen.

---

## 6. Money — NEW detail

The first version had "a payment against a booking: amount owed, amount paid".
The prototype found that the job is not storing a balance, it is deciding
which line on the bank statement belongs to which student.

**Needs to exist** (`web/src/data/finance.ts`):

- A **payment** as its own record: when it landed, how much, **who paid**
  (frequently a parent with a different surname), what **reference** they used
  (frequently blank or wrong), and the method.
- A **match** from payment to student that is **nullable** — unmatched until
  somebody or something decides — and that records **whether the reference did
  the deciding or a person did**.
- An **invoice reference** per student that a payment can quote.
- **Supplier commitments** — what is booked, what it costs, and whether a
  receipt exists.

**Behaviour this has to support:**

- Money banked against nobody is **not income yet**, and the balances on the
  students it belongs to are wrong until it is matched.
- Unmatched payments older than a few days belong in the queue.
- A student leaving with a balance is a conversation to have this week, not on
  the morning the taxi arrives. The departure screen refuses to build a run
  for a child who is leaving owing, and says why.
- Invoiced minus banked must equal outstanding, at every level. The prototype
  asserts this in `web/src/lib/season.ts` because it is the one number a
  centre director will check by hand.

**Open question for David:** is reconciliation an integration with the bank,
or a CSV import? This is named in the roadmap as the hardest remaining
integration and the prototype does not attempt it — it shows the matching UI
against seeded unmatched payments.

---

## 7. Staff, contracts and cover — NEW detail

**Needs to exist** (`web/src/data/seed.ts`, `web/src/lib/cover.ts`):

- **DBS** with a state (`cleared` / `expiring` / `pending` / `missing`), a
  certificate number, an issue date and an expiry.
- **Qualifications** as a list, and **age bands** the person is cleared to
  work with. Both are checked before anyone is put on a session.
- **Contracted hours**, and a **contract with a start and end date**. Seasonal
  staff are hired for a stretch of the season. A leader who starts in week
  three and a teacher who leaves before the last changeover are both ordinary,
  and rota'ing either outside those dates is an error of the same kind as
  rota'ing somebody who is away.
- **Away days** — dates the person has told the centre they cannot work.
- Whether the person is a **safeguarding lead**.

**Behaviour this has to support:**

- Finding cover is a constraint problem, not a list. The prototype checks, in
  order: DBS cleared, inside contract dates, not away, cleared for the age
  band, holds the qualification the activity needs, has no clash, and will not
  breach the weekly cap. It then prefers whoever has the fewest hours —
  **cover should land on whoever has room, not on whoever is most willing to
  say yes.**
- Somebody without a cleared DBS **cannot be rota'd at all**, and the reason
  has to be visible rather than the person simply not appearing.
- Hours must be countable across both sessions and duty shifts, for a named
  week.

---

## 8. Arrivals, departures, flights and transport — NEW

Entirely absent from the first version. This turned out to be a third of the
prototype.

**Needs to exist** (`web/src/data/travel.ts`, `web/src/data/suppliers.ts`,
`web/src/lib/transfers.ts`):

- A **flight per student per direction**, with number, airport, terminal,
  local time, status, minutes of delay when known, and **whether the child is
  travelling as an unaccompanied minor** — the airline hands them to a named
  adult and will not release them to anybody else.
- A **transport supplier** with a dispatch number, an **out-of-hours number**,
  an account reference, a **rate card per vehicle type**, a **free waiting
  allowance in minutes**, and an hourly rate for waiting beyond it.
- A **booking agent per country**, with a contact, a phone, an out-of-hours
  phone and a working language. Agents book most students, and when something
  goes wrong at two in the morning the agent is who the centre rings.
- A **run**: which students, which vehicle, which supplier, which driver, the
  registration, the booking reference, who is meeting them.
- A **charge per run**: quoted, waiting minutes beyond the allowance, what
  the waiting cost, what was actually charged, a state (`receipted` /
  `invoiced` / `missing` / `disputed`), the receipt, and **plain English for
  why the invoice is not the quote**.

**Behaviour this has to support:**

- **Arrivals and departures are not the same problem reversed.** Arriving, the
  vehicle must be at the gate a fixed time *after* wheels-down. Leaving, it
  must be at the desk a fixed time *before* the flight. The prototype ran the
  arrivals formula on a departure and had a coach leaving the centre after the
  plane had taken off. If the model holds a "leave by" time, it has to know
  which direction it is.
- **Waiting inside the free allowance must never appear on a bill.** This is
  asserted in the prototype because it is the single most common way a
  transport invoice is wrong.
- Grouping students onto runs is a constraint problem — flights landing close
  together share a vehicle, subject to seats, and the centre trades waiting
  time against vehicle count. The prototype exposes that trade-off as a
  control rather than deciding it.
- A child with no flight on file **cannot be met**, and that is a safeguarding
  row, not an admin one.

---

## 9. Incidents — NEW

**Needs to exist** (`web/src/data/incidents.ts`):

- An **incident** with a timestamp, a kind, a **level** (`logged` /
  `significant` / `notifiable`), the students and staff involved, where it
  happened, what happened, what was done, who reported it, and a status.
- **When the safeguarding lead was informed** — nullable.
- **When the parents were informed** — nullable.
- A **follow-up**, nullable.

**Behaviour this has to support:**

- An incident log is not a diary. The questions asked afterwards, every time,
  are: was the safeguarding lead told, were the parents told, and how long did
  each take. Those are the two timestamps above and they are the reason the
  record exists.
- A **notifiable** incident needs a referral decision from the safeguarding
  lead. The decision is always a person's; recording that it was made is not
  optional.
- Open incidents with any of those unanswered belong in the queue.

---

## 10. Rooming — NEW

**Needs to exist** (`web/src/lib/allocate.ts`):

- **Rooms** with a capacity, a site and a band suitability.
- A **bed** per student, nullable until allocated.
- **Rules** the allocation runs against: do not mix bands, prefer not to put
  two speakers of the same first language together, keep a group together
  where possible.
- A **reason recorded for each placement**, so a parent asking "why is my
  child sharing with him" gets an answer.

**Behaviour this has to support:**

- Beds free up on the day a student leaves and are available to somebody
  arriving that same day. The prototype plans a whole season's arrivals
  against beds released day by day.
- A student on site with no bed is a safeguarding row.

---

## 11. The audit trail

**Needs to exist** (`web/src/lib/audit.ts`):

- An **entry** with a timestamp, an **actor**, an action, a subject, a detail,
  and a **category** (`safeguarding` / `rota` / `record` / `finance`).
- Entries are **appended and never edited or removed**. That is what makes it
  evidence rather than a log.

**Behaviour this has to support:**

- Every consequential action is written: chases, escalations, completions,
  rota changes, record edits, and **every read of the clinical record**.
- The **actor may be the platform**, not a user. An automatic escalation is
  attributed to Kadia because nobody did it.
- It has to export. A centre asked for evidence by an inspector needs a file,
  not a screen.

**Open question for David:** retention. How long does a trail survive after a
season ends, and does a student's record being deleted take their trail with
it? I assume not, but that is a legal question rather than a technical one.

---

## What I'm doing until this is settled

Unchanged: prototyping against **seeded fake data**, so the screens and their
logic can be designed, demoed to prospects, and argued about now, without
building on a schema that is still moving (Decision 0004).

The prototype doubles as the spec. It shows David exactly what the screens
read and write, and the ten solvers in it carry self-checks that assert the
things that would be silently wrong rather than loudly broken — a bed
allocated twice, a free waiting allowance billed, a departure vehicle leaving
after take-off. `npm run check` runs them outside a browser and CI runs them
on every push.

When the model is stable, the prototype gets rebuilt on it. Nothing in the
prototype is precious. The arguments in it are.
