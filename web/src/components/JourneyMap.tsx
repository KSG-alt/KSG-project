import {
  MODE_LABEL, routeDistance, routeMinutes, type Leg, type Route,
} from '../data/venues';

/* A journey drawn from its own legs, so it is accurate to the data rather
   than decorative. Inline SVG, no tiles, no network — the standalone demo has
   to open with nothing behind it. The real map is one link away. */

const MODE_COLOR: Record<string, string> = {
  walk: 'var(--ink-3)',
  minibus: 'var(--forest)',
  coach: 'var(--forest)',
  train: 'var(--info)',
  ferry: 'var(--info)',
};

function Glyph({ mode }: { mode: Leg['mode'] }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (mode === 'walk') {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <circle cx="13" cy="4.5" r="1.8" />
        <path d="M11 21l1.6-5.4-2.4-2.3.9-4.6 3.4 1.6 2.1 2.4" />
        <path d="M8.4 12.1l1.7-3.4M14.6 21l1.4-4" />
      </svg>
    );
  }
  if (mode === 'train') {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <rect x="5.5" y="3.5" width="13" height="13" rx="3" />
        <path d="M5.5 11h13M9 20l-2 1.5M15 20l2 1.5M8.5 16.5h.01M15.5 16.5h.01" />
      </svg>
    );
  }
  if (mode === 'ferry') {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <path d="M3.5 17.5c1.8 0 1.8 1.6 3.6 1.6s1.8-1.6 3.6-1.6 1.8 1.6 3.6 1.6 1.8-1.6 3.6-1.6M5 14.5l1.4-4.6h11.2L19 14.5M12 9.9V6.4M9 6.4h6" />
      </svg>
    );
  }
  /* Minibus and coach share a glyph, at different weights of meaning. */
  return (
    <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="11" rx="2.5" />
      <path d="M3 11.5h18M7.5 20v-3.5M16.5 20v-3.5M6.8 14h.01M17.2 14h.01" />
    </svg>
  );
}

export function JourneyMap({ route, to }: { route: Route; to: string }) {
  const from = route.start;
  const total = routeMinutes(route);
  return (
    <div className="jmap" role="img" aria-label={`${from} to ${to}: ${route.legs.map((l) => `${MODE_LABEL[l.mode]} ${l.minutes} minutes`).join(', then ')}`}>
      <ol className="jmap__legs">
        <li className="jmap__stop">
          <span className="jmap__dot jmap__dot--end" />
          <span className="jmap__place">{from}</span>
        </li>
        {route.legs.map((l, i) => (
          <li key={i} className="jmap__leg">
            <span className="jmap__line" style={{ color: MODE_COLOR[l.mode] }}>
              <span
                className={`jmap__rule${l.mode === 'walk' ? ' jmap__rule--walk' : ''}`}
              />
              <span className="jmap__glyph">
                <Glyph mode={l.mode} />
              </span>
              <span
                className={`jmap__rule${l.mode === 'walk' ? ' jmap__rule--walk' : ''}`}
              />
            </span>
            <span className="jmap__detail">
              <span className="jmap__mode">{MODE_LABEL[l.mode]}</span>
              <span className="meta jmap__time num">
                {l.minutes} min · {l.distanceKm} km
              </span>
              <span className="meta jmap__to">to {l.to}</span>
            </span>
          </li>
        ))}
        <li className="jmap__stop">
          <span className="jmap__dot jmap__dot--end" />
          <span className="jmap__place">{to}</span>
        </li>
      </ol>
      <p className="meta jmap__total num">
        {total} minutes · {routeDistance(route)} km, one way
      </p>
    </div>
  );
}
