/* Answering without an API key.

   The demo has to be useful to someone who opens the file and has no
   Anthropic key — a dead panel is worse than no panel. These answers are
   computed from the same seeded records the live assistant reads through its
   tools, so nothing here is invented; it is the same data, looked up without
   a model in the loop. Anything outside these intents says so plainly rather
   than guessing. */

import {
  BOOKINGS, DEMO_TODAY, STAFF, STUDENTS, WEEKLY_LIMIT, activityById, fmtDate,
  fmtMoney, groupById, isOnSite, readiness, roomLabel, upcomingArrivals,
  daysFromToday, fmtHours, sessionsFor, weeklyHours, whenLabel,
} from '../data/seed';
import { checkRatio } from './ratio';
import { buildReminders, SEVERITY_COPY } from './reminders';
import type { Session } from '../data/seed';

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
  sessions: Session[],
): LocalAnswer | null {
  const q = question.toLowerCase().trim();
  if (!q) return null;

  /* Attention / today / summary */
  if (has(q, 'attention', 'today', 'what needs', 'priority', 'urgent', 'summary')) {
    const rs = buildReminders();
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
    const bad = today.filter((s) => !checkRatio(s).compliant);
    if (!bad.length)
      return { text: `All ${today.length} sessions today meet their required ratio.`, source: 'Timetable' };
    return {
      text:
        `${bad.length} of ${today.length} sessions today are not compliant:\n` +
        list(
          bad.map((s) => {
            const v = checkRatio(s);
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
        `\n\nRooms are allocated inside one age band. Whether a centre also rooms by gender is per-centre configuration and is not modelled here.`,
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
          (r.watch.length ? `\nWatch: ${r.watch.join('; ')}.` : ''),
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
  'any student or staff member by name',
];
