export class SignupForm {
    constructor(containerId, onSubmit) {
        this.container = document.getElementById(containerId);
        this.onSubmit = onSubmit;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
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
        `;
        
        this.form = this.container.querySelector('#signupForm');
        this.emailInput = this.form.querySelector('#email');
        this.companyInput = this.form.querySelector('#company');
        this.passwordInput = this.form.querySelector('#password');
    }

    attachEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validate()) {
                const formData = {
                    email: this.emailInput.value,
                    company: this.companyInput.value,
                    password: this.passwordInput.value
                };
                this.onSubmit(formData);
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
    }

    validate() {
        let isValid = true;

        // Email validation
        if (!this.emailInput.value || !this.emailInput.value.includes('@')) {
            this.showError(this.emailInput);
            isValid = false;
        }

        // Company validation
        if (!this.companyInput.value) {
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
        return {
            email: this.emailInput.value,
            company: this.companyInput.value,
            password: this.passwordInput.value
        };
    }
}