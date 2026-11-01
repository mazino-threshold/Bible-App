# Production image for the API.
# Build:  docker build -t bible-app-backend .
# Run:    docker run -p 4000:4000 --env-file .env bible-app-backend

# ---------- Build: compile TypeScript ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Run: compiled code + production dependencies only ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY migrations ./migrations

# Run as the image's non-root user
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 4000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Apply any new migrations, then start the API. exec makes node receive stop signals directly.
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]
