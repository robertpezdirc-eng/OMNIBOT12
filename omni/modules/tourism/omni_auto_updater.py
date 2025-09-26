#!/usr/bin/env python3
"""
OMNI Auto Updater - Sistem samodejnih posodobitev
Client aplikacija se nadgradi brez ročnega posega uporabnika
"""

import os
import json
import hashlib
import requests
import zipfile
import shutil
import subprocess
import threading
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
import sqlite3
from packaging import version
import tempfile
import logging

class OmniAutoUpdater:
    def __init__(self):
        self.app = Flask(__name__)
        self.db_path = "omni_updates.db"
        self.current_version = "1.0.0"
        self.update_server_url = "https://updates.omni-cloud.com"  # Demo URL
        self.backup_dir = "backups"
        self.temp_dir = "temp_updates"
        
        # Update channels
        self.update_channels = {
            "stable": {"name": "Stable", "description": "Stabilne posodobitve, testirane"},
            "beta": {"name": "Beta", "description": "Beta različice z novimi funkcijami"},
            "dev": {"name": "Development", "description": "Razvojne različice (samo za testiranje)"}
        }
        
        # Component versions
        self.components = {
            "core": {"version": "1.0.0", "critical": True},
            "ui": {"version": "1.0.0", "critical": False},
            "plugins": {"version": "1.0.0", "critical": False},
            "database": {"version": "1.0.0", "critical": True}
        }
        
        self.setup_logging()
        self.init_database()
        self.setup_routes()
        self.start_update_monitor()
        
    def setup_logging(self):
        """Setup logging for update operations"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('omni_updater.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def init_database(self):
        """Initialize update database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Updates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS updates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL,
                channel TEXT DEFAULT 'stable',
                component TEXT,
                release_date TIMESTAMP,
                download_url TEXT,
                changelog TEXT,
                file_hash TEXT,
                file_size INTEGER,
                status TEXT DEFAULT 'available',
                installed_at TIMESTAMP,
                rollback_available BOOLEAN DEFAULT 1
            )
        ''')
        
        # Update history
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS update_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version_from TEXT,
                version_to TEXT,
                component TEXT,
                update_type TEXT,
                status TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                error_message TEXT,
                rollback_performed BOOLEAN DEFAULT 0
            )
        ''')
        
        # System settings
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS update_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert demo updates
        demo_updates = [
            {
                "version": "1.0.1",
                "channel": "stable",
                "component": "core",
                "release_date": datetime.now().isoformat(),
                "changelog": "Popravki varnosti in izboljšave performanc",
                "file_size": 2048000
            },
            {
                "version": "1.1.0",
                "channel": "stable", 
                "component": "ui",
                "release_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "changelog": "Nov uporabniški vmesnik z izboljšano navigacijo",
                "file_size": 5120000
            },
            {
                "version": "1.2.0",
                "channel": "beta",
                "component": "plugins",
                "release_date": (datetime.now() + timedelta(days=14)).isoformat(),
                "changelog": "Beta: AI analitika in napredni poročila",
                "file_size": 8192000
            }
        ]
        
        for update in demo_updates:
            try:
                cursor.execute('''
                    INSERT OR IGNORE INTO updates 
                    (version, channel, component, release_date, changelog, file_size, download_url, file_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    update["version"],
                    update["channel"],
                    update["component"],
                    update["release_date"],
                    update["changelog"],
                    update["file_size"],
                    f"https://updates.omni-cloud.com/{update['component']}/{update['version']}.zip",
                    hashlib.sha256(f"demo_hash_{update['version']}".encode()).hexdigest()
                ))
            except Exception as e:
                self.logger.error(f"Error inserting demo update: {e}")
        
        # Default settings
        default_settings = [
            ("auto_update_enabled", "true"),
            ("update_channel", "stable"),
            ("check_interval_hours", "24"),
            ("backup_before_update", "true"),
            ("rollback_enabled", "true"),
            ("maintenance_window_start", "02:00"),
            ("maintenance_window_end", "04:00")
        ]
        
        for key, value in default_settings:
            cursor.execute('''
                INSERT OR IGNORE INTO update_settings (key, value) VALUES (?, ?)
            ''', (key, value))
        
        conn.commit()
        conn.close()
        self.logger.info("✅ Update database initialized")
        
    def check_for_updates(self):
        """Check for available updates"""
        try:
            # Simulate checking update server
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current channel setting
            cursor.execute('SELECT value FROM update_settings WHERE key = "update_channel"')
            channel_result = cursor.fetchone()
            channel = channel_result[0] if channel_result else "stable"
            
            # Get available updates for current channel
            cursor.execute('''
                SELECT * FROM updates 
                WHERE channel = ? AND status = 'available'
                ORDER BY release_date DESC
            ''', (channel,))
            
            available_updates = cursor.fetchall()
            conn.close()
            
            updates_list = []
            for update in available_updates:
                # Check if this is a newer version
                if version.parse(update[1]) > version.parse(self.components.get(update[3], {}).get("version", "0.0.0")):
                    updates_list.append({
                        "id": update[0],
                        "version": update[1],
                        "channel": update[2],
                        "component": update[3],
                        "release_date": update[4],
                        "changelog": update[6],
                        "file_size": update[8],
                        "critical": self.components.get(update[3], {}).get("critical", False)
                    })
            
            return updates_list
            
        except Exception as e:
            self.logger.error(f"Error checking for updates: {e}")
            return []
    
    def download_update(self, update_id):
        """Download update package"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM updates WHERE id = ?', (update_id,))
            update = cursor.fetchone()
            
            if not update:
                return {"success": False, "message": "Update not found"}
            
            # Create temp directory
            os.makedirs(self.temp_dir, exist_ok=True)
            
            # Simulate download (in real implementation, this would download from server)
            download_path = os.path.join(self.temp_dir, f"{update[3]}_{update[1]}.zip")
            
            # Create dummy update file for demo
            with zipfile.ZipFile(download_path, 'w') as zf:
                zf.writestr(f"{update[3]}_update.txt", f"Update {update[1]} for {update[3]}")
                zf.writestr("changelog.txt", update[6])
                zf.writestr("version.json", json.dumps({"version": update[1], "component": update[3]}))
            
            # Verify file hash (demo)
            with open(download_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            
            # Update status
            cursor.execute('''
                UPDATE updates SET status = 'downloaded' WHERE id = ?
            ''', (update_id,))
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"✅ Downloaded update {update[1]} for {update[3]}")
            return {"success": True, "path": download_path, "hash": file_hash}
            
        except Exception as e:
            self.logger.error(f"Error downloading update: {e}")
            return {"success": False, "message": str(e)}
    
    def create_backup(self, component):
        """Create backup before update"""
        try:
            os.makedirs(self.backup_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"{component}_{self.components[component]['version']}_{timestamp}"
            backup_path = os.path.join(self.backup_dir, backup_name)
            
            # Create backup directory
            os.makedirs(backup_path, exist_ok=True)
            
            # Simulate backing up component files
            backup_info = {
                "component": component,
                "version": self.components[component]["version"],
                "backup_date": datetime.now().isoformat(),
                "files": [f"{component}_main.py", f"{component}_config.json"]
            }
            
            with open(os.path.join(backup_path, "backup_info.json"), 'w') as f:
                json.dump(backup_info, f, indent=2)
            
            # Create dummy backup files
            for file_name in backup_info["files"]:
                with open(os.path.join(backup_path, file_name), 'w') as f:
                    f.write(f"# Backup of {file_name} - Version {self.components[component]['version']}")
            
            self.logger.info(f"✅ Created backup for {component} at {backup_path}")
            return {"success": True, "backup_path": backup_path}
            
        except Exception as e:
            self.logger.error(f"Error creating backup: {e}")
            return {"success": False, "message": str(e)}
    
    def install_update(self, update_id):
        """Install downloaded update"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM updates WHERE id = ?', (update_id,))
            update = cursor.fetchone()
            
            if not update:
                return {"success": False, "message": "Update not found"}
            
            component = update[3]
            new_version = update[1]
            old_version = self.components[component]["version"]
            
            # Log update start
            cursor.execute('''
                INSERT INTO update_history (version_from, version_to, component, update_type, status)
                VALUES (?, ?, ?, 'automatic', 'started')
            ''', (old_version, new_version, component))
            
            history_id = cursor.lastrowid
            
            # Create backup if enabled
            cursor.execute('SELECT value FROM update_settings WHERE key = "backup_before_update"')
            backup_enabled = cursor.fetchone()[0] == "true"
            
            if backup_enabled:
                backup_result = self.create_backup(component)
                if not backup_result["success"]:
                    cursor.execute('''
                        UPDATE update_history SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (f"Backup failed: {backup_result['message']}", history_id))
                    conn.commit()
                    conn.close()
                    return backup_result
            
            # Simulate installation process
            time.sleep(2)  # Simulate installation time
            
            # Update component version
            self.components[component]["version"] = new_version
            
            # Mark update as installed
            cursor.execute('''
                UPDATE updates SET status = 'installed', installed_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ''', (update_id,))
            
            # Update history
            cursor.execute('''
                UPDATE update_history SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (history_id,))
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"✅ Successfully installed update {new_version} for {component}")
            return {"success": True, "message": f"Update {new_version} installed successfully"}
            
        except Exception as e:
            self.logger.error(f"Error installing update: {e}")
            
            # Log error
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE update_history SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
                WHERE component = ? AND status = 'started'
            ''', (str(e), component))
            conn.commit()
            conn.close()
            
            return {"success": False, "message": str(e)}
    
    def rollback_update(self, component):
        """Rollback to previous version"""
        try:
            # Find latest backup
            if not os.path.exists(self.backup_dir):
                return {"success": False, "message": "No backups available"}
            
            backups = [d for d in os.listdir(self.backup_dir) if d.startswith(component)]
            if not backups:
                return {"success": False, "message": f"No backups found for {component}"}
            
            # Get latest backup
            latest_backup = sorted(backups)[-1]
            backup_path = os.path.join(self.backup_dir, latest_backup)
            
            # Load backup info
            with open(os.path.join(backup_path, "backup_info.json"), 'r') as f:
                backup_info = json.load(f)
            
            # Simulate rollback
            old_version = self.components[component]["version"]
            rollback_version = backup_info["version"]
            
            self.components[component]["version"] = rollback_version
            
            # Log rollback
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO update_history (version_from, version_to, component, update_type, status, rollback_performed)
                VALUES (?, ?, ?, 'rollback', 'completed', 1)
            ''', (old_version, rollback_version, component))
            conn.commit()
            conn.close()
            
            self.logger.info(f"✅ Successfully rolled back {component} from {old_version} to {rollback_version}")
            return {"success": True, "message": f"Rolled back to version {rollback_version}"}
            
        except Exception as e:
            self.logger.error(f"Error during rollback: {e}")
            return {"success": False, "message": str(e)}
    
    def start_update_monitor(self):
        """Start background update monitoring"""
        def monitor_updates():
            while True:
                try:
                    # Check if auto-update is enabled
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    
                    cursor.execute('SELECT value FROM update_settings WHERE key = "auto_update_enabled"')
                    auto_update = cursor.fetchone()[0] == "true"
                    
                    cursor.execute('SELECT value FROM update_settings WHERE key = "check_interval_hours"')
                    interval_hours = int(cursor.fetchone()[0])
                    
                    conn.close()
                    
                    if auto_update:
                        # Check for updates
                        available_updates = self.check_for_updates()
                        
                        for update in available_updates:
                            if update["critical"]:
                                # Auto-install critical updates
                                self.logger.info(f"Installing critical update: {update['version']} for {update['component']}")
                                
                                download_result = self.download_update(update["id"])
                                if download_result["success"]:
                                    install_result = self.install_update(update["id"])
                                    if install_result["success"]:
                                        self.logger.info(f"Critical update installed: {update['version']}")
                                    else:
                                        self.logger.error(f"Failed to install critical update: {install_result['message']}")
                    
                except Exception as e:
                    self.logger.error(f"Update monitor error: {e}")
                
                # Wait for next check
                time.sleep(interval_hours * 3600)
        
        monitor_thread = threading.Thread(target=monitor_updates, daemon=True)
        monitor_thread.start()
        self.logger.info("🔄 Update monitor started")
    
    def setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def dashboard():
            return render_template_string('''
<!DOCTYPE html>
<html lang="sl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMNI Auto Updater</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.3s ease; }
        .card:hover { transform: translateY(-5px); }
        .card h3 { color: #333; margin-bottom: 15px; font-size: 1.3em; }
        .version-info { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; margin-bottom: 10px; }
        .version-current { color: #28a745; font-weight: bold; }
        .version-available { color: #007bff; font-weight: bold; }
        .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.3s ease; margin: 5px; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .btn-success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
        .btn-warning { background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); }
        .btn-danger { background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%); }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status.available { background: #007bff; color: white; }
        .status.downloaded { background: #ffc107; color: black; }
        .status.installed { background: #28a745; color: white; }
        .update-item { padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; }
        .update-item.critical { border-color: #dc3545; background: #fff5f5; }
        .settings-form { background: white; border-radius: 15px; padding: 25px; margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
        .progress-bar { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s ease; }
        .log-container { background: #1a1a1a; color: #00ff00; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; max-height: 300px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 OMNI Auto Updater</h1>
            <p>Sistem samodejnih posodobitev - client app se nadgradi brez ročnega posega</p>
        </div>
        
        <div class="dashboard">
            <div class="card">
                <h3>📊 Trenutne različice</h3>
                <div id="currentVersions"></div>
            </div>
            
            <div class="card">
                <h3>⚙️ Nastavitve posodobitev</h3>
                <div id="updateSettings"></div>
            </div>
            
            <div class="card">
                <h3>📈 Statistike</h3>
                <div id="updateStats"></div>
            </div>
        </div>
        
        <div class="card">
            <h3>🔍 Razpoložljive posodobitve</h3>
            <button class="btn" onclick="checkForUpdates()">Preveri posodobitve</button>
            <div id="availableUpdates" style="margin-top: 20px;"></div>
        </div>
        
        <div class="card">
            <h3>📋 Zgodovina posodobitev</h3>
            <div id="updateHistory"></div>
        </div>
        
        <div class="card">
            <h3>📝 Update Log</h3>
            <div class="log-container" id="updateLog">
                <div>Sistem pripravljan...</div>
            </div>
        </div>
    </div>

    <script>
        let updateInterval;
        
        async function loadData() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                // Update current versions
                const versionsDiv = document.getElementById('currentVersions');
                versionsDiv.innerHTML = '';
                Object.entries(data.components).forEach(([component, info]) => {
                    const div = document.createElement('div');
                    div.className = 'version-info';
                    div.innerHTML = `
                        <span><strong>${component.toUpperCase()}</strong></span>
                        <span class="version-current">v${info.version}</span>
                        ${info.critical ? '<span style="color: #dc3545;">⚠️ Critical</span>' : ''}
                    `;
                    versionsDiv.appendChild(div);
                });
                
                // Update settings
                const settingsDiv = document.getElementById('updateSettings');
                settingsDiv.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <strong>Auto-update:</strong> ${data.settings.auto_update_enabled ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Channel:</strong> ${data.settings.update_channel.toUpperCase()}
                    </div>
                    <div>
                        <strong>Check interval:</strong> ${data.settings.check_interval_hours}h
                    </div>
                `;
                
                // Update stats
                const statsDiv = document.getElementById('updateStats');
                statsDiv.innerHTML = `
                    <div style="margin-bottom: 10px;">📦 Skupaj posodobitev: <strong>${data.stats.total_updates}</strong></div>
                    <div style="margin-bottom: 10px;">✅ Nameščenih: <strong>${data.stats.installed_updates}</strong></div>
                    <div style="margin-bottom: 10px;">⏳ Na voljo: <strong>${data.stats.available_updates}</strong></div>
                    <div>🔄 Zadnja preveritev: <strong>${data.stats.last_check || 'Nikoli'}</strong></div>
                `;
                
            } catch (error) {
                console.error('Error loading data:', error);
            }
        }
        
        async function checkForUpdates() {
            try {
                const response = await fetch('/api/check-updates');
                const updates = await response.json();
                
                const updatesDiv = document.getElementById('availableUpdates');
                updatesDiv.innerHTML = '';
                
                if (updates.length === 0) {
                    updatesDiv.innerHTML = '<p>✅ Ni razpoložljivih posodobitev</p>';
                    return;
                }
                
                updates.forEach(update => {
                    const div = document.createElement('div');
                    div.className = `update-item ${update.critical ? 'critical' : ''}`;
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${update.component.toUpperCase()} v${update.version}</strong>
                                <span class="status available">Available</span>
                                ${update.critical ? '<span style="color: #dc3545; margin-left: 10px;">⚠️ CRITICAL</span>' : ''}
                                <div style="margin-top: 5px; color: #666; font-size: 0.9em;">
                                    ${update.changelog}
                                </div>
                                <div style="margin-top: 5px; color: #666; font-size: 0.8em;">
                                    Velikost: ${(update.file_size / 1024 / 1024).toFixed(1)} MB
                                </div>
                            </div>
                            <div>
                                <button class="btn btn-success" onclick="installUpdate(${update.id})">Namesti</button>
                            </div>
                        </div>
                    `;
                    updatesDiv.appendChild(div);
                });
                
            } catch (error) {
                console.error('Error checking updates:', error);
            }
        }
        
        async function installUpdate(updateId) {
            try {
                // Show progress
                const logDiv = document.getElementById('updateLog');
                logDiv.innerHTML += `<div>🔄 Začenjam namestitev posodobitve ID: ${updateId}...</div>`;
                logDiv.scrollTop = logDiv.scrollHeight;
                
                // Download update
                logDiv.innerHTML += `<div>📥 Prenašam posodobitev...</div>`;
                logDiv.scrollTop = logDiv.scrollHeight;
                
                const downloadResponse = await fetch('/api/download-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ update_id: updateId })
                });
                
                const downloadResult = await downloadResponse.json();
                if (!downloadResult.success) {
                    logDiv.innerHTML += `<div style="color: #ff6b6b;">❌ Napaka pri prenosu: ${downloadResult.message}</div>`;
                    return;
                }
                
                logDiv.innerHTML += `<div>✅ Prenos končan</div>`;
                logDiv.scrollTop = logDiv.scrollHeight;
                
                // Install update
                logDiv.innerHTML += `<div>🔧 Nameščam posodobitev...</div>`;
                logDiv.scrollTop = logDiv.scrollHeight;
                
                const installResponse = await fetch('/api/install-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ update_id: updateId })
                });
                
                const installResult = await installResponse.json();
                if (installResult.success) {
                    logDiv.innerHTML += `<div style="color: #51cf66;">✅ Posodobitev uspešno nameščena!</div>`;
                    // Refresh data
                    loadData();
                    checkForUpdates();
                } else {
                    logDiv.innerHTML += `<div style="color: #ff6b6b;">❌ Napaka pri namestitvi: ${installResult.message}</div>`;
                }
                
                logDiv.scrollTop = logDiv.scrollHeight;
                
            } catch (error) {
                console.error('Error installing update:', error);
                const logDiv = document.getElementById('updateLog');
                logDiv.innerHTML += `<div style="color: #ff6b6b;">❌ Napaka: ${error.message}</div>`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }
        }
        
        async function loadUpdateHistory() {
            try {
                const response = await fetch('/api/update-history');
                const history = await response.json();
                
                const historyDiv = document.getElementById('updateHistory');
                historyDiv.innerHTML = '';
                
                if (history.length === 0) {
                    historyDiv.innerHTML = '<p>Ni zgodovine posodobitev</p>';
                    return;
                }
                
                history.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'update-item';
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${item.component.toUpperCase()}</strong>
                                ${item.version_from} → ${item.version_to}
                                <span class="status ${item.status}">${item.status}</span>
                                ${item.rollback_performed ? '<span style="color: #ffc107;">🔄 Rollback</span>' : ''}
                            </div>
                            <div style="text-align: right; font-size: 0.9em; color: #666;">
                                ${new Date(item.started_at).toLocaleString('sl-SI')}
                                ${item.status === 'completed' && !item.rollback_performed ? 
                                    `<button class="btn btn-warning" onclick="rollbackUpdate('${item.component}')" style="margin-left: 10px; padding: 5px 10px; font-size: 12px;">Rollback</button>` : ''}
                            </div>
                        </div>
                        ${item.error_message ? `<div style="color: #dc3545; margin-top: 5px; font-size: 0.9em;">Error: ${item.error_message}</div>` : ''}
                    `;
                    historyDiv.appendChild(div);
                });
                
            } catch (error) {
                console.error('Error loading update history:', error);
            }
        }
        
        async function rollbackUpdate(component) {
            if (!confirm(`Ali ste prepričani, da želite povrniti komponento ${component} na prejšnjo različico?`)) {
                return;
            }
            
            try {
                const response = await fetch('/api/rollback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ component: component })
                });
                
                const result = await response.json();
                const logDiv = document.getElementById('updateLog');
                
                if (result.success) {
                    logDiv.innerHTML += `<div style="color: #51cf66;">✅ Rollback uspešen: ${result.message}</div>`;
                    loadData();
                    loadUpdateHistory();
                } else {
                    logDiv.innerHTML += `<div style="color: #ff6b6b;">❌ Rollback neuspešen: ${result.message}</div>`;
                }
                
                logDiv.scrollTop = logDiv.scrollHeight;
                
            } catch (error) {
                console.error('Error during rollback:', error);
            }
        }
        
        // Load data on page load
        loadData();
        checkForUpdates();
        loadUpdateHistory();
        
        // Refresh data every 30 seconds
        setInterval(() => {
            loadData();
            loadUpdateHistory();
        }, 30000);
    </script>
</body>
</html>
            ''')
        
        @self.app.route('/api/status')
        def get_status():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get settings
            cursor.execute('SELECT key, value FROM update_settings')
            settings_data = cursor.fetchall()
            settings = {key: value for key, value in settings_data}
            
            # Get stats
            cursor.execute('SELECT COUNT(*) FROM updates')
            total_updates = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM updates WHERE status = "installed"')
            installed_updates = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM updates WHERE status = "available"')
            available_updates = cursor.fetchone()[0]
            
            conn.close()
            
            return jsonify({
                "components": self.components,
                "settings": {
                    "auto_update_enabled": settings.get("auto_update_enabled") == "true",
                    "update_channel": settings.get("update_channel", "stable"),
                    "check_interval_hours": int(settings.get("check_interval_hours", 24))
                },
                "stats": {
                    "total_updates": total_updates,
                    "installed_updates": installed_updates,
                    "available_updates": available_updates,
                    "last_check": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            })
        
        @self.app.route('/api/check-updates')
        def api_check_updates():
            updates = self.check_for_updates()
            return jsonify(updates)
        
        @self.app.route('/api/download-update', methods=['POST'])
        def api_download_update():
            data = request.get_json()
            update_id = data.get('update_id')
            
            if not update_id:
                return jsonify({"success": False, "message": "Update ID required"})
            
            result = self.download_update(update_id)
            return jsonify(result)
        
        @self.app.route('/api/install-update', methods=['POST'])
        def api_install_update():
            data = request.get_json()
            update_id = data.get('update_id')
            
            if not update_id:
                return jsonify({"success": False, "message": "Update ID required"})
            
            result = self.install_update(update_id)
            return jsonify(result)
        
        @self.app.route('/api/rollback', methods=['POST'])
        def api_rollback():
            data = request.get_json()
            component = data.get('component')
            
            if not component:
                return jsonify({"success": False, "message": "Component required"})
            
            result = self.rollback_update(component)
            return jsonify(result)
        
        @self.app.route('/api/update-history')
        def get_update_history():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM update_history 
                ORDER BY started_at DESC 
                LIMIT 20
            ''')
            
            history = cursor.fetchall()
            conn.close()
            
            history_list = []
            for item in history:
                history_list.append({
                    "id": item[0],
                    "version_from": item[1],
                    "version_to": item[2],
                    "component": item[3],
                    "update_type": item[4],
                    "status": item[5],
                    "started_at": item[6],
                    "completed_at": item[7],
                    "error_message": item[8],
                    "rollback_performed": bool(item[9])
                })
            
            return jsonify(history_list)
    
    def run_server(self, host='0.0.0.0', port=5017, debug=True):
        """Run the auto updater server"""
        print(f"🚀 Starting OMNI Auto Updater on http://{host}:{port}")
        print("🔄 Auto-update monitor running in background")
        print("📦 Demo components:")
        for component, info in self.components.items():
            print(f"   • {component.upper()}: v{info['version']} {'(Critical)' if info['critical'] else ''}")
        
        self.app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    updater = OmniAutoUpdater()
    updater.run_server()