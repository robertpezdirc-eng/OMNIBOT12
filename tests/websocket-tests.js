// 🔹 Omni Ultimate Turbo Flow System - WebSocket Tests
// Testi za WebSocket Layer in real-time funkcionalnost

const io = require('socket.io-client');
const colors = require('colors');

// 🎨 Barvni sistem za teste
const testColors = {
    info: colors.cyan,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    header: colors.magenta.bold,
    subheader: colors.blue.bold
};

class OmniWebSocketTester {
    constructor(serverURL = 'http://localhost:3001') {
        this.serverURL = serverURL;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        this.sockets = [];
        
        console.log(testColors.header('🔹 Omni Ultimate Turbo Flow System - WebSocket Tester'));
        console.log(testColors.info(`🌐 Server URL: ${serverURL}`));
        console.log('');
    }

    // 🔧 Pomožne funkcije
    createSocket(options = {}) {
        const socket = io(this.serverURL, {
            transports: ['websocket'],
            timeout: 5000,
            ...options
        });
        
        this.sockets.push(socket);
        return socket;
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

    // 🔗 Connection Tests
    async testConnection() {
        console.log(testColors.subheader('\n🔗 Connection Tests'));
        
        return new Promise((resolve) => {
            const socket = this.createSocket();
            let connected = false;
            
            const timeout = setTimeout(() => {
                if (!connected) {
                    this.logTest('WebSocket Connection', false, 'Connection timeout');
                    socket.disconnect();
                    resolve();
                }
            }, 5000);
            
            socket.on('connect', () => {
                connected = true;
                clearTimeout(timeout);
                this.logTest('WebSocket Connection', true, `Socket ID: ${socket.id}`);
                
                // Test disconnect
                socket.on('disconnect', (reason) => {
                    this.logTest('WebSocket Disconnection', true, `Reason: ${reason}`);
                    resolve();
                });
                
                socket.disconnect();
            });
            
            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                this.logTest('WebSocket Connection', false, `Error: ${error.message}`);
                resolve();
            });
        });
    }

    // 💓 Heartbeat Tests
    async testHeartbeat() {
        console.log(testColors.subheader('\n💓 Heartbeat Tests'));
        
        return new Promise((resolve) => {
            const socket = this.createSocket();
            let heartbeatReceived = false;
            
            const timeout = setTimeout(() => {
                this.logTest('Heartbeat Mechanism', heartbeatReceived, 
                    heartbeatReceived ? 'Heartbeat working' : 'No heartbeat received');
                socket.disconnect();
                resolve();
            }, 10000);
            
            socket.on('connect', () => {
                console.log(testColors.info('   Connected, waiting for heartbeat...'));
                
                // Poslušaj za heartbeat
                socket.on('heartbeat', (data) => {
                    heartbeatReceived = true;
                    console.log(testColors.info(`   Heartbeat received: ${JSON.stringify(data)}`));
                });
                
                // Pošlji ping
                socket.emit('ping', { timestamp: Date.now() });
                
                socket.on('pong', (data) => {
                    const latency = Date.now() - data.timestamp;
                    this.logTest('Ping-Pong Mechanism', true, `Latency: ${latency}ms`);
                });
            });
            
            socket.on('connect_error', () => {
                clearTimeout(timeout);
                this.logTest('Heartbeat Mechanism', false, 'Connection failed');
                resolve();
            });
        });
    }

    // 🏠 Room Management Tests
    async testRoomManagement() {
        console.log(testColors.subheader('\n🏠 Room Management Tests'));
        
        return new Promise((resolve) => {
            const socket1 = this.createSocket();
            const socket2 = this.createSocket();
            let testsCompleted = 0;
            
            const checkCompletion = () => {
                testsCompleted++;
                if (testsCompleted >= 2) {
                    socket1.disconnect();
                    socket2.disconnect();
                    resolve();
                }
            };
            
            socket1.on('connect', () => {
                // Pridruži se demo sobi
                socket1.emit('join_license_room', { license_type: 'demo' });
                
                socket1.on('room_joined', (data) => {
                    this.logTest('Join Demo Room', true, `Room: ${data.room}`);
                    checkCompletion();
                });
                
                socket1.on('room_error', (error) => {
                    this.logTest('Join Demo Room', false, `Error: ${error.message}`);
                    checkCompletion();
                });
            });
            
            socket2.on('connect', () => {
                // Pridruži se premium sobi
                socket2.emit('join_license_room', { license_type: 'premium' });
                
                socket2.on('room_joined', (data) => {
                    this.logTest('Join Premium Room', true, `Room: ${data.room}`);
                    checkCompletion();
                });
                
                socket2.on('room_error', (error) => {
                    this.logTest('Join Premium Room', false, `Error: ${error.message}`);
                    checkCompletion();
                });
            });
            
            // Timeout varovalka
            setTimeout(() => {
                if (testsCompleted < 2) {
                    this.logTest('Room Management Timeout', false, 'Tests did not complete in time');
                    socket1.disconnect();
                    socket2.disconnect();
                    resolve();
                }
            }, 10000);
        });
    }

    // 🔐 Authentication Tests
    async testAuthentication() {
        console.log(testColors.subheader('\n🔐 Authentication Tests'));
        
        return new Promise((resolve) => {
            // Test z veljavnim JWT
            const validSocket = this.createSocket({
                auth: {
                    token: 'valid-jwt-token-here' // V resničnem testu bi uporabil pravi JWT
                }
            });
            
            // Test brez avtentifikacije
            const invalidSocket = this.createSocket();
            
            let testsCompleted = 0;
            
            const checkCompletion = () => {
                testsCompleted++;
                if (testsCompleted >= 2) {
                    validSocket.disconnect();
                    invalidSocket.disconnect();
                    resolve();
                }
            };
            
            validSocket.on('connect', () => {
                this.logTest('Valid Authentication', true, 'Connected with valid token');
                checkCompletion();
            });
            
            validSocket.on('connect_error', (error) => {
                this.logTest('Valid Authentication', false, `Error: ${error.message}`);
                checkCompletion();
            });
            
            invalidSocket.on('connect', () => {
                // Poskusi dostopati do zaščitene funkcije
                invalidSocket.emit('get_license_stats');
                
                invalidSocket.on('auth_required', () => {
                    this.logTest('Authentication Required', true, 'Properly rejected unauthorized access');
                    checkCompletion();
                });
                
                // Če ni zaščiteno, je to napaka
                invalidSocket.on('license_stats', () => {
                    this.logTest('Authentication Required', false, 'Unauthorized access allowed');
                    checkCompletion();
                });
            });
            
            // Timeout
            setTimeout(() => {
                if (testsCompleted < 2) {
                    this.logTest('Authentication Tests Timeout', false, 'Tests did not complete');
                    validSocket.disconnect();
                    invalidSocket.disconnect();
                    resolve();
                }
            }, 8000);
        });
    }

    // 📡 License Event Tests
    async testLicenseEvents() {
        console.log(testColors.subheader('\n📡 License Event Tests'));
        
        return new Promise((resolve) => {
            const socket = this.createSocket();
            let eventsReceived = 0;
            
            socket.on('connect', () => {
                // Poslušaj za različne license evente
                socket.on('license_created', (data) => {
                    eventsReceived++;
                    this.logTest('License Created Event', true, `Client: ${data.client_id}, Type: ${data.license_type}`);
                });
                
                socket.on('license_updated', (data) => {
                    eventsReceived++;
                    this.logTest('License Updated Event', true, `License: ${data.license_key?.substring(0, 20)}...`);
                });
                
                socket.on('license_expired', (data) => {
                    eventsReceived++;
                    this.logTest('License Expired Event', true, `License: ${data.license_key?.substring(0, 20)}...`);
                });
                
                socket.on('license_deleted', (data) => {
                    eventsReceived++;
                    this.logTest('License Deleted Event', true, `License: ${data.license_key?.substring(0, 20)}...`);
                });
                
                // Simuliraj license evente
                socket.emit('simulate_license_event', {
                    type: 'license_created',
                    data: {
                        client_id: 'test-client',
                        license_type: 'demo',
                        license_key: 'test-key-12345'
                    }
                });
                
                socket.emit('simulate_license_event', {
                    type: 'license_updated',
                    data: {
                        license_key: 'test-key-12345',
                        status: 'active'
                    }
                });
            });
            
            // Preveri rezultate po 5 sekundah
            setTimeout(() => {
                this.logTest('License Events Reception', eventsReceived > 0, `Received ${eventsReceived} events`);
                socket.disconnect();
                resolve();
            }, 5000);
        });
    }

    // 📊 Performance Tests
    async testPerformance() {
        console.log(testColors.subheader('\n📊 Performance Tests'));
        
        return new Promise((resolve) => {
            const sockets = [];
            const maxConnections = 50;
            let connectedCount = 0;
            
            const startTime = Date.now();
            
            // Ustvari več sočasnih povezav
            for (let i = 0; i < maxConnections; i++) {
                const socket = this.createSocket();
                sockets.push(socket);
                
                socket.on('connect', () => {
                    connectedCount++;
                    
                    if (connectedCount === maxConnections) {
                        const endTime = Date.now();
                        const duration = endTime - startTime;
                        
                        this.logTest('Multiple Connections Performance', 
                            duration < 10000 && connectedCount === maxConnections,
                            `${connectedCount}/${maxConnections} connections in ${duration}ms`
                        );
                        
                        // Zapri vse povezave
                        sockets.forEach(s => s.disconnect());
                        resolve();
                    }
                });
                
                socket.on('connect_error', () => {
                    // Ignore connection errors for performance test
                });
            }
            
            // Timeout varovalka
            setTimeout(() => {
                if (connectedCount < maxConnections) {
                    this.logTest('Multiple Connections Performance', false, 
                        `Only ${connectedCount}/${maxConnections} connected`);
                    sockets.forEach(s => s.disconnect());
                    resolve();
                }
            }, 15000);
        });
    }

    // 🔒 Rate Limiting Tests
    async testRateLimiting() {
        console.log(testColors.subheader('\n🔒 Rate Limiting Tests'));
        
        return new Promise((resolve) => {
            const socket = this.createSocket();
            let rateLimited = false;
            
            socket.on('connect', () => {
                // Pošlji veliko zahtev hitro
                for (let i = 0; i < 200; i++) {
                    socket.emit('ping', { id: i });
                }
                
                socket.on('rate_limit_exceeded', () => {
                    rateLimited = true;
                    this.logTest('WebSocket Rate Limiting', true, 'Rate limiting triggered');
                    socket.disconnect();
                    resolve();
                });
                
                // Če ni rate limitinga v 3 sekundah
                setTimeout(() => {
                    if (!rateLimited) {
                        this.logTest('WebSocket Rate Limiting', false, 'No rate limiting detected');
                        socket.disconnect();
                        resolve();
                    }
                }, 3000);
            });
        });
    }

    // 🧹 Cleanup
    cleanup() {
        this.sockets.forEach(socket => {
            if (socket.connected) {
                socket.disconnect();
            }
        });
        this.sockets = [];
    }

    // 🎯 Zaženi vse teste
    async runAllTests() {
        console.log(testColors.header('\n🚀 Začenjam z WebSocket testi...\n'));
        
        try {
            await this.testConnection();
            await this.testHeartbeat();
            await this.testRoomManagement();
            await this.testAuthentication();
            await this.testLicenseEvents();
            await this.testPerformance();
            await this.testRateLimiting();
            
            this.printSummary();
        } catch (error) {
            console.log(testColors.error(`\n❌ Kritična napaka med testiranjem: ${error.message}`));
        } finally {
            this.cleanup();
        }
    }

    // 📊 Izpiši povzetek
    printSummary() {
        console.log(testColors.header('\n📊 POVZETEK WEBSOCKET TESTOV'));
        console.log(testColors.info('═'.repeat(50)));
        console.log(testColors.success(`✅ Uspešni testi: ${this.testResults.passed}`));
        console.log(testColors.error(`❌ Neuspešni testi: ${this.testResults.failed}`));
        console.log(testColors.info(`📊 Skupaj testov: ${this.testResults.total}`));
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(testColors.info(`🎯 Uspešnost: ${successRate}%`));
        
        if (this.testResults.failed === 0) {
            console.log(testColors.success('\n🎉 Vsi WebSocket testi so uspešno opravljeni!'));
        } else {
            console.log(testColors.warning('\n⚠️  Nekateri WebSocket testi niso uspešni. Preveri podrobnosti zgoraj.'));
        }
        
        console.log(testColors.info('═'.repeat(50)));
    }
}

// 🚀 Zaženi teste, če je skripta poklicana direktno
if (require.main === module) {
    const tester = new OmniWebSocketTester();
    
    // Počakaj malo, da se strežnik zagone
    setTimeout(() => {
        tester.runAllTests().catch(console.error);
    }, 3000);
}

module.exports = OmniWebSocketTester;