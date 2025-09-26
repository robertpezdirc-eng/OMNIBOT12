// 🏨 TURIZEM & GOSTINSTVO - KONFIGURACIJA

module.exports = {
    // 🏢 TIPI TURISTIČNIH OBJEKTOV - ULTRA FULL SET
    OBJECT_TYPES: {
        // NASTANITVE
        HOTEL: 'hotel',
        HOSTEL: 'hostel',
        APARTMENT: 'apartma',
        TOURIST_APARTMENT: 'turistični_apartma',
        PENSION: 'penzion',
        BNB: 'bed_and_breakfast',
        MOTEL: 'motel',
        CAMP: 'kamp',
        GLAMPING: 'glamping',
        RESORT: 'resort',
        VILLA: 'vila',
        CHALET: 'planinska_koča',
        FARM_STAY: 'turistična_kmetija',
        YOUTH_HOSTEL: 'mladinski_hotel',
        BOUTIQUE_HOTEL: 'butični_hotel',
        BUSINESS_HOTEL: 'poslovni_hotel',
        ECO_LODGE: 'eko_nastanitev',
        HOUSE_RENTAL: 'hiša_za_najem',
        
        // GOSTINSTVO
        RESTAURANT: 'restavracija',
        FINE_DINING: 'fine_dining_restavracija',
        BISTRO: 'bistro',
        PIZZERIA: 'picerija',
        TAVERN: 'gostilna',
        INN: 'gostišče',
        CAFE: 'kavarna',
        COFFEE_SHOP: 'coffee_shop',
        BAR: 'bar',
        PUB: 'pub',
        WINE_BAR: 'vinoteka',
        COCKTAIL_BAR: 'koktajl_bar',
        BREWERY: 'pivovarna',
        WINERY: 'vinska_klet',
        WINE_CELLAR: 'vinska_klet',
        TASTING_ROOM: 'degustacijska_dvorana',
        
        // WELLNESS & SPA
        SPA: 'spa',
        WELLNESS: 'wellness_center',
        THERMAL_SPA: 'termalni_spa',
        MEDICAL_SPA: 'medicinski_spa',
        DAY_SPA: 'dnevni_spa',
        BEAUTY_SALON: 'lepotni_salon',
        MASSAGE_CENTER: 'masažni_center',
        
        // AKTIVNOSTI & ZABAVA
        ADVENTURE_PARK: 'pustolovščinski_park',
        THEME_PARK: 'zabaviščni_park',
        WATER_PARK: 'vodni_park',
        SKI_RESORT: 'smučišče',
        GOLF_COURSE: 'golf_igrišče',
        MARINA: 'marina',
        DIVING_CENTER: 'potapljaški_center',
        BIKE_RENTAL: 'izposoja_koles',
        
        // KULTURA & IZOBRAŽEVANJE
        MUSEUM: 'muzej',
        GALLERY: 'galerija',
        CULTURAL_CENTER: 'kulturni_center',
        CASTLE: 'grad',
        MONASTERY: 'samostan',
        CHURCH: 'cerkev',
        ARCHAEOLOGICAL_SITE: 'arheološko_najdišče',
        
        // TRGOVINA & STORITVE
        SOUVENIR_SHOP: 'trgovina_s_spominki',
        LOCAL_MARKET: 'lokalna_tržnica',
        TOURIST_INFO: 'turistična_informacijska_točka',
        TRAVEL_AGENCY: 'turistična_agencija',
        CAR_RENTAL: 'izposoja_avtomobilov',
        
        // NARAVA & OKOLJE
        NATIONAL_PARK: 'narodni_park',
        NATURE_RESERVE: 'naravni_rezervat',
        BOTANICAL_GARDEN: 'botanični_vrt',
        ZOO: 'živalski_vrt',
        AQUARIUM: 'akvarij',
        VIEWPOINT: 'razgledna_točka',
        WATERFALL: 'slap',
        CAVE: 'jama',
        LAKE: 'jezero',
        BEACH: 'plaža'
    },

    // 📊 STATUSI OBJEKTOV - NAPREDNI SISTEM
    OBJECT_STATUS: {
        ACTIVE: 'aktivno',
        INACTIVE: 'neaktivno',
        SEASONAL: 'sezonsko_odprto',
        SEASONAL_CLOSED: 'sezonsko_zaprto',
        EXTENDED_HOURS: 'podaljšan_delovni_čas',
        REDUCED_HOURS: 'skrajšan_delovni_čas',
        PARTIALLY_CLOSED: 'delno_zaprto',
        RENOVATION: 'v_prenovi',
        TEMPORARILY_CLOSED: 'začasno_zaprto',
        PERMANENTLY_CLOSED: 'trajno_zaprto',
        COMING_SOON: 'kmalu_odprtje',
        MAINTENANCE: 'vzdrževanje',
        PRIVATE_EVENT: 'zasebni_dogodek',
        FULL_CAPACITY: 'polno_zasedeno',
        LIMITED_CAPACITY: 'omejena_kapaciteta',
        BOOKING_REQUIRED: 'potrebna_rezervacija',
        WALK_IN_ONLY: 'samo_brez_rezervacije'
    },

    // 🌐 DRUŽABNA OMREŽJA IN KONTAKTI - ULTRA SET
    SOCIAL_MEDIA_TYPES: {
        FACEBOOK: 'facebook',
        INSTAGRAM: 'instagram',
        TWITTER: 'twitter',
        YOUTUBE: 'youtube',
        TIKTOK: 'tiktok',
        LINKEDIN: 'linkedin',
        PINTEREST: 'pinterest',
        TRIPADVISOR: 'tripadvisor',
        BOOKING: 'booking_com',
        AIRBNB: 'airbnb',
        GOOGLE_BUSINESS: 'google_business',
        WHATSAPP: 'whatsapp',
        TELEGRAM: 'telegram',
        VIBER: 'viber',
        SKYPE: 'skype',
        MESSENGER: 'messenger',
        SNAPCHAT: 'snapchat',
        DISCORD: 'discord'
    },

    // 📱 KONTAKTNI TIPI
    CONTACT_TYPES: {
        PHONE: 'telefon',
        MOBILE: 'mobilni',
        FAX: 'faks',
        EMAIL: 'email',
        WEBSITE: 'spletna_stran',
        BOOKING_WEBSITE: 'rezervacijska_stran',
        WHATSAPP: 'whatsapp',
        TELEGRAM: 'telegram',
        VIBER: 'viber',
        EMERGENCY: 'nujni_kontakt',
        RECEPTION: 'recepcija',
        RESTAURANT: 'restavracija',
        SPA: 'spa',
        CONCIERGE: 'concierge'
    },

    // 🏷️ DODATNE ZNAČILNOSTI OBJEKTOV
    OBJECT_FEATURES: {
        // DOSTOPNOST
        WHEELCHAIR_ACCESSIBLE: 'dostop_za_invalide',
        ELEVATOR: 'dvigalo',
        BRAILLE_SIGNS: 'braillova_pisava',
        HEARING_LOOP: 'indukcijska_zanka',
        
        // DRUŽINA
        FAMILY_FRIENDLY: 'družinam_prijazno',
        KIDS_CLUB: 'otroški_klub',
        PLAYGROUND: 'otroško_igrišče',
        BABY_FACILITIES: 'dojenčkove_potrebščine',
        HIGH_CHAIRS: 'otroški_stoli',
        
        // HIŠNI LJUBLJENČKI
        PET_FRIENDLY: 'hišni_ljubljenčki_dovoljeni',
        PET_SITTING: 'varstvo_hišnih_ljubljenčkov',
        PET_GROOMING: 'nega_hišnih_ljubljenčkov',
        DOG_PARK: 'pasji_park',
        
        // TEHNOLOGIJA
        FREE_WIFI: 'brezplačen_wifi',
        HIGH_SPEED_INTERNET: 'hitri_internet',
        SMART_TV: 'pametni_tv',
        CHARGING_STATIONS: 'polnilne_postaje',
        BUSINESS_CENTER: 'poslovni_center',
        
        // TRANSPORT
        FREE_PARKING: 'brezplačno_parkiranje',
        VALET_PARKING: 'valet_parkiranje',
        ELECTRIC_CHARGING: 'polnjenje_električnih_vozil',
        AIRPORT_SHUTTLE: 'prevoz_na_letališče',
        BIKE_RENTAL: 'izposoja_koles',
        
        // STORITVE
        ROOM_SERVICE: 'sobna_strežba',
        LAUNDRY: 'pralnica',
        DRY_CLEANING: 'kemična_čistilnica',
        CURRENCY_EXCHANGE: 'menjava_valut',
        ATM: 'bankomat',
        
        // VARNOST
        SECURITY_24H: '24h_varnost',
        SAFE_DEPOSIT: 'sef',
        CCTV: 'video_nadzor',
        KEYCARD_ACCESS: 'dostop_s_kartico',
        
        // WELLNESS & ŠPORT
        FITNESS_CENTER: 'fitnes_center',
        SWIMMING_POOL: 'bazen',
        SAUNA: 'savna',
        JACUZZI: 'jacuzzi',
        TENNIS_COURT: 'teniško_igrišče',
        
        // HRANA & PIJAČA
        RESTAURANT_ONSITE: 'restavracija_v_objektu',
        BAR_LOUNGE: 'bar_salon',
        ROOM_MINIBAR: 'minibar_v_sobi',
        BREAKFAST_INCLUDED: 'zajtrk_vključen',
        ALL_INCLUSIVE: 'vse_vključeno',
        
        // OKOLJE
        ECO_CERTIFIED: 'ekološko_certificirano',
        SOLAR_POWER: 'sončna_energija',
        WATER_CONSERVATION: 'varčevanje_z_vodo',
        RECYCLING: 'recikliranje',
        ORGANIC_FOOD: 'organska_hrana'
    },

    // 🏆 CERTIFIKATI IN ZNAČKE
    CERTIFICATES: {
        FAMILY_FRIENDLY: {
            type: 'family_friendly',
            name: 'Družinam prijazno',
            description: 'Objekt je prilagojen družinam z otroki',
            icon: '👨‍👩‍👧‍👦',
            color: '#4CAF50'
        },
        PET_FRIENDLY: {
            type: 'pet_friendly',
            name: 'Hišni ljubljenčki dovoljeni',
            description: 'Sprejemamo hišne ljubljenčke',
            icon: '🐕',
            color: '#FF9800'
        },
        ACCESSIBLE: {
            type: 'accessible',
            name: 'Dostop za invalide',
            description: 'Objekt je dostopen osebam z omejeno mobilnostjo',
            icon: '♿',
            color: '#2196F3'
        },
        ECO_CERTIFIED: {
            type: 'eco_certified',
            name: 'Ekološko certificirano',
            description: 'Objekt deluje po načelih trajnostnega razvoja',
            icon: '🌱',
            color: '#8BC34A'
        },
        PREMIUM: {
            type: 'premium',
            name: 'Premium',
            description: 'Visokokakovostne storitve in nastanitev',
            icon: '⭐',
            color: '#FFD700'
        },
        ALL_INCLUSIVE: {
            type: 'all_inclusive',
            name: 'All-inclusive',
            description: 'Vse storitve vključene v ceno',
            icon: '🎯',
            color: '#9C27B0'
        },
        WIFI_FREE: {
            type: 'wifi_free',
            name: 'Brezplačen WiFi',
            description: 'Brezplačen internetni dostop',
            icon: '📶',
            color: '#607D8B'
        },
        PARKING: {
            type: 'parking',
            name: 'Parkirišče',
            description: 'Na voljo parkirna mesta',
            icon: '🅿️',
            color: '#795548'
        },
        POOL: {
            type: 'pool',
            name: 'Bazen',
            description: 'Objekt ima bazen',
            icon: '🏊‍♂️',
            color: '#00BCD4'
        },
        GYM: {
            type: 'gym',
            name: 'Fitnes',
            description: 'Fitnes center na voljo',
            icon: '💪',
            color: '#E91E63'
        }
    },

    // ⭐ KATEGORIJE OCENJEVANJA
    RATING_CATEGORIES: {
        OVERALL: {
            key: 'overall_rating',
            name: 'Splošna ocena',
            description: 'Celotna izkušnja',
            weight: 1.0
        },
        CLEANLINESS: {
            key: 'cleanliness_rating',
            name: 'Čistoča',
            description: 'Čistoča prostorov in okolice',
            weight: 0.25
        },
        STAFF: {
            key: 'staff_rating',
            name: 'Prijaznost osebja',
            description: 'Kakovost storitev osebja',
            weight: 0.25
        },
        LOCATION: {
            key: 'location_rating',
            name: 'Lokacija',
            description: 'Lokacija in dostopnost',
            weight: 0.25
        },
        COMFORT: {
            key: 'comfort_rating',
            name: 'Udobje',
            description: 'Udobje nastanitve/storitev',
            weight: 0.25
        }
    },

    // 💰 TIPI CEN
    PRICE_TYPES: {
        PER_NIGHT: 'per_night',
        PER_PERSON: 'per_person',
        PER_SERVICE: 'per_service',
        PER_HOUR: 'per_hour',
        PER_DAY: 'per_day',
        FIXED: 'fixed'
    },

    // 🌍 SEZONE
    SEASONS: {
        HIGH: 'high',
        STANDARD: 'standard',
        LOW: 'low'
    },

    // 📅 DNEVI V TEDNU
    DAYS_OF_WEEK: {
        0: 'Nedelja',
        1: 'Ponedeljek',
        2: 'Torek',
        3: 'Sreda',
        4: 'Četrtek',
        5: 'Petek',
        6: 'Sobota'
    },

    // 🌍 REGIJE SLOVENIJE
    SLOVENIAN_REGIONS: [
        'Gorenjska',
        'Goriška',
        'Jugovzhodna Slovenija',
        'Koroška',
        'Obalno-kraška',
        'Osrednjeslovenska',
        'Podravska',
        'Pomurska',
        'Posavska',
        'Primorsko-notranjska',
        'Savinjska',
        'Zasavska'
    ],

    // 🎯 TURISTIČNE ATRAKCIJE PO REGIJAH
    TOURIST_ATTRACTIONS: {
        'Gorenjska': [
            'Bled',
            'Bohinj',
            'Kranjska Gora',
            'Triglav',
            'Vintgar',
            'Radovljica'
        ],
        'Obalno-kraška': [
            'Portorož',
            'Piran',
            'Škocjanske jame',
            'Lipica',
            'Koper',
            'Izola'
        ],
        'Osrednjeslovenska': [
            'Ljubljana',
            'Postojnska jama',
            'Predjama',
            'Kamnik',
            'Velika planina'
        ]
        // Dodaj ostale regije po potrebi
    },

    // 📸 NASTAVITVE GALERIJE
    GALLERY_SETTINGS: {
        MAX_IMAGES: 50,
        ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        THUMBNAIL_SIZE: { width: 300, height: 200 },
        LARGE_SIZE: { width: 1200, height: 800 }
    },

    // 🌐 360° VIRTUAL TOUR NASTAVITVE
    VIRTUAL_TOUR_SETTINGS: {
        ALLOWED_FORMATS: ['jpg', 'jpeg', 'png'],
        MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
        PANORAMA_WIDTH: 4096,
        PANORAMA_HEIGHT: 2048
    },

    // 📧 EMAIL TEMPLATES
    EMAIL_TEMPLATES: {
        NEW_RATING: {
            subject: 'Nova ocena za vaš objekt',
            template: 'new_rating'
        },
        BOOKING_INQUIRY: {
            subject: 'Nova povpraševanja za rezervacijo',
            template: 'booking_inquiry'
        }
    },

    // 🔍 ISKALNE NASTAVITVE
    SEARCH_SETTINGS: {
        MAX_RESULTS: 100,
        DEFAULT_RADIUS: 50, // km
        MIN_RATING: 1,
        MAX_RATING: 5
    }
};