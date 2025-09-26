console.log('=== DEBUG TEST START ===');
console.log('Node.js verzija:', process.version);
console.log('Trenutni direktorij:', process.cwd());
console.log('Argumenti:', process.argv);

// Test osnovnih modulov
try {
    console.log('Testiram require("http")...');
    const http = require('http');
    console.log('✓ HTTP modul deluje');
    
    console.log('Testiram require("path")...');
    const path = require('path');
    console.log('✓ PATH modul deluje');
    
    console.log('Testiram require("fs")...');
    const fs = require('fs');
    console.log('✓ FS modul deluje');
    
    // Preverimo, ali obstaja package.json
    console.log('Preverjam package.json...');
    if (fs.existsSync('package.json')) {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        console.log('✓ package.json obstaja');
        console.log('Ime paketa:', pkg.name);
        console.log('Verzija:', pkg.version);
        console.log('Glavne odvisnosti:', Object.keys(pkg.dependencies || {}));
    } else {
        console.log('✗ package.json ne obstaja');
    }
    
    // Preverimo node_modules
    console.log('Preverjam node_modules...');
    if (fs.existsSync('node_modules')) {
        console.log('✓ node_modules obstaja');
        const modules = fs.readdirSync('node_modules').slice(0, 10);
        console.log('Prvih 10 modulov:', modules);
    } else {
        console.log('✗ node_modules ne obstaja');
    }
    
} catch (error) {
    console.error('NAPAKA pri testiranju modulov:', error.message);
}

console.log('=== DEBUG TEST END ===');