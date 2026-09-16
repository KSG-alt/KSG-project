/* ── Who drove it, what it cost, and who to ring ──────────────────────────
   A transfer run is not finished when the vehicle comes back. Somebody has to
   settle it: the supplier invoices, the invoice is rarely the quote because a
   flight was late and waiting time is chargeable, and a receipt has to be
   attached to the line before finance will pay it. That is the same job the
   activity bookings already do, so it uses the same Receipt record rather
   than a second idea of one.

   It is also the file of phone numbers. On changeover day the three calls
   anybody actually makes are: the coach company, because the vehicle is not
   where it said it would be; the parents, because a child is not on the
   flight they were booked on; and the agent, because the parents do not speak
   English and the agent does.

   Everything here is seeded fake data. The rate card is not a quote from a
   real supplier and the companies do not exist. No receipt file is stored —
   see RECEIPTS_ARE_NOT_FILES below.
   ──────────────────────────────────────────────────────────────────────── */

import { AIRPORTS, airportBy } from './travel';
import { fmtMoney, STUDENTS, type Receipt, type Student } from './seed';

/* The half that is not built, stated where it would be believed otherwise:
   the platform records that a receipt exists and what it is called. It does
   not hold the PDF, because there is no file store and no upload, and a
   demo that let somebody drag a file onto the screen would be claiming one. */
export const RECEIPTS_ARE_NOT_FILES =
  'The receipt record holds the supplier, the reference and the amount. The PDF itself is not stored — there is no file store behind this screen yet.';

export interface TransportSupplier {
  id: string;
  name: string;
  /* The number that is answered at 05:00, which is the only one worth having
     on changeover day. */
  dispatch: string;
  outOfHours: string;
  email: string;
  account: string;
  /* Pence per hour of vehicle time, per vehicle type. */
  rates: Record<string, number>;
  /* Waiting is free for this long after the booked meeting time, then it is
     charged by the hour. This is where a delayed flight turns into money. */
  waitFreeMins: number;
  waitPerHourPence: number;
}

export const SUPPLIERS: TransportSupplier[] = [
  {
    id: 'sup-crown',
    name: 'Crown Coaches',
    dispatch: '020 7946 0210',
    outOfHours: '07700 900214',
    email: 'dispatch@crowncoaches.example',
    account: 'CC-KSG-118',
    rates: { Coach: 9800, Minibus: 5400, Taxi: 3900 },
    waitFreeMins: 45,
    waitPerHourPence: 3600,
  },
  {
    id: 'sup-meridian',
    name: 'Meridian Airport Cars',
    dispatch: '020 7946 0338',
    outOfHours: '07700 900341',
    email: 'ops@meridiancars.example',
    account: 'MAC-2027-44',
    rates: { Coach: 10400, Minibus: 5800, Taxi: 3400 },
    waitFreeMins: 30,
    waitPerHourPence: 4200,
  },
  {
    id: 'sup-halford',
    name: 'Halford Group Travel',
    dispatch: '020 7946 0457',
    outOfHours: '07700 900462',
    email: 'bookings@halfordgrouptravel.example',
    account: 'HGT-0912',
    rates: { Coach: 9100, Minibus: 5600, Taxi: 4100 },
    waitFreeMins: 60,
    waitPerHourPence: 3000,
  },
];

/* One supplier holds the contract for an airport. Splitting an airport across
   two firms is how a centre ends up with two vehicles for eleven students. */
export const supplierForAirport = (code: string) =>
  SUPPLIERS[AIRPORTS.findIndex((a) => a.code === code) % SUPPLIERS.length];

/* ── Agents ───────────────────────────────────────────────────────────────
   Most students at a residential summer school are booked through an agent in
   their own country, and the agent — not the centre — is who the family
   actually talks to. Some families book direct. The difference matters at
   23:40 when a flight is missing a child: ring the agent, in their language,
   or ring the parents in theirs. */

export interface Agent {
  id: string;
  name: string;
  contact: string;
  phone: string;
  outOfHours: string;
  email: string;
  countries: string[];
  language: string;
}

export const AGENTS: Agent[] = [
  { id: 'ag-iberia', name: 'Iberia Study Abroad', contact: 'Rosa Marin', phone: '+34 910 000 118', outOfHours: '+34 600 000 118', email: 'rosa@iberiastudy.example', countries: ['Spain', 'Portugal', 'Mexico'], language: 'Spanish' },
  { id: 'ag-ponte', name: 'Ponte Linguistica', contact: 'Davide Serra', phone: '+39 02 0000 221', outOfHours: '+39 340 000 221', email: 'davide@pontelinguistica.example', countries: ['Italy'], language: 'Italian' },
  { id: 'ag-kaigai', name: 'Kaigai Education KK', contact: 'Aya Morimoto', phone: '+81 3 0000 4417', outOfHours: '+81 90 0000 4417', email: 'aya@kaigai-ed.example', countries: ['Japan'], language: 'Japanese' },
  { id: 'ag-nord', name: 'Nord Studieformidling', contact: 'Ingrid Halle', phone: '+47 21 000 553', outOfHours: '+47 400 00 553', email: 'ingrid@nordstudie.example', countries: ['Norway', 'Netherlands', 'Germany'], language: 'English' },
  { id: 'ag-wisla', name: 'Wisła Education', contact: 'Marek Zielinski', phone: '+48 22 000 6612', outOfHours: '+48 600 006 612', email: 'marek@wislaedu.example', countries: ['Poland'], language: 'Polish' },
  { id: 'ag-bogazici', name: 'Boğaziçi Study Links', contact: 'Elif Demir', phone: '+90 212 000 7740', outOfHours: '+90 530 000 7740', email: 'elif@bogazicistudy.example', countries: ['Türkiye'], language: 'Turkish' },
  { id: 'ag-lumiere', name: 'Lumière Séjours', contact: 'Claire Aubry', phone: '+33 1 00 00 88 21', outOfHours: '+33 6 00 00 88 21', email: 'claire@lumieresejours.example', countries: ['France'], language: 'French' },
  { id: 'ag-atlantico', name: 'Atlântico Intercâmbio', contact: 'Bruno Faria', phone: '+55 11 0000 3316', outOfHours: '+55 11 90000 3316', email: 'bruno@atlanticointercambio.example', countries: ['Brazil'], language: 'Portuguese' },
];

/* Direct bookings have no agent, and the centre rings the family itself. */
export const agentFor = (s: Student): Agent | null => {
  const a = AGENTS.find((x) => x.countries.includes(s.country));
  if (!a) return null;
  /* Roughly one family in six books direct, seeded off the student id so the
     same child is always direct. */
  return Number(s.id.replace(/\D/g, '')) % 6 === 0 ? null : a;
};

/* ── The charge ───────────────────────────────────────────────────────── */

export type ChargeState = 'receipted' | 'invoiced' | 'missing' | 'disputed';

export interface Charge {
  runId: string;
  supplier: TransportSupplier;
  vehicle: string;
  /* The registration and the mobile of the person actually driving, which is
     what the meeter needs in the car park. */
  driver: { name: string; phone: string; reg: string };
  reference: string;
  hours: number;
  quotedPence: number;
  /* Minutes past the free waiting allowance, and what they cost. */
  waitMins: number;
  waitPence: number;
  chargedPence: number;
  state: ChargeState;
  receipt: Receipt | null;
  /* Plain English for why the invoice is not the quote. */
  why: string | null;
}

const DRIVERS = [
  'Ade Bamgbose', 'Steve Kelleher', 'Marek Nowicki', 'Danny Otieno',
  'Paul Whitmore', 'Ruta Balciunas', 'Sam Achebe', 'Tony Ferreira',
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function chargeFor(run: {
  id: string;
  day: string;
  airport: string;
  vehicle: string;
  /* Minutes between the first and last landing on this run — the vehicle sits
     through all of it. */
  spread: number;
  /* The worst delay on the run's flights. */
  delay: number;
}): Charge {
  const supplier = supplierForAirport(run.airport);
  const ap = airportBy(run.airport);
  const h = hash(run.id);

  /* Door to door: out, the meeting window, thirty minutes of arrivals hall,
     and back. Rounded up to the quarter hour the way a hire is billed. */
  const raw = (ap.minutes * 2 + 45 + run.spread) / 60;
  const hours = Math.ceil(raw * 4) / 4;
  const rate = supplier.rates[run.vehicle] ?? supplier.rates.Taxi;
  const quotedPence = Math.round(rate * hours);

  /* Two runs in nine come back without a receipt and one in nine is invoiced
     for something nobody agreed. Both are the real state of a transfer ledger
     in August, and both are what this screen exists to surface. */
  const roll = h % 9;
  const state: ChargeState =
    roll === 0 ? 'disputed' : roll < 3 ? 'missing' : roll < 5 ? 'invoiced' : 'receipted';

  /* Waiting the centre owes: the delay, less whatever the supplier gives free.
     A disputed invoice bills for an hour or so on top of that which no flight
     was late for — which is exactly the shape of the ones worth querying, and
     is why the two numbers are kept apart rather than netted off. */
  const earnedMins = Math.max(0, run.delay - supplier.waitFreeMins);
  const overMins = state === 'disputed' ? 60 + (h % 40) : 0;
  const waitMins = earnedMins + overMins;
  const waitPence = Math.round((waitMins / 60) * supplier.waitPerHourPence);
  const overPence = Math.round((overMins / 60) * supplier.waitPerHourPence);
  const chargedPence = quotedPence + waitPence;

  const reference = `${supplier.account.split('-')[0]}-${run.day.slice(5).replace('-', '')}-${String(h % 900 + 100)}`;

  return {
    runId: run.id,
    supplier,
    vehicle: run.vehicle,
    driver: {
      name: DRIVERS[h % DRIVERS.length],
      phone: `07700 9${String(h % 100000).padStart(5, '0')}`,
      reg: `${['LM', 'BV', 'KN', 'RX'][h % 4]}${69 + (h % 6)} ${['ZTK', 'HDA', 'PVR', 'MCU', 'JEB'][h % 5]}`,
    },
    reference,
    hours,
    quotedPence,
    waitMins,
    waitPence,
    chargedPence,
    state,
    receipt:
      state === 'receipted'
        ? {
            filename: `${supplier.name.toLowerCase().replace(/\s+/g, '-')}-${reference.toLowerCase()}.pdf`,
            bytes: 64000 + (h % 160000),
            attachedAt: run.day,
            attachedBy: 'Ismail',
          }
        : null,
    why:
      state === 'disputed'
        ? `Billed for ${waitMins} minutes of waiting when the flight landed ${run.delay === 0 ? 'on time' : `${run.delay} minutes late`} — ${earnedMins} of those minutes are chargeable. Query ${fmtMoney(overPence)} before it is paid.`
        : waitPence > 0
          ? `${waitMins} minutes of chargeable waiting at ${ap.name} — the flight landed ${run.delay} minutes late and ${supplier.name} allows ${supplier.waitFreeMins} free.`
          : null,
  };
}

export function selfCheck() {
  /* A country served by two agents makes agentFor pick one at random-looking,
     and a country served by none silently reads as a direct booking for every
     family in it. Both are wrong on the one screen somebody rings from. */
  const seen = new Map<string, string>();
  AGENTS.forEach((a) =>
    a.countries.forEach((c) => {
      console.assert(!seen.has(c), `${c} is served by both ${seen.get(c)} and ${a.name}`);
      seen.set(c, a.name);
    }),
  );
  const orphan = [...new Set(STUDENTS.map((s) => s.country))].filter(
    (c) => !seen.has(c),
  );
  console.assert(
    orphan.length === 0,
    `no agent for ${orphan.join(', ')} — every family from there reads as booked direct`,
  );

  /* Waiting inside the free allowance must never appear on the bill, and a
     charge must never come out under its own quote. */
  /* A run whose invoice nobody is querying, so the waiting figures mean only
     what the flight did. */
  const clean = (n: number) => {
    for (let i = 0; i < 50; i += 1) {
      const c = chargeFor({ id: `run-clean-${i}`, day: '2027-07-13', airport: 'LHR', vehicle: 'Minibus', spread: 0, delay: n });
      if (c.state !== 'disputed') return c;
    }
    throw new Error('every seeded run came out disputed');
  };
  const base = { id: 'run-test-1', day: '2027-07-13', airport: 'LHR', vehicle: 'Minibus', spread: 0 };
  const free = clean(20);
  console.assert(free.waitPence === 0, `${free.waitMins} minutes charged inside the free allowance`);

  const late = clean(165);
  console.assert(
    late.chargedPence > late.quotedPence && late.why !== null,
    'a long delay should cost waiting time and say why',
  );
  console.assert(
    late.quotedPence === free.quotedPence,
    'a delay changes the waiting charge, not the hire rate',
  );

  /* Same run, same numbers, every render. A charge that moved when the screen
     redrew would be worse than no charge at all. */
  const once = chargeFor({ ...base, delay: 165 });
  const again = chargeFor({ ...base, delay: 165 });
  const disputed = (() => {
    for (let i = 0; i < 80; i += 1) {
      const c = chargeFor({ ...base, id: `run-d-${i}`, delay: 0 });
      if (c.state === 'disputed') return c;
    }
    throw new Error('no disputed run in the seeded set');
  })();
  console.assert(
    disputed.chargedPence > disputed.quotedPence,
    'a queried invoice has to be for more than the quote, or there is nothing to query',
  );
  console.assert(
    again.reference === once.reference && again.driver.reg === once.driver.reg,
    'charges must be deterministic per run',
  );

  /* A receipt exists exactly when the state says it does. */
  AIRPORTS.forEach((ap, i) => {
    const c = chargeFor({ ...base, id: `run-x-${i}`, airport: ap.code, delay: 0 });
    console.assert(
      (c.receipt !== null) === (c.state === 'receipted'),
      `${c.runId}: receipt and state disagree`,
    );
  });
}
