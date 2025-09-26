# 🚀 Omni Global - Hitri Zagon

Ta dokument vsebuje kratka navodila za hitri zagon Omni Global sistema.

## ⚡ Hitri pregled

1. **SSL certifikati** → Kopirajte `privkey.pem` in `fullchain.pem` v `certs/` mapo
2. **Konfiguracija** → Kopirajte `.env.example` v `.env` in prilagodite
3. **Zagon** → `docker-compose up --build`
4. **Dostop** → `https://yourdomain.com:4000` (Admin GUI)

## 🔐 SSL Certifikati (OBVEZNO)

```bash
# Kopirajte SSL certifikate v certs/ mapo
cp /path/to/your/privkey.pem certs/
cp /path/to/your/fullchain.pem certs/

# Ali generirajte samo-podpisane (samo za testiranje)
cd certs/
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes

# Preverite certifikate
ls -la certs/
# Mora pokazati: privkey.pem in fullchain.pem
```

## ⚙️ Konfiguracija

```bash
# Kopirajte in uredite .env datoteko
cp .env.example .env
nano .env

# Obvezno spremenite:
# - JWT_SECRET
# - ADMIN_PASSWORD
# - MONGO_PASSWORD
# - SERVER_URL
```

## 🐳 Zagon Sistema

### 🎯 Izbira Verzije

**Razvojna verzija (enostavna):**
```bash
# Hitri zagon za razvoj/testiranje
docker-compose -f docker-compose.simple.yml up --build

# Za zagon v ozadju
docker-compose -f docker-compose.simple.yml up --build -d
```

**Produkcijska verzija (popolna):**
```bash
# Popolni zagon z vsemi funkcionalnostmi
docker-compose up --build

# Za zagon v ozadju
docker-compose up --build -d
```

### 📊 Primerjava Verzij

| Funkcionalnost | Razvojna | Produkcijska |
|----------------|----------|-------------|
| MongoDB | ✅ | ✅ |
| Server API | ✅ | ✅ |
| Admin GUI | ✅ | ✅ |
| SSL/HTTPS | ❌ | ✅ |
| Redis Cache | ❌ | ✅ |
| Nginx Proxy | ❌ | ✅ |
| Monitoring | ❌ | ✅ |

**Priporočilo:** Začnite z razvojno verzijo za testiranje, nato uporabite produkcijsko za resnično uporabo.# Preverite status
docker-compose ps

# Preverite loge
docker-compose logs -f
```

## 🌐 Dostopne Povezave

### 🎯 Razvojna Verzija (docker-compose.simple.yml)

Po uspešnem zagonu:

**🔧 Administratorski vmesnik**
- **URL**: `http://localhost:4000`
- **Prijava**: admin / geslo iz .env datoteke
- **Funkcije**: Tabela za upravljanje licenc, realnočasno spremljanje

**🔌 API strežnik**
- **URL**: `http://localhost:3000/api/license`
- **Protokol**: HTTP (brez SSL)
- **Test**: `curl http://localhost:3000/api/license/status`

**🗄️ MongoDB**
- **URL**: `mongodb://localhost:27017`
- **Test**: `docker-compose -f docker-compose.simple.yml exec mongo mongosh`

### 🎯 Produkcijska Verzija (docker-compose.yml)

Po uspešnem zagonu:

**🔧 Administratorski vmesnik**
- **URL**: `https://yourdomain.com:4000` ali `https://localhost:4000`
- **Prijava**: admin / geslo iz .env datoteke
- **Funkcije**: Tabela za upravljanje licenc, realnočasno spremljanje

**🔌 API strežnik**
- **URL**: `https://yourdomain.com:3000/api/license`
- **Protokol**: HTTPS z SSL certifikati
- **Test**: `curl -k https://yourdomain.com:3000/api/license/status`

**🗄️ MongoDB**
- **URL**: `mongodb://localhost:27017`
- **Test**: `docker-compose exec mongo mongosh`

**🔄 WebSocket**
- **URL**: `wss://yourdomain.com:3000/ws`
- **Funkcija**: Realnočasovna sinhronizacija licenc

**📊 Monitoring (opcijsko)**
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001`

## 📱 Odjemalska Aplikacija

### Ustvaritev namestitvenega paketa:

```bash
# Windows
npm run package-win

# macOS
npm run package-mac

# Linux
npm run package-linux
```

### Avtomatska povezava:
- Odjemalec se **samodejno poveže** na WebSocket strežnik
- Vse spremembe licenc se **takoj odražajo** na vseh Client Panelih
- Admin GUI omogoča **realnočasno upravljanje** vseh odjemalcev

## 🔧 Admin GUI Funkcionalnosti

### Tabela za upravljanje licenc:
- ✅ **Pregled** aktivnih licenc
- 🔄 **Podaljšanje** veljavnosti licenc
- ❌ **Deaktivacija** licenc
- 📊 **Realnočasno spremljanje** uporabe

### Realnočasna sinhronizacija:
- Vse spremembe v Admin GUI se **takoj odražajo** na vseh Client Panelih
- WebSocket komunikacija zagotavlja **takojšnje posodabljanje**
- Ni potrebno osvežiti odjemalskih aplikacij

## 🛠️ Osnovni ukazi

```bash
# Zaustavite sistem
docker-compose down

# Ponovno zaženite
docker-compose restart

# Preverite loge
docker-compose logs server
docker-compose logs admin

# Posodobite sistem
git pull
docker-compose up --build -d
```

## ❗ Pogosti problemi

### SSL certifikati manjkajo
```bash
# Preverite certifikate
ls -la certs/
# Mora pokazati: privkey.pem in fullchain.pem
```

### Kontejnerji se ne zaženejo
```bash
# Preverite loge
docker-compose logs
# Preverite .env datoteko
cat .env
```

### Dostop zavrnjen
```bash
# Preverite firewall
sudo ufw status
# Preverite porte
netstat -tlnp | grep :4000
```

## 📚 Dodatne informacije

- **Podrobna namestitev**: Glej `INSTALL.md`
- **Konfiguracija SSL**: Glej `certs/README.md`
- **Nginx konfiguracija**: Glej `nginx/README.md`
- **Monitoring**: Glej `README.md` (Prometheus/Grafana sekcija)

## 🆘 Podpora

Če imate težave:
1. Preverite loge: `docker-compose logs`
2. Preverite status: `docker-compose ps`
3. Preverite konfiguracije: `.env`, `certs/`, `nginx/`
4. Kontaktirajte podporo z logi in opisom problema