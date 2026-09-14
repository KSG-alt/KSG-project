/* ── Rooming ──────────────────────────────────────────────────────────────
   Allocating beds by hand is an evening's work that gets redone every time a
   booking changes, and the thing that actually matters about it is invisible
   in a spreadsheet: who ends up sharing with whom.

   Four rules, in the order a centre cares about them:

   1. Band. A room holds one age band. Existing rule, and a hard one.
   2. Language. A language school puts students of different first languages
      together on purpose — two Spanish speakers in a room speak Spanish for
      three weeks and go home no better. This is the rule most worth
      automating because it is the one nobody has time to check by hand.
   3. Dates. A bed is only occupied while its student is on site. Two students
      whose stays do not overlap can share the same bed across a season, which
      is most of a centre's capacity and is invisible to first-fit.
   4. Age spread. Inside a band, keep the gap small where there is a choice.

   Gender is deliberately absent. Whether a centre rooms by gender, and how,
   is a per-centre configuration Kebba specifies in October — inventing a
   policy here would put a guess into a safeguarding-adjacent decision. The
   rule exists in the configuration as unset, and the screen says so.

   This proposes. A person applies it. (PRODUCT.md principle 4.)
   ──────────────────────────────────────────────────────────────────────── */

import {
  ROOMS, type AgeBand, type Room, type Student,
} from '../data/seed';

export interface RoomingRules {
  /* false — the default and the point — means avoid putting two speakers of
     the same first language in a room. */
  sameLanguageTogether: boolean;
  /* How hard rule 2 is. 'avoid' scores against it; 'never' refuses. */
  languageRule: 'avoid' | 'never';
  /* Years between the youngest and oldest in a room, where there is a choice. */
  maxAgeSpread: number;
  /* Let a bed take a second student once the first has left. */
  reuseBeds: boolean;
  /* Unset on purpose. See the note above. */
  genderPolicy: 'not configured';
}

export const DEFAULT_RULES: RoomingRules = {
  sameLanguageTogether: false,
  languageRule: 'avoid',
  maxAgeSpread: 2,
  reuseBeds: true,
  genderPolicy: 'not configured',
};

export interface Move {
  studentId: string;
  name: string;
  fromRoomId: string | null;
  toRoomId: string;
  bed: number;
  /* Why this room, in a sentence a person can check. */
  because: string[];
}

export interface Unplaced {
  studentId: string;
  name: string;
  band: AgeBand;
  why: string;
}

export interface Warning {
  roomId: string;
  problem: string;
}

export interface Proposal {
  moves: Move[];
  unplaced: Unplaced[];
  warnings: Warning[];
  /* Beds that hold more than one student across the season because their
     stays do not overlap. The capacity a first-fit allocator throws away. */
  sharedBeds: number;
  bedsUsed: number;
  bedsTotal: number;
  languagePairs: number;
}

const overlaps = (a: Student, b: Student) =>
  a.arrival <= b.leaving && b.arrival <= a.leaving;

/* Who is in this bed at any point that overlaps the candidate's stay. */
function bedTaken(
  occupants: Student[],
  candidate: Student,
  reuseBeds: boolean,
) {
  if (!reuseBeds) return occupants.length > 0;
  return occupants.some((o) => overlaps(o, candidate));
}

/* Mid-season you fill the gaps; before the season you plan the lot. Moving a
   settled student is a real disruption — they have unpacked, they have made a
   friend in the next bed — so the default leaves anybody who already has a bed
   exactly where they are and only places the students who have none. */
export type Mode = 'fill-gaps' | 'from-scratch';

export function propose(
  students: Student[],
  rules: RoomingRules = DEFAULT_RULES,
  rooms: Room[] = ROOMS,
  mode: Mode = 'fill-gaps',
): Proposal {
  /* Placed so far: room -> bed -> the students in it. Rebuilt from scratch so
     a proposal is a whole answer, not a patch on the last one. */
  const placed = new Map<string, Map<number, Student[]>>();
  const roomOf = (id: string) => placed.get(id) ?? new Map<number, Student[]>();

  const moves: Move[] = [];
  const unplaced: Unplaced[] = [];

  /* In fill-gaps mode the students who already have a bed are put back into
     the map first, unmoved, so everything else is planned around them. */
  const settled = mode === 'fill-gaps' ? students.filter((s) => s.roomId && s.bed) : [];
  settled.forEach((s) => {
    const beds = placed.get(s.roomId!) ?? new Map<number, Student[]>();
    beds.set(s.bed, [...(beds.get(s.bed) ?? []), s]);
    placed.set(s.roomId!, beds);
    moves.push({
      studentId: s.id,
      name: `${s.forename} ${s.surname}`,
      fromRoomId: s.roomId,
      toRoomId: s.roomId!,
      bed: s.bed,
      because: ['already settled here'],
    });
  });

  const toPlace =
    mode === 'fill-gaps' ? students.filter((s) => !s.roomId || !s.bed) : students;

  /* Longest stay first, then earliest arrival. A long stay is the hardest to
     fit around, so it goes down before the short ones that can fill the gaps
     it leaves. */
  const order = [...toPlace].sort((a, b) => {
    const span = (s: Student) =>
      new Date(s.leaving).getTime() - new Date(s.arrival).getTime();
    return span(b) - span(a) || a.arrival.localeCompare(b.arrival);
  });

  const byBand = new Map<AgeBand, Room[]>();
  rooms.forEach((r) => {
    byBand.set(r.band, [...(byBand.get(r.band) ?? []), r]);
  });

  order.forEach((s) => {
    const candidates = byBand.get(s.band) ?? [];
    if (!candidates.length) {
      unplaced.push({
        studentId: s.id,
        name: `${s.forename} ${s.surname}`,
        band: s.band,
        why: `No rooms exist for the ${s.band} band.`,
      });
      return;
    }

    let best: { room: Room; bed: number; score: number; because: string[] } | null = null;

    for (const room of candidates) {
      const beds = roomOf(room.id);
      /* Everyone whose stay overlaps this one, anywhere in the room. */
      const roomMates = [...beds.values()]
        .flat()
        .filter((o) => overlaps(o, s));

      const sameLanguage = roomMates.filter(
        (o) => o.guardian.language === s.guardian.language,
      );
      if (
        !rules.sameLanguageTogether &&
        rules.languageRule === 'never' &&
        sameLanguage.length > 0
      ) {
        continue;
      }

      const ages = [...roomMates.map((o) => o.age), s.age];
      const spread = Math.max(...ages) - Math.min(...ages);

      for (let bed = 1; bed <= room.beds; bed++) {
        const inBed = beds.get(bed) ?? [];
        if (bedTaken(inBed, s, rules.reuseBeds)) continue;

        const because: string[] = [];
        let score = 0;

        if (!rules.sameLanguageTogether) {
          if (sameLanguage.length === 0) {
            score += 60;
            if (roomMates.length)
              because.push(
                `no one in the room speaks ${s.guardian.language}`,
              );
          } else {
            score -= 45 * sameLanguage.length;
          }
        }

        if (spread <= rules.maxAgeSpread) {
          score += 20;
          if (roomMates.length) because.push(`ages within ${spread} year${spread === 1 ? '' : 's'}`);
        } else {
          score -= (spread - rules.maxAgeSpread) * 8;
        }

        /* Pack rooms rather than scatter students across empty ones — a
           half-empty house is harder to supervise at night. */
        if (roomMates.length > 0) score += 8;

        /* A bed that already held someone who has left is capacity found for
           nothing, so prefer it. */
        if (inBed.length > 0) {
          score += 14;
          because.push(
            `bed ${bed} is free from ${inBed[inBed.length - 1].leaving}`,
          );
        }

        if (!best || score > best.score) {
          best = { room, bed, score, because };
        }
      }
    }

    if (!best) {
      unplaced.push({
        studentId: s.id,
        name: `${s.forename} ${s.surname}`,
        band: s.band,
        why: `Every ${s.band} bed is taken for ${s.arrival} to ${s.leaving}.`,
      });
      return;
    }

    const beds = placed.get(best.room.id) ?? new Map<number, Student[]>();
    beds.set(best.bed, [...(beds.get(best.bed) ?? []), s]);
    placed.set(best.room.id, beds);

    if (!best.because.length) best.because.push('first free bed in the band');

    moves.push({
      studentId: s.id,
      name: `${s.forename} ${s.surname}`,
      fromRoomId: s.roomId,
      toRoomId: best.room.id,
      bed: best.bed,
      because: best.because,
    });
  });

  /* What the answer looks like once it is built. */
  const warnings: Warning[] = [];
  let sharedBeds = 0;
  let bedsUsed = 0;
  let languagePairs = 0;

  placed.forEach((beds, roomId) => {
    beds.forEach((inBed) => {
      bedsUsed += 1;
      if (inBed.length > 1) sharedBeds += 1;
    });
    const all = [...beds.values()].flat();
    /* Only people actually in the room at the same time can clash. */
    all.forEach((a, i) => {
      all.slice(i + 1).forEach((b) => {
        if (!overlaps(a, b)) return;
        if (a.guardian.language === b.guardian.language) {
          languagePairs += 1;
          if (!rules.sameLanguageTogether) {
            warnings.push({
              roomId,
              problem: `${a.forename} ${a.surname} and ${b.forename} ${b.surname} both speak ${a.guardian.language}.`,
            });
          }
        }
      });
    });
  });

  return {
    moves,
    unplaced,
    warnings,
    sharedBeds,
    bedsUsed,
    bedsTotal: rooms.reduce((n, r) => n + r.beds, 0),
    languagePairs,
  };
}

/* Only the moves that actually change something. A proposal that re-states
   where somebody already sleeps is noise, and moving a student who is already
   on site is a real disruption, so it is counted separately. */
export const changed = (p: Proposal, students: Student[]) =>
  p.moves.filter((m) => {
    const s = students.find((x) => x.id === m.studentId);
    return !s || s.roomId !== m.toRoomId || s.bed !== m.bed;
  });

/* One runnable check on the two rules that would fail silently: a bed must
   never hold two students at once, and a room must never hold two speakers of
   one language when the rule is set to never. */
export function selfCheck() {
  const make = (
    id: string, age: number, language: string, arrival: string, leaving: string,
  ): Student =>
    ({
      id, forename: 'T', surname: id, dob: '2014-01-01', age,
      band: '12–14' as AgeBand, groupId: 'g-harrier', arrival, leaving,
      country: 'X', docs: { medical: 'in', consent: 'in', passport: 'in' },
      balancePence: 0, paidPence: 0, roomId: null, bed: 0, dietary: null,
      medical: null,
      guardian: {
        name: 'G', relationship: 'Parent', phone: '', altPhone: '', email: '',
        language, address: '', emergencyName: '', emergencyPhone: '',
        consentToTravel: true,
      },
    }) as Student;

  const rooms: Room[] = [
    { id: 'r1', block: 'B', floor: 1, number: '1.01', beds: 2, band: '12–14', wardenId: null },
  ];

  /* Two stays that do not overlap should share one bed. */
  const sequential = propose(
    [
      make('a', 12, 'Spanish', '2027-07-01', '2027-07-14'),
      make('b', 12, 'Spanish', '2027-07-15', '2027-07-28'),
    ],
    { ...DEFAULT_RULES, reuseBeds: true },
    rooms,
  );
  console.assert(sequential.sharedBeds === 1, 'a freed bed should be reused');
  console.assert(sequential.unplaced.length === 0, 'both should fit');
  console.assert(
    sequential.languagePairs === 0,
    'stays that never overlap are not a language clash',
  );

  /* Overlapping stays must not share a bed. */
  const together = propose(
    [
      make('a', 12, 'Spanish', '2027-07-01', '2027-07-28'),
      make('b', 12, 'Italian', '2027-07-01', '2027-07-28'),
    ],
    DEFAULT_RULES,
    rooms,
  );
  console.assert(together.sharedBeds === 0, 'overlapping stays cannot share a bed');
  console.assert(together.bedsUsed === 2, 'two beds for two overlapping stays');

  /* With the rule set to never, a third same-language student has nowhere. */
  const strict = propose(
    [
      make('a', 12, 'Spanish', '2027-07-01', '2027-07-28'),
      make('b', 12, 'Spanish', '2027-07-01', '2027-07-28'),
    ],
    { ...DEFAULT_RULES, languageRule: 'never' },
    rooms,
  );
  console.assert(
    strict.unplaced.length === 1,
    'never means never, even when a bed is free',
  );
  console.assert(strict.warnings.length === 0, 'nothing placed, nothing to warn about');

  /* Fill-gaps must not move anybody who already has a bed. */
  const settledIn = make('a', 12, 'Spanish', '2027-07-01', '2027-07-28');
  settledIn.roomId = 'r1';
  settledIn.bed = 2;
  const newcomer = make('b', 12, 'Italian', '2027-07-01', '2027-07-28');
  const gaps = propose([settledIn, newcomer], DEFAULT_RULES, rooms, 'fill-gaps');
  const moved = gaps.moves.find((m) => m.studentId === 'a');
  console.assert(
    moved?.toRoomId === 'r1' && moved?.bed === 2,
    'fill-gaps left a settled student where they were',
  );
  console.assert(
    gaps.moves.find((m) => m.studentId === 'b')?.bed === 1,
    'the newcomer took the free bed, not the taken one',
  );
  console.assert(changed(gaps, [settledIn, newcomer]).length === 1, 'only one real change');
}
