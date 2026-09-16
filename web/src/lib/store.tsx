import { createContext, useContext, useMemo, useRef, useState } from 'react';
import {
  buildReminders, setEscalationDays, type Channel, type Reminder,
  type Severity,
} from './reminders';
import { buildAudit, entry, type AuditEntry } from './audit';
import { buildOutbox, queue, type OutboxItem } from './outbox';
import {
  BOOKINGS, DEMO_TODAY, GROUPS, SESSIONS, STAFF, STUDENTS, demoIso, demoStamp,
  type Booking, type Session, type Staff, type Student,
} from '../data/seed';
import { buildPayments, type Payment } from '../data/finance';
import { buildDuties, type Duty } from '../data/duty';
import { buildFlights, type Flight } from '../data/travel';
import { buildRequests, DOC_LABEL, type DocRequest } from '../data/portal';
import {
  buildAdministrations, buildHealth, type Administration, type Health,
} from '../data/health';
import {
  blankRegister, buildRegisters, rollFor, type Mark, type Register,
} from '../data/attendance';
import { DEFAULT_RULES, type Move, type RoomingRules } from './allocate';
import { fillDuty } from './schedule';
import { buildIncidents, type Incident } from '../data/incidents';
import {
  BAND_RULES, PILOT_SITE, ROLES, type BandRule, type RoleDef, type Site,
} from '../data/centre';
import { START_ROLE } from './side';
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

  /* Bookings live here too, so a receipt attached on one screen clears the
     reminder chasing it on another. */
  bookings: Booking[];
  updateBookings: (fn: (all: Booking[]) => Booking[]) => void;

  /* Flights, so a delay entered once moves every run that depends on it. */
  flights: Flight[];
  updateFlights: (fn: (all: Flight[]) => Flight[]) => void;

  /* Document requests. Accepting one marks the document in on the student
     record, which is what closes its reminder. */
  /* Registers. Taking one is the most repeated safeguarding act there is. */
  registers: Register[];
  takeRegister: (sessionId: string) => void;
  closeRegister: (sessionId: string) => void;
  markOne: (sessionId: string, studentId: string, mark: Mark) => void;

  /* Medication and allergies. The centre reads them and records what it gave;
     only a role with welfareEdit changes what the record says. */
  health: Health[];
  administrations: Administration[];
  verifyHealth: (studentId: string) => void;
  queryHealth: (studentId: string, reason: string) => void;
  recordDose: (
    id: string,
    given: boolean,
    by: string,
    witness: string | null,
    note?: string,
  ) => void;
  /* Reading special category data is itself an event worth recording. */
  logWelfareView: (studentId: string) => void;

  requests: DocRequest[];
  sendRequest: (id: string) => void;
  remindRequest: (id: string) => void;
  acceptRequest: (id: string) => void;
  rejectRequest: (id: string, reason: string) => void;

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

/* Not a staff id. Used when a register is taken at the dashboard for a
   session nobody was rota'd onto. */
export const OPERATOR_ID = 'operator';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS);
  const [flights, setFlights] = useState<Flight[]>(() => buildFlights());
  const [requests, setRequests] = useState<DocRequest[]>(() => buildRequests());
  /* Seeded up to the demo clock, so the day is part-done when you open it —
     which is what a real morning looks like. */
  const [registers, setRegisters] = useState<Register[]>(() =>
    buildRegisters(demoIso(), DEMO_TODAY.getHours() * 60 + 30),
  );
  /* The duty rota arrives staffed, like the activity rota does. An empty duty
     board on first load reads as a broken screen rather than a starting point. */
  const [duties, setDutyState] = useState<Duty[]>(
    () => fillDuty(SESSIONS, buildDuties()).duties,
  );
  const [health, setHealth] = useState<Health[]>(() => buildHealth());
  const [administrations, setAdministrations] = useState<Administration[]>(() =>
    buildAdministrations(buildHealth()),
  );
  /* One line per student per session, so the same record is not written to the
     trail every time a drawer re-renders. */
  const viewed = useRef<Set<string>>(new Set());
  const [audit, setAudit] = useState<AuditEntry[]>(() => buildAudit());
  const [outbox, setOutbox] = useState<OutboxItem[]>(() =>
    buildOutbox(buildReminders()),
  );
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [staff, setStaff] = useState<Staff[]>(STAFF);
  const [escalation, setEscalationState] =
    useState<Record<Severity, number>>(ESCALATION_DEFAULTS);

  /* ── The queue ────────────────────────────────────────────────────────
     Reminders are DERIVED from the records above, every render, so the queue
     is a view of how things stand rather than a list made once at start-up.
     Fix the DBS and the row goes; attach the receipt and the row goes.

     What cannot be derived is what the operator did to a row — completed it,
     reworded it, chased it, escalated it, deleted it. That is kept here by
     id and laid back over the derived list. */
  const [touched, setTouched] = useState<Record<string, Partial<Reminder>>>({});
  const [removed, setRemoved] = useState<string[]>([]);

  const reminders = useMemo(() => {
    const derived = buildReminders({
      students, staff, sessions, bookings, registers, requests, flights,
      health, administrations,
    });
    return derived
      .filter((r) => !removed.includes(r.id))
      .map((r) => (touched[r.id] ? { ...r, ...touched[r.id] } : r));
    /* escalation is a dependency because the thresholds live in module state
       — without it the queue would not re-rank when they change. */
  }, [
    students, staff, sessions, bookings, registers, requests, flights,
    health, administrations, touched, removed, escalation,
  ]);
  const [rooming, setRoomingState] = useState<RoomingRules>(DEFAULT_RULES);
  const [payments, setPayments] = useState<Payment[]>(() => buildPayments());
  const [incidents, setIncidents] = useState<Incident[]>(() => buildIncidents());
  const [site, setSite] = useState<Site>(PILOT_SITE);
  /* Each standalone demo opens as the side it was built for. */
  const [role, setRole] = useState<RoleDef>(START_ROLE);
  const [bandRules, setBandRulesState] = useState<BandRule[]>(BAND_RULES);

  const value = useMemo<Store>(() => {
    const append = (e: AuditEntry) => setAudit((all) => [e, ...all]);
    const patch = (id: string, p: Partial<Reminder>) =>
      setTouched((all) => ({ ...all, [id]: { ...(all[id] ?? {}), ...p } }));
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
        setRemoved((all) => [...all, id]);
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

      bookings,
      updateBookings: (fn) => setBookings((all) => fn(all)),

      flights,
      updateFlights: (fn) => setFlights((all) => fn(all)),

      registers,
      takeRegister: (sessionId) => {
        const session = sessions.find((x) => x.id === sessionId);
        if (!session) return;
        const roll = rollFor(session, students);
        /* A register has to name who took it. If nobody is rota'd on the
           session, the person taking it is whoever is at this dashboard —
           recording null there left the register reading as never taken. */
        const leader = session.staffIds[0] ?? OPERATOR_ID;
        const marks: Record<string, Mark> = {};
        roll.forEach((s) => {
          marks[s.id] = 'present';
        });
        setRegisters((all) => {
          const next: Register = {
            ...blankRegister(session),
            takenBy: leader,
            takenAt: demoStamp(),
            marks,
          };
          return all.some((r) => r.sessionId === sessionId)
            ? all.map((r) => (r.sessionId === sessionId ? next : r))
            : [...all, next];
        });
        append(
          entry(
            'safeguarding',
            'Register taken',
            `${session.start} · ${session.groupId}`,
            `${roll.length} marked present to start. Taken on the dashboard.`,
          ),
        );
      },
      closeRegister: (sessionId) => {
        const reg = registers.find((r) => r.sessionId === sessionId);
        const session = sessions.find((x) => x.id === sessionId);
        if (!reg || !session) return;
        const gone = Object.values(reg.marks).filter((m) => m === 'absent').length;
        setRegisters((all) =>
          all.map((r) =>
            r.sessionId === sessionId
              ? { ...r, closedBy: r.takenBy, closedAt: demoStamp() }
              : r,
          ),
        );
        append(
          entry(
            'safeguarding',
            'Register closed',
            `${session.start} · ${session.groupId}`,
            gone > 0
              ? `Counted back with ${gone} unaccounted for.`
              : 'Counted back, everybody present.',
          ),
        );
      },
      markOne: (sessionId, studentId, mark) => {
        const session = sessions.find((x) => x.id === sessionId);
        setRegisters((all) =>
          all.map((r) =>
            r.sessionId === sessionId
              ? { ...r, marks: { ...r.marks, [studentId]: mark } }
              : r,
          ),
        );
        /* Only an absence is worth a line in the trail. Marking thirty
           students present would bury the one that matters. */
        if (mark === 'absent') {
          const s = students.find((x) => x.id === studentId);
          append(
            entry(
              'safeguarding',
              'Marked not present',
              s ? `${s.forename} ${s.surname}` : studentId,
              `Not at ${session?.start ?? 'the session'}. Find them before the next one starts.`,
            ),
          );
        }
      },

      health,
      administrations,
      verifyHealth: (studentId) => {
        const s = pupil(studentId);
        setHealth((all) =>
          all.map((h) =>
            h.studentId === studentId
              ? {
                  ...h,
                  state: 'verified' as const,
                  verifiedBy: role.name,
                  verifiedAt: demoIso(),
                  query: null,
                }
              : h,
          ),
        );
        if (s) {
          append(
            entry(
              'safeguarding',
              'Health record verified',
              `${s.forename} ${s.surname}`,
              `Checked against what the family declared and accepted by ${role.name}. The centre may now act on it.`,
            ),
          );
        }
      },
      queryHealth: (studentId, reason) => {
        const s = pupil(studentId);
        setHealth((all) =>
          all.map((h) =>
            h.studentId === studentId
              ? { ...h, state: 'queried' as const, verifiedBy: null, verifiedAt: null, query: reason }
              : h,
          ),
        );
        if (s) {
          append(
            entry(
              'safeguarding',
              'Health record queried with the family',
              `${s.forename} ${s.surname}`,
              reason,
            ),
          );
        }
      },
      recordDose: (id, given, by, witness, note) => {
        const dose = administrations.find((a) => a.id === id);
        const s = dose ? pupil(dose.studentId) : null;
        setAdministrations((all) =>
          all.map((a) =>
            a.id === id
              ? {
                  ...a,
                  givenAt: given ? demoStamp().slice(11, 16) : null,
                  givenBy: given ? by : null,
                  witness: given ? witness : null,
                  refused: !given,
                  note: note ?? a.note,
                }
              : a,
          ),
        );
        if (dose && s) {
          const med = health
            .find((h) => h.studentId === dose.studentId)
            ?.medications.find((m) => m.id === dose.medicationId);
          append(
            entry(
              'safeguarding',
              given ? 'Medication given' : 'Medication not given',
              `${s.forename} ${s.surname}`,
              given
                ? `${med?.name ?? 'Dose'} ${med?.dose ?? ''} due ${dose.due}, given by ${by}${witness ? `, witnessed by ${witness}` : ', unwitnessed'}. Recorded at the dashboard.`
                : `${med?.name ?? 'Dose'} due ${dose.due} was not given. ${note ?? 'No reason recorded.'}`,
            ),
          );
        }
      },
      logWelfareView: (studentId) => {
        const s = pupil(studentId);
        const key = `${role.id}:${studentId}`;
        if (!s || viewed.current.has(key)) return;
        viewed.current.add(key);
        append(
          entry(
            'record',
            'Welfare record opened',
            `${s.forename} ${s.surname}`,
            `Medication and allergy detail read by ${role.name}. Special category data — every read is logged.`,
          ),
        );
      },

      requests,
      sendRequest: (id) => {
        const r = requests.find((x) => x.id === id);
        setRequests((all) =>
          all.map((x) =>
            x.id === id ? { ...x, state: 'sent' as const, sentAt: today() } : x,
          ),
        );
        if (r) {
          const s = students.find((x) => x.id === r.studentId);
          append(
            entry(
              'record',
              'Document link queued',
              s ? `${s.forename} ${s.surname}` : r.studentId,
              `${DOC_LABEL[r.kind]} requested from ${s?.guardian.name ?? 'the guardian'}. Queued — no sending service is connected.`,
            ),
          );
        }
      },
      remindRequest: (id) => {
        const r = requests.find((x) => x.id === id);
        setRequests((all) =>
          all.map((x) => (x.id === id ? { ...x, reminders: x.reminders + 1 } : x)),
        );
        if (r) {
          const s = students.find((x) => x.id === r.studentId);
          append(
            entry(
              'record',
              'Document reminder queued',
              s ? `${s.forename} ${s.surname}` : r.studentId,
              `Reminder ${r.reminders + 1} for the ${DOC_LABEL[r.kind].toLowerCase()}.`,
            ),
          );
        }
      },
      acceptRequest: (id) => {
        const r = requests.find((x) => x.id === id);
        if (!r) return;
        setRequests((all) =>
          all.map((x) =>
            x.id === id
              ? { ...x, state: 'accepted' as const, decidedAt: today(), reason: null }
              : x,
          ),
        );
        /* The document is now in. That is what makes its reminder disappear —
           the queue derives from the record, not from this screen. */
        setStudents((all) =>
          all.map((x) =>
            x.id === r.studentId
              ? { ...x, docs: { ...x.docs, [r.kind]: 'in' as const } }
              : x,
          ),
        );
        const s = students.find((x) => x.id === r.studentId);
        append(
          entry(
            r.kind === 'passport' ? 'record' : 'safeguarding',
            'Document accepted',
            s ? `${s.forename} ${s.surname}` : r.studentId,
            `${DOC_LABEL[r.kind]} checked and accepted. ${r.filename ?? ''}`.trim(),
          ),
        );
      },
      rejectRequest: (id, reason) => {
        const r = requests.find((x) => x.id === id);
        setRequests((all) =>
          all.map((x) =>
            x.id === id
              ? { ...x, state: 'rejected' as const, decidedAt: today(), reason }
              : x,
          ),
        );
        if (r) {
          const s = students.find((x) => x.id === r.studentId);
          append(
            entry(
              'record',
              'Document sent back',
              s ? `${s.forename} ${s.surname}` : r.studentId,
              `${DOC_LABEL[r.kind]} rejected: ${reason}`,
            ),
          );
        }
      },

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

        /* No need to close the room reminders by hand — they are derived from
           whether a student has a bed, so they go on their own. */
        const cleared = reminders.filter(
          (r) => !r.done && r.id.startsWith('room-') && byId.has(r.id.slice(5)),
        );
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
    reminders, sessions, bookings, flights, requests, registers, duties, audit,
    outbox, students, staff, payments, incidents, site, role, escalation,
    bandRules, rooming, health, administrations,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}
