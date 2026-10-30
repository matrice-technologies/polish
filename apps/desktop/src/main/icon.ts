import { nativeImage, type NativeImage } from "electron"

/**
 * The mark — a four-point sparkle — drawn in code rather than shipped as image
 * files, so the tray gets crisp 1x and 2x versions and macOS gets a proper
 * template image (black plus alpha, recoloured by the menu bar).
 *
 * The sparkle is an astroid, |x|^p + |y|^p <= 1 with p < 1, supersampled 4×4
 * per pixel for anti-aliasing.
 */
function drawSparkle(size: number, rgb: [number, number, number], background?: [number, number, number]): Buffer {
  const buffer = Buffer.alloc(size * size * 4)
  const samples = 4
  // Smaller on the app icon, where it sits inside a tile rather than alone.
  const radius = size * (background ? 0.34 : 0.46)
  const center = size / 2
  const corner = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0
      let inside = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples
          const py = y + (sy + 0.5) / samples
          const nx = Math.abs(px - center) / radius
          const ny = Math.abs(py - center) / radius
          if (Math.pow(nx, 0.55) + Math.pow(ny, 0.55) <= 1) hits++
          if (background && insideRoundedSquare(px, py, size, corner)) inside++
        }
      }
      const coverage = hits / (samples * samples)
      const backgroundCoverage = inside / (samples * samples)
      const i = (y * size + x) * 4
      // Electron bitmaps are BGRA.
      if (background) {
        const mix = (fg: number, bg: number) => Math.round(fg * coverage + bg * (1 - coverage))
        buffer[i] = mix(rgb[2], background[2])
        buffer[i + 1] = mix(rgb[1], background[1])
        buffer[i + 2] = mix(rgb[0], background[0])
        buffer[i + 3] = Math.round(255 * backgroundCoverage)
      } else {
        buffer[i] = rgb[2]
        buffer[i + 1] = rgb[1]
        buffer[i + 2] = rgb[0]
        buffer[i + 3] = Math.round(255 * coverage)
      }
    }
  }
  return buffer
}

function insideRoundedSquare(x: number, y: number, size: number, r: number) {
  const cx = Math.min(Math.max(x, r), size - r)
  const cy = Math.min(Math.max(y, r), size - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function fromBitmaps(draw: (size: number) => Buffer, base: number): NativeImage {
  const image = nativeImage.createFromBitmap(draw(base), { width: base, height: base, scaleFactor: 1 })
  image.addRepresentation({ buffer: draw(base * 2), width: base * 2, height: base * 2, scaleFactor: 2 })
  return image
}

const VIOLET: [number, number, number] = [139, 92, 246]

export function trayIcon(): NativeImage {
  if (process.platform === "darwin") {
    const image = fromBitmaps((size) => drawSparkle(size, [0, 0, 0]), 18)
    image.setTemplateImage(true)
    return image
  }
  return fromBitmaps((size) => drawSparkle(size, VIOLET), 16)
}

let cachedAppIcon: NativeImage | null = null

/** Window and taskbar icon: a white sparkle on a violet rounded square. */
export function appIcon(): NativeImage {
  cachedAppIcon ??= nativeImage.createFromBitmap(drawSparkle(256, [255, 255, 255], VIOLET), {
    width: 256,
    height: 256,
  })
  return cachedAppIcon
}
