/* ── Head office home ─────────────────────────────────────────────────────
   Not the centre's home screen with different numbers on it. The two jobs
   have different clocks: a centre opens the morning asking what happens in
   the next four hours, and head office opens it asking what is going to be
   short by the end of the season and what is sitting on their own desk.

   So this screen has no hour-by-hour anything. It is: where the season is,
   what only head office can clear, what the money looks like, which
   changeover days are coming, and which centres are live.
   ──────────────────────────────────────────────────────────────────────── */

import { useMemo } from 'react';
import type { Route } from '../App';
import { GlobalAsk } from '../components/GlobalAsk';
import { IconArrow } from '../lib/icons';
import { useStore } from '../lib/store';
import { money } from '../lib/season';
import { needsEscalation } from '../lib/reminders';
import { SITES } from '../data/centre';
import { waitingOnThem, waitingOnUs } from '../data/portal';
import { missedDoses } from '../data/health';
import {
  DEMO_TODAY, SEASON_END, SEASON_START, daysFromToday, fmtDate, fmtDateLong,
  fmtMoney, isOnSite,
} from '../data/seed';

const greeting = () => {
  const h = DEMO_TODAY.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const day = (d: Date) => Math.round((d.getTime() - SEASON_START.getTime()) / 86400000);

export function OfficeHome({
  operator,
  onGo,
}: {
  operator: string;
  onGo: (r: Route) => void;
}) {
  const {
    students, staff, sessions, bookings, incidents, payments, health, requests,
    administrations, open, duties,
  } = useStore();


  const purse = useMemo(
    () => money(students, payments, bookings),
    [students, payments, bookings],
  );

  const onSite = students.filter((s) => isOnSite(s));
  const live = SITES.filter((s) => s.onboarded);

  const unverified = health.filter((h) => h.state !== 'verified');
  const noConsent = health.flatMap((h) => h.medications.filter((m) => !m.consent));
  const untold = incidents.filter(
    (i) => i.level !== 'logged' && !i.dslInformedAt,
  );
  const escalating = open.filter(needsEscalation);
  const missed = missedDoses(administrations);

  /* Work that cannot be handed back to a centre: verifying a clinical record,
     chasing a consent, deciding a referral, allocating money nobody can
     credit. If head office does not do these, nobody does. */
  const desk: { n: number; what: string; why: string; go: Route }[] = ([
    {
      n: unverified.length,
      what: 'health records to verify',
      why: 'Declared by families and not signed off. Until they are, the centre is told not to act on them.',
      go: 'office',
    },
    {
      n: noConsent.length,
      what: 'medications with no consent',
      why: 'Held at a centre with nothing signed behind them. Nobody may give any of it.',
      go: 'office',
    },
    {
      n: untold.length,
      what: 'incidents the lead has not been told about',
      why: 'A referral decision belongs above the centre, and the clock on it started when it happened.',
      go: 'incidents',
    },
    {
      n: escalating.length,
      what: 'items past their escalation threshold',
      why: 'Chased to the limit the centre set and still not answered. They come up to you now.',
      go: 'reminders',
    },
    {
      n: purse.unmatchedCount,
      what: 'payments with no student',
      why: `${fmtMoney(purse.unmatchedPence)} in the bank that the platform cannot credit to a child.`,
      go: 'finance',
    },
    {
      n: purse.arrivingOwing.length,
      what: 'arriving this week still owing',
      why: 'A centre cannot hold a child at the door over a balance, so the decision is made before they land.',
      go: 'office',
    },
  ] as { n: number; what: string; why: string; go: Route }[]).filter((d) => d.n > 0);

  /* Changeover days ahead, which is the only calendar head office keeps —
     the day a season is won or lost is the day two hundred children move. */
  const changeovers = useMemo(() => {
    const counts = new Map<string, { in: number; out: number }>();
    students.forEach((s) => {
      const bump = (d: string, k: 'in' | 'out') => {
        const c = counts.get(d) ?? { in: 0, out: 0 };
        c[k] += 1;
        counts.set(d, c);
      };
      bump(s.arrival, 'in');
      bump(s.leaving, 'out');
    });
    return [...counts.entries()]
      .filter(([d, c]) => daysFromToday(d) >= 0 && c.in + c.out > 4)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 4);
  }, [students]);

  const banked = Math.round((purse.bankedPence / purse.invoicedPence) * 100);
  const elapsed = day(DEMO_TODAY);
  const season = day(SEASON_END);

  return (
    <main id="main" className="hero">
      <header className="lede">
        <div className="lede__row">
          <h1 className="lede__title">
            <span className="serif">{greeting()}</span>, {operator}.
          </h1>
          <p className="lede__when">
            Day {elapsed} of {season}
            <span className="lede__season">
              {fmtDate(SEASON_START.toISOString())} – {fmtDate(SEASON_END.toISOString())} · seeded demonstration data
            </span>
          </p>
        </div>

        <p className="lede__sub">
          {onSite.length} children on site across {live.length} live centre
          {live.length === 1 ? '' : 's'}, {banked}% of the season banked, and{' '}
          {desk.reduce((n, d) => n + d.n, 0)} things on this desk that a centre
          cannot clear for you.
        </p>

        <div className="lede__cta">
          <button className="btn btn--primary" onClick={() => onGo('office')}>
            Open head office
            <IconArrow />
          </button>
        </div>
      </header>

      <div className="stage">
        {/* The same pill as every other section, in the same place. */}
        <GlobalAsk route="home" />
        <div className="hero__grid">
          <section className="slab" aria-labelledby="desk-head">
            <div className="slab__head">
              <h2 id="desk-head" className="slab__title">
                Only you can clear this
              </h2>
              <button className="btn btn--quiet" onClick={() => onGo('office')}>
                Head office
                <IconArrow />
              </button>
            </div>

            {desk.length === 0 ? (
              <p className="meta reminders__empty">
                Nothing is waiting on head office. Every record is verified,
                every consent is signed, and every payment is against a child.
              </p>
            ) : (
              <ol className="tl">
                {desk.map((d) => (
                  <li key={d.what} className="tl__slot">
                    <p className="tl__at num">{d.n}</p>
                    <ul className="tl__items">
                      <li>
                        <button className="tl__row" onClick={() => onGo(d.go)}>
                          <span className="tl__what">
                            <span className="tl__title">{d.what}</span>
                            <span className="meta">{d.why}</span>
                          </span>
                        </button>
                      </li>
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="slab" aria-labelledby="money-head">
            <div className="slab__head">
              <h2 id="money-head" className="slab__title">
                The season, in money
              </h2>
              <button className="btn btn--quiet" onClick={() => onGo('finance')}>
                Payments
                <IconArrow />
              </button>
            </div>

            <p className="num" style={{ fontSize: '1.6rem', fontWeight: 500 }}>
              {fmtMoney(purse.bankedPence)}
            </p>
            <p className="meta">
              banked of {fmtMoney(purse.invoicedPence)} invoiced
            </p>
            <span className="meter" style={{ margin: '12px 0 14px' }}>
              <span
                className={`meter__fill${banked < 80 ? ' meter__fill--short' : ''}`}
                style={{ width: `${banked}%` }}
              />
            </span>

            <dl className="pairs">
              <div className="pairs__pair">
                <dt>Still owed</dt>
                <dd className="num">{fmtMoney(purse.outstandingPence)}</dd>
              </div>
              <div className="pairs__pair">
                <dt>Unallocated</dt>
                <dd className="num">
                  {fmtMoney(purse.unmatchedPence)} · {purse.unmatchedCount} payments
                </dd>
              </div>
              <div className="pairs__pair">
                <dt>To suppliers</dt>
                <dd className="num">
                  {fmtMoney(purse.bookedPence)} · {purse.unreceiptedCount} without a receipt
                </dd>
              </div>
              <div className="pairs__pair">
                <dt>Documents</dt>
                <dd>
                  {waitingOnThem(requests).length} chased ·{' '}
                  {waitingOnUs(requests).length} to verify
                </dd>
              </div>
              <div className="pairs__pair">
                <dt>Medication</dt>
                <dd>
                  {missed.length === 0
                    ? 'every dose recorded today'
                    : `${missed.length} doses unrecorded today`}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="hero__grid" style={{ marginTop: 16 }}>
          <section className="slab" aria-labelledby="change-head">
            <div className="slab__head">
              <h2 id="change-head" className="slab__title">
                The changeover days ahead
              </h2>
              <button className="btn btn--quiet" onClick={() => onGo('arrivals')}>
                New arrivals
                <IconArrow />
              </button>
            </div>

            {changeovers.length === 0 ? (
              <p className="meta reminders__empty">
                No changeover days left in the season.
              </p>
            ) : (
              <ol className="tl">
                {changeovers.map(([d, c]) => {
                  const days = daysFromToday(d);
                  const owing = students.filter(
                    (s) => s.arrival === d && s.balancePence > s.paidPence,
                  ).length;
                  const unsigned = students.filter(
                    (s) =>
                      s.arrival === d &&
                      health.some(
                        (h) => h.studentId === s.id && h.state !== 'verified',
                      ),
                  ).length;
                  return (
                    <li key={d} className="tl__slot">
                      <p className="tl__at num">
                        {days === 0 ? 'today' : `${days}d`}
                      </p>
                      <ul className="tl__items">
                        <li>
                          <button className="tl__row" onClick={() => onGo('arrivals')}>
                            <span className="tl__what">
                              <span className="tl__title">{fmtDateLong(d)}</span>
                              <span className="meta">
                                {c.in} arriving · {c.out} leaving
                                {owing > 0 && ` · ${owing} still owing`}
                              </span>
                            </span>
                            {unsigned > 0 && (
                              <span className="mark mark--critical">
                                {unsigned} unverified
                              </span>
                            )}
                          </button>
                        </li>
                      </ul>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="slab" aria-labelledby="centres-head">
            <div className="slab__head">
              <h2 id="centres-head" className="slab__title">
                Centres
              </h2>
              <button className="btn btn--quiet" onClick={() => onGo('office')}>
                All figures
                <IconArrow />
              </button>
            </div>

            <ul className="log">
              {SITES.map((site) => (
                <li key={site.id}>
                  <strong>{site.name}</strong>{' '}
                  {site.onboarded ? (
                    <span className="mark mark--clear">Live</span>
                  ) : (
                    <span className="mark mark--idle">Not onboarded</span>
                  )}
                  <span className="meta" style={{ display: 'block' }}>
                    {site.town} · {site.director} ·{' '}
                    {site.onboarded
                      ? `${onSite.length} on site of ${site.capacity} beds · ${staff.filter((x) => x.dbs.state !== 'cleared').length} staff without a cleared DBS`
                      : `${site.capacity} beds contracted, no records imported yet`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

      </div>
    </main>
  );
}
