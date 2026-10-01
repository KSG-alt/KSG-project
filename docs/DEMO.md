# The standalone demo

One file: `docs/kadia-demo-centre.html`. Double-click it, or attach it to an
email. No server, no install, no network. It opens on the centre's day, as
centre administrator.

It is also live at **[ksg-alt.github.io/KSG-project/kadia-demo-centre.html](https://ksg-alt.github.io/KSG-project/kadia-demo-centre.html)**, served by
GitHub Pages from the `docs/` folder of the `prototype/web-dashboard` branch.
Pushing a rebuilt `docs/kadia-demo-centre.html` to that branch updates the
link within a couple of minutes — send the link rather than the file when you
can, so nobody is looking at an old copy.

The head office side of the platform is not in this file. It exists in the
application — a role away, in Centre setup — and it will get its own demo when
there is somebody to show it to. Until then the only thing that ships is the
centre.

## What a viewer can actually do

Everything in the prototype works, because it is the prototype — the same
build, not a slideshow of it.

- Read the day's outstanding work on the home screen, safeguarding first.
- Open the menu and move through Reminders, Students, New arrivals, Room
  allocations, Staff, Timetable, Bookings, Payments, Incidents, the Audit
  trail, Centre setup and Ask Kadia.
- Open any student or staff member, from any screen that names them, for the
  whole record — stay, room, guardian, their week on the rota, money, DBS,
  availability, incidents and audit entries.
- Edit a reminder, complete it, delete it. Draft a chase and watch it land in
  the outbox as queued, not sent.
- Cancel a timetable session and watch only the affected group re-slot.
- Click any session on the timetable for its activity guide: how to run it
  step by step, who is on it today with their phone numbers, the group roll
  with anything outstanding flagged, the booking and its receipt, and the
  hazards, stop conditions and emergency contacts.
- Ask the timetable chat to draft the **whole week** — "generate the week and
  fill everyone to their contracted hours". It schedules six days of activity
  sessions and seven days of duty, then shows every person's hours against
  their own contract.
- Open any session's **plan**: how much of the slot survives the travel, who
  leads, who drives, and a minute-by-minute run sheet computed from the slot
  and the journey. **Getting there** carries the route, the meeting point, the
  vehicle and the step-free way in.
- Ask the timetable chat to draft the day — "no kayaking, and English for
  every group", "nothing off site", "rebuild Kestrel, mornings only". It
  builds it against cleared DBS, qualifications, availability, venue clashes
  and the working-time limit, then tells you everything it could not do. This
  works without an API key.
- Try to confirm a booking with no receipt and be blocked.
- Plan the arrival day. **Transfers** builds vehicle runs from the flights —
  one airport each, a D1 holder on anything that needs one, a named meeter on
  any run carrying an unaccompanied minor. The waiting control shows the real
  trade-off: 28 runs and 89.7h of vehicle time if nobody waits, 14 runs and
  44.5h if they will wait 150 minutes.
- Take a register. **Attendance** shows today's sessions, which were counted,
  which group was counted out and never counted back, and who was not there.
  Taking one closes its reminder; closing it closes the second one.
- Look at **Document portal**: what parents have sent and not been checked,
  and what has been chased twice and never opened. "What a parent sees" is the
  page behind the link.
- Plan the beds by asking. The chat beside the plan takes a specification —
  "never two of the same language", "just fill the gaps, leave everyone else
  alone", "replan the 8–11 band, ages within 1 year" — drafts it, and names
  anything it could not act on. Works without an API key.
- Or use the buttons. **Fill the gaps** places everyone without a room and
  leaves settled students alone; **Plan from scratch** replans the season. Both show
  what would change and why, and nothing moves until you apply it. Watch the
  same-language room count fall to zero, and watch it find beds freed by
  students who have already left.
- Match a payment that arrived with no reference, and watch the student's
  balance and the audit trail both move.
- Record an incident, and find you cannot close it until the safeguarding lead
  has been told.
- Open the **Audit trail** and produce an **Inspection pack** for any date
  range: staff vetting, ratios and registers, incidents, escalations, then the
  full trail — every figure computed from the records, gaps reported as gaps.
  Print it or save it as PDF. Producing one is itself logged.
- Change the ratio for an age band in Centre setup and watch the timetable's
  compliance verdict change with it. Change the escalation thresholds and watch
  the reminder queue re-rank.
- Switch to Activity staff in Centre setup: sections disappear from the menu,
  and dietary and medical notes stop being shown.
- Paste a spreadsheet into the importer — or use the sample — and get a row-by
  -row report of what would land and what would fail, before anything is
  written.

**Ask Kadia works without an API key.** It answers from the same records the
live assistant reads through its tools, on about fifteen topics, and declines
anything outside them rather than guessing. A key switches it to open
conversation, is entered in the panel, and is held only in that browser. The
timetable chat still needs a key to edit the rota by conversation.

## What it is not

The data is seeded and fake. Every screen says so, and the numbers are
generated, not measured.

The centre is fictional and deliberately unnamed — naming a real school would
imply a customer that does not exist. The **venues around it are real**, so the
routes, stations, entrances and map links are true and checkable: The Pirate
Castle on Oval Road NW1, The Hub in Regent's Park NW1, the Natural History
Museum on Cromwell Road SW7 (school groups use the Exhibition Road entrance),
and VauxWall in the arches under Vauxhall station SW8. Which activity a
fictional summer school runs at each is part of the scenario; the places and
the journeys are not invented. There is no live centre behind it, no customer, and
no benchmark. Do not describe it as anything else.

The blocked-arrival and outstanding-document counts come from the seed's
generated rates. They demonstrate that the checks work; they are not a claim
about what a real centre's numbers look like.

Five things are deliberately shown as unbuilt rather than faked: the Google
connection, sending a queued chase, writing an imported spreadsheet to the
roll, the parent portal's sending and file storage, and the staff app the
registers would be taken on. Each says so on its own screen. Nothing in this
demonstration reaches a parent, and nothing syncs between devices. Each says so on the screen. The ratio verdict is a stand-in for the rota
engine David owns, and `web/src/lib/ratio.ts` says so at the top.

## Regenerating it

After any change to the app:

```
cd web
npm run build
node build-demo.mjs
```

The build fails loudly rather than silently shipping a broken file: it throws
if any asset path or font stylesheet reference survives inlining, since either
would mean the demo needs the network to render.

`web/fonts/geist-inline.css` holds the Geist faces as data URIs. It only needs
regenerating if the typeface changes.
