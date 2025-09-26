"""
OMNI CORE ECOSYSTEM - Glavni modul za gostinstvo, turizem in aktivnosti
Centralna platforma z vsemi podmoduli in realtime sinhronizacijo
"""

import sqlite3
import json
import datetime
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
import uuid

# Enumeracije za sistem
class UserRole(Enum):
    RECEPCIJA = "recepcija"
    NATAKAR = "natakar"
    KUHAR = "kuhar"
    MANAGER = "manager"
    ADMIN = "admin"
    GOST = "gost"

class ModuleType(Enum):
    NASTANITVE = "nastanitve"
    KUHINJA = "kuhinja"
    POS_BLAGAJNA = "pos_blagajna"
    AKTIVNOSTI = "aktivnosti"
    NABAVA = "nabava"
    IOT = "iot"
    DASHBOARD = "dashboard"
    AI_SYSTEM = "ai_system"

class AccommodationType(Enum):
    HOTEL = "hotel"
    APARTMA = "apartma"
    SOBA = "soba"
    KAMP = "kamp"
    GLAMPING = "glamping"
    PLANINSKA_KOCA = "planinska_koca"
    HOSTL = "hostl"
    BUNGALOV = "bungalov"
    TREEHOUSE = "treehouse"
    TINY_HOUSE = "tiny_house"
    HISKA_NA_VODI = "hiska_na_vodi"
    IGLU = "iglu"
    LUKSUZNA_VILA = "luksuzna_vila"
    LADJA = "ladja"
    AVTODOM = "avtodom"

class ActivityType(Enum):
    TURISTICNA_AGENCIJA = "turisticna_agencija"
    MUZEJ = "muzej"
    GALERIJA = "galerija"
    PLANINSKA_POT = "planinska_pot"
    KOLESARSKA_TURA = "kolesarska_tura"
    TEMATSKA_TURA = "tematska_tura"
    RAFTING = "rafting"
    KAJAK = "kajak"
    PLEZANJE = "plezanje"
    JAHANJE = "jahanje"
    SMUCANJE = "smucanje"
    KONCERT = "koncert"
    FESTIVAL = "festival"
    LOKALNA_PRIREDITEV = "lokalna_prireditev"
    VINSKA_DEGUSTACIJA = "vinska_degustacija"
    KULINARICNA_DELAVNICA = "kulinaricna_delavnica"

# Podatkovni razredi
@dataclass
class User:
    id: str
    ime: str
    email: str
    vloga: UserRole
    aktiven: bool = True
    ustvarjen: str = None

@dataclass
class Accommodation:
    id: str
    ime: str
    tip: AccommodationType
    kapaciteta: int
    cena_na_noc: float
    opis: str
    amenities: List[str]
    dostopen: bool = True
    ustvarjen: str = None

@dataclass
class Activity:
    id: str
    ime: str
    tip: ActivityType
    trajanje_minut: int
    cena: float
    opis: str
    max_udelezenci: int
    dostopen: bool = True
    ustvarjen: str = None

@dataclass
class Reservation:
    id: str
    user_id: str
    accommodation_id: str
    datum_prihoda: str
    datum_odhoda: str
    stevilo_gostov: int
    skupna_cena: float
    status: str = "potrjena"
    ustvarjena: str = None

@dataclass
class MenuItem:
    id: str
    ime: str
    kategorija: str
    cena: float
    sestavine: List[str]
    alergeni: List[str]
    dostopen: bool = True
    ustvarjen: str = None

@dataclass
class Order:
    id: str
    reservation_id: str
    menu_items: List[Dict]
    skupna_cena: float
    status: str = "novo"
    cas_narocila: str = None

class OmniCoreEcosystem:
    def __init__(self, db_path: str = "omni_core.db"):
        self.db_path = db_path
        self.init_database()
        print("🌟 OMNI CORE ECOSYSTEM inicializiran!")
        
    def init_database(self):
        """Inicializacija centralne baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela uporabnikov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                ime TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                vloga TEXT NOT NULL,
                aktiven BOOLEAN DEFAULT 1,
                ustvarjen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela nastanitev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accommodations (
                id TEXT PRIMARY KEY,
                ime TEXT NOT NULL,
                tip TEXT NOT NULL,
                kapaciteta INTEGER NOT NULL,
                cena_na_noc REAL NOT NULL,
                opis TEXT,
                amenities TEXT,
                dostopen BOOLEAN DEFAULT 1,
                ustvarjen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela aktivnosti
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                ime TEXT NOT NULL,
                tip TEXT NOT NULL,
                trajanje_minut INTEGER NOT NULL,
                cena REAL NOT NULL,
                opis TEXT,
                max_udelezenci INTEGER NOT NULL,
                dostopen BOOLEAN DEFAULT 1,
                ustvarjen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela rezervacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                accommodation_id TEXT NOT NULL,
                datum_prihoda DATE NOT NULL,
                datum_odhoda DATE NOT NULL,
                stevilo_gostov INTEGER NOT NULL,
                skupna_cena REAL NOT NULL,
                status TEXT DEFAULT 'potrjena',
                ustvarjena TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (accommodation_id) REFERENCES accommodations (id)
            )
        ''')
        
        # Tabela menijev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menu_items (
                id TEXT PRIMARY KEY,
                ime TEXT NOT NULL,
                kategorija TEXT NOT NULL,
                cena REAL NOT NULL,
                sestavine TEXT,
                alergeni TEXT,
                dostopen BOOLEAN DEFAULT 1,
                ustvarjen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela naročil
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                reservation_id TEXT NOT NULL,
                menu_items TEXT NOT NULL,
                skupna_cena REAL NOT NULL,
                status TEXT DEFAULT 'novo',
                cas_narocila TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reservation_id) REFERENCES reservations (id)
            )
        ''')
        
        # Tabela za realtime sinhronizacijo
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_type TEXT NOT NULL,
                action TEXT NOT NULL,
                data TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_user(self, ime: str, email: str, vloga: UserRole) -> str:
        """Dodaj novega uporabnika"""
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            ime=ime,
            email=email,
            vloga=vloga,
            ustvarjen=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO users (id, ime, email, vloga, aktiven, ustvarjen)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user.id, user.ime, user.email, user.vloga.value, user.aktiven, user.ustvarjen))
        
        conn.commit()
        conn.close()
        
        self._log_sync_action(ModuleType.DASHBOARD, "user_added", asdict(user))
        return user_id
        
    def add_accommodation(self, ime: str, tip: AccommodationType, kapaciteta: int, 
                         cena_na_noc: float, opis: str, amenities: List[str]) -> str:
        """Dodaj novo nastanitev"""
        acc_id = str(uuid.uuid4())
        accommodation = Accommodation(
            id=acc_id,
            ime=ime,
            tip=tip,
            kapaciteta=kapaciteta,
            cena_na_noc=cena_na_noc,
            opis=opis,
            amenities=amenities,
            ustvarjen=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO accommodations (id, ime, tip, kapaciteta, cena_na_noc, opis, amenities, dostopen, ustvarjen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (accommodation.id, accommodation.ime, accommodation.tip.value, accommodation.kapaciteta,
              accommodation.cena_na_noc, accommodation.opis, json.dumps(accommodation.amenities),
              accommodation.dostopen, accommodation.ustvarjen))
        
        conn.commit()
        conn.close()
        
        self._log_sync_action(ModuleType.NASTANITVE, "accommodation_added", asdict(accommodation))
        return acc_id
        
    def add_activity(self, ime: str, tip: ActivityType, trajanje_minut: int,
                    cena: float, opis: str, max_udelezenci: int) -> str:
        """Dodaj novo aktivnost"""
        activity_id = str(uuid.uuid4())
        activity = Activity(
            id=activity_id,
            ime=ime,
            tip=tip,
            trajanje_minut=trajanje_minut,
            cena=cena,
            opis=opis,
            max_udelezenci=max_udelezenci,
            ustvarjen=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activities (id, ime, tip, trajanje_minut, cena, opis, max_udelezenci, dostopen, ustvarjen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (activity.id, activity.ime, activity.tip.value, activity.trajanje_minut,
              activity.cena, activity.opis, activity.max_udelezenci, activity.dostopen, activity.ustvarjen))
        
        conn.commit()
        conn.close()
        
        self._log_sync_action(ModuleType.AKTIVNOSTI, "activity_added", asdict(activity))
        return activity_id
        
    def create_reservation(self, user_id: str, accommodation_id: str, datum_prihoda: str,
                          datum_odhoda: str, stevilo_gostov: int) -> str:
        """Ustvari novo rezervacijo"""
        # Pridobi ceno nastanitve
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT cena_na_noc FROM accommodations WHERE id = ?', (accommodation_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise ValueError("Nastanitev ne obstaja")
            
        cena_na_noc = result[0]
        
        # Izračunaj skupno ceno (poenostavljeno - 1 noč)
        skupna_cena = cena_na_noc * stevilo_gostov
        
        reservation_id = str(uuid.uuid4())
        reservation = Reservation(
            id=reservation_id,
            user_id=user_id,
            accommodation_id=accommodation_id,
            datum_prihoda=datum_prihoda,
            datum_odhoda=datum_odhoda,
            stevilo_gostov=stevilo_gostov,
            skupna_cena=skupna_cena,
            ustvarjena=datetime.datetime.now().isoformat()
        )
        
        cursor.execute('''
            INSERT INTO reservations (id, user_id, accommodation_id, datum_prihoda, datum_odhoda, 
                                    stevilo_gostov, skupna_cena, status, ustvarjena)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (reservation.id, reservation.user_id, reservation.accommodation_id, reservation.datum_prihoda,
              reservation.datum_odhoda, reservation.stevilo_gostov, reservation.skupna_cena,
              reservation.status, reservation.ustvarjena))
        
        conn.commit()
        conn.close()
        
        self._log_sync_action(ModuleType.NASTANITVE, "reservation_created", asdict(reservation))
        return reservation_id
        
    def add_menu_item(self, ime: str, kategorija: str, cena: float,
                     sestavine: List[str], alergeni: List[str]) -> str:
        """Dodaj novo jed v meni"""
        menu_id = str(uuid.uuid4())
        menu_item = MenuItem(
            id=menu_id,
            ime=ime,
            kategorija=kategorija,
            cena=cena,
            sestavine=sestavine,
            alergeni=alergeni,
            ustvarjen=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO menu_items (id, ime, kategorija, cena, sestavine, alergeni, dostopen, ustvarjen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (menu_item.id, menu_item.ime, menu_item.kategorija, menu_item.cena,
              json.dumps(menu_item.sestavine), json.dumps(menu_item.alergeni),
              menu_item.dostopen, menu_item.ustvarjen))
        
        conn.commit()
        conn.close()
        
        self._log_sync_action(ModuleType.KUHINJA, "menu_item_added", asdict(menu_item))
        return menu_id
        
    def create_order(self, reservation_id: str, menu_items: List[Dict]) -> str:
        """Ustvari novo naročilo"""
        # Izračunaj skupno ceno
        skupna_cena = sum(item.get('cena', 0) * item.get('kolicina', 1) for item in menu_items)
        
        order_id = str(uuid.uuid4())
        order = Order(
            id=order_id,
            reservation_id=reservation_id,
            menu_items=menu_items,
            skupna_cena=skupna_cena,
            cas_narocila=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO orders (id, reservation_id, menu_items, skupna_cena, status, cas_narocila)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (order.id, order.reservation_id, json.dumps(order.menu_items),
              order.skupna_cena, order.status, order.cas_narocila))
        
        conn.commit()
        conn.close()
        
        self._log_sync_action(ModuleType.POS_BLAGAJNA, "order_created", asdict(order))
        return order_id
        
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Statistike uporabnikov
        cursor.execute('SELECT vloga, COUNT(*) FROM users WHERE aktiven = 1 GROUP BY vloga')
        user_stats = dict(cursor.fetchall())
        
        # Statistike nastanitev
        cursor.execute('SELECT tip, COUNT(*) FROM accommodations WHERE dostopen = 1 GROUP BY tip')
        accommodation_stats = dict(cursor.fetchall())
        
        # Statistike rezervacij
        cursor.execute('SELECT status, COUNT(*) FROM reservations GROUP BY status')
        reservation_stats = dict(cursor.fetchall())
        
        # Statistike naročil
        cursor.execute('SELECT status, COUNT(*) FROM orders GROUP BY status')
        order_stats = dict(cursor.fetchall())
        
        # Prihodki
        cursor.execute('SELECT SUM(skupna_cena) FROM reservations WHERE status = "potrjena"')
        prihodki_nastanitve = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(skupna_cena) FROM orders WHERE status != "preklicano"')
        prihodki_hrana = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return {
            "uporabniki": user_stats,
            "nastanitve": accommodation_stats,
            "rezervacije": reservation_stats,
            "narocila": order_stats,
            "prihodki": {
                "nastanitve": prihodki_nastanitve,
                "hrana_pijaca": prihodki_hrana,
                "skupaj": prihodki_nastanitve + prihodki_hrana
            },
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    def get_realtime_sync_log(self, limit: int = 50) -> List[Dict]:
        """Pridobi zadnje sinhronizacijske dogodke"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT module_type, action, data, timestamp 
            FROM sync_log 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        
        logs = []
        for row in cursor.fetchall():
            logs.append({
                "module": row[0],
                "action": row[1],
                "data": json.loads(row[2]) if row[2] else None,
                "timestamp": row[3]
            })
            
        conn.close()
        return logs
        
    def _log_sync_action(self, module_type: ModuleType, action: str, data: Dict = None):
        """Zabeleži sinhronizacijski dogodek"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pretvori Enum objekte v string za JSON serializacijo
        if data:
            serializable_data = {}
            for key, value in data.items():
                if isinstance(value, Enum):
                    serializable_data[key] = value.value
                else:
                    serializable_data[key] = value
        else:
            serializable_data = None
        
        cursor.execute('''
            INSERT INTO sync_log (module_type, action, data)
            VALUES (?, ?, ?)
        ''', (module_type.value, action, json.dumps(serializable_data) if serializable_data else None))
        
        conn.commit()
        conn.close()

def demo_omni_core():
    """Demo funkcija za testiranje OMNI CORE ECOSYSTEM"""
    print("🚀 DEMO: OMNI CORE ECOSYSTEM")
    print("=" * 50)
    
    # Inicializacija sistema - pobriši obstoječo bazo za demo
    import os
    if os.path.exists("omni_core.db"):
        os.remove("omni_core.db")
    
    omni = OmniCoreEcosystem()
    
    # Dodaj uporabnike
    print("\n👥 Dodajam uporabnike...")
    admin_id = omni.add_user("Ana Novak", "ana@omni.si", UserRole.ADMIN)
    manager_id = omni.add_user("Marko Kovač", "marko@omni.si", UserRole.MANAGER)
    recepcija_id = omni.add_user("Petra Zupan", "petra@omni.si", UserRole.RECEPCIJA)
    natakar_id = omni.add_user("Luka Horvat", "luka@omni.si", UserRole.NATAKAR)
    kuhar_id = omni.add_user("Maja Kos", "maja@omni.si", UserRole.KUHAR)
    gost_id = omni.add_user("Janez Kranjski", "janez@gmail.com", UserRole.GOST)
    
    # Dodaj nastanitve
    print("\n🏨 Dodajam nastanitve...")
    hotel_id = omni.add_accommodation(
        "Grand Hotel Bled", AccommodationType.HOTEL, 4, 150.0,
        "Luksuzni hotel ob Blejskem jezeru", ["wifi", "spa", "restavracija", "parking"]
    )
    
    glamping_id = omni.add_accommodation(
        "Eco Glamping Bohinj", AccommodationType.GLAMPING, 2, 80.0,
        "Ekološki glamping v naravi", ["wifi", "kuhinja", "terasa", "grill"]
    )
    
    treehouse_id = omni.add_accommodation(
        "TreeHouse Adventure", AccommodationType.TREEHOUSE, 3, 120.0,
        "Unikaten treehouse doživetje", ["wifi", "terasa", "pogled_na_gozd"]
    )
    
    # Dodaj aktivnosti
    print("\n🎯 Dodajam aktivnosti...")
    rafting_id = omni.add_activity(
        "Rafting na Soči", ActivityType.RAFTING, 180, 45.0,
        "Adrenalinsko spuščanje po smaragdni Soči", 12
    )
    
    degustacija_id = omni.add_activity(
        "Vinska degustacija Vipava", ActivityType.VINSKA_DEGUSTACIJA, 120, 25.0,
        "Degustacija lokalnih vin z razlago", 20
    )
    
    plezanje_id = omni.add_activity(
        "Plezanje v Paklenici", ActivityType.PLEZANJE, 240, 60.0,
        "Vodeno plezanje za začetnike in napredne", 8
    )
    
    # Dodaj jedi v meni
    print("\n🍽️ Dodajam meni...")
    jota_id = omni.add_menu_item(
        "Istrska jota", "glavne_jedi", 12.50,
        ["kisle_repe", "fižol", "krompir", "klobasa"], ["gluten"]
    )
    
    strudel_id = omni.add_menu_item(
        "Jabolčni štrudelj", "sladice", 6.80,
        ["jabolka", "testo", "rozine", "cimet"], ["gluten", "jajca"]
    )
    
    # Ustvari rezervacije
    print("\n📅 Ustvarjam rezervacije...")
    rezervacija1_id = omni.create_reservation(
        gost_id, hotel_id, "2024-07-15", "2024-07-18", 2
    )
    
    rezervacija2_id = omni.create_reservation(
        gost_id, glamping_id, "2024-08-01", "2024-08-03", 2
    )
    
    # Ustvari naročila
    print("\n🛒 Ustvarjam naročila...")
    narocilo1_id = omni.create_order(rezervacija1_id, [
        {"menu_item_id": jota_id, "ime": "Istrska jota", "cena": 12.50, "kolicina": 2},
        {"menu_item_id": strudel_id, "ime": "Jabolčni štrudelj", "cena": 6.80, "kolicina": 1}
    ])
    
    # Prikaži dashboard podatke
    print("\n📊 DASHBOARD PODATKI:")
    dashboard = omni.get_dashboard_data()
    
    print(f"👥 Uporabniki: {dashboard['uporabniki']}")
    print(f"🏨 Nastanitve: {dashboard['nastanitve']}")
    print(f"📅 Rezervacije: {dashboard['rezervacije']}")
    print(f"🛒 Naročila: {dashboard['narocila']}")
    print(f"💰 Prihodki: {dashboard['prihodki']}")
    
    # Prikaži sinhronizacijski log
    print("\n🔄 REALTIME SINHRONIZACIJA (zadnjih 10):")
    sync_log = omni.get_realtime_sync_log(10)
    for log in sync_log:
        print(f"  {log['timestamp']}: {log['module']} -> {log['action']}")
    
    print("\n✅ OMNI CORE ECOSYSTEM uspešno testiran!")
    print("🌟 Sistem pripravljen za integracijo vseh modulov!")

if __name__ == "__main__":
    demo_omni_core()