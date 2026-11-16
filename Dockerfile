# syntax=docker/dockerfile:1
#
# Production image for Coolify (or any Docker host).
# - bun is used only as the package manager (bun.lock); Next.js and Prisma run on Node.
# - NEXT_PUBLIC_* variables are inlined at build time: in Coolify mark them as
#   "Build Variable" so they are passed as --build-arg.
# - Server-only secrets (DATABASE_URL, PINATA_*, ALCHEMY_API_KEY, ...) are runtime env vars.
# - The container listens on 0.0.0.0:${PORT} (default 3000).

ARG NODE_VERSION=22
ARG BUN_VERSION=1.4

FROM oven/bun:${BUN_VERSION} AS bun

# ---------------------------------------------------------------------------
# base: Node runtime + bun binary + openssl (needed by Prisma engines)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# deps: install node_modules from bun.lock (postinstall runs `prisma generate`)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock .npmrc ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# builder: prisma generate + next build
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public (browser) configuration - baked into the client bundle at build time.
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_BASE_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ARG NEXT_PUBLIC_IPFS_GATEWAY
ARG NEXT_PUBLIC_REOWN_PROJECT_ID
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_DEFAULT_NETWORK
ARG NEXT_PUBLIC_USE_TESTNET
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_BASE_API_URL=$NEXT_PUBLIC_BASE_API_URL \
    NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL \
    NEXT_PUBLIC_IPFS_GATEWAY=$NEXT_PUBLIC_IPFS_GATEWAY \
    NEXT_PUBLIC_REOWN_PROJECT_ID=$NEXT_PUBLIC_REOWN_PROJECT_ID \
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID \
    NEXT_PUBLIC_DEFAULT_NETWORK=$NEXT_PUBLIC_DEFAULT_NETWORK \
    NEXT_PUBLIC_USE_TESTNET=$NEXT_PUBLIC_USE_TESTNET

ENV NODE_ENV=production
RUN node_modules/.bin/prisma generate \
  && node --max-old-space-size=4096 node_modules/.bin/next build \
  && rm -rf .next/cache

# ---------------------------------------------------------------------------
# runner: minimal runtime (keeps the prisma CLI for migrations on start)
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/logs \
  && chown nextjs:nodejs /app/logs

COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/next.config.ts /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --chown=nextjs:nodejs --chmod=755 start.sh ./start.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["./start.sh"]
