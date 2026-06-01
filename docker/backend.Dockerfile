FROM node:22-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
