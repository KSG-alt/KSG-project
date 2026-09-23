import { useRef, useState } from 'react';
import { SectionHead } from '../components/SectionHead';
import { useStore } from '../lib/store';
import { IconAttach, IconCheck, IconClose } from '../lib/icons';
import {
  BOOKINGS, DEMO_TODAY, activityById, fmtDate, fmtMoney, groupById,
  type Booking, type Receipt,
} from '../data/seed';

const DEMO_TODAY_ISO = `${DEMO_TODAY.getFullYear()}-${String(
  DEMO_TODAY.getMonth() + 1,
).padStart(2, '0')}-${String(DEMO_TODAY.getDate()).padStart(2, '0')}`;

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.heic';

function kb(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function Bookings() {
  /* From the store, so a receipt attached here clears the reminder chasing
     it on the reminders screen. */
  const { bookings, updateBookings } = useStore();
  const setBookings = (fn: (all: Booking[]) => Booking[], note?: string) =>
    updateBookings(fn, note);
  const [pending, setPending] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const unreceipted = bookings.filter((b) => !b.receipt);
  const owed = bookings.reduce((n, b) => n + b.costPence, 0);

  function attach(id: string, file: File) {
    const receipt: Receipt = {
      filename: file.name,
      bytes: file.size,
      /* The demo's clock, not the wall clock — a receipt stamped 2026 inside
         a 2027 season reads as broken data. */
      attachedAt: DEMO_TODAY_ISO,
      attachedBy: 'Ismail',
    };
    const b = bookings.find((x) => x.id === id);
    setBookings(
      (all) => all.map((x) => (x.id === id ? { ...x, receipt } : x)),
      b ? `Receipt ${receipt.filename} attached to ${b.reference} — ${b.supplier}, ${fmtMoney(b.costPence)}.` : undefined,
    );
  }

  function detach(id: string) {
    const b = bookings.find((x) => x.id === id);
    setBookings(
      (all) =>
        all.map((x) =>
          x.id === id ? { ...x, receipt: null, status: 'draft' as const } : x,
        ),
      b ? `Receipt removed from ${b.reference} — back to draft, and it cannot be confirmed until another is attached.` : undefined,
    );
  }

  function confirm(id: string) {
    const b = bookings.find((x) => x.id === id);
    setBookings(
      (all) =>
        all.map((x) =>
          /* The gate. A booking with no receipt cannot reach confirmed. */
          x.id === id && x.receipt ? { ...x, status: 'confirmed' as const } : x,
        ),
      b?.receipt
        ? `${b.reference} confirmed — ${b.supplier}, ${fmtMoney(b.costPence)} against receipt ${b.receipt.filename}.`
        : undefined,
    );
    setPending(null);
  }

  return (
    <>
      <SectionHead
        title="Bookings"
        count={`${bookings.length} activity bookings · ${fmtMoney(owed)} committed`}
      />

      <p className="meta" style={{ maxWidth: '72ch', margin: '-8px 0 24px', color: 'var(--ink-2)' }}>
        A receipt is required on every activity booking. Confirmation is blocked
        until one is attached, so nothing reaches the season&rsquo;s accounts
        undocumented.
      </p>

      {unreceipted.length > 0 && (
        <p className="mark mark--overdue mb-6">
          {unreceipted.length} booking{unreceipted.length > 1 ? 's' : ''} without
          a receipt — cannot be confirmed
        </p>
      )}

      <div className="tablewrap">
        <table className="reg" aria-label="Supplier bookings">
        <thead>
          <tr>
            <th scope="col" style={{ width: '9%' }}>Ref</th>
            <th scope="col" style={{ width: '17%' }}>Activity</th>
            <th scope="col">Group</th>
            <th scope="col">Date</th>
            <th scope="col">Heads</th>
            <th scope="col">Cost</th>
            <th scope="col" style={{ width: '24%' }}>Receipt</th>
            <th scope="col">Status</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody className="stagger">
          {bookings.map((b, i) => {
            const a = activityById(b.activityId);
            const blocked = !b.receipt;
            return (
              <tr key={b.id} style={{ animationDelay: `${i * 28}ms` }}>
                <td className="num meta">{b.id.replace('bk-', '')}</td>
                <td>
                  <span style={{ fontWeight: 500 }}>{a.name}</span>
                  <span className="meta" style={{ display: 'block', color: 'var(--ink-3)' }}>
                    {b.supplier}
                  </span>
                </td>
                <td>{groupById(b.groupId).name}</td>
                <td className="num">{fmtDate(b.date)}</td>
                <td className="num">{b.headcount}</td>
                <td className="num">{fmtMoney(b.costPence)}</td>
                <td>
                  {b.receipt ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <span className="mark mark--clear">Attached</span>
                        <span
                          className="meta num"
                          style={{
                            display: 'block',
                            color: 'var(--ink-3)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={b.receipt.filename}
                        >
                          {b.receipt.filename} · {kb(b.receipt.bytes)}
                        </span>
                      </div>
                      <button
                        className="btn btn--quiet"
                        onClick={() => detach(b.id)}
                        aria-label={`Remove receipt from ${b.id}`}
                        title="Remove receipt — this returns the booking to draft"
                      >
                        <IconClose />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={(el) => {
                          inputs.current[b.id] = el;
                        }}
                        type="file"
                        accept={ACCEPT}
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) attach(b.id, f);
                          e.target.value = '';
                        }}
                      />
                      <button
                        className="btn"
                        onClick={() => inputs.current[b.id]?.click()}
                      >
                        <IconAttach />
                        Attach receipt
                      </button>
                    </>
                  )}
                </td>
                <td>
                  <span className={`mark ${b.status === 'confirmed' ? 'mark--clear' : 'mark--idle'}`}>
                    {b.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {b.status === 'draft' && (
                    <>
                      <button
                        className="btn"
                        disabled={blocked}
                        onClick={() => setPending(b.id)}
                        title={
                          blocked
                            ? 'Attach the supplier receipt first — confirmation is blocked without one.'
                            : undefined
                        }
                      >
                        <IconCheck />
                        Confirm
                      </button>
                      {blocked && (
                        <span
                          className="meta"
                          style={{ display: 'block', color: 'var(--ink-3)', marginTop: 5 }}
                        >
                          Receipt required
                        </span>
                      )}
                    </>
                  )}
                  {pending === b.id && (
                    <div className="confirmbar">
                      <span className="meta">
                        Confirm {fmtMoney(b.costPence)} to {b.supplier}?
                      </span>
                      <button className="btn btn--primary" onClick={() => confirm(b.id)}>
                        Yes, confirm
                      </button>
                      <button className="btn" onClick={() => setPending(null)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
        </div>
    </>
  );
}
