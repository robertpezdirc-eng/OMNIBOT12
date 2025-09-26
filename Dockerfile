# Uporabimo uradno Node.js sliko
FROM node:20-alpine

# Nastavimo delovno mapo v containerju
WORKDIR /app

# Kopiramo package.json in package-lock.json
COPY package*.json ./

# Namestimo Node.js odvisnosti
RUN npm install --production

# Kopiramo ostale datoteke v container
COPY . .

# Nastavimo PORT, ki ga Cloud Run določi
ENV PORT=8080

# Expose porta
EXPOSE 8080

# Start skripta
CMD ["npm", "start"]
