// 🌟 Omni AI Platform - User Model
// Upravljanje uporabnikov, vlog in avtentikacije

const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

class User {
    constructor(db) {
        this.db = db;
        this.collection = db.collection('users');
        this.initializeIndexes();
    }

    async initializeIndexes() {
        try {
            // Ustvari indekse za optimalno performanco
            await this.collection.createIndex({ email: 1 }, { unique: true });
            await this.collection.createIndex({ username: 1 }, { unique: true });
            await this.collection.createIndex({ role: 1 });
            await this.collection.createIndex({ status: 1 });
            await this.collection.createIndex({ createdAt: 1 });
            console.log('✅ User model indeksi uspešno ustvarjeni');
        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju User indeksov:', error);
        }
    }

    // Ustvari novega uporabnika
    async createUser(userData) {
        try {
            const { username, email, password, role = 'client', profile = {} } = userData;

            // Preveri, če uporabnik že obstaja
            const existingUser = await this.collection.findOne({
                $or: [{ email }, { username }]
            });

            if (existingUser) {
                throw new Error('Uporabnik s tem email-om ali uporabniškim imenom že obstaja');
            }

            // Hashiraj geslo
            const hashedPassword = await bcrypt.hash(password, 12);

            const newUser = {
                username,
                email,
                password: hashedPassword,
                role, // admin, client, guest
                status: 'active', // active, inactive, suspended
                profile: {
                    firstName: profile.firstName || '',
                    lastName: profile.lastName || '',
                    phone: profile.phone || '',
                    company: profile.company || '',
                    avatar: profile.avatar || '',
                    preferences: profile.preferences || {}
                },
                permissions: this.getDefaultPermissions(role),
                licenseInfo: {
                    plan: 'free',
                    expiresAt: null,
                    features: []
                },
                loginHistory: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: null
            };

            const result = await this.collection.insertOne(newUser);
            return { success: true, userId: result.insertedId, user: newUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Avtenticiraj uporabnika
    async authenticateUser(email, password) {
        try {
            const user = await this.collection.findOne({ 
                email, 
                status: 'active' 
            });

            if (!user) {
                return { success: false, error: 'Napačni podatki za prijavo' };
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return { success: false, error: 'Napačni podatki za prijavo' };
            }

            // Posodobi zadnjo prijavo
            await this.collection.updateOne(
                { _id: user._id },
                { 
                    $set: { lastLoginAt: new Date() },
                    $push: { 
                        loginHistory: { 
                            timestamp: new Date(),
                            ip: null // To bo dodano v middleware
                        }
                    }
                }
            );

            // Vrni uporabnika brez gesla
            const { password: _, ...userWithoutPassword } = user;
            return { success: true, user: userWithoutPassword };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Pridobi uporabnika po ID
    async getUserById(userId) {
        try {
            const user = await this.collection.findOne(
                { _id: new ObjectId(userId) },
                { projection: { password: 0 } }
            );
            return user;
        } catch (error) {
            console.error('Napaka pri pridobivanju uporabnika:', error);
            return null;
        }
    }

    // Posodobi uporabnika
    async updateUser(userId, updateData) {
        try {
            const { password, ...otherData } = updateData;
            let updateFields = { ...otherData, updatedAt: new Date() };

            // Če se posodablja geslo, ga hashiraj
            if (password) {
                updateFields.password = await bcrypt.hash(password, 12);
            }

            const result = await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: updateFields }
            );

            return { success: result.modifiedCount > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Pridobi vse uporabnike (admin funkcija)
    async getAllUsers(filters = {}, pagination = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const skip = (page - 1) * limit;

            const query = {};
            if (filters.role) query.role = filters.role;
            if (filters.status) query.status = filters.status;
            if (filters.search) {
                query.$or = [
                    { username: { $regex: filters.search, $options: 'i' } },
                    { email: { $regex: filters.search, $options: 'i' } },
                    { 'profile.firstName': { $regex: filters.search, $options: 'i' } },
                    { 'profile.lastName': { $regex: filters.search, $options: 'i' } }
                ];
            }

            const users = await this.collection
                .find(query, { projection: { password: 0 } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            const total = await this.collection.countDocuments(query);

            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Napaka pri pridobivanju uporabnikov:', error);
            return { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
        }
    }

    // Izbriši uporabnika
    async deleteUser(userId) {
        try {
            const result = await this.collection.deleteOne({ _id: new ObjectId(userId) });
            return { success: result.deletedCount > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Spremeni vlogo uporabnika
    async changeUserRole(userId, newRole) {
        try {
            const permissions = this.getDefaultPermissions(newRole);
            const result = await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        role: newRole, 
                        permissions,
                        updatedAt: new Date() 
                    } 
                }
            );
            return { success: result.modifiedCount > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Posodobi licenčne informacije
    async updateLicenseInfo(userId, licenseInfo) {
        try {
            const result = await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        licenseInfo,
                        updatedAt: new Date() 
                    } 
                }
            );
            return { success: result.modifiedCount > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Pridobi privzete pravice glede na vlogo
    getDefaultPermissions(role) {
        const permissions = {
            admin: [
                'user.create', 'user.read', 'user.update', 'user.delete',
                'license.create', 'license.read', 'license.update', 'license.delete',
                'module.all', 'system.admin', 'analytics.full'
            ],
            client: [
                'user.read.own', 'user.update.own',
                'license.read.own', 'module.tourism', 'module.camp',
                'module.ecommerce', 'analytics.basic'
            ],
            guest: [
                'user.read.own', 'module.public'
            ]
        };

        return permissions[role] || permissions.guest;
    }

    // Preveri pravice uporabnika
    async hasPermission(userId, permission) {
        try {
            const user = await this.getUserById(userId);
            if (!user) return false;
            
            return user.permissions.includes(permission) || 
                   user.permissions.includes('system.admin');
        } catch (error) {
            return false;
        }
    }

    // Statistike uporabnikov
    async getUserStats() {
        try {
            const stats = await this.collection.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const totalUsers = await this.collection.countDocuments();
            const activeUsers = await this.collection.countDocuments({ status: 'active' });
            const recentUsers = await this.collection.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });

            return {
                total: totalUsers,
                active: activeUsers,
                recent: recentUsers,
                byRole: stats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error('Napaka pri pridobivanju statistik:', error);
            return { total: 0, active: 0, recent: 0, byRole: {} };
        }
    }
}

module.exports = User;