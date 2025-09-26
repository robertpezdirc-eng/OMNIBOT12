# 🚀 Deployment Guide - Omni Ultimate Turbo Flow System

## 📋 Pregled Deployment Možnosti

Ta dokument opisuje različne načine namestitve Omni sistema v produkcijskem okolju.

## 🐳 Docker Deployment (Priporočeno)

### **Hitra Docker Namestitev**

```bash
# 1. Kloniraj repozitorij
git clone https://github.com/robertpezdirc-eng/OMNIBOT12.git
cd OMNIBOT12

# 2. Build Docker image
docker build -t omni-system:latest .

# 3. Zaženi kontejner
docker run -d \
  --name omni-system \
  --restart unless-stopped \
  -p 3000:3000 \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://localhost:27017/omni \
  -e REDIS_URL=redis://localhost:6379 \
  -v omni-data:/app/data \
  -v omni-logs:/app/logs \
  omni-system:latest
```

### **Docker Compose (Priporočeno za produkcijo)**

Ustvari `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  omni-app:
    build: .
    container_name: omni-system
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/omni
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - mongo
      - redis
    volumes:
      - omni-data:/app/data
      - omni-logs:/app/logs
    networks:
      - omni-network

  mongo:
    image: mongo:7
    container_name: omni-mongo
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=omni
    volumes:
      - mongo-data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - omni-network

  redis:
    image: redis:7-alpine
    container_name: omni-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - omni-network

  nginx:
    image: nginx:alpine
    container_name: omni-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - omni-app
    networks:
      - omni-network

volumes:
  omni-data:
  omni-logs:
  mongo-data:
  redis-data:
  nginx-logs:

networks:
  omni-network:
    driver: bridge
```

Zaženi z:
```bash
# Ustvari .env datoteko z varnostnimi ključi
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "MONGO_ROOT_USER=admin" >> .env
echo "MONGO_ROOT_PASSWORD=$(openssl rand -base64 16)" >> .env
echo "REDIS_PASSWORD=$(openssl rand -base64 16)" >> .env

# Zaženi sistem
docker-compose -f docker-compose.prod.yml up -d
```

## ☁️ Cloud Deployment

### **Google Cloud Platform (GCP)**

#### **1. Google Cloud Run**
```bash
# Build in push image
gcloud builds submit --tag gcr.io/PROJECT_ID/omni-system

# Deploy na Cloud Run
gcloud run deploy omni-system \
  --image gcr.io/PROJECT_ID/omni-system \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars NODE_ENV=production
```

#### **2. Google Kubernetes Engine (GKE)**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: omni-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: omni-system
  template:
    metadata:
      labels:
        app: omni-system
    spec:
      containers:
      - name: omni-system
        image: gcr.io/PROJECT_ID/omni-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: omni-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

### **Amazon Web Services (AWS)**

#### **1. AWS ECS Fargate**
```json
{
  "family": "omni-system",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "omni-system",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/omni-system:latest",
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
          "awslogs-group": "/ecs/omni-system",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### **2. AWS Elastic Beanstalk**
```bash
# Ustvari Dockerrun.aws.json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "omni-system:latest",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "3000"
    }
  ]
}

# Deploy
eb init omni-system
eb create production
eb deploy
```

### **Microsoft Azure**

#### **Azure Container Instances**
```bash
# Ustvari resource group
az group create --name omni-rg --location westeurope

# Deploy kontejner
az container create \
  --resource-group omni-rg \
  --name omni-system \
  --image omni-system:latest \
  --dns-name-label omni-system \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables MONGODB_URI=$MONGODB_URI
```

## 🔧 Tradicionalna Namestitev (VPS/Dedicated Server)

### **Ubuntu/Debian Server**

```bash
# 1. Posodobi sistem
sudo apt update && sudo apt upgrade -y

# 2. Namesti Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Namesti MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 4. Namesti Redis
sudo apt-get install -y redis-server

# 5. Namesti PM2
sudo npm install -g pm2

# 6. Kloniraj in nastavi projekt
git clone https://github.com/robertpezdirc-eng/OMNIBOT12.git
cd OMNIBOT12
npm install --production

# 7. Ustvari produkcijsko konfiguracijo
cp .env.example .env
# Uredi .env datoteko

# 8. Zaženi z PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### **CentOS/RHEL Server**

```bash
# 1. Namesti Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 2. Namesti MongoDB
sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo <<EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

sudo yum install -y mongodb-org

# 3. Namesti Redis
sudo yum install -y redis

# 4. Nadaljuj s koraki 5-8 iz Ubuntu navodil
```

## 🔒 SSL/TLS Konfiguracija

### **Let's Encrypt z Certbot**

```bash
# Namesti Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Pridobi SSL certifikat
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Avtomatska obnova
sudo crontab -e
# Dodaj: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Nginx SSL Konfiguracija**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

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
}
```

## 📊 Monitoring in Logging

### **PM2 Monitoring**

```bash
# Preveri status
pm2 status

# Poglej loge
pm2 logs

# Monitoring dashboard
pm2 monit

# Restart aplikacije
pm2 restart all
```

### **Docker Logging**

```bash
# Poglej loge kontejnerja
docker logs omni-system -f

# Nastavi log rotation
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  omni-system:latest
```

## 🔄 Backup Strategije

### **MongoDB Backup**

```bash
# Ustvari backup
mongodump --uri="mongodb://localhost:27017/omni" --out=/backup/$(date +%Y%m%d)

# Restore backup
mongorestore --uri="mongodb://localhost:27017/omni" /backup/20240101/omni
```

### **Avtomatski Backup Script**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
MONGO_URI="mongodb://localhost:27017/omni"

# Ustvari backup direktorij
mkdir -p $BACKUP_DIR/$DATE

# MongoDB backup
mongodump --uri="$MONGO_URI" --out=$BACKUP_DIR/$DATE

# Kompresija
tar -czf $BACKUP_DIR/omni_backup_$DATE.tar.gz -C $BACKUP_DIR $DATE

# Počisti stare backupe (starejše od 30 dni)
find $BACKUP_DIR -name "omni_backup_*.tar.gz" -mtime +30 -delete

# Počisti začasne direktorije
rm -rf $BACKUP_DIR/$DATE
```

## 🚨 Troubleshooting

### **Pogosti Problemi**

1. **Port že v uporabi**
   ```bash
   # Najdi proces na portu
   sudo lsof -i :3000
   # Ustavi proces
   sudo kill -9 PID
   ```

2. **MongoDB povezava neuspešna**
   ```bash
   # Preveri MongoDB status
   sudo systemctl status mongod
   # Zaženi MongoDB
   sudo systemctl start mongod
   ```

3. **Premalo pomnilnika**
   ```bash
   # Preveri uporabo pomnilnika
   free -h
   # Dodaj swap
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### **Log Analiza**

```bash
# Aplikacijski logi
tail -f logs/app.log

# Nginx logi
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MongoDB logi
tail -f /var/log/mongodb/mongod.log
```

---

**Za dodatno pomoč pri deployment-u, odpri issue na GitHub repozitoriju.**