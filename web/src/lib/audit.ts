/* The safeguarding audit trail.

   PRODUCT.md names this as one of the four admin-dashboard capabilities: a
   timestamped record of ratios, DBS status and incident handling, built for
   inspection. Inspection is the point — an entry is never edited or deleted,
   only appended, and every entry says who did it and what changed. */

import {
  BOOKINGS, DEMO_TODAY, SESSIONS, STAFF, STUDENTS, activityById, fmtMoney,
  groupById, roomLabel,
} from '../data/seed';
import { checkRatio } from './ratio';

export type AuditCategory = 'safeguarding' | 'rota' | 'record' | 'finance';

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  subject: string;
  detail: string;
  category: AuditCategory;
}

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  safeguarding: 'Safeguarding',
  rota: 'Rota',
  record: 'Record',
  finance: 'Finance',
};

let seq = 0;
const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');

export function entry(
  category: AuditCategory,
  action: string,
  subject: string,
  detail: string,
  actor = 'Ismail',
  at: Date = new Date(DEMO_TODAY),
): AuditEntry {
  seq += 1;
  return {
    id: `a-${seq}`,
    at: stamp(at),
    actor,
    action,
    subject,
    detail,
    category,
  };
}

const back = (days: number, hour: number, minute = 0) => {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

/* Seeded history. Every line traces to something in the records — a DBS on
   file, a session's ratio verdict, a booking with a receipt — so the trail
   agrees with the rest of the system rather than being decorative. */
export function buildAudit(): AuditEntry[] {
  const out: AuditEntry[] = [];

  STAFF.filter((s) => s.dbs.state === 'cleared' && s.dbs.issued)
    .slice(0, 6)
    .forEach((s, i) => {
      out.push(
        entry(
          'safeguarding',
          'DBS recorded',
          `${s.forename} ${s.surname}`,
          `Enhanced check ${s.dbs.certificate} filed. Expires ${s.dbs.expires}.`,
          'Kebba Sarr',
          back(5 - (i % 5), 9, i * 7),
        ),
      );
    });

  STAFF.filter((s) => s.dbs.state !== 'cleared').forEach((s, i) => {
    out.push(
      entry(
        'safeguarding',
        'Withheld from rota',
        `${s.forename} ${s.surname}`,
        `DBS ${s.dbs.state}. Not to be rota'd with students until cleared.`,
        'Kebba Sarr',
        back(3, 8, 20 + i * 5),
      ),
    );
  });

  SESSIONS.filter((s) => s.day === stamp(DEMO_TODAY).slice(0, 10))
    .slice(0, 5)
    .forEach((s, i) => {
      const v = checkRatio(s);
      out.push(
        entry(
          'rota',
          v.compliant ? 'Ratio checked — compliant' : 'Ratio checked — breach',
          `${activityById(s.activityId).name}, ${groupById(s.groupId).name} ${s.start}`,
          `${v.assigned} staff for ${v.headcount} students at 1:${v.ratio}.${
            v.compliant ? '' : ' ' + v.reasons.join('. ') + '.'
          }`,
          'Rota engine',
          back(0, 7, 30 + i * 3),
        ),
      );
    });

  BOOKINGS.filter((b) => b.receipt).forEach((b, i) => {
    out.push(
      entry(
        'finance',
        'Booking confirmed',
        `${activityById(b.activityId).name} — ${b.supplier}`,
        `${fmtMoney(b.costPence)} confirmed against receipt ${b.receipt!.filename}.`,
        b.receipt!.attachedBy,
        back(4 - i, 14, 10),
      ),
    );
  });

  STUDENTS.filter((s) => s.roomId)
    .slice(0, 4)
    .forEach((s, i) => {
      out.push(
        entry(
          'record',
          'Room allocated',
          `${s.forename} ${s.surname}`,
          `Placed in ${roomLabel(s.roomId)}, bed ${s.bed}, ${s.band} band.`,
          'Ismail',
          back(6, 11, i * 9),
        ),
      );
    });

  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function toCsv(rows: AuditEntry[]) {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const head = ['Timestamp', 'Category', 'Action', 'Subject', 'Detail', 'Recorded by'];
  const body = rows.map((r) =>
    [r.at, CATEGORY_LABEL[r.category], r.action, r.subject, r.detail, r.actor]
      .map(esc)
      .join(','),
  );
  return [head.map(esc).join(','), ...body].join('\n');
}
