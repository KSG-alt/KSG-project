# Assumptions the prototype makes — for Kebba to correct

**Written 29 Sep 2026, for week 1.**
**Owner of this document:** Ismail (states the guess) · **Owner of the answer:** Kebba (states the rule)

## What this is, and why it is not a blank page

Per [ownership.md](ownership.md), the week-1 priority for Seat 3 is the
functional spec David builds against: exact ratio rules by age band, DBS and
qualification checks, escalation thresholds, and what an audit trail must
contain to stand up to Ofsted or British Council inspection.

The prototype has already had to answer every one of those questions, because
a demonstration cannot show a blank field. **Every answer in it is a guess made
to make a screen work.** None of them came from an inspection framework, a
provider handbook or anyone who has run a centre. Several are probably wrong,
and one or two are probably wrong in ways that would matter.

So rather than a blank page: here is every guess, numbered, with what it is,
where it lives, and why it was chosen. Correcting a specific wrong number is
faster than authoring a spec from nothing, and it produces the same document
at the end.

**How to use it.** Answer each item one of three ways:

- **Right** — keep it.
- **Wrong, it's X** — give the real value or rule.
- **Wrong question** — the thing the prototype is modelling is not how it
  works, and here is what it actually is. These are the most valuable answers
  and the ones a blank page would never have produced.

Anything marked **[BLOCKS DAVID]** changes the data model rather than a
number, so it is worth answering first even if the answer is rough.

---

## A. Ratios

**Where:** `web/src/data/centre.ts` · `BAND_RULES`

| # | Assumption | Value used |
|---|---|---|
| A1 | Age bands are 8–11, 12–14, 15–17 | three bands |
| A2 | Daytime ratio, youngest band | 1 staff : 8 students |
| A3 | Daytime ratio, middle band | 1 : 10 |
| A4 | Daytime ratio, oldest band | 1 : 12 |
| A5 | Night ratio is looser than day | 1:12 / 1:15 / 1:20 |
| A6 | Off-site ratio is tighter than day | 1:6 / 1:8 / 1:10 |
| A7 | The oldest band may have supervised free time; the younger two may not | — |

**Why these:** they are plausible-looking numbers that make the demo's
arithmetic work. That is the entire justification. A2–A6 are the ones most
likely to be wrong.

**[BLOCKS DAVID] A8.** The prototype assumes **three** ratios per band — day,
night, off-site — because one number could not express the rule. Is three
right, or are there more? Water activities, minibus travel, overnight
excursions and swimming are all plausible fourth cases.

**A9.** Ratios are assumed to be **per centre, configurable**, not fixed by
law. Is any of this statutory, and if so which parts cannot be configured down?

**A10.** The prototype counts a session compliant on **headcount and staff
count alone**. Does anything else count — a named first-aider present, a
minimum of two adults regardless of ratio, a same-sex staff requirement for
overnight?

---

## B. DBS and who may work

**Where:** `web/src/data/seed.ts` · `web/src/lib/cover.ts`

| # | Assumption | Value used |
|---|---|---|
| B1 | DBS has four states | `cleared`, `expiring`, `pending`, `missing` |
| B2 | Anyone not `cleared` cannot be rota'd **at all** | hard block |
| B3 | `pending` is treated exactly like `missing` for rota purposes | hard block |
| B4 | A DBS carries a certificate number, issue date and expiry | four fields |
| B5 | Staff are cleared for specific **age bands**, and working outside them is an error | per-person band list |
| B6 | Activities carry a **qualification requirement** the staff member must hold | per-activity string |

**[BLOCKS DAVID] B7.** Is B2/B3 right? There is a real-world practice of
supervised work while a DBS is pending. If that is allowed, the model needs a
supervision relationship it currently has no field for, and "cannot be rota'd"
becomes "cannot be rota'd unsupervised", which is a different rule and a
different screen.

**B8.** What is `expiring` — how many days before expiry does it start, and
does it block anything or only warn? The prototype warns and permits.

**B9.** Are there checks besides DBS? Right to work, overseas police checks
for non-UK seasonal staff, a barred-list check separate from the DBS itself,
safeguarding training with its own expiry. The prototype models **none** of
these.

---

## C. Escalation

**Where:** `web/src/lib/reminders.ts` · `ESCALATION_DEFAULTS`, `ESCALATES_TO`

| # | Assumption | Value used |
|---|---|---|
| C1 | Three severities | `safeguarding`, `overdue`, `admin` |
| C2 | Safeguarding escalates after | **1 day** overdue |
| C3 | Administrative-overdue escalates after | **3 days** |
| C4 | Routine admin escalates after | **7 days** |
| C5 | Safeguarding escalates to | safeguarding lead **and** centre director |
| C6 | Everything else escalates to | centre director |
| C7 | Escalation is **automatic** at the threshold, not a decision | fires on read |
| C8 | Thresholds are configurable per centre | yes |

**Why these:** PRODUCT.md principle 2 says safeguarding escalates faster than
admin. The specific numbers 1 / 3 / 7 are invented.

**C9.** Is one day right for safeguarding, or is it hours? A child on site
without a consent form is arguably a same-day escalation, not a next-day one.

**[BLOCKS DAVID] C10.** Is automatic escalation correct, or does something
have to be *decided* rather than *fired*? The prototype recently changed from
a button to a threshold on the argument that an admin who has to notice the
overdue item is doing the job the system claimed to do. If any escalation is a
judgement rather than a rule, say which — the model would then need to hold
both kinds.

**C11.** Does escalation ever go **outside the centre** — to a head office, a
local authority designated officer, a provider body? The prototype's
escalation targets are all internal, which may be the largest gap in it.

---

## D. The audit trail

**Where:** `web/src/lib/audit.ts`

| # | Assumption | Value used |
|---|---|---|
| D1 | Four categories | `safeguarding`, `rota`, `record`, `finance` |
| D2 | Each entry carries timestamp, actor, action, subject, detail | five fields |
| D3 | Entries are appended and never edited or deleted | append-only |
| D4 | **Every read** of the clinical record is logged, not just writes | read-logging on |
| D5 | The actor may be the platform, not a person, when something fires automatically | `Kadia` as actor |
| D6 | It exports to CSV | one file |

**[BLOCKS DAVID] D7.** What does an inspector actually ask for? The whole
design of D1–D6 is a guess at what evidence looks like. If the real answer is
"a named person signed this on this date", the trail needs signatures and it
does not have them.

**D8.** Retention. How long does a trail survive after a season ends? Does
deleting a student's record take their trail with it? The prototype assumes
not, but that is a legal question.

**D9.** Is read-logging on the clinical record right, or is it noise that
buries the writes? It generates far more rows than anything else in the
prototype.

---

## E. The clinical record

**Where:** `web/src/data/health.ts` · settled provisionally as
[Decision 0005](../DECISIONS.md)

| # | Assumption | Value used |
|---|---|---|
| E1 | Clinical data is declared by the **family at booking**, not typed by centre staff | source `booking` |
| E2 | It becomes actionable only when **head office** verifies it | states `declared` / `verified` / `queried` |
| E3 | **Nobody at the centre** may enter, edit or delete a medication | hard rule |
| E4 | Centre staff may read it and record what they gave | separate permission |
| E5 | No written guardian consent means **no dose may be given** | hard block |
| E6 | Allergy severities are `mild`, `severe`, `anaphylaxis` | three |
| E7 | A dose should be **witnessed** by a second person | recorded, not enforced |
| E8 | A refused dose is recorded as refused, with a reason | not a gap |
| E9 | Where an auto-injector is kept matters as much as that it exists | `keptWhere` |

**Why these:** Decision 0005 argues that a seasonal staff member retyping a
dose off a WhatsApp message is how the wrong amount of insulin gets given, and
that verification belongs with the group that is continuous across the season
and can ring the family.

**[BLOCKS DAVID] E10.** Is E3 workable in practice? It means a child arriving
with a medication nobody declared cannot be helped until head office acts. Is
there an emergency path, and if so who may use it and what does it record?

**E11.** Who signs off a verification — any head office person, or a named
role with a qualification? The prototype records a name and no credential.

**E12.** Open half of Decision 0005: an agent books most students. Does the
declaration come **through the agent** or **direct from the family**? This
decides who the portal link is sent to and nobody has answered it.

**E13.** Is E7 (witnessed doses) good practice, required, or neither? The
prototype records a witness on about 60% of doses to make the screen look
real, which is an invented number.

---

## F. Incidents

**Where:** `web/src/data/incidents.ts`

| # | Assumption | Value used |
|---|---|---|
| F1 | Three levels | `logged`, `significant`, `notifiable` |
| F2 | Six kinds | injury, behaviour, safeguarding concern, missing student, medical, property |
| F3 | The two numbers that matter are **time to safeguarding lead** and **time to parents** | both timestamped |
| F4 | A `notifiable` incident needs a **referral decision by a person**, recorded | never automatic |
| F5 | An incident is open until closed, and open ones with gaps enter the queue | status flag |

**F6.** Is there a **time limit** on F3 — must the safeguarding lead be told
within N minutes, and the parents within N hours? The prototype measures the
elapsed time and sets no target, which means it can show a number but cannot
say whether it is acceptable.

**[BLOCKS DAVID] F7.** Is "notifiable" a single state, or does the model need
to record **which body** was notified and when — local authority, police,
provider, insurer? The prototype has one flag and no external party.

**F8.** Is a missing-student incident the same record shape as a grazed knee?
They are the same table in the prototype, which may be wrong.

---

## G. Documents

**Where:** `web/src/data/portal.ts`

| # | Assumption | Value used |
|---|---|---|
| G1 | Three document kinds | medical, consent, passport |
| G2 | Medical and consent are **safeguarding-critical**; passport is admin | severity split |
| G3 | The portal shows three piles: waiting on them, waiting on us, accepted | no "everything" view |
| G4 | A link chased twice and never opened means a **wrong email address** | prompts to check, not chase |
| G5 | A rejected document comes back with a reason a parent can act on | free text |

**G6.** Is G1 the real list? Off-site travel consent, photo consent, dietary
declaration, insurance and an EHIC/GHIC equivalent are all plausible and none
are modelled as separate documents.

**G7.** Is G2 the right split? The prototype makes the passport copy admin
severity, which feels wrong for a child arriving from abroad.

---

## H. Rooming

**Where:** `web/src/lib/allocate.ts`

| # | Assumption | Value used |
|---|---|---|
| H1 | A room holds **one age band**, and that is a hard rule | hard |
| H2 | Inside a band, keep the age gap small where there is a choice | **2 years** |
| H3 | Avoid putting two speakers of the same **first language** in a room | soft by default, can be set to `never` |
| H4 | A **reason is recorded** for every placement, so a parent asking "why is my child sharing with him" gets an answer | free text |
| H5 | Beds free on a student's leaving day and are reusable **that same day** | same-day turnover |
| H6 | The allocator **proposes**; a person applies it | never automatic |

**[BLOCKS DAVID] H7 — sex and gender.** The prototype **deliberately does not
guess this.** The configuration carries `genderPolicy: 'not configured'`, the
screen says it is unset, and if you ask the planner in words to room by gender
it refuses and says the rule is unset until the centre specifies it. That was
the right call for a demo — inventing a policy would have put a guess into a
safeguarding-adjacent decision — but it is a hole in the model, and it is
almost certainly the largest single one. It needs an answer before David
builds. Specifically: is it a hard rule, is it per centre, is it per age band,
and what are the words for it.

**H8.** Is H1 hard or soft? Siblings in different bands are a real case, and
the prototype cannot express the exception.

**H9.** Is 2 years the right spread, and does it vary by band? A two-year gap
means more at 8–11 than at 15–17.

**H10.** Is same-day turnover realistic, or is there a cleaning window?

---

## I. Transport and arrivals

**Where:** `web/src/data/travel.ts` · `web/src/data/suppliers.ts`

| # | Assumption | Value used |
|---|---|---|
| I1 | Be at the desk **150 minutes** before a departing flight | constant |
| I2 | Meet an arriving child **35 minutes** after wheels-down | `AFTER_LANDING = 35` |
| I2b | Road time from each airport to the centre | 45–85 min, per airport |
| I3 | Flights landing within **15 minutes** of each other share a vehicle | grouping window |
| I4 | A child with **no flight on file cannot be met**, and that is safeguarding | hard block |
| I5 | An unaccompanied minor is handed to a **named adult** and nobody else | flag |
| I6 | A child leaving **owing money** blocks the departure run being built | hard block |

**I7.** Is I1 right for a group of thirty children, or is it longer?

**[BLOCKS DAVID] I8.** For I5 — does the named adult have to be recorded in
advance, with ID? The prototype names whoever is meeting the run, which is
probably not the same thing as the airline's named releasee.

**I9.** Is I6 a real policy or an overreach? Refusing to move a child over a
balance may not be something a centre would ever actually do.

---

## J. Hours and contracts

**Where:** `web/src/data/seed.ts` · `WEEKLY_LIMIT`

| # | Assumption | Value used |
|---|---|---|
| J1 | Weekly hours cap | **48h** |
| J2 | The cap counts both **activity sessions and duty shifts** | combined |
| J3 | Seasonal staff have a **contract with start and end dates**, and rota'ing outside them is an error of the same class as rota'ing someone on holiday | hard block |
| J4 | Staff declare **away days** separately from their contract | two mechanisms |

**J5.** Is 48h right, and is it a legal cap, a policy, or a preference? Does
night duty count the same as an activity hour?

**J6.** Is there a **minimum rest period** between shifts, or a maximum number
of consecutive days? The prototype has neither, and a rota it generates could
legitimately give someone fourteen days straight.

---

## The five to answer first

If week 1 is short, these are the ones that change the data model rather than
a number, so David is building against them either way:

1. **H7** — sex/gender rule on rooming. Deliberately left unset, not guessed.
2. **B7** — may someone work supervised while a DBS is pending?
3. **E10** — is there an emergency path around "no centre staff may enter a
   medication"?
4. **C10 / C11** — is escalation a rule or a judgement, and does it ever leave
   the centre?
5. **D7** — what does an inspector actually ask to see?

Everything else is a number that can be changed in an afternoon.
