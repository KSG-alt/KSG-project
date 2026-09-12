/* ── Spreadsheet import ───────────────────────────────────────────────────
   Onboarding has to fit the pre-term window — PRODUCT.md calls it the hardest
   promise the product makes. A centre's records arrive as a spreadsheet
   somebody has been maintaining for six years, with the columns they chose
   and the dates they type by hand.

   So this does the two things that actually cost the time: guess the column
   mapping, and find the rows that will fail before anything is written.
   Nothing here writes to the roll. A dry run that quietly imported would be
   the worst possible behaviour.
   ──────────────────────────────────────────────────────────────────────── */

export interface Table {
  headers: string[];
  rows: string[][];
}

/* Minimal RFC4180: quoted fields, doubled quotes inside them, commas and
   newlines inside quotes. Anything more exotic than that is a spreadsheet
   problem, not an import problem. */
export function parseCsv(text: string): Table {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const clean = rows.filter((r) => r.some((v) => v.trim().length));
  if (!clean.length) return { headers: [], rows: [] };
  return {
    headers: clean[0].map((h) => h.trim()),
    rows: clean.slice(1),
  };
}

/* ── Mapping ───────────────────────────────────────────────────────────── */

export type FieldId =
  | 'forename' | 'surname' | 'dob' | 'arrival' | 'leaving' | 'country'
  | 'guardianName' | 'guardianEmail' | 'guardianPhone' | 'dietary' | 'medical';

export interface FieldDef {
  id: FieldId;
  label: string;
  required: boolean;
  /* Header names seen in the wild, lowercased and stripped of punctuation. */
  aliases: string[];
}

export const FIELDS: FieldDef[] = [
  { id: 'forename', label: 'Forename', required: true, aliases: ['forename', 'firstname', 'first', 'givenname', 'name'] },
  { id: 'surname', label: 'Surname', required: true, aliases: ['surname', 'lastname', 'last', 'familyname'] },
  { id: 'dob', label: 'Date of birth', required: true, aliases: ['dob', 'dateofbirth', 'birthdate', 'born'] },
  { id: 'arrival', label: 'Arrival', required: true, aliases: ['arrival', 'arrives', 'arrivaldate', 'startdate', 'from', 'checkin'] },
  { id: 'leaving', label: 'Leaving', required: true, aliases: ['leaving', 'leaves', 'departs', 'departure', 'departuredate', 'enddate', 'to', 'checkout'] },
  { id: 'country', label: 'Country', required: false, aliases: ['country', 'nationality', 'origin'] },
  { id: 'guardianName', label: 'Guardian name', required: true, aliases: ['guardian', 'guardianname', 'parent', 'parentname', 'contact'] },
  { id: 'guardianEmail', label: 'Guardian email', required: true, aliases: ['email', 'guardianemail', 'parentemail', 'contactemail'] },
  { id: 'guardianPhone', label: 'Guardian phone', required: false, aliases: ['phone', 'mobile', 'tel', 'telephone', 'guardianphone', 'parentphone'] },
  { id: 'dietary', label: 'Dietary', required: false, aliases: ['dietary', 'diet', 'allergies', 'food'] },
  { id: 'medical', label: 'Medical', required: false, aliases: ['medical', 'medication', 'conditions', 'health'] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

export type Mapping = Partial<Record<FieldId, number>>;

/* Exact alias first, then a contains match, so "Student First Name" lands on
   forename without "name" stealing it. */
export function guessMapping(headers: string[]): Mapping {
  const out: Mapping = {};
  const taken = new Set<number>();
  const normed = headers.map(norm);

  FIELDS.forEach((f) => {
    const exact = normed.findIndex(
      (h, i) => !taken.has(i) && f.aliases.includes(h),
    );
    if (exact >= 0) {
      out[f.id] = exact;
      taken.add(exact);
    }
  });

  /* Matched both ways: "Parent/Guardian" contains an alias, and "Departs" is
     contained by one. A header set nobody chose for us goes both directions. */
  FIELDS.forEach((f) => {
    if (out[f.id] !== undefined) return;
    const near = normed.findIndex(
      (h, i) =>
        !taken.has(i) &&
        f.aliases.some(
          (a) => a.length > 3 && (h.includes(a) || (h.length > 3 && a.includes(h))),
        ),
    );
    if (near >= 0) {
      out[f.id] = near;
      taken.add(near);
    }
  });

  return out;
}

/* ── Validation ────────────────────────────────────────────────────────── */

export interface RowProblem {
  row: number;
  field: FieldId | 'row';
  problem: string;
}

/* Dates arrive in every format a person can type. Accept the three that
   actually turn up, reject the rest loudly rather than guessing wrong — a
   silently misread date moves a child's arrival by ten months. */
const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' });

export function readDate(raw: string): { iso: string } | { error: string } {
  const v = raw.trim();
  if (!v) return { error: 'empty' };
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return { iso: `${m[1]}-${m[2]}-${m[3]}` };
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    /* A UK centre's spreadsheet is day-first, and that assumption is stated
       on the screen rather than hidden here. */
    const year = Number(m[3]);
    if (mo < 1 || mo > 12) return { error: `“${v}” has no month ${mo}` };
    const lastDay = new Date(year, mo, 0).getDate();
    if (d < 1 || d > lastDay) {
      return { error: `“${v}” is not a real date — ${monthName(mo)} ${year} has ${lastDay} days` };
    }
    const p = (n: number) => String(n).padStart(2, '0');
    return { iso: `${year}-${p(mo)}-${p(d)}` };
  }
  return { error: `“${v}” is not a date this import recognises` };
}

export interface Checked {
  ok: number;
  problems: RowProblem[];
  duplicates: string[];
  ready: { forename: string; surname: string; arrival: string; leaving: string }[];
}

export function validate(table: Table, map: Mapping, bands: [number, number]): Checked {
  const problems: RowProblem[] = [];
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  const ready: Checked['ready'] = [];

  const cell = (r: string[], f: FieldId) => {
    const i = map[f];
    return i === undefined ? '' : (r[i] ?? '').trim();
  };

  table.rows.forEach((r, n) => {
    const line = n + 2; // 1-indexed, plus the header row
    let bad = false;

    FIELDS.filter((f) => f.required).forEach((f) => {
      if (map[f.id] === undefined) return; // reported as an unmapped column
      if (!cell(r, f.id)) {
        problems.push({ row: line, field: f.id, problem: `${f.label} is empty` });
        bad = true;
      }
    });

    const dates: Record<string, string> = {};
    (['dob', 'arrival', 'leaving'] as FieldId[]).forEach((f) => {
      const raw = cell(r, f);
      if (!raw) return;
      const res = readDate(raw);
      if ('error' in res) {
        problems.push({ row: line, field: f, problem: res.error });
        bad = true;
      } else dates[f] = res.iso;
    });

    if (dates.arrival && dates.leaving && dates.leaving <= dates.arrival) {
      problems.push({ row: line, field: 'leaving', problem: 'Leaves on or before the day they arrive' });
      bad = true;
    }

    if (dates.dob && dates.arrival) {
      const age = Math.floor(
        (new Date(dates.arrival).getTime() - new Date(dates.dob).getTime()) /
          (365.25 * 86400000),
      );
      if (age < bands[0] || age > bands[1]) {
        problems.push({
          row: line,
          field: 'dob',
          problem: `Would be ${age} on arrival — outside the centre's ${bands[0]}–${bands[1]} bands`,
        });
        bad = true;
      }
    }

    const email = cell(r, 'guardianEmail');
    if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      problems.push({ row: line, field: 'guardianEmail', problem: `“${email}” is not an email address — a chase sent there will not arrive` });
      bad = true;
    }

    const key = `${cell(r, 'forename')}|${cell(r, 'surname')}|${dates.dob ?? ''}`.toLowerCase();
    if (key.replace(/\|/g, '').length) {
      const first = seen.get(key);
      if (first !== undefined) {
        duplicates.push(`${cell(r, 'forename')} ${cell(r, 'surname')} — rows ${first} and ${line}`);
        bad = true;
      } else seen.set(key, line);
    }

    if (!bad) {
      ready.push({
        forename: cell(r, 'forename'),
        surname: cell(r, 'surname'),
        arrival: dates.arrival ?? '',
        leaving: dates.leaving ?? '',
      });
    }
  });

  return { ok: ready.length, problems, duplicates, ready };
}

/* A real centre's export: their column names, their date format, and the
   four mistakes that are in every one of these files. */
export const SAMPLE = `Student First Name,Family Name,D.O.B,Arrives,Departs,Nationality,Parent/Guardian,Contact Email,Mobile,Allergies
Mateo,Aguilar,14/03/2013,19/07/2027,02/08/2027,Spain,Elena Aguilar,e.aguilar@example.test,+34 600 111 222,Nuts
Sofia,Berkmann,02/11/2014,19/07/2027,09/08/2027,Germany,Jonas Berkmann,j.berkmann@example.test,+49 170 222 333,
Yuki,Nakamura,,19/07/2027,02/08/2027,Japan,Hana Nakamura,h.nakamura@example.test,+81 90 3333 4444,
Amara,Okonjo,21/06/2011,26/07/2027,26/07/2027,Portugal,Ade Okonjo,ade.okonjo.example.test,+351 91 444 5555,
Luca,Moretti,08/09/2009,26/07/2027,09/08/2027,Italy,Chiara Moretti,c.moretti@example.test,+39 333 555 6666,Lactose
Mateo,Aguilar,14/03/2013,19/07/2027,02/08/2027,Spain,Elena Aguilar,e.aguilar@example.test,+34 600 111 222,Nuts
Ines,Fontaine,30/02/2012,02/08/2027,16/08/2027,France,Marc Fontaine,m.fontaine@example.test,+33 6 77 88 99 00,
Tomas,Petrov,17/05/2005,02/08/2027,16/08/2027,Poland,Irena Petrov,i.petrov@example.test,+48 500 777 888,`;

/* One runnable check on the parts that would fail silently: quoted commas,
   day-first dates, and the email rule. Runs in dev only. */
export function selfCheck() {
  const t = parseCsv('a,b\n"x,1",2\n"he said ""no""",3');
  console.assert(t.headers.length === 2, 'headers');
  console.assert(t.rows[0][0] === 'x,1', 'quoted comma');
  console.assert(t.rows[1][0] === 'he said "no"', 'escaped quote');

  const d = readDate('14/03/2013');
  console.assert('iso' in d && d.iso === '2013-03-14', 'day-first date');
  console.assert('error' in readDate('30/02/2012'), 'Feb 30 rejected');
  console.assert('error' in readDate('31/04/2027'), 'April 31 rejected');
  console.assert('error' in readDate('March 2013'), 'prose date rejected');

  const table = parseCsv(SAMPLE);
  const map = guessMapping(table.headers);
  const missed = FIELDS.filter((f) => f.required && map[f.id] === undefined);
  console.assert(
    missed.length === 0,
    `sample headers should all map, missed ${missed.map((f) => f.label).join(', ')}`,
  );

  const s = validate(table, map, [8, 17]);
  console.assert(s.duplicates.length === 1, 'one duplicate in the sample');
  console.assert(s.problems.length >= 4, 'sample carries its known problems');
  console.assert(s.ok === 3, `3 rows should import cleanly, got ${s.ok}`);
}
