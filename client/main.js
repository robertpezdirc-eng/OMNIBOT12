const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fsPromises = require('fs').promises;
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const OmniInstaller = require('./installer.js');
const ModuleManager = require('./module-manager.js');
const LicenseManager = require('./utils/license-manager.js');
const SecureStorage = require('./utils/secure-storage.js');
const notificationManager = require('./utils/notification-manager');

let storeInstance = null;

class SimpleStore {
  constructor(options) {
    this.name = options.name || 'config';
    this.defaults = options.defaults || {};
    this.configDir = path.join(os.homedir(), '.config', 'omni-client');
    this.configFile = path.join(this.configDir, `${this.name}.json`);
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    
    // Load existing config or create with defaults
    this.data = this.loadConfig();
  }
  
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        return { ...this.defaults, ...data };
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error.message);
    }
    return { ...this.defaults };
  }
  
  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }
  
  get(key) {
    return this.data[key];
  }
  
  set(key, value) {
    this.data[key] = value;
    this.saveConfig();
  }
  
  delete(key) {
    delete this.data[key];
    this.saveConfig();
  }
  
  clear() {
    this.data = { ...this.defaults };
    this.saveConfig();
  }
}

async function initializeStore() {
  if (!storeInstance) {
    try {
      storeInstance = new SimpleStore({
        name: 'omni-client-config',
        defaults: {
          license_data: null,
          client_id: null,
          installation_id: null
        }
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      throw error;
    }
  }
  return storeInstance;
}

// Inicializiraj installer, module manager in license manager
const installer = new OmniInstaller();
const moduleManager = new ModuleManager();
const licenseManager = new LicenseManager();
const secureStorage = new SecureStorage();

// Store reference to main window globally for installer
global.mainWindow = null;

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional icon
    title: 'Omni Client Panel',
    show: false // Don't show until ready
  });

  // Load the client dashboard
  mainWindow.loadFile('client-dashboard.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Store global reference
    global.mainWindow = mainWindow;
    
    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    global.mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Datoteka',
      submenu: [
        {
          label: 'Osveži licenco',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('refresh-license');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Izhod',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Moduli',
      submenu: [
        {
          label: 'Ceniki',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-module', 'ceniki');
            }
          }
        },
        {
          label: 'Blagajna',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-module', 'blagajna');
            }
          }
        },
        {
          label: 'Zaloge',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-module', 'zaloge');
            }
          }
        },
        {
          label: 'AI Optimizacija',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-module', 'AI_optimizacija');
            }
          }
        }
      ]
    },
    {
      label: 'Pomoč',
      submenu: [
        {
          label: 'O aplikaciji',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'O aplikaciji',
              message: 'Omni Client Panel',
              detail: 'Verzija 1.0.0\\nLicenčni sistem za Omni module\\n\\n© 2024 Omni System'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  console.log('🚀 Omni Tourism Client starting...');
  
  try {
    // Initialize store first
    await initializeStore();
    
    // Initialize license manager and check license
    console.log('🔐 Preverjam licenco ob zagonu...');
    const licenseValidation = await licenseManager.initialize();
    
    if (!licenseValidation.valid) {
      console.log('❌ Licenca ni veljavna, zaženem postopek aktivacije');
      
      // Initialize installer and register IPC handlers
      installer.registerIPCHandlers();
      
      // Run installation/activation process
      const licenseData = await installer.runInstallation();
      
      if (!licenseData) {
        console.log('Installation cancelled or failed');
        app.quit();
        return;
      }
      
      // Activate new license
      const activationResult = await licenseManager.activateLicense(
        licenseData.token, 
        licenseData.clientId
      );
      
      if (!activationResult.success) {
        console.error('❌ Aktivacija licence ni uspela:', activationResult.reason);
        await dialog.showErrorBox(
          'Napaka pri aktivaciji',
          'Licenca ni veljavna ali je prišlo do napake. Prosimo, poskusite znova.'
        );
        app.quit();
        return;
      }
      
      console.log('✅ Licenca uspešno aktivirana');
    } else {
      console.log('✅ Licenca je veljavna');
    }
    
    // Get current license info for module management
    const currentLicenseInfo = licenseManager.getLicenseInfo();
    const licenseData = licenseValidation.licenseData || currentLicenseInfo;
    
    // Initialize module manager with license data
    await moduleManager.initialize(licenseData);
    
    // Create main window
    createWindow();
    
    // Auto-lock/unlock modules based on license
    await autoManageModules(licenseData);
    
    console.log('✅ Application initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    await dialog.showErrorBox(
      'Initialization Error',
      'Failed to start the application. Please try again or contact support.'
    );
    
    app.quit();
  }
});

/**
 * Automatically manage modules based on license state
 */
async function autoManageModules(licenseData) {
  try {
    if (!licenseData) {
      console.log('🔒 No license data - locking all modules');
      await moduleManager.lockAllModules();
      return;
    }
    
    // Check if license is expired
    if (licenseData.expiresAt && licenseData.expiresAt < Date.now()) {
      console.log('🔒 License expired - locking all modules');
      await moduleManager.lockAllModules();
      return;
    }
    
    // Unlock modules based on license type
    const allowedModules = moduleManager.licenseTypes[licenseData.type]?.allowedModules || [];
    
    console.log(`🔓 Unlocking modules for ${licenseData.type} license:`, allowedModules);
    
    // First lock all modules
    await moduleManager.lockAllModules();
    
    // Then unlock allowed modules
    for (const moduleId of allowedModules) {
      await moduleManager.unlockModule(moduleId);
    }
    
    console.log('✅ Module management completed');
    
  } catch (error) {
    console.error('❌ Error in auto module management:', error);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for secure storage and license management
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('show-error-dialog', async (event, title, content) => {
  dialog.showErrorBox(title, content);
});

ipcMain.handle('close-app', () => {
  app.quit();
});

// Shell operations
ipcMain.handle('shell-open-external', async (event, url) => {
  const { shell } = require('electron');
  await shell.openExternal(url);
});

// Secure storage handlers
ipcMain.handle('store-get', async (event, key) => {
  const storeInstance = await initializeStore();
  return storeInstance.get(key);
});

ipcMain.handle('store-set', async (event, key, value) => {
  const storeInstance = await initializeStore();
  storeInstance.set(key, value);
});

ipcMain.handle('store-delete', async (event, key) => {
  const storeInstance = await initializeStore();
  storeInstance.delete(key);
});

ipcMain.handle('store-clear', async () => {
  const storeInstance = await initializeStore();
  storeInstance.clear();
});

// License token management with secure storage
ipcMain.handle('get-license-token', async () => {
  try {
    const licenseData = await secureStorage.getLicenseData();
    return licenseData ? licenseData.token : null;
  } catch (error) {
    console.error('Napaka pri pridobivanju licence:', error);
    return null;
  }
});

ipcMain.handle('set-license-token', async (event, token) => {
  try {
    const clientId = await getOrGenerateClientId();
    const success = await secureStorage.storeLicenseToken(token, clientId);
    
    if (success) {
      // Posodobi module manager z novo licenco
      await autoManageModules();
    }
    
    return success;
  } catch (error) {
    console.error('Napaka pri shranjevanju licence:', error);
    return false;
  }
});

// License management handlers
ipcMain.handle('validate-license', async () => {
  try {
    return await licenseManager.validateLicense();
  } catch (error) {
    console.error('Napaka pri validaciji licence:', error);
    return { valid: false, reason: 'validation_error', error: error.message };
  }
});

ipcMain.handle('refresh-license', async () => {
  try {
    return await licenseManager.validateLicense(true); // Force online check
  } catch (error) {
    console.error('Napaka pri osveževanju licence:', error);
    return { valid: false, reason: 'refresh_error', error: error.message };
  }
});

ipcMain.handle('get-license-info', async () => {
  try {
    return await licenseManager.getLicenseInfo();
  } catch (error) {
    console.error('Napaka pri pridobivanju informacij o licenci:', error);
    return null;
  }
});

ipcMain.handle('deactivate-license', async () => {
  try {
    const result = await licenseManager.deactivateLicense();
    
    if (result.success) {
      // Zakleni vse module po deaktivaciji
      moduleManager.lockAllModules();
    }
    
    return result;
  } catch (error) {
    console.error('Napaka pri deaktivaciji licence:', error);
    return { success: false, reason: 'deactivation_error', error: error.message };
  }
});

// Handler za dogodek poteka licence
ipcMain.on('license-expired', async (event, data) => {
  try {
    console.log('🚨 Licenca je potekla:', data);
    
    // Zakleni vse module
    moduleManager.lockAllModules();
    
    // Počisti shranjene podatke o licenci
    await secureStorage.clearLicenseData();
    
    // Prikaži obvestilo uporabniku
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('license-expired-notification', {
        title: 'Licenca je potekla',
        message: `Vaša ${data.licenseType} licenca je potekla ${new Date(data.expiredAt).toLocaleString()}. Prosimo, obnovite licenco za nadaljevanje uporabe.`,
        type: 'warning',
        timestamp: data.timestamp
      });
    }
    
    // Preusmeri na licenčno stran
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile('license-client.html');
    }
    
  } catch (error) {
    console.error('Napaka pri obravnavi poteka licence:', error);
  }
});

// Helper function to get or generate client ID
async function getOrGenerateClientId() {
  const storeInstance = await initializeStore();
  let clientId = storeInstance.get('client_id');
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    storeInstance.set('client_id', clientId);
  }
  return clientId;
}

ipcMain.handle('get-client-id', async () => {
  try {
    return await getOrGenerateClientId();
  } catch (error) {
    console.error('Napaka pri pridobivanju client ID:', error);
    return null;
  }
});

// Module management
ipcMain.handle('get-module-status', async (event, moduleId) => {
  const storeInstance = await initializeStore();
  return storeInstance.get(`module_${moduleId}_status`, 'locked');
});

ipcMain.handle('set-module-status', async (event, moduleId, status) => {
  const storeInstance = await initializeStore();
  storeInstance.set(`module_${moduleId}_status`, status);
});

// Installation token handler (for installer)
ipcMain.handle('set-installation-token', async (event, token) => {
  const storeInstance = await initializeStore();
  storeInstance.set('installation_token', token);
  storeInstance.set('license_token', token); // Also set as license token
});

ipcMain.handle('get-installation-token', async () => {
  const storeInstance = await initializeStore();
  return storeInstance.get('installation_token');
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://localhost') || url.startsWith('http://localhost')) {
    // Ignore certificate errors for localhost
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Notification system IPC handlers
ipcMain.handle('notifications:get-all', async (event, clientId) => {
  try {
    return await notificationManager.getNotifications(clientId);
  } catch (error) {
    console.error('Napaka pri pridobivanju obvestil:', error);
    return [];
  }
});

ipcMain.handle('notifications:get-unread-count', async (event, clientId) => {
  try {
    return await notificationManager.getUnreadCount(clientId);
  } catch (error) {
    console.error('Napaka pri pridobivanju števila neprebranih obvestil:', error);
    return 0;
  }
});

ipcMain.handle('notifications:mark-as-read', async (event, notificationId) => {
  try {
    return await notificationManager.markAsRead(notificationId);
  } catch (error) {
    console.error('Napaka pri označevanju obvestila kot prebrano:', error);
    return false;
  }
});

ipcMain.handle('notifications:mark-all-as-read', async (event, clientId) => {
  try {
    return await notificationManager.markAllAsRead(clientId);
  } catch (error) {
    console.error('Napaka pri označevanju vseh obvestil kot prebrana:', error);
    return false;
  }
});

ipcMain.handle('notifications:dismiss', async (event, notificationId) => {
  try {
    return await notificationManager.dismissNotification(notificationId);
  } catch (error) {
    console.error('Napaka pri zavračanju obvestila:', error);
    return false;
  }
});

ipcMain.handle('notifications:get-stats', async (event, clientId) => {
  try {
    return await notificationManager.getStats(clientId);
  } catch (error) {
    console.error('Napaka pri pridobivanju statistik obvestil:', error);
    return { total: 0, unread: 0, dismissed: 0 };
  }
});

// Initialize notification manager when app is ready
app.whenReady().then(async () => {
  // ... existing initialization code ...
  
  // Initialize notification manager
  try {
    await notificationManager.initialize();
    console.log('✅ Notification manager initialized');
  } catch (error) {
    console.error('❌ Failed to initialize notification manager:', error);
  }
});

// All the UI-related functions below should also be moved to renderer.js
// These functions use document and window objects which are not available in the main process

// End of main.js - all DOM-related code has been removed

console.log('🚀 Omni Client Panel starting...');