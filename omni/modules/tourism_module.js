const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * OMNI Tourism Module - Specializiran modul za turizem
 * 
 * Funkcionalnosti:
 * - Inteligentno načrtovanje itinerarjev
 * - Sistem rezervacij (nastanitve, aktivnosti, transport)
 * - Lokalne priporočila in insider tips
 * - Vremenska integracija
 * - Cenovna optimizacija
 * - Kulturne in gastronomske izkušnje
 * - Trajnostni turizem
 * - Multi-language support
 * - Real-time availability checking
 * - Personalizirane priporočila
 */
class TourismModule extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // API keys (should be in environment variables)
            weatherApiKey: options.weatherApiKey || process.env.WEATHER_API_KEY,
            mapsApiKey: options.mapsApiKey || process.env.MAPS_API_KEY,
            bookingApiKey: options.bookingApiKey || process.env.BOOKING_API_KEY,
            
            // Default settings
            defaultLanguage: options.defaultLanguage || 'sl',
            defaultCurrency: options.defaultCurrency || 'EUR',
            maxItineraryDays: options.maxItineraryDays || 30,
            searchRadius: options.searchRadius || 50, // km
            
            // Preferences
            sustainabilityFocus: options.sustainabilityFocus !== false,
            localExperiencesFocus: options.localExperiencesFocus !== false,
            budgetOptimization: options.budgetOptimization !== false,
            
            ...options
        };
        
        // Data storage
        this.destinations = new Map();
        this.accommodations = new Map();
        this.activities = new Map();
        this.restaurants = new Map();
        this.itineraries = new Map();
        this.bookings = new Map();
        this.userPreferences = new Map();
        
        // Cache
        this.weatherCache = new Map();
        this.priceCache = new Map();
        this.availabilityCache = new Map();
        
        console.log('🏖️ Inicializiram Tourism Module...');
    }
    
    /**
     * Inicializacija turizem modula
     */
    async initialize() {
        try {
            console.log('🌍 Zaganjam Tourism Module...');
            
            // Load destinations data
            await this.loadDestinationsData();
            
            // Load accommodations data
            await this.loadAccommodationsData();
            
            // Load activities data
            await this.loadActivitiesData();
            
            // Load restaurants data
            await this.loadRestaurantsData();
            
            // Setup cache cleanup
            this.setupCacheCleanup();
            
            console.log('✅ Tourism Module uspešno inicializiran');
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Tourism Module:', error);
            throw error;
        }
    }
    
    /**
     * Nalaganje podatkov o destinacijah
     */
    async loadDestinationsData() {
        // Slovenija - glavne destinacije
        const slovenianDestinations = [
            {
                id: 'ljubljana',
                name: 'Ljubljana',
                region: 'Osrednjeslovenska',
                coordinates: { lat: 46.0569, lng: 14.5058 },
                type: 'city',
                highlights: ['Ljubljanski grad', 'Tromostovje', 'Tivoli park', 'Metelkova'],
                bestMonths: [4, 5, 6, 7, 8, 9, 10],
                averageStay: 2,
                budgetLevel: 'medium',
                sustainability: 'high',
                description: 'Čudovita prestolnica Slovenije z bogato kulturno dediščino'
            },
            {
                id: 'bled',
                name: 'Bled',
                region: 'Gorenjska',
                coordinates: { lat: 46.3683, lng: 14.1147 },
                type: 'nature',
                highlights: ['Blejsko jezero', 'Blejski otok', 'Blejski grad', 'Vintgar'],
                bestMonths: [5, 6, 7, 8, 9],
                averageStay: 2,
                budgetLevel: 'high',
                sustainability: 'medium',
                description: 'Alpska perla z romantičnim jezerom in gradom na skali'
            },
            {
                id: 'piran',
                name: 'Piran',
                region: 'Primorska',
                coordinates: { lat: 45.5285, lng: 13.5683 },
                type: 'coastal',
                highlights: ['Tartinijev trg', 'Piranske soline', 'Mestne obzidje', 'Akvarij'],
                bestMonths: [4, 5, 6, 7, 8, 9, 10],
                averageStay: 2,
                budgetLevel: 'medium',
                sustainability: 'high',
                description: 'Beneška arhitektura ob Jadranskem morju'
            },
            {
                id: 'bohinj',
                name: 'Bohinj',
                region: 'Gorenjska',
                coordinates: { lat: 46.2833, lng: 13.8833 },
                type: 'nature',
                highlights: ['Bohinjsko jezero', 'Savica', 'Vogel', 'Mostnica'],
                bestMonths: [6, 7, 8, 9],
                averageStay: 3,
                budgetLevel: 'medium',
                sustainability: 'high',
                description: 'Naravni raj v srcu Julijskih Alp'
            },
            {
                id: 'kranjska_gora',
                name: 'Kranjska Gora',
                region: 'Gorenjska',
                coordinates: { lat: 46.4833, lng: 13.7833 },
                type: 'mountain',
                highlights: ['Triglav', 'Zelenci', 'Planica', 'Vršič'],
                bestMonths: [6, 7, 8, 9, 12, 1, 2],
                averageStay: 3,
                budgetLevel: 'high',
                sustainability: 'medium',
                description: 'Alpsko smučarsko in pohodniško središče'
            },
            {
                id: 'postojna',
                name: 'Postojna',
                region: 'Notranjska',
                coordinates: { lat: 45.7747, lng: 14.2142 },
                type: 'cave',
                highlights: ['Postojnska jama', 'Predjamski grad', 'Rakov Škocjan'],
                bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                averageStay: 1,
                budgetLevel: 'medium',
                sustainability: 'medium',
                description: 'Podzemni svet kraških jam'
            },
            {
                id: 'maribor',
                name: 'Maribor',
                region: 'Podravska',
                coordinates: { lat: 46.5547, lng: 15.6467 },
                type: 'city',
                highlights: ['Stara trta', 'Mariborski grad', 'Pohorje', 'Lent'],
                bestMonths: [4, 5, 6, 7, 8, 9, 10],
                averageStay: 2,
                budgetLevel: 'low',
                sustainability: 'high',
                description: 'Mesto vina in kulture ob Dravi'
            },
            {
                id: 'portoroz',
                name: 'Portorož',
                region: 'Primorska',
                coordinates: { lat: 45.5133, lng: 13.5950 },
                type: 'coastal',
                highlights: ['Plaže', 'Terme', 'Casino', 'Marina'],
                bestMonths: [5, 6, 7, 8, 9],
                averageStay: 3,
                budgetLevel: 'high',
                sustainability: 'low',
                description: 'Luksuzno morsko letovišče'
            }
        ];
        
        for (const destination of slovenianDestinations) {
            this.destinations.set(destination.id, destination);
        }
        
        console.log(`📍 Naloženih ${slovenianDestinations.length} destinacij`);
    }
    
    /**
     * Nalaganje podatkov o nastanitvah
     */
    async loadAccommodationsData() {
        const accommodations = [
            {
                id: 'hotel_cubo_ljubljana',
                name: 'Hotel Cubo',
                destinationId: 'ljubljana',
                type: 'hotel',
                category: 4,
                coordinates: { lat: 46.0569, lng: 14.5058 },
                priceRange: { min: 80, max: 150, currency: 'EUR' },
                amenities: ['wifi', 'parking', 'restaurant', 'fitness', 'spa'],
                sustainability: 'high',
                rating: 4.3,
                description: 'Moderni boutique hotel v centru Ljubljane'
            },
            {
                id: 'grand_hotel_toplice_bled',
                name: 'Grand Hotel Toplice',
                destinationId: 'bled',
                type: 'hotel',
                category: 5,
                coordinates: { lat: 46.3683, lng: 14.1147 },
                priceRange: { min: 200, max: 400, currency: 'EUR' },
                amenities: ['wifi', 'spa', 'restaurant', 'lake_view', 'thermal_pool'],
                sustainability: 'medium',
                rating: 4.6,
                description: 'Luksuzni hotel ob Blejskem jezeru'
            },
            {
                id: 'hostel_celica_ljubljana',
                name: 'Hostel Celica',
                destinationId: 'ljubljana',
                type: 'hostel',
                category: 3,
                coordinates: { lat: 46.0569, lng: 14.5058 },
                priceRange: { min: 25, max: 60, currency: 'EUR' },
                amenities: ['wifi', 'kitchen', 'bar', 'art_gallery'],
                sustainability: 'high',
                rating: 4.1,
                description: 'Unikaten hostel v nekdanjem zaporu'
            },
            {
                id: 'apartments_piran',
                name: 'Piran Apartments',
                destinationId: 'piran',
                type: 'apartment',
                category: 3,
                coordinates: { lat: 45.5285, lng: 13.5683 },
                priceRange: { min: 60, max: 120, currency: 'EUR' },
                amenities: ['wifi', 'kitchen', 'sea_view', 'air_conditioning'],
                sustainability: 'medium',
                rating: 4.2,
                description: 'Apartmaji z razgledom na morje'
            }
        ];
        
        for (const accommodation of accommodations) {
            this.accommodations.set(accommodation.id, accommodation);
        }
        
        console.log(`🏨 Naloženih ${accommodations.length} nastanitev`);
    }
    
    /**
     * Nalaganje podatkov o aktivnostih
     */
    async loadActivitiesData() {
        const activities = [
            {
                id: 'ljubljana_walking_tour',
                name: 'Vodeni sprehod po Ljubljani',
                destinationId: 'ljubljana',
                type: 'tour',
                duration: 2,
                priceRange: { min: 15, max: 25, currency: 'EUR' },
                difficulty: 'easy',
                groupSize: { min: 1, max: 20 },
                languages: ['sl', 'en', 'de', 'it'],
                sustainability: 'high',
                rating: 4.5,
                description: 'Odkrijte skrivnosti Ljubljane z lokalnim vodnikom'
            },
            {
                id: 'bled_rowing',
                name: 'Veslanje na Blejskem jezeru',
                destinationId: 'bled',
                type: 'water_sport',
                duration: 1,
                priceRange: { min: 20, max: 30, currency: 'EUR' },
                difficulty: 'easy',
                groupSize: { min: 1, max: 4 },
                sustainability: 'high',
                rating: 4.7,
                description: 'Romantično veslanje do Blejskega otoka'
            },
            {
                id: 'triglav_hiking',
                name: 'Vzpon na Triglav',
                destinationId: 'kranjska_gora',
                type: 'hiking',
                duration: 12,
                priceRange: { min: 50, max: 100, currency: 'EUR' },
                difficulty: 'hard',
                groupSize: { min: 2, max: 8 },
                sustainability: 'high',
                rating: 4.9,
                description: 'Vzpon na najvišji vrh Slovenije z izkušenim vodnikom'
            },
            {
                id: 'wine_tasting_maribor',
                name: 'Degustacija vin v Mariboru',
                destinationId: 'maribor',
                type: 'food_wine',
                duration: 3,
                priceRange: { min: 30, max: 50, currency: 'EUR' },
                difficulty: 'easy',
                groupSize: { min: 2, max: 12 },
                sustainability: 'medium',
                rating: 4.4,
                description: 'Okušanje lokalnih vin ob najstarejši trti na svetu'
            },
            {
                id: 'postojna_cave_tour',
                name: 'Obisk Postojnske jame',
                destinationId: 'postojna',
                type: 'sightseeing',
                duration: 2,
                priceRange: { min: 25, max: 35, currency: 'EUR' },
                difficulty: 'easy',
                groupSize: { min: 1, max: 50 },
                sustainability: 'medium',
                rating: 4.6,
                description: 'Raziskovanje podzemnega sveta s posebnim vlakom'
            }
        ];
        
        for (const activity of activities) {
            this.activities.set(activity.id, activity);
        }
        
        console.log(`🎯 Naloženih ${activities.length} aktivnosti`);
    }
    
    /**
     * Nalaganje podatkov o restavracijah
     */
    async loadRestaurantsData() {
        const restaurants = [
            {
                id: 'odprta_kuhinja_ljubljana',
                name: 'Odprta kuhinja',
                destinationId: 'ljubljana',
                type: 'street_food',
                cuisine: 'international',
                priceRange: { min: 5, max: 15, currency: 'EUR' },
                rating: 4.5,
                sustainability: 'high',
                localSpecialty: true,
                description: 'Sezonski street food market z lokalnimi dobrotami'
            },
            {
                id: 'gostilna_as_ljubljana',
                name: 'Gostilna As',
                destinationId: 'ljubljana',
                type: 'fine_dining',
                cuisine: 'slovenian',
                priceRange: { min: 40, max: 80, currency: 'EUR' },
                rating: 4.7,
                sustainability: 'high',
                localSpecialty: true,
                description: 'Vrhunska slovenska kuhinja z moderno interpretacijo'
            },
            {
                id: 'gostilna_lectar_bled',
                name: 'Gostilna Lectar',
                destinationId: 'bled',
                type: 'traditional',
                cuisine: 'slovenian',
                priceRange: { min: 20, max: 40, currency: 'EUR' },
                rating: 4.3,
                sustainability: 'medium',
                localSpecialty: true,
                description: 'Tradicionalna gostilna z domačimi jedmi in medenjaki'
            },
            {
                id: 'pri_mari_piran',
                name: 'Pri Mari',
                destinationId: 'piran',
                type: 'seafood',
                cuisine: 'mediterranean',
                priceRange: { min: 25, max: 50, currency: 'EUR' },
                rating: 4.4,
                sustainability: 'medium',
                localSpecialty: true,
                description: 'Sveže morske dobrote z razgledom na morje'
            }
        ];
        
        for (const restaurant of restaurants) {
            this.restaurants.set(restaurant.id, restaurant);
        }
        
        console.log(`🍽️ Naloženih ${restaurants.length} restavracij`);
    }
    
    /**
     * Generiranje personaliziranega itinerarija
     */
    async generateItinerary(preferences) {
        try {
            console.log('📋 Generiram personaliziran itinerarij...');
            
            const {
                destinations: preferredDestinations,
                duration,
                budget,
                interests,
                travelStyle,
                groupSize = 2,
                language = 'sl',
                startDate,
                sustainability = 'medium'
            } = preferences;
            
            // Validate input
            if (!preferredDestinations || !duration || !budget) {
                throw new Error('Manjkajo obvezni parametri: destinations, duration, budget');
            }
            
            if (duration > this.config.maxItineraryDays) {
                throw new Error(`Maksimalno trajanje itinerarija je ${this.config.maxItineraryDays} dni`);
            }
            
            // Get weather forecast if start date provided
            let weatherData = null;
            if (startDate) {
                weatherData = await this.getWeatherForecast(preferredDestinations, startDate, duration);
            }
            
            // Generate itinerary
            const itinerary = {
                id: `itinerary_${Date.now()}`,
                preferences,
                weatherData,
                days: [],
                totalBudget: { estimated: 0, breakdown: {} },
                recommendations: [],
                sustainabilityScore: 0,
                createdAt: new Date().toISOString()
            };
            
            // Plan each day
            let currentBudget = budget;
            let sustainabilityPoints = 0;
            
            for (let day = 1; day <= duration; day++) {
                const dayPlan = await this.planDay({
                    day,
                    destinations: preferredDestinations,
                    interests,
                    travelStyle,
                    budget: currentBudget / (duration - day + 1), // Distribute remaining budget
                    groupSize,
                    sustainability,
                    weatherData: weatherData?.[day - 1]
                });
                
                itinerary.days.push(dayPlan);
                currentBudget -= dayPlan.estimatedCost;
                sustainabilityPoints += dayPlan.sustainabilityScore || 0;
            }
            
            // Calculate totals
            itinerary.totalBudget.estimated = itinerary.days.reduce((sum, day) => sum + day.estimatedCost, 0);
            itinerary.sustainabilityScore = sustainabilityPoints / duration;
            
            // Generate recommendations
            itinerary.recommendations = await this.generateRecommendations(itinerary, preferences);
            
            // Store itinerary
            this.itineraries.set(itinerary.id, itinerary);
            
            console.log(`✅ Itinerarij ${itinerary.id} uspešno generiran`);
            this.emit('itineraryGenerated', itinerary);
            
            return itinerary;
            
        } catch (error) {
            console.error('❌ Napaka pri generiranju itinerarija:', error);
            throw error;
        }
    }
    
    /**
     * Načrtovanje posameznega dne
     */
    async planDay(options) {
        const {
            day,
            destinations,
            interests,
            travelStyle,
            budget,
            groupSize,
            sustainability,
            weatherData
        } = options;
        
        // Select primary destination for the day
        const primaryDestination = destinations[Math.min(day - 1, destinations.length - 1)];
        const destinationData = this.destinations.get(primaryDestination);
        
        if (!destinationData) {
            throw new Error(`Destinacija ${primaryDestination} ni najdena`);
        }
        
        const dayPlan = {
            day,
            destination: primaryDestination,
            destinationData,
            weather: weatherData,
            activities: [],
            accommodation: null,
            restaurants: [],
            transport: [],
            estimatedCost: 0,
            sustainabilityScore: 0,
            notes: []
        };
        
        // Find accommodation
        if (day === 1 || destinations[day - 1] !== destinations[day - 2]) {
            dayPlan.accommodation = await this.findAccommodation({
                destinationId: primaryDestination,
                budget: budget * 0.4, // 40% of daily budget for accommodation
                groupSize,
                sustainability,
                travelStyle
            });
            
            if (dayPlan.accommodation) {
                dayPlan.estimatedCost += dayPlan.accommodation.estimatedPrice;
                dayPlan.sustainabilityScore += this.getSustainabilityScore(dayPlan.accommodation.sustainability);
            }
        }
        
        // Find activities based on interests and weather
        const availableActivities = Array.from(this.activities.values())
            .filter(activity => activity.destinationId === primaryDestination);
        
        const selectedActivities = await this.selectActivities({
            activities: availableActivities,
            interests,
            budget: budget * 0.3, // 30% for activities
            weather: weatherData,
            groupSize,
            sustainability
        });
        
        dayPlan.activities = selectedActivities;
        dayPlan.estimatedCost += selectedActivities.reduce((sum, activity) => sum + activity.estimatedPrice, 0);
        dayPlan.sustainabilityScore += selectedActivities.reduce((sum, activity) => 
            sum + this.getSustainabilityScore(activity.sustainability), 0) / selectedActivities.length;
        
        // Find restaurants
        const availableRestaurants = Array.from(this.restaurants.values())
            .filter(restaurant => restaurant.destinationId === primaryDestination);
        
        const selectedRestaurants = await this.selectRestaurants({
            restaurants: availableRestaurants,
            budget: budget * 0.25, // 25% for food
            groupSize,
            sustainability,
            localSpecialty: true
        });
        
        dayPlan.restaurants = selectedRestaurants;
        dayPlan.estimatedCost += selectedRestaurants.reduce((sum, restaurant) => sum + restaurant.estimatedPrice, 0);
        dayPlan.sustainabilityScore += selectedRestaurants.reduce((sum, restaurant) => 
            sum + this.getSustainabilityScore(restaurant.sustainability), 0) / selectedRestaurants.length;
        
        // Add transport if needed
        if (day > 1 && destinations[day - 1] !== destinations[day - 2]) {
            const transport = await this.planTransport({
                from: destinations[day - 2],
                to: primaryDestination,
                budget: budget * 0.05, // 5% for transport
                groupSize,
                sustainability
            });
            
            if (transport) {
                dayPlan.transport.push(transport);
                dayPlan.estimatedCost += transport.estimatedPrice;
                dayPlan.sustainabilityScore += this.getSustainabilityScore(transport.sustainability);
            }
        }
        
        // Add weather-based notes
        if (weatherData) {
            dayPlan.notes.push(...this.generateWeatherNotes(weatherData));
        }
        
        // Add local tips
        dayPlan.notes.push(...this.generateLocalTips(destinationData));
        
        return dayPlan;
    }
    
    /**
     * Iskanje nastanitve
     */
    async findAccommodation(options) {
        const { destinationId, budget, groupSize, sustainability, travelStyle } = options;
        
        const availableAccommodations = Array.from(this.accommodations.values())
            .filter(acc => acc.destinationId === destinationId)
            .filter(acc => acc.priceRange.min <= budget)
            .sort((a, b) => {
                // Score based on sustainability, rating, and price
                const scoreA = this.getSustainabilityScore(a.sustainability) * 0.3 + 
                              a.rating * 0.4 + 
                              (budget - a.priceRange.min) / budget * 0.3;
                const scoreB = this.getSustainabilityScore(b.sustainability) * 0.3 + 
                              b.rating * 0.4 + 
                              (budget - b.priceRange.min) / budget * 0.3;
                return scoreB - scoreA;
            });
        
        if (availableAccommodations.length === 0) {
            return null;
        }
        
        const selected = availableAccommodations[0];
        return {
            ...selected,
            estimatedPrice: Math.min(selected.priceRange.max, budget),
            bookingUrl: `#booking/${selected.id}`,
            notes: this.generateAccommodationNotes(selected, groupSize)
        };
    }
    
    /**
     * Izbira aktivnosti
     */
    async selectActivities(options) {
        const { activities, interests, budget, weather, groupSize, sustainability } = options;
        
        let availableActivities = activities.filter(activity => {
            // Filter by weather if provided
            if (weather && weather.condition === 'rain' && activity.type === 'outdoor') {
                return false;
            }
            
            // Filter by group size
            if (activity.groupSize && 
                (groupSize < activity.groupSize.min || groupSize > activity.groupSize.max)) {
                return false;
            }
            
            return activity.priceRange.min <= budget;
        });
        
        // Score activities based on interests and other factors
        availableActivities = availableActivities.map(activity => ({
            ...activity,
            score: this.calculateActivityScore(activity, interests, sustainability, weather)
        })).sort((a, b) => b.score - a.score);
        
        // Select top activities within budget
        const selected = [];
        let remainingBudget = budget;
        
        for (const activity of availableActivities) {
            if (activity.priceRange.min <= remainingBudget && selected.length < 3) {
                const estimatedPrice = Math.min(activity.priceRange.max, remainingBudget * 0.7);
                selected.push({
                    ...activity,
                    estimatedPrice,
                    bookingUrl: `#booking/${activity.id}`,
                    notes: this.generateActivityNotes(activity, weather)
                });
                remainingBudget -= estimatedPrice;
            }
        }
        
        return selected;
    }
    
    /**
     * Izbira restavracij
     */
    async selectRestaurants(options) {
        const { restaurants, budget, groupSize, sustainability, localSpecialty } = options;
        
        let availableRestaurants = restaurants.filter(restaurant => {
            if (localSpecialty && !restaurant.localSpecialty) return false;
            return restaurant.priceRange.min <= budget;
        });
        
        // Score restaurants
        availableRestaurants = availableRestaurants.map(restaurant => ({
            ...restaurant,
            score: restaurant.rating * 0.4 + 
                   this.getSustainabilityScore(restaurant.sustainability) * 0.3 +
                   (restaurant.localSpecialty ? 0.3 : 0)
        })).sort((a, b) => b.score - a.score);
        
        // Select restaurants for different meals
        const selected = [];
        const mealTypes = ['lunch', 'dinner'];
        let remainingBudget = budget;
        
        for (let i = 0; i < Math.min(mealTypes.length, availableRestaurants.length); i++) {
            const restaurant = availableRestaurants[i];
            const estimatedPrice = Math.min(restaurant.priceRange.max * groupSize, remainingBudget / (mealTypes.length - i));
            
            selected.push({
                ...restaurant,
                mealType: mealTypes[i],
                estimatedPrice,
                reservationUrl: `#reservation/${restaurant.id}`,
                notes: this.generateRestaurantNotes(restaurant)
            });
            
            remainingBudget -= estimatedPrice;
        }
        
        return selected;
    }
    
    /**
     * Načrtovanje transporta
     */
    async planTransport(options) {
        const { from, to, budget, groupSize, sustainability } = options;
        
        const fromDestination = this.destinations.get(from);
        const toDestination = this.destinations.get(to);
        
        if (!fromDestination || !toDestination) {
            return null;
        }
        
        // Calculate distance (simplified)
        const distance = this.calculateDistance(
            fromDestination.coordinates,
            toDestination.coordinates
        );
        
        // Transport options
        const transportOptions = [
            {
                type: 'car',
                estimatedPrice: distance * 0.15 * groupSize, // €0.15 per km per person
                duration: distance / 80, // 80 km/h average
                sustainability: 'low',
                description: 'Avtomobil (najemni ali lastni)'
            },
            {
                type: 'bus',
                estimatedPrice: distance * 0.08 * groupSize, // €0.08 per km per person
                duration: distance / 60, // 60 km/h average
                sustainability: 'medium',
                description: 'Javni avtobusni prevoz'
            },
            {
                type: 'train',
                estimatedPrice: distance * 0.10 * groupSize, // €0.10 per km per person
                duration: distance / 100, // 100 km/h average
                sustainability: 'high',
                description: 'Železniški prevoz'
            }
        ];
        
        // Filter by budget and score by sustainability
        const availableOptions = transportOptions
            .filter(option => option.estimatedPrice <= budget)
            .map(option => ({
                ...option,
                score: this.getSustainabilityScore(option.sustainability) * 0.6 + 
                       (budget - option.estimatedPrice) / budget * 0.4
            }))
            .sort((a, b) => b.score - a.score);
        
        if (availableOptions.length === 0) {
            return null;
        }
        
        const selected = availableOptions[0];
        return {
            ...selected,
            from: fromDestination.name,
            to: toDestination.name,
            distance: Math.round(distance),
            bookingUrl: `#transport/${selected.type}/${from}/${to}`
        };
    }
    
    /**
     * Pridobitev vremenske napovedi
     */
    async getWeatherForecast(destinations, startDate, duration) {
        // Check cache first
        const cacheKey = `weather_${destinations.join('_')}_${startDate}_${duration}`;
        if (this.weatherCache.has(cacheKey)) {
            const cached = this.weatherCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
                return cached.data;
            }
        }
        
        // Simulate weather data (in production, use real weather API)
        const weatherData = [];
        const startDateObj = new Date(startDate);
        
        for (let i = 0; i < duration; i++) {
            const date = new Date(startDateObj);
            date.setDate(date.getDate() + i);
            
            // Simulate weather based on season and location
            const month = date.getMonth() + 1;
            const isWinter = month >= 11 || month <= 3;
            const isSummer = month >= 6 && month <= 8;
            
            weatherData.push({
                date: date.toISOString().split('T')[0],
                temperature: {
                    min: isWinter ? Math.random() * 10 - 5 : isSummer ? Math.random() * 15 + 15 : Math.random() * 20 + 5,
                    max: isWinter ? Math.random() * 15 + 5 : isSummer ? Math.random() * 15 + 25 : Math.random() * 20 + 15
                },
                condition: Math.random() > 0.7 ? 'rain' : Math.random() > 0.3 ? 'sunny' : 'cloudy',
                precipitation: Math.random() > 0.7 ? Math.random() * 10 : 0,
                wind: Math.random() * 20,
                humidity: Math.random() * 40 + 40
            });
        }
        
        // Cache the result
        this.weatherCache.set(cacheKey, {
            data: weatherData,
            timestamp: Date.now()
        });
        
        return weatherData;
    }
    
    /**
     * Generiranje priporočil
     */
    async generateRecommendations(itinerary, preferences) {
        const recommendations = [];
        
        // Budget optimization recommendations
        if (itinerary.totalBudget.estimated > preferences.budget * 0.9) {
            recommendations.push({
                type: 'budget',
                priority: 'high',
                title: 'Optimizacija proračuna',
                description: 'Predlagamo izbiro cenejših nastanitev ali aktivnosti za zmanjšanje stroškov.',
                savings: itinerary.totalBudget.estimated - preferences.budget
            });
        }
        
        // Sustainability recommendations
        if (preferences.sustainability === 'high' && itinerary.sustainabilityScore < 0.7) {
            recommendations.push({
                type: 'sustainability',
                priority: 'medium',
                title: 'Trajnostne izboljšave',
                description: 'Predlagamo uporabo javnega prevoza in izbiro eco-friendly nastanitev.',
                impact: 'Zmanjšanje ogljičnega odtisa za 30%'
            });
        }
        
        // Weather-based recommendations
        const rainyDays = itinerary.days.filter(day => day.weather?.condition === 'rain').length;
        if (rainyDays > itinerary.days.length * 0.3) {
            recommendations.push({
                type: 'weather',
                priority: 'medium',
                title: 'Prilagoditev vremenu',
                description: 'Predlagamo več notranjih aktivnosti zaradi napovedane padavin.',
                alternatives: ['Muzeji', 'Galerije', 'Wellness centri', 'Nakupovalni centri']
            });
        }
        
        // Local experience recommendations
        const localActivities = itinerary.days.flatMap(day => day.activities)
            .filter(activity => activity.localSpecialty).length;
        
        if (localActivities < itinerary.days.length * 0.5) {
            recommendations.push({
                type: 'experience',
                priority: 'low',
                title: 'Lokalne izkušnje',
                description: 'Dodajte več lokalnih aktivnosti za pristnejšo izkušnjo Slovenije.',
                suggestions: ['Degustacije lokalnih vin', 'Obisk lokalnih tržnic', 'Tradicionalni festivali']
            });
        }
        
        return recommendations;
    }
    
    /**
     * Rezervacija storitev
     */
    async makeBooking(bookingData) {
        try {
            const {
                type, // 'accommodation', 'activity', 'restaurant', 'transport'
                serviceId,
                userId,
                dates,
                groupSize,
                specialRequests = [],
                contactInfo
            } = bookingData;
            
            // Validate booking data
            if (!type || !serviceId || !userId || !dates || !groupSize) {
                throw new Error('Manjkajo obvezni podatki za rezervacijo');
            }
            
            // Check availability (simplified)
            const isAvailable = await this.checkAvailability(type, serviceId, dates, groupSize);
            if (!isAvailable) {
                throw new Error('Storitev ni na voljo za izbrane datume');
            }
            
            // Create booking
            const booking = {
                id: `booking_${Date.now()}`,
                type,
                serviceId,
                userId,
                dates,
                groupSize,
                specialRequests,
                contactInfo,
                status: 'pending',
                totalPrice: await this.calculateBookingPrice(type, serviceId, dates, groupSize),
                createdAt: new Date().toISOString(),
                confirmationCode: this.generateConfirmationCode()
            };
            
            // Store booking
            this.bookings.set(booking.id, booking);
            
            // Send confirmation (simulate)
            await this.sendBookingConfirmation(booking);
            
            console.log(`✅ Rezervacija ${booking.id} uspešno ustvarjena`);
            this.emit('bookingCreated', booking);
            
            return booking;
            
        } catch (error) {
            console.error('❌ Napaka pri rezervaciji:', error);
            throw error;
        }
    }
    
    /**
     * Preverjanje razpoložljivosti
     */
    async checkAvailability(type, serviceId, dates, groupSize) {
        // Simulate availability check
        // In production, this would check real availability APIs
        
        const availabilityKey = `${type}_${serviceId}_${dates.start}_${dates.end}`;
        
        if (this.availabilityCache.has(availabilityKey)) {
            const cached = this.availabilityCache.get(availabilityKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return cached.available;
            }
        }
        
        // Simulate availability (90% chance of being available)
        const available = Math.random() > 0.1;
        
        this.availabilityCache.set(availabilityKey, {
            available,
            timestamp: Date.now()
        });
        
        return available;
    }
    
    /**
     * Izračun cene rezervacije
     */
    async calculateBookingPrice(type, serviceId, dates, groupSize) {
        let service;
        
        switch (type) {
            case 'accommodation':
                service = this.accommodations.get(serviceId);
                break;
            case 'activity':
                service = this.activities.get(serviceId);
                break;
            case 'restaurant':
                service = this.restaurants.get(serviceId);
                break;
            default:
                throw new Error(`Nepoznan tip storitve: ${type}`);
        }
        
        if (!service) {
            throw new Error(`Storitev ${serviceId} ni najdena`);
        }
        
        const startDate = new Date(dates.start);
        const endDate = new Date(dates.end);
        const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        let basePrice = service.priceRange.min;
        
        if (type === 'accommodation') {
            return basePrice * nights * groupSize;
        } else if (type === 'activity') {
            return basePrice * groupSize;
        } else if (type === 'restaurant') {
            return basePrice * groupSize;
        }
        
        return basePrice;
    }
    
    /**
     * Pošiljanje potrditve rezervacije
     */
    async sendBookingConfirmation(booking) {
        // Simulate sending confirmation email/SMS
        console.log(`📧 Pošiljam potrditev rezervacije na ${booking.contactInfo.email}`);
        
        // In production, integrate with email service
        return true;
    }
    
    /**
     * Generiranje kode za potrditev
     */
    generateConfirmationCode() {
        return Math.random().toString(36).substr(2, 9).toUpperCase();
    }
    
    /**
     * Pridobitev uporabniških preferenc
     */
    getUserPreferences(userId) {
        return this.userPreferences.get(userId) || {
            language: this.config.defaultLanguage,
            currency: this.config.defaultCurrency,
            sustainability: 'medium',
            budgetLevel: 'medium',
            interests: [],
            travelStyle: 'balanced'
        };
    }
    
    /**
     * Posodobitev uporabniških preferenc
     */
    updateUserPreferences(userId, preferences) {
        const existing = this.getUserPreferences(userId);
        const updated = { ...existing, ...preferences };
        this.userPreferences.set(userId, updated);
        
        console.log(`👤 Posodobljene preference za uporabnika ${userId}`);
        this.emit('preferencesUpdated', { userId, preferences: updated });
        
        return updated;
    }
    
    /**
     * Iskanje destinacij
     */
    searchDestinations(query, filters = {}) {
        const results = Array.from(this.destinations.values())
            .filter(destination => {
                // Text search
                if (query) {
                    const searchText = query.toLowerCase();
                    if (!destination.name.toLowerCase().includes(searchText) &&
                        !destination.region.toLowerCase().includes(searchText) &&
                        !destination.description.toLowerCase().includes(searchText)) {
                        return false;
                    }
                }
                
                // Type filter
                if (filters.type && destination.type !== filters.type) {
                    return false;
                }
                
                // Budget filter
                if (filters.budgetLevel && destination.budgetLevel !== filters.budgetLevel) {
                    return false;
                }
                
                // Sustainability filter
                if (filters.sustainability && destination.sustainability !== filters.sustainability) {
                    return false;
                }
                
                return true;
            })
            .map(destination => ({
                ...destination,
                score: this.calculateDestinationScore(destination, query, filters)
            }))
            .sort((a, b) => b.score - a.score);
        
        return results;
    }
    
    /**
     * Pridobitev podrobnosti destinacije
     */
    getDestinationDetails(destinationId) {
        const destination = this.destinations.get(destinationId);
        if (!destination) {
            return null;
        }
        
        // Get related services
        const accommodations = Array.from(this.accommodations.values())
            .filter(acc => acc.destinationId === destinationId);
        
        const activities = Array.from(this.activities.values())
            .filter(act => act.destinationId === destinationId);
        
        const restaurants = Array.from(this.restaurants.values())
            .filter(rest => rest.destinationId === destinationId);
        
        return {
            ...destination,
            accommodations,
            activities,
            restaurants,
            stats: {
                totalAccommodations: accommodations.length,
                totalActivities: activities.length,
                totalRestaurants: restaurants.length,
                averageRating: this.calculateAverageRating([...accommodations, ...activities, ...restaurants])
            }
        };
    }
    
    /**
     * Pomožne funkcije
     */
    
    getSustainabilityScore(level) {
        const scores = { low: 0.3, medium: 0.6, high: 1.0 };
        return scores[level] || 0.5;
    }
    
    calculateDistance(coord1, coord2) {
        const R = 6371; // Earth's radius in km
        const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
        const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    calculateActivityScore(activity, interests, sustainability, weather) {
        let score = activity.rating * 0.4;
        
        // Interest matching
        if (interests && interests.includes(activity.type)) {
            score += 0.3;
        }
        
        // Sustainability
        score += this.getSustainabilityScore(activity.sustainability) * 0.2;
        
        // Weather appropriateness
        if (weather) {
            if (weather.condition === 'rain' && activity.type === 'indoor') {
                score += 0.1;
            } else if (weather.condition === 'sunny' && activity.type === 'outdoor') {
                score += 0.1;
            }
        }
        
        return score;
    }
    
    calculateDestinationScore(destination, query, filters) {
        let score = 0;
        
        // Text relevance
        if (query) {
            const searchText = query.toLowerCase();
            if (destination.name.toLowerCase().includes(searchText)) score += 0.5;
            if (destination.description.toLowerCase().includes(searchText)) score += 0.3;
        }
        
        // Filter matching
        if (filters.type && destination.type === filters.type) score += 0.2;
        if (filters.sustainability && destination.sustainability === filters.sustainability) score += 0.2;
        
        return score;
    }
    
    calculateAverageRating(services) {
        if (services.length === 0) return 0;
        const total = services.reduce((sum, service) => sum + (service.rating || 0), 0);
        return total / services.length;
    }
    
    generateWeatherNotes(weather) {
        const notes = [];
        
        if (weather.condition === 'rain') {
            notes.push('🌧️ Napovedane so padavine - priporočamo dežnik in vodoodporna oblačila');
        }
        
        if (weather.temperature.max > 25) {
            notes.push('☀️ Vroč dan - ne pozabite na sončno kremo in dovolj vode');
        }
        
        if (weather.temperature.min < 5) {
            notes.push('🧥 Hladno jutro - oblecite se toplo');
        }
        
        if (weather.wind > 15) {
            notes.push('💨 Močan veter - pazite pri aktivnostih na prostem');
        }
        
        return notes;
    }
    
    generateLocalTips(destination) {
        const tips = [
            `💡 Najboljši čas za obisk ${destination.name} je ${this.getBestMonthsText(destination.bestMonths)}`,
            `📍 ${destination.name} je znana po: ${destination.highlights.slice(0, 3).join(', ')}`,
            `⏰ Priporočeno trajanje obiska: ${destination.averageStay} dni`
        ];
        
        return tips;
    }
    
    generateAccommodationNotes(accommodation, groupSize) {
        const notes = [];
        
        if (accommodation.amenities.includes('wifi')) {
            notes.push('📶 Brezplačen WiFi');
        }
        
        if (accommodation.amenities.includes('parking')) {
            notes.push('🚗 Brezplačno parkiranje');
        }
        
        if (accommodation.sustainability === 'high') {
            notes.push('🌱 Eco-friendly nastanitev');
        }
        
        if (groupSize > 4 && accommodation.type === 'apartment') {
            notes.push('👨‍👩‍👧‍👦 Primerno za večje skupine');
        }
        
        return notes;
    }
    
    generateActivityNotes(activity, weather) {
        const notes = [];
        
        if (activity.difficulty === 'hard') {
            notes.push('⚠️ Zahtevna aktivnost - potrebna je dobra fizična pripravljenost');
        }
        
        if (weather && weather.condition === 'rain' && activity.type === 'outdoor') {
            notes.push('🌧️ Preverite vremenske razmere pred odhodom');
        }
        
        if (activity.languages && activity.languages.includes('sl')) {
            notes.push('🇸🇮 Na voljo v slovenščini');
        }
        
        return notes;
    }
    
    generateRestaurantNotes(restaurant) {
        const notes = [];
        
        if (restaurant.localSpecialty) {
            notes.push('🏠 Lokalne specialitete');
        }
        
        if (restaurant.sustainability === 'high') {
            notes.push('🌱 Trajnostna kuhinja');
        }
        
        if (restaurant.type === 'fine_dining') {
            notes.push('👔 Priporočamo rezervacijo');
        }
        
        return notes;
    }
    
    getBestMonthsText(months) {
        const monthNames = [
            'januar', 'februar', 'marec', 'april', 'maj', 'junij',
            'julij', 'avgust', 'september', 'oktober', 'november', 'december'
        ];
        
        return months.map(m => monthNames[m - 1]).join(', ');
    }
    
    setupCacheCleanup() {
        // Clean up caches every hour
        setInterval(() => {
            const now = Date.now();
            
            // Clean weather cache (1 hour TTL)
            for (const [key, value] of this.weatherCache.entries()) {
                if (now - value.timestamp > 3600000) {
                    this.weatherCache.delete(key);
                }
            }
            
            // Clean availability cache (5 minutes TTL)
            for (const [key, value] of this.availabilityCache.entries()) {
                if (now - value.timestamp > 300000) {
                    this.availabilityCache.delete(key);
                }
            }
            
            // Clean price cache (30 minutes TTL)
            for (const [key, value] of this.priceCache.entries()) {
                if (now - value.timestamp > 1800000) {
                    this.priceCache.delete(key);
                }
            }
            
        }, 3600000); // Every hour
    }
    
    /**
     * Pridobitev statistik modula
     */
    getStats() {
        return {
            destinations: this.destinations.size,
            accommodations: this.accommodations.size,
            activities: this.activities.size,
            restaurants: this.restaurants.size,
            itineraries: this.itineraries.size,
            bookings: this.bookings.size,
            users: this.userPreferences.size,
            cacheStats: {
                weather: this.weatherCache.size,
                availability: this.availabilityCache.size,
                prices: this.priceCache.size
            }
        };
    }
}

module.exports = { TourismModule };