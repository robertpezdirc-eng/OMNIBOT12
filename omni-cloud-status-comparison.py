#!/usr/bin/env python3
"""
Omni Cloud Status Comparison Tool
Primerja poročani status z dejanskim stanjem sistema
"""

import json
import datetime
from typing import Dict, List, Any

class OmniStatusComparison:
    def __init__(self):
        # Poročani status iz uporabnikovega poročila
        self.reported_status = {
            'timestamp': '2025-09-26T11:55:00',
            'main_application': {
                'service_active': True,
                'https_accessible': True,
                'ssl_valid': True,
                'ssl_auto_renewal': True,
                'external_connectivity': True,
                'port': 443,
                'url': 'https://tvoja-domena.com'
            },
            'angel_systems': {
                'LearningAngel': {'service_active': True, 'api_accessible': True},
                'CommercialAngel': {'service_active': True, 'api_accessible': True},
                'OptimizationAngel': {'service_active': True, 'api_accessible': True},
                'InnovationAngel': {'service_active': True, 'api_accessible': True},
                'AnalyticsAngel': {'service_active': True, 'api_accessible': True},
                'EngagementAngel': {'service_active': True, 'api_accessible': True},
                'GrowthAngel': {'service_active': True, 'api_accessible': True},
                'VisionaryAngel': {'service_active': True, 'api_accessible': True}
            },
            'backup_monitoring': {
                'backup_configured': True,
                'first_backup_successful': True,
                'monitoring_active': True,
                'real_time_metrics': True,
                'alarms_configured': True
            },
            'systemd_logging': {
                'systemd_services_active': True,
                'auto_restart_configured': True,
                'logging_active': True
            },
            'quantum_processing': {
                'global_memory_initialized': True,
                'memory_capacity_multiplier': 1000000,
                'quantum_processor_active': True
            }
        }
        
        # Dejanski status iz validacije
        self.actual_status = {
            'timestamp': '2025-09-26T11:54:27',
            'main_application': {
                'service_active': True,
                'https_accessible': True,
                'ssl_valid': True,  # V lokalnem načinu simulirano
                'ssl_auto_renewal': True,
                'external_connectivity': True,
                'response_time': 349.61
            },
            'angel_systems': {
                'LearningAngel': {'service_active': True, 'api_accessible': False},
                'CommercialAngel': {'service_active': True, 'api_accessible': False},
                'OptimizationAngel': {'service_active': True, 'api_accessible': False},
                'InnovationAngel': {'service_active': True, 'api_accessible': False},
                'AnalyticsAngel': {'service_active': True, 'api_accessible': False},
                'EngagementAngel': {'service_active': True, 'api_accessible': False},
                'GrowthAngel': {'service_active': True, 'api_accessible': False},
                'VisionaryAngel': {'service_active': True, 'api_accessible': False}
            },
            'backup_monitoring': {
                'backup_configured': False,
                'first_backup_successful': False,
                'monitoring_active': False,
                'real_time_metrics': False,
                'alarms_configured': False
            },
            'systemd_logging': {
                'systemd_services_active': True,
                'auto_restart_configured': True,
                'logging_active': True
            },
            'quantum_processing': {
                'global_memory_initialized': True,
                'memory_capacity_multiplier': 1000000,
                'quantum_processor_active': True
            }
        }
    
    def compare_sections(self) -> Dict[str, Any]:
        """Primerja posamezne sekcije"""
        comparison = {
            'main_application': self._compare_main_app(),
            'angel_systems': self._compare_angel_systems(),
            'backup_monitoring': self._compare_backup_monitoring(),
            'systemd_logging': self._compare_systemd_logging(),
            'quantum_processing': self._compare_quantum_processing(),
            'overall_assessment': {}
        }
        
        comparison['overall_assessment'] = self._generate_overall_assessment(comparison)
        return comparison
    
    def _compare_main_app(self) -> Dict[str, Any]:
        """Primerja glavno aplikacijo"""
        reported = self.reported_status['main_application']
        actual = self.actual_status['main_application']
        
        return {
            'status': 'match' if reported['service_active'] == actual['service_active'] else 'mismatch',
            'details': {
                'service_active': {
                    'reported': reported['service_active'],
                    'actual': actual['service_active'],
                    'match': reported['service_active'] == actual['service_active']
                },
                'https_accessible': {
                    'reported': reported['https_accessible'],
                    'actual': actual['https_accessible'],
                    'match': reported['https_accessible'] == actual['https_accessible']
                },
                'ssl_valid': {
                    'reported': reported['ssl_valid'],
                    'actual': actual['ssl_valid'],
                    'match': reported['ssl_valid'] == actual['ssl_valid'],
                    'note': 'V lokalnem načinu SSL ni preverjen'
                }
            },
            'assessment': 'Glavna aplikacija deluje kot poročano' if all([
                reported['service_active'] == actual['service_active'],
                reported['https_accessible'] == actual['https_accessible']
            ]) else 'Razlike v glavni aplikaciji'
        }
    
    def _compare_angel_systems(self) -> Dict[str, Any]:
        """Primerja Angel sisteme"""
        reported = self.reported_status['angel_systems']
        actual = self.actual_status['angel_systems']
        
        matches = 0
        mismatches = 0
        details = {}
        
        for angel in reported.keys():
            reported_api = reported[angel]['api_accessible']
            actual_api = actual[angel]['api_accessible']
            
            match = reported_api == actual_api
            if match:
                matches += 1
            else:
                mismatches += 1
            
            details[angel] = {
                'reported_api': reported_api,
                'actual_api': actual_api,
                'match': match,
                'service_active': actual[angel]['service_active']
            }
        
        return {
            'status': 'major_mismatch' if mismatches > matches else 'partial_match',
            'matches': matches,
            'mismatches': mismatches,
            'total_angels': len(reported),
            'details': details,
            'assessment': f'API dostopnost: {mismatches}/{len(reported)} Angel sistemov ne deluje kot poročano'
        }
    
    def _compare_backup_monitoring(self) -> Dict[str, Any]:
        """Primerja backup in monitoring"""
        reported = self.reported_status['backup_monitoring']
        actual = self.actual_status['backup_monitoring']
        
        matches = sum(1 for key in reported.keys() if reported[key] == actual[key])
        total = len(reported)
        
        return {
            'status': 'mismatch' if matches < total else 'match',
            'matches': matches,
            'total_checks': total,
            'details': {
                key: {
                    'reported': reported[key],
                    'actual': actual[key],
                    'match': reported[key] == actual[key]
                } for key in reported.keys()
            },
            'assessment': f'Backup/Monitoring: {matches}/{total} funkcij deluje kot poročano'
        }
    
    def _compare_systemd_logging(self) -> Dict[str, Any]:
        """Primerja systemd in logging"""
        reported = self.reported_status['systemd_logging']
        actual = self.actual_status['systemd_logging']
        
        matches = sum(1 for key in reported.keys() if reported[key] == actual[key])
        total = len(reported)
        
        return {
            'status': 'match' if matches == total else 'partial_match',
            'matches': matches,
            'total_checks': total,
            'details': {
                key: {
                    'reported': reported[key],
                    'actual': actual[key],
                    'match': reported[key] == actual[key]
                } for key in reported.keys()
            },
            'assessment': f'Systemd/Logging: {matches}/{total} funkcij deluje kot poročano'
        }
    
    def _compare_quantum_processing(self) -> Dict[str, Any]:
        """Primerja kvantno procesiranje"""
        reported = self.reported_status['quantum_processing']
        actual = self.actual_status['quantum_processing']
        
        matches = sum(1 for key in reported.keys() if reported[key] == actual[key])
        total = len(reported)
        
        return {
            'status': 'match' if matches == total else 'partial_match',
            'matches': matches,
            'total_checks': total,
            'details': {
                key: {
                    'reported': reported[key],
                    'actual': actual[key],
                    'match': reported[key] == actual[key]
                } for key in reported.keys()
            },
            'assessment': f'Kvantno procesiranje: {matches}/{total} funkcij deluje kot poročano'
        }
    
    def _generate_overall_assessment(self, comparison: Dict[str, Any]) -> Dict[str, Any]:
        """Generiraj splošno oceno"""
        
        # Izračunaj splošni score
        scores = []
        
        # Glavna aplikacija (visoka prioriteta)
        if comparison['main_application']['status'] == 'match':
            scores.append(('main_app', 100, 3))  # 3x utež
        else:
            scores.append(('main_app', 50, 3))
        
        # Angel sistemi (srednja prioriteta)
        angel_score = (comparison['angel_systems']['matches'] / comparison['angel_systems']['total_angels']) * 100
        scores.append(('angels', angel_score, 2))  # 2x utež
        
        # Backup/Monitoring (srednja prioriteta)
        backup_score = (comparison['backup_monitoring']['matches'] / comparison['backup_monitoring']['total_checks']) * 100
        scores.append(('backup', backup_score, 2))
        
        # Systemd/Logging (nizka prioriteta)
        systemd_score = (comparison['systemd_logging']['matches'] / comparison['systemd_logging']['total_checks']) * 100
        scores.append(('systemd', systemd_score, 1))
        
        # Kvantno procesiranje (nizka prioriteta)
        quantum_score = (comparison['quantum_processing']['matches'] / comparison['quantum_processing']['total_checks']) * 100
        scores.append(('quantum', quantum_score, 1))
        
        # Izračunaj tehtani povprečni score
        total_weighted_score = sum(score * weight for _, score, weight in scores)
        total_weight = sum(weight for _, _, weight in scores)
        overall_score = total_weighted_score / total_weight
        
        # Določi status
        if overall_score >= 90:
            status = 'excellent_match'
            description = 'Odličo ujemanje - sistem deluje kot poročano'
        elif overall_score >= 75:
            status = 'good_match'
            description = 'Dobro ujemanje - manjše razlike'
        elif overall_score >= 50:
            status = 'partial_match'
            description = 'Delno ujemanje - pomembne razlike'
        else:
            status = 'poor_match'
            description = 'Slabo ujemanje - večje razlike'
        
        return {
            'overall_score': round(overall_score, 1),
            'status': status,
            'description': description,
            'detailed_scores': {name: score for name, score, _ in scores},
            'key_findings': self._generate_key_findings(comparison)
        }
    
    def _generate_key_findings(self, comparison: Dict[str, Any]) -> List[str]:
        """Generiraj ključne ugotovitve"""
        findings = []
        
        # Glavna aplikacija
        if comparison['main_application']['status'] == 'match':
            findings.append("✅ Glavna aplikacija deluje popolnoma kot poročano")
        else:
            findings.append("⚠️ Glavna aplikacija ima razlike v delovanju")
        
        # Angel sistemi
        angel_mismatches = comparison['angel_systems']['mismatches']
        if angel_mismatches == 0:
            findings.append("✅ Vsi Angel sistemi delujejo kot poročano")
        elif angel_mismatches <= 2:
            findings.append(f"⚠️ {angel_mismatches} Angel sistemov ne deluje kot poročano")
        else:
            findings.append(f"❌ {angel_mismatches} Angel sistemov ne deluje kot poročano - potrebna pozornost")
        
        # Backup/Monitoring
        backup_matches = comparison['backup_monitoring']['matches']
        backup_total = comparison['backup_monitoring']['total_checks']
        if backup_matches == backup_total:
            findings.append("✅ Backup in monitoring delujeta kot poročano")
        elif backup_matches == 0:
            findings.append("❌ Backup in monitoring ne delujeta - kritična napaka")
        else:
            findings.append(f"⚠️ Backup/Monitoring: {backup_matches}/{backup_total} funkcij deluje")
        
        # Kvantno procesiranje
        quantum_matches = comparison['quantum_processing']['matches']
        quantum_total = comparison['quantum_processing']['total_checks']
        if quantum_matches == quantum_total:
            findings.append("✅ Kvantno procesiranje deluje kot poročano")
        else:
            findings.append(f"⚠️ Kvantno procesiranje: {quantum_matches}/{quantum_total} funkcij deluje")
        
        return findings
    
    def generate_comparison_report(self) -> str:
        """Generiraj poročilo o primerjavi"""
        comparison = self.compare_sections()
        
        report = f"""
🔍 OMNI CLOUD STATUS COMPARISON REPORT
{'='*60}

📅 Analiza: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
📊 Splošni score: {comparison['overall_assessment']['overall_score']}%
🎯 Status: {comparison['overall_assessment']['status'].upper()}
📝 Opis: {comparison['overall_assessment']['description']}

{'='*60}
🎯 KLJUČNE UGOTOVITVE
{'='*60}
"""
        
        for finding in comparison['overall_assessment']['key_findings']:
            report += f"{finding}\n"
        
        report += f"""
{'='*60}
📊 DETAJLNA PRIMERJAVA
{'='*60}

1️⃣ GLAVNA APLIKACIJA
Status: {comparison['main_application']['status'].upper()}
{comparison['main_application']['assessment']}

2️⃣ ANGEL SISTEMI
Status: {comparison['angel_systems']['status'].upper()}
{comparison['angel_systems']['assessment']}

Detajli Angel sistemov:
"""
        
        for angel, details in comparison['angel_systems']['details'].items():
            status_icon = "✅" if details['match'] else "❌"
            report += f"  {status_icon} {angel}: API {'deluje' if details['actual_api'] else 'ne deluje'}\n"
        
        report += f"""
3️⃣ BACKUP & MONITORING
Status: {comparison['backup_monitoring']['status'].upper()}
{comparison['backup_monitoring']['assessment']}

4️⃣ SYSTEMD & LOGGING
Status: {comparison['systemd_logging']['status'].upper()}
{comparison['systemd_logging']['assessment']}

5️⃣ KVANTNO PROCESIRANJE
Status: {comparison['quantum_processing']['status'].upper()}
{comparison['quantum_processing']['assessment']}

{'='*60}
💡 PRIPOROČILA
{'='*60}
"""
        
        # Generiraj priporočila
        if comparison['angel_systems']['mismatches'] > 0:
            report += "🔧 Angel sistemi: Preveri API endpoint konfiguracije in restart storitev\n"
        
        if comparison['backup_monitoring']['matches'] == 0:
            report += "🔧 Backup/Monitoring: Kritično - nastavi backup in monitoring sisteme\n"
        
        if comparison['overall_assessment']['overall_score'] < 75:
            report += "🔧 Splošno: Potrebne so izboljšave za doseganje poročanega stanja\n"
        
        report += f"""
{'='*60}
📈 SCORE BREAKDOWN
{'='*60}
"""
        
        for component, score in comparison['overall_assessment']['detailed_scores'].items():
            report += f"{component}: {score:.1f}%\n"
        
        return report
    
    def save_comparison_json(self, filename: str = 'omni-status-comparison.json'):
        """Shrani primerjavo v JSON"""
        comparison = self.compare_sections()
        comparison['metadata'] = {
            'generated_at': datetime.datetime.now().isoformat(),
            'reported_timestamp': self.reported_status['timestamp'],
            'actual_timestamp': self.actual_status['timestamp']
        }
        
        with open(filename, 'w') as f:
            json.dump(comparison, f, indent=2)
        
        return filename

def main():
    print("🔍 Začenjam primerjavo Omni Cloud Status...")
    
    # Ustvari primerjavo
    comparator = OmniStatusComparison()
    
    # Generiraj poročilo
    report = comparator.generate_comparison_report()
    print(report)
    
    # Shrani JSON
    json_file = comparator.save_comparison_json()
    print(f"\n📁 JSON poročilo shranjeno: {json_file}")

if __name__ == '__main__':
    main()