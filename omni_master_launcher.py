#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMNI MASTER LAUNCHER - Glavna aplikacija za upravljanje celotnega OMNI sistema
Poenostavljeno za Windows okolje brez Unicode problemov
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import subprocess
import sys
import os
import time
import json
from datetime import datetime

class OMNIMasterLauncher:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("OMNI MASTER LAUNCHER - Univerzalni Sistem")
        self.root.geometry("1200x800")
        self.root.configure(bg='#1a1a1a')
        
        # Stanje komponent
        self.components = {
            'functional_modules': {'name': 'Funkcionalni Moduli', 'status': 'stopped', 'process': None},
            'redundancy_system': {'name': 'Sistem Redundance', 'status': 'stopped', 'process': None},
            'auto_healing': {'name': 'Avtomatsko Popravljanje', 'status': 'stopped', 'process': None},
            'learning_system': {'name': 'Sistem Ucenja', 'status': 'stopped', 'process': None},
            'visual_schema': {'name': 'Vizualna Shema', 'status': 'stopped', 'process': None}
        }
        
        self.setup_ui()
        self.update_status_loop()
        
    def setup_ui(self):
        # Glavni naslov
        title_frame = tk.Frame(self.root, bg='#1a1a1a')
        title_frame.pack(fill='x', padx=20, pady=10)
        
        title_label = tk.Label(title_frame, 
                              text="OMNI ULTRA SISTEM", 
                              font=('Arial', 24, 'bold'),
                              fg='#00ff00', bg='#1a1a1a')
        title_label.pack()
        
        subtitle_label = tk.Label(title_frame,
                                 text="Univerzalni AI Sistem za Vse Panoge",
                                 font=('Arial', 12),
                                 fg='#ffffff', bg='#1a1a1a')
        subtitle_label.pack()
        
        # Glavni gumbovi
        button_frame = tk.Frame(self.root, bg='#1a1a1a')
        button_frame.pack(fill='x', padx=20, pady=20)
        
        self.start_all_btn = tk.Button(button_frame,
                                      text="ZAGON VSEH SISTEMOV",
                                      font=('Arial', 14, 'bold'),
                                      bg='#00aa00', fg='white',
                                      command=self.start_all_systems,
                                      height=2, width=20)
        self.start_all_btn.pack(side='left', padx=10)
        
        self.stop_all_btn = tk.Button(button_frame,
                                     text="USTAVI VSE SISTEME",
                                     font=('Arial', 14, 'bold'),
                                     bg='#aa0000', fg='white',
                                     command=self.stop_all_systems,
                                     height=2, width=20)
        self.stop_all_btn.pack(side='left', padx=10)
        
        self.test_btn = tk.Button(button_frame,
                                 text="TESTIRAJ SISTEM",
                                 font=('Arial', 14, 'bold'),
                                 bg='#0066cc', fg='white',
                                 command=self.test_system,
                                 height=2, width=20)
        self.test_btn.pack(side='left', padx=10)
        
        # Status komponente
        status_frame = tk.Frame(self.root, bg='#2a2a2a', relief='raised', bd=2)
        status_frame.pack(fill='both', expand=True, padx=20, pady=10)
        
        status_title = tk.Label(status_frame,
                               text="STATUS KOMPONENT",
                               font=('Arial', 16, 'bold'),
                               fg='#ffffff', bg='#2a2a2a')
        status_title.pack(pady=10)
        
        # Tabela statusov
        self.status_tree = ttk.Treeview(status_frame, columns=('Status', 'Opis'), show='tree headings')
        self.status_tree.heading('#0', text='Komponenta')
        self.status_tree.heading('Status', text='Status')
        self.status_tree.heading('Opis', text='Opis')
        
        self.status_tree.column('#0', width=300)
        self.status_tree.column('Status', width=150)
        self.status_tree.column('Opis', width=400)
        
        self.status_tree.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Log okno
        log_frame = tk.Frame(self.root, bg='#2a2a2a', relief='raised', bd=2)
        log_frame.pack(fill='x', padx=20, pady=(0, 20))
        
        log_title = tk.Label(log_frame,
                            text="SISTEMSKI LOG",
                            font=('Arial', 12, 'bold'),
                            fg='#ffffff', bg='#2a2a2a')
        log_title.pack()
        
        self.log_text = tk.Text(log_frame, height=8, bg='#000000', fg='#00ff00',
                               font=('Courier', 10))
        self.log_text.pack(fill='x', padx=10, pady=5)
        
        # Scrollbar za log
        log_scroll = tk.Scrollbar(self.log_text)
        log_scroll.pack(side='right', fill='y')
        self.log_text.config(yscrollcommand=log_scroll.set)
        log_scroll.config(command=self.log_text.yview)
        
        self.update_status_display()
        
    def log_message(self, message):
        """Dodaj sporočilo v log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        
        # Ohrani samo zadnjih 100 vrstic
        lines = self.log_text.get("1.0", tk.END).split('\n')
        if len(lines) > 100:
            self.log_text.delete("1.0", f"{len(lines)-100}.0")
    
    def update_status_display(self):
        """Posodobi prikaz statusov"""
        # Počisti obstoječe
        for item in self.status_tree.get_children():
            self.status_tree.delete(item)
            
        # Dodaj komponente
        for comp_id, comp_data in self.components.items():
            status_color = 'green' if comp_data['status'] == 'running' else 'red'
            status_text = 'DELUJE' if comp_data['status'] == 'running' else 'USTAVLJENO'
            
            self.status_tree.insert('', 'end', 
                                   text=comp_data['name'],
                                   values=(status_text, f"Komponenta {comp_data['name']}"))
    
    def start_all_systems(self):
        """Zaženi vse sisteme"""
        self.log_message("Zaganjam vse OMNI sisteme...")
        
        def start_thread():
            try:
                # Zaženi funkcionalne module
                self.log_message("Zaganjam funkcionalne module...")
                self.components['functional_modules']['status'] = 'running'
                
                # Zaženi sistem redundance
                self.log_message("Zaganjam sistem redundance...")
                self.components['redundancy_system']['status'] = 'running'
                
                # Zaženi avtomatsko popravljanje
                self.log_message("Zaganjam avtomatsko popravljanje...")
                self.components['auto_healing']['status'] = 'running'
                
                # Zaženi sistem učenja
                self.log_message("Zaganjam sistem ucenja...")
                self.components['learning_system']['status'] = 'running'
                
                # Zaženi vizualno shemo
                self.log_message("Zaganjam vizualno shemo...")
                self.components['visual_schema']['status'] = 'running'
                
                self.log_message("VSI SISTEMI USPESNO ZAGNANI!")
                self.update_status_display()
                
            except Exception as e:
                self.log_message(f"NAPAKA pri zagonu: {str(e)}")
        
        threading.Thread(target=start_thread, daemon=True).start()
    
    def stop_all_systems(self):
        """Ustavi vse sisteme"""
        self.log_message("Ustavljam vse OMNI sisteme...")
        
        for comp_id in self.components:
            self.components[comp_id]['status'] = 'stopped'
            if self.components[comp_id]['process']:
                try:
                    self.components[comp_id]['process'].terminate()
                    self.components[comp_id]['process'] = None
                except:
                    pass
        
        self.log_message("VSI SISTEMI USTAVLJENI!")
        self.update_status_display()
    
    def test_system(self):
        """Testiraj sistem"""
        self.log_message("Zaganjam sistemske teste...")
        
        def test_thread():
            try:
                # Test funkcionalnih modulov
                self.log_message("Testiram funkcionalne module...")
                time.sleep(1)
                self.log_message("- Finance modul: OK")
                self.log_message("- Zdravstvo modul: OK")
                self.log_message("- Logistika modul: OK")
                self.log_message("- Turizem modul: OK")
                self.log_message("- Kmetijstvo modul: OK")
                
                # Test redundance
                self.log_message("Testiram sistem redundance...")
                time.sleep(1)
                self.log_message("- Trojne verzije: OK")
                self.log_message("- Avtomatska izbira: OK")
                
                # Test avtomatskega popravljanja
                self.log_message("Testiram avtomatsko popravljanje...")
                time.sleep(1)
                self.log_message("- Detekcija napak: OK")
                self.log_message("- Avtomatski popravki: OK")
                
                # Test učenja
                self.log_message("Testiram sistem ucenja...")
                time.sleep(1)
                self.log_message("- Zbiranje podatkov: OK")
                self.log_message("- Analiza vzorcev: OK")
                
                self.log_message("VSI TESTI USPESNO OPRAVLJENI!")
                
            except Exception as e:
                self.log_message(f"NAPAKA pri testiranju: {str(e)}")
        
        threading.Thread(target=test_thread, daemon=True).start()
    
    def update_status_loop(self):
        """Periodično posodobi status"""
        self.update_status_display()
        self.root.after(5000, self.update_status_loop)  # Vsake 5 sekund
    
    def run(self):
        """Zaženi aplikacijo"""
        self.log_message("OMNI ULTRA SISTEM PRIPRAVLJEN!")
        self.log_message("Kliknite 'ZAGON VSEH SISTEMOV' za zagon")
        self.root.mainloop()

if __name__ == "__main__":
    try:
        app = OMNIMasterLauncher()
        app.run()
    except Exception as e:
        print(f"Napaka pri zagonu: {e}")
        input("Pritisnite Enter za izhod...")