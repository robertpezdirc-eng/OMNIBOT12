const mongoose = require('mongoose');

class DatabaseConfig {
    constructor() {
        this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni_platform';
        this.options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };
    }

    async connect() {
        try {
            await mongoose.connect(this.connectionString, this.options);
            console.log('✅ MongoDB povezava uspešna');
            
            // Nastavi indekse za optimizacijo
            await this.setupIndexes();
            
            return mongoose.connection;
        } catch (error) {
            console.error('❌ MongoDB povezava neuspešna:', error);
            throw error;
        }
    }

    async setupIndexes() {
        try {
            const db = mongoose.connection.db;
            
            // Indeksi za licenčni sistem
            await db.collection('licenses').createIndex({ license_key: 1 }, { unique: true });
            await db.collection('licenses').createIndex({ client_id: 1 });
            await db.collection('licenses').createIndex({ expires_at: 1 });
            await db.collection('licenses').createIndex({ status: 1 });
            await db.collection('licenses').createIndex({ created_at: -1 }); // Najnovejše najprej
            
            // Compound indeksi za hitrejše poizvedbe
            await db.collection('licenses').createIndex({ client_id: 1, status: 1 });
            await db.collection('licenses').createIndex({ status: 1, expires_at: 1 });
            
            // TTL indeks za demo licence (avtomatsko brisanje po 24 urah)
            await db.collection('demo_licenses').createIndex(
                { created_at: 1 }, 
                { expireAfterSeconds: 24 * 60 * 60 }
            );
            
            // Indeksi za preklicane licence
            await db.collection('revoked_licenses').createIndex({ license_key: 1 }, { unique: true });
            await db.collection('revoked_licenses').createIndex({ revoked_at: 1 });
            
            // Indeksi za uporabniške seje
            await db.collection('sessions').createIndex(
                { expires_at: 1 }, 
                { expireAfterSeconds: 0 }
            );
            await db.collection('sessions').createIndex({ user_id: 1 });
            
            // Indeksi za logiranje
            await db.collection('logs').createIndex({ timestamp: -1 });
            await db.collection('logs').createIndex({ level: 1, timestamp: -1 });
            await db.collection('logs').createIndex(
                { timestamp: 1 }, 
                { expireAfterSeconds: 30 * 24 * 60 * 60 } // Briši po 30 dneh
            );
            
            console.log('✅ MongoDB indeksi nastavljeni');
        } catch (error) {
            console.error('❌ Napaka pri nastavljanju indeksov:', error);
        }
    }

    // Optimizacijske metode za hitrejše poizvedbe
    async findLicensesLean(filter = {}, limit = 100) {
        const db = mongoose.connection.db;
        return await db.collection('licenses')
            .find(filter)
            .limit(limit)
            .sort({ created_at: -1 })
            .toArray();
    }
    
    // Hitro iskanje aktivnih licenc
    async findActiveLicensesLean(clientId) {
        const db = mongoose.connection.db;
        return await db.collection('licenses')
            .find({
                client_id: clientId,
                status: 'active',
                expires_at: { $gt: new Date() }
            })
            .sort({ created_at: -1 })
            .toArray();
    }
    
    // Agregacija za statistike
    async getLicenseStats() {
        const db = mongoose.connection.db;
        return await db.collection('licenses').aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    latest: { $max: '$created_at' }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();
    }
    
    // Čiščenje poteklih licenc
    async cleanupExpiredLicenses() {
        const db = mongoose.connection.db;
        const result = await db.collection('licenses').updateMany(
            {
                status: 'active',
                expires_at: { $lt: new Date() }
            },
            {
                $set: { status: 'expired' },
                $currentDate: { updated_at: true }
            }
        );
        return result.modifiedCount;
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            console.log('✅ MongoDB povezava zaprta');
        } catch (error) {
            console.error('❌ Napaka pri zapiranju MongoDB povezave:', error);
        }
    }
}

// Ustvari instanco
const dbConfig = new DatabaseConfig();

// Export funkcij
const connectDB = () => dbConfig.connect();
const disconnectDB = () => dbConfig.disconnect();
const setupIndexes = () => dbConfig.setupIndexes();
const optimizedQueries = {
    findLicensesLean: (filter, limit) => dbConfig.findLicensesLean(filter, limit),
    findActiveLicensesLean: (clientId) => dbConfig.findActiveLicensesLean(clientId),
    getLicenseStats: () => dbConfig.getLicenseStats(),
    cleanupExpiredLicenses: () => dbConfig.cleanupExpiredLicenses()
};

module.exports = {
    connectDB,
    disconnectDB,
    setupIndexes,
    optimizedQueries,
    dbConfig
};