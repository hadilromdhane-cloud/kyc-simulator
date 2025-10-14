/**
 * Translation Manager
 * Handles multilingual support for the application
 */

const Translator = (function() {
    'use strict';

    let currentLanguage = 'en'; // Default language
    let translations = {};

    // Load translations from JSON file
    async function loadTranslations() {
        try {
            const response = await fetch('translations.json');
            if (!response.ok) {
                throw new Error('Failed to load translations');
            }
            translations = await response.json();
            console.log('Translations loaded successfully');
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to embedded translations if file not found
            translations = getEmbeddedTranslations();
        }
    }

    // Embedded translations as fallback
    function getEmbeddedTranslations() {
        return {
            "en": {
                "header": {
                    "title": "Web Service Simulator"
                },
                "authentication": {
                    "title": "Authentication on the simulation tenant",
                    "tenantName": "Tenant Name:",
                    "selectTenant": "Select Tenant",
                    "username": "Username:",
                    "usernamePlaceholder": "Enter username",
                    "password": "Password:",
                    "passwordPlaceholder": "Enter password",
                    "authButton": "Authenticate"
                },
                "onboarding": {
                    "title": "Core System Onboarding UI",
                    "decentralized": "Decentralized Process",
                    "centralized": "Centralized Process",
                    "decentralizedTitle": "Decentralized Onboarding",
                    "centralizedTitle": "Centralized Onboarding",
                    "synchronous": "Synchronous",
                    "asynchronous": "Asynchronous",
                    "entityType": "Entity Type:",
                    "selectEntityType": "Select Entity Type",
                    "physicalPerson": "Physical Person (PP)",
                    "legalPerson": "Legal Person (PM)",
                    "simulate": "Simulate"
                },
                "popup": {
                    "close": "Close"
                }
            },
            "fr": {
                "header": {
                    "title": "Simulateur de Service Web"
                },
                "authentication": {
                    "title": "Authentification sur le tenant de simulation",
                    "tenantName": "Nom du Tenant :",
                    "selectTenant": "Sélectionner un Tenant",
                    "username": "Nom d'utilisateur :",
                    "usernamePlaceholder": "Entrez le nom d'utilisateur",
                    "password": "Mot de passe :",
                    "passwordPlaceholder": "Entrez le mot de passe",
                    "authButton": "S'authentifier"
                },
                "onboarding": {
                    "title": "Interface d'Onboarding du Système Central",
                    "decentralized": "Processus Décentralisé",
                    "centralized": "Processus Centralisé",
                    "decentralizedTitle": "Onboarding Décentralisé",
                    "centralizedTitle": "Onboarding Centralisé",
                    "synchronous": "Synchrone",
                    "asynchronous": "Asynchrone",
                    "entityType": "Type d'Entité :",
                    "selectEntityType": "Sélectionner un Type d'Entité",
                    "physicalPerson": "Personne Physique (PP)",
                    "legalPerson": "Personne Morale (PM)",
                    "simulate": "Simuler"
                },
                "popup": {
                    "close": "Fermer"
                }
            }
        };
    }

    // Get translation by key path (e.g., "authentication.title")
    function getTranslation(key, lang = currentLanguage) {
        const keys = key.split('.');
        let value = translations[lang];
        
        for (let k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn(`Translation not found for key: ${key} in language: ${lang}`);
                return key; // Return key if translation not found
            }
        }
        
        return value;
    }

    // Update all elements with data-i18n attribute
    function updatePageContent() {
        // Update text content
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = getTranslation(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = getTranslation(key);
            element.placeholder = translation;
        });

        // Update title
        const titleElement = document.querySelector('title[data-i18n]');
        if (titleElement) {
            const key = titleElement.getAttribute('data-i18n');
            document.title = getTranslation(key);
        }

        // Update HTML lang attribute
        document.documentElement.lang = currentLanguage;

        // Save language preference
        localStorage.setItem('preferredLanguage', currentLanguage);
    }

    // Change language
    function changeLanguage(lang) {
        if (translations[lang]) {
            currentLanguage = lang;
            updatePageContent();
            updateLanguageButtons();
            console.log(`Language changed to: ${lang}`);
        } else {
            console.error(`Language ${lang} not available`);
        }
    }

    // Update active state of language buttons
    function updateLanguageButtons() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            const btnLang = btn.getAttribute('data-lang');
            if (btnLang === currentLanguage) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Initialize language selector buttons
    function initializeLanguageSelector() {
        document.querySelectorAll('.lang-btn').forEach(button => {
            button.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                changeLanguage(lang);
            });
        });
    }

    // Initialize translator
    async function init() {
        // Load saved language preference
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && ['en', 'fr'].includes(savedLanguage)) {
            currentLanguage = savedLanguage;
        }

        // Load translations
        await loadTranslations();

        // Initialize UI
        initializeLanguageSelector();
        updatePageContent();
        updateLanguageButtons();

        console.log('Translator initialized');
    }

    // Public API
    return {
        init: init,
        changeLanguage: changeLanguage,
        getTranslation: getTranslation,
        getCurrentLanguage: () => currentLanguage
    };
})();

// Initialize immediately or when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Translator.init);
} else {
    // DOM already loaded, init now
    Translator.init();
}

// Expose globally for immediate access
window.Translator = Translator;