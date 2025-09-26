// AI Optimizacija Module - Napredne analitike in optimizacija poslovanja
console.log('🤖 AI Optimizacija modul naložen');

class AIOptimizacijaModule {
    constructor() {
        this.analytics = this.loadAnalytics();
        this.recommendations = [];
        this.forecasts = {};
        this.optimizations = {};
        this.init();
    }

    init() {
        this.createInterface();
        this.bindEvents();
        this.generateRecommendations();
        this.calculateForecasts();
        this.renderDashboard();
    }

    createInterface() {
        document.body.innerHTML = `
            <div class="ai-container">
                <header class="module-header">
                    <h1>🤖 AI Optimizacija - Pametne analitike in priporočila</h1>
                    <div class="header-actions">
                        <button id="refreshAnalyticsBtn" class="btn btn-primary">🔄 Osveži analitike</button>
                        <button id="exportReportBtn" class="btn btn-success">📊 Izvozi poročilo</button>
                        <button id="settingsBtn" class="btn btn-secondary">⚙️ Nastavitve</button>
                    </div>
                </header>

                <div class="main-tabs">
                    <button class="tab-btn active" data-tab="dashboard">📊 Nadzorna plošča</button>
                    <button class="tab-btn" data-tab="recommendations">💡 Priporočila</button>
                    <button class="tab-btn" data-tab="forecasting">📈 Napovedi</button>
                    <button class="tab-btn" data-tab="optimization">⚡ Optimizacija</button>
                    <button class="tab-btn" data-tab="insights">🔍 Vpogledi</button>
                </div>

                <!-- Dashboard Tab -->
                <div id="dashboardTab" class="tab-content active">
                    <div class="kpi-cards">
                        <div class="kpi-card revenue">
                            <div class="kpi-icon">💰</div>
                            <div class="kpi-content">
                                <h3>Prihodki (mesec)</h3>
                                <p id="monthlyRevenue">€0</p>
                                <span class="kpi-trend" id="revenueTrend">+0%</span>
                            </div>
                        </div>
                        <div class="kpi-card occupancy">
                            <div class="kpi-icon">🏨</div>
                            <div class="kpi-content">
                                <h3>Zasedenost</h3>
                                <p id="occupancyRate">0%</p>
                                <span class="kpi-trend" id="occupancyTrend">+0%</span>
                            </div>
                        </div>
                        <div class="kpi-card satisfaction">
                            <div class="kpi-icon">⭐</div>
                            <div class="kpi-content">
                                <h3>Zadovoljstvo</h3>
                                <p id="satisfactionScore">0.0</p>
                                <span class="kpi-trend" id="satisfactionTrend">+0%</span>
                            </div>
                        </div>
                        <div class="kpi-card efficiency">
                            <div class="kpi-icon">⚡</div>
                            <div class="kpi-content">
                                <h3>Učinkovitost</h3>
                                <p id="efficiencyScore">0%</p>
                                <span class="kpi-trend" id="efficiencyTrend">+0%</span>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-grid">
                        <div class="dashboard-card">
                            <h3>📈 Trend prihodkov</h3>
                            <div class="chart-container" id="revenueChart">
                                <canvas id="revenueCanvas" width="400" height="200"></canvas>
                            </div>
                        </div>
                        
                        <div class="dashboard-card">
                            <h3>🎯 Optimizacijski potencial</h3>
                            <div class="optimization-metrics">
                                <div class="metric">
                                    <span>Cenovna optimizacija:</span>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: 75%"></div>
                                    </div>
                                    <span>+15% potencial</span>
                                </div>
                                <div class="metric">
                                    <span>Upravljanje zalog:</span>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: 60%"></div>
                                    </div>
                                    <span>+12% potencial</span>
                                </div>
                                <div class="metric">
                                    <span>Operativna učinkovitost:</span>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: 85%"></div>
                                    </div>
                                    <span>+8% potencial</span>
                                </div>
                            </div>
                        </div>

                        <div class="dashboard-card">
                            <h3>🔥 Vroče priložnosti</h3>
                            <div class="opportunities-list" id="hotOpportunities">
                            </div>
                        </div>

                        <div class="dashboard-card">
                            <h3>⚠️ Opozorila in tveganja</h3>
                            <div class="alerts-list" id="alertsList">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recommendations Tab -->
                <div id="recommendationsTab" class="tab-content">
                    <div class="recommendations-header">
                        <h2>💡 AI Priporočila za optimizacijo</h2>
                        <div class="recommendation-filters">
                            <select id="categoryFilter">
                                <option value="">Vse kategorije</option>
                                <option value="pricing">Cene</option>
                                <option value="inventory">Zaloge</option>
                                <option value="marketing">Marketing</option>
                                <option value="operations">Operacije</option>
                            </select>
                            <select id="priorityFilter">
                                <option value="">Vse prioritete</option>
                                <option value="high">Visoka</option>
                                <option value="medium">Srednja</option>
                                <option value="low">Nizka</option>
                            </select>
                        </div>
                    </div>

                    <div class="recommendations-grid" id="recommendationsGrid">
                    </div>
                </div>

                <!-- Forecasting Tab -->
                <div id="forecastingTab" class="tab-content">
                    <div class="forecasting-controls">
                        <h2>📈 Napovedi in projekcije</h2>
                        <div class="forecast-options">
                            <select id="forecastPeriod">
                                <option value="7">Naslednji teden</option>
                                <option value="30" selected>Naslednji mesec</option>
                                <option value="90">Naslednji kvartal</option>
                                <option value="365">Naslednje leto</option>
                            </select>
                            <select id="forecastMetric">
                                <option value="revenue">Prihodki</option>
                                <option value="occupancy">Zasedenost</option>
                                <option value="bookings">Rezervacije</option>
                                <option value="demand">Povpraševanje</option>
                            </select>
                            <button id="generateForecastBtn" class="btn btn-primary">Generiraj napoved</button>
                        </div>
                    </div>

                    <div class="forecast-results">
                        <div class="forecast-chart">
                            <h3>Napoved za izbrano obdobje</h3>
                            <div class="chart-container" id="forecastChart">
                                <canvas id="forecastCanvas" width="600" height="300"></canvas>
                            </div>
                        </div>

                        <div class="forecast-summary">
                            <h3>Povzetek napovedi</h3>
                            <div class="forecast-stats" id="forecastStats">
                            </div>
                        </div>
                    </div>

                    <div class="scenario-analysis">
                        <h3>Scenarijska analiza</h3>
                        <div class="scenarios">
                            <div class="scenario optimistic">
                                <h4>🚀 Optimistični scenarij</h4>
                                <p>Rast: <span id="optimisticGrowth">+25%</span></p>
                                <p>Verjetnost: <span>30%</span></p>
                            </div>
                            <div class="scenario realistic">
                                <h4>📊 Realistični scenarij</h4>
                                <p>Rast: <span id="realisticGrowth">+12%</span></p>
                                <p>Verjetnost: <span>50%</span></p>
                            </div>
                            <div class="scenario pessimistic">
                                <h4>⚠️ Pesimistični scenarij</h4>
                                <p>Rast: <span id="pessimisticGrowth">-5%</span></p>
                                <p>Verjetnost: <span>20%</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Optimization Tab -->
                <div id="optimizationTab" class="tab-content">
                    <div class="optimization-header">
                        <h2>⚡ Avtomatska optimizacija</h2>
                        <div class="optimization-controls">
                            <button id="runOptimizationBtn" class="btn btn-primary">🚀 Zaženi optimizacijo</button>
                            <button id="scheduleOptimizationBtn" class="btn btn-secondary">⏰ Načrtuj optimizacijo</button>
                        </div>
                    </div>

                    <div class="optimization-modules">
                        <div class="optimization-module">
                            <h3>💰 Dinamično oblikovanje cen</h3>
                            <div class="module-content">
                                <p>Avtomatsko prilagajanje cen glede na povpraševanje, konkurenco in sezonske trende.</p>
                                <div class="optimization-settings">
                                    <label>
                                        <input type="checkbox" id="dynamicPricing" checked>
                                        Omogoči dinamično oblikovanje cen
                                    </label>
                                    <label>
                                        Maksimalna sprememba: 
                                        <input type="range" id="maxPriceChange" min="5" max="50" value="20">
                                        <span id="maxPriceChangeValue">20%</span>
                                    </label>
                                </div>
                                <div class="optimization-results" id="pricingResults">
                                </div>
                            </div>
                        </div>

                        <div class="optimization-module">
                            <h3>📦 Optimizacija zalog</h3>
                            <div class="module-content">
                                <p>Pametno upravljanje zalog in kapacitet za maksimalno izkoriščenost.</p>
                                <div class="optimization-settings">
                                    <label>
                                        <input type="checkbox" id="inventoryOptimization" checked>
                                        Omogoči optimizacijo zalog
                                    </label>
                                    <label>
                                        Ciljna zasedenost: 
                                        <input type="range" id="targetOccupancy" min="70" max="95" value="85">
                                        <span id="targetOccupancyValue">85%</span>
                                    </label>
                                </div>
                                <div class="optimization-results" id="inventoryResults">
                                </div>
                            </div>
                        </div>

                        <div class="optimization-module">
                            <h3>📢 Marketing optimizacija</h3>
                            <div class="module-content">
                                <p>Optimizacija marketinških kampanj in ciljnih skupin za boljši ROI.</p>
                                <div class="optimization-settings">
                                    <label>
                                        <input type="checkbox" id="marketingOptimization" checked>
                                        Omogoči marketing optimizacijo
                                    </label>
                                    <label>
                                        Marketing proračun: 
                                        <input type="number" id="marketingBudget" value="1000" min="100" max="10000">
                                        €/mesec
                                    </label>
                                </div>
                                <div class="optimization-results" id="marketingResults">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Insights Tab -->
                <div id="insightsTab" class="tab-content">
                    <div class="insights-header">
                        <h2>🔍 Poglobljenji vpogledi</h2>
                        <div class="insights-filters">
                            <select id="insightsPeriod">
                                <option value="7">Zadnji teden</option>
                                <option value="30" selected>Zadnji mesec</option>
                                <option value="90">Zadnji kvartal</option>
                            </select>
                            <button id="generateInsightsBtn" class="btn btn-primary">Generiraj vpoglede</button>
                        </div>
                    </div>

                    <div class="insights-grid">
                        <div class="insight-card">
                            <h3>🎯 Segmentacija gostov</h3>
                            <div class="segment-analysis" id="guestSegmentation">
                            </div>
                        </div>

                        <div class="insight-card">
                            <h3>📊 Analiza konkurence</h3>
                            <div class="competition-analysis" id="competitionAnalysis">
                            </div>
                        </div>

                        <div class="insight-card">
                            <h3>🌟 Ključni dejavniki uspeha</h3>
                            <div class="success-factors" id="successFactors">
                            </div>
                        </div>

                        <div class="insight-card">
                            <h3>⚠️ Analiza tveganj</h3>
                            <div class="risk-analysis" id="riskAnalysis">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Modal -->
                <div id="settingsModal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2>⚙️ AI Nastavitve</h2>
                        <form id="settingsForm">
                            <div class="settings-section">
                                <h3>Splošne nastavitve</h3>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="autoOptimization" checked>
                                        Avtomatska optimizacija
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="realTimeAlerts" checked>
                                        Opozorila v realnem času
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label for="optimizationFrequency">Pogostost optimizacije:</label>
                                    <select id="optimizationFrequency">
                                        <option value="hourly">Vsako uro</option>
                                        <option value="daily" selected>Dnevno</option>
                                        <option value="weekly">Tedensko</option>
                                    </select>
                                </div>
                            </div>

                            <div class="settings-section">
                                <h3>AI Model nastavitve</h3>
                                <div class="form-group">
                                    <label for="modelSensitivity">Občutljivost modela:</label>
                                    <input type="range" id="modelSensitivity" min="1" max="10" value="7">
                                    <span id="sensitivityValue">7</span>
                                </div>
                                <div class="form-group">
                                    <label for="confidenceThreshold">Prag zaupanja:</label>
                                    <input type="range" id="confidenceThreshold" min="50" max="95" value="80">
                                    <span id="confidenceValue">80%</span>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Shrani nastavitve</button>
                                <button type="button" class="btn btn-secondary" id="cancelSettingsBtn">Prekliči</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .ai-container {
                    padding: 20px;
                    max-width: 1800px;
                    margin: 0 auto;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                }

                .module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding: 25px;
                    background: rgba(255, 255, 255, 0.95);
                    color: #333;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    backdrop-filter: blur(10px);
                }

                .module-header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .main-tabs {
                    display: flex;
                    margin-bottom: 25px;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    padding: 5px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }

                .tab-btn {
                    flex: 1;
                    padding: 15px 20px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-weight: 600;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    color: #666;
                }

                .tab-btn.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }

                .tab-content {
                    display: none;
                }

                .tab-content.active {
                    display: block;
                }

                .kpi-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .kpi-card {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    backdrop-filter: blur(10px);
                    transition: transform 0.3s ease;
                }

                .kpi-card:hover {
                    transform: translateY(-5px);
                }

                .kpi-icon {
                    font-size: 48px;
                    width: 80px;
                    height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .kpi-content h3 {
                    margin: 0 0 10px 0;
                    color: #666;
                    font-size: 14px;
                    font-weight: 600;
                }

                .kpi-content p {
                    margin: 0 0 5px 0;
                    font-size: 32px;
                    font-weight: 700;
                    color: #333;
                }

                .kpi-trend {
                    font-size: 14px;
                    font-weight: 600;
                    padding: 4px 8px;
                    border-radius: 12px;
                    background: #d4edda;
                    color: #155724;
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 25px;
                }

                .dashboard-card {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    backdrop-filter: blur(10px);
                }

                .dashboard-card h3 {
                    margin: 0 0 20px 0;
                    color: #333;
                    font-size: 18px;
                    font-weight: 600;
                }

                .chart-container {
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8f9fa;
                    border-radius: 8px;
                    position: relative;
                }

                .optimization-metrics {
                    space-y: 15px;
                }

                .metric {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 15px;
                }

                .progress-bar {
                    flex: 1;
                    height: 8px;
                    background: #e9ecef;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress {
                    height: 100%;
                    background: linear-gradient(90deg, #28a745, #20c997);
                    transition: width 0.3s ease;
                }

                .opportunities-list, .alerts-list {
                    space-y: 10px;
                }

                .opportunity-item, .alert-item {
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 10px;
                }

                .opportunity-item {
                    background: #d4edda;
                    border-left: 4px solid #28a745;
                }

                .alert-item {
                    background: #f8d7da;
                    border-left: 4px solid #dc3545;
                }

                .recommendations-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 20px;
                }

                .recommendation-card {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    backdrop-filter: blur(10px);
                }

                .recommendation-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .priority-badge {
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .priority-high { background: #f8d7da; color: #721c24; }
                .priority-medium { background: #fff3cd; color: #856404; }
                .priority-low { background: #d1ecf1; color: #0c5460; }

                .forecast-results {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 25px;
                    margin-top: 25px;
                }

                .forecast-chart, .forecast-summary {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    backdrop-filter: blur(10px);
                }

                .scenarios {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-top: 20px;
                }

                .scenario {
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                }

                .scenario.optimistic { background: #d4edda; }
                .scenario.realistic { background: #e2e3e5; }
                .scenario.pessimistic { background: #f8d7da; }

                .optimization-modules {
                    display: grid;
                    gap: 25px;
                }

                .optimization-module {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    backdrop-filter: blur(10px);
                }

                .optimization-settings {
                    margin: 20px 0;
                }

                .optimization-settings label {
                    display: block;
                    margin-bottom: 15px;
                    font-weight: 600;
                }

                .insights-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 25px;
                }

                .insight-card {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    backdrop-filter: blur(10px);
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
                    padding: 30px;
                    border-radius: 15px;
                    width: 90%;
                    max-width: 600px;
                    position: relative;
                    max-height: 80vh;
                    overflow-y: auto;
                }

                .settings-section {
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e9ecef;
                }

                .settings-section h3 {
                    margin-bottom: 15px;
                    color: #333;
                }

                .form-group {
                    margin-bottom: 15px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                }

                .form-group input, .form-group select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .form-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: flex-end;
                    margin-top: 25px;
                }

                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    display: inline-block;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .btn-success {
                    background: #28a745;
                    color: white;
                }

                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                }

                .close {
                    position: absolute;
                    right: 20px;
                    top: 20px;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                    color: #999;
                }

                .close:hover {
                    color: #333;
                }

                @media (max-width: 768px) {
                    .ai-container {
                        padding: 10px;
                    }
                    
                    .module-header {
                        flex-direction: column;
                        gap: 15px;
                    }
                    
                    .main-tabs {
                        flex-direction: column;
                    }
                    
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .forecast-results {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
    }

    bindEvents() {
        // Header buttons
        document.getElementById('refreshAnalyticsBtn').addEventListener('click', () => this.refreshAnalytics());
        document.getElementById('exportReportBtn').addEventListener('click', () => this.exportReport());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Optimization
        document.getElementById('runOptimizationBtn').addEventListener('click', () => this.runOptimization());
        document.getElementById('scheduleOptimizationBtn').addEventListener('click', () => this.scheduleOptimization());

        // Forecasting
        document.getElementById('generateForecastBtn').addEventListener('click', () => this.generateForecast());

        // Insights
        document.getElementById('generateInsightsBtn').addEventListener('click', () => this.generateInsights());

        // Settings
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('settingsModal').style.display = 'none';
        });

        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').style.display = 'none';
        });

        document.getElementById('settingsForm').addEventListener('submit', (e) => this.saveSettings(e));

        // Range inputs
        document.getElementById('maxPriceChange').addEventListener('input', (e) => {
            document.getElementById('maxPriceChangeValue').textContent = e.target.value + '%';
        });

        document.getElementById('targetOccupancy').addEventListener('input', (e) => {
            document.getElementById('targetOccupancyValue').textContent = e.target.value + '%';
        });

        document.getElementById('modelSensitivity').addEventListener('input', (e) => {
            document.getElementById('sensitivityValue').textContent = e.target.value;
        });

        document.getElementById('confidenceThreshold').addEventListener('input', (e) => {
            document.getElementById('confidenceValue').textContent = e.target.value + '%';
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // Load specific tab content
        switch(tabName) {
            case 'recommendations':
                this.renderRecommendations();
                break;
            case 'forecasting':
                this.renderForecasting();
                break;
            case 'optimization':
                this.renderOptimization();
                break;
            case 'insights':
                this.renderInsights();
                break;
        }
    }

    renderDashboard() {
        // Simulate KPI data
        const kpis = {
            monthlyRevenue: 45680,
            revenueTrend: 12.5,
            occupancyRate: 78,
            occupancyTrend: 5.2,
            satisfactionScore: 4.6,
            satisfactionTrend: 3.1,
            efficiencyScore: 85,
            efficiencyTrend: 8.7
        };

        // Update KPI cards
        document.getElementById('monthlyRevenue').textContent = `€${kpis.monthlyRevenue.toLocaleString()}`;
        document.getElementById('revenueTrend').textContent = `+${kpis.revenueTrend}%`;
        document.getElementById('occupancyRate').textContent = `${kpis.occupancyRate}%`;
        document.getElementById('occupancyTrend').textContent = `+${kpis.occupancyTrend}%`;
        document.getElementById('satisfactionScore').textContent = kpis.satisfactionScore.toFixed(1);
        document.getElementById('satisfactionTrend').textContent = `+${kpis.satisfactionTrend}%`;
        document.getElementById('efficiencyScore').textContent = `${kpis.efficiencyScore}%`;
        document.getElementById('efficiencyTrend').textContent = `+${kpis.efficiencyTrend}%`;

        // Render revenue chart (simplified)
        this.renderRevenueChart();

        // Hot opportunities
        const opportunities = [
            { text: 'Povišaj cene za vikende za +15%', impact: 'Visok' },
            { text: 'Optimiziraj zaloge za poletno sezono', impact: 'Srednji' },
            { text: 'Lansira novo marketinško kampanjo', impact: 'Visok' }
        ];

        const opportunitiesContainer = document.getElementById('hotOpportunities');
        opportunitiesContainer.innerHTML = opportunities.map(opp => `
            <div class="opportunity-item">
                <strong>${opp.text}</strong>
                <br><small>Vpliv: ${opp.impact}</small>
            </div>
        `).join('');

        // Alerts
        const alerts = [
            { text: 'Nizka zaloga sob za naslednji teden', type: 'warning' },
            { text: 'Konkurenca je znižala cene za 10%', type: 'danger' },
            { text: 'Visoko povpraševanje za aktivnosti', type: 'info' }
        ];

        const alertsContainer = document.getElementById('alertsList');
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <strong>${alert.text}</strong>
            </div>
        `).join('');
    }

    renderRevenueChart() {
        const canvas = document.getElementById('revenueCanvas');
        const ctx = canvas.getContext('2d');
        
        // Simple line chart simulation
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const points = [50, 65, 45, 80, 70, 90, 85, 95];
        const stepX = canvas.width / (points.length - 1);
        
        points.forEach((point, index) => {
            const x = index * stepX;
            const y = canvas.height - (point / 100 * canvas.height);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Add text
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText('Trend prihodkov zadnjih 8 tednov', 10, 20);
    }

    generateRecommendations() {
        this.recommendations = [
            {
                id: 1,
                title: 'Dinamično oblikovanje cen',
                category: 'pricing',
                priority: 'high',
                description: 'Implementiraj dinamično oblikovanje cen za povečanje prihodkov za 15-20%.',
                impact: 'Visok',
                effort: 'Srednji',
                timeline: '2-3 tedne'
            },
            {
                id: 2,
                title: 'Optimizacija zalog',
                category: 'inventory',
                priority: 'medium',
                description: 'Prerazporedi zaloge glede na sezonske trende za boljšo zasedenost.',
                impact: 'Srednji',
                effort: 'Nizek',
                timeline: '1 teden'
            },
            {
                id: 3,
                title: 'Ciljno usmerjeno oglaševanje',
                category: 'marketing',
                priority: 'high',
                description: 'Ustvari personalizirane kampanje za različne segmente gostov.',
                impact: 'Visok',
                effort: 'Visok',
                timeline: '3-4 tedne'
            },
            {
                id: 4,
                title: 'Avtomatizacija procesov',
                category: 'operations',
                priority: 'medium',
                description: 'Avtomatiziraj rutinske naloge za povečanje učinkovitosti za 25%.',
                impact: 'Srednji',
                effort: 'Visok',
                timeline: '4-6 tednov'
            }
        ];
    }

    renderRecommendations() {
        const grid = document.getElementById('recommendationsGrid');
        grid.innerHTML = this.recommendations.map(rec => `
            <div class="recommendation-card">
                <div class="recommendation-header">
                    <h3>${rec.title}</h3>
                    <span class="priority-badge priority-${rec.priority}">${rec.priority}</span>
                </div>
                <p>${rec.description}</p>
                <div class="recommendation-metrics">
                    <div><strong>Vpliv:</strong> ${rec.impact}</div>
                    <div><strong>Napor:</strong> ${rec.effort}</div>
                    <div><strong>Časovnica:</strong> ${rec.timeline}</div>
                </div>
                <div class="recommendation-actions" style="margin-top: 15px;">
                    <button class="btn btn-primary" onclick="aiModule.implementRecommendation(${rec.id})">
                        Implementiraj
                    </button>
                    <button class="btn btn-secondary" onclick="aiModule.dismissRecommendation(${rec.id})">
                        Zavrni
                    </button>
                </div>
            </div>
        `).join('');
    }

    calculateForecasts() {
        // Simulate forecast calculations
        this.forecasts = {
            revenue: {
                7: { value: 12500, growth: 8.5, confidence: 85 },
                30: { value: 52000, growth: 12.3, confidence: 78 },
                90: { value: 165000, growth: 15.7, confidence: 65 },
                365: { value: 680000, growth: 18.2, confidence: 55 }
            },
            occupancy: {
                7: { value: 82, growth: 5.2, confidence: 90 },
                30: { value: 78, growth: 3.8, confidence: 85 },
                90: { value: 75, growth: 2.1, confidence: 75 },
                365: { value: 73, growth: 1.5, confidence: 60 }
            }
        };
    }

    generateForecast() {
        const period = document.getElementById('forecastPeriod').value;
        const metric = document.getElementById('forecastMetric').value;
        
        // Simulate forecast generation
        const forecast = this.forecasts[metric] && this.forecasts[metric][period] || 
                        { value: Math.random() * 100000, growth: Math.random() * 20, confidence: 70 + Math.random() * 20 };
        
        // Update forecast stats
        const statsContainer = document.getElementById('forecastStats');
        statsContainer.innerHTML = `
            <div class="forecast-stat">
                <h4>Napoved za ${period} dni</h4>
                <p class="forecast-value">${metric === 'revenue' ? '€' + forecast.value.toLocaleString() : forecast.value.toFixed(1) + (metric === 'occupancy' ? '%' : '')}</p>
            </div>
            <div class="forecast-stat">
                <h4>Pričakovana rast</h4>
                <p class="forecast-growth">+${forecast.growth.toFixed(1)}%</p>
            </div>
            <div class="forecast-stat">
                <h4>Zaupanje</h4>
                <p class="forecast-confidence">${forecast.confidence.toFixed(0)}%</p>
            </div>
        `;

        // Render forecast chart
        this.renderForecastChart(period, metric);
    }

    renderForecastChart(period, metric) {
        const canvas = document.getElementById('forecastCanvas');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Generate sample forecast data
        const dataPoints = parseInt(period) / 7; // Weekly points
        const historicalData = [];
        const forecastData = [];
        
        for (let i = 0; i < dataPoints; i++) {
            historicalData.push(50 + Math.random() * 30);
            forecastData.push(60 + Math.random() * 25 + i * 2);
        }
        
        // Draw historical data (blue)
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const stepX = canvas.width / (dataPoints * 2);
        historicalData.forEach((point, index) => {
            const x = index * stepX;
            const y = canvas.height - (point / 100 * canvas.height);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw forecast data (green, dashed)
        ctx.strokeStyle = '#28a745';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        
        forecastData.forEach((point, index) => {
            const x = (dataPoints + index) * stepX;
            const y = canvas.height - (point / 100 * canvas.height);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('Zgodovina', 10, 20);
        ctx.fillStyle = '#28a745';
        ctx.fillText('Napoved', canvas.width - 60, 20);
    }

    runOptimization() {
        // Simulate optimization process
        const optimizationSteps = [
            'Analiziram trenutne podatke...',
            'Identificiram priložnosti...',
            'Računam optimalne parametre...',
            'Testiram scenarije...',
            'Generiram priporočila...'
        ];

        let step = 0;
        const interval = setInterval(() => {
            if (step < optimizationSteps.length) {
                console.log(optimizationSteps[step]);
                step++;
            } else {
                clearInterval(interval);
                this.showOptimizationResults();
            }
        }, 1000);
    }

    showOptimizationResults() {
        // Update optimization results
        document.getElementById('pricingResults').innerHTML = `
            <div class="optimization-result">
                <h4>Priporočene spremembe cen:</h4>
                <ul>
                    <li>Dvoposteljna soba: +12% (€134)</li>
                    <li>Aktivnosti: +8% (€27)</li>
                    <li>Dodatne storitve: +15% (€23)</li>
                </ul>
                <p><strong>Pričakovana rast prihodkov: +18%</strong></p>
            </div>
        `;

        document.getElementById('inventoryResults').innerHTML = `
            <div class="optimization-result">
                <h4>Optimizacija zalog:</h4>
                <ul>
                    <li>Prerazporedi 3 sobe iz nizke v visoko sezono</li>
                    <li>Povečaj kapaciteto aktivnosti za 25%</li>
                    <li>Zmanjšaj minimalne zaloge za 15%</li>
                </ul>
                <p><strong>Pričakovana izboljšava zasedenosti: +12%</strong></p>
            </div>
        `;

        document.getElementById('marketingResults').innerHTML = `
            <div class="optimization-result">
                <h4>Marketing optimizacija:</h4>
                <ul>
                    <li>Fokus na segment 25-45 let</li>
                    <li>Povečaj investicijo v digitalne kanale za 30%</li>
                    <li>Ustvari personalizirane ponudbe</li>
                </ul>
                <p><strong>Pričakovana izboljšava ROI: +25%</strong></p>
            </div>
        `;

        alert('Optimizacija je bila uspešno zaključena! Preveri rezultate v posameznih modulih.');
    }

    generateInsights() {
        // Simulate insights generation
        this.renderGuestSegmentation();
        this.renderCompetitionAnalysis();
        this.renderSuccessFactors();
        this.renderRiskAnalysis();
    }

    renderGuestSegmentation() {
        document.getElementById('guestSegmentation').innerHTML = `
            <div class="segment">
                <h4>🏖️ Družine (35%)</h4>
                <p>Povprečna vrednost: €450</p>
                <p>Sezonska aktivnost: Poletje</p>
            </div>
            <div class="segment">
                <h4>💼 Poslovni gostje (25%)</h4>
                <p>Povprečna vrednost: €320</p>
                <p>Sezonska aktivnost: Celo leto</p>
            </div>
            <div class="segment">
                <h4>🎒 Mladi potniki (40%)</h4>
                <p>Povprečna vrednost: €180</p>
                <p>Sezonska aktivnost: Pomlad/Jesen</p>
            </div>
        `;
    }

    renderCompetitionAnalysis() {
        document.getElementById('competitionAnalysis').innerHTML = `
            <div class="competition-metric">
                <span>Povprečna cena konkurence:</span>
                <span>€125 (-8%)</span>
            </div>
            <div class="competition-metric">
                <span>Zasedenost konkurence:</span>
                <span>72% (-6%)</span>
            </div>
            <div class="competition-metric">
                <span>Ocene konkurence:</span>
                <span>4.2/5 (-0.4)</span>
            </div>
            <p><strong>Konkurenčna prednost:</strong> Višja kakovost storitev in boljša lokacija</p>
        `;
    }

    renderSuccessFactors() {
        document.getElementById('successFactors').innerHTML = `
            <div class="success-factor">
                <span>Lokacija</span>
                <div class="factor-bar">
                    <div class="factor-progress" style="width: 90%"></div>
                </div>
                <span>90%</span>
            </div>
            <div class="success-factor">
                <span>Kakovost storitev</span>
                <div class="factor-bar">
                    <div class="factor-progress" style="width: 85%"></div>
                </div>
                <span>85%</span>
            </div>
            <div class="success-factor">
                <span>Cena-vrednost</span>
                <div class="factor-bar">
                    <div class="factor-progress" style="width: 75%"></div>
                </div>
                <span>75%</span>
            </div>
        `;
    }

    renderRiskAnalysis() {
        document.getElementById('riskAnalysis').innerHTML = `
            <div class="risk-item">
                <h4>⚠️ Sezonska odvisnost</h4>
                <p>Tveganje: Srednje | Verjetnost: 70%</p>
                <p>Mitigation: Razvoj zimskih aktivnosti</p>
            </div>
            <div class="risk-item">
                <h4>💰 Cenovna konkurenca</h4>
                <p>Tveganje: Visoko | Verjetnost: 60%</p>
                <p>Mitigation: Diferenciacija storitev</p>
            </div>
        `;
    }

    openSettings() {
        document.getElementById('settingsModal').style.display = 'block';
    }

    saveSettings(e) {
        e.preventDefault();
        
        const settings = {
            autoOptimization: document.getElementById('autoOptimization').checked,
            realTimeAlerts: document.getElementById('realTimeAlerts').checked,
            optimizationFrequency: document.getElementById('optimizationFrequency').value,
            modelSensitivity: document.getElementById('modelSensitivity').value,
            confidenceThreshold: document.getElementById('confidenceThreshold').value
        };

        localStorage.setItem('omni_ai_settings', JSON.stringify(settings));
        document.getElementById('settingsModal').style.display = 'none';
        alert('Nastavitve so bile uspešno shranjene!');
    }

    refreshAnalytics() {
        // Simulate analytics refresh
        this.renderDashboard();
        this.generateRecommendations();
        this.calculateForecasts();
        alert('Analitike so bile osvežene!');
    }

    exportReport() {
        // Simulate report export
        const reportData = {
            timestamp: new Date().toISOString(),
            kpis: {
                revenue: 45680,
                occupancy: 78,
                satisfaction: 4.6,
                efficiency: 85
            },
            recommendations: this.recommendations.length,
            forecasts: Object.keys(this.forecasts).length
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omni-ai-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    implementRecommendation(id) {
        const recommendation = this.recommendations.find(r => r.id === id);
        if (recommendation) {
            if (confirm(`Ali želite implementirati priporočilo: "${recommendation.title}"?`)) {
                // Simulate implementation
                alert(`Priporočilo "${recommendation.title}" je bilo uspešno implementirano!`);
                // Remove from recommendations
                this.recommendations = this.recommendations.filter(r => r.id !== id);
                this.renderRecommendations();
            }
        }
    }

    dismissRecommendation(id) {
        if (confirm('Ali ste prepričani, da želite zavrniti to priporočilo?')) {
            this.recommendations = this.recommendations.filter(r => r.id !== id);
            this.renderRecommendations();
        }
    }

    scheduleOptimization() {
        alert('Optimizacija je bila načrtovana za izvajanje vsak dan ob 2:00.');
    }

    loadAnalytics() {
        // Load saved analytics or return default
        const saved = localStorage.getItem('omni_ai_analytics');
        return saved ? JSON.parse(saved) : {};
    }

    saveAnalytics() {
        localStorage.setItem('omni_ai_analytics', JSON.stringify(this.analytics));
    }
}

// Initialize module
const aiModule = new AIOptimizacijaModule();

// Make it globally available
window.aiModule = aiModule;