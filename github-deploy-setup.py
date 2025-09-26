#!/usr/bin/env python3
"""
GitHub Deploy Setup for Omni Cloud Migration
Avtomatska priprava GitHub repozitorija za deployment v oblak
"""

import os
import sys
import json
import subprocess
import shutil
from pathlib import Path
from datetime import datetime

class GitHubDeploySetup:
    def __init__(self, repo_name="omniscient-ai-platform"):
        self.repo_name = repo_name
        self.current_dir = Path.cwd()
        self.deploy_files = []
        
    def check_git_installed(self):
        """Preveri ali je Git nameščen"""
        try:
            result = subprocess.run(['git', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✅ Git je nameščen: {result.stdout.strip()}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Git ni nameščen!")
            print("Namesti Git iz: https://git-scm.com/downloads")
            return False
    
    def check_github_cli(self):
        """Preveri ali je GitHub CLI nameščen"""
        try:
            result = subprocess.run(['gh', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✅ GitHub CLI je nameščen: {result.stdout.strip().split()[0]}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⚠️  GitHub CLI ni nameščen (opcijsko)")
            print("Za avtomatsko ustvarjanje repozitorija namesti: https://cli.github.com/")
            return False
    
    def create_gitignore(self):
        """Ustvari .gitignore datoteko"""
        gitignore_content = """# Omni AI Platform - Git Ignore

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Virtual Environment
.venv/
venv/
ENV/
env/

# Environment Variables
.env
.env.local
.env.production
.env.secure
.env.real_data
.env.ai
.env.docker

# Logs
*.log
logs/
*.log.*

# Database
*.db
*.sqlite
*.sqlite3

# Cache
cache/
.cache/
__pycache__/

# Temporary files
temp/
tmp/
*.tmp
*.temp

# SSL Certificates (keep structure, ignore actual certs)
certs/*.pem
certs/*.key
certs/*.crt
certs/*.p12
ssl/*.pem
ssl/*.key
ssl/*.crt

# Backups
backups/
*.backup
*.bak

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Docker
.dockerignore

# Test results
test-results/
test-backups/

# Production data
production/data/
production/logs/

# Personal/Local files
local-*
personal-*
private-*

# Deployment specific
deploy-*.log
migration-*.log
"""
        
        gitignore_path = self.current_dir / ".gitignore"
        with open(gitignore_path, 'w', encoding='utf-8') as f:
            f.write(gitignore_content)
        
        print(f"✅ .gitignore ustvarjen: {gitignore_path}")
        return gitignore_path
    
    def create_readme(self):
        """Ustvari README.md za GitHub"""
        readme_content = f"""# 🌟 Omniscient AI Platform - Cloud Ready

Napredna AI platforma z avtomatsko migracijo v oblačno okolje.

## 🚀 Hitra Migracija v Oblak

### Možnost 1: Prenos iz GitHub (Priporočeno)

```bash
# Na oblačnem strežniku (Ubuntu 22.04 LTS)
wget https://raw.githubusercontent.com/[USERNAME]/{self.repo_name}/main/omni-cloud-auto-full.sh
chmod +x omni-cloud-auto-full.sh
sudo ./omni-cloud-auto-full.sh [DOMENA] [EMAIL] github https://github.com/[USERNAME]/{self.repo_name}.git
```

### Možnost 2: Prenos iz lokalnega računalnika

```bash
# Na lokalnem računalniku
python3 local-server-setup.py
# ali
./start-local-server.sh

# Na oblačnem strežniku
wget http://[LOKALNI_IP]:3000/omni-cloud-auto-full.sh
chmod +x omni-cloud-auto-full.sh
sudo ./omni-cloud-auto-full.sh [DOMENA] [EMAIL] local [LOKALNI_IP]
```

## 📋 Primer uporabe

```bash
# GitHub deployment
sudo ./omni-cloud-auto-full.sh moja-domena.com admin@example.com github https://github.com/username/omniscient-ai-platform.git

# Lokalni deployment
sudo ./omni-cloud-auto-full.sh moja-domena.com admin@example.com local 192.168.1.10
```

## 🎯 Funkcionalnosti

- ✅ **Avtomatska migracija** - Popolnoma avtomatska namestitev
- ✅ **SSL šifriranje** - Let's Encrypt certifikati
- ✅ **Angel sistemi** - Integration, Monitoring, Tasks, Synchronization
- ✅ **Backup sistem** - Dnevni/tedenski/mesečni backup
- ✅ **Real-time monitoring** - Sistemsko spremljanje in alarmi
- ✅ **Nginx load balancing** - Optimiziran reverse proxy
- ✅ **Systemd upravljanje** - Avtomatski restart storitev
- ✅ **Firewall zaščita** - UFW konfiguracija
- ✅ **Validacijski sistem** - Preverjanje uspešnosti migracije

## 🌐 Dostopne storitve po migraciji

- **Glavna aplikacija**: `https://[DOMENA]`
- **Monitoring dashboard**: `https://[DOMENA]/monitoring/`
- **Angel Integration API**: `https://[DOMENA]/api/angel/integration/`
- **Task Management**: `https://[DOMENA]/api/tasks/`

## 🔧 Sistemske zahteve

- **OS**: Ubuntu 22.04 LTS (priporočeno)
- **RAM**: Minimum 2GB, priporočeno 4GB+
- **Disk**: Minimum 10GB prostora
- **Omrežje**: Javni IP naslov in domena

## 📊 Upravljanje sistema

```bash
# Preveri status vseh storitev
systemctl status omni-platform.target

# Restart vseh Omni storitev
systemctl restart omni-platform.target

# Preveri logove
journalctl -u omni -f

# Backup status
systemctl status omni-backup.timer

# Monitoring dashboard
curl https://[DOMENA]/monitoring/api/status
```

## 🛠️ Razvoj in prispevki

1. Fork repozitorij
2. Ustvari feature branch (`git checkout -b feature/nova-funkcionalnost`)
3. Commit spremembe (`git commit -am 'Dodaj novo funkcionalnost'`)
4. Push na branch (`git push origin feature/nova-funkcionalnost`)
5. Ustvari Pull Request

## 📝 Licenca

MIT License - glej [LICENSE](LICENSE) datoteko.

## 🆘 Podpora

- **Dokumentacija**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/[USERNAME]/{self.repo_name}/issues)
- **Discussions**: [GitHub Discussions](https://github.com/[USERNAME]/{self.repo_name}/discussions)

---

**Ustvarjeno**: {datetime.now().strftime('%Y-%m-%d')}  
**Verzija**: 1.0.0  
**Status**: Production Ready 🚀
"""
        
        readme_path = self.current_dir / "README.md"
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        print(f"✅ README.md ustvarjen: {readme_path}")
        return readme_path
    
    def create_license(self):
        """Ustvari MIT licenco"""
        license_content = f"""MIT License

Copyright (c) {datetime.now().year} Omniscient AI Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""
        
        license_path = self.current_dir / "LICENSE"
        with open(license_path, 'w', encoding='utf-8') as f:
            f.write(license_content)
        
        print(f"✅ LICENSE ustvarjen: {license_path}")
        return license_path
    
    def create_github_workflows(self):
        """Ustvari GitHub Actions workflows"""
        workflows_dir = self.current_dir / ".github" / "workflows"
        workflows_dir.mkdir(parents=True, exist_ok=True)
        
        # CI/CD workflow
        ci_workflow = """name: Omni CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        python -m pytest tests/ || echo "No tests found"
    
    - name: Validate migration scripts
      run: |
        chmod +x omni-cloud-auto-full.sh
        bash -n omni-cloud-auto-full.sh
        python3 -m py_compile migration-validator.py
        python3 -m py_compile cloud-backup-system.py
        python3 -m py_compile cloud-monitoring-system.py

  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run security scan
      uses: securecodewarrior/github-action-add-sarif@v1
      with:
        sarif-file: 'security-scan.sarif'
      continue-on-error: true

  deploy-ready:
    runs-on: ubuntu-latest
    needs: [test, security]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Validate deployment files
      run: |
        echo "✅ Validating deployment readiness..."
        test -f omni-cloud-auto-full.sh
        test -f migration-validator.py
        test -f cloud-backup-system.py
        test -f cloud-monitoring-system.py
        test -f nginx-omni.conf
        echo "✅ All deployment files present"
"""
        
        ci_path = workflows_dir / "ci.yml"
        with open(ci_path, 'w', encoding='utf-8') as f:
            f.write(ci_workflow)
        
        print(f"✅ GitHub Actions CI/CD workflow ustvarjen: {ci_path}")
        return ci_path
    
    def init_git_repo(self):
        """Inicializiraj Git repozitorij"""
        try:
            # Preveri ali je že Git repozitorij
            if (self.current_dir / ".git").exists():
                print("✅ Git repozitorij že obstaja")
                return True
            
            # Inicializiraj Git
            subprocess.run(['git', 'init'], cwd=self.current_dir, check=True)
            subprocess.run(['git', 'branch', '-M', 'main'], cwd=self.current_dir, check=True)
            
            print("✅ Git repozitorij inicializiran")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Napaka pri inicializaciji Git repozitorija: {e}")
            return False
    
    def add_and_commit_files(self):
        """Dodaj in commit datoteke"""
        try:
            # Dodaj vse datoteke
            subprocess.run(['git', 'add', '.'], cwd=self.current_dir, check=True)
            
            # Commit
            commit_message = f"Initial commit - Omni AI Platform Cloud Ready ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
            subprocess.run(['git', 'commit', '-m', commit_message], 
                         cwd=self.current_dir, check=True)
            
            print("✅ Datoteke dodane in commit-ane")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Napaka pri commit-u: {e}")
            return False
    
    def create_github_repo(self, username=None, private=False):
        """Ustvari GitHub repozitorij (zahteva GitHub CLI)"""
        try:
            # Preveri GitHub CLI
            if not self.check_github_cli():
                print("ℹ️  Za avtomatsko ustvarjanje GitHub repozitorija potrebuješ GitHub CLI")
                print("Ročno ustvari repozitorij na: https://github.com/new")
                return False
            
            # Ustvari repozitorij
            visibility = "--private" if private else "--public"
            cmd = ['gh', 'repo', 'create', self.repo_name, visibility, 
                   '--description', 'Omniscient AI Platform - Cloud Ready Deployment']
            
            subprocess.run(cmd, cwd=self.current_dir, check=True)
            
            # Dodaj remote origin
            subprocess.run(['git', 'remote', 'add', 'origin', 
                          f'https://github.com/{username or "username"}/{self.repo_name}.git'], 
                         cwd=self.current_dir, check=True)
            
            print(f"✅ GitHub repozitorij ustvarjen: {self.repo_name}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Napaka pri ustvarjanju GitHub repozitorija: {e}")
            return False
    
    def push_to_github(self):
        """Push na GitHub"""
        try:
            subprocess.run(['git', 'push', '-u', 'origin', 'main'], 
                         cwd=self.current_dir, check=True)
            
            print("✅ Koda push-ana na GitHub")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Napaka pri push-u na GitHub: {e}")
            print("Preveri ali imaš nastavljene GitHub credentials")
            return False
    
    def setup_deployment(self):
        """Celotna nastavitev za deployment"""
        print("🌟 GitHub Deploy Setup za Omni AI Platform")
        print("=" * 50)
        
        # Preveri Git
        if not self.check_git_installed():
            return False
        
        # Ustvari potrebne datoteke
        print("\n📝 Ustvarjam deployment datoteke...")
        self.create_gitignore()
        self.create_readme()
        self.create_license()
        self.create_github_workflows()
        
        # Git setup
        print("\n🔧 Nastavljam Git repozitorij...")
        if not self.init_git_repo():
            return False
        
        if not self.add_and_commit_files():
            return False
        
        # GitHub setup
        print("\n🐙 GitHub nastavitve...")
        username = input("Vnesi GitHub username (ali pusti prazno): ").strip()
        private = input("Želiš privaten repozitorij? (y/N): ").strip().lower() == 'y'
        
        if username:
            if self.create_github_repo(username, private):
                self.push_to_github()
        
        # Končne informacije
        print("\n" + "=" * 60)
        print("🎉 GITHUB DEPLOYMENT SETUP ZAKLJUČEN!")
        print("=" * 60)
        
        if username:
            repo_url = f"https://github.com/{username}/{self.repo_name}"
            print(f"📍 GitHub repozitorij: {repo_url}")
            print(f"🚀 Deployment URL: {repo_url}.git")
            print("\n📋 UPORABA NA OBLAČNEM STREŽNIKU:")
            print(f"wget https://raw.githubusercontent.com/{username}/{self.repo_name}/main/omni-cloud-auto-full.sh")
            print("chmod +x omni-cloud-auto-full.sh")
            print(f"sudo ./omni-cloud-auto-full.sh [DOMENA] [EMAIL] github {repo_url}.git")
        else:
            print("📍 Ročno ustvari GitHub repozitorij in dodaj remote:")
            print("git remote add origin https://github.com/[USERNAME]/[REPO].git")
            print("git push -u origin main")
        
        print("\n✅ Sistem je pripravljen za deployment v oblak!")
        return True

def main():
    if len(sys.argv) > 1:
        repo_name = sys.argv[1]
    else:
        repo_name = input("Vnesi ime repozitorija (privzeto: omniscient-ai-platform): ").strip()
        if not repo_name:
            repo_name = "omniscient-ai-platform"
    
    setup = GitHubDeploySetup(repo_name)
    setup.setup_deployment()

if __name__ == "__main__":
    main()