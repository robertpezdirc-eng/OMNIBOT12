#!/usr/bin/env python3
"""
Thea Workspace Analyzer - Analiza optimalne lokacije za workspace
Ocenjuje čas numeracije datotek in priporoča najhitrejšo lokacijo za LSP/Pyright
"""

import os
import time
import json
from pathlib import Path
from typing import Dict, List, Tuple
import subprocess

class WorkspaceAnalyzer:
    def __init__(self):
        self.ignore_folders = {
            'node_modules', '.venv', '__pycache__', '.git', 
            'logs', 'tmp', 'cache', '.cache', 'temp', 
            'build', 'dist', '.next', '.nuxt', 'coverage',
            'venv', 'env', '.env', 'node_modules'
        }
        
    def analyze_directory(self, path: str) -> Dict:
        """Analizira direktorij in vrne statistike"""
        start_time = time.time()
        
        total_files = 0
        total_size = 0
        python_files = 0
        js_files = 0
        large_files = []
        
        try:
            for root, dirs, files in os.walk(path):
                # Filtriraj ignore mape
                dirs[:] = [d for d in dirs if d not in self.ignore_folders]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        file_size = os.path.getsize(file_path)
                        total_files += 1
                        total_size += file_size
                        
                        # Preštej Python in JS datoteke
                        if file.endswith('.py'):
                            python_files += 1
                        elif file.endswith(('.js', '.ts', '.jsx', '.tsx')):
                            js_files += 1
                            
                        # Zaznamuj velike datoteke (>10MB)
                        if file_size > 10 * 1024 * 1024:
                            large_files.append({
                                'path': file_path,
                                'size_mb': round(file_size / (1024 * 1024), 2)
                            })
                            
                    except (OSError, IOError):
                        continue
                        
        except Exception as e:
            print(f"Napaka pri analizi {path}: {e}")
            
        analysis_time = time.time() - start_time
        
        return {
            'path': path,
            'total_files': total_files,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'python_files': python_files,
            'js_files': js_files,
            'large_files': large_files,
            'analysis_time_seconds': round(analysis_time, 2),
            'estimated_lsp_startup_time': self.estimate_lsp_time(total_files, python_files, js_files),
            'performance_score': self.calculate_performance_score(total_files, total_size, analysis_time)
        }
    
    def estimate_lsp_time(self, total_files: int, python_files: int, js_files: int) -> float:
        """Oceni čas zagona LSP/Pyright"""
        # Empirična formula na podlagi velikosti projekta
        base_time = 2.0  # Osnovni čas zagona
        file_factor = total_files * 0.001  # 1ms na datoteko
        python_factor = python_files * 0.005  # 5ms na Python datoteko
        js_factor = js_files * 0.003  # 3ms na JS/TS datoteko
        
        return round(base_time + file_factor + python_factor + js_factor, 2)
    
    def calculate_performance_score(self, files: int, size: float, time: float) -> float:
        """Izračuna performance score (višji = boljši)"""
        # Normaliziraj metrike in izračunaj score
        file_penalty = min(files / 1000, 10)  # Kazen za preveč datotek
        size_penalty = min(size / 100, 10)    # Kazen za velikost
        time_penalty = min(time * 2, 10)      # Kazen za počasen dostop
        
        base_score = 100
        total_penalty = file_penalty + size_penalty + time_penalty
        
        return max(round(base_score - total_penalty, 1), 0)
    
    def find_workspace_locations(self) -> List[str]:
        """Najdi možne workspace lokacije"""
        locations = []
        
        # Trenutna lokacija
        current_dir = os.getcwd()
        locations.append(current_dir)
        
        # Preveri nadrejene mape
        parent = Path(current_dir).parent
        for i in range(3):  # Preveri 3 nivoje navzgor
            if parent.exists() and parent != parent.parent:
                locations.append(str(parent))
                parent = parent.parent
            else:
                break
                
        # Preveri podmape z omni* imeni
        try:
            for item in os.listdir(current_dir):
                item_path = os.path.join(current_dir, item)
                if os.path.isdir(item_path) and item.startswith('omni'):
                    locations.append(item_path)
        except:
            pass
            
        return list(set(locations))  # Odstrani duplikate
    
    def analyze_all_locations(self) -> List[Dict]:
        """Analiziraj vse možne lokacije"""
        locations = self.find_workspace_locations()
        results = []
        
        print("🔍 Analiziram workspace lokacije...")
        
        for location in locations:
            print(f"   📁 {location}")
            result = self.analyze_directory(location)
            results.append(result)
            
        # Sortiraj po performance score
        results.sort(key=lambda x: x['performance_score'], reverse=True)
        
        return results
    
    def generate_report(self, results: List[Dict]) -> str:
        """Generiraj poročilo z priporočili"""
        if not results:
            return "❌ Ni najdenih lokacij za analizo"
            
        best = results[0]
        
        report = f"""
🎯 THEA WORKSPACE ANALIZA - PRIPOROČILA

{'='*60}

🏆 PRIPOROČENA LOKACIJA:
   📍 Path: {best['path']}
   ⚡ Performance Score: {best['performance_score']}/100
   📊 Skupaj datotek: {best['total_files']:,}
   🐍 Python datotek: {best['python_files']:,}
   📜 JS/TS datotek: {best['js_files']:,}
   💾 Velikost: {best['total_size_mb']} MB
   ⏱️  Čas analize: {best['analysis_time_seconds']}s
   🚀 Ocenjen LSP startup: {best['estimated_lsp_startup_time']}s

{'='*60}

📋 VSE LOKACIJE (sortirano po hitrosti):

"""
        
        for i, result in enumerate(results, 1):
            status = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "📁"
            
            report += f"""
{status} #{i} - Score: {result['performance_score']}/100
   📍 {result['path']}
   📊 {result['total_files']:,} datotek | {result['total_size_mb']} MB
   ⏱️  Analiza: {result['analysis_time_seconds']}s | LSP: {result['estimated_lsp_startup_time']}s
"""

        report += f"""

{'='*60}

🔧 PRIPOROČILA ZA OPTIMIZACIJO:

✅ Uporabi lokacijo: {best['path']}
✅ Ignoriraj mape: {', '.join(sorted(self.ignore_folders))}
✅ Nastavi .gitignore za velike datoteke
✅ Uporabi .pyrightconfig.json za Python projekte

{'='*60}

🚀 NASLEDNJI KORAKI:
1. Nastavi workspace na: {best['path']}
2. Konfiguriraj LSP ignore patterns
3. Preveri Pyright/LSP nastavitve
4. Testiraj performance

"""
        
        return report
    
    def save_config(self, best_location: str):
        """Shrani optimalno konfiguracijo"""
        config = {
            "workspace": {
                "default_path": best_location,
                "ignore_folders": list(self.ignore_folders),
                "lsp_settings": {
                    "python.analysis.exclude": list(self.ignore_folders),
                    "typescript.preferences.exclude": list(self.ignore_folders)
                }
            },
            "analysis_timestamp": time.time()
        }
        
        config_path = "thea_workspace_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
            
        print(f"💾 Konfiguracija shranjena v: {config_path}")

def main():
    """Glavna funkcija"""
    print("🤖 Thea Workspace Analyzer v1.0")
    print("=" * 50)
    
    analyzer = WorkspaceAnalyzer()
    
    # Analiziraj vse lokacije
    results = analyzer.analyze_all_locations()
    
    # Generiraj poročilo
    report = analyzer.generate_report(results)
    print(report)
    
    # Shrani konfiguracijo
    if results:
        analyzer.save_config(results[0]['path'])
    
    # Shrani poročilo
    with open('thea_workspace_analysis.txt', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("📄 Poročilo shranjeno v: thea_workspace_analysis.txt")

if __name__ == "__main__":
    main()