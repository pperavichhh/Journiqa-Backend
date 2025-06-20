// Login functionality for Journiqa app
class LoginManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api'; // Change this to your backend URL
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingSession();
    }

    bindEvents() {
        // Form submission handler
        const form = document.getElementById('signInForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSignIn(e));
        }

        // Input validation on keyup
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('keyup', () => this.validateInput(input));
            input.addEventListener('blur', () => this.validateInput(input));
        });
    }

    // Handle form submission
    async handleSignIn(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = e.target.querySelector('input[type="text"]').value.trim();
        const password = e.target.querySelector('input[type="password"]').value;

        // Validate inputs
        if (!this.validateEmail(email) && !this.validatePhone(email)) {
            this.showError('Please enter a valid email or phone number');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            // Simulate API call for login
            const response = await this.simulateLogin(email, password);

            if (response.success) {
                // Store auth token
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                
                this.showSuccess('Login successful! Redirecting...');
                
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                this.showError(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    // Simulate Login (frontend only)
    async simulateLogin(email, password) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

        // Simple mock login logic
        if (email === 'demo@journiqa.com' && password === 'demo123') {
            return {
                success: true,
                token: 'mock-jwt-token-12345',
                user: {
                    id: 1,
                    name: 'Demo User',
                    email: 'demo@journiqa.com'
                }
            };
        } else {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }
    }


    // Handle Google Sign In (frontend only)
    async handleGoogleSignIn() {
        // Show loading state
        this.setLoadingState(true);
        const googleButton = document.querySelector('.google-button');
        const originalText = googleButton.innerHTML; // Store original content

        googleButton.innerHTML = `<div class="google-icon"></div> Connecting...`;
        googleButton.disabled = true;

        try {
            // Simulate Google OAuth flow
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
            this.showSuccess('Google Sign In simulated successfully!');
            // In a real app, after successful Google OAuth, you would redirect or get user data
            setTimeout(() => {
                window.location.href = 'dashboard.html'; // Redirect after simulated success
            }, 1000);
        } catch (error) {
            console.error('Google sign in simulation error:', error);
            this.showError('Google sign in simulation failed. Please try again.');
        } finally {
            this.setLoadingState(false);
            googleButton.innerHTML = originalText; // Restore original content
            googleButton.disabled = false;
        }
    }

    // Handle forgot password (frontend only - simplified)
    async handleForgotPassword() {
        const email = prompt('Please enter your email address:');
        
        if (!email) return; // User cancelled

        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        this.setLoadingState(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            this.showSuccess('If the email exists, a password reset link has been sent.');
        } catch (error) {
            this.showError('Failed to send reset email. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    // Handle sign up redirect
    handleSignUp() {
        window.location.href = 'signup.html';
    }

    // Validate input fields
    validateInput(input) {
        const value = input.value.trim();
        const isEmail = input.type === 'text' || input.placeholder.includes('email');
        
        if (isEmail) {
            const isValid = this.validateEmail(value) || this.validatePhone(value);
            this.setInputState(input, isValid);
        } else if (input.type === 'password') {
            const isValid = value.length >= 6;
            this.setInputState(input, isValid);
        }
    }

    // Email validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Phone validation (basic)
    validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    // Set input validation state
    setInputState(input, isValid) {
        if (input.value.trim() === '') {
            input.style.borderColor = '#E8D5B7';
            return;
        }
        
        input.style.borderColor = isValid ? '#28a745' : '#dc3545';
    }

    // Set loading state
    setLoadingState(loading) {
        const container = document.querySelector('.phone-container');
        const button = document.querySelector('.sign-in-button');
        
        if (loading) {
            container.classList.add('loading');
            button.textContent = 'Signing In...';
            button.disabled = true; // Disable button during loading
        } else {
            container.classList.remove('loading');
            button.textContent = 'Sign In';
            button.disabled = false; // Enable button after loading
        }
    }

    // Show error message
    showError(message) {
        this.showMessage(message, 'error');
    }

    // Show success message
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // Show message (error or success)
    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            animation: slideDown 0.3s ease;
        `;

        document.body.appendChild(messageDiv);

        // Remove message after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Check for existing session (unchanged for this request)
    checkExistingSession() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            // User is already logged in, redirect to dashboard
            // window.location.href = 'dashboard.html'; // Uncomment this in a real app
        }
    }
}

// Global functions for onclick handlers
function handleForgotPassword() {
    loginManager.handleForgotPassword();
}

function handleGoogleSignIn() {
    loginManager.handleGoogleSignIn();
}

function handleSignUp() {
    loginManager.handleSignUp();
}

// Initialize the login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.loginManager = new LoginManager();
});

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);