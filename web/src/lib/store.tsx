import { createContext, useContext, useMemo, useState } from 'react';
import {
  buildReminders, setEscalationDays, type Channel, type Reminder,
  type Severity,
} from './reminders';
import { buildAudit, entry, type AuditEntry } from './audit';
import { buildOutbox, queue, type OutboxItem } from './outbox';
import {
  GROUPS, SESSIONS, STAFF, STUDENTS, demoIso, demoStamp, type Session,
  type Staff, type Student,
} from '../data/seed';
import { buildPayments, type Payment } from '../data/finance';
import { buildDuties, type Duty } from '../data/duty';
import { DEFAULT_RULES, type Move, type RoomingRules } from './allocate';
import { fillDuty } from './schedule';
import { buildIncidents, type Incident } from '../data/incidents';
import {
  BAND_RULES, PILOT_SITE, ROLES, type BandRule, type RoleDef, type Site,
} from '../data/centre';
import { ESCALATION_DEFAULTS } from './reminders';

interface Store {
  reminders: Reminder[];
  open: Reminder[];
  update: (id: string, patch: Partial<Reminder>) => void;
  complete: (id: string) => void;
  reopen: (id: string) => void;
  remove: (id: string) => void;
  /* Chasing and escalating are the tracker's core loop: chase, log it, and
     past the threshold hand it to someone above the admin. */
  chase: (id: string, channel: Channel) => void;
  escalate: (id: string) => void;

  /* Drafted chases waiting on a sending service. Queued is never sent. */
  outbox: OutboxItem[];
  send: (r: Reminder, channel: Channel, body: string) => void;

  /* Shared, because a session cancelled on the timetable has to lower the
     rota hours the staff screen reports. */
  sessions: Session[];
  updateSessions: (fn: (all: Session[]) => Session[]) => void;

  /* Duty shifts carry most of a seasonal contract's hours, so they are rota'd
     state like sessions, not a display detail. */
  duties: Duty[];
  setDuties: (next: Duty[]) => void;

  /* Records live here so a profile opened from any screen edits the same
     person, not that screen's copy of them. */
  students: Student[];
  staff: Staff[];
  saveStudent: (next: Student) => void;
  saveStaff: (next: Staff) => void;

  /* Rooming is configuration plus a proposal a person applies — never a
     silent reshuffle of where children sleep. */
  rooming: RoomingRules;
  setRooming: (next: RoomingRules) => void;
  applyAllocation: (moves: Move[]) => void;

  payments: Payment[];
  matchPayment: (paymentId: string, studentId: string) => void;
  unmatchPayment: (paymentId: string) => void;

  incidents: Incident[];
  addIncident: (i: Incident) => void;
  closeIncident: (id: string) => void;
  informDsl: (id: string) => void;
  informParents: (id: string) => void;

  /* Centre configuration. Thresholds and ratios are per centre — the screens
     that read them read the configured value, never a constant. */
  site: Site;
  setSite: (s: Site) => void;
  role: RoleDef;
  setRole: (r: RoleDef) => void;
  escalation: Record<Severity, number>;
  setEscalation: (next: Record<Severity, number>) => void;
  bandRules: BandRule[];
  setBandRules: (next: BandRule[]) => void;

  /* Append-only. An audit trail that can be edited is not an audit trail. */
  audit: AuditEntry[];
  log: (e: AuditEntry) => void;
}

const Ctx = createContext<Store | null>(null);

/* The demo clock, not the wall clock — see seed.ts. */
const today = demoIso;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(() => buildReminders());
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);
  /* The duty rota arrives staffed, like the activity rota does. An empty duty
     board on first load reads as a broken screen rather than a starting point. */
  const [duties, setDutyState] = useState<Duty[]>(
    () => fillDuty(SESSIONS, buildDuties()).duties,
  );
  const [audit, setAudit] = useState<AuditEntry[]>(() => buildAudit());
  const [outbox, setOutbox] = useState<OutboxItem[]>(() =>
    buildOutbox(buildReminders()),
  );
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [staff, setStaff] = useState<Staff[]>(STAFF);
  const [rooming, setRoomingState] = useState<RoomingRules>(DEFAULT_RULES);
  const [payments, setPayments] = useState<Payment[]>(() => buildPayments());
  const [incidents, setIncidents] = useState<Incident[]>(() => buildIncidents());
  const [site, setSite] = useState<Site>(PILOT_SITE);
  const [role, setRole] = useState<RoleDef>(ROLES[0]);
  const [escalation, setEscalationState] =
    useState<Record<Severity, number>>(ESCALATION_DEFAULTS);
  const [bandRules, setBandRulesState] = useState<BandRule[]>(BAND_RULES);

  const value = useMemo<Store>(() => {
    const append = (e: AuditEntry) => setAudit((all) => [e, ...all]);
    const patch = (id: string, p: Partial<Reminder>) =>
      setReminders((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)));
    const find = (id: string) => reminders.find((r) => r.id === id);
    const pupil = (id: string) => students.find((s) => s.id === id);

    return {
      reminders,
      open: reminders.filter((r) => !r.done),
      update: (id, p) => {
        patch(id, { ...p, edited: true });
        const r = find(id);
        if (r) {
          append(
            entry('record', 'Reminder edited', r.title, 'Wording, note or due date changed.'),
          );
        }
      },
      complete: (id) => {
        patch(id, { done: true });
        const r = find(id);
        if (r) {
          append(
            entry(
              r.severity === 'safeguarding' ? 'safeguarding' : 'record',
              'Reminder completed',
              r.title,
              `Marked done. ${r.chases.length} chase${r.chases.length === 1 ? '' : 's'} logged before closing.`,
            ),
          );
        }
      },
      reopen: (id) => patch(id, { done: false }),
      remove: (id) => {
        const r = find(id);
        setReminders((all) => all.filter((x) => x.id !== id));
        if (r) {
          append(
            entry('record', 'Reminder deleted', r.title, `Removed without completing. Was due ${r.due}.`),
          );
        }
      },
      chase: (id, channel) => {
        const r = find(id);
        if (!r) return;
        patch(id, {
          chases: [...r.chases, { at: today(), channel, to: r.chaseTo }],
        });
        append(
          entry(
            r.severity === 'safeguarding' ? 'safeguarding' : 'record',
            'Chase sent',
            r.title,
            `Chased ${r.chaseTo} by ${channel}. Chase ${r.chases.length + 1} on this item.`,
          ),
        );
      },
      escalate: (id) => {
        const r = find(id);
        if (!r) return;
        patch(id, { escalated: true });
        append(
          entry(
            r.severity === 'safeguarding' ? 'safeguarding' : 'record',
            'Escalated to management',
            r.title,
            `Passed to the centre director after ${r.chases.length} chase${r.chases.length === 1 ? '' : 's'} and no response.`,
          ),
        );
      },

      outbox,
      send: (r, channel, body) => {
        setOutbox((all) => [queue(r, channel, body), ...all]);
        patch(r.id, {
          chases: [...r.chases, { at: today(), channel, to: r.chaseTo }],
        });
        append(
          entry(
            r.severity === 'safeguarding' ? 'safeguarding' : 'record',
            'Chase drafted and queued',
            r.title,
            `Message to ${r.chaseTo} by ${channel} queued for sending. Not delivered — no sending service is connected.`,
          ),
        );
      },

      sessions,
      updateSessions: (fn) => setSessions((all) => fn(all)),

      duties,
      setDuties: (next) => {
        setDutyState(next);
        append(
          entry(
            'rota',
            'Duty rota redrafted',
            site.name,
            `${next.filter((d) => d.staffIds.length).length} of ${next.length} duty shifts staffed.`,
          ),
        );
      },

      students,
      staff,
      saveStudent: (next) => {
        setStudents((all) => all.map((s) => (s.id === next.id ? next : s)));
        append(
          entry(
            'record',
            'Student record edited',
            `${next.forename} ${next.surname}`,
            'Contact, welfare or document fields changed on the student record.',
          ),
        );
      },
      saveStaff: (next) => {
        const before = staff.find((s) => s.id === next.id);
        setStaff((all) => all.map((s) => (s.id === next.id ? next : s)));
        const dbsChanged = before && before.dbs.state !== next.dbs.state;
        append(
          entry(
            dbsChanged ? 'safeguarding' : 'record',
            dbsChanged ? 'DBS status changed' : 'Staff record edited',
            `${next.forename} ${next.surname}`,
            dbsChanged
              ? `DBS moved from ${before!.dbs.state} to ${next.dbs.state}. Certificate ${next.dbs.certificate ?? 'none on file'}.`
              : 'Role, contact or availability changed on the staff record.',
          ),
        );
      },

      rooming,
      setRooming: (next) => {
        setRoomingState(next);
        append(
          entry(
            'record',
            'Rooming rules changed',
            site.name,
            `${next.sameLanguageTogether ? 'Same first language may share' : `Same first language: ${next.languageRule}`}. ` +
              `Age spread ${next.maxAgeSpread}y. Bed reuse ${next.reuseBeds ? 'on' : 'off'}.`,
          ),
        );
      },
      applyAllocation: (moves) => {
        const byId = new Map(moves.map((m) => [m.studentId, m]));
        setStudents((all) =>
          all.map((s) => {
            const m = byId.get(s.id);
            return m ? { ...s, roomId: m.toRoomId, bed: m.bed } : s;
          }),
        );

        /* Doing the work closes the chase. A student who now has a bed should
           not still be sitting in the queue as having none — that is the
           spreadsheet failure this product exists to remove. */
        const cleared = reminders.filter(
          (r) => !r.done && r.id.startsWith('room-') && byId.has(r.id.slice(5)),
        );
        if (cleared.length) {
          setReminders((all) =>
            all.map((r) =>
              cleared.some((c) => c.id === r.id) ? { ...r, done: true } : r,
            ),
          );
        }
        const movedOnSite = moves.filter((m) => m.fromRoomId && m.fromRoomId !== m.toRoomId);
        append(
          entry(
            'safeguarding',
            'Room allocation applied',
            site.name,
            `${moves.length} students allocated. ${movedOnSite.length} moved from a room they were already in. ` +
              `${cleared.length} outstanding room reminder${cleared.length === 1 ? '' : 's'} closed. ` +
              'Proposed by the allocator, applied by a person.',
          ),
        );
      },

      payments,
      matchPayment: (paymentId, studentId) => {
        const p = payments.find((x) => x.id === paymentId);
        const s = pupil(studentId);
        if (!p || !s) return;
        setPayments((all) =>
          all.map((x) => (x.id === paymentId ? { ...x, studentId, auto: false } : x)),
        );
        setStudents((all) =>
          all.map((x) =>
            x.id === studentId
              ? { ...x, paidPence: x.paidPence + p.amountPence }
              : x,
          ),
        );
        append(
          entry(
            'finance',
            'Payment matched',
            `${s.forename} ${s.surname}`,
            `${p.reference || 'No reference'} from ${p.payer} matched by hand. Balance reduced.`,
          ),
        );
      },
      unmatchPayment: (paymentId) => {
        const p = payments.find((x) => x.id === paymentId);
        if (!p || !p.studentId) return;
        const s = pupil(p.studentId);
        setPayments((all) =>
          all.map((x) => (x.id === paymentId ? { ...x, studentId: null, auto: false } : x)),
        );
        setStudents((all) =>
          all.map((x) =>
            x.id === p.studentId
              ? { ...x, paidPence: Math.max(0, x.paidPence - p.amountPence) }
              : x,
          ),
        );
        append(
          entry(
            'finance',
            'Payment unmatched',
            s ? `${s.forename} ${s.surname}` : p.payer,
            `${p.reference || 'No reference'} from ${p.payer} put back in the unmatched queue.`,
          ),
        );
      },

      incidents,
      addIncident: (i) => {
        setIncidents((all) => [i, ...all]);
        append(
          entry(
            'safeguarding',
            `Incident recorded — ${i.kind.toLowerCase()}`,
            i.where,
            `${i.level} · ${i.what}`,
          ),
        );
      },
      closeIncident: (id) => {
        const i = incidents.find((x) => x.id === id);
        setIncidents((all) =>
          all.map((x) => (x.id === id ? { ...x, status: 'closed' } : x)),
        );
        if (i) {
          append(
            entry('safeguarding', 'Incident closed', `${i.kind} · ${i.where}`, i.followUp ?? 'No follow-up outstanding.'),
          );
        }
      },
      informDsl: (id) => {
        const i = incidents.find((x) => x.id === id);
        const at = demoStamp();
        setIncidents((all) =>
          all.map((x) => (x.id === id ? { ...x, dslInformedAt: at } : x)),
        );
        if (i) {
          append(
            entry('safeguarding', 'Safeguarding lead informed', `${i.kind} · ${i.where}`, `Told at ${at.replace('T', ' ')}.`),
          );
        }
      },
      informParents: (id) => {
        const i = incidents.find((x) => x.id === id);
        const at = demoStamp();
        setIncidents((all) =>
          all.map((x) => (x.id === id ? { ...x, parentsInformedAt: at } : x)),
        );
        if (i) {
          append(
            entry('safeguarding', 'Parents informed', `${i.kind} · ${i.where}`, `Told at ${at.replace('T', ' ')}.`),
          );
        }
      },

      site,
      setSite: (s) => {
        setSite(s);
        append(entry('record', 'Site changed', s.name, `Now working in ${s.name}, ${s.town}.`));
      },
      role,
      setRole: (r) => {
        setRole(r);
        append(
          entry('record', 'Viewing as a different role', r.name, `Access now limited to what a ${r.name.toLowerCase()} may see.`),
        );
      },
      escalation,
      setEscalation: (next) => {
        setEscalationState(next);
        /* The reminder functions read module state, so the configured value
           is the one every screen sees, not a copy. */
        setEscalationDays(next);
        append(
          entry(
            'safeguarding',
            'Escalation thresholds changed',
            site.name,
            `Safeguarding ${next.safeguarding}d · overdue ${next.overdue}d · admin ${next.admin}d.`,
          ),
        );
      },
      bandRules,
      setBandRules: (next) => {
        setBandRulesState(next);
        /* Groups carry the ratio the rota engine is handed. Writing it here
           keeps one number in the system rather than two that can disagree. */
        next.forEach((rule) => {
          GROUPS.filter((g) => g.band === rule.band).forEach((g) => {
            g.ratio = rule.ratio;
          });
        });
        append(
          entry(
            'rota',
            'Ratio rules changed',
            site.name,
            next.map((r) => `${r.band} 1:${r.ratio}`).join(' · '),
          ),
        );
      },

      audit,
      log: append,
    };
  }, [
    reminders, sessions, duties, audit, outbox, students, staff, payments,
    incidents, site, role, escalation, bandRules, rooming,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}
