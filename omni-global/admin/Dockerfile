# Multi-stage build za Omni Admin GUI
FROM node:20-alpine AS builder

# Nastavi delovni direktorij
WORKDIR /app

# Kopiraj package.json in package-lock.json
COPY package*.json ./

# Namesti vse odvisnosti (vključno z dev)
RUN npm ci && npm cache clean --force

# Kopiraj izvorno kodo
COPY . .

# Zgradi aplikacijo (če je potrebno)
RUN npm run build 2>/dev/null || echo "No build script found, skipping..."

# Production stage
FROM node:20-alpine AS production

# Namesti potrebne sistemske pakete
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata \
    && update-ca-certificates

# Nastavi časovni pas
ENV TZ=Europe/Ljubljana

# Nastavi delovni direktorij
WORKDIR /app

# Ustvari uporabnika za varnost
RUN addgroup -g 1001 -S nodejs && \
    adduser -S omni -u 1001 -G nodejs

# Kopiraj package.json in package-lock.json
COPY package*.json ./

# Namesti samo produkcijske odvisnosti
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Kopiraj aplikacijske datoteke iz builder stage
COPY --from=builder --chown=omni:nodejs /app/dist ./dist 2>/dev/null || echo "No dist folder"
COPY --from=builder --chown=omni:nodejs /app/public ./public 2>/dev/null || echo "No public folder"
COPY --chown=omni:nodejs . .

# Ustvari potrebne direktorije
RUN mkdir -p \
    /app/logs \
    /app/certs \
    /app/uploads \
    /app/temp && \
    chown -R omni:nodejs /app

# Nastavi environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV SSL_PORT=4443

# Preklopi na non-root uporabnika
USER omni

# Izpostavi porte
EXPOSE 4000 4443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Graceful shutdown handler
STOPSIGNAL SIGTERM

# Zaženi aplikacijo
CMD ["node", "app.js"]