const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional icon
    title: 'Omni Client Panel',
    show: false // Don't show until ready
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
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
app.whenReady().then(createWindow);

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

// IPC handlers
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

console.log('🚀 Omni Client Panel starting...');