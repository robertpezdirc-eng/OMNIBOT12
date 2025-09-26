# Omni Client Panel Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Electron
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    openssl \
    xvfb \
    gtk+3.0-dev \
    libxss1 \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo-gobject2 \
    libdrm2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/data

# Set proper permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4002/ || exit 1

# Start both HTTP server and Electron app
CMD ["sh", "-c", "python -m http.server 4002 & npm start"]