# 🚀 SSH MIGRACIJA OMNI V OBLAK Z THREO

## 📋 Pregled migracije

Ta vodič vas vodi skozi popolno migracijo Omni aplikacije iz lokalnega okolja v oblačni strežnik z uporabo SSH in Threo avtomatizacije.

## 🔧 Predpriprave

### 1. Oblačni strežnik
- ✅ Ubuntu 20.04+ ali Debian 11+
- ✅ Minimalno 2GB RAM, 20GB disk
- ✅ Javni IP naslov
- ✅ SSH dostop (port 22)

### 2. DNS konfiguracija
```bash
# Nastavi A record za svojo domeno
moja-domena.com → [JAVNI_IP_STREŽNIKA]
```

### 3. Lokalna priprava
- ✅ Omni aplikacija deluje lokalno
- ✅ Threo ukaz pripravljen
- ✅ SSH ključ ali geslo za strežnik

## 🌐 KORAK 1: SSH povezava na strežnik

### Povezava preko SSH
```bash
# Zamenjaj [JAVNI_IP_STREŽNIKA] z dejanskim IP naslovom
ssh root@[JAVNI_IP_STREŽNIKA]

# Primer:
ssh root@203.0.113.10
```

### Preverjanje povezave
```bash
# Po uspešni prijavi preverite sistem
whoami
pwd
uname -a
```

## ⚙️ KORAK 2: Priprava Threo ukaza

### Posodobitev konfiguracijskih parametrov

Odprite datoteko `threo-migration-command.txt` in posodobite:

```bash
# PRED:
- Domena: moja-domena.com
- Email: admin@moja-domena.com

# PO (primer):
- Domena: omni.example.com
- Email: admin@example.com
```

### Primer konfiguracije
```
Naloga: Izvedi popolno migracijo Omni aplikacije v oblak z avtomatsko HTTPS konfiguracijo.

KONFIGURACIJA:
- Domena: omni.example.com
- Email: admin@example.com
- Aplikacija: Omni Brain Platform
- Port: 8080 (interno), 80/443 (javno)
```

## 🤖 KORAK 3: Izvedba migracije s Threo

### Zagon Threo konzole

Na oblačnem strežniku (preko SSH):

```bash
# Opcija 1: Threo CLI
threo-console

# Opcija 2: Threo web dashboard
# Odprite https://threo.cloud/console
```

### Izvedba migracije

1. **Kopiraj pripravljeni ukaz** iz `threo-migration-command.txt`
2. **Prilepi v Threo konzolo**
3. **Pošlji ukaz za izvedbo**

### Monitoring napredka

Threo bo prikazal napredek v realnem času:

```
🔄 Sistemska priprava... ✅
🔄 Namestitev Omni... ✅
🔄 Nginx konfiguracija... ✅
🔄 SSL certifikat... ✅
🔄 Systemd storitev... ✅
🔄 Backup sistem... ✅
🔄 Varnostne nastavitve... ✅
🔄 Finalna validacija... ✅
```

## 🔍 KORAK 4: Preverjanje uspešnosti

### Sistemske preveritve (na strežniku)

```bash
# Preverite stanje Omni storitve
systemctl status omni.service

# Testirajte Nginx konfiguracijo
nginx -t

# Preverite SSL certifikat
curl -I https://omni.example.com

# Preverite porte
netstat -tlnp | grep -E ':80|:443|:8080'
```

### Mobilno testiranje

Na mobilni napravi odprite:
```
https://omni.example.com
```

Preverite:
- ✅ Veljavnost SSL certifikata (zelena ključavnica)
- ✅ Hitrost nalaganja aplikacije
- ✅ Dostop do Omni dashboarda
- ✅ Funkcionalnost vseh modulov

### Tehnična validacija

```bash
# SSL test
openssl s_client -connect omni.example.com:443 -servername omni.example.com

# HTTP headers test
curl -I https://omni.example.com

# Aplikacijski test
curl https://omni.example.com/api/health
```

## 📊 KORAK 5: Post-migracija

### Dokumentacija uspešne migracije

```bash
# Shranite konfiguracijske podatke
echo "Omni migracija dokončana: $(date)" >> /var/log/omni-migration.log
echo "Domena: omni.example.com" >> /var/log/omni-migration.log
echo "SSL: Let's Encrypt" >> /var/log/omni-migration.log
```

### Koristni ukazi za upravljanje

```bash
# Restart Omni aplikacije
systemctl restart omni.service

# Preveri loge
journalctl -u omni.service -f

# Reload Nginx
systemctl reload nginx

# Preveri SSL certifikat
certbot certificates

# Ročno podaljšaj SSL
certbot renew --dry-run
```

## 🔧 Avtomatski procesi po migraciji

### Threo bo nastavil naslednje avtomatske procese:

1. **SSL podaljševanje**: Avtomatsko vsake 3 mesece
2. **Backup sistem**: Dnevni backup ob 2:00
3. **Monitoring**: Health check vsakih 5 minut
4. **Log rotation**: Tedensko čiščenje logov
5. **Varnostne posodobitve**: Avtomatske varnostne posodobitve

## 🎯 Končni rezultat

Po uspešni migraciji boste imeli:

- ✅ **Omni aplikacija dostopna na HTTPS domeni**
- ✅ **Avtomatski SSL certifikati z Let's Encrypt**
- ✅ **24/7 delovanje z avtomatskim restartom**
- ✅ **Avtomatsko podaljševanje certifikatov**
- ✅ **Produkcijska varnostna konfiguracija**
- ✅ **Optimizacije za hitrost in stabilnost**
- ✅ **Monitoring in alerting sistem**
- ✅ **Avtomatski backup sistem**

## 🆘 Odpravljanje težav

### Pogosti problemi in rešitve

```bash
# Problem: SSL certifikat se ne pridobi
# Rešitev: Preverite DNS nastavitve
nslookup omni.example.com

# Problem: Omni se ne zažene
# Rešitev: Preverite loge
journalctl -u omni.service --no-pager

# Problem: Nginx napaka
# Rešitev: Testirajte konfiguracijo
nginx -t && systemctl reload nginx

# Problem: Port 8080 ni dostopen
# Rešitev: Preverite firewall
ufw status
```

### Kontakt za podporo

V primeru težav kontaktirajte:
- **Threo podpora**: support@threo.cloud
- **Omni dokumentacija**: Preverite `PRODUCTION-DEPLOYMENT-GUIDE.md`

---

**🚀 Uspešna migracija pomeni, da je vaša Omni aplikacija zdaj popolnoma oblačna, varna in dostopna 24/7!**