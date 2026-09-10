import { createContext, useContext, useMemo, useState } from 'react';
import { buildReminders, type Reminder } from './reminders';

interface Store {
  reminders: Reminder[];
  open: Reminder[];
  update: (id: string, patch: Partial<Reminder>) => void;
  complete: (id: string) => void;
  reopen: (id: string) => void;
  remove: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(() => buildReminders());

  const value = useMemo<Store>(() => {
    const patch = (id: string, p: Partial<Reminder>) =>
      setReminders((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)));
    return {
      reminders,
      open: reminders.filter((r) => !r.done),
      update: (id, p) => patch(id, { ...p, edited: true }),
      complete: (id) => patch(id, { done: true }),
      reopen: (id) => patch(id, { done: false }),
      remove: (id) => setReminders((all) => all.filter((r) => r.id !== id)),
    };
  }, [reminders]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}
