import { nativeImage, type NativeImage } from "electron"

import iconPath from "../../resources/icon.png?asset"
import trayPath from "../../resources/tray.png?asset"
import trayTemplatePath from "../../resources/trayTemplate.png?asset"

/**
 * The flame-trail P, rendered from resources/icon.svg and glyph.svg by
 * scripts/build-icons.mjs. Loading the 1x file picks up its @2x neighbour, so
 * high-DPI trays get the sharp version.
 */
export function trayIcon(): NativeImage {
  if (process.platform === "darwin") {
    // Black plus alpha: the menu bar recolours it for light, dark and highlighted.
    const image = nativeImage.createFromPath(trayTemplatePath)
    image.setTemplateImage(true)
    return image
  }
  return nativeImage.createFromPath(trayPath)
}

let cachedAppIcon: NativeImage | null = null

export function appIcon(): NativeImage {
  cachedAppIcon ??= nativeImage.createFromPath(iconPath)
  return cachedAppIcon
}
