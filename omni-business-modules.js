/**
 * OMNI Business Modules - Poslovni moduli
 * Turizem, Finance, Zdravje, Kmetijstvo, Pravo
 */

class OmniBusinessModules {
    constructor() {
        this.modules = {
            tourism: new TourismModule(),
            finance: new FinanceModule(),
            health: new HealthModule(),
            agriculture: new AgricultureModule(),
            legal: new LegalModule(),
            education: new EducationModule(),
            hospitality: new HospitalityModule()
        };
        
        this.activeProjects = new Map();
        this.templates = new Map();
        
        this.initializeTemplates();
        console.log('🏢 OMNI Business Modules inicializirani');
    }

    initializeTemplates() {
        // Turizem predloge
        this.templates.set('tourism-itinerary', {
            name: 'Turistični Itinerar',
            fields: ['destination', 'duration', 'budget', 'interests', 'accommodation'],
            template: 'tourism-itinerary-template'
        });
        
        // Finance predloge
        this.templates.set('business-plan', {
            name: 'Poslovni Načrt',
            fields: ['company', 'market', 'finances', 'strategy'],
            template: 'business-plan-template'
        });
        
        // Zdravje predloge
        this.templates.set('nutrition-plan', {
            name: 'Prehranski Načrt',
            fields: ['age', 'weight', 'goals', 'restrictions', 'activity'],
            template: 'nutrition-plan-template'
        });
    }

    async processBusinessRequest(request) {
        try {
            console.log('🏢 Procesiram poslovno zahtevo:', request.domain);
            
            const domain = this.detectDomain(request);
            const module = this.modules[domain];
            
            if (!module) {
                throw new Error(`Nepoznana poslovna domena: ${domain}`);
            }
            
            const result = await module.process(request);
            
            // Shrani projekt
            const projectId = this.createProjectId();
            this.activeProjects.set(projectId, {
                id: projectId,
                domain: domain,
                request: request,
                result: result,
                createdAt: new Date().toISOString(),
                status: 'completed'
            });
            
            return {
                projectId: projectId,
                domain: domain,
                result: result
            };
            
        } catch (error) {
            console.error('❌ Napaka pri procesiranju poslovne zahteve:', error);
            throw error;
        }
    }

    detectDomain(request) {
        const keywords = {
            tourism: ['turizem', 'potovanje', 'hotel', 'kamp', 'izlet', 'destinacija', 'itinerar'],
            finance: ['finance', 'denar', 'investicija', 'proračun', 'cena', 'kalkulacija', 'poslovanje'],
            health: ['zdravje', 'prehrana', 'dieta', 'vadba', 'wellness', 'zdravilo', 'terapija'],
            agriculture: ['kmetijstvo', 'pridelava', 'rastline', 'živali', 'čebelarstvo', 'ekologija'],
            legal: ['pravo', 'zakon', 'HACCP', 'inšpekcija', 'dovoljenje', 'regulative'],
            education: ['učenje', 'izobraževanje', 'tečaj', 'mentorstvo', 'znanje'],
            hospitality: ['gostinstvo', 'restavracija', 'menu', 'recept', 'strežba']
        };
        
        const text = (request.description || request.query || '').toLowerCase();
        
        for (const [domain, domainKeywords] of Object.entries(keywords)) {
            if (domainKeywords.some(keyword => text.includes(keyword))) {
                return domain;
            }
        }
        
        return 'finance'; // privzeto
    }

    createProjectId() {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    getProject(projectId) {
        return this.activeProjects.get(projectId);
    }

    getAllProjects() {
        return Array.from(this.activeProjects.values());
    }

    getModuleCapabilities(domain) {
        const module = this.modules[domain];
        return module ? module.getCapabilities() : null;
    }
}

// Turizem modul
class TourismModule {
    constructor() {
        this.destinations = {
            'slovenija': {
                regions: ['ljubljana', 'bled', 'bohinj', 'koper', 'maribor', 'kranjska-gora'],
                activities: ['pohodništvo', 'kolesarjenje', 'kultura', 'gastronomija', 'wellness'],
                seasons: ['pomlad', 'poletje', 'jesen', 'zima']
            },
            'hrvaška': {
                regions: ['dubrovnik', 'split', 'zagreb', 'pula', 'zadar'],
                activities: ['plaža', 'jadranje', 'zgodovina', 'otoki', 'nacionalni-parki']
            }
        };
    }

    async process(request) {
        const type = this.detectTourismType(request);
        
        switch (type) {
            case 'itinerary':
                return await this.createItinerary(request);
            case 'accommodation':
                return await this.findAccommodation(request);
            case 'activities':
                return await this.suggestActivities(request);
            case 'budget':
                return await this.calculateBudget(request);
            default:
                return await this.createGeneralPlan(request);
        }
    }

    detectTourismType(request) {
        const text = request.description.toLowerCase();
        
        if (text.includes('itinerar') || text.includes('načrt')) return 'itinerary';
        if (text.includes('nastanitev') || text.includes('hotel')) return 'accommodation';
        if (text.includes('aktivnost') || text.includes('početi')) return 'activities';
        if (text.includes('proračun') || text.includes('cena')) return 'budget';
        
        return 'general';
    }

    async createItinerary(request) {
        const destination = request.destination || 'slovenija';
        const duration = request.duration || 3;
        const budget = request.budget || 'srednji';
        
        const itinerary = {
            destination: destination,
            duration: `${duration} dni`,
            budget: budget,
            days: []
        };
        
        // Generiraj dnevni program
        for (let day = 1; day <= duration; day++) {
            itinerary.days.push({
                day: day,
                morning: this.generateActivity('morning', destination),
                afternoon: this.generateActivity('afternoon', destination),
                evening: this.generateActivity('evening', destination),
                accommodation: this.suggestAccommodation(destination, budget),
                meals: this.suggestMeals(destination)
            });
        }
        
        return {
            type: 'tourism-itinerary',
            title: `${duration}-dnevni itinerar za ${destination}`,
            data: itinerary,
            recommendations: this.getDestinationRecommendations(destination),
            estimatedCost: this.calculateItineraryCost(itinerary)
        };
    }

    generateActivity(timeOfDay, destination) {
        const activities = {
            morning: ['obisk muzeja', 'sprehod po starem mestnem jedru', 'ogled gradu', 'pohodništvo'],
            afternoon: ['degustacija lokalnih specialitet', 'ogled naravnih znamenitosti', 'kulturni program'],
            evening: ['večerja v lokalni restavraciji', 'sprehod ob jezeru', 'ogled sončnega zahoda']
        };
        
        const timeActivities = activities[timeOfDay] || activities.morning;
        return timeActivities[Math.floor(Math.random() * timeActivities.length)];
    }

    suggestAccommodation(destination, budget) {
        const accommodations = {
            'nizek': ['hostel', 'gostišče', 'apartma'],
            'srednji': ['hotel 3*', 'penzion', 'apartma'],
            'visok': ['hotel 4*', 'boutique hotel', 'wellness resort']
        };
        
        const options = accommodations[budget] || accommodations['srednji'];
        return options[Math.floor(Math.random() * options.length)];
    }

    suggestMeals(destination) {
        return {
            breakfast: 'lokalni zajtrk',
            lunch: 'tradicionalna kuhinja',
            dinner: 'gourmet večerja'
        };
    }

    getDestinationRecommendations(destination) {
        return [
            'Rezervirajte nastanitev vnaprej',
            'Preverite vremenske razmere',
            'Naučite se nekaj lokalnih besed',
            'Poskusite lokalne specialitete'
        ];
    }

    calculateItineraryCost(itinerary) {
        const baseCostPerDay = 80; // EUR
        const totalCost = itinerary.days.length * baseCostPerDay;
        
        return {
            total: totalCost,
            breakdown: {
                accommodation: Math.round(totalCost * 0.4),
                meals: Math.round(totalCost * 0.3),
                activities: Math.round(totalCost * 0.2),
                transport: Math.round(totalCost * 0.1)
            },
            currency: 'EUR'
        };
    }

    getCapabilities() {
        return [
            'Ustvarjanje itinerarjev',
            'Iskanje nastanitev',
            'Predlaganje aktivnosti',
            'Kalkulacija proračuna',
            'Lokalne priporočila'
        ];
    }
}

// Finance modul
class FinanceModule {
    constructor() {
        this.currencies = ['EUR', 'USD', 'GBP', 'CHF'];
        this.taxRates = {
            'slovenija': { vat: 22, income: 16 },
            'hrvaška': { vat: 25, income: 20 }
        };
    }

    async process(request) {
        const type = this.detectFinanceType(request);
        
        switch (type) {
            case 'budget':
                return await this.createBudget(request);
            case 'investment':
                return await this.analyzeInvestment(request);
            case 'pricing':
                return await this.calculatePricing(request);
            case 'business-plan':
                return await this.createBusinessPlan(request);
            default:
                return await this.generalFinanceAdvice(request);
        }
    }

    detectFinanceType(request) {
        const text = request.description.toLowerCase();
        
        if (text.includes('proračun') || text.includes('budget')) return 'budget';
        if (text.includes('investicija') || text.includes('naložba')) return 'investment';
        if (text.includes('cena') || text.includes('pricing')) return 'pricing';
        if (text.includes('poslovni načrt')) return 'business-plan';
        
        return 'general';
    }

    async createBudget(request) {
        const income = request.income || 2000;
        const expenses = request.expenses || {};
        
        const budget = {
            monthlyIncome: income,
            expenses: {
                housing: expenses.housing || Math.round(income * 0.3),
                food: expenses.food || Math.round(income * 0.15),
                transport: expenses.transport || Math.round(income * 0.1),
                utilities: expenses.utilities || Math.round(income * 0.08),
                entertainment: expenses.entertainment || Math.round(income * 0.05),
                savings: expenses.savings || Math.round(income * 0.2),
                other: expenses.other || Math.round(income * 0.12)
            }
        };
        
        const totalExpenses = Object.values(budget.expenses).reduce((sum, val) => sum + val, 0);
        budget.balance = income - totalExpenses;
        budget.savingsRate = (budget.expenses.savings / income * 100).toFixed(1);
        
        return {
            type: 'personal-budget',
            title: 'Osebni proračun',
            data: budget,
            recommendations: this.getBudgetRecommendations(budget),
            analysis: this.analyzeBudget(budget)
        };
    }

    getBudgetRecommendations(budget) {
        const recommendations = [];
        
        if (budget.savingsRate < 10) {
            recommendations.push('Povečajte delež prihrankov na vsaj 10% dohodka');
        }
        
        if (budget.expenses.housing > budget.monthlyIncome * 0.35) {
            recommendations.push('Stroški stanovanja so previsoki (nad 35% dohodka)');
        }
        
        if (budget.balance < 0) {
            recommendations.push('Zmanjšajte stroške ali povečajte dohodke');
        }
        
        return recommendations;
    }

    analyzeBudget(budget) {
        return {
            healthScore: this.calculateBudgetHealth(budget),
            riskLevel: budget.balance < 0 ? 'visoko' : 'nizko',
            optimizationPotential: this.findOptimizationAreas(budget)
        };
    }

    calculateBudgetHealth(budget) {
        let score = 100;
        
        if (budget.balance < 0) score -= 30;
        if (budget.savingsRate < 10) score -= 20;
        if (budget.expenses.housing > budget.monthlyIncome * 0.35) score -= 15;
        
        return Math.max(0, score);
    }

    findOptimizationAreas(budget) {
        const areas = [];
        
        if (budget.expenses.entertainment > budget.monthlyIncome * 0.1) {
            areas.push('Zmanjšajte stroške zabave');
        }
        
        if (budget.expenses.food > budget.monthlyIncome * 0.2) {
            areas.push('Optimizirajte stroške prehrane');
        }
        
        return areas;
    }

    getCapabilities() {
        return [
            'Ustvarjanje proračunov',
            'Analiza investicij',
            'Kalkulacija cen',
            'Poslovni načrti',
            'Finančno svetovanje'
        ];
    }
}

// Zdravje modul
class HealthModule {
    constructor() {
        this.nutritionDatabase = {
            proteins: ['piščanec', 'ribe', 'jajca', 'stročnice'],
            carbs: ['riž', 'krompir', 'ovseni kosmiči', 'sadje'],
            fats: ['oreščki', 'avokado', 'olivno olje', 'ribe'],
            vitamins: ['zelenjava', 'sadje', 'polnozrnate žitarice']
        };
    }

    async process(request) {
        const type = this.detectHealthType(request);
        
        switch (type) {
            case 'nutrition':
                return await this.createNutritionPlan(request);
            case 'exercise':
                return await this.createExercisePlan(request);
            case 'wellness':
                return await this.createWellnessPlan(request);
            default:
                return await this.generalHealthAdvice(request);
        }
    }

    detectHealthType(request) {
        const text = request.description.toLowerCase();
        
        if (text.includes('prehrana') || text.includes('dieta')) return 'nutrition';
        if (text.includes('vadba') || text.includes('šport')) return 'exercise';
        if (text.includes('wellness') || text.includes('počutje')) return 'wellness';
        
        return 'general';
    }

    async createNutritionPlan(request) {
        const profile = {
            age: request.age || 30,
            weight: request.weight || 70,
            height: request.height || 170,
            activity: request.activity || 'moderate',
            goal: request.goal || 'maintain'
        };
        
        const bmr = this.calculateBMR(profile);
        const dailyCalories = this.calculateDailyCalories(bmr, profile.activity);
        
        const plan = {
            profile: profile,
            dailyCalories: dailyCalories,
            macros: this.calculateMacros(dailyCalories, profile.goal),
            meals: this.generateMealPlan(dailyCalories),
            supplements: this.recommendSupplements(profile)
        };
        
        return {
            type: 'nutrition-plan',
            title: 'Prehranski načrt',
            data: plan,
            recommendations: this.getNutritionRecommendations(profile),
            tips: this.getHealthTips()
        };
    }

    calculateBMR(profile) {
        // Mifflin-St Jeor formula
        const bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
        return Math.round(bmr + (profile.gender === 'male' ? 5 : -161));
    }

    calculateDailyCalories(bmr, activity) {
        const multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very-active': 1.9
        };
        
        return Math.round(bmr * (multipliers[activity] || 1.55));
    }

    calculateMacros(calories, goal) {
        const ratios = {
            'lose': { protein: 0.3, carbs: 0.35, fat: 0.35 },
            'maintain': { protein: 0.25, carbs: 0.45, fat: 0.3 },
            'gain': { protein: 0.25, carbs: 0.5, fat: 0.25 }
        };
        
        const ratio = ratios[goal] || ratios['maintain'];
        
        return {
            protein: Math.round(calories * ratio.protein / 4), // g
            carbs: Math.round(calories * ratio.carbs / 4), // g
            fat: Math.round(calories * ratio.fat / 9) // g
        };
    }

    generateMealPlan(dailyCalories) {
        const mealDistribution = {
            breakfast: 0.25,
            lunch: 0.35,
            dinner: 0.3,
            snacks: 0.1
        };
        
        const meals = {};
        for (const [meal, ratio] of Object.entries(mealDistribution)) {
            meals[meal] = {
                calories: Math.round(dailyCalories * ratio),
                suggestions: this.getMealSuggestions(meal)
            };
        }
        
        return meals;
    }

    getMealSuggestions(mealType) {
        const suggestions = {
            breakfast: ['ovseni kosmiči z sadjem', 'jajčna omleta z zelenjavo', 'jogurt z oreščki'],
            lunch: ['piščančja solata', 'riž z zelenjavo', 'sendvič s tuno'],
            dinner: ['pečena riba z zelenjavo', 'piščanec z rižem', 'testenine z omako'],
            snacks: ['sadje', 'oreščki', 'jogurt']
        };
        
        return suggestions[mealType] || [];
    }

    recommendSupplements(profile) {
        const supplements = ['vitamin D', 'omega-3'];
        
        if (profile.age > 50) supplements.push('vitamin B12');
        if (profile.activity === 'very-active') supplements.push('protein powder');
        
        return supplements;
    }

    getNutritionRecommendations(profile) {
        return [
            'Jejte redno in uravnoteženo',
            'Pijte dovolj vode (2-3 litri dnevno)',
            'Omejite predelano hrano',
            'Vključite veliko zelenjave in sadja'
        ];
    }

    getHealthTips() {
        return [
            'Redno se gibajte',
            'Spite 7-9 ur na noč',
            'Upravljajte stres',
            'Redno se pregledujte pri zdravniku'
        ];
    }

    getCapabilities() {
        return [
            'Prehranski načrti',
            'Vadbeni programi',
            'Wellness svetovanje',
            'Kalkulacija BMI/BMR',
            'Zdravstveni nasveti'
        ];
    }
}

// Kmetijstvo modul
class AgricultureModule {
    constructor() {
        this.crops = {
            'paradižnik': { season: 'pomlad-poletje', soil: 'rahla', water: 'zmerna' },
            'krompir': { season: 'pomlad', soil: 'peščena', water: 'zmerna' },
            'solata': { season: 'pomlad-jesen', soil: 'humozna', water: 'redna' }
        };
        
        this.livestock = {
            'čebele': { housing: 'panj', feed: 'nektar', care: 'sezonska' },
            'kokoši': { housing: 'kokošnjak', feed: 'žito', care: 'dnevna' }
        };
    }

    async process(request) {
        const type = this.detectAgricultureType(request);
        
        switch (type) {
            case 'crop-planning':
                return await this.createCropPlan(request);
            case 'livestock':
                return await this.createLivestockPlan(request);
            case 'beekeeping':
                return await this.createBeekeepingPlan(request);
            default:
                return await this.generalAgricultureAdvice(request);
        }
    }

    detectAgricultureType(request) {
        const text = request.description.toLowerCase();
        
        if (text.includes('pridelava') || text.includes('rastline')) return 'crop-planning';
        if (text.includes('živali') || text.includes('živinoreja')) return 'livestock';
        if (text.includes('čebel') || text.includes('med')) return 'beekeeping';
        
        return 'general';
    }

    async createCropPlan(request) {
        const crop = request.crop || 'paradižnik';
        const area = request.area || 100; // m2
        const season = request.season || 'pomlad';
        
        const cropInfo = this.crops[crop] || this.crops['paradižnik'];
        
        const plan = {
            crop: crop,
            area: area,
            season: season,
            timeline: this.createGrowingTimeline(crop, season),
            requirements: cropInfo,
            expectedYield: this.calculateYield(crop, area),
            costs: this.calculateCosts(crop, area),
            care: this.getCareInstructions(crop)
        };
        
        return {
            type: 'crop-plan',
            title: `Načrt pridelave - ${crop}`,
            data: plan,
            recommendations: this.getCropRecommendations(crop),
            tips: this.getSeasonalTips(season)
        };
    }

    createGrowingTimeline(crop, season) {
        return {
            preparation: 'marec',
            planting: 'april',
            care: 'maj-avgust',
            harvest: 'september',
            storage: 'oktober'
        };
    }

    calculateYield(crop, area) {
        const yields = {
            'paradižnik': 8, // kg/m2
            'krompir': 3,
            'solata': 2
        };
        
        const yieldPerM2 = yields[crop] || 5;
        return Math.round(area * yieldPerM2);
    }

    calculateCosts(crop, area) {
        const costPerM2 = 2; // EUR
        return {
            seeds: Math.round(area * 0.1),
            fertilizer: Math.round(area * 0.3),
            tools: Math.round(area * 0.2),
            water: Math.round(area * 0.1),
            total: Math.round(area * costPerM2)
        };
    }

    getCareInstructions(crop) {
        return [
            'Redno zalivanje',
            'Odstranjevanje plevelov',
            'Gnojenje po potrebi',
            'Zaščita pred škodljivci'
        ];
    }

    getCropRecommendations(crop) {
        return [
            'Izberite kakovostno seme',
            'Pripravite tla vnaprej',
            'Sledite vremenskim razmeram',
            'Vodite dnevnik pridelave'
        ];
    }

    getSeasonalTips(season) {
        const tips = {
            'pomlad': ['Pripravite tla', 'Zaščitite pred pozebo'],
            'poletje': ['Redno zalivajte', 'Zaščitite pred vročino'],
            'jesen': ['Pripravite na zimo', 'Shranite pridelek'],
            'zima': ['Načrtujte naslednjo sezono', 'Vzdržujte orodja']
        };
        
        return tips[season] || tips['pomlad'];
    }

    getCapabilities() {
        return [
            'Načrtovanje pridelave',
            'Živinoreja',
            'Čebelarstvo',
            'Sezonski nasveti',
            'Kalkulacija stroškov'
        ];
    }
}

// Pravo modul
class LegalModule {
    constructor() {
        this.regulations = {
            'HACCP': { type: 'food-safety', requirements: ['analiza', 'kontrolne-točke', 'dokumentacija'] },
            'obrat': { type: 'business', requirements: ['registracija', 'dovoljenja', 'inšpekcija'] }
        };
    }

    async process(request) {
        const type = this.detectLegalType(request);
        
        switch (type) {
            case 'haccp':
                return await this.createHACCPPlan(request);
            case 'business-registration':
                return await this.createRegistrationGuide(request);
            case 'compliance':
                return await this.checkCompliance(request);
            default:
                return await this.generalLegalAdvice(request);
        }
    }

    detectLegalType(request) {
        const text = request.description.toLowerCase();
        
        if (text.includes('haccp')) return 'haccp';
        if (text.includes('registracija') || text.includes('obrat')) return 'business-registration';
        if (text.includes('skladnost') || text.includes('regulative')) return 'compliance';
        
        return 'general';
    }

    async createHACCPPlan(request) {
        const businessType = request.businessType || 'restavracija';
        
        const plan = {
            businessType: businessType,
            hazardAnalysis: this.analyzeHazards(businessType),
            criticalControlPoints: this.identifyCCPs(businessType),
            procedures: this.createProcedures(businessType),
            documentation: this.requiredDocuments(),
            training: this.trainingRequirements()
        };
        
        return {
            type: 'haccp-plan',
            title: 'HACCP načrt',
            data: plan,
            recommendations: this.getHACCPRecommendations(),
            compliance: this.checkHACCPCompliance(plan)
        };
    }

    analyzeHazards(businessType) {
        return {
            biological: ['bakterije', 'virusi', 'paraziti'],
            chemical: ['čistila', 'pesticidi', 'alergeni'],
            physical: ['steklo', 'kovina', 'plastika']
        };
    }

    identifyCCPs(businessType) {
        return [
            'Sprejem surovin',
            'Shranjevanje',
            'Priprava hrane',
            'Kuhanje/segrevanje',
            'Hlajenje',
            'Strežba'
        ];
    }

    createProcedures(businessType) {
        return [
            'Kontrola temperature',
            'Higiena osebja',
            'Čiščenje in razkuževanje',
            'Sledljivost izdelkov',
            'Upravljanje z odpadki'
        ];
    }

    requiredDocuments() {
        return [
            'HACCP načrt',
            'Evidenca temperatur',
            'Evidenca čiščenja',
            'Evidenca usposabljanj',
            'Evidenca dobaviteljev'
        ];
    }

    trainingRequirements() {
        return [
            'Osnove HACCP sistema',
            'Higiena hrane',
            'Osebna higiena',
            'Čiščenje in razkuževanje'
        ];
    }

    getHACCPRecommendations() {
        return [
            'Redno posodabljajte HACCP načrt',
            'Usposobite vse zaposlene',
            'Vodite natančno dokumentacijo',
            'Izvajajte redne notranje preglede'
        ];
    }

    checkHACCPCompliance(plan) {
        return {
            score: 85,
            status: 'skladnost',
            missingItems: [],
            recommendations: ['Dodajte evidenco alergenih']
        };
    }

    getCapabilities() {
        return [
            'HACCP načrti',
            'Registracija obratov',
            'Preverjanje skladnosti',
            'Pravno svetovanje',
            'Dokumentacija'
        ];
    }
}

// Izobraževanje modul
class EducationModule {
    getCapabilities() {
        return [
            'Učni načrti',
            'Mentorstvo',
            'Interaktivni tečaji',
            'Ocenjevanje znanja',
            'Personalizirano učenje'
        ];
    }
}

// Gostinstvo modul
class HospitalityModule {
    getCapabilities() {
        return [
            'Meniji',
            'Recepti',
            'Kalkulacije',
            'Rezervacije',
            'Upravljanje gostov'
        ];
    }
}

// Globalna instanca poslovnih modulov
window.omniBusinessModules = new OmniBusinessModules();

console.log('🏢 OMNI Business Modules naloženi');