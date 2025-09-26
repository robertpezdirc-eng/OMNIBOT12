#!/usr/bin/env python3
"""
============================================================================
OMNI CLOUD BACKUP SYSTEM
Advanced backup and monitoring system for cloud deployment
============================================================================
"""

import os
import sys
import json
import time
import shutil
import sqlite3
import logging
import schedule
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import tarfile
import gzip
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuration
BACKUP_CONFIG = {
    'backup_dir': '/var/lib/omni/backups',
    'app_dir': '/opt/omni',
    'log_dir': '/var/log/omni',
    'retention_days': 30,
    'max_backups': 50,
    'compression': True,
    'verify_backups': True,
    'email_notifications': True,
    'cloud_sync': False,  # Can be enabled for cloud storage
}

# Email configuration (optional)
EMAIL_CONFIG = {
    'smtp_server': 'localhost',
    'smtp_port': 587,
    'username': '',
    'password': '',
    'from_email': 'omni-backup@localhost',
    'to_emails': ['admin@localhost'],
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/omni/backup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('OmniBackup')

class BackupManager:
    """Advanced backup management system"""
    
    def __init__(self):
        self.config = BACKUP_CONFIG
        self.backup_dir = Path(self.config['backup_dir'])
        self.app_dir = Path(self.config['app_dir'])
        self.log_dir = Path(self.config['log_dir'])
        
        # Create directories
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self.init_database()
        
    def init_database(self):
        """Initialize backup tracking database"""
        db_path = self.backup_dir / 'backup_history.db'
        
        with sqlite3.connect(db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS backups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    backup_name TEXT NOT NULL,
                    backup_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    checksum TEXT,
                    status TEXT DEFAULT 'completed',
                    duration REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS backup_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    backup_id INTEGER,
                    level TEXT,
                    message TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (backup_id) REFERENCES backups (id)
                )
            ''')
            
            conn.commit()
    
    def calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of file"""
        hash_sha256 = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        
        return hash_sha256.hexdigest()
    
    def create_backup(self, backup_type: str = 'full') -> Dict:
        """Create a backup of the Omni system"""
        start_time = time.time()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"omni_{backup_type}_{timestamp}"
        
        logger.info(f"Starting {backup_type} backup: {backup_name}")
        
        try:
            # Create backup directory
            backup_path = self.backup_dir / backup_name
            backup_path.mkdir(exist_ok=True)
            
            # Backup application files
            app_backup = self._backup_application(backup_path)
            
            # Backup databases
            db_backup = self._backup_databases(backup_path)
            
            # Backup configuration
            config_backup = self._backup_configuration(backup_path)
            
            # Backup logs (last 7 days)
            log_backup = self._backup_logs(backup_path)
            
            # Create compressed archive
            if self.config['compression']:
                archive_path = self._create_compressed_archive(backup_path, backup_name)
                
                # Remove uncompressed backup
                shutil.rmtree(backup_path)
                backup_file = archive_path
            else:
                backup_file = backup_path
            
            # Calculate checksum
            checksum = self.calculate_checksum(backup_file) if backup_file.is_file() else None
            
            # Get file size
            file_size = backup_file.stat().st_size if backup_file.exists() else 0
            
            duration = time.time() - start_time
            
            # Record backup in database
            backup_id = self._record_backup(
                timestamp=timestamp,
                backup_name=backup_name,
                backup_type=backup_type,
                file_path=str(backup_file),
                file_size=file_size,
                checksum=checksum,
                duration=duration
            )
            
            # Verify backup if enabled
            if self.config['verify_backups']:
                self._verify_backup(backup_file, backup_id)
            
            # Clean old backups
            self._cleanup_old_backups()
            
            logger.info(f"Backup completed successfully: {backup_name} ({file_size / 1024 / 1024:.2f} MB)")
            
            # Send notification
            if self.config['email_notifications']:
                self._send_notification(backup_name, 'success', duration, file_size)
            
            return {
                'success': True,
                'backup_id': backup_id,
                'backup_name': backup_name,
                'file_path': str(backup_file),
                'file_size': file_size,
                'duration': duration,
                'checksum': checksum
            }
            
        except Exception as e:
            logger.error(f"Backup failed: {str(e)}")
            
            if self.config['email_notifications']:
                self._send_notification(backup_name, 'failed', 0, 0, str(e))
            
            return {
                'success': False,
                'error': str(e),
                'backup_name': backup_name
            }
    
    def _backup_application(self, backup_path: Path) -> bool:
        """Backup application files"""
        logger.info("Backing up application files...")
        
        app_backup_path = backup_path / 'application'
        app_backup_path.mkdir(exist_ok=True)
        
        # Exclude certain directories and files
        exclude_patterns = [
            '__pycache__',
            '*.pyc',
            '.git',
            'node_modules',
            'venv',
            '.env',
            '*.log',
            'backups',
            'cache'
        ]
        
        # Create tar archive of application
        tar_path = app_backup_path / 'omni_app.tar.gz'
        
        with tarfile.open(tar_path, 'w:gz') as tar:
            tar.add(self.app_dir, arcname='omni', 
                   exclude=lambda x: any(pattern in x for pattern in exclude_patterns))
        
        logger.info(f"Application backup completed: {tar_path}")
        return True
    
    def _backup_databases(self, backup_path: Path) -> bool:
        """Backup all SQLite databases"""
        logger.info("Backing up databases...")
        
        db_backup_path = backup_path / 'databases'
        db_backup_path.mkdir(exist_ok=True)
        
        # Find all .db files
        db_files = list(self.app_dir.glob('**/*.db'))
        
        for db_file in db_files:
            if db_file.exists():
                backup_file = db_backup_path / db_file.name
                shutil.copy2(db_file, backup_file)
                logger.info(f"Database backed up: {db_file.name}")
        
        return True
    
    def _backup_configuration(self, backup_path: Path) -> bool:
        """Backup configuration files"""
        logger.info("Backing up configuration...")
        
        config_backup_path = backup_path / 'configuration'
        config_backup_path.mkdir(exist_ok=True)
        
        # Backup important config files
        config_files = [
            '/etc/nginx/sites-available/omni',
            '/etc/systemd/system/omni*.service',
            '/etc/omni',
        ]
        
        for config_pattern in config_files:
            if '*' in config_pattern:
                # Handle wildcards
                import glob
                for config_file in glob.glob(config_pattern):
                    if os.path.exists(config_file):
                        dest = config_backup_path / os.path.basename(config_file)
                        shutil.copy2(config_file, dest)
            else:
                if os.path.exists(config_pattern):
                    if os.path.isdir(config_pattern):
                        dest = config_backup_path / os.path.basename(config_pattern)
                        shutil.copytree(config_pattern, dest, dirs_exist_ok=True)
                    else:
                        dest = config_backup_path / os.path.basename(config_pattern)
                        shutil.copy2(config_pattern, dest)
        
        return True
    
    def _backup_logs(self, backup_path: Path) -> bool:
        """Backup recent log files"""
        logger.info("Backing up logs...")
        
        log_backup_path = backup_path / 'logs'
        log_backup_path.mkdir(exist_ok=True)
        
        # Backup logs from last 7 days
        cutoff_date = datetime.now() - timedelta(days=7)
        
        for log_file in self.log_dir.glob('*.log'):
            if log_file.stat().st_mtime > cutoff_date.timestamp():
                dest = log_backup_path / log_file.name
                shutil.copy2(log_file, dest)
        
        return True
    
    def _create_compressed_archive(self, backup_path: Path, backup_name: str) -> Path:
        """Create compressed archive of backup"""
        logger.info("Creating compressed archive...")
        
        archive_path = self.backup_dir / f"{backup_name}.tar.gz"
        
        with tarfile.open(archive_path, 'w:gz') as tar:
            tar.add(backup_path, arcname=backup_name)
        
        return archive_path
    
    def _record_backup(self, **kwargs) -> int:
        """Record backup in database"""
        db_path = self.backup_dir / 'backup_history.db'
        
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute('''
                INSERT INTO backups (timestamp, backup_name, backup_type, file_path, 
                                   file_size, checksum, duration)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                kwargs['timestamp'],
                kwargs['backup_name'],
                kwargs['backup_type'],
                kwargs['file_path'],
                kwargs['file_size'],
                kwargs['checksum'],
                kwargs['duration']
            ))
            
            return cursor.lastrowid
    
    def _verify_backup(self, backup_file: Path, backup_id: int) -> bool:
        """Verify backup integrity"""
        logger.info(f"Verifying backup: {backup_file}")
        
        try:
            if backup_file.suffix == '.gz':
                # Test tar.gz file
                with tarfile.open(backup_file, 'r:gz') as tar:
                    tar.getmembers()
            
            logger.info("Backup verification successful")
            return True
            
        except Exception as e:
            logger.error(f"Backup verification failed: {str(e)}")
            return False
    
    def _cleanup_old_backups(self):
        """Clean up old backups based on retention policy"""
        logger.info("Cleaning up old backups...")
        
        db_path = self.backup_dir / 'backup_history.db'
        
        with sqlite3.connect(db_path) as conn:
            # Get old backups
            cutoff_date = datetime.now() - timedelta(days=self.config['retention_days'])
            
            cursor = conn.execute('''
                SELECT file_path FROM backups 
                WHERE created_at < ? 
                ORDER BY created_at ASC
            ''', (cutoff_date.isoformat(),))
            
            old_backups = cursor.fetchall()
            
            # Also limit by max number of backups
            cursor = conn.execute('''
                SELECT file_path FROM backups 
                ORDER BY created_at DESC 
                LIMIT -1 OFFSET ?
            ''', (self.config['max_backups'],))
            
            excess_backups = cursor.fetchall()
            
            # Combine and remove duplicates
            backups_to_remove = set(old_backups + excess_backups)
            
            for (file_path,) in backups_to_remove:
                backup_file = Path(file_path)
                if backup_file.exists():
                    backup_file.unlink()
                    logger.info(f"Removed old backup: {backup_file}")
                
                # Remove from database
                conn.execute('DELETE FROM backups WHERE file_path = ?', (file_path,))
            
            conn.commit()
    
    def _send_notification(self, backup_name: str, status: str, duration: float, 
                          file_size: int, error: str = None):
        """Send email notification about backup status"""
        try:
            if not EMAIL_CONFIG['username']:
                return  # Email not configured
            
            msg = MIMEMultipart()
            msg['From'] = EMAIL_CONFIG['from_email']
            msg['To'] = ', '.join(EMAIL_CONFIG['to_emails'])
            
            if status == 'success':
                msg['Subject'] = f"✅ Omni Backup Successful - {backup_name}"
                body = f"""
Backup completed successfully!

Backup Name: {backup_name}
Duration: {duration:.2f} seconds
File Size: {file_size / 1024 / 1024:.2f} MB
Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

The Omni system has been successfully backed up.
                """
            else:
                msg['Subject'] = f"❌ Omni Backup Failed - {backup_name}"
                body = f"""
Backup failed!

Backup Name: {backup_name}
Error: {error}
Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Please check the backup system immediately.
                """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
            if EMAIL_CONFIG['username']:
                server.starttls()
                server.login(EMAIL_CONFIG['username'], EMAIL_CONFIG['password'])
            
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Notification sent: {status}")
            
        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")
    
    def get_backup_status(self) -> Dict:
        """Get backup system status"""
        db_path = self.backup_dir / 'backup_history.db'
        
        with sqlite3.connect(db_path) as conn:
            # Get recent backups
            cursor = conn.execute('''
                SELECT COUNT(*) as total_backups,
                       MAX(created_at) as last_backup,
                       SUM(file_size) as total_size
                FROM backups
            ''')
            
            stats = cursor.fetchone()
            
            # Get recent backup status
            cursor = conn.execute('''
                SELECT backup_name, status, created_at, file_size
                FROM backups
                ORDER BY created_at DESC
                LIMIT 10
            ''')
            
            recent_backups = cursor.fetchall()
        
        return {
            'total_backups': stats[0] or 0,
            'last_backup': stats[1],
            'total_size_mb': (stats[2] or 0) / 1024 / 1024,
            'recent_backups': recent_backups,
            'backup_dir': str(self.backup_dir),
            'retention_days': self.config['retention_days']
        }

def schedule_backups():
    """Schedule automatic backups"""
    backup_manager = BackupManager()
    
    # Daily full backup at 2 AM
    schedule.every().day.at("02:00").do(
        lambda: backup_manager.create_backup('daily')
    )
    
    # Weekly backup on Sunday at 3 AM
    schedule.every().sunday.at("03:00").do(
        lambda: backup_manager.create_backup('weekly')
    )
    
    # Monthly backup on 1st day at 4 AM
    schedule.every().month.do(
        lambda: backup_manager.create_backup('monthly')
    )
    
    logger.info("Backup scheduler started")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

def main():
    """Main function"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        backup_manager = BackupManager()
        
        if command == 'backup':
            backup_type = sys.argv[2] if len(sys.argv) > 2 else 'manual'
            result = backup_manager.create_backup(backup_type)
            print(json.dumps(result, indent=2))
            
        elif command == 'status':
            status = backup_manager.get_backup_status()
            print(json.dumps(status, indent=2))
            
        elif command == 'schedule':
            schedule_backups()
            
        else:
            print("Usage: python cloud-backup-system.py {backup|status|schedule}")
            sys.exit(1)
    else:
        # Default: run scheduler
        schedule_backups()

if __name__ == '__main__':
    main()