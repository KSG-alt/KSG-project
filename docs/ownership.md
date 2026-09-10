# Ownership

From the launch roadmap (10 Sep 2026). Each seat owns its lane end-to-end.
In practice all three overlap constantly — a clear owner per lane is what
stops things falling through the cracks, not a wall.

## Seat 1 — David (Technical / Build)

- Architecture and the core data model (students, staff, groups, bookings,
  payments). **Built first — everything else depends on it.**
- Staff mobile app, in full: My Shifts, My Team, Team channel, Notifications.
  No pay module (Decision 0001).
- Rota builder and ratio-compliance engine.
- Safeguarding audit trail.
- Payment reconciliation / matching — the hardest remaining integration.

Rationale: these are the safeguarding-critical, spec-dependent and
highest-integration-risk pieces.

## Seat 2 — Ismail (Sales & Client-Facing, plus build)

Sales lane, which is the long pole:

- Pipeline, outreach, discovery, pilot contracting, relationship management.

Build lane, part of the admin dashboard:

- Automated document & payment reminder tracker, with escalation.
- Group & activity timetabling, with automatic re-slotting.
- Centre setup & configuration screens — data import, age bands, ratio
  configuration, WhatsApp channel links.

Built once David's data model is stable, in parallel with ongoing sales work.
See [interface-contract.md](interface-contract.md).

**Watch this seat.** It is the only one split two ways. If sales cadence and
build both start slipping, rebalance early — shift admin-dashboard scope to
David, or slow the build. The sales cycle is the thing that can't be
recovered late.

## Seat 3 — Kebba (Safeguarding & Frontline Ops) — joins October 2026

- **Week 1 priority:** the functional spec David builds against — exact ratio
  rules by age band, DBS/qualification checks, escalation thresholds
  (safeguarding-critical faster than administrative), and what an audit trail
  must contain to stand up to Ofsted / British Council inspection. This is
  what unblocks the compliance build.
- Reviews and sharpens the pilot target list.
- Acceptance testing against real operational scenarios.
- Onboarding materials, data-import templates, ratio configuration guide,
  training for centre admin and activity staff.
- Joins key prospect calls as the domain-credibility voice.

## Crossing lanes

Nobody builds a second copy of someone else's thing. Open an issue, stub it
with `TODO(owner):`, keep moving. See [../CONTRIBUTING.md](../CONTRIBUTING.md).
