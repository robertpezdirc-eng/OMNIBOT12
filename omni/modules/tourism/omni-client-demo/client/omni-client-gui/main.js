const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Ustvari glavno okno aplikacije
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Opcijsko
    show: false, // Ne prikaži dokler ni pripravljeno
    titleBarStyle: 'default',
    resizable: true
  });

  // Naloži HTML datoteko
  mainWindow.loadFile('index.html');

  // Prikaži okno ko je pripravljeno
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Odpri DevTools v development načinu
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Zapri aplikacijo ko se okno zapre
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prepreči navigacijo na zunanje strani
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
}

// Ta metoda bo klicana ko je Electron pripravljen
// za ustvarjanje oken brskalnike.
// Nekateri API-ji so na voljo šele po tem dogodku.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // Na macOS je običajno, da se aplikacija znova ustvari okno
    // ko se klikne ikona v docku in ni drugih oken odprtih.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Zapri aplikacijo ko se vsa okna zaprejo, razen na macOS.
// Tam je običajno, da aplikacije in njihova menijska vrstica
// ostanejo aktivne, dokler uporabnik ne zapre aplikacije z Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC komunikacija z renderer procesom
ipcMain.handle('get-client-id', () => {
  return process.env.CLIENT_ID || 'DEMO001';
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

// Varnostni ukrepi
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    // Prepreči odpiranje novih oken
    event.preventDefault();
  });

  contents.on('will-attach-webview', (event, webPreferences, params) => {
    // Prepreči prilaganje webview elementov
    event.preventDefault();
  });
});

// Nastavi varnostne glave
app.on('ready', () => {
  if (mainWindow) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' http://localhost:*']
        }
      });
    });
  }
});

console.log('Omni Client GUI - Electron Main Process Started');
console.log('Client ID:', process.env.CLIENT_ID || 'DEMO001');
console.log('Development Mode:', process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));