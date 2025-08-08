// Initialize admin user for analytics dashboard
const database = require('./database-sqlite');

async function initializeAdmin() {
    try {
        // Check if admin already exists
        const existingAdmin = await database.users.findByEmail('john@resolve.io');
        
        if (!existingAdmin) {
            // Create admin user
            await database.users.create({
                email: 'john@resolve.io',
                password: '!Password1', // Default admin password
                company_name: 'Resolve',
                phone: '555-0100',
                tier: 'premium'
            });
            
            console.log('✅ Admin user created successfully');
            console.log('📧 Email: john@resolve.io');
            console.log('🔑 Password: !Password1');
            console.log('⚠️  Please change the password after first login');
        } else {
            console.log('✅ Admin user already exists');
            console.log('📧 Email: john@resolve.io');
            
            // Update password to correct one
            await database.db.run(`UPDATE users SET password = '!Password1' WHERE email = 'john@resolve.io'`);
            console.log('🔄 Password updated to: !Password1');
        }
        
        // Add some sample analytics data for testing
        const sessionId = 'sample_session_001';
        
        // Track some sample events
        await database.analytics.trackEvent({
            session_id: sessionId,
            user_email: 'test@example.com',
            event_type: 'page_view',
            event_category: 'navigation',
            event_data: { page: '/', source: 'direct' },
            page_url: 'http://localhost:8082/',
            referrer: '',
            user_agent: 'Mozilla/5.0 Sample',
            ip_address: '127.0.0.1'
        });
        
        await database.analytics.trackFunnelStep({
            session_id: sessionId,
            user_email: 'test@example.com',
            step_name: 'signup',
            step_number: 1
        });
        
        await database.analytics.trackConversion({
            session_id: sessionId,
            user_email: 'test@example.com',
            conversion_type: 'tier_selection',
            conversion_value: 100,
            source: 'organic',
            medium: 'search',
            campaign: 'launch',
            tier_selected: 'premium'
        });
        
        console.log('📊 Sample analytics data added');
        
    } catch (error) {
        console.error('Error initializing admin:', error);
    } finally {
        // Close database connection
        await database.close();
        process.exit(0);
    }
}

// Run initialization
initializeAdmin();