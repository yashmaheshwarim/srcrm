# ====== Stage 1: Install dependencies ======
FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies needed for some native modules
RUN apk add --no-cache libc6-compat

# Copy package files and install ALL dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# ====== Stage 2: Build the application ======
FROM node:20-alpine AS builder
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY . .

# Build Next.js app
RUN npm run build:next

# Build Tailwind CSS
RUN npm run build:tailwind

# Prune dev dependencies to reduce image size
RUN npm prune --omit=dev

# ====== Stage 3: Production image ======
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy public assets (static files that don't require a build step)
COPY --from=builder /app/public ./public

# Copy the built Next.js output
COPY --from=builder /app/.next ./.next

# Copy the built Tailwind CSS
COPY --from=builder /app/src/styles/tailwind.css ./src/styles/tailwind.css

# Copy pruned node_modules (production deps only)
COPY --from=builder /app/node_modules ./node_modules

# Copy package.json for npm lifecycle scripts
COPY --from=builder /app/package.json ./package.json

# Copy config files needed at runtime
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port Next.js runs on
EXPOSE 3000

# Set the environment variable for the port
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the Next.js production server
CMD ["npx", "next", "start"]
