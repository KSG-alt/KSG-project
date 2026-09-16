/* ── Flights and transfers ────────────────────────────────────────────────
   Students arrive from a dozen countries on flights that land from 06:00 to
   past midnight, and every one of them has to be met by name. Changeover day
   is the hardest day a residential centre runs, and the platform has held an
   arrival DATE and nothing else — no flight, no terminal, no meeter, no way
   to know whether a fourteen-year-old is standing in arrivals at 23:40.

   Airports and road times are real for a centre in Bloomsbury WC1. Times are
   typical door to door with a group and luggage, not the optimistic number a
   maps app gives a single car at 3am.
   ──────────────────────────────────────────────────────────────────────── */

import { DEMO_TODAY, STUDENTS, type Student } from './seed';

export interface Airport {
  code: string;
  name: string;
  /* Minutes from the centre, with a group, allowing for traffic. */
  minutes: number;
  terminals: string[];
}

export const AIRPORTS: Airport[] = [
  { code: 'LHR', name: 'Heathrow', minutes: 70, terminals: ['2', '3', '4', '5'] },
  { code: 'LGW', name: 'Gatwick', minutes: 85, terminals: ['North', 'South'] },
  { code: 'STN', name: 'Stansted', minutes: 80, terminals: ['Main'] },
  { code: 'LTN', name: 'Luton', minutes: 65, terminals: ['Main'] },
  { code: 'LCY', name: 'London City', minutes: 45, terminals: ['Main'] },
];

export const airportBy = (code: string) => AIRPORTS.find((a) => a.code === code)!;

/* Which London airport a country's flights tend to land at, and who flies it.
   Seeded, not researched — the point of the record is the shape, and a real
   centre types the actual flight off the agent's booking. */
const ROUTES: Record<string, { airports: string[]; airlines: string[] }> = {
  Spain: { airports: ['LGW', 'LHR', 'LTN'], airlines: ['IB', 'VY', 'FR'] },
  Italy: { airports: ['LGW', 'STN', 'LHR'], airlines: ['AZ', 'FR', 'BA'] },
  Japan: { airports: ['LHR'], airlines: ['JL', 'NH', 'BA'] },
  France: { airports: ['LCY', 'LHR', 'LGW'], airlines: ['AF', 'BA', 'U2'] },
  Germany: { airports: ['LHR', 'LCY', 'STN'], airlines: ['LH', 'BA', 'FR'] },
  Poland: { airports: ['LTN', 'STN'], airlines: ['LO', 'FR', 'W6'] },
  Brazil: { airports: ['LHR'], airlines: ['JJ', 'BA'] },
  'Türkiye': { airports: ['LHR', 'STN'], airlines: ['TK', 'PC'] },
  Norway: { airports: ['LGW', 'LHR'], airlines: ['DY', 'SK'] },
  Netherlands: { airports: ['LCY', 'LHR'], airlines: ['KL', 'BA'] },
  Portugal: { airports: ['LGW', 'LTN'], airlines: ['TP', 'FR'] },
  Mexico: { airports: ['LHR'], airlines: ['AM', 'BA'] },
};

export type FlightStatus = 'scheduled' | 'landed' | 'delayed' | 'unknown';

export interface Flight {
  studentId: string;
  direction: 'in' | 'out';
  number: string;
  airport: string;
  terminal: string;
  /* Local time at this airport, on the student's arrival or leaving date. */
  at: string;
  status: FlightStatus;
  /* Minutes late, when known. */
  delay: number;
  /* Unaccompanied minor paperwork — the airline hands the child to a named
     adult and will not release them to anybody else. */
  unaccompanied: boolean;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const clock = (mins: number) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export function buildFlights(students: Student[] = STUDENTS): Flight[] {
  const r = rng(3307);
  const out: Flight[] = [];

  students.forEach((s) => {
    const route = ROUTES[s.country] ?? { airports: ['LHR'], airlines: ['BA'] };
    const airport = route.airports[Math.floor(r() * route.airports.length)];
    const ap = airportBy(airport);
    const airline = route.airlines[Math.floor(r() * route.airlines.length)];

    /* Landings cluster in the morning and the evening, which is what makes
       changeover day hard: two peaks, not a steady trickle. */
    const morning = r() < 0.55;
    const mins = morning
      ? 6 * 60 + Math.floor(r() * 300)
      : 16 * 60 + Math.floor(r() * 420);

    const late = r();
    out.push({
      studentId: s.id,
      direction: 'in',
      number: `${airline}${100 + Math.floor(r() * 899)}`,
      airport,
      terminal: ap.terminals[Math.floor(r() * ap.terminals.length)],
      at: clock(mins),
      status: late < 0.08 ? 'delayed' : late < 0.12 ? 'unknown' : 'scheduled',
      delay: late < 0.08 ? 20 + Math.floor(r() * 100) : 0,
      /* Under 16 travelling alone is the common case at a summer school. */
      unaccompanied: s.age < 16 && r() < 0.45,
    });

    const outMins = 6 * 60 + Math.floor(r() * 840);
    out.push({
      studentId: s.id,
      direction: 'out',
      number: `${airline}${100 + Math.floor(r() * 899)}`,
      airport,
      terminal: ap.terminals[Math.floor(r() * ap.terminals.length)],
      at: clock(outMins),
      status: 'scheduled',
      delay: 0,
      unaccompanied: s.age < 16 && r() < 0.45,
    });
  });

  return out;
}

export const flightFor = (
  flights: Flight[],
  studentId: string,
  direction: 'in' | 'out',
) => flights.find((f) => f.studentId === studentId && f.direction === direction) ?? null;

/* The date a flight happens on: the student's arrival for an inbound, their
   leaving date for an outbound. */
export const flightDay = (s: Student, f: Flight) =>
  f.direction === 'in' ? s.arrival : s.leaving;

export const mins = (t: string) =>
  Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/* When the vehicle has to leave the centre to be at the gate on time. Meet
   thirty minutes after landing for bags and immigration, so leave that much
   earlier still. */
export const AFTER_LANDING = 35;

/* How long before a departure a group of children has to be at the desk. Two
   and a half hours is what an airline asks for a group with hold bags and
   unaccompanied-minor paperwork, not the ninety minutes a single adult with
   hand luggage gets away with. */
export const BEFORE_DEPARTURE = 150;

export function leaveBy(f: Flight) {
  const ap = airportBy(f.airport);
  /* Arriving: be at the gate for the meet, which is AFTER_LANDING past the
     wheels down. Leaving: be at the desk BEFORE_DEPARTURE before the flight.
     Running the arrivals formula on a departure had a coach leaving the centre
     an hour AFTER the flight it was taking children to. */
  const target =
    f.direction === 'in'
      ? mins(f.at) + f.delay + AFTER_LANDING
      : mins(f.at) - BEFORE_DEPARTURE;
  return clock(Math.max(0, target - ap.minutes - 15));
}

export const DEMO_DAY = (() => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${DEMO_TODAY.getFullYear()}-${p(DEMO_TODAY.getMonth() + 1)}-${p(DEMO_TODAY.getDate())}`;
})();
