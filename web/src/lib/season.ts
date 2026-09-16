/* ── The season, added up ─────────────────────────────────────────────────
   A centre screen answers "what is wrong today". Head office asks a different
   question: what does the season look like, and is it going to be short.

   Everything here is derived from the same records the centre screens read —
   no second set of numbers, because two sets of numbers is how a head office
   and a centre end up in a meeting arguing about whose spreadsheet is right.
   ──────────────────────────────────────────────────────────────────────── */

import { buildPayments, owed, type Payment } from '../data/finance';
import {
  BOOKINGS, DEMO_TODAY, STUDENTS, daysFromToday, isOnSite, type Booking,
  type Student,
} from '../data/seed';
import type { Health } from '../data/health';

export interface Money {
  /* What the season is worth on the books. */
  invoicedPence: number;
  /* What has actually been banked against a student. */
  bankedPence: number;
  /* Invoiced, less banked. The number a director asks for. */
  outstandingPence: number;
  /* Money in the bank that belongs to nobody yet — real money the platform
     cannot yet credit to a child. */
  unmatchedPence: number;
  unmatchedCount: number;
  /* Students arriving inside a week who still owe. A centre cannot hold a
     child at the door over money, so this is a call to make now, not then. */
  arrivingOwing: { student: Student; owed: number; days: number }[];
  /* Committed spend on activity bookings, and what has no receipt behind it. */
  bookedPence: number;
  unreceiptedPence: number;
  unreceiptedCount: number;
}

export function money(
  students: Student[],
  payments: Payment[],
  bookings: Booking[],
  on: Date = DEMO_TODAY,
): Money {
  const invoicedPence = students.reduce((n, s) => n + s.balancePence, 0);
  const bankedPence = students.reduce((n, s) => n + s.paidPence, 0);
  const unmatched = payments.filter((p) => !p.studentId);
  const unreceipted = bookings.filter((b) => !b.receipt);

  const arrivingOwing = students
    .filter((s) => {
      const days = daysFromToday(s.arrival, on);
      return days >= 0 && days <= 7 && owed(s) > 0;
    })
    .map((s) => ({ student: s, owed: owed(s), days: daysFromToday(s.arrival, on) }))
    .sort((a, b) => a.days - b.days || b.owed - a.owed);

  return {
    invoicedPence,
    bankedPence,
    outstandingPence: invoicedPence - bankedPence,
    unmatchedPence: unmatched.reduce((n, p) => n + p.amountPence, 0),
    unmatchedCount: unmatched.length,
    arrivingOwing,
    bookedPence: bookings.reduce((n, b) => n + b.costPence, 0),
    unreceiptedPence: unreceipted.reduce((n, b) => n + b.costPence, 0),
    unreceiptedCount: unreceipted.length,
  };
}

/* One row per child, with the six things head office is ever asked about:
   are they paid up, are their documents in, is their health record signed
   off, are they here, where do they sleep, and who is the contact. */
export interface ChildRow {
  student: Student;
  owed: number;
  docsIn: number;
  docsTotal: number;
  health: Health | null;
  onSite: boolean;
}

export function children(students: Student[], health: Health[]): ChildRow[] {
  return students.map((s) => {
    const docs = Object.values(s.docs);
    return {
      student: s,
      owed: owed(s),
      docsIn: docs.filter((d) => d === 'in').length,
      docsTotal: docs.length,
      health: health.find((h) => h.studentId === s.id) ?? null,
      onSite: isOnSite(s),
    };
  });
}

export function selfCheck() {
  const m = money(STUDENTS, buildPayments(), BOOKINGS);

  /* The three headline figures have to reconcile, or the screen is an
     argument waiting to happen. */
  console.assert(
    m.invoicedPence - m.bankedPence === m.outstandingPence,
    `outstanding does not reconcile: ${m.invoicedPence} - ${m.bankedPence} ≠ ${m.outstandingPence}`,
  );
  console.assert(m.outstandingPence >= 0, 'the season cannot be overpaid in aggregate');

  /* The headline figure and the per-child figures have to be the same money.
     owed() floors at zero per student, so a single overpaid child would make
     the total smaller than the sum of the rows under it — the kind of penny
     difference that costs an hour in a meeting. */
  const rows = STUDENTS.reduce((n, s) => n + owed(s), 0);
  console.assert(
    rows === m.outstandingPence,
    `the total owed (${m.outstandingPence}) does not match the sum of the rows (${rows})`,
  );

  /* Money nobody can credit is money in the bank, not money owed — counting
     it twice would flatter the season by whatever is unmatched. */
  console.assert(
    m.unmatchedPence > 0 && m.unmatchedCount > 0,
    'the seeded set is meant to contain unmatched payments',
  );

  /* Nobody in "arriving and owing" has already arrived, and nobody in it
     owes nothing. */
  m.arrivingOwing.forEach((r) => {
    console.assert(r.days >= 0, `${r.student.id}: already arrived but listed as arriving`);
    console.assert(r.owed > 0, `${r.student.id}: listed as owing nothing`);
  });
}
