import { useEffect, useState } from 'react';
import { Home } from './routes/Home';
import { Students } from './routes/Students';
import { Staff } from './routes/Staff';
import { Timetable } from './routes/Timetable';
import { Bookings } from './routes/Bookings';
import { Kadia } from './routes/Kadia';
import { Reminders } from './routes/Reminders';
import { Rooms } from './routes/Rooms';
import { Audit } from './routes/Audit';
import { Arrivals } from './routes/Arrivals';
import { Finance } from './routes/Finance';
import { Incidents } from './routes/Incidents';
import { Setup } from './routes/Setup';
import { Transfers } from './routes/Transfers';
import { Portal } from './routes/Portal';
import { Attendance } from './routes/Attendance';
import { MenuOverlay } from './components/MenuOverlay';
import {
  IconBookings, IconKadia, IconMenu, IconReminders, IconStaff, IconStudents,
  IconArrivals, IconAudit, IconRooms, IconTimetable, IconFinance,
  IconIncidents, IconOffice, IconSetup, IconTransfers, IconPortal, IconAttendance,
} from './lib/icons';
import { Lockup } from './lib/Logo';
import { Office } from './routes/Office';
import { Departures } from './routes/Departures';
import { GlobalAsk } from './components/GlobalAsk';
import { OfficeHome } from './routes/OfficeHome';
import { OPERATOR, SIDE, START, inSide } from './lib/side';
import { StoreProvider, useStore } from './lib/store';
import { ROLES } from './data/centre';
import { DEMO_TODAY, fmtDateLong } from './data/seed';

export type Route =
  | 'home' | 'students' | 'staff' | 'timetable' | 'bookings' | 'kadia'
  | 'reminders' | 'rooms' | 'arrivals' | 'audit' | 'finance' | 'incidents'
  | 'setup' | 'transfers' | 'portal' | 'attendance' | 'office' | 'departures';

export const NAV: {
  id: Route;
  label: string;
  blurb: string;
  icon: () => JSX.Element;
}[] = [
  { id: 'reminders', label: 'Reminders', blurb: 'Everything outstanding, safeguarding first', icon: IconReminders },
  { id: 'students', label: 'Students', blurb: 'Who is here, and when they arrive and leave', icon: IconStudents },
  { id: 'arrivals', label: 'New arrivals', blurb: 'Everyone still to come, and whether they can be admitted', icon: IconArrivals },
  { id: 'departures', label: 'Departures', blurb: 'Who flies when, how they get to the airport, and every reference', icon: IconArrivals },
  { id: 'transfers', label: 'Transfers', blurb: 'Flights, runs and who meets each one', icon: IconTransfers },
  { id: 'attendance', label: 'Attendance', blurb: 'Who was counted, by whom, and who was not there', icon: IconAttendance },
  { id: 'portal', label: 'Document portal', blurb: 'What parents have sent, and what is waiting on us', icon: IconPortal },
  { id: 'rooms', label: 'Room allocations', blurb: 'Who sleeps where, with parent and guardian details', icon: IconRooms },
  { id: 'staff', label: 'Staff', blurb: 'Details, qualifications, DBS and availability', icon: IconStaff },
  { id: 'timetable', label: 'Timetable', blurb: 'Drafted schedule, editable by hand or by chat', icon: IconTimetable },
  { id: 'bookings', label: 'Bookings', blurb: 'Activity bookings and their receipts', icon: IconBookings },
  { id: 'finance', label: 'Payments', blurb: 'What landed, who it belongs to, what is still owed', icon: IconFinance },
  { id: 'incidents', label: 'Incidents', blurb: 'What happened, who was told, and how fast', icon: IconIncidents },
  { id: 'audit', label: 'Audit trail', blurb: 'Every action, timestamped and attributed, for inspection', icon: IconAudit },
  { id: 'office', label: 'Head office', blurb: 'The senior team across every centre — verification, consent, clinical load', icon: IconOffice },
  { id: 'setup', label: 'Centre setup', blurb: 'Sites, ratios, escalation, access and import', icon: IconSetup },
  { id: 'kadia', label: 'Ask Kadia', blurb: 'Ask anything, search the system, automate the chase', icon: IconKadia },
];

const TITLE: Record<Route, string> = {
  home: 'Home',
  reminders: 'Reminders',
  students: 'Students',
  arrivals: 'New arrivals',
  transfers: 'Transfers',
  attendance: 'Attendance',
  portal: 'Document portal',
  rooms: 'Room allocations',
  staff: 'Staff',
  timetable: 'Timetable',
  bookings: 'Bookings',
  finance: 'Payments',
  incidents: 'Incidents',
  kadia: 'Ask Kadia',
  audit: 'Audit trail',
  setup: 'Centre setup',
  office: 'Head office',
  departures: 'Departures',
};

function Shell() {
  const [route, setRoute] = useState<Route>(START);
  const [menu, setMenu] = useState(false);
  const [tick, setTick] = useState(0);
  const { role, setRole, site } = useStore();

  const go = (r: Route) => {
    /* A reminder can point at a section this build does not carry — head
       office sees that a register was never taken without being the people
       who take it. Land somewhere real rather than flashing through it. */
    setRoute(inSide(r) ? r : START);
    setTick((t) => t + 1);
    window.scrollTo({ top: 0 });
  };

  /* A role that loses its current section lands back on home rather than on a
     screen it may not read. */
  useEffect(() => {
    if (!role.sections.includes(route) || !inSide(route)) go(START);
  }, [role, route]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !menu && route !== START) go(START);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [route, menu]);

  const allowed = (r: Route) => role.sections.includes(r) && inSide(r);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className={`bar${route === 'home' ? ' bar--over' : ''}`}>
        <button
          className="bar__brand"
          onClick={() => go('home')}
          aria-label="Kadia Systems Group — home"
        >
          <Lockup />
        </button>

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
          {role.id !== 'admin' && (
            <button
              className="bar__role"
              onClick={() => setRole(ROLES[0])}
              title="Demonstration control — return to the administrator view. In the real system nobody changes their own role."
            >
              <span className="bar__rolelong">as </span>
              {role.name.toLowerCase().replace('centre ', '')}
              <span className="bar__rolelong"> · leave</span>
            </button>
          )}
          <span className="label bar__date">
            {SIDE === 'office' ? 'Head office · all centres' : site.name}
            <span className="bar__when">
              {' · '}
              {fmtDateLong(DEMO_TODAY.toISOString())}
            </span>
          </span>
        </div>
      </header>

      {menu && (
        <MenuOverlay route={route} onGo={go} onClose={() => setMenu(false)} />
      )}

      {route === 'home' ? (
        SIDE === 'office' ? (
          <OfficeHome key={tick} operator={OPERATOR} onGo={go} />
        ) : (
          <Home key={tick} operator={OPERATOR} onGo={go} />
        )
      ) : (
        <main key={tick} id="main" className="page">
          {/* One Ask Kadia on every section, in the same place. Screens with
              a planner of their own carry their own dock instead. */}
          <GlobalAsk route={route} />

          {route === 'reminders' && <Reminders onGo={go} />}
          {route === 'students' && <Students />}
          {route === 'arrivals' && <Arrivals />}
          {route === 'departures' && <Departures />}
          {route === 'transfers' && <Transfers />}
          {route === 'attendance' && <Attendance />}
          {route === 'portal' && <Portal />}
          {route === 'rooms' && <Rooms />}
          {route === 'staff' && <Staff />}
          {route === 'timetable' && <Timetable />}
          {route === 'bookings' && <Bookings />}
          {route === 'finance' && <Finance />}
          {route === 'incidents' && <Incidents />}
          {route === 'audit' && <Audit />}
          {route === 'office' && <Office />}
          {route === 'setup' && <Setup />}
          {route === 'kadia' && <Kadia />}
          <footer className="page__foot">
            <div className="rule" />
            <div className="page__footrow">
              <p className="label">Demonstration · seeded data</p>
              <span className="page__by">
                <Lockup size={18} showName={false} />
                Built by Kadia Systems Group
              </span>
            </div>
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
