/* ── The inspection pack, as a document ───────────────────────────────────
   Opened from the audit trail. On screen it is a page laid over the app with
   a range picker and a print button; printed (or saved as PDF from the
   browser's print dialog) it is an A4 document with none of the app around
   it. The browser's own print-to-PDF is the export: it needs no library, it
   works inside the single-file demo, and it is what an administrator would
   reach for anyway.
   ──────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../lib/store';
import { entry } from '../lib/audit';
import { CATEGORY_LABEL } from '../lib/audit';
import { LEVEL_COPY } from '../data/incidents';
import {
  SEASON_START, demoIso, demoStamp, fmtDateLong,
} from '../data/seed';
import { buildPack, fmtWait, notCleared } from '../lib/inspection';
import { IconClose } from '../lib/icons';

const p2 = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const at = (s: string | null) => (s ? s.replace('T', ' ').slice(0, 16) : '—');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function InspectionPack({ onClose }: { onClose: () => void }) {
  const {
    audit, staff, students, sessions, registers, incidents, role, site, log,
  } = useStore();
  const seasonStart = isoOf(SEASON_START);
  const today = demoIso();
  const [from, setFrom] = useState(seasonStart);
  const [to, setTo] = useState(today);
  const panel = useRef<HTMLDivElement>(null);
  /* Fixed when the pack is opened, so the cover does not tick on screen. */
  const [producedAt] = useState(() => demoStamp().replace('T', ' '));

  const range = from <= to ? { from, to } : { from: to, to: from };
  const pack = useMemo(
    () =>
      buildPack({
        ...range,
        audit,
        staff,
        students,
        sessions,
        registers,
        incidents,
        now: demoStamp(),
      }),
    [range.from, range.to, audit, staff, students, sessions, registers, incidents],
  );

  const rangeText = `${fmtDateLong(range.from)} – ${fmtDateLong(range.to)}`;

  /* Producing a pack is a consequential act — it is the moment the record
     leaves the system — so it goes in the trail like everything else. Once
     on open; printing logs again with the range actually printed. */
  useEffect(() => {
    log(
      entry(
        'safeguarding',
        'Inspection pack produced',
        site.name,
        `${fmtDateLong(seasonStart)} – ${fmtDateLong(today)}, produced by ${role.name}.`,
        role.name,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
      prevFocus?.focus();
    };
  }, [onClose]);

  function print() {
    log(
      entry(
        'safeguarding',
        'Inspection pack printed',
        site.name,
        `${rangeText}, printed or saved by ${role.name}.`,
        role.name,
      ),
    );
    window.print();
  }

  const name = (id: string) => {
    const s = staff.find((x) => x.id === id) ?? students.find((x) => x.id === id);
    return s ? `${s.forename} ${s.surname}` : id;
  };

  const s = pack.summary;
  const dbsBad = pack.vetting.filter((v) => notCleared(v.staff));
  const dbsLabel = (st: string) =>
    st === 'cleared' ? 'Cleared' : st === 'expiring' ? 'Cleared, expiring' : `Not cleared (${st})`;
  const dbsExpiring = pack.vetting.filter((v) => v.expiresInRange);

  return createPortal(
    <div
      className="pack"
      role="dialog"
      aria-modal="true"
      aria-label="Inspection pack"
      ref={panel}
      tabIndex={-1}
    >
      <div className="pack__bar">
        <div className="pack__range">
          <label className="label" htmlFor="pack-from">From</label>
          <input
            id="pack-from"
            type="date"
            className="field"
            value={from}
            min={seasonStart}
            max={today}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
          />
          <label className="label" htmlFor="pack-to">To</label>
          <input
            id="pack-to"
            type="date"
            className="field"
            value={to}
            min={seasonStart}
            max={today}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
        </div>
        <div className="pack__acts">
          <button className="btn btn--primary" onClick={print}>
            Print / save as PDF
          </button>
          <button className="btn btn--quiet" onClick={onClose} aria-label="Close inspection pack">
            <IconClose /> Close
          </button>
        </div>
      </div>

      <article className="pack__doc">
        {/* ── Cover ─────────────────────────────────────────────────── */}
        <header className="pack__cover">
          <p className="pack__demo">Demonstration — seeded data. No real person or event appears in this pack.</p>
          <p className="label">Safeguarding record · structured for inspection</p>
          <h1 className="pack__title">{site.name}</h1>
          <p className="pack__sub">{rangeText}</p>
          <dl className="pack__meta">
            <div><dt>Produced by</dt><dd>{role.name}</dd></div>
            <div><dt>Produced at</dt><dd className="num">{producedAt}</dd></div>
            <div><dt>Source</dt><dd>Kadia audit trail and centre records</dd></div>
          </dl>
        </header>

        {/* ── Summary ──────────────────────────────────────────────── */}
        <section className="pack__sec">
          <h2>1. Summary</h2>
          <p>
            Across this period the centre ran {plural(s.sessionsRun, 'activity session')} with{' '}
            {plural(s.staffWorking, 'member of staff', 'members of staff')} contracted.{' '}
            {s.sessionsRun === 0
              ? 'No sessions are on record for this period, so no ratio could be checked.'
              : s.breaches === 0
              ? 'Every session that ran met its required ratio and staffing conditions.'
              : `${plural(s.breaches, 'session')} did not meet its required ratio or staffing conditions; each is listed in section 3 with what the record shows was done.`}{' '}
            {s.staffUncleared === 0
              ? 'Every member of staff held a cleared DBS check.'
              : `${plural(s.staffUncleared, 'member of staff', 'members of staff')} did not hold a cleared DBS check; ${
                  s.unclearedRotad === 0
                    ? 'none of them was rota’d onto a session with students.'
                    : `${s.unclearedRotad} of them ${s.unclearedRotad === 1 ? 'was' : 'were'} rota’d onto sessions with students (section 2).`
                }`}{' '}
            {plural(s.incidents, 'incident')} {s.incidents === 1 ? 'was' : 'were'} recorded
            {s.incidentsOpen ? `, ${s.incidentsOpen} still open` : ''}, and{' '}
            {plural(s.escalations, 'item')} escalated to management
            {s.escalationsUnacted ? `, ${s.escalationsUnacted} with no follow-up action yet recorded` : ''}.
          </p>
          <dl className="pack__figs">
            <Fig n={s.sessionsRun} label="sessions run" />
            <Fig n={s.breaches} label="below ratio or condition" bad={s.breaches > 0} />
            <Fig n={s.staffUncleared} label="staff without cleared DBS" bad={s.staffUncleared > 0} />
            <Fig n={s.registersMissing} label="sessions with no register" bad={s.registersMissing > 0} />
            <Fig n={s.incidents} label="incidents" />
            <Fig n={s.escalations} label="escalations" />
          </dl>
        </section>

        {/* ── Vetting ──────────────────────────────────────────────── */}
        <section className="pack__sec">
          <h2>2. Staff vetting</h2>
          {pack.unclearedOnRota.length > 0 ? (
            <div className="pack__flag">
              <p><strong>Staff without a cleared DBS on sessions with students</strong></p>
              {pack.unclearedOnRota.map((u) => (
                <div key={u.staff.id} className="pack__flagrow">
                  <p>
                    {u.staff.forename} {u.staff.surname} — DBS {u.staff.dbs.state}.
                    Rota’d onto {plural(u.sessions.length, 'session')}:{' '}
                    {u.sessions.map((x) => `${x.day} ${x.start}`).join(', ')}.
                  </p>
                  <p className="meta">
                    {u.record.length
                      ? `Record: ${u.record.map((e) => `${e.at} ${e.action} (${e.actor})`).join('; ')}.`
                      : 'No action recorded in the audit trail.'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No member of staff without a cleared DBS check was rota’d onto a session with students in this period.</p>
          )}
          {dbsExpiring.length > 0 && (
            <p className="meta">
              {plural(dbsExpiring.length, 'DBS certificate')} expire{dbsExpiring.length === 1 ? 's' : ''} on or before {fmtDateLong(range.to)}.
            </p>
          )}
          <table className="pack__table">
            <thead>
              <tr><th>Name</th><th>Role</th><th>DBS</th><th>Certificate</th><th>Expires</th><th className="num">Sessions</th></tr>
            </thead>
            <tbody>
              {pack.vetting.map((v) => (
                <tr
                  key={v.staff.id}
                  className={notCleared(v.staff) ? 'pack__row--bad' : v.expiresInRange ? 'pack__row--warn' : ''}
                >
                  <td>{v.staff.forename} {v.staff.surname}</td>
                  <td>{v.staff.role}</td>
                  <td>{dbsLabel(v.staff.dbs.state)}</td>
                  <td className="num">{v.staff.dbs.certificate ?? '—'}</td>
                  <td className="num">{v.staff.dbs.expires ?? '—'}</td>
                  <td className="num">{v.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dbsBad.length === 0 && <p className="meta">Every member of staff contracted in this period held a cleared DBS.</p>}
        </section>

        {/* ── Ratios ───────────────────────────────────────────────── */}
        <section className="pack__sec">
          <h2>3. Ratios and registers</h2>
          <p className="meta">
            Required ratios are this centre’s configured values (Centre setup → Age bands and ratios).
            Checked: {plural(s.sessionsChecked, 'session')} that had started by the time the pack was produced.
            {pack.earliestSession && pack.earliestSession > range.from && (
              <> The timetable holds sessions from {fmtDateLong(pack.earliestSession)} onwards; nothing earlier in this period is on record, so nothing earlier was checked.</>
            )}
            {!pack.earliestSession && <> No sessions are on record in this period.</>}
          </p>
          {s.sessionsRun === 0 ? null : pack.breaches.length === 0 ? (
            <p>Every session that ran met its required ratio, had cleared and available staff, and had a qualified instructor where the activity requires one.</p>
          ) : (
            <table className="pack__table">
              <thead>
                <tr><th>Date</th><th>Session</th><th className="num">Required</th><th className="num">Assigned</th><th>What was wrong</th><th>What the record shows</th></tr>
              </thead>
              <tbody>
                {pack.breaches.map((b) => (
                  <tr key={b.session.id} className="pack__row--bad">
                    <td className="num">{b.session.day}</td>
                    <td>{b.label} <span className="meta">1:{b.verdict.ratio}, {b.verdict.headcount} students</span></td>
                    <td className="num">{b.verdict.required}</td>
                    <td className="num">{b.verdict.assigned}</td>
                    <td>{b.verdict.reasons.join('. ')}.</td>
                    <td>
                      {b.resolution.length
                        ? b.resolution.map((e) => `${e.at} ${e.action} (${e.actor})`).join('; ')
                        : <em>No resolution recorded</em>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3>Registers</h3>
          {s.sessionsRun === 0 ? (
            <p>No sessions are on record for this period.</p>
          ) : pack.registersMissing.length === 0 ? (
            <p>A register was taken for every session that ran.</p>
          ) : (
            <ul className="pack__list">
              {pack.registersMissing.map((r) => (
                <li key={r.session.id}>
                  <span className="num">{r.session.day}</span> {r.label} — no register recorded.
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Incidents ────────────────────────────────────────────── */}
        <section className="pack__sec">
          <h2>4. Incidents</h2>
          {pack.incidents.length === 0 ? (
            <p>No incidents were recorded in this period.</p>
          ) : (
            pack.incidents.map((i) => (
              <div key={i.id} className={`pack__incident${i.level === 'notifiable' ? ' pack__incident--bad' : ''}`}>
                <p className="pack__incidenthead">
                  <span className="num">{at(i.at)}</span> · {i.kind} · {LEVEL_COPY[i.level].label} ·{' '}
                  {i.status === 'open' ? <strong>Open</strong> : 'Closed'}
                </p>
                <dl className="pack__kv">
                  <div><dt>Where</dt><dd>{i.where}</dd></div>
                  <div><dt>Students</dt><dd>{i.studentIds.map(name).join(', ') || '—'}</dd></div>
                  <div><dt>Staff</dt><dd>{i.staffIds.map(name).join(', ') || '—'}</dd></div>
                  <div><dt>What happened</dt><dd>{i.what}</dd></div>
                  <div><dt>Action taken</dt><dd>{i.action}</dd></div>
                  <div><dt>Reported by</dt><dd>{i.reportedBy}</dd></div>
                  <div><dt>Safeguarding lead told</dt><dd className="num">{i.dslInformedAt ? at(i.dslInformedAt) : <em>Not recorded</em>}</dd></div>
                  <div><dt>Parents told</dt><dd className="num">{i.parentsInformedAt ? at(i.parentsInformedAt) : <em>Not recorded</em>}</dd></div>
                  <div><dt>Follow-up</dt><dd>{i.followUp ?? '—'}</dd></div>
                </dl>
              </div>
            ))
          )}
        </section>

        {/* ── Escalations ──────────────────────────────────────────── */}
        <section className="pack__sec">
          <h2>5. Escalations</h2>
          {pack.escalations.length === 0 ? (
            <p>Nothing was escalated to management in this period.</p>
          ) : (
            <table className="pack__table">
              <thead>
                <tr><th>When</th><th>Item</th><th>How</th><th>Trigger</th><th>First action after</th><th className="num">Wait</th></tr>
              </thead>
              <tbody>
                {pack.escalations.map((e) => (
                  <tr key={e.entry.id} className={e.entry.category === 'safeguarding' ? 'pack__row--warn' : ''}>
                    <td className="num">{e.entry.at}</td>
                    <td>{e.entry.subject} <span className="meta">{CATEGORY_LABEL[e.entry.category]}</span></td>
                    <td>{e.automatic ? 'Automatic' : `By ${e.entry.actor}`}</td>
                    <td>{e.entry.detail}</td>
                    <td>{e.actedOn ? `${e.actedOn.action} (${e.actedOn.actor})` : <em>None recorded</em>}</td>
                    <td className="num">{fmtWait(e.minutesToAct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ── Appendix ─────────────────────────────────────────────── */}
        <section className="pack__sec pack__sec--appendix">
          <h2>Appendix — audit trail, {plural(pack.appendix.length, 'entry', 'entries')}</h2>
          <p className="meta">Every entry in the period, oldest first, exactly as recorded. Entries are appended and never edited.</p>
          <table className="pack__table pack__table--dense">
            <thead>
              <tr><th>Timestamp</th><th>Category</th><th>Action</th><th>Subject</th><th>Detail</th><th>Recorded by</th></tr>
            </thead>
            <tbody>
              {pack.appendix.map((e) => (
                <tr key={e.id}>
                  <td className="num">{e.at}</td>
                  <td>{CATEGORY_LABEL[e.category]}</td>
                  <td>{e.action}</td>
                  <td>{e.subject}</td>
                  <td>{e.detail}</td>
                  <td>{e.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="pack__foot">
          <p>
            {site.name} · {rangeText} · produced {producedAt} by {role.name} · Demonstration — seeded data
          </p>
        </footer>
      </article>
    </div>,
    document.body,
  );
}

function Fig({ n, label, bad }: { n: number; label: string; bad?: boolean }) {
  return (
    <div className={`pack__fig${bad ? ' pack__fig--bad' : ''}`}>
      <dt className="num">{n}</dt>
      <dd>{label}</dd>
    </div>
  );
}
