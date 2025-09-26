# 🐳 Docker Installation Guide - Omni System

## ⚠️ Docker ni nameščen

Za zagon Omni Global License System z Docker tehnologijo morate najprej namestiti Docker.

## 🔐 SSL Certifikati

**POMEMBNO**: Pred zagonom sistema morate pripraviti SSL certifikate za varno HTTPS komunikacijo.

### Potrebne datoteke v `certs/` mapi:
- **`privkey.pem`** - Privatni ključ (varno shranjeno, ne delite!)
- **`fullchain.pem`** - Celotna veriga certifikatov

### Pridobitev SSL certifikatov:

#### Opcija 1: Let's Encrypt (Brezplačno)
```bash
# Namestite certbot
sudo apt install certbot  # Linux
# ali
choco install certbot     # Windows

# Pridobite certifikat
sudo certbot certonly --standalone -d yourdomain.com

# Kopirajte certifikate
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem certs/
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem certs/
```

#### Opcija 2: Samo-podpisan (samo za testiranje)
```bash
cd certs/
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes
```

## 🚀 Zagon Sistema

### 1. Priprava SSL certifikatov
```bash
# Preverite, ali so certifikati na mestu
ls -la certs/
# Mora pokazati: privkey.pem in fullchain.pem
```

### 2. Zgradite in zaženite Docker kontejnerje
```bash
docker-compose up --build
```

### 3. Preverjanje delovanja
```bash
# Preverite status kontejnerjev
docker-compose ps

# Preverite loge
docker-compose logs -f
```

## 🌐 Dostopne Povezave

Po uspešnem zagonu so na voljo naslednje storitve:

### Glavni API strežnik
- **URL**: `https://yourdomain.com:3000/api/license`
- **Opis**: Licenčni API za upravljanje licenc
- **Protokol**: HTTPS z SSL certifikati

### Administratorski vmesnik (Demo)
- **URL**: `https://yourdomain.com:4000`
- **Opis**: Spletni vmesnik za administracijo licenc
- **Funkcije**: 
  - Pregled aktivnih licenc
  - Podaljšanje licenc
  - Deaktivacija licenc
  - Realnočasno spremljanje

### MongoDB baza podatkov
- **URL**: `mongodb://localhost:27017`
- **Opis**: Glavna baza podatkov za shranjevanje licenc
- **Dostop**: Lokalni dostop za administracijo

### WebSocket strežnik
- **URL**: `wss://yourdomain.com:3000/ws`
- **Opis**: Realnočasovna komunikacija z odjemalci
- **Funkcije**: Avtomatska sinhronizacija licenc

## 📱 Namestitev Odjemalske Aplikacije

### Ustvaritev namestitvenega paketa za Electron:

#### Windows paket
```bash
npm run package-win
```

#### macOS paket
```bash
npm run package-mac
```

#### Linux paket
```bash
npm run package-linux
```

### Avtomatska povezava
- Po namestitvi se odjemalec **samodejno poveže** na globalni WebSocket strežnik
- Vse spremembe licenc se **takoj odražajo** na vseh Client Panelih
- Admin GUI omogoča **realnočasno upravljanje** vseh povezanih odjemalcev

## 🔧 Admin GUI Funkcionalnosti

### Tabela za upravljanje licenc:
- **Pregled**: Seznam vseh aktivnih licenc
- **Podaljšanje**: Podaljšanje veljavnosti licenc
- **Deaktivacija**: Takojšnja deaktivacija licenc
- **Monitoring**: Realnočasno spremljanje uporabe

### Realnočasna sinhronizacija:
- Vse spremembe v Admin GUI se **takoj odražajo** na vseh Client Panelih
- WebSocket komunikacija zagotavlja **takojšnje posodabljanje**
- Ni potrebno osvežiti odjemalskih aplikacij

## 🪟 Windows Installation

### Možnost 1: Docker Desktop (Priporočeno)

1. **Prenesite Docker Desktop**
   - Obiščite: https://www.docker.com/products/docker-desktop/
   - Kliknite "Download for Windows"

2. **Sistemski zahtevi**
   - Windows 10 64-bit: Pro, Enterprise, ali Education (Build 19041 ali novejši)
   - WSL 2 feature enabled
   - Virtualization enabled v BIOS

3. **Namestitev**
   ```bash
   # Prenesite in zaženite Docker Desktop Installer.exe
   # Sledite navodilom namestitve
   # Restartajte računalnik po namestitvi
   ```

4. **Preverjanje namestitve**
   ```bash
   docker --version
   docker-compose --version
   ```

### Možnost 2: Docker Engine (Brez GUI)

1. **Namestite preko Chocolatey**
   ```bash
   # Namestite Chocolatey (če ni nameščen)
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   
   # Namestite Docker
   choco install docker-desktop
   ```

2. **Namestite preko Winget**
   ```bash
   winget install Docker.DockerDesktop
   ```

## 🐧 Linux Installation

### Ubuntu/Debian
```bash
# Posodobite pakete
sudo apt update

# Namestite potrebne pakete
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Dodajte Docker GPG ključ
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Dodajte Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Namestite Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Dodajte uporabnika v docker skupino
sudo usermod -aG docker $USER

# Restartajte sistem ali se odjavite/prijavite
```

### CentOS/RHEL/Fedora
```bash
# Namestite Docker
sudo dnf install docker docker-compose

# Zaženite Docker servis
sudo systemctl start docker
sudo systemctl enable docker

# Dodajte uporabnika v docker skupino
sudo usermod -aG docker $USER
```

## 🍎 macOS Installation

### Možnost 1: Docker Desktop
1. Prenesite Docker Desktop za Mac: https://www.docker.com/products/docker-desktop/
2. Povlecite Docker.app v Applications folder
3. Zaženite Docker Desktop

### Možnost 2: Homebrew
```bash
# Namestite Homebrew (če ni nameščen)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Namestite Docker
brew install --cask docker
```

## ✅ Preverjanje namestitve

Po namestitvi preverite, ali Docker deluje:

```bash
# Preverite verzijo
docker --version
docker-compose --version

# Testirajte Docker
docker run hello-world

# Preverite status
docker info
```

## 🚀 Zagon Omni Sistema

Ko je Docker nameščen, lahko zaženete Omni sistem:

### Windows
```bash
# V PowerShell ali Command Prompt
cd C:\Users\admin\Downloads\copy-of-copy-of-omniscient-ai-platform
.\docker-start.bat
```

### Linux/Mac
```bash
cd /path/to/copy-of-copy-of-omniscient-ai-platform
chmod +x docker-start.sh
./docker-start.sh
```

## 🔧 Troubleshooting

### Windows problemi

#### WSL 2 ni nameščen
```bash
# V PowerShell kot Administrator
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restartajte računalnik
# Prenesite WSL2 Linux kernel update package
```

#### Virtualization ni omogočena
1. Restartajte računalnik
2. Vstopite v BIOS/UEFI
3. Omogočite Intel VT-x ali AMD-V
4. Shranite in restartajte

### Linux problemi

#### Permission denied
```bash
# Dodajte uporabnika v docker skupino
sudo usermod -aG docker $USER
# Odjavite se in prijavite ponovno
```

#### Docker daemon ni zagnan
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

## 📞 Podpora

Če imate težave z namestitvijo:

1. **Docker dokumentacija**: https://docs.docker.com/get-docker/
2. **Docker Community**: https://forums.docker.com/
3. **Stack Overflow**: https://stackoverflow.com/questions/tagged/docker

---

**Po uspešni namestitvi Docker-ja se vrnite k `README-DOCKER.md` za zagon Omni sistema!** 🚀