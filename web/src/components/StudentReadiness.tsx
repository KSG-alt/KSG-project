import { readiness, type Student } from '../data/seed';

/* One mark answers the only question an arrivals list is asked: can this
   student walk in? Blocking items are safeguarding; the rest is a watch. */
export function ReadinessMark({ s }: { s: Student }) {
  const r = readiness(s);
  if (!r.ready) {
    return (
      <span className="mark mark--critical" title={r.blocking.join(' · ')}>
        {r.blocking[0]}
        {r.blocking.length > 1 ? ` +${r.blocking.length - 1}` : ''}
      </span>
    );
  }
  if (r.watch.length) {
    return (
      <span className="mark mark--overdue" title={r.watch.join(' · ')}>
        {r.watch[0]}
        {r.watch.length > 1 ? ` +${r.watch.length - 1}` : ''}
      </span>
    );
  }
  return <span className="mark mark--clear">Ready</span>;
}
