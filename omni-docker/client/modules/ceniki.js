// Ceniki Module - Upravljanje cen turistične ponudbe
console.log('🏷️ Ceniki modul naložen');

class CenikiModule {
    constructor() {
        this.prices = this.loadPrices();
        this.categories = ['Nastanitve', 'Aktivnosti', 'Prehrana', 'Transport', 'Paketi'];
        this.seasons = ['Nizka sezona', 'Srednja sezona', 'Visoka sezona', 'Vrhunska sezona'];
        this.init();
    }

    init() {
        this.createInterface();
        this.bindEvents();
        this.renderPrices();
    }

    createInterface() {
        document.body.innerHTML = `
            <div class="ceniki-container">
                <header class="module-header">
                    <h1>💰 Ceniki - Upravljanje cen</h1>
                    <div class="header-actions">
                        <button id="addPriceBtn" class="btn btn-primary">+ Dodaj ceno</button>
                        <button id="exportBtn" class="btn btn-secondary">📊 Izvozi</button>
                        <button id="importBtn" class="btn btn-secondary">📥 Uvozi</button>
                    </div>
                </header>

                <div class="filters">
                    <select id="categoryFilter">
                        <option value="">Vse kategorije</option>
                        ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                    <select id="seasonFilter">
                        <option value="">Vse sezone</option>
                        ${this.seasons.map(season => `<option value="${season}">${season}</option>`).join('')}
                    </select>
                    <input type="text" id="searchInput" placeholder="Iskanje po imenu...">
                </div>

                <div class="stats-cards">
                    <div class="stat-card">
                        <h3>Skupaj cen</h3>
                        <p id="totalPrices">${this.prices.length}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Povprečna cena</h3>
                        <p id="avgPrice">${this.calculateAveragePrice()}€</p>
                    </div>
                    <div class="stat-card">
                        <h3>Najvišja cena</h3>
                        <p id="maxPrice">${this.getMaxPrice()}€</p>
                    </div>
                    <div class="stat-card">
                        <h3>Najnižja cena</h3>
                        <p id="minPrice">${this.getMinPrice()}€</p>
                    </div>
                </div>

                <div class="prices-table-container">
                    <table class="prices-table">
                        <thead>
                            <tr>
                                <th>Storitev</th>
                                <th>Kategorija</th>
                                <th>Sezona</th>
                                <th>Cena</th>
                                <th>Popust %</th>
                                <th>Končna cena</th>
                                <th>Akcije</th>
                            </tr>
                        </thead>
                        <tbody id="pricesTableBody">
                        </tbody>
                    </table>
                </div>

                <!-- Add/Edit Price Modal -->
                <div id="priceModal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2 id="modalTitle">Dodaj novo ceno</h2>
                        <form id="priceForm">
                            <div class="form-group">
                                <label for="serviceName">Ime storitve:</label>
                                <input type="text" id="serviceName" required>
                            </div>
                            <div class="form-group">
                                <label for="category">Kategorija:</label>
                                <select id="category" required>
                                    ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="season">Sezona:</label>
                                <select id="season" required>
                                    ${this.seasons.map(season => `<option value="${season}">${season}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="basePrice">Osnovna cena (€):</label>
                                <input type="number" id="basePrice" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label for="discount">Popust (%):</label>
                                <input type="number" id="discount" min="0" max="100" value="0">
                            </div>
                            <div class="form-group">
                                <label for="description">Opis:</label>
                                <textarea id="description" rows="3"></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Shrani</button>
                                <button type="button" class="btn btn-secondary" id="cancelBtn">Prekliči</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .ceniki-container {
                    padding: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                .module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 10px;
                }

                .header-actions {
                    display: flex;
                    gap: 10px;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .btn-primary {
                    background: #4CAF50;
                    color: white;
                }

                .btn-secondary {
                    background: #2196F3;
                    color: white;
                }

                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }

                .filters {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }

                .filters select, .filters input {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .stats-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 30px;
                }

                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                }

                .stat-card h3 {
                    color: #666;
                    margin-bottom: 10px;
                    font-size: 14px;
                }

                .stat-card p {
                    font-size: 24px;
                    font-weight: bold;
                    color: #333;
                    margin: 0;
                }

                .prices-table-container {
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .prices-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .prices-table th {
                    background: #f8f9fa;
                    padding: 15px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #dee2e6;
                }

                .prices-table td {
                    padding: 12px 15px;
                    border-bottom: 1px solid #dee2e6;
                }

                .prices-table tr:hover {
                    background: #f8f9fa;
                }

                .action-btn {
                    padding: 5px 10px;
                    margin: 0 2px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .edit-btn {
                    background: #ffc107;
                    color: #212529;
                }

                .delete-btn {
                    background: #dc3545;
                    color: white;
                }

                .modal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                }

                .modal-content {
                    background-color: white;
                    margin: 5% auto;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    position: relative;
                }

                .close {
                    position: absolute;
                    right: 15px;
                    top: 15px;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                }

                .form-group {
                    margin-bottom: 15px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                }

                .form-group input, .form-group select, .form-group textarea {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .form-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    margin-top: 20px;
                }
            </style>
        `;
    }

    bindEvents() {
        // Add price button
        document.getElementById('addPriceBtn').addEventListener('click', () => this.openModal());
        
        // Export/Import buttons
        document.getElementById('exportBtn').addEventListener('click', () => this.exportPrices());
        document.getElementById('importBtn').addEventListener('click', () => this.importPrices());
        
        // Filters
        document.getElementById('categoryFilter').addEventListener('change', () => this.filterPrices());
        document.getElementById('seasonFilter').addEventListener('change', () => this.filterPrices());
        document.getElementById('searchInput').addEventListener('input', () => this.filterPrices());
        
        // Modal events
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('priceForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('priceModal')) {
                this.closeModal();
            }
        });
    }

    loadPrices() {
        // Demo data - in real app this would come from API/database
        return [
            {
                id: 1,
                serviceName: 'Dvoposteljna soba',
                category: 'Nastanitve',
                season: 'Visoka sezona',
                basePrice: 120,
                discount: 10,
                description: 'Udobna dvoposteljna soba z balkonom'
            },
            {
                id: 2,
                serviceName: 'Rafting na Soči',
                category: 'Aktivnosti',
                season: 'Srednja sezona',
                basePrice: 45,
                discount: 0,
                description: 'Adrenalinsko doživetje na smaragdni reki'
            },
            {
                id: 3,
                serviceName: 'Degustacijski meni',
                category: 'Prehrana',
                season: 'Nizka sezona',
                basePrice: 35,
                discount: 15,
                description: '5-hodni degustacijski meni z lokalnimi specialitetami'
            }
        ];
    }

    renderPrices() {
        const tbody = document.getElementById('pricesTableBody');
        tbody.innerHTML = '';

        this.prices.forEach(price => {
            const finalPrice = this.calculateFinalPrice(price.basePrice, price.discount);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${price.serviceName}</td>
                <td>${price.category}</td>
                <td>${price.season}</td>
                <td>${price.basePrice}€</td>
                <td>${price.discount}%</td>
                <td><strong>${finalPrice}€</strong></td>
                <td>
                    <button class="action-btn edit-btn" onclick="cenikiModule.editPrice(${price.id})">Uredi</button>
                    <button class="action-btn delete-btn" onclick="cenikiModule.deletePrice(${price.id})">Briši</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updateStats();
    }

    calculateFinalPrice(basePrice, discount) {
        return (basePrice * (1 - discount / 100)).toFixed(2);
    }

    calculateAveragePrice() {
        if (this.prices.length === 0) return 0;
        const total = this.prices.reduce((sum, price) => sum + parseFloat(this.calculateFinalPrice(price.basePrice, price.discount)), 0);
        return (total / this.prices.length).toFixed(2);
    }

    getMaxPrice() {
        if (this.prices.length === 0) return 0;
        return Math.max(...this.prices.map(price => parseFloat(this.calculateFinalPrice(price.basePrice, price.discount)))).toFixed(2);
    }

    getMinPrice() {
        if (this.prices.length === 0) return 0;
        return Math.min(...this.prices.map(price => parseFloat(this.calculateFinalPrice(price.basePrice, price.discount)))).toFixed(2);
    }

    updateStats() {
        document.getElementById('totalPrices').textContent = this.prices.length;
        document.getElementById('avgPrice').textContent = this.calculateAveragePrice() + '€';
        document.getElementById('maxPrice').textContent = this.getMaxPrice() + '€';
        document.getElementById('minPrice').textContent = this.getMinPrice() + '€';
    }

    filterPrices() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const seasonFilter = document.getElementById('seasonFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        const filteredPrices = this.prices.filter(price => {
            const matchesCategory = !categoryFilter || price.category === categoryFilter;
            const matchesSeason = !seasonFilter || price.season === seasonFilter;
            const matchesSearch = !searchTerm || price.serviceName.toLowerCase().includes(searchTerm);
            
            return matchesCategory && matchesSeason && matchesSearch;
        });

        // Temporarily replace prices for rendering
        const originalPrices = this.prices;
        this.prices = filteredPrices;
        this.renderPrices();
        this.prices = originalPrices;
    }

    openModal(price = null) {
        const modal = document.getElementById('priceModal');
        const form = document.getElementById('priceForm');
        
        if (price) {
            document.getElementById('modalTitle').textContent = 'Uredi ceno';
            document.getElementById('serviceName').value = price.serviceName;
            document.getElementById('category').value = price.category;
            document.getElementById('season').value = price.season;
            document.getElementById('basePrice').value = price.basePrice;
            document.getElementById('discount').value = price.discount;
            document.getElementById('description').value = price.description;
            form.dataset.editId = price.id;
        } else {
            document.getElementById('modalTitle').textContent = 'Dodaj novo ceno';
            form.reset();
            delete form.dataset.editId;
        }
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('priceModal').style.display = 'none';
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const priceData = {
            serviceName: document.getElementById('serviceName').value,
            category: document.getElementById('category').value,
            season: document.getElementById('season').value,
            basePrice: parseFloat(document.getElementById('basePrice').value),
            discount: parseInt(document.getElementById('discount').value) || 0,
            description: document.getElementById('description').value
        };

        const editId = e.target.dataset.editId;
        
        if (editId) {
            // Edit existing price
            const index = this.prices.findIndex(p => p.id == editId);
            if (index !== -1) {
                this.prices[index] = { ...this.prices[index], ...priceData };
            }
        } else {
            // Add new price
            const newPrice = {
                id: Date.now(),
                ...priceData
            };
            this.prices.push(newPrice);
        }

        this.renderPrices();
        this.closeModal();
        this.savePrices();
    }

    editPrice(id) {
        const price = this.prices.find(p => p.id === id);
        if (price) {
            this.openModal(price);
        }
    }

    deletePrice(id) {
        if (confirm('Ali ste prepričani, da želite izbrisati to ceno?')) {
            this.prices = this.prices.filter(p => p.id !== id);
            this.renderPrices();
            this.savePrices();
        }
    }

    exportPrices() {
        const dataStr = JSON.stringify(this.prices, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'ceniki_export.json';
        link.click();
    }

    importPrices() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedPrices = JSON.parse(e.target.result);
                        this.prices = importedPrices;
                        this.renderPrices();
                        this.savePrices();
                        alert('Ceniki uspešno uvoženi!');
                    } catch (error) {
                        alert('Napaka pri uvozu datoteke!');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    savePrices() {
        // In real app, this would save to API/database
        localStorage.setItem('omni_ceniki', JSON.stringify(this.prices));
    }
}

// Initialize module
const cenikiModule = new CenikiModule();

// Make it globally available for onclick handlers
window.cenikiModule = cenikiModule;