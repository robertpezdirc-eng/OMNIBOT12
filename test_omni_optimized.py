#!/usr/bin/env python3
"""
Test script za optimizirane OmniCore funkcionalnosti
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'omni'))

from core.engine import OmniCore
import modules.finance as finance
import modules.tourism as tourism  
import modules.devops as devops

def test_omni_optimized():
    """Test optimiziranih funkcionalnosti"""
    print("🚀 Testiranje optimiziranega Omni sistema...")
    
    # Inicializacija OmniCore
    omni = OmniCore(debug=True)
    
    # Registracija modulov
    print("\n📦 Registracija modulov...")
    omni.register_module("finance", finance)
    omni.register_module("tourism", tourism)
    omni.register_module("devops", devops)
    
    print(f"✅ Registrirani moduli: {list(omni.modules.keys())}")
    
    # Test optimizirane run funkcije
    print("\n🧠 Test optimizirane run funkcije...")
    test_prompt = "Analiziraj podjetje in predlagaj optimizacijo vseh oddelkov."
    
    result = omni.run(test_prompt)
    
    print("\n📊 REZULTAT:")
    print("=" * 50)
    print(f"📝 Input: {result['input']}")
    print(f"🤖 AI Response: {result['ai_response'][:200]}...")
    print(f"📦 Moduli: {result['modules']}")
    print(f"🧠 Spomin: {result['memory_length']} vnosov")
    print(f"⏱️ Čas izvajanja: {result['execution_time']}s")
    print("=" * 50)
    
    # Test ask_ai funkcije
    print("\n🤖 Test ask_ai funkcije...")
    ai_result = omni.ask_ai("Kaj je najboljša strategija za turizem?")
    print(f"AI odgovor: {ai_result['ai_response'][:150]}...")
    print(f"Čas AI: {ai_result['execution_time']}s")
    
    # Status sistema
    print("\n📈 Status sistema:")
    status = omni.get_status()
    print(f"Moduli: {status['modules']}")
    print(f"Spomin: {status['memory_count']} vnosov")
    print(f"Integracije: {status['integrations']}")
    
    print("\n✅ Test končan uspešno!")

if __name__ == "__main__":
    test_omni_optimized()