import { useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { Import } from '../components/Import';
import { IconCheck } from '../lib/icons';
import { useStore } from '../lib/store';
import { CHANNELS, ROLES, SITES, siteCounts, type RoleId } from '../data/centre';
import { ESCALATION_DEFAULTS, type Severity } from '../lib/reminders';
import { GROUPS, STUDENTS } from '../data/seed';

type Panel =
  | 'sites' | 'ratios' | 'rooming' | 'escalation' | 'access' | 'channels' | 'import';

export function Setup() {
  const {
    site, setSite, role, setRole, escalation, setEscalation, bandRules,
    setBandRules, rooming, setRooming,
  } = useStore();
  const [panel, setPanel] = useState<Panel>('sites');
  const [draftRatios, setDraftRatios] = useState(bandRules);
  const [draftEsc, setDraftEsc] = useState(escalation);
  const [channels, setChannels] = useState(CHANNELS);
  const [draftRooming, setDraftRooming] = useState(rooming);

  const ratiosDirty = draftRatios.some(
    (r, i) => r.ratio !== bandRules[i].ratio,
  );
  const escDirty = (Object.keys(draftEsc) as Severity[]).some(
    (k) => draftEsc[k] !== escalation[k],
  );

  const panels: { id: Panel; label: string }[] = [
    { id: 'sites', label: 'Sites' },
    { id: 'ratios', label: 'Age bands and ratios' },
    { id: 'rooming', label: 'Rooming' },
    { id: 'escalation', label: 'Escalation' },
    { id: 'access', label: 'Roles and access' },
    { id: 'channels', label: 'WhatsApp channels' },
    { id: 'import', label: 'Import a spreadsheet' },
  ];

  const youngest = Math.min(...bandRules.map((r) => Number(r.band.split('–')[0])));
  const oldest = Math.max(...bandRules.map((r) => Number(r.band.split('–')[1])));

  return (
    <>
      <SectionHead
        title="Centre setup"
        count={`${site.name} · ${SITES.length} sites configured · viewing as ${role.name.toLowerCase()}`}
      />

      <p className="meta section__lede">
        What a centre sets once, in the October session, and the platform then
        enforces everywhere. Ratios, escalation thresholds and access are the
        three that have to be the centre&rsquo;s own numbers — a hardcoded
        threshold is a threshold that belongs to the wrong person.
      </p>

      <div className="tabs" role="tablist" aria-label="Setup section">
        {panels.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={panel === p.id}
            className={`tab${panel === p.id ? ' tab--on' : ''}`}
            onClick={() => setPanel(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {panel === 'sites' && (
        <div className="sites">
          {SITES.map((s) => {
            const c = siteCounts(s);
            const on = s.id === site.id;
            return (
              <div key={s.id} className={`sitecard${on ? ' sitecard--on' : ''}`}>
                <div className="sitecard__head">
                  <div>
                    <h3 className="sitecard__name">{s.name}</h3>
                    <p className="meta">{s.town} · {s.director}</p>
                  </div>
                  <span className={`mark ${s.onboarded ? 'mark--clear' : 'mark--idle'}`}>
                    {s.onboarded ? 'Live' : 'Not onboarded'}
                  </span>
                </div>

                <dl className="pairs">
                  <div className="pairs__pair"><dt>Beds</dt><dd className="num">{s.capacity}</dd></div>
                  <div className="pairs__pair"><dt>Students</dt><dd className="num">{c.students}</dd></div>
                  <div className="pairs__pair"><dt>Staff</dt><dd className="num">{c.staff}</dd></div>
                  <div className="pairs__pair"><dt>Groups</dt><dd className="num">{c.groups}</dd></div>
                </dl>

                {s.onboarded ? (
                  <button
                    className={`btn${on ? '' : ' btn--primary'}`}
                    disabled={on}
                    onClick={() => setSite(s)}
                  >
                    {on ? 'You are here' : `Work in ${s.name}`}
                  </button>
                ) : (
                  <>
                    <p className="meta" style={{ margin: '0 0 12px' }}>
                      A second site is in scope from the pilot, but a site with
                      no records is not a site with invented records. Import
                      theirs and it becomes real.
                    </p>
                    <button className="btn" onClick={() => setPanel('import')}>
                      Import their spreadsheet
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {panel === 'ratios' && (
        <>
          <p className="meta" style={{ maxWidth: '66ch', marginBottom: 20 }}>
            The number the rota is handed when it checks a session. Changing it
            here changes what the timetable calls compliant, immediately and
            everywhere — which is the point, and also the reason the change is
            written to the audit trail with your name on it.
          </p>

          <div className="tablewrap">
            <table className="reg">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Students</th>
                  <th>Groups</th>
                  <th style={{ width: 140 }}>On site</th>
                  <th style={{ width: 140 }}>Off site</th>
                  <th style={{ width: 140 }}>Overnight</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {draftRatios.map((r, i) => (
                  <tr key={r.band}>
                    <td style={{ fontWeight: 500 }}>{r.band}</td>
                    <td className="num">
                      {STUDENTS.filter((s) => s.band === r.band).length}
                    </td>
                    <td className="num">
                      {GROUPS.filter((g) => g.band === r.band).length}
                    </td>
                    <td>
                      <span className="ratio">
                        <span className="ratio__one">1 :</span>
                        <input
                          className="field ratio__n num"
                          value={r.ratio}
                          aria-label={`On-site ratio for ${r.band}`}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            if (Number.isNaN(n)) return;
                            setDraftRatios(
                              draftRatios.map((x, k) =>
                                k === i ? { ...x, ratio: n } : x,
                              ),
                            );
                          }}
                        />
                      </span>
                    </td>
                    <td className="num meta">1 : {r.offSiteRatio}</td>
                    <td className="num meta">1 : {r.nightRatio}</td>
                    <td className="meta">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {draftRatios.some((r) => r.ratio < 1 || r.ratio > 30) && (
            <p className="mark mark--critical" style={{ marginTop: 14 }}>
              A ratio has to be between 1 and 30 students per staff member.
            </p>
          )}

          <div className="editor__actions">
            <button
              className="btn btn--primary"
              disabled={!ratiosDirty || draftRatios.some((r) => r.ratio < 1 || r.ratio > 30)}
              onClick={() => setBandRules(draftRatios)}
            >
              <IconCheck />
              Apply to the rota
            </button>
            <span className="meta">
              Off-site and overnight ratios are recorded but not yet enforced —
              the rota only schedules on-site activity sessions today.
            </span>
          </div>
        </>
      )}

      {panel === 'rooming' && (
        <>
          <p className="meta" style={{ maxWidth: '66ch', marginBottom: 20 }}>
            How the allocator fills beds. The language rule is the one worth
            having: two students who share a first language will speak it to
            each other for three weeks, so a language centre separates them on
            purpose. Nobody has time to check that by hand across three hundred
            students.
          </p>

          <div className="esc">
            <label className="esc__row">
              <span className="esc__name">
                First language
                <span className="meta">
                  Whether two speakers of one language may share a room
                </span>
              </span>
              <span className="esc__control">
                <select
                  className="field"
                  style={{ width: 210 }}
                  value={
                    draftRooming.sameLanguageTogether ? 'allow' : draftRooming.languageRule
                  }
                  onChange={(e) =>
                    setDraftRooming({
                      ...draftRooming,
                      sameLanguageTogether: e.target.value === 'allow',
                      languageRule: e.target.value === 'never' ? 'never' : 'avoid',
                    })
                  }
                >
                  <option value="avoid">Avoid where possible</option>
                  <option value="never">Never — refuse the bed</option>
                  <option value="allow">Allow — do not consider it</option>
                </select>
              </span>
            </label>

            <label className="esc__row">
              <span className="esc__name">
                Age spread in a room
                <span className="meta">
                  Years between the youngest and oldest, inside one band
                </span>
              </span>
              <span className="esc__control">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={draftRooming.maxAgeSpread}
                  onChange={(e) =>
                    setDraftRooming({ ...draftRooming, maxAgeSpread: Number(e.target.value) })
                  }
                />
                <span className="esc__days num">
                  {draftRooming.maxAgeSpread} year
                  {draftRooming.maxAgeSpread === 1 ? '' : 's'}
                </span>
              </span>
            </label>

            <label className="esc__row">
              <span className="esc__name">
                Reuse a bed between stays
                <span className="meta">
                  A bed takes a second student once the first has left
                </span>
              </span>
              <span className="esc__control">
                <input
                  type="checkbox"
                  checked={draftRooming.reuseBeds}
                  onChange={(e) =>
                    setDraftRooming({ ...draftRooming, reuseBeds: e.target.checked })
                  }
                />
                <span className="esc__days">
                  {draftRooming.reuseBeds ? 'On' : 'Off'}
                </span>
              </span>
            </label>

            <div className="esc__row">
              <span className="esc__name">
                Rooming by gender
                <span className="meta">
                  Not configured, and not guessed
                </span>
              </span>
              <span className="esc__control">
                <span className="mark mark--idle">Unset</span>
              </span>
            </div>
          </div>

          <p className="meta" style={{ marginTop: 16, maxWidth: '66ch', color: 'var(--ink-3)' }}>
            Whether a centre rooms by gender, and how, is specified in October.
            Putting a guess into a safeguarding-adjacent decision is worse than
            leaving it visibly unset, so the allocator does not consider it and
            says so on every plan.
          </p>

          <div className="editor__actions">
            <button
              className="btn btn--primary"
              disabled={JSON.stringify(draftRooming) === JSON.stringify(rooming)}
              onClick={() => setRooming(draftRooming)}
            >
              <IconCheck />
              Save rooming rules
            </button>
            <span className="meta">
              Changing these does not move anybody. Re-plan the beds in Room
              allocations to see what they would do.
            </span>
          </div>
        </>
      )}

      {panel === 'escalation' && (
        <>
          <p className="meta" style={{ maxWidth: '66ch', marginBottom: 20 }}>
            How many days an item waits, past its due date, before it stops
            being the admin&rsquo;s problem and becomes management&rsquo;s. The
            contract is explicit that this is per centre and not hardcoded, so
            it is set here and read everywhere.
          </p>

          <div className="esc">
            {(['safeguarding', 'overdue', 'admin'] as Severity[]).map((sev) => (
              <label key={sev} className="esc__row">
                <span className="esc__name">
                  {sev === 'safeguarding'
                    ? 'Safeguarding'
                    : sev === 'overdue'
                    ? 'Overdue'
                    : 'Admin'}
                  <span className="meta">
                    {sev === 'safeguarding'
                      ? 'Goes to the safeguarding lead and the director'
                      : 'Goes to the centre director'}
                  </span>
                </span>
                <span className="esc__control">
                  <input
                    type="range"
                    min={0}
                    max={21}
                    value={draftEsc[sev]}
                    onChange={(e) =>
                      setDraftEsc({ ...draftEsc, [sev]: Number(e.target.value) })
                    }
                  />
                  <span className="esc__days num">
                    {draftEsc[sev]} day{draftEsc[sev] === 1 ? '' : 's'}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {draftEsc.safeguarding > draftEsc.admin && (
            <p className="mark mark--critical" style={{ marginTop: 14 }}>
              Safeguarding would wait longer than admin. That inverts the one
              principle this product does not bend on.
            </p>
          )}

          <div className="editor__actions">
            <button
              className="btn btn--primary"
              disabled={!escDirty || draftEsc.safeguarding > draftEsc.admin}
              onClick={() => setEscalation(draftEsc)}
            >
              <IconCheck />
              Save thresholds
            </button>
            <button
              className="btn"
              onClick={() => setDraftEsc(ESCALATION_DEFAULTS)}
              disabled={
                (Object.keys(ESCALATION_DEFAULTS) as Severity[]).every(
                  (k) => draftEsc[k] === ESCALATION_DEFAULTS[k],
                )
              }
            >
              Back to the defaults
            </button>
          </div>
        </>
      )}

      {panel === 'access' && (
        <>
          <p className="meta" style={{ maxWidth: '66ch', marginBottom: 20 }}>
            Change the role and the whole interface changes with it — sections
            disappear from the menu, and special category data stops being
            shown. Try <strong>Activity staff</strong> and open any student.
          </p>

          <div className="roles">
            {ROLES.map((r) => (
              <button
                key={r.id}
                className={`rolecard${r.id === role.id ? ' rolecard--on' : ''}`}
                onClick={() => setRole(r)}
                aria-pressed={r.id === role.id}
              >
                <span className="rolecard__name">{r.name}</span>
                <span className="meta rolecard__who">{r.who}</span>
                <span className="meta rolecard__sees">
                  {r.sections.length} of 13 sections ·{' '}
                  {r.welfareDetail ? 'sees welfare notes' : 'no welfare notes'} ·{' '}
                  {r.canEditRecords ? 'can edit' : 'read only'}
                </span>
                {r.id === role.id && (
                  <span className="mark mark--clear rolecard__on">Viewing as this</span>
                )}
              </button>
            ))}
          </div>

          <p className="meta" style={{ marginTop: 22, color: 'var(--ink-3)', maxWidth: '66ch' }}>
            This is the shape of role-based access, enforced in the interface.
            Real access control is enforced on a server, against an
            authenticated session — not in a browser that the user controls.
          </p>
        </>
      )}

      {panel === 'channels' && (
        <>
          <p className="meta" style={{ maxWidth: '66ch', marginBottom: 20 }}>
            Every centre already runs on WhatsApp groups. The platform does not
            replace them; it needs to know which group belongs to which
            activity group so a chase lands in the right one.
          </p>

          <div className="tablewrap">
            <table className="reg">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Channel</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => {
                  const g = GROUPS.find((x) => x.id === c.groupId)!;
                  return (
                    <tr key={c.groupId}>
                      <td style={{ fontWeight: 500 }}>{g.name}</td>
                      <td className="meta">{c.name}</td>
                      <td className="num">{c.members}</td>
                      <td>
                        <span className={`mark ${c.linked ? 'mark--clear' : 'mark--idle'}`}>
                          {c.linked ? 'Linked' : 'Not linked'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn"
                          onClick={() =>
                            setChannels(
                              channels.map((x) =>
                                x.groupId === c.groupId
                                  ? { ...x, linked: !x.linked }
                                  : x,
                              ),
                            )
                          }
                        >
                          {c.linked ? 'Unlink' : 'Link'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="meta" style={{ marginTop: 16, color: 'var(--ink-3)' }}>
            Linking is recorded here only. Sending into a WhatsApp group needs
            the Business API and a number the centre owns.
          </p>
        </>
      )}

      {panel === 'import' && <Import bands={[youngest, oldest]} />}
    </>
  );
}
