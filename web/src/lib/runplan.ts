/* ── The run plan ─────────────────────────────────────────────────────────
   A guide says what to do. A plan says when, and who does it.

   The times are computed from the slot and the travel, not written down, so
   a session moved to another slot or another venue gets a plan that is still
   right. The one thing a leader most needs to know is how much of the slot is
   actually left after getting there and back, and that falls out of the same
   arithmetic.
   ──────────────────────────────────────────────────────────────────────── */

import { activityById, groupById, staffById, type Session } from '../data/seed';
import { guideFor } from '../data/guides';
import { venueFor } from '../data/venues';

export type Who = 'Lead' | 'Second' | 'Everyone';

export interface PlanStep {
  at: string;
  who: Who;
  what: string;
  kind: 'prep' | 'travel' | 'session' | 'close';
}

export interface Plan {
  steps: PlanStep[];
  travelMinutes: number;
  /* What is left of the slot once travel, setup and packing down are out. */
  activityMinutes: number;
  /* True when the travel does not fit the slot at all. */
  tooTight: boolean;
  lead: string | null;
  second: string | null;
  driver: string | null;
  needsDriver: boolean;
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => {
  const w = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`;
};

const SETUP = 10;
const PACKDOWN = 10;

export function runPlan(session: Session): Plan {
  const a = activityById(session.activityId);
  const g = guideFor(session.activityId);
  const v = venueFor(a.location);
  const group = groupById(session.groupId);

  const travel = v?.minutes ?? 0;
  const s = mins(session.start);
  const e = mins(session.end);

  const crew = session.staffIds.map((id) => staffById(id)).filter(Boolean);
  /* The lead is whoever holds the qualification the activity needs; failing
     that, the first person on it. */
  const leadStaff =
    (a.requiresQual
      ? crew.find((x) => x.quals.includes(a.requiresQual!))
      : undefined) ?? crew[0];
  const secondStaff = crew.find((x) => x.id !== leadStaff?.id);
  const driverStaff = v?.needsDriver
    ? crew.find((x) => x.quals.includes('Minibus D1'))
    : undefined;

  const name = (x?: { forename: string; surname: string }) =>
    x ? `${x.forename} ${x.surname}` : null;

  const activityMinutes = e - s - travel * 2 - SETUP - PACKDOWN;
  const tooTight = activityMinutes <= 0;

  const steps: PlanStep[] = [];
  const add = (at: number, who: Who, what: string, kind: PlanStep['kind']) =>
    steps.push({ at: clock(at), who, what, kind });

  /* Before the slot. */
  add(
    s - 20,
    'Lead',
    g
      ? `Collect the kit and check it — ${g.kit.length} items on the list. Anything missing is found now, not at the ${a.location.toLowerCase()}.`
      : 'Collect and check the kit.',
    'prep',
  );
  if (v?.needsDriver) {
    add(
      s - 20,
      'Lead',
      driverStaff
        ? `${name(driverStaff)} takes the minibus — check fuel, and that the D1 licence is in the cab folder.`
        : 'No one on this session holds Minibus D1. The session cannot travel as staffed.',
      'prep',
    );
  }
  add(
    s - 10,
    'Everyone',
    `Be at ${v?.meetAt ?? a.location}. Students arrive from ${group.name}.`,
    'prep',
  );
  add(s - 5, 'Lead', 'Take the register here, before you move.', 'prep');

  /* Getting there. */
  if (travel > 0) {
    add(
      s,
      'Everyone',
      `Leave — ${v?.travel ?? 'on foot'}, ${travel} minutes. ` +
        (v?.travel === 'coach' || v?.travel === 'minibus'
          ? 'Count on, and say the number out loud to the second staff member.'
          : 'Staff at the front and the back.'),
      'travel',
    );
    add(s + travel, 'Lead', 'Arrive and count again before anything else.', 'travel');
  }

  /* Setting up and running it. The guide's own steps, spread across the time
     that is actually left. */
  const open = s + travel;
  add(
    open,
    'Second',
    g?.before[0] ?? 'Set up while the lead holds the group.',
    'session',
  );

  const runStart = open + SETUP;
  const runEnd = e - travel - PACKDOWN;
  const during = g?.during ?? [];
  if (during.length && !tooTight) {
    const step = Math.max(1, Math.floor((runEnd - runStart) / during.length));
    during.forEach((line, i) => {
      add(runStart + i * step, i === 0 ? 'Lead' : 'Everyone', line, 'session');
    });
  } else if (during.length) {
    add(runStart, 'Lead', during[0], 'session');
  }

  /* Closing down and getting back. */
  add(runEnd, 'Everyone', g?.after[0] ?? 'Pack down.', 'close');
  add(
    e - travel - 5,
    'Lead',
    'Register before you leave. The number has to match the one you wrote down.',
    'close',
  );
  if (travel > 0) {
    add(e - travel, 'Everyone', `Return — ${travel} minutes.`, 'close');
  }
  add(
    e,
    'Lead',
    `Back at the centre. Register, hand the group to ${
      session.start >= '14:00' ? 'the free-time duty staff' : 'the next session'
    }, and log anything that went wrong today.`,
    'close',
  );

  return {
    steps: steps.sort((x, y) => mins(x.at) - mins(y.at)),
    travelMinutes: travel * 2,
    activityMinutes: Math.max(0, activityMinutes),
    tooTight,
    lead: name(leadStaff),
    second: name(secondStaff),
    driver: name(driverStaff),
    needsDriver: Boolean(v?.needsDriver),
  };
}

/* One runnable check: the arithmetic that decides whether a session fits its
   slot, which is the number a leader would otherwise discover on the coach. */
export function selfCheck() {
  const base = {
    id: 'x', groupId: 'g-kestrel', day: '2027-07-12',
    staffIds: [], status: 'scheduled' as const, origin: 'manual' as const,
  };
  /* Lower field is an 8-minute walk: 90 − 16 − 20 = 54 minutes of archery. */
  const near = runPlan({ ...base, activityId: 'a-archery', start: '09:00', end: '10:30' });
  console.assert(near.activityMinutes === 54, `near slot: ${near.activityMinutes}`);
  console.assert(!near.tooTight, 'an 8-minute walk fits a 90-minute slot');

  /* The city is 45 each way, so a 90-minute slot cannot hold it at all. */
  const far = runPlan({ ...base, activityId: 'a-museum', start: '09:00', end: '10:30' });
  console.assert(far.tooTight, 'a 45-minute coach each way cannot fit 90 minutes');
  console.assert(far.activityMinutes === 0, 'no negative activity time');

  console.assert(
    near.steps.every((s, i, all) => i === 0 || s.at >= all[i - 1].at),
    'steps come out in time order',
  );
}
