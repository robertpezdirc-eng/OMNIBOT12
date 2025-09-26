const { app, dialog, ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class OmniInstaller {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'omni-config.json');
        this.licensePath = path.join(app.getPath('userData'), 'license.enc');
        this.installationId = this.generateInstallationId();
    }

    /**
     * Generira unikaten ID za instalacijo
     */
    generateInstallationId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Šifrira podatke z AES-256-GCM
     */
    encrypt(text, key) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-gcm', key);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Dešifrira podatke z AES-256-GCM
     */
    decrypt(encryptedData, key) {
        try {
            const decipher = crypto.createDecipher('aes-256-gcm', key);
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Napaka pri dešifriranju:', error);
            return null;
        }
    }

    /**
     * Prikaže dialog za vnos licenčnega ključa
     */
    async showLicenseDialog() {
        const result = await dialog.showMessageBox({
            type: 'question',
            title: 'Omni Tourism - Licenčni ključ',
            message: 'Dobrodošli v Omni Tourism aplikaciji!\n\nZa nadaljevanje potrebujete veljaven licenčni ključ.',
            detail: 'Prosimo, vnesite svoj licenčni ključ ali se obrnite na podporo za pomoč.',
            buttons: ['Vnesi ključ', 'Demo način', 'Prekliči'],
            defaultId: 0,
            cancelId: 2
        });

        switch (result.response) {
            case 0: // Vnesi ključ
                return await this.promptForLicenseKey();
            case 1: // Demo način
                return await this.setupDemoMode();
            case 2: // Prekliči
                return null;
        }
    }

    /**
     * Prikaže dialog za vnos licenčnega ključa
     */
    async promptForLicenseKey() {
        // Simulacija dialoga za vnos (v resničnem scenariju bi uporabili HTML dialog)
        const licenseKey = await this.showInputDialog(
            'Licenčni ključ',
            'Vnesite svoj licenčni ključ:',
            'OMNI-XXXX-XXXX-XXXX-XXXX'
        );

        if (licenseKey && this.validateLicenseKey(licenseKey)) {
            // Establish server connection and validate license
            const validationResult = await this.validateLicenseWithServer(licenseKey);
            
            if (validationResult.valid) {
                return {
                    type: validationResult.plan || 'full',
                    token: licenseKey,
                    clientId: this.generateClientId(),
                    installationId: this.installationId,
                    serverValidated: true,
                    modules: validationResult.modules || [],
                    expiresAt: validationResult.expires_at
                };
            } else {
                await dialog.showErrorBox(
                    'Neveljaven licenčni ključ',
                    'Licenčni ključ ni veljaven ali je potekel. Prosimo, preverite ključ ali se obrnite na podporo.'
                );
                return null;
            }
        }

        await dialog.showErrorBox(
            'Napaka',
            'Neveljaven licenčni ključ. Prosimo, preverite ključ in poskusite znova.'
        );
    }

    /**
     * Validira licenčni ključ s strežnikom
     */
    async validateLicenseWithServer(licenseKey) {
        try {
            const axios = require('axios');
            
            const response = await axios.post('http://localhost:3000/api/license/validate', {
                license_key: licenseKey,
                client_id: this.generateClientId()
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.valid) {
                console.log('✅ License validated with server');
                return {
                    valid: true,
                    plan: response.data.plan,
                    modules: response.data.modules,
                    expires_at: response.data.expires_at,
                    client_id: response.data.client_id
                };
            } else {
                console.log('❌ License validation failed');
                return { valid: false };
            }
        } catch (error) {
            console.error('Server validation error:', error);
            
            // Fallback to local validation if server is unavailable
            if (this.validateLicenseKey(licenseKey)) {
                console.log('⚠️ Using local validation (server unavailable)');
                return {
                    valid: true,
                    plan: 'demo',
                    modules: ['dashboard', 'poročila'],
                    expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
                    client_id: this.generateClientId()
                };
            }
            
            return { valid: false };
        }
    }

    /**
     * Vzpostavi povezavo s strežnikom
     */
    async establishServerConnection(licenseData) {
        try {
            const io = require('socket.io-client');
            
            const socket = io('http://localhost:3000', {
                auth: {
                    token: licenseData.token,
                    client_id: licenseData.clientId
                },
                timeout: 5000
            });

            return new Promise((resolve, reject) => {
                socket.on('connect', () => {
                    console.log('✅ Connected to license server');
                    
                    // Store connection info
                    licenseData.serverConnected = true;
                    licenseData.socketId = socket.id;
                    
                    resolve(socket);
                });

                socket.on('connect_error', (error) => {
                    console.error('❌ Server connection failed:', error);
                    reject(error);
                });

                socket.on('license_update', (data) => {
                    console.log('📡 License update received:', data);
                    // Handle license updates
                    this.handleLicenseUpdate(data);
                });
            });
        } catch (error) {
            console.error('Error establishing server connection:', error);
            throw error;
        }
    }

    /**
      * Obravnava posodobitve licence
      */
     handleLicenseUpdate(updateData) {
         // Emit event to main window
         if (global.mainWindow) {
             global.mainWindow.webContents.send('license-updated', updateData);
         }
     }

     /**
      * Nastavi demo način
      */
     async setupDemoMode() {
         const result = await dialog.showMessageBox({
             type: 'info',
             title: 'Demo način',
             message: 'Aplikacija bo zagnana v demo načinu.',
             detail: 'V demo načinu so na voljo omejene funkcionalnosti. Za polno funkcionalnost potrebujete licenčni ključ.',
             buttons: ['Nadaljuj', 'Prekliči'],
             defaultId: 0
         });

         if (result.response === 0) {
             return {
                 type: 'demo',
                 token: 'DEMO-' + this.installationId,
                 clientId: this.generateClientId(),
                 installationId: this.installationId,
                 expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dni
             };
         }

        return null;
    }

    /**
     * Simulacija input dialoga
     */
    async showInputDialog(title, message, placeholder) {
        // V resničnem scenariju bi uporabili HTML dialog ali tretji paket
        // Za demonstracijo vrnemo placeholder vrednost
        return new Promise((resolve) => {
            // Simulacija uporabniškega vnosa
            setTimeout(() => {
                resolve('OMNI-DEMO-2024-TOUR-ISMO');
            }, 1000);
        });
    }

    /**
     * Validira licenčni ključ
     */
    validateLicenseKey(key) {
        // Osnovna validacija formata
        const pattern = /^OMNI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return pattern.test(key);
    }

    /**
     * Generira ID stranke
     */
    generateClientId() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `CLIENT-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Shrani licenčne podatke
     */
    async saveLicenseData(licenseData) {
        try {
            // Ustvari direktorij, če ne obstaja
            const userDataPath = app.getPath('userData');
            await fs.mkdir(userDataPath, { recursive: true });

            // Šifriraj licenčne podatke
            const encryptionKey = this.installationId + '-' + licenseData.clientId;
            const encryptedData = this.encrypt(JSON.stringify(licenseData), encryptionKey);

            // Shrani šifrirane podatke
            await fs.writeFile(this.licensePath, JSON.stringify(encryptedData));

            // Shrani konfiguracijo
            const config = {
                installationId: this.installationId,
                clientId: licenseData.clientId,
                licenseType: licenseData.type,
                installedAt: new Date().toISOString(),
                version: app.getVersion()
            };

            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));

            console.log('Licenčni podatki uspešno shranjeni');
            return true;
        } catch (error) {
            console.error('Napaka pri shranjevanju licenčnih podatkov:', error);
            return false;
        }
    }

    /**
     * Naloži licenčne podatke
     */
    async loadLicenseData() {
        try {
            // Preveri, če datoteke obstajajo
            const configExists = await fs.access(this.configPath).then(() => true).catch(() => false);
            const licenseExists = await fs.access(this.licensePath).then(() => true).catch(() => false);

            if (!configExists || !licenseExists) {
                return null;
            }

            // Naloži konfiguracijo
            const configData = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(configData);

            // Naloži in dešifriraj licenčne podatke
            const encryptedData = await fs.readFile(this.licensePath, 'utf8');
            const encryptedObj = JSON.parse(encryptedData);

            const encryptionKey = config.installationId + '-' + config.clientId;
            const decryptedData = this.decrypt(encryptedObj, encryptionKey);

            if (decryptedData) {
                const licenseData = JSON.parse(decryptedData);
                
                // Preveri veljavnost demo licence
                if (licenseData.type === 'demo' && licenseData.expiresAt < Date.now()) {
                    console.log('Demo licenca je potekla');
                    return null;
                }

                return {
                    ...licenseData,
                    config
                };
            }

            return null;
        } catch (error) {
            console.error('Napaka pri nalaganju licenčnih podatkov:', error);
            return null;
        }
    }

    /**
     * Izvede postopek instalacije
     */
    async runInstallation() {
        try {
            console.log('Začenjam postopek instalacije...');

            // Preveri, če licenca že obstaja
            const existingLicense = await this.loadLicenseData();
            if (existingLicense) {
                console.log('Licenčni podatki že obstajajo');
                return existingLicense;
            }

            // Prikaži dialog za licenco
            const licenseData = await this.showLicenseDialog();
            if (!licenseData) {
                console.log('Instalacija preklicana');
                return null;
            }

            // Shrani licenčne podatke
            const saved = await this.saveLicenseData(licenseData);
            if (!saved) {
                throw new Error('Napaka pri shranjevanju licenčnih podatkov');
            }

            // Prikaži sporočilo o uspešni instalaciji
            await dialog.showMessageBox({
                type: 'info',
                title: 'Instalacija dokončana',
                message: 'Omni Tourism aplikacija je bila uspešno konfigurirana!',
                detail: `Tip licence: ${licenseData.type === 'demo' ? 'Demo (7 dni)' : 'Polna licenca'}\nID stranke: ${licenseData.clientId}`,
                buttons: ['V redu']
            });

            console.log('Instalacija uspešno dokončana');
            return licenseData;

        } catch (error) {
            console.error('Napaka med instalacijo:', error);
            
            await dialog.showErrorBox(
                'Napaka pri instalaciji',
                'Prišlo je do napake med konfiguracijo aplikacije. Prosimo, poskusite znova ali se obrnite na podporo.'
            );
            
            return null;
        }
    }

    /**
     * Registrira IPC handler-je za installer
     */
    registerIPCHandlers() {
        ipcMain.handle('installer:run', async () => {
            return await this.runInstallation();
        });

        ipcMain.handle('installer:load-license', async () => {
            return await this.loadLicenseData();
        });

        ipcMain.handle('installer:validate-key', async (event, key) => {
            return this.validateLicenseKey(key);
        });

        ipcMain.handle('installer:get-installation-id', () => {
            return this.installationId;
        });
    }
}

module.exports = OmniInstaller;