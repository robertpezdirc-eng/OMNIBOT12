#!/usr/bin/env python3
"""
🌐 OMNI NGINX AUTO-CONFIGURATION SCRIPT
Avtomatska konfiguracija Nginx za Omni-Brain platformo
Integracija s Threo SSL sistemom in napredne varnostne nastavitve
"""

import os
import sys
import json
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

class OmniNginxConfigurator:
    def __init__(self, config_file: str = "omni-cloud-config.json"):
        self.config_file = config_file
        self.config = {}
        self.nginx_available = "/etc/nginx/sites-available"
        self.nginx_enabled = "/etc/nginx/sites-enabled"
        self.nginx_conf = "/etc/nginx/nginx.conf"
        self.ssl_dir = "/etc/letsencrypt/live"
        self.log_file = f"nginx-config-{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        
    def log(self, message: str, level: str = "INFO"):
        """Logging funkcija"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        print(log_entry)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + '\n')
    
    def error(self, message: str):
        """Error logging in exit"""
        self.log(message, "ERROR")
        sys.exit(1)
    
    def run_command(self, command: str, check: bool = True) -> subprocess.CompletedProcess:
        """Izvršitev sistemskega ukaza"""
        self.log(f"Izvršujem: {command}")
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                check=check
            )
            if result.stdout:
                self.log(f"Output: {result.stdout.strip()}")
            return result
        except subprocess.CalledProcessError as e:
            self.error(f"Napaka pri ukazu '{command}': {e}")
    
    def load_config(self):
        """Naloži konfiguracijo"""
        if not os.path.exists(self.config_file):
            self.error(f"Konfiguracija {self.config_file} ne obstaja")
        
        with open(self.config_file, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.log(f"Konfiguracija naložena iz {self.config_file}")
    
    def check_nginx_installed(self):
        """Preveri, ali je Nginx nameščen"""
        result = self.run_command("nginx -v", check=False)
        if result.returncode != 0:
            self.log("Nginx ni nameščen, nameščam...")
            self.run_command("apt-get update")
            self.run_command("apt-get install -y nginx")
        else:
            self.log("✅ Nginx je nameščen")
    
    def backup_existing_config(self):
        """Ustvari backup obstoječe konfiguracije"""
        backup_dir = f"/etc/nginx/backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if os.path.exists("/etc/nginx"):
            self.run_command(f"cp -r /etc/nginx {backup_dir}")
            self.log(f"✅ Backup ustvarjen: {backup_dir}")
    
    def generate_main_nginx_conf(self) -> str:
        """Generiraj glavno Nginx konfiguracijsko datoteko"""
        nginx_config = self.config.get('nginx', {})
        
        conf_content = f"""# 🌐 OMNI NGINX MAIN CONFIGURATION
# Avtomatsko generirano - {datetime.now().isoformat()}

user www-data;
worker_processes {nginx_config.get('worker_processes', 'auto')};
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {{
    worker_connections {nginx_config.get('worker_connections', 1024)};
    use epoll;
    multi_accept on;
}}

http {{
    # Osnovne nastavitve
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Client nastavitve
    client_max_body_size {nginx_config.get('client_max_body_size', '50M')};
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;
    
    # Buffer nastavitve
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    large_client_header_buffers 2 1k;
    
    # Gzip kompresija
    gzip {'on' if nginx_config.get('gzip_compression', True) else 'off'};
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate={nginx_config.get('rate_limiting', {}).get('api_requests_per_second', 10)}r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate={nginx_config.get('rate_limiting', {}).get('login_requests_per_minute', 5)}r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
    
    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_conn conn_limit_per_ip 20;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # SSL nastavitve
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # DH parameters
    ssl_dhparam /etc/nginx/dhparam.pem;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Cache nastavitve
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=omni_cache:10m max_size=1g inactive=60m use_temp_path=off;
    
    # Upstream za Omni
    upstream omni_backend {{
        server 127.0.0.1:3000;
        keepalive 32;
    }}
    
    # Vključi site konfiguracije
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}}"""
        
        return conf_content
    
    def generate_site_config(self, domain: str) -> str:
        """Generiraj site-specific konfiguracijsko datoteko"""
        nginx_config = self.config.get('nginx', {})
        security_headers = nginx_config.get('security_headers', {})
        
        # Preveri, ali SSL certifikat obstaja
        ssl_cert_path = f"{self.ssl_dir}/{domain}/fullchain.pem"
        ssl_key_path = f"{self.ssl_dir}/{domain}/privkey.pem"
        ssl_available = os.path.exists(ssl_cert_path) and os.path.exists(ssl_key_path)
        
        conf_content = f"""# 🌐 OMNI SITE CONFIGURATION FOR {domain.upper()}
# Avtomatsko generirano - {datetime.now().isoformat()}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_{domain.replace('.', '_')}:10m rate={nginx_config.get('rate_limiting', {}).get('api_requests_per_second', 10)}r/s;
limit_req_zone $binary_remote_addr zone=login_{domain.replace('.', '_')}:10m rate={nginx_config.get('rate_limiting', {}).get('login_requests_per_minute', 5)}r/m;

# HTTP server - preusmeritev na HTTPS
server {{
    listen 80;
    listen [::]:80;
    server_name {domain};
    
    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {{
        root /var/www/html;
        try_files $uri =404;
    }}
    
    # Preusmeritev na HTTPS
    location / {{
        return 301 https://$server_name$request_uri;
    }}
}}

# HTTPS server
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name {domain};
    
    # SSL certifikati"""
        
        if ssl_available:
            conf_content += f"""
    ssl_certificate {ssl_cert_path};
    ssl_certificate_key {ssl_key_path};
    ssl_trusted_certificate {self.ssl_dir}/{domain}/chain.pem;"""
        else:
            conf_content += f"""
    # SSL certifikati bodo nastavljeni s Threo SSL
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;"""
        
        conf_content += f"""
    
    # SSL varnostne nastavitve
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Varnostni headerji
    add_header Strict-Transport-Security "max-age={security_headers.get('hsts_max_age', 31536000)}; includeSubDomains; preload" always;
    add_header X-Frame-Options "{security_headers.get('frame_options', 'SAMEORIGIN')}" always;
    add_header X-Content-Type-Options "{security_headers.get('content_type_options', 'nosniff')}" always;
    add_header X-XSS-Protection "{security_headers.get('xss_protection', '1; mode=block')}" always;
    add_header Referrer-Policy "{security_headers.get('referrer_policy', 'strict-origin-when-cross-origin')}" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: ws:;" always;
    
    # Client nastavitve
    client_max_body_size {nginx_config.get('client_max_body_size', '50M')};
    
    # Timeout nastavitve
    proxy_connect_timeout {nginx_config.get('proxy_timeout', 60)}s;
    proxy_send_timeout {nginx_config.get('proxy_timeout', 60)}s;
    proxy_read_timeout {nginx_config.get('proxy_timeout', 60)}s;
    
    # Glavna aplikacija
    location / {{
        limit_req zone=general burst=50 nodelay;
        
        proxy_pass http://omni_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # Cache za statične datoteke
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {{
            expires {nginx_config.get('static_files_cache', '1y')};
            add_header Cache-Control "public, immutable";
            try_files $uri @proxy;
        }}
    }}
    
    # API endpoints z rate limiting
    location /api/ {{
        limit_req zone=api_{domain.replace('.', '_')} burst={nginx_config.get('rate_limiting', {}).get('burst_size', 20)} nodelay;
        
        proxy_pass http://omni_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API caching
        proxy_cache omni_cache;
        proxy_cache_methods GET HEAD;
        proxy_cache_valid 200 302 {nginx_config.get('api_cache_duration', '10m')};
        proxy_cache_valid 404 1m;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        add_header X-Cache-Status $upstream_cache_status;
    }}
    
    # Login endpoint z strožjim rate limiting
    location /api/auth/login {{
        limit_req zone=login_{domain.replace('.', '_')} burst=3 nodelay;
        
        proxy_pass http://omni_backend/api/auth/login;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
    
    # WebSocket podpora
    location /ws {{
        proxy_pass http://omni_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
    }}
    
    # Socket.IO podpora
    location /socket.io/ {{
        proxy_pass http://omni_backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
    
    # Health check endpoint
    location /health {{
        access_log off;
        proxy_pass http://omni_backend/health;
        proxy_set_header Host $host;
    }}
    
    # Status endpoint za monitoring
    location /nginx-status {{
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        allow ::1;
        deny all;
    }}
    
    # Blokiranje dostopa do občutljivih datotek
    location ~ /\\. {{
        deny all;
        access_log off;
        log_not_found off;
    }}
    
    location ~ \\.(env|config|ini|log|bak)$ {{
        deny all;
        access_log off;
        log_not_found off;
    }}
    
    # Fallback za statične datoteke
    location @proxy {{
        proxy_pass http://omni_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
    
    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /404.html {{
        root /var/www/html;
        internal;
    }}
    
    location = /50x.html {{
        root /var/www/html;
        internal;
    }}
}}"""
        
        return conf_content
    
    def create_dhparam(self):
        """Ustvari DH parameters za SSL"""
        dhparam_path = "/etc/nginx/dhparam.pem"
        
        if not os.path.exists(dhparam_path):
            self.log("Ustvarjam DH parameters (to lahko traja nekaj minut)...")
            self.run_command(f"openssl dhparam -out {dhparam_path} 2048")
            self.log("✅ DH parameters ustvarjeni")
        else:
            self.log("✅ DH parameters že obstajajo")
    
    def create_cache_directory(self):
        """Ustvari direktorij za cache"""
        cache_dir = "/var/cache/nginx"
        
        if not os.path.exists(cache_dir):
            self.run_command(f"mkdir -p {cache_dir}")
            self.run_command(f"chown -R www-data:www-data {cache_dir}")
            self.log("✅ Cache direktorij ustvarjen")
    
    def setup_log_rotation(self):
        """Nastavi log rotation za Nginx"""
        logrotate_config = """# Nginx log rotation
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \\
            run-parts /etc/logrotate.d/httpd-prerotate; \\
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}"""
        
        with open("/etc/logrotate.d/nginx", 'w') as f:
            f.write(logrotate_config)
        
        self.log("✅ Log rotation nastavljen")
    
    def configure_nginx(self):
        """Glavna funkcija za konfiguracijo Nginx"""
        domain = self.config['general']['domain']
        
        self.log(f"🌐 Konfiguriram Nginx za domeno: {domain}")
        
        # Preveri Nginx
        self.check_nginx_installed()
        
        # Backup
        self.backup_existing_config()
        
        # Ustvari glavno konfiguracijsko datoteko
        main_conf = self.generate_main_nginx_conf()
        with open(self.nginx_conf, 'w') as f:
            f.write(main_conf)
        self.log("✅ Glavna Nginx konfiguracija ustvarjena")
        
        # Ustvari site konfiguracijsko datoteko
        site_conf = self.generate_site_config(domain)
        site_conf_path = f"{self.nginx_available}/{domain}"
        
        with open(site_conf_path, 'w') as f:
            f.write(site_conf)
        self.log(f"✅ Site konfiguracija ustvarjena: {site_conf_path}")
        
        # Omogoči site
        enabled_link = f"{self.nginx_enabled}/{domain}"
        if os.path.exists(enabled_link):
            os.remove(enabled_link)
        os.symlink(site_conf_path, enabled_link)
        self.log("✅ Site omogočen")
        
        # Odstrani default site
        default_enabled = f"{self.nginx_enabled}/default"
        if os.path.exists(default_enabled):
            os.remove(default_enabled)
            self.log("✅ Default site odstranjen")
        
        # Ustvari potrebne direktorije in datoteke
        self.create_dhparam()
        self.create_cache_directory()
        self.setup_log_rotation()
        
        # Testiraj konfiguracijsko datoteko
        result = self.run_command("nginx -t", check=False)
        if result.returncode != 0:
            self.error("Nginx konfiguracija ni veljavna!")
        
        self.log("✅ Nginx konfiguracija je veljavna")
        
        # Ponovno naloži Nginx
        self.run_command("systemctl reload nginx")
        self.log("✅ Nginx ponovno naložen")
    
    def update_ssl_config(self, domain: str):
        """Posodobi SSL konfiguracijsko datoteko po namestitvi certifikata"""
        self.log(f"🔐 Posodabljam SSL konfiguracijsko datoteko za {domain}")
        
        # Ponovno generiraj site konfiguracijsko datoteko
        site_conf = self.generate_site_config(domain)
        site_conf_path = f"{self.nginx_available}/{domain}"
        
        with open(site_conf_path, 'w') as f:
            f.write(site_conf)
        
        # Testiraj in ponovno naloži
        result = self.run_command("nginx -t", check=False)
        if result.returncode == 0:
            self.run_command("systemctl reload nginx")
            self.log("✅ SSL konfiguracija posodobljena")
        else:
            self.error("Napaka pri posodobitvi SSL konfiguracije")
    
    def create_monitoring_config(self):
        """Ustvari monitoring konfiguracijsko datoteko"""
        monitoring_conf = """# Nginx monitoring configuration
server {
    listen 127.0.0.1:8080;
    server_name localhost;
    
    location /nginx-status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
    
    location /nginx-health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}"""
        
        with open("/etc/nginx/conf.d/monitoring.conf", 'w') as f:
            f.write(monitoring_conf)
        
        self.log("✅ Monitoring konfiguracija ustvarjena")
    
    def generate_status_report(self) -> Dict:
        """Generiraj poročilo o stanju Nginx"""
        domain = self.config['general']['domain']
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "domain": domain,
            "nginx_version": "",
            "config_test": False,
            "service_status": False,
            "ssl_certificate": False,
            "site_enabled": False,
            "log_file": self.log_file
        }
        
        # Nginx verzija
        try:
            result = self.run_command("nginx -v", check=False)
            if result.returncode == 0:
                report["nginx_version"] = result.stderr.strip()
        except:
            pass
        
        # Config test
        try:
            result = self.run_command("nginx -t", check=False)
            report["config_test"] = result.returncode == 0
        except:
            pass
        
        # Service status
        try:
            result = self.run_command("systemctl is-active nginx", check=False)
            report["service_status"] = result.stdout.strip() == "active"
        except:
            pass
        
        # SSL certifikat
        ssl_cert_path = f"{self.ssl_dir}/{domain}/fullchain.pem"
        report["ssl_certificate"] = os.path.exists(ssl_cert_path)
        
        # Site enabled
        enabled_link = f"{self.nginx_enabled}/{domain}"
        report["site_enabled"] = os.path.exists(enabled_link)
        
        return report

def main():
    """Glavna funkcija"""
    if os.geteuid() != 0:
        print("Ta skripta mora biti zagnana kot root (sudo)")
        sys.exit(1)
    
    configurator = OmniNginxConfigurator()
    
    try:
        configurator.load_config()
        configurator.configure_nginx()
        configurator.create_monitoring_config()
        
        # Generiraj poročilo
        report = configurator.generate_status_report()
        
        report_file = f"nginx-config-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        configurator.log("🎉 NGINX KONFIGURACIJA KONČANA!")
        configurator.log(f"📊 Poročilo shranjeno: {report_file}")
        
        if report["config_test"] and report["service_status"]:
            configurator.log("✅ Nginx je uspešno konfiguriran in deluje")
        else:
            configurator.log("⚠️ Preverite stanje Nginx storitve")
        
    except KeyboardInterrupt:
        configurator.log("Konfiguracija prekinjena s strani uporabnika")
        sys.exit(1)
    except Exception as e:
        configurator.error(f"Nepričakovana napaka: {e}")

if __name__ == "__main__":
    main()