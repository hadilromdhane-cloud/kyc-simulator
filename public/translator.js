/**
 * Translation Manager
 * All translations embedded - no external JSON file needed
 */

const Translator = (function() {
    'use strict';

    let currentLanguage = 'fr'; // Default language (French) — switched from 'en' so the UI defaults to French on first visit.
    
    // ✅ ALL TRANSLATIONS EMBEDDED HERE
    let translations = {
        "en": {
            "header": {
                "title": "Reis™ RCS · Onboarding Simulator",
                "hero": "Onboarding Simulator",
                "heroAccent": "Simulator",
                "subtitle": "Pre-sales control panel — configure a tenant, pick a flow, hand the link to the analyst.",
                "brandLine": "Vneuron · Reis™ Risk & Compliance Suite"
            },
            "steps": {
                "step1": "Step 1",
                "step2": "Step 2",
                "step3": "Step 3",
                "authenticate": "Authenticate",
                "chooseFlow": "Choose flow",
                "simulate": "Simulate"
            },
            "authentication": {
                "title": "Authenticate",
                "eyebrow": "Tenant Session",
                "tenantName": "Tenant",
                "selectTenant": "Select Tenant",
                "username": "Username",
                "usernamePlaceholder": "Enter username",
                "password": "Password",
                "passwordPlaceholder": "••••••••",
                "authButton": "Authenticate",
                "quickDemo": "Quick Demo Prefill",
                "tokenStatus": "Token Status",
                "noToken": "No Token",
                "sandboxConnected": "Sandbox connected"
            },
            "onboarding": {
                "title": "Core System Onboarding UI",
                "eyebrow": "Customer Due Diligence",
                "decentralized": "Decentralized (link)",
                "centralized": "Centralized (queue)",
                "decentralizedTitle": "Decentralized Onboarding",
                "centralizedTitle": "Centralized Onboarding",
                "decentralizedDesc": "Generate a secure link for the customer to complete KYC asynchronously.",
                "centralizedDesc": "Push the case directly to your compliance queue.",
                "reonboardingDesc": "Refresh KYC for an existing client record.",
                "synchronous": "Synchronous",
                "asynchronous": "Asynchronous (SearchOnboard)",
                "entityType": "Entity Type",
                "selectEntityType": "Select Entity Type",
                "physicalPerson": "Physical Person (PP)",
                "legalPerson": "Legal Person (PM)",
                "simulate": "Simulate",
                "reonboarding": "Re-onboarding",
                "reonboardingTitle": "Re-onboarding"
            },
            "popup": {
                "close": "Close"
            },
            "notifications": {
                "authenticate": "Please authenticate first!",
                "authSuccess": "Authenticated successfully!",
                "authFailed": "Authentication failed!",
                "searchComplete": "Search completed successfully",
                "searchFailed": "Search failed",
                "asyncComplete": "KYC data successfully submitted!",
                "asyncFailed": "Async onboarding failed",
                "tokenRefreshed": "Token refreshed successfully",
                "tokenExpired": "Authentication expired. Please login again.",
                "historyCleared": "History cleared and event tracking reset",
                "selectEntityType": "Please select an entity type",
                "noCustomerId": "Error: Customer ID not found",
                "warningCustomerData": "Warning: Customer data may not be available for onboarding",
                "noNotifications": "No notifications yet.",
                "customer": "Customer",
                "tenant": "Tenant:"
            },
            "buttons": {
                "notifications": "Notifications",
                "notificationsHistory": "Notifications History",
                "tokenStatus": "Token Status",
                "clearHistory": "Clear All History",
                "continueOnboarding": "Continue Onboarding",
                "close": "Close"
            },
            "fields": {
                "firstName": "First Name",
                "lastName": "Last Name",
                "birthDate": "Birth Date",
                "citizenship": "Citizenship",
                "nationality": "Nationality",
                "businessName": "Business Name",
                "queueName": "Queue Name",
                "selectCountry": "Select Country",
                "configuration": "CONFIGURATION",
                "idType": "ID Document Type",
                "idNumber": "ID Document Number",
                "profession": "Profession",
                "targetProducts": "Target Products/Services",
                "distributionChannel": "Distribution Channel",
                "annualIncome": "Annual Net Income (EUR)",
                "numericOnly": "Numeric only",
                "legalForm": "Legal Form",
                "incorporationDate": "Date of Incorporation",
                "registrationNumber": "Registration Number",
                "incorporationCountry": "Country of Incorporation",
                "shareCapital": "Share Capital (EUR)",
                "activitySector": "Activity Sector",
                "fundsOrigin": "Funds Origin",
                "OrigineDesFonds": "Source of Funds",
                "queueDefault": "Default",
                "queueMaker": "Maker",
                "queueChecker": "Checker",
                "selectIdType": "Select ID Type",
                "selectProfession": "Select Profession",
                "selectProduct": "Select Product",
                "selectChannel": "Select Channel",
                "selectLegalForm": "Select Legal Form",
                "selectActivitySector": "Select Activity Sector",
                "selectFundsOrigin": "Select Funds Origin",
                "selectSourceOfFunds": "Select Source of Funds",
                "existingClientId": "Existing Client ID",
                "existingClientIdPlaceholder": "Enter existing client ID"


                
            },
            "messages": {
                "hitsFound": "Some hits were found. You can process them using this link.",
                "noHitsFound": "No hits were found. You can proceed to the next step.",
                "hitsFoundAsync": "Some hits were found. The alert is being processed by the compliance team. You can now continue with the onboarding.",
                "hitsFoundSync": "Some hits were found. The alert has been assigned to the compliance team. You will receive a notification once the alert is processed.",
                "kycDataGathered": "Customer KYC data have been successfully gathered by Reis KYC.\n\nThe Compliance team is currently checking the onboarding data. You will be notified once the process is complete.\n\nIn the meantime, you can access the Reis KYC Customer Card through the following link:",
                "screeningCompleted": "Screening completed for",
                "realWebhookReceived": "Real webhook received for customer",
                "confirmClearHistory": "Clear all notification history and reset event tracking?",
                "customerDataStored": "Customer data successfully stored for secure onboarding transfer",
                "failedStoreCustomerData": "Failed to store customer data for onboarding",
                "noCustomerIdInResponse": "Cannot store customer data: No customer ID found in API response"
            },
            "status": {
                "sanctioned": "SANCTIONED",
                "cleared": "CLEARED",
                "pepYes": "YES",
                "pepNo": "NO",
                "adverseMediaYes": "YES",
                "adverseMediaNo": "NO",
                "pepStatus": "PEP Status:",
                "sanctions": "Sanctions:",
                "adverseMedia": "Adverse Media:",
                "onboardingDecision": "Onboarding Decision:",
                "cannotProceed": "Your customer is confirmed as sanctioned. You cannot proceed with the onboarding.",
                "canProceed": "You can proceed with the onboarding process.",
                "customerKycId": "Customer KYC ID:",
                "processingResults": "Processing Results:",
                "tenant": "Tenant:"
            },
            "popupTitles": {
                "reisKycHits": "Reis KYC Hits Processing Results",
                "screeningResponse": "Reis KYC Screening Response"
            }
        },
        "fr": {
            "header": {
                "title": "Reis™ RCS · Simulateur d'Onboarding",
                "hero": "Simulateur d'Onboarding",
                "heroAccent": "d'Onboarding",
                "subtitle": "Panneau de contrôle pré-vente — configurez un tenant, choisissez un flux, transmettez le lien à l'analyste.",
                "brandLine": "Vneuron · Reis™ Risk & Compliance Suite"
            },
            "steps": {
                "step1": "Étape 1",
                "step2": "Étape 2",
                "step3": "Étape 3",
                "authenticate": "S'authentifier",
                "chooseFlow": "Choisir un flux",
                "simulate": "Simuler"
            },
            "authentication": {
                "title": "Authentification",
                "eyebrow": "Session Tenant",
                "tenantName": "Tenant",
                "selectTenant": "Sélectionner un Tenant",
                "username": "Nom d'utilisateur",
                "usernamePlaceholder": "Entrez le nom d'utilisateur",
                "password": "Mot de passe",
                "passwordPlaceholder": "••••••••",
                "authButton": "S'authentifier",
                "quickDemo": "Pré-remplissage Démo",
                "tokenStatus": "État du Jeton",
                "noToken": "Aucun Jeton",
                "sandboxConnected": "Sandbox connecté"
            },
            "onboarding": {
                "title": "Interface d'Onboarding du Système Central",
                "eyebrow": "Diligence Client",
                "decentralized": "Décentralisé (lien)",
                "centralized": "Centralisé (file)",
                "decentralizedTitle": "Onboarding Décentralisé",
                "centralizedTitle": "Onboarding Centralisé",
                "decentralizedDesc": "Générer un lien sécurisé pour que le client complète le KYC de manière asynchrone.",
                "centralizedDesc": "Envoyer le dossier directement à votre file de conformité.",
                "reonboardingDesc": "Rafraîchir le KYC pour un dossier client existant.",
                "synchronous": "Synchrone",
                "asynchronous": "Asynchrone (SearchOnboard)",
                "entityType": "Type d'Entité",
                "selectEntityType": "Sélectionner un Type d'Entité",
                "physicalPerson": "Personne Physique (PP)",
                "legalPerson": "Personne Morale (PM)",
                "simulate": "Simuler",
                "reonboarding": "Ré-onboarding",
                "reonboardingTitle": "Ré-onboarding"
            },
            "popup": {
                "close": "Fermer"
            },
            "notifications": {
                "authenticate": "Veuillez vous authentifier d'abord !",
                "authSuccess": "Authentification réussie !",
                "authFailed": "Échec de l'authentification !",
                "searchComplete": "Recherche terminée avec succès",
                "searchFailed": "Échec de la recherche",
                "asyncComplete": "Données KYC soumises avec succès !",
                "asyncFailed": "Échec de l'onboarding asynchrone",
                "tokenRefreshed": "Jeton rafraîchi avec succès",
                "tokenExpired": "Authentification expirée. Veuillez vous reconnecter.",
                "historyCleared": "Historique effacé et suivi des événements réinitialisé",
                "selectEntityType": "Veuillez sélectionner un type d'entité",
                "noCustomerId": "Erreur : ID client introuvable",
                "noNotifications": "No notifications yet.",
                "noNotifications": "Aucune notification pour le moment.",
                "customer": "Client",
                "tenant": "Tenant :",
                "warningCustomerData": "Attention : Les données client peuvent ne pas être disponibles pour l'onboarding"
            },
            "buttons": {
                "notifications": "Notifications",
                "notificationsHistory": "Historique des Notifications",
                "tokenStatus": "État du Jeton",
                "clearHistory": "Effacer Tout l'Historique",
                "continueOnboarding": "Continuer l'Onboarding",
                "close": "Fermer"
            },
            "fields": {
                "firstName": "Prénom",
                "lastName": "Nom de Famille",
                "birthDate": "Date de Naissance",
                "citizenship": "Citoyenneté",
                "nationality": "Nationalité",
                "businessName": "Nom de l'Entreprise",
                "queueName": "Nom de la File",
                "selectCountry": "Sélectionner un Pays",
                "configuration": "CONFIGURATION",
                "idType": "Type de pièce d'identité",
                "idNumber": "Numéro de pièce d'identité",
                "profession": "Profession",
                "targetProducts": "Produits/Services cibles",
                "distributionChannel": "Canal de distribution",
                "annualIncome": "Revenu annuel net (EUR)",
                "numericOnly": "Numérique uniquement",
                "legalForm": "Forme juridique",
                "incorporationDate": "Date de constitution",
                "registrationNumber": "Numéro d'immatriculation",
                "incorporationCountry": "Pays de constitution",
                "shareCapital": "Capital social (EUR)",
                "activitySector": "Secteur d'activité",
                "fundsOrigin": "Origine des Fonds",
                "OrigineDesFonds": "Origine des Fonds",
                "queueDefault": "Par défaut",
                "queueMaker": "Créateur",
                "queueChecker": "Vérificateur",
                "selectIdType": "Sélectionner le type",
                "selectProfession": "Sélectionner la profession",
                "selectProduct": "Sélectionner le produit",
                "selectChannel": "Sélectionner le canal",
                "selectLegalForm": "Sélectionner la forme juridique",
                "selectActivitySector": "Sélectionner le secteur d'activité",
                "selectFundsOrigin": "Sélectionner l'origine des fonds",
                "selectSourceOfFunds": "Sélectionner l'origine des fonds",
                "existingClientId": "ID Client Existant",
                "existingClientIdPlaceholder": "Entrez l'ID du client existant"

            },
            "messages": {
                "hitsFound": "Des correspondances ont été trouvées. Vous pouvez les traiter en utilisant ce lien.",
                "noHitsFound": "Aucune correspondance trouvée. Vous pouvez passer à l'étape suivante.",
                "hitsFoundAsync": "Des correspondances ont été trouvées. L'alerte est en cours de traitement par l'équipe de conformité. Vous pouvez maintenant continuer avec l'onboarding.",
                "hitsFoundSync": "Des correspondances ont été trouvées. L'alerte a été assignée à l'équipe de conformité. Vous recevrez une notification une fois l'alerte traitée.",
                "kycDataGathered": "Les données KYC du client ont été collectées avec succès par Reis KYC.\n\nL'équipe de conformité vérifie actuellement les données d'onboarding. Vous serez notifié une fois le processus terminé.\n\nEn attendant, vous pouvez accéder à la Fiche Client Reis KYC via le lien suivant :",
                "screeningCompleted": "Screening terminé pour",
                "realWebhookReceived": "Webhook réel reçu pour le client",
                "confirmClearHistory": "Effacer tout l'historique des notifications et réinitialiser le suivi des événements ?",
                "customerDataStored": "Données client stockées avec succès pour le transfert sécurisé vers l'onboarding",
                "failedStoreCustomerData": "Échec du stockage des données client pour l'onboarding",
                "noCustomerIdInResponse": "Impossible de stocker les données client : Aucun ID client trouvé dans la réponse API"
            },
            "status": {
                "sanctioned": "SANCTIONNÉ",
                "cleared": "APPROUVÉ",
                "pepYes": "OUI",
                "pepNo": "NON",
                "adverseMediaYes": "OUI",
                "adverseMediaNo": "NON",
                "pepStatus": "Statut PEP :",
                "sanctions": "Sanctions :",
                "adverseMedia": "Média Négatif :",
                "onboardingDecision": "Décision d'Onboarding :",
                "cannotProceed": "Votre client est confirmé comme sanctionné. Vous ne pouvez pas procéder à l'onboarding.",
                "canProceed": "Vous pouvez procéder au processus d'onboarding.",
                "customerKycId": "ID KYC Client :",
                "processingResults": "Résultats du Traitement :",
                "tenant": "Tenant :"
            },
            "popupTitles": {
                "reisKycHits": "Résultats du Traitement des Correspondances Reis KYC",
                "screeningResponse": "Réponse du Screening Reis KYC"
            }
        }
    };

    // Get translation by key path (e.g., "authentication.title")
    function getTranslation(key, lang = currentLanguage) {
        const keys = key.split('.');
        let value = translations[lang];
        
        for (let k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn(`Translation not found for key: ${key} in language: ${lang}`);
                return key;
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
                // If the element has child elements (e.g. <i data-lucide> for an icon
                // + <span> for the label), only update the inner <span>'s text so
                // we don't wipe out the icon when translating.
                const innerSpan = element.querySelector(':scope > span');
                if (innerSpan) {
                    innerSpan.textContent = translation;
                } else {
                    element.textContent = translation;
                }
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

    // Re-render form fields when language changes
    function reRenderFormFields() {
        console.log('🔄 Re-rendering form fields after language change...');
        
        // Check which tab is active and re-render its fields
        const activeTab = document.querySelector('.tabBtn.active');
        if (!activeTab) return;
        
        const tabType = activeTab.dataset.tab;
        
        if (tabType === 'decentralized') {
            const entityType = document.getElementById('entityTypeDecentralized').value;
            if (entityType && typeof window.renderFields === 'function') {
                window.renderFields('decentralizedFields', entityType, 'decentralized');
            }
        } else if (tabType === 'centralized') {
            // Check which subtab is active
            const activeSubtab = document.querySelector('.subTabBtn.active');
            if (!activeSubtab) return;
            
            const subtabType = activeSubtab.dataset.subtab;
            
            if (subtabType === 'sync') {
                const entityType = document.getElementById('entityTypeSync').value;
                if (entityType && typeof window.renderFields === 'function') {
                    window.renderFields('syncFields', entityType, 'centralized');
                }
            } else if (subtabType === 'async') {
                const entityType = document.getElementById('entityTypeAsync').value;
                if (entityType && typeof window.renderFields === 'function') {
                    window.renderFields('asyncFields', entityType, 'async');
                }
            } else if (tabType === 'reonboarding') {
                const entityType = document.getElementById('entityTypeReonboarding').value;
                if (entityType && typeof window.renderFields === 'function') {
                    window.renderFields('reonboardingFields', entityType, 'reonboarding');
                }
            }

        }
    }

    // Change language
    function changeLanguage(lang) {
        if (translations[lang]) {
            currentLanguage = lang;
            updatePageContent();
            updateLanguageButtons();
            
            // Re-render form fields when language changes
            reRenderFormFields();
            
            console.log(`✅ Language changed to: ${lang}`);
        } else {
            console.error(`❌ Language ${lang} not available`);
        }
    }

    // Update active state of language buttons
    function updateLanguageButtons() {
        // The pill uses the .lang-toggle-btn class (the .lang-btn variant
        // doesn't exist on this page, so the active highlight was never
        // refreshed when changing language).
        document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
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
        document.querySelectorAll('.lang-toggle-btn').forEach(button => {
  button.addEventListener('click', function() {
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');
    const lang = this.getAttribute('data-lang');
    Translator.changeLanguage(lang);
  });
});
    }

    // Initialize translator
    function init() {
        // Load saved language preference
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && ['en', 'fr'].includes(savedLanguage)) {
            currentLanguage = savedLanguage;
        }

        // Initialize UI
        initializeLanguageSelector();
        updatePageContent();
        updateLanguageButtons();

        console.log('✅ Translator initialized with language:', currentLanguage);
        
        // Emit ready event
        const event = new Event('translatorReady');
        document.dispatchEvent(event);
    }

    // Public API
    return {
        init: init,
        changeLanguage: changeLanguage,
        getTranslation: getTranslation,
        getCurrentLanguage: () => currentLanguage,
        reRenderFormFields: reRenderFormFields
    };
})();

// Initialize immediately or when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Translator.init);
} else {
    Translator.init();
}

// Expose globally for immediate access
window.Translator = Translator;