import { useState } from 'react';
import { Drawer, DrawerTabs } from './Drawer';
import { StaffProfile } from './StaffProfile';
import { StudentProfile } from './StudentProfile';
import { useStore } from '../lib/store';
import { checkRatio } from '../lib/ratio';
import { guideFor } from '../data/guides';
import { venueFor } from '../data/venues';
import { runPlan } from '../lib/runplan';

import {
  BOOKINGS, activityById, fmtDate, fmtDateLong, fmtMoney, groupById, isAway,
  readiness, type Session,
} from '../data/seed';

type Tab = 'guide' | 'plan' | 'travel' | 'today' | 'group' | 'booking' | 'safety';

export function ActivityGuide({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const { staff, students, role } = useStore();
  const [tab, setTab] = useState<Tab>('plan');
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [openStudent, setOpenStudent] = useState<string | null>(null);

  const a = activityById(session.activityId);
  const g = guideFor(session.activityId);
  const group = groupById(session.groupId);
  const v = checkRatio(session);
  const onDuty = session.staffIds
    .map((id) => staff.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const roll = students.filter((s) => s.groupId === group.id);

  /* The booking that pays for this session. Same activity, same group, same
     day is the one that pays for THIS session; anything else is the season's
     booking for the same trip on another date, and the screen has to say so
     rather than let a leader read a receipt that belongs to a different day. */
  const booking =
    BOOKINGS.find(
      (b) => b.activityId === a.id && b.groupId === group.id && b.date === session.day,
    ) ?? null;
  const otherDay =
    booking === null
      ? BOOKINGS.find((b) => b.activityId === a.id && b.groupId === group.id) ?? null
      : null;

  const qualHolder = a.requiresQual
    ? onDuty.find((s) => s.quals.includes(a.requiresQual!))
    : null;

  /* Students the leader has to know about before the session starts. */
  const noTravel = g?.offSite
    ? roll.filter((s) => !s.guardian.consentToTravel)
    : [];
  const medical = roll.filter((s) => s.medical);
  const notReady = roll.filter((s) => !readiness(s).ready);

  const venue = venueFor(a.location);
  const plan = runPlan(session);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'plan', label: 'The plan' },
    { id: 'travel', label: `Getting there${plan.tooTight ? ' ·' : ''}` },
    { id: 'guide', label: 'How to run it' },
    { id: 'today', label: `Running it ${onDuty.length}` },
    { id: 'group', label: `The group ${roll.length}` },
    { id: 'booking', label: booking || otherDay ? 'Booking' : 'Cost' },
    { id: 'safety', label: 'Safety' },
  ];

  return (
    <>
      {openStaff && (
        <StaffProfile id={openStaff} onClose={() => setOpenStaff(null)} />
      )}
      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}

      <Drawer
        title={a.name}
        sub={
          <>
            {group.name} · {session.start}–{session.end} · {a.location}
            {g?.offSite ? ' · off site' : ''}
          </>
        }
        tag={
          session.status === 'cancelled' ? (
            <span className="mark mark--idle">Cancelled</span>
          ) : v.compliant ? (
            <span className="mark mark--clear">
              {v.assigned}/{v.required} staff
            </span>
          ) : (
            <span className="mark mark--critical">
              {v.assigned}/{v.required} staff
            </span>
          )
        }
        onClose={onClose}
        foot={
          g ? (
            <span className="meta">
              Centre procedure · owned by {g.owner} · last reviewed{' '}
              {fmtDateLong(g.reviewed)}
            </span>
          ) : (
            <span className="meta">No written procedure for this activity yet.</span>
          )
        }
      >
        <DrawerTabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === 'plan' && (
          <>
            {plan.tooTight ? (
              <div className="alert alert--critical">
                <p className="label">This does not fit the slot</p>
                <p className="meta" style={{ margin: 0 }}>
                  {plan.travelMinutes} minutes of travel out of a{' '}
                  {Math.round(
                    (Number(session.end.slice(0, 2)) * 60 +
                      Number(session.end.slice(3)) -
                      (Number(session.start.slice(0, 2)) * 60 +
                        Number(session.start.slice(3)))),
                  )}
                  -minute slot leaves nothing for the activity. Give it a longer
                  slot or a nearer venue.
                </p>
              </div>
            ) : (
              <div className="split">
                <span>
                  <span className="split__n num">{plan.activityMinutes}</span>
                  <span className="meta">minutes of {a.name.toLowerCase()}</span>
                </span>
                <span>
                  <span className="split__n num">{plan.travelMinutes}</span>
                  <span className="meta">minutes travelling, there and back</span>
                </span>
                <span>
                  <span className="split__n num">20</span>
                  <span className="meta">setting up and packing down</span>
                </span>
              </div>
            )}

            <p className="label">Who does what</p>
            <dl className="pairs">
              <div className="pairs__pair">
                <dt>Lead</dt>
                <dd>{plan.lead ?? <span className="mark mark--critical">Nobody assigned</span>}</dd>
              </div>
              <div className="pairs__pair">
                <dt>Second</dt>
                <dd>{plan.second ?? <span className="mark mark--overdue">Nobody else on it</span>}</dd>
              </div>
              {plan.needsDriver && (
                <div className="pairs__pair">
                  <dt>Driver</dt>
                  <dd>
                    {plan.driver ?? (
                      <span className="mark mark--critical">
                        Nobody holds Minibus D1 — it cannot travel
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <p className="label">Minute by minute</p>
            <ol className="plan">
              {plan.steps.map((st, i) => (
                <li key={i} className={`plan__step plan__step--${st.kind}`}>
                  <span className="plan__at num">{st.at}</span>
                  <span className={`plan__who plan__who--${st.who.toLowerCase()}`}>
                    {st.who}
                  </span>
                  <span className="plan__what">{st.what}</span>
                </li>
              ))}
            </ol>

            <p className="meta" style={{ marginTop: 18, color: 'var(--ink-3)' }}>
              Times are worked out from the slot and the travel, so a session
              moved to another slot gets a plan that is still right.
            </p>
          </>
        )}

        {tab === 'travel' && (
          venue ? (
            <>
              <dl className="pairs">
                <div className="pairs__pair"><dt>How</dt><dd>{venue.travel}</dd></div>
                <div className="pairs__pair">
                  <dt>How long</dt>
                  <dd className="num">{venue.minutes} minutes each way</dd>
                </div>
                <div className="pairs__pair"><dt>Meet at</dt><dd>{venue.meetAt}</dd></div>
                {venue.capacityPerVehicle && (
                  <div className="pairs__pair">
                    <dt>Per vehicle</dt>
                    <dd>
                      <span className="num">{venue.capacityPerVehicle} seats</span>
                      {roll.length > venue.capacityPerVehicle && (
                        <span className="mark mark--overdue" style={{ display: 'block', marginTop: 4 }}>
                          {Math.ceil(roll.length / venue.capacityPerVehicle)} runs to move{' '}
                          {roll.length} students
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {venue.parking && (
                  <div className="pairs__pair"><dt>Parking</dt><dd>{venue.parking}</dd></div>
                )}
              </dl>

              {venue.needsDriver && (
                <div className={`alert${plan.driver ? '' : ' alert--critical'}`}>
                  <p className="label">Needs a D1 driver</p>
                  <p className="meta" style={{ margin: 0 }}>
                    {plan.driver
                      ? `${plan.driver} holds Minibus D1 and is on this session.`
                      : 'Nobody on this session holds Minibus D1. It cannot travel as staffed.'}
                  </p>
                </div>
              )}

              <p className="label">The route</p>
              <ol className="steps">
                {venue.route.map((r, i) => (
                  <li key={i}>
                    <span className="steps__n num">{i + 1}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>

              <p className="label">Getting there with a wheelchair or an injury</p>
              <p className="meta" style={{ margin: 0 }}>{venue.accessible}</p>

              <p className="label">Worth knowing</p>
              <p className="meta" style={{ margin: 0 }}>{venue.notes}</p>
            </>
          ) : (
            <p className="meta">
              No directions written for {a.location} yet.
            </p>
          )
        )}

        {!g && (
          <div className="alert alert--critical">
            <p className="label">Nothing written down</p>
            <p className="meta" style={{ margin: 0 }}>
              This activity runs without a procedure. Write one before it runs
              again — the first person to need it will be somebody running it
              for the first time.
            </p>
          </div>
        )}

        {g && tab === 'guide' && (
          <>
            <p className="guide__lede">{g.summary}</p>

            <dl className="pairs">
              <div className="pairs__pair"><dt>Runs for</dt><dd>{g.duration}</dd></div>
              <div className="pairs__pair"><dt>Group size</dt><dd>{g.groupSize}</dd></div>
              <div className="pairs__pair"><dt>Capacity</dt><dd className="num">{a.capacity}</dd></div>
              <div className="pairs__pair">
                <dt>Needs</dt>
                <dd>
                  {a.requiresQual ? (
                    <span className="mark mark--idle">{a.requiresQual}</span>
                  ) : (
                    'No specific qualification'
                  )}
                </dd>
              </div>
            </dl>

            <p className="label">Kit</p>
            <ul className="log">
              {g.kit.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>

            <p className="label">Before the group arrives</p>
            <ol className="steps">
              {g.before.map((s, i) => (
                <li key={i}>
                  <span className="steps__n num">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>

            <p className="label">Running it</p>
            <ol className="steps">
              {g.during.map((s, i) => (
                <li key={i}>
                  <span className="steps__n num">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>

            <p className="label">Closing down</p>
            <ol className="steps">
              {g.after.map((s, i) => (
                <li key={i}>
                  <span className="steps__n num">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </>
        )}

        {tab === 'today' && (
          <>
            {!v.compliant && session.status !== 'cancelled' && (
              <div className="alert alert--critical">
                <p className="label">Not compliant as staffed</p>
                <ul className="log">
                  {v.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="pairs">
              <div className="pairs__pair"><dt>Slot</dt><dd className="num">{session.start}–{session.end}</dd></div>
              <div className="pairs__pair"><dt>Where</dt><dd>{a.location}</dd></div>
              <div className="pairs__pair"><dt>Group</dt><dd>{group.name} · {group.band}</dd></div>
              <div className="pairs__pair">
                <dt>Ratio</dt>
                <dd className="num">
                  1:{v.ratio} — {v.required} staff for {v.headcount} students
                </dd>
              </div>
              <div className="pairs__pair">
                <dt>Drafted by</dt>
                <dd>{session.origin === 'ai-draft' ? 'The draft rota' : 'Edited by hand'}</dd>
              </div>
            </dl>

            {a.requiresQual && (
              <>
                <p className="label">Qualified instructor</p>
                {qualHolder ? (
                  <p className="meta" style={{ margin: 0 }}>
                    <button className="namebtn" onClick={() => setOpenStaff(qualHolder.id)}>
                      {qualHolder.forename} {qualHolder.surname}
                    </button>{' '}
                    holds {a.requiresQual}. Everybody else on this session is
                    cleared cover.
                  </p>
                ) : (
                  <p className="mark mark--critical">
                    Nobody assigned holds {a.requiresQual}. This session cannot
                    run as staffed.
                  </p>
                )}
              </>
            )}

            <p className="label">Who is on it</p>
            {onDuty.length === 0 ? (
              <p className="meta">Nobody assigned yet.</p>
            ) : (
              <ul className="crew">
                {onDuty.map((s) => {
                  const away = isAway(s, session.day);
                  const uncleared = s.dbs.state !== 'cleared';
                  const holds = a.requiresQual && s.quals.includes(a.requiresQual);
                  return (
                    <li key={s.id} className="crew__row">
                      <button className="namebtn crew__name" onClick={() => setOpenStaff(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta crew__role">{s.role}</span>
                      <span className="crew__marks">
                        {holds && <span className="mark mark--clear">Instructor</span>}
                        {uncleared && (
                          <span className="mark mark--critical">DBS {s.dbs.state}</span>
                        )}
                        {away && <span className="mark mark--critical">Away today</span>}
                        {!holds && !uncleared && !away && (
                          <span className="meta" style={{ color: 'var(--ink-3)' }}>
                            Cover
                          </span>
                        )}
                      </span>
                      <span className="meta crew__phone num">{s.phone}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {g && (
              <>
                <p className="label">If something goes wrong</p>
                <dl className="pairs">
                  <div className="pairs__pair"><dt>First aid</dt><dd>{g.emergency.firstAid}</dd></div>
                  <div className="pairs__pair"><dt>Call first</dt><dd>{g.emergency.callFirst}</dd></div>
                  <div className="pairs__pair"><dt>Assembly</dt><dd>{g.emergency.assembly}</dd></div>
                </dl>
              </>
            )}
          </>
        )}

        {tab === 'group' && (
          <>
            <p className="meta" style={{ margin: '0 0 18px' }}>
              {roll.length} students in {group.name}. Capacity for this activity
              is {a.capacity}
              {roll.length > a.capacity
                ? ' — the group is larger than the activity holds, so it runs in waves.'
                : '.'}{' '}
              Open a name for the whole record.
            </p>

            {g?.offSite && noTravel.length > 0 && (
              <div className="alert alert--critical">
                <p className="label">
                  {noTravel.length} cannot leave the site
                </p>
                <ul className="log">
                  {noTravel.map((s) => (
                    <li key={s.id}>
                      <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta"> — no written travel consent from {s.guardian.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {notReady.length > 0 && (
              <div className="alert">
                <p className="label">{notReady.length} with something outstanding</p>
                <ul className="log">
                  {notReady.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta"> — {readiness(s).blocking.join('; ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {role.welfareDetail && medical.length > 0 && (
              <>
                <p className="label">Medical notes that matter here</p>
                <ul className="log">
                  {medical.map((s) => (
                    <li key={s.id}>
                      <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                        {s.forename} {s.surname}
                      </button>
                      <span className="meta"> — {s.medical}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="label">The roll</p>
            <div className="tablewrap">
              <table className="reg">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Student</th>
                    <th>Age</th>
                    <th>Room</th>
                    <th>Ready</th>
                  </tr>
                </thead>
                <tbody>
                  {roll.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <button className="namebtn" onClick={() => setOpenStudent(s.id)}>
                          {s.forename} {s.surname}
                        </button>
                      </td>
                      <td className="num">{s.age}</td>
                      <td className="num meta">{s.bed ? `bed ${s.bed}` : '—'}</td>
                      <td>
                        {readiness(s).ready ? (
                          <span className="mark mark--clear">Yes</span>
                        ) : (
                          <span className="mark mark--critical">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'booking' && (
          booking ? (
            <>
              {!booking.receipt && (
                <div className="alert alert--critical">
                  <p className="label">No receipt attached</p>
                  <p className="meta" style={{ margin: 0 }}>
                    This booking cannot be confirmed until the supplier receipt
                    is on file.
                  </p>
                </div>
              )}

              <p className="label">The booking</p>
              <dl className="pairs">
                <div className="pairs__pair"><dt>Supplier</dt><dd>{booking.supplier}</dd></div>
                <div className="pairs__pair"><dt>Reference</dt><dd className="num">{booking.reference}</dd></div>
                <div className="pairs__pair"><dt>Date</dt><dd>{fmtDateLong(booking.date)}</dd></div>
                <div className="pairs__pair"><dt>Headcount</dt><dd className="num">{booking.headcount}</dd></div>
                <div className="pairs__pair"><dt>Cost</dt><dd className="num">{fmtMoney(booking.costPence)}</dd></div>
                <div className="pairs__pair">
                  <dt>Per student</dt>
                  <dd className="num">
                    {fmtMoney(Math.round(booking.costPence / booking.headcount))}
                  </dd>
                </div>
                <div className="pairs__pair">
                  <dt>Status</dt>
                  <dd>
                    <span className={`mark ${booking.status === 'confirmed' ? 'mark--clear' : 'mark--overdue'}`}>
                      {booking.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="label">Receipt</p>
              {booking.receipt ? (
                <dl className="pairs">
                  <div className="pairs__pair"><dt>File</dt><dd className="pairs__wrap">{booking.receipt.filename}</dd></div>
                  <div className="pairs__pair"><dt>Size</dt><dd className="num">{Math.round(booking.receipt.bytes / 1024)} KB</dd></div>
                  <div className="pairs__pair"><dt>Attached</dt><dd>{fmtDate(booking.receipt.attachedAt)} by {booking.receipt.attachedBy}</dd></div>
                </dl>
              ) : (
                <p className="meta">Nothing on file. Attach it in Bookings.</p>
              )}
            </>
          ) : (
            <>
              {otherDay ? (
                <>
                  <div className="alert">
                    <p className="label">No booking for today</p>
                    <p className="meta" style={{ margin: 0 }}>
                      {group.name} have {a.name} booked with {otherDay.supplier} on{' '}
                      {fmtDateLong(otherDay.date)}, reference {otherDay.reference}.
                      That booking pays for that day, not this session.
                    </p>
                  </div>
                  <p className="label">The booking on {fmtDate(otherDay.date)}</p>
                  <dl className="pairs">
                    <div className="pairs__pair"><dt>Supplier</dt><dd>{otherDay.supplier}</dd></div>
                    <div className="pairs__pair"><dt>Reference</dt><dd className="num">{otherDay.reference}</dd></div>
                    <div className="pairs__pair"><dt>Headcount</dt><dd className="num">{otherDay.headcount}</dd></div>
                    <div className="pairs__pair"><dt>Cost</dt><dd className="num">{fmtMoney(otherDay.costPence)}</dd></div>
                    <div className="pairs__pair">
                      <dt>Status</dt>
                      <dd>
                        <span className={`mark ${otherDay.status === 'confirmed' ? 'mark--clear' : 'mark--overdue'}`}>
                          {otherDay.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                        </span>
                      </dd>
                    </div>
                    <div className="pairs__pair">
                      <dt>Receipt</dt>
                      <dd>
                        {otherDay.receipt ? (
                          <span className="mark mark--clear">{otherDay.receipt.filename}</span>
                        ) : (
                          <span className="mark mark--critical">None on file</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
              <p className="meta" style={{ margin: '0 0 18px' }}>
                {a.supplier
                  ? `${a.supplier} supply this activity, but there is no booking on file for ${group.name}.`
                  : 'Run in-house. No supplier, no booking, no receipt.'}
              </p>
              )}
              {!otherDay && (
                <dl className="pairs">
                  <div className="pairs__pair">
                    <dt>Supplier</dt>
                    <dd>{a.supplier ?? 'None — centre staff'}</dd>
                  </div>
                  <div className="pairs__pair">
                    <dt>Usual cost</dt>
                    <dd className="num">
                      {a.costPence !== null ? fmtMoney(a.costPence) : 'No external cost'}
                    </dd>
                  </div>
                </dl>
              )}
              {a.supplier && !otherDay && (
                <p className="mark mark--overdue" style={{ marginTop: 16 }}>
                  A supplied activity with no booking is a bill nobody has agreed
                </p>
              )}
            </>
          )
        )}

        {g && tab === 'safety' && (
          <>
            <p className="label">What can go wrong, and what stops it</p>
            <div className="tablewrap">
              <table className="reg">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Risk</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {g.hazards.map((h) => (
                    <tr key={h.risk}>
                      <td>{h.risk}</td>
                      <td className="meta">{h.control}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="label">Stop the session if</p>
            <ul className="log log--stop">
              {g.abort.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>

            <p className="label">Safeguarding</p>
            <ul className="log">
              {g.safeguarding.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>

            <p className="label">Emergency</p>
            <dl className="pairs">
              <div className="pairs__pair"><dt>First aid</dt><dd>{g.emergency.firstAid}</dd></div>
              <div className="pairs__pair"><dt>Call first</dt><dd>{g.emergency.callFirst}</dd></div>
              <div className="pairs__pair"><dt>Assembly</dt><dd>{g.emergency.assembly}</dd></div>
            </dl>
          </>
        )}
      </Drawer>
    </>
  );
}
