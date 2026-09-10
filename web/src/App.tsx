import { useEffect, useState } from 'react';
import { Home } from './routes/Home';
import { Students } from './routes/Students';
import { Staff } from './routes/Staff';
import { Timetable } from './routes/Timetable';
import { Bookings } from './routes/Bookings';
import { Kadia } from './routes/Kadia';
import {
  IconBookings, IconHome, IconKadia, IconStaff, IconStudents, IconTimetable,
} from './lib/icons';
import { DEMO_TODAY, fmtDateLong } from './data/seed';

export type Route = 'home' | 'students' | 'staff' | 'timetable' | 'bookings' | 'kadia';

export const NAV: {
  id: Route;
  label: string;
  blurb: string;
  icon: () => JSX.Element;
}[] = [
  { id: 'students', label: 'Students', blurb: 'Who is here, and when they arrive and leave', icon: IconStudents },
  { id: 'staff', label: 'Staff', blurb: 'Details, qualifications and DBS status', icon: IconStaff },
  { id: 'timetable', label: 'Timetable', blurb: 'Drafted schedule, editable by hand or by chat', icon: IconTimetable },
  { id: 'bookings', label: 'Bookings', blurb: 'Activity bookings and their receipts', icon: IconBookings },
  { id: 'kadia', label: 'Kadia', blurb: 'Ask anything, search the system, automate the chase', icon: IconKadia },
];

const OPERATOR = 'Ismail';

export function App() {
  const [route, setRoute] = useState<Route>('home');

  /* The rule is drawn again on every arrival, so the key remounts the tree. */
  const [tick, setTick] = useState(0);
  const go = (r: Route) => {
    setRoute(r);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && route !== 'home') go('home');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [route]);

  if (route === 'home') {
    return <Home key={tick} operator={OPERATOR} onGo={go} />;
  }

  return (
    <div className="shell">
      <nav aria-label="Sections" className="rail">
        <button
          className="btn btn--quiet rail__home"
          onClick={() => go('home')}
        >
          <IconHome />
          <span style={{ letterSpacing: '-0.02em', fontWeight: 600 }}>
            Register
          </span>
        </button>

        {NAV.map((item) => {
          const active = item.id === route;
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`rail__item${active ? ' rail__item--on' : ''}`}
            >
              <item.icon />
              {item.label}
            </button>
          );
        })}

        <div className="rail__foot">
          <div className="rule" style={{ marginBottom: 14 }} />
          <div className="label">Demonstration · seeded data</div>
          <div className="meta num rail__date">
            {fmtDateLong(DEMO_TODAY.toISOString())}
          </div>
        </div>
      </nav>

      <main key={tick} className="route shell__main">
        {route === 'students' && <Students />}
        {route === 'staff' && <Staff />}
        {route === 'timetable' && <Timetable />}
        {route === 'bookings' && <Bookings />}
        {route === 'kadia' && <Kadia />}
      </main>
    </div>
  );
}
