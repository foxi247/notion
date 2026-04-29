# NexusAI — Production Docker Image
# Multi-stage build for minimal image size

# --- Stage 1: Dependencies ---
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# --- Stage 2: Build ---
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js (standalone output)
RUN bun run build

# --- Stage 3: Production ---
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nexusai

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and ensure db directory exists
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /app/db && chown -R nexusai:nodejs /app/db

# Set permissions
RUN chown -R nexusai:nodejs /app

USER nexusai

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["bun", "server.js"]
