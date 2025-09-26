#!/usr/bin/env python3
import subprocess
import time
import sys
import os

def start_omni_system():
    print("🚀 Starting Omni Supermozg Production System...")
    
    components = [
        ("Omni Brain Core", "omni_brain_core.py"),
        ("Module Connectors", "omni_module_connectors.py"),
        ("Cloud Memory", "omni_cloud_memory.py"),
        ("Mobile Terminal", "omni_mobile_terminal.py"),
        ("Learning Optimization", "omni_learning_optimization.py"),
        ("System Integration", "omni_system_integration.py")
    ]
    
    processes = []
    
    for name, script in components:
        try:
            print(f"Starting {name}...")
            if os.path.exists(script):
                proc = subprocess.Popen([sys.executable, script])
                processes.append((name, proc))
                time.sleep(2)  # Wait between starts
            else:
                print(f"WARNING: {script} not found!")
        except Exception as e:
            print(f"ERROR starting {name}: {e}")
    
    print(f"✅ Started {len(processes)} components")
    return processes

if __name__ == "__main__":
    start_omni_system()
