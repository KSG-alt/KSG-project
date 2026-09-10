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
    <div className="hero">
      <div className="hero__bg" aria-hidden="true" />

      <div className="hero__inner">
        <header className="hero__head">
          <p className="label hero__season">
            {season()} · Demonstration on seeded data
          </p>
          <h1 className="hero__title">
            {greeting()}, {operator}.
          </h1>
        </header>

        <nav className="menu stagger" aria-label="Sections">
          {NAV.map((item, i) => (
            <button
              key={item.id}
              onClick={() => onGo(item.id)}
              className="menu__row"
              style={{ animationDelay: `${70 + i * 45}ms` }}
            >
              <span
                className="menu__rule"
                style={{ animationDelay: `${i * 45}ms` }}
              />
              <span className="menu__icon">
                <item.icon />
              </span>
              <span className="menu__label">{item.label}</span>
              <span className="menu__blurb">{item.blurb}</span>
              <span className="menu__go">
                <IconArrow />
              </span>
            </button>
          ))}
          <span className="menu__rule" style={{ animationDelay: '295ms' }} />
        </nav>
      </div>
    </div>
  );
}
