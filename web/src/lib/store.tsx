import { createContext, useContext, useMemo, useState } from 'react';
import {
  buildReminders, type Channel, type Reminder,
} from './reminders';
import { buildAudit, entry, type AuditEntry } from './audit';
import { SESSIONS, type Session } from '../data/seed';

interface Store {
  reminders: Reminder[];
  open: Reminder[];
  update: (id: string, patch: Partial<Reminder>) => void;
  complete: (id: string) => void;
  reopen: (id: string) => void;
  remove: (id: string) => void;
  /* Chasing and escalating are the tracker's core loop: chase, log it, and
     past the threshold hand it to someone above the admin. */
  chase: (id: string, channel: Channel) => void;
  escalate: (id: string) => void;

  /* Shared, because a session cancelled on the timetable has to lower the
     rota hours the staff screen reports. */
  sessions: Session[];
  updateSessions: (fn: (all: Session[]) => Session[]) => void;

  /* Append-only. An audit trail that can be edited is not an audit trail. */
  audit: AuditEntry[];
  log: (e: AuditEntry) => void;
}

const Ctx = createContext<Store | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(() => buildReminders());
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);
  const [audit, setAudit] = useState<AuditEntry[]>(() => buildAudit());

  const value = useMemo<Store>(() => {
    const append = (e: AuditEntry) => setAudit((all) => [e, ...all]);
    const patch = (id: string, p: Partial<Reminder>) =>
      setReminders((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)));
    const find = (id: string) => reminders.find((r) => r.id === id);

    return {
      reminders,
      open: reminders.filter((r) => !r.done),
      update: (id, p) => {
        patch(id, { ...p, edited: true });
        const r = find(id);
        if (r) {
          append(
            entry('record', 'Reminder edited', r.title, 'Wording, note or due date changed.'),
          );
        }
      },
      complete: (id) => {
        patch(id, { done: true });
        const r = find(id);
        if (r) {
          append(
            entry(
              r.severity === 'safeguarding' ? 'safeguarding' : 'record',
              'Reminder completed',
              r.title,
              `Marked done. ${r.chases.length} chase${r.chases.length === 1 ? '' : 's'} logged before closing.`,
            ),
          );
        }
      },
      reopen: (id) => patch(id, { done: false }),
      remove: (id) => {
        const r = find(id);
        setReminders((all) => all.filter((x) => x.id !== id));
        if (r) {
          append(
            entry('record', 'Reminder deleted', r.title, `Removed without completing. Was due ${r.due}.`),
          );
        }
      },
      chase: (id, channel) => {
        const r = find(id);
        if (!r) return;
        patch(id, {
          chases: [...r.chases, { at: today(), channel, to: r.chaseTo }],
        });
        append(
          entry(
            r.severity === 'safeguarding' ? 'safeguarding' : 'record',
            'Chase sent',
            r.title,
            `Chased ${r.chaseTo} by ${channel}. Chase ${r.chases.length + 1} on this item.`,
          ),
        );
      },
      escalate: (id) => {
        const r = find(id);
        if (!r) return;
        patch(id, { escalated: true });
        append(
          entry(
            r.severity === 'safeguarding' ? 'safeguarding' : 'record',
            'Escalated to management',
            r.title,
            `Passed to the centre director after ${r.chases.length} chase${r.chases.length === 1 ? '' : 's'} and no response.`,
          ),
        );
      },

      sessions,
      updateSessions: (fn) => setSessions((all) => fn(all)),

      audit,
      log: append,
    };
  }, [reminders, sessions, audit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}
