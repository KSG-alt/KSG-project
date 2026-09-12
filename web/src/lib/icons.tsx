/* Authored icons. One 20px grid, 1.4 stroke, no fills, currentColor only. */

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconStudents() {
  return (
    <svg {...base}>
      <circle cx="7.2" cy="6.4" r="2.6" />
      <path d="M2.4 16.6c0-2.7 2.1-4.5 4.8-4.5s4.8 1.8 4.8 4.5" />
      <path d="M13.4 4.6a2.6 2.6 0 0 1 0 5" />
      <path d="M14.6 12.4c1.8.5 3 2.1 3 4.2" />
    </svg>
  );
}

export function IconStaff() {
  return (
    <svg {...base}>
      <path d="M10 2.2 16.6 4.4v5c0 3.6-2.6 6.6-6.6 8.4-4-1.8-6.6-4.8-6.6-8.4v-5Z" />
      <circle cx="10" cy="8.4" r="1.9" />
      <path d="M6.9 14.2c.5-1.6 1.7-2.5 3.1-2.5s2.6.9 3.1 2.5" />
    </svg>
  );
}

export function IconTimetable() {
  return (
    <svg {...base}>
      <rect x="2.6" y="3.8" width="14.8" height="13.4" />
      <path d="M2.6 8h14.8M7.4 8v9.2M12.2 8v9.2" />
      <path d="M6.2 2.4v2.8M13.8 2.4v2.8" />
    </svg>
  );
}

export function IconBookings() {
  return (
    <svg {...base}>
      <path d="M4.4 2.6h11.2v14.8l-2.24-1.5-1.86 1.5-1.86-1.5-1.86 1.5-1.86-1.5-1.52 1.5Z" />
      <path d="M7.2 6.6h5.6M7.2 9.8h5.6M7.2 13h3.2" />
    </svg>
  );
}

export function IconKadia() {
  return (
    <svg {...base}>
      <path d="M10 2.4v15.2M3.4 6.2l13.2 7.6M16.6 6.2 3.4 13.8" />
      <circle cx="10" cy="10" r="2.4" />
    </svg>
  );
}

export function IconHome() {
  return (
    <svg {...base}>
      <path d="M2.8 5h14.4M2.8 8.6h14.4M2.8 12.2h14.4M2.8 15.8h9" />
    </svg>
  );
}

export function IconArrow() {
  return (
    <svg {...base}>
      <path d="M4.6 10h10.8M11 5.6 15.4 10 11 14.4" />
    </svg>
  );
}

export function IconEdit() {
  return (
    <svg {...base}>
      <path d="M13.2 3.6l3.2 3.2-9 9H4.2v-3.2l9-9Z" />
      <path d="M11.4 5.4l3.2 3.2" />
    </svg>
  );
}

export function IconAttach() {
  return (
    <svg {...base}>
      <path d="M10 2.8v9.6a2.4 2.4 0 0 0 4.8 0V6.4" />
      <path d="M10 2.8a3.6 3.6 0 0 0-7.2 0v9.2a5.2 5.2 0 0 0 10.4 0" />
    </svg>
  );
}

export function IconSend() {
  return (
    <svg {...base}>
      <path d="M3 10h13M11.4 5 16.6 10l-5.2 5" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg {...base}>
      <path d="M5.4 5.4l9.2 9.2M14.6 5.4l-9.2 9.2" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg {...base}>
      <path d="M4 10.6 8 14.4 16 5.8" />
    </svg>
  );
}

export function IconGoogle() {
  return (
    <svg {...base}>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M2.8 10h14.4" />
      <path d="M10 2.8c2 2 3.1 4.5 3.1 7.2s-1.1 5.2-3.1 7.2c-2-2-3.1-4.5-3.1-7.2S8 4.8 10 2.8Z" />
    </svg>
  );
}

export function IconReminders() {
  return (
    <svg {...base}>
      <path d="M3.2 5.4h7.2M3.2 10h7.2M3.2 14.6h5" />
      <path d="M13.2 4.2l1.9 1.9 3.1-3.2" />
      <path d="M13.4 12.6l1.9 1.9 3.1-3.2" />
    </svg>
  );
}

export function IconMenu() {
  return (
    <svg {...base}>
      <path d="M2.8 6h14.4M2.8 10h14.4M2.8 14h9.6" />
    </svg>
  );
}

export function IconRooms() {
  return (
    <svg {...base}>
      <path d="M2.6 7.4 10 2.8l7.4 4.6v9.8H2.6Z" />
      <path d="M7.6 17.2v-5.4h4.8v5.4" />
      <path d="M2.6 11.8h5M12.4 11.8h5" />
    </svg>
  );
}

export function IconArrivals() {
  return (
    <svg {...base}>
      <path d="M10 2.6v9.4M6.2 8.4 10 12.2l3.8-3.8" />
      <path d="M3 14.2v2.2c0 .6.5 1 1 1h12c.6 0 1-.4 1-1v-2.2" />
    </svg>
  );
}

export function IconAudit() {
  return (
    <svg {...base}>
      <path d="M5 2.8h7.6L16.6 7v10.2H5z" />
      <path d="M12.2 2.9V7h4.2" />
      <path d="M7.6 11.4 9.3 13l3.3-3.9" />
      <path d="M7.6 15.2h5.2" />
    </svg>
  );
}
