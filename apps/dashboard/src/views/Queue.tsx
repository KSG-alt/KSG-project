import { Fragment } from 'react'
import { Ramp } from '../components/Ramp'
import {
  KIND_LABEL,
  URGENCY_LABEL,
  fmtDate,
  money,
  type ChaseItem,
} from '../data/seed'

export type Gather = 'flat' | 'subject' | 'due' | 'kind'

const GATHER_LABEL: Record<Gather, string> = {
  flat: 'Nothing',
  subject: 'Student',
  due: 'Due date',
  kind: 'Item type',
}

function groupKey(item: ChaseItem, gather: Gather): string {
  switch (gather) {
    case 'subject':
      return item.subject
    case 'due':
      return fmtDate(item.dueOn)
    case 'kind':
      return KIND_LABEL[item.kind]
    default:
      return ''
  }
}

export function Queue({
  items,
  total,
  gather,
  onGather,
  query,
  onQuery,
  selectedId,
  onSelect,
  emptyHint,
}: {
  items: ChaseItem[]
  total: number
  gather: Gather
  onGather: (g: Gather) => void
  query: string
  onQuery: (q: string) => void
  selectedId: string | null
  onSelect: (item: ChaseItem) => void
  emptyHint: string
}) {
  const grouped: Array<[string, ChaseItem[]]> =
    gather === 'flat'
      ? [['', items]]
      : Object.entries(
          items.reduce<Record<string, ChaseItem[]>>((acc, item) => {
            const k = groupKey(item, gather)
            ;(acc[k] ||= []).push(item)
            return acc
          }, {}),
        )

  return (
    <>
      <div className="gather">
        <span className="lede">Gather by</span>
        <div className="seg" role="group" aria-label="Gather the queue by">
          {(Object.keys(GATHER_LABEL) as Gather[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gather === g}
              onClick={() => onGather(g)}
            >
              {GATHER_LABEL[g]}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Find a student or item"
          aria-label="Find a student or item"
        />
        <span className="tally">
          <b>{items.length}</b> of {total} outstanding
        </span>
      </div>

      <div className="face-body">
        {items.length === 0 ? (
          <div className="empty">
            <h4>Nothing outstanding here.</h4>
            <p>{emptyHint}</p>
            <p>
              The key on the right filters this sheet by pressure and by item
              type. Press a key entry to narrow the face; press it again to
              release it.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="ruled fixed">
              <colgroup>
                <col className="c-ramp" />
                <col className="c-who" />
                <col className="c-item" />
                <col className="c-facts" />
                <col className="c-money" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '3rem' }}>
                    <span className="visually-hidden">Pressure</span>
                  </th>
                  <th scope="col">Student or staff</th>
                  <th scope="col">Item</th>
                  <th scope="col">Group · due · overdue</th>
                  <th scope="col" className="num">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([label, rows]) => (
                  <Fragment key={label || 'all'}>
                    {label && (
                      <tr>
                        <th
                          colSpan={5}
                          scope="colgroup"
                          style={{
                            textAlign: 'left',
                            fontSize: 'var(--t-key)',
                            letterSpacing: 'var(--track-key)',
                            textTransform: 'uppercase',
                            color: 'var(--ink-3)',
                            padding: 'var(--s5) var(--s3) var(--s1)',
                            borderBottom: '1px solid var(--rule-strong)',
                          }}
                        >
                          {label} · {rows.length}
                        </th>
                      </tr>
                    )}
                    {rows.map((item) => (
                      <tr
                        key={item.id}
                        data-urgency={item.urgency}
                        aria-selected={item.id === selectedId}
                      >
                        <td>
                          <Ramp
                            urgency={item.urgency}
                            label={`${URGENCY_LABEL[item.urgency]}, ${
                              item.daysOverdue > 0
                                ? `${item.daysOverdue} days overdue`
                                : `${Math.abs(item.daysOverdue)} days remaining`
                            }`}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="rowbtn"
                            onClick={() => onSelect(item)}
                          >
                            <span className="subject">{item.subject}</span>
                            {item.safeguarding && <span className="sg"> SG</span>}
                          </button>
                        </td>
                        <td>
                          {item.label}
                          <div className="sub">{KIND_LABEL[item.kind]}</div>
                        </td>
                        <td>
                          {/* Identical fact block, identical position, every row. */}
                          <span className="facts">
                            <span>{item.group ?? 'Staff'}</span>
                            <span>
                              due <b>{fmtDate(item.dueOn)}</b>
                            </span>
                            <span>
                              {item.daysOverdue > 0 ? (
                                <b>+{item.daysOverdue}d</b>
                              ) : (
                                `${Math.abs(item.daysOverdue)}d left`
                              )}
                            </span>
                          </span>
                        </td>
                        <td className="num">
                          {item.amountPence !== undefined
                            ? money(item.amountPence)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
