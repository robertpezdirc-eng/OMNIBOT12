#!/usr/bin/env python3
"""
Enostavna Thea Workspace Analiza
"""

import os
import time
from pathlib import Path

def quick_analysis():
    """Hitra analiza trenutne lokacije"""
    
    print("🤖 Thea Workspace Quick Analysis")
    print("=" * 50)
    
    current_path = os.getcwd()
    print(f"📍 Trenutna lokacija: {current_path}")
    
    # Preštej datoteke
    start_time = time.time()
    
    ignore_folders = {
        'node_modules', '.venv', '__pycache__', '.git', 
        'logs', 'tmp', 'cache', '.cache', 'temp', 
        'build', 'dist', '.next', '.nuxt', 'coverage',
        'venv', 'env'
    }
    
    total_files = 0
    python_files = 0
    js_files = 0
    large_dirs = []
    
    try:
        for root, dirs, files in os.walk('.'):
            # Filtriraj ignore mape
            original_dirs = dirs[:]
            dirs[:] = [d for d in dirs if d not in ignore_folders]
            
            # Zaznamuj velike mape
            for d in original_dirs:
                if d in ignore_folders:
                    dir_path = os.path.join(root, d)
                    if os.path.exists(dir_path):
                        large_dirs.append(dir_path)
            
            for file in files:
                total_files += 1
                if file.endswith('.py'):
                    python_files += 1
                elif file.endswith(('.js', '.ts', '.jsx', '.tsx')):
                    js_files += 1
                    
    except Exception as e:
        print(f"Napaka: {e}")
    
    analysis_time = time.time() - start_time
    
    # Oceni LSP čas
    estimated_lsp_time = 2.0 + (total_files * 0.001) + (python_files * 0.005)
    
    # Performance score
    file_penalty = min(total_files / 1000, 10)
    time_penalty = min(analysis_time * 2, 10)
    performance_score = max(100 - file_penalty - time_penalty, 0)
    
    print(f"""
🎯 ANALIZA REZULTATI:

📊 Statistike:
   • Skupaj datotek: {total_files:,}
   • Python datotek: {python_files:,}
   • JS/TS datotek: {js_files:,}
   • Čas analize: {analysis_time:.2f}s
   
⚡ Performance:
   • Performance Score: {performance_score:.1f}/100
   • Ocenjen LSP startup: {estimated_lsp_time:.2f}s
   
🚫 Ignorirane mape najdene:
""")
    
    for large_dir in large_dirs[:10]:  # Prikaži prvih 10
        print(f"   • {large_dir}")
    
    if len(large_dirs) > 10:
        print(f"   • ... in še {len(large_dirs) - 10} drugih")
    
    print(f"""
🎯 PRIPOROČILA:

✅ TRENUTNA LOKACIJA JE {"OPTIMALNA" if performance_score > 70 else "SPREJEMLJIVA" if performance_score > 50 else "POČASNA"}
   
✅ Nastavi .gitignore za:
   {', '.join(sorted(ignore_folders))}
   
✅ LSP nastavitve:
   - Ignoriraj: {len(large_dirs)} velikih map
   - Pričakovan startup: {estimated_lsp_time:.1f}s
   
✅ Optimizacija:
   - Uporabi trenutno lokacijo: {current_path}
   - Konfiguriraj Pyright exclude patterns
   - Nastavi TypeScript exclude za JS/TS projekte

{'='*50}
""")

    # Shrani konfiguracijo
    config_content = f"""{{
  "workspace": {{
    "recommended_path": "{current_path.replace(chr(92), chr(92)+chr(92))}",
    "performance_score": {performance_score:.1f},
    "total_files": {total_files},
    "estimated_lsp_startup": {estimated_lsp_time:.2f},
    "ignore_patterns": {list(ignore_folders)}
  }},
  "pyrightconfig": {{
    "exclude": {list(ignore_folders)}
  }}
}}"""
    
    with open('thea_workspace_config.json', 'w') as f:
        f.write(config_content)
    
    print("💾 Konfiguracija shranjena v: thea_workspace_config.json")
    
    return {
        'path': current_path,
        'performance_score': performance_score,
        'total_files': total_files,
        'lsp_time': estimated_lsp_time
    }

if __name__ == "__main__":
    result = quick_analysis()