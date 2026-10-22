FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Full source + dev dependencies; the compose `migration` service runs from this stage.
FROM deps AS migrate
COPY . .
CMD ["npx", "tsx", "scripts/migrate.ts"]

FROM migrate AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# COPY --from=build --chown=node:node /app/public ./public
# The app also applies migrations on first DB use, so it needs them at runtime.
COPY --from=build --chown=node:node /app/drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["node", "server.js"]
