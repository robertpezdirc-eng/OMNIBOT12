"""
ULTIMATE HR (Human Resources) System
Napredni kadrovski modul z urniki, nadomeščanji, plačami in optimizacijo
"""

import sqlite3
import json
import uuid
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import logging
from collections import defaultdict
import calendar
from enum import Enum

# Nastavitev logiranja
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmployeeStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"

class ShiftType(Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"
    FULL_DAY = "full_day"

class LeaveType(Enum):
    VACATION = "vacation"
    SICK = "sick"
    PERSONAL = "personal"
    MATERNITY = "maternity"
    EMERGENCY = "emergency"

@dataclass
class Employee:
    """Razred za zaposlenega"""
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    position: str
    department: str
    hire_date: str
    hourly_rate: float
    status: str = EmployeeStatus.ACTIVE.value
    skills: List[str] = None
    certifications: List[str] = None
    emergency_contact: Dict[str, str] = None
    
    def __post_init__(self):
        if self.skills is None:
            self.skills = []
        if self.certifications is None:
            self.certifications = []
        if self.emergency_contact is None:
            self.emergency_contact = {}

@dataclass
class Shift:
    """Razred za izmeno"""
    id: str
    employee_id: str
    date: str
    start_time: str
    end_time: str
    shift_type: str
    department: str
    position: str
    status: str = "scheduled"  # scheduled, completed, cancelled, no_show
    break_minutes: int = 30
    overtime_hours: float = 0.0
    notes: str = ""

@dataclass
class LeaveRequest:
    """Razred za zahtevo za dopust"""
    id: str
    employee_id: str
    leave_type: str
    start_date: str
    end_date: str
    days_requested: int
    reason: str
    status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None
    approved_date: Optional[str] = None
    created_date: str = ""
    
    def __post_init__(self):
        if not self.created_date:
            self.created_date = datetime.now().isoformat()

@dataclass
class Payroll:
    """Razred za obračun plač"""
    id: str
    employee_id: str
    period_start: str
    period_end: str
    regular_hours: float
    overtime_hours: float
    hourly_rate: float
    gross_pay: float
    deductions: Dict[str, float]
    net_pay: float
    bonus: float = 0.0
    created_date: str = ""
    
    def __post_init__(self):
        if not self.created_date:
            self.created_date = datetime.now().isoformat()

class UltimateHRSystem:
    """Glavni razred za kadrovski sistem"""
    
    def __init__(self, db_path: str = "ultimate_hr.db"):
        self.db_path = db_path
        self.init_database()
        self.load_demo_data()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tabela zaposlenih
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS employees (
                    id TEXT PRIMARY KEY,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT UNIQUE,
                    phone TEXT,
                    position TEXT,
                    department TEXT,
                    hire_date TEXT,
                    hourly_rate REAL,
                    status TEXT DEFAULT 'active',
                    skills TEXT,
                    certifications TEXT,
                    emergency_contact TEXT
                )
            ''')
            
            # Tabela izmen
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS shifts (
                    id TEXT PRIMARY KEY,
                    employee_id TEXT,
                    date TEXT,
                    start_time TEXT,
                    end_time TEXT,
                    shift_type TEXT,
                    department TEXT,
                    position TEXT,
                    status TEXT DEFAULT 'scheduled',
                    break_minutes INTEGER DEFAULT 30,
                    overtime_hours REAL DEFAULT 0.0,
                    notes TEXT,
                    FOREIGN KEY (employee_id) REFERENCES employees (id)
                )
            ''')
            
            # Tabela zahtev za dopust
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS leave_requests (
                    id TEXT PRIMARY KEY,
                    employee_id TEXT,
                    leave_type TEXT,
                    start_date TEXT,
                    end_date TEXT,
                    days_requested INTEGER,
                    reason TEXT,
                    status TEXT DEFAULT 'pending',
                    approved_by TEXT,
                    approved_date TEXT,
                    created_date TEXT,
                    FOREIGN KEY (employee_id) REFERENCES employees (id)
                )
            ''')
            
            # Tabela obračuna plač
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payroll (
                    id TEXT PRIMARY KEY,
                    employee_id TEXT,
                    period_start TEXT,
                    period_end TEXT,
                    regular_hours REAL,
                    overtime_hours REAL,
                    hourly_rate REAL,
                    gross_pay REAL,
                    deductions TEXT,
                    net_pay REAL,
                    bonus REAL DEFAULT 0.0,
                    created_date TEXT,
                    FOREIGN KEY (employee_id) REFERENCES employees (id)
                )
            ''')
            
            # Tabela prisotnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS attendance (
                    id TEXT PRIMARY KEY,
                    employee_id TEXT,
                    date TEXT,
                    check_in_time TEXT,
                    check_out_time TEXT,
                    break_start TEXT,
                    break_end TEXT,
                    total_hours REAL,
                    status TEXT DEFAULT 'present',
                    notes TEXT,
                    FOREIGN KEY (employee_id) REFERENCES employees (id)
                )
            ''')
            
            # Tabela usposabljanj
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS training (
                    id TEXT PRIMARY KEY,
                    employee_id TEXT,
                    training_name TEXT,
                    training_type TEXT,
                    start_date TEXT,
                    end_date TEXT,
                    status TEXT DEFAULT 'scheduled',
                    cost REAL DEFAULT 0.0,
                    provider TEXT,
                    certification_earned TEXT,
                    FOREIGN KEY (employee_id) REFERENCES employees (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("HR sistem baza podatkov uspešno inicializirana")
            
        except Exception as e:
            logger.error(f"Napaka pri inicializaciji baze: {e}")
    
    def load_demo_data(self):
        """Naloži demo podatke"""
        try:
            # Preveri ali podatki že obstajajo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM employees')
            if cursor.fetchone()[0] > 0:
                conn.close()
                return
            
            # Demo zaposleni
            demo_employees = [
                {
                    'id': 'emp_001',
                    'first_name': 'Ana',
                    'last_name': 'Novak',
                    'email': 'ana.novak@hotel.si',
                    'phone': '+386 41 123 456',
                    'position': 'Recepcionist',
                    'department': 'Front Office',
                    'hire_date': '2023-01-15',
                    'hourly_rate': 12.50,
                    'skills': ['angleščina', 'nemščina', 'rezervacije', 'POS sistem'],
                    'certifications': ['Prva pomoč', 'Hotelska recepcija'],
                    'emergency_contact': {'name': 'Marko Novak', 'phone': '+386 41 987 654'}
                },
                {
                    'id': 'emp_002',
                    'first_name': 'Matej',
                    'last_name': 'Kovač',
                    'email': 'matej.kovac@hotel.si',
                    'phone': '+386 31 234 567',
                    'position': 'Kuhar',
                    'department': 'Kuhinja',
                    'hire_date': '2022-06-01',
                    'hourly_rate': 15.00,
                    'skills': ['slovenska kuhinja', 'italijanska kuhinja', 'HACCP', 'menu planning'],
                    'certifications': ['HACCP', 'Kuharsko izpopolnjevanje'],
                    'emergency_contact': {'name': 'Petra Kovač', 'phone': '+386 31 876 543'}
                },
                {
                    'id': 'emp_003',
                    'first_name': 'Maja',
                    'last_name': 'Zupan',
                    'email': 'maja.zupan@hotel.si',
                    'phone': '+386 51 345 678',
                    'position': 'Natakar',
                    'department': 'Restavracija',
                    'hire_date': '2023-03-10',
                    'hourly_rate': 11.00,
                    'skills': ['strežba', 'vinska karta', 'angleščina', 'italijanščina'],
                    'certifications': ['Strežba vina', 'Prva pomoč'],
                    'emergency_contact': {'name': 'Janez Zupan', 'phone': '+386 51 765 432'}
                },
                {
                    'id': 'emp_004',
                    'first_name': 'Luka',
                    'last_name': 'Horvat',
                    'email': 'luka.horvat@hotel.si',
                    'phone': '+386 40 456 789',
                    'position': 'Housekeeper',
                    'department': 'Housekeeping',
                    'hire_date': '2022-09-15',
                    'hourly_rate': 10.50,
                    'skills': ['čiščenje sob', 'pranje perila', 'vzdrževanje'],
                    'certifications': ['Higiena in čiščenje'],
                    'emergency_contact': {'name': 'Nina Horvat', 'phone': '+386 40 654 321'}
                },
                {
                    'id': 'emp_005',
                    'first_name': 'Sara',
                    'last_name': 'Kos',
                    'email': 'sara.kos@hotel.si',
                    'phone': '+386 30 567 890',
                    'position': 'Manager',
                    'department': 'Management',
                    'hire_date': '2021-01-01',
                    'hourly_rate': 25.00,
                    'skills': ['vodenje', 'finance', 'marketing', 'angleščina', 'nemščina'],
                    'certifications': ['Hotelski management', 'Finančno načrtovanje'],
                    'emergency_contact': {'name': 'Tomaž Kos', 'phone': '+386 30 098 765'}
                }
            ]
            
            for employee_data in demo_employees:
                self.add_employee(employee_data)
            
            # Demo izmene za naslednji teden
            today = datetime.now().date()
            start_date = today + timedelta(days=1)
            
            for i in range(7):  # 7 dni
                current_date = start_date + timedelta(days=i)
                date_str = current_date.isoformat()
                
                # Jutranje izmene
                self.add_shift({
                    'employee_id': 'emp_001',
                    'date': date_str,
                    'start_time': '07:00',
                    'end_time': '15:00',
                    'shift_type': ShiftType.MORNING.value,
                    'department': 'Front Office',
                    'position': 'Recepcionist'
                })
                
                self.add_shift({
                    'employee_id': 'emp_002',
                    'date': date_str,
                    'start_time': '06:00',
                    'end_time': '14:00',
                    'shift_type': ShiftType.MORNING.value,
                    'department': 'Kuhinja',
                    'position': 'Kuhar'
                })
                
                # Popoldanske izmene
                self.add_shift({
                    'employee_id': 'emp_003',
                    'date': date_str,
                    'start_time': '15:00',
                    'end_time': '23:00',
                    'shift_type': ShiftType.EVENING.value,
                    'department': 'Restavracija',
                    'position': 'Natakar'
                })
                
                self.add_shift({
                    'employee_id': 'emp_004',
                    'date': date_str,
                    'start_time': '08:00',
                    'end_time': '16:00',
                    'shift_type': ShiftType.MORNING.value,
                    'department': 'Housekeeping',
                    'position': 'Housekeeper'
                })
            
            conn.close()
            logger.info("Demo podatki uspešno naloženi")
            
        except Exception as e:
            logger.error(f"Napaka pri nalaganju demo podatkov: {e}")
    
    def add_employee(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Dodaj novega zaposlenega"""
        try:
            if 'id' not in employee_data:
                employee_data['id'] = str(uuid.uuid4())
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO employees (
                    id, first_name, last_name, email, phone, position, department,
                    hire_date, hourly_rate, status, skills, certifications, emergency_contact
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                employee_data['id'],
                employee_data['first_name'],
                employee_data['last_name'],
                employee_data['email'],
                employee_data['phone'],
                employee_data['position'],
                employee_data['department'],
                employee_data['hire_date'],
                employee_data['hourly_rate'],
                employee_data.get('status', EmployeeStatus.ACTIVE.value),
                json.dumps(employee_data.get('skills', [])),
                json.dumps(employee_data.get('certifications', [])),
                json.dumps(employee_data.get('emergency_contact', {}))
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': f'Zaposleni {employee_data["first_name"]} {employee_data["last_name"]} uspešno dodan',
                'employee_id': employee_data['id']
            }
            
        except Exception as e:
            logger.error(f"Napaka pri dodajanju zaposlenega: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def add_shift(self, shift_data: Dict[str, Any]) -> Dict[str, Any]:
        """Dodaj novo izmeno"""
        try:
            if 'id' not in shift_data:
                shift_data['id'] = str(uuid.uuid4())
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO shifts (
                    id, employee_id, date, start_time, end_time, shift_type,
                    department, position, status, break_minutes, overtime_hours, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                shift_data['id'],
                shift_data['employee_id'],
                shift_data['date'],
                shift_data['start_time'],
                shift_data['end_time'],
                shift_data['shift_type'],
                shift_data['department'],
                shift_data['position'],
                shift_data.get('status', 'scheduled'),
                shift_data.get('break_minutes', 30),
                shift_data.get('overtime_hours', 0.0),
                shift_data.get('notes', '')
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': 'Izmena uspešno dodana',
                'shift_id': shift_data['id']
            }
            
        except Exception as e:
            logger.error(f"Napaka pri dodajanju izmene: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def create_leave_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Ustvari zahtevo za dopust"""
        try:
            if 'id' not in request_data:
                request_data['id'] = str(uuid.uuid4())
            
            # Izračunaj število dni
            start_date = datetime.strptime(request_data['start_date'], '%Y-%m-%d').date()
            end_date = datetime.strptime(request_data['end_date'], '%Y-%m-%d').date()
            days_requested = (end_date - start_date).days + 1
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO leave_requests (
                    id, employee_id, leave_type, start_date, end_date,
                    days_requested, reason, status, created_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                request_data['id'],
                request_data['employee_id'],
                request_data['leave_type'],
                request_data['start_date'],
                request_data['end_date'],
                days_requested,
                request_data['reason'],
                'pending',
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': f'Zahteva za dopust uspešno ustvarjena ({days_requested} dni)',
                'request_id': request_data['id']
            }
            
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju zahteve za dopust: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def approve_leave_request(self, request_id: str, approved_by: str, approved: bool = True) -> Dict[str, Any]:
        """Odobri ali zavrni zahtevo za dopust"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            status = 'approved' if approved else 'rejected'
            
            cursor.execute('''
                UPDATE leave_requests
                SET status = ?, approved_by = ?, approved_date = ?
                WHERE id = ?
            ''', (status, approved_by, datetime.now().isoformat(), request_id))
            
            if cursor.rowcount == 0:
                conn.close()
                return {
                    'success': False,
                    'message': 'Zahteva za dopust ni bila najdena'
                }
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'message': f'Zahteva za dopust {"odobrena" if approved else "zavrnjena"}'
            }
            
        except Exception as e:
            logger.error(f"Napaka pri odobritvi zahteve: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def generate_schedule(self, start_date: str, end_date: str, department: str = None) -> Dict[str, Any]:
        """Generiraj urnik za določeno obdobje"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pridobi zaposlene
            if department:
                cursor.execute('SELECT * FROM employees WHERE department = ? AND status = ?', (department, 'active'))
            else:
                cursor.execute('SELECT * FROM employees WHERE status = ?', ('active',))
            
            employees = {}
            for row in cursor.fetchall():
                columns = [description[0] for description in cursor.description]
                employee = dict(zip(columns, row))
                employees[employee['id']] = employee
            
            # Pridobi obstoječe izmene
            cursor.execute('''
                SELECT * FROM shifts 
                WHERE date BETWEEN ? AND ?
                ORDER BY date, start_time
            ''', (start_date, end_date))
            
            schedule = defaultdict(list)
            for row in cursor.fetchall():
                columns = [description[0] for description in cursor.description]
                shift = dict(zip(columns, row))
                
                if shift['employee_id'] in employees:
                    shift['employee_name'] = f"{employees[shift['employee_id']]['first_name']} {employees[shift['employee_id']]['last_name']}"
                    schedule[shift['date']].append(shift)
            
            # Preveri pokritost
            coverage_analysis = self.analyze_coverage(dict(schedule), employees)
            
            conn.close()
            
            return {
                'success': True,
                'schedule': dict(schedule),
                'employees': employees,
                'coverage_analysis': coverage_analysis,
                'period': {'start': start_date, 'end': end_date}
            }
            
        except Exception as e:
            logger.error(f"Napaka pri generiranju urnika: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def analyze_coverage(self, schedule: Dict[str, List], employees: Dict[str, Any]) -> Dict[str, Any]:
        """Analiziraj pokritost izmene"""
        analysis = {
            'understaffed_days': [],
            'overstaffed_days': [],
            'department_coverage': defaultdict(lambda: defaultdict(int)),
            'employee_hours': defaultdict(float)
        }
        
        # Minimalne zahteve po oddelkih
        min_requirements = {
            'Front Office': {'morning': 1, 'afternoon': 1, 'evening': 1},
            'Kuhinja': {'morning': 1, 'afternoon': 1, 'evening': 1},
            'Restavracija': {'morning': 1, 'afternoon': 2, 'evening': 2},
            'Housekeeping': {'morning': 2, 'afternoon': 1, 'evening': 0}
        }
        
        for date, shifts in schedule.items():
            daily_coverage = defaultdict(lambda: defaultdict(int))
            
            for shift in shifts:
                dept = shift['department']
                shift_type = shift['shift_type']
                daily_coverage[dept][shift_type] += 1
                
                # Izračunaj ure
                start_time = datetime.strptime(shift['start_time'], '%H:%M')
                end_time = datetime.strptime(shift['end_time'], '%H:%M')
                hours = (end_time - start_time).seconds / 3600
                analysis['employee_hours'][shift['employee_id']] += hours
            
            # Preveri pokritost
            for dept, requirements in min_requirements.items():
                for shift_type, min_staff in requirements.items():
                    actual_staff = daily_coverage[dept][shift_type]
                    
                    if actual_staff < min_staff:
                        analysis['understaffed_days'].append({
                            'date': date,
                            'department': dept,
                            'shift_type': shift_type,
                            'required': min_staff,
                            'actual': actual_staff
                        })
                    elif actual_staff > min_staff * 1.5:
                        analysis['overstaffed_days'].append({
                            'date': date,
                            'department': dept,
                            'shift_type': shift_type,
                            'required': min_staff,
                            'actual': actual_staff
                        })
            
            analysis['department_coverage'][date] = dict(daily_coverage)
        
        return analysis
    
    def calculate_payroll(self, employee_id: str, period_start: str, period_end: str) -> Dict[str, Any]:
        """Izračunaj plačo za zaposlenega"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pridobi podatke o zaposlenem
            cursor.execute('SELECT * FROM employees WHERE id = ?', (employee_id,))
            employee_row = cursor.fetchone()
            if not employee_row:
                conn.close()
                return {
                    'success': False,
                    'message': 'Zaposleni ni bil najden'
                }
            
            columns = [description[0] for description in cursor.description]
            employee = dict(zip(columns, employee_row))
            
            # Pridobi izmene v obdobju
            cursor.execute('''
                SELECT * FROM shifts 
                WHERE employee_id = ? AND date BETWEEN ? AND ? AND status = 'completed'
            ''', (employee_id, period_start, period_end))
            
            shifts = cursor.fetchall()
            
            regular_hours = 0.0
            overtime_hours = 0.0
            
            for shift_row in shifts:
                shift_columns = [description[0] for description in cursor.description]
                shift = dict(zip(shift_columns, shift_row))
                
                # Izračunaj ure
                start_time = datetime.strptime(shift['start_time'], '%H:%M')
                end_time = datetime.strptime(shift['end_time'], '%H:%M')
                total_hours = (end_time - start_time).seconds / 3600
                
                # Odštej odmor
                break_hours = shift['break_minutes'] / 60
                work_hours = total_hours - break_hours
                
                # Razvrsti redne in nadure
                if work_hours <= 8:
                    regular_hours += work_hours
                else:
                    regular_hours += 8
                    overtime_hours += (work_hours - 8)
                
                overtime_hours += shift['overtime_hours']
            
            # Izračunaj plačo
            hourly_rate = employee['hourly_rate']
            overtime_rate = hourly_rate * 1.5  # 50% dodatek za nadure
            
            regular_pay = regular_hours * hourly_rate
            overtime_pay = overtime_hours * overtime_rate
            gross_pay = regular_pay + overtime_pay
            
            # Davki in prispevki (poenostavljeno)
            deductions = {
                'income_tax': gross_pay * 0.16,  # 16% dohodnina
                'social_security': gross_pay * 0.22,  # 22% socialni prispevki
                'pension': gross_pay * 0.15  # 15% pokojninski prispevek
            }
            
            total_deductions = sum(deductions.values())
            net_pay = gross_pay - total_deductions
            
            # Shrani obračun
            payroll_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO payroll (
                    id, employee_id, period_start, period_end, regular_hours,
                    overtime_hours, hourly_rate, gross_pay, deductions, net_pay, created_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                payroll_id,
                employee_id,
                period_start,
                period_end,
                regular_hours,
                overtime_hours,
                hourly_rate,
                gross_pay,
                json.dumps(deductions),
                net_pay,
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'payroll': {
                    'id': payroll_id,
                    'employee_name': f"{employee['first_name']} {employee['last_name']}",
                    'period': f"{period_start} - {period_end}",
                    'regular_hours': regular_hours,
                    'overtime_hours': overtime_hours,
                    'hourly_rate': hourly_rate,
                    'gross_pay': gross_pay,
                    'deductions': deductions,
                    'net_pay': net_pay
                }
            }
            
        except Exception as e:
            logger.error(f"Napaka pri izračunu plače: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def get_employee_performance(self, employee_id: str, months: int = 3) -> Dict[str, Any]:
        """Pridobi analizo uspešnosti zaposlenega"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pridobi podatke o zaposlenem
            cursor.execute('SELECT * FROM employees WHERE id = ?', (employee_id,))
            employee_row = cursor.fetchone()
            if not employee_row:
                conn.close()
                return {
                    'success': False,
                    'message': 'Zaposleni ni bil najden'
                }
            
            columns = [description[0] for description in cursor.description]
            employee = dict(zip(columns, employee_row))
            
            # Obdobje analize
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=months * 30)
            
            # Prisotnost
            cursor.execute('''
                SELECT COUNT(*) as total_shifts,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_shifts,
                       SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows
                FROM shifts 
                WHERE employee_id = ? AND date BETWEEN ? AND ?
            ''', (employee_id, start_date.isoformat(), end_date.isoformat()))
            
            attendance_data = cursor.fetchone()
            
            # Nadure
            cursor.execute('''
                SELECT AVG(overtime_hours) as avg_overtime,
                       SUM(overtime_hours) as total_overtime
                FROM shifts 
                WHERE employee_id = ? AND date BETWEEN ? AND ? AND status = 'completed'
            ''', (employee_id, start_date.isoformat(), end_date.isoformat()))
            
            overtime_data = cursor.fetchone()
            
            # Dopusti
            cursor.execute('''
                SELECT COUNT(*) as total_requests,
                       SUM(days_requested) as total_days_requested
                FROM leave_requests 
                WHERE employee_id = ? AND start_date BETWEEN ? AND ?
            ''', (employee_id, start_date.isoformat(), end_date.isoformat()))
            
            leave_data = cursor.fetchone()
            
            conn.close()
            
            # Izračunaj metrike
            total_shifts = attendance_data[0] or 0
            completed_shifts = attendance_data[1] or 0
            no_shows = attendance_data[2] or 0
            
            attendance_rate = (completed_shifts / total_shifts * 100) if total_shifts > 0 else 0
            reliability_score = max(0, 100 - (no_shows / total_shifts * 100)) if total_shifts > 0 else 100
            
            avg_overtime = overtime_data[0] or 0
            total_overtime = overtime_data[1] or 0
            
            total_leave_requests = leave_data[0] or 0
            total_leave_days = leave_data[1] or 0
            
            return {
                'success': True,
                'employee': {
                    'name': f"{employee['first_name']} {employee['last_name']}",
                    'position': employee['position'],
                    'department': employee['department']
                },
                'performance': {
                    'attendance_rate': round(attendance_rate, 1),
                    'reliability_score': round(reliability_score, 1),
                    'total_shifts': total_shifts,
                    'completed_shifts': completed_shifts,
                    'no_shows': no_shows,
                    'avg_overtime_hours': round(avg_overtime, 2),
                    'total_overtime_hours': round(total_overtime, 2),
                    'leave_requests': total_leave_requests,
                    'leave_days_taken': total_leave_days
                },
                'analysis_period': f"{start_date} - {end_date}"
            }
            
        except Exception as e:
            logger.error(f"Napaka pri analizi uspešnosti: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def optimize_schedule(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Optimiziraj urnik za boljšo pokritost in stroške"""
        try:
            # Pridobi trenutni urnik
            current_schedule = self.generate_schedule(start_date, end_date)
            
            if not current_schedule['success']:
                return current_schedule
            
            analysis = current_schedule['coverage_analysis']
            
            suggestions = []
            
            # Predlogi za premalo osebja
            for issue in analysis['understaffed_days']:
                suggestions.append({
                    'type': 'add_shift',
                    'priority': 'high',
                    'date': issue['date'],
                    'department': issue['department'],
                    'shift_type': issue['shift_type'],
                    'description': f"Dodaj {issue['required'] - issue['actual']} zaposlenih za {issue['shift_type']} izmeno v {issue['department']}"
                })
            
            # Predlogi za preveč osebja
            for issue in analysis['overstaffed_days']:
                suggestions.append({
                    'type': 'reduce_shift',
                    'priority': 'medium',
                    'date': issue['date'],
                    'department': issue['department'],
                    'shift_type': issue['shift_type'],
                    'description': f"Zmanjšaj za {issue['actual'] - issue['required']} zaposlenih za {issue['shift_type']} izmeno v {issue['department']}"
                })
            
            # Analiza ur zaposlenih
            for employee_id, hours in analysis['employee_hours'].items():
                if hours > 40:  # Preveč ur na teden
                    suggestions.append({
                        'type': 'reduce_hours',
                        'priority': 'medium',
                        'employee_id': employee_id,
                        'description': f"Zaposleni ima {hours:.1f} ur na teden - priporočamo zmanjšanje"
                    })
                elif hours < 20:  # Premalo ur
                    suggestions.append({
                        'type': 'increase_hours',
                        'priority': 'low',
                        'employee_id': employee_id,
                        'description': f"Zaposleni ima samo {hours:.1f} ur na teden - možnost povečanja"
                    })
            
            return {
                'success': True,
                'current_schedule': current_schedule,
                'optimization_suggestions': suggestions,
                'summary': {
                    'understaffed_issues': len(analysis['understaffed_days']),
                    'overstaffed_issues': len(analysis['overstaffed_days']),
                    'total_suggestions': len(suggestions)
                }
            }
            
        except Exception as e:
            logger.error(f"Napaka pri optimizaciji urnika: {e}")
            return {
                'success': False,
                'message': f'Napaka: {str(e)}'
            }
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Pridobi podatke za HR dashboard"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Skupno število zaposlenih
            cursor.execute('SELECT COUNT(*) FROM employees WHERE status = ?', ('active',))
            total_employees = cursor.fetchone()[0]
            
            # Zaposleni po oddelkih
            cursor.execute('''
                SELECT department, COUNT(*) as count
                FROM employees 
                WHERE status = 'active'
                GROUP BY department
            ''')
            
            employees_by_department = {}
            for row in cursor.fetchall():
                employees_by_department[row[0]] = row[1]
            
            # Čakajoče zahteve za dopust
            cursor.execute('SELECT COUNT(*) FROM leave_requests WHERE status = ?', ('pending',))
            pending_leave_requests = cursor.fetchone()[0]
            
            # Današnje izmene
            today = datetime.now().date().isoformat()
            cursor.execute('''
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                       SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows
                FROM shifts 
                WHERE date = ?
            ''', (today,))
            
            today_shifts = cursor.fetchone()
            
            # Povprečna urna postavka
            cursor.execute('SELECT AVG(hourly_rate) FROM employees WHERE status = ?', ('active',))
            avg_hourly_rate = cursor.fetchone()[0] or 0
            
            # Mesečni stroški plač (ocena)
            cursor.execute('''
                SELECT SUM(net_pay) as total_payroll
                FROM payroll 
                WHERE period_start >= date('now', '-30 days')
            ''')
            
            monthly_payroll = cursor.fetchone()[0] or 0
            
            conn.close()
            
            return {
                'total_employees': total_employees,
                'employees_by_department': employees_by_department,
                'pending_leave_requests': pending_leave_requests,
                'today_shifts': {
                    'total': today_shifts[0] or 0,
                    'completed': today_shifts[1] or 0,
                    'no_shows': today_shifts[2] or 0
                },
                'avg_hourly_rate': round(avg_hourly_rate, 2),
                'monthly_payroll': round(monthly_payroll, 2),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Napaka pri pridobivanju dashboard podatkov: {e}")
            return {}

# Demo funkcije
def demo_hr_system():
    """Demo kadrovskega sistema"""
    hr = UltimateHRSystem()
    
    print("=== DEMO: HR Management sistem ===")
    
    # Prikaži zaposlene
    dashboard = hr.get_dashboard_data()
    print(f"\nSkupno zaposlenih: {dashboard.get('total_employees', 0)}")
    print("Zaposleni po oddelkih:")
    for dept, count in dashboard.get('employees_by_department', {}).items():
        print(f"  - {dept}: {count}")
    
    # Generiraj urnik za naslednji teden
    today = datetime.now().date()
    start_date = (today + timedelta(days=1)).isoformat()
    end_date = (today + timedelta(days=7)).isoformat()
    
    print(f"\n=== Urnik za obdobje {start_date} - {end_date} ===")
    schedule_result = hr.generate_schedule(start_date, end_date)
    
    if schedule_result['success']:
        for date, shifts in schedule_result['schedule'].items():
            print(f"\n{date}:")
            for shift in shifts:
                print(f"  {shift['start_time']}-{shift['end_time']}: {shift['employee_name']} ({shift['department']})")
    
    # Optimizacija urnika
    print(f"\n=== Optimizacija urnika ===")
    optimization = hr.optimize_schedule(start_date, end_date)
    
    if optimization['success']:
        summary = optimization['summary']
        print(f"Problemi s premalo osebja: {summary['understaffed_issues']}")
        print(f"Problemi s preveč osebja: {summary['overstaffed_issues']}")
        print(f"Skupno predlogov: {summary['total_suggestions']}")
        
        if optimization['optimization_suggestions']:
            print("Top 3 predlogi:")
            for i, suggestion in enumerate(optimization['optimization_suggestions'][:3], 1):
                print(f"  {i}. {suggestion['description']} (prioriteta: {suggestion['priority']})")
    
    # Analiza uspešnosti zaposlenega
    print(f"\n=== Analiza uspešnosti ===")
    performance = hr.get_employee_performance('emp_001')
    
    if performance['success']:
        emp = performance['employee']
        perf = performance['performance']
        print(f"Zaposleni: {emp['name']} ({emp['position']})")
        print(f"Prisotnost: {perf['attendance_rate']}%")
        print(f"Zanesljivost: {perf['reliability_score']}%")
        print(f"Opravljene izmene: {perf['completed_shifts']}/{perf['total_shifts']}")
        print(f"Povprečne nadure: {perf['avg_overtime_hours']} ur")
    
    # Izračun plače
    print(f"\n=== Obračun plače ===")
    period_start = (today - timedelta(days=30)).isoformat()
    period_end = today.isoformat()
    
    payroll = hr.calculate_payroll('emp_001', period_start, period_end)
    
    if payroll['success']:
        pay = payroll['payroll']
        print(f"Zaposleni: {pay['employee_name']}")
        print(f"Obdobje: {pay['period']}")
        print(f"Redne ure: {pay['regular_hours']:.1f}")
        print(f"Nadure: {pay['overtime_hours']:.1f}")
        print(f"Bruto plača: €{pay['gross_pay']:.2f}")
        print(f"Neto plača: €{pay['net_pay']:.2f}")

if __name__ == "__main__":
    demo_hr_system()