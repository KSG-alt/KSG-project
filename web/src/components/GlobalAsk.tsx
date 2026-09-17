/* ── The pill, on every screen ────────────────────────────────────────────
   One Ask Kadia on every section, in the same place: top right, above the
   section's own content. The chips change with the screen — what somebody
   would actually ask while standing on it — and behind them is the same
   assistant reading the same records, so an answer given on the staff screen
   is the answer given on the home screen.

   Screens with a planner of their own (the timetable, the beds, the arrivals
   planner) carry their own dock instead: theirs can write as well as read.
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import type { Route } from '../App';
import { AskDock } from './AskDock';
import { Chat } from './Chat';
import { KADIA_SYSTEM, kadiaTools } from '../lib/kadiaAgent';
import { coverCommand } from '../lib/cover';
import { useStore } from '../lib/store';
import { DEMO_TODAY } from '../data/seed';

const TODAY_ISO = (() => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${DEMO_TODAY.getFullYear()}-${p(DEMO_TODAY.getMonth() + 1)}-${p(DEMO_TODAY.getDate())}`;
})();

/* What this screen is worth asking, in the words somebody standing on it
   would use. Two or three each — a longer list is a menu, not a prompt. */
const ASK: Partial<Record<Route, { hint: string; chips: string[] }>> = {
  home: {
    hint: 'what needs you today, and who is short',
    chips: [
      'What needs my attention today?',
      'Which staff cannot be rota’d, and why?',
    ],
  },
  reminders: {
    hint: 'what is overdue, and what escalates next',
    chips: [
      'What needs my attention today?',
      'Which documents are overdue?',
    ],
  },
  students: {
    hint: 'documents, balances, beds, health',
    chips: [
      'Who arrives in the next week with documents outstanding?',
      'Which students owe money?',
    ],
  },
  transfers: {
    hint: 'flights, runs and who meets them',
    chips: [
      'Who is arriving today and when?',
      'Which students are travelling alone?',
    ],
  },
  attendance: {
    hint: 'who was counted, and who was not',
    chips: [
      'Which registers are missing?',
      'Who was not there today?',
    ],
  },
  portal: {
    hint: 'what parents have sent, and what is chased',
    chips: [
      'Which documents are overdue?',
      'What is waiting on us to check?',
    ],
  },
  staff: {
    hint: 'hours, DBS, availability, cover',
    chips: [
      'Kebba Sarr is off sick today — who can cover?',
      'How many hours is each staff member working this week?',
    ],
  },
  bookings: {
    hint: 'suppliers, costs and receipts',
    chips: [
      'Which bookings have no receipt?',
      'What have we committed to suppliers?',
    ],
  },
  finance: {
    hint: 'what landed, what is owed, what is unmatched',
    chips: [
      'Which payments have no student?',
      'Who still owes money?',
    ],
  },
  incidents: {
    hint: 'what happened, and how fast the lead was told',
    chips: [
      'Which incidents are still open?',
      'How fast was the safeguarding lead told?',
    ],
  },
  audit: {
    hint: 'who did what, and when',
    chips: [
      'What needs my attention today?',
      'Which incidents are still open?',
    ],
  },
  setup: {
    hint: 'sites, ratios, escalation, roles',
    chips: [
      'What are the ratios for each age band?',
      'Which staff cannot be rota’d, and why?',
    ],
  },
  office: {
    hint: 'across every centre — records, money, documents',
    chips: [
      'Which students owe money and arrive this week?',
      'Which staff cannot be rota’d, and why?',
    ],
  },
};

export function GlobalAsk({ route }: { route: Route }) {
  const {
    students, staff, sessions, bookings, incidents, payments, duties,
  } = useStore();
  const [ask, setAsk] = useState<{ text: string; nonce: number } | null>(null);

  const spec = ASK[route];
  if (!spec) return null;

  return (
    <AskDock
      title="Ask Kadia"
      hint={spec.hint}
      chips={spec.chips}
      onAsk={(text) => setAsk({ text, nonce: Date.now() })}
    >
      <Chat
        system={KADIA_SYSTEM}
        tools={kadiaTools({
          students, staff, sessions, bookings, incidents, payments, duties,
        })}
        greeting="I read this centre's records on your device. Ask, and I answer from them."
        placeholder="Ask about a student, the rota, a payment, today…"
        suggestions={[]}
        localCommands={(q) =>
          coverCommand(q, { staff, sessions, duties, students }, TODAY_ISO)
        }
        ask={ask}
      />
    </AskDock>
  );
}
