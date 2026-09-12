/* ── Payments ─────────────────────────────────────────────────────────────
   PRODUCT.md names payment reconciliation as one of the high-friction jobs
   the platform automates. A balance on a student record is not
   reconciliation — reconciliation is the job of deciding which of the lines
   on the bank statement is which student, when the payer is a parent with a
   different surname and the reference is blank.

   Every payment here is derived from the seeded students. The unmatched ones
   are unmatched the way real ones are: right money, wrong or missing
   reference, payer the platform has never seen.
   ──────────────────────────────────────────────────────────────────────── */

import { DEMO_TODAY, STUDENTS, type Student } from './seed';

export type Method = 'Bank transfer' | 'Card' | 'Cash';

export interface Payment {
  id: string;
  at: string;
  amountPence: number;
  payer: string;
  reference: string;
  method: Method;
  /* null until somebody decides. `auto` records whether the reference did the
     deciding or a person did. */
  studentId: string | null;
  auto: boolean;
}

export const invoiceRef = (s: Student) =>
  `INV-27-${s.id.replace('s-', '').padStart(4, '0')}`;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const back = (n: number) => {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const METHODS: Method[] = ['Bank transfer', 'Bank transfer', 'Card', 'Cash'];

export function buildPayments(): Payment[] {
  const r = rng(5501);
  const out: Payment[] = [];

  /* Money already banked against a student, matched by its reference. */
  STUDENTS.filter((s) => s.paidPence > 0).forEach((s, i) => {
    out.push({
      id: `pay-${String(i + 1).padStart(4, '0')}`,
      at: back(2 + Math.floor(r() * 60)),
      amountPence: s.paidPence,
      payer: s.guardian.name,
      reference: invoiceRef(s),
      method: METHODS[Math.floor(r() * METHODS.length)],
      studentId: s.id,
      auto: true,
    });
  });

  /* The ones a person has to decide. Each is real money from a real seeded
     guardian, arriving without a usable reference. */
  const owing = STUDENTS.filter((s) => s.paidPence < s.balancePence);
  const orphans = [
    { pick: 3, ref: '', note: 'no reference' },
    { pick: 11, ref: 'SUMMER SCHOOL', note: 'free text' },
    { pick: 19, ref: 'INV-27-0000', note: 'reference not on any invoice' },
    { pick: 27, ref: '', note: 'no reference' },
    { pick: 34, ref: 'JULY CAMP BALANCE', note: 'free text' },
    { pick: 42, ref: '', note: 'no reference' },
    { pick: 58, ref: 'REF 8841', note: 'supplier reference, not ours' },
  ];

  orphans.forEach((o, i) => {
    const s = owing[o.pick % owing.length];
    if (!s) return;
    out.push({
      id: `pay-x${String(i + 1).padStart(3, '0')}`,
      at: back(1 + i * 2),
      /* Part payments and round numbers, which is what actually lands. */
      amountPence:
        i % 3 === 0
          ? s.balancePence - s.paidPence
          : Math.round((s.balancePence - s.paidPence) / 2 / 1000) * 1000,
      payer: o.pick % 4 === 0 ? s.guardian.emergencyName : s.guardian.name,
      reference: o.ref,
      method: METHODS[Math.floor(r() * METHODS.length)],
      studentId: null,
      auto: false,
    });
  });

  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export const owed = (s: Student) => Math.max(0, s.balancePence - s.paidPence);

/* Candidates for an unmatched payment, best first. Exact money outstanding
   counts for most, then a shared surname, then a shared first name. This is a
   suggestion for a person to accept — the platform never decides silently
   where money goes. */
export function suggestMatches(p: Payment, students: Student[] = STUDENTS) {
  const payer = p.payer.toLowerCase();
  const scored = students
    .filter((s) => owed(s) > 0)
    .map((s) => {
      let score = 0;
      const why: string[] = [];
      if (owed(s) === p.amountPence) {
        score += 60;
        why.push('exactly the outstanding balance');
      } else if (Math.abs(owed(s) - p.amountPence) < 5000) {
        score += 25;
        why.push('within £50 of the balance');
      }
      if (payer.includes(s.surname.toLowerCase())) {
        score += 30;
        why.push('payer shares the surname');
      }
      if (payer.includes(s.guardian.name.toLowerCase())) {
        score += 40;
        why.push('payer is the named guardian');
      }
      if (payer.includes(s.guardian.emergencyName.toLowerCase())) {
        score += 20;
        why.push('payer is the emergency contact');
      }
      return { student: s, score, why };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 4);
}
