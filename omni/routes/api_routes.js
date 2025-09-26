const express = require('express');
const router = express.Router();

// API Routes for all OMNI modules
class APIRoutes {
    constructor(modules) {
        this.modules = modules;
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check endpoint
        router.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                modules: Object.keys(this.modules).map(key => ({
                    name: key,
                    status: this.modules[key] ? 'active' : 'inactive'
                }))
            });
        });

        // AI Core endpoints
        router.post('/ai/chat', async (req, res) => {
            try {
                const { message, context } = req.body;
                const response = await this.modules.aiCore.processMessage(message, context);
                res.json({ success: true, response });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Memory System endpoints
        router.get('/memory/stats', async (req, res) => {
            try {
                const stats = await this.modules.memorySystem.getStats();
                res.json({ success: true, stats });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Tourism Module endpoints
        router.post('/tourism/itinerary', async (req, res) => {
            try {
                const { destination, duration, budget, preferences } = req.body;
                const itinerary = await this.modules.tourismModule.generateItinerary({
                    destination,
                    duration,
                    budget,
                    preferences
                });
                res.json({ success: true, itinerary });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        router.post('/tourism/booking', async (req, res) => {
            try {
                const bookingData = req.body;
                const booking = await this.modules.tourismModule.createBooking(bookingData);
                res.json({ success: true, booking });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Hospitality Module endpoints
        router.post('/hospitality/menu', async (req, res) => {
            try {
                const { type, preferences, budget } = req.body;
                const menu = await this.modules.hospitalityModule.generateMenu({
                    type,
                    preferences,
                    budget
                });
                res.json({ success: true, menu });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        router.post('/hospitality/reservation', async (req, res) => {
            try {
                const reservationData = req.body;
                const reservation = await this.modules.hospitalityModule.createReservation(reservationData);
                res.json({ success: true, reservation });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Agriculture Module endpoints
        router.post('/agriculture/crop-plan', async (req, res) => {
            try {
                const { cropType, area, season, soilType } = req.body;
                const plan = await this.modules.agricultureModule.generateCropPlan({
                    cropType,
                    area,
                    season,
                    soilType
                });
                res.json({ success: true, plan });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        router.get('/agriculture/weather', async (req, res) => {
            try {
                const { location } = req.query;
                const weather = await this.modules.agricultureModule.getWeatherForecast(location);
                res.json({ success: true, weather });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Finance Module endpoints
        router.post('/finance/budget', async (req, res) => {
            try {
                const { income, expenses, goals } = req.body;
                const budget = await this.modules.financeModule.createBudget({
                    income,
                    expenses,
                    goals
                });
                res.json({ success: true, budget });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        router.post('/finance/investment', async (req, res) => {
            try {
                const { amount, riskLevel, timeHorizon } = req.body;
                const recommendation = await this.modules.financeModule.getInvestmentRecommendation({
                    amount,
                    riskLevel,
                    timeHorizon
                });
                res.json({ success: true, recommendation });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Monitoring endpoints
        router.get('/monitoring/metrics', async (req, res) => {
            try {
                const metrics = await this.modules.monitoringSystem.getMetrics();
                res.json({ success: true, metrics });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Performance endpoints
        router.get('/performance/stats', async (req, res) => {
            try {
                const stats = await this.modules.performanceOptimizer.getStats();
                res.json({ success: true, stats });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // API Documentation endpoint
        router.get('/docs', async (req, res) => {
            try {
                const docs = await this.modules.apiDocumentation.generateDocs();
                res.json({ success: true, docs });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Backup endpoints
        router.post('/backup/create', async (req, res) => {
            try {
                const backup = await this.modules.backupSystem.createBackup();
                res.json({ success: true, backup });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        router.get('/backup/list', async (req, res) => {
            try {
                const backups = await this.modules.backupSystem.listBackups();
                res.json({ success: true, backups });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Security endpoints
        router.get('/security/status', async (req, res) => {
            try {
                const status = await this.modules.securityManager.getSecurityStatus();
                res.json({ success: true, status });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        return router;
    }

    getRouter() {
        return router;
    }
}

module.exports = { APIRoutes };