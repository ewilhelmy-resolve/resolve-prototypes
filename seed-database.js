// Database Seeding Script
// This script seeds the localStorage "database" with initial user data

(function seedDatabase() {
    // Define the super user
    const superUser = {
        email: 'john@resolve.io',
        password: '!Password1',
        company: 'Resolve',
        role: 'super_admin',
        firstName: 'John',
        lastName: 'Admin',
        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true,
        isSuperUser: true,
        settings: {
            notifications: true,
            darkMode: true,
            timezone: 'America/New_York',
            language: 'en'
        },
        profile: {
            title: 'Chief Technology Officer',
            department: 'Engineering',
            phone: '+1 (555) 123-4567',
            avatar: null,
            bio: 'Leading the automation revolution at Resolve'
        },
        permissions: {
            canCreateUsers: true,
            canDeleteUsers: true,
            canModifySettings: true,
            canAccessAllData: true,
            canManageIntegrations: true,
            canViewAnalytics: true,
            canManageBilling: true
        },
        integrations: {
            jira: {
                connected: true,
                url: 'https://resolve.atlassian.net',
                apiKey: 'demo-key-123',
                lastSync: new Date().toISOString()
            },
            servicenow: {
                connected: false,
                url: null,
                apiKey: null,
                lastSync: null
            },
            slack: {
                connected: true,
                workspace: 'resolve-workspace',
                webhookUrl: 'https://hooks.slack.com/services/demo',
                lastSync: new Date().toISOString()
            }
        },
        subscription: {
            plan: 'premium',
            status: 'active',
            startDate: new Date('2024-01-01').toISOString(),
            endDate: new Date('2025-01-01').toISOString(),
            seats: 100,
            usedSeats: 47,
            billingCycle: 'annual',
            amount: 50000,
            currency: 'USD',
            paymentMethod: {
                type: 'card',
                last4: '4242',
                brand: 'Visa',
                expiryMonth: 12,
                expiryYear: 2025
            }
        },
        analytics: {
            ticketsAutomated: 15234,
            timesSaved: '4,320 hours',
            automationRate: 87.5,
            lastWeekTickets: 342,
            topAutomations: [
                'Password Resets',
                'User Provisioning',
                'Software Installation',
                'Access Requests',
                'System Health Checks'
            ]
        }
    };

    // Get existing users or create new object
    let registeredUsers = {};
    const existingUsers = localStorage.getItem('registeredUsers');
    if (existingUsers) {
        try {
            registeredUsers = JSON.parse(existingUsers);
        } catch (e) {
            console.error('Error parsing existing users:', e);
            registeredUsers = {};
        }
    }

    // Add super user to registered users
    registeredUsers[superUser.email] = {
        password: superUser.password,
        company: superUser.company,
        createdAt: superUser.createdAt,
        ...superUser // Store all user data
    };

    // Save to localStorage
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    
    // Also store as current user for testing
    localStorage.setItem('currentUser', JSON.stringify({
        username: superUser.email,
        email: superUser.email,
        accountType: 'Super Admin',
        lastLogin: superUser.lastLogin
    }));

    // Store additional user data separately for the application
    localStorage.setItem('userData_john@resolve.io', JSON.stringify(superUser));

    console.log('✅ Database seeded successfully!');
    console.log('Super user created:', superUser.email);
    console.log('Password:', superUser.password);
    console.log('Total users in database:', Object.keys(registeredUsers).length);
    
    return {
        success: true,
        user: superUser.email,
        message: 'Super user created successfully'
    };
})();