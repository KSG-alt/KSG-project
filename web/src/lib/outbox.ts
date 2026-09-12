/* ── Outbox ───────────────────────────────────────────────────────────────
   A chase log records that somebody was chased. It does not chase them.
   interface-contract.md §2 leaves open whether sending "lives in my screen,
   or a service you own" — so this screen does the half it can honestly do:
   draft the message, hold it in a queue with a state, and say plainly that
   nothing leaves this browser until a sending service exists.

   Queued is not a euphemism for sent. A demo that claims to have emailed a
   parent is the one thing this product cannot afford to get wrong.
   ──────────────────────────────────────────────────────────────────────── */

import { DEMO_TODAY, STUDENTS, demoStamp } from '../data/seed';
import type { Channel, Reminder } from './reminders';

export type OutboxState = 'queued' | 'sent' | 'failed';

export interface OutboxItem {
  id: string;
  at: string;
  channel: Channel;
  to: string;
  subject: string;
  body: string;
  reminderId: string;
  state: OutboxState;
  note: string | null;
}

const stamp = () => demoStamp().replace('T', ' ');

/* Chase copy has to work cold for a parent reading in a second language —
   PRODUCT.md, Accessibility & Inclusion. Short sentences, one ask, a date, a
   name to reply to. No jargon, no threat, no centre-internal shorthand. */
export function draftMessage(r: Reminder, channel: Channel) {
  const first = r.chaseTo.split(' ')[0];
  const student = STUDENTS.find((s) =>
    r.title.startsWith(`${s.forename} ${s.surname}`),
  );
  const lang = student?.guardian.language;

  const opener = channel === 'phone'
    ? `Call ${first}. Points to cover:`
    : `Hello ${first},`;

  const ask = r.action.replace(/\s+/g, ' ').trim();

  const body = channel === 'phone'
    ? [
        opener,
        `• ${r.title}`,
        `• ${ask}`,
        `• Ask when it will be done, and write the date down.`,
        lang && lang !== 'English'
          ? `• Their first language is ${lang} — speak slowly and confirm the date back.`
          : '',
      ].filter(Boolean).join('\n')
    : [
        opener,
        '',
        `${r.title}.`,
        '',
        ask,
        '',
        'If it is already on its way, reply to this message and we will stop chasing.',
        '',
        'Thank you,',
        'Ashcombe Park summer school',
      ].join('\n');

  return {
    subject: r.title,
    body,
    languageNote:
      lang && lang !== 'English'
        ? `${first} reads ${lang} first. This is written in plain English so it survives a translation app.`
        : null,
  };
}

/* One seeded failure, so the failed state is a real thing on screen rather
   than a branch nobody ever sees. */
export function buildOutbox(reminders: Reminder[]): OutboxItem[] {
  const withChases = reminders.filter((r) => r.chases.length > 0).slice(0, 3);
  return withChases.map((r, i) => {
    const c = r.chases[r.chases.length - 1];
    const d = draftMessage(r, c.channel);
    return {
      id: `out-${String(i + 1).padStart(3, '0')}`,
      at: `${c.at} 09:${String(12 + i * 7).padStart(2, '0')}`,
      channel: c.channel,
      to: c.to,
      subject: d.subject,
      body: d.body,
      reminderId: r.id,
      state: i === 1 ? 'failed' : 'sent',
      note:
        i === 1
          ? 'Address bounced. The email on the record is wrong — fix it before chasing again.'
          : null,
    };
  });
}

export function queue(
  r: Reminder,
  channel: Channel,
  body: string,
): OutboxItem {
  return {
    id: `out-${Math.random().toString(36).slice(2, 8)}`,
    at: stamp(),
    channel,
    to: r.chaseTo,
    subject: r.title,
    body,
    reminderId: r.id,
    state: 'queued',
    note: 'Held in the queue. Nothing is delivered until a sending service is connected.',
  };
}

export const OUTBOX_COPY: Record<OutboxState, { label: string; mark: string }> = {
  queued: { label: 'Queued', mark: 'mark--idle' },
  sent: { label: 'Sent', mark: 'mark--clear' },
  failed: { label: 'Failed', mark: 'mark--critical' },
};

export const DEMO_STAMP = DEMO_TODAY;
