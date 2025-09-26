# 🚀 Omni Production Deployment Guide

Celovito navodilo za produkcijsko namestitev Omni Cloud Service z avtomatskim HTTPS in SSL certifikati.

## 📋 Kazalo

1. [Pregled sistema](#pregled-sistema)
2. [Sistemske zahteve](#sistemske-zahteve)
3. [Hitri začetek](#hitri-začetek)
4. [Podrobna namestitev](#podrobna-namestitev)
5. [SSL konfiguracija](#ssl-konfiguracija)
6. [Testiranje sistema](#testiranje-sistema)
7. [Vzdrževanje](#vzdrževanje)
8. [Odpravljanje težav](#odpravljanje-težav)
9. [Varnostne nastavitve](#varnostne-nastavitve)
10. [Monitoring in backup](#monitoring-in-backup)

---

## 🎯 Pregled sistema

Omni Production Deployment omogoča:

- ✅ **Avtomatska HTTPS konfiguracija** z Let's Encrypt SSL certifikati
- ✅ **Nginx reverse proxy** z optimiziranimi nastavitvami
- ✅ **Systemd storitve** za zanesljivo delovanje
- ✅ **Avtomatsko obnavljanje SSL** certifikatov
- ✅ **Varnostni headerji** in zaščita
- ✅ **Monitoring in backup** sistem
- ✅ **Multi-cloud podpora** (AWS, GCP, Azure, DigitalOcean)

---

## 💻 Sistemske zahteve

### Minimalne zahteve
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: 2GB (priporočeno 4GB+)
- **Disk**: 20GB prostora
- **CPU**: 2 jedra (priporočeno 4+)
- **Omrežje**: Javni IP naslov

### Potrebne storitve
- **Nginx** 1.18+
- **Python** 3.8+ ali **Node.js** 16+
- **Certbot** (Let's Encrypt)
- **UFW** (firewall)
- **Systemd**

### Domenske zahteve
- Registrirana domena
- DNS A record, ki kaže na strežnik
- Port 80 in 443 dostopna iz interneta

---

## ⚡ Hitri začetek

### 1. Kloniraj repozitorij
```bash
git clone https://github.com/your-repo/omni-cloud-deployment.git
cd omni-cloud-deployment
```

### 2. Nastavi konfiguracijo
```bash
# Kopiraj in uredi konfiguracijo
cp omni-cloud-config.json.example omni-cloud-config.json
nano omni-cloud-config.json
```

### 3. Zaženi avtomatsko namestitev
```bash
# Naredi skripto izvršljivo
chmod +x omni-cloud-deploy.sh

# Zaženi namestitev
sudo ./omni-cloud-deploy.sh
```

### 4. Testiraj sistem
```bash
# Zaženi teste
chmod +x test-omni-production.sh
sudo ./test-omni-production.sh your-domain.com
```

---

## 🔧 Podrobna namestitev

### Korak 1: Priprava sistema

```bash
# Posodobi sistem
sudo apt update && sudo apt upgrade -y

# Namesti osnovne odvisnosti
sudo apt install -y curl wget git unzip software-properties-common

# Namesti Nginx
sudo apt install -y nginx

# Namesti Python (če uporabljate Python verzijo)
sudo apt install -y python3 python3-pip python3-venv

# Namesti Node.js (če uporabljate Node.js verzijo)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Namesti Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Korak 2: Ustvari uporabnika Omni

```bash
# Ustvari uporabnika
sudo useradd -m -s /bin/bash omni
sudo usermod -aG www-data omni

# Ustvari direktorije
sudo mkdir -p /home/omni/{app,logs,backup}
sudo chown -R omni:omni /home/omni
```

### Korak 3: Namesti Omni aplikacijo

```bash
# Preklopi na omni uporabnika
sudo su - omni

# Kloniraj ali kopiraj aplikacijo
git clone https://github.com/your-repo/omni-app.git /home/omni/app
cd /home/omni/app

# Za Python aplikacijo:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Za Node.js aplikacijo:
npm install
```

### Korak 4: Konfiguracija Nginx

```bash
# Kopiraj Nginx konfiguracijo
sudo cp nginx-omni-site.conf /etc/nginx/sites-available/omni

# Uredi domeno v konfiguraciji
sudo sed -i 's/moja-domena.com/your-domain.com/g' /etc/nginx/sites-available/omni

# Aktiviraj konfiguracijo
sudo ln -s /etc/nginx/sites-available/omni /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testiraj konfiguracijo
sudo nginx -t
sudo systemctl restart nginx
```

### Korak 5: SSL certifikat

```bash
# Pridobi SSL certifikat
sudo certbot --nginx -d your-domain.com

# Preveri avtomatsko obnavljanje
sudo certbot renew --dry-run
```

### Korak 6: Systemd storitev

```bash
# Kopiraj servisno datoteko
sudo cp omni.service /etc/systemd/system/

# Uredi pot do aplikacije
sudo sed -i 's|/home/omni/main.py|/home/omni/app/main.py|g' /etc/systemd/system/omni.service

# Omogoči in zaženi storitev
sudo systemctl daemon-reload
sudo systemctl enable omni.service
sudo systemctl start omni.service

# Preveri status
sudo systemctl status omni.service
```

---

## 🔒 SSL konfiguracija

### Avtomatska SSL namestitev

```bash
# Zaženi SSL konfiguracijo
sudo ./activate-nginx-omni.sh your-domain.com
```

### Ročna SSL namestitev

```bash
# 1. Pridobi certifikat
sudo certbot certonly --webroot -w /var/www/html -d your-domain.com

# 2. Posodobi Nginx konfiguracijo
sudo nano /etc/nginx/sites-available/omni

# 3. Dodaj SSL nastavitve:
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL optimizacije
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy nastavitve
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 4. Ponovno zaženi Nginx
sudo nginx -t && sudo systemctl restart nginx
```

### SSL obnavljanje

```bash
# Nastavi avtomatsko obnavljanje
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# Ročno obnavljanje
sudo certbot renew

# Preveri veljavnost certifikata
sudo certbot certificates
```

---

## 🧪 Testiranje sistema

### Avtomatsko testiranje

```bash
# Zaženi celovite teste
sudo ./test-omni-production.sh your-domain.com
```

### Ročno testiranje

```bash
# 1. Preveri storitve
sudo systemctl status nginx omni

# 2. Preveri porte
sudo netstat -tlnp | grep -E ":80|:443|:8080"

# 3. Testiraj HTTP preusmeritev
curl -I http://your-domain.com

# 4. Testiraj HTTPS
curl -I https://your-domain.com

# 5. Testiraj SSL certifikat
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 6. Preveri aplikacijo
curl http://127.0.0.1:8080/health
```

### Preverjanje logov

```bash
# Nginx logi
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Omni aplikacija logi
sudo journalctl -u omni -f

# Sistemski logi
sudo journalctl -xe
```

---

## 🔧 Vzdrževanje

### Redne naloge

```bash
# Posodobi sistem (mesečno)
sudo apt update && sudo apt upgrade -y

# Preveri SSL certifikate (tedensko)
sudo certbot certificates

# Očisti stare loge (mesečno)
sudo logrotate -f /etc/logrotate.conf

# Preveri disk prostor
df -h

# Preveri pomnilnik
free -h
```

### Backup sistem

```bash
# Zaženi backup
sudo ./omni-backup-monitoring.py --backup

# Preveri backup datoteke
ls -la /home/omni/backup/

# Obnovi iz backup-a
sudo tar -xzf /home/omni/backup/omni-full-backup-YYYYMMDD.tar.gz -C /
```

### Posodabljanje aplikacije

```bash
# 1. Ustavi storitev
sudo systemctl stop omni

# 2. Varnostno kopiraj
sudo cp -r /home/omni/app /home/omni/app.backup

# 3. Posodobi aplikacijo
cd /home/omni/app
git pull origin main

# Za Python:
source venv/bin/activate
pip install -r requirements.txt

# Za Node.js:
npm install

# 4. Zaženi storitev
sudo systemctl start omni

# 5. Preveri status
sudo systemctl status omni
```

---

## 🚨 Odpravljanje težav

### Pogoste težave

#### 1. Nginx se ne zažene
```bash
# Preveri konfiguracijo
sudo nginx -t

# Preveri loge
sudo journalctl -u nginx

# Ponovno zaženi
sudo systemctl restart nginx
```

#### 2. SSL certifikat ne deluje
```bash
# Preveri certifikat
sudo certbot certificates

# Obnovi certifikat
sudo certbot renew --force-renewal

# Preveri Nginx SSL konfiguracijo
sudo nginx -t
```

#### 3. Omni aplikacija ne deluje
```bash
# Preveri status
sudo systemctl status omni

# Preveri loge
sudo journalctl -u omni -n 50

# Ponovno zaženi
sudo systemctl restart omni

# Testiraj ročno
sudo su - omni
cd /home/omni/app
python3 main.py  # ali node main.js
```

#### 4. Port 8080 ni dostopen
```bash
# Preveri, ali aplikacija posluša
sudo netstat -tlnp | grep 8080

# Preveri firewall
sudo ufw status

# Omogoči port (če je potrebno)
sudo ufw allow 8080
```

### Diagnostični ukazi

```bash
# Sistemske informacije
uname -a
cat /etc/os-release

# Omrežne nastavitve
ip addr show
ss -tlnp

# Disk prostor
df -h
du -sh /home/omni/*

# Pomnilnik
free -h
top

# Procesi
ps aux | grep -E "nginx|python|node"
```

---

## 🛡️ Varnostne nastavitve

### Firewall (UFW)

```bash
# Omogoči UFW
sudo ufw enable

# Osnovne pravila
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Dovoli potrebne porte
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Preveri status
sudo ufw status verbose
```

### Fail2Ban

```bash
# Namesti Fail2Ban
sudo apt install -y fail2ban

# Konfiguriraj
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Uredi konfiguracija
sudo nano /etc/fail2ban/jail.local

# Dodaj Nginx zaščito:
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

# Zaženi storitev
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### SSH hardening

```bash
# Uredi SSH konfiguracijo
sudo nano /etc/ssh/sshd_config

# Priporočene nastavitve:
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Ponovno zaženi SSH
sudo systemctl restart ssh
```

---

## 📊 Monitoring in backup

### Monitoring sistem

```bash
# Zaženi monitoring
sudo ./omni-backup-monitoring.py --monitor

# Preveri metrike
curl http://localhost:8080/metrics

# HTML nadzorna plošča
curl http://localhost:8080/dashboard
```

### Backup konfiguracija

```bash
# Uredi backup konfiguracijo
sudo nano /etc/omni/backup-config.json

{
  "backup_retention_days": 30,
  "backup_schedule": "0 2 * * *",
  "backup_types": ["full", "config", "data"],
  "notification": {
    "email": "admin@your-domain.com",
    "slack_webhook": "https://hooks.slack.com/..."
  }
}

# Nastavi cron job
echo "0 2 * * * /usr/local/bin/omni-backup-monitoring.py --backup" | sudo crontab -
```

### Obvestila

```bash
# E-mail obvestila
sudo apt install -y mailutils

# Slack obvestila (webhook)
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Omni backup completed successfully"}' \
  YOUR_SLACK_WEBHOOK_URL
```

---

## 📚 Dodatne informacije

### Koristni ukazi

```bash
# Preveri vse Omni storitve
sudo systemctl status nginx omni

# Ponovno zaženi vse storitve
sudo systemctl restart nginx omni

# Preveri SSL certifikat
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Preveri Nginx konfiguracija
sudo nginx -T

# Preveri disk uporabo
sudo du -sh /home/omni/* /var/log/nginx/* /etc/letsencrypt/*
```

### Datotečna struktura

```
/home/omni/
├── app/                 # Omni aplikacija
├── logs/               # Aplikacijski logi
├── backup/             # Varnostne kopije
└── config/             # Konfiguracije

/etc/nginx/
├── sites-available/omni    # Nginx konfiguracija
└── sites-enabled/omni      # Aktivna konfiguracija

/etc/systemd/system/
├── omni.service           # Python storitev
└── omni-node.service      # Node.js storitev

/etc/letsencrypt/
└── live/your-domain.com/  # SSL certifikati
```

### Kontakt in podpora

- **Dokumentacija**: [GitHub Wiki](https://github.com/your-repo/omni/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/omni/issues)
- **E-mail**: support@your-domain.com
- **Slack**: [Omni Community](https://omni-community.slack.com)

---

## 📝 Changelog

### v1.0.0 (2024-01-XX)
- Začetna verzija produkcijske namestitve
- Avtomatska SSL konfiguracija
- Nginx reverse proxy
- Systemd storitve
- Monitoring in backup sistem

---

**🎉 Čestitamo! Vaš Omni sistem je pripravljen za produkcijo.**

Za dodatno pomoč ali vprašanja se obrnite na našo skupnost ali podporo.