# ---------- Build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json* ./
COPY apps/server/package.json ./apps/server/
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY apps/server ./apps/server
RUN pnpm --filter server build

# ---------- Production stage ----------
FROM node:22-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S server -u 1001
WORKDIR /app
COPY --from=builder --chown=server:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=server:nodejs /app/apps/server/package.json ./
COPY --from=builder --chown=server:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=server:nodejs /app/apps/server/node_modules ./node_modules
ENV NODE_ENV=production
ENV APP_PORT=3001
EXPOSE 3001
USER server
CMD ["node", "dist/index.js"]
