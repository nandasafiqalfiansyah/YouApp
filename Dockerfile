# Base image
FROM node:18-alpine
WORKDIR /app

# Install dependencies Bun + OS libs
RUN apk add --no-cache curl bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Set Bun path
ENV PATH="/root/.bun/bin:$PATH"

# Copy package.json
COPY package*.json ./

# Install dependencies
RUN bun install

# Copy source code + Prisma schema
COPY . .

# Install OpenSSL untuk Prisma
RUN apk add --no-cache openssl

# Generate Prisma client
RUN bun run prisma generate

# Build app (kalau ada step build)
RUN bun run build

# Start server
CMD ["bun", "run", "start:prod"]
