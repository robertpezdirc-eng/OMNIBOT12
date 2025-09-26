# 🚀 Omni Cloud - Deployment Guide

Podrobna navodila za deployment Omni Cloud sistema v različnih okoljih.

## 📋 Kazalo

1. [Hitri Start](#hitri-start)
2. [Lokalni Development](#lokalni-development)
3. [Produkcijski Deployment](#produkcijski-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Monitoring in Maintenance](#monitoring-in-maintenance)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Hitri Start

### Predpogoji
```bash
# Node.js 18+ in npm
node --version  # v18.0.0+
npm --version   # 8.0.0+

# MongoDB (lokalno ali cloud)
# Git
```

### 1-Minute Setup
```bash
# 1. Kloniraj repozitorij
git clone https://github.com/your-username/omni-cloud-pushbutton.git
cd omni-cloud-pushbutton

# 2. Namesti odvisnosti
cd backend
npm install

# 3. Kopiraj in uredi .env
cp .env.example .env
# Uredi .env datoteko z svojimi podatki

# 4. Zaženi sistem
npm start

# 5. Odpri v brskalniku
# Client: http://localhost:3000/client/
# Admin: http://localhost:3000/admin/
```

---

## 💻 Lokalni Development

### Setup Development Environment

```bash
# 1. Namesti odvisnosti
cd backend
npm install

# 2. Nastavi .env za development
cat > .env << EOF
# Development Environment
PORT=3000
NODE_ENV=development
DEBUG_MODE=true
LOG_LEVEL=debug

# Database
MONGO_URI=mongodb://localhost:27017/omni-cloud-dev

# Security
JWT_SECRET=dev-secret-change-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# API
API_URL=http://localhost:3000
CORS_ORIGIN=*

# Email (optional for dev)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EOF

# 3. Zaženi MongoDB (če lokalno)
# macOS/Linux:
mongod --dbpath /usr/local/var/mongodb

# Windows:
# Zaženi MongoDB service

# 4. Zaženi development server
npm run dev

# 5. Zaženi teste
npm run test:full
```

### Development Scripts

```bash
# Osnovni development
npm run dev          # Nodemon z auto-restart
npm run debug        # Debug mode z dodatnimi logi

# Testiranje
npm test             # Osnovni testi
npm run test:full    # Polni test suite
npm run test:quick   # Hitri testi
npm run test:debug   # Debug testi

# Monitoring
npm run health       # Preveri zdravje sistema
npm run report       # Generiraj debug poročilo
```

---

## 🏭 Produkcijski Deployment

### 1. Heroku Deployment

```bash
# 1. Pripravi Heroku
heroku create omni-cloud-app
heroku addons:create mongolab:sandbox

# 2. Nastavi environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set ADMIN_USERNAME=admin
heroku config:set ADMIN_PASSWORD=$(openssl rand -base64 16)
heroku config:set DEBUG_MODE=false
heroku config:set LOG_LEVEL=info

# 3. Deploy
git push heroku main

# 4. Preveri
heroku logs --tail
heroku open
```

### 2. DigitalOcean/AWS/VPS Deployment

```bash
# 1. Pripravi server (Ubuntu 20.04+)
sudo apt update
sudo apt install -y nodejs npm nginx mongodb

# 2. Kloniraj in nastavi
git clone https://github.com/your-username/omni-cloud-pushbutton.git
cd omni-cloud-pushbutton/backend
npm install --production

# 3. Nastavi .env za produkcijo
cat > .env << EOF
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://localhost:27017/omni-cloud-prod
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 16)
DEBUG_MODE=false
LOG_LEVEL=warn
API_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
EOF

# 4. Nastavi PM2 za process management
npm install -g pm2
pm2 start server.js --name omni-cloud
pm2 startup
pm2 save

# 5. Nastavi Nginx reverse proxy
sudo nano /etc/nginx/sites-available/omni-cloud
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Aktiviraj Nginx config
sudo ln -s /etc/nginx/sites-available/omni-cloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL z Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/omni-cloud
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      - mongo
    volumes:
      - ./backend/logs:/app/logs
    restart: unless-stopped

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

### Docker Commands
```bash
# Build in zaženi
docker-compose up -d

# Preveri status
docker-compose ps

# Poglej loge
docker-compose logs -f app

# Posodobi
docker-compose pull
docker-compose up -d

# Backup baze
docker-compose exec mongo mongodump --out /data/backup

# Restore baze
docker-compose exec mongo mongorestore /data/backup
```

---

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. AWS Elastic Beanstalk
```bash
# 1. Namesti EB CLI
pip install awsebcli

# 2. Inicializiraj
eb init omni-cloud --platform node.js

# 3. Ustvari environment
eb create production

# 4. Nastavi environment variables
eb setenv NODE_ENV=production JWT_SECRET=your-secret

# 5. Deploy
eb deploy

# 6. Odpri
eb open
```

#### 2. AWS ECS (Docker)
```yaml
# task-definition.json
{
  "family": "omni-cloud",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "omni-cloud",
      "image": "your-account.dkr.ecr.region.amazonaws.com/omni-cloud:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/omni-cloud",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

```bash
# 1. Pripravi app.yaml
cat > app.yaml << EOF
runtime: nodejs18

env_variables:
  NODE_ENV: production
  MONGO_URI: mongodb+srv://user:pass@cluster.mongodb.net/omni-cloud
  JWT_SECRET: your-secret

automatic_scaling:
  min_instances: 1
  max_instances: 10
EOF

# 2. Deploy
gcloud app deploy

# 3. Odpri
gcloud app browse
```

### Azure App Service

```bash
# 1. Ustvari resource group
az group create --name omni-cloud-rg --location eastus

# 2. Ustvari app service plan
az appservice plan create --name omni-cloud-plan --resource-group omni-cloud-rg --sku B1 --is-linux

# 3. Ustvari web app
az webapp create --resource-group omni-cloud-rg --plan omni-cloud-plan --name omni-cloud-app --runtime "NODE|18-lts"

# 4. Nastavi environment variables
az webapp config appsettings set --resource-group omni-cloud-rg --name omni-cloud-app --settings NODE_ENV=production

# 5. Deploy
az webapp deployment source config --resource-group omni-cloud-rg --name omni-cloud-app --repo-url https://github.com/your-username/omni-cloud-pushbutton --branch main
```

---

## 📊 Monitoring in Maintenance

### Health Monitoring

```bash
# Preveri zdravje sistema
curl http://localhost:3000/api/health

# Generiraj poročilo
npm run report

# Poglej loge
tail -f backend/logs/omni-cloud.log

# Monitoring z PM2
pm2 monit
pm2 logs omni-cloud
```

### Backup Strategy

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/omni-cloud" --out backup/$(date +%Y%m%d)

# Automated backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/omni-cloud"
mkdir -p $BACKUP_DIR

# Database backup
mongodump --uri="$MONGO_URI" --out "$BACKUP_DIR/db_$DATE"

# Logs backup
cp -r backend/logs "$BACKUP_DIR/logs_$DATE"

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Dodaj v crontab za dnevni backup
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### Performance Monitoring

```javascript
// monitoring.js
const { getHealthStatus } = require('./backend/debug');

setInterval(async () => {
    const health = getHealthStatus();
    
    // Pošlji na monitoring servis
    if (health.performance.errorRate > 5) {
        console.warn('High error rate detected:', health.performance.errorRate);
        // Pošlji alert
    }
    
    if (health.memory.usage > 80) {
        console.warn('High memory usage:', health.memory.usage);
        // Pošlji alert
    }
}, 60000); // Vsako minuto
```

---

## 🔧 Troubleshooting

### Pogoste Napake

#### 1. MongoDB Connection Error
```bash
# Preveri MongoDB status
sudo systemctl status mongod

# Zaženi MongoDB
sudo systemctl start mongod

# Preveri connection string
echo $MONGO_URI
```

#### 2. Port Already in Use
```bash
# Najdi proces na portu 3000
lsof -i :3000

# Ustavi proces
kill -9 <PID>

# Ali spremeni port v .env
PORT=3001
```

#### 3. JWT Token Issues
```bash
# Generiraj nov JWT secret
openssl rand -base64 32

# Posodobi .env
JWT_SECRET=new-secret-here
```

#### 4. WebSocket Connection Failed
```bash
# Preveri firewall
sudo ufw allow 3000

# Nginx WebSocket config
# Dodaj v nginx.conf:
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Debug Mode

```bash
# Zaženi v debug mode
DEBUG_MODE=true LOG_LEVEL=debug npm start

# Poglej debug loge
tail -f backend/logs/debug.log

# Generiraj debug poročilo
npm run report
```

### Log Analysis

```bash
# Najdi napake v logih
grep "ERROR" backend/logs/omni-cloud.log

# Analiziraj performance
grep "PERFORMANCE" backend/logs/debug.log | tail -20

# Preveri slow requests
grep "Slow request" backend/logs/omni-cloud.log
```

---

## 📞 Podpora

### Kontakt
- **Email**: support@omni-cloud.com
- **GitHub Issues**: https://github.com/your-username/omni-cloud-pushbutton/issues
- **Dokumentacija**: README.md

### Koristne Povezave
- [Node.js Documentation](https://nodejs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/guide/)
- [Socket.IO Documentation](https://socket.io/docs/)

---

## 🔄 Posodobitve

### Posodobitev Sistema
```bash
# 1. Backup
npm run backup

# 2. Pull najnovejše spremembe
git pull origin main

# 3. Posodobi odvisnosti
npm update

# 4. Zaženi teste
npm run test:full

# 5. Restart
pm2 restart omni-cloud
```

### Rollback
```bash
# Vrni na prejšnjo verzijo
git checkout HEAD~1

# Restart
pm2 restart omni-cloud
```

---

**🎉 Uspešen deployment! Vaš Omni Cloud sistem je pripravljen za uporabo.**