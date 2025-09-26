const { contextBridge, ipcRenderer } = require('electron');

// Installer API
const installerAPI = {
  runInstallation: () => ipcRenderer.invoke('installer:run-installation'),
  loadLicense: () => ipcRenderer.invoke('installer:load-license'),
  validateKey: (key) => ipcRenderer.invoke('installer:validate-key', key),
  getInstallationId: () => ipcRenderer.invoke('installer:get-installation-id')
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App management
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content),
  closeApp: () => ipcRenderer.invoke('close-app'),

  // Secure storage
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  storeClear: () => ipcRenderer.invoke('store-clear'),

  // Module Manager API
  moduleAPI: {
    getAllModules: () => ipcRenderer.invoke('modules:get-all'),
    getModule: (moduleId) => ipcRenderer.invoke('modules:get', moduleId),
    canAccessModule: (moduleId) => ipcRenderer.invoke('modules:can-access', moduleId),
    openModule: (moduleId) => ipcRenderer.invoke('modules:open', moduleId),
    getStats: () => ipcRenderer.invoke('modules:get-stats'),
    updateLicense: (licenseData) => ipcRenderer.invoke('modules:update-license', licenseData)
  },

  // License management
  getLicenseToken: () => ipcRenderer.invoke('get-license-token'),
  setLicenseToken: (token) => ipcRenderer.invoke('set-license-token', token),
  getClientId: () => ipcRenderer.invoke('get-client-id'),

  // Module management
  getModuleStatus: (moduleId) => ipcRenderer.invoke('get-module-status', moduleId),
  setModuleStatus: (moduleId, status) => ipcRenderer.invoke('set-module-status', moduleId, status),

  // Installation management
  setInstallationToken: (token) => ipcRenderer.invoke('set-installation-token', token),
  getInstallationToken: () => ipcRenderer.invoke('get-installation-token'),

  // Event listeners
  onRefreshLicense: (callback) => ipcRenderer.on('refresh-license', callback),
  onOpenModule: (callback) => ipcRenderer.on('open-module', (event, moduleId) => callback(moduleId)),
  
  // Shell operations
  openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Crypto utilities for encryption/decryption
contextBridge.exposeInMainWorld('cryptoAPI', {
  // Simple encryption/decryption using built-in crypto
  encrypt: (text, key) => {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },
  
  decrypt: (encryptedText, key) => {
    try {
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedData = textParts.join(':');
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  },
  
  // Generate secure random key
  generateKey: () => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
});

// Network utilities
contextBridge.exposeInMainWorld('networkAPI', {
  // Check if online
  isOnline: () => navigator.onLine,
  
  // Network status events
  onOnline: (callback) => window.addEventListener('online', callback),
  onOffline: (callback) => window.addEventListener('offline', callback)
});

// Expose installer API
contextBridge.exposeInMainWorld('installerAPI', installerAPI);

console.log('🔒 Preload script loaded - Secure IPC bridge established');