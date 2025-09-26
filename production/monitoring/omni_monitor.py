#!/usr/bin/env python3
import psutil
import time
import json
import datetime
import sqlite3

class OmniMonitor:
    def __init__(self):
        self.init_database()
    
    def init_database(self):
        conn = sqlite3.connect('production/monitoring/omni_monitor.db')
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                cpu_percent REAL,
                memory_percent REAL,
                disk_percent REAL,
                network_bytes_sent INTEGER,
                network_bytes_recv INTEGER
            )
        ''')
        conn.commit()
        conn.close()
    
    def collect_metrics(self):
        cpu = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        network = psutil.net_io_counters()
        
        metrics = {
            'timestamp': datetime.datetime.now().isoformat(),
            'cpu_percent': cpu,
            'memory_percent': memory.percent,
            'disk_percent': (disk.used / disk.total) * 100,
            'network_bytes_sent': network.bytes_sent,
            'network_bytes_recv': network.bytes_recv
        }
        
        # Save to database
        conn = sqlite3.connect('production/monitoring/omni_monitor.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO system_metrics 
            (timestamp, cpu_percent, memory_percent, disk_percent, network_bytes_sent, network_bytes_recv)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (metrics['timestamp'], metrics['cpu_percent'], metrics['memory_percent'],
              metrics['disk_percent'], metrics['network_bytes_sent'], metrics['network_bytes_recv']))
        conn.commit()
        conn.close()
        
        return metrics
    
    def run_monitoring(self, interval=60):
        print("🔍 Starting Omni System Monitoring...")
        while True:
            try:
                metrics = self.collect_metrics()
                print(f"[{metrics['timestamp']}] CPU: {metrics['cpu_percent']:.1f}% | "
                      f"RAM: {metrics['memory_percent']:.1f}% | "
                      f"Disk: {metrics['disk_percent']:.1f}%")
                
                # Check thresholds
                if metrics['cpu_percent'] > 90:
                    print("⚠️ HIGH CPU USAGE ALERT!")
                if metrics['memory_percent'] > 85:
                    print("⚠️ HIGH MEMORY USAGE ALERT!")
                if metrics['disk_percent'] > 90:
                    print("⚠️ HIGH DISK USAGE ALERT!")
                
                time.sleep(interval)
            except KeyboardInterrupt:
                print("Monitoring stopped.")
                break
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(interval)

if __name__ == "__main__":
    monitor = OmniMonitor()
    monitor.run_monitoring()
