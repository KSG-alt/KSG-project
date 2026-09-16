/* ── Centre configuration ─────────────────────────────────────────────────
   The things a centre sets once, in the October setup session, and the
   platform then enforces: which sites it runs, the age bands and the ratio
   each band requires, how long an overdue item waits before it goes above
   the admin, and who can see what.

   interface-contract.md §1 is explicit that escalation thresholds are "per
   centre, not hardcoded", and DECISIONS 0002 puts multiple sites in scope
   from the pilot. Both live here rather than in the code that reads them.
   ──────────────────────────────────────────────────────────────────────── */

import type { AgeBand } from './seed';
import { GROUPS, STAFF, STUDENTS } from './seed';

export interface Site {
  id: string;
  name: string;
  town: string;
  capacity: number;
  /* A second site exists in the contract before it exists in the data. Until
     a centre's records are imported there is nothing to show, and saying so
     is more honest than inventing a second roll. */
  onboarded: boolean;
  director: string;
}

export const SITES: Site[] = [
  {
    id: 'site-ashcombe',
    name: 'Ashcombe Park',
    town: 'Dorset',
    capacity: 240,
    onboarded: true,
    director: 'Ismail Sanneh',
  },
  {
    id: 'site-brackley',
    name: 'Brackley Court',
    town: 'Oxfordshire',
    capacity: 180,
    onboarded: false,
    director: 'Kebba Sarr',
  },
];

export const PILOT_SITE = SITES[0];

export function siteCounts(site: Site) {
  if (!site.onboarded) return { students: 0, staff: 0, groups: 0 };
  return { students: STUDENTS.length, staff: STAFF.length, groups: GROUPS.length };
}

/* ── Ratio rules ───────────────────────────────────────────────────────── */

export interface BandRule {
  band: AgeBand;
  /* Students per staff member. The rota flags below this; David's engine owns
     the legal call, this is the number it is given. */
  ratio: number;
  nightRatio: number;
  offSiteRatio: number;
  note: string;
}

export const BAND_RULES: BandRule[] = [
  { band: '8–11', ratio: 8, nightRatio: 12, offSiteRatio: 6, note: 'Youngest band. Tightest ratio on and off site.' },
  { band: '12–14', ratio: 10, nightRatio: 15, offSiteRatio: 8, note: 'Standard band.' },
  { band: '15–17', ratio: 12, nightRatio: 20, offSiteRatio: 10, note: 'Oldest band. Supervised free time permitted.' },
];

/* ── Roles and access ──────────────────────────────────────────────────── */

export type RoleId = 'admin' | 'director' | 'safeguarding' | 'activity' | 'senior';

export interface RoleDef {
  id: RoleId;
  name: string;
  who: string;
  /* Sections this role can open. Named by route id so App can gate on it. */
  sections: string[];
  /* Whether this role sees a student's medical and dietary notes. Special
     category data under UK GDPR — an activity instructor has no business
     reading it, and PRODUCT.md names role-based access as a constraint. */
  welfareDetail: boolean;
  /* Whether this role may CHANGE the clinical record — enter a medication,
     verify a declaration from a family, or query it back to them. Deliberately
     narrower than welfareDetail: the centre reads and records what it gave,
     and head office owns what the record says. A seasonal activity leader
     correcting a dose off a WhatsApp message is exactly the failure this
     separation exists to prevent. */
  welfareEdit: boolean;
  canEditRecords: boolean;
}

export const ALL_SECTIONS = [
  'home', 'reminders', 'students', 'arrivals', 'transfers', 'attendance',
  'portal', 'rooms', 'staff', 'timetable', 'bookings', 'finance', 'incidents',
  'audit', 'setup', 'kadia',
];

export const ROLES: RoleDef[] = [
  {
    id: 'admin',
    name: 'Centre administrator',
    who: 'Runs the queue. The person this product is built for.',
    sections: ALL_SECTIONS,
    welfareDetail: true,
    welfareEdit: false,
    canEditRecords: true,
  },
  {
    id: 'director',
    name: 'Centre director',
    who: 'Signs off, receives escalations, owns the numbers.',
    sections: ALL_SECTIONS,
    welfareDetail: true,
    welfareEdit: false,
    canEditRecords: true,
  },
  {
    id: 'safeguarding',
    name: 'Safeguarding lead',
    who: 'Owns DBS, incidents and the audit trail. No finance.',
    sections: [
      'home', 'reminders', 'students', 'arrivals', 'transfers', 'attendance',
      'portal', 'rooms', 'staff', 'timetable', 'incidents', 'audit', 'kadia',
    ],
    welfareDetail: true,
    welfareEdit: false,
    canEditRecords: true,
  },
  {
    id: 'activity',
    name: 'Activity staff',
    who: 'Reads their own rota and the group lists. Nothing else.',
    /* Activity staff take registers — that is most of what the app is for. */
    sections: ['home', 'students', 'timetable', 'attendance', 'kadia'],
    welfareDetail: false,
    welfareEdit: false,
    canEditRecords: false,
  },
  {
    id: 'senior',
    name: 'Head office welfare',
    who: 'The senior team. Owns the clinical record: enters it, verifies what families declare, and queries what does not add up. Not at the centre.',
    sections: ALL_SECTIONS,
    welfareDetail: true,
    welfareEdit: true,
    canEditRecords: true,
  },
];

export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id)!;

/* ── WhatsApp channels ─────────────────────────────────────────────────── */

export interface ChannelLink {
  groupId: string;
  name: string;
  members: number;
  linked: boolean;
}

export const CHANNELS: ChannelLink[] = GROUPS.map((g, i) => ({
  groupId: g.id,
  name: `${g.name} · staff`,
  members: 6 + i,
  linked: i < 3,
}));
