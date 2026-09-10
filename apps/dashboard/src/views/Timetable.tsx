import { useState } from 'react'
import { DAYS, GROUPS, SLOTS, STAFF, type Session } from '../data/seed'

/**
 * Group and activity timetabling. Each age-banded group has its own live
 * schedule; cancelling a session re-slots only that group, which is the
 * behaviour the business overview is explicit about.
 */
export function Timetable({
  sessions,
  onCancel,
  onRestore,
}: {
  sessions: Session[]
  onCancel: (id: string) => void
  onRestore: (id: string) => void
}) {
  const [group, setGroup] = useState(GROUPS[0].name)
  const [selected, setSelected] = useState<string | null>(null)

  const forGroup = sessions.filter((s) => s.group === group)
  const sel = forGroup.find((s) => s.id === selected) ?? null

  function staffed(s: Session) {
    const needed = Math.ceil(s.students / s.requiredRatio)
    return { needed, have: s.staffIds.length, short: s.staffIds.length < needed }
  }

  return (
    <>
      <div className="gather">
        <span className="lede">Group</span>
        <div className="seg" role="group" aria-label="Choose a group">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={group === g.name}
              onClick={() => {
                setGroup(g.name)
                setSelected(null)
              }}
            >
              {g.name}
            </button>
          ))}
        </div>
        <span className="tally">
          {GROUPS.find((g) => g.name === group)?.band} ·{' '}
          {GROUPS.find((g) => g.name === group)?.site}
        </span>
      </div>

      <div className="face-body">
        <div className="table-scroll">
          <div className="grid-days">
            <div className="col-head" />
            {DAYS.map((d) => (
              <div className="col-head" key={d}>
                {d}
              </div>
            ))}

            {SLOTS.map((slot) => (
              <Row
                key={slot}
                slot={slot}
                sessions={forGroup}
                selected={selected}
                onSelect={setSelected}
                staffed={staffed}
              />
            ))}
          </div>
        </div>

        {sel ? (
          <SessionDetail
            session={sel}
            staffed={staffed(sel)}
            onCancel={() => onCancel(sel.id)}
            onRestore={() => onRestore(sel.id)}
          />
        ) : (
          <div className="empty">
            <h4>Select a session.</h4>
            <p>
              Choose any session above to see its staffing against the required
              ratio, and to cancel it. Cancelling re-slots{' '}
              <strong>{group}</strong> only — no other group's timetable is
              touched.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function Row({
  slot,
  sessions,
  selected,
  onSelect,
  staffed,
}: {
  slot: string
  sessions: Session[]
  selected: string | null
  onSelect: (id: string) => void
  staffed: (s: Session) => { needed: number; have: number; short: boolean }
}) {
  return (
    <>
      <div className="row-head">{slot}</div>
      {DAYS.map((day) => {
        const s = sessions.find((x) => x.day === day && x.slot === slot)
        if (!s) {
          return <div className="cell" key={day} aria-hidden="true" />
        }
        const st = staffed(s)
        const urgency = s.status === 'cancelled' ? 'due' : st.short ? 'critical' : 'settled'
        return (
          <button
            type="button"
            className={`cell${s.status === 'cancelled' ? ' cancelled' : ''}`}
            key={day}
            data-urgency={urgency}
            aria-selected={s.id === selected}
            onClick={() => onSelect(s.id)}
          >
            <span className="act">{s.activity}</span>
            <span className="meta">{s.location}</span>
            <span className={st.short ? 'short' : 'ok'}>
              {s.status === 'cancelled'
                ? 'Cancelled — needs re-slot'
                : `${st.have}/${st.needed} staff · ${s.students} students`}
            </span>
            {s.status === 'reslotted' && <span className="meta">Re-slotted</span>}
          </button>
        )
      })}
    </>
  )
}

function SessionDetail({
  session,
  staffed,
  onCancel,
  onRestore,
}: {
  session: Session
  staffed: { needed: number; have: number; short: boolean }
  onCancel: () => void
  onRestore: () => void
}) {
  const names = session.staffIds
    .map((id) => STAFF.find((s) => s.id === id)?.name)
    .filter(Boolean)

  return (
    <section
      data-urgency={staffed.short ? 'critical' : 'settled'}
      style={{
        borderTop: '1px solid var(--rule-strong)',
        marginTop: 'var(--s6)',
        paddingTop: 'var(--s4)',
        maxWidth: '74ch',
      }}
    >
      <h3 style={{ margin: '0 0 var(--s1)', fontSize: 'var(--t-title)', fontWeight: 600 }}>
        {session.activity}
      </h3>
      <p style={{ margin: '0 0 var(--s4)', color: 'var(--ink-3)', fontSize: 'var(--t-small)' }}>
        {session.day} · {session.slot} · {session.location} · {session.site}
      </p>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 'var(--s1) var(--s4)',
          fontSize: 'var(--t-small)',
          margin: '0 0 var(--s4)',
          borderTop: '1px solid var(--rule)',
          paddingTop: 'var(--s3)',
        }}
      >
        <dt style={{ color: 'var(--ink-3)' }}>Age band</dt>
        <dd style={{ margin: 0 }}>{session.ageBand}</dd>
        <dt style={{ color: 'var(--ink-3)' }}>Students</dt>
        <dd style={{ margin: 0 }}>{session.students}</dd>
        <dt style={{ color: 'var(--ink-3)' }}>Required ratio</dt>
        <dd style={{ margin: 0 }}>1 staff per {session.requiredRatio}</dd>
        <dt style={{ color: 'var(--ink-3)' }}>Staffing</dt>
        <dd style={{ margin: 0, color: staffed.short ? 'var(--danger-ink)' : 'var(--woodland-ink)', fontWeight: 500 }}>
          {staffed.have} of {staffed.needed} required
          {staffed.short ? ' — below ratio' : ' — compliant'}
        </dd>
        <dt style={{ color: 'var(--ink-3)' }}>Rota'd</dt>
        <dd style={{ margin: 0 }}>{names.length ? names.join(', ') : 'Nobody assigned'}</dd>
      </dl>

      {session.note && (
        <p style={{ fontSize: 'var(--t-small)', color: 'var(--ink-2)', margin: '0 0 var(--s4)' }}>
          {session.note}
        </p>
      )}

      <div className="btn-row">
        {session.status === 'cancelled' ? (
          <button type="button" className="btn" onClick={onRestore}>
            Restore session
          </button>
        ) : (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel & re-slot this group
          </button>
        )}
      </div>

      <p className="synthetic">
        <b>Demonstration data.</b> Ratio checking here is illustrative. The
        real compliance engine is Seat 1's build — see{' '}
        <code>docs/interface-contract.md</code>.
      </p>
    </section>
  )
}
