/**
 * Modul Zaloge - Upravljanje zalog in inventarja (GUI verzija)
 * Omogoča pregled zalog, dodajanje izdelkov in upravljanje inventarja
 */

class ZalogeModuleGUI {
    constructor() {
        this.name = 'Zaloge';
        this.version = '1.0.0';
        this.description = 'Upravljanje zalog in inventarja';
        
        // Demo podatki
        this.izdelki = [
            { 
                id: 1, 
                naziv: 'Premium paket', 
                koda: 'PREM001',
                kolicina: 25, 
                minKolicina: 10,
                cena: 299.99, 
                valuta: 'EUR',
                kategorija: 'Paketi',
                status: 'na_zalogi',
                zadnjaSpremeba: '2024-01-15'
            },
            { 
                id: 2, 
                naziv: 'Osnovni paket', 
                koda: 'BASIC001',
                kolicina: 8, 
                minKolicina: 15,
                cena: 149.50, 
                valuta: 'EUR',
                kategorija: 'Paketi',
                status: 'nizka_zaloga',
                zadnjaSpremeba: '2024-01-16'
            },
            { 
                id: 3, 
                naziv: 'Enterprise paket', 
                koda: 'ENT001',
                kolicina: 0, 
                minKolicina: 5,
                cena: 599.99, 
                valuta: 'EUR',
                kategorija: 'Paketi',
                status: 'ni_na_zalogi',
                zadnjaSpremeba: '2024-01-17'
            },
            { 
                id: 4, 
                naziv: 'Konzultacije', 
                koda: 'CONS001',
                kolicina: 50, 
                minKolicina: 20,
                cena: 99.99, 
                valuta: 'EUR',
                kategorija: 'Storitve',
                status: 'na_zalogi',
                zadnjaSpremeba: '2024-01-14'
            }
        ];
        
        this.statistika = {
            skupajIzdelkov: this.izdelki.length,
            naZalogi: this.izdelki.filter(i => i.status === 'na_zalogi').length,
            nizkaZaloga: this.izdelki.filter(i => i.status === 'nizka_zaloga').length,
            niNaZalogi: this.izdelki.filter(i => i.status === 'ni_na_zalogi').length,
            skupnaVrednost: this.izdelki.reduce((sum, i) => sum + (i.kolicina * i.cena), 0)
        };
    }

    /**
     * Inicializacija modula za GUI
     */
    async init() {
        console.log(`📦 ${this.name} modul zagnan v GUI načinu`);
        
        // Ustvari GUI okno za module
        this.createModuleWindow();
        
        return {
            success: true,
            message: `Modul ${this.name} uspešno zagnan`,
            data: {
                name: this.name,
                version: this.version,
                description: this.description,
                productCount: this.izdelki.length
            }
        };
    }

    /**
     * Ustvari GUI okno za modul
     */
    createModuleWindow() {
        // Ustvari novo okno za modul
        const { BrowserWindow } = require('electron').remote || require('@electron/remote');
        
        const moduleWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            title: `${this.name} - Omni Client Panel`,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            parent: require('electron').remote?.getCurrentWindow(),
            modal: false,
            show: false
        });

        // HTML vsebina za modul
        const htmlContent = this.generateHTML();
        
        moduleWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        
        moduleWindow.once('ready-to-show', () => {
            moduleWindow.show();
        });

        moduleWindow.on('closed', () => {
            console.log(`${this.name} modul zaprt`);
        });
    }

    /**
     * Generiraj HTML vsebino za modul
     */
    generateHTML() {
        const izdelkiRows = this.izdelki.map(izdelek => {
            let statusClass = '';
            let statusIcon = '';
            
            switch(izdelek.status) {
                case 'na_zalogi':
                    statusClass = 'in-stock';
                    statusIcon = '✅';
                    break;
                case 'nizka_zaloga':
                    statusClass = 'low-stock';
                    statusIcon = '⚠️';
                    break;
                case 'ni_na_zalogi':
                    statusClass = 'out-of-stock';
                    statusIcon = '❌';
                    break;
            }
            
            return `
            <tr class="${statusClass}">
                <td>${izdelek.id}</td>
                <td>${izdelek.koda}</td>
                <td>${izdelek.naziv}</td>
                <td>${izdelek.kategorija}</td>
                <td class="quantity">${izdelek.kolicina}</td>
                <td class="min-quantity">${izdelek.minKolicina}</td>
                <td>${izdelek.cena.toFixed(2)} ${izdelek.valuta}</td>
                <td>
                    <span class="status ${statusClass}">
                        ${statusIcon} ${izdelek.status.replace('_', ' ')}
                    </span>
                </td>
                <td>${izdelek.zadnjaSpremeba}</td>
                <td>
                    <button onclick="editProduct(${izdelek.id})" class="btn-edit">✏️ Uredi</button>
                    <button onclick="adjustStock(${izdelek.id})" class="btn-adjust">📊 Prilagodi</button>
                    <button onclick="viewHistory(${izdelek.id})" class="btn-history">📋 Zgodovina</button>
                </td>
            </tr>
            `;
        }).join('');

        return `
        <!DOCTYPE html>
        <html lang="sl">
        <head>
            <meta charset="UTF-8">
            <title>${this.name} - Omni Client Panel</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                }
                
                .container {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 15px;
                    padding: 30px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    backdrop-filter: blur(10px);
                }
                
                h1 {
                    color: #2c3e50;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 2.2em;
                    font-weight: 300;
                }
                
                .dashboard {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    padding: 25px;
                    border-radius: 15px;
                    text-align: center;
                    color: white;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }
                
                .stat-card.total {
                    background: linear-gradient(45deg, #3498db, #2980b9);
                }
                
                .stat-card.in-stock {
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                }
                
                .stat-card.low-stock {
                    background: linear-gradient(45deg, #ff9800, #f57c00);
                }
                
                .stat-card.out-of-stock {
                    background: linear-gradient(45deg, #f44336, #d32f2f);
                }
                
                .stat-card.value {
                    background: linear-gradient(45deg, #9c27b0, #7b1fa2);
                }
                
                .stat-card h3 {
                    margin: 0 0 10px 0;
                    font-size: 2.2em;
                    font-weight: 300;
                }
                
                .stat-card p {
                    margin: 0;
                    opacity: 0.9;
                    font-size: 1.1em;
                }
                
                .filters {
                    margin: 20px 0;
                    display: flex;
                    gap: 15px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                
                .filters select, .filters input {
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    font-size: 1em;
                }
                
                .section {
                    margin: 30px 0;
                }
                
                .section h2 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 1.6em;
                    font-weight: 400;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #eee;
                    font-size: 0.9em;
                }
                
                th {
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    color: white;
                    font-weight: 500;
                }
                
                tr.in-stock {
                    background-color: #f8fff8;
                }
                
                tr.low-stock {
                    background-color: #fff8f0;
                }
                
                tr.out-of-stock {
                    background-color: #fff5f5;
                }
                
                .status.in-stock {
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .status.low-stock {
                    color: #ff9800;
                    font-weight: bold;
                }
                
                .status.out-of-stock {
                    color: #f44336;
                    font-weight: bold;
                }
                
                .quantity {
                    font-weight: bold;
                    font-size: 1.1em;
                }
                
                .min-quantity {
                    color: #666;
                    font-style: italic;
                }
                
                button {
                    padding: 6px 12px;
                    margin: 2px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 0.8em;
                    transition: all 0.3s ease;
                    color: white;
                }
                
                .btn-edit {
                    background: linear-gradient(45deg, #2196F3, #1976D2);
                }
                
                .btn-adjust {
                    background: linear-gradient(45deg, #ff9800, #f57c00);
                }
                
                .btn-history {
                    background: linear-gradient(45deg, #607d8b, #455a64);
                }
                
                .btn-primary {
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    padding: 15px 30px;
                    font-size: 1.1em;
                    margin: 0 10px;
                }
                
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                }
                
                .actions {
                    margin-top: 30px;
                    text-align: center;
                }
                
                .new-product-form {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    display: none;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .form-group {
                    margin: 15px 0;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                }
                
                .form-group input, .form-group select {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    font-size: 1em;
                }
                
                .alert {
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 5px;
                    font-weight: bold;
                }
                
                .alert.warning {
                    background-color: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeaa7;
                }
                
                .alert.danger {
                    background-color: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📦 ${this.name}</h1>
                
                <div class="dashboard">
                    <div class="stat-card total">
                        <h3>${this.statistika.skupajIzdelkov}</h3>
                        <p>Skupaj izdelkov</p>
                    </div>
                    <div class="stat-card in-stock">
                        <h3>${this.statistika.naZalogi}</h3>
                        <p>Na zalogi</p>
                    </div>
                    <div class="stat-card low-stock">
                        <h3>${this.statistika.nizkaZaloga}</h3>
                        <p>Nizka zaloga</p>
                    </div>
                    <div class="stat-card out-of-stock">
                        <h3>${this.statistika.niNaZalogi}</h3>
                        <p>Ni na zalogi</p>
                    </div>
                    <div class="stat-card value">
                        <h3>${this.statistika.skupnaVrednost.toFixed(2)} €</h3>
                        <p>Skupna vrednost</p>
                    </div>
                </div>
                
                ${this.statistika.nizkaZaloga > 0 ? `
                <div class="alert warning">
                    ⚠️ Opozorilo: ${this.statistika.nizkaZaloga} izdelkov ima nizko zalogo!
                </div>
                ` : ''}
                
                ${this.statistika.niNaZalogi > 0 ? `
                <div class="alert danger">
                    ❌ Pozor: ${this.statistika.niNaZalogi} izdelkov ni na zalogi!
                </div>
                ` : ''}
                
                <div class="filters">
                    <label>Filtriraj po kategoriji:</label>
                    <select id="categoryFilter" onchange="filterProducts()">
                        <option value="">Vse kategorije</option>
                        <option value="Paketi">Paketi</option>
                        <option value="Storitve">Storitve</option>
                    </select>
                    
                    <label>Filtriraj po statusu:</label>
                    <select id="statusFilter" onchange="filterProducts()">
                        <option value="">Vsi statusi</option>
                        <option value="na_zalogi">Na zalogi</option>
                        <option value="nizka_zaloga">Nizka zaloga</option>
                        <option value="ni_na_zalogi">Ni na zalogi</option>
                    </select>
                    
                    <label>Iskanje:</label>
                    <input type="text" id="searchInput" placeholder="Iskanje po nazivu ali kodi..." onkeyup="filterProducts()">
                </div>
                
                <div class="section">
                    <h2>📋 Seznam izdelkov</h2>
                    <table id="productsTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Koda</th>
                                <th>Naziv</th>
                                <th>Kategorija</th>
                                <th>Količina</th>
                                <th>Min. količina</th>
                                <th>Cena</th>
                                <th>Status</th>
                                <th>Zadnja sprememba</th>
                                <th>Akcije</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${izdelkiRows}
                        </tbody>
                    </table>
                </div>
                
                <div class="new-product-form" id="newProductForm">
                    <h3>➕ Nov izdelek</h3>
                    <div class="form-group">
                        <label>Koda izdelka:</label>
                        <input type="text" id="productCode" placeholder="npr. PROD001">
                    </div>
                    <div class="form-group">
                        <label>Naziv:</label>
                        <input type="text" id="productName" placeholder="Naziv izdelka">
                    </div>
                    <div class="form-group">
                        <label>Kategorija:</label>
                        <select id="productCategory">
                            <option value="Paketi">Paketi</option>
                            <option value="Storitve">Storitve</option>
                            <option value="Izdelki">Izdelki</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Količina:</label>
                        <input type="number" id="productQuantity" placeholder="0" min="0">
                    </div>
                    <div class="form-group">
                        <label>Minimalna količina:</label>
                        <input type="number" id="productMinQuantity" placeholder="0" min="0">
                    </div>
                    <div class="form-group">
                        <label>Cena:</label>
                        <input type="number" id="productPrice" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div style="grid-column: 1 / -1; text-align: center; margin-top: 20px;">
                        <button onclick="saveProduct()" class="btn-primary">💾 Shrani izdelek</button>
                        <button onclick="cancelProduct()" class="btn-primary">❌ Prekliči</button>
                    </div>
                </div>
                
                <div class="actions">
                    <button class="btn-primary" onclick="showNewProductForm()">➕ Nov izdelek</button>
                    <button class="btn-primary" onclick="generateStockReport()">📊 Poročilo zalog</button>
                    <button class="btn-primary" onclick="exportInventory()">📤 Izvozi inventar</button>
                    <button class="btn-primary" onclick="refreshData()">🔄 Osveži</button>
                </div>
            </div>
            
            <script>
                function editProduct(id) {
                    alert('Urejanje izdelka ID: ' + id + '\\n(Demo funkcionalnost)');
                }
                
                function adjustStock(id) {
                    const newQuantity = prompt('Vnesite novo količino:');
                    if (newQuantity !== null && !isNaN(newQuantity)) {
                        alert('Zaloga izdelka ID: ' + id + ' prilagojena na ' + newQuantity + '\\n(Demo funkcionalnost)');
                        location.reload();
                    }
                }
                
                function viewHistory(id) {
                    alert('Zgodovina gibanja zalog za izdelek ID: ' + id + '\\n(Demo funkcionalnost)');
                }
                
                function showNewProductForm() {
                    document.getElementById('newProductForm').style.display = 'grid';
                }
                
                function cancelProduct() {
                    document.getElementById('newProductForm').style.display = 'none';
                }
                
                function saveProduct() {
                    const code = document.getElementById('productCode').value;
                    const name = document.getElementById('productName').value;
                    const category = document.getElementById('productCategory').value;
                    const quantity = document.getElementById('productQuantity').value;
                    const minQuantity = document.getElementById('productMinQuantity').value;
                    const price = document.getElementById('productPrice').value;
                    
                    if (code && name && quantity && minQuantity && price) {
                        alert('Nov izdelek shranjen:\\nKoda: ' + code + '\\nNaziv: ' + name + '\\nKategorija: ' + category + '\\nKoličina: ' + quantity + '\\nMin. količina: ' + minQuantity + '\\nCena: ' + price + ' EUR\\n(Demo funkcionalnost)');
                        cancelProduct();
                    } else {
                        alert('Prosimo, izpolnite vsa polja!');
                    }
                }
                
                function filterProducts() {
                    const categoryFilter = document.getElementById('categoryFilter').value;
                    const statusFilter = document.getElementById('statusFilter').value;
                    const searchInput = document.getElementById('searchInput').value.toLowerCase();
                    const table = document.getElementById('productsTable');
                    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                    
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const cells = row.getElementsByTagName('td');
                        const code = cells[1].textContent.toLowerCase();
                        const name = cells[2].textContent.toLowerCase();
                        const category = cells[3].textContent;
                        const status = cells[7].textContent;
                        
                        let showRow = true;
                        
                        if (categoryFilter && category !== categoryFilter) {
                            showRow = false;
                        }
                        
                        if (statusFilter && !status.includes(statusFilter.replace('_', ' '))) {
                            showRow = false;
                        }
                        
                        if (searchInput && !code.includes(searchInput) && !name.includes(searchInput)) {
                            showRow = false;
                        }
                        
                        row.style.display = showRow ? '' : 'none';
                    }
                }
                
                function generateStockReport() {
                    alert('Generiranje poročila zalog\\n(Demo funkcionalnost)');
                }
                
                function exportInventory() {
                    alert('Izvoz inventarja\\n(Demo funkcionalnost)');
                }
                
                function refreshData() {
                    location.reload();
                }
                
                console.log('${this.name} modul naložen v GUI načinu');
            </script>
        </body>
        </html>
        `;
    }

    /**
     * Pridobi vse izdelke
     */
    getIzdelki() {
        return this.izdelki;
    }

    /**
     * Dodaj nov izdelek
     */
    dodajIzdelek(naziv, koda, kolicina, minKolicina, cena, kategorija) {
        const newId = Math.max(...this.izdelki.map(i => i.id)) + 1;
        const status = kolicina === 0 ? 'ni_na_zalogi' : (kolicina <= minKolicina ? 'nizka_zaloga' : 'na_zalogi');
        
        const novIzdelek = {
            id: newId,
            naziv,
            koda,
            kolicina: parseInt(kolicina),
            minKolicina: parseInt(minKolicina),
            cena: parseFloat(cena),
            valuta: 'EUR',
            kategorija,
            status,
            zadnjaSpremeba: new Date().toISOString().split('T')[0]
        };
        
        this.izdelki.push(novIzdelek);
        this.posodobiStatistiko();
        return novIzdelek;
    }

    /**
     * Prilagodi zalogo
     */
    prilagodiZalogo(id, novaKolicina) {
        const izdelek = this.izdelki.find(i => i.id === id);
        if (izdelek) {
            izdelek.kolicina = parseInt(novaKolicina);
            izdelek.status = izdelek.kolicina === 0 ? 'ni_na_zalogi' : (izdelek.kolicina <= izdelek.minKolicina ? 'nizka_zaloga' : 'na_zalogi');
            izdelek.zadnjaSpremeba = new Date().toISOString().split('T')[0];
            this.posodobiStatistiko();
            return izdelek;
        }
        return null;
    }

    /**
     * Posodobi statistiko
     */
    posodobiStatistiko() {
        this.statistika = {
            skupajIzdelkov: this.izdelki.length,
            naZalogi: this.izdelki.filter(i => i.status === 'na_zalogi').length,
            nizkaZaloga: this.izdelki.filter(i => i.status === 'nizka_zaloga').length,
            niNaZalogi: this.izdelki.filter(i => i.status === 'ni_na_zalogi').length,
            skupnaVrednost: this.izdelki.reduce((sum, i) => sum + (i.kolicina * i.cena), 0)
        };
    }
}

module.exports = new ZalogeModuleGUI();