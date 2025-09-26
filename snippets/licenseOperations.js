/**
 * Ready-to-use Code Snippets for License Operations
 * Omniscient AI Platform - License Management
 * 
 * These snippets provide quick, copy-paste solutions for common license operations
 */

const { ObjectId } = require('mongodb');

// Lokalna definicija colorLog funkcije
const colorLog = (message, color = 'white') => {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[color] || colors.white}${message}${colors.reset}`);
};

/**
 * 🔹 1. CREATE NEW LICENSE
 * Quick snippet to create a new license with all required fields
 */
const createLicenseSnippet = {
    name: 'Create New License',
    description: 'Creates a new license with validation and default values',
    code: `
async function createNewLicense(licenseData) {
    try {
        const newLicense = {
            licenseKey: generateLicenseKey(),
            userId: licenseData.userId || new ObjectId(),
            productId: licenseData.productId || 'omniscient-ai-basic',
            licenseType: licenseData.licenseType || 'standard',
            status: 'active',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
            maxActivations: licenseData.maxActivations || 1,
            currentActivations: 0,
            features: licenseData.features || ['basic-ai', 'standard-support'],
            metadata: {
                createdBy: licenseData.createdBy || 'system',
                source: licenseData.source || 'manual',
                version: '2.0.0'
            }
        };

        const result = await db.collection('licenses').insertOne(newLicense);
        colorLog(\`✅ License created: \${newLicense.licenseKey}\`, 'green');
        
        return {
            success: true,
            licenseId: result.insertedId,
            licenseKey: newLicense.licenseKey,
            license: newLicense
        };
    } catch (error) {
        colorLog(\`❌ Error creating license: \${error.message}\`, 'red');
        return { success: false, error: error.message };
    }
}

// Helper function to generate license key
function generateLicenseKey() {
    const prefix = 'OAI';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return \`\${prefix}-\${timestamp}-\${random}\`;
}
    `,
    usage: `
// Usage example:
const licenseData = {
    userId: new ObjectId('...'),
    productId: 'omniscient-ai-premium',
    licenseType: 'premium',
    maxActivations: 3,
    features: ['advanced-ai', 'priority-support', 'custom-models']
};

const result = await createNewLicense(licenseData);
if (result.success) {
    console.log('License Key:', result.licenseKey);
}
    `
};

/**
 * 🔹 2. EXTEND LICENSE EXPIRY
 * Batch operation to extend multiple licenses
 */
const extendLicenseSnippet = {
    name: 'Extend License Expiry',
    description: 'Extends license expiry date with batch support',
    code: `
async function extendLicenses(licenseIds, extensionMonths = 12) {
    try {
        const extensionMs = extensionMonths * 30 * 24 * 60 * 60 * 1000;
        
        // Convert string IDs to ObjectIds if needed
        const objectIds = licenseIds.map(id => 
            typeof id === 'string' ? new ObjectId(id) : id
        );
        
        const result = await db.collection('licenses').updateMany(
            { 
                _id: { $in: objectIds },
                status: { $in: ['active', 'expired'] }
            },
            {
                $set: {
                    expiresAt: new Date(Date.now() + extensionMs),
                    status: 'active',
                    lastModified: new Date()
                },
                $push: {
                    history: {
                        action: 'extended',
                        extensionMonths: extensionMonths,
                        timestamp: new Date(),
                        performedBy: 'system'
                    }
                }
            }
        );
        
        colorLog(\`✅ Extended \${result.modifiedCount} licenses by \${extensionMonths} months\`, 'green');
        
        return {
            success: true,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        };
    } catch (error) {
        colorLog(\`❌ Error extending licenses: \${error.message}\`, 'red');
        return { success: false, error: error.message };
    }
}
    `,
    usage: `
// Usage examples:
// Extend single license
await extendLicenses(['license_id_1'], 6); // 6 months

// Extend multiple licenses
await extendLicenses(['id1', 'id2', 'id3'], 12); // 1 year

// Extend all active licenses for a user
const userLicenses = await db.collection('licenses')
    .find({ userId: new ObjectId('user_id'), status: 'active' })
    .project({ _id: 1 })
    .toArray();
const licenseIds = userLicenses.map(l => l._id);
await extendLicenses(licenseIds, 3); // 3 months
    `
};

/**
 * 🔹 3. CANCEL/REVOKE LICENSE
 * Safe license cancellation with cleanup
 */
const cancelLicenseSnippet = {
    name: 'Cancel/Revoke License',
    description: 'Safely cancels licenses with proper cleanup and notifications',
    code: `
async function cancelLicenses(licenseIds, reason = 'manual_cancellation') {
    try {
        const objectIds = licenseIds.map(id => 
            typeof id === 'string' ? new ObjectId(id) : id
        );
        
        // Get licenses before cancellation for cleanup
        const licensesToCancel = await db.collection('licenses')
            .find({ _id: { $in: objectIds } })
            .toArray();
        
        // Update licenses to cancelled status
        const result = await db.collection('licenses').updateMany(
            { _id: { $in: objectIds } },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelReason: reason,
                    lastModified: new Date()
                },
                $push: {
                    history: {
                        action: 'cancelled',
                        reason: reason,
                        timestamp: new Date(),
                        performedBy: 'system'
                    }
                }
            }
        );
        
        // Cleanup active sessions for cancelled licenses
        for (const license of licensesToCancel) {
            await cleanupLicenseSessions(license.licenseKey);
        }
        
        colorLog(\`✅ Cancelled \${result.modifiedCount} licenses\`, 'green');
        
        return {
            success: true,
            cancelledCount: result.modifiedCount,
            cleanedSessions: licensesToCancel.length
        };
    } catch (error) {
        colorLog(\`❌ Error cancelling licenses: \${error.message}\`, 'red');
        return { success: false, error: error.message };
    }
}

// Helper function to cleanup sessions
async function cleanupLicenseSessions(licenseKey) {
    try {
        // Remove from active sessions
        await db.collection('active_sessions').deleteMany({ licenseKey });
        
        // Clear Redis cache if available
        if (redisClient && redisClient.connected) {
            await redisClient.del(\`license:\${licenseKey}\`);
            await redisClient.del(\`sessions:\${licenseKey}\`);
        }
        
        colorLog(\`🧹 Cleaned up sessions for license: \${licenseKey}\`, 'cyan');
    } catch (error) {
        colorLog(\`⚠️ Error cleaning sessions for \${licenseKey}: \${error.message}\`, 'yellow');
    }
}
    `,
    usage: `
// Usage examples:
// Cancel single license
await cancelLicenses(['license_id'], 'user_request');

// Cancel multiple licenses
await cancelLicenses(['id1', 'id2'], 'payment_failed');

// Cancel all expired licenses
const expiredLicenses = await db.collection('licenses')
    .find({ 
        expiresAt: { $lt: new Date() },
        status: 'active'
    })
    .project({ _id: 1 })
    .toArray();
await cancelLicenses(expiredLicenses.map(l => l._id), 'expired');
    `
};

/**
 * 🔹 4. ACTIVATE LICENSE
 * License activation with device tracking
 */
const activateLicenseSnippet = {
    name: 'Activate License',
    description: 'Activates license with device tracking and validation',
    code: `
async function activateLicense(licenseKey, deviceInfo = {}) {
    try {
        // Find the license
        const license = await db.collection('licenses').findOne({ 
            licenseKey: licenseKey,
            status: 'active',
            expiresAt: { $gt: new Date() }
        });
        
        if (!license) {
            return { 
                success: false, 
                error: 'License not found or expired' 
            };
        }
        
        // Check activation limits
        if (license.currentActivations >= license.maxActivations) {
            return { 
                success: false, 
                error: 'Maximum activations reached' 
            };
        }
        
        // Create activation record
        const activation = {
            _id: new ObjectId(),
            licenseId: license._id,
            licenseKey: licenseKey,
            deviceId: deviceInfo.deviceId || generateDeviceId(),
            deviceName: deviceInfo.deviceName || 'Unknown Device',
            platform: deviceInfo.platform || 'Unknown',
            ipAddress: deviceInfo.ipAddress || '0.0.0.0',
            userAgent: deviceInfo.userAgent || 'Unknown',
            activatedAt: new Date(),
            lastSeen: new Date(),
            status: 'active'
        };
        
        // Insert activation and update license
        await db.collection('activations').insertOne(activation);
        
        await db.collection('licenses').updateOne(
            { _id: license._id },
            {
                $inc: { currentActivations: 1 },
                $set: { lastActivated: new Date() },
                $push: {
                    history: {
                        action: 'activated',
                        deviceId: activation.deviceId,
                        timestamp: new Date()
                    }
                }
            }
        );
        
        colorLog(\`✅ License activated: \${licenseKey} on \${activation.deviceName}\`, 'green');
        
        return {
            success: true,
            activationId: activation._id,
            deviceId: activation.deviceId,
            expiresAt: license.expiresAt,
            features: license.features
        };
    } catch (error) {
        colorLog(\`❌ Error activating license: \${error.message}\`, 'red');
        return { success: false, error: error.message };
    }
}

// Helper function to generate device ID
function generateDeviceId() {
    return 'device_' + Math.random().toString(36).substr(2, 16);
}
    `,
    usage: `
// Usage examples:
const deviceInfo = {
    deviceId: 'user-laptop-001',
    deviceName: 'John\\'s MacBook Pro',
    platform: 'macOS',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
};

const result = await activateLicense('OAI-LICENSE-KEY', deviceInfo);
if (result.success) {
    console.log('Activation ID:', result.activationId);
    console.log('Device ID:', result.deviceId);
}
    `
};

/**
 * 🔹 5. LICENSE STATISTICS
 * Comprehensive license analytics
 */
const licenseStatsSnippet = {
    name: 'License Statistics',
    description: 'Generate comprehensive license statistics and analytics',
    code: `
async function getLicenseStatistics(filters = {}) {
    try {
        const pipeline = [
            // Match filters
            { $match: filters },
            
            // Group by status and calculate metrics
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalActivations: { $sum: '$currentActivations' },
                    avgActivations: { $avg: '$currentActivations' },
                    licenses: { $push: '$$ROOT' }
                }
            },
            
            // Sort by count
            { $sort: { count: -1 } }
        ];
        
        const statusStats = await db.collection('licenses').aggregate(pipeline).toArray();
        
        // Overall statistics
        const totalLicenses = await db.collection('licenses').countDocuments(filters);
        const activeLicenses = await db.collection('licenses').countDocuments({
            ...filters,
            status: 'active',
            expiresAt: { $gt: new Date() }
        });
        const expiredLicenses = await db.collection('licenses').countDocuments({
            ...filters,
            $or: [
                { status: 'expired' },
                { expiresAt: { $lt: new Date() } }
            ]
        });
        
        // Revenue calculation (if price field exists)
        const revenueStats = await db.collection('licenses').aggregate([
            { $match: { ...filters, price: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$price' },
                    avgPrice: { $avg: '$price' },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        
        // License type distribution
        const typeDistribution = await db.collection('licenses').aggregate([
            { $match: filters },
            {
                $group: {
                    _id: '$licenseType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();
        
        const stats = {
            overview: {
                total: totalLicenses,
                active: activeLicenses,
                expired: expiredLicenses,
                cancelled: totalLicenses - activeLicenses - expiredLicenses
            },
            byStatus: statusStats,
            byType: typeDistribution,
            revenue: revenueStats[0] || { totalRevenue: 0, avgPrice: 0, count: 0 },
            generatedAt: new Date()
        };
        
        colorLog(\`📊 Generated statistics for \${totalLicenses} licenses\`, 'blue');
        return { success: true, stats };
        
    } catch (error) {
        colorLog(\`❌ Error generating statistics: \${error.message}\`, 'red');
        return { success: false, error: error.message };
    }
}
    `,
    usage: `
// Usage examples:
// All licenses
const allStats = await getLicenseStatistics();

// Licenses for specific user
const userStats = await getLicenseStatistics({ 
    userId: new ObjectId('user_id') 
});

// Licenses created in last 30 days
const recentStats = await getLicenseStatistics({
    createdAt: { 
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
    }
});

// Premium licenses only
const premiumStats = await getLicenseStatistics({ 
    licenseType: 'premium' 
});
    `
};

/**
 * 🔹 6. BULK LICENSE OPERATIONS
 * Efficient bulk operations for multiple licenses
 */
const bulkOperationsSnippet = {
    name: 'Bulk License Operations',
    description: 'Efficient bulk operations for managing multiple licenses',
    code: `
async function bulkLicenseOperations(operations) {
    try {
        const bulkOps = [];
        const results = {
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };
        
        for (const operation of operations) {
            try {
                switch (operation.type) {
                    case 'create':
                        bulkOps.push({
                            insertOne: {
                                document: {
                                    ...operation.data,
                                    licenseKey: generateLicenseKey(),
                                    createdAt: new Date(),
                                    status: 'active'
                                }
                            }
                        });
                        break;
                        
                    case 'update':
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: new ObjectId(operation.id) },
                                update: {
                                    $set: {
                                        ...operation.data,
                                        lastModified: new Date()
                                    }
                                }
                            }
                        });
                        break;
                        
                    case 'delete':
                        bulkOps.push({
                            deleteOne: {
                                filter: { _id: new ObjectId(operation.id) }
                            }
                        });
                        break;
                        
                    case 'extend':
                        const extensionMs = (operation.months || 12) * 30 * 24 * 60 * 60 * 1000;
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: new ObjectId(operation.id) },
                                update: {
                                    $set: {
                                        expiresAt: new Date(Date.now() + extensionMs),
                                        lastModified: new Date()
                                    }
                                }
                            }
                        });
                        break;
                }
            } catch (opError) {
                results.errors.push({
                    operation: operation,
                    error: opError.message
                });
            }
        }
        
        if (bulkOps.length > 0) {
            const bulkResult = await db.collection('licenses').bulkWrite(bulkOps, {
                ordered: false // Continue on errors
            });
            
            results.created = bulkResult.insertedCount || 0;
            results.updated = bulkResult.modifiedCount || 0;
            results.deleted = bulkResult.deletedCount || 0;
        }
        
        colorLog(\`✅ Bulk operations completed: \${results.created} created, \${results.updated} updated, \${results.deleted} deleted\`, 'green');
        
        if (results.errors.length > 0) {
            colorLog(\`⚠️ \${results.errors.length} operations failed\`, 'yellow');
        }
        
        return { success: true, results };
        
    } catch (error) {
        colorLog(\`❌ Bulk operations failed: \${error.message}\`, 'red');
        return { success: false, error: error.message };
    }
}
    `,
    usage: `
// Usage example:
const operations = [
    {
        type: 'create',
        data: {
            userId: new ObjectId('user1'),
            licenseType: 'premium',
            maxActivations: 3
        }
    },
    {
        type: 'update',
        id: 'license_id_1',
        data: {
            status: 'active',
            maxActivations: 5
        }
    },
    {
        type: 'extend',
        id: 'license_id_2',
        months: 6
    },
    {
        type: 'delete',
        id: 'license_id_3'
    }
];

const result = await bulkLicenseOperations(operations);
console.log('Results:', result.results);
    `
};

/**
 * 🔹 7. LICENSE VALIDATION
 * Comprehensive license validation
 */
const validateLicenseSnippet = {
    name: 'Validate License',
    description: 'Comprehensive license validation with detailed checks',
    code: `
async function validateLicense(licenseKey, deviceId = null) {
    try {
        const validation = {
            isValid: false,
            license: null,
            errors: [],
            warnings: [],
            details: {}
        };
        
        // Find license
        const license = await db.collection('licenses').findOne({ licenseKey });
        
        if (!license) {
            validation.errors.push('License not found');
            return validation;
        }
        
        validation.license = license;
        validation.details.licenseId = license._id;
        validation.details.licenseType = license.licenseType;
        
        // Check status
        if (license.status !== 'active') {
            validation.errors.push(\`License status is \${license.status}\`);
        }
        
        // Check expiry
        if (license.expiresAt && new Date() > license.expiresAt) {
            validation.errors.push('License has expired');
            validation.details.expiredSince = new Date() - license.expiresAt;
        }
        
        // Check activation limits
        if (license.currentActivations >= license.maxActivations) {
            if (deviceId) {
                // Check if this device is already activated
                const existingActivation = await db.collection('activations').findOne({
                    licenseKey: licenseKey,
                    deviceId: deviceId,
                    status: 'active'
                });
                
                if (!existingActivation) {
                    validation.errors.push('Maximum activations reached');
                } else {
                    validation.details.existingActivation = existingActivation._id;
                }
            } else {
                validation.warnings.push('Maximum activations reached');
            }
        }
        
        // Check for suspension
        if (license.suspended) {
            validation.errors.push(\`License suspended: \${license.suspensionReason || 'No reason provided'}\`);
        }
        
        // Feature validation
        validation.details.features = license.features || [];
        validation.details.maxActivations = license.maxActivations;
        validation.details.currentActivations = license.currentActivations;
        validation.details.expiresAt = license.expiresAt;
        
        // Set validity
        validation.isValid = validation.errors.length === 0;
        
        if (validation.isValid) {
            // Update last validated timestamp
            await db.collection('licenses').updateOne(
                { _id: license._id },
                { $set: { lastValidated: new Date() } }
            );
            
            colorLog(\`✅ License validated: \${licenseKey}\`, 'green');
        } else {
            colorLog(\`❌ License validation failed: \${licenseKey} - \${validation.errors.join(', ')}\`, 'red');
        }
        
        return validation;
        
    } catch (error) {
        colorLog(\`❌ Error validating license: \${error.message}\`, 'red');
        return {
            isValid: false,
            errors: [error.message],
            warnings: [],
            details: {}
        };
    }
}
    `,
    usage: `
// Usage examples:
// Basic validation
const validation = await validateLicense('OAI-LICENSE-KEY');
if (validation.isValid) {
    console.log('License is valid');
    console.log('Features:', validation.details.features);
}

// Validation with device check
const deviceValidation = await validateLicense('OAI-LICENSE-KEY', 'device-123');
if (!deviceValidation.isValid) {
    console.log('Errors:', deviceValidation.errors);
    console.log('Warnings:', deviceValidation.warnings);
}
    `
};

// Export all snippets
const licenseSnippets = {
    createLicense: createLicenseSnippet,
    extendLicense: extendLicenseSnippet,
    cancelLicense: cancelLicenseSnippet,
    activateLicense: activateLicenseSnippet,
    licenseStats: licenseStatsSnippet,
    bulkOperations: bulkOperationsSnippet,
    validateLicense: validateLicenseSnippet
};

// Utility function to get all snippets
function getAllSnippets() {
    return Object.values(licenseSnippets);
}

// Utility function to get snippet by name
function getSnippet(name) {
    return licenseSnippets[name] || null;
}

// Utility function to search snippets
function searchSnippets(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const [key, snippet] of Object.entries(licenseSnippets)) {
        if (
            snippet.name.toLowerCase().includes(searchTerm) ||
            snippet.description.toLowerCase().includes(searchTerm) ||
            snippet.code.toLowerCase().includes(searchTerm)
        ) {
            results.push({ key, ...snippet });
        }
    }
    
    return results;
}

// Display all available snippets
function displaySnippets() {
    colorLog('📝 Available License Operation Snippets:', 'blue');
    
    Object.entries(licenseSnippets).forEach(([key, snippet], index) => {
        colorLog(\`\${index + 1}. \${snippet.name}\`, 'green');
        colorLog(\`   \${snippet.description}\`, 'cyan');
        console.log('');
    });
}

module.exports = {
    licenseSnippets,
    getAllSnippets,
    getSnippet,
    searchSnippets,
    displaySnippets,
    
    // Direct exports for convenience
    ...licenseSnippets
};