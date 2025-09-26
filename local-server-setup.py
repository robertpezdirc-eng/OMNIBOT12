#!/usr/bin/env python3
"""
Local HTTP Server Setup for Omni Cloud Migration
Avtomatska nastavitev lokalnega HTTP strežnika za prenos datotek v oblak
"""

import os
import sys
import http.server
import socketserver
import threading
import time
import socket
import json
import zipfile
import hashlib
from pathlib import Path
from datetime import datetime

class OmniFileServer:
    def __init__(self, port=3000, directory=None):
        self.port = port
        self.directory = directory or os.getcwd()
        self.server = None
        self.thread = None
        self.running = False
        
    def get_local_ip(self):
        """Pridobi lokalni IP naslov"""
        try:
            # Poveži se z zunanjim naslovom da dobiš lokalni IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except:
            return "127.0.0.1"
    
    def create_file_manifest(self):
        """Ustvari manifest vseh datotek za prenos"""
        manifest = {
            "created": datetime.now().isoformat(),
            "server_ip": self.get_local_ip(),
            "server_port": self.port,
            "files": []
        }
        
        # Pomembne datoteke za Omni
        important_files = [
            "main.py", "omni.py", "omni_core.py", "omni_core_ai.py",
            "package.json", "requirements.txt", "config.json",
            "nginx-omni.conf", "threo-cloud-migration.sh",
            "systemd-services-setup.sh", "manage-services.sh",
            "cloud-backup-system.py", "cloud-monitoring-system.py",
            "migration-validator.py", "omni-cloud-auto-full.sh"
        ]
        
        # Pomembni direktoriji
        important_dirs = [
            "omni", "client", "server", "public", "api", 
            "utils", "scripts", "config", "data"
        ]
        
        # Dodaj datoteke
        for file_name in important_files:
            file_path = Path(self.directory) / file_name
            if file_path.exists():
                file_info = {
                    "name": file_name,
                    "type": "file",
                    "size": file_path.stat().st_size,
                    "url": f"http://{self.get_local_ip()}:{self.port}/{file_name}",
                    "checksum": self.calculate_checksum(file_path)
                }
                manifest["files"].append(file_info)
        
        # Dodaj direktorije
        for dir_name in important_dirs:
            dir_path = Path(self.directory) / dir_name
            if dir_path.exists() and dir_path.is_dir():
                # Ustvari ZIP arhiv direktorija
                zip_name = f"{dir_name}.zip"
                zip_path = Path(self.directory) / zip_name
                self.create_directory_zip(dir_path, zip_path)
                
                if zip_path.exists():
                    dir_info = {
                        "name": dir_name,
                        "type": "directory",
                        "archive": zip_name,
                        "size": zip_path.stat().st_size,
                        "url": f"http://{self.get_local_ip()}:{self.port}/{zip_name}",
                        "checksum": self.calculate_checksum(zip_path)
                    }
                    manifest["files"].append(dir_info)
        
        # Shrani manifest
        manifest_path = Path(self.directory) / "omni-manifest.json"
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        return manifest
    
    def calculate_checksum(self, file_path):
        """Izračunaj SHA256 checksum datoteke"""
        sha256_hash = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except:
            return None
    
    def create_directory_zip(self, source_dir, zip_path):
        """Ustvari ZIP arhiv direktorija"""
        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(source_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, source_dir)
                        zipf.write(file_path, arcname)
            return True
        except Exception as e:
            print(f"Napaka pri ustvarjanju ZIP arhiva {zip_path}: {e}")
            return False
    
    def start_server(self):
        """Zaženi HTTP strežnik"""
        try:
            os.chdir(self.directory)
            
            class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
                def log_message(self, format, *args):
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")
                
                def end_headers(self):
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', '*')
                    super().end_headers()
            
            self.server = socketserver.TCPServer(("", self.port), CustomHTTPRequestHandler)
            self.running = True
            
            print(f"🚀 Omni File Server zagnan na portu {self.port}")
            print(f"📁 Direktorij: {self.directory}")
            print(f"🌐 Lokalni IP: {self.get_local_ip()}")
            print(f"🔗 URL: http://{self.get_local_ip()}:{self.port}")
            print("📋 Manifest: http://{self.get_local_ip()}:{self.port}/omni-manifest.json")
            print("\n" + "="*60)
            print("NAVODILA ZA UPORABO:")
            print("="*60)
            print(f"1. Na oblačnem strežniku zaženi:")
            print(f"   wget http://{self.get_local_ip()}:{self.port}/omni-cloud-auto-full.sh")
            print(f"   chmod +x omni-cloud-auto-full.sh")
            print(f"   sudo ./omni-cloud-auto-full.sh [domena] [email] local {self.get_local_ip()}")
            print("\n2. Primer:")
            print(f"   sudo ./omni-cloud-auto-full.sh moja-domena.com admin@example.com local {self.get_local_ip()}")
            print("\n3. Strežnik bo avtomatsko prenesel vse potrebne datoteke")
            print("="*60)
            print("\nPritisnite Ctrl+C za ustavitev strežnika")
            
            self.server.serve_forever()
            
        except KeyboardInterrupt:
            self.stop_server()
        except Exception as e:
            print(f"Napaka pri zagonu strežnika: {e}")
            self.running = False
    
    def stop_server(self):
        """Ustavi HTTP strežnik"""
        if self.server:
            print("\n🛑 Ustavljam strežnik...")
            self.server.shutdown()
            self.server.server_close()
            self.running = False
            print("✅ Strežnik ustavljen")

def main():
    print("🌟 Omni Local File Server Setup")
    print("=" * 40)
    
    # Preveri ali smo v pravilnem direktoriju
    current_dir = os.getcwd()
    omni_files = ["main.py", "omni.py", "package.json"]
    
    if not any(os.path.exists(f) for f in omni_files):
        print("⚠️  Nisi v Omni direktoriju!")
        print("Premakni se v direktorij z Omni datotekami in ponovno zaženi skripto.")
        return
    
    # Nastavi port
    port = 3000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Napačen port. Uporabljam privzeti port 3000.")
    
    # Ustvari strežnik
    server = OmniFileServer(port=port, directory=current_dir)
    
    # Ustvari manifest
    print("📋 Ustvarjam manifest datotek...")
    manifest = server.create_file_manifest()
    print(f"✅ Manifest ustvarjen z {len(manifest['files'])} datotekami")
    
    # Zaženi strežnik
    try:
        server.start_server()
    except KeyboardInterrupt:
        print("\n👋 Nasvidenje!")

if __name__ == "__main__":
    main()