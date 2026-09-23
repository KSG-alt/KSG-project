import { useMemo, useState } from 'react';
import { IconCheck } from '../lib/icons';
import {
  FIELDS, SAMPLE, guessMapping, parseCsv, validate, type FieldId, type Mapping,
} from '../lib/importCsv';

/* Three steps because there are three decisions: is this the right file, are
   these the right columns, and are these rows good enough to take. */
type Step = 'paste' | 'map' | 'check';

export function Import({ bands }: { bands: [number, number] }) {
  const [text, setText] = useState('');
  const [step, setStep] = useState<Step>('paste');
  const [map, setMap] = useState<Mapping>({});

  const table = useMemo(() => parseCsv(text), [text]);
  const checked = useMemo(
    () => (table.headers.length ? validate(table, map, bands) : null),
    [table, map, bands],
  );

  const unmapped = FIELDS.filter((f) => f.required && map[f.id] === undefined);

  const load = (value: string) => {
    setText(value);
    const t = parseCsv(value);
    setMap(guessMapping(t.headers));
    setStep(t.headers.length ? 'map' : 'paste');
  };

  return (
    <div className="import">
      <div className="import__steps">
        {(['paste', 'map', 'check'] as Step[]).map((s, i) => (
          <button
            key={s}
            className={`import__step${step === s ? ' import__step--on' : ''}`}
            disabled={s !== 'paste' && !table.headers.length}
            onClick={() => setStep(s)}
          >
            <span className="num">{i + 1}</span>
            {s === 'paste' ? 'The file' : s === 'map' ? 'The columns' : 'The rows'}
          </button>
        ))}
      </div>

      {step === 'paste' && (
        <>
          <p className="meta" style={{ maxWidth: '66ch' }}>
            Paste the centre&rsquo;s student export — the spreadsheet they have
            been keeping, with whatever column names they chose. Nothing is
            written to the roll: this is a dry run that tells you what would
            land and what would fail.
          </p>
          <textarea
            className="field import__paste"
            rows={8}
            placeholder="Paste CSV here, header row first"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="editor__actions">
            <button
              className="btn btn--primary"
              disabled={!text.trim()}
              onClick={() => load(text)}
            >
              Read the columns
            </button>
            <button className="btn" onClick={() => load(SAMPLE)}>
              Use a sample export
            </button>
            <span className="meta">
              The sample is a seeded file with the four mistakes that are in
              every real one.
            </span>
          </div>
        </>
      )}

      {step === 'map' && (
        <>
          <p className="meta" style={{ maxWidth: '66ch' }}>
            {table.rows.length} rows, {table.headers.length} columns. The
            mapping below is a guess from the header names — correct anything
            wrong before checking the rows. Dates are read day-first, because a
            UK centre&rsquo;s spreadsheet is.
          </p>
          <div className="import__map">
            {FIELDS.map((f) => (
              <label key={f.id} className="editor__f">
                <span className="label">
                  {f.label}
                  {f.required && <span style={{ color: 'var(--oxide)' }}> ·</span>}
                </span>
                <select
                  className="field"
                  value={map[f.id] ?? ''}
                  onChange={(e) =>
                    setMap({
                      ...map,
                      [f.id]: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                >
                  <option value="">Not in this file</option>
                  {table.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
                {map[f.id] !== undefined && table.rows[0] && (
                  <span className="meta import__eg">
                    e.g. {table.rows[0][map[f.id]!] || '(empty)'}
                  </span>
                )}
              </label>
            ))}
          </div>

          {unmapped.length > 0 && (
            <p className="mark mark--critical mt-4">
              {unmapped.map((f) => f.label).join(', ')} —{' '}
              {unmapped.length === 1 ? 'this column is' : 'these columns are'}{' '}
              required and not in the file
            </p>
          )}

          <div className="editor__actions">
            <button
              className="btn btn--primary"
              disabled={unmapped.length > 0}
              onClick={() => setStep('check')}
            >
              Check the rows
            </button>
          </div>
        </>
      )}

      {step === 'check' && checked && (
        <>
          <div className="import__score">
            <p className="import__big num">
              {checked.ok}
              <span className="import__of"> of {table.rows.length}</span>
            </p>
            <p className="meta">
              rows would import cleanly. The rest are listed below, by row
              number, so the centre can fix their own file once rather than
              correcting records afterwards.
            </p>
          </div>

          {checked.duplicates.length > 0 && (
            <>
              <p className="label">Duplicates</p>
              <ul className="log">
                {checked.duplicates.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          )}

          {checked.problems.length === 0 ? (
            <p className="mark mark--clear">Every row passes.</p>
          ) : (
            <>
              <p className="label">{checked.problems.length} problems</p>
              <div className="tablewrap">
                <table className="reg" aria-label="Rows the import could not read">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: 80 }}>Row</th>
                      <th scope="col" style={{ width: '22%' }}>Column</th>
                      <th scope="col">What is wrong</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checked.problems.slice(0, 40).map((p, i) => (
                      <tr key={i}>
                        <td className="num">{p.row}</td>
                        <td className="meta">
                          {FIELDS.find((f) => f.id === p.field)?.label ?? p.field}
                        </td>
                        <td>{p.problem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {checked.ready.length > 0 && (
            <>
              <p className="label">What would land</p>
              <div className="tablewrap">
                <table className="reg" aria-label="Students the import will add">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Arrives</th>
                      <th scope="col">Leaves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checked.ready.slice(0, 12).map((r, i) => (
                      <tr key={i}>
                        <td>
                          {r.forename} {r.surname}
                        </td>
                        <td className="num">{r.arrival}</td>
                        <td className="num">{r.leaving}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="editor__actions">
            <button className="btn" disabled>
              <IconCheck />
              Import {checked.ok} students
            </button>
            <span className="meta">
              Disabled on purpose. Writing to a roll needs the real records
              service, not a prototype holding a parsed spreadsheet in a
              browser tab.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
