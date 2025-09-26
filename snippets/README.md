# 📝 Code Snippets - Omniscient AI Platform

Ready-to-use code snippets za pogoste operacije v Omniscient AI Platform sistemu.

## 🚀 Hitri začetek

```javascript
// Uvozi snippets
const { licenseSnippets, getSnippet, displaySnippets } = require('./licenseOperations');

// Prikaži vse razpoložljive snippets
displaySnippets();

// Pridobi specifičen snippet
const createSnippet = getSnippet('createLicense');
console.log(createSnippet.code);
```

## 📋 Razpoložljivi Snippets

### 1. 🆕 Create New License
**Namen:** Ustvari novo licenco z validacijo in privzetimi vrednostmi
**Uporaba:** Hitro ustvarjanje licenc z vsemi potrebnimi polji

```javascript
const result = await createNewLicense({
    userId: new ObjectId('...'),
    productId: 'omniscient-ai-premium',
    licenseType: 'premium',
    maxActivations: 3,
    features: ['advanced-ai', 'priority-support']
});
```

### 2. ⏰ Extend License Expiry
**Namen:** Podaljša veljavnost licenc (batch operacija)
**Uporaba:** Množično podaljševanje licenc

```javascript
// Podaljšaj več licenc hkrati
await extendLicenses(['id1', 'id2', 'id3'], 12); // 12 mesecev
```

### 3. ❌ Cancel/Revoke License
**Namen:** Varno prekliče licence z ustreznim čiščenjem
**Uporaba:** Preklic licenc z avtomatskim čiščenjem sej

```javascript
await cancelLicenses(['license_id'], 'user_request');
```

### 4. ✅ Activate License
**Namen:** Aktivira licenco z sledenjem naprav
**Uporaba:** Aktivacija licenc na specifičnih napravah

```javascript
const result = await activateLicense('OAI-LICENSE-KEY', {
    deviceId: 'user-laptop-001',
    deviceName: 'John\'s MacBook Pro',
    platform: 'macOS'
});
```

### 5. 📊 License Statistics
**Namen:** Generira celovite statistike licenc
**Uporaba:** Analitika in poročila o licencah

```javascript
const stats = await getLicenseStatistics({
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});
```

### 6. 🔄 Bulk License Operations
**Namen:** Učinkovite množične operacije
**Uporaba:** Batch operacije za več licenc hkrati

```javascript
const operations = [
    { type: 'create', data: { userId: new ObjectId('...') } },
    { type: 'update', id: 'license_id', data: { status: 'active' } },
    { type: 'extend', id: 'license_id', months: 6 }
];

await bulkLicenseOperations(operations);
```

### 7. ✔️ Validate License
**Namen:** Celovita validacija licenc
**Uporaba:** Preverjanje veljavnosti licenc z detajlnimi preverjanji

```javascript
const validation = await validateLicense('OAI-LICENSE-KEY', 'device-123');
if (validation.isValid) {
    console.log('License is valid');
}
```

## 🛠️ Utility Funkcije

### displaySnippets()
Prikaže vse razpoložljive snippets z opisi

### getSnippet(name)
Pridobi specifičen snippet po imenu

### searchSnippets(query)
Išče snippets po ključnih besedah

### getAllSnippets()
Vrne vse snippets kot array

## 📁 Struktura Snippet-a

Vsak snippet vsebuje:
- **name**: Ime snippet-a
- **description**: Opis funkcionalnosti
- **code**: Izvorna koda (ready-to-use)
- **usage**: Primeri uporabe

## 🔧 Integracija v Projekt

### 1. Uvoz v Server
```javascript
// server-modular.js
const { licenseSnippets } = require('./snippets/licenseOperations');

// Uporabi snippet funkcionalnost
app.post('/api/licenses/bulk-create', async (req, res) => {
    // Uporabi createNewLicense snippet
    const results = [];
    for (const licenseData of req.body.licenses) {
        const result = await createNewLicense(licenseData);
        results.push(result);
    }
    res.json({ results });
});
```

### 2. Uporaba v Admin Panel
```javascript
// admin-panel.js
const { validateLicense, getLicenseStatistics } = require('./snippets/licenseOperations');

// Validacija pred prikazom
const validation = await validateLicense(licenseKey);
if (!validation.isValid) {
    showErrors(validation.errors);
}

// Statistike za dashboard
const stats = await getLicenseStatistics();
updateDashboard(stats);
```

### 3. CLI Orodja
```javascript
// cli-tools.js
const { displaySnippets, searchSnippets } = require('./snippets/licenseOperations');

// Prikaži pomoč
if (process.argv[2] === 'help') {
    displaySnippets();
}

// Išči snippets
if (process.argv[2] === 'search') {
    const results = searchSnippets(process.argv[3]);
    console.log('Found snippets:', results);
}
```

## 🎯 Best Practices

### 1. Error Handling
Vsi snippets vračajo standardizirane rezultate:
```javascript
{
    success: boolean,
    data?: any,
    error?: string,
    details?: object
}
```

### 2. Logging
Snippets uporabljajo barvno kodiranje:
- 🟢 **Zelena**: Uspešne operacije
- 🔴 **Rdeča**: Napake
- 🟡 **Rumena**: Opozorila
- 🔵 **Modra**: Informacije
- 🟦 **Cyan**: Čiščenje/maintenance

### 3. Database Connections
Snippets predpostavljajo globalno `db` spremenljivko:
```javascript
// Nastavi pred uporabo snippets
global.db = client.db('omniscient_ai');
```

### 4. Redis Integration
Za optimalno delovanje nastavi Redis:
```javascript
global.redisClient = redis.createClient(/* config */);
```

## 🔄 Posodobitve in Razširitve

### Dodajanje Novega Snippet-a
1. Definiraj snippet objekt z `name`, `description`, `code`, `usage`
2. Dodaj v `licenseSnippets` objekt
3. Posodobi dokumentacijo
4. Testiraj funkcionalnost

### Primer Novega Snippet-a
```javascript
const newSnippet = {
    name: 'My Custom Operation',
    description: 'Description of what it does',
    code: `
async function myCustomOperation(params) {
    // Implementation
}
    `,
    usage: `
// Usage example
await myCustomOperation({ param: 'value' });
    `
};
```

## 📞 Podpora

Za vprašanja ali predloge glede snippets:
- Preveri obstoječo dokumentacijo
- Testiraj snippet v development okolju
- Prilagodi kodo svojim potrebam

---

**Opomba:** Vsi snippets so pripravljeni za takojšnjo uporabo, vendar priporočamo testiranje v development okolju pred produkcijo.