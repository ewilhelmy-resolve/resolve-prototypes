// API Client for backend communication
export class ApiClient {
    constructor() {
        // Check if we're running through nginx (port 8080/8081) or directly (port 3000)
        // If through nginx, use the proxy, otherwise direct to backend
        const port = window.location.port;
        this.baseURL = (port === '8080' || port === '8081' || port === '80' || !port) 
            ? ''  // Use nginx proxy for Docker/production
            : 'http://localhost:3001';  // Direct for local dev on port 3000
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