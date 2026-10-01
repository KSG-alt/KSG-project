/* ── The self-checks, outside a browser ───────────────────────────────────
   Every solver in here carries a `selfCheck` that asserts the things that
   would be silently wrong rather than loudly broken: a bed allocated twice,
   a free waiting allowance billed, a departure vehicle leaving after the
   plane. Until now they ran only in a dev browser tab, which meant nobody
   ran them — `npm run build` never touched them, so a regression in a solver
   went straight into the demo file with a clean build.

   This runs the same checks under node so `npm run check` and CI can fail.
   `console.assert` does not throw, so it is replaced with one that counts.
   ──────────────────────────────────────────────────────────────────────── */

import { selfCheck as importCsv } from './lib/importCsv';
import { selfCheck as schedule } from './lib/schedule';
import { selfCheck as runplan } from './lib/runplan';
import { selfCheck as venues } from './data/venues';
import { selfCheck as allocate } from './lib/allocate';
import { selfCheck as transfers } from './lib/transfers';
import { selfCheck as suppliers } from './data/suppliers';
import { selfCheck as health } from './data/health';
import { selfCheck as cover } from './lib/cover';
import { selfCheck as season } from './lib/season';
import { selfCheck as inspection } from './lib/inspection';
import { buildAudit } from './lib/audit';
import { buildIncidents } from './data/incidents';
import { buildRegisters } from './data/attendance';
import { DEMO_TODAY, SEASON_START, SESSIONS, STAFF, STUDENTS } from './data/seed';

const CHECKS: [string, () => void][] = [
  ['importCsv', importCsv],
  ['schedule', schedule],
  ['runplan', runplan],
  ['venues', venues],
  ['allocate', allocate],
  ['transfers', transfers],
  ['suppliers', suppliers],
  ['health', health],
  ['cover', cover],
  ['season', season],
  ['inspection', () => {
    const p = (n: number) => String(n).padStart(2, '0');
    const iso = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const today = iso(DEMO_TODAY);
    inspection({
      from: iso(SEASON_START),
      to: today,
      audit: buildAudit(),
      staff: STAFF,
      students: STUDENTS,
      sessions: SESSIONS,
      registers: buildRegisters(today, DEMO_TODAY.getHours() * 60 + 30),
      incidents: buildIncidents(),
      now: `${today}T${p(DEMO_TODAY.getHours())}:${p(DEMO_TODAY.getMinutes())}`,
    });
  }],
];

/* Declared rather than pulled in with @types/node: this file is the only
   thing in the project that runs outside a browser, and two members of one
   global are cheaper than a dependency. */
declare const process: {
  stdout: { write(s: string): void };
  exit(code: number): never;
};

let failures = 0;
const realAssert = console.assert.bind(console);
console.assert = (ok?: boolean, ...rest: unknown[]) => {
  if (!ok) failures++;
  realAssert(ok, ...rest);
};

for (const [name, run] of CHECKS) {
  try {
    run();
    process.stdout.write(`  ${name}\n`);
  } catch (e) {
    failures++;
    process.stdout.write(`  ${name} — threw: ${(e as Error).message}\n`);
  }
}

if (failures) {
  process.stdout.write(`\n${failures} assertion${failures === 1 ? '' : 's'} failed.\n`);
  process.exit(1);
}
process.stdout.write(`\nAll ${CHECKS.length} self-checks passed.\n`);
