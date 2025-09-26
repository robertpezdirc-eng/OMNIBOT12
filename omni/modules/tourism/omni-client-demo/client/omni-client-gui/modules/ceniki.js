/**
 * Modul Ceniki - Upravljanje cen in cennikov (GUI verzija)
 * Omogoča pregled, dodajanje in urejanje cen storitev/produktov
 */

class CenikiModuleGUI {
    constructor() {
        this.name = 'Ceniki';
        this.version = '1.0.0';
        this.description = 'Upravljanje cen in cennikov';
        
        // Demo podatki
        this.ceniki = [
            { id: 1, naziv: 'Osnovni paket', cena: 99.99, valuta: 'EUR', aktiven: true, kategorija: 'Paketi' },
            { id: 2, naziv: 'Premium paket', cena: 199.99, valuta: 'EUR', aktiven: true, kategorija: 'Paketi' },
            { id: 3, naziv: 'Enterprise paket', cena: 499.99, valuta: 'EUR', aktiven: false, kategorija: 'Paketi' },
            { id: 4, naziv: 'Konzultacije', cena: 75.00, valuta: 'EUR', aktiven: true, kategorija: 'Storitve' },
            { id: 5, naziv: 'Podpora 24/7', cena: 150.00, valuta: 'EUR', aktiven: true, kategorija: 'Storitve' }
        ];
    }

    /**
     * Inicializacija modula za GUI
     */
    async init() {
        console.log(`🏷️ ${this.name} modul zagnan v GUI načinu`);
        
        // Ustvari GUI okno za module
        this.createModuleWindow();
        
        return {
            success: true,
            message: `Modul ${this.name} uspešno zagnan`,
            data: {
                name: this.name,
                version: this.version,
                description: this.description,
                itemCount: this.ceniki.length
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
            width: 1000,
            height: 700,
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
        const cenikRows = this.ceniki.map(cenik => `
            <tr class="${cenik.aktiven ? 'active' : 'inactive'}">
                <td>${cenik.id}</td>
                <td>${cenik.naziv}</td>
                <td>${cenik.cena.toFixed(2)} ${cenik.valuta}</td>
                <td>${cenik.kategorija}</td>
                <td>
                    <span class="status ${cenik.aktiven ? 'active' : 'inactive'}">
                        ${cenik.aktiven ? '✅ Aktiven' : '❌ Neaktiven'}
                    </span>
                </td>
                <td>
                    <button onclick="editPrice(${cenik.id})" class="btn-edit">✏️ Uredi</button>
                    <button onclick="toggleStatus(${cenik.id})" class="btn-toggle">
                        ${cenik.aktiven ? '🔒 Deaktiviraj' : '🔓 Aktiviraj'}
                    </button>
                </td>
            </tr>
        `).join('');

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
                
                .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
                }
                
                .stat-card h3 {
                    margin: 0 0 10px 0;
                    font-size: 1.8em;
                }
                
                .stat-card p {
                    margin: 0;
                    opacity: 0.9;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }
                
                th, td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid #eee;
                }
                
                th {
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    color: white;
                    font-weight: 500;
                }
                
                tr.active {
                    background-color: #f8fff8;
                }
                
                tr.inactive {
                    background-color: #fff8f8;
                    opacity: 0.7;
                }
                
                .status.active {
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .status.inactive {
                    color: #f44336;
                    font-weight: bold;
                }
                
                button {
                    padding: 8px 15px;
                    margin: 2px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 0.9em;
                    transition: all 0.3s ease;
                }
                
                .btn-edit {
                    background: linear-gradient(45deg, #ff9800, #f57c00);
                    color: white;
                }
                
                .btn-toggle {
                    background: linear-gradient(45deg, #2196F3, #1976D2);
                    color: white;
                }
                
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                }
                
                .actions {
                    margin-top: 30px;
                    text-align: center;
                }
                
                .btn-primary {
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                    color: white;
                    padding: 15px 30px;
                    font-size: 1.1em;
                    margin: 0 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏷️ ${this.name}</h1>
                
                <div class="stats">
                    <div class="stat-card">
                        <h3>${this.ceniki.length}</h3>
                        <p>Skupaj cenikov</p>
                    </div>
                    <div class="stat-card">
                        <h3>${this.ceniki.filter(c => c.aktiven).length}</h3>
                        <p>Aktivnih cenikov</p>
                    </div>
                    <div class="stat-card">
                        <h3>${this.ceniki.reduce((sum, c) => sum + c.cena, 0).toFixed(2)} €</h3>
                        <p>Skupna vrednost</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Naziv</th>
                            <th>Cena</th>
                            <th>Kategorija</th>
                            <th>Status</th>
                            <th>Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cenikRows}
                    </tbody>
                </table>
                
                <div class="actions">
                    <button class="btn-primary" onclick="addNewPrice()">➕ Dodaj nov cenik</button>
                    <button class="btn-primary" onclick="exportPrices()">📊 Izvozi cenike</button>
                    <button class="btn-primary" onclick="refreshData()">🔄 Osveži podatke</button>
                </div>
            </div>
            
            <script>
                function editPrice(id) {
                    alert('Urejanje cene ID: ' + id + '\\n(Demo funkcionalnost)');
                }
                
                function toggleStatus(id) {
                    alert('Preklapljanje statusa za ID: ' + id + '\\n(Demo funkcionalnost)');
                }
                
                function addNewPrice() {
                    alert('Dodajanje novega cenika\\n(Demo funkcionalnost)');
                }
                
                function exportPrices() {
                    alert('Izvoz cenikov\\n(Demo funkcionalnost)');
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
     * Pridobi podatke o cenikih
     */
    getCeniki() {
        return this.ceniki;
    }

    /**
     * Dodaj nov cenik
     */
    dodajCenik(naziv, cena, valuta = 'EUR', kategorija = 'Splošno') {
        const newId = Math.max(...this.ceniki.map(c => c.id)) + 1;
        const novCenik = {
            id: newId,
            naziv,
            cena: parseFloat(cena),
            valuta,
            aktiven: true,
            kategorija
        };
        
        this.ceniki.push(novCenik);
        return novCenik;
    }

    /**
     * Uredi obstoječi cenik
     */
    urediCenik(id, podatki) {
        const cenik = this.ceniki.find(c => c.id === id);
        if (cenik) {
            Object.assign(cenik, podatki);
            return cenik;
        }
        return null;
    }

    /**
     * Preklopi status cenika
     */
    preklopStatus(id) {
        const cenik = this.ceniki.find(c => c.id === id);
        if (cenik) {
            cenik.aktiven = !cenik.aktiven;
            return cenik;
        }
        return null;
    }
}

module.exports = new CenikiModuleGUI();