#!/usr/bin/env python3
"""
Test script z mock AI funkcionalnostjo za demonstracijo
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni'))

from core.engine import OmniCore
import modules.finance as finance
import modules.tourism as tourism  
import modules.devops as devops

class MockOmniCore(OmniCore):
    """Mock verzija OmniCore z simulirano AI funkcionalnostjo"""
    
    def ask_ai(self, user_prompt: str):
        """Mock AI funkcija za demonstracijo"""
        import time
        import json
        
        start_time = time.time()
        
        # Simuliraj AI analizo
        mock_response = {
            "analysis": f"Analiziral sem prompt: '{user_prompt[:50]}...'",
            "recommendations": [
                "Optimiziraj finance modul za boljše upravljanje stroškov",
                "Izboljšaj tourism modul z novimi destinacijami", 
                "Nadgradi devops modul z avtomatizacijo"
            ],
            "priority_tasks": [
                {"module": "finance", "task": "Analiza ROI"},
                {"module": "tourism", "task": "Sezonski načrti"},
                {"module": "devops", "task": "CI/CD optimizacija"}
            ],
            "json_structure": {
                "input": user_prompt,
                "ai_response": "Mock AI analiza uspešno izvedena",
                "modules": ["finance", "tourism", "devops"],
                "memory_length": len(self.memory),
                "execution_time": "simuliran"
            }
        }
        
        execution_time = round(time.time() - start_time, 2)
        
        return {
            "ai_response": json.dumps(mock_response, indent=2, ensure_ascii=False),
            "execution_time": execution_time
        }

def test_mock_omni():
    """Test z mock AI funkcionalnostjo"""
    print("🚀 Testiranje Omni sistema z Mock AI...")
    
    # Inicializacija Mock OmniCore
    omni = MockOmniCore(debug=True)
    
    # Registracija modulov
    print("\n📦 Registracija modulov...")
    omni.register_module("finance", finance)
    omni.register_module("tourism", tourism)
    omni.register_module("devops", devops)
    
    print(f"✅ Registrirani moduli: {list(omni.modules.keys())}")
    
    # Test optimizirane run funkcije
    print("\n🧠 Test optimizirane run funkcije z Mock AI...")
    test_prompt = "Analiziraj podjetje in predlagaj optimizacijo vseh oddelkov."
    
    result = omni.run(test_prompt)
    
    print("\n📊 REZULTAT:")
    print("=" * 60)
    print(f"📝 Input: {result['input']}")
    print(f"🤖 AI Response (Mock):")
    print(result['ai_response'])
    print(f"\n📦 Moduli: {result['modules']}")
    print(f"🧠 Spomin: {result['memory_length']} vnosov")
    print(f"⏱️ Čas izvajanja: {result['execution_time']}s")
    print("=" * 60)
    
    # Test ask_ai funkcije
    print("\n🤖 Test ask_ai funkcije z Mock AI...")
    ai_result = omni.ask_ai("Kaj je najboljša strategija za turizem?")
    print(f"AI odgovor (Mock): {ai_result['ai_response'][:200]}...")
    print(f"Čas AI: {ai_result['execution_time']}s")
    
    # Status sistema
    print("\n📈 Status sistema:")
    status = omni.get_status()
    print(f"Moduli: {status['modules']}")
    print(f"Spomin: {status['memory_count']} vnosov")
    print(f"Integracije: {status['integrations']}")
    
    print("\n✅ Mock test končan uspešno!")
    print("\n💡 Za realno AI funkcionalnost nastavi OPENAI_API_KEY environment variable")

if __name__ == "__main__":
    test_mock_omni()