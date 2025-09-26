# 🚀 Navodila za uvajanje v produkcijo

## 📋 Pregled možnosti uvajanja

### 1. 🌐 Render.com (Priporočeno)
**Prednosti:** Brezplačen tier, avtomatsko skaliranje, enostavna konfiguracija
**Slabosti:** Počasnejši cold start, omejitve brezplačnega paketa

### 2. ☁️ Vercel + Railway
**Prednosti:** Odličen za frontend, hitra CDN distribucija
**Slabosti:** Backend potrebuje ločeno gostovanje

### 3. 🐳 Docker + VPS
**Prednosti:** Popoln nadzor, skalabilnost
**Slabosti:** Potrebno več tehničnega znanja

### 4. 🔗 Ngrok (Testiranje)
**Prednosti:** Hiter setup za testiranje
**Slabosti:** Ni primeren za produkcijo

Podrobna navodila za deployment Omni Cloud aplikacije v produkcijsko okolje.

## 📋 Predpogoji

### Sistemske zahteve
- **Node.js**: verzija 18.0 ali novejša
- **MongoDB**: verzija 5.0 ali novejša
- **RAM**: minimalno 2GB, priporočeno 4GB+
- **Disk**: minimalno 10GB prostora
- **Bandwidth**: stabilna internetna povezava

### Potrebni servisi
- **VPS/Cloud Server** (DigitalOcean, AWS, Azure, Linode)
- **MongoDB Atlas** (ali lokalna MongoDB instanca)
- **Domain** z SSL certifikatom
- **Email Service** (Gmail, SendGrid, Mailgun)

## 🔧 1. Priprava strežnika

### Ubuntu/Debian
```bash
# Posodobi sistem
sudo apt update && sudo apt upgrade -y

# Namesti Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Namesti PM2 za process management
sudo npm install -g pm2

# Namesti Nginx
sudo apt install nginx -y

# Namesti certbot za SSL
sudo apt install certbot python3-certbot-nginx -y
```

### CentOS/RHEL
```bash
# Posodobi sistem
sudo yum update -y

# Namesti Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Namesti PM2
sudo npm install -g pm2

# Namesti Nginx
sudo yum install nginx -y

# Namesti certbot
sudo yum install certbot python3-certbot-nginx -y
```

## 📁 2. Upload kode

### Metoda 1: Git Clone
```bash
# Kloniraj repozitorij
git clone https://github.com/your-username/omni-cloud.git
cd omni-cloud

# Namesti odvisnosti
npm run install:all
```

### Metoda 2: Manual Upload
```bash
# Ustvari direktorij
mkdir -p /var/www/omni-cloud
cd /var/www/omni-cloud

# Upload server/ in client/ direktorije
# Uporabi scp, rsync ali FTP
```

## ⚙️ 3. Konfiguracija okolja

### Server konfiguracija
```bash
cd server
cp .env.example .env
nano .env
```

**Produkcijska .env datoteka:**
```env
# 🚀 Omni Cloud Production Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/omni-cloud
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
PORT=5001
NODE_ENV=production

# Email konfiguracija
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SSL in varnost
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Redis (opcijsko)
REDIS_URL=redis://localhost:6379

# File upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/omni-cloud/uploads

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

### Client konfiguracija
```bash
cd client
nano .env.production
```

**Client .env.production:**
```env
VITE_API_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com
VITE_APP_NAME=Omni Cloud
VITE_APP_VERSION=1.0.0
```

## 🏗️ 4. Build aplikacije

### Backend
```bash
cd server
npm install --production
```

### Frontend
```bash
cd client
npm install
npm run build

# Kopiraj build datoteke
sudo cp -r dist/* /var/www/html/
```

## 🔄 5. PM2 Process Management

### Ustvari PM2 ecosystem datoteko
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'omni-cloud-server',
      script: './server/index.js',
      cwd: '/var/www/omni-cloud',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }
  ]
};
```

### Zaženi z PM2
```bash
# Ustvari logs direktorij
mkdir -p logs

# Zaženi aplikacijo
pm2 start ecosystem.config.js

# Nastavi auto-restart ob reboot
pm2 startup
pm2 save

# Preveri status
pm2 status
pm2 logs omni-cloud-server
```

## 🌐 6. Nginx konfiguracija

### Ustvari Nginx config
```bash
sudo nano /etc/nginx/sites-available/omni-cloud
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL konfiguracija
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Gzip kompresija
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend (React build)
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### Aktiviraj konfiguracijo
```bash
# Ustvari simbolno povezavo
sudo ln -s /etc/nginx/sites-available/omni-cloud /etc/nginx/sites-enabled/

# Testiraj konfiguracijo
sudo nginx -t

# Ponovno zaženi Nginx
sudo systemctl restart nginx
```

## 🔒 7. SSL certifikat

### Let's Encrypt
```bash
# Pridobi SSL certifikat
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Nastavi avtomatsko obnavljanje
sudo crontab -e
# Dodaj vrstico:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🗄️ 8. MongoDB setup

### MongoDB Atlas (priporočeno)
1. Ustvari račun na [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Ustvari nov cluster
3. Nastavi IP whitelist (0.0.0.0/0 za produkcijo)
4. Ustvari database user
5. Pridobi connection string

### Lokalna MongoDB
```bash
# Ubuntu/Debian
sudo apt install mongodb-org -y
sudo systemctl start mongod
sudo systemctl enable mongod

# Ustvari admin uporabnika
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "secure-password",
  roles: ["userAdminAnyDatabase"]
})
```

## 📊 9. Monitoring in logging

### PM2 Monitoring
```bash
# Namesti PM2 monitoring
pm2 install pm2-logrotate

# Nastavi log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### System monitoring
```bash
# Namesti htop za monitoring
sudo apt install htop -y

# Nastavi logrotate za aplikacijske loge
sudo nano /etc/logrotate.d/omni-cloud
```

```
/var/www/omni-cloud/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🔥 10. Firewall konfiguracija

### UFW (Ubuntu)
```bash
# Omogoči UFW
sudo ufw enable

# Dovoli potrebne porte
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5001

# Preveri status
sudo ufw status
```

## 🚀 11. Deployment skripta

### Ustvari deployment skripto
```bash
nano deploy.sh
chmod +x deploy.sh
```

```bash
#!/bin/bash

echo "🚀 Omni Cloud Deployment Script"

# Backup trenutne verzije
echo "📦 Ustvarjam backup..."
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz server/ client/

# Pull najnovejše spremembe
echo "📥 Pridobivam najnovejše spremembe..."
git pull origin main

# Namesti odvisnosti
echo "📦 Nameščam odvisnosti..."
npm run install:all

# Build frontend
echo "🏗️ Gradim frontend..."
cd client
npm run build
sudo cp -r dist/* /var/www/html/
cd ..

# Restart server
echo "🔄 Restartiram server..."
pm2 restart omni-cloud-server

# Preveri status
echo "✅ Preverjam status..."
pm2 status

echo "🎉 Deployment končan!"
```

## 📋 12. Checklist za produkcijo

### Varnost
- [ ] SSL certifikat nameščen
- [ ] Firewall konfiguriran
- [ ] MongoDB varno nastavljeno
- [ ] JWT secret spremenjen
- [ ] Rate limiting omogočen
- [ ] CORS pravilno nastavljen

### Performance
- [ ] Gzip kompresija omogočena
- [ ] Static assets cached
- [ ] PM2 cluster mode
- [ ] Database indexi optimizirani
- [ ] Log rotation nastavljen

### Monitoring
- [ ] PM2 monitoring aktiven
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Backup strategija
- [ ] Health check endpoints

### Testing
- [ ] API endpoints testiran
- [ ] WebSocket povezava deluje
- [ ] Admin dashboard dostopen
- [ ] Email obvestila delujejo
- [ ] Cron jobs aktivni

## 🆘 13. Troubleshooting

### Pogoste napake

**Port že v uporabi:**
```bash
sudo lsof -i :5001
sudo kill -9 PID
```

**MongoDB povezava neuspešna:**
```bash
# Preveri MongoDB status
sudo systemctl status mongod
# Preveri connection string
```

**SSL certifikat napake:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

**PM2 aplikacija se ne zažene:**
```bash
pm2 logs omni-cloud-server
pm2 restart omni-cloud-server
```

### Koristni ukazi
```bash
# Preveri sistem resources
htop
df -h
free -h

# Preveri Nginx loge
sudo tail -f /var/log/nginx/error.log

# Preveri aplikacijske loge
pm2 logs omni-cloud-server --lines 100

# Restart vseh servisov
sudo systemctl restart nginx
pm2 restart all
```

## 📞 14. Podpora

Za dodatno pomoč pri deployment-u:
- **Email**: support@omni-cloud.com
- **Discord**: [Omni Cloud Community](https://discord.gg/omni-cloud)
- **GitHub Issues**: [Report Bug](https://github.com/your-username/omni-cloud/issues)

---

**🎉 Čestitamo! Vaša Omni Cloud aplikacija je sedaj uspešno deployirana v produkcijo!**