/* ── Building the transfer runs ───────────────────────────────────────────
   Two hundred students land across a changeover day in two peaks. Somebody
   has to turn that into vehicle runs: which flights share a run, which
   vehicle, who drives, who meets, and when it leaves the centre.

   Done by hand this is a morning's work on a whiteboard and it is redone
   every time an agent moves a booking. The rules are mechanical, which is
   exactly what should be automated:

   - One run serves one airport. Nobody does Heathrow and Stansted together.
   - Flights land within a window of each other or they are separate runs —
     an hour of a minibus waiting airside is an hour it is not doing the next
     run, and students waiting in arrivals is the thing to avoid.
   - A vehicle holds what it holds. Over that, the run splits.
   - Only cleared staff, not away that day, and a minibus needs Minibus D1.
   - Off-site ratios, not on-site ones, because that is what this is.
   - An unaccompanied minor is released by the airline only to a NAMED adult,
     so a run carrying one has to name its meeter before it leaves.
   ──────────────────────────────────────────────────────────────────────── */

import {
  BAND_RULES,
} from '../data/centre';
import {
  AIRPORTS, airportBy, flightDay, leaveBy, mins, type Flight,
} from '../data/travel';
import { chargeFor } from '../data/suppliers';
import {
  STAFF as SEED_STAFF, STUDENTS as SEED_STUDENTS, isAway, type Staff,
  type Student,
} from '../data/seed';
import { buildFlights } from '../data/travel';

export type Vehicle = 'Minibus' | 'Coach' | 'Taxi';

export const VEHICLES: Record<Vehicle, { seats: number; needsD1: boolean }> = {
  Minibus: { seats: 16, needsD1: true },
  Coach: { seats: 53, needsD1: false },
  Taxi: { seats: 6, needsD1: false },
};

export interface Run {
  id: string;
  day: string;
  direction: 'in' | 'out';
  airport: string;
  vehicle: Vehicle;
  /* Local times at the centre. */
  leaveCentre: string;
  meetFrom: string;
  meetTo: string;
  studentIds: string[];
  staffIds: string[];
  /* The person the airline hands an unaccompanied minor to. */
  meeterId: string | null;
  flightNumbers: string[];
  unaccompanied: number;
  /* The worst delay on this run's flights, in minutes. The vehicle waits
     through it and, past the supplier's free allowance, charges for it. */
  delay: number;
}

export interface TransferPlan {
  runs: Run[];
  unmet: { where: string; problem: string }[];
  studentsMoved: number;
  vehicleHours: number;
  /* What the day's runs will be invoiced at, waiting time included. Fewer
     runs is the point of waiting; this is the number that says by how much. */
  costPence: number;
  /* The longest anybody waits airside under this plan, in minutes. The number
     that decides whether the saving is worth it. */
  longestWait: number;
}

/* Flights landing inside this many minutes of each other always share a run —
   a quarter of an hour apart is one trip to arrivals, not two. Beyond that,
   sharing is bought with waiting, and the waiting is the setting below. */
export const WINDOW = 15;

/* ── The consolidation trade-off ──────────────────────────────────────────
   Thirty-five students landing at five airports across twelve hours makes a
   great many small runs, most of them taxis, and a centre cannot pay for
   that. The lever is waiting: the longer a student may sit airside with a
   member of staff, the more flights share a vehicle.

   That is a real decision with a real cost on both sides, and it is the
   centre's to make — an hour is nothing to a seventeen-year-old and a long
   time for a nine-year-old alone. So it is a setting with the trade-off shown
   both ways, not a number buried in a builder. */
export const WAIT_OPTIONS = [0, 45, 90, 150] as const;
export type Wait = (typeof WAIT_OPTIONS)[number];

const offSiteRatio = (band: string) =>
  BAND_RULES.find((b) => b.band === band)?.offSiteRatio ?? 8;

export function buildRuns(
  day: string,
  direction: 'in' | 'out',
  students: Student[],
  staff: Staff[],
  flights: Flight[],
  /* How long a student may wait airside so flights can share a vehicle. */
  wait: Wait = 90,
): TransferPlan {
  const unmet: TransferPlan['unmet'] = [];
  const runs: Run[] = [];

  /* Everybody travelling today, with their flight. */
  const travelling = students
    .map((s) => {
      const f = flights.find(
        (x) => x.studentId === s.id && x.direction === direction,
      );
      return f && flightDay(s, f) === day ? { s, f } : null;
    })
    .filter((x): x is { s: Student; f: Flight } => Boolean(x));

  if (!travelling.length) {
    return {
      runs: [], unmet: [], studentsMoved: 0, vehicleHours: 0, longestWait: 0,
      costPence: 0,
    };
  }

  /* Who can staff a run today. Duty roles are excluded from activity sessions
     but NOT from transfers — meeting arrivals is exactly welfare work. */
  const available = staff.filter(
    (x) => x.dbs.state === 'cleared' && !isAway(x, day),
  );
  const committed = new Map<string, { from: number; to: number }[]>();
  const free = (id: string, from: number, to: number) =>
    !(committed.get(id) ?? []).some((c) => from < c.to && c.from < to);
  const commit = (id: string, from: number, to: number) =>
    committed.set(id, [...(committed.get(id) ?? []), { from, to }]);

  let seq = 0;

  AIRPORTS.forEach((ap) => {
    const here = travelling
      .filter((t) => t.f.airport === ap.code)
      .sort((a, b) => mins(a.f.at) + a.f.delay - (mins(b.f.at) + b.f.delay));
    if (!here.length) return;

    /* Cut the day's flights at this airport into windows. */
    const windows: (typeof here)[] = [];
    let current: typeof here = [];
    here.forEach((t) => {
      const at = mins(t.f.at) + t.f.delay;
      /* The window IS the promise: nobody in a run waits longer than the
         tolerance for the last flight in it. An earlier version added the
         tolerance on top of a 75-minute window and then reported a 155-minute
         wait under a 90-minute setting, which is the sort of number that gets
         a centre to stop trusting the screen. */
      if (!current.length || at - (mins(current[0].f.at) + current[0].f.delay) <= Math.max(WINDOW, wait)) {
        current.push(t);
      } else {
        windows.push(current);
        current = [t];
      }
    });
    if (current.length) windows.push(current);

    windows.forEach((group) => {
      /* Split by what a vehicle holds. A coach for a big window, a minibus
         for a small one, a taxi for a straggler — a 53-seat coach for two
         students is a bill nobody will sign. */
      const vehicle: Vehicle =
        group.length > 16 ? 'Coach' : group.length > 6 ? 'Minibus' : 'Taxi';
      const seats = VEHICLES[vehicle].seats;

      for (let i = 0; i < group.length; i += seats) {
        const load = group.slice(i, i + seats);
        const first = load[0].f;
        const last = load[load.length - 1].f;
        /* Everything downstream uses the time a flight ACTUALLY lands, delay
           included. Grouping on the delayed time and then reporting the
           scheduled one is how a 0-minute tolerance came out as a 104-minute
           wait. */
        const from = mins(first.at) + first.delay;
        const to = mins(last.at) + last.delay + 45;
        const clockAt = (m: number) =>
          `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const meetFrom = clockAt(mins(first.at) + first.delay);
        const meetTo = clockAt(mins(last.at) + last.delay);
        const away = { from: from - ap.minutes - 60, to: to + ap.minutes + 30 };

        /* Off-site ratio across the bands actually on this run. */
        const needed = Math.max(
          2,
          Math.ceil(
            load.reduce((n, t) => n + 1 / offSiteRatio(t.s.band), 0),
          ),
        );

        const pool = available.filter((x) => free(x.id, away.from, away.to));
        const driver =
          VEHICLES[vehicle].needsD1
            ? pool.find((x) => x.quals.includes('Minibus D1'))
            : undefined;
        if (VEHICLES[vehicle].needsD1 && !driver) {
          unmet.push({
            where: `${ap.name} ${first.at}`,
            problem:
              'No cleared staff member free holds Minibus D1, so the minibus cannot go. Book a taxi or move somebody off another run.',
          });
        }

        const rest = pool
          .filter((x) => x.id !== driver?.id)
          /* Welfare-shaped people meet arrivals: mental health first aid and
             the duty roles first, then everyone else. */
          .sort((a, b) => {
            const w = (x: Staff) =>
              (x.safeguardingLead ? 2 : 0) +
              (x.quals.includes('Mental health first aid') ? 1 : 0);
            return w(b) - w(a);
          });

        const crew = [...(driver ? [driver] : []), ...rest].slice(
          0,
          Math.max(needed, driver ? 1 : 0),
        );
        crew.forEach((x) => commit(x.id, away.from, away.to));

        const unaccompanied = load.filter((t) => t.f.unaccompanied).length;
        const meeter = crew[0] ?? null;

        if (crew.length < needed) {
          unmet.push({
            where: `${ap.name} ${first.at}`,
            problem: `${crew.length} of ${needed} staff free for this run at the off-site ratio.`,
          });
        }
        if (unaccompanied > 0 && !meeter) {
          unmet.push({
            where: `${ap.name} ${first.at}`,
            problem: `${unaccompanied} unaccompanied minors on this run and nobody named to sign for them. The airline will not release them.`,
          });
        }

        runs.push({
          id: `run-${day}-${ap.code}-${seq++}`,
          day,
          direction,
          airport: ap.code,
          vehicle,
          leaveCentre: leaveBy(first),
          meetFrom,
          meetTo,
          studentIds: load.map((t) => t.s.id),
          staffIds: crew.map((x) => x.id),
          meeterId: meeter?.id ?? null,
          flightNumbers: Array.from(new Set(load.map((t) => t.f.number))),
          unaccompanied,
          delay: load.reduce((n, t) => Math.max(n, t.f.delay), 0),
        });
      }
    });
  });

  runs.sort((a, b) => mins(a.leaveCentre) - mins(b.leaveCentre));

  const longestWait = runs.reduce(
    (n, r) => Math.max(n, mins(r.meetTo) - mins(r.meetFrom)),
    0,
  );

  return {
    runs,
    unmet,
    longestWait,
    costPence: runs.reduce((n, r) => n + chargeOf(r).chargedPence, 0),
    studentsMoved: runs.reduce((n, r) => n + r.studentIds.length, 0),
    vehicleHours:
      Math.round(
        runs.reduce(
          (n, r) => n + (airportBy(r.airport).minutes * 2 + 45) / 60,
          0,
        ) * 10,
      ) / 10,
  };
}

/* What a run will be invoiced at. Here rather than at the screen so the plan
   can total it, and so a run costs the same wherever it is shown. */
export const chargeOf = (r: Run) =>
  chargeFor({
    id: r.id,
    day: r.day,
    airport: r.airport,
    vehicle: r.vehicle,
    spread: mins(r.meetTo) - mins(r.meetFrom),
    delay: r.delay,
  });

/* One runnable check on the three invariants that would fail quietly: a run
   never carries more than its vehicle seats, nobody is on two runs at once,
   and no student is left off the plan entirely. */
export function selfCheck() {
  const students = SEED_STUDENTS;
  const flights = buildFlights(students);

  /* The busiest changeover in the season, so the check runs against real
     pressure rather than an empty day. */
  const days = new Map<string, number>();
  students.forEach((s) => days.set(s.arrival, (days.get(s.arrival) ?? 0) + 1));
  const busiest = [...days.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const plan = buildRuns(busiest, 'in', students, SEED_STAFF, flights);

  /* Waiting longer must never make the plan worse. */
  const patient = buildRuns(busiest, 'in', students, SEED_STAFF, flights, 150);
  const impatient = buildRuns(busiest, 'in', students, SEED_STAFF, flights, 0);
  console.assert(
    patient.runs.length <= impatient.runs.length,
    `more waiting should mean fewer runs: ${patient.runs.length} vs ${impatient.runs.length}`,
  );
  console.assert(
    patient.studentsMoved === impatient.studentsMoved,
    'everybody still travels whatever the tolerance',
  );

  /* The setting has to be the promise. */
  WAIT_OPTIONS.forEach((w) => {
    const p = buildRuns(busiest, 'in', students, SEED_STAFF, flights, w);
    console.assert(
      p.longestWait <= Math.max(WINDOW, w),
      `a ${w}-minute tolerance produced a ${p.longestWait}-minute wait`,
    );
  });

  plan.runs.forEach((r) => {
    console.assert(
      r.studentIds.length <= VEHICLES[r.vehicle].seats,
      `${r.id}: ${r.studentIds.length} students in a ${r.vehicle} (${VEHICLES[r.vehicle].seats} seats)`,
    );
    console.assert(
      r.studentIds.length > 0,
      `${r.id}: a run with nobody on it`,
    );
  });

  const expected = students.filter((s) => s.arrival === busiest).length;
  console.assert(
    plan.studentsMoved === expected,
    `every arrival gets a seat: ${plan.studentsMoved} of ${expected}`,
  );

  /* Nobody on two runs whose journeys overlap. */
  const seen = new Map<string, { from: number; to: number }[]>();
  let clash = 0;
  plan.runs.forEach((r) => {
    const ap = airportBy(r.airport);
    const from = mins(r.leaveCentre);
    const to = mins(r.meetTo) + ap.minutes + 45;
    r.staffIds.forEach((id) => {
      const had = seen.get(id) ?? [];
      if (had.some((c) => from < c.to && c.from < to)) clash += 1;
      seen.set(id, [...had, { from, to }]);
    });
  });
  console.assert(clash === 0, `${clash} staff double-booked across transfer runs`);
}
