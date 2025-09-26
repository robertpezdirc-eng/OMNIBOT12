"""
Thea Queue System - "Queue + Merge on Demand"
Sistem za odlaganje promptov v queue in združevanje rezultatov na zahtevo
"""

import json
import time
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Nastavitev logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PromptStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"

@dataclass
class QueuedPrompt:
    """Struktura za prompt v queue"""
    id: str
    content: str
    timestamp: datetime
    status: PromptStatus
    result: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class TheaQueueSystem:
    """
    Thea Queue System - glavna logika za upravljanje promptov
    """
    
    def __init__(self):
        self.queue: List[QueuedPrompt] = []
        self.processed_results: List[Dict[str, Any]] = []
        self.is_processing = False
        
    def add_prompt_to_queue(self, prompt_content: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Dodaj nov prompt v queue
        
        Args:
            prompt_content: Vsebina prompta
            metadata: Dodatni metapodatki
            
        Returns:
            ID prompta v queue
        """
        prompt_id = f"prompt_{int(time.time() * 1000)}"
        
        queued_prompt = QueuedPrompt(
            id=prompt_id,
            content=prompt_content,
            timestamp=datetime.now(),
            status=PromptStatus.QUEUED,
            metadata=metadata or {}
        )
        
        self.queue.append(queued_prompt)
        logger.info(f"Prompt dodan v queue: {prompt_id}")
        
        return prompt_id
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Vrni status queue"""
        return {
            "total_prompts": len(self.queue),
            "queued": len([p for p in self.queue if p.status == PromptStatus.QUEUED]),
            "processing": len([p for p in self.queue if p.status == PromptStatus.PROCESSING]),
            "done": len([p for p in self.queue if p.status == PromptStatus.DONE]),
            "error": len([p for p in self.queue if p.status == PromptStatus.ERROR]),
            "is_processing": self.is_processing
        }
    
    async def lazy_load_resources(self, prompt: QueuedPrompt) -> Dict[str, Any]:
        """
        Lazy loading - naloži samo potrebne podatke za prompt
        
        Args:
            prompt: Prompt za obdelavo
            
        Returns:
            Naloženi viri in podatki
        """
        logger.info(f"Lazy loading virov za prompt: {prompt.id}")
        
        # Simulacija nalaganja virov
        resources = {
            "timestamp": datetime.now().isoformat(),
            "prompt_id": prompt.id,
            "loaded_modules": [],
            "data_sources": []
        }
        
        # Preveri, katere module potrebuje prompt
        content_lower = prompt.content.lower()
        
        if any(keyword in content_lower for keyword in ["finance", "finančni", "denar", "proračun"]):
            resources["loaded_modules"].append("finance")
            resources["data_sources"].append("finance.db")
            
        if any(keyword in content_lower for keyword in ["turizem", "potovanje", "hotel", "aktivnosti"]):
            resources["loaded_modules"].append("tourism")
            resources["data_sources"].append("tourism.db")
            
        if any(keyword in content_lower for keyword in ["zdravje", "wellness", "prehrana", "vadba"]):
            resources["loaded_modules"].append("healthcare")
            resources["data_sources"].append("healthcare.db")
            
        if any(keyword in content_lower for keyword in ["iot", "senzor", "naprava", "monitoring"]):
            resources["loaded_modules"].append("iot")
            resources["data_sources"].append("iot_logs.json")
        
        # Simulacija časa nalaganja
        await asyncio.sleep(0.1)
        
        logger.info(f"Naloženi moduli: {resources['loaded_modules']}")
        return resources
    
    async def process_single_prompt(self, prompt: QueuedPrompt) -> str:
        """
        Obdelaj posamezen prompt
        
        Args:
            prompt: Prompt za obdelavo
            
        Returns:
            Rezultat obdelave
        """
        try:
            prompt.status = PromptStatus.PROCESSING
            logger.info(f"Obdelavam prompt: {prompt.id}")
            
            # Lazy loading virov
            resources = await self.lazy_load_resources(prompt)
            
            # Simulacija obdelave prompta
            await asyncio.sleep(0.2)
            
            # Generiraj rezultat na podlagi vsebine prompta
            result = self._generate_prompt_result(prompt, resources)
            
            prompt.result = result
            prompt.status = PromptStatus.DONE
            
            logger.info(f"Prompt uspešno obdelan: {prompt.id}")
            return result
            
        except Exception as e:
            prompt.status = PromptStatus.ERROR
            prompt.error = str(e)
            logger.error(f"Napaka pri obdelavi prompta {prompt.id}: {e}")
            raise
    
    def _generate_prompt_result(self, prompt: QueuedPrompt, resources: Dict[str, Any]) -> str:
        """
        Generiraj rezultat za prompt na podlagi vsebine in naloženih virov
        
        Args:
            prompt: Prompt
            resources: Naloženi viri
            
        Returns:
            Generirani rezultat
        """
        content = prompt.content.lower()
        modules = resources.get("loaded_modules", [])
        
        result_parts = [
            f"Rezultat za prompt: {prompt.content[:50]}...",
            f"Obdelano ob: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Uporabljeni moduli: {', '.join(modules) if modules else 'Splošni'}"
        ]
        
        # Generiraj specifičen odgovor glede na vsebino
        if "finance" in modules:
            result_parts.append("💰 Finančna analiza: Priporočam optimizacijo stroškov in diverzifikacijo investicij.")
            
        if "tourism" in modules:
            result_parts.append("🏖️ Turistični predlogi: Pripravljeni so itinerarji za različne destinacije.")
            
        if "healthcare" in modules:
            result_parts.append("🏥 Zdravstveni nasveti: Priporočam redne preglede in zdravo prehrano.")
            
        if "iot" in modules:
            result_parts.append("📡 IoT monitoring: Vsi senzorji delujejo normalno, podatki se redno posodabljajo.")
        
        if not modules:
            result_parts.append("🤖 Splošen odgovor: Analiziral sem vašo zahtevo in pripravil ustrezne predloge.")
        
        return "\n".join(result_parts)
    
    async def merge_all_results(self) -> Dict[str, Any]:
        """
        Združi vse rezultate - glavna funkcija za "Združi vse skupaj"
        
        Returns:
            Konsolidiran output vseh promptov
        """
        if self.is_processing:
            raise Exception("Sistem že obdeluje prompte. Počakajte, da se konča.")
        
        self.is_processing = True
        logger.info("Začenjam združevanje vseh rezultatov...")
        
        try:
            # Obdelaj vse prompte v queue
            for prompt in self.queue:
                if prompt.status == PromptStatus.QUEUED:
                    await self.process_single_prompt(prompt)
            
            # Zberi vse rezultate
            successful_results = []
            failed_results = []
            
            for prompt in self.queue:
                if prompt.status == PromptStatus.DONE:
                    successful_results.append({
                        "id": prompt.id,
                        "original_prompt": prompt.content,
                        "result": prompt.result,
                        "timestamp": prompt.timestamp.isoformat(),
                        "metadata": prompt.metadata
                    })
                elif prompt.status == PromptStatus.ERROR:
                    failed_results.append({
                        "id": prompt.id,
                        "original_prompt": prompt.content,
                        "error": prompt.error,
                        "timestamp": prompt.timestamp.isoformat()
                    })
            
            # Ustvari konsolidiran output
            consolidated_output = {
                "merge_timestamp": datetime.now().isoformat(),
                "total_prompts_processed": len(self.queue),
                "successful_results": len(successful_results),
                "failed_results": len(failed_results),
                "summary": self._generate_consolidated_summary(successful_results),
                "detailed_results": successful_results,
                "errors": failed_results,
                "statistics": self._generate_statistics(successful_results)
            }
            
            # Shrani rezultate
            self.processed_results.append(consolidated_output)
            
            logger.info(f"Združevanje končano. Obdelanih {len(successful_results)} promptov.")
            return consolidated_output
            
        finally:
            self.is_processing = False
    
    def _generate_consolidated_summary(self, results: List[Dict[str, Any]]) -> str:
        """
        Generiraj povzetek vseh rezultatov
        
        Args:
            results: Seznam uspešnih rezultatov
            
        Returns:
            Konsolidiran povzetek
        """
        if not results:
            return "Ni rezultatov za povzetek."
        
        summary_parts = [
            f"📊 KONSOLIDIRAN POVZETEK ({len(results)} promptov)",
            "=" * 50
        ]
        
        # Analiziraj tipe promptov
        module_usage = {}
        for result in results:
            result_text = result.get("result", "")
            if "Finančna analiza" in result_text:
                module_usage["finance"] = module_usage.get("finance", 0) + 1
            if "Turistični predlogi" in result_text:
                module_usage["tourism"] = module_usage.get("tourism", 0) + 1
            if "Zdravstveni nasveti" in result_text:
                module_usage["healthcare"] = module_usage.get("healthcare", 0) + 1
            if "IoT monitoring" in result_text:
                module_usage["iot"] = module_usage.get("iot", 0) + 1
        
        if module_usage:
            summary_parts.append("🔧 Uporabljeni moduli:")
            for module, count in module_usage.items():
                summary_parts.append(f"  • {module}: {count}x")
        
        summary_parts.extend([
            "",
            "✅ Vsi prompti so bili uspešno obdelani in združeni.",
            "📈 Rezultati so pripravljeni za nadaljnjo uporabo.",
            f"⏰ Obdelano ob: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        ])
        
        return "\n".join(summary_parts)
    
    def _generate_statistics(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generiraj statistike obdelave
        
        Args:
            results: Seznam rezultatov
            
        Returns:
            Statistike
        """
        return {
            "total_processed": len(results),
            "average_processing_time": "~0.3s",  # Simulacija
            "modules_used": len(set(r.get("metadata", {}).get("modules", []) for r in results)),
            "success_rate": "100%" if results else "0%"
        }
    
    def clear_queue(self):
        """Počisti queue"""
        self.queue.clear()
        logger.info("Queue počiščen")
    
    def export_results(self, filename: str = None) -> str:
        """
        Izvozi rezultate v JSON datoteko
        
        Args:
            filename: Ime datoteke (opcijsko)
            
        Returns:
            Pot do izvožene datoteke
        """
        if not filename:
            filename = f"thea_results_{int(time.time())}.json"
        
        filepath = f"C:\\Users\\admin\\Downloads\\copy-of-copy-of-omniscient-ai-platform\\{filename}"
        
        export_data = {
            "export_timestamp": datetime.now().isoformat(),
            "queue_status": self.get_queue_status(),
            "all_prompts": [asdict(prompt) for prompt in self.queue],
            "processed_results": self.processed_results
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"Rezultati izvoženi v: {filepath}")
        return filepath

# Globalna instanca Thea sistema
thea_system = TheaQueueSystem()

# Pomožne funkcije za enostavno uporabo
def add_prompt(content: str, metadata: Dict[str, Any] = None) -> str:
    """Dodaj prompt v queue"""
    return thea_system.add_prompt_to_queue(content, metadata)

async def merge_all() -> Dict[str, Any]:
    """Združi vse prompte - glavna funkcija"""
    return await thea_system.merge_all_results()

def get_status() -> Dict[str, Any]:
    """Pridobi status queue"""
    return thea_system.get_queue_status()

def clear_all():
    """Počisti vse"""
    thea_system.clear_queue()

if __name__ == "__main__":
    # Test primer
    async def test_thea_system():
        print("🤖 Thea Queue System - Test")
        print("=" * 40)
        
        # Dodaj teste prompte
        prompt1 = add_prompt("Analiziraj moj mesečni proračun in predlagaj optimizacije")
        prompt2 = add_prompt("Pripravi turistični itinerar za Bled, 3 dni")
        prompt3 = add_prompt("Kakšni so trendi v IoT tehnologiji?")
        prompt4 = add_prompt("Predlagaj zdravo prehrano za športnike")
        
        print(f"Dodani prompti: {prompt1}, {prompt2}, {prompt3}, {prompt4}")
        print(f"Status queue: {get_status()}")
        
        # Združi vse rezultate
        print("\n🔄 Združujem vse rezultate...")
        results = await merge_all()
        
        print("\n📊 KONČNI REZULTAT:")
        print(results["summary"])
        
        # Izvozi rezultate
        export_file = thea_system.export_results()
        print(f"\n💾 Rezultati izvoženi v: {export_file}")
    
    # Zaženi test
    asyncio.run(test_thea_system())