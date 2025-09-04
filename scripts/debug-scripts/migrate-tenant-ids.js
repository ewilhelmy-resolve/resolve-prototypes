#!/usr/bin/env node
/**
 * Migration script to add UUID tenant IDs to existing users
 * This script is idempotent - it can be run multiple times safely
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Path to the data file where users are stored
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

function migrateUsers() {
    console.log('Starting tenant ID migration...');
    
    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
        console.log('No data file found at', DATA_FILE);
        console.log('Creating data directory and file...');
        
        // Create data directory if it doesn't exist
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Initialize with empty data
        const emptyData = {
            users: [],
            sessions: {},
            webhookHistory: [],
            csvDataStore: {}
        };
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(emptyData, null, 2));
        console.log('Created empty data file');
        return;
    }
    
    // Read existing data
    let data;
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        data = JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading data file:', error);
        return;
    }
    
    // Check if users array exists
    if (!data.users || !Array.isArray(data.users)) {
        console.log('No users found in data file');
        return;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Process each user
    data.users = data.users.map(user => {
        // Skip if user already has a valid UUID tenant ID
        if (user.tenantId && isValidUUID(user.tenantId)) {
            console.log(`User ${user.email} already has valid UUID tenant ID: ${user.tenantId}`);
            skippedCount++;
            return user;
        }
        
        // Generate new UUID tenant ID
        const newTenantId = uuidv4();
        console.log(`Migrating user ${user.email}: ${user.tenantId || 'no tenant ID'} -> ${newTenantId}`);
        
        migratedCount++;
        return {
            ...user,
            tenantId: newTenantId,
            migratedAt: new Date().toISOString()
        };
    });
    
    // Update sessions with new tenant IDs
    if (data.sessions && typeof data.sessions === 'object') {
        Object.keys(data.sessions).forEach(token => {
            const session = data.sessions[token];
            if (session && session.email) {
                // Find the user with this email and update the session tenant ID
                const user = data.users.find(u => u.email === session.email);
                if (user && user.tenantId) {
                    data.sessions[token].tenantId = user.tenantId;
                    console.log(`Updated session for ${session.email} with tenant ID: ${user.tenantId}`);
                }
            }
        });
    }
    
    // Save updated data
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('\nMigration completed successfully!');
        console.log(`- Migrated: ${migratedCount} users`);
        console.log(`- Skipped: ${skippedCount} users (already had valid UUIDs)`);
        console.log(`- Total users: ${data.users.length}`);
    } catch (error) {
        console.error('Error saving migrated data:', error);
    }
}

function isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// Also check if we need to migrate in-memory users when server starts
function createMigrationMiddleware() {
    return (users) => {
        if (!users || !Array.isArray(users)) return users;
        
        return users.map(user => {
            if (!user.tenantId || !isValidUUID(user.tenantId)) {
                return {
                    ...user,
                    tenantId: uuidv4()
                };
            }
            return user;
        });
    };
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrateUsers();
}

module.exports = {
    migrateUsers,
    createMigrationMiddleware,
    isValidUUID
};