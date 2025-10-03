# ==========================
# Stage Builder
# ==========================
FROM oven/bun:latest AS builder
WORKDIR /app

# Install OS deps untuk Prisma (OpenSSL)
RUN apk add --no-cache openssl bash curl

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

# Copy hasil build dari builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json bun.lockb ./

# Copy Prisma schema jika mau run migrate di runtime (opsional)
COPY prisma ./prisma

# Environment variables via build args
ARG DATABASE_URL
ARG JWT_SECRET
ARG RABBITMQ_URL

ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV RABBITMQ_URL=$RABBITMQ_URL
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start NestJS production server
CMD ["bun", "run", "start:prod"]
