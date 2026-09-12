import { useEffect, useRef, useState } from 'react';
import { IconClose, IconSend } from '../lib/icons';
import { clearKey, getKey, hasKey, run, setKey, type Msg, type ToolSpec } from '../lib/anthropic';
import { LOCAL_TOPICS, answerLocally } from '../lib/localAnswers';
import { useStore } from '../lib/store';

interface Turn {
  who: 'you' | 'kadia';
  text: string;
  tools?: string[];
  local?: boolean;
}

/* `full` is the Ask Kadia page: one centred column, the conversation carrying
   the surface and the composer holding the bottom. `panel` is the same engine
   inside the timetable's sidebar, where it is a tool beside a task. */
export function Chat({
  system,
  tools,
  greeting,
  placeholder,
  suggestions = [],
  onApplied,
  variant = 'panel',
  opener,
  localCommands,
}: {
  system: string;
  tools: ToolSpec[];
  greeting: string;
  placeholder: string;
  suggestions?: string[];
  onApplied?: () => void;
  variant?: 'panel' | 'full';
  opener?: string;
  /* Things this surface can do without a model. Tried before the read-only
     answers, so the keyless demo can act and not only report. */
  localCommands?: (q: string) => { text: string; source: string } | null;
}) {
  const { sessions, students, staff, payments, incidents, reminders } = useStore();
  const [keyed, setKeyed] = useState(hasKey());
  const [showKeyEntry, setShowKeyEntry] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useRef<Msg[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const full = variant === 'full';
  const started = turns.length > 0;

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [turns, busy]);

  /* Grow with the message rather than scrolling a two-line box. */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 190)}px`;
  }, [input]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput('');
    setError(null);
    setTurns((t) => [...t, { who: 'you', text: clean }]);

    /* No key: answer from the records on this device. Same data the live
       assistant reads through its tools, without a model in the loop. */
    if (!keyed) {
      const done = localCommands?.(clean);
      if (done) {
        setTurns((t) => [
          ...t,
          { who: 'kadia', text: done.text, tools: [done.source], local: true },
        ]);
        onApplied?.();
        return;
      }
      const local = answerLocally(clean, {
        sessions, students, staff, payments, incidents, reminders,
      });
      setTurns((t) => [
        ...t,
        local
          ? { who: 'kadia', text: local.text, tools: [local.source], local: true }
          : {
              who: 'kadia',
              local: true,
              text:
                'Without an API key I answer from the records directly, and only on these:\n' +
                LOCAL_TOPICS.map((x) => `• ${x}`).join('\n') +
                '\n\nAdd a key for open conversation.',
            },
      ]);
      return;
    }

    history.current.push({ role: 'user', content: clean });
    setBusy(true);
    try {
      const res = await run({ system, messages: history.current, tools });
      history.current = res.messages;
      setTurns((t) => [
        ...t,
        { who: 'kadia', text: res.text || '(no reply)', tools: res.toolsUsed },
      ]);
      if (res.toolsUsed.length) onApplied?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const keyForm = (
    <div className="keygate">
      <p className="label" style={{ marginBottom: 12 }}>API key</p>
      <p className="meta" style={{ margin: '0 0 16px', maxWidth: '62ch' }}>
        This panel calls the Anthropic API straight from the browser. The key is
        held in this browser&rsquo;s <code>localStorage</code> only — never
        written into the repository, never sent anywhere but api.anthropic.com.
      </p>
      <div className="keygate__row">
        <input
          className="field"
          style={{ maxWidth: 340 }}
          type="password"
          placeholder="sk-ant-..."
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draftKey.trim()) {
              setKey(draftKey);
              setKeyed(true);
              setShowKeyEntry(false);
            }
          }}
        />
        <button
          className="btn btn--primary"
          disabled={!draftKey.trim()}
          onClick={() => {
            setKey(draftKey);
            setKeyed(true);
            setShowKeyEntry(false);
          }}
        >
          Use this key
        </button>
        <button className="btn" onClick={() => setShowKeyEntry(false)}>
          Cancel
        </button>
      </div>
    </div>
  );

  const composer = (
    <form
      className="ask__composer"
      onSubmit={(e) => {
        e.preventDefault();
        send(input);
      }}
    >
      <div className="ask__box">
        <textarea
          ref={box}
          className="ask__input"
          rows={1}
          placeholder={placeholder}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          aria-label="Ask Kadia"
        />
        <div className="ask__tools">
          <span className={`ask__mode${keyed ? ' ask__mode--live' : ''}`}>
            <i />
            {keyed ? 'Live model' : 'Reading the records'}
          </span>
          <div className="ask__toolsright">
            {keyed ? (
              <button
                type="button"
                className="btn btn--quiet"
                title={`Key ending ${getKey().slice(-4)}`}
                onClick={() => {
                  clearKey();
                  setKeyed(false);
                  setTurns([]);
                  history.current = [];
                }}
              >
                <IconClose />
                Forget key
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => setShowKeyEntry(true)}
              >
                Add a key
              </button>
            )}
            <button
              className="ask__send"
              disabled={busy || !input.trim()}
              aria-label="Send"
            >
              <IconSend />
            </button>
          </div>
        </div>
      </div>
      {full && (
        <p className="meta ask__hint">
          Enter to send, Shift+Enter for a new line.
        </p>
      )}
    </form>
  );

  const chips =
    suggestions.length > 0 ? (
      <div className="ask__chips">
        {suggestions.map((s) => (
          <button key={s} className="ask__chip" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
    ) : null;

  const stream = (
    <div className="ask__stream" ref={scroller}>
      {turns.map((t, i) =>
        t.who === 'you' ? (
          <div key={i} className="said">
            <p>{t.text}</p>
          </div>
        ) : (
          <div key={i} className="reply">
            <span className="reply__who label">Kadia</span>
            <div className="reply__text">
              {t.text.split('\n').map((line, k) => (
                <p key={k}>{line || ' '}</p>
              ))}
            </div>
            {t.tools && t.tools.length > 0 && (
              <p className="reply__src meta">
                {t.local ? 'Read from ' : 'Looked up '}
                {Array.from(new Set(t.tools)).join(', ')}
              </p>
            )}
          </div>
        ),
      )}

      {busy && (
        <div className="reply">
          <span className="reply__who label">Kadia</span>
          <span className="typing" aria-label="Thinking">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}

      {error && (
        <p className="mark mark--critical" style={{ margin: '10px 0' }}>
          {error}
        </p>
      )}
    </div>
  );

  if (!full) {
    return (
      <div className="chat">
        {showKeyEntry && !keyed ? (
          keyForm
        ) : (
          <>
            {!started && <p className="chat__greeting meta">{keyed ? greeting : 'No key needed — I read the records on this device. Add a key for open conversation.'}</p>}
            {stream}
            {!started && chips}
            {composer}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`ask${started ? ' ask--going' : ''}`}>
      {showKeyEntry && !keyed ? (
        keyForm
      ) : (
        <>
          {!started && (
            <div className="ask__open">
              <h2 className="ask__hello">{opener ?? 'What do you need?'}</h2>
              <p className="ask__lede">
                {keyed
                  ? greeting
                  : 'No API key needed. I read this centre’s records on your device and answer from them — nothing is recalled and nothing is sent anywhere.'}
              </p>
            </div>
          )}

          {started && stream}
          {composer}
          {!started && chips}
        </>
      )}
    </div>
  );
}
