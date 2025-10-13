/**
 * Translation System for KYC Simulator
 * Supports French (FR) and English (EN)
 */

const translations = {
    fr: {
        // ========== AUTHENTICATION SECTION ==========
        "auth.title": "Authentification",
        "auth.tenant": "Nom du Tenant",
        "auth.username": "Nom d'utilisateur",
        "auth.password": "Mot de passe",
        "auth.button": "S'authentifier",
        "auth.success": "Authentification réussie !",
        "auth.failed": "Échec de l'authentification !",
        "auth.pleaseAuth": "Veuillez vous authentifier d'abord !",
        "auth.tokenRefresh": "Actualisation du token...",
        "auth.tokenRefreshed": "Token actualisé avec succès",
        
        // ========== TABS & NAVIGATION ==========
        "tab.decentralized": "Décentralisé",
        "tab.centralized": "Centralisé",
        "tab.sync": "Synchrone",
        "tab.async": "Asynchrone",
        
        // ========== ENTITY TYPES ==========
        "entity.type": "Type d'entité",
        "entity.selectType": "Sélectionner le type d'entité",
        "entity.pp": "Personne Physique (PP)",
        "entity.pm": "Personne Morale (PM)",
        
        // ========== PP FIELDS (Personne Physique) ==========
        "pp.firstName": "Prénom",
        "pp.lastName": "Nom",
        "pp.birthDate": "Date de naissance",
        "pp.nationality": "Nationalité",
        "pp.citizenship": "Citoyenneté",
        "pp.idType": "Type de pièce d'identité",
        "pp.idNumber": "Numéro de pièce d'identité",
        "pp.profession": "Profession",
        "pp.annualIncome": "Revenu annuel net",
        
        // ========== PM FIELDS (Personne Morale) ==========
        "pm.businessName": "Raison Sociale",
        "pm.legalForm": "Forme Juridique",
        "pm.dateOfIncorporation": "Date de constitution",
        "pm.registrationNumber": "Numéro d'immatriculation",
        "pm.countryOfIncorporation": "Pays d'immatriculation",
        "pm.shareCapital": "Capital social (EUR)",
        "pm.activitySector": "Secteur d'activité",
        "pm.queueName": "Nom de la file d'attente",
        
        // ========== COMMON FIELDS ==========
        "common.products": "Produits/Services cibles",
        "common.channel": "Canal de distribution",
        "common.fundsOrigin": "Origine des fonds",
        "common.country": "Pays",
        "common.selectCountry": "Sélectionner un pays",
        
        // ========== BUTTONS ==========
        "button.submit": "Soumettre",
        "button.search": "Rechercher",
        "button.cancel": "Annuler",
        "button.close": "Fermer",
        "button.continue": "Continuer l'onboarding",
        "button.clearHistory": "Effacer tout l'historique",
        "button.backHome": "Retour à l'accueil",
        
        // ========== ID TYPES ==========
        "idType.cin": "Carte d'identité nationale",
        "idType.passport": "Passeport",
        "idType.residencePermit": "Titre de séjour",
        "idType.drivingLicense": "Permis de conduire",
        "idType.select": "Sélectionner le type",
        
        // ========== PROFESSIONS ==========
        "profession.clergy": "CLERGÉ & RELIGIEUX",
        "profession.commerce": "COMMERCE",
        "profession.artisan": "ARTISAN",
        "profession.executive": "CADRE SUPÉRIEUR",
        "profession.employee": "EMPLOYÉ",
        "profession.liberal": "PROFESSION LIBÉRALE",
        "profession.retired": "RETRAITÉ",
        "profession.student": "ÉTUDIANT",
        "profession.unemployed": "SANS PROFESSION",
        "profession.select": "Sélectionner la profession",
        
        // ========== PRODUCTS ==========
        "product.currentAccount": "Compte courant",
        "product.savingsAccount": "Compte épargne",
        "product.loan": "Prêt",
        "product.creditCard": "Carte de crédit",
        "product.mobileBanking": "Banque mobile",
        "product.select": "Sélectionner le produit",
        
        // ========== CHANNELS ==========
        "channel.branch": "Agence",
        "channel.online": "En ligne",
        "channel.mobile": "Mobile",
        "channel.phone": "Téléphone",
        "channel.select": "Sélectionner le canal",
        
        // ========== LEGAL FORMS ==========
        "legalForm.sarl": "SARL",
        "legalForm.sa": "SA",
        "legalForm.sas": "SAS",
        "legalForm.eurl": "EURL",
        "legalForm.snc": "SNC",
        "legalForm.association": "Association",
        "legalForm.other": "Autre",
        "legalForm.select": "Sélectionner la forme juridique",
        
        // ========== ACTIVITY SECTORS ==========
        "sector.agriculture": "Agriculture",
        "sector.industries": "Industries",
        "sector.manufacture": "Manufacture",
        "sector.energy": "Énergie",
        "sector.construction": "Construction",
        "sector.commerce": "Commerce",
        "sector.transport": "Transport",
        "sector.information": "Information",
        "sector.finance": "Finance",
        "sector.realEstate": "Immobilier",
        "sector.scientific": "Scientifiques",
        "sector.services": "Services",
        "sector.education": "Éducation",
        "sector.health": "Santé",
        "sector.select": "Sélectionner le secteur d'activité",
        
        // ========== FUNDS ORIGIN ==========
        "funds.businessRevenue": "Revenu d'entreprise",
        "funds.investments": "Investissements",
        "funds.loans": "Prêts",
        "funds.shareholders": "Actionnaires",
        "funds.other": "Autre",
        "funds.select": "Sélectionner l'origine des fonds",
        
        // ========== MESSAGES & NOTIFICATIONS ==========
        "msg.searchComplete": "Recherche terminée avec succès",
        "msg.searchFailed": "La recherche a échoué",
        "msg.hitsFound": "Des correspondances ont été trouvées",
        "msg.noHits": "Aucune correspondance trouvée",
        "msg.asyncSubmitted": "Les données KYC du client ont été soumises avec succès",
        "msg.processingAsync": "Le client sera examiné et traité par l'équipe de conformité de manière asynchrone",
        "msg.viewCard": "Vous pouvez consulter la fiche client via ce lien :",
        "msg.tokenStatus": "Statut du token",
        "msg.historyCleared": "Historique effacé et suivi des événements réinitialisé",
        
        // ========== NOTIFICATIONS SYSTEM ==========
        "notif.title": "Notifications",
        "notif.history": "Historique des Notifications",
        "notif.noNotifications": "Aucune notification pour le moment.",
        "notif.customer": "Client",
        "notif.entity": "Entité",
        "notif.tenant": "Tenant",
        "notif.cleared": "AUTORISÉ",
        "notif.sanctioned": "SANCTIONNÉ",
        "notif.pepStatus": "Statut PEP",
        "notif.sanctions": "Sanctions",
        "notif.adverseMedia": "Médias défavorables",
        "notif.yes": "OUI",
        "notif.no": "NON",
        
        // ========== POPUP MESSAGES ==========
        "popup.screeningResults": "Résultats du traitement des correspondances Reis KYC",
        "popup.screeningResponse": "Réponse de filtrage Reis KYC",
        "popup.processingResults": "Résultats du traitement :",
        "popup.onboardingDecision": "Décision d'onboarding :",
        "popup.customerSanctioned": "Votre client est confirmé comme sanctionné. Vous ne pouvez pas procéder à l'onboarding.",
        "popup.customerCleared": "Client autorisé pour l'onboarding. Vous pouvez procéder au processus d'onboarding.",
        "popup.hitsFoundTreat": "Des correspondances ont été trouvées. Vous pouvez traiter les correspondances via ce lien.",
        "popup.noHitsProceed": "Aucune correspondance trouvée. Vous pouvez procéder à l'étape suivante.",
        "popup.hitsAssigned": "Des correspondances ont été trouvées. L'alerte est assignée à l'équipe de conformité. Vous recevrez une notification une fois l'alerte traitée.",
        "popup.asyncOnboarding": "Des correspondances ont été trouvées. L'alerte est en cours de traitement par l'équipe de conformité. Vous pouvez maintenant continuer l'onboarding.",
        "popup.transferSuccess": "Transfert réussi",
        "popup.kycDataSubmitted": "Les données du formulaire KYC de l'entité ont été transférées avec succès de votre système central vers Reis KYC.",
        
        // ========== PLACEHOLDERS ==========
        "placeholder.search": "Rechercher...",
        "placeholder.numericOnly": "Numérique uniquement",
        "placeholder.enterValue": "Entrer une valeur",
        
        // ========== QUEUE NAMES ==========
        "queue.default": "Par défaut",
        "queue.maker": "Créateur",
        "queue.checker": "Vérificateur",
        "queue.configuration": "CONFIGURATION",
        
        // ========== TOKEN STATUS ==========
        "token.valid": "Valide",
        "token.expired": "Expiré",
        "token.needsRefresh": "Nécessite une actualisation",
        "token.noToken": "Aucun token",
        
        // ========== MISC ==========
        "misc.or": "ou",
        "misc.required": "Obligatoire",
        "misc.optional": "Optionnel",
        "misc.loading": "Chargement...",
        "misc.sending": "Envoi en cours...",
        "misc.processing": "Traitement en cours...",
        "misc.riskAssessment": "Évaluation du risque",
        "misc.entityInfo": "Informations sur l'entité",
        "misc.submissionDate": "Date de soumission"
    },
    
    en: {
        // ========== AUTHENTICATION SECTION ==========
        "auth.title": "Authentication",
        "auth.tenant": "Tenant Name",
        "auth.username": "Username",
        "auth.password": "Password",
        "auth.button": "Authenticate",
        "auth.success": "Authentication successful!",
        "auth.failed": "Authentication failed!",
        "auth.pleaseAuth": "Please authenticate first!",
        "auth.tokenRefresh": "Refreshing token...",
        "auth.tokenRefreshed": "Token refreshed successfully",
        
        // ========== TABS & NAVIGATION ==========
        "tab.decentralized": "Decentralized",
        "tab.centralized": "Centralized",
        "tab.sync": "Synchronous",
        "tab.async": "Asynchronous",
        
        // ========== ENTITY TYPES ==========
        "entity.type": "Entity Type",
        "entity.selectType": "Select entity type",
        "entity.pp": "Individual (PP)",
        "entity.pm": "Legal Entity (PM)",
        
        // ========== PP FIELDS (Individual) ==========
        "pp.firstName": "First Name",
        "pp.lastName": "Last Name",
        "pp.birthDate": "Birth Date",
        "pp.nationality": "Nationality",
        "pp.citizenship": "Citizenship",
        "pp.idType": "ID Type",
        "pp.idNumber": "ID Number",
        "pp.profession": "Profession",
        "pp.annualIncome": "Net Annual Income",
        
        // ========== PM FIELDS (Legal Entity) ==========
        "pm.businessName": "Business Name",
        "pm.legalForm": "Legal Form",
        "pm.dateOfIncorporation": "Date of Incorporation",
        "pm.registrationNumber": "Registration Number",
        "pm.countryOfIncorporation": "Country of Incorporation",
        "pm.shareCapital": "Share Capital (EUR)",
        "pm.activitySector": "Activity Sector",
        "pm.queueName": "Queue Name",
        
        // ========== COMMON FIELDS ==========
        "common.products": "Target Products/Services",
        "common.channel": "Distribution Channel",
        "common.fundsOrigin": "Funds Origin",
        "common.country": "Country",
        "common.selectCountry": "Select Country",
        
        // ========== BUTTONS ==========
        "button.submit": "Submit",
        "button.search": "Search",
        "button.cancel": "Cancel",
        "button.close": "Close",
        "button.continue": "Continue Onboarding",
        "button.clearHistory": "Clear All History",
        "button.backHome": "Back to Home",
        
        // ========== ID TYPES ==========
        "idType.cin": "National Identity Card",
        "idType.passport": "Passport",
        "idType.residencePermit": "Residence Permit",
        "idType.drivingLicense": "Driving License",
        "idType.select": "Select type",
        
        // ========== PROFESSIONS ==========
        "profession.clergy": "CLERGY & RELIGIOUS",
        "profession.commerce": "COMMERCE",
        "profession.artisan": "ARTISAN",
        "profession.executive": "SENIOR EXECUTIVE",
        "profession.employee": "EMPLOYEE",
        "profession.liberal": "LIBERAL PROFESSION",
        "profession.retired": "RETIRED",
        "profession.student": "STUDENT",
        "profession.unemployed": "UNEMPLOYED",
        "profession.select": "Select profession",
        
        // ========== PRODUCTS ==========
        "product.currentAccount": "Current Account",
        "product.savingsAccount": "Savings Account",
        "product.loan": "Loan",
        "product.creditCard": "Credit Card",
        "product.mobileBanking": "Mobile Banking",
        "product.select": "Select product",
        
        // ========== CHANNELS ==========
        "channel.branch": "Branch",
        "channel.online": "Online",
        "channel.mobile": "Mobile",
        "channel.phone": "Phone",
        "channel.select": "Select channel",
        
        // ========== LEGAL FORMS ==========
        "legalForm.sarl": "SARL",
        "legalForm.sa": "SA",
        "legalForm.sas": "SAS",
        "legalForm.eurl": "EURL",
        "legalForm.snc": "SNC",
        "legalForm.association": "Association",
        "legalForm.other": "Other",
        "legalForm.select": "Select legal form",
        
        // ========== ACTIVITY SECTORS ==========
        "sector.agriculture": "Agriculture",
        "sector.industries": "Industries",
        "sector.manufacture": "Manufacturing",
        "sector.energy": "Energy",
        "sector.construction": "Construction",
        "sector.commerce": "Commerce",
        "sector.transport": "Transport",
        "sector.information": "Information",
        "sector.finance": "Finance",
        "sector.realEstate": "Real Estate",
        "sector.scientific": "Scientific",
        "sector.services": "Services",
        "sector.education": "Education",
        "sector.health": "Health",
        "sector.select": "Select activity sector",
        
        // ========== FUNDS ORIGIN ==========
        "funds.businessRevenue": "Business Revenue",
        "funds.investments": "Investments",
        "funds.loans": "Loans",
        "funds.shareholders": "Shareholders",
        "funds.other": "Other",
        "funds.select": "Select funds origin",
        
        // ========== MESSAGES & NOTIFICATIONS ==========
        "msg.searchComplete": "Search completed successfully",
        "msg.searchFailed": "Search failed",
        "msg.hitsFound": "Hits found",
        "msg.noHits": "No hits found",
        "msg.asyncSubmitted": "Customer KYC data successfully submitted",
        "msg.processingAsync": "The customer will be screened and processed by the compliance team asynchronously",
        "msg.viewCard": "You can view the customer card via this link:",
        "msg.tokenStatus": "Token Status",
        "msg.historyCleared": "History cleared and event tracking reset",
        
        // ========== NOTIFICATIONS SYSTEM ==========
        "notif.title": "Notifications",
        "notif.history": "Notifications History",
        "notif.noNotifications": "No notifications yet.",
        "notif.customer": "Customer",
        "notif.entity": "Entity",
        "notif.tenant": "Tenant",
        "notif.cleared": "CLEARED",
        "notif.sanctioned": "SANCTIONED",
        "notif.pepStatus": "PEP Status",
        "notif.sanctions": "Sanctions",
        "notif.adverseMedia": "Adverse Media",
        "notif.yes": "YES",
        "notif.no": "NO",
        
        // ========== POPUP MESSAGES ==========
        "popup.screeningResults": "Reis KYC Hits Processing Results",
        "popup.screeningResponse": "Reis KYC Screening Response",
        "popup.processingResults": "Processing Results:",
        "popup.onboardingDecision": "Onboarding Decision:",
        "popup.customerSanctioned": "Your customer is confirmed as sanctioned. You cannot proceed with onboarding.",
        "popup.customerCleared": "Customer cleared for onboarding. You can proceed with the onboarding process.",
        "popup.hitsFoundTreat": "Some hits are found. You can treat the hits via this link.",
        "popup.noHitsProceed": "No hits found. You can proceed with the next step.",
        "popup.hitsAssigned": "Some hits are found. The alert is assigned to the compliance team. You will receive a notification once the alert is treated.",
        "popup.asyncOnboarding": "Some hits are found. The alert is being treated by the compliance team. You can now continue the onboarding.",
        "popup.transferSuccess": "Transfer Successful",
        "popup.kycDataSubmitted": "Entity KYC DATA FORM has successfully transferred from your Core System to Reis KYC.",
        
        // ========== PLACEHOLDERS ==========
        "placeholder.search": "Search...",
        "placeholder.numericOnly": "Numeric only",
        "placeholder.enterValue": "Enter value",
        
        // ========== QUEUE NAMES ==========
        "queue.default": "Default",
        "queue.maker": "Maker",
        "queue.checker": "Checker",
        "queue.configuration": "CONFIGURATION",
        
        // ========== TOKEN STATUS ==========
        "token.valid": "Valid",
        "token.expired": "Expired",
        "token.needsRefresh": "Needs Refresh",
        "token.noToken": "No Token",
        
        // ========== MISC ==========
        "misc.or": "or",
        "misc.required": "Required",
        "misc.optional": "Optional",
        "misc.loading": "Loading...",
        "misc.sending": "Sending...",
        "misc.processing": "Processing...",
        "misc.riskAssessment": "Risk Assessment",
        "misc.entityInfo": "Entity Information",
        "misc.submissionDate": "Submission Date"
    }
};

// Current language (default to French)
let currentLanguage = localStorage.getItem('preferredLanguage') || 'fr';

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g., "auth.title")
 * @returns {string} Translated text or key if not found
 */
function translate(key) {
    const translation = translations[currentLanguage]?.[key];
    if (!translation) {
        console.warn(`Translation missing for key: ${key} in language: ${currentLanguage}`);
        return key;
    }
    return translation;
}

/**
 * Alias for translate function (shorter syntax)
 */
const t = translate;

/**
 * Change the current language
 * @param {string} lang - Language code ('fr' or 'en')
 */
function changeLanguage(lang) {
    if (!translations[lang]) {
        console.error(`Language '${lang}' not supported`);
        return;
    }
    
    currentLanguage = lang;
    
    console.log(`🌍 Language changed to: ${lang.toUpperCase()}`);
    
    // Translate all elements with data-i18n attribute
    translateElements();
    
    // Translate all placeholders
    translatePlaceholders();
    
    // Translate all option elements
    translateOptions();
    
    // Translate all title attributes
    translateTitles();
    
    // Save preference to localStorage
    localStorage.setItem('preferredLanguage', lang);
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
    
    // Update language button states
    updateLanguageButtons(lang);
    
    // Trigger custom event for other parts of the app
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

/**
 * Translate all elements with data-i18n
 */
function translateElements() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = translate(key);
        
        // Handle different element types
        if (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button')) {
            element.value = translation;
        } else {
            element.textContent = translation;
        }
    });
}

/**
 * Translate all placeholders
 */
function translatePlaceholders() {
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = translate(key);
    });
}

/**
 * Translate all option elements
 */
function translateOptions() {
    document.querySelectorAll('option[data-i18n]').forEach(option => {
        const key = option.getAttribute('data-i18n');
        option.textContent = translate(key);
    });
}

/**
 * Translate all title attributes (tooltips)
 */
function translateTitles() {
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = translate(key);
    });
}

/**
 * Update language button active states
 */
function updateLanguageButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        }
    });
}

/**
 * Get current language
 */
function getCurrentLanguage() {
    return currentLanguage;
}

/**
 * Check if a translation key exists
 */
function hasTranslation(key) {
    return translations[currentLanguage]?.[key] !== undefined;
}

// Initialize translations on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferredLanguage') || 'fr';
    console.log(`🚀 Initializing translations with language: ${savedLang.toUpperCase()}`);
    changeLanguage(savedLang);
});

// Make functions globally available
window.translate = translate;
window.t = t;
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = getCurrentLanguage;
window.hasTranslation = hasTranslation;