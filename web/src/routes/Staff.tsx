import { useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StaffProfile, DBS_COPY } from '../components/StaffProfile';
import { useStore } from '../lib/store';
import { dutyHours } from '../data/duty';
import {
  DEMO_TODAY, SEASON_END, SEASON_START, WEEKLY_LIMIT, contractWeeks, fmtDate,
  fmtHours, inContract, isAway, sessionsFor, weeklyHours,
} from '../data/seed';
import { Lede } from '../components/Lede';

const DUTY_ROLES = ['Safeguarding lead', 'Welfare officer'];

type View = 'all' | 'blocked' | 'clashes' | 'hours' | 'contract';

const SEASON_ISO = {
  from: `${SEASON_START.getFullYear()}-${String(SEASON_START.getMonth() + 1).padStart(2, '0')}-${String(SEASON_START.getDate()).padStart(2, '0')}`,
  to: `${SEASON_END.getFullYear()}-${String(SEASON_END.getMonth() + 1).padStart(2, '0')}-${String(SEASON_END.getDate()).padStart(2, '0')}`,
};

/* How long this person is actually engaged for, and whether that is the whole
   season. The last fortnight of a season is hard to staff precisely because
   this column is not the same for everybody. */
function ContractMark({
  from,
  to,
  weeks,
}: {
  from: string;
  to: string;
  weeks: number;
}) {
  const whole = from <= SEASON_ISO.from && to >= SEASON_ISO.to;
  const ended = to < `${DEMO_TODAY.getFullYear()}-${String(DEMO_TODAY.getMonth() + 1).padStart(2, '0')}-${String(DEMO_TODAY.getDate()).padStart(2, '0')}`;
  const started = from <= `${DEMO_TODAY.getFullYear()}-${String(DEMO_TODAY.getMonth() + 1).padStart(2, '0')}-${String(DEMO_TODAY.getDate()).padStart(2, '0')}`;
  return (
    <>
      <span
        className={`mark ${
          ended ? 'mark--critical' : !started ? 'mark--idle' : whole ? 'mark--clear' : 'mark--overdue'
        }`}
      >
        {weeks} weeks
      </span>
      <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
        {fmtDate(from)} – {fmtDate(to)}
      </span>
      {!whole && (
        <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
          {ended
            ? 'contract finished'
            : !started
              ? 'not started yet'
              : from > SEASON_ISO.from && to < SEASON_ISO.to
                ? 'joins late, leaves early'
                : from > SEASON_ISO.from
                  ? 'joins after the season opens'
                  : 'leaves before the season ends'}
        </span>
      )}
    </>
  );
}

/* Rota'd hours against the contract. Payroll is out of scope (DECISIONS 0001)
   — this is the rota's own number, not pay. */
function HoursMark({ hours, contracted }: { hours: number; contracted: number }) {
  if (hours > WEEKLY_LIMIT) {
    return (
      <span className="mark mark--critical">
        {fmtHours(hours)} · over {WEEKLY_LIMIT}h
      </span>
    );
  }
  if (hours > contracted) {
    return <span className="mark mark--overdue">{fmtHours(hours)} · over contract</span>;
  }
  if (hours === 0) return <span className="mark mark--idle">No sessions</span>;
  return <span className="mark mark--clear">{fmtHours(hours)}</span>;
}

function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - DEMO_TODAY.getTime()) / 86400000);
}

export function Staff() {
  const { staff, sessions, duties } = useStore();
  const total = (id: string) => weeklyHours(id, sessions) + dutyHours(id, duties);
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<View>('all');
  const [q, setQ] = useState('');

  const blocked = staff.filter(
    (s) => s.dbs.state === 'missing' || s.dbs.state === 'pending',
  );
  const totalHours = staff.reduce((n, s) => n + total(s.id), 0);
  const overLimit = staff.filter((s) => total(s.id) > WEEKLY_LIMIT);

  /* Somebody rota'd on a day they have told the centre they cannot work. */
  const clashing = staff.filter((s) =>
    sessionsFor(s.id, sessions).some((x) => isAway(s, x.day)),
  );

  /* Rota'd on a day outside their engagement — before they start or after
     they finish. Stronger than an availability clash: on those days they are
     not staff at all. */
  const outside = staff.filter((s) =>
    sessionsFor(s.id, sessions).some((x) => !inContract(s, x.day)),
  );

  const partSeason = staff.filter(
    (s) => s.contract.from > SEASON_ISO.from || s.contract.to < SEASON_ISO.to,
  );

  const rows = staff
    .filter((s) => {
      if (view === 'blocked') return blocked.includes(s);
      if (view === 'clashes') return clashing.includes(s);
      if (view === 'hours') return total(s.id) > s.contractedHours;
      if (view === 'contract') return partSeason.includes(s);
      return true;
    })
    .filter(
      (s) =>
        !q ||
        `${s.forename} ${s.surname} ${s.role} ${s.quals.join(' ')}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    );

  const tabs: { id: View; label: string }[] = [
    { id: 'all', label: `Whole roster ${staff.length}` },
    { id: 'blocked', label: `Cannot be rota’d ${blocked.length}` },
    { id: 'clashes', label: `Availability clashes ${clashing.length}` },
    { id: 'hours', label: `Over contract ${staff.filter((s) => total(s.id) > s.contractedHours).length}` },
    { id: 'contract', label: `Part season ${partSeason.length}` },
  ];

  return (
    <>
      <SectionHead
        title="Staff"
        count={`${staff.length} on the roster · ${fmtHours(totalHours)} rota'd this week · ${partSeason.length} on part-season contracts`}
      >
        <input
          className="field"
          style={{ width: 210 }}
          placeholder="Search name, role, qualification"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search staff"
        />
      </SectionHead>

      <Lede>
        Hours are what the rota schedules, not what anyone is paid — payroll
        stays with the centre. Open a name for the whole record: DBS, their
        week, what they have told us about availability, and every incident
        they attended.
      </Lede>

      {overLimit.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 14 }}>
          {overLimit.length} staff rota&rsquo;d past the {WEEKLY_LIMIT}h
          working-time limit
        </p>
      )}

      {blocked.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 14 }}>
          {blocked.length} staff without a cleared DBS. They cannot be rota&rsquo;d
          with students.
        </p>
      )}

      {outside.length > 0 && (
        <p className="mark mark--critical" style={{ marginBottom: 14 }}>
          {outside.length} staff are rota&rsquo;d on a day outside their
          contract — before they start or after they finish.
        </p>
      )}

      {clashing.length > 0 && (
        <p className="mark mark--overdue" style={{ marginBottom: 22 }}>
          {clashing.length} staff are rota&rsquo;d on a day they have told us they
          are away. The draft was built before they said so — re-slot them on
          the timetable.
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Staff view">
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

      {open && <StaffProfile id={open} onClose={() => setOpen(null)} />}

      {rows.length === 0 ? (
        <p className="meta reminders__empty">Nobody in this view.</p>
      ) : (
        <div className="tablewrap">
          <table className="reg">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Name</th>
                <th>Age</th>
                <th style={{ width: '15%' }}>Role</th>
                <th style={{ width: '12%' }}>Hours / week</th>
                <th style={{ width: '14%' }}>Contract</th>
                <th>Bands</th>
                <th style={{ width: '20%' }}>DBS</th>
                <th style={{ width: '14%' }}>Availability</th>
                <th />
              </tr>
            </thead>
            <tbody className="stagger">
              {rows.map((s, i) => {
                const dbs = DBS_COPY[s.dbs.state];
                const until = s.dbs.expires ? daysUntil(s.dbs.expires) : null;
                const clashes = sessionsFor(s.id, sessions).filter((x) =>
                  isAway(s, x.day),
                );
                return (
                  <tr key={s.id} style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}>
                    <td>
                      <button className="namebtn" onClick={() => setOpen(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      {s.safeguardingLead && (
                        <span className="meta" style={{ display: 'block', color: 'var(--info)' }}>
                          Safeguarding lead
                        </span>
                      )}
                      <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {s.email}
                      </span>
                    </td>
                    <td className="num">{s.age}</td>
                    <td>{s.role}</td>
                    <td>
                      <HoursMark
                        hours={total(s.id)}
                        contracted={s.contractedHours}
                      />
                      <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {fmtHours(weeklyHours(s.id, sessions))} activity ·{' '}
                        {fmtHours(dutyHours(s.id, duties))} duty · of{' '}
                        {fmtHours(s.contractedHours)}
                      </span>
                    </td>
                    <td>
                      <ContractMark
                        from={s.contract.from}
                        to={s.contract.to}
                        weeks={contractWeeks(s)}
                      />
                    </td>
                    <td className="num meta">{s.bands.join(', ')}</td>
                    <td>
                      <span className={`mark ${dbs.mark}`}>{dbs.label}</span>
                      <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                        {s.dbs.certificate ?? dbs.note}
                      </span>
                      {s.dbs.expires && (
                        <span
                          className="meta num"
                          style={{
                            display: 'block',
                            color:
                              until !== null && until < 0
                                ? 'var(--oxide)'
                                : until !== null && until < 30
                                ? 'var(--ochre)'
                                : 'var(--ink-3)',
                          }}
                        >
                          {until !== null && until < 0
                            ? `Expired ${fmtDate(s.dbs.expires)} · ${Math.abs(until)} days ago`
                            : `Expires ${fmtDate(s.dbs.expires)}${
                                until !== null && until < 60 ? ` · ${until} days` : ''
                              }`}
                        </span>
                      )}
                    </td>
                    <td>
                      {s.away.length === 0 ? (
                        <span className="meta" style={{ color: 'var(--ink-3)' }}>
                          All season
                        </span>
                      ) : (
                        <>
                          <span className={`mark ${clashes.length ? 'mark--critical' : 'mark--idle'}`}>
                            {clashes.length
                              ? `${clashes.length} clash${clashes.length === 1 ? '' : 'es'}`
                              : 'Away booked'}
                          </span>
                          <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {s.away
                              .map((a) =>
                                a.from === a.to
                                  ? fmtDate(a.from)
                                  : `${fmtDate(a.from)}–${fmtDate(a.to)}`,
                              )
                              .join(', ')}
                          </span>
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn" onClick={() => setOpen(s.id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
