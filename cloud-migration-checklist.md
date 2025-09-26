# ✅ Omni Cloud Migration Checklist

**Kontrolni seznam za uspešno migracijo Omni v oblak z Threo**

---

## 📋 Pred migracijo

### 1. Oblačna infrastruktura
- [ ] Ustvarjen virtualni strežnik (Ubuntu 22.04 LTS)
- [ ] Minimalno 2GB RAM, 20GB disk, 2 CPU jedra
- [ ] Javni IP naslov pridobljen
- [ ] Varnostne skupine konfigurirane:
  - [ ] Port 22 (SSH) - samo tvoj IP
  - [ ] Port 80 (HTTP) - 0.0.0.0/0
  - [ ] Port 443 (HTTPS) - 0.0.0.0/0
  - [ ] Port 8080 (Omni) - samo localhost

### 2. DNS konfiguracija
- [ ] Domena registrirana
- [ ] A record: `moja-domena.com` → `[JAVNI_IP]`
- [ ] CNAME: `www.moja-domena.com` → `moja-domena.com`
- [ ] DNS propagacija preverjena (`nslookup moja-domena.com`)

### 3. Podatki pripravljeni
- [ ] Domena: `_________________`
- [ ] Email za SSL: `_________________`
- [ ] Javni IP: `_________________`

---

## 🚀 Migracija z Threo

### 4. Povezava na strežnik
- [ ] SSH povezava uspešna: `ssh root@[JAVNI_IP]`
- [ ] Root pravice potrjene

### 5. Threo ukaz pripravljen
- [ ] Ukaz kopiran iz `threo-migration-command.txt`
- [ ] Domena zamenjana: `moja-domena.com` → `tvoja-domena.com`
- [ ] Email zamenjan: `admin@moja-domena.com` → `tvoj@email.com`

### 6. Izvedba migracije
- [ ] Threo konzola odprta
- [ ] Ukaz prilepljen in poslan
- [ ] Migracija v teku (10-20 minut)

### 7. Monitoring napredka
- [ ] Sistemska priprava dokončana
- [ ] Omni aplikacija nameščena
- [ ] Nginx reverse proxy konfiguriran
- [ ] SSL certifikat pridobljen
- [ ] Systemd storitev ustvarjena
- [ ] Backup sistem implementiran
- [ ] Varnostne nastavitve aplicirane

---

## ✅ Validacija migracije

### 8. Testiranje z mobilno napravo
- [ ] Brskalnik odprt na telefonu (ne na računalniku!)
- [ ] Obisk: `https://tvoja-domena.com`
- [ ] Aplikacija se naloži pravilno
- [ ] SSL ključavnica je zelena
- [ ] Ni varnostnih opozoril
- [ ] Vse funkcionalnosti delujejo

### 9. SSL certifikat validacija
- [ ] Klik na ključavnico v brskalniku
- [ ] Certifikat je veljaven
- [ ] Datum poteka ~90 dni v prihodnosti
- [ ] SSL Labs test (https://www.ssllabs.com/ssltest/): A+ ocena

### 10. Tehnična validacija
- [ ] SSH na strežnik: `ssh root@[JAVNI_IP]`
- [ ] Status storitev: `systemctl status nginx omni`
- [ ] Porte aktivni: `netstat -tlnp | grep -E ":80|:443|:8080"`
- [ ] SSL certifikat: `certbot certificates`
- [ ] Avtomatski testi: `./test-omni-production.sh tvoja-domena.com`

---

## 🔄 Po migraciji

### 11. Dokumentacija
- [ ] Podatki o strežniku shranjeni
- [ ] SSH ključi varno shranjeni
- [ ] Administratorski podatki dokumentirani

### 12. Monitoring nastavljen
- [ ] SSL monitoring aktiven
- [ ] Backup sistem deluje
- [ ] Log rotation konfiguriran
- [ ] Health check endpoint dostopen

### 13. Varnostne nastavitve
- [ ] Firewall (UFW) aktiven
- [ ] Fail2ban konfiguriran
- [ ] SSH hardening apliciran
- [ ] Varnostni headerji nastavljeni

---

## 🎉 Migracija dokončana

### 14. Finalna potrditev
- [ ] **Omni dostopen na**: `https://tvoja-domena.com` ✅
- [ ] **SSL certifikat**: Avtomatsko podaljševanje ✅
- [ ] **24/7 delovanje**: Brez lokalnega računalnika ✅
- [ ] **Backup sistem**: Dnevno varnostno kopiranje ✅
- [ ] **Monitoring**: Avtomatsko spremljanje ✅

---

## 📞 Podpora in vzdrževanje

### 15. Koristni ukazi
```bash
# Status storitev
systemctl status nginx omni

# Ponovno zaženi storitve
systemctl restart nginx omni

# Preveri SSL
certbot certificates

# Obnovi SSL
certbot renew

# Logi
journalctl -u omni -f
tail -f /var/log/nginx/access.log
```

### 16. Redne naloge
- [ ] **Tedensko**: Preveri SSL certifikate
- [ ] **Mesečno**: Posodobi sistem (`apt update && apt upgrade`)
- [ ] **Mesečno**: Preveri disk prostor (`df -h`)
- [ ] **Kvartalno**: Preveri backup datoteke

---

## ✨ Uspešna migracija!

**🎊 Čestitamo! Tvoj Omni zdaj deluje 24/7 v oblaku na `https://tvoja-domena.com`**

**Lokalni računalnik ni več potreben - aplikacija deluje samostojno!**

---

**Datum migracije**: `_______________`  
**Domena**: `_______________`  
**IP naslov**: `_______________`  
**SSL veljavnost**: `_______________`