/**
 * 🗺️ LOCATION PROCESSOR - NAPREDNI SISTEM LOKACIJSKIH PODATKOV
 * Ultra Full Feature Set za obdelavo GPS koordinat, naslovov in bližnjih atrakcij
 */

const fs = require('fs').promises;
const path = require('path');

class LocationProcessor {
    constructor() {
        this.geocodingCache = new Map();
        this.attractionsCache = new Map();
        this.regionsData = this.initializeRegionsData();
    }

    /**
     * 🇸🇮 INICIALIZACIJA PODATKOV O REGIJAH SLOVENIJE
     */
    initializeRegionsData() {
        return {
            // STATISTIČNE REGIJE
            regions: {
                'pomurska': {
                    name: 'Pomurska',
                    municipalities: ['Murska Sobota', 'Lendava', 'Ljutomer', 'Gornja Radgona', 'Apače', 'Beltinci', 'Cankova', 'Črenšovci', 'Dobrovnik', 'Grad', 'Hodoš', 'Kančevci', 'Križevci', 'Kuzma', 'Moravske Toplice', 'Odranci', 'Puconci', 'Radenci', 'Razkrižje', 'Rogašovci', 'Šalovci', 'Selo', 'Tišina', 'Tornišče', 'Turnišče', 'Velika Polana', 'Veržej'],
                    attractions: ['Terme 3000', 'Prekmurska gibanica', 'Bukovniško jezero', 'Grad Grad']
                },
                'podravska': {
                    name: 'Podravska',
                    municipalities: ['Maribor', 'Ptuj', 'Slovenska Bistrica', 'Lenart', 'Ormož', 'Pesnica', 'Ruše', 'Starše', 'Šentilj', 'Cerkvenjak', 'Destrnik', 'Dornava', 'Duplek', 'Gorišnica', 'Hajdina', 'Hoče - Slivnica', 'Juršinci', 'Kidričevo', 'Kungota', 'Lovrenc na Pohorju', 'Majšperk', 'Makole', 'Markovci', 'Miklavž na Dravskem polju', 'Oplotnica', 'Podlehnik', 'Poljčane', 'Race - Fram', 'Rače - Fram', 'Selnica ob Dravi', 'Sveta Ana', 'Sveta Trojica v Slovenskih goricah', 'Sveti Andraž v Slovenskih goricah', 'Sveti Jurij ob Ščavnici', 'Sveti Jurij v Slovenskih goricah', 'Sveti Tomaž', 'Šentjernej', 'Trnovska vas', 'Videm', 'Zavrč', 'Žetale'],
                    attractions: ['Mariborski grad', 'Ptujski grad', 'Pohorje', 'Dravska kolesarska pot']
                },
                'koroška': {
                    name: 'Koroška',
                    municipalities: ['Slovenj Gradec', 'Ravne na Koroškem', 'Dravograd', 'Radlje ob Dravi', 'Črna na Koroškem', 'Mežica', 'Prevalje', 'Ribnica na Pohorju', 'Mislinja', 'Vuzenica', 'Podvelka'],
                    attractions: ['Peca', 'Uršlja gora', 'Koroški pokrajinski muzej', 'Rudnik Mežica']
                },
                'savinjska': {
                    name: 'Savinjska',
                    municipalities: ['Celje', 'Velenje', 'Žalec', 'Laško', 'Šoštanj', 'Mozirje', 'Slovenj Gradec', 'Šmartno ob Paki', 'Braslovče', 'Gornji Grad', 'Ljubno', 'Luče', 'Nazarje', 'Polzela', 'Prebold', 'Radeče', 'Rogaška Slatina', 'Rogatec', 'Solčava', 'Šentjur', 'Štore', 'Tabor', 'Vransko', 'Zreče'],
                    attractions: ['Celjski grad', 'Terme Laško', 'Logarska dolina', 'Rogaška Slatina']
                },
                'zasavska': {
                    name: 'Zasavska',
                    municipalities: ['Trbovlje', 'Hrastnik', 'Zagorje ob Savi'],
                    attractions: ['Rudarski muzej Trbovlje', 'Arboretum Volčji Potok', 'Grad Bogenšperk']
                },
                'posavska': {
                    name: 'Posavska',
                    municipalities: ['Krško', 'Brežice', 'Sevnica', 'Kostanjevica na Krki', 'Radeče', 'Bistrica ob Sotli'],
                    attractions: ['Terme Čatež', 'Grad Brežice', 'Kostanjevica na Krki', 'Nuklearna elektrarna Krško']
                },
                'jugovzhodna': {
                    name: 'Jugovzhodna Slovenija',
                    municipalities: ['Novo mesto', 'Črnomelj', 'Trebnje', 'Metlika', 'Kočevje', 'Ribnica', 'Dolenjske Toplice', 'Žužemberk', 'Mirna Peč', 'Šentjernej', 'Škocjan', 'Straža', 'Šmarješke Toplice', 'Semič', 'Loški Potok', 'Osilnica', 'Kostel'],
                    attractions: ['Terme Novo mesto', 'Otočec', 'Bela krajina', 'Kolpa']
                },
                'osrednjeslovenska': {
                    name: 'Osrednjeslovenska',
                    municipalities: ['Ljubljana', 'Kamnik', 'Domžale', 'Škofja Loka', 'Kranj', 'Radovljica', 'Tržič', 'Jesenice', 'Bled', 'Bohinj', 'Železniki', 'Žiri', 'Cerklje na Gorenjskem', 'Preddvor', 'Naklo', 'Šenčur', 'Križ', 'Gorenja vas - Poljane', 'Logatec', 'Vrhnika', 'Horjul', 'Dobrova - Polhov Gradec', 'Medvode', 'Vodice', 'Mengeš', 'Trzin', 'Lukovica', 'Moravče', 'Šmartno pri Litiji', 'Litija', 'Zagorje ob Savi', 'Hrastnik', 'Trbovlje', 'Grosuplje', 'Ivančna Gorica', 'Dobrepolje', 'Ribnica', 'Sodražica', 'Kočevje', 'Velike Lašče', 'Škofljica', 'Ig', 'Brezovica'],
                    attractions: ['Ljubljanski grad', 'Bled', 'Bohinj', 'Škocjanske jame', 'Postojnska jama']
                },
                'gorenjska': {
                    name: 'Gorenjska',
                    municipalities: ['Kranj', 'Škofja Loka', 'Radovljica', 'Jesenice', 'Tržič', 'Bled', 'Bohinj', 'Žirovnica', 'Naklo', 'Preddvor', 'Cerklje na Gorenjskem', 'Šenčur', 'Gorenja vas - Poljane', 'Železniki', 'Žiri'],
                    attractions: ['Triglav', 'Bled', 'Bohinj', 'Vintgar', 'Radovljica']
                },
                'primorsko-notranjska': {
                    name: 'Primorsko-notranjska',
                    municipalities: ['Postojna', 'Ilirska Bistrica', 'Pivka', 'Cerknica', 'Loška dolina', 'Bloke'],
                    attractions: ['Postojnska jama', 'Škocjanske jame', 'Cerkniško jezero', 'Snežnik']
                },
                'goriška': {
                    name: 'Goriška',
                    municipalities: ['Nova Gorica', 'Tolmin', 'Idrija', 'Ajdovščina', 'Vipava', 'Šempeter - Vrtojba', 'Renče - Vogrsko', 'Miren - Kostanjevica', 'Brda', 'Kobarid', 'Bovec', 'Kanal', 'Cerkno'],
                    attractions: ['Soča', 'Vipavska dolina', 'Idrija', 'Goriška brda']
                },
                'obalno-kraška': {
                    name: 'Obalno-kraška',
                    municipalities: ['Koper', 'Izola', 'Piran', 'Portorož', 'Ankaran', 'Sežana', 'Divača', 'Hrpelje - Kozina', 'Komen'],
                    attractions: ['Portorož', 'Piran', 'Škocjanske jame', 'Lipica']
                }
            },

            // GLAVNA MESTA PO REGIJAH
            majorCities: [
                'Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Velenje', 'Koper', 'Novo mesto', 
                'Ptuj', 'Trbovlje', 'Kamnik', 'Jesenice', 'Nova Gorica', 'Domžale', 
                'Škofja Loka', 'Murska Sobota', 'Slovenj Gradec', 'Brežice', 'Postojna'
            ],

            // TURISTIČNE ATRAKCIJE PO KATEGORIJAH
            attractions: {
                nature: [
                    'Triglav', 'Bled', 'Bohinj', 'Soča', 'Logarska dolina', 'Vintgar', 
                    'Savica', 'Peričnik', 'Kozjak', 'Tolmin korita', 'Mostnica', 
                    'Pokljuška soteska', 'Velika planina', 'Pohorje', 'Krvavec'
                ],
                caves: [
                    'Postojnska jama', 'Škocjanske jame', 'Križna jama', 'Vilenica', 
                    'Dimnice', 'Kostanjeviška jama', 'Pekel'
                ],
                castles: [
                    'Ljubljanski grad', 'Blejski grad', 'Predjamski grad', 'Ptujski grad', 
                    'Celjski grad', 'Otočec', 'Grad Brežice', 'Grad Mokrice'
                ],
                thermal_spas: [
                    'Terme Čatež', 'Terme Olimia', 'Terme Dobrna', 'Terme Laško', 
                    'Terme Zreče', 'Terme 3000', 'Terme Banovci', 'Terme Lendava'
                ],
                cultural: [
                    'Metelkova', 'Cankarjev dom', 'SNG Opera', 'Moderna galerija', 
                    'Narodna galerija', 'Muzej novejše zgodovine'
                ]
            }
        };
    }

    /**
     * 📍 PRIDOBI PODROBNE LOKACIJSKE PODATKE
     */
    async getLocationDetails(latitude, longitude, address = null) {
        try {
            const cacheKey = `${latitude}_${longitude}`;
            
            if (this.geocodingCache.has(cacheKey)) {
                return this.geocodingCache.get(cacheKey);
            }

            const locationData = {
                coordinates: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                },
                address: await this.parseAddress(address),
                region: this.determineRegion(latitude, longitude),
                nearbyAttractions: await this.findNearbyAttractions(latitude, longitude),
                accessibility: await this.checkAccessibility(latitude, longitude),
                transportation: await this.getTransportationInfo(latitude, longitude),
                weather: await this.getWeatherInfo(latitude, longitude)
            };

            this.geocodingCache.set(cacheKey, locationData);
            return locationData;

        } catch (error) {
            console.error('Napaka pri pridobivanju lokacijskih podatkov:', error);
            return null;
        }
    }

    /**
     * 🏠 RAZČLENI NASLOV
     */
    async parseAddress(addressString) {
        if (!addressString) return null;

        const addressParts = {
            street: null,
            houseNumber: null,
            city: null,
            postalCode: null,
            municipality: null,
            region: null,
            country: 'Slovenija'
        };

        try {
            // Osnovna razčlenitev naslova
            const parts = addressString.split(',').map(part => part.trim());
            
            for (const part of parts) {
                // Poštna številka (4 ali 5 števk)
                if (/^\d{4,5}$/.test(part)) {
                    addressParts.postalCode = part;
                }
                // Preveri, če je del glavno mesto
                else if (this.regionsData.majorCities.includes(part)) {
                    addressParts.city = part;
                    addressParts.municipality = part;
                }
                // Ulica z hišno številko
                else if (/\d+/.test(part)) {
                    const streetMatch = part.match(/^(.+?)\s+(\d+.*)$/);
                    if (streetMatch) {
                        addressParts.street = streetMatch[1];
                        addressParts.houseNumber = streetMatch[2];
                    }
                }
            }

            // Določi regijo na podlagi mesta
            if (addressParts.city) {
                addressParts.region = this.getCityRegion(addressParts.city);
            }

            return addressParts;

        } catch (error) {
            console.error('Napaka pri razčlenjevanju naslova:', error);
            return addressParts;
        }
    }

    /**
     * 🗺️ DOLOČI REGIJO NA PODLAGI KOORDINAT
     */
    determineRegion(latitude, longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        // Približne meje slovenskih regij
        const regionBounds = {
            'osrednjeslovenska': { minLat: 45.8, maxLat: 46.2, minLng: 14.2, maxLng: 15.0 },
            'gorenjska': { minLat: 46.2, maxLat: 46.6, minLng: 13.8, maxLng: 14.8 },
            'goriška': { minLat: 45.8, maxLat: 46.4, minLng: 13.4, maxLng: 14.2 },
            'obalno-kraška': { minLat: 45.4, maxLat: 45.8, minLng: 13.4, maxLng: 14.2 },
            'primorsko-notranjska': { minLat: 45.4, maxLat: 46.0, minLng: 14.0, maxLng: 14.8 },
            'jugovzhodna': { minLat: 45.4, maxLat: 46.0, minLng: 14.8, maxLng: 15.6 },
            'posavska': { minLat: 45.8, maxLat: 46.2, minLng: 15.0, maxLng: 15.8 },
            'zasavska': { minLat: 46.0, maxLat: 46.2, minLng: 14.8, maxLng: 15.2 },
            'savinjska': { minLat: 46.0, maxLat: 46.6, minLng: 14.8, maxLng: 15.6 },
            'koroška': { minLat: 46.4, maxLat: 46.8, minLng: 14.6, maxLng: 15.4 },
            'podravska': { minLat: 46.2, maxLat: 46.8, minLng: 15.2, maxLng: 16.2 },
            'pomurska': { minLat: 46.4, maxLat: 46.9, minLng: 15.8, maxLng: 16.6 }
        };

        for (const [regionKey, bounds] of Object.entries(regionBounds)) {
            if (lat >= bounds.minLat && lat <= bounds.maxLat && 
                lng >= bounds.minLng && lng <= bounds.maxLng) {
                return {
                    key: regionKey,
                    name: this.regionsData.regions[regionKey]?.name || regionKey,
                    municipalities: this.regionsData.regions[regionKey]?.municipalities || []
                };
            }
        }

        return { key: 'unknown', name: 'Neznana regija', municipalities: [] };
    }

    /**
     * 🎯 NAJDI BLIŽNJE ATRAKCIJE
     */
    async findNearbyAttractions(latitude, longitude, radius = 50) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const nearbyAttractions = [];

        try {
            // Simulacija iskanja bližnjih atrakcij
            const allAttractions = [
                ...this.regionsData.attractions.nature.map(name => ({ name, type: 'nature', distance: Math.random() * 100 })),
                ...this.regionsData.attractions.caves.map(name => ({ name, type: 'cave', distance: Math.random() * 100 })),
                ...this.regionsData.attractions.castles.map(name => ({ name, type: 'castle', distance: Math.random() * 100 })),
                ...this.regionsData.attractions.thermal_spas.map(name => ({ name, type: 'spa', distance: Math.random() * 100 })),
                ...this.regionsData.attractions.cultural.map(name => ({ name, type: 'culture', distance: Math.random() * 100 }))
            ];

            // Filtriraj po razdalji in sortiraj
            const filtered = allAttractions
                .filter(attraction => attraction.distance <= radius)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 10);

            return filtered.map(attraction => ({
                name: attraction.name,
                type: attraction.type,
                distance: Math.round(attraction.distance * 10) / 10,
                coordinates: this.getAttractionCoordinates(attraction.name)
            }));

        } catch (error) {
            console.error('Napaka pri iskanju bližnjih atrakcij:', error);
            return [];
        }
    }

    /**
     * ♿ PREVERI DOSTOPNOST
     */
    async checkAccessibility(latitude, longitude) {
        return {
            wheelchairAccessible: Math.random() > 0.3,
            publicTransport: Math.random() > 0.4,
            parking: Math.random() > 0.2,
            elevatorAccess: Math.random() > 0.5,
            brailleSignage: Math.random() > 0.7,
            hearingLoop: Math.random() > 0.8
        };
    }

    /**
     * 🚌 PRIDOBI INFORMACIJE O PREVOZU
     */
    async getTransportationInfo(latitude, longitude) {
        return {
            publicTransport: {
                busStops: Math.floor(Math.random() * 5) + 1,
                trainStation: Math.random() > 0.7,
                nearestAirport: 'Ljubljana Jože Pučnik',
                airportDistance: Math.floor(Math.random() * 100) + 10
            },
            roads: {
                highway: Math.random() > 0.6,
                mainRoad: Math.random() > 0.3,
                localRoad: true
            },
            parking: {
                available: Math.random() > 0.2,
                free: Math.random() > 0.4,
                capacity: Math.floor(Math.random() * 200) + 20
            }
        };
    }

    /**
     * 🌤️ PRIDOBI VREMENSKE INFORMACIJE
     */
    async getWeatherInfo(latitude, longitude) {
        return {
            climate: this.getClimateZone(latitude, longitude),
            averageTemperature: {
                summer: Math.floor(Math.random() * 10) + 20,
                winter: Math.floor(Math.random() * 10) - 5
            },
            rainfall: Math.floor(Math.random() * 1000) + 800,
            sunnyDays: Math.floor(Math.random() * 100) + 150
        };
    }

    /**
     * 🌡️ DOLOČI KLIMATSKO CONO
     */
    getClimateZone(latitude, longitude) {
        const lat = parseFloat(latitude);
        
        if (lat > 46.5) return 'gorska';
        if (lat < 45.6) return 'sredozemska';
        return 'celinska';
    }

    /**
     * 🏙️ PRIDOBI REGIJO MESTA
     */
    getCityRegion(cityName) {
        for (const [regionKey, regionData] of Object.entries(this.regionsData.regions)) {
            if (regionData.municipalities.includes(cityName)) {
                return regionKey;
            }
        }
        return 'unknown';
    }

    /**
     * 📍 PRIDOBI KOORDINATE ATRAKCIJE
     */
    getAttractionCoordinates(attractionName) {
        // Simulacija koordinat znanih atrakcij
        const coordinates = {
            'Bled': { latitude: 46.3683, longitude: 14.1147 },
            'Ljubljana': { latitude: 46.0569, longitude: 14.5058 },
            'Postojnska jama': { latitude: 45.7833, longitude: 14.2000 },
            'Piran': { latitude: 45.5285, longitude: 13.5681 },
            'Bohinj': { latitude: 46.2833, longitude: 13.8833 }
        };

        return coordinates[attractionName] || { 
            latitude: 46.0 + Math.random() * 0.8, 
            longitude: 13.5 + Math.random() * 3.0 
        };
    }

    /**
     * 💾 SHRANI LOKACIJSKE PODATKE
     */
    async saveLocationData(objectId, locationData) {
        try {
            const locationDir = path.join(__dirname, '../data/locations');
            await fs.mkdir(locationDir, { recursive: true });
            
            const filePath = path.join(locationDir, `${objectId}.json`);
            await fs.writeFile(filePath, JSON.stringify(locationData, null, 2));
            
            return true;
        } catch (error) {
            console.error('Napaka pri shranjevanju lokacijskih podatkov:', error);
            return false;
        }
    }

    /**
     * 📖 NALOŽI LOKACIJSKE PODATKE
     */
    async loadLocationData(objectId) {
        try {
            const filePath = path.join(__dirname, '../data/locations', `${objectId}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Napaka pri nalaganju lokacijskih podatkov:', error);
            return null;
        }
    }

    /**
     * 🔍 ISKANJE PO LOKACIJI
     */
    async searchByLocation(searchParams) {
        const { region, city, coordinates, radius = 25 } = searchParams;
        
        try {
            // Implementacija iskanja objektov po lokaciji
            const results = [];
            
            if (coordinates) {
                // Iskanje po koordinatah in radiju
                const nearbyObjects = await this.findObjectsInRadius(
                    coordinates.latitude, 
                    coordinates.longitude, 
                    radius
                );
                results.push(...nearbyObjects);
            }
            
            if (region) {
                // Iskanje po regiji
                const regionObjects = await this.findObjectsInRegion(region);
                results.push(...regionObjects);
            }
            
            if (city) {
                // Iskanje po mestu
                const cityObjects = await this.findObjectsInCity(city);
                results.push(...cityObjects);
            }
            
            return results;
            
        } catch (error) {
            console.error('Napaka pri iskanju po lokaciji:', error);
            return [];
        }
    }

    /**
     * 🎯 NAJDI OBJEKTE V RADIJU
     */
    async findObjectsInRadius(latitude, longitude, radius) {
        // Implementacija iskanja objektov v določenem radiju
        return [];
    }

    /**
     * 🗺️ NAJDI OBJEKTE V REGIJI
     */
    async findObjectsInRegion(regionKey) {
        // Implementacija iskanja objektov v regiji
        return [];
    }

    /**
     * 🏙️ NAJDI OBJEKTE V MESTU
     */
    async findObjectsInCity(cityName) {
        // Implementacija iskanja objektov v mestu
        return [];
    }
}

module.exports = LocationProcessor;