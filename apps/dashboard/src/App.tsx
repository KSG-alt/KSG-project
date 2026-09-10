import { useMemo, useState } from 'react'
import { Legend, type Filters } from './components/Legend'
import { RecordPanel } from './components/RecordPanel'
import { Queue, type Gather } from './views/Queue'
import { Timetable } from './views/Timetable'
import { Rota } from './views/Rota'
import { Safeguarding } from './views/Safeguarding'
import { Setup } from './views/Setup'
import {
  CENTRE,
  ITEMS,
  SESSIONS,
  fmtDate,
  type ChaseItem,
  type ItemKind,
  type Session,
  type Urgency,
} from './data/seed'

type Route = 'today' | 'documents' | 'payments' | 'timetable' | 'rota' | 'safeguarding' | 'setup'

const ROUTES: Array<{ id: Route; label: string; group: string }> = [
  { id: 'today', label: 'Today', group: 'Chase' },
  { id: 'documents', label: 'Documents', group: 'Chase' },
  { id: 'payments', label: 'Payments', group: 'Chase' },
  { id: 'timetable', label: 'Timetable', group: 'Season' },
  { id: 'rota', label: 'Rota & ratios', group: 'Season' },
  { id: 'safeguarding', label: 'Safeguarding', group: 'Season' },
  { id: 'setup', label: 'Setup', group: 'Centre' },
]

const HEADINGS: Record<Route, { title: string; blurb: string }> = {
  today: {
    title: 'Today',
    blurb:
      'Everything outstanding across the centre, heaviest pressure first. Safeguarding items escalate to the safeguarding lead after 4 days; everything else waits longer.',
  },
  documents: {
    title: 'Documents',
    blurb:
      'Medical forms, consent forms and passport copies still to collect before students arrive.',
  },
  payments: {
    title: 'Payments',
    blurb:
      'Balances outstanding against bookings, matched automatically as payments land.',
  },
  timetable: {
    title: 'Timetable',
    blurb:
      'Each age-banded group has its own live schedule. Cancelling a session re-slots that group only.',
  },
  rota: {
    title: 'Rota & ratios',
    blurb:
      'Sessions starting today measured against the required ratio for their age band, and who is not eligible to cover them.',
  },
  safeguarding: {
    title: 'Safeguarding',
    blurb:
      'A timestamped record of ratios, DBS status and incident handling, kept in the order it happened.',
  },
  setup: {
    title: 'Setup',
    blurb:
      "The centre's own configuration: sites, age bands, ratios, WhatsApp channels, and the import out of their spreadsheets.",
  },
}

export default function App() {
  const [route, setRoute] = useState<Route>('today')
  const [items, setItems] = useState<ChaseItem[]>(ITEMS)
  const [sessions, setSessions] = useState<Session[]>(SESSIONS)
  const [gather, setGather] = useState<Gather>('flat')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    urgency: new Set<Urgency>(),
    kind: new Set<ItemKind>(),
  })

  const isQueue = route === 'today' || route === 'documents' || route === 'payments'

  /** Route-level scope, before the key's filters. */
  const scoped = useMemo(() => {
    if (route === 'documents') {
      return items.filter((i) => i.kind === 'medical' || i.kind === 'consent' || i.kind === 'passport')
    }
    if (route === 'payments') return items.filter((i) => i.kind === 'payment')
    return items
  }, [items, route])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scoped.filter((i) => {
      if (filters.urgency.size && !filters.urgency.has(i.urgency)) return false
      if (filters.kind.size && !filters.kind.has(i.kind)) return false
      if (q && !(`${i.subject} ${i.label} ${i.group ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [scoped, filters, query])

  const selected = items.find((i) => i.id === selectedId) ?? null

  function toggleFilter(axis: 'urgency' | 'kind', value: string) {
    setFilters((prev) => {
      const next: Filters = { urgency: new Set(prev.urgency), kind: new Set(prev.kind) }
      const set = next[axis] as Set<string>
      if (set.has(value)) set.delete(value)
      else set.add(value)
      return next
    })
  }

  function clearFilters() {
    setFilters({ urgency: new Set(), kind: new Set() })
  }

  /** Chasing and receiving write into the item's own record, in sequence. */
  function handleAction(item: ChaseItem, what: string) {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.id !== item.id) return [i]
        if (what === 'receive') return []
        return [
          {
            ...i,
            log: [
              ...i.log,
              {
                at: '2027-07-13',
                kind: 'sent' as const,
                text: 'Reminder sent manually by centre admin',
              },
            ],
          },
        ]
      }),
    )
    if (what === 'receive') setSelectedId(null)
  }

  function cancelSession(id: string) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: 'cancelled' as const, note: 'Cancelled just now. Only this group needs re-slotting.' }
          : s,
      ),
    )
  }

  function restoreSession(id: string) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'reslotted' as const, note: 'Restored and re-slotted.' } : s)),
    )
  }

  const outstanding = items.length
  const critical = items.filter((i) => i.urgency === 'critical').length

  const counts: Record<Route, number | null> = {
    today: outstanding,
    documents: items.filter((i) => i.kind !== 'payment' && i.kind !== 'dbs').length,
    payments: items.filter((i) => i.kind === 'payment').length,
    timetable: sessions.filter((s) => s.status === 'cancelled').length || null,
    rota: null,
    safeguarding: items.filter((i) => i.kind === 'dbs').length || null,
    setup: null,
  }

  const groups = ['Chase', 'Season', 'Centre']

  return (
    <div className={`shell${isQueue && selected ? ' has-record' : ''}`}>
      <div className="margin">
        <div className="sheet-id">
          <p className="series">Season sheet · week {CENTRE.week} of {CENTRE.weeks}</p>
          <h1>{CENTRE.name}</h1>
          <p className="season">
            {CENTRE.season} · {CENTRE.enrolled} enrolled
          </p>
        </div>

        <nav className="routes" aria-label="Sections">
          {groups.map((g) => (
            <div key={g} style={{ display: 'contents' }}>
              <div className="group-label">{g}</div>
              {ROUTES.filter((r) => r.group === g).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-current={route === r.id ? 'page' : undefined}
                  onClick={() => {
                    setRoute(r.id)
                    setSelectedId(null)
                  }}
                >
                  <span>{r.label}</span>
                  {counts[r.id] !== null && <span className="count">{counts[r.id]}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="margin-foot">
          <strong>{CENTRE.today}</strong>
          {critical} critical · {outstanding} outstanding
        </div>
      </div>

      <main className="face">
        <div className="face-head">
          <div>
            <h2>{HEADINGS[route].title}</h2>
            <p>{HEADINGS[route].blurb}</p>
          </div>
        </div>

        {isQueue && (
          <Queue
            items={shown}
            total={scoped.length}
            gather={gather}
            onGather={setGather}
            query={query}
            onQuery={setQuery}
            selectedId={selectedId}
            onSelect={(i) => setSelectedId(i.id)}
            emptyHint={
              filters.urgency.size || filters.kind.size || query
                ? 'No item matches the current key filters and search. Release a filter to widen the sheet.'
                : 'Every item in this section has been received or matched. New items appear here as due dates approach.'
            }
          />
        )}

        {route === 'timetable' && (
          <Timetable sessions={sessions} onCancel={cancelSession} onRestore={restoreSession} />
        )}
        {route === 'rota' && <Rota sessions={sessions} />}
        {route === 'safeguarding' && <Safeguarding />}
        {route === 'setup' && <Setup />}
      </main>

      {isQueue && selected ? (
        <RecordPanel item={selected} onAction={handleAction} onClose={() => setSelectedId(null)} />
      ) : isQueue ? (
        <Legend items={scoped} filters={filters} onToggle={toggleFilter} onClear={clearFilters} />
      ) : (
        <aside className="key" aria-label="Sheet notes">
          <div className="section">
            <h3>Sheet</h3>
            <ul>
              <li>
                <button type="button" aria-pressed={false} style={{ cursor: 'default' }}>
                  <span className="swatch" style={{ background: 'var(--woodland)' }} />
                  <span>Compliant / settled</span>
                  <span className="n" />
                </button>
              </li>
              <li>
                <button type="button" aria-pressed={false} style={{ cursor: 'default' }}>
                  <span className="swatch" style={{ background: 'var(--contour)' }} />
                  <span>Needs attention</span>
                  <span className="n" />
                </button>
              </li>
              <li>
                <button type="button" aria-pressed={false} style={{ cursor: 'default' }}>
                  <span className="swatch" style={{ background: 'var(--danger)' }} />
                  <span>Safeguarding-critical</span>
                  <span className="n" />
                </button>
              </li>
            </ul>
            <p className="hint">
              Colour on this sheet is legend, never decoration. A mark is
              coloured only when the colour tells you what class of thing it
              is.
            </p>
          </div>
          <div className="section">
            <h3>Season</h3>
            <p className="hint">
              {CENTRE.seasonStart.split('-').reverse().join('/')} to{' '}
              {CENTRE.seasonEnd.split('-').reverse().join('/')} · week{' '}
              {CENTRE.week} of {CENTRE.weeks}
              <br />
              Director {CENTRE.director}
              <br />
              Safeguarding lead {CENTRE.safeguardingLead}
            </p>
            <p className="synthetic">
              <b>Demonstration data.</b> Prototype on seeded fake data. Due{' '}
              {fmtDate('2027-07-13')} is treated as today.
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
