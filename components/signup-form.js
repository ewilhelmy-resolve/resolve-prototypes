import { apiClient } from './api-client.js';

export class SignupForm {
    constructor(containerId, onSubmit) {
        this.container = document.getElementById(containerId);
        this.onSubmit = onSubmit;
        this.isLoginMode = false;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        if (this.isLoginMode) {
            this.renderLogin();
        } else {
            this.renderSignup();
        }
    }

    renderSignup() {
        this.container.innerHTML = `
            <form id="signupForm">
                <div class="form-group">
                    <label for="email">Work Email</label>
                    <input type="email" id="email" name="email" required placeholder="you@company.com">
                    <span class="error-message">Please enter a valid work email</span>
                </div>
                
                <div class="form-group">
                    <label for="company">Company Name</label>
                    <input type="text" id="company" name="company" required placeholder="Acme Inc.">
                    <span class="error-message">Company name is required</span>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required placeholder="Minimum 8 characters">
                    <span class="error-message">Password must be at least 8 characters</span>
                </div>
                
                <div class="button-group">
                    <button type="submit" class="btn btn-primary">Continue</button>
                </div>
            </form>
            
            <div class="login-option">
                <p>Already have an account? <button type="button" class="btn-link" id="loginLink">Log in here</button></p>
            </div>
        `;
        
        this.form = this.container.querySelector('#signupForm');
        this.emailInput = this.form.querySelector('#email');
        this.companyInput = this.form.querySelector('#company');
        this.passwordInput = this.form.querySelector('#password');
    }

    renderLogin() {
        this.container.innerHTML = `
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginEmail">Work Email</label>
                    <input type="email" id="loginEmail" name="email" required placeholder="you@company.com">
                    <span class="error-message">Please enter your email</span>
                </div>
                
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" name="password" required placeholder="Enter your password">
                    <span class="error-message">Please enter your password</span>
                </div>
                
                <div class="button-group">
                    <button type="submit" class="btn btn-primary">Log In</button>
                </div>
                
                <div class="form-footer">
                    <p>Don't have an account? <button type="button" class="btn-link" id="signupLink">Sign up</button></p>
                </div>
            </form>
        `;
        
        this.form = this.container.querySelector('#loginForm');
        this.emailInput = this.form.querySelector('#loginEmail');
        this.passwordInput = this.form.querySelector('#loginPassword');
    }

    switchToLogin() {
        this.isLoginMode = true;
        this.render();
        this.attachEventListeners();
        
        // Update the heading text for login
        const heading = document.getElementById('authHeading');
        const subheading = document.getElementById('authSubheading');
        if (heading) {
            heading.textContent = 'Continue Your Automation Journey';
        }
        if (subheading) {
            subheading.textContent = 'Welcome back! Your AI-powered automation awaits';
        }
        
        // Update the login option text
        const loginOption = document.querySelector('.login-option');
        if (loginOption) {
            loginOption.innerHTML = '<p>Need to create an account? <button type="button" class="btn-link" onclick="app.signupForm.switchToSignup()">Sign up here</button></p>';
        }
    }

    switchToSignup() {
        this.isLoginMode = false;
        this.render();
        this.attachEventListeners();
        
        // Update the heading text for signup
        const heading = document.getElementById('authHeading');
        const subheading = document.getElementById('authSubheading');
        if (heading) {
            heading.textContent = 'Start Your Automation Journey';
        }
        if (subheading) {
            subheading.textContent = 'Join thousands of IT teams eliminating repetitive work with AI';
        }
        
        // Update the login option text
        const loginOption = document.querySelector('.login-option');
        if (loginOption) {
            loginOption.innerHTML = '<p>Already have an account? <button type="button" class="btn-link" onclick="app.showLoginForm()">Log in here</button></p>';
        }
    }

    attachEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.isLoginMode) {
                this.handleLogin();
            } else {
                this.handleSignup();
            }
        });

        // Remove error states on input
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('error');
                const errorMsg = input.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('error-message')) {
                    errorMsg.style.display = 'none';
                }
            });
        });

        // Handle login/signup switch buttons
        const loginLink = document.getElementById('loginLink');
        if (loginLink) {
            loginLink.addEventListener('click', () => this.switchToLogin());
        }

        const signupLink = document.getElementById('signupLink');
        if (signupLink) {
            signupLink.addEventListener('click', () => this.switchToSignup());
        }
    }

    async handleLogin() {
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        if (!email || !password) {
            if (!email) this.showError(this.emailInput);
            if (!password) this.showError(this.passwordInput);
            return;
        }

        try {
            // Call backend API
            const response = await apiClient.login(email, password);
            
            if (response.success) {
                // Successful login
                const userData = {
                    email: response.user.email,
                    company: response.user.company_name || response.user.company,
                    ...response.user
                };
                
                this.onSubmit(userData);
            }
        } catch (error) {
            // Show error
            this.showError(this.passwordInput);
            const errorMsg = this.passwordInput.nextElementSibling;
            if (errorMsg) {
                errorMsg.textContent = error.message || 'Invalid email or password';
                errorMsg.style.display = 'block';
            }
        }
    }

    async handleSignup() {
        if (this.validate()) {
            const formData = {
                email: this.emailInput.value,
                company: this.companyInput.value,
                password: this.passwordInput.value
            };

            try {
                // Call backend API
                const response = await apiClient.signup(
                    formData.email,
                    formData.password,
                    formData.company
                );
                
                if (response.success) {
                    const userData = {
                        email: response.user.email,
                        company: response.user.company,
                        ...response.user
                    };
                    
                    this.onSubmit(userData);
                }
            } catch (error) {
                this.showError(this.emailInput);
                const errorMsg = this.emailInput.nextElementSibling;
                if (errorMsg) {
                    errorMsg.textContent = error.message || 'An account with this email already exists';
                    errorMsg.style.display = 'block';
                }
            }
        }
    }

    validate() {
        let isValid = true;

        // Email validation
        if (!this.emailInput.value || !this.emailInput.value.includes('@')) {
            this.showError(this.emailInput);
            isValid = false;
        }

        // Company validation (only for signup)
        if (this.companyInput && !this.companyInput.value) {
            this.showError(this.companyInput);
            isValid = false;
        }

        // Password validation
        if (!this.passwordInput.value || this.passwordInput.value.length < 8) {
            this.showError(this.passwordInput);
            isValid = false;
        }

        return isValid;
    }

    showError(input) {
        input.classList.add('error');
        const errorMsg = input.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('error-message')) {
            errorMsg.style.display = 'block';
        }
    }

    getData() {
        if (this.isLoginMode) {
            return {
                email: this.emailInput.value,
                password: this.passwordInput.value
            };
        } else {
            return {
                email: this.emailInput.value,
                company: this.companyInput.value,
                password: this.passwordInput.value
            };
        }
    }
}