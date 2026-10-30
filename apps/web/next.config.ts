import path from "node:path"
import type { NextConfig } from "next"

// The monorepo root: where npm hoists node_modules and where @polish/shared lives.
const workspaceRoot = path.join(import.meta.dirname, "../..")

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the runtime image does not need
  // node_modules or the npm workspace layout.
  output: "standalone",
  // Trace from the repo root, or the standalone bundle misses hoisted packages.
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },

  // @polish/shared ships TypeScript source, not a build.
  transpilePackages: ["@polish/shared"],

  experimental: {
    /**
     * Avatar uploads run through a Server Action, whose default cap is 1 MB.
     * The real ceiling is 10 MB, set in three places that must agree: the
     * avatars bucket, MAX_IMAGE_BYTES in lib/schema.ts, and here.
     *
     * Set above 10 MB rather than at it. The body is multipart, so it carries
     * boundaries and headers on top of the file, and a limit set exactly at the
     * file size would reject a file of exactly that size — at the framework,
     * with a stack trace, instead of at our own check with a sentence.
     */
    serverActions: { bodySizeLimit: "12mb" },
  },
}

export default nextConfig
