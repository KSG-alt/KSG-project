/* Kadia's tool surface. Shared by the hero panel and the Kadia section, so
   both talk to the same records with the same rules. */

import { checkRatio } from './ratio';
import type { ToolSpec } from './anthropic';
import {
  BOOKINGS, DEMO_TODAY, GROUPS, SESSIONS, STAFF, STUDENTS, WEEKLY_LIMIT,
  activityById, fmtDateLong, fmtMoney, groupById, isOnSite, sessionsFor,
  staffById, weeklyHours, availabilityClashes,
} from '../data/seed';
import { buildIncidents, minutesToDsl } from '../data/incidents';
import { buildPayments, invoiceRef, owed, suggestMatches } from '../data/finance';
import { BAND_RULES, ROLES, SITES } from './../data/centre';
import { ESCALATION_DAYS } from './reminders';

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
    description:
      'Read scheduled sessions with their staffing and ratio verdict. Defaults to today; pass a day as YYYY-MM-DD for another day this week.',
    input_schema: {
      type: 'object',
      properties: { day: { type: 'string', description: 'YYYY-MM-DD' } },
    },
    run: (i: { day?: string }) =>
      SESSIONS.filter(
        (s) => s.day === (i?.day ?? DEMO_TODAY.toISOString().slice(0, 10)),
      ).map((s) => ({
        day: s.day,
        group: groupById(s.groupId).name,
        activity: activityById(s.activityId).name,
        start: s.start,
        staff: s.staffIds.map((i) => `${staffById(i).forename} ${staffById(i).surname}`),
        ratio: checkRatio(s),
      })),
  },
  {
    name: 'staff_hours',
    description:
      'Rota\u2019d hours per staff member for the current week, against their contracted hours.',
    input_schema: { type: 'object', properties: {} },
    run: () =>
      STAFF.map((s) => ({
        name: `${s.forename} ${s.surname}`,
        role: s.role,
        rotaed_hours: weeklyHours(s.id),
        contracted_hours: s.contractedHours,
        sessions: sessionsFor(s.id).length,
        over_working_time_limit: weeklyHours(s.id) > WEEKLY_LIMIT,
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
  {
    name: 'find_incidents',
    description:
      'Read the incident log: what happened, at what level, who was told and how long it took.',
    input_schema: {
      type: 'object',
      properties: {
        open_only: { type: 'boolean' },
        level: { type: 'string', enum: ['logged', 'significant', 'notifiable'] },
      },
    },
    run: (i: { open_only?: boolean; level?: string }) =>
      buildIncidents()
        .filter((x) => (i.open_only ? x.status === 'open' : true))
        .filter((x) => (i.level ? x.level === i.level : true))
        .map((x) => ({
          at: x.at,
          kind: x.kind,
          level: x.level,
          where: x.where,
          what: x.what,
          action: x.action,
          status: x.status,
          safeguarding_lead_told: x.dslInformedAt,
          minutes_to_safeguarding_lead: minutesToDsl(x),
          parents_told: x.parentsInformedAt,
          follow_up: x.followUp,
        })),
  },
  {
    name: 'find_payments',
    description:
      'Payments received and what they are matched to. Use unmatched_only for the reconciliation queue, with the best guess for each.',
    input_schema: {
      type: 'object',
      properties: { unmatched_only: { type: 'boolean' }, limit: { type: 'number' } },
    },
    run: (i: { unmatched_only?: boolean; limit?: number }) =>
      buildPayments()
        .filter((p) => (i.unmatched_only ? !p.studentId : true))
        .slice(0, i.limit ?? 25)
        .map((p) => {
          const best = p.studentId ? null : suggestMatches(p)[0];
          return {
            received: p.at,
            amount: fmtMoney(p.amountPence),
            payer: p.payer,
            method: p.method,
            reference: p.reference || null,
            matched_to: p.studentId
              ? `${STUDENTS.find((s) => s.id === p.studentId)?.forename} ${STUDENTS.find((s) => s.id === p.studentId)?.surname}`
              : null,
            best_guess: best
              ? `${best.student.forename} ${best.student.surname} (${invoiceRef(best.student)}) — ${best.why.join(', ')}`
              : null,
          };
        }),
  },
  {
    name: 'outstanding_balances',
    description: 'Students who still owe money, largest first, with their invoice reference and guardian.',
    input_schema: { type: 'object', properties: { limit: { type: 'number' } } },
    run: (i: { limit?: number }) =>
      STUDENTS.filter((s) => owed(s) > 0)
        .sort((a, b) => owed(b) - owed(a))
        .slice(0, i.limit ?? 15)
        .map((s) => ({
          name: `${s.forename} ${s.surname}`,
          invoice: invoiceRef(s),
          invoiced: fmtMoney(s.balancePence),
          received: fmtMoney(s.paidPence),
          outstanding: fmtMoney(owed(s)),
          guardian: `${s.guardian.name}, ${s.guardian.phone}`,
        })),
  },
  {
    name: 'staff_availability',
    description:
      'Days staff have said they cannot work, and any rota\u2019d session that clashes with one.',
    input_schema: { type: 'object', properties: {} },
    run: () => ({
      away: STAFF.filter((s) => s.away.length > 0).map((s) => ({
        name: `${s.forename} ${s.surname}`,
        away: s.away,
      })),
      clashes: availabilityClashes().map((c) => ({
        name: `${c.staff.forename} ${c.staff.surname}`,
        day: c.session.day,
        start: c.session.start,
        activity: activityById(c.session.activityId).name,
        group: groupById(c.session.groupId).name,
      })),
    }),
  },
  {
    name: 'centre_config',
    description:
      'How this centre is configured: sites, age bands and ratios, escalation thresholds, roles and access.',
    input_schema: { type: 'object', properties: {} },
    run: () => ({
      sites: SITES.map((s) => ({
        name: s.name,
        town: s.town,
        beds: s.capacity,
        onboarded: s.onboarded,
      })),
      band_rules: BAND_RULES,
      escalation_days: ESCALATION_DAYS,
      roles: ROLES.map((r) => ({
        name: r.name,
        sections: r.sections.length,
        sees_welfare_notes: r.welfareDetail,
        can_edit: r.canEditRecords,
      })),
    }),
  },
];


export const KADIA_SYSTEM = `You are Kadia, the assistant inside a summer-school operations platform for a UK activity centre. Today is ${fmtDateLong(
  DEMO_TODAY.toISOString(),
)}.

You can search the whole system with your tools: students, staff, bookings, the timetable, incidents, payments, staff availability, the centre's configuration, and a counts summary. Always look the answer up rather than guessing, and say which numbers you read.

House rules:
- Safeguarding outranks admin. If a DBS problem or a ratio breach is anywhere near the question, lead with it.
- You automate the chase, never the judgement. Draft the reminder, name the breach, propose the rota — a person decides.
- This is a demonstration running on seeded fake data. Never imply it is a live centre, and never invent a customer, price or benchmark.
- An unmatched payment gets a suggestion, never a decision. Say who you think it belongs to and why, and leave the match to a person.
- A chase you draft is queued, not sent. Never say a parent has been contacted.
- Use British English and centre terminology: centre, season, age band, group, ratio, DBS, safeguarding lead.
Keep replies short and concrete.`;
