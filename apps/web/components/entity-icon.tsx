import { cn } from "@/lib/utils"

/**
 * A mark for anything that has a name and might have a logo — a workspace, a
 * project. Without an upload it is generated from the name, so everything has
 * an icon from the moment it is created and the same name always produces the
 * same one, on the server and in the browser, today and next year.
 *
 * Purely a function of the name, so there is no state to hydrate and no flash
 * of a different colour on the client.
 */

/** FNV-1a. Small, and it spreads short strings well enough to pick a hue from. */
function seed(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function EntityIcon({
  name,
  logoUrl,
  className,
}: {
  name: string
  /** An uploaded logo. When absent the mark below is generated from the name. */
  logoUrl?: string | null
  className?: string
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={cn("size-5 shrink-0 rounded-md object-cover", className)}
      />
    )
  }

  const h = seed(name.trim() || "workspace")

  // Three stops sweeping 90–170° of the wheel, in one direction or the other.
  // A narrow spread only ever produced a colour and its neighbour — every tile
  // came out monochrome. An arc this wide puts genuinely different colours in
  // the same tile: teal into blue into indigo, amber into pink into violet.
  //
  // The lightness ramp is fixed rather than seeded, and tops out at 0.74 so the
  // white cursor stays legible over the lightest stop. Chroma peaks in the
  // middle, which keeps the ends from going neon.
  const hue = h % 360
  const sweep = 90 + ((h >>> 5) % 80)
  const arc = ((h >>> 13) & 1) === 1 ? -sweep : sweep
  const angle = 115 + ((h >>> 17) % 70)

  const stops = [
    `oklch(0.74 0.16 ${hue}) 0%`,
    `oklch(0.6 0.2 ${(hue + arc / 2 + 720) % 360}) 52%`,
    `oklch(0.47 0.18 ${(hue + arc + 720) % 360}) 100%`,
  ].join(", ")

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md shadow-sm",
        className
      )}
      style={{ backgroundImage: `linear-gradient(${angle}deg, ${stops})` }}
    >
      {/*
       * The cursor from the logo, on its own, full bleed. The viewBox is the
       * path's exact bounds — x and y both run 11 to 19 — so at size-full every
       * extreme of the shape lands on an edge of the tile. Its tip sits in the
       * corner, which the rounded overflow trims to the tile's own curve.
       */}
      <svg viewBox="11 11 8 8" fill="white" className="size-full">
        <path d="m11 11 8 3-3.5 1.5L14 19z" />
      </svg>
    </span>
  )
}
