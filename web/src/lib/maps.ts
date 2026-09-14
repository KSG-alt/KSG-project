/* ── Maps ─────────────────────────────────────────────────────────────────
   A link, not an embed.

   The Google Maps Embed and Static APIs both need an API key and a network
   request, and the standalone demo is a single file that has to open with no
   network at all — build-demo.mjs fails the build if anything external
   survives inlining. A directions URL needs neither: it is a plain link the
   browser opens in Google Maps, with the real addresses in it.

   The addresses are real central London places, so these links resolve to the
   real journey. See data/venues.ts.
   ──────────────────────────────────────────────────────────────────────── */

import {
  CENTRE_ORIGIN, routeModes, type Mode, type Route, type Venue,
} from '../data/venues';

/* Google's travelmode parameter takes four values. A centre minibus and a
   hired coach are both driving; a tube journey is transit. */
const TRAVEL_MODE: Record<Mode, 'walking' | 'driving' | 'transit'> = {
  walk: 'walking',
  minibus: 'driving',
  coach: 'driving',
  train: 'transit',
  ferry: 'transit',
};

/* The mode that decides the map: the longest leg's, because that is the one
   the route is actually about. */
export function dominantMode(route: Route): Mode {
  return route.legs.reduce((a, b) => (b.minutes > a.minutes ? b : a)).mode;
}

export function directionsUrl(venue: Venue, route: Route) {
  const mode = TRAVEL_MODE[dominantMode(route)];
  const params = new URLSearchParams({
    api: '1',
    origin: CENTRE_ORIGIN,
    destination: venue.address,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/* A pin on the venue itself, for the leader who only needs to find the door. */
export function placeUrl(venue: Venue) {
  const params = new URLSearchParams({ api: '1', query: venue.address });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export const mappable = (venue: Venue) => !venue.onSite;

export const modeSummary = (route: Route) =>
  routeModes(route)
    .map((m) => (m === 'walk' ? 'on foot' : m === 'train' ? 'tube' : m))
    .join(', then ');
