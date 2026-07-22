# Metrolab frontend (Next.js) container image for Cloud Run.
#
# NEXT_PUBLIC_API_URL is a build-time value: Next.js inlines any
# NEXT_PUBLIC_* variable into the client bundle at `next build` time, so it
# must be supplied as a --build-arg pointing at the target environment's
# backend URL before the build runs.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Cloud Run injects PORT (defaults to 8080); Next.js standalone server.js
# reads process.env.PORT itself.
EXPOSE 8080

CMD ["node", "server.js"]
