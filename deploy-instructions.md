# 🚀 Omni Cloud Migration - Deployment Instructions

## 📋 Pregled sistema

Pripravljen je **popolnoma avtomatski sistem** za migracijo Omni aplikacije v oblak z vsemi Angel sistemi.

### ✅ Pripravljeni sistemi:
- **Glavna migracija skripta**: `omni-cloud-auto.sh`
- **Python Angel sistemi**: 4 posodobljeni sistemi za oblak
- **Backup & Monitoring**: Avtomatski sistem
- **SSL & Security**: Let's Encrypt integracija
- **Systemd storitve**: Avtomatski restart

---

## 🌐 Možnosti distribucije

### **Opcija 1: GitHub Repository (Priporočeno)**
```bash
# 1. Ustvari GitHub repository
# 2. Naloži vse datoteke
# 3. Na strežniku:
git clone https://github.com/[USERNAME]/omni-cloud-migration.git
cd omni-cloud-migration
chmod +x omni-cloud-auto.sh
sudo ./omni-cloud-auto.sh
```

### **Opcija 2: Direct Upload (SCP/SFTP)**
```bash
# Lokalno - naloži datoteke na strežnik
scp omni-cloud-auto.sh root@[JAVNI_IP]:/root/
scp main.py root@[JAVNI_IP]:/root/
scp requirements.txt root@[JAVNI_IP]:/root/
scp omni-backup-monitoring.py root@[JAVNI_IP]:/root/
scp angel-*.py root@[JAVNI_IP]:/root/

# Na strežniku
chmod +x omni-cloud-auto.sh
sudo ./omni-cloud-auto.sh
```

### **Opcija 3: Wget z lokalnega strežnika**
```bash
# 1. Lokalno zaženi HTTP strežnik (že teče na portu 3000)
# 2. Na strežniku:
wget http://[LOKALNI_IP]:3000/omni-cloud-auto.sh -O omni-cloud-auto.sh
wget http://[LOKALNI_IP]:3000/main.py -O main.py
wget http://[LOKALNI_IP]:3000/requirements.txt -O requirements.txt
wget http://[LOKALNI_IP]:3000/omni-backup-monitoring.py -O omni-backup-monitoring.py
wget http://[LOKALNI_IP]:3000/angel-integration-system.py -O angel-integration-system.py
wget http://[LOKALNI_IP]:3000/angel-task-distribution-system.py -O angel-task-distribution-system.py
wget http://[LOKALNI_IP]:3000/angel-monitoring-system.py -O angel-monitoring-system.py
wget http://[LOKALNI_IP]:3000/angel-synchronization-module.py -O angel-synchronization-module.py

chmod +x omni-cloud-auto.sh
sudo ./omni-cloud-auto.sh
```

---

## 🔧 Korak za korakom deployment

### **Korak 1: Priprava strežnika**
```bash
# Povezava na oblačni strežnik (Ubuntu/Debian)
ssh root@[JAVNI_IP_STREŽNIKA]

# Preveri sistem
lsb_release -a
uname -a
```

### **Korak 2: Prenos datotek**
Izberi eno od opcij zgoraj (GitHub, SCP, ali wget).

### **Korak 3: Zagon migracije**
```bash
# Zaženi glavno skripto
sudo ./omni-cloud-auto.sh
```

**Med izvajanjem vnesite:**
- **Domeno**: `moja-domena.com` (brez http/https)
- **Email**: `admin@moja-domena.com` (za SSL certifikate)

### **Korak 4: Validacija**
Skripta avtomatsko preveri:
- ✅ Nginx konfiguracija
- ✅ SSL certifikat
- ✅ Python aplikacije
- ✅ Angel sistemi
- ✅ Backup sistem

---

## 🌐 Dostopne storitve po migraciji

| Storitev | URL | Opis |
|----------|-----|------|
| **Omni App** | `https://tvoja-domena.com` | Glavna aplikacija |
| **Angel Integration** | `https://tvoja-domena.com/api/angels` | Angel management |
| **Task Distribution** | `https://tvoja-domena.com/api/tasks` | Razporeditev nalog |
| **Monitoring Dashboard** | `https://tvoja-domena.com/api/monitoring` | Real-time monitoring |
| **Backup Status** | `https://tvoja-domena.com/api/backup` | Backup management |

### **WebSocket povezave:**
- **Synchronization**: `wss://tvoja-domena.com:8086`
- **Real-time updates**: Avtomatsko

---

## 🔒 Varnostne funkcionalnosti

- ✅ **SSL/TLS šifriranje** (Let's Encrypt)
- ✅ **Avtomatsko podaljševanje certifikatov**
- ✅ **Firewall konfiguracija** (UFW)
- ✅ **Secure headers** (Nginx)
- ✅ **Rate limiting**
- ✅ **CORS protection**

---

## 💾 Backup sistem

### **Avtomatski backup:**
- **Dnevni**: Ohrani 7 dni
- **Tedenski**: Ohrani 4 tedne  
- **Mesečni**: Ohrani 12 mesecev

### **Backup lokacije:**
```bash
/opt/omni/backups/daily/
/opt/omni/backups/weekly/
/opt/omni/backups/monthly/
```

### **Ročni backup:**
```bash
sudo python3 /opt/omni/omni-backup-monitoring.py --backup-now
```

---

## 📊 Monitoring in alarmi

### **Sistemski monitoring:**
- CPU uporaba
- Pomnilnik
- Disk prostor
- Network promet

### **Angel monitoring:**
- Status vseh Angel sistemov
- Task queue velikost
- Response time
- Error rate

### **Dashboard dostop:**
```bash
https://tvoja-domena.com/api/monitoring/dashboard
```

---

## ⚙️ Systemd storitve

Po migraciji bodo aktivne naslednje storitve:

```bash
# Preveri status vseh storitev
sudo systemctl status omni-main
sudo systemctl status omni-angel-integration  
sudo systemctl status omni-angel-tasks
sudo systemctl status omni-angel-monitoring
sudo systemctl status omni-angel-sync
sudo systemctl status omni-backup-monitoring

# Restart storitev
sudo systemctl restart omni-main

# Logi storitev
sudo journalctl -u omni-main -f
```

---

## 🔧 Troubleshooting

### **Preveri loge:**
```bash
# Nginx logi
sudo tail -f /var/log/nginx/error.log

# Omni logi
sudo tail -f /var/log/omni/main.log

# Angel logi
sudo tail -f /var/log/omni/angel-*.log
```

### **Restart vseh storitev:**
```bash
sudo systemctl restart nginx
sudo systemctl restart omni-*
```

### **SSL problemi:**
```bash
# Preveri certifikat
sudo certbot certificates

# Obnovi certifikat
sudo certbot renew --dry-run
```

---

## 📞 Podpora

V primeru težav preveri:
1. **Loge** (`/var/log/omni/`)
2. **Systemd status** (`systemctl status omni-*`)
3. **Nginx konfiguracija** (`nginx -t`)
4. **SSL certifikat** (`certbot certificates`)

---

## 🎯 Pričakovan rezultat

Po uspešni migraciji:
- ✅ **Omni sistem** popolnoma nameščen v oblaku
- ✅ **SSL certifikat** uspešno aktiviran in konfiguriran
- ✅ **Vsi Angel-i** pravilno aktivirani in sinhronizirani
- ✅ **Backup sistem** in monitoring pravilno nastavljeni
- ✅ **Systemd storitve** za samodejni zagon sistema
- ✅ **Real-time dashboard** za spremljanje sistema

**Sistem je pripravljen za produkcijsko uporabo!** 🚀