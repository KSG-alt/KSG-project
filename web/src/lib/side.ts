/* ── Which side of the business this build is for ─────────────────────────
   The platform has two audiences with different jobs and different rights
   over the same records:

   - the CENTRE runs the day: registers, rotas, transfers, rooms, the queue;
   - HEAD OFFICE owns what the records say: the clinical record, the money,
     the documents, DBS, incidents and the audit trail, across every centre.

   Showing one person both is how a demonstration ends up reading as "an
   everything screen", and it is also wrong: a centre administrator has no
   business in another centre's records, and head office does not take a
   register. So the standalone demos are built one per side, and the running
   app reads which one it is from a single global the build writes.

   Nothing here is access control. Real access control is enforced on a
   server against an authenticated session; this decides what a DEMONSTRATION
   contains. The role rules in centre.ts are the model of the real thing.
   ──────────────────────────────────────────────────────────────────────── */

import type { Route } from '../App';
import { ROLES, type RoleDef } from '../data/centre';

export type Side = 'centre' | 'office' | 'both';

declare global {
  interface Window {
    __KADIA_SIDE__?: Side;
  }
}

export const SIDE: Side =
  (typeof window !== 'undefined' && window.__KADIA_SIDE__) || 'both';

/* Head office does not run the hour-to-hour day, so the operational screens
   are not in its build. It keeps everything it is accountable for — and it
   keeps a home screen, which is its own screen rather than the centre's with
   different numbers on it (routes/OfficeHome.tsx). */
const OFFICE_ONLY_HIDES: Route[] = [
  'timetable', 'attendance', 'transfers', 'departures', 'rooms', 'bookings',
];

export const inSide = (route: Route): boolean => {
  if (SIDE === 'both') return true;
  if (SIDE === 'centre') return route !== 'office';
  return !OFFICE_ONLY_HIDES.includes(route);
};

/* Where each build opens. Both sides open on their own home screen. */
export const START: Route = 'home';

/* Who each build opens as. A centre demo that opens as head office, or the
   other way round, spends its first thirty seconds explaining itself. */
export const START_ROLE: RoleDef =
  SIDE === 'office'
    ? ROLES.find((r) => r.id === 'senior')!
    : ROLES.find((r) => r.id === 'admin')!;

/* Roles worth offering in each build. A head office demo listing "Activity
   staff" invites a question the build cannot answer. */
export const sideRoles = (): RoleDef[] =>
  SIDE === 'office'
    ? ROLES.filter((r) => r.id === 'senior' || r.id === 'director')
    : SIDE === 'centre'
      ? ROLES.filter((r) => r.id !== 'senior')
      : ROLES;

/* Who is at the dashboard in each build. A head office demo greeting the
   centre administrator by name is the first thing a viewer notices. */
export const OPERATOR = SIDE === 'office' ? 'Nadia' : 'Ismail';

export const SIDE_LABEL: Record<Side, string> = {
  centre: 'Centre',
  office: 'Head office',
  both: '',
};
