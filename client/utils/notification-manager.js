/**
 * Notification Manager - upravljanje obvestil na odjemalski strani
 */
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.serverUrl = process.env.USE_HTTPS === 'true' ? 'https://localhost:3000' : 'http://localhost:3000';
        this.clientId = null;
        this.eventListeners = new Map();
        
        // Inicializiraj
        this.init();
    }

    /**
     * Inicializacija
     */
    async init() {
        try {
            // Pridobi client_id iz shranjenih podatkov o licenci
            const licenseData = this.getLicenseData();
            if (licenseData && licenseData.clientId) {
                this.clientId = licenseData.clientId;
                await this.loadNotifications();
                this.startPeriodicCheck();
            }
        } catch (error) {
            console.warn('⚠️ Napaka pri inicializaciji notification manager:', error);
        }
    }

    /**
     * Pridobi podatke o licenci iz localStorage
     */
    getLicenseData() {
        try {
            const data = localStorage.getItem('omni_license_data');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('⚠️ Napaka pri branju podatkov o licenci:', error);
            return null;
        }
    }

    /**
     * Nastavi client ID
     */
    setClientId(clientId) {
        this.clientId = clientId;
        this.loadNotifications();
        this.startPeriodicCheck();
    }

    /**
     * Naloži obvestila s strežnika
     */
    async loadNotifications(options = {}) {
        if (!this.clientId) {
            console.warn('⚠️ Client ID ni nastavljen');
            return;
        }

        try {
            const {
                limit = 20,
                skip = 0,
                unreadOnly = false,
                type = null,
                status = null
            } = options;

            const params = new URLSearchParams({
                limit: limit.toString(),
                skip: skip.toString(),
                unreadOnly: unreadOnly.toString()
            });

            if (type) params.append('type', type);
            if (status) params.append('status', status);

            const response = await fetch(`${this.serverUrl}/api/notifications/${this.clientId}?${params}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                // Za HTTPS z self-signed certifikati
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false
                    })
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.notifications = data.notifications;
                this.emit('notifications-updated', this.notifications);
                
                // Posodobi število neprebranih
                await this.updateUnreadCount();
                
                console.log(`📨 Naloženih ${data.notifications.length} obvestil`);
                return data.notifications;
            } else {
                throw new Error(data.error || 'Napaka pri nalaganju obvestil');
            }

        } catch (error) {
            console.error('❌ Napaka pri nalaganju obvestil:', error);
            return [];
        }
    }

    /**
     * Posodobi število neprebranih obvestil
     */
    async updateUnreadCount() {
        if (!this.clientId) return;

        try {
            const response = await fetch(`${this.serverUrl}/api/notifications/${this.clientId}/unread-count`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false
                    })
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const oldCount = this.unreadCount;
                    this.unreadCount = data.unreadCount;
                    
                    if (oldCount !== this.unreadCount) {
                        this.emit('unread-count-changed', this.unreadCount);
                    }
                }
            }

        } catch (error) {
            console.warn('⚠️ Napaka pri posodabljanju števila neprebranih:', error);
        }
    }

    /**
     * Označi obvestilo kot prebrano
     */
    async markAsRead(notificationId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json'
                },
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false
                    })
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Posodobi lokalno obvestilo
                    const notification = this.notifications.find(n => n._id === notificationId);
                    if (notification) {
                        notification.status = 'read';
                        notification.read_at = new Date().toISOString();
                    }
                    
                    await this.updateUnreadCount();
                    this.emit('notification-read', notificationId);
                    
                    console.log('✅ Obvestilo označeno kot prebrano');
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error('❌ Napaka pri označevanju obvestila:', error);
            return false;
        }
    }

    /**
     * Zavrni obvestilo
     */
    async dismissNotification(notificationId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/notifications/${notificationId}/dismiss`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json'
                },
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false
                    })
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Odstrani iz lokalnega seznama
                    this.notifications = this.notifications.filter(n => n._id !== notificationId);
                    
                    await this.updateUnreadCount();
                    this.emit('notification-dismissed', notificationId);
                    this.emit('notifications-updated', this.notifications);
                    
                    console.log('✅ Obvestilo zavrnjeno');
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error('❌ Napaka pri zavračanju obvestila:', error);
            return false;
        }
    }

    /**
     * Označi vsa obvestila kot prebrana
     */
    async markAllAsRead() {
        if (!this.clientId) return false;

        try {
            const response = await fetch(`${this.serverUrl}/api/notifications/${this.clientId}/mark-all-read`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json'
                },
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false
                    })
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Posodobi vsa lokalna obvestila
                    this.notifications.forEach(notification => {
                        if (!notification.read_at) {
                            notification.status = 'read';
                            notification.read_at = new Date().toISOString();
                        }
                    });
                    
                    this.unreadCount = 0;
                    this.emit('unread-count-changed', 0);
                    this.emit('all-notifications-read');
                    
                    console.log('✅ Vsa obvestila označena kot prebrana');
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error('❌ Napaka pri označevanju vseh obvestil:', error);
            return false;
        }
    }

    /**
     * Pridobi statistike obvestil
     */
    async getStats() {
        if (!this.clientId) return null;

        try {
            const response = await fetch(`${this.serverUrl}/api/notifications/${this.clientId}/stats`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                ...(process.env.USE_HTTPS === 'true' && {
                    agent: new (require('https').Agent)({
                        rejectUnauthorized: false
                    })
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.stats : null;
            }

            return null;

        } catch (error) {
            console.error('❌ Napaka pri pridobivanju statistik:', error);
            return null;
        }
    }

    /**
     * Zaženi periodično preverjanje novih obvestil
     */
    startPeriodicCheck() {
        // Preveri nova obvestila vsakih 5 minut
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(async () => {
            await this.updateUnreadCount();
            
            // Če so nova obvestila, naloži jih
            if (this.unreadCount > 0) {
                await this.loadNotifications({ limit: 10 });
            }
        }, 5 * 60 * 1000); // 5 minut

        console.log('⏰ Periodično preverjanje obvestil zagnano');
    }

    /**
     * Ustavi periodično preverjanje
     */
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏰ Periodično preverjanje obvestil ustavljeno');
        }
    }

    /**
     * Pridobi obvestila po tipu
     */
    getNotificationsByType(type) {
        return this.notifications.filter(n => n.type === type);
    }

    /**
     * Pridobi neprebrana obvestila
     */
    getUnreadNotifications() {
        return this.notifications.filter(n => !n.read_at);
    }

    /**
     * Pridobi kritična obvestila
     */
    getCriticalNotifications() {
        return this.notifications.filter(n => n.priority === 'critical');
    }

    /**
     * Event listener sistem
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Napaka v event listener za ${event}:`, error);
                }
            });
        }
    }

    /**
     * Počisti vire
     */
    destroy() {
        this.stopPeriodicCheck();
        this.eventListeners.clear();
        this.notifications = [];
        this.unreadCount = 0;
        console.log('🧹 Notification manager počiščen');
    }
}

// Izvozi singleton instanco
module.exports = new NotificationManager();