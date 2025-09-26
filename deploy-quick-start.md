# 🚀 OMNI-BRAIN-MAXI-ULTRA Quick Deploy Guide

Enostavna namestitev OMNI-BRAIN sistema v oblak z različnimi možnostmi.

## 📋 Pregled možnosti

| Metoda | Platforma | Čas | Kompleksnost | Priporočeno za |
|--------|-----------|-----|--------------|----------------|
| **Docker** | Linux/Windows | 5 min | Nizka | Produkcija, skalabilnost |
| **Bash Script** | Linux/Ubuntu | 10 min | Srednja | VPS, dedicated strežniki |
| **PowerShell** | Windows | 15 min | Srednja | Windows strežniki |
| **Manual** | Vse | 30 min | Visoka | Razvojno okolje |

## 🐳 Option 1: Docker Deploy (Priporočeno)

### Predpogoji
- Docker Desktop ali Docker Engine
- Docker Compose
- 4GB RAM, 20GB prostora

### Linux/macOS
```bash
# Naredi skripto izvedljiv
chmod +x deploy-docker.sh

# Zaženi z osnovnimi nastavitvami
./deploy-docker.sh

# Ali z custom nastavitvami
./deploy-docker.sh production yourdomain.com admin@yourdomain.com
```

### Windows PowerShell
```powershell
# Zaženi kot Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Zaženi z osnovnimi nastavitvami
.\deploy-docker.ps1

# Ali z custom nastavitvami
.\deploy-docker.ps1 -Environment production -Domain yourdomain.com -Email admin@yourdomain.com
```

### Kaj se zgodi:
1. ✅ Preveri Docker namestitev
2. 📁 Ustvari potrebne direktorije
3. 🔐 Generira varnostne ključe
4. 🌐 Nastavi Nginx reverse proxy
5. 📊 Konfigurira monitoring (Grafana, Prometheus)
6. 💾 Nastavi avtomatski backup
7. 🚀 Zažene vse servise

### Dostopne storitve:
- **OMNI-BRAIN**: https://yourdomain.com
- **Monitoring**: https://monitoring.yourdomain.com
- **Grafana**: http://localhost:3002
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601

## 🖥️ Option 2: Linux/Ubuntu VPS Deploy

### Predpogoji
- Ubuntu 20.04+ ali Debian 11+
- Root ali sudo dostop
- 2GB RAM, 10GB prostora

```bash
# Prenesi in zaženi
wget https://raw.githubusercontent.com/your-repo/omni-brain/main/deploy-omni.sh
chmod +x deploy-omni.sh
sudo ./deploy-omni.sh
```

### Kaj se namesti:
- Node.js 18.x
- MongoDB 6.0
- Redis 7.0
- Nginx
- PM2
- SSL certifikat
- Firewall nastavitve

## 🪟 Option 3: Windows Server Deploy

### Predpogoji
- Windows Server 2019+
- Administrator pravice
- PowerShell 5.1+

```powershell
# Prenesi in zaženi kot Administrator
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/your-repo/omni-brain/main/deploy-omni.ps1" -OutFile "deploy-omni.ps1"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-omni.ps1
```

## 🔧 Konfiguracija po namestitvi

### 1. SSL Certifikat (Produkcija)
```bash
# Let's Encrypt (Docker)
docker-compose -f docker-compose.production.yml run --rm certbot-prod

# Ali ročno (Linux)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. Backup konfiguracija
Uredi `.env.production`:
```env
# AWS S3 Backup
S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Email obvestila
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Monitoring nastavitve
```bash
# Grafana geslo
grep GRAFANA_PASSWORD .env.production

# Dostop do Grafana
# URL: http://localhost:3002
# User: admin
# Password: [iz .env.production]
```

## 📊 Upravljanje sistema

### Docker ukazi
```bash
# Status vseh storitev
docker-compose -f docker-compose.production.yml ps

# Oglej si loge
docker-compose -f docker-compose.production.yml logs -f omni-brain-prod

# Restart aplikacije
docker-compose -f docker-compose.production.yml restart omni-brain-prod

# Ustavi vse
docker-compose -f docker-compose.production.yml down

# Posodobi aplikacijo
git pull
docker-compose -f docker-compose.production.yml build omni-brain-prod
docker-compose -f docker-compose.production.yml up -d omni-brain-prod
```

### PM2 ukazi (Linux/Windows)
```bash
# Status
pm2 status

# Logi
pm2 logs omni-brain-cloud

# Restart
pm2 restart omni-brain-cloud

# Monitoring
pm2 monit
```

## 🔍 Troubleshooting

### Pogosti problemi

#### 1. Port že v uporabi
```bash
# Preveri kaj uporablja port 3000
sudo netstat -tulpn | grep :3000

# Ustavi proces
sudo kill -9 <PID>
```

#### 2. MongoDB povezava ne deluje
```bash
# Preveri MongoDB status (Docker)
docker-compose -f docker-compose.production.yml logs mongo-prod

# Preveri MongoDB status (Linux)
sudo systemctl status mongod
```

#### 3. Nginx konfiguracija
```bash
# Preveri Nginx konfiguracijo
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### 4. SSL certifikat problemi
```bash
# Preveri certifikat
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Obnovi certifikat
sudo certbot renew
```

### Logi in debugging

#### Docker logi
```bash
# Vsi logi
docker-compose -f docker-compose.production.yml logs

# Specifična storitev
docker-compose -f docker-compose.production.yml logs omni-brain-prod

# Živi logi
docker-compose -f docker-compose.production.yml logs -f --tail=100
```

#### Sistemski logi (Linux)
```bash
# Aplikacijski logi
tail -f /var/log/omni-brain/app.log

# Nginx logi
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MongoDB logi
tail -f /var/log/mongodb/mongod.log
```

## 🔒 Varnostni nasveti

### 1. Firewall
```bash
# Ubuntu/Debian
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. Posodobi gesla
```bash
# Generiraj nova gesla
openssl rand -base64 32

# Posodobi .env.production
nano .env.production

# Restart storitev
docker-compose -f docker-compose.production.yml restart
```

### 3. Backup preverjanje
```bash
# Preveri backup status
docker-compose -f docker-compose.production.yml logs backup-service

# Ročni backup
docker-compose -f docker-compose.production.yml exec backup-service node backup-service.js
```

## 📈 Skaliranje

### Horizontalno skaliranje
```yaml
# docker-compose.production.yml
services:
  omni-brain-prod:
    deploy:
      replicas: 3
    
  nginx-prod:
    depends_on:
      - omni-brain-prod
```

### Load balancer konfiguracija
```nginx
upstream omni_backend {
    server omni-brain-prod-1:3000;
    server omni-brain-prod-2:3000;
    server omni-brain-prod-3:3000;
}
```

## 🆘 Podpora

### Kontakt
- 📧 Email: support@omni-brain.ai
- 💬 Discord: https://discord.gg/omni-brain
- 📖 Dokumentacija: https://docs.omni-brain.ai

### Koristne povezave
- [Docker dokumentacija](https://docs.docker.com/)
- [Nginx konfiguracija](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [MongoDB dokumentacija](https://docs.mongodb.com/)

---

**🎯 Uspešna namestitev!** Tvoj OMNI-BRAIN-MAXI-ULTRA sistem je zdaj aktiven in pripravljen za uporabo.