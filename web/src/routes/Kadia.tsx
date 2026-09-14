import { useState } from 'react';
import { Chat } from '../components/Chat';
import { IconGoogle } from '../lib/icons';
import { KADIA_SYSTEM, kadiaTools } from '../lib/kadiaAgent';
import { useStore } from '../lib/store';

import { LOCAL_TOPICS } from '../lib/localAnswers';

const GOOGLE_SCOPES = [
  ['Calendar', 'Push the approved timetable into a centre calendar'],
  ['Gmail', 'Send document and payment chases from the centre’s own address'],
  ['Drive', 'File receipts and consent forms against the season’s folder'],
  ['Sheets', 'Read a centre’s existing spreadsheets during onboarding'],
];

export function Kadia() {
  const { students, staff, open, incidents, payments, sessions, bookings } =
    useStore();
  /* Live records, so a key-holder and a keyless viewer get the same numbers. */
  const tools = kadiaTools({ students, staff, sessions, bookings, incidents, payments });
  const [showScopes, setShowScopes] = useState(false);
  const [showReach, setShowReach] = useState(false);

  const unmatched = payments.filter((p) => !p.studentId).length;

  return (
    <div className="askpage">
      <Chat
        variant="full"
        opener="Ask Kadia"
        system={KADIA_SYSTEM}
        tools={tools}
        greeting="Ask anything about the centre. I read the real records — students, staff, bookings, payments, incidents, the timetable — and I can draft the chase for you."
        placeholder="Ask about a student, the rota, a payment, today…"
        suggestions={[
          'What needs my attention today?',
          'Which staff cannot be rota’d with students, and why?',
          'Who arrives in the next week with documents outstanding?',
          'How many hours is each staff member working this week?',
        ]}
      />

      <div className="askpage__foot">
        <button
          className="askpage__disclose"
          onClick={() => setShowReach((v) => !v)}
          aria-expanded={showReach}
        >
          {showReach ? 'Hide' : 'What Kadia can reach'}
        </button>
        <button
          className="askpage__disclose"
          onClick={() => setShowScopes((v) => !v)}
          aria-expanded={showScopes}
        >
          <IconGoogle />
          Google · not connected
        </button>
      </div>

      {showReach && (
        <div className="askpage__panel stagger">
          <div>
            <p className="label">The records</p>
            <ul className="log">
              <li className="meta">{students.length} students, with stays, documents, beds and balances</li>
              <li className="meta">{staff.length} staff, with DBS, qualifications and availability</li>
              <li className="meta">{bookings.length} activity bookings and their receipts</li>
              <li className="meta">{incidents.length} incidents, and who was told when</li>
              <li className="meta">{payments.length} payments, {unmatched} of them unmatched</li>
              <li className="meta">{open.length} outstanding items and every chase against them</li>
            </ul>
          </div>
          <div>
            <p className="label">Without a key, it answers on</p>
            <ul className="log">
              {LOCAL_TOPICS.map((t) => (
                <li key={t} className="meta">{t}</li>
              ))}
            </ul>
            <p className="meta" style={{ marginTop: 12, color: 'var(--ink-3)' }}>
              Anything outside these says so rather than guessing. Every answer
              is looked up in the records, never recalled.
            </p>
          </div>
        </div>
      )}

      {showScopes && (
        <div className="askpage__panel stagger">
          <div>
            <p className="label">What a Google connection would need</p>
            {GOOGLE_SCOPES.map(([name, why]) => (
              <div key={name} className="scope">
                <span className="scope__name">{name}</span>
                <span className="meta scope__why">{why}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="mark mark--overdue">Not built yet</p>
            <p className="meta" style={{ marginTop: 10, color: 'var(--ink-2)' }}>
              A real connection needs OAuth consent, a Google Cloud project and
              a server to hold the refresh token. None of those exist yet, so
              this is the shape of the feature, not the feature.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
