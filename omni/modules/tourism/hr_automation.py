"""
👥 HR Automation System - Kadrovski avtomatizacijski sistem
Celovit sistem za upravljanje kadrov, urnikov, plač in ocenjevanja zaposlenih
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta, date, time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import calendar
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import hashlib
import secrets

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
    SICK_LEAVE = "sick_leave"
    PERSONAL = "personal"
    MATERNITY = "maternity"
    EMERGENCY = "emergency"

class PerformanceRating(Enum):
    EXCELLENT = 5
    GOOD = 4
    SATISFACTORY = 3
    NEEDS_IMPROVEMENT = 2
    UNSATISFACTORY = 1

@dataclass
class Employee:
    """Zaposleni"""
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    position: str
    department: str
    hire_date: date
    hourly_rate: float
    status: EmployeeStatus
    skills: List[str]
    certifications: List[str]
    emergency_contact: Dict[str, str]
    bank_account: str = ""
    tax_number: str = ""

@dataclass
class Shift:
    """Izmena"""
    shift_id: str
    employee_id: str
    date: date
    shift_type: ShiftType
    start_time: time
    end_time: time
    break_duration: int  # minute
    position: str
    notes: str = ""
    is_confirmed: bool = False

@dataclass
class TimeEntry:
    """Vnos delovnega časa"""
    entry_id: str
    employee_id: str
    date: date
    clock_in: datetime
    clock_out: Optional[datetime]
    break_start: Optional[datetime]
    break_end: Optional[datetime]
    total_hours: float
    overtime_hours: float
    notes: str = ""

@dataclass
class LeaveRequest:
    """Zahteva za dopust"""
    request_id: str
    employee_id: str
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_requested: int
    reason: str
    status: str  # "pending", "approved", "rejected"
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

@dataclass
class PerformanceReview:
    """Ocena uspešnosti"""
    review_id: str
    employee_id: str
    reviewer_id: str
    review_period_start: date
    review_period_end: date
    overall_rating: PerformanceRating
    criteria_scores: Dict[str, int]  # {"punctuality": 4, "teamwork": 5, ...}
    strengths: List[str]
    areas_for_improvement: List[str]
    goals: List[str]
    comments: str
    created_at: datetime

@dataclass
class Payroll:
    """Obračun plače"""
    payroll_id: str
    employee_id: str
    pay_period_start: date
    pay_period_end: date
    regular_hours: float
    overtime_hours: float
    gross_pay: float
    tax_deduction: float
    social_security: float
    net_pay: float
    bonuses: float
    deductions: float
    created_at: datetime

class HRAutomation:
    """Kadrovski avtomatizacijski sistem"""
    
    def __init__(self, db_path: str = "hr_automation.db"):
        self.db_path = db_path
        self._init_database()
        
    def _init_database(self):
        """Inicializacija baze podatkov"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Tabela zaposlenih
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS employees (
                    employee_id TEXT PRIMARY KEY,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    position TEXT NOT NULL,
                    department TEXT NOT NULL,
                    hire_date TEXT NOT NULL,
                    hourly_rate REAL NOT NULL,
                    status TEXT NOT NULL,
                    skills TEXT,
                    certifications TEXT,
                    emergency_contact TEXT,
                    bank_account TEXT,
                    tax_number TEXT,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Tabela izmen
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS shifts (
                    shift_id TEXT PRIMARY KEY,
                    employee_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    shift_type TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    break_duration INTEGER NOT NULL,
                    position TEXT NOT NULL,
                    notes TEXT,
                    is_confirmed BOOLEAN DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
                )
            ''')
            
            # Tabela vnosa delovnega časa
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS time_entries (
                    entry_id TEXT PRIMARY KEY,
                    employee_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    clock_in TEXT NOT NULL,
                    clock_out TEXT,
                    break_start TEXT,
                    break_end TEXT,
                    total_hours REAL DEFAULT 0,
                    overtime_hours REAL DEFAULT 0,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
                )
            ''')
            
            # Tabela zahtev za dopust
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS leave_requests (
                    request_id TEXT PRIMARY KEY,
                    employee_id TEXT NOT NULL,
                    leave_type TEXT NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    days_requested INTEGER NOT NULL,
                    reason TEXT,
                    status TEXT DEFAULT 'pending',
                    approved_by TEXT,
                    approved_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
                )
            ''')
            
            # Tabela ocen uspešnosti
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_reviews (
                    review_id TEXT PRIMARY KEY,
                    employee_id TEXT NOT NULL,
                    reviewer_id TEXT NOT NULL,
                    review_period_start TEXT NOT NULL,
                    review_period_end TEXT NOT NULL,
                    overall_rating INTEGER NOT NULL,
                    criteria_scores TEXT NOT NULL,
                    strengths TEXT,
                    areas_for_improvement TEXT,
                    goals TEXT,
                    comments TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
                )
            ''')
            
            # Tabela obračunov plač
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payroll (
                    payroll_id TEXT PRIMARY KEY,
                    employee_id TEXT NOT NULL,
                    pay_period_start TEXT NOT NULL,
                    pay_period_end TEXT NOT NULL,
                    regular_hours REAL NOT NULL,
                    overtime_hours REAL NOT NULL,
                    gross_pay REAL NOT NULL,
                    tax_deduction REAL NOT NULL,
                    social_security REAL NOT NULL,
                    net_pay REAL NOT NULL,
                    bonuses REAL DEFAULT 0,
                    deductions REAL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
                )
            ''')
            
            # Tabela avtomatskih pravil
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS automation_rules (
                    rule_id TEXT PRIMARY KEY,
                    rule_name TEXT NOT NULL,
                    rule_type TEXT NOT NULL,
                    conditions TEXT NOT NULL,
                    actions TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            logger.info("👥 HR Automation baza podatkov inicializirana")
    
    def add_employee(self, employee: Employee) -> Dict[str, Any]:
        """Dodaj zaposlenega"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO employees 
                    (employee_id, first_name, last_name, email, phone, position,
                     department, hire_date, hourly_rate, status, skills, certifications,
                     emergency_contact, bank_account, tax_number, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    employee.employee_id,
                    employee.first_name,
                    employee.last_name,
                    employee.email,
                    employee.phone,
                    employee.position,
                    employee.department,
                    employee.hire_date.isoformat(),
                    employee.hourly_rate,
                    employee.status.value,
                    json.dumps(employee.skills),
                    json.dumps(employee.certifications),
                    json.dumps(employee.emergency_contact),
                    employee.bank_account,
                    employee.tax_number,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "employee_id": employee.employee_id,
                    "message": f"Zaposleni {employee.first_name} {employee.last_name} uspešno dodan"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri dodajanju zaposlenega: {e}")
            return {"success": False, "error": str(e)}
    
    def create_shift_schedule(self, start_date: date, end_date: date, 
                             department: str = None) -> Dict[str, Any]:
        """Ustvari urnik izmen"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi aktivne zaposlene
                query = '''
                    SELECT employee_id, first_name, last_name, position, department
                    FROM employees WHERE status = 'active'
                '''
                params = []
                
                if department:
                    query += ' AND department = ?'
                    params.append(department)
                
                cursor.execute(query, params)
                employees = cursor.fetchall()
                
                if not employees:
                    return {"success": False, "error": "Ni aktivnih zaposlenih"}
                
                # Generiraj urnik
                schedule = {}
                current_date = start_date
                
                while current_date <= end_date:
                    day_name = current_date.strftime('%A')
                    schedule[current_date.isoformat()] = {
                        "date": current_date.isoformat(),
                        "day_name": day_name,
                        "shifts": []
                    }
                    
                    # Določi potrebne izmene glede na dan v tednu
                    if current_date.weekday() < 5:  # Ponedeljek-Petek
                        shift_types = [ShiftType.MORNING, ShiftType.AFTERNOON, ShiftType.EVENING]
                    else:  # Vikend
                        shift_types = [ShiftType.MORNING, ShiftType.EVENING]
                    
                    # Razporedi zaposlene po izmenah
                    for i, shift_type in enumerate(shift_types):
                        if i < len(employees):
                            employee = employees[i % len(employees)]
                            
                            # Določi čase izmene
                            if shift_type == ShiftType.MORNING:
                                start_time = time(6, 0)
                                end_time = time(14, 0)
                            elif shift_type == ShiftType.AFTERNOON:
                                start_time = time(14, 0)
                                end_time = time(22, 0)
                            else:  # EVENING
                                start_time = time(18, 0)
                                end_time = time(2, 0)  # Naslednji dan
                            
                            shift = Shift(
                                shift_id=f"SHIFT_{current_date.isoformat()}_{employee[0]}_{shift_type.value}",
                                employee_id=employee[0],
                                date=current_date,
                                shift_type=shift_type,
                                start_time=start_time,
                                end_time=end_time,
                                break_duration=30,
                                position=employee[3]
                            )
                            
                            # Shrani izmeno
                            cursor.execute('''
                                INSERT OR REPLACE INTO shifts 
                                (shift_id, employee_id, date, shift_type, start_time, end_time,
                                 break_duration, position, notes, is_confirmed, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                shift.shift_id,
                                shift.employee_id,
                                shift.date.isoformat(),
                                shift.shift_type.value,
                                shift.start_time.isoformat(),
                                shift.end_time.isoformat(),
                                shift.break_duration,
                                shift.position,
                                shift.notes,
                                shift.is_confirmed,
                                datetime.now().isoformat()
                            ))
                            
                            schedule[current_date.isoformat()]["shifts"].append({
                                "shift_id": shift.shift_id,
                                "employee_name": f"{employee[1]} {employee[2]}",
                                "shift_type": shift_type.value,
                                "start_time": start_time.strftime('%H:%M'),
                                "end_time": end_time.strftime('%H:%M'),
                                "position": employee[3]
                            })
                    
                    current_date += timedelta(days=1)
                
                conn.commit()
                
                return {
                    "success": True,
                    "schedule": schedule,
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    }
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju urnika: {e}")
            return {"success": False, "error": str(e)}
    
    def clock_in(self, employee_id: str) -> Dict[str, Any]:
        """Prijava na delo"""
        try:
            now = datetime.now()
            entry_id = f"ENTRY_{employee_id}_{now.strftime('%Y%m%d')}"
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Preveri, ali je zaposleni že prijavljen
                cursor.execute('''
                    SELECT entry_id FROM time_entries 
                    WHERE employee_id = ? AND date = ? AND clock_out IS NULL
                ''', (employee_id, now.date().isoformat()))
                
                if cursor.fetchone():
                    return {"success": False, "error": "Zaposleni je že prijavljen"}
                
                # Ustvari nov vnos
                cursor.execute('''
                    INSERT INTO time_entries 
                    (entry_id, employee_id, date, clock_in, created_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    entry_id,
                    employee_id,
                    now.date().isoformat(),
                    now.isoformat(),
                    now.isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "entry_id": entry_id,
                    "clock_in_time": now.strftime('%H:%M:%S'),
                    "message": "Uspešna prijava na delo"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri prijavi na delo: {e}")
            return {"success": False, "error": str(e)}
    
    def clock_out(self, employee_id: str) -> Dict[str, Any]:
        """Odjava z dela"""
        try:
            now = datetime.now()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Najdi aktivni vnos
                cursor.execute('''
                    SELECT entry_id, clock_in, break_start, break_end 
                    FROM time_entries 
                    WHERE employee_id = ? AND date = ? AND clock_out IS NULL
                ''', (employee_id, now.date().isoformat()))
                
                result = cursor.fetchone()
                if not result:
                    return {"success": False, "error": "Ni aktivne prijave"}
                
                entry_id, clock_in_str, break_start_str, break_end_str = result
                clock_in = datetime.fromisoformat(clock_in_str)
                
                # Izračunaj delovni čas
                total_minutes = (now - clock_in).total_seconds() / 60
                
                # Odštej pavze
                if break_start_str and break_end_str:
                    break_start = datetime.fromisoformat(break_start_str)
                    break_end = datetime.fromisoformat(break_end_str)
                    break_minutes = (break_end - break_start).total_seconds() / 60
                    total_minutes -= break_minutes
                
                total_hours = total_minutes / 60
                
                # Izračunaj nadure (več kot 8 ur)
                overtime_hours = max(0, total_hours - 8)
                regular_hours = min(total_hours, 8)
                
                # Posodobi vnos
                cursor.execute('''
                    UPDATE time_entries 
                    SET clock_out = ?, total_hours = ?, overtime_hours = ?
                    WHERE entry_id = ?
                ''', (now.isoformat(), total_hours, overtime_hours, entry_id))
                
                conn.commit()
                
                return {
                    "success": True,
                    "entry_id": entry_id,
                    "clock_out_time": now.strftime('%H:%M:%S'),
                    "total_hours": round(total_hours, 2),
                    "overtime_hours": round(overtime_hours, 2),
                    "message": "Uspešna odjava z dela"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri odjavi z dela: {e}")
            return {"success": False, "error": str(e)}
    
    def submit_leave_request(self, leave_request: LeaveRequest) -> Dict[str, Any]:
        """Oddaj zahtevo za dopust"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO leave_requests 
                    (request_id, employee_id, leave_type, start_date, end_date,
                     days_requested, reason, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    leave_request.request_id,
                    leave_request.employee_id,
                    leave_request.leave_type.value,
                    leave_request.start_date.isoformat(),
                    leave_request.end_date.isoformat(),
                    leave_request.days_requested,
                    leave_request.reason,
                    leave_request.status,
                    datetime.now().isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "request_id": leave_request.request_id,
                    "message": "Zahteva za dopust uspešno oddana"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri oddaji zahteve za dopust: {e}")
            return {"success": False, "error": str(e)}
    
    def approve_leave_request(self, request_id: str, approver_id: str, 
                             approved: bool) -> Dict[str, Any]:
        """Odobri ali zavrni zahtevo za dopust"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                status = "approved" if approved else "rejected"
                
                cursor.execute('''
                    UPDATE leave_requests 
                    SET status = ?, approved_by = ?, approved_at = ?
                    WHERE request_id = ?
                ''', (status, approver_id, datetime.now().isoformat(), request_id))
                
                conn.commit()
                
                return {
                    "success": True,
                    "request_id": request_id,
                    "status": status,
                    "message": f"Zahteva za dopust {status}"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri odobritvi zahteve: {e}")
            return {"success": False, "error": str(e)}
    
    def create_performance_review(self, review: PerformanceReview) -> Dict[str, Any]:
        """Ustvari oceno uspešnosti"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO performance_reviews 
                    (review_id, employee_id, reviewer_id, review_period_start, review_period_end,
                     overall_rating, criteria_scores, strengths, areas_for_improvement,
                     goals, comments, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    review.review_id,
                    review.employee_id,
                    review.reviewer_id,
                    review.review_period_start.isoformat(),
                    review.review_period_end.isoformat(),
                    review.overall_rating.value,
                    json.dumps(review.criteria_scores),
                    json.dumps(review.strengths),
                    json.dumps(review.areas_for_improvement),
                    json.dumps(review.goals),
                    review.comments,
                    review.created_at.isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "review_id": review.review_id,
                    "message": "Ocena uspešnosti uspešno ustvarjena"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri ustvarjanju ocene: {e}")
            return {"success": False, "error": str(e)}
    
    def calculate_payroll(self, employee_id: str, pay_period_start: date, 
                         pay_period_end: date) -> Dict[str, Any]:
        """Izračunaj obračun plače"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Pridobi podatke o zaposlenem
                cursor.execute('''
                    SELECT hourly_rate FROM employees WHERE employee_id = ?
                ''', (employee_id,))
                
                result = cursor.fetchone()
                if not result:
                    return {"success": False, "error": "Zaposleni ne obstaja"}
                
                hourly_rate = result[0]
                
                # Pridobi delovne ure v obdobju
                cursor.execute('''
                    SELECT SUM(total_hours - overtime_hours) as regular_hours,
                           SUM(overtime_hours) as overtime_hours
                    FROM time_entries 
                    WHERE employee_id = ? AND date BETWEEN ? AND ?
                ''', (employee_id, pay_period_start.isoformat(), pay_period_end.isoformat()))
                
                hours_result = cursor.fetchone()
                regular_hours = hours_result[0] or 0
                overtime_hours = hours_result[1] or 0
                
                # Izračunaj bruto plačo
                regular_pay = regular_hours * hourly_rate
                overtime_pay = overtime_hours * hourly_rate * 1.5  # 50% dodatek za nadure
                gross_pay = regular_pay + overtime_pay
                
                # Izračunaj davke in prispevke
                tax_rate = 0.16  # 16% dohodnina
                social_security_rate = 0.22  # 22% socialni prispevki
                
                tax_deduction = gross_pay * tax_rate
                social_security = gross_pay * social_security_rate
                net_pay = gross_pay - tax_deduction - social_security
                
                # Ustvari obračun
                payroll_id = f"PAY_{employee_id}_{pay_period_start.strftime('%Y%m')}"
                
                payroll = Payroll(
                    payroll_id=payroll_id,
                    employee_id=employee_id,
                    pay_period_start=pay_period_start,
                    pay_period_end=pay_period_end,
                    regular_hours=regular_hours,
                    overtime_hours=overtime_hours,
                    gross_pay=gross_pay,
                    tax_deduction=tax_deduction,
                    social_security=social_security,
                    net_pay=net_pay,
                    bonuses=0.0,
                    deductions=0.0,
                    created_at=datetime.now()
                )
                
                # Shrani obračun
                cursor.execute('''
                    INSERT OR REPLACE INTO payroll 
                    (payroll_id, employee_id, pay_period_start, pay_period_end,
                     regular_hours, overtime_hours, gross_pay, tax_deduction,
                     social_security, net_pay, bonuses, deductions, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    payroll.payroll_id,
                    payroll.employee_id,
                    payroll.pay_period_start.isoformat(),
                    payroll.pay_period_end.isoformat(),
                    payroll.regular_hours,
                    payroll.overtime_hours,
                    payroll.gross_pay,
                    payroll.tax_deduction,
                    payroll.social_security,
                    payroll.net_pay,
                    payroll.bonuses,
                    payroll.deductions,
                    payroll.created_at.isoformat()
                ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "payroll_id": payroll_id,
                    "payroll": asdict(payroll),
                    "message": "Obračun plače uspešno ustvarjen"
                }
                
        except Exception as e:
            logger.error(f"Napaka pri izračunu plače: {e}")
            return {"success": False, "error": str(e)}
    
    def get_employee_dashboard(self, employee_id: str) -> Dict[str, Any]:
        """Pridobi dashboard zaposlenega"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Osnovni podatki
            cursor.execute('''
                SELECT first_name, last_name, position, department, status
                FROM employees WHERE employee_id = ?
            ''', (employee_id,))
            
            employee_data = cursor.fetchone()
            if not employee_data:
                return {"error": "Zaposleni ne obstaja"}
            
            # Današnje izmene
            today = date.today()
            cursor.execute('''
                SELECT shift_type, start_time, end_time, position
                FROM shifts WHERE employee_id = ? AND date = ?
            ''', (employee_id, today.isoformat()))
            
            today_shifts = cursor.fetchall()
            
            # Čakajoče zahteve za dopust
            cursor.execute('''
                SELECT COUNT(*) FROM leave_requests 
                WHERE employee_id = ? AND status = 'pending'
            ''', (employee_id,))
            
            pending_leaves = cursor.fetchone()[0]
            
            # Delovne ure ta mesec
            month_start = today.replace(day=1)
            cursor.execute('''
                SELECT SUM(total_hours), SUM(overtime_hours)
                FROM time_entries 
                WHERE employee_id = ? AND date >= ?
            ''', (employee_id, month_start.isoformat()))
            
            hours_data = cursor.fetchone()
            
            return {
                "employee_id": employee_id,
                "name": f"{employee_data[0]} {employee_data[1]}",
                "position": employee_data[2],
                "department": employee_data[3],
                "status": employee_data[4],
                "today_shifts": [
                    {
                        "shift_type": shift[0],
                        "start_time": shift[1],
                        "end_time": shift[2],
                        "position": shift[3]
                    } for shift in today_shifts
                ],
                "pending_leave_requests": pending_leaves,
                "monthly_hours": {
                    "total_hours": hours_data[0] or 0,
                    "overtime_hours": hours_data[1] or 0
                }
            }
    
    def generate_hr_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Generiraj HR poročilo"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Statistike zaposlenih
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_employees,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees,
                    COUNT(CASE WHEN status = 'on_leave' THEN 1 END) as on_leave_employees
                FROM employees
            ''')
            
            employee_stats = cursor.fetchone()
            
            # Statistike delovnih ur
            cursor.execute('''
                SELECT 
                    SUM(total_hours) as total_hours,
                    SUM(overtime_hours) as total_overtime,
                    AVG(total_hours) as avg_daily_hours
                FROM time_entries 
                WHERE date BETWEEN ? AND ?
            ''', (start_date.isoformat(), end_date.isoformat()))
            
            hours_stats = cursor.fetchone()
            
            # Statistike dopustov
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                    SUM(CASE WHEN status = 'approved' THEN days_requested ELSE 0 END) as total_days_off
                FROM leave_requests 
                WHERE start_date BETWEEN ? AND ?
            ''', (start_date.isoformat(), end_date.isoformat()))
            
            leave_stats = cursor.fetchone()
            
            return {
                "report_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "employee_statistics": {
                    "total_employees": employee_stats[0],
                    "active_employees": employee_stats[1],
                    "on_leave_employees": employee_stats[2]
                },
                "hours_statistics": {
                    "total_hours": hours_stats[0] or 0,
                    "total_overtime": hours_stats[1] or 0,
                    "avg_daily_hours": hours_stats[2] or 0
                },
                "leave_statistics": {
                    "total_requests": leave_stats[0],
                    "approved_requests": leave_stats[1],
                    "total_days_off": leave_stats[2] or 0
                },
                "generated_at": datetime.now().isoformat()
            }

# Primer uporabe
if __name__ == "__main__":
    hr_system = HRAutomation()
    
    # Dodaj testnega zaposlenega
    employee = Employee(
        employee_id="EMP001",
        first_name="Ana",
        last_name="Novak",
        email="ana.novak@restaurant.com",
        phone="+386 40 123 456",
        position="Natakar",
        department="Strežba",
        hire_date=date(2023, 1, 15),
        hourly_rate=12.50,
        status=EmployeeStatus.ACTIVE,
        skills=["Strežba", "Blagajna", "Jeziki"],
        certifications=["HACCP"],
        emergency_contact={"name": "Marko Novak", "phone": "+386 41 987 654"}
    )
    
    result = hr_system.add_employee(employee)
    print(f"Dodajanje zaposlenega: {result}")
    
    # Ustvari urnik
    schedule_result = hr_system.create_shift_schedule(
        date.today(), date.today() + timedelta(days=7)
    )
    print(f"Ustvarjanje urnika: {schedule_result['success']}")
    
    # Prijava na delo
    clock_in_result = hr_system.clock_in("EMP001")
    print(f"Prijava na delo: {clock_in_result}")
    
    # Dashboard zaposlenega
    dashboard = hr_system.get_employee_dashboard("EMP001")
    print(f"Dashboard: {json.dumps(dashboard, indent=2, ensure_ascii=False)}")
    
    # HR poročilo
    report = hr_system.generate_hr_report(
        date.today() - timedelta(days=30), date.today()
    )
    print(f"HR poročilo: {json.dumps(report, indent=2, ensure_ascii=False)}")