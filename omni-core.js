// ===============================
// OMNI CORE ENGINE
// ===============================

const OpenAI = require("openai");

// 🔑 Inicializacija OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧠 Globalni pomnilnik
let memory = [];

// 🔗 Registriraj IoT modul
try {
  const iotRegistration = require('./omni/modules/iot/omni_core_registration.js');
  console.log('🔗 IoT registracijski modul naložen');
} catch (error) {
  console.log('⚠️ IoT registracijski modul ni dostopen:', error.message);
}

// 🤖 Registriraj samoučeči IoT modul
try {
  // Preveri če je Python samoučeči sistem aktiven
  const { spawn } = require('child_process');
  
  // Funkcija za komunikacijo s Python samoučečim sistemom
  const learningModule = {
    async getLearningStatus() {
      return new Promise((resolve) => {
        const python = spawn('python', ['-c', `
import sys
import os
sys.path.append('omni/modules/iot')
try:
    import iot_autonomous_learning
    status = iot_autonomous_learning.get_learning_status()
    print(f"STATUS:{status}")
except Exception as e:
    print(f"ERROR:{e}")
        `]);
        
        let output = '';
        python.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        python.on('close', () => {
          if (output.includes('STATUS:')) {
            const statusStr = output.split('STATUS:')[1].trim();
            try {
              const status = JSON.parse(statusStr.replace(/'/g, '"'));
              resolve(status);
            } catch {
              resolve({ error: 'Parse error' });
            }
          } else {
            resolve({ error: output });
          }
        });
      });
    },
    
    async recordDeviceUsage(deviceId, usageData) {
      return new Promise((resolve) => {
        const python = spawn('python', ['-c', `
import sys
import os
import json
sys.path.append('omni/modules/iot')
try:
    import iot_autonomous_learning
    iot_autonomous_learning.record_device_usage('${deviceId}', ${JSON.stringify(usageData)})
    print("SUCCESS:Data recorded")
except Exception as e:
    print(f"ERROR:{e}")
        `]);
        
        let output = '';
        python.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        python.on('close', () => {
          resolve(output.includes('SUCCESS'));
        });
      });
    }
  };
  
  console.log('🤖 Samoučeči IoT modul registriran v OmniCore');
  
  // Dodaj v globalni objekt
  global.omniLearning = learningModule;
  
} catch (error) {
  console.log('⚠️ Samoučeči IoT modul ni dostopen:', error.message);
}

// 🔌 Modul: API povezave
const apiModule = {
  async askOpenAI(prompt) {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      });
      return response.choices[0].message.content;
    } catch (err) {
      return `❌ Napaka pri OpenAI: ${err.message}`;
    }
  },

  async searchGoogle(query) {
    try {
      // Preveri če so API ključi nastavljeni
      const googleApiKey = process.env.GOOGLE_API_KEY;
      const googleCseId = process.env.GOOGLE_CSE_ID;
      
      if (!googleApiKey) {
        return `❌ Google Search ni na voljo: manjka GOOGLE_API_KEY v .env.local datoteki`;
      }
      
      if (!googleCseId) {
        return `❌ Google Search ni na voljo: manjka GOOGLE_CSE_ID v .env.local datoteki\n\n📋 Navodila:\n1. Pojdi na https://programmablesearchengine.google.com/\n2. Ustvari nov search engine\n3. Kopiraj Search Engine ID\n4. Dodaj GOOGLE_CSE_ID=tvoj_id v .env.local`;
      }

      // Pokliči Google Custom Search API
      const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(query)}&num=5`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          return `❌ Google Search napaka: API ključ ni veljaven ali je presežena kvota`;
        } else if (response.status === 400) {
          return `❌ Google Search napaka: neveljaven CSE ID ali poizvedba`;
        } else {
          return `❌ Google Search napaka: ${response.status} ${response.statusText}`;
        }
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return `🌍 Google Search: ni rezultatov za "${query}"`;
      }
      
      // Formatiraj rezultate
      let results = `🌍 Google rezultati za: "${query}"\n\n`;
      
      data.items.slice(0, 3).forEach((item, index) => {
        results += `${index + 1}. **${item.title}**\n`;
        results += `   ${item.snippet}\n`;
        results += `   🔗 ${item.link}\n\n`;
      });
      
      return results;
      
    } catch (error) {
      return `❌ Google Search napaka: ${error.message}`;
    }
  }
};

// 🗂️ Modul: Spomin
const memoryModule = {
  save(entry) {
    memory.push(entry);
  },
  getAll() {
    return memory;
  },
  clear() {
    memory = [];
  }
};

// 🌐 Globalni Omni objekt
global.omni = {
  modules: {},
  memory: memoryModule,
  api: apiModule,
  
  // Registracija modulov
  registerModule(module) {
    if (module && module.name) {
      this.modules[module.name] = module;
      console.log(`✅ Modul ${module.name} registriran`);
      return true;
    }
    return false;
  },
  
  // Pridobi modul
  getModule(name) {
    return this.modules[name] || null;
  },
  
  // Seznam vseh modulov
  listModules() {
    return Object.keys(this.modules);
  }
};

// 🎛️ Glavna funkcija
async function runOmni(input) {
  console.log("🚀 Omni Core zagnan...");
  memoryModule.save({ input, time: new Date() });

  const aiResponse = await apiModule.askOpenAI(input);
  const googleResponse = await apiModule.searchGoogle(input);

  const finalResponse = {
    input,
    aiResponse,
    googleResponse,
    memory: memoryModule.getAll(),
    modules: global.omni.listModules()
  };

  console.log("✅ Omni rezultat:", finalResponse);
  return finalResponse;
}

module.exports = { runOmni, memoryModule, omni: global.omni };