# Polish web app (apps/web), for Coolify.
#
# Built from the repository root because the app depends on the @polish/shared
# workspace; a build context of apps/web alone cannot resolve it.
#
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, not
# read at runtime. They are build args here and must be set as *build-time*
# variables in Coolify, or the browser ends up with an empty Supabase URL.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# ---------- dependencies ----------
FROM base AS deps
WORKDIR /repo

# Manifests only, so this layer is cached until a dependency changes.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/desktop/package.json apps/desktop/
COPY packages/shared/package.json packages/shared/

# Only the web app's dependency tree (not Electron's). No install scripts: the
# web build needs none, and the root's Supabase CLI would try to download a
# binary.
RUN npm ci --workspace @polish/web --ignore-scripts --no-audit --no-fund

# ---------- build ----------
FROM base AS builder
WORKDIR /repo

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run build --workspace @polish/web

# ---------- runtime ----------
FROM base AS runner
WORKDIR /repo

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `standalone` holds the traced node_modules and the server entry; static
# assets and public/ are copied beside it, as Next expects.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
