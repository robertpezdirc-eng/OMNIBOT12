const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    console.log('Omni Admin GUI - Electron Main Process Started');
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false // Za lokalni razvoj
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Opcijska ikona
        title: 'Omni Admin Panel',
        show: false // Ne prikaži dokler ni pripravljeno
    });

    // Naloži HTML datoteko
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Prikaži okno ko je pripravljeno
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Odpri DevTools v razvojnem načinu
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    // Zapri aplikacijo ko se zapre glavno okno
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

    // Prepreči odpiranje novih oken
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
    });
}

// IPC komunikacija
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('close-app', () => {
    app.quit();
});

// Varnostni ukrepi
app.on('web-contents-created', (event, contents) => {
    // Prepreči prilaganje webview elementov
    contents.on('will-attach-webview', (event, webPreferences, params) => {
        event.preventDefault();
    });

    // Nastavi varnostne glave
    contents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' http://localhost:*']
            }
        });
    });
});

// Aplikacijski dogodki
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Omni Admin GUI - Graceful shutdown');
    app.quit();
});

process.on('SIGTERM', () => {
    console.log('Omni Admin GUI - Graceful shutdown');
    app.quit();
});