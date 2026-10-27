# syntax=docker/dockerfile:1

# Debian slim instead of Alpine: better-sqlite3 ships glibc prebuilds, musl causes trouble (SPEC 11.1).
ARG NODE_IMAGE=node:24.22.1-trixie-slim

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 ships prebuilt binaries, but npm would still run an implicit `node-gyp rebuild`
# for its binding.gyp, which needs Python and a compiler. No other dependency relies on install scripts.
RUN npm ci --ignore-scripts

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/guildhub.db

# Created here so the named volume inherits the ownership of the non-root user on first mount.
RUN mkdir -p /data /backups && chown node:node /data /backups

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle

USER node
EXPOSE 3000
VOLUME ["/data"]

# The slim image has no curl, so Node's fetch does the probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

# Migrations run in src/instrumentation.ts before the server accepts requests.
CMD ["node", "server.js"]
