# Stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm install --omit=dev

# Env inject dari build args
ARG DATABASE_URL
ARG JWT_SECRET
ARG RABBITMQ_URL

ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV RABBITMQ_URL=$RABBITMQ_URL

CMD ["node", "dist/main.js"]
