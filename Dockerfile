# 🔹 Omni Ultimate Turbo Flow System - Docker Configuration
# Optimiziran za Vercel in Cloud deployment

# Uporabimo uradno Node.js sliko
FROM node:20-alpine

# Nastavimo delovno mapo v containerju
WORKDIR /app

# Namesti sistemske odvisnosti
RUN apk add --no-cache \
    curl \
    openssl \
    git

# Kopiramo package.json in package-lock.json
COPY package*.json ./

# Namestimo Node.js odvisnosti
RUN npm install --production

# Kopiramo ostale datoteke v container
COPY . .

# Ustvari potrebne direktorije
RUN mkdir -p /app/logs /app/uploads /app/temp /app/data

# Nastavi environment spremenljivke
ENV NODE_ENV=production
ENV PORT=8080
ENV LOG_LEVEL=info
ENV OMNI_VERSION=2.0.0

# Expose porta (Vercel/Cloud Run kompatibilno)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start skripta
CMD ["npm", "start"]
