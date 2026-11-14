# syntax=docker/dockerfile:1
# TickTrendFit production image. See docs/deploy/docker.md.
#   docker build -t ticktrendfit .                  → the web server (default target)
#   docker build -t ticktrendfit-tools --target tools .  → migrations + seed runner
FROM node:24-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# No database is needed to build: every storefront page renders on request.
RUN NEXT_OUTPUT=standalone pnpm build

# One-off tasks with the dev toolchain: `pnpm db:migrate`, then the idempotent seed.
FROM deps AS tools
COPY . .
CMD ["sh", "-c", "pnpm db:migrate && pnpm db:seed"]

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 ttf && mkdir -p .data/uploads && chown -R ttf .data
COPY --from=build --chown=ttf /app/.next/standalone ./
COPY --from=build --chown=ttf /app/.next/static ./.next/static
COPY --from=build --chown=ttf /app/public ./public
USER ttf
EXPOSE 3000
# Uploaded product images (STORAGE_ADAPTER=local) live here; mount a volume to keep them.
VOLUME ["/app/.data"]
CMD ["node", "server.js"]
