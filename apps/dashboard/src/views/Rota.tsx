import { AGE_BANDS, STAFF, fmtLong, type Session } from '../data/seed'
import { Ramp } from '../components/Ramp'

/**
 * Rota and ratio compliance. Seat 1 owns the real engine; this view shows
 * what the admin needs to read off it — which sessions start today below
 * ratio, and who is not eligible to cover them.
 */
export function Rota({ sessions }: { sessions: Session[] }) {
  const today = sessions.filter((s) => s.day === 'Tue 13')

  const rows = today
    .map((s) => {
      const needed = Math.ceil(s.students / s.requiredRatio)
      return { s, needed, have: s.staffIds.length, short: needed - s.staffIds.length }
    })
    .filter((r) => r.s.status !== 'cancelled')
    .sort((a, b) => b.short - a.short)

  const breaches = rows.filter((r) => r.short > 0)
  const ineligible = STAFF.filter((s) => s.dbsStatus === 'expired' || s.dbsStatus === 'pending')

  return (
    <div className="face-body">
      <section style={{ marginBottom: 'var(--s7)' }}>
        <h3
          style={{
            fontSize: 'var(--t-key)',
            letterSpacing: 'var(--track-key)',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            margin: '0 0 var(--s2)',
          }}
        >
          Today · sessions below required ratio
        </h3>

        {breaches.length === 0 ? (
          <div className="empty">
            <h4>Every session today meets its ratio.</h4>
            <p>
              Sessions appear here the moment staffing drops below the age
              band's required ratio, so a shortfall is caught before the
              session starts rather than after it.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="ruled">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '3rem' }} />
                  <th scope="col">Session</th>
                  <th scope="col">Group · band</th>
                  <th scope="col" className="num">Students</th>
                  <th scope="col" className="num">Staff</th>
                  <th scope="col" className="num">Required</th>
                  <th scope="col">Shortfall</th>
                </tr>
              </thead>
              <tbody>
                {breaches.map(({ s, needed, have, short }) => (
                  <tr key={s.id} data-urgency="critical">
                    <td>
                      <Ramp urgency="critical" label={`Short ${short} staff`} />
                    </td>
                    <td>
                      <span className="subject">{s.activity}</span>
                      <div className="sub">{s.slot} · {s.location}</div>
                    </td>
                    <td>
                      {s.group}
                      <div className="sub">{s.ageBand}</div>
                    </td>
                    <td className="num">{s.students}</td>
                    <td className="num">{have}</td>
                    <td className="num">{needed}</td>
                    <td style={{ color: 'var(--danger-ink)', fontWeight: 600 }}>
                      {short} short
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 'var(--s7)' }}>
        <h3
          style={{
            fontSize: 'var(--t-key)',
            letterSpacing: 'var(--track-key)',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            margin: '0 0 var(--s2)',
          }}
        >
          Not eligible to cover
        </h3>
        <div className="table-scroll">
          <table className="ruled">
            <thead>
              <tr>
                <th scope="col">Staff</th>
                <th scope="col">Role · site</th>
                <th scope="col">Reason</th>
                <th scope="col">DBS expires</th>
              </tr>
            </thead>
            <tbody>
              {ineligible.map((s) => (
                <tr key={s.id} data-urgency="critical">
                  <td>
                    <span className="subject">{s.name}</span>
                    <span className="sg"> SG</span>
                  </td>
                  <td>
                    {s.role}
                    <div className="sub">{s.site}</div>
                  </td>
                  <td style={{ color: 'var(--danger-ink)' }}>
                    {s.dbsStatus === 'expired'
                      ? 'DBS expired — removed from rota automatically'
                      : 'DBS pending — cannot be rota’d until certificate received'}
                  </td>
                  <td>{fmtLong(s.dbsExpires)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3
          style={{
            fontSize: 'var(--t-key)',
            letterSpacing: 'var(--track-key)',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            margin: '0 0 var(--s2)',
          }}
        >
          Ratios in force
        </h3>
        <div className="table-scroll">
          <table className="ruled">
            <thead>
              <tr>
                <th scope="col">Age band</th>
                <th scope="col" className="num">Ratio</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {AGE_BANDS.map((b) => (
                <tr key={b.id}>
                  <td className="subject">{b.label}</td>
                  <td className="num">1 : {b.ratio}</td>
                  <td className="sub">{b.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="synthetic">
          <b>Demonstration data.</b> These ratios are placeholders. The real
          rules by age band, the DBS and qualification checks, and the
          escalation thresholds are Kebba's functional spec, due week one of
          October — nothing here should be read as a compliance position.
        </p>
      </section>
    </div>
  )
}
