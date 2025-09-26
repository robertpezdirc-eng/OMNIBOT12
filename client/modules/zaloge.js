// Zaloge Module - Upravljanje zalog in kapacitet
console.log('📦 Zaloge modul naložen');

class ZalogeModule {
    constructor() {
        this.inventory = this.loadInventory();
        this.reservations = this.loadReservations();
        this.categories = ['Sobe', 'Aktivnosti', 'Oprema', 'Hrana', 'Pijača'];
        this.init();
    }

    init() {
        this.createInterface();
        this.bindEvents();
        this.renderInventory();
        this.renderReservations();
        this.updateStats();
    }

    createInterface() {
        document.body.innerHTML = `
            <div class="zaloge-container">
                <header class="module-header">
                    <h1>📦 Zaloge - Upravljanje zalog in kapacitet</h1>
                    <div class="header-actions">
                        <button id="addItemBtn" class="btn btn-primary">+ Dodaj izdelek</button>
                        <button id="addReservationBtn" class="btn btn-success">📅 Nova rezervacija</button>
                        <button id="inventoryReportBtn" class="btn btn-secondary">📊 Poročilo</button>
                    </div>
                </header>

                <div class="main-tabs">
                    <button class="tab-btn active" data-tab="inventory">📦 Zaloge</button>
                    <button class="tab-btn" data-tab="reservations">📅 Rezervacije</button>
                    <button class="tab-btn" data-tab="analytics">📊 Analitika</button>
                </div>

                <!-- Inventory Tab -->
                <div id="inventoryTab" class="tab-content active">
                    <div class="filters">
                        <select id="categoryFilter">
                            <option value="">Vse kategorije</option>
                            ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                        </select>
                        <select id="statusFilter">
                            <option value="">Vsi statusi</option>
                            <option value="available">Na voljo</option>
                            <option value="low">Nizka zaloga</option>
                            <option value="out">Razprodano</option>
                        </select>
                        <input type="text" id="searchInput" placeholder="Iskanje po imenu...">
                    </div>

                    <div class="stats-cards">
                        <div class="stat-card">
                            <h3>Skupaj izdelkov</h3>
                            <p id="totalItems">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Na voljo</h3>
                            <p id="availableItems">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Nizka zaloga</h3>
                            <p id="lowStockItems">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Razprodano</h3>
                            <p id="outOfStockItems">0</p>
                        </div>
                    </div>

                    <div class="inventory-table-container">
                        <table class="inventory-table">
                            <thead>
                                <tr>
                                    <th>Izdelek</th>
                                    <th>Kategorija</th>
                                    <th>Trenutno stanje</th>
                                    <th>Min. zaloga</th>
                                    <th>Max. kapaciteta</th>
                                    <th>Status</th>
                                    <th>Zadnja posodobitev</th>
                                    <th>Akcije</th>
                                </tr>
                            </thead>
                            <tbody id="inventoryTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Reservations Tab -->
                <div id="reservationsTab" class="tab-content">
                    <div class="reservation-filters">
                        <input type="date" id="dateFrom" value="${new Date().toISOString().split('T')[0]}">
                        <input type="date" id="dateTo" value="${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}">
                        <select id="reservationStatusFilter">
                            <option value="">Vsi statusi</option>
                            <option value="confirmed">Potrjeno</option>
                            <option value="pending">V obravnavi</option>
                            <option value="cancelled">Preklicano</option>
                        </select>
                        <button id="filterReservationsBtn" class="btn btn-primary">Filtriraj</button>
                    </div>

                    <div class="reservations-calendar">
                        <h3>Rezervacije po dnevih</h3>
                        <div id="calendarView" class="calendar-grid">
                        </div>
                    </div>

                    <div class="reservations-table-container">
                        <table class="reservations-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Gost</th>
                                    <th>Izdelek/Storitev</th>
                                    <th>Datum od</th>
                                    <th>Datum do</th>
                                    <th>Količina</th>
                                    <th>Status</th>
                                    <th>Akcije</th>
                                </tr>
                            </thead>
                            <tbody id="reservationsTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Analytics Tab -->
                <div id="analyticsTab" class="tab-content">
                    <div class="analytics-cards">
                        <div class="analytics-card">
                            <h3>Zasedenost po kategorijah</h3>
                            <div id="occupancyChart" class="chart-container">
                            </div>
                        </div>
                        <div class="analytics-card">
                            <h3>Trend rezervacij</h3>
                            <div id="reservationTrendChart" class="chart-container">
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-summary">
                        <h3>Povzetek analitike</h3>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <span>Povprečna zasedenost:</span>
                                <span id="avgOccupancy">0%</span>
                            </div>
                            <div class="summary-item">
                                <span>Najbolj rezerviran izdelek:</span>
                                <span id="topReservedItem">-</span>
                            </div>
                            <div class="summary-item">
                                <span>Prihodek iz rezervacij:</span>
                                <span id="reservationRevenue">0€</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add/Edit Item Modal -->
                <div id="itemModal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2 id="itemModalTitle">Dodaj nov izdelek</h2>
                        <form id="itemForm">
                            <div class="form-group">
                                <label for="itemName">Ime izdelka:</label>
                                <input type="text" id="itemName" required>
                            </div>
                            <div class="form-group">
                                <label for="itemCategory">Kategorija:</label>
                                <select id="itemCategory" required>
                                    ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="currentStock">Trenutno stanje:</label>
                                <input type="number" id="currentStock" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="minStock">Minimalna zaloga:</label>
                                <input type="number" id="minStock" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="maxCapacity">Maksimalna kapaciteta:</label>
                                <input type="number" id="maxCapacity" min="1" required>
                            </div>
                            <div class="form-group">
                                <label for="itemPrice">Cena na enoto (€):</label>
                                <input type="number" id="itemPrice" step="0.01" min="0">
                            </div>
                            <div class="form-group">
                                <label for="itemDescription">Opis:</label>
                                <textarea id="itemDescription" rows="3"></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Shrani</button>
                                <button type="button" class="btn btn-secondary" id="cancelItemBtn">Prekliči</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Add Reservation Modal -->
                <div id="reservationModal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2>Nova rezervacija</h2>
                        <form id="reservationForm">
                            <div class="form-group">
                                <label for="guestName">Ime gosta:</label>
                                <input type="text" id="guestName" required>
                            </div>
                            <div class="form-group">
                                <label for="guestEmail">E-pošta:</label>
                                <input type="email" id="guestEmail">
                            </div>
                            <div class="form-group">
                                <label for="reservationItem">Izdelek/Storitev:</label>
                                <select id="reservationItem" required>
                                    <option value="">Izberite izdelek...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="checkInDate">Datum od:</label>
                                <input type="date" id="checkInDate" required>
                            </div>
                            <div class="form-group">
                                <label for="checkOutDate">Datum do:</label>
                                <input type="date" id="checkOutDate" required>
                            </div>
                            <div class="form-group">
                                <label for="quantity">Količina:</label>
                                <input type="number" id="quantity" min="1" value="1" required>
                            </div>
                            <div class="form-group">
                                <label for="reservationNotes">Opombe:</label>
                                <textarea id="reservationNotes" rows="3"></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-success">Ustvari rezervacijo</button>
                                <button type="button" class="btn btn-secondary" id="cancelReservationBtn">Prekliči</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .zaloge-container {
                    padding: 20px;
                    max-width: 1600px;
                    margin: 0 auto;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                .module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
                    color: white;
                    border-radius: 10px;
                }

                .main-tabs {
                    display: flex;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #e9ecef;
                }

                .tab-btn {
                    padding: 12px 24px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-weight: 600;
                    border-bottom: 3px solid transparent;
                    transition: all 0.3s ease;
                }

                .tab-btn.active {
                    color: #6f42c1;
                    border-bottom-color: #6f42c1;
                }

                .tab-content {
                    display: none;
                }

                .tab-content.active {
                    display: block;
                }

                .filters, .reservation-filters {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    flex-wrap: wrap;
                }

                .filters select, .filters input, .reservation-filters select, .reservation-filters input {
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

                .inventory-table-container, .reservations-table-container {
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .inventory-table, .reservations-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .inventory-table th, .reservations-table th {
                    background: #f8f9fa;
                    padding: 15px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #dee2e6;
                }

                .inventory-table td, .reservations-table td {
                    padding: 12px 15px;
                    border-bottom: 1px solid #dee2e6;
                }

                .inventory-table tr:hover, .reservations-table tr:hover {
                    background: #f8f9fa;
                }

                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .status-available { background: #d4edda; color: #155724; }
                .status-low { background: #fff3cd; color: #856404; }
                .status-out { background: #f8d7da; color: #721c24; }
                .status-confirmed { background: #d1ecf1; color: #0c5460; }
                .status-pending { background: #fff3cd; color: #856404; }
                .status-cancelled { background: #f8d7da; color: #721c24; }

                .action-btn {
                    padding: 5px 10px;
                    margin: 0 2px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .edit-btn { background: #ffc107; color: #212529; }
                .delete-btn { background: #dc3545; color: white; }
                .stock-btn { background: #17a2b8; color: white; }

                .reservations-calendar {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }

                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 10px;
                    margin-top: 15px;
                }

                .calendar-day {
                    padding: 10px;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                    text-align: center;
                    min-height: 60px;
                    position: relative;
                }

                .calendar-day.has-reservations {
                    background: #e7f3ff;
                    border-color: #007bff;
                }

                .reservation-count {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: #007bff;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .analytics-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .analytics-card {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .chart-container {
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8f9fa;
                    border-radius: 4px;
                    margin-top: 15px;
                }

                .analytics-summary {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin-top: 15px;
                }

                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
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
                    max-height: 80vh;
                    overflow-y: auto;
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

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .btn-primary { background: #007bff; color: white; }
                .btn-secondary { background: #6c757d; color: white; }
                .btn-success { background: #28a745; color: white; }
                .btn-danger { background: #dc3545; color: white; }

                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }

                .close {
                    position: absolute;
                    right: 15px;
                    top: 15px;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                }
            </style>
        `;
    }

    bindEvents() {
        // Header buttons
        document.getElementById('addItemBtn').addEventListener('click', () => this.openItemModal());
        document.getElementById('addReservationBtn').addEventListener('click', () => this.openReservationModal());
        document.getElementById('inventoryReportBtn').addEventListener('click', () => this.generateReport());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Filters
        document.getElementById('categoryFilter').addEventListener('change', () => this.filterInventory());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterInventory());
        document.getElementById('searchInput').addEventListener('input', () => this.filterInventory());

        // Reservation filters
        document.getElementById('filterReservationsBtn').addEventListener('click', () => this.filterReservations());

        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        document.getElementById('cancelItemBtn').addEventListener('click', () => {
            document.getElementById('itemModal').style.display = 'none';
        });

        document.getElementById('cancelReservationBtn').addEventListener('click', () => {
            document.getElementById('reservationModal').style.display = 'none';
        });

        // Form submissions
        document.getElementById('itemForm').addEventListener('submit', (e) => this.handleItemSubmit(e));
        document.getElementById('reservationForm').addEventListener('submit', (e) => this.handleReservationSubmit(e));
    }

    loadInventory() {
        const saved = localStorage.getItem('omni_zaloge_inventory');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Demo data
        return [
            {
                id: 1,
                name: 'Dvoposteljna soba - Standard',
                category: 'Sobe',
                currentStock: 8,
                minStock: 2,
                maxCapacity: 12,
                price: 120,
                lastUpdated: new Date().toISOString().split('T')[0]
            },
            {
                id: 2,
                name: 'Enoposteljna soba',
                category: 'Sobe',
                currentStock: 1,
                minStock: 2,
                maxCapacity: 6,
                price: 80,
                lastUpdated: new Date().toISOString().split('T')[0]
            },
            {
                id: 3,
                name: 'Rafting oprema',
                category: 'Oprema',
                currentStock: 15,
                minStock: 5,
                maxCapacity: 20,
                price: 25,
                lastUpdated: new Date().toISOString().split('T')[0]
            }
        ];
    }

    loadReservations() {
        const saved = localStorage.getItem('omni_zaloge_reservations');
        return saved ? JSON.parse(saved) : [];
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // Load specific tab content
        if (tabName === 'reservations') {
            this.renderReservations();
            this.renderCalendar();
        } else if (tabName === 'analytics') {
            this.renderAnalytics();
        }
    }

    renderInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = '';

        this.inventory.forEach(item => {
            const status = this.getItemStatus(item);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.currentStock}</td>
                <td>${item.minStock}</td>
                <td>${item.maxCapacity}</td>
                <td><span class="status-badge status-${status}">${this.getStatusText(status)}</span></td>
                <td>${item.lastUpdated}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="zalogeModule.editItem(${item.id})">Uredi</button>
                    <button class="action-btn stock-btn" onclick="zalogeModule.adjustStock(${item.id})">Zaloga</button>
                    <button class="action-btn delete-btn" onclick="zalogeModule.deleteItem(${item.id})">Briši</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updateStats();
    }

    getItemStatus(item) {
        if (item.currentStock === 0) return 'out';
        if (item.currentStock <= item.minStock) return 'low';
        return 'available';
    }

    getStatusText(status) {
        const statusTexts = {
            available: 'Na voljo',
            low: 'Nizka zaloga',
            out: 'Razprodano'
        };
        return statusTexts[status] || status;
    }

    updateStats() {
        const totalItems = this.inventory.length;
        const availableItems = this.inventory.filter(item => this.getItemStatus(item) === 'available').length;
        const lowStockItems = this.inventory.filter(item => this.getItemStatus(item) === 'low').length;
        const outOfStockItems = this.inventory.filter(item => this.getItemStatus(item) === 'out').length;

        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('availableItems').textContent = availableItems;
        document.getElementById('lowStockItems').textContent = lowStockItems;
        document.getElementById('outOfStockItems').textContent = outOfStockItems;
    }

    filterInventory() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        const filteredInventory = this.inventory.filter(item => {
            const matchesCategory = !categoryFilter || item.category === categoryFilter;
            const matchesStatus = !statusFilter || this.getItemStatus(item) === statusFilter;
            const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm);
            
            return matchesCategory && matchesStatus && matchesSearch;
        });

        // Temporarily replace inventory for rendering
        const originalInventory = this.inventory;
        this.inventory = filteredInventory;
        this.renderInventory();
        this.inventory = originalInventory;
    }

    openItemModal(item = null) {
        const modal = document.getElementById('itemModal');
        const form = document.getElementById('itemForm');
        
        if (item) {
            document.getElementById('itemModalTitle').textContent = 'Uredi izdelek';
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('currentStock').value = item.currentStock;
            document.getElementById('minStock').value = item.minStock;
            document.getElementById('maxCapacity').value = item.maxCapacity;
            document.getElementById('itemPrice').value = item.price || '';
            document.getElementById('itemDescription').value = item.description || '';
            form.dataset.editId = item.id;
        } else {
            document.getElementById('itemModalTitle').textContent = 'Dodaj nov izdelek';
            form.reset();
            delete form.dataset.editId;
        }
        
        modal.style.display = 'block';
    }

    handleItemSubmit(e) {
        e.preventDefault();
        
        const itemData = {
            name: document.getElementById('itemName').value,
            category: document.getElementById('itemCategory').value,
            currentStock: parseInt(document.getElementById('currentStock').value),
            minStock: parseInt(document.getElementById('minStock').value),
            maxCapacity: parseInt(document.getElementById('maxCapacity').value),
            price: parseFloat(document.getElementById('itemPrice').value) || 0,
            description: document.getElementById('itemDescription').value,
            lastUpdated: new Date().toISOString().split('T')[0]
        };

        const editId = e.target.dataset.editId;
        
        if (editId) {
            // Edit existing item
            const index = this.inventory.findIndex(item => item.id == editId);
            if (index !== -1) {
                this.inventory[index] = { ...this.inventory[index], ...itemData };
            }
        } else {
            // Add new item
            const newItem = {
                id: Date.now(),
                ...itemData
            };
            this.inventory.push(newItem);
        }

        this.renderInventory();
        document.getElementById('itemModal').style.display = 'none';
        this.saveInventory();
    }

    editItem(id) {
        const item = this.inventory.find(item => item.id === id);
        if (item) {
            this.openItemModal(item);
        }
    }

    adjustStock(id) {
        const item = this.inventory.find(item => item.id === id);
        if (item) {
            const newStock = prompt(`Trenutno stanje: ${item.currentStock}\nVnesite novo stanje:`, item.currentStock);
            if (newStock !== null && !isNaN(newStock)) {
                item.currentStock = parseInt(newStock);
                item.lastUpdated = new Date().toISOString().split('T')[0];
                this.renderInventory();
                this.saveInventory();
            }
        }
    }

    deleteItem(id) {
        if (confirm('Ali ste prepričani, da želite izbrisati ta izdelek?')) {
            this.inventory = this.inventory.filter(item => item.id !== id);
            this.renderInventory();
            this.saveInventory();
        }
    }

    openReservationModal() {
        const modal = document.getElementById('reservationModal');
        const select = document.getElementById('reservationItem');
        
        // Populate items dropdown
        select.innerHTML = '<option value="">Izberite izdelek...</option>';
        this.inventory.forEach(item => {
            if (item.currentStock > 0) {
                select.innerHTML += `<option value="${item.id}">${item.name} (${item.currentStock} na voljo)</option>`;
            }
        });
        
        // Set default dates
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('checkInDate').value = today.toISOString().split('T')[0];
        document.getElementById('checkOutDate').value = tomorrow.toISOString().split('T')[0];
        
        modal.style.display = 'block';
    }

    handleReservationSubmit(e) {
        e.preventDefault();
        
        const reservationData = {
            id: Date.now(),
            guestName: document.getElementById('guestName').value,
            guestEmail: document.getElementById('guestEmail').value,
            itemId: parseInt(document.getElementById('reservationItem').value),
            checkInDate: document.getElementById('checkInDate').value,
            checkOutDate: document.getElementById('checkOutDate').value,
            quantity: parseInt(document.getElementById('quantity').value),
            notes: document.getElementById('reservationNotes').value,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        // Find the item
        const item = this.inventory.find(item => item.id === reservationData.itemId);
        if (item) {
            reservationData.itemName = item.name;
            
            // Check availability
            if (item.currentStock >= reservationData.quantity) {
                // Reduce stock
                item.currentStock -= reservationData.quantity;
                item.lastUpdated = new Date().toISOString().split('T')[0];
                
                this.reservations.push(reservationData);
                this.saveReservations();
                this.saveInventory();
                this.renderInventory();
                
                document.getElementById('reservationModal').style.display = 'none';
                document.getElementById('reservationForm').reset();
                
                alert('Rezervacija je bila uspešno ustvarjena!');
            } else {
                alert('Ni dovolj zalog za to rezervacijo!');
            }
        }
    }

    renderReservations() {
        const tbody = document.getElementById('reservationsTableBody');
        tbody.innerHTML = '';

        this.reservations.slice(-20).reverse().forEach(reservation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservation.id}</td>
                <td>${reservation.guestName}</td>
                <td>${reservation.itemName}</td>
                <td>${reservation.checkInDate}</td>
                <td>${reservation.checkOutDate}</td>
                <td>${reservation.quantity}</td>
                <td><span class="status-badge status-${reservation.status}">${this.getReservationStatusText(reservation.status)}</span></td>
                <td>
                    <button class="action-btn edit-btn" onclick="zalogeModule.editReservation(${reservation.id})">Uredi</button>
                    <button class="action-btn delete-btn" onclick="zalogeModule.cancelReservation(${reservation.id})">Prekliči</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getReservationStatusText(status) {
        const statusTexts = {
            confirmed: 'Potrjeno',
            pending: 'V obravnavi',
            cancelled: 'Preklicano'
        };
        return statusTexts[status] || status;
    }

    renderCalendar() {
        const calendarView = document.getElementById('calendarView');
        calendarView.innerHTML = '';

        // Simple 7-day calendar
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayReservations = this.reservations.filter(res => 
                res.checkInDate <= dateStr && res.checkOutDate >= dateStr && res.status === 'confirmed'
            );

            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day ${dayReservations.length > 0 ? 'has-reservations' : ''}`;
            dayElement.innerHTML = `
                <div>${date.getDate()}</div>
                <div style="font-size: 10px;">${date.toLocaleDateString('sl-SI', { weekday: 'short' })}</div>
                ${dayReservations.length > 0 ? `<div class="reservation-count">${dayReservations.length}</div>` : ''}
            `;
            
            calendarView.appendChild(dayElement);
        }
    }

    renderAnalytics() {
        // Simple analytics implementation
        const occupancyChart = document.getElementById('occupancyChart');
        const trendChart = document.getElementById('reservationTrendChart');
        
        occupancyChart.innerHTML = '<p>Grafikon zasedenosti bo na voljo v prihodnji verziji</p>';
        trendChart.innerHTML = '<p>Grafikon trendov bo na voljo v prihodnji verziji</p>';

        // Calculate basic analytics
        const totalCapacity = this.inventory.reduce((sum, item) => sum + item.maxCapacity, 0);
        const occupiedCapacity = this.inventory.reduce((sum, item) => sum + (item.maxCapacity - item.currentStock), 0);
        const avgOccupancy = totalCapacity > 0 ? ((occupiedCapacity / totalCapacity) * 100).toFixed(1) : 0;

        document.getElementById('avgOccupancy').textContent = avgOccupancy + '%';

        // Most reserved item
        const itemReservations = {};
        this.reservations.forEach(res => {
            if (res.status === 'confirmed') {
                itemReservations[res.itemName] = (itemReservations[res.itemName] || 0) + res.quantity;
            }
        });

        const topItem = Object.keys(itemReservations).length > 0 ?
            Object.keys(itemReservations).reduce((a, b) => itemReservations[a] > itemReservations[b] ? a : b) : '-';

        document.getElementById('topReservedItem').textContent = topItem;

        // Revenue calculation
        const revenue = this.reservations
            .filter(res => res.status === 'confirmed')
            .reduce((sum, res) => {
                const item = this.inventory.find(item => item.id === res.itemId);
                return sum + (item ? item.price * res.quantity : 0);
            }, 0);

        document.getElementById('reservationRevenue').textContent = revenue.toFixed(2) + '€';
    }

    cancelReservation(id) {
        if (confirm('Ali ste prepričani, da želite preklicati to rezervacijo?')) {
            const reservation = this.reservations.find(res => res.id === id);
            if (reservation && reservation.status === 'confirmed') {
                // Return stock
                const item = this.inventory.find(item => item.id === reservation.itemId);
                if (item) {
                    item.currentStock += reservation.quantity;
                    item.lastUpdated = new Date().toISOString().split('T')[0];
                }
                
                reservation.status = 'cancelled';
                this.saveReservations();
                this.saveInventory();
                this.renderReservations();
                this.renderInventory();
            }
        }
    }

    generateReport() {
        alert('Poročila bodo na voljo v prihodnji verziji.');
    }

    saveInventory() {
        localStorage.setItem('omni_zaloge_inventory', JSON.stringify(this.inventory));
    }

    saveReservations() {
        localStorage.setItem('omni_zaloge_reservations', JSON.stringify(this.reservations));
    }
}

// Initialize module
const zalogeModule = new ZalogeModule();

// Make it globally available
window.zalogeModule = zalogeModule;