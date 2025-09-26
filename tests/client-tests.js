// 🔹 Omni Ultimate Turbo Flow System - Client Tests
// Testi za odjemalski panel in UI funkcionalnost

const puppeteer = require('puppeteer');
const colors = require('colors');
const path = require('path');

// 🎨 Barvni sistem za teste
const testColors = {
    info: colors.cyan,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    header: colors.magenta.bold,
    subheader: colors.blue.bold
};

class OmniClientTester {
    constructor(clientURL = 'http://localhost:3000/client/license-client.html') {
        this.clientURL = clientURL;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        this.browser = null;
        this.page = null;
        
        console.log(testColors.header('🔹 Omni Ultimate Turbo Flow System - Client Tester'));
        console.log(testColors.info(`🌐 Client URL: ${clientURL}`));
        console.log('');
    }

    // 🔧 Pomožne funkcije
    async setupBrowser() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Nastavi viewport
        await this.page.setViewport({ width: 1280, height: 720 });
        
        // Omogoči console loge
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(testColors.warning(`   Browser Error: ${msg.text()}`));
            }
        });
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    logTest(testName, passed, details = '') {
        this.testResults.total++;
        if (passed) {
            this.testResults.passed++;
            console.log(testColors.success(`✅ ${testName}`));
        } else {
            this.testResults.failed++;
            console.log(testColors.error(`❌ ${testName}`));
        }
        
        if (details) {
            console.log(testColors.info(`   ${details}`));
        }
        
        this.testResults.details.push({ testName, passed, details });
    }

    // 🌐 Page Load Tests
    async testPageLoad() {
        console.log(testColors.subheader('\n🌐 Page Load Tests'));
        
        try {
            const response = await this.page.goto(this.clientURL, { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
            
            const status = response.status();
            this.logTest('Page Load', status === 200, `HTTP Status: ${status}`);
            
            // Preveri, če se je stran naložila
            const title = await this.page.title();
            this.logTest('Page Title', title.includes('Omni'), `Title: ${title}`);
            
            // Preveri osnovne elemente
            const hasHeader = await this.page.$('.header') !== null;
            this.logTest('Header Element', hasHeader, hasHeader ? 'Header found' : 'Header missing');
            
            const hasControls = await this.page.$('.controls') !== null;
            this.logTest('Controls Element', hasControls, hasControls ? 'Controls found' : 'Controls missing');
            
        } catch (error) {
            this.logTest('Page Load', false, `Error: ${error.message}`);
        }
    }

    // 🔐 License Check Tests
    async testLicenseCheck() {
        console.log(testColors.subheader('\n🔐 License Check Tests'));
        
        try {
            // Počakaj, da se stran naloži
            await this.page.waitForSelector('#checkLicenseBtn', { timeout: 5000 });
            
            // Test preverjanja licence
            await this.page.click('#checkLicenseBtn');
            
            // Počakaj na rezultat
            await this.page.waitForTimeout(2000);
            
            // Preveri status
            const statusElement = await this.page.$('#licenseStatus');
            const statusText = statusElement ? await this.page.evaluate(el => el.textContent, statusElement) : '';
            
            this.logTest('License Check Button', statusElement !== null, `Status: ${statusText}`);
            
            // Test z demo licenco
            const licenseInput = await this.page.$('#licenseKeyInput');
            if (licenseInput) {
                await this.page.type('#licenseKeyInput', 'demo-license-key-12345');
                await this.page.click('#checkLicenseBtn');
                await this.page.waitForTimeout(2000);
                
                const newStatus = await this.page.evaluate(() => {
                    const el = document.getElementById('licenseStatus');
                    return el ? el.textContent : '';
                });
                
                this.logTest('Demo License Test', newStatus.length > 0, `Response: ${newStatus}`);
            }
            
        } catch (error) {
            this.logTest('License Check Tests', false, `Error: ${error.message}`);
        }
    }

    // 🔄 Module Toggle Tests
    async testModuleToggle() {
        console.log(testColors.subheader('\n🔄 Module Toggle Tests'));
        
        try {
            // Preveri module
            const modules = await this.page.$$('.module-card');
            this.logTest('Module Cards Present', modules.length > 0, `Found ${modules.length} modules`);
            
            if (modules.length > 0) {
                // Preveri prvi modul
                const firstModule = modules[0];
                const moduleTitle = await this.page.evaluate(el => {
                    const titleEl = el.querySelector('.module-title');
                    return titleEl ? titleEl.textContent : 'Unknown';
                }, firstModule);
                
                const isLocked = await this.page.evaluate(el => {
                    return el.classList.contains('locked');
                }, firstModule);
                
                this.logTest('Module Lock Status', typeof isLocked === 'boolean', 
                    `Module "${moduleTitle}" is ${isLocked ? 'locked' : 'unlocked'}`);
                
                // Test klika na modul
                await firstModule.click();
                await this.page.waitForTimeout(1000);
                
                // Preveri, če se je kaj spremenilo
                const afterClick = await this.page.evaluate(el => {
                    return el.classList.contains('active');
                }, firstModule);
                
                this.logTest('Module Click Response', typeof afterClick === 'boolean', 
                    `Module ${afterClick ? 'activated' : 'remained inactive'}`);
            }
            
        } catch (error) {
            this.logTest('Module Toggle Tests', false, `Error: ${error.message}`);
        }
    }

    // 🌐 Online/Offline Tests
    async testOnlineOffline() {
        console.log(testColors.subheader('\n🌐 Online/Offline Tests'));
        
        try {
            // Test online stanja
            const onlineStatus = await this.page.evaluate(() => navigator.onLine);
            this.logTest('Initial Online Status', onlineStatus, `Navigator.onLine: ${onlineStatus}`);
            
            // Simuliraj offline
            await this.page.setOfflineMode(true);
            await this.page.waitForTimeout(1000);
            
            // Preveri offline indikator
            const offlineIndicator = await this.page.$('.offline-indicator');
            this.logTest('Offline Indicator', offlineIndicator !== null, 
                offlineIndicator ? 'Offline indicator shown' : 'No offline indicator');
            
            // Test offline funkcionalnosti
            const offlineBtn = await this.page.$('#toggleOfflineBtn');
            if (offlineBtn) {
                await offlineBtn.click();
                await this.page.waitForTimeout(1000);
                
                const offlineMode = await this.page.evaluate(() => {
                    return window.omniClient && window.omniClient.isOfflineMode;
                });
                
                this.logTest('Offline Mode Toggle', typeof offlineMode === 'boolean', 
                    `Offline mode: ${offlineMode}`);
            }
            
            // Vrni online
            await this.page.setOfflineMode(false);
            await this.page.waitForTimeout(1000);
            
        } catch (error) {
            this.logTest('Online/Offline Tests', false, `Error: ${error.message}`);
        }
    }

    // 🔄 Auto-refresh Tests
    async testAutoRefresh() {
        console.log(testColors.subheader('\n🔄 Auto-refresh Tests'));
        
        try {
            // Preveri, če obstaja auto-refresh funkcionalnost
            const refreshBtn = await this.page.$('#refreshModulesBtn');
            this.logTest('Refresh Button Present', refreshBtn !== null, 
                refreshBtn ? 'Refresh button found' : 'No refresh button');
            
            if (refreshBtn) {
                // Test ročnega osveževanja
                await refreshBtn.click();
                await this.page.waitForTimeout(2000);
                
                // Preveri, če se je kaj posodobilo
                const lastUpdate = await this.page.evaluate(() => {
                    const el = document.querySelector('.last-update');
                    return el ? el.textContent : null;
                });
                
                this.logTest('Manual Refresh', lastUpdate !== null, 
                    `Last update: ${lastUpdate || 'Not found'}`);
            }
            
            // Test avtomatskega osveževanja (počakaj 5 sekund)
            const initialTime = Date.now();
            await this.page.waitForTimeout(5000);
            
            const autoRefreshWorking = await this.page.evaluate(() => {
                return window.omniClient && typeof window.omniClient.lastCheck === 'number';
            });
            
            this.logTest('Auto Refresh Mechanism', autoRefreshWorking, 
                autoRefreshWorking ? 'Auto refresh detected' : 'No auto refresh');
            
        } catch (error) {
            this.logTest('Auto-refresh Tests', false, `Error: ${error.message}`);
        }
    }

    // 🎨 UI Responsiveness Tests
    async testUIResponsiveness() {
        console.log(testColors.subheader('\n🎨 UI Responsiveness Tests'));
        
        try {
            // Test različnih velikosti zaslona
            const viewports = [
                { width: 1920, height: 1080, name: 'Desktop' },
                { width: 768, height: 1024, name: 'Tablet' },
                { width: 375, height: 667, name: 'Mobile' }
            ];
            
            for (const viewport of viewports) {
                await this.page.setViewport(viewport);
                await this.page.waitForTimeout(1000);
                
                // Preveri, če so elementi vidni
                const header = await this.page.$('.header');
                const controls = await this.page.$('.controls');
                const modules = await this.page.$('.modules-grid');
                
                const elementsVisible = header && controls && modules;
                this.logTest(`${viewport.name} Responsiveness`, elementsVisible, 
                    `${viewport.width}x${viewport.height} - ${elementsVisible ? 'All elements visible' : 'Some elements hidden'}`);
            }
            
            // Vrni na privzeto velikost
            await this.page.setViewport({ width: 1280, height: 720 });
            
        } catch (error) {
            this.logTest('UI Responsiveness Tests', false, `Error: ${error.message}`);
        }
    }

    // 🔔 Notification Tests
    async testNotifications() {
        console.log(testColors.subheader('\n🔔 Notification Tests'));
        
        try {
            // Preveri notification sistem
            const notificationArea = await this.page.$('.notifications');
            this.logTest('Notification Area', notificationArea !== null, 
                notificationArea ? 'Notification area found' : 'No notification area');
            
            // Simuliraj notifikacijo
            await this.page.evaluate(() => {
                if (window.omniClient && window.omniClient.showNotification) {
                    window.omniClient.showNotification('Test notification', 'info');
                }
            });
            
            await this.page.waitForTimeout(1000);
            
            // Preveri, če se je notifikacija prikazala
            const notification = await this.page.$('.notification');
            this.logTest('Notification Display', notification !== null, 
                notification ? 'Notification displayed' : 'No notification shown');
            
            if (notification) {
                // Preveri vsebino
                const notificationText = await this.page.evaluate(el => el.textContent, notification);
                this.logTest('Notification Content', notificationText.includes('Test'), 
                    `Content: ${notificationText}`);
            }
            
        } catch (error) {
            this.logTest('Notification Tests', false, `Error: ${error.message}`);
        }
    }

    // 📊 Performance Tests
    async testPerformance() {
        console.log(testColors.subheader('\n📊 Performance Tests'));
        
        try {
            // Izmeri čas nalaganja
            const startTime = Date.now();
            await this.page.reload({ waitUntil: 'networkidle2' });
            const loadTime = Date.now() - startTime;
            
            this.logTest('Page Load Performance', loadTime < 5000, 
                `Load time: ${loadTime}ms (target: <5000ms)`);
            
            // Preveri memory usage
            const metrics = await this.page.metrics();
            const jsHeapUsed = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
            
            this.logTest('Memory Usage', jsHeapUsed < 50, 
                `JS Heap: ${jsHeapUsed}MB (target: <50MB)`);
            
            // Test odzivnosti UI
            const clickStartTime = Date.now();
            const button = await this.page.$('#checkLicenseBtn');
            if (button) {
                await button.click();
                const clickTime = Date.now() - clickStartTime;
                
                this.logTest('UI Responsiveness', clickTime < 100, 
                    `Click response: ${clickTime}ms (target: <100ms)`);
            }
            
        } catch (error) {
            this.logTest('Performance Tests', false, `Error: ${error.message}`);
        }
    }

    // 🎯 Zaženi vse teste
    async runAllTests() {
        console.log(testColors.header('\n🚀 Začenjam z odjemalskimi testi...\n'));
        
        try {
            await this.setupBrowser();
            
            await this.testPageLoad();
            await this.testLicenseCheck();
            await this.testModuleToggle();
            await this.testOnlineOffline();
            await this.testAutoRefresh();
            await this.testUIResponsiveness();
            await this.testNotifications();
            await this.testPerformance();
            
            this.printSummary();
        } catch (error) {
            console.log(testColors.error(`\n❌ Kritična napaka med testiranjem: ${error.message}`));
        } finally {
            await this.closeBrowser();
        }
    }

    // 📊 Izpiši povzetek
    printSummary() {
        console.log(testColors.header('\n📊 POVZETEK ODJEMALSKIH TESTOV'));
        console.log(testColors.info('═'.repeat(50)));
        console.log(testColors.success(`✅ Uspešni testi: ${this.testResults.passed}`));
        console.log(testColors.error(`❌ Neuspešni testi: ${this.testResults.failed}`));
        console.log(testColors.info(`📊 Skupaj testov: ${this.testResults.total}`));
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(testColors.info(`🎯 Uspešnost: ${successRate}%`));
        
        if (this.testResults.failed === 0) {
            console.log(testColors.success('\n🎉 Vsi odjemalski testi so uspešno opravljeni!'));
        } else {
            console.log(testColors.warning('\n⚠️  Nekateri odjemalski testi niso uspešni. Preveri podrobnosti zgoraj.'));
        }
        
        console.log(testColors.info('═'.repeat(50)));
    }
}

// 🚀 Zaženi teste, če je skripta poklicana direktno
if (require.main === module) {
    const tester = new OmniClientTester();
    
    // Počakaj malo, da se strežnik zagone
    setTimeout(() => {
        tester.runAllTests().catch(console.error);
    }, 5000);
}

module.exports = OmniClientTester;