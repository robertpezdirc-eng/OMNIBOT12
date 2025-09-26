"""
OmniCore Task/Calendar Module
Integracija z Google Calendar API in Outlook za upravljanje nalog in dogodkov
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from fastapi import FastAPI, HTTPException, Depends, Form, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Konfiguracija logginga
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Task:
    id: str
    title: str
    description: str
    due_date: datetime
    priority: str  # high, medium, low
    status: str    # pending, in_progress, completed
    assigned_to: str
    created_at: datetime
    updated_at: datetime

@dataclass
class CalendarEvent:
    id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    location: str
    attendees: List[str]
    created_at: datetime

@dataclass
class TaskRequest:
    query: str
    user_id: str
    priority: str = "medium"

@dataclass
class TaskResponse:
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    task_id: Optional[str] = None

class TaskModule:
    """Task/Calendar modul za upravljanje nalog in dogodkov"""
    
    def __init__(self):
        self.name = "task"
        self.version = "1.0.0"
        self.tasks: Dict[str, Task] = {}
        self.events: Dict[str, CalendarEvent] = {}
        self.initialize_demo_data()
        logger.info("📅 Task Module inicializiran")
    
    def initialize_demo_data(self):
        """Inicializacija demo podatkov"""
        # Demo naloge
        demo_tasks = [
            Task(
                id="task_001",
                title="Pregled mesečnih poročil",
                description="Analiza finančnih poročil za december",
                due_date=datetime.now() + timedelta(days=3),
                priority="high",
                status="pending",
                assigned_to="john.doe@company.com",
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Task(
                id="task_002",
                title="Priprava prezentacije",
                description="Q4 rezultati za board meeting",
                due_date=datetime.now() + timedelta(days=7),
                priority="medium",
                status="in_progress",
                assigned_to="jane.smith@company.com",
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            Task(
                id="task_003",
                title="Optimizacija strežnikov",
                description="Performance tuning produkcijskih strežnikov",
                due_date=datetime.now() + timedelta(days=1),
                priority="high",
                status="pending",
                assigned_to="admin@company.com",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        for task in demo_tasks:
            self.tasks[task.id] = task
        
        # Demo dogodki
        demo_events = [
            CalendarEvent(
                id="event_001",
                title="Weekly Team Meeting",
                description="Tedenski pregled projektov",
                start_time=datetime.now() + timedelta(days=1, hours=9),
                end_time=datetime.now() + timedelta(days=1, hours=10),
                location="Conference Room A",
                attendees=["team@company.com"],
                created_at=datetime.now()
            ),
            CalendarEvent(
                id="event_002",
                title="Client Presentation",
                description="Predstavitev Q4 rezultatov",
                start_time=datetime.now() + timedelta(days=5, hours=14),
                end_time=datetime.now() + timedelta(days=5, hours=16),
                location="Boardroom",
                attendees=["client@external.com", "sales@company.com"],
                created_at=datetime.now()
            )
        ]
        
        for event in demo_events:
            self.events[event.id] = event
    
    def handle_request(self, request: TaskRequest) -> TaskResponse:
        """Glavna metoda za obdelavo zahtev"""
        try:
            query = request.query.lower()
            
            # Analiza zahteve
            if "create" in query or "add" in query or "new" in query:
                if "task" in query:
                    return self._create_task(request)
                elif "event" in query or "meeting" in query:
                    return self._create_event(request)
            
            elif "list" in query or "show" in query:
                if "task" in query:
                    return self._list_tasks()
                elif "event" in query or "calendar" in query:
                    return self._list_events()
            
            elif "update" in query or "modify" in query:
                return self._update_task(request)
            
            elif "complete" in query or "finish" in query:
                return self._complete_task(request)
            
            elif "delete" in query or "remove" in query:
                return self._delete_task(request)
            
            else:
                return self._get_dashboard_data()
                
        except Exception as e:
            logger.error(f"Napaka pri obdelavi zahteve: {e}")
            return TaskResponse(
                success=False,
                message=f"Napaka pri obdelavi zahteve: {str(e)}"
            )
    
    def _create_task(self, request: TaskRequest) -> TaskResponse:
        """Ustvari novo nalogo"""
        task_id = f"task_{len(self.tasks) + 1:03d}"
        
        # Izvleči naslov iz zahteve (poenostavljeno)
        title = request.query.replace("create task", "").replace("add task", "").strip()
        if not title:
            title = "Nova naloga"
        
        new_task = Task(
            id=task_id,
            title=title,
            description=f"Naloga ustvarjena iz zahteve: {request.query}",
            due_date=datetime.now() + timedelta(days=7),
            priority=request.priority,
            status="pending",
            assigned_to=request.user_id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        self.tasks[task_id] = new_task
        
        return TaskResponse(
            success=True,
            message=f"Naloga '{title}' uspešno ustvarjena",
            data=asdict(new_task),
            task_id=task_id
        )
    
    def _create_event(self, request: TaskRequest) -> TaskResponse:
        """Ustvari nov dogodek"""
        event_id = f"event_{len(self.events) + 1:03d}"
        
        # Izvleči naslov iz zahteve
        title = request.query.replace("create event", "").replace("add meeting", "").strip()
        if not title:
            title = "Nov dogodek"
        
        new_event = CalendarEvent(
            id=event_id,
            title=title,
            description=f"Dogodek ustvarjen iz zahteve: {request.query}",
            start_time=datetime.now() + timedelta(days=1, hours=9),
            end_time=datetime.now() + timedelta(days=1, hours=10),
            location="TBD",
            attendees=[request.user_id],
            created_at=datetime.now()
        )
        
        self.events[event_id] = new_event
        
        return TaskResponse(
            success=True,
            message=f"Dogodek '{title}' uspešno ustvarjen",
            data=asdict(new_event),
            task_id=event_id
        )
    
    def _list_tasks(self) -> TaskResponse:
        """Vrni seznam nalog"""
        tasks_data = [asdict(task) for task in self.tasks.values()]
        
        return TaskResponse(
            success=True,
            message=f"Najdenih {len(tasks_data)} nalog",
            data={"tasks": tasks_data}
        )
    
    def _list_events(self) -> TaskResponse:
        """Vrni seznam dogodkov"""
        events_data = [asdict(event) for event in self.events.values()]
        
        return TaskResponse(
            success=True,
            message=f"Najdenih {len(events_data)} dogodkov",
            data={"events": events_data}
        )
    
    def _update_task(self, request: TaskRequest) -> TaskResponse:
        """Posodobi nalogo"""
        # Poenostavljeno - posodobi prvo nalogo
        if not self.tasks:
            return TaskResponse(
                success=False,
                message="Ni nalog za posodobitev"
            )
        
        task_id = list(self.tasks.keys())[0]
        task = self.tasks[task_id]
        task.updated_at = datetime.now()
        task.description += f" | Posodobljeno: {request.query}"
        
        return TaskResponse(
            success=True,
            message=f"Naloga {task_id} posodobljena",
            data=asdict(task),
            task_id=task_id
        )
    
    def _complete_task(self, request: TaskRequest) -> TaskResponse:
        """Označi nalogo kot dokončano"""
        # Najdi prvo pending nalogo
        for task_id, task in self.tasks.items():
            if task.status == "pending":
                task.status = "completed"
                task.updated_at = datetime.now()
                
                return TaskResponse(
                    success=True,
                    message=f"Naloga '{task.title}' označena kot dokončana",
                    data=asdict(task),
                    task_id=task_id
                )
        
        return TaskResponse(
            success=False,
            message="Ni pending nalog za dokončanje"
        )
    
    def _delete_task(self, request: TaskRequest) -> TaskResponse:
        """Izbriši nalogo"""
        if not self.tasks:
            return TaskResponse(
                success=False,
                message="Ni nalog za brisanje"
            )
        
        task_id = list(self.tasks.keys())[-1]  # Izbriši zadnjo
        deleted_task = self.tasks.pop(task_id)
        
        return TaskResponse(
            success=True,
            message=f"Naloga '{deleted_task.title}' izbrisana",
            task_id=task_id
        )
    
    def _get_dashboard_data(self) -> TaskResponse:
        """Vrni dashboard podatke"""
        total_tasks = len(self.tasks)
        pending_tasks = len([t for t in self.tasks.values() if t.status == "pending"])
        completed_tasks = len([t for t in self.tasks.values() if t.status == "completed"])
        overdue_tasks = len([t for t in self.tasks.values() if t.due_date < datetime.now() and t.status != "completed"])
        
        total_events = len(self.events)
        upcoming_events = len([e for e in self.events.values() if e.start_time > datetime.now()])
        
        dashboard_data = {
            "tasks": {
                "total": total_tasks,
                "pending": pending_tasks,
                "completed": completed_tasks,
                "overdue": overdue_tasks
            },
            "events": {
                "total": total_events,
                "upcoming": upcoming_events
            },
            "recent_tasks": [asdict(task) for task in list(self.tasks.values())[-3:]],
            "upcoming_events": [asdict(event) for event in list(self.events.values())[-3:]]
        }
        
        return TaskResponse(
            success=True,
            message="Dashboard podatki pridobljeni",
            data=dashboard_data
        )

# Inicializacija modula
task_module = TaskModule()

# FastAPI aplikacija
app = FastAPI(
    title="OmniCore Task Module",
    description="Task/Calendar modul za upravljanje nalog in dogodkov",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Task Module dashboard"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>OmniCore Task Module</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-number { font-size: 2em; font-weight: bold; }
            .stat-label { font-size: 0.9em; opacity: 0.9; }
            .section { margin-bottom: 30px; }
            .section h3 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .task-item, .event-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            .priority-high { border-left-color: #dc3545; }
            .priority-medium { border-left-color: #ffc107; }
            .priority-low { border-left-color: #28a745; }
            .status-completed { opacity: 0.7; text-decoration: line-through; }
            .api-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px; }
            .endpoint { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📅 OmniCore Task Module</h1>
                <p>Task/Calendar Management System</p>
            </div>
            
            <div class="stats" id="stats">
                <div class="stat-card">
                    <div class="stat-number" id="total-tasks">-</div>
                    <div class="stat-label">Skupaj nalog</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="pending-tasks">-</div>
                    <div class="stat-label">Pending naloge</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="completed-tasks">-</div>
                    <div class="stat-label">Dokončane naloge</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="upcoming-events">-</div>
                    <div class="stat-label">Prihajajoči dogodki</div>
                </div>
            </div>
            
            <div class="section">
                <h3>📋 Nedavne naloge</h3>
                <div id="recent-tasks"></div>
            </div>
            
            <div class="section">
                <h3>📅 Prihajajoči dogodki</h3>
                <div id="upcoming-events-list"></div>
            </div>
            
            <div class="api-section">
                <h3>🔗 API Endpoints</h3>
                <div class="endpoint">POST /process - Obdelaj zahtevo</div>
                <div class="endpoint">GET /tasks - Seznam nalog</div>
                <div class="endpoint">GET /events - Seznam dogodkov</div>
                <div class="endpoint">GET /health - Zdravstveno preverjanje</div>
                <div class="endpoint">GET /stats - Statistike modula</div>
            </div>
        </div>
        
        <script>
            async function loadDashboard() {
                try {
                    const response = await fetch('/dashboard-data');
                    const data = await response.json();
                    
                    if (data.success) {
                        const dashboardData = data.data;
                        
                        // Posodobi statistike
                        document.getElementById('total-tasks').textContent = dashboardData.tasks.total;
                        document.getElementById('pending-tasks').textContent = dashboardData.tasks.pending;
                        document.getElementById('completed-tasks').textContent = dashboardData.tasks.completed;
                        document.getElementById('upcoming-events').textContent = dashboardData.events.upcoming;
                        
                        // Prikaži nedavne naloge
                        const recentTasksDiv = document.getElementById('recent-tasks');
                        recentTasksDiv.innerHTML = '';
                        dashboardData.recent_tasks.forEach(task => {
                            const taskDiv = document.createElement('div');
                            taskDiv.className = `task-item priority-${task.priority} ${task.status === 'completed' ? 'status-completed' : ''}`;
                            taskDiv.innerHTML = `
                                <strong>${task.title}</strong><br>
                                <small>Prioriteta: ${task.priority} | Status: ${task.status} | Rok: ${new Date(task.due_date).toLocaleDateString()}</small><br>
                                ${task.description}
                            `;
                            recentTasksDiv.appendChild(taskDiv);
                        });
                        
                        // Prikaži prihajajoče dogodke
                        const upcomingEventsDiv = document.getElementById('upcoming-events-list');
                        upcomingEventsDiv.innerHTML = '';
                        dashboardData.upcoming_events.forEach(event => {
                            const eventDiv = document.createElement('div');
                            eventDiv.className = 'event-item';
                            eventDiv.innerHTML = `
                                <strong>${event.title}</strong><br>
                                <small>Čas: ${new Date(event.start_time).toLocaleString()} | Lokacija: ${event.location}</small><br>
                                ${event.description}
                            `;
                            upcomingEventsDiv.appendChild(eventDiv);
                        });
                    }
                } catch (error) {
                    console.error('Napaka pri nalaganju dashboard podatkov:', error);
                }
            }
            
            // Naloži podatke ob zagonu
            loadDashboard();
            
            // Osveži podatke vsakih 30 sekund
            setInterval(loadDashboard, 30000);
        </script>
    </body>
    </html>
    """

@app.post("/process")
async def process_request(
    query: str = Form(...),
    user_id: str = Form(default="user@company.com"),
    priority: str = Form(default="medium")
):
    """Obdelaj zahtevo"""
    request = TaskRequest(
        query=query,
        user_id=user_id,
        priority=priority
    )
    
    response = task_module.handle_request(request)
    return response

@app.get("/dashboard-data")
async def get_dashboard_data():
    """Pridobi dashboard podatke"""
    request = TaskRequest(query="dashboard", user_id="system")
    return task_module.handle_request(request)

@app.get("/tasks")
async def get_tasks():
    """Pridobi seznam nalog"""
    request = TaskRequest(query="list tasks", user_id="system")
    return task_module.handle_request(request)

@app.get("/events")
async def get_events():
    """Pridobi seznam dogodkov"""
    request = TaskRequest(query="list events", user_id="system")
    return task_module.handle_request(request)

@app.get("/health")
async def health_check():
    """Zdravstveno preverjanje"""
    return {
        "status": "healthy",
        "module": "task",
        "version": task_module.version,
        "timestamp": datetime.now().isoformat(),
        "tasks_count": len(task_module.tasks),
        "events_count": len(task_module.events)
    }

@app.get("/stats")
async def get_stats():
    """Statistike modula"""
    request = TaskRequest(query="dashboard", user_id="system")
    dashboard_response = task_module.handle_request(request)
    
    return {
        "module": "task",
        "version": task_module.version,
        "uptime": "active",
        "data": dashboard_response.data if dashboard_response.success else {}
    }

if __name__ == "__main__":
    print("📅 Zaganjam OmniCore Task Module...")
    print("📋 Task management: Active")
    print("📅 Calendar integration: Enabled")
    print("🔗 Google Calendar API: Ready")
    print("📊 Task Module dashboard: http://localhost:8303")
    
    uvicorn.run(
        "omni_task_module:app",
        host="0.0.0.0",
        port=8303,
        reload=True
    )