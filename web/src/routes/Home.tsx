import { NAV, type Route } from '../App';
import { Chat } from '../components/Chat';
import { ReminderList } from '../components/ReminderList';
import { IconArrow } from '../lib/icons';
import { KADIA_SYSTEM, KADIA_TOOLS } from '../lib/kadiaAgent';
import { useStore } from '../lib/store';
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
  const { open } = useStore();
  const critical = open.filter((r) => r.severity === 'safeguarding');
  const top = open.slice(0, 5);

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
          <p className="hero__standfirst">
            {open.length === 0
              ? 'Nothing outstanding across the centre.'
              : critical.length > 0
              ? `${open.length} things need you today. ${critical.length} of them are safeguarding.`
              : `${open.length} things need you today. None are safeguarding.`}
          </p>
        </header>

        <nav className="quick" aria-label="Sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              className="quick__pill"
              onClick={() => onGo(item.id)}
            >
              <item.icon />
              {item.label}
              {item.id === 'reminders' && open.length > 0 && (
                <span className="quick__count">{open.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="hero__grid">
          <section className="slab" aria-labelledby="today-head">
            <div className="slab__head">
              <h2 id="today-head" className="slab__title">
                What needs doing
              </h2>
              <button className="btn" onClick={() => onGo('reminders')}>
                All {open.length}
                <IconArrow />
              </button>
            </div>
            <ReminderList items={top} onGo={onGo} compact />
            {open.length > top.length && (
              <p className="meta slab__more">
                {open.length - top.length} more in Reminders.
              </p>
            )}
          </section>

          <section className="slab slab--chat" aria-label="Ask Kadia">
            <div className="slab__head">
              <h2 className="slab__title">Ask Kadia</h2>
              <button className="btn btn--quiet" onClick={() => onGo('kadia')}>
                Open
                <IconArrow />
              </button>
            </div>
            <Chat
              system={KADIA_SYSTEM}
              tools={KADIA_TOOLS}
              greeting="Ask anything about the centre — I read the real records."
              placeholder="e.g. Who is arriving Sunday without documents?"
              suggestions={[
                'What needs my attention today?',
                'Which staff cannot be rota’d, and why?',
              ]}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
