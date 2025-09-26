#!/usr/bin/env python3
"""
🎮 Thea Command Interface v2.0
Enostaven vmesnik za upravljanje Advanced Queue Sistema

Ukazi:
- "OBDELATI NAJ ZDALEČE" / "po vrsti" → Sekvenčna obdelava
- "ZDruži vse skupaj" → Merge on demand
- "status" → Prikaži status queue
- "dodaj [prompt]" → Dodaj nov prompt
- "počisti" → Počisti queue
- "izvozi" → Izvozi rezultate
- "statistike" → Prikaži statistike
- "pomoč" → Prikaži pomoč
"""

import sys
import json
import time
from pathlib import Path
from thea_advanced_queue_system import TheaAdvancedQueueSystem, Priority, PromptStatus

class TheaCommandInterface:
    """
    🎮 Command Interface za Thea Advanced Queue System
    
    Omogoča enostavno upravljanje preko ukazne vrstice
    """
    
    def __init__(self):
        self.thea = TheaAdvancedQueueSystem()
        self.running = True
        
        # Definicija ukazov
        self.commands = {
            # Glavni ukazi iz specifikacije
            'obdelati naj zdaleče': self.process_queue,
            'po vrsti': self.process_queue,
            'združi vse skupaj': self.merge_results,
            
            # Dodatni ukazi za upravljanje
            'status': self.show_status,
            'dodaj': self.add_prompt_interactive,
            'počisti': self.clear_queue,
            'izvozi': self.export_results,
            'statistike': self.show_stats,
            'pomoč': self.show_help,
            'help': self.show_help,
            'exit': self.exit_interface,
            'quit': self.exit_interface,
            
            # Kratice
            's': self.show_status,
            'd': self.add_prompt_interactive,
            'p': self.process_queue,
            'm': self.merge_results,
            'h': self.show_help,
            'q': self.exit_interface
        }
        
        print("🚀 Thea Command Interface inicializiran")
        print("💡 Vtipkaj 'pomoč' za seznam ukazov")
    
    def process_command(self, command: str) -> bool:
        """Obdelaj ukaz uporabnika"""
        command = command.strip().lower()
        
        if not command:
            return True
        
        # Preveri direktne ukaze
        if command in self.commands:
            try:
                self.commands[command]()
            except Exception as e:
                print(f"❌ Napaka pri izvajanju ukaza: {e}")
            return True
        
        # Preveri ukaze z argumenti
        parts = command.split(' ', 1)
        base_command = parts[0]
        
        if base_command == 'dodaj' and len(parts) > 1:
            self.add_prompt_with_text(parts[1])
        elif base_command in self.commands:
            try:
                self.commands[base_command]()
            except Exception as e:
                print(f"❌ Napaka pri izvajanju ukaza: {e}")
        else:
            print(f"❓ Neznan ukaz: '{command}'. Vtipkaj 'pomoč' za seznam ukazov.")
        
        return True
    
    def process_queue(self):
        """🔄 OBDELATI NAJ ZDALEČE / po vrsti"""
        print("\n🚀 Izvajam sekvenčno obdelavo queue...")
        print("⏳ Prosim počakaj...")
        
        result = self.thea.process_queue_sequential()
        
        if 'error' in result:
            print(f"❌ {result['error']}")
            return
        
        print(f"\n✅ {result['message']}")
        
        if result['processed'] > 0:
            print(f"📊 Obdelanih: {result['processed']} promptov")
            
            # Prikaži povzetek rezultatov
            for i, res in enumerate(result['results'][:3], 1):  # Prikaži prve 3
                print(f"\n📝 Rezultat #{i}:")
                print(f"   Prompt: {res['content']}")
                print(f"   Čas: {res['processing_time']:.2f}s")
                print(f"   Viri: {', '.join(res['resources_used'])}")
            
            if len(result['results']) > 3:
                print(f"\n... in še {len(result['results']) - 3} rezultatov")
    
    def merge_results(self):
        """🎯 ZDruži vse skupaj"""
        print("\n🎯 Izvajam merge vseh rezultatov...")
        
        result = self.thea.merge_all_results()
        
        if 'error' in result:
            print(f"❌ {result['error']}")
            return
        
        print(f"\n✅ Uspešno združenih {result['merged_count']} rezultatov")
        print(f"⏱️ Skupni čas obdelave: {result['total_processing_time']:.2f}s")
        print(f"🔧 Uporabljeni viri: {', '.join(result['resources_used'])}")
        
        # Shrani merged rezultat v datoteko
        filename = f"thea_merged_results_{int(time.time())}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(result['merged_result'])
        
        print(f"📄 Združeni rezultati shranjeni v: {filename}")
        
        # Prikaži del rezultata
        lines = result['merged_result'].split('\n')
        preview_lines = lines[:20]  # Prvi 20 vrstic
        
        print("\n📋 Predogled združenih rezultatov:")
        print("-" * 60)
        for line in preview_lines:
            print(line)
        
        if len(lines) > 20:
            print(f"\n... in še {len(lines) - 20} vrstic")
    
    def show_status(self):
        """📊 Prikaži status queue"""
        status = self.thea.get_queue_status()
        
        print("\n📊 STATUS THEA QUEUE")
        print("=" * 40)
        print(f"📝 Skupaj promptov: {status['total_prompts']}")
        print(f"⚙️ Obdelava v teku: {'Da' if status['is_processing'] else 'Ne'}")
        print(f"💾 Cache velikost: {status['cache_size']} elementov")
        
        print("\n📋 Razdelitev po statusu:")
        for status_name, count in status['status_breakdown'].items():
            emoji = {
                'pending': '⏳',
                'processing': '⚙️',
                'done': '✅',
                'error': '❌',
                'merged': '🎯'
            }.get(status_name, '📄')
            
            print(f"   {emoji} {status_name.upper()}: {count}")
        
        # Prikaži zadnje prompte
        recent_prompts = list(self.thea.queue.values())[-5:]  # Zadnjih 5
        if recent_prompts:
            print("\n📝 Zadnji prompti:")
            for prompt in recent_prompts:
                status_emoji = {
                    PromptStatus.PENDING: '⏳',
                    PromptStatus.PROCESSING: '⚙️',
                    PromptStatus.DONE: '✅',
                    PromptStatus.ERROR: '❌',
                    PromptStatus.MERGED: '🎯'
                }.get(prompt.status, '📄')
                
                content_preview = prompt.content[:50] + "..." if len(prompt.content) > 50 else prompt.content
                print(f"   {status_emoji} {content_preview}")
    
    def add_prompt_interactive(self):
        """📝 Dodaj nov prompt interaktivno"""
        print("\n📝 DODAJ NOV PROMPT")
        print("-" * 30)
        
        try:
            content = input("💬 Vnesi prompt: ").strip()
            if not content:
                print("❌ Prazen prompt ni dovoljen")
                return
            
            print("\n🎯 Izberi prioriteto:")
            print("1. Nizka (LOW)")
            print("2. Srednja (MEDIUM)")
            print("3. Visoka (HIGH)")
            print("4. Kritična (CRITICAL)")
            
            priority_choice = input("Izbira (1-4, default 2): ").strip()
            
            priority_map = {
                '1': Priority.LOW,
                '2': Priority.MEDIUM,
                '3': Priority.HIGH,
                '4': Priority.CRITICAL
            }
            
            priority = priority_map.get(priority_choice, Priority.MEDIUM)
            
            # Dodaj metadata
            metadata = {
                'added_via': 'command_interface',
                'timestamp': time.time()
            }
            
            prompt_id = self.thea.add_prompt(content, priority, metadata)
            
            print(f"\n✅ Prompt dodan uspešno!")
            print(f"🆔 ID: {prompt_id[:8]}...")
            print(f"🎯 Prioriteta: {priority.name}")
            
        except KeyboardInterrupt:
            print("\n❌ Prekinjeno")
        except Exception as e:
            print(f"❌ Napaka: {e}")
    
    def add_prompt_with_text(self, content: str):
        """📝 Dodaj prompt z besedilom"""
        if not content.strip():
            print("❌ Prazen prompt ni dovoljen")
            return
        
        prompt_id = self.thea.add_prompt(content.strip(), Priority.MEDIUM, {
            'added_via': 'command_interface',
            'timestamp': time.time()
        })
        
        print(f"✅ Prompt dodan: {prompt_id[:8]}...")
    
    def clear_queue(self):
        """🧹 Počisti queue"""
        print("\n🧹 POČISTI QUEUE")
        print("-" * 25)
        print("1. Počisti vse")
        print("2. Počisti samo pending")
        print("3. Počisti samo done")
        print("4. Počisti samo error")
        print("0. Prekliči")
        
        try:
            choice = input("Izbira (0-4): ").strip()
            
            if choice == '0':
                print("❌ Prekinjeno")
                return
            elif choice == '1':
                confirm = input("⚠️ Res počisti VSE prompte? (da/ne): ").strip().lower()
                if confirm in ['da', 'yes', 'y']:
                    self.thea.clear_queue()
                    print("✅ Queue popolnoma počiščen")
                else:
                    print("❌ Prekinjeno")
            elif choice == '2':
                self.thea.clear_queue(PromptStatus.PENDING)
                print("✅ Pending prompti počiščeni")
            elif choice == '3':
                self.thea.clear_queue(PromptStatus.DONE)
                print("✅ Done prompti počiščeni")
            elif choice == '4':
                self.thea.clear_queue(PromptStatus.ERROR)
                print("✅ Error prompti počiščeni")
            else:
                print("❌ Neveljavna izbira")
                
        except KeyboardInterrupt:
            print("\n❌ Prekinjeno")
        except Exception as e:
            print(f"❌ Napaka: {e}")
    
    def export_results(self):
        """📄 Izvozi rezultate"""
        print("\n📄 Izvažam rezultate...")
        
        try:
            filename = self.thea.export_results("json")
            print(f"✅ Rezultati izvoženi v: {filename}")
            
            # Prikaži osnovne informacije o izvozu
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"📊 Izvoženih rezultatov: {data['total_results']}")
            print(f"📅 Čas izvoza: {time.ctime(data['export_timestamp'])}")
            
        except Exception as e:
            print(f"❌ Napaka pri izvozu: {e}")
    
    def show_stats(self):
        """📈 Prikaži statistike"""
        stats = self.thea.get_stats()
        
        print("\n📈 THEA STATISTIKE")
        print("=" * 35)
        
        print(f"📝 Skupaj promptov: {stats['total_prompts']}")
        print(f"✅ Obdelanih: {stats['processed_prompts']}")
        print(f"❌ Neuspešnih: {stats['failed_prompts']}")
        print(f"🎯 Merge operacij: {stats['merge_operations']}")
        
        print(f"\n💾 Cache hits: {stats['cache_hits']}")
        print(f"💾 Cache misses: {stats['cache_misses']}")
        print(f"📊 Cache učinkovitost: {stats['cache_efficiency']:.1%}")
        
        print(f"\n🎯 Uspešnost: {stats['success_rate']:.1%}")
        print(f"📦 Queue velikost: {stats['queue_size']}")
    
    def show_help(self):
        """❓ Prikaži pomoč"""
        print("\n🎮 THEA COMMAND INTERFACE - POMOČ")
        print("=" * 50)
        
        print("\n🎯 GLAVNI UKAZI (iz specifikacije):")
        print("   'OBDELATI NAJ ZDALEČE' ali 'po vrsti'")
        print("      → Sekvenčna obdelava vseh pending promptov")
        print("   'ZDruži vse skupaj'")
        print("      → Združi vse done rezultate v globalen output")
        
        print("\n⚙️ UPRAVLJANJE:")
        print("   'status' (s)     → Prikaži status queue")
        print("   'dodaj [tekst]'  → Dodaj nov prompt")
        print("   'počisti'        → Počisti queue")
        print("   'izvozi'         → Izvozi rezultate v JSON")
        print("   'statistike'     → Prikaži sistemske statistike")
        
        print("\n🔧 OSTALO:")
        print("   'pomoč' (h)      → Prikaži to pomoč")
        print("   'exit' (q)       → Izhod iz vmesnika")
        
        print("\n💡 PRIMERI:")
        print("   dodaj Analiziraj prodajne podatke")
        print("   OBDELATI NAJ ZDALEČE")
        print("   ZDruži vse skupaj")
        print("   status")
    
    def exit_interface(self):
        """🚪 Izhod iz vmesnika"""
        print("\n👋 Zapuščam Thea Command Interface...")
        
        # Prikaži končne statistike
        stats = self.thea.get_stats()
        if stats['total_prompts'] > 0:
            print(f"📊 Skupaj obdelanih: {stats['processed_prompts']}/{stats['total_prompts']} promptov")
            print(f"🎯 Uspešnost: {stats['success_rate']:.1%}")
        
        self.running = False
    
    def run_interactive(self):
        """🎮 Zaženi interaktivni vmesnik"""
        print("\n🎮 THEA INTERACTIVE MODE")
        print("=" * 40)
        print("💡 Vtipkaj ukaze ali 'pomoč' za navodila")
        print("🚪 Za izhod vtipkaj 'exit' ali pritisni Ctrl+C")
        
        try:
            while self.running:
                try:
                    command = input("\n🤖 Thea> ").strip()
                    if not self.process_command(command):
                        break
                except KeyboardInterrupt:
                    print("\n\n👋 Prekinjeno s Ctrl+C")
                    break
                except EOFError:
                    print("\n\n👋 EOF signal")
                    break
        except Exception as e:
            print(f"\n❌ Nepričakovana napaka: {e}")
        
        print("🔚 Thea Command Interface končan")

def main():
    """Glavna funkcija"""
    if len(sys.argv) > 1:
        # Command line mode
        interface = TheaCommandInterface()
        command = ' '.join(sys.argv[1:])
        print(f"🎮 Izvajam ukaz: {command}")
        interface.process_command(command)
    else:
        # Interactive mode
        interface = TheaCommandInterface()
        interface.run_interactive()

if __name__ == "__main__":
    main()