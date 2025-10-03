# Stage build
FROM oven/bun:latest AS builder
WORKDIR /app

# Copy package.json dan bun.lockb
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy seluruh source
COPY . .

# Build project (jika pakai TypeScript)
RUN bun run build

# Stage runtime
FROM oven/bun:latest
WORKDIR /app

# Copy hasil build dari stage builder
COPY --from=builder /app/dist ./dist
COPY package.json bun.lockb ./

# Install production dependencies
RUN bun install --production

# Env inject dari build args
ARG DATABASE_URL
ARG JWT_SECRET
ARG RABBITMQ_URL

ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV RABBITMQ_URL=$RABBITMQ_URL
ENV PORT=3000

COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
