/* ── Drafting a day ───────────────────────────────────────────────────────
   The rota builder. It is given a day and a set of specifications, and it
   returns a draft plus an honest report of what it could not satisfy.

   The report is the important half. A generator that silently drops a
   constraint produces a timetable that looks finished and is not, and the
   person who finds out is a group leader standing on a field. So every
   constraint that could not be met comes back named, with the reason.

   PRODUCT.md principle: automate the chase, not the judgement. This drafts;
   a person approves.
   ──────────────────────────────────────────────────────────────────────── */

import {
  ACTIVITIES, GROUPS, SLOTS, SLOT_HOURS, STAFF, STUDENTS, WEEKLY_LIMIT,
  activityById, groupById, isAway, weeklyHours, type Session,
} from '../data/seed';
import { guideFor } from '../data/guides';

const DUTY_ROLES = ['Safeguarding lead', 'Welfare officer'];

export interface Spec {
  /* The day being drafted. Everything else is optional. */
  day: string;
  groupIds?: string[];
  slotStarts?: string[];
  /* Activity ids to use. Empty means anything the centre runs. */
  onlyActivities?: string[];
  avoidActivities?: string[];
  /* One session of this activity per group, if it will fit. */
  requirePerGroup?: string[];
  noRepeatPerGroup?: boolean;
  maxOffSitePerGroup?: number;
  /* Keep sessions a person edited by hand rather than redrafting over them. */
  keepManual?: boolean;
  /* Leave a slot empty rather than staff it badly. */
  allowUnderRatio?: boolean;
}

export interface Unmet {
  where: string;
  problem: string;
}

export interface Draft {
  sessions: Session[];
  made: number;
  replaced: number;
  /* Sessions a person edited by hand and the draft left alone. */
  keptManual: number;
  /* Sessions untouched because the spec did not cover their slot or group. */
  outOfScope: number;
  unmet: Unmet[];
  /* Plain sentences, in the order the change happened. */
  notes: string[];
}

const isOffSite = (activityId: string) => guideFor(activityId)?.offSite ?? false;

/* Nobody types "English lesson" or "Museum excursion". They type English and
   museum, so the parser has to meet them there. */
const ALIASES: Record<string, string[]> = {
  'a-archery': ['archery'],
  'a-kayak': ['kayak', 'kayaking', 'canoe', 'watersports', 'water sports'],
  'a-english': ['english', 'lesson', 'lessons', 'class', 'classes', 'efl'],
  'a-drama': ['drama', 'theatre', 'workshop'],
  'a-museum': ['museum', 'excursion', 'trip', 'city'],
  'a-football': ['football', 'soccer'],
  'a-climbing': ['climbing', 'climb', 'wall'],
};

/* Where an activity happens, so two groups are not sent to the same field in
   the same slot. The draft rota could do that; a centre cannot. */
const venueOf = (activityId: string) => activityById(activityId).location;

function mentioned(q: string) {
  return ACTIVITIES.filter(
    (a) =>
      q.includes(a.name.toLowerCase()) ||
      (ALIASES[a.id] ?? []).some((w) =>
        new RegExp(`\\b${w}\\b`).test(q),
      ),
  );
}

/* Where in the sentence this activity was named, by whichever word matched. */
function whereNamed(q: string, id: string) {
  const a = activityById(id);
  const words = [a.name.toLowerCase(), ...(ALIASES[id] ?? [])];
  for (const w of words) {
    const i = q.indexOf(w);
    if (i >= 0) return { at: i, len: w.length };
  }
  return { at: -1, len: 0 };
}

/* "No kayaking, and English for every group" is two instructions, not one.
   Reading a fixed window of characters around a word carries the "no" from
   one clause into the next and drops English from the day. So the sentence is
   cut into clauses first, and each activity is judged by its own clause. */
function clauseFor(q: string, id: string) {
  const { at } = whereNamed(q, id);
  if (at < 0) return '';
  const cuts = [0];
  const re = /[,;.]|\band\b|\bbut\b|\bthen\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) cuts.push(m.index + m[0].length);
  cuts.push(q.length);
  for (let i = 0; i < cuts.length - 1; i++) {
    if (at >= cuts[i] && at < cuts[i + 1]) return q.slice(cuts[i], cuts[i + 1]);
  }
  return q;
}

export function defaultSpec(day: string): Spec {
  return { day, noRepeatPerGroup: true, maxOffSitePerGroup: 1, keepManual: true };
}

/* ── Parsing a request written by a person ─────────────────────────────────
   The specifications arrive as a sentence, not a form. This reads the ones a
   centre actually asks for and reports anything it did not understand, rather
   than quietly ignoring it. */
export interface Parsed {
  spec: Spec;
  understood: string[];
  ignored: string[];
}

const NUMBER_WORDS: Record<string, number> = {
  no: 0, zero: 0, none: 0, one: 1, two: 2, three: 3, four: 4,
};

export function parseSpec(text: string, day: string): Parsed {
  const q = text.toLowerCase();
  const spec = defaultSpec(day);
  const understood: string[] = [];
  const ignored: string[] = [];

  const named = mentioned(q);

  /* "no kayaking", "without the museum trip", "avoid archery" */
  const avoid = named.filter((a) =>
    /\b(no|not|avoid|without|drop|skip|cancel|except)\b/.test(clauseFor(q, a.id)),
  );
  if (avoid.length) {
    spec.avoidActivities = avoid.map((a) => a.id);
    understood.push(`no ${avoid.map((a) => a.name.toLowerCase()).join(' or ')}`);
  }

  /* "english for every group", "everyone gets an english lesson" */
  const require = named.filter((a) => {
    if (avoid.some((x) => x.id === a.id)) return false;
    return /\b(every group|each group|everyone|all groups|everybody|must|has to|needs|for all)\b/.test(
      clauseFor(q, a.id),
    );
  });
  if (require.length) {
    spec.requirePerGroup = require.map((a) => a.id);
    understood.push(
      `${require.map((a) => a.name.toLowerCase()).join(' and ')} for every group`,
    );
  }

  /* "only archery and football" */
  if (/\bonly\b/.test(q) && !/\b(mornings? only|afternoons? only|on ?site only)\b/.test(q)) {
    const only = named.filter((a) => !avoid.some((x) => x.id === a.id));
    if (only.length) {
      spec.onlyActivities = only.map((a) => a.id);
      understood.push(`only ${only.map((a) => a.name.toLowerCase()).join(', ')}`);
    }
  }

  /* "keep it on site", "no off-site" / "two off-site sessions" */
  if (/\b(on ?site only|keep .*on ?site|no off[- ]site|nothing off[- ]site)\b/.test(q)) {
    spec.maxOffSitePerGroup = 0;
    understood.push('nothing off site');
  } else {
    const m = /\b(no|zero|none|one|two|three|four|\d+)\s+off[- ]site\b/.exec(q);
    if (m) {
      const n = NUMBER_WORDS[m[1]] ?? Number(m[1]);
      if (!Number.isNaN(n)) {
        spec.maxOffSitePerGroup = n;
        understood.push(`at most ${n} off-site session per group`);
      }
    }
  }

  /* "morning only", "afternoon only" */
  if (/\bmornings? only\b|\bjust the morning\b/.test(q)) {
    spec.slotStarts = SLOTS.filter((s) => s.start < '12:00').map((s) => s.start);
    understood.push('mornings only');
  } else if (/\bafternoons? only\b|\bjust the afternoon\b/.test(q)) {
    spec.slotStarts = SLOTS.filter((s) => s.start >= '12:00').map((s) => s.start);
    understood.push('afternoons only');
  }

  /* A named group: "redraft Kestrel", "just for Osprey" */
  const groups = GROUPS.filter((g) => q.includes(g.name.toLowerCase()));
  if (groups.length) {
    spec.groupIds = groups.map((g) => g.id);
    understood.push(`${groups.map((g) => g.name).join(' and ')} only`);
  }

  /* "repeat allowed", "they can do archery twice" */
  if (/\b(repeat|twice|more than once)\b/.test(q)) {
    spec.noRepeatPerGroup = false;
    understood.push('an activity may repeat for a group');
  }

  /* "redo everything", "start from scratch" overrides keeping hand edits. */
  if (/\b(from scratch|everything|whole day|all of it|redo the day|wipe)\b/.test(q)) {
    spec.keepManual = false;
    understood.push('redraft everything, including sessions edited by hand');
  }

  /* Things people ask for that this builder genuinely cannot do. Named, not
     swallowed. */
  const cannot: [RegExp, string][] = [
    [/\bswim(ming)?\b/, 'swimming — not an activity this centre runs'],
    [/\b(evening|night|after dinner)\b/, 'evening sessions — the rota only runs four daytime slots'],
    [/\b(tomorrow|next week|whole week|every day)\b/, 'a day other than the one on screen'],
    [/\b(outdoor|weather|rain|sunny)\b/, 'anything conditional on the weather'],
    [/\b(mix|combine|merge) (the )?groups?\b/, 'mixing groups — a session belongs to one group'],
  ];
  cannot.forEach(([re, why]) => {
    if (re.test(q)) ignored.push(why);
  });

  return { spec, understood, ignored };
}

/* ── The builder ───────────────────────────────────────────────────────── */

export function generate(spec: Spec, all: Session[]): Draft {
  const day = spec.day;
  const groups = spec.groupIds?.length
    ? GROUPS.filter((g) => spec.groupIds!.includes(g.id))
    : GROUPS;
  const slots = spec.slotStarts?.length
    ? SLOTS.filter((s) => spec.slotStarts!.includes(s.start))
    : SLOTS;

  const unmet: Unmet[] = [];
  const notes: string[] = [];

  /* Sessions on other days are untouched. Sessions on this day are replaced
     unless they were edited by hand and the spec says keep those. */
  const otherDays = all.filter((s) => s.day !== day);
  const thisDay = all.filter((s) => s.day === day);
  const inScope = (s: Session) =>
    groups.some((g) => g.id === s.groupId) && slots.some((sl) => sl.start === s.start);
  const keptManual = thisDay.filter(
    (s) => inScope(s) && spec.keepManual === true && s.origin === 'manual',
  );
  const outOfScope = thisDay.filter((s) => !inScope(s));
  const keep = [...keptManual, ...outOfScope];
  const replacedCount = thisDay.length - keep.length;

  /* Whoever is already committed in a slot, including kept sessions, so the
     draft never books somebody into two places at once. */
  const busy = new Map<string, Set<string>>();
  const claim = (start: string) => {
    let set = busy.get(start);
    if (!set) busy.set(start, (set = new Set()));
    return set;
  };
  /* One group per venue per slot. Five groups drafted onto the lower field at
     09:00 is a timetable that reads fine and cannot happen. */
  const venues = new Map<string, Set<string>>();
  const venueClaim = (start: string) => {
    let set = venues.get(start);
    if (!set) venues.set(start, (set = new Set()));
    return set;
  };
  keep.forEach((s) => {
    if (s.status === 'cancelled') return;
    s.staffIds.forEach((id) => claim(s.start).add(id));
    venueClaim(s.start).add(venueOf(s.activityId));
  });

  /* Hours already rota'd this week, so the draft does not push anyone past
     the working-time limit. Counted off the sessions we are keeping. */
  const hours = new Map<string, number>();
  const base = [...otherDays, ...keep];
  STAFF.forEach((s) => hours.set(s.id, weeklyHours(s.id, base)));

  const eligible = (band: string) =>
    STAFF.filter(
      (s) =>
        s.dbs.state === 'cleared' &&
        s.bands.includes(band as never) &&
        !DUTY_ROLES.includes(s.role) &&
        !isAway(s, day),
    );

  const pool = ACTIVITIES.filter((a) => {
    if (spec.onlyActivities?.length) return spec.onlyActivities.includes(a.id);
    if (spec.avoidActivities?.includes(a.id)) return false;
    return true;
  });

  if (!pool.length) {
    unmet.push({
      where: 'The whole day',
      problem: 'Those instructions leave no activity to schedule.',
    });
    return {
      sessions: all,
      made: 0,
      replaced: 0,
      keptManual: keptManual.length,
      outOfScope: outOfScope.length,
      unmet,
      notes,
    };
  }

  const made: Session[] = [];
  let seq = 0;

  const overCapacity = new Set<string>();

  groups.forEach((g, gi) => {
    const headcount = STUDENTS.filter((s) => s.groupId === g.id).length;
    const required = Math.ceil(headcount / g.ratio);
    const used = new Set<string>(
      keep.filter((s) => s.groupId === g.id).map((s) => s.activityId),
    );
    let offSite = keep.filter(
      (s) => s.groupId === g.id && isOffSite(s.activityId),
    ).length;

    /* Anything the spec says every group must have goes in first, or it never
       fits. */
    const wanted = [
      ...(spec.requirePerGroup ?? []).filter((id) => pool.some((a) => a.id === id)),
    ];

    slots.forEach((slot, si) => {
      const taken = claim(slot.start);
      const venueTaken = venueClaim(slot.start);

      const candidates = pool.filter((a) => {
        if (venueTaken.has(a.location)) return false;
        if (spec.noRepeatPerGroup !== false && used.has(a.id)) return false;
        if (
          isOffSite(a.id) &&
          spec.maxOffSitePerGroup !== undefined &&
          offSite >= spec.maxOffSitePerGroup
        ) {
          return false;
        }
        return true;
      });

      /* Required activities first. Then rotate the rest by group and slot, or
         every group gets the same four activities in the same order and the
         whole centre tries to use one field at once. */
      const rest = candidates.filter((a) => !wanted.includes(a.id));
      const offset = rest.length
        ? (gi * 3 + si * 2 + gi) % rest.length
        : 0;
      const ordered = [
        ...candidates.filter((a) => wanted.includes(a.id)),
        ...rest.slice(offset),
        ...rest.slice(0, offset),
      ];

      if (!ordered.length) {
        unmet.push({
          where: `${g.name} at ${slot.start}`,
          problem:
            'Nothing left to schedule that these instructions allow. Left free.',
        });
        return;
      }

      /* Try each candidate until one can be staffed. A session nobody can
         staff is not a session. */
      let placed: Session | null = null;
      const tried: string[] = [];

      for (const a of ordered) {
        const free = eligible(g.band)
          .filter((s) => !taken.has(s.id))
          .filter((s) => (hours.get(s.id) ?? 0) + SLOT_HOURS <= WEEKLY_LIMIT);

        const instructor = a.requiresQual
          ? free.find((s) => s.quals.includes(a.requiresQual!))
          : undefined;

        if (a.requiresQual && !instructor) {
          tried.push(`${a.name} — nobody free holds ${a.requiresQual}`);
          continue;
        }

        /* Spread the load: least rota'd first, so a week's hours come out
           even rather than falling on whoever sorts first. */
        const rest = free
          .filter((s) => s.id !== instructor?.id)
          .sort((x, y) => (hours.get(x.id) ?? 0) - (hours.get(y.id) ?? 0));

        const crew = [...(instructor ? [instructor] : []), ...rest].slice(
          0,
          Math.max(required, 1),
        );

        if (crew.length < required && !spec.allowUnderRatio) {
          tried.push(
            `${a.name} — only ${crew.length} of ${required} staff free at ${slot.start}`,
          );
          continue;
        }

        placed = {
          id: `gen-${day}-${g.id}-${slot.start}-${seq++}`,
          activityId: a.id,
          groupId: g.id,
          day,
          start: slot.start,
          end: slot.end,
          staffIds: crew.map((s) => s.id),
          status: 'scheduled',
          origin: 'ai-draft',
        };
        crew.forEach((s) => {
          taken.add(s.id);
          hours.set(s.id, (hours.get(s.id) ?? 0) + SLOT_HOURS);
        });
        venueTaken.add(a.location);
        used.add(a.id);
        if (isOffSite(a.id)) offSite += 1;
        if (a.capacity < headcount) overCapacity.add(g.name);
        break;
      }

      if (placed) {
        made.push(placed);
      } else {
        unmet.push({
          where: `${g.name} at ${slot.start}`,
          problem: `Left free. ${tried.slice(0, 3).join('; ')}.`,
        });
      }
    });

    /* Anything the spec required that still is not on the day. */
    wanted.forEach((id) => {
      const has = [...made, ...keep].some(
        (s) => s.groupId === g.id && s.activityId === id && s.status !== 'cancelled',
      );
      if (!has) {
        unmet.push({
          where: g.name,
          problem: `No slot could take ${activityById(id).name}.`,
        });
      }
    });
  });

  /* One line, not sixteen. A group being larger than an activity's capacity is
     normal here — it runs in waves — and listing it per session buries the
     things that actually need a decision. */
  if (overCapacity.size) {
    notes.push(
      `${[...overCapacity].join(', ')} ${
        overCapacity.size === 1 ? 'is' : 'are'
      } larger than some of the activities hold, so those run in waves.`,
    );
  }

  return {
    sessions: [...otherDays, ...keep, ...made],
    made: made.length,
    replaced: replacedCount,
    keptManual: keptManual.length,
    outOfScope: outOfScope.length,
    unmet,
    notes,
  };
}

/* What the draft did, as sentences, for a chat reply. */
export function report(d: Draft, p?: Parsed) {
  const lines: string[] = [];
  lines.push(
    `Drafted ${d.made} session${d.made === 1 ? '' : 's'}` +
      (d.replaced ? `, replacing ${d.replaced}` : '') +
      (d.keptManual
        ? `, leaving ${d.keptManual} you had edited by hand`
        : '') +
      (d.outOfScope
        ? `, and not touching ${d.outOfScope} outside what you asked for`
        : '') +
      '.',
  );
  if (p?.understood.length) {
    lines.push('', 'Working to: ' + p.understood.join('; ') + '.');
  }
  if (d.notes.length) {
    lines.push('', ...d.notes.map((n) => `• ${n}`));
  }
  if (d.unmet.length) {
    lines.push(
      '',
      `${d.unmet.length} thing${d.unmet.length === 1 ? '' : 's'} I could not do:`,
      ...d.unmet.slice(0, 6).map((u) => `• ${u.where} — ${u.problem}`),
    );
    if (d.unmet.length > 6) lines.push(`• …and ${d.unmet.length - 6} more`);
  }
  if (p?.ignored.length) {
    lines.push(
      '',
      'I could not act on: ' + p.ignored.join('; ') + '.',
    );
  }
  lines.push(
    '',
    'Nothing is approved. Check the ratio marks and approve the day yourself.',
  );
  return lines.join('\n');
}

export const groupName = (id: string) => groupById(id).name;


/* One runnable check on the clause reader — the part that fails silently and
   produces a day missing an instruction nobody notices was given. */
export function selfCheck() {
  const day = '2027-07-12';
  const a = parseSpec('Redraft the day — no kayaking, and English for every group', day);
  console.assert(
    a.spec.avoidActivities?.includes('a-kayak'),
    'kayaking should be avoided',
  );
  console.assert(
    a.spec.requirePerGroup?.includes('a-english'),
    'English should be required, not avoided by the previous clause',
  );
  console.assert(
    !a.spec.avoidActivities?.includes('a-english'),
    'English must not inherit the "no" from the kayaking clause',
  );

  const b = parseSpec('keep it on site, mornings only', day);
  console.assert(b.spec.maxOffSitePerGroup === 0, 'on site only');
  console.assert(b.spec.slotStarts?.length === 2, 'mornings only leaves two slots');

  const c = parseSpec('rebuild Kestrel from scratch', day);
  console.assert(c.spec.groupIds?.length === 1, 'one named group');
  console.assert(c.spec.keepManual === false, 'from scratch overwrites hand edits');
}
