/* ── Duty ─────────────────────────────────────────────────────────────────
   Activity sessions are not the week. Across six days and five groups they
   come to 864 staff-hours — spread over a roster of fifty that is under
   nineteen hours each, and no summer school runs on that.

   The rest is duty: mealtimes, free-time supervision, the evening programme,
   night duty on the houses, and changeover-day transfers. It is most of a
   seasonal contract and it is where the hours actually come from, so the rota
   has to schedule it rather than leave it to a WhatsApp message on Sunday.

   Hours here are rota'd hours, not pay. Payroll stays with the centre
   (DECISIONS.md 0001).
   ──────────────────────────────────────────────────────────────────────── */

import { STAFF, WEEK_DAYS, dayName, type Staff } from './seed';

export type DutyKind =
  | 'Breakfast'
  | 'Lunch'
  | 'Free time'
  | 'Dinner'
  | 'Evening activity'
  | 'Night duty'
  | 'Transfers';

export interface DutyPattern {
  kind: DutyKind;
  start: string;
  end: string;
  hours: number;
  /* How many people the centre puts on it. */
  needed: number;
  /* Sunday is changeover: no activity sessions, but arrivals and departures
     all day. Some duties only run then, some only on activity days. */
  days: 'all' | 'activity-days' | 'changeover';
  what: string;
}

export const DUTY_PATTERNS: DutyPattern[] = [
  {
    kind: 'Breakfast',
    start: '07:15', end: '09:00', hours: 1.75, needed: 8, days: 'all',
    what: 'Wake-ups, dining room cover, and the first headcount of the day.',
  },
  {
    kind: 'Lunch',
    start: '12:30', end: '14:00', hours: 1.5, needed: 8, days: 'all',
    what: 'Dining room, allergen table, and the handover between morning and afternoon groups.',
  },
  {
    kind: 'Free time',
    start: '15:30', end: '17:30', hours: 2, needed: 10, days: 'activity-days',
    what: 'Grounds and common rooms supervised. The shift where homesickness surfaces.',
  },
  {
    kind: 'Dinner',
    start: '17:30', end: '19:00', hours: 1.5, needed: 8, days: 'all',
    what: 'Dining room and the evening headcount before the programme starts.',
  },
  {
    kind: 'Evening activity',
    start: '19:00', end: '21:30', hours: 2.5, needed: 14, days: 'all',
    what: 'The evening programme — discos, quizzes, film nights, sports.',
  },
  {
    kind: 'Night duty',
    start: '21:30', end: '23:30', hours: 2, needed: 8, days: 'all',
    what: 'Room checks, lights out, and the on-call phone until the night warden takes over.',
  },
  {
    kind: 'Transfers',
    start: '06:00', end: '22:00', hours: 4, needed: 8, days: 'changeover',
    what: 'Airport runs. Students land and leave all day, and each run is met by name.',
  },
];

export interface Duty {
  id: string;
  day: string;
  kind: DutyKind;
  start: string;
  end: string;
  hours: number;
  needed: number;
  staffIds: string[];
}

/* The rota week is Monday to Saturday of activity days; Sunday is changeover
   and carries its own duties, so the duty week is seven days. */
export function dutyWeek(): string[] {
  const sunday = new Date(WEEK_DAYS[WEEK_DAYS.length - 1]);
  sunday.setDate(sunday.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  const iso = `${sunday.getFullYear()}-${p(sunday.getMonth() + 1)}-${p(sunday.getDate())}`;
  return [...WEEK_DAYS, iso];
}

export const isChangeover = (day: string) => !WEEK_DAYS.includes(day);

export function buildDuties(): Duty[] {
  const out: Duty[] = [];
  dutyWeek().forEach((day) => {
    const changeover = isChangeover(day);
    DUTY_PATTERNS.forEach((p) => {
      if (p.days === 'activity-days' && changeover) return;
      if (p.days === 'changeover' && !changeover) return;
      out.push({
        id: `duty-${day}-${p.kind.toLowerCase().replace(/\s+/g, '-')}`,
        day,
        kind: p.kind,
        start: p.start,
        end: p.end,
        hours: p.hours,
        needed: p.needed,
        staffIds: [],
      });
    });
  });
  return out;
}

export const dutyHours = (staffId: string, duties: Duty[]) =>
  duties
    .filter((d) => d.staffIds.includes(staffId))
    .reduce((n, d) => n + d.hours, 0);

export const dutiesFor = (staffId: string, duties: Duty[]) =>
  duties
    .filter((d) => d.staffIds.includes(staffId))
    .sort((a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start));

/* Total supply of duty hours in a week, against what the roster is
   contracted for. The gap is the number that decides whether a week can be
   filled at all, and it is worth being able to state rather than discover. */
export function dutySupply(duties: Duty[]) {
  return duties.reduce((n, d) => n + d.hours * d.needed, 0);
}

export const contractedTotal = (staff: Staff[] = STAFF) =>
  staff.reduce((n, s) => n + s.contractedHours, 0);

export const dutyLabel = (d: Duty) =>
  `${dayName(d.day)} ${d.start}–${d.end} · ${d.kind}`;
