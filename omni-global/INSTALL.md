# 📦 Omni Global - Navodila za namestitev

Ta dokument vsebuje podrobna navodila za namestitev Omni Global sistema na produkcijskem strežniku.

## 🎯 Pregled namestitve

Namestitev poteka v 6 glavnih korakih:
1. **Priprava strežnika** - Namestitev Docker in osnovnih orodij
2. **SSL certifikati** - Konfiguracija HTTPS varnosti
3. **Konfiguracija** - Nastavitev environment spremenljivk
4. **Zagon** - Docker Compose build in up
5. **Preverjanje** - Testiranje delovanja
6. **Optimizacija** - Produkcijske nastavitve

## 🖥️ Sistemske zahteve

### Minimalne zahteve
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **RAM**: 4GB
- **Disk**: 20GB prostora
- **CPU**: 2 jedri
- **Network**: Javni IP naslov za SSL

### Priporočene zahteve
- **RAM**: 8GB+
- **Disk**: 50GB+ SSD
- **CPU**: 4+ jedra
- **Network**: Dedicated server ali VPS

### Potrebna programska oprema
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Curl
- OpenSSL

## 🚀 Korak 1: Priprava strežnika

### Ubuntu/Debian

```bash
# Posodobite sistem
sudo apt update && sudo apt upgrade -y

# Namestite osnovne pakete
sudo apt install -y curl wget git unzip htop nano

# Namestite Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Namestite Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ponovno se prijavite ali uporabite
newgrp docker

# Preverite namestitev
docker --version
docker-compose --version
```

### CentOS/RHEL

```bash
# Posodobite sistem
sudo yum update -y

# Namestite osnovne pakete
sudo yum install -y curl wget git unzip htop nano

# Namestite Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Namestite Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ponovno se prijavite
newgrp docker
```

## 🔐 Korak 2: SSL certifikati

**POMEMBNO**: SSL certifikati so obvezni za varno HTTPS komunikacijo. Sistem ne bo deloval brez pravilno konfiguriranih certifikatov.

### Potrebne datoteke v `certs/` mapi:
- **`privkey.pem`** - Privatni ključ (varno shranjeno, ne delite!)
- **`fullchain.pem`** - Celotna veriga certifikatov

### Opcija A: Let's Encrypt (Priporočeno - Brezplačno)

```bash
# Namestite Certbot
# Ubuntu/Debian
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot

# Pridobite certifikat (zamenjajte yourdomain.com z vašo domeno)
sudo certbot certonly --standalone -d yourdomain.com

# Kopirajte certifikate v projekt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem certs/

# Nastavite pravilne pravice
sudo chown $USER:$USER certs/*.pem
chmod 600 certs/privkey.pem
chmod 644 certs/fullchain.pem

# Preverite certifikate
ls -la certs/
# Mora pokazati: privkey.pem in fullchain.pem
```

### Opcija B: Komercialni certifikati

```bash
# Če imate komercialne certifikate, jih kopirajte:
cp /path/to/your/private.key certs/privkey.pem
cp /path/to/your/certificate.crt certs/fullchain.pem

# Nastavite pravice
chmod 600 certs/privkey.pem
chmod 644 certs/fullchain.pem
```

### Opcija C: Samo-podpisani certifikati (samo za testiranje)

```bash
# Generirajte samo-podpisane certifikate
cd certs/
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes

# Sledite navodilom in vnesite podatke
# Common Name (CN) mora biti vaša domena ali IP naslov
```

### Preverjanje SSL certifikatov

```bash
# Preverite veljavnost certifikata
openssl x509 -in certs/fullchain.pem -text -noout

# Preverite ujemanje ključa in certifikata
openssl rsa -in certs/privkey.pem -modulus -noout | openssl md5
openssl x509 -in certs/fullchain.pem -modulus -noout | openssl md5
# Oba hash-a morata biti enaka
```
# Pridobite certifikat (zamenjajte yourdomain.com)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Preverite certifikat
sudo certbot certificates

# Kopirajte certifikate (po prenosu projekta)
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem omni-global/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem omni-global/certs/
sudo chown $USER:$USER omni-global/certs/*.pem
```

### Opcija B: Komercialni certifikat

```bash
# Če imate komercialni certifikat, kopirajte datoteke:
cp /path/to/your/private.key omni-global/certs/privkey.pem
cp /path/to/your/certificate.crt omni-global/certs/fullchain.pem
```

### Opcija C: Samo-podpisan (samo za testiranje)

```bash
# Generirajte samo-podpisan certifikat
cd omni-global/certs/
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes

# Vnesite podatke:
# Country Name: SI
# State: Slovenia
# City: Ljubljana
# Organization: Your Company
# Organizational Unit: IT Department
# Common Name: yourdomain.com (POMEMBNO!)
# Email: admin@yourdomain.com
```

## ⚙️ Korak 3: Prenos in konfiguracija

### Prenos projekta

```bash
# Prenesite projekt
git clone <repository-url> omni-global
cd omni-global

# Ali če imate ZIP datoteko
unzip omni-global.zip
cd omni-global
```

### Konfiguracija environment

```bash
# Kopirajte primer konfiguracije
cp .env.example .env

# Uredite konfiguracijo
nano .env
```

### Ključne nastavitve v .env

```env
# OBVEZNO SPREMENITE:
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
ADMIN_PASSWORD=your_secure_admin_password
MONGO_PASSWORD=secure_mongo_password

# Prilagodite domeni:
SERVER_URL=https://yourdomain.com
ADMIN_URL=https://yourdomain.com/admin

# Email nastavitve (če potrebno):
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Preverjanje SSL certifikatov

```bash
# Preverite, ali so certifikati na mestu
ls -la certs/
# Mora pokazati: privkey.pem in fullchain.pem

# Preverite veljavnost certifikata
openssl x509 -in certs/fullchain.pem -text -noout | grep -A2 "Validity"

# Preverite ujemanje ključa in certifikata
openssl x509 -noout -modulus -in certs/fullchain.pem | openssl md5
openssl rsa -noout -modulus -in certs/privkey.pem | openssl md5
# Rezultata morata biti enaka!
```

## 🏗️ Korak 4: Zagon sistema

### Priprava

```bash
# Preverite Docker
docker info
docker-compose version

# Nastavite pravice za certifikate
chmod 600 certs/privkey.pem
chmod 644 certs/fullchain.pem

# Preverite, ali so certifikati na mestu
ls -la certs/
# Mora pokazati: privkey.pem in fullchain.pem
```

### Zagon z Docker Compose (Priporočeno)

```bash
# Zgradite in zaženite Docker kontejnerje
docker-compose up --build

# Za zagon v ozadju
docker-compose up --build -d

# Preverite status kontejnerjev
docker-compose ps

# Preverite loge
docker-compose logs -f
```

### Postopni zagon (če je potrebno)

```bash
# 1. Zgradite Docker slike
docker-compose build

# 2. Zaženite baze podatkov
docker-compose up -d mongo redis

# 3. Počakajte, da se baze zaženejo
echo "Čakam, da se baze zaženejo..."
sleep 30

# 4. Preverite status baz
docker-compose ps
docker-compose logs mongo
docker-compose logs redis

# 5. Zaženite glavne storitve
docker-compose up -d server admin

# 6. Počakajte na inicializacijo
sleep 20

# 7. Zaženite Nginx
docker-compose up -d nginx

# 8. Preverite vse storitve
docker-compose ps
```

### Preverjanje delovanja

```bash
# Preverite status vseh kontejnerjev
docker-compose ps

# Preverite loge za morebitne napake
docker-compose logs server
docker-compose logs admin
docker-compose logs nginx

# Preverite health check
curl -k https://localhost/health
```

### Alternativni zagon (vse naenkrat)

```bash
# Zaženite vse storitve naenkrat
docker-compose up -d

# Spremljajte loge
docker-compose logs -f
```

## ✅ Korak 5: Preverjanje delovanja

### Osnovni testi

```bash
# 1. Preverite status vseh storitev
docker-compose ps

# Vsi kontejnerji morajo biti "Up"

# 2. Preverite health checks
curl -k https://localhost/health
# Mora vrniti: "healthy"

# 3. Preverite API
curl -k https://localhost/api/health
# Mora vrniti JSON z informacijami o sistemu

# 4. Preverite admin panel
curl -k https://localhost/admin/health
# Mora vrniti status admin panela
```

### 🌐 Dostopne povezave

Po uspešnem zagonu so na voljo naslednje storitve:

#### Glavni API strežnik
- **URL**: `https://yourdomain.com:3000/api/license`
- **Opis**: Licenčni API za upravljanje licenc
- **Protokol**: HTTPS z SSL certifikati
- **Test**: `curl -k https://yourdomain.com:3000/api/license/status`

#### Administratorski vmesnik (Demo)
- **URL**: `https://yourdomain.com:4000`
- **Opis**: Spletni vmesnik za administracijo licenc
- **Funkcije**: 
  - Pregled aktivnih licenc v tabeli
  - Podaljšanje licenc
  - Deaktivacija licenc
  - Realnočasno spremljanje
- **Prijava**: admin / geslo iz .env datoteke

#### MongoDB baza podatkov
- **URL**: `mongodb://localhost:27017`
- **Opis**: Glavna baza podatkov za shranjevanje licenc
- **Dostop**: Lokalni dostop za administracijo
- **Test**: `docker-compose exec mongo mongosh`

#### WebSocket strežnik
- **URL**: `wss://yourdomain.com:3000/ws`
- **Opis**: Realnočasovna komunikacija z odjemalci
- **Funkcije**: Avtomatska sinhronizacija licenc

### 📱 Namestitev Odjemalske Aplikacije

#### Ustvaritev namestitvenega paketa za Electron:

```bash
# Windows paket
npm run package-win

# macOS paket
npm run package-mac

# Linux paket
npm run package-linux
```

#### Avtomatska povezava in sinhronizacija:
- Po namestitvi se odjemalec **samodejno poveže** na globalni WebSocket strežnik
- Vse spremembe licenc se **takoj odražajo** na vseh Client Panelih
- Admin GUI omogoča **realnočasno upravljanje** vseh povezanih odjemalcev

#### Admin GUI funkcionalnosti:
- **Tabela za upravljanje licenc**: Pregled, podaljšanje in deaktivacija
- **Realnočasna sinhronizacija**: Vse spremembe se takoj odražajo na vseh Client Panelih
- **WebSocket komunikacija**: Takojšnje posodabljanje brez osvežitve

### Spletni vmesnik

```bash
# Odprite v brskalniku:
# https://yourdomain.com:4000

# Prijavite se z:
# Uporabnik: admin
# Geslo: iz .env datoteke (ADMIN_PASSWORD)
```

### Preverjanje logov

```bash
# Vsi logi
docker-compose logs

# Specifične storitve
docker-compose logs server
docker-compose logs admin
docker-compose logs nginx
docker-compose logs mongo

# Sledenje logom v realnem času
docker-compose logs -f server
```

## 🔧 Korak 6: Produkcijske optimizacije

### Firewall konfiguracija

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

### Avtomatski zagon

```bash
# Ustvarite systemd service
sudo nano /etc/systemd/system/omni-global.service
```

Vsebina datoteke:
```ini
[Unit]
Description=Omni Global Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/omni-global
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Omogočite service
sudo systemctl enable omni-global.service
sudo systemctl start omni-global.service
sudo systemctl status omni-global.service
```

### Backup konfiguracija

```bash
# Ustvarite backup skripto
nano backup.sh
```

Vsebina skripte:
```bash
#!/bin/bash
BACKUP_DIR="/backup/omni-global"
DATE=$(date +%Y%m%d_%H%M%S)

# Ustvarite backup direktorij
mkdir -p $BACKUP_DIR

# Backup MongoDB
docker-compose exec -T mongo mongodump --archive | gzip > $BACKUP_DIR/mongo_$DATE.gz

# Backup konfiguracij
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env certs/ nginx/

# Počistite stare backupe (starejše od 30 dni)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Nastavite pravice
chmod +x backup.sh

# Dodajte v crontab
crontab -e
# Dodajte vrstico:
0 2 * * * /path/to/omni-global/backup.sh
```

### SSL avtomatska obnova

```bash
# Dodajte v crontab za Let's Encrypt
crontab -e
# Dodajte vrstico:
0 0 */60 * * certbot renew --quiet && cd /path/to/omni-global && docker-compose restart nginx
```

## 🔍 Monitoring in vzdrževanje

### Osnovni monitoring

```bash
# Sistemski resursi
htop
df -h
free -h

# Docker statistike
docker stats

# Disk usage
docker system df
docker system prune -f  # Počisti neuporabljene podatke
```

### Napredni monitoring

```bash
# Zaženite z monitoring profilom
docker-compose --profile monitoring up -d

# Dostop do Grafana:
# http://yourdomain.com:3001
# admin / geslo iz .env
```

## 🚨 Odpravljanje težav

### Pogosti problemi

#### Problem: Kontejner se ne zažene
```bash
# Preverite loge
docker-compose logs [service-name]

# Preverite konfiguracije
docker-compose config

# Ponovno zgradite
docker-compose build --no-cache [service-name]
```

#### Problem: SSL napaka
```bash
# Preverite certifikate
openssl x509 -in certs/fullchain.pem -text -noout

# Preverite Nginx konfiguracijo
docker-compose exec nginx nginx -t

# Ponovno naložite Nginx
docker-compose exec nginx nginx -s reload
```

#### Problem: Baza se ne poveže
```bash
# Preverite MongoDB
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Resetirajte podatke (POZOR: briše vse!)
docker-compose down -v
docker volume prune -f
docker-compose up -d
```

### Koristni ukazi

```bash
# Restart specifične storitve
docker-compose restart server

# Posodobitev slik
docker-compose pull
docker-compose up -d

# Čiščenje
docker system prune -a -f
docker volume prune -f

# Backup pred posodobitvijo
./backup.sh
```

## 📞 Podpora

Če naletite na težave:

1. **Preverite loge**: `docker-compose logs`
2. **Preverite dokumentacijo**: README.md
3. **Preverite GitHub Issues**: [Repository Issues]
4. **Kontaktirajte podporo**: support@omni-platform.com

## ✅ Kontrolni seznam

Po uspešni namestitvi preverite:

- [ ] Vsi kontejnerji so "Up" (`docker-compose ps`)
- [ ] Health checks delujejo (`curl -k https://localhost/health`)
- [ ] Admin panel je dostopen (`https://yourdomain.com/admin`)
- [ ] SSL certifikat je veljaven
- [ ] Firewall je konfiguriran
- [ ] Backup je nastavljen
- [ ] Monitoring deluje (če omogočen)
- [ ] Avtomatski zagon je konfiguriran

**🎉 Čestitamo! Vaš Omni Global sistem je uspešno nameščen!**