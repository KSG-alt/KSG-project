import {
  KIND_LABEL,
  URGENCY_LABEL,
  URGENCY_ORDER,
  type ChaseItem,
  type ItemKind,
  type Urgency,
} from '../data/seed'

const KIND_SWATCH: Record<ItemKind, string> = {
  medical: 'var(--danger)',
  consent: 'var(--danger)',
  passport: 'var(--contour)',
  payment: 'var(--water)',
  dbs: 'var(--boundary)',
}

const URGENCY_SWATCH: Record<Urgency, string> = {
  critical: 'var(--danger)',
  overdue: 'var(--contour)',
  due: 'var(--water)',
  ahead: 'var(--woodland)',
  settled: 'var(--woodland)',
}

export interface Filters {
  urgency: Set<Urgency>
  kind: Set<ItemKind>
}

/**
 * The key. On a sheet the legend explains every mark — here it also does the
 * work: pressing a key filters the face to that class. It is the primary
 * filter control, not a colour chart bolted beside one.
 */
export function Legend({
  items,
  filters,
  onToggle,
  onClear,
}: {
  items: ChaseItem[]
  filters: Filters
  onToggle: (axis: 'urgency' | 'kind', value: string) => void
  onClear: () => void
}) {
  const countU = (u: Urgency) => items.filter((i) => i.urgency === u).length
  const countK = (k: ItemKind) => items.filter((i) => i.kind === k).length
  const any = filters.urgency.size > 0 || filters.kind.size > 0

  return (
    <aside className="key" aria-label="Key">
      <div className="section">
        <h3>Key — pressure</h3>
        <ul>
          {URGENCY_ORDER.map((u) => {
            const pressed = filters.urgency.has(u)
            return (
              <li key={u}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  data-dimmed={filters.urgency.size > 0 && !pressed}
                  onClick={() => onToggle('urgency', u)}
                >
                  <span className="swatch" style={{ background: URGENCY_SWATCH[u] }} />
                  <span>{URGENCY_LABEL[u]}</span>
                  <span className="n">{countU(u)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="hint">
          Safeguarding items escalate to the safeguarding lead after 4 days
          and reach <b>Critical</b> after 8. Everything else takes 13.
        </p>
      </div>

      <div className="section">
        <h3>Key — item</h3>
        <ul>
          {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => {
            const pressed = filters.kind.has(k)
            return (
              <li key={k}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  data-dimmed={filters.kind.size > 0 && !pressed}
                  onClick={() => onToggle('kind', k)}
                >
                  <span className="swatch" style={{ background: KIND_SWATCH[k] }} />
                  <span>{KIND_LABEL[k]}</span>
                  <span className="n">{countK(k)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="hint">
          Medical and consent forms carry safeguarding weight and are marked
          <span className="sg"> SG</span> on the sheet.
        </p>
        {any && (
          <div className="clear">
            <button type="button" className="btn ghost" onClick={onClear}>
              Clear key filters
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
