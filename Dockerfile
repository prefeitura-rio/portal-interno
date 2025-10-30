# Base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Force install the correct lightningcss binary for Alpine Linux AMD64
RUN npm install lightningcss-linux-x64-musl@1.30.1

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Rebuild native modules for the target platform
RUN npm rebuild

# Define build-time environment variables
ARG NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL
ARG NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID
ARG NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI
ARG NEXT_PUBLIC_GOVBR_BASE_URL
ARG NEXT_PUBLIC_COURSES_BASE_API_URL
ARG NEXT_PUBLIC_BUSCA_SEARCH_API_URL
ARG NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT

# Set environment variables for the build process
ENV NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL=$NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL
ENV NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID=$NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID
ENV NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI=$NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI
ENV NEXT_PUBLIC_GOVBR_BASE_URL=$NEXT_PUBLIC_GOVBR_BASE_URL
ENV NEXT_PUBLIC_COURSES_BASE_API_URL=$NEXT_PUBLIC_COURSES_BASE_API_URL
ENV NEXT_PUBLIC_BUSCA_SEARCH_API_URL=$NEXT_PUBLIC_BUSCA_SEARCH_API_URL
ENV NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT=$NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT

# Build the Next.js application
RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

# Start the application
CMD HOSTNAME="0.0.0.0" node server.js
