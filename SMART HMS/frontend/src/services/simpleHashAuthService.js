/* eslint-disable no-undef */
import api from './api';

class SimpleHashAuthService {
    /**
     * Register new user
     */
    static async register(username, email, password, role, firstName, lastName) {
        try {
            const response = await api.post('/auth/register', {
                username,
                email,
                password,
                role,
                firstName,
                lastName
            });

            return {
                success: true,
                message: 'Registration successful! You can now login.',
                user: response.data.user
            };
        } catch (error) {
            const responseError = error.response?.data?.error || error.response?.data?.message;
            const statusText = error.response?.status ? ` [${error.response.status}]` : '';
            return {
                success: false,
                error: responseError ? `${responseError}${statusText}` : `Registration failed${statusText}: ${error.message}`
            };
        }
    }

    /**
     * Login with username and password
     */
    static async login(username, password) {
        try {
            const response = await api.post('/auth/login', {
                username,
                password
            });

            if (!response.data.success) {
                return {
                    success: false,
                    error: response.data.error
                };
            }

            // Store token
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            return {
                success: true,
                token: response.data.token,
                user: response.data.user
            };

        } catch (error) {
            const responseError = error.response?.data?.error || error.response?.data?.message;
            const statusText = error.response?.status ? ` [${error.response.status}]` : '';
            return {
                success: false,
                error: responseError ? `${responseError}${statusText}` : `Login failed${statusText}: ${error.message}`
            };
        }
    }

    /**
     * Logout
     */
    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    /**
     * Get current user
     */
    static async getCurrentUser() {
        try {
            const response = await api.get('/auth/me');
            return response.data.user;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if user is logged in
     */
    static isLoggedIn() {
        return !!localStorage.getItem('token');
    }

    /**
     * Get stored user info
     */
    static getStoredUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
}

export default SimpleHashAuthService;
