/* ── Head office ──────────────────────────────────────────────────────────
   Every other screen in this platform is a centre looking at its own day.
   This one is the senior team looking down at every centre at once, and it
   exists because of DECISIONS 0005: the clinical record is declared at the
   centre's front door and verified by head office, so head office needs
   somewhere to do that work rather than a spreadsheet and an inbox.

   Four jobs, which is all head office actually does with this data:

   - Verify what families have declared, oldest first, before the child
     arrives rather than after.
   - Chase the medication the centre is holding with no consent to give it.
   - Know the clinical load across the season: how many adrenaline plans, on
     which weeks, at which centre, so the right people are trained and on.
   - Answer "who read this child's medical record", which is the question
     that follows any complaint about special category data.

   It is deliberately not a second copy of the centre's screens. Anything
   operational — a register, a rota, a transfer — stays where the centre
   works, and head office opens the student record if it needs the detail.
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { IconArrow, IconCheck } from '../lib/icons';
import { useStore } from '../lib/store';
import { SITES } from '../data/centre';
import {
  HEALTH_COPY, SEVERITY_COPY, dueToday, missedDoses, type Health,
} from '../data/health';
import { waitingOnThem, waitingOnUs } from '../data/portal';
import { children, money } from '../lib/season';
import { invoiceRef, owed } from '../data/finance';
import {
  DEMO_TODAY, daysFromToday, fmtDate, fmtDateLong, fmtMoney, isOnSite,
  roomLabel,
} from '../data/seed';
import { Lede } from '../components/Lede';

type View = 'centres' | 'money' | 'children' | 'verify' | 'consent' | 'load' | 'access';

/* Head office is judged on how long a declaration sat, not on how many it
   cleared. Anything older than this has been waiting too long. */
const SLOW_DAYS = 7;

export function Office() {
  const {
    students, staff, health, administrations, audit, reminders, open, incidents,
    requests, payments, registers, bookings, verifyHealth, queryHealth, role,
  } = useStore();

  const [view, setView] = useState<View>('centres');
  const [q, setQ] = useState('');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const named = (id: string) => students.find((s) => s.id === id);

  /* Waiting on head office: declared or queried, oldest first. A record for a
     child who is already here is worse than one for a child who arrives in
     three weeks, so arrival breaks the tie. */
  const toVerify = useMemo(
    () =>
      health
        .filter((h) => h.state !== 'verified')
        .sort((a, b) => {
          const sa = named(a.studentId);
          const sb = named(b.studentId);
          const here = Number(sb ? isOnSite(sb) : false) - Number(sa ? isOnSite(sa) : false);
          return here || a.declaredAt.localeCompare(b.declaredAt);
        }),
    [health, students],
  );

  const waited = (h: Health) => -daysFromToday(h.declaredAt);
  const slow = toVerify.filter((h) => waited(h) > SLOW_DAYS);

  const noConsent = useMemo(
    () =>
      health.flatMap((h) =>
        h.medications
          .filter((m) => !m.consent)
          .map((m) => ({ health: h, medication: m })),
      ),
    [health],
  );

  /* The clinical load, which is a staffing question before it is a medical
     one: somebody trained has to be on site every hour a child with an
     adrenaline plan is. */
  const load = useMemo(() => {
    const onSite = health.filter((h) => {
      const s = named(h.studentId);
      return s ? isOnSite(s) : false;
    });
    const severe = onSite.filter((h) =>
      h.allergies.some((a) => a.severity === 'anaphylaxis'),
    );
    const held = onSite.filter((h) =>
      h.medications.some((m) => m.holder === 'staff-held'),
    );
    const rounds = onSite.reduce((n, h) => n + dueToday(h).length, 0);
    return { onSite, severe, held, rounds };
  }, [health, students]);

  const missed = missedDoses(administrations);

  const purse = useMemo(
    () => money(students, payments, bookings),
    [students, payments, bookings],
  );

  const roll = useMemo(() => children(students, health), [students, health]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return roll
      .filter((r) => {
        if (!needle) return true;
        const s = r.student;
        return `${s.forename} ${s.surname} ${s.country} ${s.band} ${invoiceRef(s)}`
          .toLowerCase()
          .includes(needle);
      })
      .sort(
        (a, b) =>
          Number(b.onSite) - Number(a.onSite) ||
          a.student.surname.localeCompare(b.student.surname),
      );
  }, [roll, q]);

  /* Who opened a clinical record, from the same audit trail everything else
     writes to. */
  const reads = audit.filter((a) => a.action === 'Welfare record opened');

  const tabs: { id: View; label: string }[] = [
    { id: 'centres', label: `Centres ${SITES.filter((s) => s.onboarded).length}` },
    { id: 'money', label: 'Money' },
    { id: 'children', label: `Children ${students.length}` },
    { id: 'verify', label: `To verify ${toVerify.length}` },
    { id: 'consent', label: `Consent ${noConsent.length}` },
    { id: 'load', label: 'Clinical load' },
    { id: 'access', label: `Who read what ${reads.length}` },
  ];

  return (
    <>
      <SectionHead
        title="Head office"
        count={`${SITES.filter((s) => s.onboarded).length} of ${SITES.length} centres live · ${toVerify.length} records to verify · ${slow.length} waiting over ${SLOW_DAYS} days`}
      />

      <Lede>
        The senior team&rsquo;s view, not a centre&rsquo;s. Head office owns
        what the clinical record says — the centre reads it and records what it
        gave — so verifying, querying and chasing consent happen here. Nothing
        operational is duplicated: open a student for the rest of their record.
      </Lede>

      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}

      <div className="tabs" role="tablist" aria-label="Head office view">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            className={`tab${view === t.id ? ' tab--on' : ''}`}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {slow.length > 0 && view !== 'access' && (
        <div className="alert alert--critical">
          <p className="label">
            {slow.length} declarations have waited more than {SLOW_DAYS} days
          </p>
          <p className="meta">
            A record nobody has verified is a record the centre is told not to
            act on. Until it is signed off, a child with a declared allergy is
            being supervised on information rather than instruction.
          </p>
        </div>
      )}

      {view === 'centres' && (
        <>
          {SITES.map((site) => {
            const live = site.onboarded;
            const mine = live ? students : [];
            const here = mine.filter((s) => isOnSite(s));
            const unverified = live
              ? health.filter((h) => h.state !== 'verified').length
              : 0;
            const overdue = live
              ? open.filter((r) => r.severity === 'safeguarding').length
              : 0;
            return (
              <section key={site.id} className="slab mb-4">
                <div className="slab__head">
                  <h2 className="slab__title">
                    {site.name}
                    <span className="meta" style={{ marginLeft: 8, color: 'var(--ink-3)' }}>
                      {site.town} · {site.director}
                    </span>
                  </h2>
                  {live ? (
                    <span className="mark mark--clear">Live</span>
                  ) : (
                    <span className="mark mark--idle">Not onboarded</span>
                  )}
                </div>

                {live ? (
                  <div className="figs">
                    <span className="fig">
                      <span className="fig__n num">{here.length}</span>
                      <span className="fig__label">on site</span>
                      <span className="fig__note meta">
                        {mine.length} booked this season
                      </span>
                    </span>
                    <span className={`fig${unverified ? ' fig--alarm' : ''}`}>
                      <span className="fig__n num">{unverified}</span>
                      <span className="fig__label">records to verify</span>
                      <span className="fig__note meta">
                        {slow.length} over {SLOW_DAYS} days
                      </span>
                    </span>
                    <span className={`fig${overdue ? ' fig--alarm' : ''}`}>
                      <span className="fig__n num">{overdue}</span>
                      <span className="fig__label">safeguarding open</span>
                      <span className="fig__note meta">
                        of {open.length} outstanding
                      </span>
                    </span>
                    <span className="fig">
                      <span className="fig__n num">
                        {incidents.filter((i) => i.status === 'open').length}
                      </span>
                      <span className="fig__label">incidents open</span>
                      <span className="fig__note meta">
                        {incidents.filter((i) => i.level === 'notifiable').length} notifiable this season
                      </span>
                    </span>
                    <span className="fig">
                      <span className="fig__n num">{waitingOnThem(requests).length}</span>
                      <span className="fig__label">documents chased</span>
                      <span className="fig__note meta">
                        {waitingOnUs(requests).length} to verify
                      </span>
                    </span>
                    <span className="fig">
                      <span className="fig__n num">
                        {fmtMoney(
                          payments
                            .filter((p) => !p.studentId)
                            .reduce((n, p) => n + p.amountPence, 0),
                        )}
                      </span>
                      <span className="fig__label">unmatched</span>
                      <span className="fig__note meta">
                        {payments.filter((p) => !p.studentId).length} payments
                      </span>
                    </span>
                  </div>
                ) : (
                  <p className="meta">
                    Capacity {site.capacity}. Contracted and configured, with no
                    records imported yet — so there is nothing to report rather
                    than a page of zeros dressed as a season. It appears here in
                    full the day its spreadsheets are imported.
                  </p>
                )}

                {live && (
                  <p className="meta slab__more">
                    {staff.length} staff ·{' '}
                    {staff.filter((x) => x.dbs.state !== 'cleared').length} without a
                    cleared DBS ·{' '}
                    {registers.filter((r) => !r.takenBy).length} register
                    {registers.filter((r) => !r.takenBy).length === 1 ? '' : 's'} not
                    taken today · {bookings.filter((b) => !b.receipt).length} bookings
                    without a receipt
                  </p>
                )}
              </section>
            );
          })}
        </>
      )}

      {view === 'money' && (
        <>
          <div className="figs">
            <span className="fig">
              <span className="fig__n num">{fmtMoney(purse.invoicedPence)}</span>
              <span className="fig__label">invoiced this season</span>
              <span className="fig__note meta">{students.length} students on the books</span>
            </span>
            <span className="fig">
              <span className="fig__n num">{fmtMoney(purse.bankedPence)}</span>
              <span className="fig__label">banked against a student</span>
              <span className="fig__note meta">
                {Math.round((purse.bankedPence / purse.invoicedPence) * 100)}% of the season
              </span>
            </span>
            <span className={`fig${purse.outstandingPence > 0 ? ' fig--alarm' : ''}`}>
              <span className="fig__n num">{fmtMoney(purse.outstandingPence)}</span>
              <span className="fig__label">still owed</span>
              <span className="fig__note meta">invoiced less banked</span>
            </span>
            <span className={`fig${purse.unmatchedCount ? ' fig--alarm' : ''}`}>
              <span className="fig__n num">{fmtMoney(purse.unmatchedPence)}</span>
              <span className="fig__label">in the bank, unallocated</span>
              <span className="fig__note meta">
                {purse.unmatchedCount} payments with no student
              </span>
            </span>
            <span className="fig">
              <span className="fig__n num">{fmtMoney(purse.bookedPence)}</span>
              <span className="fig__label">committed to suppliers</span>
              <span className="fig__note meta">{bookings.length} activity bookings</span>
            </span>
            <span className={`fig${purse.unreceiptedCount ? ' fig--alarm' : ''}`}>
              <span className="fig__n num">{fmtMoney(purse.unreceiptedPence)}</span>
              <span className="fig__label">booked with no receipt</span>
              <span className="fig__note meta">
                {purse.unreceiptedCount} bookings finance cannot pay
              </span>
            </span>
          </div>

          <Lede>
            Money in the bank that belongs to nobody yet is counted separately
            from money owed — adding the two would flatter the season by
            whatever the centre has failed to allocate.
          </Lede>

          <p className="label">
            Arriving within a week and still owing — {purse.arrivingOwing.length}
          </p>
          {purse.arrivingOwing.length === 0 ? (
            <p className="meta">
              Nobody arriving this week owes anything. Nothing to decide.
            </p>
          ) : (
            <>
              <Lede>
                A centre cannot hold a child at the door over a balance, so the
                decision is made here and now: chase it, let it ride, or take
                it up with the agent. Left to the day itself it is not a
                decision, it is an argument in a car park.
              </Lede>
              <div className="tablewrap">
                <table className="reg" aria-label="Students with money outstanding">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Arrives</th>
                      <th scope="col">Owed</th>
                      <th scope="col">Invoice</th>
                      <th scope="col">Guardian</th>
                      <th scope="col">Documents</th>
                    </tr>
                  </thead>
                  <tbody className="stagger">
                    {purse.arrivingOwing.map(({ student: s, owed: due, days }) => (
                      <tr key={s.id}>
                        <td>
                          <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                            {s.forename} {s.surname}
                          </button>
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {s.country} · {s.band}
                          </span>
                        </td>
                        <td className="num">
                          {fmtDate(s.arrival)}
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}
                          </span>
                        </td>
                        <td className="num">{fmtMoney(due)}</td>
                        <td className="num meta">{invoiceRef(s)}</td>
                        <td>
                          {s.guardian.name}
                          <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {s.guardian.phone}
                          </span>
                        </td>
                        <td className="meta">
                          {Object.values(s.docs).filter((d) => d === 'in').length} of 3 in
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {view === 'children' && (
        <>
          <Lede>
            Every child on the books, across every centre, with the six things
            head office is ever asked about: are they paid up, are their
            documents in, is their health record signed off, are they here,
            where do they sleep, and who is the contact.
          </Lede>

          <input
            className="field"
            style={{ maxWidth: 360, marginBottom: 18 }}
            value={q}
            placeholder="Search name, country, band or invoice"
            aria-label="Search children"
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="tablewrap">
            <table className="reg" aria-label="Every student on the books">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Stay</th>
                  <th scope="col">Documents</th>
                  <th scope="col">Health</th>
                  <th scope="col">Owed</th>
                  <th scope="col">Room</th>
                  <th scope="col">Guardian</th>
                </tr>
              </thead>
              <tbody className="stagger">
                {shown.slice(0, 80).map((r) => {
                  const s = r.student;
                  return (
                    <tr key={s.id}>
                      <td>
                        <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                          {s.forename} {s.surname}
                        </button>
                        <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                          {s.age} · {s.band} · {s.country}
                        </span>
                      </td>
                      <td className="num">
                        {fmtDate(s.arrival)} – {fmtDate(s.leaving)}
                        <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                          {r.onSite ? 'on site' : 'not here'}
                        </span>
                      </td>
                      <td>
                        {r.docsIn === r.docsTotal ? (
                          <span className="mark mark--clear">All in</span>
                        ) : (
                          <span className="mark mark--overdue">
                            {r.docsTotal - r.docsIn} outstanding
                          </span>
                        )}
                      </td>
                      <td>
                        {r.health ? (
                          <>
                            <span className={`mark ${HEALTH_COPY[r.health.state].mark}`}>
                              {HEALTH_COPY[r.health.state].label}
                            </span>
                            <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                              {r.health.allergies.some((a) => a.severity === 'anaphylaxis')
                                ? 'adrenaline plan'
                                : r.health.medications.length
                                  ? `${r.health.medications.length} medication${r.health.medications.length === 1 ? '' : 's'}`
                                  : 'allergies only'}
                            </span>
                          </>
                        ) : (
                          <span className="meta" style={{ color: 'var(--ink-3)' }}>
                            Nothing declared
                          </span>
                        )}
                      </td>
                      <td className="num">
                        {r.owed > 0 ? fmtMoney(r.owed) : <span className="meta">Paid</span>}
                      </td>
                      <td className="meta">{roomLabel(s.roomId)}</td>
                      <td>
                        {s.guardian.name}
                        <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                          {s.guardian.phone}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shown.length > 80 && (
            <p className="meta slab__more">
              Showing the first 80 of {shown.length}. Narrow with the search.
            </p>
          )}
        </>
      )}

      {view === 'verify' && (
        toVerify.length === 0 ? (
          <p className="meta reminders__empty">
            Every declared record has been verified. Nothing is waiting on head
            office.
          </p>
        ) : (
          <ul className="reqs stagger">
            {toVerify.map((h) => {
              const s = named(h.studentId);
              if (!s) return null;
              const days = waited(h);
              const worst = h.allergies.find((a) => a.severity === 'anaphylaxis');
              return (
                <li key={h.studentId} className="req">
                  <div className="req__head">
                    <span className={`mark ${HEALTH_COPY[h.state].mark}`}>
                      {HEALTH_COPY[h.state].label}
                    </span>
                    <button
                      className="namebtn req__who"
                      onClick={() => setOpenStudent(s.id)}
                    >
                      {s.forename} {s.surname}
                    </button>
                    <span className="req__what">
                      {s.age} · {s.country} ·{' '}
                      {isOnSite(s) ? 'on site now' : `arrives ${fmtDate(s.arrival)}`}
                    </span>
                    <span className="meta req__when">
                      {h.source === 'booking'
                        ? 'declared with the booking'
                        : 'entered by head office'}{' '}
                      · waiting {days} day{days === 1 ? '' : 's'}
                    </span>
                  </div>

                  <p className="meta req__next">
                    {[
                      ...h.allergies.map(
                        (a) => `${a.what} (${SEVERITY_COPY[a.severity].label.toLowerCase()})`,
                      ),
                      ...h.medications.map((m) => `${m.name} ${m.dose}`),
                    ].join(' · ')}
                  </p>
                  {worst && (
                    <p className="meta req__next">
                      {worst.treatment} Auto-injector: {worst.keptWhere ?? 'not recorded'}.
                    </p>
                  )}
                  {h.query && <p className="meta req__reason">Queried: {h.query}</p>}

                  {role.welfareEdit ? (
                    asking === h.studentId ? (
                      <div className="req__actions">
                        <input
                          className="field"
                          value={reason}
                          placeholder="What does not add up?"
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <button
                          className="btn btn--primary"
                          disabled={reason.trim().length < 4}
                          onClick={() => {
                            queryHealth(h.studentId, reason.trim());
                            setReason('');
                            setAsking(null);
                          }}
                        >
                          Send the query
                        </button>
                        <button className="btn" onClick={() => setAsking(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="req__actions">
                        <button
                          className="btn btn--primary"
                          onClick={() => verifyHealth(h.studentId)}
                        >
                          <IconCheck />
                          Verify
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            setAsking(h.studentId);
                            setReason('');
                          }}
                        >
                          Query with the family
                        </button>
                        <button className="btn" onClick={() => setOpenStudent(s.id)}>
                          Open the record
                          <IconArrow />
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="meta">
                      {role.name} can see this queue but not clear it. Verifying
                      belongs to head office welfare.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}

      {view === 'consent' && (
        noConsent.length === 0 ? (
          <p className="meta reminders__empty">
            Everything the centres hold has written consent behind it.
          </p>
        ) : (
          <>
            <Lede>
              Medication a centre is holding with no signed consent to give it.
              Nobody may administer any of it, however obvious the need, so
              these are chased before arrival rather than argued about at 22:00
              on a Saturday.
            </Lede>
            <div className="tablewrap">
              <table className="reg" aria-label="Students whose medication the centre holds">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Medication</th>
                    <th scope="col">Held by</th>
                    <th scope="col">Arrives</th>
                    <th scope="col">Guardian</th>
                    <th scope="col">Record</th>
                  </tr>
                </thead>
                <tbody className="stagger">
                  {noConsent.map(({ health: h, medication: m }) => {
                    const s = named(h.studentId);
                    if (!s) return null;
                    return (
                      <tr key={m.id}>
                        <td>
                          <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                            {s.forename} {s.surname}
                          </button>
                        </td>
                        <td>
                          {m.name}
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {m.dose} · {m.route}
                          </span>
                        </td>
                        <td className="meta">
                          {m.holder === 'staff-held' ? 'The centre' : 'The student'}
                        </td>
                        <td className="num">{fmtDate(s.arrival)}</td>
                        <td>
                          {s.guardian.name}
                          <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {s.guardian.phone}
                          </span>
                        </td>
                        <td>
                          <span className={`mark ${HEALTH_COPY[h.state].mark}`}>
                            {HEALTH_COPY[h.state].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {view === 'load' && (
        <>
          <div className="figs">
            <span className="fig">
              <span className="fig__n num">{load.onSite.length}</span>
              <span className="fig__label">children with a record on site</span>
              <span className="fig__note meta">of {health.length} this season</span>
            </span>
            <span className={`fig${load.severe.length ? ' fig--alarm' : ''}`}>
              <span className="fig__n num">{load.severe.length}</span>
              <span className="fig__label">adrenaline plans on site</span>
              <span className="fig__note meta">
                somebody trained has to be on every hour
              </span>
            </span>
            <span className="fig">
              <span className="fig__n num">{load.held.length}</span>
              <span className="fig__label">holding medication for the centre</span>
              <span className="fig__note meta">locked storage and a named holder</span>
            </span>
            <span className="fig">
              <span className="fig__n num">{load.rounds}</span>
              <span className="fig__label">doses due today</span>
              <span className="fig__note meta">across every centre</span>
            </span>
            <span className={`fig${missed.length ? ' fig--alarm' : ''}`}>
              <span className="fig__n num">{missed.length}</span>
              <span className="fig__label">doses unrecorded</span>
              <span className="fig__note meta">due and never signed either way</span>
            </span>
            <span className="fig">
              <span className="fig__n num">
                {health.filter((h) => h.source === 'booking').length}
              </span>
              <span className="fig__label">declared at booking</span>
              <span className="fig__note meta">
                {health.filter((h) => h.source === 'senior').length} typed up here
              </span>
            </span>
          </div>

          <p className="label">Adrenaline plans, and when they are here</p>
          {load.severe.length === 0 ? (
            <p className="meta">Nobody on site has an adrenaline plan today.</p>
          ) : (
            <div className="tablewrap">
              <table className="reg" aria-label="Students with a declared allergy">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Allergy</th>
                    <th scope="col">Pen kept</th>
                    <th scope="col">On site until</th>
                    <th scope="col">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {load.severe.map((h) => {
                    const s = named(h.studentId)!;
                    const a = h.allergies.find((x) => x.severity === 'anaphylaxis')!;
                    return (
                      <tr key={h.studentId}>
                        <td>
                          <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                            {s.forename} {s.surname}
                          </button>
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {s.age} · {s.band}
                          </span>
                        </td>
                        <td>
                          {a.what}
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {a.reaction}
                          </span>
                        </td>
                        <td className="meta">{a.keptWhere ?? 'Not recorded'}</td>
                        <td className="num">{fmtDate(s.leaving)}</td>
                        <td>
                          <span className={`mark ${HEALTH_COPY[h.state].mark}`}>
                            {HEALTH_COPY[h.state].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'access' && (
        <>
          <Lede>
            Every opening of a child&rsquo;s medication and allergy record, with
            who opened it and under which role. This is the answer to the
            question that follows any complaint about special category data, and
            it is written by the platform rather than by the person reading.
          </Lede>
          {reads.length === 0 ? (
            <p className="meta reminders__empty">
              Nobody has opened a clinical record in this session.
            </p>
          ) : (
            <ul className="log">
              {reads.map((a) => (
                <li key={a.id}>
                  <strong>{a.subject}</strong>
                  <span className="meta" style={{ display: 'block' }}>
                    {a.at} · {a.actor} · {a.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="meta slab__more">
            The reminder queue, the audit trail and this log are the same
            records read three ways. Deleting an entry is not possible here or
            anywhere else — an audit trail that can be edited is not one.
          </p>
        </>
      )}
    </>
  );
}
