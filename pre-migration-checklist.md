# ✅ KONTROLNI SEZNAM PRED MIGRACIJO OMNI V OBLAK

## 🎯 Pregled

Ta kontrolni seznam zagotavlja, da imate vse potrebno za uspešno migracijo Omni aplikacije v oblak z uporabo SSH in Threo avtomatizacije.

---

## 🏗️ OBLAČNA INFRASTRUKTURA

### ☁️ Virtualni strežnik
- [ ] **Oblačni ponudnik izbran** (AWS, DigitalOcean, Linode, Vultr, Hetzner...)
- [ ] **VM ustvarjen** z naslednjimi specifikacijami:
  - [ ] Ubuntu 20.04+ ali Debian 11+
  - [ ] Minimalno 2GB RAM
  - [ ] Minimalno 20GB SSD disk
  - [ ] 1 CPU core (priporočeno 2+)
- [ ] **Javni IP naslov dodeljen**
- [ ] **SSH dostop omogočen** (port 22)
- [ ] **Root dostop ali sudo uporabnik**

### 🔐 Varnostne nastavitve
- [ ] **SSH ključ generiran** (priporočeno namesto gesla)
- [ ] **Firewall konfiguriran** (UFW ali iptables)
- [ ] **Osnovne varnostne posodobitve** nameščene

### 💰 Stroški in limiti
- [ ] **Mesečni proračun potrjen**
- [ ] **Bandwidth limiti preverjeni**
- [ ] **Backup prostor rezerviran**

---

## 🌐 DNS KONFIGURACIJA

### 📍 Domena
- [ ] **Domena registrirana** ali na voljo
- [ ] **DNS upravljanje dostopno**
- [ ] **A record nastavljen**:
  ```
  moja-domena.com → [JAVNI_IP_STREŽNIKA]
  ```
- [ ] **DNS propagacija potrjena** (24-48 ur)
- [ ] **Subdomena konfigurirana** (če potrebno):
  ```
  omni.moja-domena.com → [JAVNI_IP_STREŽNIKA]
  ```

### 🔍 DNS testiranje
- [ ] **nslookup test uspešen**:
  ```bash
  nslookup moja-domena.com
  ```
- [ ] **ping test uspešen**:
  ```bash
  ping moja-domena.com
  ```

---

## 💻 LOKALNA PRIPRAVA

### 🔧 Omni aplikacija
- [ ] **Lokalni Omni deluje brezhibno**
- [ ] **Vsi moduli testirani**
- [ ] **Konfiguracija optimizirana**
- [ ] **Podatki in nastavitve zabeleženi**

### 📁 Backup lokalnih podatkov
- [ ] **Konfiguracija shranjena**:
  - [ ] `.env` datoteke
  - [ ] `config.json`
  - [ ] Uporabniški podatki
- [ ] **Baza podatkov izvožena** (če obstaja)
- [ ] **Pomembne datoteke zabeležene**

### 🛠️ Orodja pripravljena
- [ ] **SSH klient nameščen** (PuTTY, OpenSSH...)
- [ ] **Threo dostop potrjen**
- [ ] **Backup orodja pripravljena**

---

## 📋 THREO KONFIGURACIJA

### 🤖 Threo ukaz
- [ ] **`threo-migration-command.txt` odprt**
- [ ] **Domena posodobljena**:
  ```
  PRED: moja-domena.com
  PO:   [VAŠA_DEJANSKA_DOMENA]
  ```
- [ ] **Email posodobljen**:
  ```
  PRED: admin@moja-domena.com
  PO:   [VAŠ_DEJANSKI_EMAIL]
  ```
- [ ] **GitHub repozitorij URL preverjen**
- [ ] **Threo ukaz testiran** (sintaksa)

### 📧 SSL konfiguracija
- [ ] **Email za Let's Encrypt veljaven**
- [ ] **Email dostopen za obvestila**
- [ ] **Backup email konfiguriran**

---

## 🔌 MREŽNE NASTAVITVE

### 🚪 Porti
- [ ] **Port 22 (SSH) dostopen**
- [ ] **Port 80 (HTTP) dostopen**
- [ ] **Port 443 (HTTPS) dostopen**
- [ ] **Port 8080 (Omni) interno dostopen**

### 🛡️ Firewall
- [ ] **UFW ali iptables konfiguriran**
- [ ] **Samo potrebni porti odprti**
- [ ] **DDoS zaščita omogočena** (če na voljo)

---

## 📊 MONITORING IN BACKUP

### 📈 Monitoring priprava
- [ ] **Monitoring orodja izbrana** (opcijsko)
- [ ] **Alert email konfiguriran**
- [ ] **Health check endpoint načrtovan**

### 💾 Backup strategija
- [ ] **Backup lokacija določena**
- [ ] **Backup urnik načrtovan** (dnevno priporočeno)
- [ ] **Restore procedura dokumentirana**

---

## 🔍 TESTIRANJE PRED MIGRACIJO

### 🌐 Povezljivost
- [ ] **SSH povezava na strežnik uspešna**:
  ```bash
  ssh root@[JAVNI_IP_STREŽNIKA]
  ```
- [ ] **Internet dostop na strežniku**:
  ```bash
  ping google.com
  curl -I https://github.com
  ```

### 🔧 Sistemske zahteve
- [ ] **Operacijski sistem potrjen**:
  ```bash
  lsb_release -a
  ```
- [ ] **Disk prostor zadosten**:
  ```bash
  df -h
  ```
- [ ] **RAM zadosten**:
  ```bash
  free -h
  ```

---

## 📞 KONTAKTI IN PODPORA

### 🆘 Kontakti za podporo
- [ ] **Oblačni ponudnik podpora**
- [ ] **DNS ponudnik podpora**
- [ ] **Threo podpora**: support@threo.cloud
- [ ] **Backup kontakt oseba**

### 📚 Dokumentacija
- [ ] **SSH ključi varno shranjeni**
- [ ] **Gesla v password managerju**
- [ ] **Migracija dokumentirana**
- [ ] **Rollback plan pripravljen**

---

## ⏰ ČASOVNI NAČRT

### 📅 Migracija
- [ ] **Datum migracije določen**
- [ ] **Čas migracije načrtovan** (izven prometnih ur)
- [ ] **Backup okno rezervirano**
- [ ] **Testno okno načrtovano**

### ⚡ Hitrost migracije
- [ ] **Pričakovani čas**: 20-30 minut
- [ ] **Dodatni čas za testiranje**: 30 minut
- [ ] **Skupni čas**: 1 ura

---

## 🎯 FINALNA PREVERITEV

### ✅ Vse pripravljeno
- [ ] **Oblačni strežnik pripravljen**
- [ ] **DNS konfiguracija aktivna**
- [ ] **Threo ukaz posodobljen**
- [ ] **Backup podatkov končan**
- [ ] **SSH dostop potrjen**
- [ ] **Monitoring pripravljen**

### 🚀 Pripravljen za migracijo
- [ ] **Vsi koraki kontrolnega seznama končani**
- [ ] **Ekipa obveščena o migraciji**
- [ ] **Rollback plan pripravljen**

---

## 📋 NASLEDNJI KORAKI

Ko je kontrolni seznam popoln, nadaljujte z:

1. **SSH povezava**: `ssh root@[JAVNI_IP_STREŽNIKA]`
2. **Threo migracija**: Sledite `ssh-migration-guide.md`
3. **Validacija**: Uporabite `migration-validation-script.sh`

---

**🎉 Ko je ta kontrolni seznam popoln, ste pripravljeni za uspešno migracijo Omni aplikacije v oblak!**