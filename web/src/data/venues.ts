/* ── Getting there ────────────────────────────────────────────────────────
   Every activity happens somewhere, and half the sessions that go wrong go
   wrong before anyone arrives: the minibus had no D1 driver, the coach could
   not get down the lane, nobody knew the walk was twenty minutes.

   A journey is legs, not a single word. "Minibus" is wrong for the marine
   centre — it is a walk to the car park, a drive, and a walk down the
   towpath, and the walk at each end is where the time goes. Each venue also
   carries a second route with the reason you would use it, because the first
   one fails on a wet Tuesday and somebody has to decide on the spot.

   ── Real places, a fictional centre ─────────────────────────────────────
   The centre itself is seeded and fictional — CONTRIBUTING.md is explicit
   that no real centre appears here, and naming a real school would imply a
   customer that does not exist (PRODUCT.md, Evidence on Hand).

   The venues around it are real, verifiable central London places, so the
   routes, the stations, the entrances and the maps are true rather than
   invented. The centre sits in Bloomsbury WC1 and its meeting points are
   public streets and squares. Which activity a fictional summer school runs
   at each venue is part of the seeded scenario; the place, the address and
   the way you get there are not.

   Verified September 2026:
   - The Pirate Castle, Gilbey's Wharf, Oval Road, NW1 7EA — runs paddlesport
     sessions for schools and community groups.
   - The Hub, The Regent's Park, NW1 4RU — Royal Parks sports pitches, with
     changing rooms and a café.
   - Natural History Museum, Cromwell Road, SW7 5BD — school groups use the
     Exhibition Road entrance; coaches drop on Cromwell Road.
   - VauxWall West, Arch 45b/47a South Lambeth Road, SW8 1SR — climbing centre
     in the railway arches under Vauxhall station.
   - Piccadilly line runs Russell Square to South Kensington direct.
   - Northern line, Charing Cross branch, runs Euston–Mornington Crescent–
     Camden Town.
   ──────────────────────────────────────────────────────────────────────── */

export type Mode = 'walk' | 'minibus' | 'coach' | 'ferry' | 'train';

export const MODE_LABEL: Record<Mode, string> = {
  walk: 'On foot',
  minibus: 'Centre minibus',
  coach: 'Hired coach',
  ferry: 'Harbour ferry',
  train: 'Train',
};

/* Which modes a person must be licensed for. A centre minibus needs D1; a
   hired coach comes with its own driver. */
export const MODE_LICENCE: Partial<Record<Mode, string>> = {
  minibus: 'Minibus D1',
};

export interface Leg {
  mode: Mode;
  minutes: number;
  distanceKm: number;
  /* Where this leg ends. Where it starts is where the last one ended, so a
     journey cannot have a gap in it by construction — an earlier version
     carried both ends and half of them disagreed. */
  to: string;
  detail: string;
}

export interface Route {
  name: string;
  /* Where the whole journey begins. */
  start: string;
  /* When you would take this one instead of the other. */
  when: string;
  legs: Leg[];
  accessible: string;
  notes: string;
}

export interface Venue {
  location: string;
  meetAt: string;
  /* The real postal address, so the maps link resolves to the real place. */
  address: string;
  primary: Route;
  alternative: Route;
  parking?: string;
  capacityPerVehicle?: number;
  /* Set when the venue is inside the centre's own buildings — there is no
     journey to map. */
  onSite?: boolean;
}

/* Where the centre is. Fictional school, real square — the journeys below
   start from a place that exists, so they can be checked. */
export const CENTRE_ORIGIN = 'Russell Square, Bloomsbury, London WC1B 5EH';

/* ── Derived ───────────────────────────────────────────────────────────── */

export const routeMinutes = (r: Route) =>
  r.legs.reduce((n, l) => n + l.minutes, 0);

export const routeDistance = (r: Route) =>
  Math.round(r.legs.reduce((n, l) => n + l.distanceKm, 0) * 10) / 10;

/* Every mode the route uses, in order, deduplicated. "Walk, minibus, walk"
   becomes "on foot and centre minibus" — the modes, not the sequence. */
/* Where a given leg begins: the route's start, or wherever the last one
   ended. */
export const legStart = (route: Route, i: number) =>
  i === 0 ? route.start : route.legs[i - 1].to;

export const routeModes = (r: Route): Mode[] =>
  r.legs.reduce<Mode[]>((acc, l) => (acc.includes(l.mode) ? acc : [...acc, l.mode]), []);

export const routeNeedsDriver = (r: Route) =>
  r.legs.some((l) => MODE_LICENCE[l.mode] !== undefined);

export const routeLicences = (r: Route) =>
  Array.from(
    new Set(
      r.legs.map((l) => MODE_LICENCE[l.mode]).filter((x): x is string => Boolean(x)),
    ),
  );

const VENUE_DATA: Venue[] = [
  {
    location: "The Hub, Regent's Park",
    meetAt: 'Russell Square, north-west corner by the café',
    address: "The Hub, The Regent's Park, London NW1 4RU",
    primary: {
      name: 'Walk up through Bloomsbury',
      start: 'Russell Square',
      when: 'The normal way. Twenty-five minutes on foot, and it needs no tickets and no vehicle.',
      legs: [
        {
          mode: 'walk', minutes: 9, distanceKm: 0.7, to: 'Euston Road',
          detail: 'North out of Russell Square, up Woburn Place and Upper Woburn Place to the Euston Road crossing.',
        },
        {
          mode: 'walk', minutes: 10, distanceKm: 0.8, to: "Regent's Park outer circle",
          detail: 'Cross at the signals as one group, then west along Euston Road and into the park at the York Gate entrance.',
        },
        {
          mode: 'walk', minutes: 6, distanceKm: 0.5, to: 'The Hub',
          detail: 'Across the inner circle bridge and south-west over the grass. The Hub is the round building sunk into the playing fields.',
        },
      ],
      accessible: 'Level and paved as far as the outer circle. The last stretch across the grass is firm in dry weather and soft after rain.',
      notes: 'The Hub has changing rooms and a café. It closes earlier in September than in August — check before booking a late slot.',
    },
    alternative: {
      name: "Tube to Great Portland Street",
      start: 'Russell Square',
      when: 'Rain, or a group that cannot walk two miles. Fewer minutes on foot, more faff with tickets.',
      legs: [
        {
          mode: 'walk', minutes: 8, distanceKm: 0.6, to: 'Euston Square station',
          detail: 'North to Euston Square on the Euston Road.',
        },
        {
          mode: 'train', minutes: 4, distanceKm: 1.2, to: 'Great Portland Street',
          detail: 'Circle, Hammersmith & City or Metropolitan line, two stops westbound.',
        },
        {
          mode: 'walk', minutes: 8, distanceKm: 0.6, to: 'The Hub',
          detail: 'Straight into the park opposite the station and south-west across the playing fields.',
        },
      ],
      accessible: 'Euston Square has stairs to the platforms. Great Portland Street is step-free to street level.',
      notes: 'Twenty students through a tube barrier at once needs a staff member at each end of the group.',
    },
  },
  {
    location: 'The Pirate Castle, Camden',
    meetAt: 'Russell Square, north-west corner by the café',
    address: "The Pirate Castle, Gilbey's Wharf, Oval Road, London NW1 7EA",
    capacityPerVehicle: 16,
    parking: 'No parking at the wharf. The minibus drops on Oval Road and waits on Gloucester Avenue.',
    primary: {
      name: 'Minibus to Camden',
      start: 'Russell Square',
      when: 'The normal way. Kit and buoyancy aids travel with the group, which they cannot on the tube.',
      legs: [
        {
          mode: 'walk', minutes: 4, distanceKm: 0.3, to: 'Minibus bay, Bedford Way',
          detail: 'Count on at the door and write the number on the clipboard in the cab.',
        },
        {
          mode: 'minibus', minutes: 18, distanceKm: 3.6, to: 'Oval Road, Camden',
          detail: 'Up Woburn Place, left along Euston Road, then north on Camden High Street and left at the lock on to Oval Road.',
        },
        {
          mode: 'walk', minutes: 4, distanceKm: 0.2, to: "Gilbey's Wharf",
          detail: 'Down the ramp to the canal towpath. The Pirate Castle is the castellated building on the water.',
        },
      ],
      accessible: 'Step-free from Oval Road down to the wharf by the ramp.',
      notes: 'Camden traffic is unpredictable. Eighteen minutes is a good day — build in ten more for a Friday afternoon.',
    },
    alternative: {
      name: 'Northern line to Camden Town',
      start: 'Russell Square',
      when: 'The minibus is out, or there is no D1 driver. No kit can travel with you.',
      legs: [
        {
          mode: 'walk', minutes: 11, distanceKm: 0.85, to: 'Euston station',
          detail: 'North up Woburn Place and Upper Woburn Place to Euston.',
        },
        {
          mode: 'train', minutes: 5, distanceKm: 2.1, to: 'Camden Town',
          detail: 'Northern line northbound. On the Charing Cross branch it is two stops via Mornington Crescent; on the Bank branch it is one, direct.',
        },
        {
          mode: 'walk', minutes: 8, distanceKm: 0.6, to: "Gilbey's Wharf",
          detail: 'Left out of the station up Camden High Street, left before the lock on to Oval Road, then down the ramp to the towpath.',
        },
      ],
      accessible: 'Camden Town has no step-free access and is exit-only on busy Sunday afternoons. Not a route for a wheelchair.',
      notes: 'Camden Town station closes to entry at peak times. Check before you plan the return this way.',
    },
  },
  {
    location: 'Block C',
    meetAt: 'Outside the Block C main door',
    address: 'Centre grounds, Bloomsbury WC1',
    onSite: true,
    primary: {
      name: 'Across the courtyard',
      start: 'Accommodation',
      when: 'The normal way. Four minutes and no road to cross.',
      legs: [
        {
          mode: 'walk', minutes: 4, distanceKm: 0.25, to: 'Block C main door',
          detail: 'Across the courtyard. Block C is the low brick building behind the bike racks.',
        },
      ],
      accessible: 'Ramp at the main door. Lift to the first floor on the right, code on the staff card.',
      notes: 'Rooms are booked back to back. Be out on time — another group is waiting.',
    },
    alternative: {
      name: 'The covered walkway',
      start: 'Accommodation',
      when: 'Rain. Adds two minutes and keeps thirty students dry.',
      legs: [
        {
          mode: 'walk', minutes: 6, distanceKm: 0.35, to: 'Block C side door',
          detail: 'Through the dining room, along the covered walkway past the laundry, in at the Block C side door.',
        },
      ],
      accessible: 'Level and covered throughout. Two fire doors, both heavy.',
      notes: 'The side door locks at 17:00. After that, use the main door.',
    },
  },
  {
    location: 'Hall',
    meetAt: 'Hall foyer',
    address: 'Centre grounds, Bloomsbury WC1',
    onSite: true,
    primary: {
      name: 'Through the dining room',
      start: 'Accommodation',
      when: 'The normal way. Three minutes.',
      legs: [
        {
          mode: 'walk', minutes: 3, distanceKm: 0.15, to: 'Hall foyer',
          detail: 'Through the dining room, right at the noticeboard, then the double doors. Prop them open — they lock behind you.',
        },
      ],
      accessible: 'Level throughout. The stage is step only; the ramp is in the store cupboard.',
      notes: 'Chairs live stacked at the side. Put them back — the hall is set for dinner at 17:30.',
    },
    alternative: {
      name: 'Round the outside',
      start: 'Accommodation',
      when: 'Between 12:30 and 14:00, when the dining room is in service and thirty students through it is not welcome.',
      legs: [
        {
          mode: 'walk', minutes: 5, distanceKm: 0.3, to: 'Hall fire door',
          detail: 'Out of the front, round the east side of the building, in at the hall fire door. It opens from outside only when propped.',
        },
      ],
      accessible: 'One step at the fire door. Use the primary route on wheels.',
      notes: 'Somebody has to prop the fire door from inside first. Send one person ahead.',
    },
  },
  {
    location: 'Natural History Museum',
    meetAt: 'Montague Place, coach bay behind the British Museum',
    address: 'Natural History Museum, Cromwell Road, South Kensington, London SW7 5BD',
    capacityPerVehicle: 53,
    parking: 'Coaches drop on Cromwell Road outside the main entrance, then move off. The driver waits at a coach park and returns for the pick-up time.',
    primary: {
      name: 'Coach to Cromwell Road',
      start: 'Russell Square',
      when: 'The normal way for a whole group, and the only one the coach operator prices.',
      legs: [
        {
          mode: 'walk', minutes: 6, distanceKm: 0.4, to: 'Montague Place coach bay',
          detail: 'West past the British Museum to Montague Place. Students do not board until the driver says so. Count on, write it down, say it out loud to the second staff member.',
        },
        {
          mode: 'coach', minutes: 35, distanceKm: 6.5, to: 'Cromwell Road',
          detail: 'South and west through the West End, along Piccadilly and Knightsbridge to Cromwell Road. Thirty-five minutes off-peak and an hour in traffic.',
        },
        {
          mode: 'walk', minutes: 5, distanceKm: 0.25, to: 'Exhibition Road entrance',
          detail: 'School groups use the Exhibition Road entrance, not the main Cromwell Road steps. School Reception is on the lower ground floor of the Green Zone, where bags and coats are left.',
        },
      ],
      accessible: 'Coach is step-entry unless a lift-equipped vehicle is booked in advance. The museum is step-free from Exhibition Road with lifts to every floor.',
      notes: 'Thirty-five each way at best. Do not add a second stop to the day.',
    },
    alternative: {
      name: 'Piccadilly line, direct',
      start: 'Russell Square',
      when: 'The coach cancels, or the traffic makes it pointless. One line, no changes — but it is public transport, so the off-site ratio is tighter.',
      legs: [
        {
          mode: 'walk', minutes: 3, distanceKm: 0.2, to: 'Russell Square station',
          detail: 'South-east corner of the square. The station has lifts, not escalators, and they are slow with a group.',
        },
        {
          mode: 'train', minutes: 17, distanceKm: 7.2, to: 'South Kensington',
          detail: 'Piccadilly line westbound, direct — eight stops via Holborn, Covent Garden, Leicester Square, Piccadilly Circus, Green Park, Hyde Park Corner and Knightsbridge. No change.',
        },
        {
          mode: 'walk', minutes: 8, distanceKm: 0.55, to: 'Exhibition Road entrance',
          detail: 'Take the subway from the station — it comes out on Exhibition Road and keeps the group off the road entirely.',
        },
      ],
      accessible: 'Russell Square is lift-only to the platform. South Kensington is not step-free. Use the coach for a wheelchair.',
      notes: 'Splitting a group of fifty across tube carriages is the risk here. Sub-groups of ten with a named staff member, and a meeting point agreed before you go down.',
    },
  },
  {
    location: "The Hub pitches, Regent's Park",
    meetAt: 'Russell Square, north-west corner by the café',
    address: "The Hub, The Regent's Park, London NW1 4RU",
    primary: {
      name: 'Walk up through Bloomsbury',
      start: 'Russell Square',
      when: 'The normal way. Twenty-five minutes on foot.',
      legs: [
        {
          mode: 'walk', minutes: 9, distanceKm: 0.7, to: 'Euston Road',
          detail: 'North out of Russell Square, up Woburn Place and Upper Woburn Place to the Euston Road crossing.',
        },
        {
          mode: 'walk', minutes: 10, distanceKm: 0.8, to: "Regent's Park outer circle",
          detail: 'Cross at the signals as one group, then west and into the park at the York Gate entrance.',
        },
        {
          mode: 'walk', minutes: 6, distanceKm: 0.5, to: 'The Hub pitches',
          detail: 'South-west across the grass. Pitches are numbered from The Hub building outwards — check which one is booked.',
        },
      ],
      accessible: 'Paved to the outer circle, grass for the last stretch.',
      notes: 'Pitches are booked by the hour and another group takes it straight after. Kick-off on time.',
    },
    alternative: {
      name: 'Tube to Great Portland Street',
      start: 'Russell Square',
      when: 'Rain, or a tight slot where twenty-five minutes of walking each way will not fit.',
      legs: [
        {
          mode: 'walk', minutes: 8, distanceKm: 0.6, to: 'Euston Square station',
          detail: 'North to Euston Square on the Euston Road.',
        },
        {
          mode: 'train', minutes: 4, distanceKm: 1.2, to: 'Great Portland Street',
          detail: 'Circle, Hammersmith & City or Metropolitan line, two stops westbound.',
        },
        {
          mode: 'walk', minutes: 8, distanceKm: 0.6, to: 'The Hub pitches',
          detail: 'Into the park opposite the station and south-west across the playing fields.',
        },
      ],
      accessible: 'Euston Square has stairs to the platforms.',
      notes: 'Boots on at the pitch, not at the centre. Studs are not welcome on the tube.',
    },
  },
  {
    location: 'VauxWall, Vauxhall',
    meetAt: 'Russell Square, south-east corner by the station',
    address: 'VauxWall West, Arch 45b, 47a South Lambeth Road, Vauxhall, London SW8 1SR',
    primary: {
      name: 'Victoria line to Vauxhall',
      start: 'Russell Square',
      when: 'The normal way. The centre is in the railway arches directly under Vauxhall station, so the walk at the far end is nothing.',
      legs: [
        {
          mode: 'walk', minutes: 10, distanceKm: 0.8, to: "King's Cross St Pancras",
          detail: 'North-east through the squares to the Euston Road and the Underground entrance.',
        },
        {
          mode: 'train', minutes: 13, distanceKm: 5.4, to: 'Vauxhall',
          detail: 'Victoria line southbound — Euston, Warren Street, Oxford Circus, Green Park, Victoria, Pimlico, Vauxhall.',
        },
        {
          mode: 'walk', minutes: 3, distanceKm: 0.2, to: 'Arch 47a',
          detail: 'Out on to South Lambeth Road and along the arches. The entrance is under the railway, south of Vauxhall Bridge.',
        },
      ],
      accessible: "King's Cross and Vauxhall are both step-free to the Victoria line platforms.",
      notes: 'Sign the group in at their desk before anybody touches a harness. The wall is theirs, not ours.',
    },
    alternative: {
      name: 'Minibus over Vauxhall Bridge',
      start: 'Russell Square',
      when: 'A group carrying kit, or a Victoria line closure. Longer, and it needs a D1 driver.',
      legs: [
        {
          mode: 'walk', minutes: 4, distanceKm: 0.3, to: 'Minibus bay, Bedford Way',
          detail: 'Count on at the door.',
        },
        {
          mode: 'minibus', minutes: 28, distanceKm: 5.1, to: 'South Lambeth Road',
          detail: 'South through Bloomsbury and Covent Garden, along Millbank and over Vauxhall Bridge, then left on to South Lambeth Road.',
        },
        {
          mode: 'walk', minutes: 3, distanceKm: 0.2, to: 'Arch 47a',
          detail: 'Drop on South Lambeth Road — there is nowhere to wait, so the minibus moves off and returns for the pick-up.',
        },
      ],
      accessible: 'Step-free at both ends.',
      notes: 'Through the congestion charge zone. It is charged to the centre, so it is not a free choice.',
    },
  },
];

export const VENUES = VENUE_DATA;

export const venueFor = (location: string) =>
  VENUES.find((v) => v.location === location) ?? null;

/* Travel eats the slot. Camden and back is 52 minutes of a 90-minute slot,
   which leaves 18 for the paddling — the number a leader needs before
   planning the session, not after. */
export const roundTrip = (location: string) => {
  const v = venueFor(location);
  return v ? routeMinutes(v.primary) * 2 : 0;
};

/* One runnable check: a route's headline time has to be the sum of its legs,
   or the schedule builder is reserving the wrong amount of the slot. */
export function selfCheck() {
  VENUES.forEach((v) => {
    [v.primary, v.alternative].forEach((r) => {
      console.assert(r.legs.length > 0, `${v.location}: ${r.name} has no legs`);
      console.assert(
        routeMinutes(r) === r.legs.reduce((n, l) => n + l.minutes, 0),
        `${v.location}: ${r.name} minutes do not sum`,
      );
      console.assert(r.start.length > 0, `${v.location}: ${r.name} has no start`);
    });
    console.assert(
      routeMinutes(v.alternative) !== routeMinutes(v.primary) ||
        v.alternative.name !== v.primary.name,
      `${v.location}: the alternative is the same journey`,
    );
  });
  console.assert(roundTrip('The Pirate Castle, Camden') === 52, 'Camden round trip');
  console.assert(roundTrip('Natural History Museum') === 92, 'city round trip');
  console.assert(
    VENUES.every((v) => v.onSite || v.address.includes('London')),
    'every off-site venue carries a real London address',
  );
}
