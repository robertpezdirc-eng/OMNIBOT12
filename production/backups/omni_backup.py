#!/usr/bin/env python3
import os
import shutil
import datetime
import zipfile
import json

class OmniBackup:
    def __init__(self):
        self.backup_dir = "production/backups"
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def create_backup(self):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"omni_backup_{timestamp}"
        backup_path = os.path.join(self.backup_dir, f"{backup_name}.zip")
        
        print(f"Creating backup: {backup_name}")
        
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Backup databases
            for db_file in ["finance.db", "tourism.db", "devops.db", "omni_analytics.db", "omni_multitenant.db"]:
                if os.path.exists(db_file):
                    zipf.write(db_file, f"databases/{db_file}")
            
            # Backup configuration files
            config_files = ["config.json", "metadata.json"]
            for config_file in config_files:
                if os.path.exists(config_file):
                    zipf.write(config_file, f"config/{config_file}")
            
            # Backup data directory
            if os.path.exists("data"):
                for root, dirs, files in os.walk("data"):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, ".")
                        zipf.write(file_path, arcname)
            
            # Backup production config
            if os.path.exists("production/config"):
                for root, dirs, files in os.walk("production/config"):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, ".")
                        zipf.write(file_path, arcname)
        
        # Create backup manifest
        manifest = {
            "backup_name": backup_name,
            "timestamp": datetime.datetime.now().isoformat(),
            "backup_path": backup_path,
            "size_mb": round(os.path.getsize(backup_path) / (1024*1024), 2)
        }
        
        manifest_path = os.path.join(self.backup_dir, f"{backup_name}_manifest.json")
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Backup created: {backup_path} ({manifest['size_mb']} MB)")
        return backup_path
    
    def cleanup_old_backups(self, keep_days=7):
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=keep_days)
        
        for filename in os.listdir(self.backup_dir):
            if filename.startswith("omni_backup_") and filename.endswith(".zip"):
                file_path = os.path.join(self.backup_dir, filename)
                file_time = datetime.datetime.fromtimestamp(os.path.getctime(file_path))
                
                if file_time < cutoff_date:
                    os.remove(file_path)
                    # Also remove manifest
                    manifest_file = filename.replace(".zip", "_manifest.json")
                    manifest_path = os.path.join(self.backup_dir, manifest_file)
                    if os.path.exists(manifest_path):
                        os.remove(manifest_path)
                    print(f"🗑️ Removed old backup: {filename}")

if __name__ == "__main__":
    backup = OmniBackup()
    backup.create_backup()
    backup.cleanup_old_backups()
