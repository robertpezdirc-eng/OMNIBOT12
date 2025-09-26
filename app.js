// Omni AI Platform - Main Application JavaScript
console.log('Omni AI Platform - Initializing...');

// Global application state
window.OmniApp = {
    currentModule: 'dashboard',
    isInitialized: false,
    modules: {},
    config: {
        apiBaseUrl: window.location.origin,
        websocketUrl: `ws://${window.location.host}`,
        theme: localStorage.getItem('omni-theme') || 'dark'
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Omni App...');
    initializeApp();
});

function initializeApp() {
    try {
        // Set theme
        document.body.setAttribute('data-theme', OmniApp.config.theme);
        
        // Initialize modules
        initializeModules();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        loadInitialData();
        
        OmniApp.isInitialized = true;
        console.log('Omni App initialized successfully');
        
        // Show success notification
        showNotification('Omni AI Platform uspešno inicializiran', 'success');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Napaka pri inicializaciji aplikacije', 'error');
    }
}

function initializeModules() {
    // Initialize navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const module = this.getAttribute('data-module');
            if (module) {
                switchModule(module);
            }
        });
    });
    
    // Initialize sidebar modules
    const moduleItems = document.querySelectorAll('.module-item');
    moduleItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const module = this.getAttribute('data-module');
            if (module) {
                loadModuleContent(module);
            }
        });
    });
}

function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
    }
    
    // Responsive menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }
}

function switchModule(moduleName) {
    console.log(`Switching to module: ${moduleName}`);
    
    // Update active navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-module="${moduleName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Load module content
    loadModuleContent(moduleName);
    
    OmniApp.currentModule = moduleName;
}

function loadModuleContent(moduleName) {
    const contentArea = document.querySelector('.content-area');
    if (!contentArea) return;
    
    // Show loading state
    contentArea.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Nalagam modul...</p></div>';
    
    // Simulate module loading
    setTimeout(() => {
        let content = '';
        
        switch (moduleName) {
            case 'dashboard':
                content = generateDashboardContent();
                break;
            case 'analytics':
                content = generateAnalyticsContent();
                break;
            case 'turizem':
                content = generateTourismContent();
                break;
            case 'gostinstvo':
                content = generateHospitalityContent();
                break;
            case 'kmetijstvo':
                content = generateAgricultureContent();
                break;
            case 'zdravstvo':
                content = generateHealthcareContent();
                break;
            case 'it':
                content = generateITContent();
                break;
            case 'marketing':
                content = generateMarketingContent();
                break;
            case 'izobrazevanje':
                content = generateEducationContent();
                break;
            case 'finance':
                content = generateFinanceContent();
                break;
            case 'logistika':
                content = generateLogisticsContent();
                break;
            case 'umetnost':
                content = generateArtContent();
                break;
            case 'osebni-razvoj':
                content = generatePersonalDevelopmentContent();
                break;
            case 'trajnostni-razvoj':
                content = generateSustainabilityContent();
                break;
            case 'pravne-zadeve':
                content = generateLegalContent();
                break;
            case 'nastavitve':
                content = generateSettingsContent();
                break;
            default:
                content = `<div class="module-placeholder">
                    <h2>Modul: ${moduleName}</h2>
                    <p>Ta modul je v razvoju.</p>
                </div>`;
        }
        
        contentArea.innerHTML = content;
        
        // Initialize module-specific functionality
        initializeModuleSpecific(moduleName);
        
    }, 500);
}

function generateDashboardContent() {
    return `
        <div class="dashboard-overview">
            <h2>Nadzorna plošča</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">15</div>
                    <div class="stat-label">Aktivni moduli</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">98%</div>
                    <div class="stat-label">Sistemska učinkovitost</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">24/7</div>
                    <div class="stat-label">Razpoložljivost</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">1.2M</div>
                    <div class="stat-label">Obdelanih zahtev</div>
                </div>
            </div>
            
            <div class="quick-actions">
                <h3>Hitre akcije</h3>
                <div class="action-buttons">
                    <button class="action-btn" onclick="quickAction('new-project')">Nov projekt</button>
                    <button class="action-btn" onclick="quickAction('analytics')">Analitika</button>
                    <button class="action-btn" onclick="quickAction('reports')">Poročila</button>
                    <button class="action-btn" onclick="quickAction('settings')">Nastavitve</button>
                </div>
            </div>
            
            <div class="recent-activity">
                <h3>Nedavna aktivnost</h3>
                <div class="activity-list">
                    <div class="activity-item">
                        <span class="activity-time">Pred 5 min</span>
                        <span class="activity-desc">Uspešno posodobljen turizem modul</span>
                    </div>
                    <div class="activity-item">
                        <span class="activity-time">Pred 15 min</span>
                        <span class="activity-desc">Nova analitika za gostinstvo</span>
                    </div>
                    <div class="activity-item">
                        <span class="activity-time">Pred 1 uro</span>
                        <span class="activity-desc">Optimizacija kmetijskega modula</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateAnalyticsContent() {
    return `
        <div class="analytics-module">
            <h2>Analitika in poročila</h2>
            <div class="analytics-controls">
                <select id="analytics-period">
                    <option value="today">Danes</option>
                    <option value="week">Ta teden</option>
                    <option value="month">Ta mesec</option>
                    <option value="year">To leto</option>
                </select>
                <button class="btn-primary" onclick="refreshAnalytics()">Osveži podatke</button>
            </div>
            
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>Uporaba modulov</h3>
                    <div class="chart-placeholder">Graf uporabe modulov</div>
                </div>
                <div class="chart-container">
                    <h3>Sistemska učinkovitost</h3>
                    <div class="chart-placeholder">Graf učinkovitosti</div>
                </div>
                <div class="chart-container">
                    <h3>Uporabniška aktivnost</h3>
                    <div class="chart-placeholder">Graf aktivnosti</div>
                </div>
                <div class="chart-container">
                    <h3>ROI analiza</h3>
                    <div class="chart-placeholder">Graf ROI</div>
                </div>
            </div>
        </div>
    `;
}

function generateTourismContent() {
    return `
        <div class="tourism-module">
            <h2>Turizem</h2>
            <div class="module-tabs">
                <button class="tab-btn active" onclick="switchTab('itineraries')">Itinerarji</button>
                <button class="tab-btn" onclick="switchTab('activities')">Aktivnosti</button>
                <button class="tab-btn" onclick="switchTab('marketing')">Marketing</button>
                <button class="tab-btn" onclick="switchTab('analytics')">Analitika</button>
            </div>
            
            <div class="tab-content">
                <div class="tourism-tools">
                    <div class="tool-card">
                        <h3>Generator itinerarjev</h3>
                        <p>Ustvari personalizirane turistične programe</p>
                        <button class="btn-primary">Ustvari itinerar</button>
                    </div>
                    <div class="tool-card">
                        <h3>Lokalne aktivnosti</h3>
                        <p>Upravljaj in promoviral lokalne aktivnosti</p>
                        <button class="btn-primary">Upravljaj aktivnosti</button>
                    </div>
                    <div class="tool-card">
                        <h3>Sezonske strategije</h3>
                        <p>Optimiziraj ponudbo glede na sezono</p>
                        <button class="btn-primary">Načrtuj sezono</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateHospitalityContent() {
    return `
        <div class="hospitality-module">
            <h2>Gostinstvo</h2>
            <div class="hospitality-tools">
                <div class="tool-section">
                    <h3>Upravljanje menijev</h3>
                    <div class="tool-grid">
                        <button class="tool-btn" onclick="openMenuEditor()">Uredi meni</button>
                        <button class="tool-btn" onclick="calculateCosts()">Kalkulacija stroškov</button>
                        <button class="tool-btn" onclick="optimizeMenu()">Optimizacija menija</button>
                    </div>
                </div>
                
                <div class="tool-section">
                    <h3>Rezervacije</h3>
                    <div class="tool-grid">
                        <button class="tool-btn" onclick="manageReservations()">Upravljaj rezervacije</button>
                        <button class="tool-btn" onclick="digitalBooking()">Digitalne rezervacije</button>
                        <button class="tool-btn" onclick="customerAnalytics()">Analitika strank</button>
                    </div>
                </div>
                
                <div class="tool-section">
                    <h3>Promocija</h3>
                    <div class="tool-grid">
                        <button class="tool-btn" onclick="createCampaign()">Ustvari kampanjo</button>
                        <button class="tool-btn" onclick="socialMedia()">Social media</button>
                        <button class="tool-btn" onclick="loyaltyProgram()">Program zvestobe</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateAgricultureContent() {
    return `
        <div class="agriculture-module">
            <h2>Kmetijstvo in živinoreja</h2>
            <div class="agriculture-dashboard">
                <div class="weather-widget">
                    <h3>Vremenska napoved</h3>
                    <div class="weather-info">
                        <div class="temp">22°C</div>
                        <div class="conditions">Delno oblačno</div>
                        <div class="humidity">Vlažnost: 65%</div>
                    </div>
                </div>
                
                <div class="crop-management">
                    <h3>Upravljanje pridelkov</h3>
                    <div class="crop-list">
                        <div class="crop-item">
                            <span class="crop-name">Paradižnik</span>
                            <span class="crop-status status-good">Dobro</span>
                            <button class="btn-small">Upravljaj</button>
                        </div>
                        <div class="crop-item">
                            <span class="crop-name">Kumare</span>
                            <span class="crop-status status-warning">Pozor</span>
                            <button class="btn-small">Upravljaj</button>
                        </div>
                    </div>
                </div>
                
                <div class="livestock-management">
                    <h3>Upravljanje živine</h3>
                    <div class="livestock-stats">
                        <div class="stat">
                            <span class="stat-label">Krave</span>
                            <span class="stat-value">25</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Kokoši</span>
                            <span class="stat-value">150</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateHealthcareContent() {
    return `
        <div class="healthcare-module">
            <h2>Zdravstvo in wellness</h2>
            <div class="wellness-dashboard">
                <div class="health-metrics">
                    <h3>Zdravstvene metrike</h3>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">72</div>
                            <div class="metric-label">Srčni utrip</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">8.5h</div>
                            <div class="metric-label">Spanje</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">8,500</div>
                            <div class="metric-label">Koraki</div>
                        </div>
                    </div>
                </div>
                
                <div class="wellness-tools">
                    <h3>Wellness orodja</h3>
                    <div class="tool-buttons">
                        <button class="wellness-btn" onclick="nutritionPlan()">Načrt prehrane</button>
                        <button class="wellness-btn" onclick="exercisePlan()">Načrt vadbe</button>
                        <button class="wellness-btn" onclick="meditationGuide()">Vodena meditacija</button>
                        <button class="wellness-btn" onclick="healthTracking()">Spremljanje zdravja</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateITContent() {
    return `
        <div class="it-module">
            <h2>IT in programiranje</h2>
            <div class="it-tools">
                <div class="code-section">
                    <h3>Razvojno okolje</h3>
                    <div class="code-tools">
                        <button class="code-btn" onclick="openCodeEditor()">Urejevalnik kode</button>
                        <button class="code-btn" onclick="runTests()">Zaženi teste</button>
                        <button class="code-btn" onclick="deployApp()">Objavi aplikacijo</button>
                    </div>
                </div>
                
                <div class="automation-section">
                    <h3>Avtomatizacija</h3>
                    <div class="automation-tools">
                        <button class="auto-btn" onclick="createScript()">Ustvari skripto</button>
                        <button class="auto-btn" onclick="scheduleTask()">Načrtuj opravilo</button>
                        <button class="auto-btn" onclick="monitorSystem()">Nadzor sistema</button>
                    </div>
                </div>
                
                <div class="api-section">
                    <h3>API integracije</h3>
                    <div class="api-tools">
                        <button class="api-btn" onclick="testAPI()">Testiraj API</button>
                        <button class="api-btn" onclick="createEndpoint()">Ustvari endpoint</button>
                        <button class="api-btn" onclick="apiDocs()">API dokumentacija</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateMarketingContent() {
    return `
        <div class="marketing-module">
            <h2>Marketing in prodaja</h2>
            <div class="marketing-dashboard">
                <div class="campaign-overview">
                    <h3>Pregled kampanj</h3>
                    <div class="campaign-stats">
                        <div class="stat-item">
                            <span class="stat-number">5</span>
                            <span class="stat-desc">Aktivne kampanje</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">15.2%</span>
                            <span class="stat-desc">CTR</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">€2,450</span>
                            <span class="stat-desc">ROI ta mesec</span>
                        </div>
                    </div>
                </div>
                
                <div class="marketing-tools">
                    <h3>Marketing orodja</h3>
                    <div class="tool-grid">
                        <button class="marketing-btn" onclick="createCampaign()">Nova kampanja</button>
                        <button class="marketing-btn" onclick="contentCalendar()">Koledar vsebin</button>
                        <button class="marketing-btn" onclick="socialMediaManager()">Social media</button>
                        <button class="marketing-btn" onclick="emailMarketing()">E-poštni marketing</button>
                        <button class="marketing-btn" onclick="seoOptimization()">SEO optimizacija</button>
                        <button class="marketing-btn" onclick="analyticsReport()">Analitično poročilo</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateEducationContent() {
    return `
        <div class="education-module">
            <h2>Izobraževanje in mentoring</h2>
            <div class="education-tools">
                <div class="course-management">
                    <h3>Upravljanje tečajev</h3>
                    <div class="course-actions">
                        <button class="edu-btn" onclick="createCourse()">Ustvari tečaj</button>
                        <button class="edu-btn" onclick="manageLessons()">Upravljaj lekcije</button>
                        <button class="edu-btn" onclick="trackProgress()">Spremljaj napredek</button>
                    </div>
                </div>
                
                <div class="learning-resources">
                    <h3>Učni viri</h3>
                    <div class="resource-list">
                        <div class="resource-item">
                            <span class="resource-name">Osnove programiranja</span>
                            <span class="resource-type">Video tečaj</span>
                            <button class="btn-small">Odpri</button>
                        </div>
                        <div class="resource-item">
                            <span class="resource-name">Marketing strategije</span>
                            <span class="resource-type">PDF priročnik</span>
                            <button class="btn-small">Prenesi</button>
                        </div>
                    </div>
                </div>
                
                <div class="mentoring-section">
                    <h3>Mentoring</h3>
                    <div class="mentoring-tools">
                        <button class="mentor-btn" onclick="scheduleMeeting()">Načrtuj srečanje</button>
                        <button class="mentor-btn" onclick="setGoals()">Nastavi cilje</button>
                        <button class="mentor-btn" onclick="trackAchievements()">Spremljaj dosežke</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateFinanceContent() {
    return `
        <div class="finance-module">
            <h2>Finančno svetovanje</h2>
            <div class="finance-dashboard">
                <div class="financial-overview">
                    <h3>Finančni pregled</h3>
                    <div class="finance-stats">
                        <div class="finance-card">
                            <div class="finance-amount">€12,450</div>
                            <div class="finance-label">Mesečni prihodki</div>
                            <div class="finance-change positive">+8.5%</div>
                        </div>
                        <div class="finance-card">
                            <div class="finance-amount">€8,200</div>
                            <div class="finance-label">Mesečni odhodki</div>
                            <div class="finance-change negative">+2.1%</div>
                        </div>
                        <div class="finance-card">
                            <div class="finance-amount">€4,250</div>
                            <div class="finance-label">Čisti dobiček</div>
                            <div class="finance-change positive">+15.2%</div>
                        </div>
                    </div>
                </div>
                
                <div class="finance-tools">
                    <h3>Finančna orodja</h3>
                    <div class="finance-actions">
                        <button class="finance-btn" onclick="budgetPlanner()">Načrtovalec proračuna</button>
                        <button class="finance-btn" onclick="investmentAnalysis()">Analiza investicij</button>
                        <button class="finance-btn" onclick="taxOptimization()">Davčna optimizacija</button>
                        <button class="finance-btn" onclick="riskAssessment()">Ocena tveganja</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateLogisticsContent() {
    return `
        <div class="logistics-module">
            <h2>Logistika in transport</h2>
            <div class="logistics-dashboard">
                <div class="route-optimization">
                    <h3>Optimizacija poti</h3>
                    <div class="route-tools">
                        <button class="logistics-btn" onclick="planRoute()">Načrtuj pot</button>
                        <button class="logistics-btn" onclick="trackShipment()">Spremljaj pošiljko</button>
                        <button class="logistics-btn" onclick="optimizeDelivery()">Optimiziraj dostavo</button>
                    </div>
                </div>
                
                <div class="inventory-management">
                    <h3>Upravljanje zalog</h3>
                    <div class="inventory-stats">
                        <div class="inventory-item">
                            <span class="item-name">Izdelek A</span>
                            <span class="item-quantity">150 kos</span>
                            <span class="item-status status-good">Na zalogi</span>
                        </div>
                        <div class="inventory-item">
                            <span class="item-name">Izdelek B</span>
                            <span class="item-quantity">25 kos</span>
                            <span class="item-status status-warning">Nizka zaloga</span>
                        </div>
                    </div>
                </div>
                
                <div class="project-management">
                    <h3>Projektno vodenje</h3>
                    <div class="project-tools">
                        <button class="project-btn" onclick="createProject()">Nov projekt</button>
                        <button class="project-btn" onclick="assignTasks()">Dodeli naloge</button>
                        <button class="project-btn" onclick="trackProgress()">Spremljaj napredek</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateArtContent() {
    return `
        <div class="art-module">
            <h2>Umetnost in kreativnost</h2>
            <div class="creative-tools">
                <div class="visual-arts">
                    <h3>Vizualne umetnosti</h3>
                    <div class="art-tools">
                        <button class="art-btn" onclick="imageEditor()">Urejevalnik slik</button>
                        <button class="art-btn" onclick="designTemplates()">Predloge oblikovanja</button>
                        <button class="art-btn" onclick="colorPalette()">Barvna paleta</button>
                    </div>
                </div>
                
                <div class="music-production">
                    <h3>Glasbena produkcija</h3>
                    <div class="music-tools">
                        <button class="music-btn" onclick="audioEditor()">Zvočni urejevalnik</button>
                        <button class="music-btn" onclick="beatMaker()">Ustvarjalec ritmov</button>
                        <button class="music-btn" onclick="mixingDesk()">Mešalna miza</button>
                    </div>
                </div>
                
                <div class="video-production">
                    <h3>Video produkcija</h3>
                    <div class="video-tools">
                        <button class="video-btn" onclick="videoEditor()">Video urejevalnik</button>
                        <button class="video-btn" onclick="animationStudio()">Animacijski studio</button>
                        <button class="video-btn" onclick="effectsLibrary()">Knjižnica učinkov</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generatePersonalDevelopmentContent() {
    return `
        <div class="personal-dev-module">
            <h2>Osebni razvoj</h2>
            <div class="development-dashboard">
                <div class="goal-tracking">
                    <h3>Spremljanje ciljev</h3>
                    <div class="goal-list">
                        <div class="goal-item">
                            <span class="goal-name">Izboljšanje produktivnosti</span>
                            <div class="goal-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 75%"></div>
                                </div>
                                <span class="progress-text">75%</span>
                            </div>
                        </div>
                        <div class="goal-item">
                            <span class="goal-name">Učenje novega jezika</span>
                            <div class="goal-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 45%"></div>
                                </div>
                                <span class="progress-text">45%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="habit-tracker">
                    <h3>Sledilnik navad</h3>
                    <div class="habit-tools">
                        <button class="habit-btn" onclick="addHabit()">Dodaj navado</button>
                        <button class="habit-btn" onclick="trackDaily()">Dnevno spremljanje</button>
                        <button class="habit-btn" onclick="viewStats()">Statistike</button>
                    </div>
                </div>
                
                <div class="motivation-center">
                    <h3>Motivacijski center</h3>
                    <div class="motivation-tools">
                        <button class="motivation-btn" onclick="dailyQuote()">Dnevni citat</button>
                        <button class="motivation-btn" onclick="successStories()">Zgodbe o uspehu</button>
                        <button class="motivation-btn" onclick="mentalExercises()">Mentalne vaje</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateSustainabilityContent() {
    return `
        <div class="sustainability-module">
            <h2>Trajnostni razvoj</h2>
            <div class="sustainability-dashboard">
                <div class="environmental-metrics">
                    <h3>Okoljske metrike</h3>
                    <div class="env-stats">
                        <div class="env-card">
                            <div class="env-value">2.5t</div>
                            <div class="env-label">CO₂ prihranek</div>
                            <div class="env-trend positive">↓ 15%</div>
                        </div>
                        <div class="env-card">
                            <div class="env-value">85%</div>
                            <div class="env-label">Energetska učinkovitost</div>
                            <div class="env-trend positive">↑ 8%</div>
                        </div>
                        <div class="env-card">
                            <div class="env-value">92%</div>
                            <div class="env-label">Recikliranje</div>
                            <div class="env-trend positive">↑ 12%</div>
                        </div>
                    </div>
                </div>
                
                <div class="green-initiatives">
                    <h3>Zelene pobude</h3>
                    <div class="initiative-tools">
                        <button class="green-btn" onclick="carbonFootprint()">Ogljični odtis</button>
                        <button class="green-btn" onclick="energyOptimization()">Energetska optimizacija</button>
                        <button class="green-btn" onclick="wasteReduction()">Zmanjšanje odpadkov</button>
                        <button class="green-btn" onclick="sustainableSupply()">Trajnostna dobavna veriga</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateLegalContent() {
    return `
        <div class="legal-module">
            <h2>Pravne zadeve</h2>
            <div class="legal-dashboard">
                <div class="compliance-overview">
                    <h3>Pregled skladnosti</h3>
                    <div class="compliance-status">
                        <div class="compliance-item">
                            <span class="compliance-name">GDPR</span>
                            <span class="compliance-status status-good">Skladnost</span>
                        </div>
                        <div class="compliance-item">
                            <span class="compliance-name">ISO 27001</span>
                            <span class="compliance-status status-warning">V pregledu</span>
                        </div>
                        <div class="compliance-item">
                            <span class="compliance-name">Davčna zakonodaja</span>
                            <span class="compliance-status status-good">Skladnost</span>
                        </div>
                    </div>
                </div>
                
                <div class="legal-tools">
                    <h3>Pravna orodja</h3>
                    <div class="legal-actions">
                        <button class="legal-btn" onclick="contractGenerator()">Generator pogodb</button>
                        <button class="legal-btn" onclick="complianceCheck()">Preverjanje skladnosti</button>
                        <button class="legal-btn" onclick="legalDocuments()">Pravni dokumenti</button>
                        <button class="legal-btn" onclick="riskAssessment()">Ocena tveganja</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateSettingsContent() {
    return `
        <div class="settings-module">
            <h2>Nastavitve</h2>
            <div class="settings-sections">
                <div class="settings-section">
                    <h3>Splošne nastavitve</h3>
                    <div class="setting-item">
                        <label>Tema</label>
                        <select id="theme-select" onchange="changeTheme(this.value)">
                            <option value="dark">Temna</option>
                            <option value="light">Svetla</option>
                            <option value="auto">Avtomatska</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Jezik</label>
                        <select id="language-select">
                            <option value="sl">Slovenščina</option>
                            <option value="en">English</option>
                            <option value="de">Deutsch</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Obvestila</h3>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" checked> E-poštna obvestila
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" checked> Push obvestila
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Varnost</h3>
                    <div class="setting-item">
                        <button class="btn-secondary" onclick="changePassword()">Spremeni geslo</button>
                    </div>
                    <div class="setting-item">
                        <button class="btn-secondary" onclick="enable2FA()">Omogoči 2FA</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initializeModuleSpecific(moduleName) {
    // Module-specific initialization
    switch (moduleName) {
        case 'analytics':
            initializeCharts();
            break;
        case 'dashboard':
            updateDashboardStats();
            break;
        case 'settings':
            loadUserSettings();
            break;
    }
}

function loadInitialData() {
    // Load user preferences
    const savedTheme = localStorage.getItem('omni-theme');
    if (savedTheme) {
        OmniApp.config.theme = savedTheme;
        document.body.setAttribute('data-theme', savedTheme);
    }
    
    // Update stats periodically
    setInterval(updateStats, 30000); // Every 30 seconds
}

function updateStats() {
    // Simulate real-time stats updates
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const currentValue = parseInt(stat.textContent);
        const variation = Math.floor(Math.random() * 10) - 5; // -5 to +5
        const newValue = Math.max(0, currentValue + variation);
        stat.textContent = newValue;
    });
}

function toggleTheme() {
    const currentTheme = OmniApp.config.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    OmniApp.config.theme = newTheme;
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('omni-theme', newTheme);
    
    showNotification(`Tema spremenjena na ${newTheme === 'dark' ? 'temno' : 'svetlo'}`, 'info');
}

function openSettings() {
    switchModule('nastavitve');
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Quick action functions
function quickAction(action) {
    switch (action) {
        case 'new-project':
            showNotification('Ustvarjam nov projekt...', 'info');
            break;
        case 'analytics':
            switchModule('analytics');
            break;
        case 'reports':
            showNotification('Generiram poročila...', 'info');
            break;
        case 'settings':
            switchModule('nastavitve');
            break;
    }
}

// Utility functions for various modules
function refreshAnalytics() {
    showNotification('Osvežujem analitične podatke...', 'info');
}

function initializeCharts() {
    // Initialize chart placeholders with some basic styling
    const chartPlaceholders = document.querySelectorAll('.chart-placeholder');
    chartPlaceholders.forEach(placeholder => {
        placeholder.style.height = '200px';
        placeholder.style.background = 'linear-gradient(45deg, #333, #555)';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.color = '#fff';
        placeholder.style.borderRadius = '8px';
    });
}

function updateDashboardStats() {
    // Simulate real-time dashboard updates
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach((stat, index) => {
        setTimeout(() => {
            stat.style.transform = 'scale(1.1)';
            setTimeout(() => {
                stat.style.transform = 'scale(1)';
            }, 200);
        }, index * 100);
    });
}

function loadUserSettings() {
    // Load and apply user settings
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = OmniApp.config.theme;
    }
}

// Export for global access
window.OmniApp = OmniApp;
window.switchModule = switchModule;
window.loadModuleContent = loadModuleContent;
window.toggleTheme = toggleTheme;
window.showNotification = showNotification;

console.log('Omni AI Platform - App.js loaded successfully');