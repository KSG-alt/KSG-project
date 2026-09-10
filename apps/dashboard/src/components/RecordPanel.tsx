import { useState } from 'react'
import {
  KIND_LABEL,
  URGENCY_LABEL,
  fmtDate,
  money,
  type ChaseItem,
} from '../data/seed'

/**
 * One item's record. Escalation is not a badge sitting beside the row — it
 * is an entry printed into the chase log in sequence, the way an incident
 * book records what happened and when.
 */
export function RecordPanel({
  item,
  onAction,
  onClose,
}: {
  item: ChaseItem
  onAction: (item: ChaseItem, what: string) => void
  onClose: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)

  function act(what: string) {
    setBusy(what)
    window.setTimeout(() => {
      setBusy(null)
      onAction(item, what)
    }, 550)
  }

  const overdue = item.daysOverdue > 0

  return (
    <aside className="record" data-urgency={item.urgency} aria-label="Item record">
      <p className="rec-kind">
        {KIND_LABEL[item.kind]} · {URGENCY_LABEL[item.urgency]}
      </p>
      <h3>{item.subject}</h3>

      <dl>
        <dt>Item</dt>
        <dd>{item.label}</dd>
        <dt>Group</dt>
        <dd>{item.group ?? '—'}</dd>
        <dt>Due</dt>
        <dd>{fmtDate(item.dueOn)}</dd>
        <dt>{overdue ? 'Overdue by' : 'Days remaining'}</dt>
        <dd>{Math.abs(item.daysOverdue)} days</dd>
        {item.amountPence !== undefined && (
          <>
            <dt>Balance</dt>
            <dd>{money(item.amountPence)}</dd>
          </>
        )}
        <dt>Safeguarding</dt>
        <dd>{item.safeguarding ? 'Yes — escalates faster' : 'No'}</dd>
      </dl>

      <div className="btn-row">
        <button
          type="button"
          className="btn"
          onClick={() => act('chase')}
          disabled={busy !== null}
        >
          {busy === 'chase' ? 'Sending…' : 'Send reminder now'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => act('receive')}
          disabled={busy !== null}
        >
          {busy === 'receive' ? 'Marking…' : 'Mark received'}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <h3 style={{ fontSize: 'var(--t-key)', letterSpacing: 'var(--track-key)', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        Chase record
      </h3>
      <ol className="log">
        {item.log.map((e, i) => (
          <li key={i} className={e.kind}>
            <time dateTime={e.at}>{fmtDate(e.at)}</time>
            <span>{e.text}</span>
          </li>
        ))}
      </ol>

      <p className="synthetic">
        <b>Demonstration data.</b> This record is invented. No real student,
        parent or staff member appears anywhere in this prototype.
      </p>
    </aside>
  )
}
