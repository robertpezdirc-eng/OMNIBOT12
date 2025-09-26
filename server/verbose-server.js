console.log('=== VERBOSE SERVER START ===');
console.log('Čas zagona:', new Date().toISOString());

try {
    console.log('1. Nalagam osnovne module...');
    const http = require('http');
    const express = require('express');
    const cors = require('cors');
    console.log('✓ Osnovni moduli naloženi');

    console.log('2. Ustvarjam Express aplikacijo...');
    const app = express();
    console.log('✓ Express aplikacija ustvarjena');

    console.log('3. Konfiguriram middleware...');
    app.use(cors());
    app.use(express.json());
    console.log('✓ Middleware konfiguriran');

    console.log('4. Definiram poti...');
    
    app.get('/', (req, res) => {
        console.log('Zahteva na / pot');
        res.json({ 
            message: 'Verbose Server deluje!', 
            timestamp: new Date().toISOString(),
            status: 'OK'
        });
    });

    app.get('/health', (req, res) => {
        console.log('Zahteva na /health pot');
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    });

    app.get('/api/test', (req, res) => {
        console.log('Zahteva na /api/test pot');
        res.json({ 
            test: 'uspešen', 
            data: { id: 1, name: 'Test podatek' },
            timestamp: new Date().toISOString()
        });
    });

    console.log('✓ Poti definirane');

    const PORT = process.env.PORT || 3001;
    console.log('5. Zagon strežnika na portu:', PORT);

    const server = app.listen(PORT, () => {
        console.log('✓ STREŽNIK USPEŠNO ZAGNAN!');
        console.log(`🚀 Strežnik posluša na http://localhost:${PORT}`);
        console.log('📊 Dostopne poti:');
        console.log('   - GET / (osnovna pot)');
        console.log('   - GET /health (zdravje strežnika)');
        console.log('   - GET /api/test (test API)');
        console.log('=== VERBOSE SERVER READY ===');
    });

    server.on('error', (error) => {
        console.error('❌ NAPAKA PRI ZAGONU STREŽNIKA:', error);
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} je že v uporabi!`);
        }
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('📴 Prejel SIGTERM, zaustavlja strežnik...');
        server.close(() => {
            console.log('✓ Strežnik zaustavljen');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('📴 Prejel SIGINT (Ctrl+C), zaustavlja strežnik...');
        server.close(() => {
            console.log('✓ Strežnik zaustavljen');
            process.exit(0);
        });
    });

} catch (error) {
    console.error('❌ KRITIČNA NAPAKA:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}

console.log('=== VERBOSE SERVER SCRIPT END ===');