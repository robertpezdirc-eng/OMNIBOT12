"""
🧠 OMNI CORE ENGINE
Glavno jedro Omni inteligence z NLP, spominom in učenjem
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

# Nastavimo logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class OmniMemory:
    """Struktura za shranjevanje spominov"""
    id: str
    content: str
    timestamp: datetime
    category: str
    importance: float
    metadata: Dict[str, Any]

@dataclass
class OmniModule:
    """Struktura za module"""
    name: str
    description: str
    functions: List[str]
    active: bool = True

class OmniCore:
    """
    🧠 Glavno jedro Omni inteligence
    
    Funkcionalnosti:
    - NLP procesiranje
    - Kratkoročni in dolgoročni spomin
    - Samo-učenje in evolucija
    - Modularni sistem
    """
    
    def __init__(self, data_dir: str = "data", debug: bool = False, data_path: str = None):
        self.data_dir = data_path or data_dir
        self.debug = debug
        self.memory: List[OmniMemory] = []
        self.modules: Dict[str, OmniModule] = {}
        self.integrations: Dict[str, Any] = {}
        self.learning_data: Dict[str, Any] = {}
        
        # OpenAI client inicializacija
        self.client = None
        self._init_openai_client()
        
        # Inicializacija
        self._init_directories()
        self._load_memory()
        self._load_learning_data()
        
        if self.debug:
            logger.info("🚀 OmniCore inicializiran (DEBUG način)")
        else:
            logger.info("🚀 OmniCore inicializiran")
    
    def _init_openai_client(self):
        """Inicializiraj OpenAI client"""
        try:
            import openai
            import os
            
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                self.client = openai.OpenAI(api_key=api_key)
                logger.info("🤖 OpenAI client inicializiran")
            else:
                logger.warning("⚠️ OPENAI_API_KEY ni nastavljen")
        except ImportError:
            logger.warning("⚠️ OpenAI paket ni nameščen")
        except Exception as e:
            logger.error(f"❌ Napaka pri inicializaciji OpenAI: {e}")
    
    def _init_directories(self):
        """Ustvari potrebne direktorije"""
        os.makedirs(f"{self.data_dir}/memory", exist_ok=True)
        os.makedirs(f"{self.data_dir}/learning", exist_ok=True)
        os.makedirs(f"{self.data_dir}/logs", exist_ok=True)
    
    def _load_memory(self):
        """Naloži spomine iz datoteke"""
        memory_file = f"{self.data_dir}/memory/long_term.json"
        if os.path.exists(memory_file):
            try:
                with open(memory_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.memory = [
                        OmniMemory(
                            id=item['id'],
                            content=item['content'],
                            timestamp=datetime.fromisoformat(item['timestamp']),
                            category=item['category'],
                            importance=item['importance'],
                            metadata=item['metadata']
                        ) for item in data
                    ]
                logger.info(f"📚 Naloženih {len(self.memory)} spominov")
            except Exception as e:
                logger.error(f"❌ Napaka pri nalaganju spominov: {e}")
    
    def _save_memory(self):
        """Shrani spomine v datoteko"""
        memory_file = f"{self.data_dir}/memory/long_term.json"
        try:
            data = []
            for memory in self.memory:
                memory_dict = asdict(memory)
                memory_dict['timestamp'] = memory.timestamp.isoformat()
                data.append(memory_dict)
            
            with open(memory_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"💾 Shranjenih {len(self.memory)} spominov")
        except Exception as e:
            logger.error(f"❌ Napaka pri shranjevanju spominov: {e}")
    
    def _load_learning_data(self):
        """Naloži podatke za učenje"""
        learning_file = f"{self.data_dir}/learning/patterns.json"
        if os.path.exists(learning_file):
            try:
                with open(learning_file, 'r', encoding='utf-8') as f:
                    self.learning_data = json.load(f)
                logger.info("🎓 Naloženi podatki za učenje")
            except Exception as e:
                logger.error(f"❌ Napaka pri nalaganju učnih podatkov: {e}")
    
    def add_memory(self, content: str, category: str = "general", 
                   importance: float = 0.5, metadata: Dict[str, Any] = None):
        """Dodaj nov spomin"""
        if metadata is None:
            metadata = {}
        
        memory = OmniMemory(
            id=f"mem_{len(self.memory)}_{datetime.now().timestamp()}",
            content=content,
            timestamp=datetime.now(),
            category=category,
            importance=importance,
            metadata=metadata
        )
        
        self.memory.append(memory)
        self._save_memory()
        logger.info(f"🧠 Dodan spomin: {content[:50]}...")
    
    def search_memory(self, query: str, category: Optional[str] = None) -> List[OmniMemory]:
        """Poišči spomine po vsebini"""
        results = []
        query_lower = query.lower()
        
        for memory in self.memory:
            if query_lower in memory.content.lower():
                if category is None or memory.category == category:
                    results.append(memory)
        
        # Razvrsti po pomembnosti
        results.sort(key=lambda x: x.importance, reverse=True)
        return results
    
    def register_module(self, module_name: str, module_instance: Any):
        """Registriraj nov modul"""
        try:
            # Pridobi funkcije modula
            functions = [func for func in dir(module_instance) 
                        if not func.startswith('_') and callable(getattr(module_instance, func))]
            
            module = OmniModule(
                name=module_name,
                description=getattr(module_instance, 'description', f"{module_name} modul"),
                functions=functions
            )
            
            self.modules[module_name] = module
            logger.info(f"📦 Registriran modul: {module_name}")
            
            # Dodaj v spomin
            self.add_memory(
                f"Registriran nov modul: {module_name}",
                category="system",
                importance=0.8,
                metadata={"module": module_name, "functions": functions}
            )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri registraciji modula {module_name}: {e}")
    
    def register_integration(self, integration_name: str, integration_instance: Any):
        """Registriraj novo integracijo"""
        try:
            self.integrations[integration_name] = integration_instance
            logger.info(f"🔗 Registrirana integracija: {integration_name}")
            
            # Dodaj v spomin
            self.add_memory(
                f"Registrirana nova integracija: {integration_name}",
                category="system",
                importance=0.7,
                metadata={"integration": integration_name}
            )
            
        except Exception as e:
            logger.error(f"❌ Napaka pri registraciji integracije {integration_name}: {e}")
    
    def ask_ai(self, user_prompt: str) -> Dict[str, Any]:
        """
        Pošlje prompt GPT modelu z maksimalno optimizacijo za hitro in univerzalno analizo.
        """
        if not self.client:
            return {"ai_response": "❌ OpenAI client ni na voljo", "execution_time": None}
        
        # Preveri, če je potrebno spletno iskanje
        web_results = self._get_web_context(user_prompt)
        
        optimized_prompt = f"""
=== OMNI MAX PROMPT (OPTIMIZED) ===
Ti si Meta-Omni Agent – univerzalni AI, sposoben obdelave vseh vrst podatkov, modulov in API-jev.

Naloge:
1. Analiziraj prompt uporabnika.
2. Razdeli naloge med ustrezne module.
3. Prioritiziraj hitro izvedljive operacije in asinhrono obdelaj velike naloge.
4. Shrani vse relevantno v spomin.
5. Vrni JSON: {{input, ai_response, modules, memory_length, execution_time}}.

{web_results}

Uporabnik: {user_prompt}
--- KONEC PROMPTA ---
"""
        
        try:
            import time
            start_time = time.time()
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": optimized_prompt}]
            )
            
            ai_response = response.choices[0].message.content
            execution_time = round(time.time() - start_time, 2)
            
            return {"ai_response": ai_response, "execution_time": execution_time}
            
        except Exception as e:
            return {"ai_response": f"❌ AI error: {str(e)}", "execution_time": None}
    
    def _get_web_context(self, query: str) -> str:
        """Pridobi spletni kontekst, če je na voljo"""
        try:
            # Preveri, če je web search integracija registrirana
            if 'web_search' in self.integrations:
                web_search = self.integrations['web_search']
                
                # Določi, ali potrebujemo spletno iskanje
                search_keywords = ['aktualno', 'trenutno', 'najnovejše', 'cena', 'vreme', 'novice']
                needs_web_search = any(keyword in query.lower() for keyword in search_keywords)
                
                if needs_web_search:
                    results = web_search.search_web(query, 3)
                    if results.get('results'):
                        context = "\n=== SPLETNI KONTEKST ===\n"
                        for result in results['results'][:3]:
                            context += f"• {result['title']}: {result['snippet']}\n"
                        context += "=== KONEC SPLETNEGA KONTEKSTA ===\n"
                        return context
            
            return ""
            
        except Exception as e:
            logger.error(f"❌ Napaka pri pridobivanju spletnega konteksta: {e}")
            return ""
    
    def remember(self, input_text: str):
        """Dodaj vnos v spomin"""
        self.add_memory(
            f"Uporabnikov vnos: {input_text}",
            category="interaction",
            importance=0.6,
            metadata={"timestamp": datetime.now().isoformat()}
        )
    
    def run(self, input_text: str) -> Dict[str, Any]:
        """
        Glavna funkcija za izvajanje Omni zahtev
        Vključuje AI analizo, module in Bing Search integracijo
        """
        import time
        start_time = time.time()
        
        # Shrani v spomin
        self.remember(input_text)
        
        # Pridobi AI analizo
        ai_result = self.ask_ai(input_text)
        
        # Asinhrono izvajanje modulov
        modules_output = {}
        for module_name, module in self.modules.items():
            try:
                # Poskusi poklicati run metodo modula
                if hasattr(module, "run"):
                    modules_output[module_name] = module.run(input_text)
                else:
                    modules_output[module_name] = f"{module_name} modul pripravljen"
            except Exception as e:
                modules_output[module_name] = f"❌ Error: {str(e)}"
        
        # Bing Search integracija
        search_results = []
        try:
            if 'search_bing' in self.integrations:
                search_results = self.integrations['search_bing'].search(input_text, count=5)
                logger.info(f"🔍 Bing Search: {len(search_results)} rezultatov")
            else:
                search_results = [{"info": "Bing Search integracija ni registrirana"}]
        except Exception as e:
            search_results = [{"error": f"Bing Search napaka: {str(e)}"}]
            logger.error(f"❌ Bing Search napaka: {e}")
        
        total_time = round(time.time() - start_time, 2)
        
        result = {
            "input": input_text,
            "ai_response": ai_result["ai_response"],
            "modules": modules_output,
            "search_results": search_results,
            "memory_length": len(self.memory),
            "execution_time": total_time
        }
        
        # Shrani rezultat za učenje
        self.learn_from_interaction(result)
        
        return result
        """
        Glavna funkcija za procesiranje uporabnikovega vnosa
        """
        if context is None:
            context = {}
        
        logger.info(f"🎯 Procesiram: {user_input}")
        
        # Dodaj v spomin
        self.add_memory(
            f"Uporabnikov vnos: {user_input}",
            category="interaction",
            importance=0.6,
            metadata={"context": context}
        )
        
        # Poišči relevantne spomine
        relevant_memories = self.search_memory(user_input)
        
        # Pripravi odgovor
        response = {
            "input": user_input,
            "timestamp": datetime.now().isoformat(),
            "relevant_memories": len(relevant_memories),
            "available_modules": list(self.modules.keys()),
            "available_integrations": list(self.integrations.keys()),
            "response": f"Procesiram: {user_input}",
            "context": context
        }
        
        return response
    
    def get_status(self) -> Dict[str, Any]:
        """Vrni status Omni sistema"""
        return {
            "core_active": True,
            "memory_count": len(self.memory),
            "modules_count": len(self.modules),
            "integrations_count": len(self.integrations),
            "modules": list(self.modules.keys()),
            "integrations": list(self.integrations.keys()),
            "last_memory": self.memory[-1].content if self.memory else None
        }
    
    def learn_from_interaction(self, interaction_data: Dict[str, Any]):
        """Učenje iz interakcij"""
        try:
            # Analiziraj vzorce
            pattern_key = f"pattern_{len(self.learning_data)}"
            self.learning_data[pattern_key] = {
                "timestamp": datetime.now().isoformat(),
                "data": interaction_data,
                "learned": True
            }
            
            # Shrani učne podatke
            learning_file = f"{self.data_dir}/learning/patterns.json"
            with open(learning_file, 'w', encoding='utf-8') as f:
                json.dump(self.learning_data, f, ensure_ascii=False, indent=2)
            
            logger.info("🎓 Naučil sem se iz interakcije")
            
        except Exception as e:
            logger.error(f"❌ Napaka pri učenju: {e}")
    
    def shutdown(self):
        """Varno zaustavitev sistema"""
        logger.info("🛑 Zaustavitev OmniCore...")
        self._save_memory()
        logger.info("✅ OmniCore zaustavljen")

if __name__ == "__main__":
    # Test OmniCore
    omni = OmniCore()
    
    # Test osnovnih funkcij
    omni.add_memory("Test spomin", "test", 0.8)
    
    response = omni.process_input("Pozdrav, kako si?")
    print("📤 Odgovor:", response)
    
    status = omni.get_status()
    print("📊 Status:", status)
    
    omni.shutdown()