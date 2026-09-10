# Working in this repo

Three people building separate parts of one system. The rules below exist to
stop us overwriting each other and to stop anyone being blocked waiting on
someone else.

## Branches

- `main` is always working. Never commit to it directly.
- Branch per piece of work, named `<owner>/<what>`:
  - `david/data-model`, `david/rota-engine`
  - `ismail/reminder-tracker`, `ismail/timetabling`
  - `kebba/ratio-spec`
- Open a pull request into `main`. Someone else reviews it. Then merge.

Small PRs merged often beat one big PR at the end of the month. If a branch
has been open more than about a week, it's too big.

## Reviews

- Anything touching the **data model**, the **rota/ratio engine** or the
  **safeguarding audit trail** needs David's review. These are the
  safeguarding-critical and spec-dependent pieces.
- Anything encoding a **ratio rule, DBS check, escalation threshold or
  audit-trail requirement** needs Kebba's review once she joins in October.
  Nobody else is qualified to sign that off, and it's the part that has to
  stand up to an Ofsted / British Council inspection.
- Everything else: any one of the other two.

CODEOWNERS requests these reviewers automatically.

## Crossing a boundary

You will need something from someone else's area. When that happens:

1. **Don't build a private copy of it.** Two versions of the ratio logic is
   exactly the failure this repo is meant to prevent.
2. Open an issue describing what you need and who owns it.
3. If you're blocked *now*, stub it behind a clearly-named placeholder
   (`TODO(david): real ratio check`) and carry on. Note it in the PR so it
   doesn't get forgotten.

## Commits

Present tense, say what changed and why if it isn't obvious:

    add escalation threshold to reminder tracker
    fix ratio check counting withdrawn students

## Before you open a PR

- It runs.
- You've tried the thing you changed.
- No real student, staff or parent data anywhere in the diff — see below.

## Real data — the hard rule

This system will hold children's medical forms, consent forms, passport
copies, DBS status and safeguarding incident records.

**Never commit real data.** Not a real student, not a real staff member, not
a sample export from a prospect's spreadsheet, not "just for testing". Use
seeded fake data.

`.gitignore` blocks the obvious cases, but it can't catch everything. This one
is on us, and getting it wrong with this particular data set is not a bug —
it's a safeguarding and GDPR incident, in a sector that will not forgive it.

## Syncs

- Weekly David/Ismail sync now.
- Weekly three-way from October, once Kebba joins.
- Decisions that change scope, dates or ownership go in
  [DECISIONS.md](DECISIONS.md) — in the repo, not just in the meeting.
