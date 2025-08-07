// API Client for backend communication
export class ApiClient {
    constructor() {
        // Use backend port 3001 for API calls locally
        // In production, use relative path /api which nginx proxies to backend
        this.baseURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001' 
            : '';
        this.token = sessionStorage.getItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async login(email, password) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response.token) {
            this.token = response.token;
            sessionStorage.setItem('authToken', response.token);
            sessionStorage.setItem('currentUser', JSON.stringify(response.user));
        }

        return response;
    }

    async signup(email, password, company) {
        const response = await this.request('/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, company })
        });

        if (response.token) {
            this.token = response.token;
            sessionStorage.setItem('authToken', response.token);
            sessionStorage.setItem('currentUser', JSON.stringify(response.user));
        }

        return response;
    }

    async logout() {
        await this.request('/logout', {
            method: 'POST'
        });

        this.token = null;
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
    }

    async getUser(email) {
        return await this.request(`/user/${email}`);
    }

    async getUsers() {
        return await this.request('/users');
    }

    async checkHealth() {
        return await this.request('/health');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        const userStr = sessionStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }
}

// Export singleton instance
export const apiClient = new ApiClient();