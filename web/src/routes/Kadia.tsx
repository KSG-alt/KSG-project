import { useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { Chat } from '../components/Chat';
import { IconGoogle } from '../lib/icons';
import { KADIA_SYSTEM, KADIA_TOOLS } from '../lib/kadiaAgent';
import { BOOKINGS, STAFF, STUDENTS } from '../data/seed';

const GOOGLE_SCOPES = [
  ['Calendar', 'Push the approved timetable into a centre calendar'],
  ['Gmail', 'Send document and payment chases from the centre’s own address'],
  ['Drive', 'File receipts and consent forms against the season’s folder'],
  ['Sheets', 'Read a centre’s existing spreadsheets during onboarding'],
];

export function Kadia() {
  const [showScopes, setShowScopes] = useState(false);

  return (
    <>
      <SectionHead title="Ask Kadia" count="Assistant across the whole centre" />

      <div className="kadia">
        <div className="kadia__main">
          <Chat
            system={KADIA_SYSTEM}
            tools={KADIA_TOOLS}
            greeting="Ask anything about the centre. I read the real records — students, staff, bookings, the timetable — and I can draft the chase for you."
            placeholder="e.g. Who is arriving on Sunday with documents still missing?"
            suggestions={[
              'What needs my attention today?',
              'Which staff cannot be rota’d with students, and why?',
              'Who arrives in the next week with documents outstanding?',
              'Draft a payment chase for the largest outstanding balance.',
            ]}
          />
        </div>

        <aside className="kadia__side">
          <div className="panel">
            <div className="panel__head">
              <span className="label">Google</span>
              <span className="mark mark--idle">Not connected</span>
            </div>
            <p className="meta" style={{ margin: '0 0 14px', color: 'var(--bone-2)' }}>
              Connecting Google lets Kadia send chases from the centre&rsquo;s own
              address, file receipts, and push an approved timetable to a calendar.
            </p>
            <button className="btn" onClick={() => setShowScopes((v) => !v)}>
              <IconGoogle />
              {showScopes ? 'Hide what it needs' : 'What it needs'}
            </button>

            {showScopes && (
              <div style={{ marginTop: 16 }} className="stagger">
                {GOOGLE_SCOPES.map(([name, why], i) => (
                  <div
                    key={name}
                    style={{
                      padding: '10px 0',
                      borderTop: '1px solid var(--rule)',
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 'var(--t-sm)' }}>{name}</span>
                    <span className="meta" style={{ display: 'block', color: 'var(--bone-3)' }}>
                      {why}
                    </span>
                  </div>
                ))}
                <p
                  className="mark mark--overdue"
                  style={{ marginTop: 14, alignItems: 'flex-start' }}
                >
                  Not built yet
                </p>
                <p className="meta" style={{ margin: '6px 0 0', color: 'var(--bone-2)' }}>
                  A real connection needs OAuth consent, a Google Cloud project
                  and a server to hold the refresh token. None of those exist
                  yet, so this panel is the shape of the feature, not the feature.
                </p>
              </div>
            )}
          </div>

          <div className="panel">
            <span className="label">What Kadia can reach now</span>
            <ul className="log" style={{ marginTop: 12 }}>
              <li className="meta">{STUDENTS.length} student records, with stays and documents</li>
              <li className="meta">{STAFF.length} staff records, with DBS and qualifications</li>
              <li className="meta">{BOOKINGS.length} activity bookings and their receipts</li>
              <li className="meta">The day&rsquo;s timetable and every ratio verdict</li>
            </ul>
            <p className="meta" style={{ margin: '14px 0 0', color: 'var(--bone-3)' }}>
              Every answer is looked up in these records, not recalled.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
