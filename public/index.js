let translatorReady = false;

// Listen for translator ready event
document.addEventListener('translatorReady', function() {
    console.log('✅ Translator ready event received');
    translatorReady = true;
});

// Helper function to wait for translator
async function waitForTranslator() {
    if (translatorReady) {
        console.log('✅ Translator already ready');
        return Promise.resolve();
    }
    
    return new Promise((resolve) => {
        console.log('⏳ Waiting for Translator...');
        
        const checkInterval = setInterval(() => {
            if (typeof Translator !== 'undefined' && 
                Translator.getTranslation && 
                Translator.getTranslation('fields.firstName') !== 'fields.firstName') {
                console.log('✅ Translator now ready');
                clearInterval(checkInterval);
                translatorReady = true;
                resolve();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('⚠️ Translator timeout - proceeding anyway');
            resolve();
        }, 5000);
    });
}

// Translation function with safety check
function t(key) {
    if (typeof Translator === 'undefined' || !Translator.getTranslation) {
        console.warn('⚠️ Translator not ready for key:', key);
        return key;
    }
    
    const translation = Translator.getTranslation(key);
    return translation;
}


let authToken = null;
let tenantName = null;
let eventSource = null;

// NEW: Add these variables at the top
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds
const API_BASE_URL = 'https://kyc-simulator-api.kyc-simulator.workers.dev';

// TOKEN REFRESH SYSTEM - NEW ADDITION
class TokenManager {
    constructor() {
        this.tokenKey = 'authToken';
        this.tenantKey = 'tenantName';
        this.tokenExpiryKey = 'tokenExpiry';
        this.refreshTokenKey = 'refreshToken';
        this.refreshBuffer = 60; // Refresh 60 seconds before expiry
    }

    // Store token with expiry information
    storeToken(token, tenant, expiresIn = 300) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.tenantKey, tenant);
        localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
        
        console.log(`Token stored, expires in ${expiresIn} seconds`);
        logMessage(`Token stored, expires in ${expiresIn} seconds`, 'success');
    }

    // Store refresh token (for OIDC method)
    storeRefreshToken(refreshToken) {
        localStorage.setItem(this.refreshTokenKey, refreshToken);
    }

    // Get current token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get tenant
    getTenant() {
        return localStorage.getItem(this.tenantKey) || tenantName;
    }

    // Check if token needs refresh
    needsRefresh() {
        const expiryTime = localStorage.getItem(this.tokenExpiryKey);
        if (!expiryTime) return true;
        
        const timeUntilExpiry = parseInt(expiryTime) - Date.now();
        return timeUntilExpiry < (this.refreshBuffer * 1000);
    }

    // Refresh token using standard method
    async refreshTokenStandard() {
        const currentToken = this.getToken();
        const tenant = this.getTenant();
        
        if (!currentToken) {
            throw new Error('No token to refresh');
        }

        console.log('Refreshing token using standard method...');
        logMessage('Refreshing token using standard method...', 'info');

        const response = await fetch('https://greataml.com/kyc-web-restful/xauth/refreshtoken', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-tenant': tenant,
                'x-auth-token': currentToken
            }
        });

        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Assuming the API returns the new token directly or in a specific field
        const newToken = result.token || result.access_token || result;
        
        // Store the new token (assuming same TTL)
        this.storeToken(newToken, tenant, 300);
        
        console.log('Token refreshed successfully');
        logMessage('Token refreshed successfully', 'success');
        showNotification('Token refreshed successfully', 'success');
        return newToken;
    }

    // Refresh token using OIDC method
    async refreshTokenOIDC() {
        const refreshToken = localStorage.getItem(this.refreshTokenKey);
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        console.log('Refreshing token using OIDC method...');
        logMessage('Refreshing token using OIDC method...', 'info');

        const response = await fetch('https://greataml.com/auth/realms/public/protocol/openid-connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: 'reis',
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            throw new Error(`OIDC token refresh failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Store new tokens
        this.storeToken(result.access_token, this.getTenant(), result.expires_in);
        if (result.refresh_token) {
            this.storeRefreshToken(result.refresh_token);
        }
        
        console.log('OIDC token refreshed successfully');
        logMessage('OIDC token refreshed successfully', 'success');
        showNotification('Token refreshed successfully', 'success');
        return result.access_token;
    }

    // Main refresh method - tries standard first, then OIDC
    async refreshToken() {
        try {
            // Try standard method first
            return await this.refreshTokenStandard();
        } catch (error) {
            console.log('Standard refresh failed, trying OIDC...', error.message);
            logMessage('Standard refresh failed, trying OIDC...', 'warning');
            try {
                return await this.refreshTokenOIDC();
            } catch (oidcError) {
                console.error('Both refresh methods failed:', oidcError.message);
                logMessage('Both refresh methods failed. Please login again.', 'error');
                throw new Error('Token refresh failed. Please login again.');
            }
        }
    }

    // Get valid token (refresh if needed)
    async getValidToken() {
        if (this.needsRefresh()) {
            console.log('Token needs refresh...');
            logMessage('Token needs refresh...', 'info');
            return await this.refreshToken();
        }
        return this.getToken();
    }

    // Clear all tokens (for logout)
    clearTokens() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.tenantKey);
        localStorage.removeItem(this.tokenExpiryKey);
        localStorage.removeItem(this.refreshTokenKey);
        console.log('All tokens cleared');
        logMessage('All tokens cleared', 'info');
    }

    // Check token status
    getTokenStatus() {
        const expiryTime = localStorage.getItem(this.tokenExpiryKey);
        if (!expiryTime) return 'No token';
        
        const timeUntilExpiry = parseInt(expiryTime) - Date.now();
        const secondsLeft = Math.floor(timeUntilExpiry / 1000);
        
        if (secondsLeft <= 0) return 'Expired';
        if (secondsLeft < this.refreshBuffer) return `Needs refresh (${secondsLeft}s left)`;
        return `Valid (${secondsLeft}s left)`;
    }
}


// Add this at the top of index.js, after the initial variable declarations

// Translation helper function
function t(key) {
  if (typeof Translator !== 'undefined' && Translator.getTranslation) {
    return Translator.getTranslation(key);
  }
  // Fallback to English if translator not loaded
  return key;
}

// Global token manager instance
const tokenManager = new TokenManager();

// ✅ AUTOMATIC TOKEN REFRESH - Checks every 30 seconds
let tokenRefreshInterval = null;

function setupAutomaticTokenRefresh() {
    // Clear any existing interval
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
    }
    
    // Check token status every 30 seconds
    tokenRefreshInterval = setInterval(async () => {
        const token = tokenManager.getToken();
        
        // Only try to refresh if we have a token
        if (!token) {
            console.log('⏭️ No token to refresh, skipping...');
            return;
        }
        
        // Check if token needs refresh
        if (tokenManager.needsRefresh()) {
            console.log('🔄 Token needs refresh, attempting automatic refresh...');
            try {
                await tokenManager.refreshToken();
                console.log('✅ Token automatically refreshed');
                updateTokenStatusDisplay();
            } catch (error) {
                console.error('❌ Automatic token refresh failed:', error.message);
                showNotification('Session expired. Please login again.', 'warning');
                tokenManager.clearTokens();
                updateTokenStatusDisplay();
            }
        } else {
            console.log('✓ Token still valid, no refresh needed');
        }
    }, 30000); // Check every 30 seconds
    
    console.log('✅ Automatic token refresh system started');
}

// Stop automatic refresh (call on logout)
function stopAutomaticTokenRefresh() {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
        console.log('⏹️ Automatic token refresh stopped');
    }
}



// English countries array (for banque_en and default)
const countriesEnglish = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
    "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
    "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
    "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
    "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
    "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo",
    "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
    "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
    "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
    "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
    "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
    "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan",
    "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos",
    "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
    "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
    "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova",
    "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
    "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
    "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine",
    "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
    "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea",
    "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
    "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
    "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
    "Zambia", "Zimbabwe"
];

// French countries array (for bankfr)
const countriesFrench = [
    "Afghanistan", "Albanie", "Algérie", "Andorre", "Angola", "Antigua-et-Barbuda",
    "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan", "Bahamas",
    "Bahreïn", "Bangladesh", "Barbade", "Bélarus", "Belgique", "Belize", "Bénin",
    "Bhoutan", "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil",
    "Brunei Darussalam", "Bulgarie", "Burkina Faso", "Burundi", "Cabo Verde",
    "Cambodge", "Cameroun", "Canada", "République centrafricaine", "Tchad",
    "Chili", "Chine", "Colombie", "Comores", "Congo", "Costa Rica",
    "Côte d'Ivoire", "Croatie", "Cuba", "Chypre", "Tchéquie",
    "République démocratique du Congo", "Danemark", "Djibouti", "Dominique",
    "République dominicaine", "Équateur", "Égypte", "El Salvador",
    "Guinée équatoriale", "Érythrée", "Estonie", "Éthiopie", "Fidji",
    "Finlande", "France", "Gabon", "Gambie", "Géorgie", "Allemagne",
    "Ghana", "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée-Bissau",
    "Guyana", "Haïti", "Honduras", "Hongrie", "Islande", "Inde",
    "Indonésie", "Iran", "Iraq", "Irlande", "Israël", "Italie",
    "Jamaïque", "Japon", "Jordanie", "Kazakhstan", "Kenya", "Kiribati",
    "Koweït", "Kirghizistan", "République démocratique populaire lao",
    "Lettonie", "Liban", "Lesotho", "Libéria", "Libye", "Liechtenstein",
    "Lituanie", "Luxembourg", "Madagascar", "Malawi", "Malaisie", "Maldives",
    "Mali", "Malte", "Îles Marshall", "Mauritanie", "Maurice", "Mexique",
    "États fédérés de Micronésie", "République de Moldova", "Monaco",
    "Mongolie", "Monténégro", "Maroc", "Mozambique", "Myanmar", "Namibie",
    "Nauru", "Népal", "Pays-Bas", "Nouvelle-Zélande", "Nicaragua", "Niger",
    "Nigéria", "République populaire démocratique de Corée", "Macédoine du Nord",
    "Norvège", "Oman", "Pakistan", "Palaos", "Palestine", "Panama",
    "Papouasie-Nouvelle-Guinée", "Paraguay", "Pérou", "Philippines", "Pologne",
    "Portugal", "Qatar", "Roumanie", "Fédération de Russie", "Rwanda",
    "Saint-Kitts-et-Nevis", "Sainte-Lucie", "Saint-Vincent-et-les Grenadines",
    "Samoa", "Saint-Marin", "Sao Tomé-et-Principe", "Arabie saoudite", "Sénégal",
    "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie",
    "Îles Salomon", "Somalie", "Afrique du Sud", "République de Corée",
    "Soudan du Sud", "Espagne", "Sri Lanka", "Soudan", "Suriname", "Suède",
    "Suisse", "République arabe syrienne", "Tadjikistan",
    "République-Unie de Tanzanie", "Thaïlande", "Timor-Leste", "Togo",
    "Tonga", "Trinité-et-Tobago", "Tunisie", "Turquie", "Turkménistan",
    "Tuvalu", "Ouganda", "Ukraine", "Émirats arabes unis", "Royaume-Uni",
    "États-Unis", "Uruguay", "Ouzbékistan", "Vanuatu", "Saint-Siège",
    "Venezuela", "Viet Nam", "Yémen", "Zambie", "Zimbabwe"
];

// Function to get the appropriate countries array based on tenant
function getCountriesForTenant(tenant) {
    switch(tenant) {
        case 'bankfr':
            return countriesFrench;
        case 'banque_en':
            return countriesEnglish;
        default:
            return countriesEnglish; // Fallback to English
    }
}

// Dynamic countries getter that uses current tenant
function getCurrentCountries() {
    const currentTenant = tokenManager.getTenant() || localStorage.getItem('tenantName') || 'banque_en';
    return getCountriesForTenant(currentTenant);
}

function getVisibleTemplates() {
    return {
        PP: {
            decentralized: [
                { label: t('fields.firstName'), key: 'firstName' },
                { label: t('fields.lastName'), key: 'lastName' },
                { label: t('fields.birthDate'), key: 'birthDate', type: 'date' },
                { label: t('fields.citizenship'), key: 'citizenship', type: 'country' },
                { label: t('fields.nationality'), key: 'nationality', type: 'country' }
            ],
            centralized: [
                { label: t('fields.firstName'), key: 'firstName' },
                { label: t('fields.lastName'), key: 'lastName' },
                { label: t('fields.birthDate'), key: 'birthDate', type: 'date' },
                { label: t('fields.nationality'), key: 'nationality', type: 'country'},
                { label: t('fields.citizenship'), key: 'citizenship',type: 'country' },
                { label: t('fields.queueName'), key: 'queueName' }
            ],
            async: [
                { label: t('fields.firstName'), key: 'firstName', required: true },
                { label: t('fields.lastName'), key: 'lastName', required: true },
                { label: t('fields.birthDate'), key: 'birthDate', type: 'date', required: true },
                { label: t('fields.citizenship'), key: 'citizenship', type: 'country', required: true },
                { label: t('fields.nationality'), key: 'nationality', type: 'country', required: true },
                { label: t('fields.idType'), key: 'typePiece', type: 'idType', required: true },
                { label: t('fields.idNumber'), key: 'numeroPiece', required: true },
                { label: t('fields.profession'), key: 'profession', type: 'profession', required: true },
                { label: t('fields.targetProducts'), key: 'produits', type: 'products', required: true },
                { label: t('fields.distributionChannel'), key: 'canal', type: 'channel', required: true },
                { label: t('fields.annualIncome'), key: 'revenu', type: 'number', placeholder: t('fields.numericOnly'), required: true },
                { label: t('fields.OrigineDesFonds'), key: 'OrigineDesFonds', type: 'fundsOriginPP', required: true }
            ] ,
            reonboarding: [
                { label: t('fields.nationality'), key: 'nationality', type: 'country' },
                { label: t('fields.citizenship'), key: 'Country_of_residence', type: 'country' },
                { label: t('fields.distributionChannel'), key: 'onboarding_channel', type: 'channel' },
                { label: t('fields.profession'), key: 'profession', type: 'profession' },
                { label: t('fields.OrigineDesFonds'), key: 'source_of_funds', type: 'fundsOriginPP' },
                { label: t('fields.targetProducts'), key: 'product', type: 'products' }
            ]
        },
        PM: {
            decentralized: [{ label: t('fields.businessName'), key: 'businessName' }],
            centralized: [
                { label: t('fields.businessName'), key: 'businessName' },
                { label: t('fields.queueName'), key: 'queueName' }
            ],
            async: [
                { label: t('fields.businessName'), key: 'businessName', required: true },
                { label: t('fields.legalForm'), key: 'legalForm', type: 'legalForm', required: true },
                { label: t('fields.incorporationDate'), key: 'dateOfIncorporation', type: 'date', required: true },
                { label: t('fields.registrationNumber'), key: 'registrationNumber', required: true },
                { label: t('fields.incorporationCountry'), key: 'countryOfIncorporation', type: 'country', required: true },
                { label: t('fields.shareCapital'), key: 'shareCapital', type: 'number', placeholder: t('fields.numericOnly'), required: true },
                { label: t('fields.activitySector'), key: 'activitySector', type: 'activitySector', required: true },
                { label: t('fields.distributionChannel'), key: 'canal', type: 'channel', required: true },
                { label: t('fields.targetProducts'), key: 'produits', type: 'products', required: true },
                { label: t('fields.fundsOrigin'), key: 'fundsOrigin', type: 'fundsOrigin', required: true }
            ],
            reonboarding: [
                 { label: t('fields.existingClientId'), key: 'existingClientId' } ]            
        }
    };
}

// Default hidden values
const defaultValues = {
  PP: {
    systemId: "system_001",
    systemName: "T24",
    searchQuerySource: 'KYC',
    queueName: 'Default'
  },
  PM: {
    systemId: "system_001",
    systemName: "T24",
    searchQuerySource: 'KYC',
    queueName: 'Default'
  }
};

const asyncFieldOptions = {
  idType: [
    { value: 'cin', label: 'Carte d\'identité nationale' },
    { value: 'passeport', label: 'Passeport' },
    { value: 'titre_sejour', label: 'Titre de séjour' },
    { value: 'permis_conduire', label: 'Permis de conduire' }
  ],
  profession: [
    'CLERGE & RELIGIEUX',
    'COMMERCANTS',
    'COMM.ARTISAN N.CLASS',
    'PROF LIB.CABINET GR.',
    'PROF.SCIENTIFIQUES',
    'INGENIEURS& ASSIM.',
    'AUT CAD SUP SEC PRIV',
    'AUT CAD SUP SEC PUBL',
    'DIRECTEUR DE SOCIETE',
    'INGENIEURS& ASSIM.',
    'AUT.PERS.DIRIG.SOCIE',
    'CHOMEURS',
        'ARCHITECTES SALARIES',
    'NOTAIRE',
    'COMM.ARTISAN N.CLASS',
    'INCONNU',
    'AGRICULTEUR EXPLOIT.',
    'SALARIES AGRICOLES',
    'AGRICULTEURS N.CLASS',
    'ELEVEUR',
    'INDUSTRIELS',
    'INGENIEURS& ASSIM.',
    'ARTISANS',
    'PATRONS PECHEURS',
    'GROS COM.& CHEF ENT.',
    'PETITS COMMERCANTS'

  ],
  products: [
    { value: 'currentAccount', label: 'Compte courant' },
    { value: 'savingsAccount', label: 'Compte épargne' },
    { value: 'timeDeposit', label: 'Dépôt à Terme' },
    { value: 'creditCard', label: 'Carte de crédit' },
    { value: 'debitCard', label: 'Carte de Débit' },
    { value: 'mobileBanking', label: 'Banque mobile' },
    { value: 'internetBanking', label: 'Internet Banking' },
    { value: 'remittances', label: 'Transferts Argent' }


  ],
  channel: [
    { value: 'inagency', label: 'Agence' },
    { value: 'online', label: 'En ligne' }
  ],
  legalForm: [
    'SARL',
    'SA',
    'SAS',
    'EURL',
    'SNC',
    'Association',
    'Autre'
  ],
   activitySector: [
    'Agriculture',
    'Industries',
    'Manufacture',
    'Energie',
    'Construction',
    'Commerce',
    'Transport',
    'Information',
    'Finance',
    'Immobilier',
    'Scientifiques',
    'Services',
    'Education',
    'Sante'
  ],
    fundsOriginPP: [
      { value: 'employmentIncome', label: 'Revenus d\'Emploi' },
      { value: 'businessProfits', label: 'Bénéfices d\'Entreprise' },
      { value: 'inheritance', label: 'Héritage' },
      { value: 'retirementPension', label: 'Pension de Retraite' },
      { value: 'investmentReturns', label: 'Rendements d\'Investissement' },
      { value: 'familySupport', label: 'Soutien Familial' },
      { value: 'propertyRental', label: 'Location de Biens' },
      { value: 'other', label: 'Autres' }
    ]
};

// English versions of async field options (used when tenant is banque_en)
const asyncFieldOptionsEN = {
  idType: [
    { value: 'cin', label: 'National identity card' },
    { value: 'passeport', label: 'Passport' },
    { value: 'titre_sejour', label: 'Residence permit' },
    { value: 'permis_conduire', label: 'Driver\'s license' }
  ],
  profession: [
    'NOTARY PUBLIC',
    'UNKNOWN',
    'AGRICULTURAL WORKERS',
    'FARMERS',
    'INDUSTRIAL WORKERS',
    'CRAFTSMEN',
    'FISHING INDUSTRY OWNERS',
    'MAJOR CORPORATION & CEO',
    'SMALL RETAILERS',
    'MERCHANTS',
    'COMM.ARTISAN',
    'NURSING ASSISTANT',
    'SELF-EMPLOYED PROFESSIONAL: PHYSICAL PERSON',
    'SCIENTIFIC PROFESSIONALS',
    'ENGINEERS & SIMILAR PROFESSIONS'
  ],
  products: [
    { value: 'Mobile Banking', label: 'Mobile Banking' },
    { value: 'Saving Account', label: 'Saving Account' },
    { value: 'Current Account', label: 'Current Account' },
    { value: 'Time Deposit', label: 'Time Deposit' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Debit Card', label: 'Debit Card' },
    { value: 'Remittances', label: 'Remittances' },
    { value: 'Internet Banking', label: 'Internet Banking' }
  ],
  channel: [
    { value: 'In person / Physical meeting', label: 'In person / Physical meeting' },
    { value: 'Online / Virtual meeting', label: 'Online / Virtual meeting' }
  ],
  legalForm: [
    'SARL',
    'SA',
    'SAS',
    'EURL',
    'SNC',
    'Association',
    'Other'
  ],
  activitySector: [
    'Agriculture',
    'Industries',
    'Manufacture',
    'Energy',
    'Construction',
    'Commerce',
    'Transport',
    'Information',
    'Finance',
    'Real Estate',
    'Scientific',
    'Services',
    'Education',
    'Health'
  ],
  fundsOriginPP: [
    { value: 'Employment Income', label: 'Employment Income' },
    { value: 'Business Profits', label: 'Business Profits' },
    { value: 'Inheritance', label: 'Inheritance' },
    { value: 'Investment Returns', label: 'Investment Returns' },
    { value: 'Retirement Pension', label: 'Retirement Pension' },
    { value: 'Other', label: 'Other' },
    { value: 'Project manager', label: 'Project manager' }
  ]
};

// Helper to pick the appropriate options object based on the authenticated tenant
function getAsyncFieldOptions() {
  const tenant = (typeof tokenManager !== 'undefined' && tokenManager.getTenant && tokenManager.getTenant())
    || localStorage.getItem('tenantName')
    || 'bankfr';
  return tenant === 'banque_en' ? asyncFieldOptionsEN : asyncFieldOptions;
}

// FIXED renderFields function
function renderFields(containerId, entityType, processType) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    console.log('=== renderFields called ===');
    console.log('containerId:', containerId);
    console.log('entityType:', entityType);
    console.log('processType:', processType);
    
    container.innerHTML = '';

    // ✅ CALL THE FUNCTION TO GET FRESH TRANSLATIONS
    const visibleTemplates = getVisibleTemplates();

    // Determine which template to use
    let fields;
    if (containerId === 'asyncFields' || processType === 'async') {
        fields = visibleTemplates[entityType]?.async || [];
        console.log('✅ Using ASYNC template with', fields.length, 'fields');
    } else {
        fields = visibleTemplates[entityType]?.[processType] || [];
        console.log('Using', processType, 'template with', fields.length, 'fields');
    }

  if (fields.length === 0) {
    console.warn('⚠️ No fields found for', entityType, processType);
    return;
  }

  fields.forEach(field => {
    // Special handling for Queue Name field
    if (field.key === 'queueName') {
      // Create wrapper with blue corporate style
      const queueWrapper = document.createElement('div');
      queueWrapper.style.cssText = `
        border: 2px solid #007ACC;
        border-radius: 8px;
        padding: 15px;
        background: #f0f8ff;
        position: relative;
        margin-top: 20px;
        margin-bottom: 10px;
      `;
      
      // Create configuration header badge
      const configHeader = document.createElement('div');
      configHeader.textContent = t('fields.configuration');      configHeader.style.cssText = `
        position: absolute;
        top: -12px;
        left: 15px;
        background: #007ACC;
        color: white;
        padding: 3px 15px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 0.5px;
      `;
      queueWrapper.appendChild(configHeader);
      
      // Create label
      const label = document.createElement('label');
      label.textContent = field.label + ':';
      label.style.cssText = `
        color: #007ACC;
        font-weight: bold;
        display: block;
        margin-bottom: 8px;
      `;
      
      // Create select input
      const input = document.createElement('select');
      input.id = containerId + '_' + field.key;
      input.style.cssText = `
        width: 100%;
        background: white;
        border: 2px solid #007ACC;
        color: #004080;
        font-weight: 600;
        padding: 10px;
        border-radius: 5px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      
      // Add hover effect
      input.onmouseover = () => {
        input.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.3)';
        input.style.transform = 'translateY(-2px)';
      };
      input.onmouseout = () => {
        input.style.boxShadow = 'none';
        input.style.transform = 'translateY(0)';
      };

      const queueOptions = ['Default', 'Maker', 'Checker'];
      queueOptions.forEach(queueOption => {
        const option = document.createElement('option');
        option.value = queueOption;
        option.textContent = queueOption;
        input.appendChild(option);
      });
      
      input.value = 'Default';
      
      queueWrapper.appendChild(label);
      queueWrapper.appendChild(input);
      container.appendChild(queueWrapper);
      
    } else {
      // Regular field handling
      const label = document.createElement('label');
      label.textContent = field.label + (field.required ? ' *:' : ':');
      if (field.required) {
        label.style.fontWeight = 'bold';
      }

      let input;
      
      // Handle different field types
      if (field.type === 'country' || field.key === 'citizenship' || field.key === 'nationality' || field.key === 'countryOfIncorporation') {
        input = document.createElement('select');
        input.id = containerId + '_' + field.key;
        if (field.required) input.required = true;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = t('fields.selectCountry');
        input.appendChild(defaultOption);

        const currentCountries = getCurrentCountries();
        currentCountries.forEach(country => {
          const option = document.createElement('option');
          option.value = country;
          option.textContent = country;
          input.appendChild(option);
        });
      } 
      else if (field.type === 'idType') {
        input = document.createElement('select');
        input.id = containerId + '_' + field.key;
        if (field.required) input.required = true;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = t('fields.selectIdType');
        input.appendChild(defaultOption);

        getAsyncFieldOptions().idType.forEach(type => {
          const option = document.createElement('option');
          option.value = type.value;
          option.textContent = type.label;
          input.appendChild(option);
        });
      }
      else if (field.type === 'profession') {
        input = document.createElement('select');
        input.id = containerId + '_' + field.key;
        if (field.required) input.required = true;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = t('fields.selectProfession');
        input.appendChild(defaultOption);

        getAsyncFieldOptions().profession.forEach(prof => {
          const option = document.createElement('option');
          option.value = prof;
          option.textContent = prof;
          input.appendChild(option);
        });
      }
      else if (field.type === 'products') {
        input = document.createElement('select');
        input.id = containerId + '_' + field.key;
        if (field.required) input.required = true;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = t('fields.selectProduct');
        input.appendChild(defaultOption);

        getAsyncFieldOptions().products.forEach(product => {
          const option = document.createElement('option');
          option.value = product.value;
          option.textContent = product.label;
          input.appendChild(option);
        });
      }
      else if (field.type === 'channel') {
        input = document.createElement('select');
        input.id = containerId + '_' + field.key;
        if (field.required) input.required = true;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = t('fields.selectChannel');
        input.appendChild(defaultOption);

        getAsyncFieldOptions().channel.forEach(channel => {
          const option = document.createElement('option');
          option.value = channel.value;
          option.textContent = channel.label;
          input.appendChild(option);
        });
      }
      else if (field.type === 'legalForm') {
        input = document.createElement('select');
        input.id = containerId + '_' + field.key;
        if (field.required) input.required = true;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = t('fields.selectLegalForm');
        input.appendChild(defaultOption);

        getAsyncFieldOptions().legalForm.forEach(form => {
          const option = document.createElement('option');
          option.value = form;
          option.textContent = form;
          input.appendChild(option);
        });
      }
      else if (field.type === 'activitySector') {
  input = document.createElement('select');
  input.id = containerId + '_' + field.key;
  if (field.required) input.required = true;

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = t('fields.selectActivitySector');
  input.appendChild(defaultOption);

  getAsyncFieldOptions().activitySector.forEach(sector => {
    const option = document.createElement('option');
    option.value = sector;
    option.textContent = sector;
    input.appendChild(option);
  });
}
else if (field.type === 'fundsOriginPP') {
  input = document.createElement('select');
  input.id = containerId + '_' + field.key;
  if (field.required) input.required = true;

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Sélectionner --';
  input.appendChild(defaultOption);

  getAsyncFieldOptions().fundsOriginPP.forEach(origin => {
    const option = document.createElement('option');
    option.value = origin.value;
    option.textContent = origin.label;
    input.appendChild(option);
  });
}
      else {
        input = document.createElement('input');
        input.id = containerId + '_' + field.key;
        
        // Check both field.type and field.key for date fields
        if (field.type === 'date' || field.key === 'birthDate') {
          input.type = 'date';
        } else if (field.type === 'number') {
          input.type = 'number';
          input.min = '0';
          input.step = '1';
        } else {
          input.type = 'text';
        }
        
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.required) input.required = true;
      }

      container.appendChild(label);
      container.appendChild(input);
    }
  });
  
  console.log('✅ Successfully rendered', fields.length, 'fields in', containerId);
}
// Helper functions for document types
function getDocumentTypeId(docType) {
  const typeMap = {
    'cin': 1,
    'passeport': 13,
    'titre_sejour': 2,
    'permis_conduire': 3
  };
  return typeMap[docType] || 1;
}

function getDocumentTypeName(docType) {
  const nameMap = {
    'cin': 'Carte d\'identité nationale',
    'passeport': 'Passeport',
    'titre_sejour': 'Titre de séjour',
    'permis_conduire': 'Permis de conduire'
  };
  return nameMap[docType] || 'Carte d\'identité nationale';
}

// NEW: Create payload for async onboarding
function createAsyncOnboardingPayload(entityType, formData) {
  const customerId = parseInt(formData.customerId) || Math.floor(Math.random() * 10000);
  const currentDateTime = new Date().toISOString();
  
  if (entityType === 'PP') {
    return {
      systemName: "T24",
      systemId: formData.systemId || `system_${Date.now()}`,
      formId: "1",
      onBehalfOfUser: "admin",
      items: {
        isSanctionnedWorkflow: "Non",
        AddressDataGrid: [],
        PaysDeResidence: formData.citizenship || formData.PaysDeResidence ,
        address: [],
        address_doc: [],
        address_proof_type: {},
        adresseDeResidence: "",
        agence: "headquarters",
        agencyId: 3,
        agencyName: "headquarters",
        agency_location: null,
        birth_date: formData.birthDate || "",
        businessName: "",
        CanalDeDistribution: formData.canal || "",
        citizenship: formData.citizenship || "",
        containerelm: {
          "profession-2": "",
          retrieved_dob: "",
          retrieved_last_name: "",
          retrieved_first_name: "",
          "citizenship-2": "",
          retrieved_address: ""
        },
        createdBy: "admin",
        createdOn: currentDateTime,
        creatorFirstName: "System",
        creatorId: 1,
        creatorLastName: "User",
        current_date: currentDateTime,
        current_user_id: 1,
        current_user_name: "System User",
        cus_birth_date: formData.birthDate || "",
        customerUrl: "https://greataml.com/",
        customer_type: "manual-entry",
        dataGrid: [{
          select: "",
          nature: "",
          tx_nature: {}
        }],
        dataGrid1: [{
          source_of_funds_doctype: {},
          source_of_funds_doc: []
        }],
        delivery_date: "",
        distribution_channel: null,
        dpr: "",
        eaiIds: {},
        email: "",
        entityType: "PP",
        expiry_date: "",
        extendedProperties: {},
        first_name: formData.firstName || "",
        fiscale_ville: "",
        form_entity_type: "PP",
        hasRiskedCountry: false,
        id: customerId,
        id_doc: [],
        invokeElm: false,
        isPEP: false,
        isPepWorkflow: "<li>Personne politiquement exposée : <b> <span> Non</span></b></li>",
        isSanctioned: false,
        isSanctionned: false,
        is_hq_user: false,
        last_name: formData.lastName || "",
        last_update: currentDateTime,
        listsNames: [],
        luneDeVosRelationsPresenteTElleLunDesIndicesDamericaniteDefinisParLaLoiFatca: "",
        marital_status: "",
        modificationDate: currentDateTime,
        mscq: "",
        Nationalite: formData.nationality || "",
        nid: formData.numeroPiece || "",
        obnl_name: formData.lastName || "",
        OrigineDesFonds:formData.OrigineDesFonds || "",
        outboundSystems: null,
        pays: formData.nationality || "",
        pep: "",
        pliberal: "",
        postal_code: "",
        process_type: "",
        Produit: [formData.produits || ""],
        Profession: formData.profession || "",
        revenuAnnuelNet: parseInt(formData.revenu) || 0,
        rm_fn: "System",
        rm_ln: "User",
        rm_username: "admin",
        searchId: Math.floor(Math.random() * 100000),
        tel1: "",
        tel2: "",
        tiin_doc: [],
        tin_: {
          id: getDocumentTypeId(formData.typePiece),
          name: getDocumentTypeName(formData.typePiece),
          value: formData.typePiece || "",
          translate: getDocumentTypeName(formData.typePiece),
          parentId: null,
          parentName: null,
          uniqueCode: `${getDocumentTypeName(formData.typePiece)}:${formData.typePiece}:tin`,
          tags: ["tin"]
        },
        url: "https://greataml.com/"
      }
    };
  } 
  else if (entityType === 'PM') {
  return {
    systemName: "T24",
    systemId: formData.systemId || `system_${Date.now()}`,
    formId: "2",
    onBehalfOfUser: "admin",
    items: {
      businessName: formData.businessName || "",
      legalForm: formData.legalForm || "",
      dateOfIncorporation: formData.dateOfIncorporation || "",
      countryOfIncorporation: formData.countryOfIncorporation || "",
      registrationNumber: formData.registrationNumber || "",
      shareCapital: parseInt(formData.shareCapital) || 0,
      activitySector: formData.activitySector || "",
      CanalDeDistribution: formData.canal || "",
      Produit: [formData.produits || ""],
      fundsOrigin: formData.fundsOrigin || "",
      entityType: "PM",
      form_entity_type: "PM",
      createdBy: "admin",
      createdOn: currentDateTime,
      current_date: currentDateTime,
      id: customerId,
      agence: "headquarters",
      agencyId: 3,
      agencyName: "headquarters",
      birth_date: formData.dateOfIncorporation || "",
      nationality: formData.countryOfIncorporation || "",
      revenuAnnuelNet: 0,
      customer_type: "manual-entry"
    }
  };
}
}


// Async onboarding function
async function callSearchAsync(entityType, containerId) {
  if (!tenantName) { 
  showNotification(t('notifications.authenticate'), 'warning');
    return; 
  }

  logMessage(`Starting async onboarding for ${entityType}...`, 'info');

  try {
    let currentAuthToken;
    try {
      currentAuthToken = await tokenManager.getValidToken();
      if (!currentAuthToken) {
        throw new Error('No valid token available');
      }
      logMessage('Using valid token for async onboarding', 'info');
    } catch (tokenError) {
      logMessage('Token validation failed: ' + tokenError.message, 'error');
      showNotification('Authentication expired. Please login again.', 'error');
      return;
    }

    // Collect form data
    let formData = {};
    document.querySelectorAll(`#${containerId} input, #${containerId} select`).forEach(input => {
      formData[input.id.replace(containerId + '_', '')] = input.value;
    });

    // Generate system ID similar to screening flow (not random)
    // Use a combination of timestamp and customer info for traceability
    const customerIdentifier = `${formData.firstName || 'ASYNC'}_${formData.lastName || 'CUSTOMER'}_${Date.now()}`;
    const generatedSystemId = `system_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Store the mapping for potential future use
    localStorage.setItem(`systemId_${customerIdentifier}`, generatedSystemId);
    console.log('Generated systemId for async customer:', customerIdentifier, '→', generatedSystemId);
    
    formData.systemId = generatedSystemId;
    formData.customerId = Math.floor(Math.random() * 10000);

    // Store customer data with system ID for potential onboarding page use
    const customerData = {
      customerId: formData.customerId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate,
      Nationalite: formData.nationality,
      citizenship: formData.citizenship,
      PaysDeResidence: formData.citizenship,
      systemId: generatedSystemId,
      systemName: "T24",
      entityType: entityType,
      tenant: tenantName,
      timestamp: new Date().toISOString(),
      processType: 'async'
    };
    
    // Store for potential onboarding continuation
    localStorage.setItem(`customerData_${formData.customerId}`, JSON.stringify(customerData));
    console.log('Stored customer data for async onboarding:', customerData);
    
    localStorage.setItem(`processType_${formData.customerId}`, 'async');

    // Create the async onboarding payload
    const payload = createAsyncOnboardingPayload(entityType, formData);

    console.log('Async onboarding payload:', payload);

    // Call the onboarding API directly
    const endpoint = 'https://greataml.com/kyc-web-restful/onboarding/v2/searchOnboardCustomer';
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-auth-tenant': tenantName,
        'x-auth-token': currentAuthToken
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Async onboarding response:', data);

    // ✅ Get the Reis ID from the response FIRST
    const reisId = data.reisId || data.reis_id || data.id || data.customerId;
    
    // ✅ CRITICAL FIX: Store processType using the ACTUAL reisId from response
    if (reisId) {
      localStorage.setItem(`processType_${reisId}`, 'async');
      console.log(`✅ Stored processType=async for reisId: ${reisId}`);
      
      // Also update the customerData with the correct reisId
      const updatedCustomerData = {
        ...customerData,
        customerId: reisId, // Update with actual ID
        reisId: reisId,
        processType: 'async'
      };
      localStorage.setItem(`customerData_${reisId}`, JSON.stringify(updatedCustomerData));
      console.log(`✅ Updated customerData with reisId: ${reisId}`);
    }

    logMessage(`Async onboarding completed for ${entityType}`, 'success');
    showNotification(`${entityType} KYC data successfully submitted!`, 'success');

    const customerWatchListUrl = `https://greataml.com/profiles/customer-card/${reisId}`;

    // Determine the entity label for the message
    const entityLabel = entityType === 'PM' ? 'entity' : 'customer';

    // Show success popup with the correct message and watch list link
showScreeningResponsePopup(
  `<div style="text-align: left; line-height: 1.8;">
    <div style="padding: 15px; background: #f0f8ff; border-radius: 6px; margin-bottom: 20px;">
      <strong style="color: #007ACC; font-size: 1.05rem;">👤 Front User View</strong>
      <p style="margin: 10px 0 5px 0;">Your account has been successfully created.</p>
      <p style="margin: 0;">It is now being processed!</p>
    </div>
    
    <div style="border-top: 2px solid #e0e0e0; margin: 25px 0;"></div>
    
    <div style="padding: 15px; background: #fff8f0; border-radius: 6px;">
      <strong style="color: #FF9800; font-size: 1.05rem;">👮 Officer View</strong>
      <p style="margin: 10px 0 5px 0;">Customer KYC data have been successfully gathered by Reis KYC.</p>
      <p style="margin: 5px 0;">The Compliance team is currently checking the onboarding data. You will be notified once the process is complete.</p>
      <p style="margin: 5px 0 0 0;">In the meantime, you can access the Reis KYC Customer Card through the following link:</p>
    </div>
  </div>`,
  customerWatchListUrl,
  false,
  formData,
  data
);






  } catch (err) {
    const errorMsg = `Async onboarding error: ${err.message}`;
    logMessage(errorMsg, 'error');
    showNotification('Async onboarding failed: ' + err.message, 'error');
    console.error('Full error:', err);
  }
}

let sessionEvents = JSON.parse(sessionStorage.getItem('kycEvents')) || [];
let sessionEventCounter = parseInt(sessionStorage.getItem('kycEventCounter')) || 0;

// Add this function to store search data for webhook linking
function storeSearchEventForWebhook(searchData, searchResponse) {
  const tempData = {
    searchQueryId: searchResponse.search_query_id,
    customerId: searchData.customerId || `${searchData.firstName}_${searchData.lastName}`,
    systemId: searchData.systemId,
    timestamp: Date.now(),
    searchData: searchData
  };
  
  sessionStorage.setItem(`pending_webhook_${searchResponse.search_query_id}`, JSON.stringify(tempData));
  console.log('Stored pending webhook data:', tempData);
}

// Add this function to handle real webhook events
function handleRealWebhookEvent(webhookData) {
  sessionEventCounter++;
  
  // Get current tenant name AT THE TIME OF EVENT CREATION
  const eventTenant = tokenManager.getTenant() || localStorage.getItem('tenantName') || 'Unknown';
  
  const realEvent = {
    id: sessionEventCounter,
    timestamp: new Date().toISOString(),
    customerId: webhookData.customerId,
    source: 'Reis_KYC',
    tenant: eventTenant,
    search_query_id: webhookData.searchQueryId,
    isPEP: webhookData.isPEP || false,
    isSanctioned: webhookData.isSanctioned || false,
    isAdverseMedia: webhookData.isAdverseMedia || false,
    pepDecision: webhookData.pepDecision || (webhookData.isPEP ? 'HIT' : 'NO_HIT'),
    sanctionDecision: webhookData.sanctionDecision || (webhookData.isSanctioned ? 'HIT' : 'NO_HIT'),
    message: `Real screening completed for customer ${webhookData.customerId}`,
    originalData: webhookData,
    isReal: true
  };
  
  sessionEvents.unshift(realEvent);
  if (sessionEvents.length > 50) {
    sessionEvents = sessionEvents.slice(0, 50);
  }
  
  sessionStorage.setItem('kycEvents', JSON.stringify(sessionEvents));
  sessionStorage.setItem('kycEventCounter', sessionEventCounter.toString());
  
  showNotification(`[${eventTenant}] Real webhook received for customer ${realEvent.customerId}`, 'warning');
  showScreeningResultsPopup(realEvent);
  
  notificationsHistory.unshift(realEvent);
  localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
  updateNotificationBadge();
  
  console.log('Real webhook event processed:', realEvent);
}

function createNotificationElements() {
  const container = document.getElementById('notificationContainer');
  const button = document.getElementById('notificationHistoryBtn');
  
  if (container && button && button.innerHTML) {
    console.log('✅ Notification elements already exist, skipping creation');
    updateNotificationBadge();
    updateTokenStatusDisplay();
    return;
  }

  // Set button text
  if (button) {
    button.innerHTML = t('buttons.notifications');
    button.onclick = showNotificationHistory;
  }

  updateNotificationBadge();
  updateTokenStatusDisplay();
}
// =====================================================================
// RE-ONBOARDING FIELD PICKER
// The picker shows checkboxes for every re-onboardable field. Ticking a
// checkbox dynamically appends the corresponding input/select below; unticking
// removes it. Only the visible fields are sent to the API on submit.
//
// Field names are TENANT-AWARE: bankfr uses the French-named keys
// (Nationalite, Profession, Produit[], OrigineDesFonds[], CanalDeDistribution,
// PaysDeResidence) that the bankfr API expects; banque_en uses the
// English-named keys (nationality, Country_of_residence, citizenship,
// profession, product[], onboarding_channel, source_of_funds[]) — same
// shape sent during the regular onboarding flow on each tenant.
// `wrapArray: true` means the value is sent as a single-item array.
// =====================================================================
const REONBOARD_FIELDS_BY_TENANT = {
  bankfr: {
    PP: [
      { key: 'Nationalite',          label: 'Nationalité',           type: 'country' },
      { key: 'PaysDeResidence',      label: 'Pays de Résidence',     type: 'country' },
      { key: 'Profession',           label: 'Profession',            type: 'profession' },
      { key: 'Produit',              label: 'Produits cibles',       type: 'products',     wrapArray: true },
      { key: 'CanalDeDistribution',  label: 'Canal de Distribution', type: 'channel' },
      { key: 'OrigineDesFonds',      label: 'Origine des Fonds',     type: 'fundsOriginPP', wrapArray: true }
    ],
    PM: [
      { key: 'businessName',           label: 'Raison Sociale',          type: 'text' },
      { key: 'PaysDeResidence',        label: 'Pays de Résidence',       type: 'country' },
      { key: 'activity',               label: "Secteur d'activité",      type: 'activitySector' },
      { key: 'Produit',                label: 'Produits cibles',         type: 'products',      wrapArray: true },
      { key: 'canal_de_distribution',  label: 'Canal de Distribution',   type: 'channel' },
      { key: 'origine_des_fonds',      label: 'Origine des Fonds',       type: 'fundsOriginPP', wrapArray: true }
    ]
  },
  banque_en: {
    PP: [
      { key: 'nationality',          label: 'Nationality',          type: 'country' },
      { key: 'Country_of_residence', label: 'Country of Residence', type: 'country' },
      { key: 'citizenship',          label: 'Citizenship',          type: 'country' },
      { key: 'profession',           label: 'Profession',           type: 'profession' },
      { key: 'product',              label: 'Target Product',       type: 'products',     wrapArray: true },
      { key: 'onboarding_channel',   label: 'Distribution Channel', type: 'channel' },
      { key: 'source_of_funds',      label: 'Source of Funds',      type: 'fundsOriginPP', wrapArray: true }
    ],
    PM: [
      { key: 'businessName',           label: 'Business Name',          type: 'text' },
      { key: 'Country_of_residence',   label: 'Country of Residence',   type: 'country' },
      { key: 'activity',               label: 'Activity Sector',        type: 'activitySector' },
      { key: 'product',                label: 'Target Product',         type: 'products',      wrapArray: true },
      { key: 'onboarding_channel',     label: 'Distribution Channel',   type: 'channel' },
      { key: 'source_of_funds',        label: 'Source of Funds',        type: 'fundsOriginPP', wrapArray: true }
    ]
  }
};

function getCurrentReonboardTenantConfig() {
  const tenant = (typeof tokenManager !== 'undefined' && tokenManager.getTenant && tokenManager.getTenant())
    || localStorage.getItem('tenantName')
    || 'bankfr';
  // Fallback to bankfr config for any unknown tenant — its French names are
  // the original schema and what the API has historically accepted.
  return REONBOARD_FIELDS_BY_TENANT[tenant] || REONBOARD_FIELDS_BY_TENANT.bankfr;
}

function getReonboardFieldDef(entityType, key) {
  const cfg = getCurrentReonboardTenantConfig();
  const list = cfg[entityType] || [];
  return list.find(f => f.key === key);
}

function renderReonboardPicker(entityType) {
  const fieldsContainer = document.getElementById('reonboardingFields');
  if (!fieldsContainer) return;
  const tenantCfg = getCurrentReonboardTenantConfig();
  const fields = tenantCfg[entityType] || [];

  // Remove any previous picker
  const oldPicker = document.getElementById('reonboardFieldPicker');
  if (oldPicker) oldPicker.remove();

  const picker = document.createElement('div');
  picker.id = 'reonboardFieldPicker';
  picker.style.cssText = `
    margin: 14px 0 4px;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(245,246,250,0.7) 100%);
    backdrop-filter: blur(14px) saturate(140%);
    border: 1px solid #DEE1EB;
    border-radius: 14px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 4px 12px -6px rgba(20,23,37,0.08);
    font-family: 'Raleway','Inter',sans-serif;
  `;
  picker.innerHTML = `
    <div style="font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#343B95; margin-bottom:8px;">
      Fields to update
    </div>
    <div style="color:#4E556F; font-size:12px; margin-bottom:10px;">
      Pick the values you want to change. Only the selected fields will be sent.
    </div>
    <div id="reonboardFieldChips" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
  `;
  fieldsContainer.parentNode.insertBefore(picker, fieldsContainer);

  const chipsBox = picker.querySelector('#reonboardFieldChips');
  fields.forEach(f => {
    const id = `reonboardChip_${f.key}`;
    const chip = document.createElement('label');
    chip.setAttribute('for', id);
    chip.style.cssText = `
      display:inline-flex; align-items:center; gap:6px;
      padding: 6px 12px;
      background: #fff; border: 1px solid #DEE1EB; border-radius: 999px;
      font-size: 12px; font-weight: 600; color: #363C52; cursor: pointer;
      transition: all .15s ease;
      user-select: none;
    `;
    chip.innerHTML = `
      <input type="checkbox" id="${id}" data-key="${f.key}" data-type="${f.type}" data-label="${f.label}" style="margin:0;">
      <span>${f.label}</span>
    `;
    const cb = chip.querySelector('input');
    cb.addEventListener('change', () => {
      if (cb.checked) {
        chip.style.background = 'linear-gradient(135deg, rgba(14,177,175,0.10) 0%, rgba(126,88,161,0.12) 100%)';
        chip.style.borderColor = '#0EB1AF';
        chip.style.color = '#11132D';
      } else {
        chip.style.background = '#fff';
        chip.style.borderColor = '#DEE1EB';
        chip.style.color = '#363C52';
      }
      toggleReonboardField(f.key, f.type, f.label, cb.checked);
    });
    chipsBox.appendChild(chip);
  });
}

function toggleReonboardField(key, type, label, show) {
  const container = document.getElementById('reonboardingFields');
  const existing = document.getElementById(`reonboardWrap_${key}`);
  if (!show) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return; // already shown

  const wrap = document.createElement('div');
  wrap.id = `reonboardWrap_${key}`;
  wrap.style.cssText = 'display:flex; flex-direction:column; margin-top: 12px;';

  const lbl = document.createElement('label');
  lbl.setAttribute('for', `reonboardingFields_${key}`);
  lbl.textContent = label;
  lbl.style.cssText = 'font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#343B95; margin-bottom:6px;';
  wrap.appendChild(lbl);

  const input = buildReonboardInput(key, type);
  input.id = `reonboardingFields_${key}`;
  wrap.appendChild(input);

  container.appendChild(wrap);
}

function buildReonboardInput(key, type) {
  const opts = (typeof getAsyncFieldOptions === 'function') ? getAsyncFieldOptions() : (typeof asyncFieldOptions !== 'undefined' ? asyncFieldOptions : {});
  let sel;

  const blank = () => {
    const o = document.createElement('option');
    o.value = ''; o.textContent = '-- Select --';
    return o;
  };

  switch (type) {
    case 'country': {
      sel = document.createElement('select');
      sel.appendChild(blank());
      const list = (typeof getCurrentCountries === 'function') ? getCurrentCountries() : [];
      list.forEach(c => {
        const o = document.createElement('option');
        o.value = c; o.textContent = c;
        sel.appendChild(o);
      });
      return sel;
    }
    case 'profession': {
      sel = document.createElement('select');
      sel.appendChild(blank());
      (opts.profession || []).forEach(p => {
        const o = document.createElement('option');
        o.value = p; o.textContent = p;
        sel.appendChild(o);
      });
      return sel;
    }
    case 'products': {
      sel = document.createElement('select');
      sel.appendChild(blank());
      (opts.products || []).forEach(p => {
        const o = document.createElement('option');
        o.value = p.value; o.textContent = p.label;
        sel.appendChild(o);
      });
      return sel;
    }
    case 'channel': {
      sel = document.createElement('select');
      sel.appendChild(blank());
      (opts.channel || []).forEach(c => {
        const o = document.createElement('option');
        o.value = c.value; o.textContent = c.label;
        sel.appendChild(o);
      });
      return sel;
    }
    case 'fundsOriginPP': {
      sel = document.createElement('select');
      sel.appendChild(blank());
      (opts.fundsOriginPP || []).forEach(f => {
        const o = document.createElement('option');
        o.value = f.value; o.textContent = f.label;
        sel.appendChild(o);
      });
      return sel;
    }
    case 'activitySector': {
      sel = document.createElement('select');
      sel.appendChild(blank());
      (opts.activitySector || []).forEach(a => {
        const o = document.createElement('option');
        o.value = a; o.textContent = a;
        sel.appendChild(o);
      });
      return sel;
    }
    case 'number': {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      return inp;
    }
    case 'date': {
      const inp = document.createElement('input');
      inp.type = 'date';
      return inp;
    }
    default: {
      const inp = document.createElement('input');
      inp.type = 'text';
      return inp;
    }
  }
}

async function callReonboarding(existingClientId, entityType) {  // ✅ receive entityType
  if (!tenantName) {
    showNotification(t('notifications.authenticate'), 'warning');
    return;
  }

  let currentAuthToken;
  try {
    currentAuthToken = await tokenManager.getValidToken();
    if (!currentAuthToken) throw new Error('No valid token available');
  } catch (tokenError) {
    showNotification('Authentication expired. Please login again.', 'error');
    return;
  }

  // Collect ONLY the fields the user picked (and that have a non-empty value).
  // Each input is rendered with id="reonboardingFields_<key>".
  // Whether a field is sent as array or scalar comes from the tenant-aware
  // field config (`wrapArray: true`) — so bankfr sends `Produit:[…]` and
  // banque_en sends `product:[…]` automatically.
  const items = {};
  document.querySelectorAll('#reonboardingFields input, #reonboardingFields select').forEach(input => {
    const key = input.id.replace('reonboardingFields_', '');
    const value = (input.value || '').trim();
    if (!value) return;
    const def = getReonboardFieldDef(entityType, key);
    if (def && def.wrapArray) {
      items[key] = [value];
    } else {
      items[key] = value;
    }
  });

  if (Object.keys(items).length === 0) {
    showNotification('Please pick and fill at least one field to update.', 'warning');
    return;
  }

  logMessage(`Starting re-onboarding for client ${existingClientId} (${Object.keys(items).length} field(s) to update)...`, 'info');

  try {
    const payload = {
      customerId: parseInt(existingClientId),
      id: parseInt(existingClientId),
      items: items,
      formId: entityType === 'PM' ? "2" : "1"  // ✅ use passed entityType
    };

    const res = await fetch('https://greataml.com/kyc-web-restful/onboarding/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-tenant': tenantName,
        'x-auth-token': currentAuthToken
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    localStorage.setItem(`processType_${existingClientId}`, 'reonboarding');

    logMessage(`Re-onboarding completed for client ${existingClientId}`, 'success');
    showNotification(`Re-onboarding initiated for client ${existingClientId}`, 'success');

    const reisId = data.reisId || data.id || existingClientId;
    const customerCardUrl = `https://greataml.com/profiles/customer-card/${reisId}`;

    showScreeningResponsePopup(
      `<div style="padding: 15px; background: #f0f8ff; border-radius: 6px;">
        <strong style="color: #007ACC;">♻️ Re-onboarding Initiated</strong>
        <p>Client <strong>${existingClientId}</strong> has been submitted for re-onboarding.</p>
        <p>The compliance team will review the updated data.</p>
      </div>`,
      customerCardUrl,
      false,
      {},
      data
    );

  } catch (err) {
    logMessage(`Re-onboarding error: ${err.message}`, 'error');
    showNotification('Re-onboarding failed: ' + err.message, 'error');
  }
}



function updateTokenStatusDisplay() {
  const statusIndicator = document.getElementById('tokenStatusIndicator');
  const statusText = document.getElementById('tokenStatusText');
  
  if (!statusIndicator || !statusText) {
    console.warn('Token status elements not found in sidebar');
    return;
  }

  const status = tokenManager.getTokenStatus();
  statusText.textContent = status;
  
  // Remove all status classes
  statusIndicator.classList.remove('valid', 'refresh', 'expired', 'none');
  
  // Add appropriate class based on status
  if (status.includes('Expired')) {
    statusIndicator.classList.add('expired');
  } else if (status.includes('Needs refresh')) {
    statusIndicator.classList.add('refresh');
  } else if (status.includes('Valid')) {
    statusIndicator.classList.add('valid');
  } else {
    statusIndicator.classList.add('none');
  }
  
  console.log('Token status updated:', status);
}


setInterval(updateTokenStatusDisplay, 10000);

function updateNotificationBadge() {
  const button = document.getElementById('notificationHistoryBtn');
  if (!button) return;

  const unfinishedCount = notificationsHistory.filter(n => 
    n.source === 'Reis_KYC' && !n.isSanctioned && !n.onboardingCompleted
  ).length;

  if (unfinishedCount > 0) {
    button.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i><span>${t('buttons.notifications')}</span> <span style="background: linear-gradient(135deg,#FFB347 0%,#E0A43B 100%); color: #7A5511; padding: 1px 7px; border-radius: 999px; margin-left: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0; box-shadow: 0 0 0 2px #fff, 0 4px 10px -3px rgba(224,164,59,0.55);">${unfinishedCount}</span>`;
  } else {
    button.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i><span>${t('buttons.notifications')}</span>`;
  }
  // Re-render the bell icon Lucide just replaced
  if (window.vnRenderIcons) window.vnRenderIcons();
  // Background is fully driven by .notification-selector / .notification-toggle-btn CSS now
  button.style.backgroundColor = '';
}


function showNotificationHistory() {
  const historyOverlay = document.createElement('div');
  historyOverlay.id = 'notificationHistoryOverlay';
  historyOverlay.style.cssText = `
    position: fixed; inset: 0; z-index: 15000;
    background: radial-gradient(at 30% 20%, rgba(126,88,161,0.18), transparent 55%),
                radial-gradient(at 80% 80%, rgba(14,177,175,0.15), transparent 55%),
                rgba(17,19,45,0.62);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; justify-content: center; align-items: center;
    padding: 24px;
    animation: vnOverlayIn .3s cubic-bezier(.2,0,0,1);
    font-family: 'Raleway','Inter',sans-serif;
  `;

  const historyContent = document.createElement('div');
  historyContent.style.cssText = `
    position: relative;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid rgba(255,255,255,0.7);
    border-radius: 20px;
    box-shadow:
      0 1px 0 rgba(255,255,255,0.7) inset,
      0 30px 80px -20px rgba(20,23,37,0.55);
    padding: 30px 32px;
    max-width: 820px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    animation: vnDialogIn .35s cubic-bezier(.2,0,0,1);
  `;
  historyContent.innerHTML = `
    <div style="
      position: absolute; left: 0; top: 0; right: 0; height: 5px;
      background: linear-gradient(135deg,#2A3078 0%,#7E58A1 55%,#0EB1AF 100%);
      border-radius: 20px 20px 0 0;
    "></div>
  `;

  let historyHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom: 6px; padding-top: 8px;">
      <div style="display:flex; align-items:center; gap:14px;">
        <div style="
          width:44px; height:44px; border-radius:14px;
          background:linear-gradient(135deg,#0EB1AF 0%,#7E58A1 100%);
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 8px 18px -6px rgba(126,88,161,0.45);
        ">
          <i data-lucide="bell-ring" style="color:#fff; width:22px; height:22px;"></i>
        </div>
        <div>
          <div style="font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#343B95; margin-bottom:2px;">Activity Stream</div>
          <h2 style="margin:0; font-family:'Raleway','Inter',sans-serif; font-weight:800; font-size:22px; letter-spacing:-.01em; color:#11132D;">${t('buttons.notificationsHistory')}</h2>
        </div>
      </div>
      <button id="clearHistory" style="
        display:inline-flex; align-items:center; gap:6px;
        background: linear-gradient(135deg, rgba(216,67,78,0.08) 0%, rgba(216,67,78,0.16) 100%);
        color: #7F1F27; border: 1px solid rgba(216,67,78,0.25);
        padding: 8px 14px; border-radius: 999px; cursor: pointer;
        font-family:'Raleway','Inter',sans-serif;
        font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        transition: all .2s ease;
      "
      onmouseenter="this.style.background='linear-gradient(135deg,#D8434E 0%,#A12B36 100%)';this.style.color='#fff';this.style.borderColor='transparent';this.style.boxShadow='0 6px 16px -6px rgba(216,67,78,0.55)';"
      onmouseleave="this.style.background='linear-gradient(135deg, rgba(216,67,78,0.08) 0%, rgba(216,67,78,0.16) 100%)';this.style.color='#7F1F27';this.style.borderColor='rgba(216,67,78,0.25)';this.style.boxShadow='none';">
        <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
        <span>${t('buttons.clearHistory')}</span>
      </button>
    </div>
    <div style="height:1px; background:linear-gradient(90deg, transparent 0%, #DEE1EB 50%, transparent 100%); margin: 18px 0 22px;"></div>
  `;

 if (notificationsHistory.length === 0) {
    historyHTML += `
      <div style="text-align:center; padding: 42px 20px;">
        <div style="
          width:64px; height:64px; margin: 0 auto 16px;
          border-radius:18px;
          background:linear-gradient(135deg, rgba(14,177,175,0.10) 0%, rgba(126,88,161,0.10) 100%);
          border:1px solid rgba(255,255,255,0.7);
          display:flex; align-items:center; justify-content:center;
        ">
          <i data-lucide="inbox" style="width:30px; height:30px; color:#7E58A1;"></i>
        </div>
        <p style="margin:0; color:#6E7590; font-size:14px; font-weight:500;">${t('notifications.noNotifications')}</p>
      </div>
    `;
} else {
    const sortedHistory = [...notificationsHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedHistory.forEach((notification, index) => {
      const isReis = notification.source === 'Reis_KYC';
      const canContinueOnboarding = isReis && !notification.isSanctioned && !notification.onboardingCompleted;
      // Brand semantic colors
      const statusBg     = notification.isSanctioned ? 'linear-gradient(135deg,#D8434E 0%,#A12B36 100%)' : 'linear-gradient(135deg,#10A66F 0%,#086B47 100%)';
      const statusGlow   = notification.isSanctioned ? '0 4px 12px -3px rgba(216,67,78,0.45)' : '0 4px 12px -3px rgba(16,166,111,0.45)';
      const statusText   = notification.isSanctioned ? 'SANCTIONED' : 'CLEARED';
      const accentColor  = canContinueOnboarding ? '#0EB1AF' : (notification.isSanctioned ? '#D8434E' : '#7E58A1');
      const cardBg       = canContinueOnboarding ? 'linear-gradient(135deg, rgba(14,177,175,0.04) 0%, rgba(255,255,255,1) 60%)' : '#fff';
      const notificationTenant = notification.tenant || 'Unknown';

      // Pill helper for PEP / Sanctions / Adverse Media flags
      const flagPill = (label, on) => {
        const fg = on ? (label === 'Sanctions' ? '#7F1F27' : '#7A5511') : '#086B47';
        const bg = on ? (label === 'Sanctions' ? 'rgba(216,67,78,0.10)' : 'rgba(224,164,59,0.12)') : 'rgba(16,166,111,0.10)';
        const dot = on ? (label === 'Sanctions' ? '#D8434E' : '#E0A43B') : '#10A66F';
        return `
          <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; background:${bg}; color:${fg}; font-size:11px; font-weight:700; letter-spacing:.04em;">
            <span style="width:6px; height:6px; border-radius:999px; background:${dot}; box-shadow:0 0 0 2px ${bg};"></span>
            ${label}: ${on ? 'YES' : 'NO'}
          </span>`;
      };

      historyHTML += `
        <div style="
          position: relative;
          background:${cardBg};
          border: 1px solid #EDEFF4;
          border-radius: 14px;
          padding: 16px 18px 16px 22px;
          margin-bottom: 12px;
          box-shadow: 0 1px 2px rgba(20,23,37,0.04), 0 4px 12px -6px rgba(20,23,37,0.06);
          transition: transform .2s ease, box-shadow .2s ease;
        "
        onmouseenter="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 8px rgba(20,23,37,0.06), 0 16px 32px -12px rgba(20,23,37,0.12)';"
        onmouseleave="this.style.transform='none';this.style.boxShadow='0 1px 2px rgba(20,23,37,0.04), 0 4px 12px -6px rgba(20,23,37,0.06)';">
          <span style="position:absolute; left:0; top:14px; bottom:14px; width:3px; border-radius:999px; background:${accentColor};"></span>

          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:10px;">
            <div style="min-width:0;">
              <div style="font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#6E7590; margin-bottom:3px;">Customer</div>
              <h4 style="margin:0; font-family:'JetBrains Mono', ui-monospace, monospace; font-weight:600; font-size:15px; color:#11132D;">${notification.customerId}</h4>
              <div style="margin-top:5px; display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#4E556F;">
                <i data-lucide="building-2" style="width:12px; height:12px; color:#7E58A1;"></i>
                <span style="font-weight:600;">${notificationTenant}</span>
              </div>
            </div>
            <span style="
              background:${statusBg}; color:#fff;
              padding:5px 12px; border-radius:999px;
              font-size:10px; font-weight:800; letter-spacing:.10em; text-transform:uppercase;
              box-shadow:${statusGlow}, 0 1px 0 rgba(255,255,255,0.20) inset;
              white-space:nowrap;
            ">${statusText}</span>
          </div>

          ${isReis ? `
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin: 10px 0;">
              ${flagPill('PEP', !!notification.isPEP)}
              ${flagPill('Sanctions', !!notification.isSanctioned)}
              ${flagPill('Adverse Media', !!notification.isAdverseMedia)}
            </div>
          ` : ''}

          <p style="margin:8px 0 6px; color:#363C52; font-size:13px; line-height:1.5;">${notification.message || ''}</p>
          <small style="color:#9AA0B4; font-size:11px; font-weight:500;">${new Date(notification.timestamp).toLocaleString()}</small>

          ${canContinueOnboarding ? `
            <div style="margin-top:14px;">
              <button onclick="continueOnboardingFromHistory('${notification.customerId}', ${index})" style="
                display:inline-flex; align-items:center; gap:8px;
                background:linear-gradient(135deg,#0EB1AF 0%,#7E58A1 100%);
                color:#fff; border:0;
                padding:9px 18px; border-radius:10px; cursor:pointer;
                font-family:'Raleway','Inter',sans-serif;
                font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
                box-shadow:0 1px 0 rgba(255,255,255,0.20) inset, 0 8px 18px -8px rgba(126,88,161,0.55);
                transition:transform .15s ease, box-shadow .2s ease, filter .2s ease;
              "
              onmouseenter="this.style.transform='translateY(-1px)';this.style.filter='brightness(1.05)';this.style.boxShadow='0 1px 0 rgba(255,255,255,0.30) inset, 0 12px 24px -10px rgba(126,88,161,0.65)';"
              onmouseleave="this.style.transform='none';this.style.filter='none';this.style.boxShadow='0 1px 0 rgba(255,255,255,0.20) inset, 0 8px 18px -8px rgba(126,88,161,0.55)';">
                <i data-lucide="arrow-right" style="width:13px; height:13px;"></i>
                <span>Continue Onboarding</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  historyHTML += `
    <div style="text-align:center; margin-top:18px;">
      <button onclick="closeNotificationHistory()" style="
        background:#fff; color:#363C52;
        border:1px solid #DEE1EB;
        padding:10px 22px; border-radius:10px; cursor:pointer;
        font-family:'Raleway','Inter',sans-serif;
        font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
        transition:all .2s ease;
      "
      onmouseenter="this.style.background='#F5F6FA';this.style.borderColor='#AAB2E4';this.style.color='#21265C';"
      onmouseleave="this.style.background='#fff';this.style.borderColor='#DEE1EB';this.style.color='#363C52';">
        Close
      </button>
    </div>
  `;

  historyContent.innerHTML += historyHTML;
  historyOverlay.appendChild(historyContent);
  document.body.appendChild(historyOverlay);

  // Inject keyframes once
  if (!document.querySelector('style[data-vn-history-anim]')) {
    const s = document.createElement('style');
    s.setAttribute('data-vn-history-anim', 'true');
    s.textContent = `
      @keyframes vnOverlayIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vnDialogIn  { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `;
    document.head.appendChild(s);
  }

  // Render Lucide icons we just inserted
  if (window.vnRenderIcons) window.vnRenderIcons();

  document.getElementById('clearHistory').onclick = () => {
if (confirm(t('messages.confirmClearHistory'))) {
      notificationsHistory = [];
      localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
      
      localStorage.setItem('lastEventId', '0');
      lastEventId = 0;
      
      updateNotificationBadge();
      closeNotificationHistory();
      
      showNotification('History cleared and event tracking reset', 'success');
      console.log('Reset complete. lastEventId is now:', lastEventId);
    }
  };

  historyOverlay.onclick = (e) => {
    if (e.target === historyOverlay) {
      closeNotificationHistory();
    }
  };
}

function closeNotificationHistory() {
  const overlay = document.getElementById('notificationHistoryOverlay');
  if (overlay) {
    overlay.remove();
  }
}

function continueOnboardingFromHistory(customerId, historyIndex) {
  notificationsHistory[historyIndex].onboardingCompleted = false;
  notificationsHistory[historyIndex].onboardingStarted = true;
  localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
  
  const currentTenant = tokenManager.getTenant() || localStorage.getItem('tenantName') || 'bankfr';
  const tenantPageMap = {
    'bankfr': 'onboarding_bankfr_PP.html',
    'banque_en': 'onboarding_banque_en_PP.html',
  };
  
  const onboardingPage = tenantPageMap[currentTenant] || 'onboarding_bankfr_PP.html';
  
  console.log(`Continuing onboarding for ${customerId} on ${onboardingPage} (tenant: ${currentTenant})`);
  
  window.location.href = `${onboardingPage}?customerId=${customerId}`;
  updateNotificationBadge();
}

function showNotification(message, type = 'info', duration = 5000) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  // Vneuron design system semantic colors (token: --vn-success/warning/danger/info)
  const accents = {
    success: { bar: '#10A66F', icon: '✓', tint: 'rgba(16,166,111,0.06)' },
    error:   { bar: '#D8434E', icon: '!', tint: 'rgba(216,67,78,0.06)' },
    danger:  { bar: '#D8434E', icon: '!', tint: 'rgba(216,67,78,0.06)' },
    warning: { bar: '#E0A43B', icon: '⚠', tint: 'rgba(224,164,59,0.06)' },
    info:    { bar: '#0EB1AF', icon: 'i', tint: 'rgba(14,177,175,0.06)' }
  };
  const a = accents[type] || accents.info;

  const notification = document.createElement('div');
  notification.className = `vn-toast vn-toast-${type}`;
  notification.style.cssText = `
    display:flex; align-items:flex-start; gap:12px;
    background:linear-gradient(135deg, rgba(255,255,255,0.96) 0%, ${a.tint} 100%);
    backdrop-filter:blur(18px) saturate(140%);
    -webkit-backdrop-filter:blur(18px) saturate(140%);
    color:#141725;
    padding:14px 38px 14px 16px;
    margin-bottom:10px;
    border:1px solid rgba(255,255,255,0.7);
    border-left:4px solid ${a.bar};
    border-radius:14px;
    box-shadow:
      0 1px 0 rgba(255,255,255,0.7) inset,
      0 4px 12px -4px rgba(20,23,37,0.10),
      0 16px 40px -16px rgba(20,23,37,0.30);
    font-family:'Raleway','Inter',sans-serif;
    font-size:13px; font-weight:500; line-height:1.45;
    word-wrap:break-word;
    animation:vnToastIn .35s cubic-bezier(.2,0,0,1);
    position:relative;
  `;

  // Status dot in front of the message
  const dot = document.createElement('span');
  dot.style.cssText = `
    flex-shrink:0; width:24px; height:24px; border-radius:999px;
    display:inline-flex; align-items:center; justify-content:center;
    background:${a.bar}; color:#fff; font-weight:800; font-size:13px;
    box-shadow:0 0 0 3px ${a.tint};
    margin-top:1px;
  `;
  dot.textContent = a.icon;

  const messageWrap = document.createElement('div');
  messageWrap.style.cssText = 'flex:1; min-width:0; padding-top:2px;';
  messageWrap.innerHTML = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position:absolute; top:8px; right:10px;
    width:22px; height:22px; padding:0;
    border:0; background:transparent; cursor:pointer;
    color:#6E7590; font-size:18px; font-weight:700; line-height:1;
    border-radius:6px;
    transition:background .15s ease, color .15s ease;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(126,88,161,0.10)'; closeBtn.style.color = '#7E58A1'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#6E7590'; };
  closeBtn.onclick = () => notification.remove();

  notification.appendChild(dot);
  notification.appendChild(messageWrap);
  notification.appendChild(closeBtn);
  container.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'vnToastOut .25s cubic-bezier(.2,0,0,1) forwards';
      setTimeout(() => notification.remove(), 260);
    }
  }, duration);

  if (!document.querySelector('style[data-notifications]')) {
    const style = document.createElement('style');
    style.setAttribute('data-notifications', 'true');
    style.textContent = `
      @keyframes vnToastIn {
        from { transform: translateX(20px) scale(.96); opacity: 0; }
        to   { transform: translateX(0) scale(1);     opacity: 1; }
      }
      @keyframes vnToastOut {
        from { transform: translateX(0);     opacity: 1; }
        to   { transform: translateX(20px);  opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

function getNotificationColor(type) {
  // Kept for backward compatibility with any external callers — returns
  // the new Vneuron semantic token equivalents instead of bootstrap colors.
  switch(type) {
    case 'success': return '#10A66F';
    case 'error':   return '#D8434E';
    case 'danger':  return '#D8434E';
    case 'warning': return '#E0A43B';
    case 'info':    return '#0EB1AF';
    default:        return '#0EB1AF';
  }
}

function logMessage(message, type = 'info') {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function getLogColor(type) {
  return '#00ff00';
}

function updateConnectionStatus(connected) {
  // Keep function for backward compatibility but do nothing
}

// --- POLLING-BASED Event System ---
// Auto-clear notification history on every app load (clean slate per session).
// We keep lastEventId so the polling loop doesn't re-fetch old events as "new"
// after the wipe — this gives a clean badge but avoids spurious popups.
localStorage.removeItem('notificationsHistory');
let lastEventId = parseInt(localStorage.getItem('lastEventId')) || 0;
let pollingInterval = null;
const pollingFrequency = 2000;
let notificationsHistory = [];
let lastEventTimestamp = parseInt(localStorage.getItem('lastEventTimestamp')) || (Date.now() - 300000);

function setupEventPolling() {
  if (!localStorage.getItem('lastEventId')) {
    localStorage.setItem('lastEventId', '0');
    lastEventId = 0;
  }
  
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  
  pollingInterval = setInterval(async () => {
    try {
      console.log('Checking for events since:', lastEventId);
      const response = await fetch(`https://kyc-simulator-api.kyc-simulator.workers.dev/api/events?since=${lastEventId}`);
      const data = await response.json();
      
      console.log('Polling found:', data.events.length, 'events');
      
      if (data.events && data.events.length > 0) {
        const currentTenant = tokenManager.getTenant() || localStorage.getItem('tenantName') || 'Unknown';
        
        data.events.forEach(event => {
          console.log('Processing event:', event.customerId);
          
          if (!event.tenant) {
            event.tenant = currentTenant;
          }
          
          const wasEventProcessedBefore = notificationsHistory.some(n => 
            n.customerId === event.customerId && n.search_query_id === event.search_query_id
          );
          
          lastEventId = event.id;
          localStorage.setItem('lastEventId', lastEventId.toString());
          
if (event.source === 'Reis_KYC' && !wasEventProcessedBefore) {
            // ✅ CHECK: Get processType from multiple possible sources
            let processType = localStorage.getItem(`processType_${event.customerId}`);
            
            // ✅ If not found by customerId, try to find by searching stored customer data
            if (!processType) {
              const customerDataKeys = Object.keys(localStorage).filter(k => 
                k.startsWith('customerData_') || k.startsWith('screeningData_')
              );
              
              for (const key of customerDataKeys) {
                try {
                  const data = JSON.parse(localStorage.getItem(key));
                  if (data.customerId === event.customerId && data.processType) {
                    processType = data.processType;
                    console.log(`Found processType from stored data: ${processType}`);
                    break;
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
            
            console.log(`Event ${event.customerId} - processType: ${processType || 'unknown'}`);
            
            // ✅ Only show popup if NOT async process
            if (processType === 'async') {
              console.log('✅ Skipping Reis popup for async process:', event.customerId);
              // Don't show popup for async processes
            } else {
              console.log('✅ Showing popup for non-async event:', event.customerId);
              showScreeningResultsPopup(event);
              showNotification(`[${event.tenant}] Screening completed for ${event.customerId}`, 'warning');
            }
            
            // ✅ Always add to history (for both async and non-async)
            notificationsHistory.unshift(event);
            if (notificationsHistory.length > 50) {
              notificationsHistory = notificationsHistory.slice(0, 50);
            }
            localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
            updateNotificationBadge();
          } else if (event.source === 'Reis_KYC' && wasEventProcessedBefore) {
            console.log('Skipping popup for already processed event:', event.customerId);
          }
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 3000);
  
  console.log('Event polling started - will only show popups for new events');
}

function linkCustomerToSystemId(customerId, searchQueryId) {
  try {
    console.log('Attempting to link customer to systemId:', { customerId, searchQueryId });
    
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('temp_screening_')) {
        try {
          const screeningData = JSON.parse(localStorage.getItem(key));
          console.log('Checking temp screening data:', { key, screeningData });
          
          if (screeningData && screeningData.searchQueryId === searchQueryId) {
            console.log('Found matching screening data for linkage:', {
              customerId: customerId,
              systemId: screeningData.systemId,
              searchQueryId: searchQueryId
            });
            
            localStorage.removeItem(key);
            console.log('Cleaned up temporary screening data:', key);
            
            return screeningData.systemId;
          }
        } catch (parseError) {
          console.error('Error parsing temp screening data:', key, parseError);
          localStorage.removeItem(key);
        }
      }
    }
    
    console.warn('Could not link customer to systemId - no matching temp data found:', {
      customerId,
      searchQueryId,
      availableTempKeys: keys.filter(k => k.startsWith('temp_screening_'))
    });
    return null;
  } catch (error) {
    console.error('Error linking customer to systemId:', error);
    return null;
  }
}

function storeSystemIdForScreening(customerId, systemId, additionalData = {}) {
  try {
    const screeningData = {
      systemId: systemId,
      customerId: customerId,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    localStorage.setItem(`customerSystemId_${customerId}`, systemId);
    localStorage.setItem(`screeningData_${customerId}`, JSON.stringify(screeningData));
    
    console.log('Successfully stored systemId for screening:', {
      customerId: customerId,
      systemId: systemId,
      storageKeys: [`customerSystemId_${customerId}`, `screeningData_${customerId}`]
    });
    
    return true;
  } catch (error) {
    console.error('Error storing systemId for screening:', error);
    return false;
  }
}

function resetConnection() {
  reconnectAttempts = 0;
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  setupEventPolling();
}

// --- Authentication with TOKEN REFRESH INTEGRATION ---
const authBtn = document.getElementById('authBtn');
authBtn.addEventListener('click', async () => {
  tenantName = document.getElementById('tenantName').value;
  const user_name = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!tenantName || !user_name || !password) { 
    showNotification('Please select tenant and enter credentials', 'warning');
    return; 
  }

  logMessage(`Attempting authentication for ${user_name}...`, 'info');

  try {
    const res = await fetch('https://greataml.com/kyc-web-restful/xauth/authenticate/', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-auth-tenant': tenantName },
      body: JSON.stringify({ user_name, password })
    });

    const data = await res.json();
    if (!res.ok) { 
      logMessage('Authentication failed', 'error');
      showNotification('Authentication failed!', 'error');
      return; 
    }
    authToken = data.token;
    
    tokenManager.storeToken(authToken, tenantName, 300);
    
    logMessage('Authentication successful', 'success');
    showNotification(t('notifications.authSuccess'), 'success');

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('tenantName', tenantName);
    console.log('Auth tokens stored for onboarding page');
    
    // ✅ START AUTOMATIC TOKEN REFRESH after successful authentication
    setupAutomaticTokenRefresh();
    
    updateTokenStatusDisplay();
  } catch(err) {
    logMessage(`Authentication error: ${err.message}`, 'error');
showNotification(t('notifications.authFailed'), 'error');
  }
});

// --- Tabs ---
const tabButtons = document.querySelectorAll('.tabBtn');
const tabContents = document.querySelectorAll('.tabContent');

tabButtons.forEach(btn => btn.addEventListener('click', () => {
  // Remove active from all buttons
  tabButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  // Remove active from all tab contents
  tabContents.forEach(tc => tc.classList.remove('active'));
  
  // Add active to selected tab
  const activeTab = document.getElementById(btn.dataset.tab);
  if (activeTab) {
    activeTab.classList.add('active');
  }
}));
// --- Subtabs ---
const subTabButtons = document.querySelectorAll('.subTabBtn');
const subTabContents = document.querySelectorAll('.subTabContent');

subTabButtons.forEach(btn => btn.addEventListener('click', () => {
  console.log('🔵 Subtab clicked:', btn.dataset.subtab);
  
  // Remove active from all subtab buttons
  subTabButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  // Remove active from all subtab contents
  subTabContents.forEach(tc => tc.classList.remove('active'));
  
  // Add active to selected subtab
  const activeSubtab = document.getElementById(btn.dataset.subtab);
  if (activeSubtab) {
    activeSubtab.classList.add('active');
    console.log('✅ Showing subtab:', btn.dataset.subtab);
  } else {
    console.error('❌ Subtab not found:', btn.dataset.subtab);
  }

  // Clear fields when switching tabs to prevent crossover
  if (btn.dataset.subtab === 'sync') {
    const syncFields = document.getElementById('syncFields');
    if (syncFields) {
      syncFields.innerHTML = '';
      console.log('🧹 Cleared syncFields');
    }
    const syncType = document.getElementById('entityTypeSync').value;
    if (syncType) {
      console.log('Re-rendering sync fields for:', syncType);
      renderFields('syncFields', syncType, 'centralized');
    }
  } else if (btn.dataset.subtab === 'async') {
    const asyncFields = document.getElementById('asyncFields');
    if (asyncFields) {
      asyncFields.innerHTML = '';
      console.log('🧹 Cleared asyncFields');
    }
    const asyncType = document.getElementById('entityTypeAsync').value;
    if (asyncType) {
      console.log('Re-rendering async fields for:', asyncType);
      renderFields('asyncFields', asyncType, 'async');
    }
  }
}));

function showScreeningResultsPopup(event) {
  const popup = document.getElementById('popup');

  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');
  const closePopupBtn = document.getElementById('closePopup');
  if (popupText) popupText.style.display = 'none';
  if (popupLink) popupLink.style.display = 'none';
  if (closePopupBtn) closePopupBtn.style.display = 'none';

  // Vneuron design: glass card, brand-gradient top accent.
  // Color the top accent by severity (sanctioned = danger, else warning).
  const accent = event.isSanctioned ? '#D8434E' : '#E0A43B';
  const accentDeep = event.isSanctioned ? '#7F1F27' : '#7A5511';

  popup.innerHTML = '';
  popup.style.cssText = `
    display: block;
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    padding: 0;
    border: 1px solid rgba(255,255,255,0.7);
    border-radius: 20px;
    box-shadow:
      0 1px 0 rgba(255,255,255,0.7) inset,
      0 30px 80px -20px rgba(20,23,37,0.45);
    z-index: 1000;
    min-width: 520px;
    max-width: 620px;
    width: min(620px, 92vw);
    overflow: hidden;
    font-family: 'Raleway','Inter',sans-serif;
    animation: vnDialogIn .35s cubic-bezier(.2,0,0,1);
  `;

  // Top accent bar (semantic color, NOT the brand gradient — this is alert content)
  const accentBar = document.createElement('div');
  accentBar.style.cssText = `
    height: 5px;
    background: linear-gradient(90deg, ${accent} 0%, #7E58A1 50%, #0EB1AF 100%);
  `;

  const currentTenant = tokenManager.getTenant() || localStorage.getItem('tenantName') || 'BANKFR';

  // Header with gradient icon tile + eyebrow + title
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; align-items: center; gap: 14px;
    padding: 24px 26px 18px;
  `;
  header.innerHTML = `
    <div style="
      width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, ${accent} 0%, #7E58A1 100%);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 18px -6px ${accent}55, 0 1px 0 rgba(255,255,255,0.25) inset;
    ">
      <i data-lucide="shield-alert" style="color:#fff; width:24px; height:24px;"></i>
    </div>
    <div style="flex:1; min-width:0;">
      <div style="font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:${accentDeep}; margin-bottom:2px;">
        Reis™ KYC Hits
      </div>
      <h3 style="margin:0; font-family:'Raleway','Inter',sans-serif; font-weight:800; font-size:20px; letter-spacing:-.01em; color:#11132D;">
        ${t('popupTitles.reisKycHits')}
      </h3>
    </div>
  `;

  const divider = document.createElement('div');
  divider.style.cssText = 'height:1px; background:linear-gradient(90deg,transparent,#DEE1EB,transparent); margin: 0 24px;';

  const content = document.createElement('div');
  content.style.cssText = 'padding: 20px 26px 8px; color:#363C52; line-height:1.55; font-size:14px;';

  // Customer/tenant info row — eyebrow labels + values
  const metaRow = (label, value, mono = false) => `
    <div style="margin-bottom: 12px;">
      <div style="font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#6E7590; margin-bottom:3px;">${label}</div>
      <div style="font-family:${mono ? "'JetBrains Mono',ui-monospace,monospace" : "inherit"}; font-weight:600; font-size:14px; color:#11132D;">${value}</div>
    </div>`;

  // Status row helper
  const statusRow = (label, on, decision, severity) => {
    // severity: 'pep' (warning), 'sanction' (danger), 'media' (warning)
    const isClean = !on;
    const fg   = isClean ? '#086B47' : (severity === 'sanction' ? '#7F1F27' : '#7A5511');
    const bg   = isClean ? 'rgba(16,166,111,0.08)' : (severity === 'sanction' ? 'rgba(216,67,78,0.10)' : 'rgba(224,164,59,0.12)');
    const dot  = isClean ? '#10A66F' : (severity === 'sanction' ? '#D8434E' : '#E0A43B');
    const icon = isClean ? 'check' : (severity === 'sanction' ? 'shield-x' : 'alert-triangle');
    const txt  = isClean ? (severity === 'media' ? t('status.adverseMediaNo') : t('status.pepNo')) : (severity === 'media' ? t('status.adverseMediaYes') : t('status.pepYes'));
    return `
      <div style="
        display:flex; align-items:center; justify-content:space-between; gap:14px;
        padding: 11px 14px; margin-bottom: 8px;
        background:${bg}; border:1px solid ${bg}; border-radius: 12px;
      ">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="
            width:28px; height:28px; border-radius:999px;
            background:${dot}; color:#fff;
            display:inline-flex; align-items:center; justify-content:center;
            box-shadow:0 0 0 3px ${bg};
          ">
            <i data-lucide="${icon}" style="width:15px; height:15px;"></i>
          </span>
          <span style="font-weight:700; font-size:13px; color:${fg};">${label}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:12px; font-weight:700; color:${fg};">${txt}</span>
          <span style="
            font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
            color:${fg}; opacity:.75;
            padding: 2px 8px; border-radius:999px; background:rgba(255,255,255,0.55);
          ">${decision || 'N/A'}</span>
        </div>
      </div>`;
  };

  // Decision banner (semantic + brand)
  const decisionBg   = event.isSanctioned ? 'linear-gradient(135deg, rgba(216,67,78,0.10) 0%, rgba(216,67,78,0.18) 100%)' : 'linear-gradient(135deg, rgba(16,166,111,0.10) 0%, rgba(14,177,175,0.18) 100%)';
  const decisionFg   = event.isSanctioned ? '#7F1F27' : '#086B47';
  const decisionIcon = event.isSanctioned ? 'octagon-x' : 'check-circle-2';
  const decisionTxt  = event.isSanctioned ? t('status.cannotProceed') : t('status.canProceed');

  let contentHTML = `
    ${metaRow(t('status.tenant').replace(':',''), currentTenant)}
    ${metaRow(t('status.customerKycId').replace(':',''), event.customerId, true)}
    <div style="font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#6E7590; margin: 6px 0 10px;">${t('status.processingResults').replace(':','')}</div>
    ${statusRow(t('status.pepStatus').replace(':',''),       !!event.isPEP,          event.pepDecision,      'pep')}
    ${statusRow(t('status.sanctions').replace(':',''),       !!event.isSanctioned,   event.sanctionDecision, 'sanction')}
    ${statusRow(t('status.adverseMedia').replace(':',''),    !!event.isAdverseMedia, null,                   'media')}

    <div style="
      display:flex; align-items:flex-start; gap:12px;
      margin-top: 14px; padding: 14px 16px;
      background: ${decisionBg};
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 14px;
    ">
      <span style="
        width:32px; height:32px; flex-shrink:0; border-radius:10px;
        background: ${event.isSanctioned ? '#D8434E' : 'linear-gradient(135deg,#10A66F 0%,#0EB1AF 100%)'};
        color:#fff;
        display:inline-flex; align-items:center; justify-content:center;
        box-shadow: 0 4px 10px -3px ${event.isSanctioned ? 'rgba(216,67,78,0.45)' : 'rgba(16,166,111,0.45)'};
      ">
        <i data-lucide="${decisionIcon}" style="width:18px; height:18px;"></i>
      </span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:${decisionFg}; opacity:.8; margin-bottom:3px;">
          ${t('status.onboardingDecision').replace(':','')}
        </div>
        <div style="font-weight:700; font-size:14px; color:${decisionFg}; line-height:1.4;">
          ${decisionTxt}
        </div>
      </div>
    </div>
  `;
  content.innerHTML = contentHTML;

  // Footer buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex; gap: 10px; justify-content: flex-end;
    padding: 18px 24px 22px;
    background: linear-gradient(180deg, transparent 0%, #FBFBFD 100%);
    border-top: 1px solid #EDEFF4;
  `;

  if (!event.isSanctioned) {
    const continueBtn = document.createElement('button');
    continueBtn.innerHTML = `<i data-lucide="arrow-right" style="width:14px; height:14px;"></i><span>${t('buttons.continueOnboarding')}</span>`;
    continueBtn.style.cssText = `
      display:inline-flex; align-items:center; gap:8px;
      padding: 10px 20px;
      background: linear-gradient(135deg,#0EB1AF 0%,#7E58A1 100%);
      color: #fff; border: 0; border-radius: 12px; cursor: pointer;
      font-family:'Raleway','Inter',sans-serif;
      font-size: 12px; font-weight: 700; letter-spacing:.06em; text-transform: uppercase;
      box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 20px -8px rgba(126,88,161,0.55);
      transition: transform .15s ease, filter .2s ease, box-shadow .2s ease;
    `;
    continueBtn.onmouseenter = () => { continueBtn.style.transform='translateY(-1px)'; continueBtn.style.filter='brightness(1.05)'; };
    continueBtn.onmouseleave = () => { continueBtn.style.transform='none'; continueBtn.style.filter='none'; };
    continueBtn.onclick = () => {
      navigateToOnboarding(event.customerId);
      popup.style.display = 'none';
    };
    buttonsContainer.appendChild(continueBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('buttons.close');
  closeBtn.style.cssText = `
    padding: 10px 22px;
    background: #fff; color: #363C52;
    border: 1px solid #DEE1EB; border-radius: 12px; cursor: pointer;
    font-family:'Raleway','Inter',sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing:.08em; text-transform: uppercase;
    transition: all .2s ease;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background='#F5F6FA'; closeBtn.style.borderColor='#AAB2E4'; closeBtn.style.color='#21265C'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background='#fff';   closeBtn.style.borderColor='#DEE1EB'; closeBtn.style.color='#363C52'; };
  closeBtn.onclick = () => popup.style.display = 'none';
  buttonsContainer.appendChild(closeBtn);

  popup.appendChild(accentBar);
  popup.appendChild(header);
  popup.appendChild(divider);
  popup.appendChild(content);
  popup.appendChild(buttonsContainer);

  // Render Lucide icons we just inserted
  if (window.vnRenderIcons) window.vnRenderIcons();
}

function showScreeningResponsePopup(message, link = null, showContinueButton = false, customerData = null, apiResponse = null) {
  const popup = document.getElementById('popup');

  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');
  const closePopupBtn = document.getElementById('closePopup');
  if (popupText) popupText.style.display = 'none';
  if (popupLink) popupLink.style.display = 'none';
  if (closePopupBtn) closePopupBtn.style.display = 'none';

  popup.innerHTML = '';
  popup.style.cssText = `
    display: block;
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    padding: 0;
    border: 1px solid rgba(255,255,255,0.7);
    border-radius: 20px;
    box-shadow:
      0 1px 0 rgba(255,255,255,0.7) inset,
      0 30px 80px -20px rgba(20,23,37,0.45);
    z-index: 1000;
    min-width: 520px; max-width: 620px;
    width: min(620px, 92vw);
    overflow: hidden;
    font-family: 'Raleway','Inter',sans-serif;
    animation: vnDialogIn .35s cubic-bezier(.2,0,0,1);
  `;

  // Brand-gradient top accent (full triad, since this is a positive/info popup)
  const accentBar = document.createElement('div');
  accentBar.style.cssText = `
    height: 5px;
    background: linear-gradient(90deg,#2A3078 0%,#7E58A1 55%,#0EB1AF 100%);
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; gap:14px; padding: 24px 26px 18px;';
  header.innerHTML = `
    <div style="
      width:48px; height:48px; border-radius:14px;
      background: linear-gradient(135deg,#0EB1AF 0%,#7E58A1 100%);
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 8px 18px -6px rgba(126,88,161,0.45), 0 1px 0 rgba(255,255,255,0.25) inset;
    ">
      <i data-lucide="search" style="color:#fff; width:22px; height:22px;"></i>
    </div>
    <div style="flex:1; min-width:0;">
      <div style="font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#343B95; margin-bottom:2px;">
        Simulation Result
      </div>
      <h3 style="margin:0; font-family:'Raleway','Inter',sans-serif; font-weight:800; font-size:20px; letter-spacing:-.01em; color:#11132D;">
        ${t('popupTitles.screeningResponse')}
      </h3>
    </div>
  `;

  const divider = document.createElement('div');
  divider.style.cssText = 'height:1px; background:linear-gradient(90deg,transparent,#DEE1EB,transparent); margin: 0 24px;';

  const content = document.createElement('div');
  content.style.cssText = 'padding: 20px 26px 8px; color:#363C52; line-height:1.55; font-size:14px;';
  content.innerHTML = message;

  if (link) {
    const linkWrap = document.createElement('div');
    linkWrap.style.cssText = `
      display:flex; align-items:center; gap:8px;
      margin-top:14px; padding: 12px 14px;
      background: linear-gradient(135deg, rgba(14,177,175,0.06) 0%, rgba(126,88,161,0.06) 100%);
      border: 1px solid #EDEFF4; border-radius: 12px;
    `;
    linkWrap.innerHTML = `
      <i data-lucide="link-2" style="width:16px; height:16px; color:#7E58A1; flex-shrink:0;"></i>
      <a href="${link}" target="_blank"
         style="color:#0B908E; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; text-decoration:none; word-break:break-all; flex:1; min-width:0;"
         onmouseenter="this.style.color='#7E58A1';"
         onmouseleave="this.style.color='#0B908E';">${link}</a>
    `;
    content.appendChild(linkWrap);
  }

  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display:flex; gap:10px; justify-content:flex-end;
    padding: 18px 24px 22px;
    background: linear-gradient(180deg, transparent 0%, #FBFBFD 100%);
    border-top: 1px solid #EDEFF4;
  `;

  if (showContinueButton && customerData && apiResponse) {
    const continueBtn = document.createElement('button');
    continueBtn.innerHTML = `<i data-lucide="arrow-right" style="width:14px; height:14px;"></i><span>${t('buttons.continueOnboarding')}</span>`;
    continueBtn.style.cssText = `
      display:inline-flex; align-items:center; gap:8px;
      padding: 10px 20px;
      background: linear-gradient(135deg,#0EB1AF 0%,#7E58A1 100%);
      color:#fff; border: 0; border-radius: 12px; cursor: pointer;
      font-family:'Raleway','Inter',sans-serif;
      font-size: 12px; font-weight: 700; letter-spacing:.06em; text-transform: uppercase;
      box-shadow: 0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 20px -8px rgba(126,88,161,0.55);
      transition: transform .15s ease, filter .2s ease;
    `;
    continueBtn.onmouseenter = () => { continueBtn.style.transform='translateY(-1px)'; continueBtn.style.filter='brightness(1.05)'; };
    continueBtn.onmouseleave = () => { continueBtn.style.transform='none'; continueBtn.style.filter='none'; };
    continueBtn.onclick = () => {
      const customerId = apiResponse.customerId || apiResponse.customer_id || apiResponse.id;
      if (!customerId) {
        showNotification('Error: Customer ID not found', 'error');
        return;
      }
      
      // ✅ CRITICAL FIX: Detect entity type from customerData
      const entityType = customerData.businessName ? 'PM' : 'PP';
      
      console.log('🔍 Continue button clicked - Entity type detection:', {
        businessName: customerData.businessName,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        detectedEntityType: entityType,
        customerId: customerId
      });
      
      // Store screening data with entity type
      localStorage.setItem(`screeningData_${customerId}`, JSON.stringify({
        customerId: customerId,
        entityType: entityType, // ✅ Store entity type
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        birthDate: customerData.birthDate,
        Nationalite: customerData.nationality,
        citizenship: customerData.citizenship,
        PaysDeResidence: customerData.citizenship,
        businessName: customerData.businessName, // ✅ Store business name for PM
        systemId: customerData.systemId,
        systemName: customerData.systemName,
        searchQueryId: apiResponse.search_query_id,
        screeningResult: apiResponse.maxScore > 0 ? 'HITS_FOUND' : 'NO_HITS',
        maxScore: apiResponse.maxScore || 0,
        timestamp: new Date().toISOString(),
        tenant: tokenManager.getTenant() || localStorage.getItem('tenantName'),
        isScreeningDataLocked: true
      }));
      
      // Also store in customerDataMappings
      const customerMappings = JSON.parse(localStorage.getItem('customerDataMappings') || '{}');
      customerMappings[customerId] = {
        entityType: entityType,
        businessName: customerData.businessName,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        storedAt: new Date().toISOString(),
        isLocked: true
      };
      localStorage.setItem('customerDataMappings', JSON.stringify(customerMappings));
      
      console.log('✅ Stored data for navigation:', {
        customerId: customerId,
        entityType: entityType,
        businessName: customerData.businessName
      });
      
      // Navigate to appropriate page
      navigateToOnboarding(customerId);
      popup.style.display = 'none';
    };
    buttonsContainer.appendChild(continueBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('buttons.close');
  closeBtn.style.cssText = `
    padding: 10px 22px;
    background:#fff; color:#363C52;
    border:1px solid #DEE1EB; border-radius: 12px; cursor: pointer;
    font-family:'Raleway','Inter',sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing:.08em; text-transform: uppercase;
    transition: all .2s ease;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.background='#F5F6FA'; closeBtn.style.borderColor='#AAB2E4'; closeBtn.style.color='#21265C'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background='#fff';   closeBtn.style.borderColor='#DEE1EB'; closeBtn.style.color='#363C52'; };
  closeBtn.onclick = () => popup.style.display = 'none';
  buttonsContainer.appendChild(closeBtn);

  popup.appendChild(accentBar);
  popup.appendChild(header);
  popup.appendChild(divider);
  popup.appendChild(content);
  popup.appendChild(buttonsContainer);

  if (window.vnRenderIcons) window.vnRenderIcons();
}


// ALSO UPDATE: navigateToOnboarding to better detect entity type
function navigateToOnboarding(customerId) {
  const currentTenant = tokenManager.getTenant() || localStorage.getItem('tenantName') || 'bankfr';
  
  let entityType = 'PP'; // Default to PP
  
  console.log('🔍 navigateToOnboarding called for customer:', customerId);
  
  // Try multiple methods to determine entity type
  try {
    // Method 1: Check screeningData (most reliable for decentralized)
    const screeningData = localStorage.getItem(`screeningData_${customerId}`);
    if (screeningData) {
      const data = JSON.parse(screeningData);
      console.log('📄 Screening data found:', data);
      if (data.businessName || data.entityType === 'PM') {
        entityType = 'PM';
        console.log('✅ Entity type detected from screeningData: PM');
      }
    }
    
    // Method 2: Check customerData
    if (entityType === 'PP') {
      const customerData = localStorage.getItem(`customerData_${customerId}`);
      if (customerData) {
        const data = JSON.parse(customerData);
        console.log('📄 Customer data found:', data);
        if (data.businessName || data.entityType === 'PM') {
          entityType = 'PM';
          console.log('✅ Entity type detected from customerData: PM');
        }
      }
    }
    
    // Method 3: Check customerDataMappings
    if (entityType === 'PP') {
      const mappings = JSON.parse(localStorage.getItem('customerDataMappings') || '{}');
      if (mappings[customerId]) {
        console.log('📄 Mapping found:', mappings[customerId]);
        if (mappings[customerId].entityType === 'PM' || mappings[customerId].businessName) {
          entityType = 'PM';
          console.log('✅ Entity type detected from mappings: PM');
        }
      }
    }
  } catch (e) {
    console.error('❌ Error determining entity type:', e);
    console.log('⚠️ Defaulting to PP due to error');
  }
  
  const tenantPageMap = {
    'bankfr': {
      'PP': 'onboarding_bankfr_PP.html',
      'PM': 'onboarding_bankfr_PM.html'
    },
    'banque_en': {
      'PP': 'onboarding_banque_en_PP.html',
      'PM': 'onboarding_banque_en_PM.html'
    }
  };
  
  const onboardingPage = tenantPageMap[currentTenant][entityType] || 'onboarding_bankfr_PP.html';
  
  console.log(`🎯 Navigating to ${entityType} onboarding: ${onboardingPage} for tenant: ${currentTenant}`);
  
  window.location.href = `${onboardingPage}?customerId=${customerId}`;
}


function showPopup(message) {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  
  if (popupText) {
    popupText.style.display = 'block';
    popupText.textContent = message;
  }
  
  popup.style.display = 'block';
}

function resetPopup() {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');
  
  popupText.style.whiteSpace = 'normal';
  popupText.style.fontSize = '';
  popupText.style.lineHeight = '';
  popupText.textContent = '';
  
  popupLink.onclick = null;
  popupLink.style.cursor = 'default';
  popupLink.style.display = 'none';
  popupLink.readOnly = true;
  popupLink.value = '';
  popupLink.placeholder = '';
  
  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  
  const extraDivs = popup.querySelectorAll('div');
  extraDivs.forEach(div => div.remove());
  
  const sel = window.getSelection();
  sel.removeAllRanges();
}

document.getElementById('closePopup').addEventListener('click', () => {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';
  resetPopup();
});


function debugDecentralizedData() {
  console.log('=== DEBUGGING DECENTRALIZED STORAGE ===');
  
  // Get all customer data
  const allKeys = Object.keys(localStorage);
  const screeningKeys = allKeys.filter(k => k.startsWith('screeningData_'));
  const customerKeys = allKeys.filter(k => k.startsWith('customerData_'));
  
  console.log('Found screening data keys:', screeningKeys.length);
  screeningKeys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(key, '→', {
      entityType: data.entityType,
      businessName: data.businessName,
      firstName: data.firstName,
      lastName: data.lastName
    });
  });
  
  console.log('Found customer data keys:', customerKeys.length);
  customerKeys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(key, '→', {
      entityType: data.entityType,
      businessName: data.businessName,
      firstName: data.firstName,
      lastName: data.lastName
    });
  });
  const mappings = JSON.parse(localStorage.getItem('customerDataMappings') || '{}');
  console.log('Customer mappings:', mappings);
  
  console.log('=== END DEBUG ===');
}

window.debugDecentralizedData = debugDecentralizedData;


async function callSearch(entityType, containerId, responseId, isDecentralized = false) {
  if (!tenantName) { 
    showNotification('Please authenticate first!', 'warning');
    return; 
  }

  logMessage(`Starting search for ${entityType}...`, 'info');

  try {
    let currentAuthToken;
    try {
      currentAuthToken = await tokenManager.getValidToken();
      if (!currentAuthToken) {
        throw new Error('No valid token available');
      }
      logMessage('Using valid token for search', 'info');
    } catch (tokenError) {
      logMessage('Token validation failed: ' + tokenError.message, 'error');
      showNotification('Authentication expired. Please login again.', 'error');
      return;
    }

    let payload = {};
    document.querySelectorAll(`#${containerId} input, #${containerId} select`).forEach(input => {
      payload[input.id.replace(containerId + '_', '')] = input.value;
    });

const generatedSystemId = `system_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    payload.systemId = generatedSystemId;
    payload.systemName = defaultValues[entityType].systemName;
    payload.searchQuerySource = defaultValues[entityType].searchQuerySource;

    // ✅ DEFINE customerIdentifier FIRST before using it
    const customerIdentifier = payload.firstName + '_' + payload.lastName + '_' + payload.birthDate;
    localStorage.setItem(`systemId_${customerIdentifier}`, generatedSystemId);
    console.log('Stored systemId for customer:', customerIdentifier, '→', generatedSystemId);

    // ✅ NOW mark process type (after customerIdentifier is defined)
    if (isDecentralized) {
      localStorage.setItem(`processType_${customerIdentifier}`, 'decentralized');
    } else {
      const isSyncProcess = containerId === 'syncFields';
      localStorage.setItem(`processType_${customerIdentifier}`, isSyncProcess ? 'sync' : 'centralized');
    }

     localStorage.setItem(`customerIdentifier_temp_${generatedSystemId}`, customerIdentifier);


    if (!isDecentralized) {
      payload.queueName = payload.queueName || defaultValues[entityType].queueName;
    }

    const endpoint = entityType === 'PM' 
      ? 'https://greataml.com/kyc-web-restful/search/searchEntityCustomer'
      : 'https://greataml.com/kyc-web-restful/search/searchPersonCustomer';
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-auth-tenant': tenantName,
        'x-auth-token': currentAuthToken
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    const dataStored = storeCustomerDataForOnboarding(payload, data);
    if (!dataStored) {
      console.error('Failed to store customer data for onboarding');
      showNotification('Warning: Customer data may not be available for onboarding', 'warning');
    } else {
      console.log('Customer data successfully stored for secure onboarding transfer');
    }
    
    storeSearchEventForWebhook(payload, data);

    logMessage(`Search completed for ${entityType}`, 'success');
showNotification(t('notifications.searchComplete'), 'success');
    
    if (isDecentralized) {
      if (data.maxScore && data.maxScore > 0) {
        const link = `https://greataml.com/search/searchdecision/${data.search_query_id}`;
        logMessage(`Hits found for customer (Score: ${data.maxScore})`, 'warning');
        showScreeningResponsePopup(t('messages.hitsFound'), link, false, payload, data);
      } else {
        logMessage('No hits were found for customer', 'info');
        showScreeningResponsePopup(t('messages.noHitsFound'), null, true, payload, data);
      }
    } else {
      const isAsync = containerId === 'asyncFields';
      
      if (data.maxScore && data.maxScore > 0) {
        logMessage(`Hits found for customer (Score: ${data.maxScore})`, 'warning');
        if (isAsync) {
        showScreeningResponsePopup(t('messages.hitsFoundAsync'), null, true, payload, data);
        } else {
    showScreeningResponsePopup(t('messages.hitsFoundSync'), null, false, payload, data);
        }
      } else {
        logMessage('No hits were found for customer', 'info');
    showScreeningResponsePopup(t('messages.noHitsFound'), null, true, payload, data);

    
      }
    }
  } catch (err) {
    const errorMsg = `Search error: ${err.message}`;
    logMessage(errorMsg, 'error');
    showNotification('Search failed', 'error');
  }
}

function storeCustomerDataForOnboarding(customerData, apiResponse) {
  try {
    const customerId = apiResponse.customerId || apiResponse.customer_id || apiResponse.id;
    
    if (!customerId) {
      console.error('Cannot store customer data: No customer ID found in API response');
      return false;
    }

    const entityType = customerData.businessName ? 'PM' : 'PP';

        let processType = localStorage.getItem(`processType_${customerId}`);
    
    // If not found by customerId, try to find by customerIdentifier
    if (!processType) {
      const customerIdentifier = `${customerData.firstName}_${customerData.lastName}_${customerData.birthDate}`;
      processType = localStorage.getItem(`processType_${customerIdentifier}`) || 'unknown';
      
      // Store mapping for future use
      if (processType !== 'unknown') {
        localStorage.setItem(`processType_${customerId}`, processType);
        console.log(`✅ Mapped processType for customerId ${customerId}: ${processType}`);
      }
    }

    const completeCustomerData = {
      customerId: customerId,
      entityType: entityType,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      birthDate: customerData.birthDate,
      Nationalite: customerData.nationality,
      citizenship: customerData.citizenship,
      PaysDeResidence: customerData.citizenship || customerData.PaysDeResidence,
      OrigineDesFonds: customerData.OrigineDesFonds,
      businessName: customerData.businessName,
      legalForm: customerData.legalForm,
      countryOfIncorporation: customerData.countryOfIncorporation,
      registrationNumber: customerData.registrationNumber,
      systemId: customerData.systemId,
      systemName: customerData.systemName,
      searchQuerySource: customerData.searchQuerySource,
      searchQueryId: apiResponse.search_query_id,
      maxScore: apiResponse.maxScore || 0,
      screeningResult: apiResponse.maxScore > 0 ? 'HITS_FOUND' : 'NO_HITS',
      tenant: tokenManager.getTenant() || localStorage.getItem('tenantName') || 'Unknown',
      timestamp: new Date().toISOString(),
      isScreeningDataLocked: true,
      apiResponse: apiResponse
    };

    localStorage.setItem(`customerData_${customerId}`, JSON.stringify(completeCustomerData));
    localStorage.setItem(`screeningData_${customerId}`, JSON.stringify(completeCustomerData));
    
    const customerMappings = JSON.parse(localStorage.getItem('customerDataMappings') || '{}');
    customerMappings[customerId] = {
      entityType: entityType,
      businessName: customerData.businessName,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      storedAt: new Date().toISOString(),
      isLocked: true
    };
    localStorage.setItem('customerDataMappings', JSON.stringify(customerMappings));
    
    console.log(`${entityType} customer data stored for secure onboarding transfer:`, {
      customerId: customerId,
      entityType: entityType,
      businessName: customerData.businessName,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      isLocked: true,
      tenant: completeCustomerData.tenant
    });
    
    return true;
  } catch (error) {
    console.error('Error storing customer data for onboarding:', error);
    return false;
  }
}

// ===== BUTTON AND EVENT LISTENERS - INITIALIZE ONCE =====
function initializeEventListeners() {
  // Prevent multiple initializations
  if (window.eventListenersInitialized) {
    console.log('⚠️ Event listeners already initialized, skipping');
    return;
  }
  
  console.log('✅ Initializing event listeners...');
  
  // Submit buttons
  const submitDecentralized = document.getElementById('submitDecentralized');
  if (submitDecentralized) {
    submitDecentralized.addEventListener('click', () => 
      callSearch(
        document.getElementById('entityTypeDecentralized').value,
        'decentralizedFields',
        'responseDecentralized',
        true
      )
    );
  }

  const submitSync = document.getElementById('submitSync');
  if (submitSync) {
    submitSync.addEventListener('click', () => 
      callSearch(document.getElementById('entityTypeSync').value, 'syncFields', 'responseSync')
    );
  }

  const submitAsync = document.getElementById('submitAsync');
  if (submitAsync) {
    submitAsync.addEventListener('click', () => {
      const entityType = document.getElementById('entityTypeAsync').value;
      if (!entityType) {
        showNotification(t('notifications.selectEntityType'), 'warning');
        return;
      }
      callSearchAsync(entityType, 'asyncFields');
    });
  }

    // Re-onboarding: entity type change → show the FIELD PICKER (checkboxes).
    // The user ticks the fields they want to update; only those become inputs
    // below. Submit then sends only the picked fields.
const entityTypeReonboarding = document.getElementById('entityTypeReonboarding');
if (entityTypeReonboarding) {
  entityTypeReonboarding.addEventListener('change', () => {
    const entityType = entityTypeReonboarding.value;
    const reonboardingFields = document.getElementById('reonboardingFields');
    const oldPicker = document.getElementById('reonboardFieldPicker');
    if (oldPicker) oldPicker.remove();
    reonboardingFields.innerHTML = '';
    if (entityType) {
      renderReonboardPicker(entityType);
    }
  });
}

    // Submit
   const submitReonboarding = document.getElementById('submitReonboarding');
if (submitReonboarding) {
  submitReonboarding.addEventListener('click', () => {
    const entityType = document.getElementById('entityTypeReonboarding').value;
    const clientId = document.getElementById('existingClientId').value.trim();
    
    if (!entityType) {
      showNotification(t('notifications.selectEntityType'), 'warning');
      return;
    }
    if (!clientId) {
      showNotification('Please enter an existing Client ID.', 'warning');
      return;
    }
    callReonboarding(clientId, entityType);  // ✅ pass entityType explicitly
  });
}


  // Entity type selectors
  const entityTypeDecentralized = document.getElementById('entityTypeDecentralized');
  if (entityTypeDecentralized) {
    entityTypeDecentralized.addEventListener('change', () => {
      const entityType = entityTypeDecentralized.value;
      if (entityType) {
        renderFields('decentralizedFields', entityType, 'decentralized');
      }
    });
  }

  const entityTypeSync = document.getElementById('entityTypeSync');
  if (entityTypeSync) {
    entityTypeSync.addEventListener('change', () => {
      const entityType = entityTypeSync.value;
      if (entityType) {
        renderFields('syncFields', entityType, 'centralized');
      }
    });
  }

  const entityTypeAsync = document.getElementById('entityTypeAsync');
  if (entityTypeAsync) {
    entityTypeAsync.addEventListener('change', () => {
      const entityType = entityTypeAsync.value;
      if (entityType) {
        renderFields('asyncFields', entityType, 'async');
      }
    });
  }
  
  window.eventListenersInitialized = true;
  console.log('✅ Event listeners initialized successfully');
}
async function receiveDirectWebhook(event) {
  try {
    const webhookData = typeof event === 'string' ? JSON.parse(event) : event;
    console.log('Direct webhook received from Reis:', webhookData);
    
    handleRealWebhookEvent(webhookData);
    
    return { status: 'ok', message: 'Webhook processed successfully' };
  } catch (error) {
    console.error('Error processing direct webhook:', error);
    return { status: 'error', message: error.message };
  }
}

window.receiveDirectWebhook = receiveDirectWebhook;


window.addEventListener('beforeunload', function() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  // Clean up token refresh interval
  stopAutomaticTokenRefresh();
});

window.closeNotificationHistory = closeNotificationHistory;
window.continueOnboardingFromHistory = continueOnboardingFromHistory;
window.getCountriesForTenant = getCountriesForTenant;

// Resize functionality
document.addEventListener('DOMContentLoaded', function() {
  const resizeHandle = document.getElementById('resizeHandle');
  const authSidebar = document.getElementById('authSidebar');
  let isResizing = false;

  if (resizeHandle && authSidebar) {
    resizeHandle.addEventListener('mousedown', function(e) {
      isResizing = true;
      document.body.classList.add('resizing');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isResizing) return;

      const newWidth = e.clientX;
      
      if (newWidth >= 200 && newWidth <= 600) {
        authSidebar.style.width = newWidth + 'px';
      }
    });

    document.addEventListener('mouseup', function() {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove('resizing');
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOM Content Loaded');
    
    // ✅ CLEAR EXPIRED TOKENS ON PAGE LOAD
    const status = tokenManager.getTokenStatus();
    if (status === 'Expired' || status.includes('Expired')) {
        console.log('Clearing expired token on page load');
        tokenManager.clearTokens();
    }
    
    // ✅ WAIT FOR TRANSLATOR BEFORE INITIALIZING
    await waitForTranslator();
    
    console.log('✅ Starting application initialization...');
    
    // Your existing initialization code
    logMessage('Application initialized', 'info');
    createNotificationElements();
    initializeEventListeners();
    updateTokenStatusDisplay();
    
    // ✅ START AUTOMATIC TOKEN REFRESH if user is already authenticated
    const existingToken = tokenManager.getToken();
    if (existingToken) {
        console.log('✅ Found existing token, starting automatic refresh');
        setupAutomaticTokenRefresh();
    }
    
    setTimeout(() => {
        if (!pollingInterval) {
            setupEventPolling();
        }
    }, 1000);
});