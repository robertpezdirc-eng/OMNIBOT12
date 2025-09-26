# 🔹 Omni Ultimate Turbo Flow System - Docker Configuration
# Multi-stage build za optimalno velikost slike

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Nastavi delovni direktorij
WORKDIR /app

# Namesti sistemske odvisnosti
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    openssl

# Kopiraj package.json in package-lock.json
COPY package*.json ./

# Namesti odvisnosti
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production stage
FROM node:20-alpine AS production

# Ustvari non-root uporabnika za varnost
RUN addgroup -g 1001 -S omni && \
    adduser -S omni -u 1001 -G omni

# Namesti runtime odvisnosti
RUN apk add --no-cache \
    curl \
    openssl \
    dumb-init \
    tini

# Nastavi delovni direktorij
WORKDIR /app

# Kopiraj odvisnosti iz build stage
COPY --from=builder /app/node_modules ./node_modules

# Kopiraj aplikacijske datoteke (z .dockerignore optimizacijo)
COPY --chown=omni:omni package*.json ./
COPY --chown=omni:omni *.js ./
COPY --chown=omni:omni *.json ./
COPY --chown=omni:omni *.html ./
COPY --chown=omni:omni *.css ./
COPY --chown=omni:omni api/ ./api/
COPY --chown=omni:omni config/ ./config/
COPY --chown=omni:omni middleware/ ./middleware/
COPY --chown=omni:omni models/ ./models/
COPY --chown=omni:omni routes/ ./routes/
COPY --chown=omni:omni public/ ./public/
COPY --chown=omni:omni utils/ ./utils/

# Ustvari potrebne direktorije
RUN mkdir -p /app/logs /app/uploads /app/temp /app/certs && \
    chown -R omni:omni /app/logs /app/uploads /app/temp /app/certs

# Nastavi environment spremenljivke
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV OMNI_VERSION=2.0.0

# Izpostavi porte
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Preklopi na non-root uporabnika
USER omni

# Uporabi tini za pravilno signal handling
ENTRYPOINT ["tini", "--"]

# Startup command
CMD ["node", "omni-ultra-main.js"]