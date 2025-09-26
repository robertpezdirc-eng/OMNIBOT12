const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    // Ustvari glavno okno
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'Omni Admin - Upravljanje licenc',
        show: false,
        titleBarStyle: 'default'
    });

    // Naloži HTML datoteko
    mainWindow.loadFile('index.html');

    // Prikaži okno, ko je pripravljeno
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Odpri Developer Tools v development načinu
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Obravnavaj zapiranje okna
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Ustvari aplikacijski meni
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'Datoteka',
            submenu: [
                {
                    label: 'Nova licenca',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new-license');
                    }
                },
                {
                    label: 'Osveži licence',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'refresh-licenses');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Izvozi poročilo',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'export-report');
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
            label: 'Licence',
            submenu: [
                {
                    label: 'Vse licence',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'show-all-licenses');
                    }
                },
                {
                    label: 'Aktivne licence',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'show-active-licenses');
                    }
                },
                {
                    label: 'Potekle licence',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'show-expired-licenses');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Statistike',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'show-statistics');
                    }
                }
            ]
        },
        {
            label: 'Orodja',
            submenu: [
                {
                    label: 'Nastavitve strežnika',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'server-settings');
                    }
                },
                {
                    label: 'Backup licenc',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'backup-licenses');
                    }
                },
                {
                    label: 'Obnovi licence',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'restore-licenses');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Preveri posodobitve',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'check-updates');
                    }
                }
            ]
        },
        {
            label: 'Pomoč',
            submenu: [
                {
                    label: 'Dokumentacija',
                    click: () => {
                        require('electron').shell.openExternal('https://docs.omni-system.com');
                    }
                },
                {
                    label: 'Podpora',
                    click: () => {
                        require('electron').shell.openExternal('mailto:support@omni-system.com');
                    }
                },
                { type: 'separator' },
                {
                    label: 'O aplikaciji',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'O aplikaciji',
                            message: 'Omni Admin GUI',
                            detail: `Verzija: 1.0.0\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nChrome: ${process.versions.chrome}`
                        });
                    }
                }
            ]
        }
    ];

    // macOS specifične prilagoditve
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });

        // Window menu
        template[4].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('show-message-box', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
});

ipcMain.handle('show-error-box', (event, title, content) => {
    dialog.showErrorBox(title, content);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

ipcMain.handle('quit-app', () => {
    app.quit();
});

// Obravnavaj napake s certifikati (za development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
        // Ignoriraj napake s certifikati za localhost
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

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

// Prepreči navigacijo na zunanje strani
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
        }
    });
});

// Varnostne nastavitve
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        require('electron').shell.openExternal(navigationUrl);
    });
});