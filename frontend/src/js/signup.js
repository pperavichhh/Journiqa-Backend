// // DOM Elements
// const signUpForm = document.getElementById('signUpForm');
// const passwordInput = document.querySelector('input[name="password"]');
// const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
// const strengthBar = document.querySelector('.strength-fill');
// const strengthText = document.querySelector('.strength-text');
// const signUpButton = document.querySelector('.sign-up-button');
// const backButton = document.querySelector('.back-button');
// const menuIcon = document.querySelector('.menu-icon');

// // Form validation state
// let validationState = {
//     fullName: false,
//     email: false,
//     password: false,
//     confirmPassword: false,
//     terms: false
// };

// // Initialize the app
// document.addEventListener('DOMContentLoaded', function() {
//     initializeEventListeners();
//     initializeFormValidation();
// });

// // Event Listeners
// function initializeEventListeners() {
//     // Form submission
//     signUpForm.addEventListener('submit', handleFormSubmit);
    
//     // Password strength checking
//     passwordInput.addEventListener('input', checkPasswordStrength);
    
//     // Password confirmation
//     confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    
//     // Real-time validation for all inputs
//     const inputs = signUpForm.querySelectorAll('input[required]');
//     inputs.forEach(input => {
//         input.addEventListener('blur', validateField);
//         input.addEventListener('input', clearFieldError);
//     });
    
//     // Checkbox validation
//     const termsCheckbox = document.querySelector('input[name="terms"]');
//     termsCheckbox.addEventListener('change', validateTerms);
    
//     // Navigation
//     backButton.addEventListener('click', handleBackNavigation);
//     menuIcon.addEventListener('click', handleMenuToggle);
    
//     // Character animation
//     initializeCharacterAnimation();
// }

// // Form Validation
// function initializeFormValidation() {
//     // Disable submit button initially
//     updateSubmitButton();
// }

// function validateField(e) {
//     const field = e.target;
//     const fieldName = field.name;
//     const value = field.value.trim();
    
//     switch(fieldName) {
//         case 'fullName':
//             validationState.fullName = validateFullName(value);
//             updateFieldStatus(field, validationState.fullName);
//             break;
            
//         case 'email':
//             validationState.email = validateEmail(value);
//             updateFieldStatus(field, validationState.email);
//             break;
            
//         case 'password':
//             validationState.password = validatePassword(value);
//             updateFieldStatus(field, validationState.password);
//             // Also revalidate confirm password
//             if (confirmPasswordInput.value) {
//                 validatePasswordMatch({ target: confirmPasswordInput });
//             }
//             break;
            
//         case 'confirmPassword':
//             validationState.confirmPassword = validatePasswordMatch(e);
//             break;
//     }
    
//     updateSubmitButton();
// }

// function clearFieldError(e) {
//     const field = e.target;
//     field.classList.remove('invalid');
// }

// function validateFullName(name) {
//     return name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);
// }

// function validateEmail(email) {
//     // Check if it's an email or phone number
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
//     return emailRegex.test(email) || phoneRegex.test(email);
// }

// function validatePassword(password) {
//     // Password must be at least 8 characters with mix of letters, numbers, and symbols
//     const minLength = password.length >= 8;
//     const hasLetter = /[a-zA-Z]/.test(password);
//     const hasNumber = /[0-9]/.test(password);
//     const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
//     return minLength && hasLetter && hasNumber && hasSymbol;
// }

// function validatePasswordMatch(e) {
//     const confirmPassword = e.target.value;
//     const password = passwordInput.value;
//     const isMatch = confirmPassword === password && password.length > 0;
    
//     updateFieldStatus(e.target, isMatch);
//     return isMatch;
// }

// function validateTerms() {
//     const termsCheckbox = document.querySelector('input[name="terms"]');
//     validationState.terms = termsCheckbox.checked;
//     updateSubmitButton();
// }

// function updateFieldStatus(field, isValid) {
//     if (isValid) {
//         field.classList.remove('invalid');
//         field.classList.add('valid');
//     } else if (field.value.trim() !== '') {
//         field.classList.remove('valid');
//         field.classList.add('invalid');
//     }
// }

// function updateSubmitButton() {
//     const allValid = Object.values(validationState).every(state => state === true);
//     signUpButton.disabled = !allValid;
// }

// // Password Strength Checker
// function checkPasswordStrength(e) {
//     const password = e.target.value;
//     const strength = calculatePasswordStrength(password);
    
//     // Update strength bar
//     strengthBar.style.width = `${strength.percentage}%`;
//     strengthBar.style.backgroundColor = strength.color;
//     strengthText.textContent = strength.text;
    
//     // Validate password
//     validationState.password = strength.percentage >= 80;
//     updateFieldStatus(passwordInput, validationState.password);
//     updateSubmitButton();
// }

// function calculatePasswordStrength(password) {
//     let score = 0;
//     let feedback = [];
    
//     if (password.length === 0) {
//         return { percentage: 0, color: '#E8D5B7', text: 'Password strength' };
//     }
    
//     // Length check
//     if (password.length >= 8) score += 25;
//     else feedback.push('8+ characters');
    
//     // Lowercase check
//     if (/[a-z]/.test(password)) score += 25;
//     else feedback.push('lowercase');
    
//     // Uppercase check
//     if (/[A-Z]/.test(password)) score += 25;
//     else feedback.push('uppercase');
    
//     // Number check
//     if (/[0-9]/.test(password)) score += 25;
//     else feedback.push('number');
    
//     // Symbol check (bonus)
//     if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
//     // Determine strength level
//     let strengthLevel, color;
//     if (score < 25) {
//         strengthLevel = 'Weak';
//         color = '#dc3545';
//     } else if (score < 50) {
//         strengthLevel = 'Fair';
//         color = '#ffc107';
//     } else if (score < 75) {
//         strengthLevel = 'Good';
//         color = '#17a2b8';
//     } else {
//         strengthLevel = 'Strong';
//         color = '#28a745';
//     }
    
//     return {
//         percentage: Math.min(score, 100),
//         color: color,
//         text: `${strengthLevel} password`
//     };
// }

// // Form Submission
// async function handleFormSubmit(e) {
//     e.preventDefault();
    
//     // Show loading state
//     signUpForm.classList.add('loading');
//     signUpButton.textContent = 'Creating Account...';
    
//     try {
//         const formData = new FormData(signUpForm);
//         const userData = {
//             fullName: formData.get('fullName'),
//             email: formData.get('email'),
//             password: formData.get('password'),
//             newsletter: formData.get('newsletter') === 'on'
//         };
        
//         // Simulate API call
//         await simulateSignUp(userData);
        
//         // Success - show success message and redirect
//         showSuccessMessage();
        
//         setTimeout(() => {
//             // In a real app, redirect to dashboard or login
//             window.location.href = 'dashboard.html';
//         }, 2000);
        
//     } catch (error) {
//         showErrorMessage(error.message);
//     } finally {
//         // Remove loading state
//         signUpForm.classList.remove('loading');
//         signUpButton.textContent = 'Create Account';
//     }
// }

// async function simulateSignUp(userData) {
//     // Simulate API call delay
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     // Simulate potential errors
//     if (userData.email === 'test@error.com') {
//         throw new Error('Email already exists');
//     }
    
//     // Store user data (in real app, this would be sent to server)
//     console.log('User registered:', userData);
    
//     return { success: true, message: 'Account created successfully!' };
// }

// // Google Sign Up
// function handleGoogleSignUp() {
//     // Show loading state
//     const googleButton = document.querySelector('.google-button');
//     const originalText = googleButton.textContent;
//     googleButton.textContent = 'Connecting...';
//     googleButton.disabled = true;
    
//     // Simulate Google OAuth flow
//     setTimeout(() => {
//         // In a real app, integrate with Google OAuth
//         alert('Google Sign Up integration would be implemented here');
//         googleButton.textContent = originalText;
//         googleButton.disabled = false;
//     }, 1500);
// }

// // UI Feedback
// function showSuccessMessage() {
//     createNotification('Account created successfully! Redirecting...', 'success');
// }

// function showErrorMessage(message) {
//     createNotification(message, 'error');
// }

// function createNotification(message, type) {
//     // Remove existing notifications
//     const existingNotification = document.querySelector('.notification');
//     if (existingNotification) {
//         existingNotification.remove();
//     }
    
//     const notification = document.createElement('div');
//     notification.className = `notification ${type}`;
//     notification.innerHTML = `
//         <span>${message}</span>
//         <button onclick="this.parentElement.remove()">×</button>
//     `;
    
//     // Add notification styles
//     notification.style.cssText = `
//         position: fixed;
//         top: 20px;
//         right: 20px;
//         padding: 16px 20px;
//         border-radius: 12px;
//         color: white;
//         font-weight: 500;
//         z-index: 1000;
//         display: flex;
//         align-items: center;
//         gap: 12px;
//         max-width: 300px;
//         box-shadow: 0 4px 12px rgba(0,0,0,0.15);
//         animation: slideIn 0.3s ease;
//         background: ${type === 'success' ? '#28a745' : '#dc3545'};
//     `;
    
//     notification.querySelector('button').style.cssText = `
//         background: none;
//         border: none;
//         color: white;
//         font-size: 18px;
//         cursor: pointer;
//         padding: 0;
//         margin-left: auto;
//     `;
    
//     document.body.appendChild(notification);
    
//     // Auto remove after 5 seconds
//     setTimeout(() => {
//         if (notification.parentElement) {
//             notification.remove();
//         }
//     }, 5000);
// }

// // Navigation
// function handleBackNavigation() {
//     // Add back button animation
//     backButton.style.transform = 'scale(0.95)';
//     setTimeout(() => {
//         backButton.style.transform = 'scale(1)';
//     }, 150);
    
//     // In a real app, navigate back
//     if (window.history.length > 1) {
//         window.history.back();
//     } else {
//         window.location.href = 'index.html';
//     }
// }

// function handleMenuToggle() {
//     // Animate menu icon
//     menuIcon.classList.toggle('active');
    
//     // In a real app, show/hide menu
//     console.log('Menu toggled');
// }

// // Character Animation
// function initializeCharacterAnimation() {
//     const character = document.querySelector('.character');
//     const speechBubble = document.querySelector('.speech-bubble');
    
//     // Add subtle breathing animation to character
//     setInterval(() => {
//         character.style.transform = 'scale(1.02)';
//         setTimeout(() => {
//             character.style.transform = 'scale(1)';
//         }, 1000);
//     }, 3000);
    
//     // Animate speech bubble on load
//     setTimeout(() => {
//         speechBubble.style.animation = 'bounce 0.5s ease';
//     }, 500);
// }

// // Add CSS animations dynamically
// const styleSheet = document.createElement('style');
// styleSheet.textContent = `
//     @keyframes slideIn {
//         from {
//             transform: translateX(100%);
//             opacity: 0;
//         }
//         to {
//             transform: translateX(0);
//             opacity: 1;
//         }
//     }
    
//     @keyframes bounce {
//         0%, 20%, 50%, 80%, 100% {
//             transform: translateY(0);
//         }
//         40% {
//             transform: translateY(-10px);
//         }
//         60% {
//             transform: translateY(-5px);
//         }
//     }
    
//     .menu-icon.active span:nth-child(1) {
//         transform: rotate(45deg) translate(5px, 5px);
//     }
    
//     .menu-icon.active span:nth-child(2) {
//         opacity: 0;
//     }
    
//     .menu-icon.active span:nth-child(3) {
//         transform: rotate(-45deg) translate(7px, -6px);
//     }
// `;

// document.head.appendChild(styleSheet);

// // Make handleGoogleSignUp available globally
// window.handleGoogleSignUp = handleGoogleSignUp;