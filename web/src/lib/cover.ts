/* ── Finding cover ────────────────────────────────────────────────────────
   The rota is built once a week and broken every morning. Somebody rings in
   sick at 07:00 and a person with a clipboard has twenty minutes to work out
   who can legally stand in — on each session and each duty, for the rest of
   the day, without breaking a ratio, a qualification requirement or the
   working-hours limit, and without moving somebody who is already somewhere
   else at that hour.

   That is arithmetic against four constraints, done under time pressure by
   somebody who has not had breakfast. It is the single most automatable job
   in a centre, and it is asked for in words: "Yusuf is off sick today, who
   covers him?" So it is a tool Kadia can run, not a screen to fill in.

   What this does NOT do: send anybody a message, or change the rota. It
   proposes; a person applies it. Cover that assigns itself is how somebody
   ends up not knowing they were meant to be at the climbing wall.
   ──────────────────────────────────────────────────────────────────────── */

import { BAND_RULES } from '../data/centre';
import { buildDuties, type Duty } from '../data/duty';
import {
  SESSIONS, STAFF, STUDENTS, WEEKLY_LIMIT, WEEK_DAYS, activityById, groupById,
  isAway, weeklyHours, type Session, type Staff, type Student,
} from '../data/seed';

export interface Candidate {
  staff: Staff;
  /* Hours they already have this week, so the load spreads rather than
     landing on whoever comes first alphabetically. */
  hours: number;
  /* Why this one rather than the next. */
  why: string[];
}

export interface Gap {
  /* What needs covering. */
  what: string;
  when: string;
  kind: 'session' | 'duty';
  id: string;
  /* Everyone who could legally do it, best first. */
  candidates: Candidate[];
  /* Why the obvious people cannot. Named, because "nobody is free" is not an
     answer a centre director accepts. */
  blocked: { name: string; reason: string }[];
}

export interface CoverPlan {
  staff: Staff;
  day: string;
  gaps: Gap[];
  /* Gaps with nobody who can legally fill them. The reason to ring an agency
     at 07:30 rather than 11:00. */
  unfillable: Gap[];
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  mins(aStart) < mins(bEnd) && mins(bStart) < mins(aEnd);

const bandOf = (s: Session) => groupById(s.groupId).band;

export function findCover(
  staffId: string,
  day: string,
  records: {
    staff: Staff[];
    sessions: Session[];
    duties: Duty[];
    students: Student[];
  },
): CoverPlan | null {
  const off = records.staff.find((x) => x.id === staffId);
  if (!off) return null;

  const todaySessions = records.sessions.filter(
    (s) => s.day === day && s.status !== 'cancelled' && s.staffIds.includes(staffId),
  );
  const todayDuties = records.duties.filter(
    (d) => d.day === day && d.staffIds.includes(staffId),
  );

  /* Where everybody else already is today, so nobody is offered twice for the
     same hour. Built once and added to as cover is proposed — offering the
     same person for two 09:00 sessions is the mistake this whole exercise is
     supposed to prevent. */
  const busy = new Map<string, { from: number; to: number }[]>();
  records.sessions
    .filter((s) => s.day === day && s.status !== 'cancelled')
    .forEach((s) =>
      s.staffIds.forEach((id) =>
        busy.set(id, [...(busy.get(id) ?? []), { from: mins(s.start), to: mins(s.end) }]),
      ),
    );
  records.duties
    .filter((d) => d.day === day)
    .forEach((d) =>
      d.staffIds.forEach((id) =>
        busy.set(id, [...(busy.get(id) ?? []), { from: mins(d.start), to: mins(d.end) }]),
      ),
    );

  const free = (id: string, start: string, end: string) =>
    !(busy.get(id) ?? []).some((b) => mins(start) < b.to && b.from < mins(end));

  const hours = new Map<string, number>();
  records.staff.forEach((x) =>
    hours.set(x.id, weeklyHours(x.id, records.sessions)),
  );

  const consider = (
    need: { start: string; end: string; band?: string; qual?: string | null },
  ) => {
    const candidates: Candidate[] = [];
    const blocked: Gap['blocked'] = [];
    const length = (mins(need.end) - mins(need.start)) / 60;

    records.staff
      .filter((x) => x.id !== staffId)
      .forEach((x) => {
        const name = `${x.forename} ${x.surname}`;
        if (x.dbs.state !== 'cleared') {
          blocked.push({ name, reason: `DBS is ${x.dbs.state}. Cannot be with students at all.` });
          return;
        }
        if (isAway(x, day)) {
          blocked.push({ name, reason: 'Told the centre they are not available today.' });
          return;
        }
        if (!free(x.id, need.start, need.end)) {
          blocked.push({ name, reason: `Already rota'd somewhere at ${need.start}.` });
          return;
        }
        if (need.band && !x.bands.includes(need.band as Staff['bands'][number])) {
          blocked.push({ name, reason: `Not signed off for the ${need.band} band.` });
          return;
        }
        if (need.qual && !x.quals.includes(need.qual)) {
          blocked.push({ name, reason: `No ${need.qual}, which this activity requires.` });
          return;
        }
        const has = hours.get(x.id) ?? 0;
        if (has + length > WEEKLY_LIMIT) {
          blocked.push({
            name,
            reason: `On ${has.toFixed(1)}h this week. Another ${length}h breaks the ${WEEKLY_LIMIT}h limit.`,
          });
          return;
        }

        const why: string[] = [];
        if (need.qual) why.push(`Holds ${need.qual}`);
        if (need.band) why.push(`Works the ${need.band} band`);
        why.push(`${has.toFixed(1)}h this week, room for ${(WEEKLY_LIMIT - has).toFixed(1)}h more`);
        if (x.safeguardingLead) why.push('Safeguarding lead');
        candidates.push({ staff: x, hours: has, why });
      });

    /* Fewest hours first: cover should land on whoever has room, not on
       whoever is most willing to say yes. */
    candidates.sort((a, b) => a.hours - b.hours);
    return { candidates, blocked };
  };

  const gaps: Gap[] = [];

  todaySessions.forEach((s) => {
    const activity = activityById(s.activityId);
    const band = bandOf(s);
    const { candidates, blocked } = consider({
      start: s.start,
      end: s.end,
      band,
      qual: activity.requiresQual,
    });
    const rule = BAND_RULES.find((b) => b.band === band);
    gaps.push({
      kind: 'session',
      id: s.id,
      what: `${activity.name} · ${groupById(s.groupId).name}`,
      when: `${s.start}–${s.end}`,
      candidates: candidates.slice(0, 5),
      blocked: blocked.slice(0, 5),
    });
    /* Ratio is the reason this matters: one person short on a band of eight
       is not an inconvenience, it is a session that cannot legally run. */
    if (rule && s.staffIds.length <= 1) {
      gaps[gaps.length - 1].what += ` — last staff member on it, ratio 1:${rule.ratio}`;
    }
  });

  todayDuties.forEach((d) => {
    const { candidates, blocked } = consider({ start: d.start, end: d.end });
    gaps.push({
      kind: 'duty',
      id: d.id,
      what: /duty/i.test(d.kind) ? d.kind : `${d.kind} duty`,
      when: `${d.start}–${d.end}`,
      candidates: candidates.slice(0, 5),
      blocked: blocked.slice(0, 5),
    });
  });

  gaps.sort((a, b) => mins(a.when) - mins(b.when));

  return {
    staff: off,
    day,
    gaps,
    unfillable: gaps.filter((g) => g.candidates.length === 0),
  };
}

/* "Yusuf is off sick today" → the person, and the day. Kadia is asked this in
   words, not with a form. */
export function parseCover(
  query: string,
  staff: Staff[],
  today: string,
): { staffId: string; day: string } | null {
  const q = query.toLowerCase();
  if (!/\b(cover|sick|off|ill|absent|replace|stand in)\b/.test(q)) return null;

  const match = staff.find((s) => {
    const first = s.forename.toLowerCase();
    const last = s.surname.toLowerCase();
    return q.includes(`${first} ${last}`) || q.includes(last) || q.includes(first);
  });
  if (!match) return null;

  return { staffId: match.id, day: today };
}

/* The answer, in the shape somebody reads out over the phone. */
export function coverReport(plan: CoverPlan): string {
  const name = `${plan.staff.forename} ${plan.staff.surname}`;
  if (plan.gaps.length === 0) {
    return `${name} is not rota'd on anything on ${plan.day}. Nothing to cover.`;
  }

  const lines = plan.gaps.map((g) => {
    if (g.candidates.length === 0) {
      const why = g.blocked.slice(0, 3).map((b) => `${b.name}: ${b.reason}`);
      return `${g.when} ${g.what}\n  NOBODY can cover this legally.\n  ${why.join('\n  ')}`;
    }
    const best = g.candidates[0];
    const rest = g.candidates
      .slice(1, 3)
      .map((c) => `${c.staff.forename} ${c.staff.surname} (${c.hours.toFixed(1)}h)`);
    return [
      `${g.when} ${g.what}`,
      `  Best: ${best.staff.forename} ${best.staff.surname} — ${best.why.join(' · ')}`,
      rest.length ? `  Also free: ${rest.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  const head = `${name} is off on ${plan.day}. ${plan.gaps.length} things to cover${
    plan.unfillable.length ? `, ${plan.unfillable.length} of them with nobody legal available` : ''
  }.`;

  /* The same name coming up as first choice all day is arithmetically true and
     operationally wrong — one person does not absorb a whole shift pattern. */
  const counts = new Map<string, number>();
  plan.gaps.forEach((g) => {
    const best = g.candidates[0];
    if (!best) return;
    const who = `${best.staff.forename} ${best.staff.surname}`;
    counts.set(who, (counts.get(who) ?? 0) + 1);
  });
  const stacked = [...counts.entries()].filter(([, n]) => n > 1);
  const warn = stacked.length
    ? [
        '',
        ...stacked.map(
          ([who, n]) =>
            `${who} is first choice for ${n} of these. They have the hours, but that is most of a day — spread it unless they have agreed to it.`,
        ),
      ]
    : [];

  return [
    head,
    '',
    ...lines,
    ...warn,
    '',
    'Nothing has been changed and nobody has been told. Apply it on the rota when you have agreed it.',
  ].join('\n');
}

/* The keyless path: the same answer without a model, so the demo can be run
   with no API key and still do the thing rather than describe it. */
export function coverCommand(
  query: string,
  records: {
    staff: Staff[];
    sessions: Session[];
    duties: Duty[];
    students: Student[];
  },
  day: string,
): { text: string; source: string } | null {
  const asked = parseCover(query, records.staff, day);
  if (!asked) return null;
  const plan = findCover(asked.staffId, asked.day, records);
  if (!plan) return null;
  return { text: coverReport(plan), source: 'find_cover' };
}

export function selfCheck() {
  const day = WEEK_DAYS[1];
  const duties = buildDuties();

  const busiest = STAFF.map((s: Staff) => ({
    s,
    n: SESSIONS.filter((x: Session) => x.day === day && x.staffIds.includes(s.id)).length,
  })).sort((a: { n: number }, b: { n: number }) => b.n - a.n)[0].s;

  const plan = findCover(busiest.id, day, {
    staff: STAFF, sessions: SESSIONS, duties, students: STUDENTS,
  })!;

  /* Never propose the person who is off, and never propose somebody who is
     already somewhere else at that hour. */
  plan.gaps.forEach((g) => {
    g.candidates.forEach((c) => {
      console.assert(c.staff.id !== busiest.id, `${g.id}: proposed the person who is off`);
      console.assert(c.staff.dbs.state === 'cleared', `${g.id}: proposed ${c.staff.forename} with an uncleared DBS`);
    });
    /* Nobody appears as both a candidate and a blocked name for one gap. */
    g.candidates.forEach((c) => {
      console.assert(
        !g.blocked.some((b) => b.name === `${c.staff.forename} ${c.staff.surname}`),
        `${g.id}: ${c.staff.forename} is both free and blocked`,
      );
    });
  });
}
