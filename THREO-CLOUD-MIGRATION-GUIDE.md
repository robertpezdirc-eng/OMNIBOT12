# 🌐 Threo Cloud Migration Guide za Omni

**Popoln vodič za migracijo Omni aplikacije v oblak z avtomatskim HTTPS preko Threo sistema**

---

## 🎯 Pregled migracije

Ta vodič omogoča **popolno avtomatsko migracijo** Omni aplikacije iz lokalnega okolja v produkcijski oblak z:

- ✅ **Avtomatska HTTPS konfiguracija** z Let's Encrypt SSL certifikati
- ✅ **Threo SSL integracija** za upravljanje certifikatov
- ✅ **Multi-cloud podpora** (AWS, GCP, Azure, DigitalOcean)
- ✅ **Nginx reverse proxy** z optimiziranimi nastavitvami
- ✅ **Avtomatski backup in monitoring**
- ✅ **24/7 dostopnost** brez lokalnega računalnika

---

## 📋 Pred migracijo - Priprava

### 1️⃣ Oblačna infrastruktura

**Ustvari virtualni strežnik:**
- **OS**: Ubuntu 22.04 LTS (priporočeno) ali Windows Server
- **RAM**: Minimalno 2GB (priporočeno 4GB+)
- **Disk**: 20GB+ prostora
- **CPU**: 2+ jedra
- **Omrežje**: Javni IP naslov

**Konfiguriraj varnostne skupine:**
```
Port 22  (SSH)     - Samo tvoj IP
Port 80  (HTTP)    - 0.0.0.0/0
Port 443 (HTTPS)   - 0.0.0.0/0
Port 8080 (Omni)   - Samo localhost
```

### 2️⃣ DNS konfiguracija

**Nastavi DNS zapise:**
```
A record: moja-domena.com → [JAVNI_IP_STREŽNIKA]
CNAME: www.moja-domena.com → moja-domena.com
```

**Preveri DNS propagacijo:**
```bash
nslookup moja-domena.com
ping moja-domena.com
```

### 3️⃣ Pripravi podatke

**Potrebne informacije:**
- Domena: `moja-domena.com`
- Email za SSL obvestila: `admin@moja-domena.com`
- Javni IP strežnika: `123.456.789.012`

---

## 🚀 Migracija z Threo - Korak za korakom

### Korak 1: Povezava na oblačni strežnik

```bash
# SSH povezava na strežnik
ssh root@123.456.789.012

# Ali z uporabniškim imenom
ssh ubuntu@123.456.789.012
```

### Korak 2: Priprava Threo ukaza

**Kopiraj in prilagodi ta ukaz za Threo:**

```
Naloga: Izvedi popolno migracijo Omni aplikacije v oblak z avtomatsko HTTPS konfiguracijo.

KONFIGURACIJA:
- Domena: moja-domena.com
- Email: admin@moja-domena.com
- Aplikacija: Omni Brain Platform
- Port: 8080 (interno), 80/443 (javno)

KORAKI MIGRACIJE:

1. SISTEMSKA PRIPRAVA:
   - Posodobi sistem (apt update && apt upgrade)
   - Namesti odvisnosti: python3, pip, nginx, git, certbot, ufw
   - Ustvari uporabnika 'omni' z domačim direktorijem
   - Konfiguriraj firewall (UFW): omogoči SSH, HTTP, HTTPS

2. OMNI APLIKACIJA:
   - Kloniraj repozitorij: git clone https://github.com/your-repo/omniscient-ai-platform.git /opt/omni
   - Namesti Python odvisnosti: pip install -r requirements.txt
   - Ustvari virtualno okolje in aktiviraj
   - Testiraj aplikacijo na portu 8080

3. NGINX REVERSE PROXY:
   - Konfiguriraj Nginx kot reverse proxy za port 8080
   - Ustvari server block za moja-domena.com
   - Omogoči gzip kompresijo in varnostne headerje
   - Nastavi rate limiting in DDoS zaščito

4. SSL CERTIFIKAT (Let's Encrypt):
   - Pridobi SSL certifikat: certbot --nginx -d moja-domena.com
   - Konfiguriraj avtomatsko podaljševanje (crontab)
   - Nastavi HSTS in SSL optimizacije
   - Preusmeri HTTP na HTTPS

5. SYSTEMD STORITEV:
   - Ustvari omni.service za avtomatski zagon
   - Omogoči restart ob napakah
   - Nastavi logiranje in monitoring
   - Zaženi in omogoči ob zagonu sistema

6. BACKUP IN MONITORING:
   - Implementiraj dnevni backup sistem
   - Nastavi SSL monitoring in opozorila
   - Konfiguriraj log rotation
   - Ustvari health check endpoint

7. VARNOSTNE NASTAVITVE:
   - Konfiguriraj fail2ban za SSH zaščito
   - Nastavi varnostne headerje (HSTS, CSP, X-Frame-Options)
   - Implementiraj rate limiting
   - Zaščiti admin endpointe

8. FINALNA VALIDACIJA:
   - Testiraj HTTPS povezavo: https://moja-domena.com
   - Preveri SSL certifikat (A+ rating)
   - Testiraj avtomatsko podaljševanje certifikata
   - Preveri delovanje aplikacije in API-jev

REZULTAT:
- Omni aplikacija dostopna na https://moja-domena.com
- Avtomatski SSL certifikati z Let's Encrypt
- 24/7 delovanje z avtomatskim restartom
- Backup sistem in monitoring
- Produkcijska varnostna konfiguracija

Obvesti me, ko je migracija končana in aplikacija dostopna.
```

### Korak 3: Izvedba migracije

1. **Odpri Threo konzolo** na oblačnem strežniku
2. **Prilepi pripravljeni ukaz** (zamenjaj `moja-domena.com` s svojo domeno)
3. **Pošlji ukaz** za izvedbo
4. **Počakaj** na dokončanje (običajno 10-20 minut)

### Korak 4: Monitoring migracije

**Threo bo avtomatsko izvedel:**
- ✅ Sistemsko pripravo in namestitev odvisnosti
- ✅ Kloniranje in konfiguracijo Omni aplikacije
- ✅ Nginx reverse proxy nastavitve
- ✅ SSL certifikat z Let's Encrypt
- ✅ Systemd storitev za avtomatski zagon
- ✅ Backup sistem in monitoring
- ✅ Varnostne konfiguracije

**Preverjaj napredek:**
```bash
# Preveri status storitev
systemctl status nginx omni

# Preveri SSL certifikat
certbot certificates

# Testiraj aplikacijo
curl -I https://moja-domena.com
```

---

## ✅ Validacija migracije

### 1. Testiranje z mobilno napravo

**Pomembno**: Testiraj z mobilno napravo (ne z lokalnim računalnikom)

```
1. Odpri brskalnik na telefonu
2. Obišči: https://moja-domena.com
3. Preveri:
   ✅ Aplikacija se naloži
   ✅ SSL ključavnica je zelena
   ✅ Ni varnostnih opozoril
   ✅ Vsi funkcionalnosti delujejo
```

### 2. SSL certifikat validacija

**Preveri SSL certifikat:**
- Klikni na ključavnico v brskalniku
- Preveri, da je certifikat veljaven
- Datum poteka mora biti ~90 dni v prihodnosti

**Online SSL test:**
- Obišči: https://www.ssllabs.com/ssltest/
- Vnesi svojo domeno
- Cilj: A+ ocena

### 3. Avtomatsko testiranje

**Zaženi avtomatske teste:**
```bash
# SSH na strežnik
ssh root@123.456.789.012

# Zaženi teste
cd /opt/omni
chmod +x test-omni-production.sh
./test-omni-production.sh moja-domena.com
```

---

## 🔄 Po migraciji - Upravljanje

### Koristni ukazi za upravljanje

```bash
# Preveri status storitev
systemctl status nginx omni

# Ponovno zaženi storitve
systemctl restart nginx omni

# Preveri SSL certifikate
certbot certificates

# Obnovi SSL certifikat
certbot renew

# Preveri loge
journalctl -u omni -f
tail -f /var/log/nginx/access.log

# Backup
tar -czf omni-backup-$(date +%Y%m%d).tar.gz /opt/omni
```

### Monitoring in vzdrževanje

**Avtomatski procesi:**
- ✅ SSL certifikati se avtomatsko podaljšujejo
- ✅ Aplikacija se avtomatsko restarta ob napakah
- ✅ Dnevni backup sistem
- ✅ Log rotation

**Mesečno vzdrževanje:**
```bash
# Posodobi sistem
apt update && apt upgrade -y

# Preveri disk prostor
df -h

# Očisti stare loge
logrotate -f /etc/logrotate.conf
```

---

## 🚨 Odpravljanje težav

### Pogoste težave in rešitve

#### 1. SSL certifikat se ne pridobi
```bash
# Preveri DNS
nslookup moja-domena.com

# Ročno pridobi certifikat
certbot --nginx -d moja-domena.com --verbose

# Preveri Nginx konfiguracijo
nginx -t
```

#### 2. Aplikacija ni dostopna
```bash
# Preveri status
systemctl status omni

# Preveri porte
netstat -tlnp | grep 8080

# Ponovno zaženi
systemctl restart omni
```

#### 3. Nginx napake
```bash
# Preveri konfiguracijo
nginx -t

# Preveri loge
tail -f /var/log/nginx/error.log

# Ponovno zaženi
systemctl restart nginx
```

---

## 🎉 Uspešna migracija

**Po uspešni migraciji boš imel:**

✅ **Omni aplikacijo dostopno na** `https://moja-domena.com`  
✅ **Avtomatski SSL certifikati** z Let's Encrypt  
✅ **24/7 delovanje** brez lokalnega računalnika  
✅ **Avtomatski backup** in monitoring  
✅ **Produkcijska varnost** in optimizacije  
✅ **Avtomatsko podaljševanje** certifikatov  

**Lokalni računalnik ni več potreben** - Omni deluje samostojno v oblaku!

---

## 📞 Podpora

**Če potrebuješ pomoč:**
- 📧 Email: support@moja-domena.com
- 📖 Dokumentacija: [PRODUCTION-DEPLOYMENT-GUIDE.md](./PRODUCTION-DEPLOYMENT-GUIDE.md)
- 🔧 Testiranje: [test-omni-production.sh](./test-omni-production.sh)

---

**🚀 Dobrodošel v oblaku! Tvoj Omni zdaj deluje 24/7 na `https://moja-domena.com`**