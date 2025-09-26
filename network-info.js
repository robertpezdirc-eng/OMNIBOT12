// Network Information Utility for LAN Testing
const os = require('os');

function getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const networkInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        addresses: []
    };

    Object.keys(interfaces).forEach(interfaceName => {
        const interfaceInfo = interfaces[interfaceName];
        
        interfaceInfo.forEach(details => {
            if (details.family === 'IPv4' && !details.internal) {
                networkInfo.addresses.push({
                    interface: interfaceName,
                    address: details.address,
                    netmask: details.netmask,
                    mac: details.mac
                });
            }
        });
    });

    return networkInfo;
}

function generateShareableUrls(port = 3001) {
    const networkInfo = getNetworkInfo();
    const urls = [];

    // Add localhost
    urls.push({
        type: 'localhost',
        url: `http://localhost:${port}`,
        description: 'Local development'
    });

    // Add integrated app
    urls.push({
        type: 'integrated',
        url: `http://localhost:${port}/integrated`,
        description: 'Integrated testing app'
    });

    // Add LAN addresses
    networkInfo.addresses.forEach(addr => {
        urls.push({
            type: 'lan',
            url: `http://${addr.address}:${port}`,
            description: `LAN access via ${addr.interface}`,
            interface: addr.interface,
            address: addr.address
        });

        urls.push({
            type: 'lan-integrated',
            url: `http://${addr.address}:${port}/integrated`,
            description: `LAN integrated app via ${addr.interface}`,
            interface: addr.interface,
            address: addr.address
        });
    });

    return urls;
}

function displayNetworkInfo(port = 3001) {
    console.log('\n🌐 NETWORK INFORMATION');
    console.log('='.repeat(50));
    
    const networkInfo = getNetworkInfo();
    console.log(`💻 Hostname: ${networkInfo.hostname}`);
    console.log(`🖥️  Platform: ${networkInfo.platform}`);
    
    console.log('\n📡 Network Interfaces:');
    networkInfo.addresses.forEach(addr => {
        console.log(`   ${addr.interface}: ${addr.address} (${addr.netmask})`);
    });

    console.log('\n🔗 SHAREABLE URLS');
    console.log('='.repeat(50));
    
    const urls = generateShareableUrls(port);
    
    console.log('\n📱 Local Access:');
    urls.filter(u => u.type === 'localhost' || u.type === 'integrated').forEach(url => {
        console.log(`   ${url.description}: ${url.url}`);
    });

    console.log('\n🌍 LAN Access (share with colleagues):');
    urls.filter(u => u.type === 'lan' || u.type === 'lan-integrated').forEach(url => {
        console.log(`   ${url.description}: ${url.url}`);
    });

    console.log('\n📋 TESTING INSTRUCTIONS');
    console.log('='.repeat(50));
    console.log('1. Share any LAN URL with colleagues on the same network');
    console.log('2. Use /integrated for the full testing interface');
    console.log('3. Test all features: AI generation, knowledge base, API endpoints');
    console.log('4. Check connection status in the top-right corner');
    console.log('5. Use the sidebar for quick testing and category selection');
    
    return urls;
}

module.exports = {
    getNetworkInfo,
    generateShareableUrls,
    displayNetworkInfo
};

// If run directly, display network info
if (require.main === module) {
    displayNetworkInfo();
}