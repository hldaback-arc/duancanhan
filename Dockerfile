FROM node:20-alpine AS base
WORKDIR /app

ENV NODE_ENV=production

FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev

FROM base AS builder
COPY package*.json ./
COPY . .
RUN npm install
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
