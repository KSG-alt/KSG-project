import { useState } from 'react';
import { IconClose, IconSend } from '../lib/icons';
import { useStore } from '../lib/store';
import { draftMessage } from '../lib/outbox';
import type { Channel, Reminder } from '../lib/reminders';

/* Drafting the chase is the half of sending this product can honestly do.
   The button says queue, because queue is what happens. */
export function Compose({ r, onClose }: { r: Reminder; onClose: () => void }) {
  const { send } = useStore();
  const [channel, setChannel] = useState<Channel>('email');
  const drafted = draftMessage(r, channel);
  const [body, setBody] = useState(drafted.body);
  const [touched, setTouched] = useState(false);

  const pick = (c: Channel) => {
    setChannel(c);
    if (!touched) setBody(draftMessage(r, c).body);
  };

  return (
    <div className="compose">
      <div className="compose__head">
        <span className="label">To {r.chaseTo}</span>
        <div className="compose__channels">
          {(['email', 'WhatsApp', 'phone'] as Channel[]).map((c) => (
            <button
              key={c}
              className={`tab${channel === c ? ' tab--on' : ''}`}
              onClick={() => pick(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {drafted.languageNote && (
        <p className="meta compose__lang">{drafted.languageNote}</p>
      )}

      <textarea
        className="field compose__body"
        rows={channel === 'phone' ? 6 : 12}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setTouched(true);
        }}
        aria-label="Message"
      />

      <div className="compose__actions">
        <button
          className="btn btn--primary"
          disabled={!body.trim()}
          onClick={() => {
            send(r, channel, body);
            onClose();
          }}
        >
          <IconSend />
          {channel === 'phone' ? 'Log the call and the script' : 'Queue for sending'}
        </button>
        <button className="btn" onClick={onClose}>
          <IconClose />
          Cancel
        </button>
        <span className="meta">
          Queued, not sent. Nothing leaves this browser until a sending service
          is connected.
        </span>
      </div>
    </div>
  );
}
