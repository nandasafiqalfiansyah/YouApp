# ==========================
# Stage Builder
# ==========================
FROM oven/bun:latest AS builder
WORKDIR /app

# Install OS deps untuk Prisma
RUN apt-get update && apt-get install -y openssl curl bash && rm -rf /var/lib/apt/lists/*

# Copy package.json + bun.lockb
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy seluruh source code + prisma folder
COPY . .

# Generate Prisma client
RUN bun run prisma generate

# Build TypeScript project
RUN bun run build

# ==========================
# Stage Runtime
# ==========================
FROM oven/bun:latest
WORKDIR /app

# Copy hasil build + node_modules + prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json bun.lockb ./

# Copy Prisma folder jika mau migrate runtime
COPY prisma ./prisma

# Environment variables via build args
ARG DATABASE_URL
ARG JWT_SECRET
ARG RABBITMQ_URL

RUN echo "DATABASE_URL=${DATABASE_URL}" > .env \
    && echo "JWT_SECRET=${JWT_SECRET}" >> .env \
    && echo "RABBITMQ_URL=${RABBITMQ_URL}" >> .env \
    && echo "PORT=${PORT}" >> .env

EXPOSE 3000


CMD ["bun", "run", "start:prod"]
