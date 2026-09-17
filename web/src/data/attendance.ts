/* ── Attendance ───────────────────────────────────────────────────────────
   The most repeated safeguarding act in a centre, and the spine everything
   else hangs off. Without it you cannot say a student arrived safely, cannot
   show a ratio was met in practice rather than on paper, and cannot answer
   the only question that matters when somebody is missing: when did anyone
   last see them.

   guides.ts already tells leaders to take a register at the activity, at the
   meeting point, and again before the coach leaves. Until now there was
   nowhere to take one.

   ── The phone half ──────────────────────────────────────────────────────
   A register is taken standing on a field, not at a desk, so it belongs on
   the staff app — which PRODUCT.md scopes as native iOS and Android against
   the same API, and which does not exist yet. Neither does the API.

   So: every mark carries the device it came from, and the seeded data
   includes marks from phones so the shape is real and testable. What is NOT
   real is the sync — nothing travels between devices in this demonstration,
   and the screen says so rather than implying a live connection.
   ──────────────────────────────────────────────────────────────────────── */

import {
  DEMO_TODAY, SESSIONS, STUDENTS, demoStamp, type Session, type Student,
} from './seed';

export type Mark = 'present' | 'absent' | 'late' | 'excused';

export const MARK_COPY: Record<Mark, { label: string; mark: string; short: string }> = {
  present: { label: 'Present', mark: 'mark--clear', short: 'P' },
  late: { label: 'Late', mark: 'mark--idle', short: 'L' },
  excused: { label: 'Excused', mark: 'mark--idle', short: 'E' },
  absent: { label: 'Not there', mark: 'mark--critical', short: 'A' },
};

/* Where a mark was made. 'phone' is the staff app; see the note above. */
export type Device = 'dashboard' | 'phone';

export interface Register {
  sessionId: string;
  day: string;
  /* Null until somebody takes it. */
  takenBy: string | null;
  takenAt: string | null;
  device: Device;
  marks: Record<string, Mark>;
  /* A second count, taken at the end, because the one that matters is the one
     on the way back. */
  closedBy: string | null;
  closedAt: string | null;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* The roll is who is HERE on the day, not everybody ever booked into the
   group. A register of thirty-five when twenty-five have arrived marks ten
   children present who are still in another country. */
export const rollFor = (session: Session, students: Student[] = STUDENTS) =>
  students.filter(
    (s) =>
      s.groupId === session.groupId &&
      s.arrival <= session.day &&
      s.leaving >= session.day,
  );

/* Registers for sessions that have already happened today, plus nothing for
   the ones still to come — which is the point: the screen has to show what
   is missing, not a tidy full set. */
export function buildRegisters(
  today: string,
  now: number,
  sessions: Session[] = SESSIONS,
  students: Student[] = STUDENTS,
): Register[] {
  const r = rng(8123);
  const out: Register[] = [];

  const run = sessions
    .filter((s) => s.day === today && s.status !== 'cancelled')
    .filter(
      (s) => Number(s.start.slice(0, 2)) * 60 + Number(s.start.slice(3)) <= now,
    );

  /* Exactly one session that ran carries no register, deliberately, the way
     the seed leaves one DBS uncleared and two students without a bed. A
     screen whose headline failure depends on a dice roll is a screen that
     sometimes demonstrates nothing. */
  const blank = run.length > 1 ? run[1].id : run[0]?.id;

  run.forEach((session) => {
      if (session.id === blank) {
        out.push({
          sessionId: session.id,
          day: today,
          takenBy: null,
          takenAt: null,
          device: 'phone',
          marks: {},
          closedBy: null,
          closedAt: null,
        });
        return;
      }

      const roll = rollFor(session, students);
      const marks: Record<string, Mark> = {};
      roll.forEach((s) => {
        const roll2 = r();
        marks[s.id] =
          roll2 < 0.93 ? 'present' : roll2 < 0.965 ? 'late' : roll2 < 0.985 ? 'excused' : 'absent';
      });

      const leader = session.staffIds[0] ?? null;
      const onPhone = r() < 0.7;
      const closed = r() < 0.75;

      out.push({
        sessionId: session.id,
        day: today,
        takenBy: leader,
        takenAt: `${today}T${session.start}`,
        device: onPhone ? 'phone' : 'dashboard',
        marks,
        closedBy: closed ? leader : null,
        closedAt: closed ? `${today}T${session.end}` : null,
      });
    });

  return out;
}

export const registerFor = (registers: Register[], sessionId: string) =>
  registers.find((r) => r.sessionId === sessionId) ?? null;

export const counted = (reg: Register | null) =>
  reg ? Object.keys(reg.marks).length : 0;

export const absentees = (reg: Register | null) =>
  reg
    ? Object.entries(reg.marks)
        .filter(([, m]) => m === 'absent')
        .map(([id]) => id)
    : [];

export const isTaken = (reg: Register | null) => Boolean(reg && reg.takenBy);

/* Has this session started on the demo clock? Registers are only outstanding
   for sessions that have actually run — counting the afternoon's as missing
   reported fifteen failures that were nothing of the kind. Shared, so the
   dashboard and the attendance screen cannot drift apart on it. */
export const hasRun = (s: Session, now: Date = DEMO_TODAY) =>
  Number(s.start.slice(0, 2)) * 60 + Number(s.start.slice(3)) <=
  now.getHours() * 60 + now.getMinutes();

/* A session that ran and was never registered. The thing an inspector asks
   about, and the reason this screen exists. */
export function untaken(registers: Register[]) {
  return registers.filter((r) => !r.takenBy);
}

/* Taken but never closed — the group was counted out and never counted back.
   Worse than never taking one, because it looks done. */
export function unclosed(registers: Register[]) {
  return registers.filter((r) => r.takenBy && !r.closedBy);
}

export const blankRegister = (session: Session, device: Device = 'dashboard'): Register => ({
  sessionId: session.id,
  day: session.day,
  takenBy: null,
  takenAt: null,
  device,
  marks: {},
  closedBy: null,
  closedAt: null,
});

export const stamp = demoStamp;
