const express = require('express');
const router = express.Router();

// Lokalna definicija colorLog funkcije
const colorLog = (message, color = 'white') => {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color] || colors.white}${message}${colors.reset}`);
};

// Simulacija baze podatkov modulov
let modules = [
    {
        id: 'omni_cloud',
        name: 'Oblačna Arhitektura',
        description: 'Centralizirana oblačna arhitektura z API gateway',
        version: '1.0.0',
        status: 'active',
        port: 8080,
        endpoint: '/api/v1/cloud',
        capabilities: ['cloud_storage', 'api_gateway', 'load_balancing'],
        dependencies: [],
        last_updated: new Date(),
        performance_metrics: {
            avg_response_time: 120,
            success_rate: 0.98,
            requests_per_minute: 450
        }
    },
    {
        id: 'omni_security',
        name: 'Varnostni Sistem',
        description: 'Šifriranje, avtentikacija in zaščita pred krajo',
        version: '1.0.0',
        status: 'active',
        port: 8081,
        endpoint: '/api/v1/security',
        capabilities: ['encryption', 'authentication', 'authorization', 'audit'],
        dependencies: [],
        last_updated: new Date(),
        performance_metrics: {
            avg_response_time: 85,
            success_rate: 0.99,
            requests_per_minute: 320
        }
    },
    {
        id: 'omni_pos',
        name: 'POS Sistem',
        description: 'Blagajna z fiskalizacijo in plačili',
        version: '1.0.0',
        status: 'inactive',
        port: 8083,
        endpoint: '/api/v1/pos',
        capabilities: ['payment_processing', 'fiscal_integration', 'inventory'],
        dependencies: ['omni_security'],
        last_updated: new Date(),
        performance_metrics: {
            avg_response_time: 200,
            success_rate: 0.95,
            requests_per_minute: 150
        }
    },
    {
        id: 'omni_analytics',
        name: 'Analitika',
        description: 'Napredna analitika in poročila',
        version: '1.0.0',
        status: 'active',
        port: 8084,
        endpoint: '/api/v1/analytics',
        capabilities: ['data_analysis', 'reporting', 'visualization', 'ml_insights'],
        dependencies: ['omni_cloud'],
        last_updated: new Date(),
        performance_metrics: {
            avg_response_time: 350,
            success_rate: 0.97,
            requests_per_minute: 80
        }
    }
];

// GET /api/modules - Seznam vseh modulov
router.get('/', (req, res) => {
    try {
        const { status, search } = req.query;
        let filteredModules = modules;

        // Filtriraj po statusu
        if (status) {
            filteredModules = filteredModules.filter(module => module.status === status);
        }

        // Filtriraj po iskanju
        if (search) {
            const searchLower = search.toLowerCase();
            filteredModules = filteredModules.filter(module => 
                module.name.toLowerCase().includes(searchLower) ||
                module.description.toLowerCase().includes(searchLower) ||
                module.capabilities.some(cap => cap.toLowerCase().includes(searchLower))
            );
        }

        colorLog(`📋 Pridobljenih ${filteredModules.length} modulov`, 'cyan');
        
        res.json({
            success: true,
            modules: filteredModules,
            total: filteredModules.length,
            filters: { status, search }
        });
    } catch (error) {
        colorLog(`❌ Napaka pri pridobivanju modulov: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju modulov',
            message: error.message
        });
    }
});

// GET /api/modules/:id - Podrobnosti modula
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const module = modules.find(m => m.id === id);

        if (!module) {
            return res.status(404).json({
                success: false,
                error: 'Modul ni najden',
                module_id: id
            });
        }

        colorLog(`📦 Pridobljen modul: ${module.name}`, 'blue');
        
        res.json({
            success: true,
            module: module
        });
    } catch (error) {
        colorLog(`❌ Napaka pri pridobivanju modula: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju modula',
            message: error.message
        });
    }
});

// POST /api/modules - Ustvari nov modul
router.post('/', (req, res) => {
    try {
        const { name, description, port, endpoint, capabilities = [], dependencies = [] } = req.body;

        if (!name || !description || !port) {
            return res.status(400).json({
                success: false,
                error: 'Manjkajo obvezni podatki',
                required: ['name', 'description', 'port']
            });
        }

        // Preveri, če modul že obstaja
        const existingModule = modules.find(m => m.name === name || m.port === port);
        if (existingModule) {
            return res.status(409).json({
                success: false,
                error: 'Modul že obstaja',
                existing_module: existingModule.id
            });
        }

        const newModule = {
            id: `omni_${name.toLowerCase().replace(/\s+/g, '_')}`,
            name,
            description,
            version: '1.0.0',
            status: 'inactive',
            port,
            endpoint: endpoint || `/api/v1/${name.toLowerCase()}`,
            capabilities,
            dependencies,
            last_updated: new Date(),
            performance_metrics: {
                avg_response_time: 0,
                success_rate: 1.0,
                requests_per_minute: 0
            }
        };

        modules.push(newModule);
        colorLog(`✅ Ustvarjen nov modul: ${newModule.name}`, 'green');

        res.status(201).json({
            success: true,
            message: 'Modul uspešno ustvarjen',
            module: newModule
        });
    } catch (error) {
        colorLog(`❌ Napaka pri ustvarjanju modula: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri ustvarjanju modula',
            message: error.message
        });
    }
});

// PUT /api/modules/:id - Posodobi modul
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const moduleIndex = modules.findIndex(m => m.id === id);

        if (moduleIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Modul ni najden',
                module_id: id
            });
        }

        const updatedModule = {
            ...modules[moduleIndex],
            ...req.body,
            id: id, // Prepreči spreminjanje ID-ja
            last_updated: new Date()
        };

        modules[moduleIndex] = updatedModule;
        colorLog(`🔄 Posodobljen modul: ${updatedModule.name}`, 'yellow');

        res.json({
            success: true,
            message: 'Modul uspešno posodobljen',
            module: updatedModule
        });
    } catch (error) {
        colorLog(`❌ Napaka pri posodabljanju modula: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri posodabljanju modula',
            message: error.message
        });
    }
});

// DELETE /api/modules/:id - Izbriši modul
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const moduleIndex = modules.findIndex(m => m.id === id);

        if (moduleIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Modul ni najden',
                module_id: id
            });
        }

        const deletedModule = modules[moduleIndex];
        modules.splice(moduleIndex, 1);
        colorLog(`🗑️ Izbrisan modul: ${deletedModule.name}`, 'red');

        res.json({
            success: true,
            message: 'Modul uspešno izbrisan',
            deleted_module: deletedModule.id
        });
    } catch (error) {
        colorLog(`❌ Napaka pri brisanju modula: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri brisanju modula',
            message: error.message
        });
    }
});

// POST /api/modules/:id/activate - Aktiviraj modul
router.post('/:id/activate', (req, res) => {
    try {
        const { id } = req.params;
        const module = modules.find(m => m.id === id);

        if (!module) {
            return res.status(404).json({
                success: false,
                error: 'Modul ni najden',
                module_id: id
            });
        }

        module.status = 'active';
        module.last_updated = new Date();
        colorLog(`🟢 Aktiviran modul: ${module.name}`, 'green');

        res.json({
            success: true,
            message: 'Modul uspešno aktiviran',
            module: module
        });
    } catch (error) {
        colorLog(`❌ Napaka pri aktivaciji modula: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri aktivaciji modula',
            message: error.message
        });
    }
});

// POST /api/modules/:id/deactivate - Deaktiviraj modul
router.post('/:id/deactivate', (req, res) => {
    try {
        const { id } = req.params;
        const module = modules.find(m => m.id === id);

        if (!module) {
            return res.status(404).json({
                success: false,
                error: 'Modul ni najden',
                module_id: id
            });
        }

        module.status = 'inactive';
        module.last_updated = new Date();
        colorLog(`🔴 Deaktiviran modul: ${module.name}`, 'yellow');

        res.json({
            success: true,
            message: 'Modul uspešno deaktiviran',
            module: module
        });
    } catch (error) {
        colorLog(`❌ Napaka pri deaktivaciji modula: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri deaktivaciji modula',
            message: error.message
        });
    }
});

// GET /api/modules/stats/overview - Pregled statistik modulov
router.get('/stats/overview', (req, res) => {
    try {
        const stats = {
            total_modules: modules.length,
            active_modules: modules.filter(m => m.status === 'active').length,
            inactive_modules: modules.filter(m => m.status === 'inactive').length,
            error_modules: modules.filter(m => m.status === 'error').length,
            avg_response_time: modules.reduce((sum, m) => sum + m.performance_metrics.avg_response_time, 0) / modules.length,
            total_requests_per_minute: modules.reduce((sum, m) => sum + m.performance_metrics.requests_per_minute, 0),
            capabilities_count: [...new Set(modules.flatMap(m => m.capabilities))].length,
            dependencies_count: [...new Set(modules.flatMap(m => m.dependencies))].length
        };

        colorLog(`📊 Pridobljene statistike modulov`, 'cyan');
        
        res.json({
            success: true,
            stats: stats,
            timestamp: new Date()
        });
    } catch (error) {
        colorLog(`❌ Napaka pri pridobivanju statistik: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri pridobivanju statistik',
            message: error.message
        });
    }
});

// POST /api/modules/batch/update-status - Množična posodobitev statusa
router.post('/batch/update-status', (req, res) => {
    try {
        const { module_ids, status } = req.body;

        if (!module_ids || !Array.isArray(module_ids) || !status) {
            return res.status(400).json({
                success: false,
                error: 'Manjkajo obvezni podatki',
                required: ['module_ids (array)', 'status']
            });
        }

        const validStatuses = ['active', 'inactive', 'error'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Neveljaven status',
                valid_statuses: validStatuses
            });
        }

        const updatedModules = [];
        const notFoundModules = [];

        module_ids.forEach(id => {
            const module = modules.find(m => m.id === id);
            if (module) {
                module.status = status;
                module.last_updated = new Date();
                updatedModules.push(module);
            } else {
                notFoundModules.push(id);
            }
        });

        colorLog(`🔄 Množična posodobitev: ${updatedModules.length} modulov → ${status}`, 'yellow');

        res.json({
            success: true,
            message: `Posodobljenih ${updatedModules.length} modulov`,
            updated_modules: updatedModules.map(m => ({ id: m.id, name: m.name, status: m.status })),
            not_found_modules: notFoundModules,
            total_updated: updatedModules.length
        });
    } catch (error) {
        colorLog(`❌ Napaka pri množični posodobitvi: ${error.message}`, 'red');
        res.status(500).json({
            success: false,
            error: 'Napaka pri množični posodobitvi',
            message: error.message
        });
    }
});

module.exports = router;