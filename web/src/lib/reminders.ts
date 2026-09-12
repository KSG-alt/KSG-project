/* Reminders are DERIVED from the seeded records, never invented. Every row
   here traces to a real outstanding thing: a document that has not arrived, a
   DBS that cannot be rota'd, a booking with no receipt, a session below ratio.
   `route` is where the work actually gets done, which is what the Complete
   control opens. */

import {
  BOOKINGS, DEMO_TODAY, SESSIONS, STAFF, STUDENTS, activityById,
  daysFromToday, fmtDate, fmtMoney, groupById, isOnSite, readiness,
  upcomingArrivals, whenLabel,
} from '../data/seed';
import { checkRatio } from './ratio';
import type { Route } from '../App';

export type Severity = 'safeguarding' | 'overdue' | 'admin';

export type Channel = 'email' | 'phone' | 'WhatsApp';

export interface Chase {
  at: string;
  channel: Channel;
  to: string;
}

export interface Reminder {
  id: string;
  severity: Severity;
  title: string;
  action: string;
  due: string;
  route: Route;
  source: string;
  /* Who the chase goes to, and every chase already sent. Without the log the
     screen cannot say "chased twice, no response", which is the whole basis
     for escalating. interface-contract.md §1. */
  chaseTo: string;
  chases: Chase[];
  escalated?: boolean;
  done?: boolean;
  edited?: boolean;
}

/* Days overdue before an item escalates to management. Safeguarding-critical
   escalates faster than admin — PRODUCT.md principle 2. Thresholds are per
   centre in the real system; these are this centre's. */
export const ESCALATION_DAYS: Record<Severity, number> = {
  safeguarding: 1,
  overdue: 3,
  admin: 7,
};

export const ESCALATES_TO: Record<Severity, string> = {
  safeguarding: 'Safeguarding lead and centre director',
  overdue: 'Centre director',
  admin: 'Centre director',
};

export function overdueBy(r: Reminder) {
  return -days(r.due);
}

/* Past the threshold it needs a person above the admin, not another chase. */
export function needsEscalation(r: Reminder) {
  return !r.done && !r.escalated && overdueBy(r) >= ESCALATION_DAYS[r.severity];
}

export function escalationLabel(r: Reminder) {
  const over = overdueBy(r);
  const threshold = ESCALATION_DAYS[r.severity];
  if (r.escalated) return `Escalated to ${ESCALATES_TO[r.severity]}`;
  if (over >= threshold) return `Escalate to ${ESCALATES_TO[r.severity]}`;
  if (over < 0) return null;
  const left = threshold - over;
  return `Escalates in ${left} day${left === 1 ? '' : 's'}`;
}

export const days = (iso: string) =>
  Math.round((new Date(iso).getTime() - DEMO_TODAY.getTime()) / 86400000);

export function dueLabel(iso: string) {
  const d = days(iso);
  if (d < -1) return `${Math.abs(d)} days overdue`;
  if (d === -1) return 'Overdue since yesterday';
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const shift = (n: number) => {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/* A deterministic sprinkle of prior chases, so "chased twice, no response"
   is a real state on screen rather than a claim. */
function seedChases(r: Omit<Reminder, 'chases' | 'chaseTo'>, chaseTo: string): Reminder {
  const over = -days(r.due);
  const chases: Chase[] = [];
  const back = (n: number) => {
    const d = new Date(DEMO_TODAY);
    d.setDate(d.getDate() - n);
    return iso(d);
  };
  /* One chase per full day overdue, capped at three. */
  const n = Math.max(0, Math.min(3, over));
  const channels: Channel[] = ['email', 'WhatsApp', 'phone'];
  for (let i = 0; i < n; i++) {
    chases.push({ at: back(over - i), channel: channels[i % 3], to: chaseTo });
  }
  return { ...r, chaseTo, chases };
}

export function buildReminders(): Reminder[] {
  const out: Reminder[] = [];

  /* Staff who cannot legally be rota'd — the loudest thing in the system. */
  STAFF.filter((s) => s.dbs.state === 'missing' || s.dbs.state === 'pending').forEach(
    (s) => {
      out.push(seedChases({
        id: `dbs-${s.id}`,
        severity: 'safeguarding',
        title: `${s.forename} ${s.surname} has no cleared DBS`,
        action:
          s.dbs.state === 'missing'
            ? 'Start an enhanced DBS check and keep them off every rota until it clears.'
            : 'Chase the pending DBS result and keep them off every rota until it clears.',
        due: shift(-3),
        route: 'staff',
        source: `Staff · ${s.role}`,
      }, `${s.forename} ${s.surname}`));
    },
  );

  STAFF.filter((s) => s.dbs.state === 'expiring').forEach((s) => {
    out.push(seedChases({
      id: `dbs-exp-${s.id}`,
      severity: 'overdue',
      title: `${s.forename} ${s.surname}'s DBS expires ${fmtDate(s.dbs.expires!)}`,
      action: 'Submit the renewal now — a lapsed check pulls them off the rota mid-season.',
      due: s.dbs.expires!,
      route: 'staff',
      source: `Staff · ${s.role}`,
    }, `${s.forename} ${s.surname}`));
  });

  /* Sessions the rota engine says are not compliant, today only. The rota
     runs all week; a queue of every future breach would bury today's. */
  SESSIONS.filter(
    (s) => s.status !== 'cancelled' && s.day === iso(DEMO_TODAY),
  ).forEach((s) => {
    const v = checkRatio(s);
    if (v.compliant) return;
    out.push(seedChases({
      id: `ratio-${s.id}`,
      severity: 'safeguarding',
      title: `${activityById(s.activityId).name} at ${s.start} is not compliant`,
      action: v.reasons.join('. ') + '.',
      due: iso(DEMO_TODAY),
      route: 'timetable',
      source: `Timetable · ${groupById(s.groupId).name}`,
    }, 'Tomas Halvorsen, activity manager'));
  });

  /* Documents that have not arrived for a student already on site. */
  STUDENTS.filter((s) => isOnSite(s)).forEach((s) => {
    const late = (Object.entries(s.docs) as [string, string][]).filter(
      ([, v]) => v === 'overdue',
    );
    if (!late.length) return;
    const names = late.map(([k]) => k);
    const safeguarding = names.some((n) => n === 'medical' || n === 'consent');
    out.push(seedChases({
      id: `doc-${s.id}`,
      severity: safeguarding ? 'safeguarding' : 'admin',
      title: `${s.forename} ${s.surname} — ${names.join(' and ')} outstanding`,
      action: safeguarding
        ? `Chase the parent or guardian today. ${s.forename} is on site without a ${names.join(' or ')} form.`
        : `Chase the parent or guardian for the ${names.join(' and ')}.`,
      due: shift(-2),
      route: 'students',
      source: `Students · ${groupById(s.groupId).name}`,
    }, `${s.guardian.name} · ${s.guardian.phone}`));
  });

  /* On site with no bed allocated. */
  STUDENTS.filter((s) => isOnSite(s) && !s.roomId).forEach((s) => {
    out.push(seedChases({
      id: `room-${s.id}`,
      severity: 'safeguarding',
      title: `${s.forename} ${s.surname} has no room allocated`,
      action: `${s.forename} is on site without a bed. Allocate a room in the ${s.band} band and name the floor warden.`,
      due: iso(DEMO_TODAY),
      route: 'rooms',
      source: `Room allocations · ${groupById(s.groupId).name}`,
    }, 'Residence manager'));
  });

  /* Off-site travel with no consent on file. */
  STUDENTS.filter((s) => isOnSite(s) && !s.guardian.consentToTravel)
    .slice(0, 6)
    .forEach((s) => {
      out.push(seedChases({
        id: `travel-${s.id}`,
        severity: 'safeguarding',
        title: `${s.forename} ${s.surname} has no off-site travel consent`,
        action: `Get written consent from ${s.guardian.name} (${s.guardian.relationship}) before ${s.forename} joins an excursion.`,
        due: shift(-1),
        route: 'rooms',
        source: `Room allocations · guardian ${s.guardian.phone}`,
      }, `${s.guardian.name} · ${s.guardian.phone}`));
    });

  /* Arriving inside a week and not admissible yet. */
  /* Only students who have NOT landed yet. Someone arriving today is already
     on site, and their missing document is raised once, by the document rule
     below — not twice. */
  upcomingArrivals()
    .filter((s) => {
      const d = daysFromToday(s.arrival);
      return d >= 1 && d <= 7 && !readiness(s).ready;
    })
    .forEach((s) => {
      const r = readiness(s);
      out.push(seedChases({
        id: `arrival-${s.id}`,
        severity: 'safeguarding',
        title: `${s.forename} ${s.surname} arrives ${whenLabel(s.arrival)} and cannot be admitted`,
        action: `${r.blocking.join('. ')}. Clear it before ${fmtDate(s.arrival)} or ${s.forename} cannot be taken in.`,
        due: s.arrival,
        route: 'arrivals',
        source: `New arrivals · ${groupById(s.groupId).name}`,
      }, `${s.guardian.name} · ${s.guardian.phone}`));
    });

  /* Bookings that cannot be confirmed until a receipt lands. */
  BOOKINGS.filter((b) => !b.receipt).forEach((b) => {
    out.push(seedChases({
      id: `receipt-${b.id}`,
      severity: 'overdue',
      title: `No receipt on ${activityById(b.activityId).name} — ${b.supplier}`,
      action: `Attach the supplier receipt for ${fmtMoney(b.costPence)}. The booking cannot be confirmed without it.`,
      due: b.date,
      route: 'bookings',
      source: `Bookings · ${b.reference}`,
    }, b.supplier));
  });

  const rank: Record<Severity, number> = { safeguarding: 0, overdue: 1, admin: 2 };
  return out.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.due.localeCompare(b.due),
  );
}

export const SEVERITY_COPY: Record<Severity, { label: string; mark: string }> = {
  safeguarding: { label: 'Safeguarding', mark: 'mark--critical' },
  overdue: { label: 'Overdue', mark: 'mark--overdue' },
  admin: { label: 'Admin', mark: 'mark--idle' },
};
