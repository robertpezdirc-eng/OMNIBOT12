/**
 * OMNI REAL TEST - Testiranje realnih funkcionalnosti
 * Preverja vse module in funkcionalnosti univerzalnega sistema
 */

const axios = require('axios');
const WebSocket = require('ws');

class OmniRealTester {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.wsUrl = 'ws://localhost:3001';
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runAllTests() {
        console.log('🚀 OMNI REAL TEST - Testiranje realnih funkcionalnosti');
        console.log('=' .repeat(60));

        try {
            // Sistemski testi
            await this.testSystemStatus();
            await this.testSystemModules();

            // AI testi
            await this.testAIProcessing();
            await this.testAIResponse();
            await this.testAILearning();

            // Avtomatizacija testi
            await this.testAutomationWorkflow();
            await this.testAutomationScheduling();

            // Komunikacija testi
            await this.testCommunicationSend();
            await this.testCommunicationContact();

            // Podatki testi
            await this.testDataStore();
            await this.testDataQuery();
            await this.testDataAnalyze();

            // Produktivnost testi
            await this.testProductivityTask();
            await this.testProductivityProject();
            await this.testProductivityEvent();

            // Kreativnost testi
            await this.testCreativityGenerate();
            await this.testCreativityEdit();
            await this.testCreativityIdeas();

            // Poslovna inteligenca testi
            await this.testBusinessAnalyze();
            await this.testBusinessReport();
            await this.testBusinessKPIs();

            // IoT testi
            await this.testIoTDevice();
            await this.testIoTControl();
            await this.testIoTSensor();

            // Zdravje sistema testi
            await this.testHealthMetrics();
            await this.testHealthCheck();
            await this.testHealthHeal();

            // WebSocket testi
            await this.testWebSocketConnection();
            await this.testWebSocketAI();

            // Univerzalni API testi
            await this.testUniversalExecute();

            // Datoteke testi
            await this.testFileUpload();
            await this.testFileDownload();

            this.generateReport();

        } catch (error) {
            console.error('❌ Kritična napaka pri testiranju:', error.message);
        }
    }

    async testSystemStatus() {
        await this.runTest('System Status', async () => {
            const response = await axios.get(`${this.baseUrl}/api/system/status`);
            
            if (response.status !== 200) {
                throw new Error(`Napačen status kod: ${response.status}`);
            }

            const data = response.data;
            if (data.status !== 'active') {
                throw new Error(`Sistem ni aktiven: ${data.status}`);
            }

            if (!data.modules || data.modules.length === 0) {
                throw new Error('Ni modulov');
            }

            console.log(`   ✓ Sistem aktiven, ${data.modules.length} modulov`);
            return true;
        });
    }

    async testSystemModules() {
        await this.runTest('System Modules', async () => {
            const response = await axios.get(`${this.baseUrl}/api/system/modules`);
            
            if (response.status !== 200) {
                throw new Error(`Napačen status kod: ${response.status}`);
            }

            const data = response.data;
            if (!data.success || !data.modules) {
                throw new Error('Moduli niso dostopni');
            }

            const moduleCount = Object.keys(data.modules).length;
            console.log(`   ✓ ${moduleCount} modulov dostopnih`);
            return true;
        });
    }

    async testAIProcessing() {
        await this.runTest('AI Processing', async () => {
            const response = await axios.post(`${this.baseUrl}/api/ai/process`, {
                text: 'Kako si danes?',
                context: {}
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('AI procesiranje ni uspešno');
            }

            const result = response.data.result;
            if (!result.sentiment || !result.intent || !result.language) {
                throw new Error('Nepopolni rezultati AI procesiranja');
            }

            console.log(`   ✓ AI procesiranje: ${result.sentiment}, ${result.intent}, ${result.language}`);
            return true;
        });
    }

    async testAIResponse() {
        await this.runTest('AI Response', async () => {
            const response = await axios.post(`${this.baseUrl}/api/ai/respond`, {
                input: 'Kaj je Omni sistem?',
                context: {}
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('AI odgovor ni uspešen');
            }

            const aiResponse = response.data.response;
            if (!aiResponse || aiResponse.length === 0) {
                throw new Error('Prazen AI odgovor');
            }

            console.log(`   ✓ AI odgovor generiran (${aiResponse.length} znakov)`);
            return true;
        });
    }

    async testAILearning() {
        await this.runTest('AI Learning', async () => {
            const response = await axios.post(`${this.baseUrl}/api/ai/learn`, {
                input: 'Test vprašanje',
                output: 'Test odgovor',
                feedback: 'positive'
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('AI učenje ni uspešno');
            }

            console.log('   ✓ AI učenje uspešno');
            return true;
        });
    }

    async testAutomationWorkflow() {
        await this.runTest('Automation Workflow', async () => {
            const response = await axios.post(`${this.baseUrl}/api/automation/workflow`, {
                name: 'Test Workflow',
                steps: [
                    { name: 'step1', action: 'log', parameters: { message: 'Test' } },
                    { name: 'step2', action: 'wait', parameters: { duration: 100 } }
                ]
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Ustvarjanje workflow ni uspešno');
            }

            const workflowId = response.data.workflowId;
            console.log(`   ✓ Workflow ustvarjen: ${workflowId}`);
            return workflowId;
        });
    }

    async testAutomationScheduling() {
        await this.runTest('Automation Scheduling', async () => {
            const response = await axios.post(`${this.baseUrl}/api/automation/schedule`, {
                task: { name: 'Test Task', action: 'log' },
                schedule: { type: 'interval', interval: 60000 }
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Načrtovanje naloge ni uspešno');
            }

            const taskId = response.data.taskId;
            console.log(`   ✓ Naloga načrtovana: ${taskId}`);
            return true;
        });
    }

    async testCommunicationSend() {
        await this.runTest('Communication Send', async () => {
            const response = await axios.post(`${this.baseUrl}/api/communication/send`, {
                channel: 'email',
                message: 'Test sporočilo',
                recipients: ['test@example.com']
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Pošiljanje sporočila ni uspešno');
            }

            const messageId = response.data.messageId;
            console.log(`   ✓ Sporočilo poslano: ${messageId}`);
            return true;
        });
    }

    async testCommunicationContact() {
        await this.runTest('Communication Contact', async () => {
            const response = await axios.post(`${this.baseUrl}/api/communication/contact`, {
                name: 'Test Kontakt',
                email: 'test@example.com',
                phone: '+386 1 234 5678'
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Dodajanje kontakta ni uspešno');
            }

            const contactId = response.data.contactId;
            console.log(`   ✓ Kontakt dodan: ${contactId}`);
            return true;
        });
    }

    async testDataStore() {
        await this.runTest('Data Store', async () => {
            const response = await axios.post(`${this.baseUrl}/api/data/store`, {
                collection: 'test_data',
                data: { name: 'Test', value: 123, timestamp: Date.now() }
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Shranjevanje podatkov ni uspešno');
            }

            const recordId = response.data.recordId;
            console.log(`   ✓ Podatki shranjeni: ${recordId}`);
            return recordId;
        });
    }

    async testDataQuery() {
        await this.runTest('Data Query', async () => {
            const response = await axios.get(`${this.baseUrl}/api/data/query/test_data`);
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Poizvedovanje podatkov ni uspešno');
            }

            const results = response.data.results;
            console.log(`   ✓ Podatki najdeni: ${results.length} zapisov`);
            return true;
        });
    }

    async testDataAnalyze() {
        await this.runTest('Data Analyze', async () => {
            const response = await axios.post(`${this.baseUrl}/api/data/analyze`, {
                collection: 'test_data',
                metrics: ['count', 'average', 'trends']
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Analiza podatkov ni uspešna');
            }

            const analysis = response.data.analysis;
            console.log(`   ✓ Analiza podatkov: ${JSON.stringify(analysis)}`);
            return true;
        });
    }

    async testProductivityTask() {
        await this.runTest('Productivity Task', async () => {
            const response = await axios.post(`${this.baseUrl}/api/productivity/task`, {
                title: 'Test naloga',
                description: 'Opis test naloge',
                priority: 'high',
                dueDate: Date.now() + 86400000
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Ustvarjanje naloge ni uspešno');
            }

            const taskId = response.data.taskId;
            console.log(`   ✓ Naloga ustvarjena: ${taskId}`);
            return true;
        });
    }

    async testProductivityProject() {
        await this.runTest('Productivity Project', async () => {
            const response = await axios.post(`${this.baseUrl}/api/productivity/project`, {
                name: 'Test projekt',
                description: 'Opis test projekta',
                startDate: Date.now(),
                endDate: Date.now() + 2592000000
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Ustvarjanje projekta ni uspešno');
            }

            const projectId = response.data.projectId;
            console.log(`   ✓ Projekt ustvarjen: ${projectId}`);
            return true;
        });
    }

    async testProductivityEvent() {
        await this.runTest('Productivity Event', async () => {
            const response = await axios.post(`${this.baseUrl}/api/productivity/event`, {
                title: 'Test dogodek',
                description: 'Opis test dogodka',
                startTime: Date.now() + 3600000,
                endTime: Date.now() + 7200000
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Načrtovanje dogodka ni uspešno');
            }

            const eventId = response.data.eventId;
            console.log(`   ✓ Dogodek načrtovan: ${eventId}`);
            return true;
        });
    }

    async testCreativityGenerate() {
        await this.runTest('Creativity Generate', async () => {
            const response = await axios.post(`${this.baseUrl}/api/creativity/generate`, {
                type: 'text',
                parameters: { topic: 'Omni sistem', length: 'short' }
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Generiranje vsebine ni uspešno');
            }

            const content = response.data.content;
            console.log(`   ✓ Vsebina generirana (${content.length} znakov)`);
            return true;
        });
    }

    async testCreativityEdit() {
        await this.runTest('Creativity Edit', async () => {
            const response = await axios.post(`${this.baseUrl}/api/creativity/edit`, {
                content: 'Originalna vsebina za urejanje',
                instructions: 'Naredi bolj zanimivo'
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Urejanje vsebine ni uspešno');
            }

            const editedContent = response.data.content;
            console.log(`   ✓ Vsebina urejena (${editedContent.length} znakov)`);
            return true;
        });
    }

    async testCreativityIdeas() {
        await this.runTest('Creativity Ideas', async () => {
            const response = await axios.post(`${this.baseUrl}/api/creativity/ideas`, {
                topic: 'Inovacije v tehnologiji',
                count: 3
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Generiranje idej ni uspešno');
            }

            const ideas = response.data.ideas;
            console.log(`   ✓ ${ideas.length} idej generiranih`);
            return true;
        });
    }

    async testBusinessAnalyze() {
        await this.runTest('Business Analyze', async () => {
            const response = await axios.post(`${this.baseUrl}/api/business/analyze`, {
                dataset: [
                    { sales: 1000, month: 'jan' },
                    { sales: 1200, month: 'feb' },
                    { sales: 1100, month: 'mar' }
                ],
                type: 'sales_analysis'
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Poslovna analiza ni uspešna');
            }

            const analysis = response.data.analysis;
            console.log(`   ✓ Poslovna analiza: ${Object.keys(analysis).length} metrik`);
            return true;
        });
    }

    async testBusinessReport() {
        await this.runTest('Business Report', async () => {
            const response = await axios.post(`${this.baseUrl}/api/business/report`, {
                data: { revenue: 50000, expenses: 30000, profit: 20000 },
                template: { title: 'Mesečno poročilo', type: 'financial' }
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Generiranje poročila ni uspešno');
            }

            const report = response.data.report;
            console.log(`   ✓ Poročilo generirano: ${report.id}`);
            return true;
        });
    }

    async testBusinessKPIs() {
        await this.runTest('Business KPIs', async () => {
            const response = await axios.post(`${this.baseUrl}/api/business/kpis`, {
                kpis: [
                    { name: 'revenue', target: 100000, current: 85000 },
                    { name: 'customers', target: 500, current: 450 }
                ]
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('KPI spremljanje ni uspešno');
            }

            const tracking = response.data.tracking;
            console.log(`   ✓ ${Object.keys(tracking).length} KPI-jev spremljanih`);
            return true;
        });
    }

    async testIoTDevice() {
        await this.runTest('IoT Device', async () => {
            const response = await axios.post(`${this.baseUrl}/api/iot/device`, {
                name: 'Test senzor',
                type: 'temperature',
                location: 'Pisarna',
                capabilities: ['read_temperature', 'read_humidity']
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Registracija naprave ni uspešna');
            }

            const deviceId = response.data.deviceId;
            console.log(`   ✓ Naprava registrirana: ${deviceId}`);
            return deviceId;
        });
    }

    async testIoTControl() {
        await this.runTest('IoT Control', async () => {
            // Najprej registriramo napravo
            const deviceResponse = await axios.post(`${this.baseUrl}/api/iot/device`, {
                name: 'Test aktuator',
                type: 'switch',
                location: 'Dnevna soba'
            });

            const deviceId = deviceResponse.data.deviceId;

            const response = await axios.post(`${this.baseUrl}/api/iot/control/${deviceId}`, {
                command: 'turn_on',
                parameters: { brightness: 80 }
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Upravljanje naprave ni uspešno');
            }

            const result = response.data.result;
            console.log(`   ✓ Naprava upravljana: ${JSON.stringify(result)}`);
            return true;
        });
    }

    async testIoTSensor() {
        await this.runTest('IoT Sensor', async () => {
            // Najprej registriramo senzor
            const sensorResponse = await axios.post(`${this.baseUrl}/api/iot/device`, {
                name: 'Test senzor',
                type: 'sensor',
                location: 'Zunaj'
            });

            const sensorId = sensorResponse.data.deviceId;

            const response = await axios.get(`${this.baseUrl}/api/iot/sensor/${sensorId}`);
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Branje senzorja ni uspešno');
            }

            const reading = response.data.reading;
            console.log(`   ✓ Senzor prebran: ${reading.value} ${reading.unit || ''}`);
            return true;
        });
    }

    async testHealthMetrics() {
        await this.runTest('Health Metrics', async () => {
            const response = await axios.get(`${this.baseUrl}/api/health/metrics`);
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Pridobivanje metrik ni uspešno');
            }

            const metrics = response.data.metrics;
            console.log(`   ✓ Metrike pridobljene: CPU ${metrics.cpu}%, Memory ${metrics.memory}%`);
            return true;
        });
    }

    async testHealthCheck() {
        await this.runTest('Health Check', async () => {
            const response = await axios.get(`${this.baseUrl}/api/health/check`);
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Preverjanje zdravja ni uspešno');
            }

            const health = response.data.health;
            console.log(`   ✓ Zdravje sistema: ${health.status}`);
            return true;
        });
    }

    async testHealthHeal() {
        await this.runTest('Health Heal', async () => {
            const response = await axios.post(`${this.baseUrl}/api/health/heal`);
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Samodejno zdravljenje ni uspešno');
            }

            console.log('   ✓ Samodejno zdravljenje izvedeno');
            return true;
        });
    }

    async testWebSocketConnection() {
        return new Promise((resolve) => {
            this.runTest('WebSocket Connection', async () => {
                const ws = new WebSocket(this.wsUrl);
                
                ws.on('open', () => {
                    console.log('   ✓ WebSocket povezava uspešna');
                    ws.close();
                    resolve(true);
                });

                ws.on('error', (error) => {
                    throw new Error(`WebSocket napaka: ${error.message}`);
                });

                setTimeout(() => {
                    ws.close();
                    throw new Error('WebSocket timeout');
                }, 5000);
            });
        });
    }

    async testWebSocketAI() {
        return new Promise((resolve) => {
            this.runTest('WebSocket AI', async () => {
                const ws = new WebSocket(this.wsUrl);
                
                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        type: 'ai_chat',
                        message: 'Test sporočilo za AI',
                        context: {}
                    }));
                });

                ws.on('message', (data) => {
                    const response = JSON.parse(data);
                    if (response.type === 'ai_response') {
                        console.log('   ✓ WebSocket AI odgovor prejet');
                        ws.close();
                        resolve(true);
                    }
                });

                ws.on('error', (error) => {
                    throw new Error(`WebSocket AI napaka: ${error.message}`);
                });

                setTimeout(() => {
                    ws.close();
                    throw new Error('WebSocket AI timeout');
                }, 5000);
            });
        });
    }

    async testUniversalExecute() {
        await this.runTest('Universal Execute', async () => {
            const response = await axios.post(`${this.baseUrl}/api/universal/execute`, {
                module: 'ai',
                function: 'process',
                parameters: 'Test univerzalni klic'
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Univerzalno izvajanje ni uspešno');
            }

            const result = response.data.result;
            console.log(`   ✓ Univerzalni klic uspešen: ${result.intent}`);
            return true;
        });
    }

    async testFileUpload() {
        await this.runTest('File Upload', async () => {
            const response = await axios.post(`${this.baseUrl}/api/files/upload`, {
                filename: 'test.txt',
                content: 'Test vsebina datoteke',
                type: 'text'
            });
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Nalaganje datoteke ni uspešno');
            }

            const filepath = response.data.filepath;
            console.log(`   ✓ Datoteka naložena: ${filepath}`);
            return true;
        });
    }

    async testFileDownload() {
        await this.runTest('File Download', async () => {
            const response = await axios.get(`${this.baseUrl}/api/files/download/test.txt`);
            
            if (response.status !== 200 || !response.data.success) {
                throw new Error('Prenašanje datoteke ni uspešno');
            }

            const content = response.data.content;
            console.log(`   ✓ Datoteka prenesena (${content.length} znakov)`);
            return true;
        });
    }

    async runTest(testName, testFunction) {
        this.totalTests++;
        console.log(`\n🧪 ${testName}:`);
        
        try {
            const result = await testFunction();
            this.passedTests++;
            this.testResults.push({
                name: testName,
                status: 'PASSED',
                result: result,
                timestamp: new Date().toISOString()
            });
            console.log(`   ✅ ${testName} - USPEŠNO`);
        } catch (error) {
            this.failedTests++;
            this.testResults.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            console.log(`   ❌ ${testName} - NEUSPEŠNO: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 OMNI REAL TEST - KONČNO POROČILO');
        console.log('='.repeat(60));
        
        const successRate = Math.round((this.passedTests / this.totalTests) * 100);
        
        console.log(`📈 Skupno testov: ${this.totalTests}`);
        console.log(`✅ Uspešnih: ${this.passedTests}`);
        console.log(`❌ Neuspešnih: ${this.failedTests}`);
        console.log(`🎯 Uspešnost: ${successRate}%`);
        
        if (successRate >= 90) {
            console.log('\n🏆 ODLIČEN REZULTAT - Sistem je pripravljen za produkcijo!');
        } else if (successRate >= 80) {
            console.log('\n✅ DOBER REZULTAT - Sistem je večinoma funkcionalen');
        } else if (successRate >= 70) {
            console.log('\n⚠️  ZADOVOLJIV REZULTAT - Potrebne so izboljšave');
        } else {
            console.log('\n❌ NEZADOVOLJIV REZULTAT - Potrebne so večje popravke');
        }

        // Shranimo poročilo
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            failedTests: this.failedTests,
            successRate: successRate,
            results: this.testResults
        };

        require('fs').writeFileSync('omni-real-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Poročilo shranjeno v: omni-real-test-report.json');
        
        console.log('\n🚀 OMNI UNIVERSAL SYSTEM - REALNO TESTIRANJE KONČANO');
    }
}

// Zagon testov
if (require.main === module) {
    const tester = new OmniRealTester();
    tester.runAllTests().catch(console.error);
}

module.exports = OmniRealTester;