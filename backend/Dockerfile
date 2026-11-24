FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# `build` runs `prisma generate` first (no database needed).
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Schema and CLI config, to apply the schema at start.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma7.config.ts ./
USER node
EXPOSE 3000
# No migrations until the schema settles: push it as it is, then start the API.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main.js"]
