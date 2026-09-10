/* Seeded fake data. Deterministic — same output every run.
   No real student, staff member, or centre appears here. */

export const DEMO_TODAY = new Date('2027-07-12T09:00:00');
export const SEASON_START = new Date('2027-06-21T00:00:00');
export const SEASON_END = new Date('2027-08-15T00:00:00');

/* Small LCG so the set is stable without committing a fixture file. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const FORENAMES = [
  'Mateo', 'Sofia', 'Yuki', 'Amara', 'Luca', 'Ines', 'Rafael', 'Chiara',
  'Nour', 'Tomas', 'Elif', 'Diego', 'Anouk', 'Hugo', 'Leila', 'Kenji',
  'Marta', 'Andres', 'Freya', 'Omar', 'Bianca', 'Levi', 'Zara', 'Pablo',
  'Greta', 'Idris', 'Alba', 'Nikolai', 'Ravi', 'Juno',
];
const SURNAMES = [
  'Aguilar', 'Berkmann', 'Castellano', 'Duarte', 'Eriksen', 'Fontaine',
  'Grimaldi', 'Halvorsen', 'Iversen', 'Jansen', 'Kowalski', 'Lindqvist',
  'Moretti', 'Nakamura', 'Okonjo', 'Petrov', 'Quintana', 'Rossi',
  'Salgado', 'Toledano', 'Ueda', 'Vasquez', 'Weiss', 'Ximenes',
];
/* Reminder copy has to work cold for a parent who may not read English
   first — PRODUCT.md, Accessibility & Inclusion. Language and address follow
   the student's own country, so a record never contradicts itself. */
const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  Spain: 'Spanish',
  Italy: 'Italian',
  Japan: 'Japanese',
  France: 'French',
  Germany: 'German',
  Poland: 'Polish',
  Brazil: 'Portuguese',
  'Türkiye': 'Turkish',
  Norway: 'Norwegian',
  Netherlands: 'Dutch',
  Portugal: 'Portuguese',
  Mexico: 'Spanish',
};

const STREETS = [
  'Station Road', 'Park Avenue', 'Hill Street', 'Market Square',
  'Garden Lane', 'Church Road', 'Mill Street', 'Orchard Way',
];

const COUNTRIES = [
  'Spain', 'Italy', 'Japan', 'France', 'Germany', 'Poland', 'Brazil',
  'Türkiye', 'Norway', 'Netherlands', 'Portugal', 'Mexico',
];

export type AgeBand = '8–11' | '12–14' | '15–17';

export type DocState = 'in' | 'outstanding' | 'overdue';

export interface Guardian {
  name: string;
  relationship: string;
  phone: string;
  altPhone: string;
  email: string;
  language: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  consentToTravel: boolean;
}

export interface Student {
  id: string;
  forename: string;
  surname: string;
  dob: string;
  age: number;
  band: AgeBand;
  groupId: string;
  arrival: string;
  leaving: string;
  country: string;
  docs: { medical: DocState; consent: DocState; passport: DocState };
  balancePence: number;
  paidPence: number;
  roomId: string | null;
  bed: number;
  dietary: string | null;
  medical: string | null;
  guardian: Guardian;
}

/* ── Residence ─────────────────────────────────────────────────────────────
   Rooms are allocated within a single age band. Whether a centre also rooms
   by gender is a per-centre configuration Kebba specifies in October, so it
   is deliberately not modelled here rather than invented.
   ──────────────────────────────────────────────────────────────────────── */

export interface Room {
  id: string;
  block: string;
  floor: number;
  number: string;
  beds: number;
  band: AgeBand;
  wardenId: string | null;
}

const BLOCKS = ['Willow House', 'Cedar House', 'Rowan House'] as const;

const BAND_HOUSE: Record<AgeBand, (typeof BLOCKS)[number]> = {
  '8–11': 'Willow House',
  '12–14': 'Cedar House',
  '15–17': 'Rowan House',
};

/* Rooms are sized to the band that sleeps in them, plus one spare room, so a
   house is not short of beds by construction. */
function buildRooms(demand: Record<AgeBand, number>): Room[] {
  const out: Room[] = [];
  (Object.keys(BAND_HOUSE) as AgeBand[]).forEach((band) => {
    const needed = Math.ceil(demand[band] / 3) + 1;
    for (let i = 0; i < needed; i++) {
      const floor = Math.floor(i / 8) + 1;
      const n = (i % 8) + 1;
      out.push({
        id: `r-${band}-${floor}-${String(n).padStart(2, '0')}`,
        block: BAND_HOUSE[band],
        floor,
        number: `${floor}.${String(n).padStart(2, '0')}`,
        beds: 3,
        band,
        wardenId: null,
      });
    }
  });
  return out;
}

export interface Group {
  id: string;
  name: string;
  band: AgeBand;
  ratio: number; // students per staff member required for this band
  whatsapp: string;
}

export const GROUPS: Group[] = [
  { id: 'g-kestrel', name: 'Kestrel', band: '8–11', ratio: 8, whatsapp: 'Kestrel · staff' },
  { id: 'g-merlin', name: 'Merlin', band: '8–11', ratio: 8, whatsapp: 'Merlin · staff' },
  { id: 'g-harrier', name: 'Harrier', band: '12–14', ratio: 10, whatsapp: 'Harrier · staff' },
  { id: 'g-osprey', name: 'Osprey', band: '12–14', ratio: 10, whatsapp: 'Osprey · staff' },
  { id: 'g-peregrine', name: 'Peregrine', band: '15–17', ratio: 12, whatsapp: 'Peregrine · staff' },
];

/* Local calendar date, not UTC. toISOString() shifts every date back a day
   under BST, which moved every arrival and leaving date by one. */
function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function buildStudents(): Student[] {
  const r = rng(20270621);
  const out: Student[] = [];
  const count = 214;
  for (let i = 0; i < count; i++) {
    const forename = FORENAMES[Math.floor(r() * FORENAMES.length)];
    const surname = SURNAMES[Math.floor(r() * SURNAMES.length)];
    const band: AgeBand = r() < 0.32 ? '8–11' : r() < 0.62 ? '12–14' : '15–17';
    const age =
      band === '8–11'
        ? 8 + Math.floor(r() * 4)
        : band === '12–14'
        ? 12 + Math.floor(r() * 3)
        : 15 + Math.floor(r() * 3);
    const groupsInBand = GROUPS.filter((g) => g.band === band);
    const group = groupsInBand[Math.floor(r() * groupsInBand.length)];

    /* Stays are staggered: most arrive on a Sunday, stay 2–5 weeks. */
    const weekOffset = Math.floor(r() * 6);
    const arrival = addDays(SEASON_START, weekOffset * 7);
    const weeks = 2 + Math.floor(r() * 4);
    let leaving = addDays(arrival, weeks * 7);
    if (leaving > SEASON_END) leaving = SEASON_END;

    const docState = (): DocState => {
      const x = r();
      if (x < 0.78) return 'in';
      /* Overdue only counts once the student is already here. */
      return arrival <= DEMO_TODAY && x < 0.9 ? 'overdue' : 'outstanding';
    };

    /* Neutral relationship labels: the generated forenames carry no gender,
       so "Mother" beside a name would be an invented detail. */
    const country = COUNTRIES[Math.floor(r() * COUNTRIES.length)];
    const RELATIONS = ['Parent', 'Parent', 'Guardian', 'Grandparent', 'Aunt or uncle'];
    const DIETARY = [null, null, null, 'Vegetarian', 'No pork', 'Nut allergy — EpiPen carried', 'Coeliac'];
    const MEDICAL = [null, null, null, null, 'Asthma — inhaler carried', 'Hay fever', 'Eczema — cream in room'];
    const guardianSurname = surname;
    const guardianForename = FORENAMES[Math.floor(r() * FORENAMES.length)];
    const balance = [95000, 128000, 164000, 210000][Math.floor(r() * 4)];
    const paidRatio = r();
    out.push({
      id: `s-${String(i + 1).padStart(3, '0')}`,
      forename,
      surname,
      dob: iso(addDays(new Date(`${2027 - age}-01-01`), Math.floor(r() * 364))),
      age,
      band,
      groupId: group.id,
      arrival: iso(arrival),
      leaving: iso(leaving),
      country,
      docs: { medical: docState(), consent: docState(), passport: docState() },
      balancePence: balance,
      paidPence: paidRatio < 0.7 ? balance : Math.round(balance * (0.3 + r() * 0.4)),
      roomId: null,
      bed: 0,
      dietary: DIETARY[Math.floor(r() * DIETARY.length)],
      medical: MEDICAL[Math.floor(r() * MEDICAL.length)],
      guardian: {
        name: `${guardianForename} ${guardianSurname}`,
        relationship: RELATIONS[Math.floor(r() * RELATIONS.length)],
        phone: `+44 7700 9${String(Math.floor(r() * 90000) + 10000)}`,
        altPhone: `+44 20 7${String(Math.floor(r() * 900000) + 100000)}`,
        email: `${guardianForename[0].toLowerCase()}.${guardianSurname.toLowerCase()}@example-family.test`,
        language: LANGUAGE_BY_COUNTRY[country] ?? 'English',
        address: `${Math.floor(r() * 180) + 1} ${STREETS[Math.floor(r() * STREETS.length)]}, ${country}`,
        emergencyName: `${FORENAMES[Math.floor(r() * FORENAMES.length)]} ${SURNAMES[Math.floor(r() * SURNAMES.length)]}`,
        emergencyPhone: `+44 7700 9${String(Math.floor(r() * 90000) + 10000)}`,
        consentToTravel: r() < 0.86,
      },
    });
  }
  return out;
}

export const isOnSite = (s: Student, on: Date = DEMO_TODAY) =>
  new Date(s.arrival) <= on && new Date(s.leaving) >= on;

/* Two students are deliberately left without a bed, so the safeguarding
   reminder for an unallocated arrival has something real to catch. */
const UNALLOCATED_ON_PURPOSE = 2;

function allocate(students: Student[], rooms: Room[]) {
  const byBand: Record<string, Room[]> = {};
  rooms.forEach((room) => {
    (byBand[room.band] ||= []).push(room);
  });
  const fill: Record<string, number> = {};
  const onSiteFirst = [...students].sort(
    (a, b) => Number(isOnSite(b)) - Number(isOnSite(a)),
  );
  const skip = new Set(
    onSiteFirst.filter((s) => isOnSite(s)).slice(0, UNALLOCATED_ON_PURPOSE).map((s) => s.id),
  );

  students.forEach((s) => {
    if (skip.has(s.id)) return;
    const room = (byBand[s.band] ?? []).find((r) => (fill[r.id] ?? 0) < r.beds);
    if (!room) return;
    const bed = (fill[room.id] ?? 0) + 1;
    fill[room.id] = bed;
    s.roomId = room.id;
    s.bed = bed;
  });
  return students;
}

const SEEDED_STUDENTS = buildStudents();

const BAND_DEMAND = SEEDED_STUDENTS.reduce(
  (acc, s) => {
    acc[s.band] += 1;
    return acc;
  },
  { '8–11': 0, '12–14': 0, '15–17': 0 } as Record<AgeBand, number>,
);

export const ROOMS: Room[] = buildRooms(BAND_DEMAND);
export const STUDENTS: Student[] = allocate(SEEDED_STUDENTS, ROOMS);

/* ── Staff ─────────────────────────────────────────────────────────────── */

export type DbsState = 'cleared' | 'expiring' | 'pending' | 'missing';

export interface Staff {
  id: string;
  forename: string;
  surname: string;
  role: string;
  dob: string;
  age: number;
  phone: string;
  email: string;
  dbs: {
    state: DbsState;
    certificate: string | null;
    issued: string | null;
    expires: string | null;
  };
  quals: string[];
  bands: AgeBand[];
  contractedHours: number;
  safeguardingLead?: boolean;
}

const NAMED_STAFF: Staff[] = [
  {
    id: 'st-01', forename: 'Kebba', surname: 'Sarr', role: 'Safeguarding lead',
    dob: '1989-03-14', age: 38, phone: '07700 900081', email: 'k.sarr@example-centre.test',
    dbs: { state: 'cleared', certificate: 'DBS 0041 8827 3390', issued: '2026-11-02', expires: '2028-11-02' },
    quals: ['Designated Safeguarding Lead', 'Paediatric first aid', 'Prevent awareness'],
    bands: ['8–11', '12–14', '15–17'], contractedHours: 40, safeguardingLead: true,
  },
  {
    id: 'st-02', forename: 'Tomas', surname: 'Halvorsen', role: 'Activity manager',
    dob: '1994-07-22', age: 33, phone: '07700 900117', email: 't.halvorsen@example-centre.test',
    dbs: { state: 'cleared', certificate: 'DBS 0041 9034 1182', issued: '2027-01-19', expires: '2029-01-19' },
    quals: ['Beach lifeguard', 'Paediatric first aid', 'Level 2 coaching'],
    bands: ['12–14', '15–17'], contractedHours: 40,
  },
  {
    id: 'st-03', forename: 'Marta', surname: 'Salgado', role: 'Group leader',
    dob: '2001-11-08', age: 25, phone: '07700 900244', email: 'm.salgado@example-centre.test',
    dbs: { state: 'expiring', certificate: 'DBS 0041 7719 5540', issued: '2025-08-01', expires: '2027-07-31' },
    quals: ['Paediatric first aid', 'TEFL'],
    bands: ['8–11', '12–14'], contractedHours: 37.5,
  },
  {
    id: 'st-04', forename: 'Idris', surname: 'Okonjo', role: 'Group leader',
    dob: '2003-02-27', age: 24, phone: '07700 900318', email: 'i.okonjo@example-centre.test',
    dbs: { state: 'pending', certificate: null, issued: null, expires: null },
    quals: ['Paediatric first aid'],
    bands: ['12–14'], contractedHours: 37.5,
  },
  {
    id: 'st-05', forename: 'Freya', surname: 'Lindqvist', role: 'Group leader',
    dob: '2002-05-30', age: 25, phone: '07700 900402', email: 'f.lindqvist@example-centre.test',
    dbs: { state: 'cleared', certificate: 'DBS 0041 8102 7741', issued: '2026-04-11', expires: '2028-04-11' },
    quals: ['Paediatric first aid', 'Duke of Edinburgh supervisor'],
    bands: ['15–17'], contractedHours: 37.5,
  },
  {
    id: 'st-06', forename: 'Ravi', surname: 'Iyer', role: 'Activity instructor',
    dob: '1998-09-12', age: 28, phone: '07700 900556', email: 'r.iyer@example-centre.test',
    dbs: { state: 'missing', certificate: null, issued: null, expires: null },
    quals: ['Level 2 archery'],
    bands: ['12–14', '15–17'], contractedHours: 30,
  },
  {
    id: 'st-07', forename: 'Anouk', surname: 'Jansen', role: 'Welfare officer',
    dob: '1991-12-03', age: 35, phone: '07700 900613', email: 'a.jansen@example-centre.test',
    dbs: { state: 'cleared', certificate: 'DBS 0041 8890 2214', issued: '2026-06-28', expires: '2028-06-28' },
    quals: ['Mental health first aid', 'Paediatric first aid'],
    bands: ['8–11', '12–14', '15–17'], contractedHours: 40,
  },
  {
    id: 'st-08', forename: 'Luca', surname: 'Moretti', role: 'Group leader',
    dob: '2000-04-18', age: 27, phone: '07700 900728', email: 'l.moretti@example-centre.test',
    dbs: { state: 'cleared', certificate: 'DBS 0041 7994 6603', issued: '2026-09-15', expires: '2028-09-15' },
    quals: ['Paediatric first aid', 'Minibus D1'],
    bands: ['8–11'], contractedHours: 37.5,
  },
];

/* The eight above are the named season leads. A centre running 214 students
   needs a full roster to meet 1:8 in the youngest band, so the rest of the
   seasonal staff are generated — same shape, cleared checks, spread of
   qualifications. */
function buildStaff(): Staff[] {
  const r = rng(4821);
  const roles = ['Group leader', 'Activity instructor', 'EFL teacher'];
  const qualPool = [
    'Paediatric first aid', 'TEFL', 'Level 2 coaching', 'Beach lifeguard',
    'Level 2 archery', 'Minibus D1', 'Mental health first aid',
  ];
  /* Weighted towards multi-band cover: a seasonal team that can only work one
     age band cannot staff five groups in the same slot. */
  const bandSets: AgeBand[][] = [
    ['8–11', '12–14'], ['12–14', '15–17'], ['8–11', '12–14', '15–17'],
    ['8–11', '12–14', '15–17'], ['8–11'], ['12–14'], ['15–17'],
  ];
  const out: Staff[] = [...NAMED_STAFF];
  for (let i = 0; i < 42; i++) {
    const forename = FORENAMES[Math.floor(r() * FORENAMES.length)];
    const surname = SURNAMES[Math.floor(r() * SURNAMES.length)];
    const age = 21 + Math.floor(r() * 18);
    const quals = ['Paediatric first aid'];
    /* Two extra qualifications each, so specialist activities can be staffed. */
    for (let k = 0; k < 2; k++) {
      const q = qualPool[Math.floor(r() * qualPool.length)];
      if (!quals.includes(q)) quals.push(q);
    }
    /* Issued inside the last 18 months so the two-year expiry always lands
       after the season. A generated record that expires before today reads as
       cleared while actually being expired, which is the exact failure this
       product exists to catch — it must not appear by accident. */
    const issuedYear = 2026;
    const issuedMonth = 1 + Math.floor(r() * 12);
    const issuedDay = 1 + Math.floor(r() * 27);
    const pad = (n: number) => String(n).padStart(2, '0');
    const issued = `${issuedYear}-${pad(issuedMonth)}-${pad(issuedDay)}`;
    out.push({
      id: `st-${String(i + 9).padStart(2, '0')}`,
      forename,
      surname,
      role: roles[Math.floor(r() * roles.length)],
      dob: `${2027 - age}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
      age,
      phone: `07700 9${String(Math.floor(r() * 90000) + 10000)}`,
      email: `${forename[0].toLowerCase()}.${surname.toLowerCase()}@example-centre.test`,
      dbs: {
        state: 'cleared',
        certificate: `DBS ${String(Math.floor(r() * 9000) + 1000)} ${String(Math.floor(r() * 9000) + 1000)} ${String(Math.floor(r() * 9000) + 1000)}`,
        issued,
        expires: `${issuedYear + 2}-${pad(issuedMonth)}-${pad(issuedDay)}`,
      },
      quals,
      bands: bandSets[Math.floor(r() * bandSets.length)],
      contractedHours: [37.5, 37.5, 40, 30, 25][Math.floor(r() * 5)],
    });
  }
  return out;
}

export const STAFF: Staff[] = buildStaff();

/* ── Activities, sessions, bookings ───────────────────────────────────── */

export interface Activity {
  id: string;
  name: string;
  location: string;
  capacity: number;
  requiresQual: string | null;
  supplier: string | null;
  costPence: number | null;
}

export const ACTIVITIES: Activity[] = [
  { id: 'a-archery', name: 'Archery', location: 'Lower field', capacity: 24, requiresQual: 'Level 2 archery', supplier: 'Fieldcraft Outdoor Ltd', costPence: 42000 },
  { id: 'a-kayak', name: 'Kayaking', location: 'Marine centre', capacity: 20, requiresQual: 'Beach lifeguard', supplier: 'Harbour Watersports', costPence: 68000 },
  { id: 'a-english', name: 'English lesson', location: 'Block C', capacity: 30, requiresQual: 'TEFL', supplier: null, costPence: null },
  { id: 'a-drama', name: 'Drama workshop', location: 'Hall', capacity: 28, requiresQual: null, supplier: 'Playhouse Education', costPence: 31000 },
  { id: 'a-museum', name: 'Museum excursion', location: 'Off site — city', capacity: 45, requiresQual: null, supplier: 'Crown Coaches', costPence: 96000 },
  { id: 'a-football', name: 'Football', location: 'Astro pitch', capacity: 24, requiresQual: 'Level 2 coaching', supplier: null, costPence: null },
  { id: 'a-climbing', name: 'Climbing wall', location: 'Sports centre', capacity: 16, requiresQual: null, supplier: 'Vertical Ltd', costPence: 54000 },
];

export type SessionStatus = 'scheduled' | 'reslotted' | 'cancelled';

export interface Session {
  id: string;
  activityId: string;
  groupId: string;
  day: string;
  start: string;
  end: string;
  staffIds: string[];
  status: SessionStatus;
  origin: 'ai-draft' | 'manual';
  reslotFrom?: string;
  reslotReason?: string;
}

export const SLOTS = [
  { start: '09:00', end: '10:30' },
  { start: '11:00', end: '12:30' },
  { start: '14:00', end: '15:30' },
  { start: '16:00', end: '17:30' },
];

/* A session is 90 minutes. Weekly hours are counted off the rota, so the
   number a staff screen shows is the same one the timetable produced. */
export const SLOT_HOURS = 1.5;

/* Monday to Saturday of the week DEMO_TODAY falls in. Sunday is changeover:
   students arrive and leave, and no activity sessions run. */
function weekOf(d: Date) {
  const monday = new Date(d);
  const shift = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - shift);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 6 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

export const WEEK: Date[] = weekOf(DEMO_TODAY);
export const WEEK_DAYS: string[] = WEEK.map(iso);

export const dayName = (isoStr: string) =>
  new Date(isoStr).toLocaleDateString('en-GB', { weekday: 'short' });

const DUTY_ROLES = ['Safeguarding lead', 'Welfare officer'];

function buildSessions(): Session[] {
  const r = rng(717);
  const out: Session[] = [];
  const today = iso(DEMO_TODAY);
  const pool = ACTIVITIES.map((a) => a.id);

  /* Nobody can be in two groups at once. Without this the same few names get
     picked for every group in a slot, weekly hours run past the working-time
     limit, and the rota is describing something impossible. */
  const busy = new Map<string, Set<string>>();
  const claim = (day: string, start: string) => {
    const key = `${day}|${start}`;
    let set = busy.get(key);
    if (!set) busy.set(key, (set = new Set()));
    return set;
  };

  WEEK_DAYS.forEach((day, di) => {
    GROUPS.forEach((g, gi) => {
      SLOTS.forEach((slot, si) => {
        const activityId = pool[(di * 2 + gi * 3 + si * 2) % pool.length];
        const activity = ACTIVITIES.find((a) => a.id === activityId)!;
        const needed = Math.ceil(
          STUDENTS.filter((s) => s.groupId === g.id).length / g.ratio,
        );

        /* A draft only ever rota's cleared staff. An activity carrying a
           qualification needs ONE staff member holding it — the instructor —
           plus cleared cover to make the ratio, which is how a centre staffs
           archery or kayaking in practice. */
        /* The safeguarding lead and the welfare officer hold the centre's
           duty roles. Rota'ing them onto kayaking is the sort of detail a
           centre director spots immediately. */
        const cleared = STAFF.filter(
          (s) =>
            s.dbs.state === 'cleared' &&
            s.bands.includes(g.band) &&
            !DUTY_ROLES.includes(s.role),
        );
        const taken = claim(day, slot.start);
        const free = cleared.filter((c) => !taken.has(c.id));
        const instructor = activity.requiresQual
          ? free.find((s) => s.quals.includes(activity.requiresQual!))
          : undefined;

        /* The two deliberate failures sit on the current day only, so the
           safeguarding gate has something real to catch without the whole
           week reading as broken. */
        const shortStaffed = day === today && gi === 2 && si === 1;
        const unclearedDbs = day === today && gi === 4 && si === 3;
        const take = shortStaffed ? Math.max(1, needed - 2) : needed;

        /* Rotate the pool, or the same few people carry every session all
           week and the hours column is meaningless. */
        const picked = instructor ? [instructor] : [];
        const offset = (di * SLOTS.length * 2 + si * 3 + gi) % Math.max(free.length, 1);
        for (let k = 0; k < free.length && picked.length < take; k++) {
          const c = free[(offset + k) % free.length];
          if (!picked.includes(c)) picked.push(c);
        }

        const staffIds = picked
          .slice(0, Math.max(take, picked.length ? 1 : 0))
          .map((x) => x.id);
        if (unclearedDbs && staffIds.length) staffIds[staffIds.length - 1] = 'st-06';
        staffIds.forEach((sid) => taken.add(sid));

        out.push({
          id: `sess-${day}-${g.id}-${si}`,
          activityId,
          groupId: g.id,
          day,
          start: slot.start,
          end: slot.end,
          staffIds,
          status: 'scheduled',
          origin: r() < 0.8 ? 'ai-draft' : 'manual',
        });
      });
    });
  });
  return out;
}

export const SESSIONS: Session[] = buildSessions();

/* ── Rota hours ───────────────────────────────────────────────────────────
   Hours rota'd, not hours paid. Payroll stays outside the platform
   (DECISIONS.md 0001); this is the rota's own number.
   ──────────────────────────────────────────────────────────────────────── */

export const sessionsFor = (staffId: string, sessions: Session[] = SESSIONS) =>
  sessions
    .filter((s) => s.status !== 'cancelled' && s.staffIds.includes(staffId))
    .sort(
      (a, b) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start),
    );

export const weeklyHours = (staffId: string, sessions: Session[] = SESSIONS) =>
  sessionsFor(staffId, sessions).length * SLOT_HOURS;

export const dayHours = (
  staffId: string,
  day: string,
  sessions: Session[] = SESSIONS,
) =>
  sessions.filter(
    (s) => s.day === day && s.status !== 'cancelled' && s.staffIds.includes(staffId),
  ).length * SLOT_HOURS;

export const fmtHours = (h: number) =>
  Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;

/* The Working Time Regulations opt-out threshold. A centre that rota's past
   it needs a signed opt-out on file, so the screen flags it rather than
   silently scheduling. */
export const WEEKLY_LIMIT = 48;

export interface Receipt {
  filename: string;
  bytes: number;
  attachedAt: string;
  attachedBy: string;
}

export type BookingStatus = 'draft' | 'confirmed';

export interface Booking {
  id: string;
  activityId: string;
  groupId: string;
  date: string;
  headcount: number;
  costPence: number;
  supplier: string;
  reference: string;
  status: BookingStatus;
  receipt: Receipt | null;
}

export const BOOKINGS: Booking[] = [
  { id: 'bk-1041', activityId: 'a-kayak', groupId: 'g-harrier', date: '2027-07-13', headcount: 20, costPence: 68000, supplier: 'Harbour Watersports', reference: 'HW-2027-0413', status: 'confirmed', receipt: { filename: 'harbour-watersports-0413.pdf', bytes: 184320, attachedAt: '2027-07-06', attachedBy: 'Ismail' } },
  { id: 'bk-1042', activityId: 'a-museum', groupId: 'g-peregrine', date: '2027-07-14', headcount: 42, costPence: 96000, supplier: 'Crown Coaches', reference: 'CC-88213', status: 'draft', receipt: null },
  { id: 'bk-1043', activityId: 'a-climbing', groupId: 'g-osprey', date: '2027-07-15', headcount: 16, costPence: 54000, supplier: 'Vertical Ltd', reference: 'VL-7741', status: 'draft', receipt: null },
  { id: 'bk-1044', activityId: 'a-archery', groupId: 'g-kestrel', date: '2027-07-16', headcount: 22, costPence: 42000, supplier: 'Fieldcraft Outdoor Ltd', reference: 'FO-2027-118', status: 'confirmed', receipt: { filename: 'fieldcraft-118.pdf', bytes: 96256, attachedAt: '2027-07-09', attachedBy: 'Ismail' } },
  { id: 'bk-1045', activityId: 'a-drama', groupId: 'g-merlin', date: '2027-07-17', headcount: 26, costPence: 31000, supplier: 'Playhouse Education', reference: 'PE-4402', status: 'draft', receipt: null },
  { id: 'bk-1046', activityId: 'a-museum', groupId: 'g-harrier', date: '2027-07-20', headcount: 40, costPence: 96000, supplier: 'Crown Coaches', reference: 'CC-88240', status: 'draft', receipt: null },
];

/* ── Derived helpers ─────────────────────────────────────────────────── */

export const roomById = (id: string | null) =>
  id ? ROOMS.find((r) => r.id === id) ?? null : null;

export const occupants = (roomId: string) =>
  STUDENTS.filter((s) => s.roomId === roomId).sort((a, b) => a.bed - b.bed);

export const roomLabel = (id: string | null) => {
  const r = roomById(id);
  return r ? `${r.block} ${r.number}` : 'Not allocated';
};

/* One warden per floor of each block, drawn from cleared staff only. */
export function wardenFor(room: Room) {
  const cleared = STAFF.filter(
    (s) => s.dbs.state === 'cleared' && s.bands.includes(room.band),
  );
  if (!cleared.length) return null;
  const key = `${room.block}-${room.floor}`;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return cleared[h % cleared.length];
}

export const groupById = (id: string) => GROUPS.find((g) => g.id === id)!;
export const activityById = (id: string) => ACTIVITIES.find((a) => a.id === id)!;
export const staffById = (id: string) => STAFF.find((s) => s.id === id)!;

export function fmtDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short',
  });
}

export function fmtDateLong(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fmtMoney(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* Arrivals still to come, today included, oldest date first. */
export function upcomingArrivals(from: Date = DEMO_TODAY) {
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  return STUDENTS.filter((s) => new Date(s.arrival) >= day).sort(
    (a, b) =>
      a.arrival.localeCompare(b.arrival) || a.surname.localeCompare(b.surname),
  );
}

export function groupByArrival(students: Student[]) {
  const map = new Map<string, Student[]>();
  students.forEach((s) => {
    const list = map.get(s.arrival) ?? [];
    list.push(s);
    map.set(s.arrival, list);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function daysFromToday(isoStr: string, from: Date = DEMO_TODAY) {
  const a = new Date(isoStr);
  a.setHours(0, 0, 0, 0);
  const b = new Date(from);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function whenLabel(isoStr: string) {
  const d = daysFromToday(isoStr);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d < 0) return `${Math.abs(d)} days ago`;
  return `in ${d} days`;
}

/* What still has to be true before a student can walk in. */
export interface Readiness {
  ready: boolean;
  blocking: string[];
  watch: string[];
}

export function readiness(s: Student): Readiness {
  const blocking: string[] = [];
  const watch: string[] = [];

  if (!s.roomId) blocking.push('No room allocated');

  const docs = Object.entries(s.docs) as [string, DocState][];
  const missing = docs.filter(([, v]) => v !== 'in').map(([k]) => k);
  const safeguardingDocs = missing.filter(
    (k) => k === 'medical' || k === 'consent',
  );
  if (safeguardingDocs.length) {
    blocking.push(`${safeguardingDocs.join(' and ')} form outstanding`);
  }
  if (missing.includes('passport')) watch.push('Passport copy outstanding');
  if (!s.guardian.consentToTravel) watch.push('No off-site travel consent');
  if (s.paidPence < s.balancePence) watch.push('Balance outstanding');

  return { ready: blocking.length === 0, blocking, watch };
}

export function nights(s: Student) {
  return Math.round(
    (new Date(s.leaving).getTime() - new Date(s.arrival).getTime()) / 86400000,
  );
}
