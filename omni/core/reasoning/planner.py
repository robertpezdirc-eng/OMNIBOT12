"""
🧩 OMNI REASONING PLANNER
Logika, sklepanje in načrtovanje
"""

import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Priority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class Task:
    """Struktura naloge"""
    id: str
    title: str
    description: str
    status: TaskStatus
    priority: Priority
    estimated_duration: int  # v minutah
    dependencies: List[str]
    required_modules: List[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    metadata: Dict[str, Any]

@dataclass
class Plan:
    """Struktura načrta"""
    id: str
    title: str
    description: str
    tasks: List[Task]
    estimated_total_duration: int
    created_at: datetime
    status: str
    metadata: Dict[str, Any]

class OmniReasoningPlanner:
    """
    Sistem za logično sklepanje in načrtovanje z naslednjimi funkcionalnostmi:
    - Analiza problemov in razdelitev na naloge
    - Načrtovanje korakov in odvisnosti
    - Optimizacija vrstnega reda izvajanja
    - Sledenje napredku
    - Adaptivno preračunavanje načrtov
    """
    
    def __init__(self):
        self.plans: Dict[str, Plan] = {}
        self.active_tasks: Dict[str, Task] = {}
        self.completed_tasks: Dict[str, Task] = {}
        self.reasoning_rules: Dict[str, Any] = self._init_reasoning_rules()
    
    def _init_reasoning_rules(self) -> Dict[str, Any]:
        """Inicializiraj osnovna pravila sklepanja"""
        return {
            "task_breakdown": {
                "max_task_duration": 120,  # maksimalno 2 uri na nalogo
                "min_subtasks": 2,
                "max_subtasks": 8
            },
            "priority_rules": {
                "user_request": Priority.HIGH,
                "system_maintenance": Priority.MEDIUM,
                "optimization": Priority.LOW,
                "critical_error": Priority.CRITICAL
            },
            "module_capabilities": {
                "finance": ["računovodstvo", "davki", "proračun", "investicije"],
                "tourism": ["rezervacije", "itinerariji", "priporočila", "lokalne informacije"],
                "healthcare": ["simptomi", "preventiva", "wellness", "prehrana"],
                "devops": ["programiranje", "deployment", "github", "avtomatizacija"],
                "art": ["glasba", "dizajn", "video", "kreativnost"]
            }
        }
    
    def analyze_problem(self, problem_description: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analiziraj problem in predlagaj pristop"""
        if context is None:
            context = {}
        
        analysis = {
            "problem": problem_description,
            "complexity": self._assess_complexity(problem_description),
            "required_modules": self._identify_required_modules(problem_description),
            "estimated_duration": 0,
            "approach": "sequential",  # ali "parallel"
            "risks": [],
            "opportunities": []
        }
        
        # Oceni kompleksnost
        complexity = analysis["complexity"]
        if complexity == "simple":
            analysis["estimated_duration"] = 30  # 30 minut
            analysis["approach"] = "direct"
        elif complexity == "medium":
            analysis["estimated_duration"] = 90  # 1.5 ure
            analysis["approach"] = "sequential"
        else:  # complex
            analysis["estimated_duration"] = 240  # 4 ure
            analysis["approach"] = "parallel"
        
        # Identificiraj tveganja
        if len(analysis["required_modules"]) > 3:
            analysis["risks"].append("Potrebuje več modulov - možne integracije")
        
        if "urgent" in problem_description.lower() or "hitro" in problem_description.lower():
            analysis["risks"].append("Časovni pritisk")
            analysis["opportunities"].append("Visoka prioriteta uporabnika")
        
        return analysis
    
    def _assess_complexity(self, description: str) -> str:
        """Oceni kompleksnost problema"""
        description_lower = description.lower()
        
        # Preštej indikatorje kompleksnosti
        complexity_indicators = [
            "integracij", "več", "kompleks", "sistem", "avtomatizacij", 
            "povezav", "sync", "baza", "API", "workflow"
        ]
        
        simple_indicators = [
            "preprosto", "hitro", "osnovno", "enostavno", "samo", "le"
        ]
        
        complex_count = sum(1 for indicator in complexity_indicators if indicator in description_lower)
        simple_count = sum(1 for indicator in simple_indicators if indicator in description_lower)
        
        if simple_count > complex_count and len(description.split()) < 10:
            return "simple"
        elif complex_count > 2 or len(description.split()) > 30:
            return "complex"
        else:
            return "medium"
    
    def _identify_required_modules(self, description: str) -> List[str]:
        """Identificiraj potrebne module"""
        description_lower = description.lower()
        required_modules = []
        
        for module, keywords in self.reasoning_rules["module_capabilities"].items():
            if any(keyword in description_lower for keyword in keywords):
                required_modules.append(module)
        
        # Dodaj univerzalni modul, če ni specifičnih
        if not required_modules:
            required_modules.append("universal")
        
        return required_modules
    
    def create_plan(self, problem_description: str, context: Dict[str, Any] = None) -> str:
        """Ustvari načrt za rešitev problema"""
        if context is None:
            context = {}
        
        # Analiziraj problem
        analysis = self.analyze_problem(problem_description, context)
        
        # Generiraj ID načrta
        plan_id = f"plan_{len(self.plans)}_{datetime.now().timestamp()}"
        
        # Razčleni na naloge
        tasks = self._break_down_into_tasks(problem_description, analysis)
        
        # Ustvari načrt
        plan = Plan(
            id=plan_id,
            title=f"Načrt za: {problem_description[:50]}...",
            description=problem_description,
            tasks=tasks,
            estimated_total_duration=sum(task.estimated_duration for task in tasks),
            created_at=datetime.now(),
            status="created",
            metadata={
                "analysis": analysis,
                "context": context,
                "approach": analysis["approach"]
            }
        )
        
        self.plans[plan_id] = plan
        
        # Dodaj naloge v aktivne
        for task in tasks:
            if task.status == TaskStatus.PENDING:
                self.active_tasks[task.id] = task
        
        return plan_id
    
    def _break_down_into_tasks(self, problem_description: str, analysis: Dict[str, Any]) -> List[Task]:
        """Razčleni problem na naloge"""
        tasks = []
        required_modules = analysis["required_modules"]
        complexity = analysis["complexity"]
        
        # Osnovna struktura nalog
        base_tasks = [
            {
                "title": "Analiza zahtev",
                "description": f"Podrobna analiza: {problem_description}",
                "duration": 15,
                "modules": ["universal"],
                "dependencies": []
            }
        ]
        
        # Dodaj naloge glede na module
        for module in required_modules:
            if module != "universal":
                base_tasks.append({
                    "title": f"Implementacija {module} modula",
                    "description": f"Uporaba {module} modula za rešitev",
                    "duration": 45 if complexity == "complex" else 30,
                    "modules": [module],
                    "dependencies": ["task_0"]  # Odvisno od analize
                })
        
        # Dodaj integracijske naloge, če je več modulov
        if len(required_modules) > 1:
            base_tasks.append({
                "title": "Integracija modulov",
                "description": "Povezovanje različnih modulov",
                "duration": 30,
                "modules": required_modules,
                "dependencies": [f"task_{i}" for i in range(1, len(required_modules) + 1)]
            })
        
        # Dodaj testiranje in finalizacijo
        base_tasks.extend([
            {
                "title": "Testiranje rešitve",
                "description": "Preverjanje delovanja in kakovosti",
                "duration": 20,
                "modules": ["universal"],
                "dependencies": [f"task_{len(base_tasks) - 1}"]
            },
            {
                "title": "Finalizacija in dokumentacija",
                "description": "Zaključek in priprava dokumentacije",
                "duration": 15,
                "modules": ["universal"],
                "dependencies": [f"task_{len(base_tasks)}"]
            }
        ])
        
        # Ustvari Task objekte
        for i, task_data in enumerate(base_tasks):
            task_id = f"task_{i}_{datetime.now().timestamp()}"
            
            # Določi prioriteto
            priority = Priority.MEDIUM
            if i == 0:  # Analiza je vedno visoka prioriteta
                priority = Priority.HIGH
            elif "critical" in problem_description.lower():
                priority = Priority.CRITICAL
            
            task = Task(
                id=task_id,
                title=task_data["title"],
                description=task_data["description"],
                status=TaskStatus.PENDING,
                priority=priority,
                estimated_duration=task_data["duration"],
                dependencies=task_data["dependencies"],
                required_modules=task_data["modules"],
                created_at=datetime.now(),
                updated_at=datetime.now(),
                completed_at=None,
                metadata={"order": i}
            )
            
            tasks.append(task)
        
        return tasks
    
    def get_next_tasks(self, plan_id: str) -> List[Task]:
        """Pridobi naslednje naloge za izvajanje"""
        if plan_id not in self.plans:
            return []
        
        plan = self.plans[plan_id]
        executable_tasks = []
        
        for task in plan.tasks:
            if task.status == TaskStatus.PENDING:
                # Preveri, če so odvisnosti izpolnjene
                dependencies_met = True
                for dep_id in task.dependencies:
                    # Poišči odvisno nalogo
                    dep_task = None
                    for t in plan.tasks:
                        if t.id.startswith(dep_id) or dep_id in t.id:
                            dep_task = t
                            break
                    
                    if dep_task and dep_task.status != TaskStatus.COMPLETED:
                        dependencies_met = False
                        break
                
                if dependencies_met:
                    executable_tasks.append(task)
        
        # Razvrsti po prioriteti
        executable_tasks.sort(key=lambda x: x.priority.value, reverse=True)
        return executable_tasks
    
    def start_task(self, task_id: str) -> bool:
        """Začni izvajanje naloge"""
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            task.status = TaskStatus.IN_PROGRESS
            task.updated_at = datetime.now()
            return True
        return False
    
    def complete_task(self, task_id: str, result: Dict[str, Any] = None) -> bool:
        """Označi nalogo kot dokončano"""
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            task.updated_at = datetime.now()
            
            if result:
                task.metadata["result"] = result
            
            # Premakni v dokončane
            self.completed_tasks[task_id] = task
            del self.active_tasks[task_id]
            
            return True
        return False
    
    def get_plan_progress(self, plan_id: str) -> Dict[str, Any]:
        """Pridobi napredek načrta"""
        if plan_id not in self.plans:
            return {"error": "Načrt ne obstaja"}
        
        plan = self.plans[plan_id]
        total_tasks = len(plan.tasks)
        completed_tasks = sum(1 for task in plan.tasks if task.status == TaskStatus.COMPLETED)
        in_progress_tasks = sum(1 for task in plan.tasks if task.status == TaskStatus.IN_PROGRESS)
        
        progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Oceni preostali čas
        remaining_tasks = [task for task in plan.tasks if task.status in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]]
        estimated_remaining_time = sum(task.estimated_duration for task in remaining_tasks)
        
        return {
            "plan_id": plan_id,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "pending_tasks": total_tasks - completed_tasks - in_progress_tasks,
            "progress_percentage": round(progress_percentage, 1),
            "estimated_remaining_time": estimated_remaining_time,
            "status": "completed" if completed_tasks == total_tasks else "in_progress"
        }
    
    def optimize_plan(self, plan_id: str) -> Dict[str, Any]:
        """Optimiziraj načrt na podlagi trenutnega stanja"""
        if plan_id not in self.plans:
            return {"error": "Načrt ne obstaja"}
        
        plan = self.plans[plan_id]
        optimizations = []
        
        # Preveri, če lahko naloge izvajamo vzporedno
        parallel_opportunities = []
        for task in plan.tasks:
            if task.status == TaskStatus.PENDING and not task.dependencies:
                parallel_opportunities.append(task.id)
        
        if len(parallel_opportunities) > 1:
            optimizations.append({
                "type": "parallelization",
                "description": f"Možno vzporedno izvajanje {len(parallel_opportunities)} nalog",
                "tasks": parallel_opportunities,
                "time_saved": max(task.estimated_duration for task in plan.tasks if task.id in parallel_opportunities) * (len(parallel_opportunities) - 1)
            })
        
        # Preveri za nepotrebne odvisnosti
        for task in plan.tasks:
            if len(task.dependencies) > 2:
                optimizations.append({
                    "type": "dependency_reduction",
                    "description": f"Naloga {task.title} ima preveč odvisnosti",
                    "task_id": task.id,
                    "current_dependencies": len(task.dependencies)
                })
        
        return {
            "plan_id": plan_id,
            "optimizations_found": len(optimizations),
            "optimizations": optimizations,
            "potential_time_saved": sum(opt.get("time_saved", 0) for opt in optimizations)
        }
    
    def get_reasoning_summary(self) -> Dict[str, Any]:
        """Pridobi povzetek sklepanja in načrtovanja"""
        total_plans = len(self.plans)
        active_plans = sum(1 for plan in self.plans.values() if plan.status != "completed")
        total_tasks = len(self.active_tasks) + len(self.completed_tasks)
        
        # Analiza uspešnosti
        completed_on_time = 0
        for task in self.completed_tasks.values():
            if task.completed_at and task.created_at:
                actual_duration = (task.completed_at - task.created_at).total_seconds() / 60
                if actual_duration <= task.estimated_duration * 1.2:  # 20% toleranca
                    completed_on_time += 1
        
        success_rate = (completed_on_time / len(self.completed_tasks) * 100) if self.completed_tasks else 0
        
        return {
            "total_plans": total_plans,
            "active_plans": active_plans,
            "total_tasks": total_tasks,
            "active_tasks": len(self.active_tasks),
            "completed_tasks": len(self.completed_tasks),
            "success_rate": round(success_rate, 1),
            "average_task_duration": round(sum(task.estimated_duration for task in self.completed_tasks.values()) / len(self.completed_tasks), 1) if self.completed_tasks else 0
        }

if __name__ == "__main__":
    # Test reasoning plannerja
    planner = OmniReasoningPlanner()
    
    # Test analize problema
    problem = "Potrebujem avtomatizacijo računovodstva za turistično agencijo z integracijo GitHub repozitorija"
    
    print("🧩 Analiziram problem...")
    analysis = planner.analyze_problem(problem)
    print(f"Analiza: {analysis}")
    
    # Ustvari načrt
    print("\n📋 Ustvarjam načrt...")
    plan_id = planner.create_plan(problem)
    print(f"Ustvarjen načrt: {plan_id}")
    
    # Pridobi naslednje naloge
    next_tasks = planner.get_next_tasks(plan_id)
    print(f"\n📝 Naslednje naloge ({len(next_tasks)}):")
    for task in next_tasks:
        print(f"- {task.title} (prioriteta: {task.priority.name})")
    
    # Simuliraj izvajanje
    if next_tasks:
        first_task = next_tasks[0]
        print(f"\n▶️ Začenjam nalogo: {first_task.title}")
        planner.start_task(first_task.id)
        
        print(f"✅ Dokončujem nalogo: {first_task.title}")
        planner.complete_task(first_task.id, {"status": "success"})
    
    # Preveri napredek
    progress = planner.get_plan_progress(plan_id)
    print(f"\n📊 Napredek načrta: {progress}")
    
    # Optimizacija
    optimization = planner.optimize_plan(plan_id)
    print(f"\n⚡ Optimizacija: {optimization}")
    
    # Povzetek
    summary = planner.get_reasoning_summary()
    print(f"\n📈 Povzetek: {summary}")