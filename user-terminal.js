// ═══════════════════════════════════════════════════════════════════════════════
// 🖥️ USER TERMINAL - OMNI Ultra Brain Component
// ═══════════════════════════════════════════════════════════════════════════════
// Enoten uporabniški vmesnik za mobile-web-desktop dostop
// Podpira glasovne ukaze, chat, vizualizacije in real-time interakcijo

class UserTerminal {
    constructor(config = {}) {
        this.config = {
            brain: config.brain,
            interfaceType: config.interfaceType || "mobile-web-desktop",
            globalAccess: config.globalAccess || true,
            voiceEnabled: config.voiceEnabled || true,
            visualizations: config.visualizations || true,
            realTimeUpdates: config.realTimeUpdates || true,
            multiLanguage: config.multiLanguage || true,
            theme: config.theme || "dark",
            ...config
        };

        this.isInitialized = false;
        this.activeConnections = new Map();
        this.commandHistory = [];
        this.userSessions = new Map();
        this.notifications = [];
        this.widgets = new Map();
        
        this.statistics = {
            totalCommands: 0,
            successfulCommands: 0,
            averageResponseTime: 0,
            activeUsers: 0,
            dataTransferred: 0
        };

        this.initializeTerminal();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚀 INICIALIZACIJA TERMINALA
    // ═══════════════════════════════════════════════════════════════════════════════

    async initializeTerminal() {
        console.log("🖥️ Inicializiram OMNI Ultra Terminal...");

        try {
            // Ustvari glavni vmesnik
            await this.createMainInterface();
            
            // Inicializiraj glasovne ukaze
            if (this.config.voiceEnabled) {
                await this.initializeVoiceCommands();
            }
            
            // Nastavi real-time povezave
            if (this.config.realTimeUpdates) {
                await this.setupRealTimeConnections();
            }
            
            // Ustvari privzete widgete
            await this.createDefaultWidgets();
            
            // Poveži z OMNI Brain
            if (this.config.brain) {
                await this.connectToBrain();
            }

            this.isInitialized = true;
            console.log("✅ OMNI Ultra Terminal pripravljen!");
            
            // Prikaži pozdravno sporočilo
            await this.showWelcomeMessage();

        } catch (error) {
            console.error("❌ Napaka pri inicializaciji terminala:", error);
            throw error;
        }
    }

    async createMainInterface() {
        // Ustvari glavno strukturo vmesnika
        this.interface = {
            header: this.createHeader(),
            sidebar: this.createSidebar(),
            mainArea: this.createMainArea(),
            footer: this.createFooter(),
            modals: new Map(),
            notifications: this.createNotificationArea()
        };

        // Nastavi responsive design
        this.setupResponsiveDesign();
        
        // Inicializiraj teme
        this.initializeThemes();
    }

    createHeader() {
        return {
            logo: "🧠 OMNI Ultra",
            navigation: [
                { id: "dashboard", label: "Nadzorna plošča", icon: "📊" },
                { id: "modules", label: "AI Moduli", icon: "🤖" },
                { id: "tasks", label: "Naloge", icon: "📋" },
                { id: "analytics", label: "Analitika", icon: "📈" },
                { id: "settings", label: "Nastavitve", icon: "⚙️" }
            ],
            userMenu: {
                profile: "👤 Profil",
                preferences: "🎛️ Nastavitve",
                help: "❓ Pomoč",
                logout: "🚪 Odjava"
            },
            globalSearch: {
                placeholder: "Poišči karkoli po svetu...",
                suggestions: true,
                voiceSearch: true
            }
        };
    }

    createSidebar() {
        return {
            quickActions: [
                { id: "new_task", label: "Nova naloga", icon: "➕", shortcut: "Ctrl+N" },
                { id: "voice_command", label: "Glasovni ukaz", icon: "🎤", shortcut: "Ctrl+M" },
                { id: "global_search", label: "Globalno iskanje", icon: "🔍", shortcut: "Ctrl+F" },
                { id: "emergency_stop", label: "Nujna zaustavitev", icon: "🛑", shortcut: "Ctrl+E" }
            ],
            recentTasks: [],
            systemStatus: {
                brain: "connected",
                modules: "active",
                cloud: "synced",
                iot: "monitoring"
            },
            notifications: []
        };
    }

    createMainArea() {
        return {
            activeView: "dashboard",
            views: {
                dashboard: this.createDashboardView(),
                modules: this.createModulesView(),
                tasks: this.createTasksView(),
                analytics: this.createAnalyticsView(),
                settings: this.createSettingsView()
            },
            chatInterface: this.createChatInterface(),
            commandLine: this.createCommandLine()
        };
    }

    createFooter() {
        return {
            statusBar: {
                connectionStatus: "🟢 Povezan",
                systemLoad: "💻 CPU: 15%",
                memoryUsage: "🧠 RAM: 2.1GB",
                networkStatus: "🌐 Online"
            },
            quickStats: {
                activeTasks: 0,
                completedToday: 0,
                globalConnections: 0
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎤 GLASOVNI UKAZI
    // ═══════════════════════════════════════════════════════════════════════════════

    async initializeVoiceCommands() {
        console.log("🎤 Inicializiram glasovne ukaze...");

        this.voiceCommands = {
            // Osnovni ukazi
            "omni status": () => this.executeCommand("status"),
            "omni help": () => this.showHelp(),
            "omni dashboard": () => this.switchView("dashboard"),
            
            // Upravljanje nalog
            "nova naloga": () => this.createNewTask(),
            "prikaži naloge": () => this.switchView("tasks"),
            "zaključi nalogo": (taskId) => this.completeTask(taskId),
            
            // Moduli
            "aktiviraj modul": (moduleName) => this.activateModule(moduleName),
            "deaktiviraj modul": (moduleName) => this.deactivateModule(moduleName),
            "prikaži module": () => this.switchView("modules"),
            
            // Globalni ukazi
            "globalno iskanje": (query) => this.globalSearch(query),
            "rezerviraj kamp": (location) => this.bookCampsite(location),
            "preveri vreme": (location) => this.checkWeather(location),
            
            // Sistemski ukazi
            "nujna zaustavitev": () => this.emergencyStop(),
            "varnostna kopija": () => this.createBackup(),
            "optimiziraj sistem": () => this.optimizeSystem(),
            
            // Analitika
            "prikaži analitiko": () => this.switchView("analytics"),
            "generiraj poročilo": () => this.generateReport(),
            "izvozi podatke": () => this.exportData()
        };

        // Simulacija inicializacije glasovnega prepoznavanja
        this.voiceRecognition = {
            isListening: false,
            language: "sl-SI",
            continuous: true,
            interimResults: true
        };

        console.log("✅ Glasovni ukazi pripravljeni");
    }

    async startVoiceListening() {
        if (!this.config.voiceEnabled) return;

        this.voiceRecognition.isListening = true;
        console.log("🎤 Poslušam glasovne ukaze...");
        
        // Simulacija glasovnega prepoznavanja
        this.addNotification("🎤 Glasovno prepoznavanje aktivno", "info");
    }

    async stopVoiceListening() {
        this.voiceRecognition.isListening = false;
        console.log("🔇 Glasovno prepoznavanje ustavljeno");
        
        this.addNotification("🔇 Glasovno prepoznavanje ustavljeno", "info");
    }

    async processVoiceCommand(transcript) {
        const command = transcript.toLowerCase().trim();
        
        // Poišči ujemajoč ukaz
        for (const [pattern, handler] of Object.entries(this.voiceCommands)) {
            if (command.includes(pattern.toLowerCase())) {
                try {
                    await handler();
                    this.addNotification(`✅ Izvršen glasovni ukaz: ${pattern}`, "success");
                } catch (error) {
                    this.addNotification(`❌ Napaka pri izvršitvi: ${error.message}`, "error");
                }
                return;
            }
        }
        
        // Če ni neposrednega ujemanja, pošlji v OMNI Brain
        if (this.config.brain) {
            await this.sendToBrain(command, "voice");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 💬 CHAT VMESNIK
    // ═══════════════════════════════════════════════════════════════════════════════

    createChatInterface() {
        return {
            messages: [],
            inputField: {
                placeholder: "Vprašaj OMNI karkoli...",
                multiline: true,
                suggestions: true,
                fileUpload: true
            },
            quickReplies: [
                "Kakšno je stanje sistema?",
                "Rezerviraj kamp na Kolpi",
                "Preveri vreme za jutri",
                "Prikaži finančne podatke",
                "Optimiziraj sistem"
            ],
            typing: false,
            isConnected: true
        };
    }

    async sendMessage(message, type = "text") {
        const messageObj = {
            id: Date.now(),
            content: message,
            type: type,
            timestamp: new Date(),
            sender: "user",
            status: "sending"
        };

        this.interface.mainArea.chatInterface.messages.push(messageObj);
        this.updateChatDisplay();

        try {
            // Pošlji v OMNI Brain
            const response = await this.sendToBrain(message, type);
            
            // Dodaj odgovor
            const responseObj = {
                id: Date.now() + 1,
                content: response.content,
                type: response.type || "text",
                timestamp: new Date(),
                sender: "omni",
                status: "delivered",
                metadata: response.metadata
            };

            this.interface.mainArea.chatInterface.messages.push(responseObj);
            messageObj.status = "delivered";
            
            this.updateChatDisplay();
            this.updateStatistics("message_sent", true);

        } catch (error) {
            messageObj.status = "error";
            this.addNotification(`❌ Napaka pri pošiljanju: ${error.message}`, "error");
            this.updateStatistics("message_sent", false);
        }
    }

    async sendToBrain(message, type = "text") {
        if (!this.config.brain) {
            throw new Error("OMNI Brain ni povezan");
        }

        // Simulacija pošiljanja v Brain
        await this.sleep(500 + Math.random() * 1000);

        // Generiraj odgovor glede na tip sporočila
        return this.generateBrainResponse(message, type);
    }

    generateBrainResponse(message, type) {
        const responses = {
            status: {
                content: "🟢 OMNI Ultra Brain je aktiven\n📊 Vsi moduli delujejo optimalno\n🌐 Globalne povezave stabilne\n💾 Pomnilnik: 99.8% dostopen",
                type: "status"
            },
            weather: {
                content: "🌤️ Vreme za jutri:\n🌡️ Temperatura: 22°C\n☁️ Delno oblačno\n💧 Verjetnost dežja: 20%\n💨 Veter: 5 km/h",
                type: "weather"
            },
            booking: {
                content: "🏕️ Rezervacija kampa:\n✅ Najden kamp na Kolpi\n📅 Datum: Jutri\n💰 Cena: 25€/noč\n📞 Kontakt: +386 XX XXX XXX",
                type: "booking"
            },
            default: {
                content: `Razumem vaše sporočilo: "${message}"\n\nIzvajam analizo in pripravljam optimalno rešitev...`,
                type: "text"
            }
        };

        // Določi tip odgovora
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("status") || lowerMessage.includes("stanje")) {
            return responses.status;
        } else if (lowerMessage.includes("vreme") || lowerMessage.includes("weather")) {
            return responses.weather;
        } else if (lowerMessage.includes("rezerv") || lowerMessage.includes("kamp")) {
            return responses.booking;
        } else {
            return responses.default;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 POGLEDI IN WIDGETI
    // ═══════════════════════════════════════════════════════════════════════════════

    createDashboardView() {
        return {
            widgets: [
                {
                    id: "system_status",
                    title: "Stanje sistema",
                    type: "status",
                    size: "medium",
                    data: {
                        brain: { status: "active", load: 15 },
                        modules: { active: 8, total: 10 },
                        connections: { active: 156, total: 200 }
                    }
                },
                {
                    id: "global_map",
                    title: "Globalna aktivnost",
                    type: "map",
                    size: "large",
                    data: {
                        activeRegions: ["EU", "NA", "AS"],
                        connections: 1247,
                        dataFlow: "2.3 TB/h"
                    }
                },
                {
                    id: "recent_tasks",
                    title: "Nedavne naloge",
                    type: "list",
                    size: "medium",
                    data: []
                },
                {
                    id: "performance_metrics",
                    title: "Zmogljivost",
                    type: "chart",
                    size: "medium",
                    data: {
                        cpu: [15, 18, 12, 20, 16],
                        memory: [2.1, 2.3, 2.0, 2.5, 2.2],
                        network: [45, 52, 38, 61, 47]
                    }
                }
            ],
            layout: "grid",
            customizable: true
        };
    }

    createModulesView() {
        return {
            modules: [
                { id: "finance", name: "Finance", status: "active", load: 12 },
                { id: "tourism", name: "Turizem", status: "active", load: 8 },
                { id: "devops", name: "DevOps", status: "active", load: 15 },
                { id: "iot", name: "IoT", status: "active", load: 22 },
                { id: "radio", name: "Radio", status: "active", load: 5 },
                { id: "healthcare", name: "Zdravstvo", status: "active", load: 18 },
                { id: "beekeeping", name: "Čebelarstvo", status: "active", load: 3 },
                { id: "hospitality", name: "Gostinstvo", status: "active", load: 11 },
                { id: "global_apps", name: "AllGlobalApps", status: "active", load: 25 }
            ],
            controls: {
                startAll: true,
                stopAll: true,
                restart: true,
                configure: true
            }
        };
    }

    createTasksView() {
        return {
            tasks: [],
            filters: ["all", "active", "completed", "failed"],
            sorting: ["date", "priority", "status"],
            bulkActions: true,
            createNew: true
        };
    }

    createAnalyticsView() {
        return {
            charts: [
                { type: "line", title: "Sistemska zmogljivost", data: [] },
                { type: "pie", title: "Uporaba modulov", data: [] },
                { type: "bar", title: "Globalne povezave", data: [] },
                { type: "heatmap", title: "Aktivnost po regijah", data: [] }
            ],
            timeRanges: ["1h", "24h", "7d", "30d", "1y"],
            exportOptions: ["PDF", "CSV", "JSON", "PNG"]
        };
    }

    createSettingsView() {
        return {
            sections: [
                {
                    title: "Splošno",
                    settings: [
                        { key: "theme", label: "Tema", type: "select", options: ["dark", "light", "auto"] },
                        { key: "language", label: "Jezik", type: "select", options: ["sl", "en", "de"] },
                        { key: "notifications", label: "Obvestila", type: "boolean" }
                    ]
                },
                {
                    title: "Glasovni ukazi",
                    settings: [
                        { key: "voiceEnabled", label: "Omogoči glasovne ukaze", type: "boolean" },
                        { key: "voiceLanguage", label: "Jezik prepoznavanja", type: "select" },
                        { key: "voiceSensitivity", label: "Občutljivost", type: "slider" }
                    ]
                },
                {
                    title: "Varnost",
                    settings: [
                        { key: "twoFactor", label: "Dvofaktorska avtentifikacija", type: "boolean" },
                        { key: "sessionTimeout", label: "Timeout seje (min)", type: "number" },
                        { key: "encryptData", label: "Šifriraj podatke", type: "boolean" }
                    ]
                }
            ]
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔄 REAL-TIME POSODOBITVE
    // ═══════════════════════════════════════════════════════════════════════════════

    async setupRealTimeConnections() {
        console.log("🔄 Nastavljam real-time povezave...");

        // WebSocket povezava z OMNI Brain
        this.websocket = {
            url: "ws://localhost:8080/omni-brain",
            status: "connecting",
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };

        // Simulacija WebSocket povezave
        await this.sleep(1000);
        this.websocket.status = "connected";
        
        // Nastavi poslušalce za real-time dogodke
        this.setupEventListeners();
        
        // Začni periodične posodobitve
        this.startPeriodicUpdates();
        
        console.log("✅ Real-time povezave vzpostavljene");
    }

    setupEventListeners() {
        // Simulacija WebSocket dogodkov
        setInterval(() => {
            this.handleRealTimeEvent({
                type: "system_update",
                data: {
                    timestamp: new Date(),
                    cpu: Math.random() * 30 + 10,
                    memory: Math.random() * 2 + 1.5,
                    connections: Math.floor(Math.random() * 50) + 150
                }
            });
        }, 5000);

        setInterval(() => {
            this.handleRealTimeEvent({
                type: "task_completed",
                data: {
                    taskId: Date.now(),
                    result: "success",
                    duration: Math.random() * 5000 + 1000
                }
            });
        }, 15000);
    }

    handleRealTimeEvent(event) {
        switch (event.type) {
            case "system_update":
                this.updateSystemMetrics(event.data);
                break;
                
            case "task_completed":
                this.handleTaskCompletion(event.data);
                break;
                
            case "module_status":
                this.updateModuleStatus(event.data);
                break;
                
            case "global_alert":
                this.showGlobalAlert(event.data);
                break;
                
            default:
                console.log("Neznan real-time dogodek:", event);
        }
    }

    startPeriodicUpdates() {
        // Posodobi statistike vsako minuto
        setInterval(() => {
            this.updateGlobalStatistics();
        }, 60000);

        // Posodobi vmesnik vsakih 5 sekund
        setInterval(() => {
            this.updateInterface();
        }, 5000);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 UPRAVLJANJE NALOG
    // ═══════════════════════════════════════════════════════════════════════════════

    async executeCommand(command, parameters = {}) {
        const startTime = Date.now();
        
        try {
            console.log(`🎯 Izvršujem ukaz: ${command}`);
            
            // Dodaj v zgodovino
            this.commandHistory.push({
                command,
                parameters,
                timestamp: new Date(),
                status: "executing"
            });

            let result;
            
            // Izvršitev glede na tip ukaza
            switch (command) {
                case "status":
                    result = await this.getSystemStatus();
                    break;
                    
                case "create_task":
                    result = await this.createTask(parameters);
                    break;
                    
                case "global_search":
                    result = await this.performGlobalSearch(parameters.query);
                    break;
                    
                case "book_campsite":
                    result = await this.bookCampsite(parameters.location);
                    break;
                    
                case "check_weather":
                    result = await this.checkWeather(parameters.location);
                    break;
                    
                case "emergency_stop":
                    result = await this.emergencyStop();
                    break;
                    
                default:
                    // Pošlji v OMNI Brain
                    if (this.config.brain) {
                        result = await this.config.brain.executeTask({
                            command,
                            parameters,
                            source: "terminal"
                        });
                    } else {
                        throw new Error(`Neznan ukaz: ${command}`);
                    }
            }

            const duration = Date.now() - startTime;
            
            // Posodobi zgodovino
            const historyEntry = this.commandHistory[this.commandHistory.length - 1];
            historyEntry.status = "completed";
            historyEntry.duration = duration;
            historyEntry.result = result;

            this.updateStatistics("command_executed", true, duration);
            
            console.log(`✅ Ukaz ${command} uspešno izvršen v ${duration}ms`);
            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Posodobi zgodovino
            const historyEntry = this.commandHistory[this.commandHistory.length - 1];
            historyEntry.status = "error";
            historyEntry.duration = duration;
            historyEntry.error = error.message;

            this.updateStatistics("command_executed", false, duration);
            
            console.error(`❌ Napaka pri izvršitvi ukaza ${command}:`, error);
            throw error;
        }
    }

    async getSystemStatus() {
        return {
            brain: {
                status: "active",
                uptime: "15d 7h 23m",
                load: 15,
                memory: "2.1GB / 16GB"
            },
            modules: {
                active: 8,
                total: 9,
                details: this.interface.mainArea.views.modules.modules
            },
            connections: {
                websocket: this.websocket.status,
                apis: 156,
                iot: 89,
                global: 1247
            },
            performance: {
                cpu: "15%",
                memory: "13%",
                network: "47 Mbps",
                storage: "78% free"
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📱 RESPONSIVE DESIGN
    // ═══════════════════════════════════════════════════════════════════════════════

    setupResponsiveDesign() {
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        };

        this.currentBreakpoint = this.detectBreakpoint();
        this.adaptInterfaceToBreakpoint();
    }

    detectBreakpoint() {
        // Simulacija zaznave velikosti zaslona
        const width = 1920; // Simulirana širina
        
        if (width < this.breakpoints.mobile) return "mobile";
        if (width < this.breakpoints.tablet) return "tablet";
        return "desktop";
    }

    adaptInterfaceToBreakpoint() {
        switch (this.currentBreakpoint) {
            case "mobile":
                this.interface.sidebar.collapsed = true;
                this.interface.mainArea.views.dashboard.widgets.forEach(widget => {
                    widget.size = "small";
                });
                break;
                
            case "tablet":
                this.interface.sidebar.collapsed = false;
                this.interface.sidebar.width = "200px";
                break;
                
            case "desktop":
                this.interface.sidebar.collapsed = false;
                this.interface.sidebar.width = "250px";
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛠️ POMOŽNE FUNKCIJE
    // ═══════════════════════════════════════════════════════════════════════════════

    async connectToBrain() {
        if (!this.config.brain) {
            throw new Error("OMNI Brain ni definiran");
        }

        console.log("🧠 Povezujem z OMNI Brain...");
        
        // Simulacija povezave
        await this.sleep(1000);
        
        this.brainConnection = {
            status: "connected",
            lastPing: new Date(),
            latency: 45
        };

        console.log("✅ Povezan z OMNI Brain");
    }

    async showWelcomeMessage() {
        const welcomeMessage = {
            title: "🧠 OMNI Ultra Brain",
            subtitle: "Globalni supermozg je pripravljen",
            features: [
                "🌐 Globalni doseg in neomejene zmožnosti",
                "🤖 8 aktivnih AI modulov",
                "🔗 156 globalnih API povezav",
                "🎤 Glasovni ukazi v slovenščini",
                "📱 Responsive vmesnik za vse naprave"
            ],
            quickStart: [
                "Reci: 'Omni status' za pregled sistema",
                "Reci: 'Rezerviraj kamp na Kolpi' za rezervacijo",
                "Reci: 'Preveri vreme' za vremensko napoved",
                "Uporabi chat za kompleksne naloge"
            ]
        };

        this.addNotification("🎉 Dobrodošli v OMNI Ultra Brain!", "success");
        
        // Prikaži v chat vmesniku
        await this.sendMessage(this.formatWelcomeMessage(welcomeMessage), "welcome");
    }

    formatWelcomeMessage(welcome) {
        return `${welcome.title}\n${welcome.subtitle}\n\n` +
               `Funkcionalnosti:\n${welcome.features.join('\n')}\n\n` +
               `Hitri začetek:\n${welcome.quickStart.join('\n')}`;
    }

    addNotification(message, type = "info") {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date(),
            read: false
        };

        this.notifications.push(notification);
        this.interface.notifications.unshift(notification);

        // Avtomatsko odstrani po 5 sekundah
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, 5000);
    }

    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.interface.notifications = this.interface.notifications.filter(n => n.id !== id);
    }

    updateStatistics(action, success, duration = 0) {
        switch (action) {
            case "command_executed":
                this.statistics.totalCommands++;
                if (success) this.statistics.successfulCommands++;
                if (duration > 0) {
                    this.statistics.averageResponseTime = 
                        (this.statistics.averageResponseTime * 0.9) + (duration * 0.1);
                }
                break;
                
            case "message_sent":
                if (success) this.statistics.dataTransferred += 1024; // Simulacija
                break;
        }
    }

    updateGlobalStatistics() {
        // Simulacija posodobitve statistik
        this.statistics.activeUsers = Math.floor(Math.random() * 10) + 15;
        
        // Posodobi vmesnik
        if (this.interface.footer) {
            this.interface.footer.quickStats = {
                activeTasks: Math.floor(Math.random() * 5) + 2,
                completedToday: Math.floor(Math.random() * 20) + 45,
                globalConnections: Math.floor(Math.random() * 100) + 1200
            };
        }
    }

    updateInterface() {
        // Simulacija posodobitve vmesnika
        if (this.interface.footer) {
            this.interface.footer.statusBar.systemLoad = `💻 CPU: ${Math.floor(Math.random() * 20) + 10}%`;
            this.interface.footer.statusBar.memoryUsage = `🧠 RAM: ${(Math.random() * 1 + 1.5).toFixed(1)}GB`;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎮 JAVNI VMESNIK
    // ═══════════════════════════════════════════════════════════════════════════════

    async switchView(viewName) {
        if (this.interface.mainArea.views[viewName]) {
            this.interface.mainArea.activeView = viewName;
            console.log(`📱 Preklopil na pogled: ${viewName}`);
            return true;
        }
        return false;
    }

    async createNewTask() {
        // Implementacija ustvarjanja nove naloge
        console.log("➕ Ustvarjam novo nalogo...");
    }

    async globalSearch(query) {
        console.log(`🔍 Globalno iskanje: ${query}`);
        // Implementacija globalnega iskanja
    }

    async bookCampsite(location) {
        console.log(`🏕️ Rezerviram kamp: ${location}`);
        // Implementacija rezervacije kampa
    }

    async checkWeather(location) {
        console.log(`🌤️ Preverjam vreme: ${location}`);
        // Implementacija vremenske napovedi
    }

    async emergencyStop() {
        console.log("🛑 NUJNA ZAUSTAVITEV!");
        // Implementacija nujne zaustavitve
    }

    getTerminalStatus() {
        return {
            initialized: this.isInitialized,
            activeView: this.interface?.mainArea?.activeView,
            connectedToBrain: !!this.brainConnection,
            voiceEnabled: this.config.voiceEnabled,
            statistics: this.statistics
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserTerminal;
} else if (typeof window !== 'undefined') {
    window.UserTerminal = UserTerminal;
}

console.log("🖥️ User Terminal pripravljen za globalno interakcijo!");