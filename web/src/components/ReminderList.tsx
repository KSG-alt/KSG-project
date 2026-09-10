import { useState } from 'react';
import { IconArrow, IconCheck, IconClose, IconEdit } from '../lib/icons';
import { SEVERITY_COPY, dueLabel, type Reminder } from '../lib/reminders';
import { useStore } from '../lib/store';
import type { Route } from '../App';

const ROUTE_LABEL: Record<Route, string> = {
  home: 'Home',
  students: 'Students',
  arrivals: 'New arrivals',
  rooms: 'Room allocations',
  staff: 'Staff',
  timetable: 'Timetable',
  bookings: 'Bookings',
  kadia: 'Kadia',
  reminders: 'Reminders',
};

function Task({
  r,
  onGo,
  onClose,
}: {
  r: Reminder;
  onGo: (route: Route) => void;
  onClose: () => void;
}) {
  const { update, remove } = useStore();
  const [title, setTitle] = useState(r.title);
  const [action, setAction] = useState(r.action);
  const [due, setDue] = useState(r.due);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = title !== r.title || action !== r.action || due !== r.due;
  const invalid = title.trim().length === 0;

  return (
    <div className="task">
      <label className="task__f">
        <span className="label">What needs doing</span>
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={invalid}
        />
      </label>

      <label className="task__f">
        <span className="label">Note</span>
        <textarea
          className="field"
          rows={3}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
      </label>

      <div className="task__row">
        <label className="task__f task__f--due">
          <span className="label">Due</span>
          <input
            type="date"
            className="field"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <p className="meta task__where">
          Completing this opens <strong>{ROUTE_LABEL[r.route]}</strong>, where the
          work is done.
        </p>
      </div>

      {invalid && (
        <p className="mark mark--critical">
          A reminder needs a line saying what to do.
        </p>
      )}

      <div className="task__actions">
        <button
          className="btn btn--primary"
          disabled={!dirty || invalid}
          onClick={() => {
            update(r.id, { title: title.trim(), action, due });
            onClose();
          }}
        >
          <IconCheck />
          Save changes
        </button>

        <button className="btn" onClick={onClose}>
          Cancel
        </button>

        {confirmDelete ? (
          <span className="task__confirm">
            <span className="meta">Delete this reminder?</span>
            <button
              className="btn btn--danger"
              onClick={() => {
                remove(r.id);
                onClose();
              }}
            >
              Yes, delete
            </button>
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
          </span>
        ) : (
          <button
            className="btn btn--quiet task__delete"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete reminder: ${r.title}`}
            title="Delete this reminder"
          >
            <IconClose />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function ReminderList({
  items,
  onGo,
  compact = false,
}: {
  items: Reminder[];
  onGo: (route: Route) => void;
  compact?: boolean;
}) {
  const { complete, reopen } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!items.length) {
    return (
      <p className="meta reminders__empty">
        Nothing outstanding. Every document is in, every DBS is cleared, every
        booking has its receipt, and the day is compliant.
      </p>
    );
  }

  return (
    <ul className={`reminders${compact ? ' reminders--compact' : ''}`}>
      {items.map((r) => {
        const sev = SEVERITY_COPY[r.severity];
        const isOpen = openId === r.id;
        return (
          <li key={r.id} className={`rem${r.done ? ' rem--done' : ''}`}>
            <div className={`rem__row${compact ? ' rem__row--compact' : ''}`}>
              <button
                className="rem__body"
                onClick={() => setOpenId(isOpen ? null : r.id)}
                aria-expanded={isOpen}
              >
                <span className={`mark ${sev.mark} rem__sev`}>{sev.label}</span>
                <span className="rem__title">{r.title}</span>
                <span className="rem__meta meta">
                  {r.source}
                  {compact ? ` · ${dueLabel(r.due)}` : ''}
                  {r.edited ? ' · edited' : ''}
                </span>
                {!compact && <span className="rem__action meta">{r.action}</span>}
              </button>

              {!compact && <span className="rem__due meta">{dueLabel(r.due)}</span>}

              <div className="rem__controls">
                {r.done ? (
                  <button className="btn" onClick={() => reopen(r.id)}>
                    Undo
                  </button>
                ) : (
                  <button
                    className="btn rem__complete"
                    onClick={() => {
                      complete(r.id);
                      onGo(r.route);
                    }}
                    title={`Marks this done and opens ${ROUTE_LABEL[r.route]}`}
                  >
                    Complete
                    <IconArrow />
                  </button>
                )}
                <button
                  className="btn btn--quiet rem__edit"
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  aria-label={`Edit reminder: ${r.title}`}
                >
                  <IconEdit />
                </button>
              </div>
            </div>

            {isOpen && (
              <Task r={r} onGo={onGo} onClose={() => setOpenId(null)} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
