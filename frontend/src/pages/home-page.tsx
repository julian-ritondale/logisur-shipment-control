export function HomePage() {
  return (
    <section aria-hidden="true" className="relative h-56 overflow-hidden bg-brand-indigo">
      <Ridgeline />
    </section>
  )
}

/** Decorative mountain silhouette in the brand palette, back to front. */
function Ridgeline() {
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full"
    >
      <path
        d="M0 220 L0 150 L140 90 L230 130 L360 40 L470 120 L560 80 L690 150 L820 60 L930 110 L1040 30 L1160 120 L1270 85 L1440 140 L1440 220 Z"
        fill="var(--brand-lavender)"
        opacity="0.3"
      />
      <path
        d="M0 220 L0 180 L180 130 L300 170 L450 110 L600 170 L760 120 L900 175 L1080 105 L1240 165 L1440 125 L1440 220 Z"
        fill="var(--brand-blue)"
        opacity="0.55"
      />
      <path
        d="M0 220 L0 204 L260 186 L520 206 L800 184 L1100 206 L1440 188 L1440 220 Z"
        fill="var(--brand-peach)"
        opacity="0.9"
      />
      <rect y="216" width="1440" height="4" fill="var(--brand-orange)" />
    </svg>
  )
}
