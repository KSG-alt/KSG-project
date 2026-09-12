/* ── Incidents ────────────────────────────────────────────────────────────
   PRODUCT.md names incidents alongside ratios and DBS as what the
   safeguarding audit trail has to carry. An incident log is not a diary: the
   thing that matters is whether the safeguarding lead was told, whether the
   parents were told, and how long each took — because that is the question
   asked afterwards, every time.

   Seeded incidents reference real seeded students and staff. Nothing here
   describes a real person or a real event.
   ──────────────────────────────────────────────────────────────────────── */

import { DEMO_TODAY, STAFF, STUDENTS } from './seed';

export type IncidentKind =
  | 'Injury'
  | 'Behaviour'
  | 'Safeguarding concern'
  | 'Missing student'
  | 'Medical'
  | 'Property';

/* Three levels, because three is what a centre actually operates:
   logged (write it down), significant (the lead decides), notifiable (it goes
   outside the centre). The referral decision itself is always a person's. */
export type IncidentLevel = 'logged' | 'significant' | 'notifiable';

export interface Incident {
  id: string;
  at: string;
  kind: IncidentKind;
  level: IncidentLevel;
  studentIds: string[];
  staffIds: string[];
  where: string;
  what: string;
  action: string;
  reportedBy: string;
  dslInformedAt: string | null;
  parentsInformedAt: string | null;
  status: 'open' | 'closed';
  followUp: string | null;
}

export const LEVEL_COPY: Record<IncidentLevel, { label: string; mark: string; note: string }> = {
  logged: { label: 'Logged', mark: 'mark--idle', note: 'Recorded. No further action expected.' },
  significant: { label: 'Significant', mark: 'mark--overdue', note: 'The safeguarding lead decides what happens next.' },
  notifiable: { label: 'Notifiable', mark: 'mark--critical', note: 'Needs a referral decision from the safeguarding lead, today.' },
};

const p = (n: number) => String(n).padStart(2, '0');
const stamp = (daysBack: number, time: string) => {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${time}`;
};

/* Pick deterministically from the seeded roll so every name on an incident
   opens a real record. */
const onSite = STUDENTS.filter(
  (s) => new Date(s.arrival) <= DEMO_TODAY && new Date(s.leaving) >= DEMO_TODAY,
);
const pupil = (n: number) => onSite[n % onSite.length].id;
const worker = (n: number) => STAFF[n % STAFF.length].id;

export function buildIncidents(): Incident[] {
  return [
    {
      id: 'inc-0041',
      at: stamp(0, '08:20'),
      kind: 'Safeguarding concern',
      level: 'notifiable',
      studentIds: [pupil(7)],
      staffIds: ['st-01'],
      where: 'Cedar House, first floor',
      what: 'A student disclosed something about home during a room check. The wording was written down verbatim at the time and has not been paraphrased since.',
      action: 'Disclosure recorded verbatim. Student stayed with the welfare officer. No questions asked beyond the open one.',
      reportedBy: 'Anouk Jansen',
      dslInformedAt: stamp(0, '08:34'),
      parentsInformedAt: null,
      status: 'open',
      followUp: 'Referral decision owed by the safeguarding lead today. Parents are not to be contacted until that decision is made.',
    },
    {
      id: 'inc-0040',
      at: stamp(0, '11:05'),
      kind: 'Injury',
      level: 'logged',
      studentIds: [pupil(23)],
      staffIds: [worker(11)],
      where: 'Lower field',
      what: 'Turned an ankle during archery warm-up. Walked off unaided.',
      action: 'Ice pack, fifteen minutes off, watched for the rest of the session. No swelling at the end of the day.',
      reportedBy: 'Tomas Halvorsen',
      dslInformedAt: null,
      parentsInformedAt: stamp(0, '12:40'),
      status: 'closed',
      followUp: null,
    },
    {
      id: 'inc-0039',
      at: stamp(1, '22:15'),
      kind: 'Missing student',
      level: 'significant',
      studentIds: [pupil(31)],
      staffIds: [worker(4), worker(9)],
      where: 'Willow House',
      what: 'Not in their room at the 22:00 check. Found eighteen minutes later in a friend’s room two doors down.',
      action: 'Full house sweep started at 22:04. Student found at 22:18. Both students spoken to about the night rule.',
      reportedBy: 'Marta Salgado',
      dslInformedAt: stamp(1, '22:25'),
      parentsInformedAt: stamp(2, '09:10'),
      status: 'closed',
      followUp: 'Night check sheet changed to name the room, not just the count.',
    },
    {
      id: 'inc-0038',
      at: stamp(2, '15:40'),
      kind: 'Behaviour',
      level: 'significant',
      studentIds: [pupil(12), pupil(45)],
      staffIds: [worker(6)],
      where: 'Block C',
      what: 'An argument in an English lesson became a shove. No injury.',
      action: 'Separated, seen individually, both apologised. Groups kept apart for the rest of the week.',
      reportedBy: 'Freya Lindqvist',
      /* Two days old, above the logging threshold, and nobody has recorded
         telling the safeguarding lead. This is the failure the screen exists
         to make visible, so the seed carries one. */
      dslInformedAt: null,
      parentsInformedAt: stamp(2, '18:30'),
      status: 'open',
      followUp: 'Check on Friday whether keeping them apart is still needed.',
    },
    {
      id: 'inc-0037',
      at: stamp(3, '13:20'),
      kind: 'Medical',
      level: 'logged',
      studentIds: [pupil(50)],
      staffIds: [worker(2)],
      where: 'Dining hall',
      what: 'Reaction to something eaten at lunch. Known allergy, on the medical form.',
      action: 'Antihistamine given from the student’s own supply, per the form. Observed for an hour. No escalation needed.',
      reportedBy: 'Anouk Jansen',
      dslInformedAt: null,
      parentsInformedAt: stamp(3, '14:05'),
      status: 'closed',
      followUp: 'Kitchen told to flag the dish for the rest of the season.',
    },
    {
      id: 'inc-0036',
      at: stamp(5, '19:50'),
      kind: 'Property',
      level: 'logged',
      studentIds: [pupil(18)],
      staffIds: [worker(14)],
      where: 'Rowan House, second floor',
      what: 'A window catch broken in a room. Nobody hurt.',
      action: 'Room changed the same night, maintenance raised, cost logged against the deposit.',
      reportedBy: 'Luca Moretti',
      dslInformedAt: null,
      parentsInformedAt: stamp(5, '20:30'),
      status: 'closed',
      followUp: null,
    },
  ];
}

/* Minutes between the incident and the safeguarding lead being told. The one
   number that gets asked about afterwards. */
export function minutesToDsl(i: Incident) {
  if (!i.dslInformedAt) return null;
  return Math.round(
    (new Date(i.dslInformedAt).getTime() - new Date(i.at).getTime()) / 60000,
  );
}

/* Minutes are the right unit for twenty of them and the wrong unit for two
   thousand. */
export function sinceLabel(mins: number) {
  if (mins < 90) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${Math.round(hours / 24)} days`;
}

export const INCIDENT_KINDS: IncidentKind[] = [
  'Injury', 'Behaviour', 'Safeguarding concern', 'Missing student', 'Medical', 'Property',
];
