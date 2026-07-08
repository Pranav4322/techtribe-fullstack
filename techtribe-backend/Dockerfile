# ---------- Build stage ----------
FROM node:20-slim AS builder
WORKDIR /app

# Prisma's engine binaries need OpenSSL present at both generate-time and runtime.
# (Alpine/musl builds require extra libssl compat packages and are error-prone —
# node:20-slim is Debian-based and ships proper OpenSSL support out of the box.)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
