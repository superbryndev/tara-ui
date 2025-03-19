FROM node:20.11.0-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Development environment - only used for local development
FROM base AS development
WORKDIR /app
COPY . .
CMD ["npm", "run", "dev"]

# Build the Next.js application
FROM base AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production environment
FROM node:20.11.0-alpine AS production
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy necessary files
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app/.next
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"] 