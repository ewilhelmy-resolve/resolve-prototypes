const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuid && uuidRegex.test(uuid);
};

// Password strength validation
const isStrongPassword = (password) => {
    // Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return password && strongPasswordRegex.test(password);
};

// Get password strength feedback
const getPasswordStrengthFeedback = (password) => {
    const feedback = [];
    
    if (!password || password.length < 8) {
        feedback.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
        feedback.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        feedback.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
        feedback.push('Password must contain at least one number');
    }
    if (!/[@$!%*?&]/.test(password)) {
        feedback.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return feedback;
};

// Email validation (more thorough than express-validator default)
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && emailRegex.test(email) && email.length <= 320; // RFC 5321 limit
};

// Sanitize HTML input to prevent XSS
const sanitizeHtml = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// Validate file upload
const validateFileUpload = (file, allowedTypes, maxSize) => {
    const errors = [];
    
    if (!file) {
        errors.push('No file provided');
        return errors;
    }
    
    // Check file size
    if (file.size > maxSize) {
        errors.push(`File size ${file.size} exceeds maximum allowed size ${maxSize}`);
    }
    
    // Check file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
        errors.push(`File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Check for suspicious file names
    const suspiciousPatterns = [
        /\.\.[\/\\]/, // Path traversal
        /[<>:"|?*]/, // Invalid filename characters
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Reserved Windows names
    ];
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(file.name)) {
            errors.push('Invalid file name detected');
            break;
        }
    }
    
    return errors;
};

// Validate SQL input to prevent injection
const containsSqlInjection = (input) => {
    if (typeof input !== 'string') return false;
    
    const sqlPatterns = [
        /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
        /(union|select|insert|delete|update|create|drop|exec|execute)/i,
        /(script|javascript|vbscript|onload|onerror|onclick)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
};

module.exports = {
    isValidUUID,
    isStrongPassword,
    getPasswordStrengthFeedback,
    isValidEmail,
    sanitizeHtml,
    validateFileUpload,
    containsSqlInjection
};