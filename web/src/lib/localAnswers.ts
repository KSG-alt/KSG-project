/* Answering without an API key.

   The demo has to be useful to someone who opens the file and has no
   Anthropic key — a dead panel is worse than no panel. These answers are
   computed from the same seeded records the live assistant reads through its
   tools, so nothing here is invented; it is the same data, looked up without
   a model in the loop. Anything outside these intents says so plainly rather
   than guessing. */

import {
  BOOKINGS, DEMO_TODAY, WEEKLY_LIMIT, activityById, fmtDate,
  fmtMoney, groupById, isOnSite, readiness, roomLabel, upcomingArrivals,
  daysFromToday, fmtHours, sessionsFor, weeklyHours, whenLabel,
} from '../data/seed';
import { checkRatio } from './ratio';
import { ESCALATION_DAYS, type Reminder } from './reminders';
import { isAway } from '../data/seed';
import { minutesToDsl, type Incident } from '../data/incidents';
import { owed, suggestMatches, type Payment } from '../data/finance';
import { BAND_RULES, ROLES, SITES } from '../data/centre';
import type { Session, Staff, Student } from '../data/seed';

/* The live records, handed in rather than imported, so an answer reflects
   what the operator has already changed in this session. An assistant that
   reports the seed while the screen shows something else is worse than one
   that declines. */
export interface Records {
  sessions: Session[];
  students: Student[];
  staff: Staff[];
  payments: Payment[];
  incidents: Incident[];
  reminders: Reminder[];
}

export interface LocalAnswer {
  text: string;
  source: string;
}

const has = (q: string, ...words: string[]) =>
  words.some((w) => q.includes(w));

const list = (items: string[], max = 6) => {
  const shown = items.slice(0, max).map((i) => `• ${i}`);
  if (items.length > max) shown.push(`• …and ${items.length - max} more`);
  return shown.join('\n');
};

export function answerLocally(
  question: string,
  records: Records,
): LocalAnswer | null {
  const { sessions, students: STUDENTS, staff: STAFF, payments, incidents } = records;
  const q = question.toLowerCase().trim();
  if (!q) return null;

  /* Attention / today / summary */
  if (has(q, 'attention', 'today', 'what needs', 'priority', 'urgent', 'summary')) {
    const rs = records.reminders.filter((r) => !r.done);
    const by = (s: 'safeguarding' | 'overdue' | 'admin') =>
      rs.filter((r) => r.severity === s).length;
    const top = rs.slice(0, 4).map((r) => `${r.title} — ${r.source}`);
    return {
      text:
        `${rs.length} things are outstanding: ${by('safeguarding')} safeguarding, ` +
        `${by('overdue')} overdue, ${by('admin')} admin.\n\n` +
        `Safeguarding first:\n${list(top, 4)}\n\n` +
        `Safeguarding items escalate after one day overdue, admin after seven.`,
      source: 'Reminders',
    };
  }

  /* DBS / who cannot be rota'd */
  if (has(q, 'dbs', 'rota’d', "rota'd", 'cleared', 'cannot be rota', 'check')) {
    const bad = STAFF.filter((s) => s.dbs.state !== 'cleared');
    if (!bad.length) return { text: 'Every staff member has a cleared DBS.', source: 'Staff' };
    return {
      text:
        `${bad.length} staff cannot be rota'd with students:\n` +
        list(
          bad.map(
            (s) =>
              `${s.forename} ${s.surname} (${s.role}) — DBS ${s.dbs.state}` +
              (s.dbs.expires ? `, expires ${fmtDate(s.dbs.expires)}` : ''),
          ),
        ) +
        `\n\nA missing or pending check is a hard block. An expiring one needs the renewal submitting now.`,
      source: 'Staff',
    };
  }

  /* Ratio / compliance */
  if (has(q, 'ratio', 'breach', 'compliant', 'compliance', 'under-staffed', 'understaffed')) {
    const today = sessions.filter(
      (s) => s.day === DEMO_TODAY.toISOString().slice(0, 10) && s.status !== 'cancelled',
    );
    const bad = today.filter((s) => !checkRatio(s, { students: STUDENTS, staff: STAFF }).compliant);
    if (!bad.length)
      return { text: `All ${today.length} sessions today meet their required ratio.`, source: 'Timetable' };
    return {
      text:
        `${bad.length} of ${today.length} sessions today are not compliant:\n` +
        list(
          bad.map((s) => {
            const v = checkRatio(s, { students: STUDENTS, staff: STAFF });
            return `${activityById(s.activityId).name}, ${groupById(s.groupId).name} at ${s.start} — ${v.reasons.join('; ')}`;
          }),
        ) +
        `\n\nThe day cannot be approved until these clear. A person decides, not the draft.`,
      source: 'Timetable',
    };
  }

  /* Arrivals */
  if (has(q, 'arriv', 'coming', 'admitted', 'admission', 'sunday', 'next week')) {
    const soon = upcomingArrivals().filter((s) => daysFromToday(s.arrival) <= 7);
    const blocked = soon.filter((s) => !readiness(s).ready);
    return {
      text:
        `${soon.length} students arrive in the next seven days. ${blocked.length} cannot be admitted yet.\n\n` +
        list(
          blocked.map(
            (s) =>
              `${s.forename} ${s.surname} — arrives ${whenLabel(s.arrival)} — ${readiness(s).blocking.join('; ')}`,
          ),
        ) +
        `\n\nNo bed, or a missing medical or consent form, blocks admission. Everything else is a watch.`,
      source: 'New arrivals',
    };
  }

  /* Hours */
  if (has(q, 'hour', 'overtime', 'contract', 'working time', 'shift')) {
    const rows = STAFF.map((s) => ({
      s,
      h: weeklyHours(s.id, sessions),
      n: sessionsFor(s.id, sessions).length,
    })).filter((r) => r.h > 0);
    const over = rows.filter((r) => r.h > r.s.contractedHours);
    const limit = rows.filter((r) => r.h > WEEKLY_LIMIT);
    const total = rows.reduce((n, r) => n + r.h, 0);
    return {
      text:
        `${fmtHours(total)} rota'd across ${rows.length} staff this week.\n` +
        `${over.length} are over their contracted hours; ${limit.length} are past the ${WEEKLY_LIMIT}h working-time limit.\n\n` +
        (over.length
          ? list(
              over
                .sort((a, b) => b.h - a.h)
                .map((r) => `${r.s.forename} ${r.s.surname} — ${fmtHours(r.h)} of ${fmtHours(r.s.contractedHours)}`),
            )
          : 'Nobody is over contract.') +
        `\n\nThese are rota'd hours, not pay — payroll stays with the centre.`,
      source: 'Staff',
    };
  }

  /* Receipts and bookings */
  if (has(q, 'receipt', 'booking', 'supplier', 'invoice', 'confirm')) {
    const missing = BOOKINGS.filter((b) => !b.receipt);
    return {
      text:
        `${BOOKINGS.length} activity bookings. ${missing.length} have no receipt and cannot be confirmed:\n` +
        list(
          missing.map(
            (b) =>
              `${activityById(b.activityId).name} — ${b.supplier}, ${fmtMoney(b.costPence)}, ${fmtDate(b.date)}`,
          ),
        ),
      source: 'Bookings',
    };
  }

  /* Rooms */
  if (has(q, 'room', 'bed', 'sleep', 'allocat', 'residence', 'house')) {
    const unallocated = STUDENTS.filter((s) => !s.roomId);
    const onSite = STUDENTS.filter((s) => isOnSite(s) && s.roomId).length;
    return {
      text:
        `${onSite} students on site have a bed. ${unallocated.length} students have no room allocated:\n` +
        list(
          unallocated.map(
            (s) => `${s.forename} ${s.surname} — ${s.band} band, ${groupById(s.groupId).name}`,
          ),
        ) +
        `\n\nRooms are allocated inside one age band, and the planner keeps first languages apart. Whether a centre also rooms by gender is per-centre configuration and is not modelled here.` +
        `\n\nOpen Room allocations and Plan the beds to have me fill these, or tell me the rules there.`,
      source: 'Room allocations',
    };
  }

  /* Money owed */
  if (has(q, 'owed', 'balance', 'outstanding payment', 'paid', 'money', 'fees')) {
    const owing = STUDENTS.filter((s) => s.paidPence < s.balancePence).sort(
      (a, b) => b.balancePence - b.paidPence - (a.balancePence - a.paidPence),
    );
    const total = owing.reduce((n, s) => n + (s.balancePence - s.paidPence), 0);
    return {
      text:
        `${fmtMoney(total)} outstanding across ${owing.length} students.\n\nLargest balances:\n` +
        list(
          owing.map(
            (s) =>
              `${s.forename} ${s.surname} — ${fmtMoney(s.balancePence - s.paidPence)} of ${fmtMoney(s.balancePence)}`,
          ),
          5,
        ),
      source: 'Students',
    };
  }

  /* Documents */
  if (has(q, 'document', 'medical', 'consent', 'passport', 'form', 'missing')) {
    const late = STUDENTS.filter(
      (s) => isOnSite(s) && Object.values(s.docs).some((d) => d === 'overdue'),
    );
    return {
      text:
        `${late.length} students on site have an overdue document:\n` +
        list(
          late.map((s) => {
            const which = (Object.entries(s.docs) as [string, string][])
              .filter(([, v]) => v === 'overdue')
              .map(([k]) => k);
            return `${s.forename} ${s.surname} — ${which.join(', ')} — guardian ${s.guardian.name}, ${s.guardian.phone}`;
          }),
        ) +
        `\n\nMedical and consent forms are safeguarding. A passport copy is admin.`,
      source: 'Students',
    };
  }

  /* Incidents */
  if (has(q, 'incident', 'accident', 'injur', 'disclosure', 'safeguarding concern', 'happened')) {
    const all = incidents;
    const open = all.filter((i) => i.status === 'open');
    const untold = all.filter((i) => i.level !== 'logged' && !i.dslInformedAt);
    const told = all.filter((i) => minutesToDsl(i) !== null);
    const avg = told.length
      ? Math.round(told.reduce((n, i) => n + (minutesToDsl(i) ?? 0), 0) / told.length)
      : null;
    return {
      text:
        `${all.length} incidents this season. ${open.length} still open, ` +
        `${all.filter((i) => i.level === 'notifiable').length} notifiable.\n\n` +
        list(
          all
            .slice(0, 5)
            .map(
              (i) =>
                `${i.kind} (${i.level}) — ${i.where}, ${i.at.replace('T', ' ')} — ${i.status}`,
            ),
        ) +
        (avg !== null
          ? `\n\nThe safeguarding lead was told within ${avg} minutes on average.`
          : '') +
        (untold.length
          ? `\n${untold.length} above the logging threshold have no record of the lead being told.`
          : ''),
      source: 'Incidents',
    };
  }

  /* Unmatched payments */
  if (has(q, 'unmatched', 'reconcil', 'bank', 'payment', 'who paid', 'statement')) {
    const orphans = payments.filter((p) => !p.studentId);
    return {
      text:
        `${orphans.length} payments have landed that nobody has matched to a student, ` +
        `worth ${fmtMoney(orphans.reduce((n, p) => n + p.amountPence, 0))}.\n\n` +
        list(
          orphans.map((p) => {
            const best = suggestMatches(p, STUDENTS)[0];
            return (
              `${fmtMoney(p.amountPence)} from ${p.payer}` +
              `${p.reference ? ` (ref “${p.reference}”)` : ' (no reference)'}` +
              (best
                ? ` — best guess ${best.student.forename} ${best.student.surname}, ${best.why[0]}`
                : ' — nothing matches')
            );
          }),
        ) +
        `\n\nThe platform suggests. A person decides, and the decision is signed.`,
      source: 'Payments',
    };
  }

  /* Availability */
  /* "leave" on its own is far too common a word — it caught "leave everyone
     else alone" and answered about staff away days. Match the phrases people
     actually use for absence. */
  if (has(q, 'away', 'availab', 'unavailab', 'annual leave', 'booked leave', 'on leave', 'off this week', 'clash')) {
    const clashes = sessions
      .filter((x) => x.status !== 'cancelled')
      .flatMap((x) =>
        x.staffIds
          .map((id) => STAFF.find((y) => y.id === id))
          .filter((y): y is Staff => Boolean(y) && isAway(y!, x.day))
          .map((y) => ({ session: x, staff: y })),
      )
      .sort(
        (a, b) =>
          a.session.day.localeCompare(b.session.day) ||
          a.session.start.localeCompare(b.session.start),
      );
    const away = STAFF.filter((s) => s.away.length > 0);
    return {
      text:
        `${away.length} staff have told us about days they cannot work. ` +
        `${clashes.length} rota'd sessions clash with those days.\n\n` +
        (clashes.length
          ? list(
              clashes.map(
                (c) =>
                  `${c.staff.forename} ${c.staff.surname} — ${fmtDate(c.session.day)} ${c.session.start}, ` +
                  `${activityById(c.session.activityId).name}, ${groupById(c.session.groupId).name}`,
              ),
            )
          : 'Nothing on the rota clashes.') +
        `\n\nThe draft was built before they told us. Nothing is reassigned automatically — a person re-slots it.`,
      source: 'Staff',
    };
  }

  /* Centre configuration */
  if (has(q, 'setup', 'configur', 'threshold', 'escalat', 'ratio rule', 'site', 'centre', 'role', 'access', 'permission')) {
    return {
      text:
        `${SITES.length} sites are configured: ` +
        SITES.map((x) => `${x.name} (${x.onboarded ? 'live' : 'not onboarded'})`).join(', ') +
        `.\n\nRatios: ` +
        BAND_RULES.map((b) => `${b.band} at 1:${b.ratio}`).join(', ') +
        `.\nEscalation: safeguarding after ${ESCALATION_DAYS.safeguarding} day, ` +
        `overdue after ${ESCALATION_DAYS.overdue}, admin after ${ESCALATION_DAYS.admin}.` +
        `\nRoles: ` +
        ROLES.map((r) => r.name).join(', ') +
        `.\n\nAll of it is set in Centre setup, per centre — none of it is hardcoded.`,
      source: 'Centre setup',
    };
  }

  /* Look a person up by name */
  const named = [...STUDENTS, ...STAFF].find((p) =>
    q.includes(`${p.forename} ${p.surname}`.toLowerCase()),
  );
  if (named) {
    if ('guardian' in named) {
      const s = named;
      const r = readiness(s);
      return {
        text:
          `${s.forename} ${s.surname} — ${s.age}, ${s.band} band, ${groupById(s.groupId).name}, ${s.country}.\n` +
          `Room ${roomLabel(s.roomId)}${s.bed ? `, bed ${s.bed}` : ''}. ` +
          `Arrives ${fmtDate(s.arrival)}, leaves ${fmtDate(s.leaving)}.\n` +
          `Guardian ${s.guardian.name} (${s.guardian.relationship}), ${s.guardian.phone}.\n` +
          `Admission: ${r.ready ? 'ready' : r.blocking.join('; ')}.` +
          (r.watch.length ? `\nWatch: ${r.watch.join('; ')}.` : '') +
          (owed(s) > 0 ? `\nOutstanding: ${fmtMoney(owed(s))} of ${fmtMoney(s.balancePence)}.` : '\nPaid in full.'),
        source: 'Students',
      };
    }
    const s = named;
    return {
      text:
        `${s.forename} ${s.surname} — ${s.role}, ${s.age}.\n` +
        `DBS ${s.dbs.state}${s.dbs.expires ? `, expires ${fmtDate(s.dbs.expires)}` : ''}.\n` +
        `Qualifications: ${s.quals.join(', ')}.\n` +
        `Rota'd ${fmtHours(weeklyHours(s.id, sessions))} this week of ${fmtHours(s.contractedHours)} contracted.`,
      source: 'Staff',
    };
  }

  return null;
}

export const LOCAL_TOPICS = [
  'what needs attention today',
  'DBS and who cannot be rota’d',
  'ratio breaches',
  'arrivals and admission',
  'staff hours',
  'receipts and bookings',
  'rooms and beds',
  'outstanding balances',
  'overdue documents',
  'incidents and how fast the safeguarding lead was told',
  'unmatched payments and who they probably belong to',
  'staff availability and rota clashes',
  'centre setup — sites, ratios, escalation, roles',
  'who sleeps where, and who has no bed',
  'any student or staff member by name',
];
