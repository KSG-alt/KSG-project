/* ── Getting there ────────────────────────────────────────────────────────
   Every activity happens somewhere, and half the sessions that go wrong go
   wrong before anyone arrives: the minibus had no D1 driver, the group left
   from the wrong door, nobody knew the walk was twenty minutes.

   So each location carries how you get to it, how long that takes, and where
   the group gathers. Travel time comes out of the slot, which is the fact
   leaders most often discover too late.
   ──────────────────────────────────────────────────────────────────────── */

export type Travel = 'on foot' | 'minibus' | 'coach';

export interface Venue {
  /* Matches Activity.location exactly — one name for one place. */
  location: string;
  travel: Travel;
  /* One way, door to door, with a group. Not the walking-alone time. */
  minutes: number;
  meetAt: string;
  route: string[];
  /* A minibus needs somebody on the session holding Minibus D1. */
  needsDriver: boolean;
  capacityPerVehicle?: number;
  parking?: string;
  accessible: string;
  notes: string;
}

export const VENUES: Venue[] = [
  {
    location: 'Lower field',
    travel: 'on foot',
    minutes: 8,
    meetAt: 'Willow House side door, by the boot rack',
    route: [
      'Out of the Willow House side door and left along the tarmac path.',
      'Past the sports centre, through the green gate — it sticks, pull up as you push.',
      'Down the slope. The field is on your right, the store is the wooden shed at the top corner.',
    ],
    needsDriver: false,
    accessible: 'The slope is steep and grassed. Take the service road instead for a wheelchair or crutches — five minutes longer.',
    notes: 'No phone signal at the bottom of the field. Take the radio.',
  },
  {
    location: 'Marine centre',
    travel: 'minibus',
    minutes: 18,
    meetAt: 'Front car park, by the minibus bay',
    route: [
      'Load at the front car park. Count on, and write the number on the clipboard in the cab.',
      'Left out of the gate, follow signs for the harbour for about four miles.',
      'Right at the second mini-roundabout, down Quay Road to the marine centre barrier.',
      'Buzz the barrier and say the centre name. Park in the far bay, not the slipway.',
    ],
    needsDriver: true,
    capacityPerVehicle: 16,
    parking: 'Far bay only. The slipway must stay clear for the lifeboat.',
    accessible: 'Step-free from the car park to the pontoon. The changing block has a level-access door on the harbour side.',
    notes: 'Two runs if the group is over 16. Build both into the slot — it is 18 minutes each way.',
  },
  {
    location: 'Block C',
    travel: 'on foot',
    minutes: 4,
    meetAt: 'Outside the Block C main door',
    route: [
      'Across the front lawn, keeping off the grass when it is wet.',
      'Block C is the low brick building behind the flagpole. Main door, then first corridor on the left.',
    ],
    needsDriver: false,
    accessible: 'Ramp at the main door. Lift to the first floor is on the right, code on the staff card.',
    notes: 'Rooms are booked back to back. Be out on time, another group is waiting.',
  },
  {
    location: 'Hall',
    travel: 'on foot',
    minutes: 3,
    meetAt: 'Hall foyer',
    route: [
      'Through the dining room and turn right at the noticeboard.',
      'The hall is through the double doors. Prop them open, they lock behind you.',
    ],
    needsDriver: false,
    accessible: 'Level throughout. The stage is step only — the ramp is in the store cupboard.',
    notes: 'Chairs live stacked at the side. Put them back, the hall is set for dinner at 17:30.',
  },
  {
    location: 'Off site — city',
    travel: 'coach',
    minutes: 45,
    meetAt: 'Front drive, coach bay — not the car park',
    route: [
      'Coach picks up on the front drive. Do not let students board until the driver says so.',
      'Count on, write the number down, say it out loud to the second staff member.',
      'Forty-five minutes on the motorway. The coach drops on Museum Street, north side.',
      'Cross at the signals as one group — staff at the front and the back.',
      'Museum main entrance is up the steps. The group entrance is the ramp to the left.',
    ],
    needsDriver: false,
    capacityPerVehicle: 53,
    parking: 'The coach waits in the Museum Street bay. Driver number is on the booking.',
    accessible: 'Ramp to the left of the main steps. Lift to every floor once inside.',
    notes: 'Forty-five each way out of a half-day. Do not add a second stop.',
  },
  {
    location: 'Astro pitch',
    travel: 'on foot',
    minutes: 6,
    meetAt: 'Sports centre reception',
    route: [
      'Through the sports centre and out of the back doors.',
      'The astro is behind the changing block. Gate code is on the staff card.',
      'Goals and bibs live in the container by the gate.',
    ],
    needsDriver: false,
    accessible: 'Level and tarmac the whole way.',
    notes: 'No metal studs on the astro. Check before you leave the centre, not at the gate.',
  },
  {
    location: 'Sports centre',
    travel: 'on foot',
    minutes: 6,
    meetAt: 'Sports centre reception',
    route: [
      'Straight down the main path past the flagpole.',
      'Sports centre reception is the glass front. Sign the group in at the desk.',
      'The climbing wall is through the sports hall, far end.',
    ],
    needsDriver: false,
    accessible: 'Level access and a lift to the viewing gallery.',
    notes: 'Vertical Ltd need the group signed in at reception before they will start.',
  },
];

export const venueFor = (location: string) =>
  VENUES.find((v) => v.location === location) ?? null;

/* Travel eats the slot. A 90-minute session at the marine centre is 36
   minutes of travel and 54 minutes of everything else, and that is the
   number a leader needs before they plan the session, not after. */
export const roundTrip = (location: string) =>
  (venueFor(location)?.minutes ?? 0) * 2;
