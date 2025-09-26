/**
 * 📱 SOCIAL MEDIA PROCESSOR - NAPREDNI SISTEM DRUŽABNIH OMREŽIJ
 * Ultra Full Feature Set za upravljanje vseh vrst družabnih omrežij in kontaktov
 */

const fs = require('fs').promises;
const path = require('path');

class SocialMediaProcessor {
    constructor() {
        this.socialPlatforms = this.initializePlatforms();
        this.validationRules = this.initializeValidationRules();
        this.analyticsCache = new Map();
    }

    /**
     * 🌐 INICIALIZACIJA PLATFORM DRUŽABNIH OMREŽIJ
     */
    initializePlatforms() {
        return {
            // GLAVNA DRUŽABNA OMREŽJA
            facebook: {
                name: 'Facebook',
                icon: 'fab fa-facebook-f',
                color: '#1877F2',
                baseUrl: 'https://facebook.com/',
                validation: /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+\/?$/,
                features: ['posts', 'events', 'reviews', 'messaging', 'ads'],
                businessFeatures: ['business_page', 'marketplace', 'events', 'groups']
            },
            instagram: {
                name: 'Instagram',
                icon: 'fab fa-instagram',
                color: '#E4405F',
                baseUrl: 'https://instagram.com/',
                validation: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+\/?$/,
                features: ['posts', 'stories', 'reels', 'igtv', 'shopping'],
                businessFeatures: ['business_profile', 'insights', 'ads', 'shopping_tags']
            },
            twitter: {
                name: 'Twitter / X',
                icon: 'fab fa-twitter',
                color: '#1DA1F2',
                baseUrl: 'https://twitter.com/',
                validation: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/,
                features: ['tweets', 'threads', 'spaces', 'fleets'],
                businessFeatures: ['twitter_ads', 'analytics', 'api_access']
            },
            youtube: {
                name: 'YouTube',
                icon: 'fab fa-youtube',
                color: '#FF0000',
                baseUrl: 'https://youtube.com/',
                validation: /^https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|user\/)?[a-zA-Z0-9_-]+\/?$/,
                features: ['videos', 'shorts', 'live_streaming', 'community'],
                businessFeatures: ['monetization', 'analytics', 'brand_account']
            },
            tiktok: {
                name: 'TikTok',
                icon: 'fab fa-tiktok',
                color: '#000000',
                baseUrl: 'https://tiktok.com/',
                validation: /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+\/?$/,
                features: ['videos', 'live_streaming', 'effects', 'sounds'],
                businessFeatures: ['business_account', 'ads', 'analytics']
            },
            linkedin: {
                name: 'LinkedIn',
                icon: 'fab fa-linkedin-in',
                color: '#0A66C2',
                baseUrl: 'https://linkedin.com/',
                validation: /^https?:\/\/(www\.)?linkedin\.com\/(in\/|company\/)[a-zA-Z0-9-]+\/?$/,
                features: ['posts', 'articles', 'networking', 'jobs'],
                businessFeatures: ['company_page', 'ads', 'talent_solutions', 'sales_navigator']
            },
            pinterest: {
                name: 'Pinterest',
                icon: 'fab fa-pinterest-p',
                color: '#BD081C',
                baseUrl: 'https://pinterest.com/',
                validation: /^https?:\/\/(www\.)?pinterest\.com\/[a-zA-Z0-9._-]+\/?$/,
                features: ['pins', 'boards', 'stories', 'shopping'],
                businessFeatures: ['business_account', 'ads', 'analytics', 'shopping_features']
            },

            // POTOVALNE PLATFORME
            tripadvisor: {
                name: 'TripAdvisor',
                icon: 'fab fa-tripadvisor',
                color: '#00AF87',
                baseUrl: 'https://tripadvisor.com/',
                validation: /^https?:\/\/(www\.)?tripadvisor\.(com|si)\/[a-zA-Z0-9._/-]+$/,
                features: ['reviews', 'photos', 'rankings', 'booking'],
                businessFeatures: ['business_listing', 'review_management', 'ads']
            },
            booking: {
                name: 'Booking.com',
                icon: 'fas fa-bed',
                color: '#003580',
                baseUrl: 'https://booking.com/',
                validation: /^https?:\/\/(www\.)?booking\.com\/hotel\/[a-zA-Z0-9._/-]+$/,
                features: ['reservations', 'reviews', 'photos', 'availability'],
                businessFeatures: ['extranet', 'channel_manager', 'rate_management']
            },
            airbnb: {
                name: 'Airbnb',
                icon: 'fab fa-airbnb',
                color: '#FF5A5F',
                baseUrl: 'https://airbnb.com/',
                validation: /^https?:\/\/(www\.)?airbnb\.(com|si)\/rooms\/\d+$/,
                features: ['listings', 'reviews', 'experiences', 'messaging'],
                businessFeatures: ['host_tools', 'analytics', 'professional_hosting']
            },
            google_business: {
                name: 'Google Business',
                icon: 'fab fa-google',
                color: '#4285F4',
                baseUrl: 'https://business.google.com/',
                validation: /^https?:\/\/(www\.)?google\.(com|si)\/maps\/place\/[a-zA-Z0-9._/%-]+$/,
                features: ['reviews', 'photos', 'posts', 'q_and_a'],
                businessFeatures: ['insights', 'messaging', 'booking', 'website']
            },

            // SPOROČILNE APLIKACIJE
            whatsapp: {
                name: 'WhatsApp',
                icon: 'fab fa-whatsapp',
                color: '#25D366',
                baseUrl: 'https://wa.me/',
                validation: /^(\+386|0)\d{8,9}$/,
                features: ['messaging', 'voice_calls', 'video_calls', 'status'],
                businessFeatures: ['whatsapp_business', 'catalog', 'labels', 'quick_replies']
            },
            telegram: {
                name: 'Telegram',
                icon: 'fab fa-telegram-plane',
                color: '#0088CC',
                baseUrl: 'https://t.me/',
                validation: /^@[a-zA-Z0-9_]{5,32}$/,
                features: ['messaging', 'channels', 'groups', 'bots'],
                businessFeatures: ['channels', 'bots', 'payments', 'api']
            },
            viber: {
                name: 'Viber',
                icon: 'fab fa-viber',
                color: '#665CAC',
                baseUrl: 'viber://chat?number=',
                validation: /^(\+386|0)\d{8,9}$/,
                features: ['messaging', 'voice_calls', 'video_calls', 'public_accounts'],
                businessFeatures: ['public_accounts', 'chatbots', 'broadcasts']
            },
            skype: {
                name: 'Skype',
                icon: 'fab fa-skype',
                color: '#00AFF0',
                baseUrl: 'skype:',
                validation: /^[a-zA-Z0-9._-]{6,32}$/,
                features: ['messaging', 'voice_calls', 'video_calls', 'screen_sharing'],
                businessFeatures: ['skype_for_business', 'conference_calls']
            },
            messenger: {
                name: 'Facebook Messenger',
                icon: 'fab fa-facebook-messenger',
                color: '#0084FF',
                baseUrl: 'https://m.me/',
                validation: /^[a-zA-Z0-9._-]+$/,
                features: ['messaging', 'voice_calls', 'video_calls', 'games'],
                businessFeatures: ['chatbots', 'customer_service', 'payments']
            },

            // OSTALE PLATFORME
            snapchat: {
                name: 'Snapchat',
                icon: 'fab fa-snapchat-ghost',
                color: '#FFFC00',
                baseUrl: 'https://snapchat.com/',
                validation: /^[a-zA-Z0-9._-]{3,15}$/,
                features: ['snaps', 'stories', 'discover', 'maps'],
                businessFeatures: ['ads', 'lenses', 'geofilters']
            },
            discord: {
                name: 'Discord',
                icon: 'fab fa-discord',
                color: '#5865F2',
                baseUrl: 'https://discord.gg/',
                validation: /^[a-zA-Z0-9]{7,10}$/,
                features: ['messaging', 'voice_channels', 'video_calls', 'communities'],
                businessFeatures: ['server_management', 'bots', 'integrations']
            }
        };
    }

    /**
     * ✅ INICIALIZACIJA VALIDACIJSKIH PRAVIL
     */
    initializeValidationRules() {
        return {
            url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^(\+386|0)\d{8,9}$/,
            username: /^[a-zA-Z0-9._-]{3,30}$/
        };
    }

    /**
     * ➕ DODAJ DRUŽABNO OMREŽJE
     */
    async addSocialMedia(objectId, platform, value, options = {}) {
        try {
            const platformData = this.socialPlatforms[platform];
            if (!platformData) {
                throw new Error(`Nepoznana platforma: ${platform}`);
            }

            // Validiraj vrednost
            const isValid = this.validateSocialMediaValue(platform, value);
            if (!isValid) {
                throw new Error(`Neveljavna vrednost za ${platformData.name}: ${value}`);
            }

            // Pripravi podatke
            const socialMediaData = {
                platform,
                platformName: platformData.name,
                value: this.formatSocialMediaValue(platform, value),
                url: this.generateSocialMediaUrl(platform, value),
                icon: platformData.icon,
                color: platformData.color,
                verified: options.verified || false,
                primary: options.primary || false,
                active: options.active !== false,
                addedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                analytics: {
                    followers: options.followers || 0,
                    engagement: options.engagement || 0,
                    lastChecked: new Date().toISOString()
                }
            };

            // Shrani v bazo podatkov
            await this.saveSocialMediaData(objectId, socialMediaData);

            return socialMediaData;

        } catch (error) {
            console.error('Napaka pri dodajanju družabnega omrežja:', error);
            throw error;
        }
    }

    /**
     * ✅ VALIDIRAJ VREDNOST DRUŽABNEGA OMREŽJA
     */
    validateSocialMediaValue(platform, value) {
        const platformData = this.socialPlatforms[platform];
        if (!platformData || !platformData.validation) {
            return false;
        }

        return platformData.validation.test(value);
    }

    /**
     * 🔧 FORMATIRAJ VREDNOST DRUŽABNEGA OMREŽJA
     */
    formatSocialMediaValue(platform, value) {
        switch (platform) {
            case 'whatsapp':
            case 'viber':
                // Formatiraj telefonsko številko
                return value.replace(/\s+/g, '').replace(/^0/, '+386');
            
            case 'telegram':
                // Dodaj @ če ni prisoten
                return value.startsWith('@') ? value : `@${value}`;
            
            case 'facebook':
            case 'instagram':
            case 'twitter':
                // Odstrani URL in obdrži samo uporabniško ime
                const match = value.match(/\/([^\/]+)\/?$/);
                return match ? match[1] : value;
            
            default:
                return value;
        }
    }

    /**
     * 🔗 GENERIRAJ URL DRUŽABNEGA OMREŽJA
     */
    generateSocialMediaUrl(platform, value) {
        const platformData = this.socialPlatforms[platform];
        const formattedValue = this.formatSocialMediaValue(platform, value);

        switch (platform) {
            case 'whatsapp':
                return `${platformData.baseUrl}${formattedValue.replace('+', '')}`;
            
            case 'telegram':
                return `${platformData.baseUrl}${formattedValue.replace('@', '')}`;
            
            case 'viber':
                return `${platformData.baseUrl}${formattedValue.replace('+', '')}`;
            
            case 'skype':
                return `${platformData.baseUrl}${formattedValue}?chat`;
            
            case 'messenger':
                return `${platformData.baseUrl}${formattedValue}`;
            
            default:
                return `${platformData.baseUrl}${formattedValue}`;
        }
    }

    /**
     * 📊 PRIDOBI ANALITIKO DRUŽABNIH OMREŽIJ
     */
    async getSocialMediaAnalytics(objectId, platform = null) {
        try {
            const cacheKey = `${objectId}_${platform || 'all'}`;
            
            if (this.analyticsCache.has(cacheKey)) {
                return this.analyticsCache.get(cacheKey);
            }

            const socialMediaData = await this.loadSocialMediaData(objectId);
            let analytics = {};

            if (platform) {
                // Analitika za specifično platformo
                const platformData = socialMediaData.find(sm => sm.platform === platform);
                if (platformData) {
                    analytics = await this.fetchPlatformAnalytics(platform, platformData.value);
                }
            } else {
                // Skupna analitika za vse platforme
                analytics = {
                    totalPlatforms: socialMediaData.length,
                    totalFollowers: 0,
                    averageEngagement: 0,
                    mostPopularPlatform: null,
                    platforms: {}
                };

                for (const sm of socialMediaData) {
                    const platformAnalytics = await this.fetchPlatformAnalytics(sm.platform, sm.value);
                    analytics.platforms[sm.platform] = platformAnalytics;
                    analytics.totalFollowers += platformAnalytics.followers || 0;
                }

                if (socialMediaData.length > 0) {
                    analytics.averageEngagement = Object.values(analytics.platforms)
                        .reduce((sum, p) => sum + (p.engagement || 0), 0) / socialMediaData.length;
                    
                    analytics.mostPopularPlatform = Object.entries(analytics.platforms)
                        .sort(([,a], [,b]) => (b.followers || 0) - (a.followers || 0))[0]?.[0];
                }
            }

            this.analyticsCache.set(cacheKey, analytics);
            return analytics;

        } catch (error) {
            console.error('Napaka pri pridobivanju analitike:', error);
            return null;
        }
    }

    /**
     * 📈 PRIDOBI ANALITIKO PLATFORME
     */
    async fetchPlatformAnalytics(platform, value) {
        // Simulacija pridobivanja analitike iz API-jev platform
        return {
            followers: Math.floor(Math.random() * 10000) + 100,
            engagement: Math.random() * 10,
            posts: Math.floor(Math.random() * 500) + 10,
            lastPost: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            verified: Math.random() > 0.8,
            businessAccount: Math.random() > 0.6
        };
    }

    /**
     * 🔄 POSODOBI DRUŽABNO OMREŽJE
     */
    async updateSocialMedia(objectId, platform, newValue, options = {}) {
        try {
            const socialMediaData = await this.loadSocialMediaData(objectId);
            const existingIndex = socialMediaData.findIndex(sm => sm.platform === platform);

            if (existingIndex === -1) {
                throw new Error(`Družabno omrežje ${platform} ni najdeno`);
            }

            // Validiraj novo vrednost
            const isValid = this.validateSocialMediaValue(platform, newValue);
            if (!isValid) {
                throw new Error(`Neveljavna vrednost za ${platform}: ${newValue}`);
            }

            // Posodobi podatke
            socialMediaData[existingIndex] = {
                ...socialMediaData[existingIndex],
                value: this.formatSocialMediaValue(platform, newValue),
                url: this.generateSocialMediaUrl(platform, newValue),
                lastUpdated: new Date().toISOString(),
                ...options
            };

            await this.saveSocialMediaData(objectId, socialMediaData[existingIndex]);
            return socialMediaData[existingIndex];

        } catch (error) {
            console.error('Napaka pri posodabljanju družabnega omrežja:', error);
            throw error;
        }
    }

    /**
     * 🗑️ ODSTRANI DRUŽABNO OMREŽJE
     */
    async removeSocialMedia(objectId, platform) {
        try {
            const socialMediaData = await this.loadSocialMediaData(objectId);
            const filteredData = socialMediaData.filter(sm => sm.platform !== platform);

            if (filteredData.length === socialMediaData.length) {
                throw new Error(`Družabno omrežje ${platform} ni najdeno`);
            }

            await this.saveAllSocialMediaData(objectId, filteredData);
            return true;

        } catch (error) {
            console.error('Napaka pri odstranjevanju družabnega omrežja:', error);
            throw error;
        }
    }

    /**
     * 📋 PRIDOBI VSA DRUŽABNA OMREŽJA
     */
    async getAllSocialMedia(objectId) {
        try {
            return await this.loadSocialMediaData(objectId);
        } catch (error) {
            console.error('Napaka pri pridobivanju družabnih omrežij:', error);
            return [];
        }
    }

    /**
     * 🎯 PRIDOBI PRIPOROČILA ZA DRUŽABNA OMREŽJA
     */
    async getSocialMediaRecommendations(objectType, targetAudience = 'general') {
        const recommendations = {
            hotel: ['facebook', 'instagram', 'tripadvisor', 'booking', 'google_business'],
            restaurant: ['facebook', 'instagram', 'tripadvisor', 'google_business', 'whatsapp'],
            spa: ['facebook', 'instagram', 'youtube', 'pinterest', 'google_business'],
            adventure_park: ['facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp'],
            museum: ['facebook', 'instagram', 'twitter', 'youtube', 'google_business'],
            default: ['facebook', 'instagram', 'google_business', 'whatsapp']
        };

        return recommendations[objectType] || recommendations.default;
    }

    /**
     * 💾 SHRANI PODATKE DRUŽABNEGA OMREŽJA
     */
    async saveSocialMediaData(objectId, socialMediaData) {
        try {
            const socialDir = path.join(__dirname, '../data/social_media');
            await fs.mkdir(socialDir, { recursive: true });
            
            const filePath = path.join(socialDir, `${objectId}.json`);
            
            // Naloži obstoječe podatke
            let existingData = [];
            try {
                const existing = await fs.readFile(filePath, 'utf8');
                existingData = JSON.parse(existing);
            } catch (error) {
                // Datoteka ne obstaja, ustvari novo
            }

            // Posodobi ali dodaj novo
            const existingIndex = existingData.findIndex(sm => sm.platform === socialMediaData.platform);
            if (existingIndex >= 0) {
                existingData[existingIndex] = socialMediaData;
            } else {
                existingData.push(socialMediaData);
            }

            await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
            return true;

        } catch (error) {
            console.error('Napaka pri shranjevanju podatkov družabnega omrežja:', error);
            return false;
        }
    }

    /**
     * 💾 SHRANI VSE PODATKE DRUŽABNIH OMREŽIJ
     */
    async saveAllSocialMediaData(objectId, socialMediaArray) {
        try {
            const socialDir = path.join(__dirname, '../data/social_media');
            await fs.mkdir(socialDir, { recursive: true });
            
            const filePath = path.join(socialDir, `${objectId}.json`);
            await fs.writeFile(filePath, JSON.stringify(socialMediaArray, null, 2));
            
            return true;
        } catch (error) {
            console.error('Napaka pri shranjevanju vseh podatkov družabnih omrežij:', error);
            return false;
        }
    }

    /**
     * 📖 NALOŽI PODATKE DRUŽABNIH OMREŽIJ
     */
    async loadSocialMediaData(objectId) {
        try {
            const filePath = path.join(__dirname, '../data/social_media', `${objectId}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Datoteka ne obstaja ali je napaka pri branju
            return [];
        }
    }

    /**
     * 🔍 ISKANJE PO DRUŽABNIH OMREŽJIH
     */
    async searchBySocialMedia(platform, query) {
        try {
            // Implementacija iskanja objektov po družabnih omrežjih
            const results = [];
            
            // Simulacija iskanja
            for (let i = 0; i < 10; i++) {
                results.push({
                    objectId: `obj_${i}`,
                    platform,
                    value: `${query}_${i}`,
                    followers: Math.floor(Math.random() * 10000),
                    verified: Math.random() > 0.7
                });
            }
            
            return results;
            
        } catch (error) {
            console.error('Napaka pri iskanju po družabnih omrežjih:', error);
            return [];
        }
    }
}

module.exports = SocialMediaProcessor;