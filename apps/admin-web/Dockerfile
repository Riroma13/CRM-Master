FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/admin-web/package.json apps/admin-web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./
COPY . .
RUN cd apps/admin-web && npx next build

# Production
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-web/.next/static ./apps/admin-web/.next/static
# No public directory yet — create if needed later
# COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-web/public ./apps/admin-web/public

USER nextjs
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
EXPOSE 3002

CMD ["node", "apps/admin-web/server.js"]
