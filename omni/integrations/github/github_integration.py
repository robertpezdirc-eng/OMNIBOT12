"""
🐙 OMNI GITHUB INTEGRATION
Avtomatski sync projektov, upravljanje repozitorijev, CI/CD
"""

import json
import requests
import subprocess
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class RepoStatus(Enum):
    SYNCED = "synced"
    OUT_OF_SYNC = "out_of_sync"
    ERROR = "error"
    NOT_FOUND = "not_found"

class WebhookEvent(Enum):
    PUSH = "push"
    PULL_REQUEST = "pull_request"
    ISSUES = "issues"
    RELEASE = "release"

@dataclass
class Repository:
    name: str
    full_name: str
    owner: str
    clone_url: str
    ssh_url: str
    default_branch: str
    description: str
    language: str
    stars: int
    forks: int
    last_updated: datetime
    local_path: Optional[str] = None

@dataclass
class Commit:
    sha: str
    message: str
    author: str
    author_email: str
    date: datetime
    url: str

@dataclass
class PullRequest:
    number: int
    title: str
    body: str
    state: str
    author: str
    created_at: datetime
    updated_at: datetime
    mergeable: bool
    url: str

@dataclass
class Issue:
    number: int
    title: str
    body: str
    state: str
    author: str
    assignee: Optional[str]
    labels: List[str]
    created_at: datetime
    updated_at: datetime
    url: str

class GitHubIntegration:
    """
    🔗 GitHub Integration za Omni
    - Avtomatski sync repozitorijev
    - Upravljanje issue-jev in PR-jev
    - Webhook handling
    - CI/CD integracija
    """
    
    def __init__(self, token: str, base_path: str = "./repos"):
        self.token = token
        self.base_path = base_path
        self.base_url = "https://api.github.com"
        self.headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        # Ustvari base directory
        os.makedirs(base_path, exist_ok=True)
    
    def get_user_repos(self, username: Optional[str] = None) -> List[Repository]:
        """Pridobi repozitorije uporabnika"""
        try:
            if username:
                url = f"{self.base_url}/users/{username}/repos"
            else:
                url = f"{self.base_url}/user/repos"
            
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            repos = []
            for repo_data in response.json():
                repo = Repository(
                    name=repo_data['name'],
                    full_name=repo_data['full_name'],
                    owner=repo_data['owner']['login'],
                    clone_url=repo_data['clone_url'],
                    ssh_url=repo_data['ssh_url'],
                    default_branch=repo_data['default_branch'],
                    description=repo_data['description'] or "",
                    language=repo_data['language'] or "Unknown",
                    stars=repo_data['stargazers_count'],
                    forks=repo_data['forks_count'],
                    last_updated=datetime.fromisoformat(repo_data['updated_at'].replace('Z', '+00:00'))
                )
                repos.append(repo)
            
            return repos
            
        except Exception as e:
            print(f"Napaka pri pridobivanju repozitorijev: {e}")
            return []
    
    def clone_repository(self, repo: Repository, force: bool = False) -> bool:
        """Kloniraj repozitorij lokalno"""
        try:
            local_path = os.path.join(self.base_path, repo.name)
            
            # Preveri, če že obstaja
            if os.path.exists(local_path):
                if not force:
                    print(f"Repozitorij {repo.name} že obstaja lokalno")
                    repo.local_path = local_path
                    return True
                else:
                    # Odstrani obstoječo mapo
                    import shutil
                    shutil.rmtree(local_path)
            
            # Kloniraj
            result = subprocess.run([
                'git', 'clone', repo.clone_url, local_path
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                repo.local_path = local_path
                print(f"✅ Repozitorij {repo.name} uspešno kloniran")
                return True
            else:
                print(f"❌ Napaka pri kloniranju {repo.name}: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"Napaka pri kloniranju: {e}")
            return False
    
    def sync_repository(self, repo: Repository) -> RepoStatus:
        """Sinhroniziraj repozitorij z GitHub"""
        try:
            if not repo.local_path or not os.path.exists(repo.local_path):
                if self.clone_repository(repo):
                    return RepoStatus.SYNCED
                else:
                    return RepoStatus.ERROR
            
            # Pull najnovejše spremembe
            result = subprocess.run([
                'git', '-C', repo.local_path, 'pull', 'origin', repo.default_branch
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                if "Already up to date" in result.stdout:
                    return RepoStatus.SYNCED
                else:
                    print(f"🔄 {repo.name} posodobljen: {result.stdout.strip()}")
                    return RepoStatus.SYNCED
            else:
                print(f"❌ Napaka pri sync {repo.name}: {result.stderr}")
                return RepoStatus.ERROR
                
        except Exception as e:
            print(f"Napaka pri sinhronizaciji: {e}")
            return RepoStatus.ERROR
    
    def get_repository_commits(self, repo: Repository, limit: int = 10) -> List[Commit]:
        """Pridobi zadnje commite repozitorija"""
        try:
            url = f"{self.base_url}/repos/{repo.full_name}/commits"
            params = {'per_page': limit}
            
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            commits = []
            for commit_data in response.json():
                commit = Commit(
                    sha=commit_data['sha'],
                    message=commit_data['commit']['message'],
                    author=commit_data['commit']['author']['name'],
                    author_email=commit_data['commit']['author']['email'],
                    date=datetime.fromisoformat(commit_data['commit']['author']['date'].replace('Z', '+00:00')),
                    url=commit_data['html_url']
                )
                commits.append(commit)
            
            return commits
            
        except Exception as e:
            print(f"Napaka pri pridobivanju commitov: {e}")
            return []
    
    def get_repository_issues(self, repo: Repository, state: str = "open") -> List[Issue]:
        """Pridobi issue-je repozitorija"""
        try:
            url = f"{self.base_url}/repos/{repo.full_name}/issues"
            params = {'state': state}
            
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            issues = []
            for issue_data in response.json():
                # Preskoči pull requeste (so tudi v issues API)
                if 'pull_request' in issue_data:
                    continue
                
                issue = Issue(
                    number=issue_data['number'],
                    title=issue_data['title'],
                    body=issue_data['body'] or "",
                    state=issue_data['state'],
                    author=issue_data['user']['login'],
                    assignee=issue_data['assignee']['login'] if issue_data['assignee'] else None,
                    labels=[label['name'] for label in issue_data['labels']],
                    created_at=datetime.fromisoformat(issue_data['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(issue_data['updated_at'].replace('Z', '+00:00')),
                    url=issue_data['html_url']
                )
                issues.append(issue)
            
            return issues
            
        except Exception as e:
            print(f"Napaka pri pridobivanju issue-jev: {e}")
            return []
    
    def create_issue(self, repo: Repository, title: str, body: str, labels: List[str] = None) -> Optional[Issue]:
        """Ustvari nov issue"""
        try:
            url = f"{self.base_url}/repos/{repo.full_name}/issues"
            data = {
                'title': title,
                'body': body
            }
            
            if labels:
                data['labels'] = labels
            
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            
            issue_data = response.json()
            
            issue = Issue(
                number=issue_data['number'],
                title=issue_data['title'],
                body=issue_data['body'] or "",
                state=issue_data['state'],
                author=issue_data['user']['login'],
                assignee=issue_data['assignee']['login'] if issue_data['assignee'] else None,
                labels=[label['name'] for label in issue_data['labels']],
                created_at=datetime.fromisoformat(issue_data['created_at'].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(issue_data['updated_at'].replace('Z', '+00:00')),
                url=issue_data['html_url']
            )
            
            print(f"✅ Issue #{issue.number} ustvarjen: {title}")
            return issue
            
        except Exception as e:
            print(f"Napaka pri ustvarjanju issue: {e}")
            return None
    
    def get_pull_requests(self, repo: Repository, state: str = "open") -> List[PullRequest]:
        """Pridobi pull requeste"""
        try:
            url = f"{self.base_url}/repos/{repo.full_name}/pulls"
            params = {'state': state}
            
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            prs = []
            for pr_data in response.json():
                pr = PullRequest(
                    number=pr_data['number'],
                    title=pr_data['title'],
                    body=pr_data['body'] or "",
                    state=pr_data['state'],
                    author=pr_data['user']['login'],
                    created_at=datetime.fromisoformat(pr_data['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(pr_data['updated_at'].replace('Z', '+00:00')),
                    mergeable=pr_data['mergeable'] if pr_data['mergeable'] is not None else False,
                    url=pr_data['html_url']
                )
                prs.append(pr)
            
            return prs
            
        except Exception as e:
            print(f"Napaka pri pridobivanju PR-jev: {e}")
            return []
    
    def setup_webhook(self, repo: Repository, webhook_url: str, events: List[WebhookEvent]) -> bool:
        """Nastavi webhook za repozitorij"""
        try:
            url = f"{self.base_url}/repos/{repo.full_name}/hooks"
            
            data = {
                'name': 'web',
                'active': True,
                'events': [event.value for event in events],
                'config': {
                    'url': webhook_url,
                    'content_type': 'json'
                }
            }
            
            response = requests.post(url, headers=self.headers, json=data)
            response.raise_for_status()
            
            print(f"✅ Webhook nastavljen za {repo.name}")
            return True
            
        except Exception as e:
            print(f"Napaka pri nastavljanju webhook: {e}")
            return False
    
    def sync_all_repositories(self, username: Optional[str] = None) -> Dict[str, RepoStatus]:
        """Sinhroniziraj vse repozitorije"""
        repos = self.get_user_repos(username)
        results = {}
        
        print(f"🔄 Sinhronizacija {len(repos)} repozitorijev...")
        
        for repo in repos:
            print(f"Sinhronizacija: {repo.name}")
            status = self.sync_repository(repo)
            results[repo.name] = status
        
        # Statistike
        synced = sum(1 for status in results.values() if status == RepoStatus.SYNCED)
        errors = sum(1 for status in results.values() if status == RepoStatus.ERROR)
        
        print(f"\n📊 Rezultati sinhronizacije:")
        print(f"  ✅ Uspešno: {synced}")
        print(f"  ❌ Napake: {errors}")
        
        return results
    
    def get_repository_analytics(self, repo: Repository) -> Dict:
        """Pridobi analitiko repozitorija"""
        try:
            # Osnovne statistike
            commits = self.get_repository_commits(repo, limit=100)
            issues = self.get_repository_issues(repo, state="all")
            prs = self.get_pull_requests(repo, state="all")
            
            # Analiza commitov po avtorjih
            authors = {}
            for commit in commits:
                if commit.author not in authors:
                    authors[commit.author] = 0
                authors[commit.author] += 1
            
            # Analiza issue-jev po labelih
            labels = {}
            for issue in issues:
                for label in issue.labels:
                    if label not in labels:
                        labels[label] = 0
                    labels[label] += 1
            
            # Aktivnost po mesecih
            monthly_activity = {}
            for commit in commits:
                month_key = commit.date.strftime('%Y-%m')
                if month_key not in monthly_activity:
                    monthly_activity[month_key] = 0
                monthly_activity[month_key] += 1
            
            return {
                'repository': repo.name,
                'total_commits': len(commits),
                'total_issues': len([i for i in issues if i.state == 'open']),
                'total_closed_issues': len([i for i in issues if i.state == 'closed']),
                'total_prs': len([pr for pr in prs if pr.state == 'open']),
                'stars': repo.stars,
                'forks': repo.forks,
                'top_contributors': dict(sorted(authors.items(), key=lambda x: x[1], reverse=True)[:5]),
                'popular_labels': dict(sorted(labels.items(), key=lambda x: x[1], reverse=True)[:10]),
                'monthly_activity': monthly_activity,
                'last_commit': commits[0].date if commits else None,
                'health_score': self.calculate_repo_health_score(repo, commits, issues, prs)
            }
            
        except Exception as e:
            print(f"Napaka pri analitiki: {e}")
            return {}
    
    def calculate_repo_health_score(self, repo: Repository, commits: List[Commit], 
                                  issues: List[Issue], prs: List[PullRequest]) -> float:
        """Izračunaj zdravstveno oceno repozitorija"""
        score = 0.0
        
        # Aktivnost (30%)
        if commits:
            days_since_last_commit = (datetime.now() - commits[0].date.replace(tzinfo=None)).days
            if days_since_last_commit <= 7:
                score += 30
            elif days_since_last_commit <= 30:
                score += 20
            elif days_since_last_commit <= 90:
                score += 10
        
        # Issue management (25%)
        open_issues = [i for i in issues if i.state == 'open']
        closed_issues = [i for i in issues if i.state == 'closed']
        
        if len(issues) > 0:
            resolution_rate = len(closed_issues) / len(issues)
            score += resolution_rate * 25
        
        # Documentation (20%)
        if repo.description:
            score += 10
        
        # README check (lokalno)
        if repo.local_path and os.path.exists(os.path.join(repo.local_path, 'README.md')):
            score += 10
        
        # Community engagement (25%)
        if repo.stars > 0:
            score += min(repo.stars / 10, 15)  # Max 15 points
        
        if repo.forks > 0:
            score += min(repo.forks / 5, 10)   # Max 10 points
        
        return min(score, 100.0)  # Cap at 100

# Test funkcije
if __name__ == "__main__":
    # Test GitHub integracije (potreben je pravi token)
    # github = GitHubIntegration("your_github_token_here")
    
    print("🧪 GitHub Integration modul pripravljen")
    print("Za testiranje potrebujete GitHub token:")
    print("1. Pojdite na GitHub Settings > Developer settings > Personal access tokens")
    print("2. Generirajte nov token z ustreznimi pravicami")
    print("3. Uporabite: github = GitHubIntegration('your_token')")
    
    # Primer uporabe:
    # repos = github.get_user_repos()
    # for repo in repos[:3]:
    #     print(f"📁 {repo.name}: {repo.description}")
    #     github.sync_repository(repo)
    
    print("\n✅ GitHub Integration modul pripravljen za uporabo!")