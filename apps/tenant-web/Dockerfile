FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/tenant-web/package.json apps/tenant-web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./
COPY . .
RUN cd apps/tenant-web && npx next build

# Production
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/tenant-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/tenant-web/.next/static ./apps/tenant-web/.next/static
# No public directory yet — create if needed later
# COPY --from=builder --chown=nextjs:nodejs /app/apps/tenant-web/public ./apps/tenant-web/public

USER nextjs
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000

CMD ["node", "apps/tenant-web/server.js"]
