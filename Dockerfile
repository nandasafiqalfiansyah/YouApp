# Base image
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN bun install

# Copy source code + prisma schema
COPY . .

# Install OpenSSL (Alpine)
RUN apk add --no-cache openssl

# Generate Prisma client
RUN bun run prisma generate

# Build app (kalau ada step build)
RUN bun run build

# Runtime image
FROM node:18-alpine
WORKDIR /app

# Copy built app + node_modules + prisma client
COPY --from=builder /app .

# Jalankan server
CMD ["bun", "run", "start:prod"]
