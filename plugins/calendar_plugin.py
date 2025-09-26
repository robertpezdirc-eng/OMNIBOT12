# Calendar Management Plugin
import json
import os
import re
from datetime import datetime, timedelta
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
            events_accessible = os.path.exists(self.events_file)
            
            # Preveri velikost podatkov
            events_count = len(self.events)
            
            # Preveri prihodnje dogodke
            now = datetime.now()
            future_events = sum(1 for event in self.events 
                              if datetime.fromisoformat(event['date']) > now)
            
            # Določi status
            if events_accessible:
                status = "healthy"
            else:
                status = "error"
            
            return {
                "status": status,
                "timestamp": datetime.now().timestamp(),
                "details": {
                    "events_accessible": events_accessible,
                    "total_events": events_count,
                    "future_events": future_events,
                    "events_file": self.events_file
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().timestamp(),
                "error": str(e)
            }

class Plugin(PluginBase):
    name = "calendar"
    description = "Upravljanje koledarja, sestanki, dogodki, termini"
    version = "1.0.0"
    author = "OmniCore"
    capabilities = ["calendar_management", "scheduling", "events"]
    
    def __init__(self):
        self.events_file = "data/calendar_events.json"
        self.ensure_data_dir()
        self.events = self.load_events()
    
    def can_handle(self, query):
        """Oceni kako dobro plugin lahko obravnava zahtevo"""
        query_lower = query.lower()
        keywords = ["sestanek", "koledar", "calendar", "dogodek", "meeting", "termin", "rezervacija"]
        
        score = 0
        for keyword in keywords:
            if keyword in query_lower:
                score += 0.2
        
        return min(score, 1.0)
    
    def ensure_data_dir(self):
        """Ustvari data direktorij če ne obstaja"""
        os.makedirs("data", exist_ok=True)
    
    def load_events(self):
        """Naloži dogodke iz datoteke"""
        if os.path.exists(self.events_file):
            try:
                with open(self.events_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def save_events(self):
        """Shrani dogodke v datoteko"""
        with open(self.events_file, 'w', encoding='utf-8') as f:
            json.dump(self.events, f, ensure_ascii=False, indent=2)
    
    def handle(self, query, context=None):
        """Obravnava zahteve za koledar"""
        query_lower = query.lower()
        
        # Dodaj dogodek/sestanek
        if any(word in query_lower for word in ['dodaj', 'ustvari', 'sestanek', 'dogodek', 'meeting', 'event']):
            return self.add_event(query)
        
        # Prikaži koledar
        elif any(word in query_lower for word in ['prikaži', 'koledar', 'show calendar', 'events today']):
            return self.show_calendar(query)
        
        # Izbriši dogodek
        elif any(word in query_lower for word in ['izbriši', 'prekliči', 'cancel', 'delete']):
            return self.delete_event(query)
        
        else:
            return self.get_help()
    
    def add_event(self, query):
        """Dodaj nov dogodek"""
        # Izvleci čas iz zahteve
        time_match = re.search(r'(\d{1,2})[:\.]?(\d{0,2})\s*(h|am|pm)?', query.lower())
        date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?', query)
        
        # Nastavi privzeti čas
        event_time = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2)) if time_match.group(2) else 0
            
            # Obravnavaj AM/PM
            if time_match.group(3) and 'pm' in time_match.group(3) and hour < 12:
                hour += 12
            elif time_match.group(3) and 'am' in time_match.group(3) and hour == 12:
                hour = 0
            
            event_time = event_time.replace(hour=hour, minute=minute)
        
        if date_match:
            day = int(date_match.group(1))
            month = int(date_match.group(2))
            year = int(date_match.group(3)) if date_match.group(3) else datetime.now().year
            if year < 100:
                year += 2000
            
            event_time = event_time.replace(year=year, month=month, day=day)
        
        # Izvleci naslov dogodka
        title = query
        for prefix in ['dodaj sestanek:', 'ustvari dogodek:', 'sestanek:', 'dogodek:']:
            if prefix in query.lower():
                title = query[query.lower().find(prefix) + len(prefix):].strip()
                break
        
        # Očisti naslov od časovnih podatkov
        title = re.sub(r'\d{1,2}[:\.]?\d{0,2}\s*(h|am|pm)?', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\d{1,2}\.\d{1,2}\.?\d{0,4}', '', title)
        title = title.strip()
        
        if not title or len(title) < 3:
            title = f"Sestanek - {event_time.strftime('%H:%M')}"
        
        new_event = {
            "id": len(self.events) + 1,
            "title": title,
            "datetime": event_time.isoformat(),
            "created": datetime.now().isoformat(),
            "status": "scheduled"
        }
        
        self.events.append(new_event)
        self.save_events()
        
        return f"📅 Dogodek dodan: '{title}' - {event_time.strftime('%d.%m.%Y ob %H:%M')} (ID: {new_event['id']})"
    
    def show_calendar(self, query):
        """Prikaži koledar"""
        if not self.events:
            return "📅 Koledar je prazen."
        
        # Filtriraj dogodke
        today = datetime.now().date()
        upcoming_events = []
        
        for event in self.events:
            event_date = datetime.fromisoformat(event['datetime']).date()
            if event_date >= today and event['status'] == 'scheduled':
                upcoming_events.append(event)
        
        if not upcoming_events:
            return "📅 Ni prihajajočih dogodkov."
        
        # Sortiraj po datumu
        upcoming_events.sort(key=lambda x: x['datetime'])
        
        result = "📅 **Prihajajoči dogodki:**\n"
        for event in upcoming_events[:10]:  # Prikaži samo prvih 10
            event_dt = datetime.fromisoformat(event['datetime'])
            if event_dt.date() == today:
                date_str = "Danes"
            elif event_dt.date() == today + timedelta(days=1):
                date_str = "Jutri"
            else:
                date_str = event_dt.strftime('%d.%m.%Y')
            
            result += f"🕐 [{event['id']}] {event['title']} - {date_str} ob {event_dt.strftime('%H:%M')}\n"
        
        return result
    
    def delete_event(self, query):
        """Izbriši dogodek"""
        words = query.split()
        event_id = None
        
        for word in words:
            if word.isdigit():
                event_id = int(word)
                break
        
        if event_id is None:
            return "❌ Prosim, navedite ID dogodka (npr. 'prekliči 1')"
        
        for i, event in enumerate(self.events):
            if event['id'] == event_id:
                deleted_event = self.events.pop(i)
                self.save_events()
                return f"🗑️ Dogodek '{deleted_event['title']}' preklican!"
        
        return f"❌ Dogodek z ID {event_id} ni najden."
    
    def get_help(self):
        """Pomoč za uporabo"""
        return """
📅 **Calendar Plugin - Pomoč:**
• `sestanek [naslov] ob [čas]` - Dodaj sestanek
• `dogodek [naslov] [datum] [čas]` - Dodaj dogodek
• `prikaži koledar` - Prikaži prihajajoče dogodke
• `prekliči [ID]` - Prekliči dogodek

**Primeri:**
- "sestanek s stranko ob 14:00"
- "dogodek rojstni dan 25.12. ob 18h"
- "prikaži koledar"
- "prekliči 1"

**Formati časa:** 14:00, 14h, 2pm, 14.30
**Formati datuma:** 25.12., 25.12.2024
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