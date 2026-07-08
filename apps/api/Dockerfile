FROM node:20-alpine
WORKDIR /app

# Full monorepo copy with built artifacts
COPY . .

# Install ALL deps (including dev) from lockfile
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN cd /app && pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd /app/packages/database && npx prisma generate

# Build the API
RUN cd /app/apps/api && npx nest build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
