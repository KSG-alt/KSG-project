import { useEffect, useRef, useState } from 'react';
import { IconClose, IconSend } from '../lib/icons';
import { clearKey, getKey, hasKey, run, setKey, type Msg, type ToolSpec } from '../lib/anthropic';

interface Turn {
  who: 'you' | 'kadia';
  text: string;
  tools?: string[];
}

export function Chat({
  system,
  tools,
  greeting,
  placeholder,
  suggestions = [],
  onApplied,
}: {
  system: string;
  tools: ToolSpec[];
  greeting: string;
  placeholder: string;
  suggestions?: string[];
  onApplied?: () => void;
}) {
  const [keyed, setKeyed] = useState(hasKey());
  const [draftKey, setDraftKey] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useRef<Msg[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput('');
    setError(null);
    setTurns((t) => [...t, { who: 'you', text: clean }]);
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

  if (!keyed) {
    return (
      <div className="chat">
        <div className="chat__gate">
          <p className="label" style={{ marginBottom: 12 }}>API key needed</p>
          <p className="meta" style={{ margin: '0 0 16px', maxWidth: '62ch' }}>
            This panel calls the Anthropic API straight from the browser. The key
            is held in this browser&rsquo;s <code>localStorage</code> only — it is
            never written into the repository and never sent anywhere but
            api.anthropic.com.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                }
              }}
            />
            <button
              className="btn btn--primary"
              disabled={!draftKey.trim()}
              onClick={() => {
                setKey(draftKey);
                setKeyed(true);
              }}
            >
              Use this key
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat__head">
        <span className="label">Chat</span>
        <button
          className="btn btn--quiet"
          onClick={() => {
            clearKey();
            setKeyed(false);
            setTurns([]);
            history.current = [];
          }}
          title={`Key ending ${getKey().slice(-4)}`}
        >
          <IconClose />
          Forget key
        </button>
      </div>

      <div className="chat__scroll" ref={scroller}>
        <p className="chat__greeting meta">{greeting}</p>

        {turns.map((t, i) => (
          <div key={i} className={`bubble bubble--${t.who}`}>
            {t.who === 'kadia' && <span className="label">Kadia</span>}
            <p>{t.text}</p>
            {t.tools && t.tools.length > 0 && (
              <p className="bubble__tools meta">
                Read {Array.from(new Set(t.tools)).join(', ')}
              </p>
            )}
          </div>
        ))}

        {busy && (
          <div className="bubble bubble--kadia">
            <span className="label">Kadia</span>
            <span className="typing" aria-label="Thinking">
              <i /><i /><i />
            </span>
          </div>
        )}

        {error && (
          <p className="mark mark--critical" style={{ margin: '10px 0' }}>
            {error}
          </p>
        )}

        {turns.length === 0 && suggestions.length > 0 && (
          <div className="chat__suggest">
            {suggestions.map((s) => (
              <button key={s} className="btn" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        className="chat__compose"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="field"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="btn btn--primary" disabled={busy || !input.trim()}>
          <IconSend />
          Send
        </button>
      </form>
    </div>
  );
}
