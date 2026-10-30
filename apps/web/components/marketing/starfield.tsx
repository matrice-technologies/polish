/**
 * The night sky behind the marketing pages: dots and little crosses that
 * twinkle at their own pace. Positions come from a fixed seed, so the server
 * and the browser draw the same sky (no hydration mismatch) and it never jumps.
 */

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const random = seeded(20261030)
const STARS = Array.from({ length: 90 }, (_, i) => {
  const cross = i % 9 === 0
  return {
    left: random() * 100,
    top: random() * 100,
    size: cross ? 9 + random() * 6 : 1.5 + random() * 2.5,
    cross,
    duration: 3 + random() * 5,
    delay: -random() * 8,
    max: 0.45 + random() * 0.5,
  }
})

export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map((star, i) => (
        <span
          key={i}
          className="polish-star absolute text-blue-100"
          style={
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              "--star-duration": `${star.duration}s`,
              "--star-delay": `${star.delay}s`,
              "--star-max": star.max,
            } as React.CSSProperties
          }
        >
          {star.cross ? (
            <svg viewBox="0 0 10 10" className="size-full" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M5 0v10M0 5h10" />
            </svg>
          ) : (
            <span className="block size-full rounded-full bg-current" />
          )}
        </span>
      ))}
    </div>
  )
}
