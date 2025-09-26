# Omni Server Dockerfile
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application code
COPY . .

# Copy certificates directory
COPY ./certs ./certs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]