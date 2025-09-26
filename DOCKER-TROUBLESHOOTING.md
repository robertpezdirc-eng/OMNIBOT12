# Docker Troubleshooting Guide

## 🔍 Diagnostika problema

### Ugotovitve:
- ✅ **Docker CLI nameščen** - verzija 28.4.0
- ✅ **Docker Desktop aplikacija obstaja** na `C:\Program Files\Docker\Docker\Docker Desktop.exe`
- ✅ **Docker PATH spremenljivke pravilno nastavljene**
- ✅ **Docker Desktop procesi tečejo** (`com.docker.backend`, `com.docker.build`, `Docker Desktop`)
- ✅ **Windows verzija kompatibilna** - Windows 10 Pro verzija 2009 (build 19041) - podpira WSL2
- ❌ **Docker daemon ne deluje** - napaka: "Docker Desktop is unable to start"
- ❌ **WSL2 ni nameščen** - sporočilo: "Windows Subsystem for Linux has no installed distributions"
- ❌ **Virtualizacija ni omogočena v BIOS** - HyperVRequirementVirtualizationFirmwareEnabled: False

### Glavni vzrok:
Docker Desktop na Windows potrebuje **WSL2** (Windows Subsystem for Linux 2) za delovanje daemon-a.

## 🚨 Glavni problem: WSL2 manjka

## 🛠️ Rešitve (po prioriteti)

### ⚠️ POMEMBNO: Virtualizacija v BIOS
**PRED namestitvijo WSL2 morate omogočiti virtualizacijo v BIOS!**

1. **Ponovno zaženite računalnik** in pritisnite `F2`, `F12`, `Del` ali `Esc` (odvisno od proizvajalca) za vstop v BIOS
2. **Poiščite nastavitve virtualizacije:**
   - Intel: "Intel Virtualization Technology" ali "VT-x"
   - AMD: "AMD-V" ali "SVM Mode"
3. **Omogočite virtualizacijo** in shranite nastavitve
4. **Ponovno zaženite računalnik**

### 🎯 Rešitev 1: Namestitev WSL2 (PRIPOROČENO)

**Korak 1: Odprite PowerShell kot Administrator** <mcreference link="https://docs.docker.com/desktop/features/wsl/" index="1">1</mcreference> <mcreference link="https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-containers" index="2">2</mcreference>
```powershell
# Desni klik na Start → Windows PowerShell (Admin)
```

**Korak 2: Omogočite WSL funkcionalnost** <mcreference link="https://gist.github.com/miliarch/59953116f1e919b1e5ad4ed23fae7d29" index="3">3</mcreference>
```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
```

**Korak 3: Omogočite Virtual Machine Platform** <mcreference link="http://oak.cs.ucla.edu/refs/docker/wsl2.html" index="5">5</mcreference>
```powershell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

**Korak 4: Ponovno zaženite računalnik**
```powershell
Restart-Computer
```

**Korak 5: Prenesite in namestite WSL2 Linux kernel** <mcreference link="https://docs.docker.com/desktop/setup/install/windows-install/" index="4">4</mcreference>
- Pojdite na: https://docs.microsoft.com/en-us/windows/wsl/wsl2-kernel
- Prenesite `wsl_update_x64.msi`
- Zaženite installer

**Korak 6: Nastavite WSL2 kot privzeto verzijo** <mcreference link="https://gist.github.com/miliarch/59953116f1e919b1e5ad4ed23fae7d29" index="3">3</mcreference>
```powershell
wsl --set-default-version 2
```

**Korak 7: Namestite Ubuntu distribucijo** <mcreference link="https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-containers" index="2">2</mcreference>
```powershell
wsl --install -d Ubuntu
```

**Korak 8: Ponovno zaženite Docker Desktop**
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

**Korak 9: Konfigurirajte Docker Desktop za WSL2** <mcreference link="https://docs.docker.com/desktop/features/wsl/" index="1">1</mcreference>
1. Odprite Docker Desktop
2. Pojdite na Settings → General
3. Preverite, da je "Use WSL 2 based engine" omogočeno
4. Pojdite na Settings → Resources → WSL Integration
5. Omogočite integracijo z Ubuntu distribucijo

### Rešitev 2: Preklopi na Hyper-V backend (alternativa)

Če WSL2 ne deluje, lahko poskusiš s Hyper-V:

1. Odpri Docker Desktop Settings
2. Pojdi na General
3. Odznači "Use the WSL 2 based engine"
4. Ponovno zaženi Docker Desktop

## Alternativne rešitve

Če namestitev WSL2 ni možna ali ne deluje:

### 1. Podman Desktop (PRIPOROČENO)
**Najboljša alternativa Docker Desktop za Windows**

**Prednosti:**
- Daemonless arhitektura (brez ozadnjega procesa)
- Boljša varnost (rootless containers)
- Kompatibilnost z Docker ukazi
- Grafični vmesnik podoben Docker Desktop
- Manjša poraba virov

**Namestitev:**
1. Prenesite Podman Desktop z https://podman-desktop.io/
2. Zaženite installer (ne potrebuje administratorskih pravic)
3. Podman Desktop bo samodejno poskusil namestiti WSL2
4. Če WSL2 ni na voljo, lahko uporabi Hyper-V backend

**Sistemske zahteve:**
- Windows 10/11
- 6 GB RAM
- WSL2 ali Hyper-V (Podman Desktop poskuša samodejno konfigurirati)

### 2. Docker Toolbox (zastarelo, vendar še vedno deluje)
- Uporablja VirtualBox namesto WSL2
- Deluje na starih Windows verzijah
- Manj učinkovit kot moderne rešitve

### 3. Preklop na Hyper-V backend
- V Docker Desktop nastavitvah
- Zahteva omogočeno Hyper-V funkcionalnost
- Alternativa WSL2 backend-u

### 4. Uporaba Docker v virtualni mašini
- VirtualBox ali VMware z Linux distribucijo
- Popolna izolacija
- Večja poraba virov

### 5. Rancher Desktop
- Odprtokodna alternativa
- Vgrajena podpora za Kubernetes
- Kompatibilnost z Docker CLI

### Rešitev 3: Popolna ponovna namestitev Docker-ja

Če zgornje ne deluje:

#### Korak 1: Odstrani Docker Desktop
```powershell
# Najdi Docker v Apps & Features in ga odstrani
Get-WmiObject -Class Win32_Product | Where-Object {$_.Name -like "*Docker*"} | ForEach-Object {$_.Uninstall()}
```

#### Korak 2: Počisti ostanke
```powershell
# Odstrani Docker mape
Remove-Item -Path "$env:APPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue
```

#### Korak 3: Prenesi najnovejši Docker Desktop
Pojdi na https://www.docker.com/products/docker-desktop/ in prenesi najnovejšo verzijo.

## 🔧 Hitri test po namestitvi

Ko je WSL2 nameščen in Docker Desktop ponovno zagnan:

```powershell
# Preveri Docker verzijo
docker --version

# Preveri Docker daemon
docker info

# Zaženi test container
docker run hello-world
```

## 📋 Preverjanje WSL2 namestitve

```powershell
# Preveri WSL verzijo
wsl --list --verbose

# Preveri WSL status
wsl --status
```

## ⚠️ Možne dodatne težave

### Virtualizacija ni omogočena
Če dobiš napako o virtualizaciji:
1. Ponovno zaženi računalnik
2. Pojdi v BIOS/UEFI nastavitve
3. Omogoči Intel VT-x ali AMD-V
4. Omogoči Hyper-V (če je na voljo)

### Pomanjkanje pomnilnika
Docker Desktop potrebuje vsaj:
- 4 GB RAM
- 2 GB prostora na disku

### Antivirus blokira Docker
Nekateri antivirusi blokirajo Docker:
1. Dodaj Docker mape v izjeme antivirusa
2. Začasno onemogoči real-time protection med namestitvijo

## 🎯 Naslednji koraki

1. **Najprej poskusi Rešitev 1** (WSL2 namestitev)
2. **Če ne deluje, poskusi Rešitev 2** (Hyper-V)
3. **Zadnja možnost je Rešitev 3** (ponovna namestitev)

## 📞 Dodatna pomoč

Če še vedno imaš težave:
1. Preveri Docker Desktop loge v `%APPDATA%\Docker\log.txt`
2. Zaženi Docker Desktop z verbose logging
3. Preveri Windows Event Viewer za Docker napake

## ✅ Uspešna namestitev

Ko Docker deluje, boš videl:
```
Client: Docker Engine - Community
 Version:           28.4.0
 API version:       1.51
 Go version:        go1.24.7

Server: Docker Desktop
 Engine:
  Version:          28.4.0
  API version:      1.51 (minimum version 1.24)
```

Nato lahko uporabljaš Docker ukaze normalno!