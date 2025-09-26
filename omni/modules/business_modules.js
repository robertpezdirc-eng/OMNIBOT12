const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * OMNI Business Modules - Specializirani poslovni moduli
 * 
 * Vključuje:
 * - Gostinstvo & Restavracije
 * - Kmetijstvo & Živinoreja  
 * - Finančno svetovanje & Optimizacija
 * - Logistika & Transport
 * - Marketing & Prodaja
 */

/**
 * Gostinstvo & Restavracije Modul
 */
class HospitalityModule extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            defaultCurrency: options.defaultCurrency || 'EUR',
            taxRate: options.taxRate || 0.22, // 22% DDV
            profitMargin: options.profitMargin || 0.30, // 30% marža
            ...options
        };
        
        // Data storage
        this.menus = new Map();
        this.recipes = new Map();
        this.inventory = new Map();
        this.suppliers = new Map();
        this.reservations = new Map();
        this.customers = new Map();
        this.staff = new Map();
        this.analytics = new Map();
        
        console.log('🍽️ Inicializiram Hospitality Module...');
    }
    
    async initialize() {
        try {
            console.log('🏨 Zaganjam Hospitality Module...');
            
            // Load sample data
            await this.loadSampleMenus();
            await this.loadSampleRecipes();
            await this.loadSampleSuppliers();
            
            console.log('✅ Hospitality Module uspešno inicializiran');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Hospitality Module:', error);
            throw error;
        }
    }
    
    async loadSampleMenus() {
        const sampleMenus = [
            {
                id: 'slovenian_traditional',
                name: 'Tradicionalna slovenska kuhinja',
                category: 'main_menu',
                items: [
                    {
                        id: 'jota',
                        name: 'Jota',
                        description: 'Tradicionalna slovenska enolončnica s kislim zeljem',
                        price: 8.50,
                        cost: 3.20,
                        category: 'soup',
                        allergens: ['gluten'],
                        preparationTime: 45,
                        difficulty: 'medium',
                        seasonal: false
                    },
                    {
                        id: 'kranjska_klobasa',
                        name: 'Kranjska klobasa z zeljem',
                        description: 'Tradicionalna kranjska klobasa s kislim zeljem in krompirjem',
                        price: 12.80,
                        cost: 5.40,
                        category: 'main_course',
                        allergens: [],
                        preparationTime: 25,
                        difficulty: 'easy',
                        seasonal: false
                    },
                    {
                        id: 'potica',
                        name: 'Potica',
                        description: 'Tradicionalni slovenski zavitek z orehi',
                        price: 4.50,
                        cost: 1.80,
                        category: 'dessert',
                        allergens: ['gluten', 'nuts', 'eggs'],
                        preparationTime: 120,
                        difficulty: 'hard',
                        seasonal: false
                    }
                ],
                active: true,
                createdAt: new Date().toISOString()
            }
        ];
        
        for (const menu of sampleMenus) {
            this.menus.set(menu.id, menu);
        }
    }
    
    async loadSampleRecipes() {
        const sampleRecipes = [
            {
                id: 'jota_recipe',
                menuItemId: 'jota',
                name: 'Jota - tradicionalni recept',
                servings: 4,
                ingredients: [
                    { name: 'Kislo zelje', quantity: 500, unit: 'g', cost: 1.20 },
                    { name: 'Fižol', quantity: 200, unit: 'g', cost: 0.80 },
                    { name: 'Krompir', quantity: 300, unit: 'g', cost: 0.60 },
                    { name: 'Klobasa', quantity: 200, unit: 'g', cost: 2.40 },
                    { name: 'Čebula', quantity: 100, unit: 'g', cost: 0.20 }
                ],
                instructions: [
                    'Namočite fižol čez noč',
                    'Skuhajte fižol do mehkega',
                    'Dodajte narezano čebulo in klobaso',
                    'Dodajte kislo zelje in krompir',
                    'Kuhajte 30 minut do kremaste konsistence'
                ],
                nutritionalInfo: {
                    calories: 320,
                    protein: 18,
                    carbs: 35,
                    fat: 12,
                    fiber: 8
                },
                totalCost: 5.20,
                costPerServing: 1.30
            }
        ];
        
        for (const recipe of sampleRecipes) {
            this.recipes.set(recipe.id, recipe);
        }
    }
    
    async loadSampleSuppliers() {
        const sampleSuppliers = [
            {
                id: 'local_farm_supplier',
                name: 'Lokalna kmetija Novak',
                category: 'vegetables',
                contact: {
                    phone: '+386 1 234 5678',
                    email: 'info@kmetija-novak.si',
                    address: 'Glavna cesta 15, 1000 Ljubljana'
                },
                products: [
                    { name: 'Krompir', price: 0.80, unit: 'kg', quality: 'bio' },
                    { name: 'Čebula', price: 1.20, unit: 'kg', quality: 'bio' },
                    { name: 'Korenje', price: 1.50, unit: 'kg', quality: 'bio' }
                ],
                deliveryDays: ['monday', 'wednesday', 'friday'],
                minimumOrder: 50,
                paymentTerms: 30,
                rating: 4.8,
                sustainable: true
            }
        ];
        
        for (const supplier of sampleSuppliers) {
            this.suppliers.set(supplier.id, supplier);
        }
    }
    
    // Menu management
    async createMenuItem(itemData) {
        const item = {
            id: `item_${Date.now()}`,
            ...itemData,
            profitMargin: ((itemData.price - itemData.cost) / itemData.price * 100).toFixed(2),
            createdAt: new Date().toISOString()
        };
        
        // Add to menu
        const menuId = itemData.menuId || 'default';
        let menu = this.menus.get(menuId);
        
        if (!menu) {
            menu = {
                id: menuId,
                name: 'Default Menu',
                items: [],
                active: true,
                createdAt: new Date().toISOString()
            };
            this.menus.set(menuId, menu);
        }
        
        menu.items.push(item);
        
        console.log(`🍽️ Ustvarjen nov menu item: ${item.name}`);
        this.emit('menuItemCreated', item);
        
        return item;
    }
    
    // Cost calculation
    calculateMenuPricing(recipeId, targetMargin = null) {
        const recipe = this.recipes.get(recipeId);
        if (!recipe) {
            throw new Error(`Recept ${recipeId} ni najden`);
        }
        
        const margin = targetMargin || this.config.profitMargin;
        const costPerServing = recipe.costPerServing;
        const suggestedPrice = costPerServing / (1 - margin);
        const priceWithTax = suggestedPrice * (1 + this.config.taxRate);
        
        return {
            costPerServing,
            suggestedPrice: Math.round(suggestedPrice * 100) / 100,
            priceWithTax: Math.round(priceWithTax * 100) / 100,
            margin: margin * 100,
            profitPerServing: suggestedPrice - costPerServing
        };
    }
    
    // Reservation system
    async createReservation(reservationData) {
        const reservation = {
            id: `res_${Date.now()}`,
            ...reservationData,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        
        this.reservations.set(reservation.id, reservation);
        
        console.log(`📅 Nova rezervacija: ${reservation.customerName} za ${reservation.date}`);
        this.emit('reservationCreated', reservation);
        
        return reservation;
    }
    
    // Analytics
    generateSalesReport(period = 'month') {
        // Simulate sales data
        const report = {
            period,
            totalRevenue: 15420.50,
            totalCosts: 8230.25,
            profit: 7190.25,
            profitMargin: 46.6,
            topSellingItems: [
                { name: 'Kranjska klobasa', quantity: 145, revenue: 1856.00 },
                { name: 'Jota', quantity: 98, revenue: 833.00 },
                { name: 'Potica', quantity: 67, revenue: 301.50 }
            ],
            customerCount: 342,
            averageOrderValue: 45.09,
            generatedAt: new Date().toISOString()
        };
        
        return report;
    }
}

/**
 * Kmetijstvo & Živinoreja Modul
 */
class AgricultureModule extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            defaultCurrency: options.defaultCurrency || 'EUR',
            region: options.region || 'Slovenia',
            ...options
        };
        
        // Data storage
        this.crops = new Map();
        this.livestock = new Map();
        this.fields = new Map();
        this.equipment = new Map();
        this.weather = new Map();
        this.marketPrices = new Map();
        this.tasks = new Map();
        this.harvests = new Map();
        
        console.log('🌾 Inicializiram Agriculture Module...');
    }
    
    async initialize() {
        try {
            console.log('🚜 Zaganjam Agriculture Module...');
            
            await this.loadCropData();
            await this.loadLivestockData();
            await this.loadMarketPrices();
            
            console.log('✅ Agriculture Module uspešno inicializiran');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Agriculture Module:', error);
            throw error;
        }
    }
    
    async loadCropData() {
        const crops = [
            {
                id: 'wheat',
                name: 'Pšenica',
                type: 'grain',
                plantingMonths: [9, 10],
                harvestMonths: [7, 8],
                growthPeriod: 280, // days
                yieldPerHectare: 6500, // kg
                waterRequirement: 'medium',
                soilType: ['clay', 'loam'],
                diseases: ['rust', 'blight'],
                marketPrice: 0.25, // EUR per kg
                organic: false
            },
            {
                id: 'corn',
                name: 'Koruza',
                type: 'grain',
                plantingMonths: [4, 5],
                harvestMonths: [9, 10],
                growthPeriod: 120,
                yieldPerHectare: 8500,
                waterRequirement: 'high',
                soilType: ['loam', 'sandy'],
                diseases: ['corn_borer', 'smut'],
                marketPrice: 0.22,
                organic: false
            },
            {
                id: 'potatoes',
                name: 'Krompir',
                type: 'vegetable',
                plantingMonths: [3, 4, 5],
                harvestMonths: [8, 9, 10],
                growthPeriod: 90,
                yieldPerHectare: 25000,
                waterRequirement: 'medium',
                soilType: ['sandy', 'loam'],
                diseases: ['late_blight', 'scab'],
                marketPrice: 0.80,
                organic: true
            }
        ];
        
        for (const crop of crops) {
            this.crops.set(crop.id, crop);
        }
    }
    
    async loadLivestockData() {
        const livestock = [
            {
                id: 'dairy_cows',
                name: 'Molzne krave',
                type: 'cattle',
                averageWeight: 650, // kg
                dailyMilkProduction: 25, // liters
                feedConsumption: 18, // kg per day
                gestation: 280, // days
                lifespan: 6, // years
                marketValue: 1200, // EUR
                maintenanceCost: 8.50 // EUR per day
            },
            {
                id: 'pigs',
                name: 'Prašiči',
                type: 'swine',
                averageWeight: 110,
                dailyWeightGain: 0.8, // kg
                feedConsumption: 3.2,
                gestation: 114,
                lifespan: 1.5,
                marketValue: 180,
                maintenanceCost: 2.80
            },
            {
                id: 'chickens',
                name: 'Kokoši',
                type: 'poultry',
                averageWeight: 2.2,
                dailyEggProduction: 0.8, // eggs
                feedConsumption: 0.12,
                gestation: 21,
                lifespan: 2,
                marketValue: 15,
                maintenanceCost: 0.25
            }
        ];
        
        for (const animal of livestock) {
            this.livestock.set(animal.id, animal);
        }
    }
    
    async loadMarketPrices() {
        const prices = [
            { product: 'milk', price: 0.42, unit: 'liter', trend: 'stable' },
            { product: 'eggs', price: 0.25, unit: 'piece', trend: 'rising' },
            { product: 'pork', price: 4.20, unit: 'kg', trend: 'falling' },
            { product: 'beef', price: 8.50, unit: 'kg', trend: 'stable' },
            { product: 'wheat', price: 0.25, unit: 'kg', trend: 'rising' },
            { product: 'corn', price: 0.22, unit: 'kg', trend: 'stable' }
        ];
        
        for (const price of prices) {
            this.marketPrices.set(price.product, price);
        }
    }
    
    // Crop planning
    async planCropRotation(fieldId, years = 3) {
        const field = this.fields.get(fieldId);
        if (!field) {
            throw new Error(`Polje ${fieldId} ni najdeno`);
        }
        
        const rotationPlan = [];
        const availableCrops = Array.from(this.crops.values());
        
        for (let year = 1; year <= years; year++) {
            // Simple rotation logic - avoid same crop family
            const previousCrop = rotationPlan[year - 2];
            const suitableCrops = availableCrops.filter(crop => {
                if (previousCrop && crop.type === previousCrop.type) return false;
                return field.soilType.some(soil => crop.soilType.includes(soil));
            });
            
            const selectedCrop = suitableCrops[0] || availableCrops[0];
            
            rotationPlan.push({
                year,
                crop: selectedCrop,
                plantingDate: this.calculatePlantingDate(selectedCrop),
                harvestDate: this.calculateHarvestDate(selectedCrop),
                expectedYield: selectedCrop.yieldPerHectare * field.area,
                expectedRevenue: selectedCrop.yieldPerHectare * field.area * selectedCrop.marketPrice
            });
        }
        
        return {
            fieldId,
            plan: rotationPlan,
            totalExpectedRevenue: rotationPlan.reduce((sum, year) => sum + year.expectedRevenue, 0),
            createdAt: new Date().toISOString()
        };
    }
    
    // Livestock management
    calculateLivestockProfitability(animalType, quantity, period = 365) {
        const animal = this.livestock.get(animalType);
        if (!animal) {
            throw new Error(`Žival ${animalType} ni najdena`);
        }
        
        const dailyRevenue = this.calculateDailyRevenue(animal);
        const dailyCosts = animal.maintenanceCost;
        const dailyProfit = dailyRevenue - dailyCosts;
        
        return {
            animalType: animal.name,
            quantity,
            period,
            dailyRevenue: dailyRevenue * quantity,
            dailyCosts: dailyCosts * quantity,
            dailyProfit: dailyProfit * quantity,
            totalRevenue: dailyRevenue * quantity * period,
            totalCosts: dailyCosts * quantity * period,
            totalProfit: dailyProfit * quantity * period,
            profitMargin: ((dailyProfit / dailyRevenue) * 100).toFixed(2),
            breakEvenDays: Math.ceil(animal.marketValue / dailyProfit)
        };
    }
    
    calculateDailyRevenue(animal) {
        switch (animal.type) {
            case 'cattle':
                const milkPrice = this.marketPrices.get('milk')?.price || 0.42;
                return animal.dailyMilkProduction * milkPrice;
            case 'poultry':
                const eggPrice = this.marketPrices.get('eggs')?.price || 0.25;
                return animal.dailyEggProduction * eggPrice;
            case 'swine':
                const porkPrice = this.marketPrices.get('pork')?.price || 4.20;
                return animal.dailyWeightGain * porkPrice;
            default:
                return 0;
        }
    }
    
    // Weather integration
    async getWeatherAdvice(location, cropType) {
        // Simulate weather advice
        const crop = this.crops.get(cropType);
        if (!crop) {
            throw new Error(`Kultura ${cropType} ni najdena`);
        }
        
        const advice = {
            location,
            crop: crop.name,
            currentConditions: {
                temperature: 18,
                humidity: 65,
                rainfall: 2.5,
                windSpeed: 12
            },
            recommendations: [],
            alerts: [],
            forecast: '7-dnevna napoved kaže stabilne razmere'
        };
        
        // Generate recommendations based on crop needs
        if (crop.waterRequirement === 'high' && advice.currentConditions.rainfall < 5) {
            advice.recommendations.push('Priporočamo namakanje - padavine so pod potrebno količino');
        }
        
        if (advice.currentConditions.humidity > 80) {
            advice.alerts.push('Visoka vlažnost - povečano tveganje za glivične bolezni');
        }
        
        return advice;
    }
    
    calculatePlantingDate(crop) {
        const currentYear = new Date().getFullYear();
        const plantingMonth = crop.plantingMonths[0];
        return new Date(currentYear, plantingMonth - 1, 15).toISOString().split('T')[0];
    }
    
    calculateHarvestDate(crop) {
        const plantingDate = new Date(this.calculatePlantingDate(crop));
        const harvestDate = new Date(plantingDate);
        harvestDate.setDate(harvestDate.getDate() + crop.growthPeriod);
        return harvestDate.toISOString().split('T')[0];
    }
}

/**
 * Finančno svetovanje & Optimizacija Modul
 */
class FinanceModule extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            defaultCurrency: options.defaultCurrency || 'EUR',
            taxRate: options.taxRate || 0.22,
            inflationRate: options.inflationRate || 0.03,
            ...options
        };
        
        // Data storage
        this.budgets = new Map();
        this.investments = new Map();
        this.expenses = new Map();
        this.incomes = new Map();
        this.goals = new Map();
        this.portfolios = new Map();
        
        console.log('💰 Inicializiram Finance Module...');
    }
    
    async initialize() {
        try {
            console.log('💼 Zaganjam Finance Module...');
            
            await this.loadSampleData();
            
            console.log('✅ Finance Module uspešno inicializiran');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Finance Module:', error);
            throw error;
        }
    }
    
    async loadSampleData() {
        // Sample budget categories
        const categories = [
            { id: 'housing', name: 'Stanovanje', type: 'expense', priority: 'high' },
            { id: 'food', name: 'Hrana', type: 'expense', priority: 'high' },
            { id: 'transport', name: 'Prevoz', type: 'expense', priority: 'medium' },
            { id: 'entertainment', name: 'Zabava', type: 'expense', priority: 'low' },
            { id: 'salary', name: 'Plača', type: 'income', priority: 'high' },
            { id: 'investments', name: 'Naložbe', type: 'income', priority: 'medium' }
        ];
        
        this.categories = new Map(categories.map(cat => [cat.id, cat]));
    }
    
    // Budget management
    async createBudget(budgetData) {
        const budget = {
            id: `budget_${Date.now()}`,
            ...budgetData,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        
        // Calculate totals
        budget.totalIncome = budget.incomes?.reduce((sum, income) => sum + income.amount, 0) || 0;
        budget.totalExpenses = budget.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
        budget.netIncome = budget.totalIncome - budget.totalExpenses;
        budget.savingsRate = budget.totalIncome > 0 ? (budget.netIncome / budget.totalIncome * 100).toFixed(2) : 0;
        
        this.budgets.set(budget.id, budget);
        
        console.log(`💰 Ustvarjen nov proračun: ${budget.name}`);
        this.emit('budgetCreated', budget);
        
        return budget;
    }
    
    // Investment analysis
    analyzeInvestment(investmentData) {
        const {
            initialAmount,
            monthlyContribution = 0,
            annualReturn,
            years,
            riskLevel = 'medium'
        } = investmentData;
        
        const monthlyReturn = annualReturn / 12 / 100;
        const months = years * 12;
        
        // Calculate future value with compound interest
        let futureValue = initialAmount;
        let totalContributions = initialAmount;
        
        for (let month = 1; month <= months; month++) {
            futureValue = futureValue * (1 + monthlyReturn) + monthlyContribution;
            totalContributions += monthlyContribution;
        }
        
        const totalGains = futureValue - totalContributions;
        const totalReturn = (totalGains / totalContributions * 100).toFixed(2);
        
        // Risk assessment
        const riskFactors = {
            low: { volatility: 5, maxDrawdown: 10 },
            medium: { volatility: 15, maxDrawdown: 25 },
            high: { volatility: 30, maxDrawdown: 50 }
        };
        
        const risk = riskFactors[riskLevel];
        
        return {
            initialAmount,
            monthlyContribution,
            totalContributions,
            futureValue: Math.round(futureValue * 100) / 100,
            totalGains: Math.round(totalGains * 100) / 100,
            totalReturn,
            annualReturn,
            years,
            riskLevel,
            riskAssessment: {
                expectedVolatility: `±${risk.volatility}%`,
                maxDrawdown: `${risk.maxDrawdown}%`,
                recommendation: this.getInvestmentRecommendation(riskLevel, years)
            },
            inflationAdjusted: {
                realReturn: (annualReturn - this.config.inflationRate * 100).toFixed(2),
                purchasingPower: Math.round(futureValue / Math.pow(1 + this.config.inflationRate, years) * 100) / 100
            }
        };
    }
    
    // Debt optimization
    optimizeDebtPayment(debts) {
        // Sort debts by interest rate (avalanche method) and by balance (snowball method)
        const avalanche = [...debts].sort((a, b) => b.interestRate - a.interestRate);
        const snowball = [...debts].sort((a, b) => a.balance - b.balance);
        
        const calculatePayoffTime = (debtList, extraPayment = 0) => {
            return debtList.map(debt => {
                const monthlyRate = debt.interestRate / 100 / 12;
                const totalPayment = debt.minimumPayment + (extraPayment || 0);
                
                if (monthlyRate === 0) {
                    return {
                        ...debt,
                        payoffMonths: Math.ceil(debt.balance / totalPayment),
                        totalInterest: 0
                    };
                }
                
                const payoffMonths = Math.ceil(
                    -Math.log(1 - (debt.balance * monthlyRate) / totalPayment) / Math.log(1 + monthlyRate)
                );
                
                const totalInterest = (totalPayment * payoffMonths) - debt.balance;
                
                return {
                    ...debt,
                    payoffMonths,
                    totalInterest: Math.max(0, totalInterest)
                };
            });
        };
        
        return {
            avalancheMethod: {
                strategy: 'Plačaj najprej dolgove z najvišjo obrestno mero',
                debts: calculatePayoffTime(avalanche),
                totalInterest: calculatePayoffTime(avalanche).reduce((sum, debt) => sum + debt.totalInterest, 0)
            },
            snowballMethod: {
                strategy: 'Plačaj najprej najmanjše dolgove',
                debts: calculatePayoffTime(snowball),
                totalInterest: calculatePayoffTime(snowball).reduce((sum, debt) => sum + debt.totalInterest, 0)
            },
            recommendation: 'Avalanche metoda prihrani več denarja, snowball metoda zagotavlja hitrejše psihološke zmage'
        };
    }
    
    // Retirement planning
    calculateRetirementNeeds(retirementData) {
        const {
            currentAge,
            retirementAge,
            currentIncome,
            desiredIncomeReplacement = 0.8, // 80% of current income
            currentSavings = 0,
            monthlyContribution = 0,
            expectedReturn = 0.07, // 7% annual return
            inflationRate = this.config.inflationRate
        } = retirementData;
        
        const yearsToRetirement = retirementAge - currentAge;
        const yearsInRetirement = 85 - retirementAge; // Assume life expectancy of 85
        
        // Calculate needed retirement income (adjusted for inflation)
        const futureIncomeNeeded = currentIncome * desiredIncomeReplacement * Math.pow(1 + inflationRate, yearsToRetirement);
        
        // Calculate total retirement needs (25x annual expenses rule)
        const totalRetirementNeeds = futureIncomeNeeded * 25;
        
        // Calculate future value of current savings and contributions
        const futureValueCurrentSavings = currentSavings * Math.pow(1 + expectedReturn, yearsToRetirement);
        const futureValueContributions = monthlyContribution * 12 * (Math.pow(1 + expectedReturn, yearsToRetirement) - 1) / expectedReturn;
        
        const totalFutureValue = futureValueCurrentSavings + futureValueContributions;
        const shortfall = Math.max(0, totalRetirementNeeds - totalFutureValue);
        
        // Calculate required monthly contribution to meet goal
        const requiredMonthlyContribution = shortfall > 0 ? 
            (shortfall * expectedReturn) / (12 * (Math.pow(1 + expectedReturn, yearsToRetirement) - 1)) : 0;
        
        return {
            currentAge,
            retirementAge,
            yearsToRetirement,
            currentIncome,
            futureIncomeNeeded: Math.round(futureIncomeNeeded),
            totalRetirementNeeds: Math.round(totalRetirementNeeds),
            currentSavings,
            monthlyContribution,
            totalFutureValue: Math.round(totalFutureValue),
            shortfall: Math.round(shortfall),
            requiredMonthlyContribution: Math.round(requiredMonthlyContribution),
            onTrack: shortfall === 0,
            recommendations: this.getRetirementRecommendations(shortfall, yearsToRetirement, requiredMonthlyContribution)
        };
    }
    
    // Tax optimization
    optimizeTaxes(taxData) {
        const {
            grossIncome,
            deductions = [],
            investmentGains = 0,
            businessExpenses = 0
        } = taxData;
        
        const standardDeduction = 6000; // Standard deduction in Slovenia
        const totalDeductions = deductions.reduce((sum, ded) => sum + ded.amount, 0) + standardDeduction;
        const taxableIncome = Math.max(0, grossIncome - totalDeductions - businessExpenses);
        
        // Slovenian tax brackets (simplified)
        const taxBrackets = [
            { min: 0, max: 8500, rate: 0.16 },
            { min: 8500, max: 25000, rate: 0.26 },
            { min: 25000, max: 50000, rate: 0.33 },
            { min: 50000, max: Infinity, rate: 0.45 }
        ];
        
        let totalTax = 0;
        let remainingIncome = taxableIncome;
        
        for (const bracket of taxBrackets) {
            if (remainingIncome <= 0) break;
            
            const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
            totalTax += taxableInBracket * bracket.rate;
            remainingIncome -= taxableInBracket;
        }
        
        // Capital gains tax (simplified)
        const capitalGainsTax = investmentGains * 0.25; // 25% capital gains tax
        
        const totalTaxLiability = totalTax + capitalGainsTax;
        const effectiveRate = (totalTaxLiability / grossIncome * 100).toFixed(2);
        const netIncome = grossIncome - totalTaxLiability;
        
        return {
            grossIncome,
            totalDeductions,
            taxableIncome,
            totalTax: Math.round(totalTax),
            capitalGainsTax: Math.round(capitalGainsTax),
            totalTaxLiability: Math.round(totalTaxLiability),
            netIncome: Math.round(netIncome),
            effectiveRate,
            recommendations: this.getTaxOptimizationRecommendations(taxData)
        };
    }
    
    // Helper methods
    getInvestmentRecommendation(riskLevel, years) {
        if (years < 5) {
            return 'Kratkoročne naložbe - priporočamo nizko tveganje';
        } else if (years < 15) {
            return 'Srednjeročne naložbe - uravnotežen portfelj';
        } else {
            return 'Dolgoročne naložbe - lahko prevzamete višje tveganje';
        }
    }
    
    getRetirementRecommendations(shortfall, yearsToRetirement, requiredContribution) {
        const recommendations = [];
        
        if (shortfall > 0) {
            recommendations.push(`Povečajte mesečni prihranek za ${Math.round(requiredContribution)} EUR`);
            
            if (yearsToRetirement > 10) {
                recommendations.push('Razmislite o bolj agresivni naložbeni strategiji');
            }
            
            recommendations.push('Preverite možnosti dodatnega pokojninskega zavarovanja');
        } else {
            recommendations.push('Čestitamo! Na dobri poti ste za udobno upokojitev');
            recommendations.push('Razmislite o predčasni upokojitvi ali povečanju življenjskega standarda');
        }
        
        return recommendations;
    }
    
    getTaxOptimizationRecommendations(taxData) {
        const recommendations = [];
        
        recommendations.push('Maksimalno izkoristite davčne olajšave za pokojninsko varčevanje');
        recommendations.push('Razmislite o donacijah za davčne olajšave');
        
        if (taxData.businessExpenses > 0) {
            recommendations.push('Preverite vse možne poslovne odbitke');
        }
        
        if (taxData.investmentGains > 0) {
            recommendations.push('Razmislite o davčno učinkovitih naložbenih strategijah');
        }
        
        return recommendations;
    }
    
    // Analytics and reporting
    generateFinancialReport(userId, period = 'month') {
        // Simulate comprehensive financial report
        return {
            period,
            userId,
            summary: {
                totalIncome: 3500,
                totalExpenses: 2800,
                netIncome: 700,
                savingsRate: 20,
                investmentGrowth: 5.2
            },
            budgetPerformance: {
                onTrack: 75,
                overBudget: 15,
                underBudget: 10
            },
            recommendations: [
                'Povečajte prihranke za 5% za dosego letnega cilja',
                'Razmislite o refinanciranju hipoteke',
                'Diverzificirajte naložbeni portfelj'
            ],
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = {
    HospitalityModule,
    AgricultureModule,
    FinanceModule
};