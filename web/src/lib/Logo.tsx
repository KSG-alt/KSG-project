/* The KSG mark. Two staggered brackets, interlocking — see branding/BRANDING.md.
   It carries currentColor, so it takes the colour of whatever it sits in. This
   is the BUILDER's mark: PRODUCT.md records that the product itself has no
   decided name or identity, so it is never presented as a product logo. */

const PATHS = (
  <>
    <path d="M14.6 1.4h-5.5C5.5 1.4 2.6 4.3 2.6 7.9v13.8c0 3.6 2.9 6.5 6.5 6.5h5.5c1.7 0 3-1.3 3-3s-1.3-3-3-3h-3.5c-1.4 0-2.5-1.1-2.5-2.5V9.9c0-1.4 1.1-2.5 2.5-2.5h3.5c1.7 0 3-1.3 3-3s-1.3-3-3-3z" />
    <path d="M22.4 35.6h5.5c3.6 0 6.5-2.9 6.5-6.5V15.3c0-3.6-2.9-6.5-6.5-6.5h-5.5c-1.7 0-3 1.3-3 3s1.3 3 3 3h3.5c1.4 0 2.5 1.1 2.5 2.5v9.8c0 1.4-1.1 2.5-2.5 2.5h-3.5c-1.7 0-3 1.3-3 3s1.3 3 3 3z" />
  </>
);

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 37 37"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS}
    </svg>
  );
}

export function Lockup({
  size = 22,
  showName = true,
}: {
  size?: number;
  showName?: boolean;
}) {
  return (
    <span className="lockup">
      <Mark size={size} />
      {showName && <span className="lockup__name">KSG</span>}
      <span className="sr">Kadia Systems Group</span>
    </span>
  );
}
