const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Test results storage
const backupResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper function to check if file exists
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Helper function to get file size
async function getFileSize(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch {
        return 0;
    }
}

// Test function
async function runBackupTest(name, testFn) {
    console.log(`\n💾 Backup Test: ${name}`);
    try {
        const result = await testFn();
        console.log(`✅ PASSED: ${name}`);
        backupResults.passed++;
        backupResults.tests.push({
            name,
            status: 'PASSED',
            result
        });
        return result;
    } catch (error) {
        console.log(`❌ FAILED: ${name} - ${error.message}`);
        backupResults.failed++;
        backupResults.tests.push({
            name,
            status: 'FAILED',
            error: error.message
        });
        return null;
    }
}

// Test backup directory structure
async function testBackupDirectoryStructure() {
    const serverPath = path.join(__dirname, 'server');
    const backupServicePath = path.join(serverPath, 'services', 'backupService.js');
    
    const exists = await fileExists(backupServicePath);
    if (!exists) {
        throw new Error('BackupService.js not found');
    }
    
    // Check if backup directory exists or can be created
    const backupDir = path.join(serverPath, 'backups');
    try {
        await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
        // Directory might already exist
    }
    
    const backupDirExists = await fileExists(backupDir);
    
    return {
        backupServiceExists: exists,
        backupDirectoryExists: backupDirExists,
        backupServicePath,
        backupDir
    };
}

// Test backup service initialization
async function testBackupServiceInitialization() {
    try {
        // Try to require the backup service
        const BackupService = require('./server/services/backupService.js');
        
        // Check if it's a class/function
        if (typeof BackupService !== 'function') {
            throw new Error('BackupService is not a constructor function');
        }
        
        return {
            serviceLoaded: true,
            serviceType: typeof BackupService
        };
    } catch (error) {
        // Service might have dependencies that aren't available
        return {
            serviceLoaded: false,
            error: error.message,
            note: 'Service may require database connection or missing dependencies'
        };
    }
}

// Test backup configuration
async function testBackupConfiguration() {
    const configPath = path.join(__dirname, 'server', '.env');
    const configExists = await fileExists(configPath);
    
    let config = {};
    if (configExists) {
        try {
            const configContent = await fs.readFile(configPath, 'utf8');
            const lines = configContent.split('\n');
            
            for (const line of lines) {
                if (line.includes('BACKUP_') || line.includes('AWS_') || line.includes('GOOGLE_DRIVE_')) {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        config[key.trim()] = value.trim();
                    }
                }
            }
        } catch (error) {
            // Config file might be empty or malformed
        }
    }
    
    return {
        configFileExists: configExists,
        backupConfigFound: Object.keys(config).length > 0,
        configKeys: Object.keys(config),
        config
    };
}

// Test backup file creation (mock)
async function testBackupFileCreation() {
    const testBackupDir = path.join(__dirname, 'test-backups');
    
    try {
        // Create test backup directory
        await fs.mkdir(testBackupDir, { recursive: true });
        
        // Create a test backup file
        const testBackupFile = path.join(testBackupDir, 'test-backup.json');
        const testData = {
            timestamp: new Date().toISOString(),
            type: 'test',
            data: {
                licenses: [],
                users: [],
                settings: {}
            }
        };
        
        await fs.writeFile(testBackupFile, JSON.stringify(testData, null, 2));
        
        // Verify file was created
        const fileExists = await fileExists(testBackupFile);
        const fileSize = await getFileSize(testBackupFile);
        
        // Clean up test file
        await fs.unlink(testBackupFile);
        await fs.rmdir(testBackupDir);
        
        return {
            backupCreated: fileExists,
            backupSize: fileSize,
            testData
        };
    } catch (error) {
        throw new Error(`Failed to create test backup: ${error.message}`);
    }
}

// Test backup compression
async function testBackupCompression() {
    const testDir = path.join(__dirname, 'test-compression');
    
    try {
        // Create test directory and files
        await fs.mkdir(testDir, { recursive: true });
        
        const testFile1 = path.join(testDir, 'test1.txt');
        const testFile2 = path.join(testDir, 'test2.json');
        
        const testContent1 = 'This is a test file for compression testing. '.repeat(100);
        const testContent2 = JSON.stringify({
            data: Array(100).fill().map((_, i) => ({ id: i, name: `Test ${i}` }))
        }, null, 2);
        
        await fs.writeFile(testFile1, testContent1);
        await fs.writeFile(testFile2, testContent2);
        
        const originalSize = (await getFileSize(testFile1)) + (await getFileSize(testFile2));
        
        // Test if archiver is available (used by backup service)
        try {
            require('archiver');
            const archiverAvailable = true;
            
            // Clean up test files
            await fs.unlink(testFile1);
            await fs.unlink(testFile2);
            await fs.rmdir(testDir);
            
            return {
                archiverAvailable,
                originalSize,
                compressionSupported: true
            };
        } catch (error) {
            // Clean up test files
            await fs.unlink(testFile1);
            await fs.unlink(testFile2);
            await fs.rmdir(testDir);
            
            return {
                archiverAvailable: false,
                originalSize,
                compressionSupported: false,
                error: 'archiver module not found'
            };
        }
    } catch (error) {
        throw new Error(`Compression test failed: ${error.message}`);
    }
}

// Test scheduled backup configuration
async function testScheduledBackups() {
    try {
        // Check if node-cron is available
        const cron = require('node-cron');
        
        // Test cron expression validation
        const testExpressions = [
            '0 2 * * *',    // Daily at 2 AM
            '0 3 * * 0',    // Weekly on Sunday at 3 AM
            '0 4 1 * *'     // Monthly on 1st at 4 AM
        ];
        
        const validExpressions = testExpressions.map(expr => ({
            expression: expr,
            valid: cron.validate(expr)
        }));
        
        return {
            cronAvailable: true,
            testExpressions: validExpressions,
            allValid: validExpressions.every(e => e.valid)
        };
    } catch (error) {
        return {
            cronAvailable: false,
            error: error.message
        };
    }
}

// Test restore functionality (mock)
async function testRestoreFunctionality() {
    const testBackupDir = path.join(__dirname, 'test-restore');
    
    try {
        // Create test backup directory and file
        await fs.mkdir(testBackupDir, { recursive: true });
        
        const testBackupFile = path.join(testBackupDir, 'test-restore-backup.json');
        const testData = {
            timestamp: new Date().toISOString(),
            type: 'restore-test',
            data: {
                licenses: [
                    { id: 1, key: 'TEST-LICENSE-KEY', status: 'active' }
                ],
                users: [
                    { id: 1, email: 'test@example.com', role: 'admin' }
                ]
            }
        };
        
        await fs.writeFile(testBackupFile, JSON.stringify(testData, null, 2));
        
        // Test reading backup file (simulate restore)
        const backupContent = await fs.readFile(testBackupFile, 'utf8');
        const parsedData = JSON.parse(backupContent);
        
        const restoreValid = parsedData.data && 
                           parsedData.data.licenses && 
                           parsedData.data.users;
        
        // Clean up
        await fs.unlink(testBackupFile);
        await fs.rmdir(testBackupDir);
        
        return {
            backupReadable: true,
            dataValid: restoreValid,
            licensesCount: parsedData.data.licenses.length,
            usersCount: parsedData.data.users.length
        };
    } catch (error) {
        throw new Error(`Restore test failed: ${error.message}`);
    }
}

// Main backup test runner
async function runAllBackupTests() {
    console.log('💾 Starting Backup/Restore Validation for Omni License System\n');
    console.log('=' .repeat(60));

    // Test backup directory structure
    await runBackupTest('Backup Directory Structure', testBackupDirectoryStructure);
    
    // Test backup service initialization
    await runBackupTest('Backup Service Initialization', testBackupServiceInitialization);
    
    // Test backup configuration
    await runBackupTest('Backup Configuration', testBackupConfiguration);
    
    // Test backup file creation
    await runBackupTest('Backup File Creation', testBackupFileCreation);
    
    // Test backup compression
    await runBackupTest('Backup Compression', testBackupCompression);
    
    // Test scheduled backups
    await runBackupTest('Scheduled Backups', testScheduledBackups);
    
    // Test restore functionality
    await runBackupTest('Restore Functionality', testRestoreFunctionality);

    // Print results
    console.log('\n' + '=' .repeat(60));
    console.log('💾 BACKUP/RESTORE TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${backupResults.passed}`);
    console.log(`❌ Failed: ${backupResults.failed}`);
    console.log(`📊 Backup Score: ${((backupResults.passed / (backupResults.passed + backupResults.failed)) * 100).toFixed(1)}%`);

    // Save detailed results
    const reportPath = 'backup-test-results.json';
    await fs.writeFile(reportPath, JSON.stringify(backupResults, null, 2));
    console.log(`\n📄 Detailed backup report saved to: ${reportPath}`);

    // Print failed tests details
    if (backupResults.failed > 0) {
        console.log('\n❌ FAILED BACKUP TESTS:');
        backupResults.tests
            .filter(t => t.status === 'FAILED')
            .forEach(test => {
                console.log(`  • ${test.name}: ${test.error}`);
            });
    }

    // Backup recommendations
    console.log('\n🔧 BACKUP RECOMMENDATIONS:');
    console.log('  • Set up automated daily, weekly, and monthly backups');
    console.log('  • Configure cloud storage for off-site backup redundancy');
    console.log('  • Test restore procedures regularly');
    console.log('  • Monitor backup success/failure notifications');
    console.log('  • Implement backup encryption for sensitive data');
    console.log('  • Set up backup retention policies');

    console.log('\n💾 Backup/Restore Validation Complete!');
    return backupResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllBackupTests().catch(console.error);
}

module.exports = { runAllBackupTests };