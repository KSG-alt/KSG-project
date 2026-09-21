export function SectionHead({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children?: React.ReactNode;
}) {
  return (
    <header style={{ marginBottom: 30 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1 style={{ fontSize: 'var(--t-xl)' }}>{title}</h1>
          {count && (
            <span className="num meta" style={{ color: 'var(--ink-3)' }}>
              {count}
            </span>
          )}
        </div>
        {children && (
          /* Controls wrap rather than push the page sideways — two fields in
             a section head is one more than a phone has room for. */
          <div className="sechead__acts">{children}</div>
        )}
      </div>
      <div className="rule rule--strong" />
    </header>
  );
}
