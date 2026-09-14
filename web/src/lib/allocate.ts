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
  /* Plan one band, or one house, without touching the rest. */
  scope?: { bands?: AgeBand[]; blocks?: string[] },
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

  const inScope = (s: Student) =>
    !scope?.bands?.length || scope.bands.includes(s.band);

  const toPlace = (
    mode === 'fill-gaps' ? students.filter((s) => !s.roomId || !s.bed) : students
  ).filter(inScope);

  /* Anything out of scope keeps its bed and is planned around, exactly as a
     settled student is. */
  if (scope?.bands?.length && mode === 'from-scratch') {
    students
      .filter((s) => !inScope(s) && s.roomId && s.bed)
      .forEach((s) => {
        const beds = placed.get(s.roomId!) ?? new Map<number, Student[]>();
        beds.set(s.bed, [...(beds.get(s.bed) ?? []), s]);
        placed.set(s.roomId!, beds);
        moves.push({
          studentId: s.id,
          name: `${s.forename} ${s.surname}`,
          fromRoomId: s.roomId,
          toRoomId: s.roomId!,
          bed: s.bed,
          because: ['outside what you asked me to plan'],
        });
      });
  }

  /* Longest stay first, then earliest arrival. A long stay is the hardest to
     fit around, so it goes down before the short ones that can fill the gaps
     it leaves. */
  const order = [...toPlace].sort((a, b) => {
    const span = (s: Student) =>
      new Date(s.leaving).getTime() - new Date(s.arrival).getTime();
    return span(b) - span(a) || a.arrival.localeCompare(b.arrival);
  });

  const usable = scope?.blocks?.length
    ? rooms.filter((r) => scope.blocks!.includes(r.block))
    : rooms;

  const byBand = new Map<AgeBand, Room[]>();
  usable.forEach((r) => {
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

  /* The parser must not turn "don't worry about language" into "never". */
  const blocks = ['Willow House', 'Cedar House', 'Rowan House'];
  const strictSpec = parseRoomingSpec(
    'never put two students with the same language in a room',
    DEFAULT_RULES,
    blocks,
  );
  console.assert(strictSpec.rules.languageRule === 'never', 'never is never');
  console.assert(!strictSpec.rules.sameLanguageTogether, 'never is not allow');

  const loose = parseRoomingSpec("don't worry about language", DEFAULT_RULES, blocks);
  console.assert(loose.rules.sameLanguageTogether, 'ignore means allow');

  const scoped = parseRoomingSpec(
    'replan the 8–11 band from scratch, keep ages within 1 year',
    DEFAULT_RULES,
    blocks,
  );
  console.assert(scoped.mode === 'from-scratch', 'from scratch');
  console.assert(scoped.scope?.bands?.length === 1, 'one band in scope');
  console.assert(scoped.rules.maxAgeSpread === 1, 'age spread read');

  const refused = parseRoomingSpec('room the boys and girls separately', DEFAULT_RULES, blocks);
  console.assert(refused.ignored.length === 1, 'gender is named as out of scope');

  /* The one that matters most: "leave everyone else alone" must never be read
     as a full replan. Getting this wrong moves two hundred settled children. */
  const gentle = parseRoomingSpec(
    'Just fill the gaps, leave everyone else alone',
    DEFAULT_RULES,
    blocks,
  );
  console.assert(gentle.mode === 'fill-gaps', 'leave everyone alone means fill-gaps');
  const alsoGentle = parseRoomingSpec('do not move anyone', DEFAULT_RULES, blocks);
  console.assert(alsoGentle.mode === 'fill-gaps', 'do not move anyone means fill-gaps');
  const bothSaid = parseRoomingSpec(
    'replan everything but leave everyone where they are',
    DEFAULT_RULES,
    blocks,
  );
  console.assert(bothSaid.mode === 'fill-gaps', 'the cautious reading wins a tie');

  const noReuse = parseRoomingSpec(
    'plan the beds without reusing any bed between stays',
    DEFAULT_RULES,
    blocks,
  );
  console.assert(!noReuse.rules.reuseBeds, '"without reusing" turns bed reuse off');

  /* A scoped from-scratch plan must not move anybody outside the scope. */
  const other = make('c', 12, 'French', '2027-07-01', '2027-07-28');
  other.roomId = 'r1';
  other.bed = 1;
  const scopedPlan = propose(
    [other],
    DEFAULT_RULES,
    rooms,
    'from-scratch',
    { bands: ['8–11'] },
  );
  console.assert(
    scopedPlan.moves[0]?.toRoomId === 'r1' && scopedPlan.moves[0]?.bed === 1,
    'a student outside the scope keeps their bed',
  );
}


/* ── Reading a rooming instruction ────────────────────────────────────────
   The rules arrive as a sentence, not a form. This reads the ones a centre
   actually asks for and names anything it could not act on, rather than
   quietly ignoring it and producing a plan that does not match what was
   asked. Same contract as the rota builder's parser. */

export interface ParsedRooming {
  rules: RoomingRules;
  mode: Mode;
  scope?: { bands?: AgeBand[]; blocks?: string[] };
  understood: string[];
  ignored: string[];
}

const BANDS: AgeBand[] = ['8–11', '12–14', '15–17'];

export function parseRoomingSpec(
  text: string,
  current: RoomingRules,
  blocks: string[],
): ParsedRooming {
  const q = text.toLowerCase();
  const rules: RoomingRules = { ...current };
  const understood: string[] = [];
  const ignored: string[] = [];
  let mode: Mode = 'fill-gaps';
  const scope: { bands?: AgeBand[]; blocks?: string[] } = {};

  /* Language, the rule the whole thing exists for. */
  if (/\b(never|no two|not allowed|must not|forbid)\b/.test(q) && /\blanguage|nationality|speak\b/.test(q)) {
    rules.sameLanguageTogether = false;
    rules.languageRule = 'never';
    understood.push('never room two speakers of one language together');
  } else if (/\b(ignore|do ?n.t (worry|care)|never mind|forget)\b/.test(q) && /\blanguage|nationality|speak\b/.test(q)) {
    rules.sameLanguageTogether = true;
    understood.push('ignore first language');
  } else if (/\b(mix|separate|split|different)\b/.test(q) && /\blanguage|nationalit|speak\b/.test(q)) {
    rules.sameLanguageTogether = false;
    rules.languageRule = 'avoid';
    understood.push('mix first languages where possible');
  }

  /* Age spread. */
  const age = /\b(?:age|ages|age gap|spread)\b[^.]{0,24}?(\d)\s*year|within\s*(\d)\s*year/.exec(q);
  if (age) {
    const n = Number(age[1] ?? age[2]);
    if (n >= 1 && n <= 5) {
      rules.maxAgeSpread = n;
      understood.push(`keep ages within ${n} year${n === 1 ? '' : 's'}`);
    }
  } else if (/\bsame age\b|\bclose in age\b/.test(q)) {
    rules.maxAgeSpread = 1;
    understood.push('keep ages within 1 year');
  }

  /* Bed reuse across non-overlapping stays. */
  if (
    /\b(do ?n.t|do not|never|no|without) (reus|re-us|shar|doubl)/.test(q) ||
    /\bone student per bed\b|\bno bed sharing\b/.test(q)
  ) {
    rules.reuseBeds = false;
    understood.push('one student per bed for the whole season');
  } else if (/\b(reuse|re-use|turn over|hot ?bed)\b/.test(q)) {
    rules.reuseBeds = true;
    understood.push('reuse a bed once its student has left');
  }

  /* Which job. Fill-gaps is the safe default, and anything that says "leave
     people alone" is checked FIRST — "leave everyone else alone" contains
     "everyone", and reading that as a full replan would move two hundred
     children who have unpacked. The safe reading wins ties. */
  const holdStill =
    /\bfill (the )?gaps?\b|\bonly the gaps?\b|\bunallocated\b|\bno room\b|\bwithout a bed\b|\bwho is left\b|\b(leave|keep) (everyone|everybody|them|the rest|anyone)\b|\bdo ?n.t move\b|\bdo not move\b|\bnobody moves\b|\bwhere they are\b/.test(
      q,
    );
  const startOver =
    /\bfrom scratch\b|\bstart again\b|\breplan everything\b|\breshuffle\b|\bredo the (whole|entire)\b|\bwhole season\b|\ball of them\b|\bthe lot\b/.test(
      q,
    );

  if (holdStill) {
    mode = 'fill-gaps';
    understood.push('only place students who have no bed, and move nobody else');
  } else if (startOver) {
    mode = 'from-scratch';
    understood.push('replan from scratch, moving people who already have a bed');
  }

  /* Scope. */
  const bands = BANDS.filter((b) => q.includes(b) || q.includes(b.replace('–', '-')));
  if (bands.length) {
    scope.bands = bands;
    understood.push(`${bands.join(' and ')} only`);
  }
  const named = blocks.filter((b) => q.includes(b.toLowerCase()));
  if (named.length) {
    scope.blocks = named;
    understood.push(`${named.join(' and ')} only`);
  }

  /* What a bed planner genuinely cannot do here, named rather than swallowed. */
  const cannot: [RegExp, string][] = [
    [/\b(boys?|girls?|gender|sex|males?|females?|mixed sex)\b/, 'anything by gender — that rule is unset until the centre specifies it in October'],
    [/\b(friends?|together with|next to|requests?|wants? to share)\b/, 'friendship or pairing requests — the roll does not record them'],
    [/\b(floors?|ground floor|upstairs|downstairs|top floor)\b/, 'a preference by floor'],
    [/\b(ensuite|en-suite|bathroom|single room|own room)\b/, 'room type — every room here is a three-bed'],
    [/\b(agent|booking group|school group)\b/, 'keeping an agent\u2019s students together — agents are not on the roll'],
  ];
  cannot.forEach(([re, why]) => {
    if (re.test(q)) ignored.push(why);
  });

  return {
    rules,
    mode,
    scope: scope.bands || scope.blocks ? scope : undefined,
    understood,
    ignored,
  };
}

/* The plan, as sentences. */
export function roomReport(
  p: Proposal,
  real: Move[],
  parsed?: ParsedRooming,
) {
  const lines: string[] = [];
  const disrupted = real.filter((m) => m.fromRoomId).length;

  lines.push(
    `Planned ${p.moves.length} students. ${real.length} would actually change bed` +
      (disrupted ? `, ${disrupted} of them already settled somewhere` : '') +
      '.',
  );

  if (parsed?.understood.length) {
    lines.push('', 'Working to: ' + parsed.understood.join('; ') + '.');
  }

  /* A hard rule that fill-gaps cannot deliver has to say so. Filling the gaps
     never moves a settled student, so violations already on the board survive
     it — reporting the count without the reason reads as the planner having
     ignored the instruction. */
  const wantsSeparation =
    parsed && !parsed.rules.sameLanguageTogether;
  lines.push(
    '',
    p.languagePairs === 0
      ? 'No room has two students sharing a first language.'
      : `${p.languagePairs} rooms still have two students sharing a first language.`,
  );
  if (p.languagePairs > 0 && wantsSeparation && parsed.mode === 'fill-gaps') {
    lines.push(
      'Those are rooms that were already filled that way. Filling the gaps ' +
        'does not move anybody who has a bed — ask me to replan from scratch ' +
        'and it goes to zero, but it will move students who have unpacked.',
    );
  }

  if (p.sharedBeds > 0) {
    lines.push(
      `${p.sharedBeds} beds take a second student once the first has left — capacity you already had.`,
    );
  }

  if (p.unplaced.length) {
    lines.push(
      '',
      `${p.unplaced.length} could not be placed:`,
      ...p.unplaced.slice(0, 5).map((u) => `• ${u.name} — ${u.why}`),
    );
    if (p.unplaced.length > 5) lines.push(`• …and ${p.unplaced.length - 5} more`);
  }

  if (parsed?.ignored.length) {
    lines.push('', 'I could not act on: ' + parsed.ignored.join('; ') + '.');
  }

  lines.push(
    '',
    real.length
      ? 'Nothing has moved. Look down the list and apply it yourself.'
      : 'Nothing to apply — everyone is already where these rules would put them.',
  );
  return lines.join('\n');
}
