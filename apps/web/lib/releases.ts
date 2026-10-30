import "server-only"

/**
 * The latest desktop release, from this repo's GitHub Releases, which CI
 * publishes to and installed copies update from.
 *
 * Fetched from GitHub's API and cached for five minutes: unauthenticated calls
 * are rate-limited per server IP, and a new release can wait that long to show.
 */
const LATEST = "https://api.github.com/repos/matrice-technologies/polish/releases/latest"

export const RELEASES_PAGE = "https://github.com/matrice-technologies/polish/releases/latest"

export interface DesktopRelease {
  version: string
  publishedAt: string
  windows: string | null
  macArm64: string | null
  macX64: string | null
}

interface GitHubRelease {
  tag_name: string
  published_at: string
  assets: { name: string; browser_download_url: string }[]
}

export async function latestRelease(): Promise<DesktopRelease | null> {
  try {
    const res = await fetch(LATEST, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const release = (await res.json()) as GitHubRelease
    const asset = (test: RegExp) => release.assets.find((a) => test.test(a.name))?.browser_download_url ?? null
    return {
      version: release.tag_name.replace(/^v/, ""),
      publishedAt: release.published_at,
      windows: asset(/^Polish-Setup-.*\.exe$/),
      macArm64: asset(/^Polish-.*-arm64\.dmg$/),
      macX64: asset(/^Polish-.*-x64\.dmg$/),
    }
  } catch {
    return null
  }
}
