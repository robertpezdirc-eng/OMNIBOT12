# 🚀 Omni Global Deploy Paket

Celoten ready-to-deploy sistem za Omni platformo z Docker podporo, SSL varnostjo, WebSocket komunikacijo, Admin GUI in Client Panel.

## 📋 Pregled sistema

Omni Global je celovita platforma, ki vključuje:

- **🔐 Licenčni strežnik** - Upravljanje licenc in avtentifikacija
- **👨‍💼 Admin GUI** - Spletni vmesnik za administracijo
- **📱 Client Panel** - Odjemalski vmesnik za končne uporabnike
- **🔒 SSL/TLS varnost** - Popolna HTTPS podpora
- **⚡ WebSocket** - Realnočasovna komunikacija
- **🐳 Docker** - Kontejnerizacija za enostavno namestitev
- **🔄 Nginx** - Reverse proxy in load balancer
- **📊 Monitoring** - Prometheus in Grafana (opcijsko)

## 🏗️ Struktura projekta

```
omni-global/
├── 📁 server/              # Licenčni strežnik
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── 📁 admin/               # Admin GUI
│   ├── Dockerfile
│   ├── package.json
│   └── app.js
├── 📁 client/              # Client Panel (opcijsko)
│   ├── Dockerfile
│   └── package.json
├── 📁 certs/               # SSL certifikati
│   ├── README.md
│   ├── .gitignore
│   ├── privkey.pem         # Dodajte vi
│   └── fullchain.pem       # Dodajte vi
├── 📁 nginx/               # Nginx konfiguracija
│   ├── nginx.conf
│   └── conf.d/omni.conf
├── 📁 monitoring/          # Monitoring (opcijsko)
├── 📁 logging/             # ELK Stack (opcijsko)
├── docker-compose.yml      # Glavna Docker konfiguracija
├── .env.example           # Primer environment spremenljivk
└── README.md              # Ta datoteka
```

## ⚡ Hitri zagon

### 1. Priprava SSL certifikatov

**POMEMBNO**: SSL certifikati so obvezni za varno HTTPS komunikacijo.

#### Potrebne datoteke v `certs/` mapi:
- **`privkey.pem`** - Privatni ključ (varno shranjeno!)
- **`fullchain.pem`** - Celotna veriga certifikatov

```bash
# Kopirajte SSL certifikate v certs/ mapo
cp /path/to/your/privkey.pem certs/
cp /path/to/your/fullchain.pem certs/

# Ali generirajte samo-podpisane (samo za testiranje)
cd certs/
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes

# Preverite, ali so certifikati na mestu
ls -la certs/
# Mora pokazati: privkey.pem in fullchain.pem
```

### 2. Konfiguracija environment spremenljivk

```bash
# Kopirajte in uredite .env datoteko
cp .env.example .env
nano .env
```

### 3. Zagon sistema z Docker Compose

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

### 4. Dostopne povezave

Po uspešnem zagonu so na voljo naslednje storitve:

#### Glavni API strežnik
- **URL**: `https://yourdomain.com:3000/api/license`
- **Opis**: Licenčni API za upravljanje licenc
- **Protokol**: HTTPS z SSL certifikati

#### Administratorski vmesnik (Demo)
- **URL**: `https://yourdomain.com:4000`
- **Opis**: Spletni vmesnik za administracijo licenc
- **Funkcije**: 
  - Pregled aktivnih licenc v tabeli
  - Podaljšanje licenc
  - Deaktivacija licenc
  - Realnočasno spremljanje

#### MongoDB baza podatkov
- **URL**: `mongodb://localhost:27017`
- **Opis**: Glavna baza podatkov za shranjevanje licenc
- **Dostop**: Lokalni dostop za administracijo

#### WebSocket strežnik
- **URL**: `wss://yourdomain.com:3000/ws`
- **Opis**: Realnočasovna komunikacija z odjemalci
- **Funkcije**: Avtomatska sinhronizacija licenc

## 📱 Namestitev Odjemalske Aplikacije

### Ustvaritev namestitvenega paketa za Electron:

```bash
# Windows paket
npm run package-win

# macOS paket
npm run package-mac

# Linux paket
npm run package-linux
```

### Avtomatska povezava in sinhronizacija:
- Po namestitvi se odjemalec **samodejno poveže** na globalni WebSocket strežnik
- Vse spremembe licenc se **takoj odražajo** na vseh Client Panelih
- Admin GUI omogoča **realnočasno upravljanje** vseh povezanih odjemalcev

### Admin GUI funkcionalnosti:
- **Tabela za upravljanje licenc**: Pregled, podaljšanje in deaktivacija
- **Realnočasna sinhronizacija**: Vse spremembe se takoj odražajo na vseh Client Panelih
- **WebSocket komunikacija**: Takojšnje posodabljanje brez osvežitve

## 🔧 Podrobna namestitev

### Sistemske zahteve

- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **RAM**: Minimum 4GB, priporočeno 8GB+
- **Disk**: Minimum 20GB prostora
- **CPU**: 2+ jedra
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### Korak za korakom

#### 1. Priprava strežnika

```bash
# Posodobite sistem
sudo apt update && sudo apt upgrade -y

# Namestite Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Namestite Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Dodajte uporabnika v docker skupino
sudo usermod -aG docker $USER
newgrp docker
```

#### 2. Prenos in priprava

```bash
# Prenesite deploy paket
git clone <repository-url> omni-global
cd omni-global

# Nastavite pravice
chmod +x scripts/*.sh
```

#### 3. SSL certifikati

```bash
# Opcija A: Let's Encrypt (priporočeno)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem certs/

# Opcija B: Samo-podpisan (testiranje)
cd certs/
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes
```

#### 4. Konfiguracija

```bash
# Ustvarite .env datoteko
cp .env.example .env

# Uredite konfiguracijo
nano .env
```

Primer `.env` datoteke:
```env
# Database
MONGO_URI=mongodb://omni:omni123@mongo:27017/omni?authSource=admin
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your_super_secret_jwt_key_here
ADMIN_PASSWORD=secure_admin_password

# SSL
SSL_ENABLED=true

# Monitoring
GRAFANA_PASSWORD=secure_grafana_password

# Environment
NODE_ENV=production
```

#### 5. Zagon

```bash
# Zgradite slike
docker-compose build

# Zaženite osnovne storitve
docker-compose up -d mongo redis

# Počakajte, da se baza zažene
sleep 30

# Zaženite vse storitve
docker-compose up -d

# Preverite status
docker-compose ps
docker-compose logs -f
```

## 🔍 Monitoring in vzdrževanje

### Preverjanje statusa

```bash
# Status vseh storitev
docker-compose ps

# Logi specifične storitve
docker-compose logs -f server
docker-compose logs -f admin
docker-compose logs -f nginx

# Sistemski resursi
docker stats
```

### Health checks

```bash
# API health check
curl -k https://localhost/api/health

# Admin panel
curl -k https://localhost/admin/health

# Nginx status
curl -k https://localhost/health
```

### Backup

```bash
# Backup MongoDB
docker-compose exec mongo mongodump --out /backup
docker cp omni-mongo:/backup ./backup-$(date +%Y%m%d)

# Backup konfiguracij
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env certs/ nginx/
```

## 🔧 Napredne možnosti

### Monitoring z Prometheus in Grafana

```bash
# Zaženite z monitoring profilom
docker-compose --profile monitoring up -d

# Dostop do Grafana
# URL: http://localhost:3001
# Uporabnik: admin
# Geslo: iz .env datoteke
```

### Logging z ELK Stack

```bash
# Zaženite z logging profilom
docker-compose --profile logging up -d

# Dostop do Kibana
# URL: http://localhost:5601
```

### Skaliranje

```bash
# Povečajte število instanc strežnika
docker-compose up -d --scale server=3

# Povečajte število admin instanc
docker-compose up -d --scale admin=2
```

## 🛠️ Odpravljanje težav

### Pogosti problemi

#### 1. SSL certifikat ni veljaven
```bash
# Preverite certifikat
openssl x509 -in certs/fullchain.pem -text -noout

# Preverite ujemanje ključa
openssl x509 -noout -modulus -in certs/fullchain.pem | openssl md5
openssl rsa -noout -modulus -in certs/privkey.pem | openssl md5
```

#### 2. Baza podatkov se ne zažene
```bash
# Preverite loge MongoDB
docker-compose logs mongo

# Resetirajte podatke (POZOR: briše vse podatke)
docker-compose down -v
docker-compose up -d
```

#### 3. Nginx ne deluje
```bash
# Testirajte konfiguracijo
docker-compose exec nginx nginx -t

# Ponovno naložite konfiguracijo
docker-compose exec nginx nginx -s reload
```

#### 4. Počasno delovanje
```bash
# Preverite resurse
docker stats

# Povečajte RAM limite v docker-compose.yml
# Dodajte pod vsako storitev:
deploy:
  resources:
    limits:
      memory: 1G
    reservations:
      memory: 512M
```

### Logi in debugging

```bash
# Vsi logi
docker-compose logs

# Specifična storitev
docker-compose logs -f server

# Zadnjih 100 vrstic
docker-compose logs --tail=100 admin

# Logi z časovnimi žigi
docker-compose logs -t nginx
```

## 🔄 Posodabljanje

### Posodobitev kode

```bash
# Ustavite sistem
docker-compose down

# Posodobite kodo
git pull origin main

# Ponovno zgradite slike
docker-compose build --no-cache

# Zaženite sistem
docker-compose up -d
```

### Posodobitev Docker slik

```bash
# Prenesite najnovejše slike
docker-compose pull

# Ponovno zaženite
docker-compose up -d
```

## 🔐 Varnost

### Varnostni nasveti

1. **Spremenite privzeta gesla** v `.env` datoteki
2. **Uporabite močne SSL certifikate** (ne samo-podpisane)
3. **Redno posodabljajte** sistem in Docker slike
4. **Omejite dostop** z firewall pravili
5. **Varnostno kopirajte** podatke in konfiguracije
6. **Monitorite** sistem za sumljive aktivnosti

### Firewall konfiguracija

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 📞 Podpora

### Dokumentacija
- [Docker dokumentacija](https://docs.docker.com/)
- [Nginx dokumentacija](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

### Kontakt
- **Email**: support@omni-platform.com
- **GitHub Issues**: [Repository Issues](https://github.com/your-repo/issues)
- **Dokumentacija**: [Wiki](https://github.com/your-repo/wiki)

## 📄 Licenca

Ta projekt je licenciran pod MIT licenco. Glejte [LICENSE](LICENSE) datoteko za podrobnosti.

---

**🎉 Čestitamo! Vaš Omni sistem je pripravljen za produkcijo!**

Za dodatno pomoč ali vprašanja se obrnite na našo podporo.