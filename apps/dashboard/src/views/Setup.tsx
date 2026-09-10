import { useState } from 'react'
import { AGE_BANDS, CENTRE, GROUPS } from '../data/seed'

/**
 * Centre setup and configuration. The setup fee pays for this running
 * inside the short window before term, so the screen is built to be worked
 * through top to bottom by someone who has done it once.
 */
export function Setup() {
  const [name, setName] = useState(CENTRE.name)
  const [ratios, setRatios] = useState(
    Object.fromEntries(AGE_BANDS.map((b) => [b.id, String(b.ratio)])),
  )
  const [whatsapp, setWhatsapp] = useState(
    Object.fromEntries(GROUPS.map((g) => [g.id, `https://chat.whatsapp.com/${g.name.toLowerCase()}-2027`])),
  )
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({
    Students: 100,
    Staff: 100,
    Groups: 62,
    Bookings: 0,
  })

  const ratioErrors = Object.fromEntries(
    Object.entries(ratios).map(([k, v]) => {
      const n = Number(v)
      if (v.trim() === '') return [k, 'Enter a ratio.']
      if (!Number.isInteger(n) || n < 1) return [k, 'Ratio must be a whole number of students per staff member, at least 1.']
      if (n > 20) return [k, 'Above 1:20 no age band is compliant. Check the figure.']
      return [k, null]
    }),
  ) as Record<string, string | null>

  const hasErrors = Object.values(ratioErrors).some(Boolean)

  function runImport() {
    setImporting(true)
    const step = (key: string, to: number, delay: number) =>
      window.setTimeout(() => setProgress((p) => ({ ...p, [key]: to })), delay)
    step('Groups', 100, 400)
    step('Bookings', 45, 900)
    step('Bookings', 100, 1600)
    window.setTimeout(() => setImporting(false), 1800)
  }

  return (
    <div className="face-body">
      <div className="stack">
        <fieldset className="field-set">
          <legend>Centre</legend>

          <div className="field">
            <label htmlFor="centre-name">
              Centre name
              <span className="note">Appears on parent reminders and staff notifications.</span>
            </label>
            <input
              id="centre-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="season">
              Season
              <span className="note">Dates drive every due date on the sheet.</span>
            </label>
            <select id="season" defaultValue="2027">
              <option value="2027">Summer 2027 · 28 Jun – 20 Aug</option>
              <option value="2028">Summer 2028 · not yet configured</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="sites">
              Sites
              <span className="note">Multi-site changes how ratios are counted — per site, never pooled.</span>
            </label>
            <div>
              {CENTRE.sites.map((s) => (
                <div key={s} style={{ fontSize: 'var(--t-small)', padding: '2px 0' }}>
                  {s}
                </div>
              ))}
              <button type="button" className="btn ghost" style={{ marginTop: 'var(--s2)' }}>
                Add a site
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset className="field-set">
          <legend>Age bands & ratios</legend>
          {AGE_BANDS.map((b) => (
            <div className="field" key={b.id}>
              <label htmlFor={`ratio-${b.id}`}>
                {b.label}
                <span className="note">{b.note}</span>
              </label>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                  <span style={{ fontSize: 'var(--t-small)', color: 'var(--ink-3)' }}>1 staff per</span>
                  <input
                    id={`ratio-${b.id}`}
                    type="number"
                    min={1}
                    max={30}
                    value={ratios[b.id]}
                    aria-invalid={Boolean(ratioErrors[b.id])}
                    aria-describedby={ratioErrors[b.id] ? `err-${b.id}` : undefined}
                    onChange={(e) => setRatios((r) => ({ ...r, [b.id]: e.target.value }))}
                    style={{ maxWidth: '6rem' }}
                  />
                  <span style={{ fontSize: 'var(--t-small)', color: 'var(--ink-3)' }}>students</span>
                </div>
                {ratioErrors[b.id] && (
                  <p className="err" id={`err-${b.id}`}>
                    {ratioErrors[b.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
          <p className="synthetic" style={{ marginTop: 'var(--s3)' }}>
            <b>Placeholder rules.</b> The real ratios by age band, and what
            changes for off-site excursions, come from the safeguarding spec.
          </p>
        </fieldset>

        <fieldset className="field-set">
          <legend>WhatsApp channels</legend>
          {GROUPS.map((g) => (
            <div className="field" key={g.id}>
              <label htmlFor={`wa-${g.id}`}>
                {g.name}
                <span className="note">{g.band} · {g.site}</span>
              </label>
              <input
                id={`wa-${g.id}`}
                type="text"
                value={whatsapp[g.id]}
                onChange={(e) => setWhatsapp((w) => ({ ...w, [g.id]: e.target.value }))}
              />
            </div>
          ))}
          <p className="synthetic" style={{ marginTop: 'var(--s3)' }}>
            <b>Known gap.</b> The platform links to these channels but does not
            update their membership when a rota changes. Centres need an
            internal process for keeping them in sync.
          </p>
        </fieldset>

        <fieldset className="field-set">
          <legend>Import from spreadsheets</legend>
          <div className="import-rows">
            {Object.entries(progress).map(([label, pct]) => (
              <div
                className="r"
                key={label}
                data-urgency={pct === 100 ? 'settled' : pct === 0 ? 'due' : 'overdue'}
              >
                <span>
                  {label}
                  <span className="sub"> · from the centre's existing workbook</span>
                </span>
                <span className="bar" role="img" aria-label={`${label} ${pct}% imported`}>
                  <span style={{ transform: `scaleX(${pct / 100})` }} />
                </span>
                <span style={{ fontSize: 'var(--t-fine)', color: 'var(--ink-3)', width: '3.5rem', textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
            <button type="button" className="btn" onClick={runImport} disabled={importing}>
              {importing ? 'Importing…' : 'Continue import'}
            </button>
            <button type="button" className="btn ghost" disabled={hasErrors}>
              {hasErrors ? 'Fix ratio errors to save' : 'Save configuration'}
            </button>
          </div>
        </fieldset>
      </div>
    </div>
  )
}
