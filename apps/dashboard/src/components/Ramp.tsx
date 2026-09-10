import type { Urgency } from '../data/seed'

const LEVEL: Record<Urgency, number> = {
  settled: 1,
  ahead: 2,
  due: 3,
  overdue: 4,
  critical: 5,
}

/**
 * The one language for urgency on this sheet. Five steps of density, tone
 * inherited from the row's `data-urgency`. Nothing else encodes pressure —
 * no second badge, no coloured pill, no icon.
 */
export function Ramp({ urgency, label }: { urgency: Urgency; label: string }) {
  const on = LEVEL[urgency]
  return (
    <span className="ramp" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= on ? 'on' : undefined} />
      ))}
    </span>
  )
}
