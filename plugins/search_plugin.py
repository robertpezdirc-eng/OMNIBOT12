# Search and Information Retrieval Plugin
import json
import os
import re
from datetime import datetime
import sys
sys.path.append('..')

# Definiramo PluginBase lokalno za neodvisnost
class PluginBase:
    """Osnova za vse plugin-e"""
    name = "base"
    description = "Generic plugin"
    version = "1.0.0"
    author = "OmniCore"
    enabled = True
    capabilities = []
    dependencies = []
    
    def handle(self, query, context=None):
        raise NotImplementedError("Vsak plugin mora implementirati handle()")
    
    def can_handle(self, query):
        """Vrni oceno 0-1 kako dobro plugin lahko obravnava zahtevo"""
        return 0.0
    
    def get_help(self):
        """Vrni pomoč za plugin"""
        return f"Plugin {self.name}: {self.description}"
    
    def update_stats(self, success=True):
        """Posodobi statistike plugin-a"""
        pass
    
    def health_check(self):
        """Preveri zdravje plugin-a"""
        try:
            # Preveri dostopnost podatkovnih datotek
            data_accessible = os.path.exists(self.search_index_file)
            
            # Preveri velikost indeksa
            index_size = len(self.search_index.get("documents", []))
            
            # Določi status
            if data_accessible and index_size > 0:
                status = "healthy"
            elif data_accessible:
                status = "standby"  # Dostopen, vendar prazen
            else:
                status = "error"
            
            return {
                "status": status,
                "timestamp": datetime.now().timestamp(),
                "details": {
                    "data_accessible": data_accessible,
                    "documents_count": index_size,
                    "index_file": self.search_index_file
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().timestamp(),
                "error": str(e)
            }


class Plugin(PluginBase):
    name = "search"
    description = "Iskanje po podatkih, dokumentih, bazah znanja"
    
    def __init__(self):
        self.search_index_file = "data/search_index.json"
        self.ensure_data_dir()
        self.search_index = self.load_search_index()
        self.initialize_sample_data()
    
    def ensure_data_dir(self):
        """Ustvari data direktorij če ne obstaja"""
        os.makedirs("data", exist_ok=True)
    
    def load_search_index(self):
        """Naloži iskalni indeks"""
        if os.path.exists(self.search_index_file):
            try:
                with open(self.search_index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {"documents": [], "last_updated": None}
        return {"documents": [], "last_updated": None}
    
    def save_search_index(self):
        """Shrani iskalni indeks"""
        self.search_index["last_updated"] = datetime.now().isoformat()
        with open(self.search_index_file, 'w', encoding='utf-8') as f:
            json.dump(self.search_index, f, ensure_ascii=False, indent=2)
    
    def initialize_sample_data(self):
        """Inicializiraj vzorčne podatke če indeks ne obstaja"""
        if not self.search_index["documents"]:
            sample_docs = [
                {
                    "id": 1,
                    "title": "Navodila za uporabo OmniCore",
                    "content": "OmniCore je napredna platforma za avtomatizacijo poslovnih procesov. Omogoča upravljanje nalog, koledarja, analitiko in iskanje.",
                    "category": "dokumentacija",
                    "tags": ["omnicore", "navodila", "uporaba"],
                    "created": datetime.now().isoformat()
                },
                {
                    "id": 2,
                    "title": "API dokumentacija",
                    "content": "REST API endpoints za integracijo s tretjimi sistemi. Podpira JSON format in OAuth2 avtentifikacijo.",
                    "category": "tehnicna_dokumentacija",
                    "tags": ["api", "rest", "json", "oauth2"],
                    "created": datetime.now().isoformat()
                },
                {
                    "id": 3,
                    "title": "Varnostni protokoli",
                    "content": "Smernice za varno uporabo sistema. Vključuje gesla, dvosmerno avtentifikacijo in šifriranje podatkov.",
                    "category": "varnost",
                    "tags": ["varnost", "gesla", "2fa", "šifriranje"],
                    "created": datetime.now().isoformat()
                },
                {
                    "id": 4,
                    "title": "Analitični dashboard",
                    "content": "Pregled ključnih metrik in KPI-jev. Vključuje prodajne podatke, uporabniške statistike in sistemske performanse.",
                    "category": "analitika",
                    "tags": ["dashboard", "kpi", "metrike", "statistike"],
                    "created": datetime.now().isoformat()
                },
                {
                    "id": 5,
                    "title": "Mobilna aplikacija",
                    "content": "Funkcionalnosti mobilne aplikacije za iOS in Android. Sinhronizacija s spletno platformo in offline možnosti.",
                    "category": "mobilno",
                    "tags": ["mobilno", "ios", "android", "sinhronizacija"],
                    "created": datetime.now().isoformat()
                }
            ]
            
            self.search_index["documents"] = sample_docs
            self.save_search_index()
    
    def handle(self, query, context=None):
        """Obravnava iskalne zahteve"""
        query_lower = query.lower()
        
        # Iskanje po vsebini
        if any(word in query_lower for word in ['išči', 'najdi', 'search', 'find']):
            return self.search_content(query)
        
        # Iskanje po kategorijah
        elif any(word in query_lower for word in ['kategorija', 'category', 'tip', 'type']):
            return self.search_by_category(query)
        
        # Iskanje po tagih
        elif any(word in query_lower for word in ['tag', 'oznaka', 'label']):
            return self.search_by_tags(query)
        
        # Dodaj dokument
        elif any(word in query_lower for word in ['dodaj', 'ustvari', 'add', 'create']):
            return self.add_document(query)
        
        # Prikaži vse
        elif any(word in query_lower for word in ['prikaži', 'seznam', 'list', 'show all']):
            return self.list_all_documents()
        
        else:
            # Direktno iskanje brez ključnih besed
            return self.search_content(query)
    
    def search_content(self, query):
        """Išči po vsebini dokumentov"""
        # Izvleci iskalni izraz
        search_terms = []
        for prefix in ['išči:', 'najdi:', 'search:', 'find:']:
            if prefix in query.lower():
                search_terms = query[query.lower().find(prefix) + len(prefix):].strip().split()
                break
        
        if not search_terms:
            # Uporabi celotno zahtevo kot iskalni izraz
            search_terms = query.split()
        
        # Filtriraj kratke besede
        search_terms = [term for term in search_terms if len(term) > 2]
        
        if not search_terms:
            return "❌ Prosim, navedite iskalni izraz (najmanj 3 znaki)."
        
        # Išči po dokumentih
        results = []
        for doc in self.search_index["documents"]:
            score = 0
            content_lower = (doc["title"] + " " + doc["content"]).lower()
            
            for term in search_terms:
                term_lower = term.lower()
                # Naslov ima večjo težo
                if term_lower in doc["title"].lower():
                    score += 3
                # Vsebina
                if term_lower in doc["content"].lower():
                    score += 1
                # Tagi
                if any(term_lower in tag.lower() for tag in doc["tags"]):
                    score += 2
            
            if score > 0:
                results.append((doc, score))
        
        # Sortiraj po relevantnosti
        results.sort(key=lambda x: x[1], reverse=True)
        
        if not results:
            return f"🔍 Ni rezultatov za: '{' '.join(search_terms)}'"
        
        # Pripravi rezultate
        result_text = f"🔍 **Rezultati iskanja za: '{' '.join(search_terms)}'**\n\n"
        
        for doc, score in results[:5]:  # Prikaži prvih 5 rezultatov
            result_text += f"📄 **{doc['title']}** (relevantnost: {score})\n"
            result_text += f"   📂 Kategorija: {doc['category']}\n"
            result_text += f"   🏷️ Tagi: {', '.join(doc['tags'])}\n"
            
            # Prikaži izvleček
            content_preview = doc['content'][:150]
            if len(doc['content']) > 150:
                content_preview += "..."
            result_text += f"   📝 {content_preview}\n\n"
        
        if len(results) > 5:
            result_text += f"... in še {len(results) - 5} rezultatov."
        
        return result_text.strip()
    
    def search_by_category(self, query):
        """Išči po kategorijah"""
        # Izvleci kategorijo
        words = query.lower().split()
        category = None
        
        for i, word in enumerate(words):
            if word in ['kategorija:', 'category:']:
                if i + 1 < len(words):
                    category = words[i + 1]
                    break
        
        if not category:
            # Prikaži vse kategorije
            categories = set(doc["category"] for doc in self.search_index["documents"])
            return f"📂 **Dostopne kategorije:**\n" + "\n".join(f"• {cat}" for cat in sorted(categories))
        
        # Najdi dokumente v kategoriji
        results = [doc for doc in self.search_index["documents"] if category in doc["category"].lower()]
        
        if not results:
            return f"❌ Ni dokumentov v kategoriji '{category}'"
        
        result_text = f"📂 **Dokumenti v kategoriji '{category}':**\n\n"
        for doc in results:
            result_text += f"📄 {doc['title']}\n"
            result_text += f"   🏷️ {', '.join(doc['tags'])}\n\n"
        
        return result_text.strip()
    
    def search_by_tags(self, query):
        """Išči po tagih"""
        words = query.lower().split()
        tag = None
        
        for i, word in enumerate(words):
            if word in ['tag:', 'oznaka:']:
                if i + 1 < len(words):
                    tag = words[i + 1]
                    break
        
        if not tag:
            # Prikaži vse tage
            all_tags = set()
            for doc in self.search_index["documents"]:
                all_tags.update(doc["tags"])
            return f"🏷️ **Dostopni tagi:**\n" + "\n".join(f"• {tag}" for tag in sorted(all_tags))
        
        # Najdi dokumente s tagom
        results = [doc for doc in self.search_index["documents"] 
                  if any(tag in doc_tag.lower() for doc_tag in doc["tags"])]
        
        if not results:
            return f"❌ Ni dokumentov s tagom '{tag}'"
        
        result_text = f"🏷️ **Dokumenti s tagom '{tag}':**\n\n"
        for doc in results:
            result_text += f"📄 {doc['title']}\n"
            result_text += f"   📂 {doc['category']}\n\n"
        
        return result_text.strip()
    
    def add_document(self, query):
        """Dodaj nov dokument v indeks"""
        # Enostaven parser za dodajanje dokumenta
        # Format: "dodaj dokument: [naslov] | [vsebina] | [kategorija] | [tagi]"
        
        if '|' not in query:
            return """
❌ **Napačen format za dodajanje dokumenta.**

**Pravilni format:**
`dodaj dokument: [naslov] | [vsebina] | [kategorija] | [tagi]`

**Primer:**
`dodaj dokument: Nova funkcija | Opis nove funkcionalnosti | funkcionalnost | nova,funkcija,update`
            """
        
        parts = query.split('|')
        if len(parts) < 4:
            return "❌ Manjkajo podatki. Potrebni so: naslov, vsebina, kategorija, tagi."
        
        # Izvleci naslov
        title_part = parts[0].lower()
        title = parts[0][title_part.find('dokument:') + 9:].strip() if 'dokument:' in title_part else parts[0].strip()
        
        content = parts[1].strip()
        category = parts[2].strip()
        tags = [tag.strip() for tag in parts[3].split(',')]
        
        # Ustvari nov dokument
        new_doc = {
            "id": max([doc["id"] for doc in self.search_index["documents"]], default=0) + 1,
            "title": title,
            "content": content,
            "category": category,
            "tags": tags,
            "created": datetime.now().isoformat()
        }
        
        self.search_index["documents"].append(new_doc)
        self.save_search_index()
        
        return f"✅ **Dokument dodan:**\n📄 {title}\n📂 {category}\n🏷️ {', '.join(tags)}"
    
    def list_all_documents(self):
        """Prikaži vse dokumente"""
        if not self.search_index["documents"]:
            return "📄 Ni dokumentov v indeksu."
        
        result = f"📚 **Vsi dokumenti ({len(self.search_index['documents'])}):**\n\n"
        
        # Grupiranje po kategorijah
        by_category = {}
        for doc in self.search_index["documents"]:
            category = doc["category"]
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(doc)
        
        for category, docs in sorted(by_category.items()):
            result += f"📂 **{category.upper()}:**\n"
            for doc in docs:
                result += f"   📄 {doc['title']} (ID: {doc['id']})\n"
            result += "\n"
        
        return result.strip()
    
    def get_help(self):
        """Pomoč za uporabo"""
        return """
🔍 **Search Plugin - Pomoč:**
• `išči [izraz]` - Iskanje po vsebini
• `kategorija: [ime]` - Iskanje po kategoriji
• `tag: [ime]` - Iskanje po tagu
• `dodaj dokument: [naslov] | [vsebina] | [kategorija] | [tagi]` - Dodaj dokument
• `prikaži vse` - Seznam vseh dokumentov

**Primeri:**
- "išči API dokumentacija"
- "kategorija: varnost"
- "tag: mobilno"
- "dodaj dokument: Nova funkcija | Opis | funkcionalnost | nova,update"

**Funkcionalnosti:**
- Polno besedilno iskanje
- Kategorizacija dokumentov
- Sistem tagov
- Relevantnost rezultatov
        """
    def get_info(self):
        """Vrni informacije o plugin-u"""
        return {
            "name": self.name,
            "version": getattr(self, 'version', '1.0.0'),
            "description": self.description,
            "author": getattr(self, 'author', 'OmniCore'),
            "capabilities": getattr(self, 'capabilities', [])
        }