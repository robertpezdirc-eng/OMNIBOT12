"""
OmniCore Task Management Module
Napredni modul za upravljanje nalog, projektov in workflow-ov
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import uuid
from enum import Enum

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"

class TaskPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskModule:
    """Modul za upravljanje nalog in projektov"""
    
    def __init__(self, db_manager=None, config=None):
        self.db_manager = db_manager
        self.config = config
        self.name = "task"
        self.version = "1.0.0"
        self.description = "Napredni modul za upravljanje nalog, projektov in workflow-ov"
        
        # Inicializacija demo podatkov
        self.init_demo_data()
        
        logger.info("📋 Task Module inicializiran")
        
    def init_demo_data(self):
        """Inicializacija demo nalog in projektov"""
        self.tasks = {
            "task_001": {
                "id": "task_001",
                "title": "Implementacija API dokumentacije",
                "description": "Ustvariti Swagger dokumentacijo za vse API endpointe",
                "status": TaskStatus.IN_PROGRESS.value,
                "priority": TaskPriority.HIGH.value,
                "assignee": "developer@company.com",
                "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
                "due_date": (datetime.now() + timedelta(days=3)).isoformat(),
                "progress": 65,
                "tags": ["api", "documentation", "backend"]
            },
            "task_002": {
                "id": "task_002", 
                "title": "UI/UX optimizacija dashboard-a",
                "description": "Izboljšati uporabniško izkušnjo glavnega dashboard-a",
                "status": TaskStatus.PENDING.value,
                "priority": TaskPriority.MEDIUM.value,
                "assignee": "designer@company.com",
                "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
                "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "progress": 0,
                "tags": ["ui", "ux", "frontend", "dashboard"]
            },
            "task_003": {
                "id": "task_003",
                "title": "Varnostni audit sistema",
                "description": "Izvesti celovit varnostni pregled vseh modulov",
                "status": TaskStatus.COMPLETED.value,
                "priority": TaskPriority.URGENT.value,
                "assignee": "security@company.com",
                "created_at": (datetime.now() - timedelta(days=5)).isoformat(),
                "due_date": (datetime.now() - timedelta(days=1)).isoformat(),
                "progress": 100,
                "tags": ["security", "audit", "compliance"]
            }
        }
        
        self.projects = {
            "proj_001": {
                "id": "proj_001",
                "name": "OmniCore Platform v2.0",
                "description": "Nadgradnja platforme z novimi funkcionalnostmi",
                "status": "active",
                "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
                "end_date": (datetime.now() + timedelta(days=60)).isoformat(),
                "progress": 45,
                "team_members": ["dev1@company.com", "dev2@company.com", "pm@company.com"],
                "tasks": ["task_001", "task_002"],
                "budget": 50000,
                "spent": 22500
            }
        }
        
    async def handle(self, query: str) -> Dict[str, Any]:
        """Glavna metoda za obdelavo task poizvedb"""
        try:
            query_lower = query.lower()
            
            if any(word in query_lower for word in ["ustvari", "create", "nova naloga", "new task"]):
                return await self.create_task(query)
            elif any(word in query_lower for word in ["seznam", "list", "pregled", "overview"]):
                return await self.list_tasks(query)
            elif any(word in query_lower for word in ["posodobi", "update", "spremeni"]):
                return await self.update_task(query)
            elif any(word in query_lower for word in ["projekt", "project"]):
                return await self.handle_project(query)
            elif any(word in query_lower for word in ["dashboard", "pregled"]):
                return await self.get_task_dashboard()
            elif any(word in query_lower for word in ["statistike", "stats", "analiza"]):
                return await self.get_task_analytics()
            else:
                return await self.general_task_query(query)
                
        except Exception as e:
            logger.error(f"Napaka v Task modulu: {e}")
            return {"error": f"Napaka pri upravljanju nalog: {str(e)}"}
    
    async def create_task(self, query: str) -> Dict[str, Any]:
        """Ustvari novo nalogo"""
        # Simulacija ustvarjanja naloge iz query-ja
        task_id = f"task_{str(uuid.uuid4())[:8]}"
        
        new_task = {
            "id": task_id,
            "title": "Nova naloga iz poizvedbe",
            "description": f"Naloga ustvarjena iz: {query}",
            "status": TaskStatus.PENDING.value,
            "priority": TaskPriority.MEDIUM.value,
            "assignee": "system@company.com",
            "created_at": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "progress": 0,
            "tags": ["auto-generated"]
        }
        
        self.tasks[task_id] = new_task
        
        return {
            "module": "task",
            "type": "task_created",
            "data": {
                "task": new_task,
                "message": f"Naloga {task_id} je bila uspešno ustvarjena",
                "next_steps": [
                    "Dodeli nalogo ustreznemu članu ekipe",
                    "Nastavi prioriteto in rok",
                    "Dodaj podrobnosti in zahteve"
                ]
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def list_tasks(self, query: str) -> Dict[str, Any]:
        """Seznam nalog z možnostjo filtriranja"""
        filtered_tasks = list(self.tasks.values())
        
        # Filtriranje po statusu
        if "pending" in query.lower() or "čakajoče" in query.lower():
            filtered_tasks = [t for t in filtered_tasks if t["status"] == TaskStatus.PENDING.value]
        elif "progress" in query.lower() or "v teku" in query.lower():
            filtered_tasks = [t for t in filtered_tasks if t["status"] == TaskStatus.IN_PROGRESS.value]
        elif "completed" in query.lower() or "končane" in query.lower():
            filtered_tasks = [t for t in filtered_tasks if t["status"] == TaskStatus.COMPLETED.value]
        
        # Statistike
        stats = {
            "total": len(self.tasks),
            "pending": len([t for t in self.tasks.values() if t["status"] == TaskStatus.PENDING.value]),
            "in_progress": len([t for t in self.tasks.values() if t["status"] == TaskStatus.IN_PROGRESS.value]),
            "completed": len([t for t in self.tasks.values() if t["status"] == TaskStatus.COMPLETED.value]),
            "overdue": len([t for t in self.tasks.values() if datetime.fromisoformat(t["due_date"]) < datetime.now()])
        }
        
        return {
            "module": "task",
            "type": "task_list",
            "data": {
                "tasks": filtered_tasks,
                "statistics": stats,
                "filters_applied": query,
                "total_filtered": len(filtered_tasks)
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def update_task(self, query: str) -> Dict[str, Any]:
        """Posodobi nalogo"""
        # Simulacija posodabljanja prve naloge
        if self.tasks:
            task_id = list(self.tasks.keys())[0]
            task = self.tasks[task_id]
            
            # Simulacija posodabljanja na podlagi query-ja
            if "končaj" in query.lower() or "complete" in query.lower():
                task["status"] = TaskStatus.COMPLETED.value
                task["progress"] = 100
            elif "začni" in query.lower() or "start" in query.lower():
                task["status"] = TaskStatus.IN_PROGRESS.value
                if task["progress"] == 0:
                    task["progress"] = 10
            
            return {
                "module": "task",
                "type": "task_updated",
                "data": {
                    "task": task,
                    "message": f"Naloga {task_id} je bila posodobljena",
                    "changes": ["status", "progress"]
                },
                "timestamp": datetime.now().isoformat()
            }
        
        return {"error": "Ni nalog za posodabljanje"}
    
    async def handle_project(self, query: str) -> Dict[str, Any]:
        """Upravljanje projektov"""
        if "seznam" in query.lower() or "list" in query.lower():
            return {
                "module": "task",
                "type": "project_list",
                "data": {
                    "projects": list(self.projects.values()),
                    "total_projects": len(self.projects),
                    "active_projects": len([p for p in self.projects.values() if p["status"] == "active"])
                },
                "timestamp": datetime.now().isoformat()
            }
        
        # Podrobnosti prvega projekta
        if self.projects:
            project = list(self.projects.values())[0]
            project_tasks = [self.tasks[tid] for tid in project["tasks"] if tid in self.tasks]
            
            return {
                "module": "task", 
                "type": "project_details",
                "data": {
                    "project": project,
                    "tasks": project_tasks,
                    "progress_breakdown": {
                        "completed_tasks": len([t for t in project_tasks if t["status"] == TaskStatus.COMPLETED.value]),
                        "total_tasks": len(project_tasks),
                        "budget_utilization": (project["spent"] / project["budget"]) * 100
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
        
        return {"error": "Ni projektov"}
    
    async def get_task_dashboard(self) -> Dict[str, Any]:
        """Task management dashboard"""
        # Izračun statistik
        total_tasks = len(self.tasks)
        completed_tasks = len([t for t in self.tasks.values() if t["status"] == TaskStatus.COMPLETED.value])
        overdue_tasks = len([t for t in self.tasks.values() if datetime.fromisoformat(t["due_date"]) < datetime.now()])
        
        # Produktivnost po dnevih (simulacija)
        productivity_data = [8, 12, 6, 15, 10, 9, 11]  # Naloge končane po dnevih
        
        return {
            "module": "task",
            "type": "dashboard",
            "data": {
                "overview": {
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                    "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
                    "overdue_tasks": overdue_tasks
                },
                "recent_tasks": list(self.tasks.values())[:5],
                "productivity": {
                    "daily_completion": productivity_data,
                    "average_daily": sum(productivity_data) / len(productivity_data),
                    "trend": "increasing"
                },
                "team_performance": {
                    "most_productive": "developer@company.com",
                    "tasks_per_person": 2.5,
                    "average_completion_time": "3.2 dni"
                }
            },
            "last_updated": datetime.now().isoformat()
        }
    
    async def get_task_analytics(self) -> Dict[str, Any]:
        """Analitika nalog in produktivnosti"""
        return {
            "module": "task",
            "type": "analytics",
            "data": {
                "completion_trends": {
                    "this_week": 12,
                    "last_week": 8,
                    "growth": 50.0
                },
                "priority_distribution": {
                    "urgent": 1,
                    "high": 1, 
                    "medium": 1,
                    "low": 0
                },
                "time_tracking": {
                    "average_task_duration": "2.5 dni",
                    "fastest_completion": "4 ure",
                    "longest_task": "8 dni"
                },
                "bottlenecks": [
                    "Čakanje na odobritve",
                    "Pomanjkanje virov",
                    "Nejasne zahteve"
                ],
                "recommendations": [
                    "Avtomatiziraj ponavljajoče se naloge",
                    "Izboljšaj komunikacijo v ekipi",
                    "Implementiraj time tracking"
                ]
            },
            "generated_at": datetime.now().isoformat()
        }
    
    async def general_task_query(self, query: str) -> Dict[str, Any]:
        """Splošna poizvedba o nalogah"""
        return {
            "module": "task",
            "type": "general_query",
            "query": query,
            "data": {
                "summary": f"Obdelava poizvedbe: {query}",
                "available_actions": [
                    "Ustvari novo nalogo",
                    "Prikaži seznam nalog",
                    "Posodobi nalogo",
                    "Upravljaj projekte"
                ],
                "quick_stats": {
                    "total_tasks": len(self.tasks),
                    "active_projects": len(self.projects)
                }
            },
            "processed_at": datetime.now().isoformat()
        }
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Podatki za dashboard"""
        return {
            "module_name": self.name,
            "status": "active",
            "version": self.version,
            "metrics": {
                "total_tasks": len(self.tasks),
                "active_projects": len(self.projects),
                "completion_rate": "78%",
                "last_activity": datetime.now().strftime("%H:%M")
            },
            "quick_actions": [
                "Nova naloga",
                "Pregled projektov", 
                "Analitika"
            ]
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Preverjanje zdravja modula"""
        return {
            "module": self.name,
            "status": "healthy",
            "version": self.version,
            "last_check": datetime.now().isoformat(),
            "metrics": {
                "uptime": "99.8%",
                "response_time": "32ms",
                "data_integrity": "excellent"
            }
        }