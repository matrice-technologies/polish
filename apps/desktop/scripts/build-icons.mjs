// Rasterises resources/icon.svg and resources/glyph.svg into every bitmap the
// app and its installers need. Run after changing either SVG:
//   npm run icons --workspace @polish/desktop
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const resources = join(dirname(fileURLToPath(import.meta.url)), "..", "resources")
const icon = readFileSync(join(resources, "icon.svg"))
const glyph = readFileSync(join(resources, "glyph.svg"))

const render = (svg, size, file) =>
  sharp(svg, { density: Math.max(72, (72 * size) / 96) * 4 })
    .resize(size, size)
    .png()
    .toFile(join(resources, file))

await Promise.all([
  // App, window and installer icon; electron-builder derives .ico and .icns from it.
  render(icon, 1024, "icon.png"),
  // Windows and Linux tray: the blue tile, 1x and 2x.
  render(icon, 16, "tray.png"),
  render(icon, 32, "tray@2x.png"),
  // macOS menu bar: a black-on-transparent template, recoloured by the system.
  render(glyph, 18, "trayTemplate.png"),
  render(glyph, 36, "trayTemplate@2x.png"),
])
console.log("icons written to", resources)
