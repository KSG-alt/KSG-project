/* ── The inspection pack ──────────────────────────────────────────────────
   The audit trail is the evidence; this is the evidence arranged the way an
   inspector asks for it. Ofsted and British Council inspections of a summer
   programme come back to the same four questions — was everybody working
   with children vetted, were the ratios held, what happened when something
   went wrong, and did anyone act when the system said they should — so the
   pack answers those four, in that order, and then hands over the raw trail.

   Every number here is computed from the records the rest of the platform
   already holds. Nothing is added to make the pack read better: a gap in the
   record is reported as a gap ("no resolution recorded"), because a pack that
   fills its own gaps is not evidence of anything.

   What goes in the pack is the safeguarding lead's call, not this file's.
   The sections and their order are a draft for Kebba's functional spec —
   see the PR notes for the assumptions made here.
   ──────────────────────────────────────────────────────────────────────── */

import type { AuditEntry } from './audit';
import { checkRatio, type RatioVerdict } from './ratio';
import type { Incident } from '../data/incidents';
import type { Register } from '../data/attendance';
import {
  activityById, groupById, type Session, type Staff, type Student,
} from '../data/seed';

export interface PackInput {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  audit: AuditEntry[];
  staff: Staff[];
  students: Student[];
  sessions: Session[];
  registers: Register[];
  incidents: Incident[];
  /* The demo clock as "YYYY-MM-DDTHH:MM" — a session that has not finished
     yet cannot be missing its register. */
  now: string;
}

export interface VettingRow {
  staff: Staff;
  /* Expires inside the range, or already expired at its end. */
  expiresInRange: boolean;
  /* Sessions with students this person was rota'd onto inside the range. */
  sessions: number;
}

export interface UnclearedOnRota {
  staff: Staff;
  sessions: Session[];
  /* What the trail says was done about it, oldest first. */
  record: AuditEntry[];
}

export interface RatioBreach {
  session: Session;
  label: string;
  verdict: RatioVerdict;
  /* Trail entries for this session other than the check itself. Empty means
     nobody recorded doing anything — which the pack says in so many words. */
  resolution: AuditEntry[];
}

export interface EscalationRow {
  entry: AuditEntry;
  automatic: boolean;
  /* The first later action on the same item, if there was one. */
  actedOn: AuditEntry | null;
  minutesToAct: number | null;
}

export interface InspectionPack {
  from: string;
  to: string;
  /* The first day any session is on record in the range. Earlier than this,
     the timetable holds nothing — the pack says so rather than implying
     those days were checked and clean. */
  earliestSession: string | null;
  summary: {
    sessionsRun: number;
    sessionsChecked: number;
    breaches: number;
    staffWorking: number;
    staffUncleared: number;
    unclearedRotad: number;
    incidents: number;
    incidentsOpen: number;
    escalations: number;
    escalationsUnacted: number;
    registersMissing: number;
    auditEntries: number;
  };
  vetting: VettingRow[];
  unclearedOnRota: UnclearedOnRota[];
  breaches: RatioBreach[];
  registersMissing: { session: Session; label: string }[];
  incidents: Incident[];
  escalations: EscalationRow[];
  appendix: AuditEntry[];
}

const day = (at: string) => at.slice(0, 10);
/* Matches the Staff screen: an expiring certificate is still a clearance,
   flagged so it is renewed; pending and missing are not. */
export const notCleared = (s: Staff) =>
  s.dbs.state === 'pending' || s.dbs.state === 'missing';
const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
const toMinutes = (at: string) => new Date(at.replace(' ', 'T')).getTime() / 60000;

export const sessionLabel = (s: Session) =>
  `${activityById(s.activityId).name}, ${groupById(s.groupId).name} ${s.start}`;

export function buildPack(input: PackInput): InspectionPack {
  const { from, to, audit, staff, students, registers, incidents, now } = input;

  /* Cancelled sessions had no children in them, so they carry no ratio and
     no register. Re-slotted ones did run, somewhere else. */
  const sessions = input.sessions.filter(
    (s) => s.status !== 'cancelled' && inRange(s.day, from, to),
  );
  /* A session counts once it has started: that is when the children are in
     it and the register is due — the home screen counts it the same way. */
  const started = (s: Session) => `${s.day}T${s.start}` <= now;
  const run = sessions.filter(started);
  const earliestSession = run.reduce<string | null>(
    (min, s) => (min === null || s.day < min ? s.day : min),
    null,
  );

  const trail = audit
    .filter((e) => inRange(day(e.at), from, to))
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));

  /* ── Vetting ─────────────────────────────────────────────────────────── */
  const working = staff.filter(
    (s) => s.contract.from <= to && s.contract.to >= from,
  );
  const vetting: VettingRow[] = working
    .map((s) => ({
      staff: s,
      expiresInRange: !notCleared(s) && !!s.dbs.expires && s.dbs.expires <= to,
      sessions: sessions.filter((x) => x.staffIds.includes(s.id)).length,
    }))
    /* Anything that is not a clean, in-date clearance goes first. */
    .sort((a, b) => {
      const rank = (r: VettingRow) =>
        notCleared(r.staff) ? 0 : r.expiresInRange ? 1 : 2;
      return rank(a) - rank(b) || a.staff.surname.localeCompare(b.staff.surname);
    });

  const uncleared = working.filter(notCleared);
  const unclearedOnRota: UnclearedOnRota[] = uncleared
    .map((s) => {
      const name = `${s.forename} ${s.surname}`;
      return {
        staff: s,
        sessions: sessions.filter((x) => x.staffIds.includes(s.id)),
        record: trail.filter((e) => e.subject === name),
      };
    })
    .filter((u) => u.sessions.length > 0);

  /* ── Ratios ──────────────────────────────────────────────────────────── */
  const breaches: RatioBreach[] = run
    .map((s) => ({ s, v: checkRatio(s, { students, staff }) }))
    .filter(({ v }) => !v.compliant)
    .map(({ s, v }) => {
      const label = sessionLabel(s);
      return {
        session: s,
        label,
        verdict: v,
        resolution: trail.filter(
          (e) => e.subject === label && !e.action.startsWith('Ratio checked'),
        ),
      };
    })
    .sort((a, b) =>
      `${a.session.day}${a.session.start}`.localeCompare(`${b.session.day}${b.session.start}`),
    );

  const registersMissing = run
    .filter((s) => !registers.find((r) => r.sessionId === s.id && r.takenAt))
    .map((s) => ({ session: s, label: sessionLabel(s) }));

  /* ── Incidents ───────────────────────────────────────────────────────── */
  const incidentsInRange = incidents
    .filter((i) => inRange(day(i.at), from, to))
    .slice()
    /* Notifiable first, then significant, then logged; oldest first within. */
    .sort((a, b) => {
      const rank = { notifiable: 0, significant: 1, logged: 2 } as const;
      return rank[a.level] - rank[b.level] || a.at.localeCompare(b.at);
    });

  /* ── Escalations ─────────────────────────────────────────────────────── */
  const ACTED = ['Reminder completed', 'Chase sent', 'Reminder edited'];
  const escalations: EscalationRow[] = trail
    .filter((e) => e.action.startsWith('Escalated'))
    .map((e) => {
      const actedOn =
        trail.find(
          (x) => x.subject === e.subject && x.at >= e.at && ACTED.includes(x.action),
        ) ?? null;
      return {
        entry: e,
        automatic: e.actor === 'Kadia',
        actedOn,
        minutesToAct: actedOn
          ? Math.max(0, Math.round(toMinutes(actedOn.at) - toMinutes(e.at)))
          : null,
      };
    })
    /* Safeguarding first, then the oldest — the longest-waiting matter most. */
    .sort((a, b) => {
      const sg = (r: EscalationRow) => (r.entry.category === 'safeguarding' ? 0 : 1);
      return sg(a) - sg(b) || a.entry.at.localeCompare(b.entry.at);
    });

  return {
    from,
    to,
    earliestSession,
    summary: {
      sessionsRun: run.length,
      sessionsChecked: run.length,
      breaches: breaches.length,
      staffWorking: working.length,
      staffUncleared: uncleared.length,
      unclearedRotad: unclearedOnRota.length,
      incidents: incidentsInRange.length,
      incidentsOpen: incidentsInRange.filter((i) => i.status === 'open').length,
      escalations: escalations.length,
      escalationsUnacted: escalations.filter((e) => !e.actedOn).length,
      registersMissing: registersMissing.length,
      auditEntries: trail.length,
    },
    vetting,
    unclearedOnRota,
    breaches,
    registersMissing,
    incidents: incidentsInRange,
    escalations,
    appendix: trail,
  };
}

export function fmtWait(minutes: number | null) {
  if (minutes === null) return 'No action recorded';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 48) return `${h}h ${minutes % 60}m`;
  return `${Math.floor(h / 24)} days`;
}

/* ── Self-check ───────────────────────────────────────────────────────────
   The things that would be silently wrong: a compliant session listed as a
   breach, a session outside the range counted, an appendix out of order, or
   a summary that disagrees with the sections under it. */
export function selfCheck(input: PackInput) {
  const p = buildPack(input);
  console.assert(
    p.breaches.every((b) => !b.verdict.compliant),
    'inspection: a compliant session was listed as a breach',
  );
  console.assert(
    p.breaches.every((b) => b.session.day >= p.from && b.session.day <= p.to),
    'inspection: a breach outside the range was counted',
  );
  console.assert(
    p.appendix.every((e, i, a) => i === 0 || a[i - 1].at <= e.at),
    'inspection: the appendix is not in chronological order',
  );
  console.assert(
    p.summary.breaches === p.breaches.length &&
      p.summary.incidents === p.incidents.length &&
      p.summary.escalations === p.escalations.length &&
      p.summary.auditEntries === p.appendix.length,
    'inspection: the summary disagrees with its own sections',
  );
  console.assert(
    p.unclearedOnRota.every((u) => notCleared(u.staff)),
    'inspection: a cleared member of staff was reported as uncleared on the rota',
  );
  /* A narrower range can only ever find fewer things. */
  const one = buildPack({ ...input, from: input.to });
  console.assert(
    one.appendix.length <= p.appendix.length && one.breaches.length <= p.breaches.length,
    'inspection: narrowing the range found more records, not fewer',
  );
}
