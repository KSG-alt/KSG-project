/* ── SEAM ──────────────────────────────────────────────────────────────────
   Ratio compliance is Seat 1's engine (David). This surface asks and shows;
   it never owns the rule. Everything below is a stand-in that answers the
   same question shape, so the call sites do not change when the real engine
   lands. Replace the body, keep the signature.
   See docs/interface-contract.md §2.
   ──────────────────────────────────────────────────────────────────────── */

import {
  GROUPS, STAFF, STUDENTS, activityById, isAway, type Session, type Staff,
  type Student,
} from '../data/seed';

/* The records the verdict is computed against. Defaulted to the seed so every
   existing call site is unchanged — the point of the seam is that call sites
   do not move when David's engine lands. */
export interface RatioRecords {
  students: Student[];
  staff: Staff[];
}

export interface RatioVerdict {
  compliant: boolean;
  required: number;
  assigned: number;
  headcount: number;
  ratio: number;
  reasons: string[];
}

export function checkRatio(
  session: Session,
  records: RatioRecords = { students: STUDENTS, staff: STAFF },
): RatioVerdict {
  const { students, staff } = records;
  const group = GROUPS.find((g) => g.id === session.groupId)!;
  /* Who is actually here on the day of the session. Counting everybody ever
     booked into the group demanded staff for children still at home, and put
     them on the register as present — a ratio computed against absent
     children is not a ratio, and a register naming them is worse. */
  const headcount = students.filter(
    (s) =>
      s.groupId === group.id && s.arrival <= session.day && s.leaving >= session.day,
  ).length;
  const required = Math.ceil(headcount / group.ratio);
  const assigned = session.staffIds.length;
  const reasons: string[] = [];

  if (assigned < required) {
    reasons.push(
      `${assigned} of ${required} staff assigned for ${headcount} students at 1:${group.ratio}`,
    );
  }

  const uncleared = session.staffIds
    .map((id) => staff.find((s) => s.id === id)!)
    .filter((s) => s && s.dbs.state !== 'cleared');

  uncleared.forEach((s) => {
    reasons.push(`${s.forename} ${s.surname} — DBS ${s.dbs.state}`);
  });

  /* Somebody who has told the centre they are away is not cover, however
     cleared they are. The draft was generated before they said so. */
  session.staffIds
    .map((id) => staff.find((s) => s.id === id)!)
    .filter((s) => s && isAway(s, session.day))
    .forEach((s) => {
      reasons.push(`${s.forename} ${s.surname} is away on this day`);
    });

  /* One qualified instructor is enough; the rest are cleared cover. */
  const activity = activityById(session.activityId);
  if (activity.requiresQual) {
    const held = session.staffIds.some((id) =>
      staff.find((s) => s.id === id)?.quals.includes(activity.requiresQual!),
    );
    if (!held) {
      reasons.push(`No one assigned holds ${activity.requiresQual}`);
    }
  }

  return {
    compliant: reasons.length === 0,
    required,
    assigned,
    headcount,
    ratio: group.ratio,
    reasons,
  };
}
