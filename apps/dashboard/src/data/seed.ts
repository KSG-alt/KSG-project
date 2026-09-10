/* ─────────────────────────────────────────────────────────────────────────
   Seeded demonstration data.

   SYNTHETIC. Every student, parent, staff member, payment and incident below
   is invented. No real centre, person or record appears here. PRODUCT.md
   records that this product is pre-pilot: there are no customers, no usage
   data and no case study, and nothing in this file may be presented as real.

   Deterministic: the same seed produces the same sheet on every load, so a
   demo does not reshuffle itself mid-conversation.
   ───────────────────────────────────────────────────────────────────────── */

export type Urgency = 'settled' | 'ahead' | 'due' | 'overdue' | 'critical'

export type ItemKind = 'medical' | 'consent' | 'passport' | 'payment' | 'dbs'

export interface ChaseItem {
  id: string
  kind: ItemKind
  /** Student or staff member the item belongs to. */
  subjectId: string
  subject: string
  group: string | null
  label: string
  dueOn: string
  /** Negative = days remaining, positive = days overdue. */
  daysOverdue: number
  urgency: Urgency
  safeguarding: boolean
  amountPence?: number
  /** Chase history, newest last. Escalations print into the record itself. */
  log: LogEntry[]
}

export interface LogEntry {
  at: string
  kind: 'sent' | 'opened' | 'replied' | 'escalated' | 'received' | 'matched' | 'note'
  text: string
}

export interface Student {
  id: string
  name: string
  ageBand: string
  group: string
  arrivesOn: string
  site: string
  nationality: string
}

export interface Staff {
  id: string
  name: string
  role: string
  site: string
  dbsStatus: 'valid' | 'expiring' | 'expired' | 'pending'
  dbsExpires: string
  quals: string[]
}

export interface Session {
  id: string
  day: string
  slot: string
  activity: string
  group: string
  ageBand: string
  site: string
  location: string
  staffIds: string[]
  students: number
  requiredRatio: number
  status: 'scheduled' | 'reslotted' | 'cancelled'
  note?: string
}

export interface AgeBand {
  id: string
  label: string
  ratio: number
  note: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  kind: 'ratio' | 'dbs' | 'incident' | 'config' | 'document'
  severity: 'info' | 'flag' | 'critical'
  text: string
}

/* ── Deterministic RNG (mulberry32) ─────────────────────────────────────── */
function rng(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20270712)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]

/* ── The centre ─────────────────────────────────────────────────────────── */

export const CENTRE = {
  name: 'Fenmarsh Summer Centre',
  season: 'Summer 2027',
  seasonStart: '2027-06-28',
  seasonEnd: '2027-08-20',
  week: 3,
  weeks: 8,
  today: 'Tuesday 13 July 2027',
  sites: ['Fenmarsh Hall', 'Ely Road Annexe'],
  enrolled: 218,
  director: 'Marianne Okafor',
  safeguardingLead: 'Tomasz Wierzbicki',
}

export const AGE_BANDS: AgeBand[] = [
  { id: 'ab-junior', label: 'Junior · 8–11', ratio: 8, note: 'One staff per 8. Overnight cover required.' },
  { id: 'ab-inter', label: 'Intermediate · 12–14', ratio: 10, note: 'One staff per 10.' },
  { id: 'ab-senior', label: 'Senior · 15–17', ratio: 15, note: 'One staff per 15. Off-site excursions per 12.' },
]

const GROUPS = [
  { id: 'g-kingfisher', name: 'Kingfisher', band: 'Junior · 8–11', site: 'Fenmarsh Hall' },
  { id: 'g-heron', name: 'Heron', band: 'Junior · 8–11', site: 'Fenmarsh Hall' },
  { id: 'g-otter', name: 'Otter', band: 'Intermediate · 12–14', site: 'Fenmarsh Hall' },
  { id: 'g-marten', name: 'Marten', band: 'Intermediate · 12–14', site: 'Ely Road Annexe' },
  { id: 'g-harrier', name: 'Harrier', band: 'Senior · 15–17', site: 'Ely Road Annexe' },
  { id: 'g-curlew', name: 'Curlew', band: 'Senior · 15–17', site: 'Ely Road Annexe' },
]

export { GROUPS }

const FIRST = [
  'Sofia', 'Mateo', 'Yuki', 'Amara', 'Luca', 'Noor', 'Elif', 'Tomás', 'Lina',
  'Rafael', 'Chiara', 'Kenji', 'Alba', 'Idris', 'Freya', 'Santiago', 'Mina',
  'Bruno', 'Zara', 'Hugo', 'Nadia', 'Emre', 'Clara', 'Dmitri', 'Aiko',
  'Paulo', 'Leila', 'Anton', 'Marta', 'Ravi', 'Ines', 'Kofi', 'Greta',
  'Salim', 'Lucia', 'Jonas', 'Priya', 'Andrei', 'Maya', 'Théo',
]
const LAST = [
  'Almeida', 'Nakamura', 'Okonkwo', 'Rossi', 'Haddad', 'Yilmaz', 'Silva',
  'Kowalski', 'Bianchi', 'Fernández', 'Dubois', 'Novák', 'Andersen', 'Mensah',
  'Popescu', 'Kaur', 'Lindqvist', 'Moreau', 'Costa', 'Weber', 'Marchetti',
  'Sørensen', 'Petrov', 'Castillo', 'Ferreira', 'Bauer', 'Oyelaran', 'Varga',
]
const NATIONS = [
  'Spain', 'Italy', 'Japan', 'Nigeria', 'France', 'Türkiye', 'Brazil',
  'Poland', 'Germany', 'Romania', 'Sweden', 'Portugal', 'Mexico', 'Korea',
]

function isoPlus(days: number) {
  const base = new Date('2027-07-13T00:00:00Z')
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
export { fmtDate }

function urgencyFor(daysOverdue: number, safeguarding: boolean): Urgency {
  // Safeguarding-critical items reach Critical sooner. Escalation to the
  // safeguarding lead happens earlier still, at 4 days — see logFor().
  if (safeguarding && daysOverdue >= 8) return 'critical'
  if (daysOverdue >= 13) return 'critical'
  if (daysOverdue > 0) return 'overdue'
  if (daysOverdue > -3) return 'due'
  if (daysOverdue > -10) return 'ahead'
  return 'settled'
}

/* ── Students ───────────────────────────────────────────────────────────── */

export const STUDENTS: Student[] = Array.from({ length: 218 }, (_, i) => {
  const g = GROUPS[i % GROUPS.length]
  return {
    id: `s-${String(i + 1).padStart(3, '0')}`,
    name: `${pick(FIRST)} ${pick(LAST)}`,
    ageBand: g.band,
    group: g.name,
    arrivesOn: isoPlus(pick([-14, -7, 0, 5, 12, 19])),
    site: g.site,
    nationality: pick(NATIONS),
  }
})

/* ── Staff ──────────────────────────────────────────────────────────────── */

export const STAFF: Staff[] = [
  { id: 'st-01', name: 'Tomasz Wierzbicki', role: 'Safeguarding lead', site: 'Fenmarsh Hall', dbsStatus: 'valid', dbsExpires: '2028-03-11', quals: ['DSL', 'First aid'] },
  { id: 'st-02', name: 'Marianne Okafor', role: 'Centre director', site: 'Fenmarsh Hall', dbsStatus: 'valid', dbsExpires: '2029-01-04', quals: ['DSL'] },
  { id: 'st-03', name: 'Ruth Ellery', role: 'Activity manager', site: 'Fenmarsh Hall', dbsStatus: 'expiring', dbsExpires: '2027-07-29', quals: ['First aid', 'Lifeguard'] },
  { id: 'st-04', name: 'Declan Moss', role: 'Activity leader', site: 'Fenmarsh Hall', dbsStatus: 'valid', dbsExpires: '2028-06-30', quals: ['First aid'] },
  { id: 'st-05', name: 'Priya Raman', role: 'Activity leader', site: 'Ely Road Annexe', dbsStatus: 'expired', dbsExpires: '2027-07-02', quals: ['First aid'] },
  { id: 'st-06', name: 'Jonah Beckett', role: 'Activity leader', site: 'Ely Road Annexe', dbsStatus: 'valid', dbsExpires: '2028-09-15', quals: [] },
  { id: 'st-07', name: 'Aoife Brennan', role: 'Welfare officer', site: 'Fenmarsh Hall', dbsStatus: 'valid', dbsExpires: '2028-11-02', quals: ['First aid', 'Mental health FA'] },
  { id: 'st-08', name: 'Samir Haddad', role: 'Activity leader', site: 'Ely Road Annexe', dbsStatus: 'pending', dbsExpires: '—', quals: ['Lifeguard'] },
  { id: 'st-09', name: 'Grace Whitcombe', role: 'Activity leader', site: 'Fenmarsh Hall', dbsStatus: 'valid', dbsExpires: '2029-02-18', quals: ['First aid'] },
  { id: 'st-10', name: 'Bartek Nowak', role: 'Excursion lead', site: 'Ely Road Annexe', dbsStatus: 'valid', dbsExpires: '2028-04-22', quals: ['First aid', 'Minibus D1'] },
  { id: 'st-11', name: 'Hannah Vale', role: 'Activity leader', site: 'Fenmarsh Hall', dbsStatus: 'valid', dbsExpires: '2028-08-08', quals: [] },
  { id: 'st-12', name: 'Olu Adeyemi', role: 'Activity leader', site: 'Ely Road Annexe', dbsStatus: 'valid', dbsExpires: '2029-05-30', quals: ['First aid'] },
]

/* ── Chase items ────────────────────────────────────────────────────────── */

const DOC_LABELS: Record<Exclude<ItemKind, 'payment' | 'dbs'>, string> = {
  medical: 'Medical & dietary form',
  consent: 'Parental consent — excursions & imagery',
  passport: 'Passport copy & visa',
}

function logFor(kind: ItemKind, daysOverdue: number, subject: string): LogEntry[] {
  const log: LogEntry[] = []
  const sentAt = isoPlus(-Math.max(daysOverdue, 0) - 9)
  log.push({ at: sentAt, kind: 'sent', text: `Reminder sent to parent of ${subject}` })
  if (daysOverdue > -4) {
    log.push({ at: isoPlus(-Math.max(daysOverdue, 0) - 6), kind: 'opened', text: 'Reminder opened, no response' })
  }
  if (daysOverdue > 0) {
    log.push({ at: isoPlus(-daysOverdue + 1), kind: 'sent', text: 'Second reminder sent automatically' })
  }
  if (daysOverdue >= 4) {
    log.push({
      at: isoPlus(-daysOverdue + 4),
      kind: 'escalated',
      text:
        kind === 'medical' || kind === 'consent'
          ? 'Escalated to safeguarding lead — item is safeguarding-critical'
          : 'Escalated to centre admin — overdue past threshold',
    })
  }
  return log
}

function buildItems(): ChaseItem[] {
  const items: ChaseItem[] = []
  let n = 0

  for (const student of STUDENTS) {
    const kinds: ItemKind[] = ['medical', 'consent', 'passport', 'payment']
    for (const kind of kinds) {
      // Most items are settled. The sheet is only interesting where it isn't.
      const roll = rand()
      if (roll > 0.31) continue

      const daysOverdue = Math.round(-14 + 30 * Math.pow(rand(), 3))
      const safeguarding = kind === 'medical' || kind === 'consent'
      n += 1

      items.push({
        id: `i-${String(n).padStart(4, '0')}`,
        kind,
        subjectId: student.id,
        subject: student.name,
        group: student.group,
        label:
          kind === 'payment'
            ? 'Balance outstanding'
            : DOC_LABELS[kind as Exclude<ItemKind, 'payment' | 'dbs'>],
        dueOn: isoPlus(-daysOverdue),
        daysOverdue,
        urgency: urgencyFor(daysOverdue, safeguarding),
        safeguarding,
        amountPence: kind === 'payment' ? Math.round((rand() * 1400 + 180)) * 100 : undefined,
        log: logFor(kind, daysOverdue, student.name),
      })
    }
  }

  // Staff DBS items are chased in the same queue as student documents.
  for (const s of STAFF) {
    if (s.dbsStatus === 'valid') continue
    const daysOverdue = s.dbsStatus === 'expired' ? 11 : s.dbsStatus === 'pending' ? 6 : -16
    n += 1
    items.push({
      id: `i-${String(n).padStart(4, '0')}`,
      kind: 'dbs',
      subjectId: s.id,
      subject: s.name,
      group: null,
      label:
        s.dbsStatus === 'expired'
          ? 'DBS expired — staff must not be rota’d'
          : s.dbsStatus === 'pending'
            ? 'DBS check pending — awaiting certificate'
            : 'DBS expires this season',
      dueOn: isoPlus(-daysOverdue),
      daysOverdue,
      urgency: urgencyFor(daysOverdue, true),
      safeguarding: true,
      log: logFor('dbs', daysOverdue, s.name),
    })
  }

  return items.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export const ITEMS: ChaseItem[] = buildItems()

/* ── Timetable ──────────────────────────────────────────────────────────── */

const DAYS = ['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16']
const SLOTS = ['09:00 Morning', '11:15 Late morning', '14:00 Afternoon', '16:30 Late afternoon']
const ACTIVITIES = [
  'English — general', 'English — exam prep', 'Kayaking', 'Football',
  'Drama workshop', 'Fen walk & wildlife', 'Art studio', 'Swimming',
  'Cathedral excursion', 'Bouldering', 'Film club', 'Orienteering',
]

export { DAYS, SLOTS }

function buildSessions(): Session[] {
  const out: Session[] = []
  let n = 0
  for (const day of DAYS) {
    for (const slot of SLOTS) {
      for (const g of GROUPS) {
        n += 1
        const band = AGE_BANDS.find((b) => b.label === g.band)!
        const students = Math.round(18 + rand() * 12)
        const needed = Math.ceil(students / band.ratio)
        const shortfall = rand() < 0.12 ? 1 : 0
        const staffIds = STAFF.filter((s) => s.site === g.site)
          .slice(0, Math.max(1, needed - shortfall))
          .map((s) => s.id)
        const cancelled = rand() < 0.045
        const reslotted = !cancelled && rand() < 0.06
        out.push({
          id: `ses-${String(n).padStart(3, '0')}`,
          day,
          slot,
          activity: pick(ACTIVITIES),
          group: g.name,
          ageBand: g.band,
          site: g.site,
          location: pick(['Main hall', 'Studio 2', 'Lower field', 'Riverside', 'Room 14', 'Sports centre']),
          staffIds,
          students,
          requiredRatio: band.ratio,
          status: cancelled ? 'cancelled' : reslotted ? 'reslotted' : 'scheduled',
          note: cancelled
            ? 'Cancelled — weather. Only this group needs re-slotting.'
            : reslotted
              ? 'Re-slotted from Wed 14 after pool closure.'
              : undefined,
        })
      }
    }
  }
  return out
}

export const SESSIONS: Session[] = buildSessions()

/* ── Audit trail ────────────────────────────────────────────────────────── */

export const AUDIT: AuditEntry[] = [
  { id: 'a-01', at: '13 Jul 2027, 08:14', actor: 'System', kind: 'ratio', severity: 'critical', text: 'Harrier · 14:00 Kayaking flagged below ratio — 29 students, 1 staff, requires 2. Session start in 5h 46m.' },
  { id: 'a-02', at: '13 Jul 2027, 07:52', actor: 'System', kind: 'dbs', severity: 'critical', text: 'Priya Raman DBS expired 2 Jul 2027. Removed from all rota assignments automatically.' },
  { id: 'a-03', at: '12 Jul 2027, 19:03', actor: 'Tomasz Wierzbicki', kind: 'incident', severity: 'flag', text: 'Minor injury recorded — Otter group, lower field. First aid given by Declan Moss. Parent notified.' },
  { id: 'a-04', at: '12 Jul 2027, 16:41', actor: 'System', kind: 'document', severity: 'flag', text: '9 medical forms escalated to safeguarding lead after 4 days overdue.' },
  { id: 'a-05', at: '12 Jul 2027, 11:20', actor: 'Marianne Okafor', kind: 'config', severity: 'info', text: 'Senior excursion ratio changed from 1:15 to 1:12 for off-site sessions.' },
  { id: 'a-06', at: '11 Jul 2027, 09:35', actor: 'System', kind: 'ratio', severity: 'info', text: 'All 24 Monday sessions met required ratios at start of session.' },
  { id: 'a-07', at: '10 Jul 2027, 18:12', actor: 'Aoife Brennan', kind: 'incident', severity: 'flag', text: 'Welfare concern logged — Kingfisher group. Referred to safeguarding lead, closed same day.' },
  { id: 'a-08', at: '09 Jul 2027, 14:07', actor: 'System', kind: 'dbs', severity: 'flag', text: 'Ruth Ellery DBS expires in 16 days. Renewal reminder sent.' },
]

/* ── Derived summaries ──────────────────────────────────────────────────── */

export const URGENCY_ORDER: Urgency[] = ['critical', 'overdue', 'due', 'ahead', 'settled']

export const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Critical',
  overdue: 'Overdue',
  due: 'Due soon',
  ahead: 'In hand',
  settled: 'Settled',
}

export const KIND_LABEL: Record<ItemKind, string> = {
  medical: 'Medical form',
  consent: 'Consent form',
  passport: 'Passport copy',
  payment: 'Payment',
  dbs: 'Staff DBS',
}

/** Long-form date for records an inspector reads. */
export function fmtLong(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function money(pence: number) {
  return '£' + (pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
