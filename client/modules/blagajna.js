// Blagajna Module - Sistem za prodajo in račune
console.log('🏪 Blagajna modul naložen');

class BlagajnaModule {
    constructor() {
        this.cart = [];
        this.products = this.loadProducts();
        this.transactions = this.loadTransactions();
        this.currentTransaction = null;
        this.init();
    }

    init() {
        this.createInterface();
        this.bindEvents();
        this.renderProducts();
        this.updateCartDisplay();
        this.updateStats();
    }

    createInterface() {
        document.body.innerHTML = `
            <div class="blagajna-container">
                <header class="module-header">
                    <h1>🏪 Blagajna - Prodaja in računi</h1>
                    <div class="header-actions">
                        <button id="newSaleBtn" class="btn btn-primary">+ Nova prodaja</button>
                        <button id="historyBtn" class="btn btn-secondary">📋 Zgodovina</button>
                        <button id="reportsBtn" class="btn btn-secondary">📊 Poročila</button>
                    </div>
                </header>

                <div class="main-content">
                    <div class="products-section">
                        <div class="section-header">
                            <h2>Storitve in izdelki</h2>
                            <input type="text" id="productSearch" placeholder="Iskanje izdelkov...">
                        </div>
                        
                        <div class="product-categories">
                            <button class="category-btn active" data-category="all">Vse</button>
                            <button class="category-btn" data-category="Nastanitve">Nastanitve</button>
                            <button class="category-btn" data-category="Aktivnosti">Aktivnosti</button>
                            <button class="category-btn" data-category="Prehrana">Prehrana</button>
                            <button class="category-btn" data-category="Dodatki">Dodatki</button>
                        </div>

                        <div class="products-grid" id="productsGrid">
                        </div>
                    </div>

                    <div class="cart-section">
                        <div class="section-header">
                            <h2>Košarica</h2>
                            <button id="clearCartBtn" class="btn btn-danger">🗑️ Počisti</button>
                        </div>

                        <div class="cart-items" id="cartItems">
                        </div>

                        <div class="cart-summary">
                            <div class="summary-row">
                                <span>Skupaj brez DDV:</span>
                                <span id="subtotal">0.00€</span>
                            </div>
                            <div class="summary-row">
                                <span>DDV (22%):</span>
                                <span id="tax">0.00€</span>
                            </div>
                            <div class="summary-row total">
                                <span>SKUPAJ:</span>
                                <span id="total">0.00€</span>
                            </div>
                        </div>

                        <div class="payment-section">
                            <h3>Način plačila</h3>
                            <div class="payment-methods">
                                <button class="payment-btn active" data-method="gotovina">💵 Gotovina</button>
                                <button class="payment-btn" data-method="kartica">💳 Kartica</button>
                                <button class="payment-btn" data-method="nakazilo">🏦 Nakazilo</button>
                            </div>
                            
                            <div class="payment-amount">
                                <label for="receivedAmount">Prejeto:</label>
                                <input type="number" id="receivedAmount" step="0.01" placeholder="0.00">
                                <div class="change-amount">
                                    <span>Vračilo: </span>
                                    <span id="changeAmount">0.00€</span>
                                </div>
                            </div>

                            <button id="completePaymentBtn" class="btn btn-success btn-large">
                                💰 Zaključi plačilo
                            </button>
                        </div>
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stat-card">
                        <h3>Dnevni promet</h3>
                        <p id="dailyRevenue">0.00€</p>
                    </div>
                    <div class="stat-card">
                        <h3>Število transakcij</h3>
                        <p id="transactionCount">0</p>
                    </div>
                    <div class="stat-card">
                        <h3>Povprečen račun</h3>
                        <p id="averageTransaction">0.00€</p>
                    </div>
                    <div class="stat-card">
                        <h3>Najbolj prodajan</h3>
                        <p id="topProduct">-</p>
                    </div>
                </div>

                <!-- Transaction History Modal -->
                <div id="historyModal" class="modal">
                    <div class="modal-content large">
                        <span class="close">&times;</span>
                        <h2>Zgodovina transakcij</h2>
                        <div class="history-filters">
                            <input type="date" id="dateFrom">
                            <input type="date" id="dateTo">
                            <select id="paymentMethodFilter">
                                <option value="">Vsi načini plačila</option>
                                <option value="gotovina">Gotovina</option>
                                <option value="kartica">Kartica</option>
                                <option value="nakazilo">Nakazilo</option>
                            </select>
                            <button id="filterHistoryBtn" class="btn btn-primary">Filtriraj</button>
                        </div>
                        <div class="history-table-container">
                            <table class="history-table">
                                <thead>
                                    <tr>
                                        <th>Datum</th>
                                        <th>Čas</th>
                                        <th>Znesek</th>
                                        <th>Plačilo</th>
                                        <th>Izdelki</th>
                                        <th>Akcije</th>
                                    </tr>
                                </thead>
                                <tbody id="historyTableBody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Receipt Modal -->
                <div id="receiptModal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <div id="receiptContent" class="receipt">
                        </div>
                        <div class="receipt-actions">
                            <button id="printReceiptBtn" class="btn btn-primary">🖨️ Natisni</button>
                            <button id="emailReceiptBtn" class="btn btn-secondary">📧 Pošlji po e-pošti</button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .blagajna-container {
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
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    border-radius: 10px;
                }

                .main-content {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .products-section {
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .product-categories {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .category-btn {
                    padding: 8px 16px;
                    border: 2px solid #e9ecef;
                    background: white;
                    border-radius: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .category-btn.active {
                    background: #28a745;
                    color: white;
                    border-color: #28a745;
                }

                .products-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                }

                .product-card {
                    border: 2px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: center;
                }

                .product-card:hover {
                    border-color: #28a745;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.2);
                }

                .product-name {
                    font-weight: 600;
                    margin-bottom: 5px;
                }

                .product-price {
                    color: #28a745;
                    font-size: 1.2em;
                    font-weight: bold;
                }

                .cart-section {
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    height: fit-content;
                }

                .cart-items {
                    max-height: 300px;
                    overflow-y: auto;
                    margin-bottom: 20px;
                }

                .cart-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    border-bottom: 1px solid #e9ecef;
                }

                .cart-item-info {
                    flex: 1;
                }

                .cart-item-name {
                    font-weight: 600;
                }

                .cart-item-price {
                    color: #666;
                    font-size: 0.9em;
                }

                .quantity-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .quantity-btn {
                    width: 30px;
                    height: 30px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .cart-summary {
                    border-top: 2px solid #e9ecef;
                    padding-top: 15px;
                    margin-bottom: 20px;
                }

                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .summary-row.total {
                    font-weight: bold;
                    font-size: 1.2em;
                    border-top: 1px solid #ddd;
                    padding-top: 8px;
                    margin-top: 10px;
                }

                .payment-section h3 {
                    margin-bottom: 15px;
                }

                .payment-methods {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .payment-btn {
                    flex: 1;
                    padding: 10px;
                    border: 2px solid #e9ecef;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .payment-btn.active {
                    background: #28a745;
                    color: white;
                    border-color: #28a745;
                }

                .payment-amount {
                    margin-bottom: 20px;
                }

                .payment-amount label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                }

                .payment-amount input {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 16px;
                }

                .change-amount {
                    margin-top: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    font-weight: 600;
                }

                .btn-large {
                    width: 100%;
                    padding: 15px;
                    font-size: 1.1em;
                }

                .stats-section {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
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

                .modal-content.large {
                    max-width: 900px;
                }

                .receipt {
                    font-family: 'Courier New', monospace;
                    background: white;
                    padding: 20px;
                    border: 1px solid #ddd;
                    max-width: 300px;
                    margin: 0 auto;
                }

                .receipt-header {
                    text-align: center;
                    border-bottom: 1px dashed #333;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }

                .receipt-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }

                .receipt-total {
                    border-top: 1px dashed #333;
                    padding-top: 10px;
                    margin-top: 10px;
                    font-weight: bold;
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

                @media (max-width: 1200px) {
                    .main-content {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
    }

    bindEvents() {
        // Header buttons
        document.getElementById('newSaleBtn').addEventListener('click', () => this.newSale());
        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
        document.getElementById('reportsBtn').addEventListener('click', () => this.showReports());

        // Product search and categories
        document.getElementById('productSearch').addEventListener('input', (e) => this.filterProducts(e.target.value));
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterByCategory(e.target.dataset.category));
        });

        // Cart actions
        document.getElementById('clearCartBtn').addEventListener('click', () => this.clearCart());
        document.getElementById('completePaymentBtn').addEventListener('click', () => this.completePayment());

        // Payment methods
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectPaymentMethod(e.target.dataset.method));
        });

        // Received amount input
        document.getElementById('receivedAmount').addEventListener('input', () => this.calculateChange());

        // Modal close events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
    }

    loadProducts() {
        return [
            { id: 1, name: 'Dvoposteljna soba', category: 'Nastanitve', price: 120.00 },
            { id: 2, name: 'Enoposteljna soba', category: 'Nastanitve', price: 80.00 },
            { id: 3, name: 'Apartma', category: 'Nastanitve', price: 180.00 },
            { id: 4, name: 'Rafting na Soči', category: 'Aktivnosti', price: 45.00 },
            { id: 5, name: 'Pohodništvo', category: 'Aktivnosti', price: 25.00 },
            { id: 6, name: 'Kolesarjenje', category: 'Aktivnosti', price: 35.00 },
            { id: 7, name: 'Zajtrk', category: 'Prehrana', price: 12.00 },
            { id: 8, name: 'Kosilo', category: 'Prehrana', price: 18.00 },
            { id: 9, name: 'Večerja', category: 'Prehrana', price: 25.00 },
            { id: 10, name: 'Parkirnina', category: 'Dodatki', price: 5.00 },
            { id: 11, name: 'WiFi', category: 'Dodatki', price: 3.00 },
            { id: 12, name: 'Turistična taksa', category: 'Dodatki', price: 2.50 }
        ];
    }

    loadTransactions() {
        const saved = localStorage.getItem('omni_blagajna_transactions');
        return saved ? JSON.parse(saved) : [];
    }

    renderProducts(products = this.products) {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = '';

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price.toFixed(2)}€</div>
            `;
            card.addEventListener('click', () => this.addToCart(product));
            grid.appendChild(card);
        });
    }

    filterProducts(searchTerm) {
        const filtered = this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderProducts(filtered);
    }

    filterByCategory(category) {
        // Update active category button
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        const filtered = category === 'all' ? this.products : 
            this.products.filter(product => product.category === category);
        this.renderProducts(filtered);
    }

    addToCart(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }

        this.updateCartDisplay();
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        cartItems.innerHTML = '';

        this.cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price.toFixed(2)}€ × ${item.quantity}</div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="blagajnaModule.changeQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="blagajnaModule.changeQuantity(${item.id}, 1)">+</button>
                    <button class="quantity-btn" onclick="blagajnaModule.removeFromCart(${item.id})" style="margin-left: 10px; color: red;">×</button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });

        this.updateCartSummary();
    }

    changeQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.updateCartDisplay();
            }
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartDisplay();
    }

    clearCart() {
        if (confirm('Ali ste prepričani, da želite počistiti košarico?')) {
            this.cart = [];
            this.updateCartDisplay();
        }
    }

    updateCartSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.22; // 22% DDV
        const total = subtotal + tax;

        document.getElementById('subtotal').textContent = subtotal.toFixed(2) + '€';
        document.getElementById('tax').textContent = tax.toFixed(2) + '€';
        document.getElementById('total').textContent = total.toFixed(2) + '€';

        // Update received amount placeholder
        document.getElementById('receivedAmount').placeholder = total.toFixed(2);
        
        this.calculateChange();
    }

    selectPaymentMethod(method) {
        document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-method="${method}"]`).classList.add('active');
    }

    calculateChange() {
        const total = parseFloat(document.getElementById('total').textContent.replace('€', ''));
        const received = parseFloat(document.getElementById('receivedAmount').value) || 0;
        const change = received - total;
        
        document.getElementById('changeAmount').textContent = Math.max(0, change).toFixed(2) + '€';
    }

    completePayment() {
        if (this.cart.length === 0) {
            alert('Košarica je prazna!');
            return;
        }

        const total = parseFloat(document.getElementById('total').textContent.replace('€', ''));
        const received = parseFloat(document.getElementById('receivedAmount').value) || 0;
        const paymentMethod = document.querySelector('.payment-btn.active').dataset.method;

        if (paymentMethod === 'gotovina' && received < total) {
            alert('Prejeti znesek je premajhen!');
            return;
        }

        // Create transaction
        const transaction = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            items: [...this.cart],
            subtotal: parseFloat(document.getElementById('subtotal').textContent.replace('€', '')),
            tax: parseFloat(document.getElementById('tax').textContent.replace('€', '')),
            total: total,
            paymentMethod: paymentMethod,
            received: received,
            change: Math.max(0, received - total)
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        
        // Show receipt
        this.showReceipt(transaction);
        
        // Clear cart
        this.cart = [];
        this.updateCartDisplay();
        document.getElementById('receivedAmount').value = '';
        
        // Update stats
        this.updateStats();
    }

    showReceipt(transaction) {
        const modal = document.getElementById('receiptModal');
        const content = document.getElementById('receiptContent');
        
        content.innerHTML = `
            <div class="receipt-header">
                <h3>OMNI TURIZEM</h3>
                <p>Račun št: ${transaction.id}</p>
                <p>${transaction.date} ${transaction.time}</p>
            </div>
            
            <div class="receipt-items">
                ${transaction.items.map(item => `
                    <div class="receipt-item">
                        <span>${item.name} x${item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}€</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="receipt-total">
                <div class="receipt-item">
                    <span>Skupaj brez DDV:</span>
                    <span>${transaction.subtotal.toFixed(2)}€</span>
                </div>
                <div class="receipt-item">
                    <span>DDV (22%):</span>
                    <span>${transaction.tax.toFixed(2)}€</span>
                </div>
                <div class="receipt-item">
                    <span><strong>SKUPAJ:</strong></span>
                    <span><strong>${transaction.total.toFixed(2)}€</strong></span>
                </div>
                <div class="receipt-item">
                    <span>Plačilo (${transaction.paymentMethod}):</span>
                    <span>${transaction.received.toFixed(2)}€</span>
                </div>
                ${transaction.change > 0 ? `
                <div class="receipt-item">
                    <span>Vračilo:</span>
                    <span>${transaction.change.toFixed(2)}€</span>
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <p>Hvala za nakup!</p>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    newSale() {
        this.clearCart();
        document.getElementById('receivedAmount').value = '';
        document.querySelector('[data-method="gotovina"]').click();
    }

    showHistory() {
        const modal = document.getElementById('historyModal');
        this.renderTransactionHistory();
        modal.style.display = 'block';
    }

    renderTransactionHistory() {
        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = '';

        this.transactions.slice(-50).reverse().forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.date}</td>
                <td>${transaction.time}</td>
                <td>${transaction.total.toFixed(2)}€</td>
                <td>${transaction.paymentMethod}</td>
                <td>${transaction.items.length} izdelkov</td>
                <td>
                    <button class="btn btn-sm" onclick="blagajnaModule.viewTransaction(${transaction.id})">Poglej</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    viewTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (transaction) {
            this.showReceipt(transaction);
        }
    }

    showReports() {
        alert('Poročila bodo na voljo v prihodnji verziji.');
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = this.transactions.filter(t => t.date === today);
        
        const dailyRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
        const transactionCount = todayTransactions.length;
        const averageTransaction = transactionCount > 0 ? dailyRevenue / transactionCount : 0;
        
        // Find most sold product
        const productCounts = {};
        todayTransactions.forEach(transaction => {
            transaction.items.forEach(item => {
                productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
            });
        });
        
        const topProduct = Object.keys(productCounts).length > 0 ? 
            Object.keys(productCounts).reduce((a, b) => productCounts[a] > productCounts[b] ? a : b) : '-';

        document.getElementById('dailyRevenue').textContent = dailyRevenue.toFixed(2) + '€';
        document.getElementById('transactionCount').textContent = transactionCount;
        document.getElementById('averageTransaction').textContent = averageTransaction.toFixed(2) + '€';
        document.getElementById('topProduct').textContent = topProduct;
    }

    saveTransactions() {
        localStorage.setItem('omni_blagajna_transactions', JSON.stringify(this.transactions));
    }
}

// Initialize module
const blagajnaModule = new BlagajnaModule();

// Make it globally available
window.blagajnaModule = blagajnaModule;