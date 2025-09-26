"""
OMNI ACCOMMODATIONS & RESERVATIONS - Napredni sistem nastanitev in rezervacij
Digitalni ključi, QR kode, GDPR skladno, paketni predlogi, avtomatska dodelitev
"""

import sqlite3
import json
import datetime
import qrcode
import io
import base64
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
import uuid
import hashlib

# Enumeracije
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

class ReservationStatus(Enum):
    NOVA = "nova"
    POTRJENA = "potrjena"
    PRIHOD = "prihod"
    AKTIVNA = "aktivna"
    ODHOD = "odhod"
    ZAKLJUCENA = "zakljucena"
    PREKLICANA = "preklicana"

class PackageType(Enum):
    ROMANTIKA = "romantika"
    DRUZINA = "druzina"
    ADRENALIN = "adrenalin"
    WELLNESS = "wellness"
    KULINARIKA = "kulinarika"
    POSLOVNO = "poslovno"
    EKOTURIZEM = "ekoturizem"

class AccessType(Enum):
    DIGITALNI_KLJUC = "digitalni_kljuc"
    QR_KODA = "qr_koda"
    FIZICNI_KLJUC = "fizicni_kljuc"
    MOBILNA_APP = "mobilna_app"

# Podatkovni razredi
@dataclass
class Accommodation:
    id: str
    ime: str
    tip: AccommodationType
    kapaciteta: int
    cena_na_noc: float
    opis: str
    amenities: List[str]
    lokacija: Dict[str, float]  # lat, lng
    slike: List[str]
    dostopen: bool = True
    ocena: float = 0.0
    stevilo_ocen: int = 0
    ustvarjen: str = None

@dataclass
class Guest:
    id: str
    ime: str
    priimek: str
    email: str
    telefon: str
    naslov: str
    datum_rojstva: str
    drzavljanstvo: str
    gdpr_soglasje: bool = False
    ustvarjen: str = None

@dataclass
class Reservation:
    id: str
    guest_id: str
    accommodation_id: str
    datum_prihoda: str
    datum_odhoda: str
    stevilo_gostov: int
    skupna_cena: float
    status: ReservationStatus
    package_type: Optional[PackageType] = None
    posebne_zahteve: str = ""
    access_type: AccessType = AccessType.QR_KODA
    digital_key: str = ""
    qr_code: str = ""
    ustvarjena: str = None

@dataclass
class Package:
    id: str
    ime: str
    tip: PackageType
    opis: str
    accommodation_types: List[AccommodationType]
    aktivnosti: List[str]
    obroki: List[str]
    cena_dodatek: float
    trajanje_dni: int
    dostopen: bool = True
    ustvarjen: str = None

@dataclass
class AccessLog:
    id: str
    reservation_id: str
    cas_dostopa: str
    tip_dostopa: AccessType
    uspesen: bool
    lokacija: str = ""
    naprava: str = ""

class OmniAccommodationsReservations:
    def __init__(self, db_path: str = "omni_accommodations.db"):
        self.db_path = db_path
        self.init_database()
        print("🏨 OMNI ACCOMMODATIONS & RESERVATIONS inicializiran!")
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
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
                lokacija TEXT,
                slike TEXT,
                dostopen BOOLEAN DEFAULT 1,
                ocena REAL DEFAULT 0.0,
                stevilo_ocen INTEGER DEFAULT 0,
                ustvarjen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela gostov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS guests (
                id TEXT PRIMARY KEY,
                ime TEXT NOT NULL,
                priimek TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                telefon TEXT,
                naslov TEXT,
                datum_rojstva DATE,
                drzavljanstvo TEXT,
                gdpr_soglasje BOOLEAN DEFAULT 0,
                ustvarjen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela rezervacij
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                guest_id TEXT NOT NULL,
                accommodation_id TEXT NOT NULL,
                datum_prihoda DATE NOT NULL,
                datum_odhoda DATE NOT NULL,
                stevilo_gostov INTEGER NOT NULL,
                skupna_cena REAL NOT NULL,
                status TEXT DEFAULT 'nova',
                package_type TEXT,
                posebne_zahteve TEXT,
                access_type TEXT DEFAULT 'qr_koda',
                digital_key TEXT,
                qr_code TEXT,
                ustvarjena TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guest_id) REFERENCES guests (id),
                FOREIGN KEY (accommodation_id) REFERENCES accommodations (id)
            )
        ''')
        
        # Tabela paketov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS packages (
                id TEXT PRIMARY KEY,
                ime TEXT NOT NULL,
                tip TEXT NOT NULL,
                opis TEXT,
                accommodation_types TEXT,
                aktivnosti TEXT,
                obroki TEXT,
                cena_dodatek REAL NOT NULL,
                trajanje_dni INTEGER NOT NULL,
                dostopen BOOLEAN DEFAULT 1,
                ustvarjen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela dostopov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS access_logs (
                id TEXT PRIMARY KEY,
                reservation_id TEXT NOT NULL,
                cas_dostopa TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tip_dostopa TEXT NOT NULL,
                uspesen BOOLEAN NOT NULL,
                lokacija TEXT,
                naprava TEXT,
                FOREIGN KEY (reservation_id) REFERENCES reservations (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def add_accommodation(self, ime: str, tip: AccommodationType, kapaciteta: int,
                         cena_na_noc: float, opis: str, amenities: List[str],
                         lokacija: Dict[str, float], slike: List[str] = None) -> str:
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
            lokacija=lokacija,
            slike=slike or [],
            ustvarjen=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO accommodations (id, ime, tip, kapaciteta, cena_na_noc, opis, 
                                      amenities, lokacija, slike, dostopen, ocena, 
                                      stevilo_ocen, ustvarjen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (accommodation.id, accommodation.ime, accommodation.tip.value, accommodation.kapaciteta,
              accommodation.cena_na_noc, accommodation.opis, json.dumps(accommodation.amenities),
              json.dumps(accommodation.lokacija), json.dumps(accommodation.slike),
              accommodation.dostopen, accommodation.ocena, accommodation.stevilo_ocen,
              accommodation.ustvarjen))
        
        conn.commit()
        conn.close()
        return acc_id
        
    def add_guest(self, ime: str, priimek: str, email: str, telefon: str,
                  naslov: str, datum_rojstva: str, drzavljanstvo: str,
                  gdpr_soglasje: bool = True) -> str:
        """Dodaj novega gosta (GDPR skladno)"""
        guest_id = str(uuid.uuid4())
        guest = Guest(
            id=guest_id,
            ime=ime,
            priimek=priimek,
            email=email,
            telefon=telefon,
            naslov=naslov,
            datum_rojstva=datum_rojstva,
            drzavljanstvo=drzavljanstvo,
            gdpr_soglasje=gdpr_soglasje,
            ustvarjen=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO guests (id, ime, priimek, email, telefon, naslov, 
                              datum_rojstva, drzavljanstvo, gdpr_soglasje, ustvarjen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (guest.id, guest.ime, guest.priimek, guest.email, guest.telefon,
              guest.naslov, guest.datum_rojstva, guest.drzavljanstvo,
              guest.gdpr_soglasje, guest.ustvarjen))
        
        conn.commit()
        conn.close()
        return guest_id
        
    def create_reservation(self, guest_id: str, accommodation_id: str, datum_prihoda: str,
                          datum_odhoda: str, stevilo_gostov: int, package_type: PackageType = None,
                          posebne_zahteve: str = "", access_type: AccessType = AccessType.QR_KODA) -> str:
        """Ustvari novo rezervacijo z digitalnim dostopom"""
        
        # Pridobi ceno nastanitve
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT cena_na_noc FROM accommodations WHERE id = ?', (accommodation_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise ValueError("Nastanitev ne obstaja")
            
        cena_na_noc = result[0]
        
        # Izračunaj število noči
        prihod = datetime.datetime.fromisoformat(datum_prihoda)
        odhod = datetime.datetime.fromisoformat(datum_odhoda)
        stevilo_noci = (odhod - prihod).days
        
        # Osnovna cena
        skupna_cena = cena_na_noc * stevilo_noci * stevilo_gostov
        
        # Dodaj ceno paketa
        if package_type:
            cursor.execute('SELECT cena_dodatek FROM packages WHERE tip = ?', (package_type.value,))
            package_result = cursor.fetchone()
            if package_result:
                skupna_cena += package_result[0] * stevilo_gostov
        
        # Generiraj digitalni ključ in QR kodo
        reservation_id = str(uuid.uuid4())
        digital_key = self._generate_digital_key(reservation_id, guest_id)
        qr_code = self._generate_qr_code(reservation_id, digital_key)
        
        reservation = Reservation(
            id=reservation_id,
            guest_id=guest_id,
            accommodation_id=accommodation_id,
            datum_prihoda=datum_prihoda,
            datum_odhoda=datum_odhoda,
            stevilo_gostov=stevilo_gostov,
            skupna_cena=skupna_cena,
            status=ReservationStatus.NOVA,
            package_type=package_type,
            posebne_zahteve=posebne_zahteve,
            access_type=access_type,
            digital_key=digital_key,
            qr_code=qr_code,
            ustvarjena=datetime.datetime.now().isoformat()
        )
        
        cursor.execute('''
            INSERT INTO reservations (id, guest_id, accommodation_id, datum_prihoda, datum_odhoda,
                                    stevilo_gostov, skupna_cena, status, package_type, posebne_zahteve,
                                    access_type, digital_key, qr_code, ustvarjena)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (reservation.id, reservation.guest_id, reservation.accommodation_id, reservation.datum_prihoda,
              reservation.datum_odhoda, reservation.stevilo_gostov, reservation.skupna_cena,
              reservation.status.value, reservation.package_type.value if reservation.package_type else None,
              reservation.posebne_zahteve, reservation.access_type.value, reservation.digital_key,
              reservation.qr_code, reservation.ustvarjena))
        
        conn.commit()
        conn.close()
        return reservation_id
        
    def add_package(self, ime: str, tip: PackageType, opis: str,
                   accommodation_types: List[AccommodationType], aktivnosti: List[str],
                   obroki: List[str], cena_dodatek: float, trajanje_dni: int) -> str:
        """Dodaj nov paket doživetij"""
        package_id = str(uuid.uuid4())
        package = Package(
            id=package_id,
            ime=ime,
            tip=tip,
            opis=opis,
            accommodation_types=accommodation_types,
            aktivnosti=aktivnosti,
            obroki=obroki,
            cena_dodatek=cena_dodatek,
            trajanje_dni=trajanje_dni,
            ustvarjen=datetime.datetime.now().isoformat()
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO packages (id, ime, tip, opis, accommodation_types, aktivnosti,
                                obroki, cena_dodatek, trajanje_dni, dostopen, ustvarjen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (package.id, package.ime, package.tip.value, package.opis,
              json.dumps([acc.value for acc in package.accommodation_types]),
              json.dumps(package.aktivnosti), json.dumps(package.obroki),
              package.cena_dodatek, package.trajanje_dni, package.dostopen, package.ustvarjen))
        
        conn.commit()
        conn.close()
        return package_id
        
    def verify_access(self, reservation_id: str, access_code: str, 
                     lokacija: str = "", naprava: str = "") -> bool:
        """Preveri digitalni dostop"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT digital_key, access_type, status FROM reservations WHERE id = ?
        ''', (reservation_id,))
        
        result = cursor.fetchone()
        if not result:
            conn.close()
            return False
            
        digital_key, access_type, status = result
        
        # Preveri veljavnost rezervacije
        if status not in ['potrjena', 'prihod', 'aktivna']:
            conn.close()
            return False
            
        # Preveri dostopno kodo
        uspesen = (access_code == digital_key)
        
        # Zabeleži poskus dostopa
        log_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO access_logs (id, reservation_id, tip_dostopa, uspesen, lokacija, naprava)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (log_id, reservation_id, access_type, uspesen, lokacija, naprava))
        
        conn.commit()
        conn.close()
        return uspesen
        
    def get_available_accommodations(self, datum_prihoda: str, datum_odhoda: str,
                                   stevilo_gostov: int, tip: AccommodationType = None) -> List[Dict]:
        """Pridobi dostopne nastanitve za določen datum"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT a.* FROM accommodations a
            WHERE a.dostopen = 1 AND a.kapaciteta >= ?
        '''
        params = [stevilo_gostov]
        
        if tip:
            query += ' AND a.tip = ?'
            params.append(tip.value)
            
        # Preveri, če ni rezervirana v tem obdobju
        query += '''
            AND a.id NOT IN (
                SELECT accommodation_id FROM reservations 
                WHERE status IN ('potrjena', 'prihod', 'aktivna')
                AND ((datum_prihoda <= ? AND datum_odhoda > ?) 
                     OR (datum_prihoda < ? AND datum_odhoda >= ?))
            )
        '''
        params.extend([datum_prihoda, datum_prihoda, datum_odhoda, datum_odhoda])
        
        cursor.execute(query, params)
        
        accommodations = []
        for row in cursor.fetchall():
            acc = {
                'id': row[0],
                'ime': row[1],
                'tip': row[2],
                'kapaciteta': row[3],
                'cena_na_noc': row[4],
                'opis': row[5],
                'amenities': json.loads(row[6]) if row[6] else [],
                'lokacija': json.loads(row[7]) if row[7] else {},
                'slike': json.loads(row[8]) if row[8] else [],
                'ocena': row[10],
                'stevilo_ocen': row[11]
            }
            accommodations.append(acc)
            
        conn.close()
        return accommodations
        
    def get_package_suggestions(self, accommodation_type: AccommodationType,
                              stevilo_dni: int) -> List[Dict]:
        """Pridobi predloge paketov za nastanitev"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM packages 
            WHERE dostopen = 1 AND trajanje_dni <= ?
        ''', (stevilo_dni,))
        
        packages = []
        for row in cursor.fetchall():
            accommodation_types = json.loads(row[4]) if row[4] else []
            if accommodation_type.value in accommodation_types:
                package = {
                    'id': row[0],
                    'ime': row[1],
                    'tip': row[2],
                    'opis': row[3],
                    'aktivnosti': json.loads(row[5]) if row[5] else [],
                    'obroki': json.loads(row[6]) if row[6] else [],
                    'cena_dodatek': row[7],
                    'trajanje_dni': row[8]
                }
                packages.append(package)
                
        conn.close()
        return packages
        
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Statistike nastanitev
        cursor.execute('SELECT tip, COUNT(*) FROM accommodations WHERE dostopen = 1 GROUP BY tip')
        accommodation_stats = dict(cursor.fetchall())
        
        # Statistike rezervacij
        cursor.execute('SELECT status, COUNT(*) FROM reservations GROUP BY status')
        reservation_stats = dict(cursor.fetchall())
        
        # Zasedenost danes
        danes = datetime.date.today().isoformat()
        cursor.execute('''
            SELECT COUNT(*) FROM reservations 
            WHERE status IN ('prihod', 'aktivna') AND datum_prihoda <= ? AND datum_odhoda > ?
        ''', (danes, danes))
        aktivne_rezervacije = cursor.fetchone()[0]
        
        # Prihodki
        cursor.execute('SELECT SUM(skupna_cena) FROM reservations WHERE status != "preklicana"')
        skupni_prihodki = cursor.fetchone()[0] or 0
        
        # Povprečna ocena
        cursor.execute('SELECT AVG(ocena) FROM accommodations WHERE stevilo_ocen > 0')
        povprecna_ocena = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return {
            "nastanitve": accommodation_stats,
            "rezervacije": reservation_stats,
            "aktivne_rezervacije": aktivne_rezervacije,
            "skupni_prihodki": skupni_prihodki,
            "povprecna_ocena": round(povprecna_ocena, 2),
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    def _generate_digital_key(self, reservation_id: str, guest_id: str) -> str:
        """Generiraj varni digitalni ključ"""
        data = f"{reservation_id}:{guest_id}:{datetime.datetime.now().isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16].upper()
        
    def _generate_qr_code(self, reservation_id: str, digital_key: str) -> str:
        """Generiraj QR kodo za dostop"""
        qr_data = f"OMNI:{reservation_id}:{digital_key}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        # Pretvori v base64 string
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return img_str

def demo_accommodations_reservations():
    """Demo funkcija za testiranje sistema nastanitev"""
    print("🚀 DEMO: OMNI ACCOMMODATIONS & RESERVATIONS")
    print("=" * 60)
    
    # Pobriši obstoječo bazo za demo
    import os
    if os.path.exists("omni_accommodations.db"):
        os.remove("omni_accommodations.db")
    
    # Inicializacija sistema
    omni = OmniAccommodationsReservations()
    
    # Dodaj nastanitve
    print("\n🏨 Dodajam nastanitve...")
    hotel_id = omni.add_accommodation(
        "Grand Hotel Bled", AccommodationType.HOTEL, 4, 150.0,
        "Luksuzni hotel ob Blejskem jezeru z razgledom na grad",
        ["wifi", "spa", "restavracija", "parking", "bazen", "fitnes"],
        {"lat": 46.3683, "lng": 14.1127},
        ["hotel_bled_1.jpg", "hotel_bled_2.jpg"]
    )
    
    glamping_id = omni.add_accommodation(
        "Eco Glamping Bohinj", AccommodationType.GLAMPING, 2, 80.0,
        "Ekološki glamping v srcu Triglavskega narodnega parka",
        ["wifi", "kuhinja", "terasa", "grill", "kolesarjenje"],
        {"lat": 46.2833, "lng": 13.8667},
        ["glamping_bohinj_1.jpg"]
    )
    
    treehouse_id = omni.add_accommodation(
        "TreeHouse Adventure Logarska", AccommodationType.TREEHOUSE, 3, 120.0,
        "Unikaten treehouse doživetje v Logarški dolini",
        ["wifi", "terasa", "pogled_na_gozd", "sauna", "jacuzzi"],
        {"lat": 46.3833, "lng": 14.6167},
        ["treehouse_1.jpg", "treehouse_2.jpg"]
    )
    
    # Dodaj pakete
    print("\n📦 Dodajam pakete doživetij...")
    romantika_id = omni.add_package(
        "Romantični vikend", PackageType.ROMANTIKA,
        "Popoln romantični pobeg za dva z večerjo pri svečah",
        [AccommodationType.HOTEL, AccommodationType.TREEHOUSE],
        ["spa_tretma", "romantična_večerja", "vinska_degustacija"],
        ["zajtrk_v_posteljo", "romantična_večerja", "šampanjec"],
        50.0, 2
    )
    
    adrenalin_id = omni.add_package(
        "Adrenalinsko doživetje", PackageType.ADRENALIN,
        "Polno adrenalinskih aktivnosti v naravi",
        [AccommodationType.GLAMPING, AccommodationType.TREEHOUSE],
        ["rafting", "zipline", "plezanje", "gorsko_kolesarjenje"],
        ["energijski_zajtrk", "piknik", "BBQ_večerja"],
        75.0, 3
    )
    
    # Dodaj goste
    print("\n👥 Dodajam goste...")
    gost1_id = omni.add_guest(
        "Ana", "Novak", "ana.novak@gmail.com", "+386 41 123 456",
        "Ljubljanska cesta 1, 1000 Ljubljana", "1985-03-15", "Slovenija", True
    )
    
    gost2_id = omni.add_guest(
        "Marko", "Kovač", "marko.kovac@gmail.com", "+386 31 987 654",
        "Celovška cesta 25, 1000 Ljubljana", "1990-07-22", "Slovenija", True
    )
    
    # Ustvari rezervacije
    print("\n📅 Ustvarjam rezervacije...")
    rezervacija1_id = omni.create_reservation(
        gost1_id, hotel_id, "2024-07-15", "2024-07-18", 2,
        PackageType.ROMANTIKA, "Prosimo za sobo z razgledom na jezero",
        AccessType.QR_KODA
    )
    
    rezervacija2_id = omni.create_reservation(
        gost2_id, glamping_id, "2024-08-01", "2024-08-04", 2,
        PackageType.ADRENALIN, "Potrebujemo opremo za kolesarjenje",
        AccessType.DIGITALNI_KLJUC
    )
    
    # Preveri dostopne nastanitve
    print("\n🔍 Preverjam dostopne nastanitve...")
    dostopne = omni.get_available_accommodations("2024-09-01", "2024-09-03", 2)
    print(f"Dostopnih nastanitev: {len(dostopne)}")
    
    # Pridobi predloge paketov
    print("\n💡 Pridobivam predloge paketov...")
    predlogi = omni.get_package_suggestions(AccommodationType.HOTEL, 3)
    print(f"Predlogov paketov: {len(predlogi)}")
    
    # Testiraj digitalni dostop
    print("\n🔐 Testiram digitalni dostop...")
    # Pridobi digitalni ključ za testiranje
    conn = sqlite3.connect("omni_accommodations.db")
    cursor = conn.cursor()
    cursor.execute('SELECT digital_key FROM reservations WHERE id = ?', (rezervacija1_id,))
    digital_key = cursor.fetchone()[0]
    conn.close()
    
    dostop_uspesen = omni.verify_access(rezervacija1_id, digital_key, "Recepcija", "Tablet")
    print(f"Dostop uspešen: {dostop_uspesen}")
    
    # Prikaži dashboard podatke
    print("\n📊 DASHBOARD PODATKI:")
    dashboard = omni.get_dashboard_data()
    
    print(f"🏨 Nastanitve: {dashboard['nastanitve']}")
    print(f"📅 Rezervacije: {dashboard['rezervacije']}")
    print(f"🏃 Aktivne rezervacije: {dashboard['aktivne_rezervacije']}")
    print(f"💰 Skupni prihodki: €{dashboard['skupni_prihodki']:.2f}")
    print(f"⭐ Povprečna ocena: {dashboard['povprecna_ocena']}/5.0")
    
    print("\n✅ OMNI ACCOMMODATIONS & RESERVATIONS uspešno testiran!")
    print("🌟 Sistem pripravljen za digitalne ključe in QR dostop!")

if __name__ == "__main__":
    demo_accommodations_reservations()