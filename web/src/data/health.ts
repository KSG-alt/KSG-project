/* ── Medication and allergies ─────────────────────────────────────────────
   A free-text line saying "Nut allergy — EpiPen carried" is not a clinical
   record. It cannot say how severe, what the reaction looks like, where the
   pen is, who may give it, or whether anybody gave anything today. On a
   residential programme with children from a dozen countries that is the
   record that matters most, and it was the thinnest one in the platform.

   ── Where the data comes from ──────────────────────────────────────────
   Two sources, and the difference is the whole safety argument:

   - `booking`: the family typed it when they paid and filled in the booking.
     They hold the facts; a member of centre staff retyping them off an email
     is where the errors get in.
   - `senior`: somebody in head office entered or corrected it, usually after
     a phone call with the family or a GP letter.

   Either way it is DECLARED, not verified. A declaration becomes a record the
   centre may act on only when a named person with the welfare permission
   verifies it, and that person is head office, not the seasonal staff running
   the centre. Nobody at the centre can invent, edit or delete a medication —
   they can read what their role allows, and they can record what was actually
   given.

   Every field here is special category data under UK GDPR. Read access is
   gated on the role, every read is written to the audit trail, and the seeded
   records below are invented people.
   ──────────────────────────────────────────────────────────────────────── */

import { DEMO_TODAY, STUDENTS, demoIso, type Student } from './seed';

export type Severity = 'mild' | 'severe' | 'anaphylaxis';

export const SEVERITY_COPY: Record<Severity, { label: string; mark: string; note: string }> = {
  mild: { label: 'Mild', mark: 'mark--idle', note: 'Discomfort. Avoid the allergen; no emergency plan needed.' },
  severe: { label: 'Severe', mark: 'mark--overdue', note: 'Needs antihistamine and observation. Tell the welfare officer the same day.' },
  anaphylaxis: { label: 'Anaphylaxis', mark: 'mark--critical', note: 'Life-threatening. Adrenaline auto-injector, then 999 — always, even if they seem to recover.' },
};

export interface Allergy {
  id: string;
  what: string;
  severity: Severity;
  /* What it actually looks like on this child, in the words the family used.
     "Lips swell and she goes quiet" is more use to a seasonal activity leader
     than the word "urticaria". */
  reaction: string;
  treatment: string;
  /* Adrenaline auto-injector carried. Where it is kept matters more than that
     it exists — a pen in a locked office is not a pen. */
  autoInjector: boolean;
  keptWhere: string | null;
}

export type Holder = 'self-carry' | 'staff-held';

export interface Medication {
  id: string;
  name: string;
  dose: string;
  route: string;
  /* Local times a dose is due. Empty means as required, not routine. */
  times: string[];
  asRequired: boolean;
  withFood: boolean;
  holder: Holder;
  from: string;
  to: string | null;
  notes: string | null;
  /* Written consent from the guardian for the centre to hold and give it.
     Without this nobody may administer anything, and the screen says so. */
  consent: boolean;
}

export type HealthState = 'declared' | 'verified' | 'queried';

export const HEALTH_COPY: Record<HealthState, { label: string; mark: string; note: string }> = {
  declared: {
    label: 'Declared, not verified',
    mark: 'mark--overdue',
    note: 'What the family sent. Head office has not checked it yet, so the centre must not act on it as a clinical record.',
  },
  verified: {
    label: 'Verified',
    mark: 'mark--clear',
    note: 'Checked and accepted by head office. This is the record the centre works to.',
  },
  queried: {
    label: 'Queried with the family',
    mark: 'mark--critical',
    note: 'Something did not add up and head office has gone back to the family. Until it is settled, work to the most cautious reading of it — assume the condition is real and the medication is not cleared to give.',
  },
};

export interface Health {
  studentId: string;
  allergies: Allergy[];
  medications: Medication[];
  source: 'booking' | 'senior';
  declaredAt: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  state: HealthState;
  query: string | null;
}

/* One dose, recorded when it is given — or recorded as missed, which is the
   entry an inspector actually reads. */
export interface Administration {
  id: string;
  studentId: string;
  medicationId: string;
  /* The time it was due. */
  due: string;
  day: string;
  givenAt: string | null;
  givenBy: string | null;
  /* A second pair of eyes on the dose. Good practice, and the thing nobody
     does when the record is a paper book in a drawer. */
  witness: string | null;
  refused: boolean;
  note: string | null;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const back = (n: number) => {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() - n);
  return iso(d);
};

/* Seeded conditions. Each carries its real shape — what it is, what it looks
   like, and what somebody does about it — rather than a label. */
const ALLERGY_KINDS: Omit<Allergy, 'id' | 'keptWhere'>[] = [
  {
    what: 'Peanuts and tree nuts',
    severity: 'anaphylaxis',
    reaction: 'Lips and tongue swell within minutes, then breathing tightens.',
    treatment: 'EpiPen into the outer thigh, then 999. Second pen after 5 minutes if no better.',
    autoInjector: true,
  },
  {
    what: 'Shellfish',
    severity: 'severe',
    reaction: 'Hives across the chest and vomiting, within about half an hour.',
    treatment: 'Antihistamine, sit them up, stay with them. Welfare officer same day.',
    autoInjector: false,
  },
  {
    what: 'Bee and wasp stings',
    severity: 'anaphylaxis',
    reaction: 'Swelling spreads from the sting site; collapsed once before.',
    treatment: 'EpiPen, then 999. Tell the activity leader before anything outdoors.',
    autoInjector: true,
  },
  {
    what: 'Penicillin',
    severity: 'severe',
    reaction: 'Widespread rash. Never had breathing trouble with it.',
    treatment: 'Do not give. Tell any doctor or pharmacist who sees them.',
    autoInjector: false,
  },
  {
    what: 'Pollen (hay fever)',
    severity: 'mild',
    reaction: 'Streaming eyes and sneezing on dry days.',
    treatment: 'Antihistamine in the morning. No emergency plan needed.',
    autoInjector: false,
  },
  {
    what: 'Lactose',
    severity: 'mild',
    reaction: 'Stomach cramps a couple of hours after milk.',
    treatment: 'Kitchen swap only. Not an allergy the activity team needs to act on.',
    autoInjector: false,
  },
];

const MED_KINDS: Omit<Medication, 'id' | 'from' | 'to' | 'consent'>[] = [
  {
    name: 'Salbutamol inhaler',
    dose: '2 puffs',
    route: 'Inhaled',
    times: [],
    asRequired: true,
    withFood: false,
    holder: 'self-carry',
    notes: 'Carries it at all times, including off site. Spare in the welfare room.',
  },
  {
    name: 'Methylphenidate',
    dose: '20 mg',
    route: 'Oral',
    times: ['08:00'],
    asRequired: false,
    withFood: true,
    holder: 'staff-held',
    notes: 'With breakfast. The family asks that it is not given after 10:00 — a late dose stops them sleeping.',
  },
  {
    name: 'Levothyroxine',
    dose: '75 mcg',
    route: 'Oral',
    times: ['07:00'],
    asRequired: false,
    withFood: false,
    holder: 'staff-held',
    notes: 'Half an hour before food. Do not give with milk.',
  },
  {
    name: 'Cetirizine',
    dose: '10 mg',
    route: 'Oral',
    times: ['08:00'],
    asRequired: false,
    withFood: false,
    holder: 'staff-held',
    notes: 'Hay fever. Skip if drowsy on a water activity day.',
  },
  {
    name: 'Insulin (NovoRapid)',
    dose: 'Per carbohydrate count',
    route: 'Subcutaneous',
    times: ['08:00', '12:30', '18:30'],
    asRequired: false,
    withFood: true,
    holder: 'self-carry',
    notes: 'Manages the pen and counts carbohydrates without help. Hypo kit in their day bag and a second one in the welfare room.',
  },
  {
    name: 'Adrenaline auto-injector (EpiPen)',
    dose: '0.3 mg',
    route: 'Intramuscular',
    times: [],
    asRequired: true,
    withFood: false,
    holder: 'self-carry',
    notes: 'Two pens. One on the child, one with the group leader on every trip.',
  },
];

const WELFARE = ['Nadia Rahman', 'Kebba Sarr', 'Tomas Halvorsen'];

/* Why head office sent one back. Real queries are mundane and specific — a
   dose that does not match the letter, a pen that expires mid-season, a form
   nobody signed — rather than a generic doubt. */
const QUERIES = [
  'The dose on the booking form and the dose on the GP letter do not match. Asked the family for the letter again.',
  'The auto-injector expires three days into their stay. Asked the family to send in an in-date pen with them.',
  'The form names the medication but not the dose. Cannot hold it at a centre on that.',
  'Declared at booking by the agent rather than the family, and the consent is unsigned. Gone back to the parents directly.',
  'Two forms arrived a week apart with different allergies on them. Asked which is current.',
];

/* Roughly one child in seven arrives with something clinical, which is what a
   centre of two hundred actually sees. The seed is deliberate rather than
   random so the same children have the same conditions every run. */
export function buildHealth(students: Student[] = STUDENTS): Health[] {
  const r = rng(8821);
  const out: Health[] = [];

  students.forEach((s, i) => {
    const hasAllergy = i % 7 === 0;
    const hasMed = i % 11 === 0;
    /* The free-text notes the platform already carried are a signal too — a
       child whose record says "EpiPen carried" gets the structured version of
       exactly that. */
    const fromNote = /epipen|allerg|asthma|inhaler/i.test(`${s.medical ?? ''} ${s.dietary ?? ''}`);
    if (!hasAllergy && !hasMed && !fromNote) return;

    const allergies: Allergy[] = [];
    if (hasAllergy || /allerg|epipen/i.test(`${s.medical ?? ''} ${s.dietary ?? ''}`)) {
      const kind = ALLERGY_KINDS[Math.floor(r() * ALLERGY_KINDS.length)];
      allergies.push({
        ...kind,
        id: `al-${s.id}`,
        keptWhere: kind.autoInjector
          ? r() < 0.5
            ? 'In their day bag, and a spare in the welfare room'
            : 'Welfare room, and the group leader carries it off site'
          : null,
      });
    }

    const medications: Medication[] = [];
    if (hasMed || /asthma|inhaler/i.test(s.medical ?? '')) {
      const kind = MED_KINDS[Math.floor(r() * MED_KINDS.length)];
      medications.push({
        ...kind,
        id: `md-${s.id}`,
        from: s.arrival,
        to: s.leaving,
        /* Consent is missing on a few, and that is the point: without it
           nobody may give anything, however obvious the need. */
        consent: r() > 0.04,
      });
    }
    if (allergies.some((a) => a.autoInjector)) {
      medications.push({
        ...MED_KINDS[5],
        id: `md-${s.id}-epi`,
        from: s.arrival,
        to: s.leaving,
        consent: true,
      });
    }

    if (!allergies.length && !medications.length) return;

    /* Most families fill it in at booking. A minority are typed up by head
       office after a phone call — usually the complicated ones. */
    const source: Health['source'] = r() < 0.78 ? 'booking' : 'senior';
    const roll = r();
    /* Most records are signed off; the ones that are not are the queue. A
       season where a third of the children have an unverified record is not a
       demonstration of anything except a broken process. */
    const state: HealthState = roll < 0.955 ? 'verified' : roll < 0.99 ? 'declared' : 'queried';

    out.push({
      studentId: s.id,
      allergies,
      medications,
      source,
      declaredAt: back(14 + Math.floor(r() * 60)),
      verifiedBy: state === 'verified' ? WELFARE[Math.floor(r() * WELFARE.length)] : null,
      verifiedAt: state === 'verified' ? back(3 + Math.floor(r() * 20)) : null,
      state,
      query: state === 'queried' ? QUERIES[Math.floor(r() * QUERIES.length)] : null,
    });
  });

  return out;
}

export const healthFor = (health: Health[], studentId: string) =>
  health.find((h) => h.studentId === studentId) ?? null;

/* Routine doses due today for one student. As-required medication is not a
   round — it has no due time and appears only when it is given. */
export const dueToday = (h: Health) =>
  h.medications
    .filter((m) => !m.asRequired && m.times.length > 0)
    .flatMap((m) => m.times.map((t) => ({ medication: m, due: t })))
    .sort((a, b) => a.due.localeCompare(b.due));

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/* Today's medication round, seeded so the screen has a history to show. A
   dose that is due and not yet given is not a failure until its time has
   passed — the same rule attendance uses for registers. */
export function buildAdministrations(
  health: Health[],
  students: Student[] = STUDENTS,
  now: Date = DEMO_TODAY,
): Administration[] {
  const r = rng(4409);
  const day = iso(now);
  const clock = now.getHours() * 60 + now.getMinutes();
  const out: Administration[] = [];

  health.forEach((h) => {
    const s = students.find((x) => x.id === h.studentId);
    if (!s || s.arrival > day || s.leaving < day) return;

    dueToday(h).forEach(({ medication, due }) => {
      const passed = mins(due) <= clock;
      /* One dose in twelve is missed, and the record says why rather than
         quietly holding no row at all. */
      const missed = r() < 0.08;
      out.push({
        id: `adm-${h.studentId}-${medication.id}-${due}`,
        studentId: h.studentId,
        medicationId: medication.id,
        due,
        day,
        givenAt: passed && !missed ? due : null,
        givenBy: passed && !missed ? WELFARE[Math.floor(r() * WELFARE.length)] : null,
        witness: passed && !missed && r() < 0.6 ? WELFARE[Math.floor(r() * WELFARE.length)] : null,
        refused: passed && missed && r() < 0.4,
        note:
          passed && missed
            ? r() < 0.4
              ? 'Refused it. Family told the same morning.'
              : 'Not given — nobody with the welfare permission was free before the group left.'
            : null,
      });
    });
  });

  return out;
}

/* Doses that were due before now and never recorded either way. The gap an
   inspector looks for.

   "Either way" is load-bearing: a dose recorded as refused IS recorded, and
   counting it as missing turns a centre that did its job into a centre with
   a gap. A dose not yet due is not missing either, which is why the clock is
   here. */
export function missedDoses(
  administrations: Administration[],
  now: Date = DEMO_TODAY,
) {
  const clock = now.getHours() * 60 + now.getMinutes();
  return administrations.filter(
    (a) => mins(a.due) <= clock && !a.givenAt && !a.refused,
  );
}

/* Anything the centre must not act on yet, or must not give at all. */
export function healthBlocks(h: Health) {
  const out: string[] = [];
  if (h.state !== 'verified') {
    out.push(
      `${HEALTH_COPY[h.state].label} — head office has not signed this off, so treat it as information, not instruction.`,
    );
  }
  h.medications
    .filter((m) => !m.consent)
    .forEach((m) =>
      out.push(
        `No written consent to give ${m.name}. Nobody may administer it until the guardian signs.`,
      ),
    );
  return out;
}

export const stamp = demoIso;

export function selfCheck() {
  const health = buildHealth();
  console.assert(health.length > 0, 'no health records built from the seed');

  /* A verified record always names who verified it, and an unverified one
     never does. A screen that says "verified" with nobody's name on it is
     worse than saying nothing. */
  health.forEach((h) => {
    console.assert(
      (h.state === 'verified') === (h.verifiedBy !== null),
      `${h.studentId}: verified state and verifier disagree`,
    );
    console.assert(
      (h.state === 'queried') === (h.query !== null),
      `${h.studentId}: queried state and query text disagree`,
    );
  });

  /* Every auto-injector allergy carries a medication to match it. An EpiPen
     plan with no pen on the record is the failure this screen exists to stop. */
  health.forEach((h) => {
    if (h.allergies.some((a) => a.autoInjector)) {
      console.assert(
        h.medications.some((m) => /auto-injector|epipen/i.test(m.name)),
        `${h.studentId}: anaphylaxis plan with no auto-injector on the record`,
      );
    }
  });

  /* Nothing is due for a child who is not here. */
  const adm = buildAdministrations(health);
  adm.forEach((a) => {
    const s = STUDENTS.find((x) => x.id === a.studentId)!;
    console.assert(
      s.arrival <= a.day && s.leaving >= a.day,
      `${a.id}: a dose due for somebody who is not on site`,
    );
  });

  /* A dose cannot be recorded as given before it was due. */
  adm.forEach((a) => {
    console.assert(
      !a.givenAt || mins(a.givenAt) >= mins(a.due) - 1,
      `${a.id}: given at ${a.givenAt} for a ${a.due} dose`,
    );
  });
}
