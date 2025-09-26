// OMNI Enterprise - Vizualno Drevo Učenja
class VisualLearningTree {
    constructor() {
        this.width = 1200;
        this.height = 600;
        this.margin = { top: 20, right: 120, bottom: 20, left: 120 };
        this.duration = 750;
        this.nodeRadius = 25;
        
        this.svg = null;
        this.g = null;
        this.tree = null;
        this.root = null;
        this.i = 0;
        
        this.socket = null;
        this.searchTerm = '';
        
        this.init();
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadModuleData();
    }

    init() {
        // Nastavi SVG
        this.svg = d3.select("#tree-svg")
            .attr("width", this.width + this.margin.right + this.margin.left)
            .attr("height", this.height + this.margin.top + this.margin.bottom);

        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Nastavi drevo layout
        this.tree = d3.tree().size([this.height, this.width]);

        // Dodaj zoom funkcionalnost
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });

        this.svg.call(zoom);
    }

    setupEventListeners() {
        // Kontrolni gumbi
        document.getElementById('expandAll').addEventListener('click', () => this.expandAll());
        document.getElementById('collapseAll').addEventListener('click', () => this.collapseAll());
        document.getElementById('resetView').addEventListener('click', () => this.resetView());
        
        // Iskanje
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.highlightSearchResults();
        });
        
        document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());

        // Modal
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('moduleModal')) {
                this.closeModal();
            }
        });
    }

    connectWebSocket() {
        try {
            this.socket = io('http://localhost:8080');
            
            this.socket.on('connect', () => {
                console.log('✅ WebSocket povezan za real-time posodabljanje');
                this.updateLastUpdate();
            });

            this.socket.on('moduleUpdate', (data) => {
                this.handleModuleUpdate(data);
            });

            this.socket.on('learningProgress', (data) => {
                this.handleLearningProgress(data);
            });

            this.socket.on('systemStats', (data) => {
                this.updateSystemStats(data);
            });

        } catch (error) {
            console.warn('WebSocket ni na voljo, uporabljam polling');
            this.startPolling();
        }
    }

    startPolling() {
        setInterval(() => {
            this.loadModuleData();
            this.updateLastUpdate();
        }, 5000);
    }

    async loadModuleData() {
        try {
            // Simulacija podatkov - v produkciji bi to prišlo iz API-ja
            const moduleData = await this.fetchModuleData();
            this.updateTree(moduleData);
        } catch (error) {
            console.error('Napaka pri nalaganju podatkov:', error);
            this.loadDemoData();
        }
    }

    async fetchModuleData() {
        try {
            const response = await fetch('/api/modules');
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn('API ni dosegljiv, uporabljam demo podatke');
            return this.generateDemoData();
        }
    }

    generateDemoData() {
        return {
            name: "OMNI Enterprise Platform",
            status: "active",
            progress: 85,
            type: "root",
            children: [
                {
                    name: "Enterprise Security",
                    status: "active",
                    progress: 95,
                    type: "security",
                    children: [
                        { name: "Authentication", status: "active", progress: 100, type: "auth" },
                        { name: "Authorization", status: "active", progress: 98, type: "auth" },
                        { name: "Encryption", status: "learning", progress: 75, type: "crypto" }
                    ]
                },
                {
                    name: "AI Optimizer",
                    status: "learning",
                    progress: 72,
                    type: "ai",
                    children: [
                        { name: "Neural Networks", status: "learning", progress: 68, type: "ml" },
                        { name: "Deep Learning", status: "learning", progress: 45, type: "ml" },
                        { name: "NLP Processing", status: "active", progress: 90, type: "nlp" }
                    ]
                },
                {
                    name: "Microservices",
                    status: "active",
                    progress: 88,
                    type: "microservice",
                    children: [
                        { name: "API Gateway", status: "active", progress: 100, type: "api" },
                        { name: "Service Discovery", status: "active", progress: 95, type: "discovery" },
                        { name: "Load Balancer", status: "active", progress: 92, type: "balancer" }
                    ]
                },
                {
                    name: "Real-time Analytics",
                    status: "active",
                    progress: 91,
                    type: "analytics",
                    children: [
                        { name: "Data Processing", status: "active", progress: 88, type: "processing" },
                        { name: "Visualization", status: "learning", progress: 65, type: "viz" },
                        { name: "Reporting", status: "active", progress: 95, type: "report" }
                    ]
                },
                {
                    name: "Blockchain Integration",
                    status: "learning",
                    progress: 58,
                    type: "blockchain",
                    children: [
                        { name: "Smart Contracts", status: "learning", progress: 45, type: "contract" },
                        { name: "Wallet Management", status: "active", progress: 85, type: "wallet" },
                        { name: "Transaction Processing", status: "learning", progress: 62, type: "transaction" }
                    ]
                },
                {
                    name: "Enterprise Integrations",
                    status: "active",
                    progress: 79,
                    type: "integration",
                    children: [
                        { name: "CRM Integration", status: "active", progress: 90, type: "crm" },
                        { name: "ERP Integration", status: "learning", progress: 55, type: "erp" },
                        { name: "API Connectors", status: "active", progress: 88, type: "connector" }
                    ]
                },
                {
                    name: "Advanced Automation",
                    status: "active",
                    progress: 83,
                    type: "automation",
                    children: [
                        { name: "Workflow Engine", status: "active", progress: 92, type: "workflow" },
                        { name: "Task Scheduler", status: "active", progress: 88, type: "scheduler" },
                        { name: "AI Decision Making", status: "learning", progress: 67, type: "decision" }
                    ]
                },
                {
                    name: "Mobile Application",
                    status: "premium",
                    progress: 40,
                    type: "mobile",
                    children: [
                        { name: "React Native Core", status: "premium", progress: 35, type: "react" },
                        { name: "Push Notifications", status: "active", progress: 80, type: "notification" },
                        { name: "Offline Sync", status: "premium", progress: 25, type: "sync" }
                    ]
                }
            ]
        };
    }

    updateTree(data) {
        this.root = d3.hierarchy(data, d => d.children);
        this.root.x0 = this.height / 2;
        this.root.y0 = 0;

        // Skrči vse razen prvega nivoja
        if (this.root.children) {
            this.root.children.forEach(d => this.collapse(d));
        }

        this.update(this.root);
        this.updateSystemStats(this.calculateStats(this.root));
    }

    update(source) {
        const treeData = this.tree(this.root);
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        // Normaliziraj za fiksno globino
        nodes.forEach(d => d.y = d.depth * 180);

        // Posodobi vozlišča
        const node = this.g.selectAll('g.node')
            .data(nodes, d => d.id || (d.id = ++this.i));

        // Vstopi v nova vozlišča na starševski poziciji
        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${source.y0},${source.x0})`)
            .on('click', (event, d) => this.click(d));

        // Dodaj kroge za vozlišča
        nodeEnter.append('circle')
            .attr('r', 1e-6)
            .style('fill', d => this.getNodeColor(d.data.status))
            .style('stroke', '#fff')
            .style('stroke-width', '3px');

        // Dodaj napredek kroge
        nodeEnter.append('circle')
            .attr('class', 'progress-bg')
            .attr('r', this.nodeRadius + 5)
            .style('fill', 'none')
            .style('stroke', 'rgba(255,255,255,0.3)')
            .style('stroke-width', '4px');

        nodeEnter.append('circle')
            .attr('class', 'progress-fill')
            .attr('r', this.nodeRadius + 5)
            .style('fill', 'none')
            .style('stroke', d => this.getProgressColor(d.data.status))
            .style('stroke-width', '4px')
            .style('stroke-linecap', 'round')
            .style('stroke-dasharray', d => {
                const circumference = 2 * Math.PI * (this.nodeRadius + 5);
                const progress = d.data.progress || 0;
                return `${(progress / 100) * circumference} ${circumference}`;
            })
            .style('transform', 'rotate(-90deg)')
            .style('transform-origin', 'center');

        // Dodaj besedilo
        nodeEnter.append('text')
            .attr('dy', '.35em')
            .attr('x', d => d.children || d._children ? -13 : 13)
            .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
            .text(d => d.data.name)
            .style('fill-opacity', 1e-6)
            .style('font-size', '12px')
            .style('font-weight', '600');

        // Dodaj napredek besedilo
        nodeEnter.append('text')
            .attr('class', 'progress-text')
            .attr('dy', '4px')
            .attr('text-anchor', 'middle')
            .text(d => `${d.data.progress || 0}%`)
            .style('fill', '#fff')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)');

        // Prehod vozlišč na novo pozicijo
        const nodeUpdate = nodeEnter.merge(node);

        nodeUpdate.transition()
            .duration(this.duration)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        nodeUpdate.select('circle')
            .attr('r', this.nodeRadius)
            .style('fill', d => this.getNodeColor(d.data.status))
            .attr('cursor', 'pointer');

        nodeUpdate.select('text')
            .style('fill-opacity', 1);

        // Prehod izstopajočih vozlišč na starševsko pozicijo
        const nodeExit = node.exit().transition()
            .duration(this.duration)
            .attr('transform', d => `translate(${source.y},${source.x})`)
            .remove();

        nodeExit.select('circle')
            .attr('r', 1e-6);

        nodeExit.select('text')
            .style('fill-opacity', 1e-6);

        // Posodobi povezave
        const link = this.g.selectAll('path.link')
            .data(links, d => d.id);

        const linkEnter = link.enter().insert('path', 'g')
            .attr('class', 'link')
            .attr('d', d => {
                const o = { x: source.x0, y: source.y0 };
                return this.diagonal(o, o);
            });

        const linkUpdate = linkEnter.merge(link);

        linkUpdate.transition()
            .duration(this.duration)
            .attr('d', d => this.diagonal(d, d.parent));

        const linkExit = link.exit().transition()
            .duration(this.duration)
            .attr('d', d => {
                const o = { x: source.x, y: source.y };
                return this.diagonal(o, o);
            })
            .remove();

        // Shrani stare pozicije za prehod
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    diagonal(s, d) {
        return `M ${s.y} ${s.x}
                C ${(s.y + d.y) / 2} ${s.x},
                  ${(s.y + d.y) / 2} ${d.x},
                  ${d.y} ${d.x}`;
    }

    click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        this.update(d);
        this.showModuleDetails(d.data);
    }

    collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(child => this.collapse(child));
            d.children = null;
        }
    }

    expandAll() {
        this.root.descendants().forEach(d => {
            if (d._children) {
                d.children = d._children;
                d._children = null;
            }
        });
        this.update(this.root);
    }

    collapseAll() {
        if (this.root.children) {
            this.root.children.forEach(d => this.collapse(d));
        }
        this.update(this.root);
    }

    resetView() {
        this.svg.transition().duration(750).call(
            d3.zoom().transform,
            d3.zoomIdentity
        );
    }

    getNodeColor(status) {
        const colors = {
            'active': '#27ae60',
            'learning': '#3498db',
            'premium': '#e74c3c',
            'inactive': '#95a5a6'
        };
        return colors[status] || colors.inactive;
    }

    getProgressColor(status) {
        const colors = {
            'active': '#2ecc71',
            'learning': '#5dade2',
            'premium': '#f39c12',
            'inactive': '#bdc3c7'
        };
        return colors[status] || colors.inactive;
    }

    showModuleDetails(moduleData) {
        const modal = document.getElementById('moduleModal');
        const title = document.getElementById('modalTitle');
        const basicInfo = document.getElementById('basicInfo');
        const progressFill = document.getElementById('modalProgress');
        const progressText = document.getElementById('modalProgressText');
        const logHistory = document.getElementById('logHistory');
        const moduleConfig = document.getElementById('moduleConfig');

        title.textContent = `📦 ${moduleData.name}`;
        
        // Osnovne informacije
        basicInfo.innerHTML = `
            <div class="info-row"><strong>Status:</strong> <span class="status-${moduleData.status}">${this.getStatusText(moduleData.status)}</span></div>
            <div class="info-row"><strong>Tip:</strong> ${moduleData.type}</div>
            <div class="info-row"><strong>Zadnja aktivnost:</strong> ${new Date().toLocaleString('sl-SI')}</div>
        `;

        // Napredek
        progressFill.style.width = `${moduleData.progress || 0}%`;
        progressText.textContent = `${moduleData.progress || 0}%`;

        // Logi
        logHistory.innerHTML = this.generateLogEntries(moduleData);

        // Konfiguracija
        moduleConfig.innerHTML = this.generateConfigInfo(moduleData);

        modal.style.display = 'block';
    }

    getStatusText(status) {
        const statusTexts = {
            'active': '🟢 Aktivno',
            'learning': '🔵 Učenje v teku',
            'premium': '🔴 Premium funkcija',
            'inactive': '⚪ Neaktivno'
        };
        return statusTexts[status] || statusTexts.inactive;
    }

    generateLogEntries(moduleData) {
        const logs = [
            { time: '10:30:15', level: 'info', message: `${moduleData.name} uspešno inicializiran` },
            { time: '10:30:20', level: 'success', message: 'Povezava z bazo podatkov vzpostavljena' },
            { time: '10:30:25', level: 'info', message: 'Nalaganje konfiguracijskih datotek' },
            { time: '10:30:30', level: 'warn', message: 'Visoka poraba pomnilnika zaznana' },
            { time: '10:30:35', level: 'info', message: `Napredek učenja: ${moduleData.progress}%` }
        ];

        return logs.map(log => 
            `<div class="log-entry">
                <span class="log-timestamp">[${log.time}]</span>
                <span class="log-level-${log.level}">[${log.level.toUpperCase()}]</span>
                ${log.message}
            </div>`
        ).join('');
    }

    generateConfigInfo(moduleData) {
        return `
            <div class="config-item"><strong>Vrata:</strong> ${Math.floor(Math.random() * 9000) + 1000}</div>
            <div class="config-item"><strong>Pomnilnik:</strong> ${Math.floor(Math.random() * 512) + 128}MB</div>
            <div class="config-item"><strong>CPU:</strong> ${Math.floor(Math.random() * 50) + 10}%</div>
            <div class="config-item"><strong>Omrežje:</strong> ${Math.floor(Math.random() * 100) + 50}Mbps</div>
        `;
    }

    closeModal() {
        document.getElementById('moduleModal').style.display = 'none';
    }

    highlightSearchResults() {
        this.g.selectAll('.node').classed('highlighted', false);
        
        if (this.searchTerm) {
            this.g.selectAll('.node')
                .filter(d => d.data.name.toLowerCase().includes(this.searchTerm))
                .classed('highlighted', true);
        }
    }

    performSearch() {
        const input = document.getElementById('searchInput');
        this.searchTerm = input.value.toLowerCase();
        this.highlightSearchResults();
        
        if (this.searchTerm) {
            // Razširi vozlišča, ki vsebujejo iskalni izraz
            this.root.descendants().forEach(d => {
                if (d.data.name.toLowerCase().includes(this.searchTerm)) {
                    let parent = d.parent;
                    while (parent) {
                        if (parent._children) {
                            parent.children = parent._children;
                            parent._children = null;
                        }
                        parent = parent.parent;
                    }
                }
            });
            this.update(this.root);
        }
    }

    calculateStats(root) {
        let activeCount = 0;
        let learningCount = 0;
        let totalProgress = 0;
        let nodeCount = 0;

        root.descendants().forEach(d => {
            nodeCount++;
            totalProgress += d.data.progress || 0;
            
            if (d.data.status === 'active') activeCount++;
            if (d.data.status === 'learning') learningCount++;
        });

        return {
            activeCount,
            learningCount,
            overallProgress: Math.round(totalProgress / nodeCount)
        };
    }

    updateSystemStats(stats) {
        document.getElementById('activeCount').textContent = stats.activeCount;
        document.getElementById('learningCount').textContent = stats.learningCount;
        document.getElementById('overallProgress').textContent = `${stats.overallProgress}%`;
    }

    updateLastUpdate() {
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('sl-SI');
    }

    handleModuleUpdate(data) {
        // Posodobi podatke modula v realnem času
        console.log('Posodobitev modula:', data);
        this.loadModuleData();
    }

    handleLearningProgress(data) {
        // Posodobi napredek učenja
        console.log('Napredek učenja:', data);
        this.updateProgressCircles(data);
    }

    updateProgressCircles(data) {
        this.g.selectAll('.progress-fill')
            .filter(d => d.data.name === data.moduleName)
            .transition()
            .duration(500)
            .style('stroke-dasharray', d => {
                const circumference = 2 * Math.PI * (this.nodeRadius + 5);
                return `${(data.progress / 100) * circumference} ${circumference}`;
            });
    }
}

// Inicializiraj aplikacijo
document.addEventListener('DOMContentLoaded', () => {
    window.visualTree = new VisualLearningTree();
    
    // Posodobi podatke vsakih 10 sekund
    setInterval(() => {
        window.visualTree.loadModuleData();
    }, 10000);
});