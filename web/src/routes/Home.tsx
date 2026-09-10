import { NAV, type Route } from '../App';
import { IconArrow } from '../lib/icons';
import { DEMO_TODAY, SEASON_END, SEASON_START } from '../data/seed';

const season = () => {
  const f = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return `${f(SEASON_START)} – ${f(SEASON_END)} ${SEASON_END.getFullYear()}`;
};

const greeting = () => {
  const h = DEMO_TODAY.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export function Home({
  operator,
  onGo,
}: {
  operator: string;
  onGo: (r: Route) => void;
}) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(48px, 7vh, 96px) clamp(28px, 6vw, 108px)',
        maxWidth: 1180,
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: 'clamp(40px, 6vh, 72px)' }}>
        <h1
          style={{
            fontSize: 'clamp(2.6rem, 6vw, var(--t-3xl))',
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
          }}
        >
          {greeting()}, {operator}.
        </h1>
        <p
          className="meta"
          style={{ margin: '16px 0 0', color: 'var(--chalk-3)' }}
        >
          {season()} · Demonstration on seeded data
        </p>
      </div>

      <div className="stagger">
        {NAV.map((item, i) => (
          <button
            key={item.id}
            onClick={() => onGo(item.id)}
            className="home-row"
            style={{ animationDelay: `${60 + i * 45}ms` }}
          >
            <span
              className="home-row__rule"
              style={{ animationDelay: `${i * 45}ms` }}
            />
            <span className="home-row__icon">
              <item.icon />
            </span>
            <span className="home-row__label">{item.label}</span>
            <span className="home-row__blurb meta">{item.blurb}</span>
            <span className="home-row__go">
              <IconArrow />
            </span>
          </button>
        ))}
        <span className="home-row__rule" style={{ animationDelay: '285ms' }} />
      </div>
    </div>
  );
}
