const { ipcRenderer } = require('electron');
const axios = require('axios');
const { io } = require('socket.io-client');

class OmniClientGUI {
  constructor() {
    this.clientId = null;
    this.licenseData = null;
    this.selectedModule = null;
    this.licenseApiUrl = 'http://localhost:3002';
    this.socket = null;
    
    this.init();
  }

  async init() {
    this.log('🚀 Inicializacija Omni Client GUI...');
    
    // Pridobi Client ID iz main procesa
    this.clientId = await ipcRenderer.invoke('get-client-id');
    this.log(`🆔 Client ID: ${this.clientId}`);
    
    // Nastavi event listenere
    this.setupEventListeners();
    
    // Inicializiraj WebSocket povezavo
    this.initWebSocket();
    
    // Preveri licenco ob zagonu
    await this.checkLicense();
  }

  setupEventListeners() {
    // Gumb za preverjanje licence
    document.getElementById('refresh').addEventListener('click', () => {
      this.checkLicense();
    });

    // Gumb za zagon modula
    document.getElementById('run-module').addEventListener('click', () => {
      this.runSelectedModule();
    });

    // Gumb za prikaz informacij
    document.getElementById('show-info').addEventListener('click', () => {
      this.showSystemInfo();
    });

    // Gumb za zapiranje aplikacije
    document.getElementById('quit-app').addEventListener('click', async () => {
      this.log('👋 Zapiranje aplikacije...');
      await ipcRenderer.invoke('quit-app');
    });

    // Klik na module
    document.querySelectorAll('.module').forEach(module => {
      module.addEventListener('click', (e) => {
        if (!module.classList.contains('locked')) {
          this.selectModule(module.dataset.module);
        }
      });
    });
  }

  initWebSocket() {
    try {
      this.log('🔌 Vzpostavljanje WebSocket povezave...');
      this.socket = io(this.licenseApiUrl);

      this.socket.on('connect', () => {
        this.log('✅ WebSocket povezava vzpostavljena');
      });

      this.socket.on('disconnect', () => {
        this.log('⚠️ WebSocket povezava prekinjena');
      });

      this.socket.on('license_update', (license) => {
        this.log('📡 Prejeta posodobitev licence:', license);
        
        // Preveri, ali se posodobitev nanaša na ta client
        if (license.client_id === this.clientId) {
          this.log('🔄 Posodabljam licenco zaradi spremembe iz Admin panela...');
          
          // Če je licenca izbrisana
          if (license.action === 'delete' || license.status === 'deleted') {
            this.log('🗑️ Licenca je bila izbrisana');
            this.updateStatus('inactive', 'LICENCA IZBRISANA');
            this.lockAllModules();
            this.licenseData = null;
            return;
          }
          
          // Sicer ponovno preveri licenco
          this.checkLicense();
        }
      });

      this.socket.on('connect_error', (error) => {
        this.log('❌ Napaka pri WebSocket povezavi:', error.message);
      });

    } catch (error) {
      this.log('❌ Napaka pri inicializaciji WebSocket:', error.message);
    }
  }

  async checkLicense() {
    this.log('🔍 Preverjanje licence...');
    this.updateStatus('checking', 'Preverjanje licence...');
    
    try {
      const response = await axios.get(`${this.licenseApiUrl}/api/license/validate`, {
        headers: {
          'client-id': this.clientId
        },
        timeout: 10000
      });

      if (response.status === 200) {
        this.licenseData = response.data;
        this.log('✅ Licenca je veljavna');
        this.updateStatus('active', 'LICENCA AKTIVNA');
        this.updateLicenseInfo();
        this.updateModules();
      }
    } catch (error) {
      this.log(`❌ Napaka pri preverjanju licence: ${error.message}`);
      
      if (error.response) {
        const errorMsg = error.response.data?.message || 'Neznana napaka';
        this.updateStatus('inactive', `NAPAKA: ${errorMsg}`);
        this.log(`📋 Status: ${error.response.status} - ${errorMsg}`);
      } else {
        this.updateStatus('inactive', 'POVEZAVA NEUSPEŠNA');
        this.log('🔌 Ni mogoče vzpostaviti povezave z licenčnim strežnikom');
      }
      
      this.lockAllModules();
    }
  }

  updateStatus(type, message) {
    const statusElement = document.getElementById('status');
    const spinner = statusElement.querySelector('.loading-spinner');
    
    // Odstrani vse obstoječe razrede
    statusElement.className = '';
    
    // Dodaj ustrezen razred
    statusElement.classList.add(`status-${type}`);
    
    // Posodobi besedilo
    if (type === 'checking') {
      statusElement.innerHTML = `<span class="loading-spinner"></span>${message}`;
    } else {
      statusElement.textContent = message;
    }
  }

  updateLicenseInfo() {
    if (!this.licenseData) return;

    document.getElementById('client-id').textContent = `Client ID: ${this.clientId}`;
    document.getElementById('plan-type').textContent = `Plan: ${this.licenseData.plan}`;
    
    const expiresDate = new Date(this.licenseData.expires_at);
    const formattedDate = expiresDate.toLocaleDateString('sl-SI');
    document.getElementById('expires').textContent = `Poteče: ${formattedDate}`;
  }

  updateModules() {
    const allModules = ['ceniki', 'blagajna', 'zaloge', 'AI_optimizacija'];
    const allowedModules = this.licenseData?.modules || [];

    allModules.forEach(moduleName => {
      const moduleElement = document.getElementById(moduleName);
      
      if (allowedModules.includes(moduleName)) {
        moduleElement.classList.remove('locked', 'pending');
        moduleElement.classList.add('active');
        this.log(`✅ Modul "${moduleName}" je aktiven`);
      } else {
        moduleElement.classList.remove('active', 'pending');
        moduleElement.classList.add('locked');
        this.log(`🔒 Modul "${moduleName}" je zaklenjen`);
      }
    });

    this.log(`📦 Aktivnih modulov: ${allowedModules.length}/${allModules.length}`);
  }

  lockAllModules() {
    document.querySelectorAll('.module').forEach(module => {
      module.classList.remove('active', 'pending');
      module.classList.add('locked');
    });
    
    document.getElementById('run-module').disabled = true;
    this.selectedModule = null;
  }

  selectModule(moduleName) {
    // Odstrani izbiro z vseh modulov
    document.querySelectorAll('.module').forEach(m => {
      m.style.border = 'none';
    });

    // Izberi trenutni modul
    const moduleElement = document.getElementById(moduleName);
    moduleElement.style.border = '3px solid #fff';
    
    this.selectedModule = moduleName;
    document.getElementById('run-module').disabled = false;
    
    this.log(`🎯 Izbran modul: ${moduleName}`);
  }

  async runSelectedModule() {
    if (!this.selectedModule) {
      this.log('⚠️ Ni izbranega modula');
      return;
    }

    this.log(`🚀 Zaganjam modul: ${this.selectedModule}`);
    
    try {
      // Simulacija zagona modula
      const moduleFile = `./modules/${this.selectedModule}.js`;
      
      // Preveri če modul obstaja
      const fs = require('fs');
      const path = require('path');
      const modulePath = path.join(__dirname, 'modules', `${this.selectedModule}.js`);
      
      if (fs.existsSync(modulePath)) {
        this.log(`📂 Nalagam modul iz: ${modulePath}`);
        
        // Dinamično naloži modul
        delete require.cache[require.resolve(modulePath)];
        const moduleInstance = require(modulePath);
        
        if (typeof moduleInstance.init === 'function') {
          await moduleInstance.init();
          this.log(`✅ Modul "${this.selectedModule}" uspešno zagnan`);
        } else {
          this.log(`⚠️ Modul "${this.selectedModule}" nima init funkcije`);
        }
      } else {
        this.log(`❌ Modul "${this.selectedModule}" ne obstaja`);
        this.log(`📍 Pričakovana lokacija: ${modulePath}`);
      }
    } catch (error) {
      this.log(`❌ Napaka pri zagonu modula: ${error.message}`);
    }
  }

  async showSystemInfo() {
    this.log('ℹ️ Prikaz sistemskih informacij...');
    
    const appVersion = await ipcRenderer.invoke('get-app-version');
    const nodeVersion = process.version;
    const electronVersion = process.versions.electron;
    const platform = process.platform;
    const arch = process.arch;
    
    this.log(`📱 Aplikacija: v${appVersion}`);
    this.log(`⚡ Electron: v${electronVersion}`);
    this.log(`🟢 Node.js: ${nodeVersion}`);
    this.log(`💻 Platforma: ${platform} (${arch})`);
    this.log(`🆔 Client ID: ${this.clientId}`);
    
    if (this.licenseData) {
      this.log(`📋 Plan: ${this.licenseData.plan}`);
      this.log(`📅 Poteče: ${new Date(this.licenseData.expires_at).toLocaleString('sl-SI')}`);
      this.log(`📦 Moduli: ${this.licenseData.modules.join(', ')}`);
    }
    
    this.log(`🔗 API URL: ${this.licenseApiUrl}`);
  }

  log(message) {
    const logsArea = document.getElementById('logs');
    const timestamp = new Date().toLocaleTimeString('sl-SI');
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logsArea.appendChild(logEntry);
    logsArea.scrollTop = logsArea.scrollHeight;
    
    // Obdrži samo zadnjih 50 vnosov
    while (logsArea.children.length > 50) {
      logsArea.removeChild(logsArea.firstChild);
    }
    
    console.log(`[Omni GUI] ${message}`);
  }
}

// Inicializiraj aplikacijo ko je DOM pripravljen
document.addEventListener('DOMContentLoaded', () => {
  window.omniClient = new OmniClientGUI();
});

// Globalne funkcije za debugging
window.debugInfo = () => {
  if (window.omniClient) {
    window.omniClient.showSystemInfo();
  }
};

window.forceRefresh = () => {
  if (window.omniClient) {
    window.omniClient.checkLicense();
  }
};

console.log('Omni Client GUI - Renderer Process Loaded');