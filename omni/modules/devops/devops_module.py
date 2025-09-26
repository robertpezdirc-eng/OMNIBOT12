"""
⚙️ OMNI DEVOPS MODULE
IT, GitHub sync, CI/CD, avtomatizacija, monitoring
"""

import json
import sqlite3
import subprocess
import os
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class ProjectStatus(Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    ARCHIVED = "archived"
    DEVELOPMENT = "development"

class DeploymentStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"

class IssueStatus(Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

@dataclass
class Project:
    id: str
    name: str
    repository_url: str
    local_path: str
    status: ProjectStatus
    last_sync: datetime
    branch: str
    description: str
    technologies: List[str]

@dataclass
class Deployment:
    id: str
    project_id: str
    version: str
    environment: str
    status: DeploymentStatus
    deployed_at: datetime
    deployed_by: str
    commit_hash: str
    logs: str

@dataclass
class Issue:
    id: str
    project_id: str
    title: str
    description: str
    status: IssueStatus
    priority: str
    assigned_to: str
    created_at: datetime
    resolved_at: Optional[datetime]

@dataclass
class SystemMetric:
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: float
    active_processes: int

class DevOpsModule:
    """
    🔧 Omni DevOps Module
    - GitHub sync in upravljanje projektov
    - CI/CD pipeline avtomatizacija
    - Sistem monitoring
    - Issue tracking
    """
    
    def __init__(self, db_path: str = "devops.db", github_token: Optional[str] = None):
        self.db_path = db_path
        self.github_token = github_token
        self.init_database()
        
    def init_database(self):
        """Inicializacija baze podatkov"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabela projektov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT,
                repository_url TEXT,
                local_path TEXT,
                status TEXT,
                last_sync TEXT,
                branch TEXT,
                description TEXT,
                technologies TEXT
            )
        ''')
        
        # Tabela deploymentov
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deployments (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                version TEXT,
                environment TEXT,
                status TEXT,
                deployed_at TEXT,
                deployed_by TEXT,
                commit_hash TEXT,
                logs TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        ''')
        
        # Tabela issue-jev
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS issues (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                title TEXT,
                description TEXT,
                status TEXT,
                priority TEXT,
                assigned_to TEXT,
                created_at TEXT,
                resolved_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        ''')
        
        # Tabela sistemskih metrik
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                timestamp TEXT,
                cpu_usage REAL,
                memory_usage REAL,
                disk_usage REAL,
                network_io REAL,
                active_processes INTEGER
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_project(self, project: Project) -> bool:
        """Dodaj nov projekt"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO projects 
                (id, name, repository_url, local_path, status, last_sync, 
                 branch, description, technologies)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                project.id,
                project.name,
                project.repository_url,
                project.local_path,
                project.status.value,
                project.last_sync.isoformat(),
                project.branch,
                project.description,
                json.dumps(project.technologies)
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri dodajanju projekta: {e}")
            return False
    
    def sync_project_from_github(self, project_id: str) -> bool:
        """Sinhroniziraj projekt z GitHub"""
        try:
            project = self.get_project(project_id)
            if not project:
                return False
            
            # Preveri, če lokalna mapa obstaja
            if not os.path.exists(project.local_path):
                # Clone repository
                result = subprocess.run([
                    'git', 'clone', project.repository_url, project.local_path
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    print(f"Napaka pri kloniranju: {result.stderr}")
                    return False
            else:
                # Pull latest changes
                result = subprocess.run([
                    'git', '-C', project.local_path, 'pull', 'origin', project.branch
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    print(f"Napaka pri pull: {result.stderr}")
                    return False
            
            # Posodobi last_sync
            self.update_project_sync_time(project_id)
            return True
            
        except Exception as e:
            print(f"Napaka pri sinhronizaciji: {e}")
            return False
    
    def get_project(self, project_id: str) -> Optional[Project]:
        """Pridobi projekt po ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return Project(
                id=row[0],
                name=row[1],
                repository_url=row[2],
                local_path=row[3],
                status=ProjectStatus(row[4]),
                last_sync=datetime.fromisoformat(row[5]),
                branch=row[6],
                description=row[7],
                technologies=json.loads(row[8])
            )
        return None
    
    def update_project_sync_time(self, project_id: str):
        """Posodobi čas zadnje sinhronizacije"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE projects 
            SET last_sync = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), project_id))
        
        conn.commit()
        conn.close()
    
    def create_deployment(self, deployment: Deployment) -> bool:
        """Ustvari nov deployment"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO deployments 
                (id, project_id, version, environment, status, deployed_at,
                 deployed_by, commit_hash, logs)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                deployment.id,
                deployment.project_id,
                deployment.version,
                deployment.environment,
                deployment.status.value,
                deployment.deployed_at.isoformat(),
                deployment.deployed_by,
                deployment.commit_hash,
                deployment.logs
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju deploymenta: {e}")
            return False
    
    def run_ci_cd_pipeline(self, project_id: str, environment: str = "production") -> bool:
        """Zaženi CI/CD pipeline"""
        try:
            project = self.get_project(project_id)
            if not project:
                return False
            
            # Sinhroniziraj z GitHub
            if not self.sync_project_from_github(project_id):
                return False
            
            # Pridobi zadnji commit hash
            result = subprocess.run([
                'git', '-C', project.local_path, 'rev-parse', 'HEAD'
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                return False
            
            commit_hash = result.stdout.strip()
            
            # Ustvari deployment zapis
            deployment = Deployment(
                id=f"deploy_{project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                project_id=project_id,
                version="auto",
                environment=environment,
                status=DeploymentStatus.IN_PROGRESS,
                deployed_at=datetime.now(),
                deployed_by="omni_system",
                commit_hash=commit_hash,
                logs=""
            )
            
            self.create_deployment(deployment)
            
            # Zaženi build proces (primer)
            build_steps = [
                "npm install",
                "npm run build",
                "npm test"
            ]
            
            all_logs = []
            
            for step in build_steps:
                print(f"Izvajam: {step}")
                result = subprocess.run(
                    step.split(),
                    cwd=project.local_path,
                    capture_output=True,
                    text=True
                )
                
                all_logs.append(f"Step: {step}\nOutput: {result.stdout}\nError: {result.stderr}\n")
                
                if result.returncode != 0:
                    # Build failed
                    deployment.status = DeploymentStatus.FAILED
                    deployment.logs = "\n".join(all_logs)
                    self.update_deployment_status(deployment.id, DeploymentStatus.FAILED, deployment.logs)
                    return False
            
            # Build successful
            deployment.status = DeploymentStatus.SUCCESS
            deployment.logs = "\n".join(all_logs)
            self.update_deployment_status(deployment.id, DeploymentStatus.SUCCESS, deployment.logs)
            
            return True
            
        except Exception as e:
            print(f"Napaka pri CI/CD pipeline: {e}")
            return False
    
    def update_deployment_status(self, deployment_id: str, status: DeploymentStatus, logs: str):
        """Posodobi status deploymenta"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE deployments 
            SET status = ?, logs = ?
            WHERE id = ?
        ''', (status.value, logs, deployment_id))
        
        conn.commit()
        conn.close()
    
    def create_issue(self, issue: Issue) -> bool:
        """Ustvari nov issue"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO issues 
                (id, project_id, title, description, status, priority,
                 assigned_to, created_at, resolved_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                issue.id,
                issue.project_id,
                issue.title,
                issue.description,
                issue.status.value,
                issue.priority,
                issue.assigned_to,
                issue.created_at.isoformat(),
                issue.resolved_at.isoformat() if issue.resolved_at else None
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju issue: {e}")
            return False
    
    def get_project_issues(self, project_id: str, status: Optional[IssueStatus] = None) -> List[Issue]:
        """Pridobi issue-je projekta"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM issues WHERE project_id = ?"
        params = [project_id]
        
        if status:
            query += " AND status = ?"
            params.append(status.value)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        issues = []
        for row in rows:
            issues.append(Issue(
                id=row[0],
                project_id=row[1],
                title=row[2],
                description=row[3],
                status=IssueStatus(row[4]),
                priority=row[5],
                assigned_to=row[6],
                created_at=datetime.fromisoformat(row[7]),
                resolved_at=datetime.fromisoformat(row[8]) if row[8] else None
            ))
        
        return issues
    
    def collect_system_metrics(self) -> SystemMetric:
        """Zberi sistemske metrike"""
        try:
            import psutil
            
            metric = SystemMetric(
                timestamp=datetime.now(),
                cpu_usage=psutil.cpu_percent(interval=1),
                memory_usage=psutil.virtual_memory().percent,
                disk_usage=psutil.disk_usage('/').percent,
                network_io=sum(psutil.net_io_counters()[:2]),  # bytes_sent + bytes_recv
                active_processes=len(psutil.pids())
            )
            
            # Shrani v bazo
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO system_metrics 
                (timestamp, cpu_usage, memory_usage, disk_usage, network_io, active_processes)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                metric.timestamp.isoformat(),
                metric.cpu_usage,
                metric.memory_usage,
                metric.disk_usage,
                metric.network_io,
                metric.active_processes
            ))
            
            conn.commit()
            conn.close()
            
            return metric
            
        except ImportError:
            print("psutil ni nameščen. Namestite z: pip install psutil")
            return None
        except Exception as e:
            print(f"Napaka pri zbiranju metrik: {e}")
            return None
    
    def get_system_health_report(self) -> Dict:
        """Pridobi poročilo o zdravju sistema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Zadnje metrike
        cursor.execute('''
            SELECT * FROM system_metrics 
            ORDER BY timestamp DESC 
            LIMIT 1
        ''')
        latest = cursor.fetchone()
        
        # Povprečje zadnjih 24 ur
        yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
        cursor.execute('''
            SELECT AVG(cpu_usage), AVG(memory_usage), AVG(disk_usage)
            FROM system_metrics 
            WHERE timestamp >= ?
        ''', (yesterday,))
        averages = cursor.fetchone()
        
        # Deployment statistike
        cursor.execute('''
            SELECT status, COUNT(*) 
            FROM deployments 
            WHERE deployed_at >= ?
            GROUP BY status
        ''', (yesterday,))
        deployment_stats = cursor.fetchall()
        
        conn.close()
        
        health_status = "healthy"
        if latest:
            if latest[1] > 80 or latest[2] > 85 or latest[3] > 90:  # CPU, Memory, Disk
                health_status = "warning"
            if latest[1] > 95 or latest[2] > 95 or latest[3] > 95:
                health_status = "critical"
        
        return {
            'health_status': health_status,
            'current_metrics': {
                'cpu_usage': latest[1] if latest else 0,
                'memory_usage': latest[2] if latest else 0,
                'disk_usage': latest[3] if latest else 0,
                'active_processes': latest[5] if latest else 0
            },
            'daily_averages': {
                'cpu_usage': round(averages[0], 2) if averages[0] else 0,
                'memory_usage': round(averages[1], 2) if averages[1] else 0,
                'disk_usage': round(averages[2], 2) if averages[2] else 0
            },
            'deployment_stats': {status: count for status, count in deployment_stats}
        }
    
    def get_github_repo_info(self, repo_url: str) -> Optional[Dict]:
        """Pridobi informacije o GitHub repozitoriju"""
        if not self.github_token:
            print("GitHub token ni nastavljen")
            return None
        
        try:
            # Izvleci owner/repo iz URL
            parts = repo_url.replace('https://github.com/', '').split('/')
            if len(parts) < 2:
                return None
            
            owner, repo = parts[0], parts[1]
            
            headers = {
                'Authorization': f'token {self.github_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            # Osnovne informacije
            response = requests.get(f'https://api.github.com/repos/{owner}/{repo}', headers=headers)
            if response.status_code != 200:
                return None
            
            repo_data = response.json()
            
            # Zadnji commiti
            commits_response = requests.get(f'https://api.github.com/repos/{owner}/{repo}/commits', headers=headers)
            commits = commits_response.json() if commits_response.status_code == 200 else []
            
            return {
                'name': repo_data['name'],
                'description': repo_data['description'],
                'stars': repo_data['stargazers_count'],
                'forks': repo_data['forks_count'],
                'language': repo_data['language'],
                'last_updated': repo_data['updated_at'],
                'recent_commits': commits[:5]  # Zadnjih 5 commitov
            }
            
        except Exception as e:
            print(f"Napaka pri pridobivanju GitHub informacij: {e}")
            return None

# Test funkcije
if __name__ == "__main__":
    # Test devops modula
    devops = DevOpsModule("test_devops.db")
    
    # Test projekt
    project = Project(
        id="omni_project",
        name="Omni AI Platform",
        repository_url="https://github.com/user/omni-platform.git",
        local_path="./omni-local",
        status=ProjectStatus.DEVELOPMENT,
        last_sync=datetime.now(),
        branch="main",
        description="Univerzalna AI platforma",
        technologies=["Python", "JavaScript", "React", "SQLite"]
    )
    
    print("🧪 Testiranje DevOps modula...")
    print(f"Dodajanje projekta: {devops.add_project(project)}")
    
    # Test issue
    issue = Issue(
        id="issue_001",
        project_id="omni_project",
        title="Implementiraj GitHub sync",
        description="Dodaj funkcionalnost za avtomatsko sinhronizacijo z GitHub",
        status=IssueStatus.OPEN,
        priority="high",
        assigned_to="developer",
        created_at=datetime.now(),
        resolved_at=None
    )
    
    print(f"Ustvarjanje issue: {devops.create_issue(issue)}")
    
    # Test sistemskih metrik
    metric = devops.collect_system_metrics()
    if metric:
        print(f"Sistemske metrike: CPU {metric.cpu_usage}%, Memory {metric.memory_usage}%")
    
    # Health report
    health = devops.get_system_health_report()
    print(f"Zdravje sistema: {health['health_status']}")
    
    print("\n✅ DevOps modul uspešno testiran!")