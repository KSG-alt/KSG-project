/* Kadia's tool surface. Shared by the hero panel and the Kadia section, so
   both talk to the same records with the same rules. */

import { checkRatio } from './ratio';
import type { ToolSpec } from './anthropic';
import {
  BOOKINGS, DEMO_TODAY, GROUPS, SESSIONS, STAFF, STUDENTS, activityById,
  fmtDateLong, fmtMoney, groupById, isOnSite, staffById,
} from '../data/seed';

export const KADIA_TOOLS: ToolSpec[] = [
  {
    name: 'find_students',
    description:
      'Search students by name, country, group or age band. Returns arrival and leaving dates, documents and balance.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text matched against name, country and group' },
        on_site_only: { type: 'boolean' },
        limit: { type: 'number' },
      },
    },
    run: (i: { query?: string; on_site_only?: boolean; limit?: number }) => {
      const q = (i.query ?? '').toLowerCase();
      return STUDENTS.filter((s) => {
        if (i.on_site_only && !isOnSite(s)) return false;
        if (!q) return true;
        return `${s.forename} ${s.surname} ${s.country} ${groupById(s.groupId).name} ${s.band}`
          .toLowerCase()
          .includes(q);
      })
        .slice(0, i.limit ?? 25)
        .map((s) => ({
          name: `${s.forename} ${s.surname}`,
          age: s.age,
          group: groupById(s.groupId).name,
          arrival: s.arrival,
          leaving: s.leaving,
          country: s.country,
          documents: s.docs,
          owed: fmtMoney(s.balancePence - s.paidPence),
        }));
    },
  },
  {
    name: 'find_staff',
    description: 'Search staff and read their DBS state, qualifications and age bands.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        dbs_state: { type: 'string', enum: ['cleared', 'expiring', 'pending', 'missing'] },
      },
    },
    run: (i: { query?: string; dbs_state?: string }) => {
      const q = (i.query ?? '').toLowerCase();
      return STAFF.filter((s) => {
        if (i.dbs_state && s.dbs.state !== i.dbs_state) return false;
        if (!q) return true;
        return `${s.forename} ${s.surname} ${s.role} ${s.quals.join(' ')}`
          .toLowerCase()
          .includes(q);
      }).map((s) => ({
        name: `${s.forename} ${s.surname}`,
        role: s.role,
        age: s.age,
        dbs: s.dbs,
        quals: s.quals,
        bands: s.bands,
      }));
    },
  },
  {
    name: 'find_bookings',
    description: 'List activity bookings, their cost, status and whether a receipt is attached.',
    input_schema: {
      type: 'object',
      properties: { missing_receipt_only: { type: 'boolean' } },
    },
    run: (i: { missing_receipt_only?: boolean }) =>
      BOOKINGS.filter((b) => (i.missing_receipt_only ? !b.receipt : true)).map((b) => ({
        ref: b.id,
        activity: activityById(b.activityId).name,
        supplier: b.supplier,
        group: groupById(b.groupId).name,
        date: b.date,
        cost: fmtMoney(b.costPence),
        status: b.status,
        receipt: b.receipt ? b.receipt.filename : null,
      })),
  },
  {
    name: 'read_timetable',
    description: 'Read the day’s sessions with their staffing and ratio verdict.',
    input_schema: { type: 'object', properties: {} },
    run: () =>
      SESSIONS.map((s) => ({
        group: groupById(s.groupId).name,
        activity: activityById(s.activityId).name,
        start: s.start,
        staff: s.staffIds.map((i) => `${staffById(i).forename} ${staffById(i).surname}`),
        ratio: checkRatio(s),
      })),
  },
  {
    name: 'centre_summary',
    description: 'Counts across the season: students on site, documents outstanding, DBS states, money owed.',
    input_schema: { type: 'object', properties: {} },
    run: () => {
      const onSite = STUDENTS.filter((s) => isOnSite(s));
      const docs = STUDENTS.flatMap((s) => Object.values(s.docs));
      return {
        date: DEMO_TODAY.toISOString().slice(0, 10),
        students_in_season: STUDENTS.length,
        students_on_site: onSite.length,
        groups: GROUPS.map((g) => ({
          name: g.name,
          band: g.band,
          students: STUDENTS.filter((s) => s.groupId === g.id).length,
        })),
        documents_overdue: docs.filter((d) => d === 'overdue').length,
        documents_outstanding: docs.filter((d) => d === 'outstanding').length,
        staff_without_cleared_dbs: STAFF.filter((s) => s.dbs.state !== 'cleared').length,
        outstanding_balance: fmtMoney(
          STUDENTS.reduce((n, s) => n + (s.balancePence - s.paidPence), 0),
        ),
        bookings_without_receipt: BOOKINGS.filter((b) => !b.receipt).length,
      };
    },
  },
];


export const KADIA_SYSTEM = `You are Kadia, the assistant inside a summer-school operations platform for a UK activity centre. Today is ${fmtDateLong(
  DEMO_TODAY.toISOString(),
)}.

You can search the whole system with your tools: students, staff, bookings, the timetable, and a counts summary. Always look the answer up rather than guessing, and say which numbers you read.

House rules:
- Safeguarding outranks admin. If a DBS problem or a ratio breach is anywhere near the question, lead with it.
- You automate the chase, never the judgement. Draft the reminder, name the breach, propose the rota — a person decides.
- This is a demonstration running on seeded fake data. Never imply it is a live centre, and never invent a customer, price or benchmark.
- Use British English and centre terminology: centre, season, age band, group, ratio, DBS, safeguarding lead.
Keep replies short and concrete.`;
