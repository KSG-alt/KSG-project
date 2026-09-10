import { useEffect, useState } from 'react';
import { Home } from './routes/Home';
import { Students } from './routes/Students';
import { Staff } from './routes/Staff';
import { Timetable } from './routes/Timetable';
import { Bookings } from './routes/Bookings';
import { Kadia } from './routes/Kadia';
import { Reminders } from './routes/Reminders';
import { Rooms } from './routes/Rooms';
import { MenuOverlay } from './components/MenuOverlay';
import {
  IconBookings, IconKadia, IconMenu, IconReminders, IconStaff, IconStudents,
  IconRooms, IconTimetable,
} from './lib/icons';
import { StoreProvider, useStore } from './lib/store';
import { DEMO_TODAY, fmtDateLong } from './data/seed';

export type Route =
  | 'home' | 'students' | 'staff' | 'timetable' | 'bookings' | 'kadia'
  | 'reminders' | 'rooms';

export const NAV: {
  id: Route;
  label: string;
  blurb: string;
  icon: () => JSX.Element;
}[] = [
  { id: 'reminders', label: 'Reminders', blurb: 'Everything outstanding, safeguarding first', icon: IconReminders },
  { id: 'students', label: 'Students', blurb: 'Who is here, and when they arrive and leave', icon: IconStudents },
  { id: 'rooms', label: 'Room allocations', blurb: 'Who sleeps where, with parent and guardian details', icon: IconRooms },
  { id: 'staff', label: 'Staff', blurb: 'Details, qualifications and DBS status', icon: IconStaff },
  { id: 'timetable', label: 'Timetable', blurb: 'Drafted schedule, editable by hand or by chat', icon: IconTimetable },
  { id: 'bookings', label: 'Bookings', blurb: 'Activity bookings and their receipts', icon: IconBookings },
  { id: 'kadia', label: 'Kadia', blurb: 'Ask anything, search the system, automate the chase', icon: IconKadia },
];

const OPERATOR = 'Ismail';

const TITLE: Record<Route, string> = {
  home: 'Home',
  reminders: 'Reminders',
  students: 'Students',
  rooms: 'Room allocations',
  staff: 'Staff',
  timetable: 'Timetable',
  bookings: 'Bookings',
  kadia: 'Kadia',
};

function Shell() {
  const [route, setRoute] = useState<Route>('home');
  const [menu, setMenu] = useState(false);
  const [tick, setTick] = useState(0);
  const { open } = useStore();

  const go = (r: Route) => {
    setRoute(r);
    setTick((t) => t + 1);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !menu && route !== 'home') go('home');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [route, menu]);

  const critical = open.filter((r) => r.severity === 'safeguarding').length;

  return (
    <>
      <header className={`bar${route === 'home' ? ' bar--over' : ''}`}>
        <button
          className="bar__menu"
          onClick={() => setMenu(true)}
          aria-expanded={menu}
          aria-label="Open menu"
        >
          <IconMenu />
          <span>menu</span>
        </button>

        {route !== 'home' && <span className="bar__where">{TITLE[route]}</span>}

        <div className="bar__right">
          {open.length > 0 && (
            <button
              className={`bar__count${critical ? ' bar__count--critical' : ''}`}
              onClick={() => go('reminders')}
            >
              {open.length} outstanding
            </button>
          )}
          <span className="label bar__date">
            {fmtDateLong(DEMO_TODAY.toISOString())}
          </span>
        </div>
      </header>

      {menu && (
        <MenuOverlay route={route} onGo={go} onClose={() => setMenu(false)} />
      )}

      {route === 'home' ? (
        <Home key={tick} operator={OPERATOR} onGo={go} />
      ) : (
        <main key={tick} className="page">
          {route === 'reminders' && <Reminders onGo={go} />}
          {route === 'students' && <Students />}
          {route === 'rooms' && <Rooms />}
          {route === 'staff' && <Staff />}
          {route === 'timetable' && <Timetable />}
          {route === 'bookings' && <Bookings />}
          {route === 'kadia' && <Kadia />}
          <footer className="page__foot">
            <div className="rule" />
            <p className="label">Demonstration · seeded data</p>
          </footer>
        </main>
      )}
    </>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
