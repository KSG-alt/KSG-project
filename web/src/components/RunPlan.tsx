import { useMemo, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { StudentProfile } from '../components/StudentProfile';
import { StaffProfile } from '../components/StaffProfile';
import { useStore } from '../lib/store';
import {
  buildRuns, chargeOf, VEHICLES, WAIT_OPTIONS, type Run, type Wait,
} from '../lib/transfers';
import {
  agentFor, RECEIPTS_ARE_NOT_FILES, type ChargeState,
} from '../data/suppliers';
import {
  AIRPORTS, airportBy, flightDay, mins, type Flight,
} from '../data/travel';
import {
  DEMO_TODAY, fmtDate, fmtDateLong, fmtMoney, groupById, type Student,
} from '../data/seed';
import { Lede } from './Lede';

type View = 'day' | 'flights' | 'money' | 'season';

const CHARGE: Record<ChargeState, { label: string; mark: string }> = {
  receipted: { label: 'Receipt attached', mark: 'mark--clear' },
  invoiced: { label: 'Invoiced, no receipt', mark: 'mark--idle' },
  missing: { label: 'No receipt', mark: 'mark--overdue' },
  disputed: { label: 'Query it', mark: 'mark--critical' },
};

/* Who the centre rings about this child, and in what language. The agent is
   first when there is one, because that is who the family actually deals
   with — and at 23:40 the agent is the one who speaks to both sides. */
function Contacts({ s }: { s: Student }) {
  const agent = agentFor(s);
  return (
    <span className="meta contacts">
      <span className="contacts__line">
        Parent: {s.guardian.name} · <span className="num">{s.guardian.phone}</span>
        {s.guardian.language !== 'English' && ` · speaks ${s.guardian.language}`}
      </span>
      <span className="contacts__line">
        {agent ? (
          <>
            Agent: {agent.name}, {agent.contact} ·{' '}
            <span className="num">{agent.phone}</span> · out of hours{' '}
            <span className="num">{agent.outOfHours}</span>
          </>
        ) : (
          'Booked direct — no agent to ring, call the parents.'
        )}
      </span>
    </span>
  );
}

/* The flight itself, under the name. Which number, which terminal, when it
   actually lands and whether the child is travelling alone — the four things
   the meeter reads off a phone in a car park. */
function FlightLine({ f }: { f: Flight | undefined }) {
  if (!f) {
    return (
      <span className="meta contacts contacts__line" style={{ color: 'var(--oxide)' }}>
        No flight on the record. Ring the agent before the vehicle goes.
      </span>
    );
  }
  const ap = airportBy(f.airport);
  const landing = f.delay > 0 ? mins(f.at) + f.delay : mins(f.at);
  const clock = `${String(Math.floor(landing / 60) % 24).padStart(2, '0')}:${String(landing % 60).padStart(2, '0')}`;
  return (
    <span className="meta contacts contacts__line">
      <span className="num">{f.number}</span> · {ap.name} terminal{' '}
      <span className="num">{f.terminal}</span> · lands{' '}
      <span className="num">{f.at}</span>
      {f.delay > 0 && (
        <span style={{ color: 'var(--oxide)' }}>
          {' '}
          +{f.delay} min, in at <span className="num">{clock}</span>
        </span>
      )}
      {f.status === 'unknown' && ' · no status from the airline'}
      {f.unaccompanied && ' · travelling alone, released to the named meeter only'}
    </span>
  );
}

const STATUS: Record<Flight['status'], { label: string; mark: string }> = {
  scheduled: { label: 'Scheduled', mark: 'mark--idle' },
  landed: { label: 'Landed', mark: 'mark--clear' },
  delayed: { label: 'Delayed', mark: 'mark--overdue' },
  unknown: { label: 'No status', mark: 'mark--critical' },
};

/* The vehicle half of a changeover day, for one day and one direction. It
   lives inside New arrivals and Departures rather than in a section of its
   own: a centre plans the people and the vehicles in the same breath, and two
   screens answering "who is moving on Sunday" is how they stop trusting
   either. */
export function RunPlan({
  day,
  direction,
}: {
  day: string;
  direction: 'in' | 'out';
}) {
  const { students, staff, flights } = useStore();
  const [view, setView] = useState<View>('day');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [wait, setWait] = useState<Wait>(90);

  const plan = useMemo(
    () => buildRuns(day, direction, students, staff, flights, wait),
    [day, direction, students, staff, flights, wait],
  );

  /* The same day at every tolerance, so the trade-off is a table rather than
     a number somebody has to take on trust. */
  const options = useMemo(
    () =>
      WAIT_OPTIONS.map((w) => ({
        wait: w,
        plan: buildRuns(day, direction, students, staff, flights, w),
      })),
    [day, direction, students, staff, flights],
  );

  /* Every run's bill for this day, in run order. */
  const charges = useMemo(() => plan.runs.map((r) => chargeOf(r)), [plan]);
  const noReceipt = charges.filter((c) => c.receipt === null).length;

  const named = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s ? `${s.forename} ${s.surname}` : 'Unknown';
  };

  const tabs: { id: View; label: string }[] = [
    { id: 'day', label: `Runs ${plan.runs.length}` },
    { id: 'money', label: `Receipts ${noReceipt ? `${noReceipt} missing` : 'all in'}` },
  ];

  return (
    <>
      <div className="runplan__head">
        <p className="label">
          {plan.studentsMoved} travelling · {plan.runs.length} runs ·{' '}
          {plan.vehicleHours}h of vehicle time · {fmtMoney(plan.costPence)}
        </p>
        <p className="meta">
          {direction === 'in'
            ? 'Built from the flights: one airport each, flights within a window sharing a vehicle, off-site ratios, a D1 holder on anything that needs one, and a named meeter on any run carrying an unaccompanied minor — the airline will not release a child to anybody else.'
            : 'Built backwards from the flights: at the desk two and a half hours before take-off, one airport per run, off-site ratios, a D1 holder where the vehicle needs one, and a named adult to hand over any child travelling alone.'}
        </p>
      </div>

      {openStudent && (
        <StudentProfile id={openStudent} onClose={() => setOpenStudent(null)} />
      )}
      {openStaff && <StaffProfile id={openStaff} onClose={() => setOpenStaff(null)} />}

      <div className="tabs" role="tablist" aria-label="Transfer view">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            className={`tab${view === t.id ? ' tab--on' : ''}`}
            onClick={() => setView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="wait">
        <p className="label">
          {direction === 'in'
            ? 'How long may a student wait airside?'
            : 'How long may a student wait at the airport before their flight?'}
        </p>
        <p className="meta wait__lede">
          The longer they may wait with a staff member, the more flights share
          a vehicle. An hour is nothing to a seventeen-year-old and a long time
          for a nine-year-old on their own, so this is the centre&rsquo;s call,
          not the builder&rsquo;s.
        </p>
        <div className="wait__opts">
          {options.map((o) => (
            <button
              key={o.wait}
              className={`wait__opt${o.wait === wait ? ' wait__opt--on' : ''}`}
              onClick={() => setWait(o.wait)}
            >
              <span className="wait__n num">
                {o.wait === 0 ? 'None' : `${o.wait} min`}
              </span>
              <span className="meta">
                {o.plan.runs.length} runs · {o.plan.vehicleHours}h ·{' '}
                {fmtMoney(o.plan.costPence)}
              </span>
              <span className="meta wait__save">
                {o.wait === 0
                  ? 'a vehicle per landing'
                  : `${options[0].plan.runs.length - o.plan.runs.length} fewer runs · ${fmtMoney(options[0].plan.costPence - o.plan.costPence)} saved`}
              </span>
            </button>
          ))}
        </div>
        <p className="meta wait__now">
          Longest anybody waits under this plan: {plan.longestWait} minutes.
        </p>
      </div>

      {plan.unmet.length > 0 && (
        <div className="alert alert--critical">
          <p className="label">{plan.unmet.length} runs cannot go as planned</p>
          <ul className="log">
            {plan.unmet.slice(0, 6).map((u, i) => (
              <li key={i}>
                <strong>{u.where}</strong> — {u.problem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'day' && (
        plan.runs.length === 0 ? (
          <p className="meta reminders__empty">
            Nobody {direction === 'in' ? 'arrives' : 'leaves'} on {fmtDateLong(day)}.
          </p>
        ) : (
          <ul className="runs stagger">
            {plan.runs.map((r) => (
              <RunRow
                key={r.id}
                run={r}
                named={named}
                onStudent={setOpenStudent}
                onStaff={setOpenStaff}
              />
            ))}
          </ul>
        )
      )}

      {view === 'money' && (
        charges.length === 0 ? (
          <p className="meta reminders__empty">
            No runs on {fmtDateLong(day)}, so nothing to settle.
          </p>
        ) : (
          <>
            <Lede>
              One line per vehicle, priced off the supplier&rsquo;s rate card
              and the hours the run actually takes. Waiting time is where a
              transfer bill goes wrong: a late flight past the free allowance
              is chargeable, and an invoice with waiting on it that nobody
              agreed is the one to query before finance pays it.{' '}
              {RECEIPTS_ARE_NOT_FILES}
            </Lede>

            {charges.some((c) => c.state === 'disputed' || c.receipt === null) && (
              <div className="alert alert--warn">
                <p className="label">
                  {charges.filter((c) => c.receipt === null).length} of{' '}
                  {charges.length} runs have no receipt against them
                </p>
                <ul className="log">
                  {charges
                    .filter((c) => c.why)
                    .slice(0, 5)
                    .map((c) => (
                      <li key={c.runId}>
                        <strong>{c.supplier.name} {c.reference}</strong> — {c.why}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="tablewrap">
              <table className="reg" aria-label="Vehicle runs and what each supplier charged">
                <thead>
                  <tr>
                    <th scope="col">Run</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">Driver</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Hours</th>
                    <th scope="col">Quoted</th>
                    <th scope="col">Waiting</th>
                    <th scope="col">Charged</th>
                    <th scope="col">Receipt</th>
                  </tr>
                </thead>
                <tbody className="stagger">
                  {charges.map((c, i) => {
                    const r = plan.runs[i];
                    return (
                      <tr key={c.runId}>
                        <td>
                          <span className="num">{r.leaveCentre}</span>{' '}
                          {airportBy(r.airport).name}
                          <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {c.vehicle} · {r.studentIds.length}{' '}
                            {r.studentIds.length === 1 ? 'student' : 'students'}
                          </span>
                        </td>
                        <td>
                          {c.supplier.name}
                          <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {c.supplier.dispatch}
                          </span>
                        </td>
                        <td>
                          {c.driver.name}
                          <span className="meta num" style={{ display: 'block', color: 'var(--ink-3)' }}>
                            {c.driver.reg} · {c.driver.phone}
                          </span>
                        </td>
                        <td className="num meta">{c.reference}</td>
                        <td className="num">{c.hours}</td>
                        <td className="num">{fmtMoney(c.quotedPence)}</td>
                        <td className="num">
                          {c.waitPence > 0 ? (
                            <>
                              {fmtMoney(c.waitPence)}
                              <span className="meta" style={{ display: 'block', color: 'var(--oxide)' }}>
                                {c.waitMins} min
                              </span>
                            </>
                          ) : (
                            <span className="meta" style={{ color: 'var(--ink-3)' }}>—</span>
                          )}
                        </td>
                        <td className="num">{fmtMoney(c.chargedPence)}</td>
                        <td>
                          <span className={`mark ${CHARGE[c.state].mark}`}>
                            {CHARGE[c.state].label}
                          </span>
                          {c.receipt && (
                            <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                              {c.receipt.filename}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={5} style={{ fontWeight: 600 }}>
                      {charges.length} vehicles on {fmtDateLong(day)}
                    </td>
                    <td className="num">
                      {fmtMoney(charges.reduce((n, c) => n + c.quotedPence, 0))}
                    </td>
                    <td className="num">
                      {fmtMoney(charges.reduce((n, c) => n + c.waitPence, 0))}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {fmtMoney(plan.costPence)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )
      )}

    </>
  );
}

function RunRow({
  run,
  named,
  onStudent,
  onStaff,
}: {
  run: Run;
  named: (id: string) => string;
  onStudent: (id: string) => void;
  onStaff: (id: string) => void;
}) {
  const { students, staff, flights } = useStore();
  const [open, setOpen] = useState(false);
  const ap = airportBy(run.airport);
  const charge = chargeOf(run);
  const load = run.studentIds
    .map((id) => students.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const short = run.staffIds.length < 2;
  const meeter = staff.find((x) => x.id === run.meeterId) ?? null;

  return (
    <li className="run">
      <button className="run__row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="run__leave num">
          {run.leaveCentre}
          <span className="meta">leave</span>
        </span>
        <span className="run__where">
          <span className="run__ap">{ap.name}</span>
          <span className="meta">
            {run.vehicle} · {run.studentIds.length}/{VEHICLES[run.vehicle].seats} seats ·{' '}
            {ap.minutes} min each way
          </span>
        </span>
        <span className="run__meet meta num">
          {run.direction === 'in' ? 'meet' : 'fly'} {run.meetFrom}
          {run.meetTo !== run.meetFrom ? `–${run.meetTo}` : ''}
        </span>
        <span className="run__marks">
          {run.unaccompanied > 0 && (
            <span className="mark mark--overdue">{run.unaccompanied} alone</span>
          )}
          {short ? (
            <span className="mark mark--critical">{run.staffIds.length} staff</span>
          ) : (
            <span className="mark mark--clear">{run.staffIds.length} staff</span>
          )}
        </span>
      </button>

      {open && (
        <div className="run__detail">
          <div className="inc__cols">
            <section>
              <p className="label">The run</p>
              <dl className="pairs">
                <div className="pairs__pair">
                  <dt>Leaves</dt>
                  <dd className="num">{run.leaveCentre} from the front drive</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Flights</dt>
                  <dd className="num">{run.flightNumbers.join(', ')}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Terminal</dt>
                  <dd>{ap.name} — check the board, terminals move</dd>
                </div>
                <div className="pairs__pair">
                  <dt>{run.direction === 'in' ? 'At the gate' : 'At the desk'}</dt>
                  <dd className="num">
                    {run.direction === 'in'
                      ? `${run.meetFrom} for the first flight`
                      : `${(() => {
                          const at = mins(run.meetFrom) - 150;
                          return `${String(Math.floor(at / 60) % 24).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`;
                        })()} — two and a half hours before the first flight`}
                  </dd>
                </div>
                <div className="pairs__pair">
                  <dt>Back by</dt>
                  <dd className="num">
                    about{' '}
                    {(() => {
                      const back = mins(run.meetTo) + 45 + ap.minutes;
                      return `${String(Math.floor(back / 60) % 24).padStart(2, '0')}:${String(back % 60).padStart(2, '0')}`;
                    })()}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <p className="label">Who is on it</p>
              {run.staffIds.length === 0 ? (
                <p className="mark mark--critical">Nobody assigned. This run cannot go.</p>
              ) : (
                <ul className="log">
                  {run.staffIds.map((id) => (
                    <li key={id}>
                      <button className="namebtn" onClick={() => onStaff(id)}>
                        {named(id)}
                      </button>
                      {id === run.meeterId && (
                        <span className="mark mark--clear ml-2">
                          Meets and signs
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {run.unaccompanied > 0 && (
                <p className="meta" style={{ marginTop: 10, color: 'var(--ink-2)' }}>
                  {run.unaccompanied} unaccompanied minors on this run. The
                  airline releases them only to the named adult above, with ID.
                </p>
              )}
            </section>

            <section>
              <p className="label">{load.length} students</p>
              <ul className="log">
                {load.slice(0, 10).map((s) => (
                  <li key={s.id}>
                    <button className="namebtn" onClick={() => onStudent(s.id)}>
                      {s.forename} {s.surname}
                    </button>
                    <span className="meta"> · {s.country} · {s.age}</span>
                    <FlightLine
                      f={flights.find(
                        (x: Flight) =>
                          x.studentId === s.id && x.direction === run.direction,
                      )}
                    />
                    <Contacts s={s} />
                  </li>
                ))}
                {load.length > 10 && (
                  <li className="meta">…and {load.length - 10} more</li>
                )}
              </ul>
            </section>
          </div>

          <div className="inc__cols">
            <section>
              <p className="label">Who is driving it</p>
              <dl className="pairs">
                <div className="pairs__pair">
                  <dt>Supplier</dt>
                  <dd>{charge.supplier.name}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Dispatch</dt>
                  <dd className="num">{charge.supplier.dispatch}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Out of hours</dt>
                  <dd className="num">{charge.supplier.outOfHours}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Driver</dt>
                  <dd>
                    {charge.driver.name} ·{' '}
                    <span className="num">{charge.driver.phone}</span>
                  </dd>
                </div>
                <div className="pairs__pair">
                  <dt>Vehicle</dt>
                  <dd className="num">{charge.driver.reg}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Our account</dt>
                  <dd className="num">{charge.supplier.account}</dd>
                </div>
              </dl>
              {meeter && (
                <p className="meta mt-3">
                  {meeter.forename} {meeter.surname} meets the flight on{' '}
                  <span className="num">{meeter.phone}</span> — the number the
                  driver and the parents both get given.
                </p>
              )}
            </section>

            <section>
              <p className="label">What it costs</p>
              <dl className="pairs">
                <div className="pairs__pair">
                  <dt>Reference</dt>
                  <dd className="num">{charge.reference}</dd>
                </div>
                <div className="pairs__pair">
                  <dt>Hire</dt>
                  <dd className="num">
                    {charge.hours}h at {fmtMoney(charge.supplier.rates[run.vehicle] ?? 0)}/h
                    {' '}= {fmtMoney(charge.quotedPence)}
                  </dd>
                </div>
                <div className="pairs__pair">
                  <dt>Waiting</dt>
                  <dd className="num">
                    {charge.waitPence > 0
                      ? `${charge.waitMins} min — ${fmtMoney(charge.waitPence)}`
                      : `None chargeable (${charge.supplier.waitFreeMins} min free)`}
                  </dd>
                </div>
                <div className="pairs__pair">
                  <dt>Charged</dt>
                  <dd className="num" style={{ fontWeight: 600 }}>
                    {fmtMoney(charge.chargedPence)}
                  </dd>
                </div>
              </dl>
              {charge.why && (
                <p className="meta" style={{ marginTop: 10, color: 'var(--ink-2)' }}>
                  {charge.why}
                </p>
              )}
            </section>

            <section>
              <p className="label">The receipt</p>
              <p>
                <span className={`mark ${CHARGE[charge.state].mark}`}>
                  {CHARGE[charge.state].label}
                </span>
              </p>
              {charge.receipt ? (
                <p className="meta mt-3">
                  {charge.receipt.filename} · {Math.round(charge.receipt.bytes / 1024)} KB
                  · attached {fmtDate(charge.receipt.attachedAt)} by{' '}
                  {charge.receipt.attachedBy}
                </p>
              ) : (
                <p className="meta mt-3">
                  Nothing attached against {charge.reference}. Finance will not
                  pay a transfer line without one, and August is when they go
                  missing.
                </p>
              )}
              <p className="meta" style={{ marginTop: 10, color: 'var(--ink-3)' }}>
                {RECEIPTS_ARE_NOT_FILES}
              </p>
            </section>
          </div>
        </div>
      )}
    </li>
  );
}
