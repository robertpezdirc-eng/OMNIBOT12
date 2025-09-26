// 🔹 TEST SCENARIJI WEBSOCKET - NAPREDNI TESTI Z SIMULACIJAMI
const WebSocket = require('ws');
const colors = require('colors');

class WebSocketTestScenarios {
    constructor(wsURL = 'ws://localhost:3001') {
        this.wsURL = wsURL;
        this.testResults = [];
        this.debugMode = process.env.DEBUG_WS_TESTS === 'true';
        this.connections = new Map();
        
        console.log('🚀 WebSocket Test Scenariji inicializirani'.cyan.bold);
        console.log(`📍 WebSocket URL: ${this.wsURL}`.yellow);
        console.log(`🐛 Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`.magenta);
    }

    // 🔹 DEBUG LOGGING
    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`🐛 [WS DEBUG] ${message}`.gray);
            if (data) {
                console.log(JSON.stringify(data, null, 2).gray);
            }
        }
    }

    // 🔹 REZULTAT TESTA
    logTestResult(testName, success, message, data = null) {
        const result = {
            test: testName,
            success,
            message,
            timestamp: new Date().toISOString(),
            data
        };
        
        this.testResults.push(result);
        
        const status = success ? '✅ PASS'.green : '❌ FAIL'.red;
        console.log(`${status} ${testName}: ${message}`);
        
        if (data && this.debugMode) {
            console.log('📊 WebSocket Data:'.cyan);
            console.log(JSON.stringify(data, null, 2).gray);
        }
    }

    // 🔹 USTVARI WEBSOCKET POVEZAVO
    async createConnection(connectionId = 'default') {
        return new Promise((resolve, reject) => {
            try {
                this.debugLog(`Creating WebSocket connection: ${connectionId}`);
                
                const ws = new WebSocket(this.wsURL);
                const connectionData = {
                    ws,
                    id: connectionId,
                    connected: false,
                    messages: [],
                    errors: []
                };
                
                ws.on('open', () => {
                    this.debugLog(`WebSocket connected: ${connectionId}`);
                    connectionData.connected = true;
                    this.connections.set(connectionId, connectionData);
                    resolve(connectionData);
                });
                
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    this.debugLog(`Message received on ${connectionId}`, message);
                    connectionData.messages.push({
                        timestamp: Date.now(),
                        data: message
                    });
                });
                
                ws.on('error', (error) => {
                    this.debugLog(`WebSocket error on ${connectionId}`, error);
                    connectionData.errors.push({
                        timestamp: Date.now(),
                        error: error.message
                    });
                });
                
                ws.on('close', () => {
                    this.debugLog(`WebSocket closed: ${connectionId}`);
                    connectionData.connected = false;
                });
                
                // Timeout za povezavo
                setTimeout(() => {
                    if (!connectionData.connected) {
                        reject(new Error(`Connection timeout for ${connectionId}`));
                    }
                }, 5000);
                
            } catch (error) {
                this.debugLog(`Error creating connection ${connectionId}`, error);
                reject(error);
            }
        });
    }

    // 🔹 TEST 1: OSNOVNA POVEZAVA
    async testBasicConnection() {
        console.log('\n🔌 Testing Basic WebSocket Connection...'.blue.bold);
        
        try {
            const connection = await this.createConnection('basic-test');
            
            if (connection.connected) {
                this.logTestResult('Basic Connection', true, 'WebSocket povezava uspešna');
                return true;
            } else {
                this.logTestResult('Basic Connection', false, 'WebSocket povezava neuspešna');
                return false;
            }
        } catch (error) {
            this.debugLog('Basic connection error', error);
            this.logTestResult('Basic Connection', false, `Napaka: ${error.message}`);
            return false;
        }
    }

    // 🔹 TEST 2: PING/PONG TEST
    async testPingPong() {
        console.log('\n🏓 Testing Ping/Pong...'.blue.bold);
        
        try {
            const connection = this.connections.get('basic-test') || await this.createConnection('ping-test');
            
            if (!connection.connected) {
                this.logTestResult('Ping/Pong', false, 'Ni aktivne WebSocket povezave');
                return false;
            }
            
            const pingData = {
                type: 'ping',
                timestamp: Date.now(),
                testId: 'ping-test-' + Math.random().toString(36).substr(2, 9)
            };
            
            this.debugLog('Sending ping', pingData);
            connection.ws.send(JSON.stringify(pingData));
            
            // Čakaj na pong odgovor
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    this.logTestResult('Ping/Pong', false, 'Pong odgovor ni prejel v 5s');
                    resolve(false);
                }, 5000);
                
                const checkForPong = () => {
                    const pongMessage = connection.messages.find(msg => 
                        msg.data.type === 'pong' && msg.data.testId === pingData.testId
                    );
                    
                    if (pongMessage) {
                        clearTimeout(timeout);
                        const latency = Date.now() - pingData.timestamp;
                        this.logTestResult('Ping/Pong', true, `Pong prejel v ${latency}ms`, {
                            latency,
                            pingData,
                            pongData: pongMessage.data
                        });
                        resolve(true);
                    } else {
                        setTimeout(checkForPong, 100);
                    }
                };
                
                checkForPong();
            });
            
        } catch (error) {
            this.debugLog('Ping/Pong error', error);
            this.logTestResult('Ping/Pong', false, `Napaka: ${error.message}`);
            return false;
        }
    }

    // 🔹 TEST 3: LICENSE UPDATE SIMULACIJA
    async testLicenseUpdateSimulation() {
        console.log('\n📄 Testing License Update Simulation...'.blue.bold);
        
        try {
            const connection = this.connections.get('basic-test') || await this.createConnection('license-test');
            
            if (!connection.connected) {
                this.logTestResult('License Update', false, 'Ni aktivne WebSocket povezave');
                return false;
            }
            
            const licenseUpdateData = {
                type: 'license_update',
                clientId: 'test-client-' + Date.now(),
                licenseKey: 'test-license-' + Math.random().toString(36).substr(2, 16),
                status: 'active',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                features: ['api_access', 'websocket', 'analytics'],
                timestamp: Date.now()
            };
            
            this.debugLog('Sending license update', licenseUpdateData);
            connection.ws.send(JSON.stringify(licenseUpdateData));
            
            // Čakaj na potrditev
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    this.logTestResult('License Update', false, 'License update potrditev ni prejel v 5s');
                    resolve(false);
                }, 5000);
                
                const checkForAck = () => {
                    const ackMessage = connection.messages.find(msg => 
                        msg.data.type === 'license_update_ack' && 
                        msg.data.clientId === licenseUpdateData.clientId
                    );
                    
                    if (ackMessage) {
                        clearTimeout(timeout);
                        this.logTestResult('License Update', true, 'License update uspešno poslan in potrjen', {
                            sent: licenseUpdateData,
                            ack: ackMessage.data
                        });
                        resolve(true);
                    } else {
                        setTimeout(checkForAck, 100);
                    }
                };
                
                checkForAck();
            });
            
        } catch (error) {
            this.debugLog('License update error', error);
            this.logTestResult('License Update', false, `Napaka: ${error.message}`);
            return false;
        }
    }

    // 🔹 TEST 4: MULTIPLE CONNECTIONS
    async testMultipleConnections() {
        console.log('\n🔗 Testing Multiple Connections...'.blue.bold);
        
        const connectionCount = 5;
        const connections = [];
        
        try {
            this.debugLog(`Creating ${connectionCount} connections`);
            
            for (let i = 0; i < connectionCount; i++) {
                const connection = await this.createConnection(`multi-${i}`);
                connections.push(connection);
            }
            
            const connectedCount = connections.filter(c => c.connected).length;
            
            if (connectedCount === connectionCount) {
                this.logTestResult('Multiple Connections', true, 
                    `Vseh ${connectionCount} povezav uspešnih`, 
                    { connectedCount, totalCount: connectionCount }
                );
                return true;
            } else {
                this.logTestResult('Multiple Connections', false, 
                    `Samo ${connectedCount}/${connectionCount} povezav uspešnih`,
                    { connectedCount, totalCount: connectionCount }
                );
                return false;
            }
            
        } catch (error) {
            this.debugLog('Multiple connections error', error);
            this.logTestResult('Multiple Connections', false, `Napaka: ${error.message}`);
            return false;
        }
    }

    // 🔹 TEST 5: MESSAGE BROADCASTING
    async testMessageBroadcasting() {
        console.log('\n📢 Testing Message Broadcasting...'.blue.bold);
        
        try {
            // Uporabi obstoječe povezave ali ustvari nove
            const connectionIds = ['broadcast-1', 'broadcast-2', 'broadcast-3'];
            const connections = [];
            
            for (const id of connectionIds) {
                const connection = this.connections.get(id) || await this.createConnection(id);
                connections.push(connection);
            }
            
            const broadcastMessage = {
                type: 'broadcast',
                message: 'Test broadcast message',
                timestamp: Date.now(),
                broadcastId: 'broadcast-' + Math.random().toString(36).substr(2, 9)
            };
            
            this.debugLog('Sending broadcast message', broadcastMessage);
            
            // Pošlji sporočilo iz prve povezave
            connections[0].ws.send(JSON.stringify(broadcastMessage));
            
            // Čakaj, da vse povezave prejmejo sporočilo
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    const receivedCount = connections.filter(conn => 
                        conn.messages.some(msg => msg.data.broadcastId === broadcastMessage.broadcastId)
                    ).length;
                    
                    this.logTestResult('Message Broadcasting', false, 
                        `Broadcast timeout - samo ${receivedCount}/${connections.length} povezav prejelo sporočilo`
                    );
                    resolve(false);
                }, 5000);
                
                const checkBroadcast = () => {
                    const receivedCount = connections.filter(conn => 
                        conn.messages.some(msg => msg.data.broadcastId === broadcastMessage.broadcastId)
                    ).length;
                    
                    if (receivedCount === connections.length) {
                        clearTimeout(timeout);
                        this.logTestResult('Message Broadcasting', true, 
                            `Broadcast uspešen - vseh ${connections.length} povezav prejelo sporočilo`,
                            { broadcastMessage, receivedCount }
                        );
                        resolve(true);
                    } else {
                        setTimeout(checkBroadcast, 100);
                    }
                };
                
                checkBroadcast();
            });
            
        } catch (error) {
            this.debugLog('Message broadcasting error', error);
            this.logTestResult('Message Broadcasting', false, `Napaka: ${error.message}`);
            return false;
        }
    }

    // 🔹 TEST 6: CONNECTION STABILITY
    async testConnectionStability() {
        console.log('\n🔒 Testing Connection Stability...'.blue.bold);
        
        try {
            const connection = this.connections.get('basic-test') || await this.createConnection('stability-test');
            
            if (!connection.connected) {
                this.logTestResult('Connection Stability', false, 'Ni aktivne WebSocket povezave');
                return false;
            }
            
            const messageCount = 50;
            const messages = [];
            
            this.debugLog(`Sending ${messageCount} messages for stability test`);
            
            // Pošlji več sporočil
            for (let i = 0; i < messageCount; i++) {
                const message = {
                    type: 'stability_test',
                    messageId: i,
                    timestamp: Date.now(),
                    data: `Test message ${i}`
                };
                
                connection.ws.send(JSON.stringify(message));
                messages.push(message);
                
                // Kratka pavza med sporočili
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Čakaj na odgovore
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    const receivedCount = connection.messages.filter(msg => 
                        msg.data.type === 'stability_test_ack'
                    ).length;
                    
                    const successRate = (receivedCount / messageCount) * 100;
                    
                    if (successRate >= 95) {
                        this.logTestResult('Connection Stability', true, 
                            `Stabilnost ${successRate.toFixed(1)}% (${receivedCount}/${messageCount})`,
                            { successRate, receivedCount, sentCount: messageCount }
                        );
                        resolve(true);
                    } else {
                        this.logTestResult('Connection Stability', false, 
                            `Nizka stabilnost ${successRate.toFixed(1)}% (${receivedCount}/${messageCount})`,
                            { successRate, receivedCount, sentCount: messageCount }
                        );
                        resolve(false);
                    }
                }, 10000);
                
                // Ne potrebujemo dodatnega preverjanja, timeout bo obravnaval rezultat
            });
            
        } catch (error) {
            this.debugLog('Connection stability error', error);
            this.logTestResult('Connection Stability', false, `Napaka: ${error.message}`);
            return false;
        }
    }

    // 🔹 ZAPRI VSE POVEZAVE
    closeAllConnections() {
        this.debugLog('Closing all WebSocket connections');
        
        for (const [id, connection] of this.connections) {
            if (connection.connected) {
                connection.ws.close();
                this.debugLog(`Closed connection: ${id}`);
            }
        }
        
        this.connections.clear();
    }

    // 🔹 ZAGON VSEH TESTOV
    async runAllTests() {
        console.log('\n🎯 ZAGON VSEH WEBSOCKET TESTOV'.rainbow.bold);
        console.log('='.repeat(50).cyan);
        
        const startTime = Date.now();
        
        try {
            // Test 1: Basic Connection
            const basicOk = await this.testBasicConnection();
            
            if (basicOk) {
                // Test 2: Ping/Pong
                await this.testPingPong();
                
                // Test 3: License Update
                await this.testLicenseUpdateSimulation();
                
                // Test 4: Multiple Connections
                await this.testMultipleConnections();
                
                // Test 5: Message Broadcasting
                await this.testMessageBroadcasting();
                
                // Test 6: Connection Stability
                await this.testConnectionStability();
            }
            
        } catch (error) {
            console.error('💥 Kritična napaka pri WebSocket testiranju:'.red.bold, error);
        } finally {
            // Zapri vse povezave
            this.closeAllConnections();
        }
        
        // Povzetek rezultatov
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n📊 POVZETEK WEBSOCKET TESTOV'.rainbow.bold);
        console.log('='.repeat(50).cyan);
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`⏱️  Čas izvajanja: ${duration}ms`.yellow);
        console.log(`📈 Skupaj testov: ${totalTests}`.blue);
        console.log(`✅ Uspešni: ${passedTests}`.green);
        console.log(`❌ Neuspešni: ${failedTests}`.red);
        console.log(`📊 Uspešnost: ${((passedTests/totalTests)*100).toFixed(1)}%`.cyan);
        
        // Shrani rezultate
        const resultsFile = `test-results-websocket-${Date.now()}.json`;
        require('fs').writeFileSync(resultsFile, JSON.stringify({
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: ((passedTests/totalTests)*100).toFixed(1),
                duration,
                timestamp: new Date().toISOString()
            },
            results: this.testResults
        }, null, 2));
        
        console.log(`💾 Rezultati shranjeni v: ${resultsFile}`.magenta);
        
        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: ((passedTests/totalTests)*100).toFixed(1),
            duration
        };
    }
}

// 🔹 ZAGON TESTOV
if (require.main === module) {
    const tester = new WebSocketTestScenarios();
    
    // Nastavi debug mode iz argumentov
    if (process.argv.includes('--debug')) {
        process.env.DEBUG_WS_TESTS = 'true';
    }
    
    tester.runAllTests()
        .then(results => {
            console.log('\n🎉 WebSocket testi končani!'.green.bold);
            process.exit(results.failedTests > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('💥 Kritična napaka pri testiranju:'.red.bold, error);
            process.exit(1);
        });
}

module.exports = WebSocketTestScenarios;