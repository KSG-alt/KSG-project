/* ── The parent portal ────────────────────────────────────────────────────
   The platform chases parents for documents and gives them nowhere to send
   one. That is half a loop: every chase ends in an email thread somebody has
   to re-key, and the reason a document is still outstanding is very often
   that the parent tried and could not.

   A request is one document, for one student, with its own link. The states
   are the ones that matter operationally — not sent, sent, opened, uploaded,
   accepted, rejected — because "sent and never opened" and "uploaded and
   waiting on us" are different problems with different fixes, and lumping
   them together is what a spreadsheet does.

   ── What is real here and what is not ───────────────────────────────────
   The states, the transitions, the chase counting and the audit entries are
   real and drive the screens. What does NOT exist is a server: no link is
   ever sent, no file is ever stored, and the parent view in this app is a
   simulation of what a parent would see, labelled as one. A real portal needs
   a service that holds the token, receives the file and scans it. Until then
   this is the shape of the feature, not the feature.
   ──────────────────────────────────────────────────────────────────────── */

import { DEMO_TODAY, STUDENTS, type DocState, type Student } from './seed';

export type DocKind = 'medical' | 'consent' | 'passport';

export const DOC_LABEL: Record<DocKind, string> = {
  medical: 'Medical form',
  consent: 'Consent form',
  passport: 'Passport copy',
};

/* Why a centre needs it, in the words a parent should read. A parent who
   understands why a form matters returns it; one who gets a demand does not. */
export const DOC_WHY: Record<DocKind, string> = {
  medical:
    'It tells us about allergies, medication and anything a first-aider would need to know in a hurry. We cannot take a student on an activity without it.',
  consent:
    'It is your written permission for your child to take part and to leave the site on excursions. Without it they stay at the centre.',
  passport:
    'A photo of the picture page. We need it to confirm identity at the airport and to meet your child at arrivals.',
};

export type RequestState =
  | 'not-sent'
  | 'sent'
  | 'opened'
  | 'uploaded'
  | 'accepted'
  | 'rejected';

export const STATE_COPY: Record<RequestState, { label: string; mark: string; next: string }> = {
  'not-sent': { label: 'Not sent', mark: 'mark--critical', next: 'Send the link.' },
  sent: { label: 'Sent', mark: 'mark--idle', next: 'Waiting for them to open it.' },
  opened: { label: 'Opened', mark: 'mark--idle', next: 'They looked but did not upload. Worth a phone call.' },
  uploaded: { label: 'Uploaded', mark: 'mark--overdue', next: 'Waiting on us — check it and accept or reject.' },
  accepted: { label: 'Accepted', mark: 'mark--clear', next: 'Done.' },
  rejected: { label: 'Rejected', mark: 'mark--critical', next: 'They were told why. Waiting for a replacement.' },
};

export interface DocRequest {
  id: string;
  studentId: string;
  kind: DocKind;
  state: RequestState;
  /* The token a real portal would put in the link. Generated here so the
     screens can show the shape of it; it addresses nothing. */
  token: string;
  sentAt: string | null;
  openedAt: string | null;
  uploadedAt: string | null;
  decidedAt: string | null;
  filename: string | null;
  /* Why it was rejected, in words a parent can act on. */
  reason: string | null;
  reminders: number;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const back = (n: number) => {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const token = (r: () => number) =>
  Array.from({ length: 4 }, () =>
    Math.floor(r() * 36 ** 4)
      .toString(36)
      .padStart(4, '0'),
  ).join('-');

const REJECTIONS = [
  'The photo is too dark to read the date of birth. Please take it again in daylight.',
  'Page 2 is missing — we need the signature page as well.',
  'This is the old form from last season. The current one is in the link.',
];

/* A request exists for every document that is not already in. The state
   spread is what a centre's board actually looks like three weeks out: most
   sent, a third opened and ignored, a handful waiting on the centre. */
export function buildRequests(students: Student[] = STUDENTS): DocRequest[] {
  const r = rng(6611);
  const out: DocRequest[] = [];

  students.forEach((s) => {
    (Object.entries(s.docs) as [DocKind, DocState][]).forEach(([kind, doc]) => {
      if (doc === 'in') return;
      const roll = r();
      const state: RequestState =
        roll < 0.08
          ? 'not-sent'
          : roll < 0.42
          ? 'sent'
          : roll < 0.72
          ? 'opened'
          : roll < 0.88
          ? 'uploaded'
          : 'rejected';

      const sentDays = 3 + Math.floor(r() * 18);
      out.push({
        id: `req-${s.id}-${kind}`,
        studentId: s.id,
        kind,
        state,
        token: token(r),
        sentAt: state === 'not-sent' ? null : back(sentDays),
        openedAt:
          state === 'opened' || state === 'uploaded' || state === 'rejected'
            ? back(Math.max(0, sentDays - 1 - Math.floor(r() * 3)))
            : null,
        uploadedAt:
          state === 'uploaded' || state === 'rejected'
            ? back(Math.max(0, sentDays - 3 - Math.floor(r() * 3)))
            : null,
        decidedAt: state === 'rejected' ? back(Math.max(0, sentDays - 4)) : null,
        filename:
          state === 'uploaded' || state === 'rejected'
            ? `${kind}-${s.surname.toLowerCase()}.${r() < 0.5 ? 'pdf' : 'jpg'}`
            : null,
        reason:
          state === 'rejected'
            ? REJECTIONS[Math.floor(r() * REJECTIONS.length)]
            : null,
        reminders: state === 'not-sent' ? 0 : Math.floor(r() * 4),
      });
    });
  });

  return out;
}

/* The two piles that matter. Waiting on us is the one an admin can clear
   today; waiting on them is the one that needs chasing. */
export const waitingOnUs = (rs: DocRequest[]) =>
  rs.filter((x) => x.state === 'uploaded');

export const waitingOnThem = (rs: DocRequest[]) =>
  rs.filter((x) => x.state !== 'uploaded' && x.state !== 'accepted');

export const neverOpened = (rs: DocRequest[]) =>
  rs.filter((x) => x.state === 'sent' && (x.reminders ?? 0) >= 2);

/* What the link would be. It resolves to nothing — see the note at the top. */
export const linkFor = (req: DocRequest) =>
  `https://portal.example-centre.test/u/${req.token}`;
