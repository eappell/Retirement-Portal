# Build and run Next.js app for production
FROM node:18-alpine AS deps
WORKDIR /app
COPY apps/portal/package.json apps/portal/package-lock.json* ./
RUN npm ci --silent

FROM node:18-alpine AS builder
WORKDIR /app
COPY apps/portal/package.json apps/portal/package-lock.json* ./
RUN npm install --silent
COPY apps/portal ./
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8020
COPY --from=builder /app .
EXPOSE 8020
# next start will respect PORT env var
CMD ["npm", "run", "start"]
