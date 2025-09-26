#!/usr/bin/env python3
"""
🔒 Omni Time-Lock System
Avtomatsko zaklepanje modulov po preteku časa z varnostnimi kontrolami
"""

import sqlite3
import json
import logging
import threading
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from enum import Enum
import hashlib
import secrets
import os

# Konfiguracija logiranja
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LockStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"

class LockType(Enum):
    DEMO = "demo"
    TRIAL = "trial"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

@dataclass
class TimeLock:
    lock_id: str
    module_id: str
    lock_type: LockType
    start_time: datetime
    end_time: datetime
    status: LockStatus
    warning_sent: bool = False
    access_count: int = 0
    max_access: Optional[int] = None
    client_ip: Optional[str] = None
    security_hash: Optional[str] = None

class OmniTimeLockSystem:
    def __init__(self, db_path: str = "omni_timelock.db"):
        self.db_path = db_path
        self.active_locks: Dict[str, TimeLock] = {}
        self.monitoring_thread = None
        self.running = False
        self.security_key = self._generate_security_key()
        
        self._init_database()
        self._load_active_locks()
        
        logger.info("Omni Time-Lock System inicializiran")

    def _generate_security_key(self) -> str:
        """Generira varnostni ključ za šifriranje"""
        return secrets.token_hex(32)

    def _init_database(self):
        """Inicializira bazo podatkov za time-lock sistem"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela za time-lock zapise
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS timelocks (
                    lock_id TEXT PRIMARY KEY,
                    module_id TEXT NOT NULL,
                    lock_type TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    status TEXT NOT NULL,
                    warning_sent INTEGER DEFAULT 0,
                    access_count INTEGER DEFAULT 0,
                    max_access INTEGER,
                    client_ip TEXT,
                    security_hash TEXT,
                    config TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabela za varnostne dogodke
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lock_id TEXT,
                    event_type TEXT NOT NULL,
                    description TEXT,
                    client_ip TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (lock_id) REFERENCES timelocks (lock_id)
                )
            ''')
            
            # Tabela za dostopne loge
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS access_logs (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lock_id TEXT,
                    module_id TEXT,
                    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    client_ip TEXT,
                    user_agent TEXT,
                    success INTEGER DEFAULT 1,
                    FOREIGN KEY (lock_id) REFERENCES timelocks (lock_id)
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("Time-Lock baza podatkov inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")

    def _load_active_locks(self):
        """Naloži aktivne time-lock zapise iz baze"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM timelocks WHERE status = 'active'
            ''')
            
            rows = cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            
            for row in rows:
                data = dict(zip(columns, row))
                
                timelock = TimeLock(
                    lock_id=data['lock_id'],
                    module_id=data['module_id'],
                    lock_type=LockType(data['lock_type']),
                    start_time=datetime.fromisoformat(data['start_time']),
                    end_time=datetime.fromisoformat(data['end_time']),
                    status=LockStatus(data['status']),
                    warning_sent=bool(data['warning_sent']),
                    access_count=data['access_count'],
                    max_access=data['max_access'],
                    client_ip=data['client_ip'],
                    security_hash=data['security_hash']
                )
                
                self.active_locks[timelock.lock_id] = timelock
            
            conn.close()
            logger.info(f"Naloženih {len(self.active_locks)} aktivnih time-lock zapisov")
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju time-lock zapisov: {e}")

    def create_timelock(self, module_id: str, lock_type: LockType, 
                       duration_hours: int, max_access: Optional[int] = None,
                       client_ip: Optional[str] = None) -> str:
        """Ustvari nov time-lock zapis"""
        try:
            lock_id = secrets.token_urlsafe(16)
            start_time = datetime.now()
            end_time = start_time + timedelta(hours=duration_hours)
            
            # Generiraj varnostni hash
            security_data = f"{lock_id}{module_id}{start_time.isoformat()}{self.security_key}"
            security_hash = hashlib.sha256(security_data.encode()).hexdigest()
            
            timelock = TimeLock(
                lock_id=lock_id,
                module_id=module_id,
                lock_type=lock_type,
                start_time=start_time,
                end_time=end_time,
                status=LockStatus.ACTIVE,
                max_access=max_access,
                client_ip=client_ip,
                security_hash=security_hash
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO timelocks (
                    lock_id, module_id, lock_type, start_time, end_time, 
                    status, max_access, client_ip, security_hash, config
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                lock_id, module_id, lock_type.value,
                start_time.isoformat(), end_time.isoformat(),
                LockStatus.ACTIVE.value, max_access, client_ip,
                security_hash, json.dumps(asdict(timelock), default=str)
            ))
            
            conn.commit()
            conn.close()
            
            # Dodaj v aktivne locks
            self.active_locks[lock_id] = timelock
            
            # Zabelži varnostni dogodek
            self._log_security_event(lock_id, "LOCK_CREATED", 
                                   f"Time-lock ustvarjen za modul {module_id}", client_ip)
            
            logger.info(f"Time-lock ustvarjen: {lock_id} za modul {module_id}")
            return lock_id
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju time-lock: {e}")
            return None

    def check_access(self, module_id: str, client_ip: Optional[str] = None,
                    user_agent: Optional[str] = None) -> Dict[str, Any]:
        """Preveri dostop do modula"""
        try:
            # Poišči aktivne time-lock zapise za modul
            module_locks = [lock for lock in self.active_locks.values() 
                          if lock.module_id == module_id and lock.status == LockStatus.ACTIVE]
            
            if not module_locks:
                return {
                    "access_granted": True,
                    "message": "Dostop dovoljen - ni aktivnih time-lock zapisov",
                    "lock_info": None
                }
            
            current_time = datetime.now()
            
            for lock in module_locks:
                # Preveri časovno omejitev
                if current_time > lock.end_time:
                    self._expire_lock(lock.lock_id)
                    continue
                
                # Preveri IP omejitev
                if lock.client_ip and client_ip and lock.client_ip != client_ip:
                    self._log_security_event(lock.lock_id, "IP_VIOLATION",
                                           f"Poskus dostopa z napačnega IP: {client_ip}", client_ip)
                    return {
                        "access_granted": False,
                        "message": "Dostop zavrnjen - IP omejitev",
                        "lock_info": asdict(lock)
                    }
                
                # Preveri število dostopov
                if lock.max_access and lock.access_count >= lock.max_access:
                    self._expire_lock(lock.lock_id, "MAX_ACCESS_REACHED")
                    return {
                        "access_granted": False,
                        "message": "Dostop zavrnjen - doseženo maksimalno število dostopov",
                        "lock_info": asdict(lock)
                    }
                
                # Povečaj števec dostopov
                lock.access_count += 1
                self._update_lock_access(lock.lock_id, lock.access_count)
                
                # Zabelži dostop
                self._log_access(lock.lock_id, module_id, client_ip, user_agent, True)
                
                # Preveri opozorilo (24h pred iztekom)
                time_remaining = lock.end_time - current_time
                if time_remaining <= timedelta(hours=24) and not lock.warning_sent:
                    self._send_warning(lock)
                
                return {
                    "access_granted": True,
                    "message": "Dostop dovoljen",
                    "lock_info": asdict(lock),
                    "time_remaining": str(time_remaining),
                    "access_count": lock.access_count
                }
            
            return {
                "access_granted": False,
                "message": "Dostop zavrnjen - vsi time-lock zapisi so potekli",
                "lock_info": None
            }
            
        except Exception as e:
            logger.error(f"Napaka pri preverjanju dostopa: {e}")
            return {
                "access_granted": False,
                "message": f"Napaka pri preverjanju dostopa: {e}",
                "lock_info": None
            }

    def _expire_lock(self, lock_id: str, reason: str = "TIME_EXPIRED"):
        """Označi time-lock kot potekel"""
        try:
            if lock_id in self.active_locks:
                lock = self.active_locks[lock_id]
                lock.status = LockStatus.EXPIRED
                
                # Posodobi v bazi
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE timelocks SET status = ? WHERE lock_id = ?
                ''', (LockStatus.EXPIRED.value, lock_id))
                
                conn.commit()
                conn.close()
                
                # Odstrani iz aktivnih
                del self.active_locks[lock_id]
                
                # Zabelži dogodek
                self._log_security_event(lock_id, "LOCK_EXPIRED", 
                                       f"Time-lock potekel: {reason}")
                
                logger.info(f"Time-lock potekel: {lock_id} ({reason})")
                
        except Exception as e:
            logger.error(f"Napaka pri označevanju time-lock kot potekel: {e}")

    def _send_warning(self, lock: TimeLock):
        """Pošlje opozorilo pred iztekom"""
        try:
            time_remaining = lock.end_time - datetime.now()
            hours_remaining = int(time_remaining.total_seconds() / 3600)
            
            warning_message = f"""
            ⚠️ OPOZORILO: Time-lock bo potekel v {hours_remaining} urah
            
            Modul: {lock.module_id}
            Tip: {lock.lock_type.value}
            Poteče: {lock.end_time.strftime('%Y-%m-%d %H:%M:%S')}
            Dostopi: {lock.access_count}/{lock.max_access or '∞'}
            """
            
            # Označi opozorilo kot poslano
            lock.warning_sent = True
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE timelocks SET warning_sent = 1 WHERE lock_id = ?
            ''', (lock.lock_id,))
            
            conn.commit()
            conn.close()
            
            # Zabelži dogodek
            self._log_security_event(lock.lock_id, "WARNING_SENT", 
                                   f"Opozorilo poslano - {hours_remaining}h do izteka")
            
            logger.warning(f"Opozorilo poslano za time-lock: {lock.lock_id}")
            
        except Exception as e:
            logger.error(f"Napaka pri pošiljanju opozorila: {e}")

    def _update_lock_access(self, lock_id: str, access_count: int):
        """Posodobi števec dostopov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE timelocks SET access_count = ? WHERE lock_id = ?
            ''', (access_count, lock_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri posodabljanju števca dostopov: {e}")

    def _log_security_event(self, lock_id: str, event_type: str, 
                          description: str, client_ip: Optional[str] = None):
        """Zabelži varnostni dogodek"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO security_events (lock_id, event_type, description, client_ip)
                VALUES (?, ?, ?, ?)
            ''', (lock_id, event_type, description, client_ip))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju varnostnega dogodka: {e}")

    def _log_access(self, lock_id: str, module_id: str, client_ip: Optional[str],
                   user_agent: Optional[str], success: bool):
        """Zabelži dostop"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO access_logs (lock_id, module_id, client_ip, user_agent, success)
                VALUES (?, ?, ?, ?, ?)
            ''', (lock_id, module_id, client_ip, user_agent, int(success)))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Napaka pri beleženju dostopa: {e}")

    def start_monitoring(self):
        """Zažene monitoring thread za preverjanje time-lock zapisov"""
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            return
        
        self.running = True
        self.monitoring_thread = threading.Thread(target=self._monitor_locks, daemon=True)
        self.monitoring_thread.start()
        
        logger.info("Time-Lock monitoring zagnan")

    def stop_monitoring(self):
        """Ustavi monitoring thread"""
        self.running = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        
        logger.info("Time-Lock monitoring ustavljen")

    def _monitor_locks(self):
        """Monitoring loop za preverjanje time-lock zapisov"""
        while self.running:
            try:
                current_time = datetime.now()
                expired_locks = []
                
                for lock_id, lock in self.active_locks.items():
                    if current_time > lock.end_time:
                        expired_locks.append(lock_id)
                    elif not lock.warning_sent:
                        time_remaining = lock.end_time - current_time
                        if time_remaining <= timedelta(hours=24):
                            self._send_warning(lock)
                
                # Označi potekle locks
                for lock_id in expired_locks:
                    self._expire_lock(lock_id)
                
                # Počakaj 60 sekund pred naslednjim preverjanjem
                time.sleep(60)
                
            except Exception as e:
                logger.error(f"Napaka v monitoring loop: {e}")
                time.sleep(60)

    def get_lock_status(self, lock_id: str) -> Optional[Dict[str, Any]]:
        """Vrne status time-lock zapisa"""
        try:
            if lock_id in self.active_locks:
                lock = self.active_locks[lock_id]
                time_remaining = lock.end_time - datetime.now()
                
                return {
                    "lock_info": asdict(lock),
                    "time_remaining": str(time_remaining),
                    "is_active": time_remaining.total_seconds() > 0,
                    "warning_threshold": time_remaining <= timedelta(hours=24)
                }
            
            # Preveri v bazi za neaktivne locks
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM timelocks WHERE lock_id = ?
            ''', (lock_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                columns = [description[0] for description in cursor.description]
                data = dict(zip(columns, row))
                
                return {
                    "lock_info": data,
                    "time_remaining": "0:00:00",
                    "is_active": False,
                    "warning_threshold": False
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju statusa: {e}")
            return None

    def revoke_lock(self, lock_id: str, reason: str = "MANUAL_REVOKE") -> bool:
        """Prekliče time-lock ročno"""
        try:
            if lock_id in self.active_locks:
                lock = self.active_locks[lock_id]
                lock.status = LockStatus.TERMINATED
                
                # Posodobi v bazi
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE timelocks SET status = ? WHERE lock_id = ?
                ''', (LockStatus.TERMINATED.value, lock_id))
                
                conn.commit()
                conn.close()
                
                # Odstrani iz aktivnih
                del self.active_locks[lock_id]
                
                # Zabelži dogodek
                self._log_security_event(lock_id, "LOCK_REVOKED", 
                                       f"Time-lock preklican: {reason}")
                
                logger.info(f"Time-lock preklican: {lock_id} ({reason})")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Napaka pri prekliču time-lock: {e}")
            return False

    def get_statistics(self) -> Dict[str, Any]:
        """Vrne statistike time-lock sistema"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Skupno število locks
            cursor.execute('SELECT COUNT(*) FROM timelocks')
            total_locks = cursor.fetchone()[0]
            
            # Aktivni locks
            active_locks = len(self.active_locks)
            
            # Locks po statusu
            cursor.execute('''
                SELECT status, COUNT(*) FROM timelocks GROUP BY status
            ''')
            status_counts = dict(cursor.fetchall())
            
            # Locks po tipu
            cursor.execute('''
                SELECT lock_type, COUNT(*) FROM timelocks GROUP BY lock_type
            ''')
            type_counts = dict(cursor.fetchall())
            
            # Varnostni dogodki
            cursor.execute('SELECT COUNT(*) FROM security_events')
            security_events = cursor.fetchone()[0]
            
            # Dostopi
            cursor.execute('SELECT COUNT(*) FROM access_logs')
            total_accesses = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "total_locks": total_locks,
                "active_locks": active_locks,
                "status_distribution": status_counts,
                "type_distribution": type_counts,
                "security_events": security_events,
                "total_accesses": total_accesses,
                "monitoring_active": self.running
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju statistik: {e}")
            return {}

def main():
    """Demo Time-Lock sistema"""
    print("🔒 Zaganjam Omni Time-Lock System Demo...")
    
    # Inicializiraj sistem
    timelock_system = OmniTimeLockSystem()
    
    # Zaženi monitoring
    timelock_system.start_monitoring()
    
    # Ustvari demo time-lock
    demo_lock_id = timelock_system.create_timelock(
        module_id="demo_module",
        lock_type=LockType.DEMO,
        duration_hours=1,  # 1 ura
        max_access=10,
        client_ip="127.0.0.1"
    )
    
    if demo_lock_id:
        print(f"✅ Demo time-lock ustvarjen: {demo_lock_id}")
        
        # Testiraj dostop
        access_result = timelock_system.check_access("demo_module", "127.0.0.1")
        print(f"🔍 Rezultat dostopa: {access_result['message']}")
        
        # Prikaži status
        status = timelock_system.get_lock_status(demo_lock_id)
        if status:
            print(f"📊 Status: {status['lock_info']['status']}")
            print(f"⏰ Preostali čas: {status['time_remaining']}")
        
        # Prikaži statistike
        stats = timelock_system.get_statistics()
        print(f"📈 Statistike:")
        print(f"  • Skupno locks: {stats.get('total_locks', 0)}")
        print(f"  • Aktivni locks: {stats.get('active_locks', 0)}")
        print(f"  • Monitoring: {'✅' if stats.get('monitoring_active') else '❌'}")
    
    print("🎉 Time-Lock System uspešno testiran!")
    print("💡 Sistem avtomatsko spremlja in zaklene module po preteku časa")
    
    # Ustavi monitoring za demo
    timelock_system.stop_monitoring()

if __name__ == "__main__":
    main()