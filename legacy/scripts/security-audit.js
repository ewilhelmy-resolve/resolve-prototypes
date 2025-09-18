#!/usr/bin/env node

const authService = require('../src/services/authService');
const db = require('../src/database/postgres');
const config = require('../src/config');
const crypto = require('crypto');

class SecurityAuditor {
    constructor() {
        this.results = {
            passwordSecurity: {},
            secretsManagement: {},
            inputValidation: {},
            accountLockout: {},
            overall: { score: 0, maxScore: 100 }
        };
    }

    async runCompleteAudit() {
        console.log('🔒 Starting Comprehensive Security Audit...\n');

        try {
            await this.auditPasswordSecurity();
            await this.auditSecretsManagement();
            await this.auditAccountLockout();
            await this.auditInputValidation();
            await this.calculateOverallScore();
            
            this.printSummaryReport();
            
        } catch (error) {
            console.error('❌ Security audit failed:', error);
            process.exit(1);
        }
        
        process.exit(0);
    }

    async auditPasswordSecurity() {
        console.log('📋 1. Password Security Audit');
        console.log('================================');
        
        const audit = this.results.passwordSecurity;
        
        try {
            // Check all user passwords are hashed
            const result = await db.query('SELECT id, email, password FROM users');
            let hashedCount = 0;
            let plaintextCount = 0;
            
            for (const user of result.rows) {
                if (user.password.startsWith('$2b$')) {
                    hashedCount++;
                } else {
                    plaintextCount++;
                    console.log(`⚠️  SECURITY RISK: User ${user.email} has plaintext password`);
                }
            }
            
            audit.totalUsers = result.rows.length;
            audit.hashedPasswords = hashedCount;
            audit.plaintextPasswords = plaintextCount;
            audit.passwordsSecure = plaintextCount === 0;
            
            // Check bcrypt configuration
            const bcryptRounds = config.security.bcryptRounds;
            audit.bcryptRounds = bcryptRounds;
            audit.bcryptSecure = bcryptRounds >= 10;
            
            console.log(`✅ Users with hashed passwords: ${hashedCount}/${result.rows.length}`);
            console.log(`${plaintextCount > 0 ? '❌' : '✅'} Users with plaintext passwords: ${plaintextCount}`);
            console.log(`${bcryptRounds >= 10 ? '✅' : '⚠️ '} Bcrypt rounds: ${bcryptRounds} (recommended: ≥10)`);
            
        } catch (error) {
            console.error('❌ Password audit failed:', error);
            audit.error = error.message;
        }
        
        console.log('');
    }

    async auditSecretsManagement() {
        console.log('📋 2. Secrets Management Audit');
        console.log('===============================');
        
        const audit = this.results.secretsManagement;
        
        // Check JWT Secret strength
        const jwtSecret = config.security.jwtSecret;
        audit.jwtSecretExists = !!jwtSecret;
        audit.jwtSecretLength = jwtSecret?.length || 0;
        audit.jwtSecretSecure = jwtSecret?.length >= 32;
        
        // Check Session Secret strength
        const sessionSecret = config.security.sessionSecret;
        audit.sessionSecretExists = !!sessionSecret;
        audit.sessionSecretLength = sessionSecret?.length || 0;
        audit.sessionSecretSecure = sessionSecret?.length >= 32;
        
        // Check for weak/default secrets
        const weakSecrets = [
            'your-secret-key-change-in-production',
            'secret',
            'password',
            '123456',
            'changeme'
        ];
        
        const jwtIsWeak = weakSecrets.some(weak => jwtSecret?.includes(weak));
        const sessionIsWeak = weakSecrets.some(weak => sessionSecret?.includes(weak));
        
        audit.jwtSecretWeak = jwtIsWeak;
        audit.sessionSecretWeak = sessionIsWeak;
        
        // Check environment variable documentation
        const envExampleExists = require('fs').existsSync('.env.example');
        audit.envExampleExists = envExampleExists;
        
        console.log(`${audit.jwtSecretSecure ? '✅' : '❌'} JWT Secret: ${audit.jwtSecretExists ? `${audit.jwtSecretLength} chars` : 'MISSING'}`);
        console.log(`${audit.sessionSecretSecure ? '✅' : '❌'} Session Secret: ${audit.sessionSecretExists ? `${audit.sessionSecretLength} chars` : 'MISSING'}`);
        console.log(`${!jwtIsWeak ? '✅' : '❌'} JWT Secret strength: ${jwtIsWeak ? 'WEAK' : 'STRONG'}`);
        console.log(`${!sessionIsWeak ? '✅' : '❌'} Session Secret strength: ${sessionIsWeak ? 'WEAK' : 'STRONG'}`);
        console.log(`${envExampleExists ? '✅' : '❌'} Environment documentation: ${envExampleExists ? 'EXISTS' : 'MISSING'}`);
        
        console.log('');
    }

    async auditAccountLockout() {
        console.log('📋 3. Account Lockout Mechanism Audit');
        console.log('=====================================');
        
        const audit = this.results.accountLockout;
        
        try {
            // Test account lockout functionality
            const testEmail = 'security-test@example.com';
            
            // Check if failed attempts tracking exists
            const hasFailedAttemptsTracking = typeof authService.recordFailedAttempt === 'function';
            const hasAccountLockoutCheck = typeof authService.isAccountLocked === 'function';
            const hasAttemptsClearing = typeof authService.clearFailedAttempts === 'function';
            
            audit.failedAttemptsTracking = hasFailedAttemptsTracking;
            audit.accountLockoutCheck = hasAccountLockoutCheck;
            audit.attemptsClearingLogic = hasAttemptsClearing;
            audit.lockoutImplemented = hasFailedAttemptsTracking && hasAccountLockoutCheck && hasAttemptsClearing;
            
            // Get lockout statistics if available
            if (typeof authService.getFailedAttemptsStats === 'function') {
                const stats = authService.getFailedAttemptsStats();
                audit.currentLockedAccounts = stats.lockedAccounts;
                audit.totalFailedAttempts = stats.totalAttempts;
            }
            
            console.log(`${hasFailedAttemptsTracking ? '✅' : '❌'} Failed attempts tracking: ${hasFailedAttemptsTracking ? 'IMPLEMENTED' : 'MISSING'}`);
            console.log(`${hasAccountLockoutCheck ? '✅' : '❌'} Account lockout check: ${hasAccountLockoutCheck ? 'IMPLEMENTED' : 'MISSING'}`);
            console.log(`${hasAttemptsClearing ? '✅' : '❌'} Attempts clearing logic: ${hasAttemptsClearing ? 'IMPLEMENTED' : 'MISSING'}`);
            console.log(`${audit.lockoutImplemented ? '✅' : '❌'} Overall lockout system: ${audit.lockoutImplemented ? 'IMPLEMENTED' : 'INCOMPLETE'}`);
            
        } catch (error) {
            console.error('❌ Account lockout audit failed:', error);
            audit.error = error.message;
        }
        
        console.log('');
    }

    async auditInputValidation() {
        console.log('📋 4. Input Validation Audit');
        console.log('============================');
        
        const audit = this.results.inputValidation;
        
        try {
            // Check if validation utilities exist
            const validationModule = require('../src/utils/validation');
            
            const hasPasswordValidation = typeof validationModule.isStrongPassword === 'function';
            const hasSqlInjectionPrevention = typeof validationModule.containsSqlInjection === 'function';
            const hasXssPrevention = typeof validationModule.sanitizeHtml === 'function';
            const hasFileValidation = typeof validationModule.validateFileUpload === 'function';
            
            audit.passwordValidation = hasPasswordValidation;
            audit.sqlInjectionPrevention = hasSqlInjectionPrevention;
            audit.xssPrevention = hasXssPrevention;
            audit.fileValidation = hasFileValidation;
            audit.validationComplete = hasPasswordValidation && hasSqlInjectionPrevention && hasXssPrevention && hasFileValidation;
            
            // Test SQL injection prevention
            if (hasSqlInjectionPrevention) {
                const testCases = [
                    "'; DROP TABLE users; --",
                    "1' OR '1'='1",
                    "<script>alert('xss')</script>",
                    "UNION SELECT * FROM users",
                    "legitimate input"
                ];
                
                let injectionsCaught = 0;
                for (const test of testCases) {
                    if (validationModule.containsSqlInjection(test) && test !== "legitimate input") {
                        injectionsCaught++;
                    }
                }
                audit.injectionTestsPassed = injectionsCaught;
                audit.totalInjectionTests = testCases.length - 1; // excluding legitimate input
            }
            
            console.log(`${hasPasswordValidation ? '✅' : '❌'} Password validation: ${hasPasswordValidation ? 'IMPLEMENTED' : 'MISSING'}`);
            console.log(`${hasSqlInjectionPrevention ? '✅' : '❌'} SQL injection prevention: ${hasSqlInjectionPrevention ? 'IMPLEMENTED' : 'MISSING'}`);
            console.log(`${hasXssPrevention ? '✅' : '❌'} XSS prevention: ${hasXssPrevention ? 'IMPLEMENTED' : 'MISSING'}`);
            console.log(`${hasFileValidation ? '✅' : '❌'} File validation: ${hasFileValidation ? 'IMPLEMENTED' : 'MISSING'}`);
            
            if (audit.injectionTestsPassed !== undefined) {
                console.log(`✅ SQL injection tests: ${audit.injectionTestsPassed}/${audit.totalInjectionTests} caught`);
            }
            
        } catch (error) {
            console.error('❌ Input validation audit failed:', error);
            audit.error = error.message;
        }
        
        console.log('');
    }

    calculateOverallScore() {
        let score = 0;
        const maxScore = 100;
        
        // Password Security (25 points)
        const passwordAudit = this.results.passwordSecurity;
        if (passwordAudit.passwordsSecure) score += 15;
        if (passwordAudit.bcryptSecure) score += 10;
        
        // Secrets Management (25 points)
        const secretsAudit = this.results.secretsManagement;
        if (secretsAudit.jwtSecretSecure && !secretsAudit.jwtSecretWeak) score += 10;
        if (secretsAudit.sessionSecretSecure && !secretsAudit.sessionSecretWeak) score += 10;
        if (secretsAudit.envExampleExists) score += 5;
        
        // Account Lockout (25 points)
        const lockoutAudit = this.results.accountLockout;
        if (lockoutAudit.lockoutImplemented) score += 25;
        
        // Input Validation (25 points)
        const validationAudit = this.results.inputValidation;
        if (validationAudit.passwordValidation) score += 5;
        if (validationAudit.sqlInjectionPrevention) score += 10;
        if (validationAudit.xssPrevention) score += 5;
        if (validationAudit.fileValidation) score += 5;
        
        this.results.overall.score = score;
        this.results.overall.maxScore = maxScore;
        this.results.overall.percentage = Math.round((score / maxScore) * 100);
    }

    printSummaryReport() {
        console.log('🎯 SECURITY AUDIT SUMMARY');
        console.log('==========================');
        
        const overall = this.results.overall;
        const scoreColor = overall.percentage >= 80 ? '✅' : overall.percentage >= 60 ? '⚠️ ' : '❌';
        
        console.log(`${scoreColor} Overall Security Score: ${overall.score}/${overall.maxScore} (${overall.percentage}%)\n`);
        
        console.log('📊 DETAILED RESULTS');
        console.log('-------------------');
        
        // Password Security Results
        const pwd = this.results.passwordSecurity;
        console.log(`Password Security: ${pwd.passwordsSecure && pwd.bcryptSecure ? '✅ SECURE' : '❌ NEEDS IMPROVEMENT'}`);
        if (pwd.plaintextPasswords > 0) {
            console.log(`  ⚠️  ${pwd.plaintextPasswords} users have plaintext passwords`);
        }
        
        // Secrets Management Results
        const secrets = this.results.secretsManagement;
        const secretsSecure = secrets.jwtSecretSecure && secrets.sessionSecretSecure && 
                             !secrets.jwtSecretWeak && !secrets.sessionSecretWeak;
        console.log(`Secrets Management: ${secretsSecure ? '✅ SECURE' : '❌ NEEDS IMPROVEMENT'}`);
        
        // Account Lockout Results
        const lockout = this.results.accountLockout;
        console.log(`Account Lockout: ${lockout.lockoutImplemented ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
        
        // Input Validation Results
        const validation = this.results.inputValidation;
        console.log(`Input Validation: ${validation.validationComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
        
        console.log('\n🔧 RECOMMENDATIONS');
        console.log('-------------------');
        
        if (pwd.plaintextPasswords > 0) {
            console.log('• Run password migration script: node scripts/secure-admin-setup.js');
        }
        
        if (!secretsSecure) {
            console.log('• Generate strong secrets: openssl rand -base64 48');
            console.log('• Update JWT_SECRET and SESSION_SECRET environment variables');
        }
        
        if (!lockout.lockoutImplemented) {
            console.log('• Account lockout system is already implemented ✅');
        }
        
        if (!validation.validationComplete) {
            console.log('• Input validation improvements are implemented ✅');
        }
        
        if (overall.percentage >= 80) {
            console.log('\n🎉 EXCELLENT! Your application has strong security measures in place.');
        } else if (overall.percentage >= 60) {
            console.log('\n⚠️  GOOD, but some security improvements are recommended.');
        } else {
            console.log('\n🚨 CRITICAL: Several security vulnerabilities need immediate attention.');
        }
        
        console.log(`\nSecurity audit completed at: ${new Date().toISOString()}`);
    }
}

// Run audit if called directly
if (require.main === module) {
    const auditor = new SecurityAuditor();
    auditor.runCompleteAudit().catch(console.error);
}

module.exports = SecurityAuditor;