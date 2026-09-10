import { useState } from 'react'
import { AUDIT, STAFF, fmtLong, type AuditEntry } from '../data/seed'

const KIND_LABEL: Record<AuditEntry['kind'], string> = {
  ratio: 'Ratio',
  dbs: 'DBS',
  incident: 'Incident',
  config: 'Configuration',
  document: 'Document',
}

const SEV_URGENCY: Record<AuditEntry['severity'], string> = {
  critical: 'critical',
  flag: 'overdue',
  info: 'settled',
}

/**
 * The safeguarding audit trail. Built to be read by an inspector, so it is
 * a chronological record with an actor against every line — not a filtered
 * dashboard view that has to be explained.
 */
export function Safeguarding() {
  const [kinds, setKinds] = useState<Set<AuditEntry['kind']>>(new Set())

  const shown = kinds.size === 0 ? AUDIT : AUDIT.filter((e) => kinds.has(e.kind))

  function toggle(k: AuditEntry['kind']) {
    setKinds((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const dbsWatch = STAFF.filter((s) => s.dbsStatus !== 'valid')

  return (
    <>
      <div className="gather">
        <span className="lede">Record type</span>
        <div className="seg" role="group" aria-label="Filter the audit trail">
          {(Object.keys(KIND_LABEL) as AuditEntry['kind'][]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kinds.has(k)}
              onClick={() => toggle(k)}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <span className="tally">
          <b>{shown.length}</b> of {AUDIT.length} entries
        </span>
      </div>

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
            Audit trail · {'Summer 2027'}
          </h3>

          {shown.length === 0 ? (
            <div className="empty">
              <h4>No entries of that type.</h4>
              <p>Release a record-type filter above to see the full trail.</p>
            </div>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--rule-strong)' }}>
              {shown.map((e) => (
                <li
                  key={e.id}
                  data-urgency={SEV_URGENCY[e.severity]}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '11rem 6rem 1fr',
                    gap: 'var(--s4)',
                    padding: 'var(--s3) 0',
                    borderBottom: '1px solid var(--rule)',
                    alignItems: 'baseline',
                    fontSize: 'var(--t-small)',
                  }}
                >
                  <time style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                    {e.at}
                  </time>
                  <span
                    style={{
                      fontSize: 'var(--t-key)',
                      letterSpacing: 'var(--track-key)',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: 'var(--tone-ink)',
                    }}
                  >
                    {KIND_LABEL[e.kind]}
                  </span>
                  <span>
                    {e.text}
                    <div className="sub">{e.actor}</div>
                  </span>
                </li>
              ))}
            </ol>
          )}
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
            DBS watch
          </h3>
          <div className="table-scroll">
            <table className="ruled">
              <thead>
                <tr>
                  <th scope="col">Staff</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Qualifications</th>
                </tr>
              </thead>
              <tbody>
                {dbsWatch.map((s) => (
                  <tr
                    key={s.id}
                    data-urgency={s.dbsStatus === 'expiring' ? 'overdue' : 'critical'}
                  >
                    <td className="subject">{s.name}</td>
                    <td>{s.role}</td>
                    <td style={{ color: 'var(--tone-ink)', fontWeight: 500, textTransform: 'capitalize' }}>
                      {s.dbsStatus}
                    </td>
                    <td>{fmtLong(s.dbsExpires)}</td>
                    <td className="sub">{s.quals.length ? s.quals.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="synthetic">
            <b>Demonstration data.</b> What an audit trail must contain to
            stand up to an Ofsted or British Council inspection is Kebba's
            spec, not settled here.
          </p>
        </section>
      </div>
    </>
  )
}
