/**
 * Modul Blagajna - Upravljanje prodaje in računov (GUI verzija)
 * Omogoča izdajanje računov, pregled prodaje in upravljanje plačil
 */

class BlagajnaModuleGUI {
    constructor() {
        this.name = 'Blagajna';
        this.version = '1.0.0';
        this.description = 'Upravljanje prodaje in računov';
        
        // Demo podatki
        this.racuni = [
            { 
                id: 1, 
                datum: '2024-01-15', 
                znesek: 299.99, 
                valuta: 'EUR', 
                status: 'plačan',
                stranka: 'Janez Novak',
                izdelki: ['Premium paket', 'Podpora']
            },
            { 
                id: 2, 
                datum: '2024-01-16', 
                znesek: 149.50, 
                valuta: 'EUR', 
                status: 'čaka',
                stranka: 'Ana Kovač',
                izdelki: ['Osnovni paket']
            },
            { 
                id: 3, 
                datum: '2024-01-17', 
                znesek: 599.99, 
                valuta: 'EUR', 
                status: 'plačan',
                stranka: 'Podjetje d.o.o.',
                izdelki: ['Enterprise paket', 'Konzultacije']
            }
        ];
        
        this.dnevnaStatistika = {
            skupajProdaja: 1049.48,
            steviloRacunov: 3,
            povprecenRacun: 349.83,
            placaniRacuni: 2
        };
    }

    /**
     * Inicializacija modula za GUI
     */
    async init() {
        console.log(`🛒 ${this.name} modul zagnan v GUI načinu`);
        
        // Ustvari GUI okno za module
        this.createModuleWindow();
        
        return {
            success: true,
            message: `Modul ${this.name} uspešno zagnan`,
            data: {
                name: this.name,
                version: this.version,
                description: this.description,
                invoiceCount: this.racuni.length
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
            width: 1200,
            height: 800,
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
        const racunRows = this.racuni.map(racun => `
            <tr class="${racun.status === 'plačan' ? 'paid' : 'pending'}">
                <td>${racun.id}</td>
                <td>${racun.datum}</td>
                <td>${racun.stranka}</td>
                <td>${racun.znesek.toFixed(2)} ${racun.valuta}</td>
                <td>
                    <span class="status ${racun.status === 'plačan' ? 'paid' : 'pending'}">
                        ${racun.status === 'plačan' ? '✅ Plačan' : '⏳ Čaka'}
                    </span>
                </td>
                <td>${racun.izdelki.join(', ')}</td>
                <td>
                    <button onclick="viewInvoice(${racun.id})" class="btn-view">👁️ Poglej</button>
                    <button onclick="printInvoice(${racun.id})" class="btn-print">🖨️ Natisni</button>
                    ${racun.status !== 'plačan' ? `<button onclick="markPaid(${racun.id})" class="btn-pay">💰 Označi plačan</button>` : ''}
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
                
                .dashboard {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
                
                .stat-card.revenue {
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                }
                
                .stat-card.invoices {
                    background: linear-gradient(45deg, #2196F3, #1976D2);
                }
                
                .stat-card.average {
                    background: linear-gradient(45deg, #ff9800, #f57c00);
                }
                
                .stat-card.paid {
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
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid #eee;
                }
                
                th {
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    color: white;
                    font-weight: 500;
                }
                
                tr.paid {
                    background-color: #f8fff8;
                }
                
                tr.pending {
                    background-color: #fff8f0;
                }
                
                .status.paid {
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .status.pending {
                    color: #ff9800;
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
                    color: white;
                }
                
                .btn-view {
                    background: linear-gradient(45deg, #2196F3, #1976D2);
                }
                
                .btn-print {
                    background: linear-gradient(45deg, #607d8b, #455a64);
                }
                
                .btn-pay {
                    background: linear-gradient(45deg, #4CAF50, #45a049);
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
                
                .new-invoice-form {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    display: none;
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
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛒 ${this.name}</h1>
                
                <div class="dashboard">
                    <div class="stat-card revenue">
                        <h3>${this.dnevnaStatistika.skupajProdaja.toFixed(2)} €</h3>
                        <p>Skupaj prodaja</p>
                    </div>
                    <div class="stat-card invoices">
                        <h3>${this.dnevnaStatistika.steviloRacunov}</h3>
                        <p>Število računov</p>
                    </div>
                    <div class="stat-card average">
                        <h3>${this.dnevnaStatistika.povprecenRacun.toFixed(2)} €</h3>
                        <p>Povprečen račun</p>
                    </div>
                    <div class="stat-card paid">
                        <h3>${this.dnevnaStatistika.placaniRacuni}</h3>
                        <p>Plačani računi</p>
                    </div>
                </div>
                
                <div class="section">
                    <h2>📋 Seznam računov</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Datum</th>
                                <th>Stranka</th>
                                <th>Znesek</th>
                                <th>Status</th>
                                <th>Izdelki</th>
                                <th>Akcije</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${racunRows}
                        </tbody>
                    </table>
                </div>
                
                <div class="new-invoice-form" id="newInvoiceForm">
                    <h3>➕ Nov račun</h3>
                    <div class="form-group">
                        <label>Stranka:</label>
                        <input type="text" id="customerName" placeholder="Ime stranke">
                    </div>
                    <div class="form-group">
                        <label>Znesek:</label>
                        <input type="number" id="amount" placeholder="0.00" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Izdelki:</label>
                        <input type="text" id="products" placeholder="Seznam izdelkov">
                    </div>
                    <button onclick="saveInvoice()" class="btn-primary">💾 Shrani račun</button>
                    <button onclick="cancelInvoice()" class="btn-primary">❌ Prekliči</button>
                </div>
                
                <div class="actions">
                    <button class="btn-primary" onclick="showNewInvoiceForm()">➕ Nov račun</button>
                    <button class="btn-primary" onclick="generateReport()">📊 Dnevno poročilo</button>
                    <button class="btn-primary" onclick="exportData()">📤 Izvozi podatke</button>
                    <button class="btn-primary" onclick="refreshData()">🔄 Osveži</button>
                </div>
            </div>
            
            <script>
                function viewInvoice(id) {
                    alert('Prikaz računa ID: ' + id + '\\n(Demo funkcionalnost)');
                }
                
                function printInvoice(id) {
                    alert('Tiskanje računa ID: ' + id + '\\n(Demo funkcionalnost)');
                }
                
                function markPaid(id) {
                    if (confirm('Ali želite označiti račun kot plačan?')) {
                        alert('Račun ID: ' + id + ' označen kot plačan\\n(Demo funkcionalnost)');
                        location.reload();
                    }
                }
                
                function showNewInvoiceForm() {
                    document.getElementById('newInvoiceForm').style.display = 'block';
                }
                
                function cancelInvoice() {
                    document.getElementById('newInvoiceForm').style.display = 'none';
                }
                
                function saveInvoice() {
                    const customer = document.getElementById('customerName').value;
                    const amount = document.getElementById('amount').value;
                    const products = document.getElementById('products').value;
                    
                    if (customer && amount && products) {
                        alert('Nov račun shranjen:\\nStranka: ' + customer + '\\nZnesek: ' + amount + ' EUR\\nIzdelki: ' + products + '\\n(Demo funkcionalnost)');
                        cancelInvoice();
                    } else {
                        alert('Prosimo, izpolnite vsa polja!');
                    }
                }
                
                function generateReport() {
                    alert('Generiranje dnevnega poročila\\n(Demo funkcionalnost)');
                }
                
                function exportData() {
                    alert('Izvoz podatkov\\n(Demo funkcionalnost)');
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
     * Pridobi vse račune
     */
    getRacuni() {
        return this.racuni;
    }

    /**
     * Izdaj nov račun
     */
    izdajRacun(stranka, znesek, izdelki) {
        const newId = Math.max(...this.racuni.map(r => r.id)) + 1;
        const novRacun = {
            id: newId,
            datum: new Date().toISOString().split('T')[0],
            znesek: parseFloat(znesek),
            valuta: 'EUR',
            status: 'čaka',
            stranka,
            izdelki: Array.isArray(izdelki) ? izdelki : [izdelki]
        };
        
        this.racuni.push(novRacun);
        this.posodobiStatistiko();
        return novRacun;
    }

    /**
     * Označi račun kot plačan
     */
    oznaciPlacano(id) {
        const racun = this.racuni.find(r => r.id === id);
        if (racun) {
            racun.status = 'plačan';
            this.posodobiStatistiko();
            return racun;
        }
        return null;
    }

    /**
     * Posodobi statistiko
     */
    posodobiStatistiko() {
        this.dnevnaStatistika = {
            skupajProdaja: this.racuni.reduce((sum, r) => sum + r.znesek, 0),
            steviloRacunov: this.racuni.length,
            povprecenRacun: this.racuni.length > 0 ? this.racuni.reduce((sum, r) => sum + r.znesek, 0) / this.racuni.length : 0,
            placaniRacuni: this.racuni.filter(r => r.status === 'plačan').length
        };
    }
}

module.exports = new BlagajnaModuleGUI();