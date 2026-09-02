export default function Logo({ height = 34 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height }}>
      <svg
        viewBox="0 0 40 40"
        width={height}
        height={height}
        aria-hidden="true"
        style={{ display: 'block', flex: 'none' }}
      >
        {[0, 45, 90, 135].map((angle) => (
          <rect
            key={angle}
            x="18.5"
            y="6"
            width="3"
            height="28"
            rx="1.5"
            fill="var(--accent)"
            transform={`rotate(${angle} 20 20)`}
          />
        ))}
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: Math.round(height * 0.62),
          letterSpacing: '-0.01em',
          color: 'var(--text-strong)',
          lineHeight: 1,
        }}
      >
        modernschool<span style={{ color: 'var(--accent)' }}>.ai</span>
      </span>
    </div>
  );
}
