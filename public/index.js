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
                { label: t('fields.annualIncome'), key: 'revenu', type: 'number', placeholder: t('fields.numericOnly'), required: true }
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
            ]
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
    'COMMERCE',
    'ARTISAN',
    'CADRE SUPERIEUR',
    'EMPLOYE',
    'PROFESSION LIBERALE',
    'RETRAITE',
    'ETUDIANT',
    'SANS PROFESSION'
  ],
  products: [
    { value: 'currentAccount', label: 'Compte courant' },
    { value: 'savingsAccount', label: 'Compte épargne' },
    { value: 'loan', label: 'Prêt' },
    { value: 'creditCard', label: 'Carte de crédit' },
    { value: 'mobileBanking', label: 'Banque mobile' }
  ],
  channel: [
    { value: 'branch', label: 'Agence' },
    { value: 'online', label: 'En ligne' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'phone', label: 'Téléphone' }
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
  fundsOrigin: [
    { value: 'business_revenue', label: 'Business Revenue' },
    { value: 'investments', label: 'Investments' },
    { value: 'loans', label: 'Loans' },
    { value: 'shareholders', label: 'Shareholders' },
    { value: 'other', label: 'Other' }
  ]
};

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

        asyncFieldOptions.idType.forEach(type => {
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

        asyncFieldOptions.profession.forEach(prof => {
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

        asyncFieldOptions.products.forEach(product => {
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

        asyncFieldOptions.channel.forEach(channel => {
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

        asyncFieldOptions.legalForm.forEach(form => {
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

  asyncFieldOptions.activitySector.forEach(sector => {
    const option = document.createElement('option');
    option.value = sector;
    option.textContent = sector;
    input.appendChild(option);
  });
}
    else if (field.type === 'fundsOrigin') {
      input = document.createElement('select');
      input.id = containerId + '_' + field.key;
      if (field.required) input.required = true;

       const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = t('fields.selectFundsOrigin');
      input.appendChild(defaultOption);

      asyncFieldOptions.fundsOrigin.forEach(origin => {
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
        PaysDeResidence: formData.citizenship || "",
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
        profession: formData.profession || "",
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
  if (document.getElementById('notificationContainer') && 
      document.getElementById('notificationHistoryBtn')) {
    console.log('✅ Notification elements already exist, skipping creation');
    updateNotificationBadge();
    updateTokenStatusDisplay();
    return;
  }

  const notificationContainer = document.createElement('div');
  notificationContainer.id = 'notificationContainer';
  notificationContainer.style.cssText = `
    position: fixed;
    top: 130px;
    right: 20px;
    z-index: 10000;
    max-width: 350px;
  `;
  document.body.appendChild(notificationContainer);

  const notificationButton = document.createElement('button');
  notificationButton.id = 'notificationHistoryBtn';
  notificationButton.innerHTML = t('buttons.notifications');
  notificationButton.style.cssText = `
  position: fixed;
  width: 200px;
  top: 0px;
  right: 170px;
  background: #f0f8ff;
  border: 2px solid #007ACC;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  overflow: hidden;
  padding: 0;
  gap: 0;
  height: 36px; 
  align-items: center; 
`;
  
notificationButton.onmouseover = () => {
    notificationButton.style.backgroundColor = '#004080';
  };
  notificationButton.onmouseout = () => {
    const unfinishedCount = notificationsHistory.filter(n => 
      n.source === 'Reis_KYC' && !n.isSanctioned && !n.onboardingCompleted
    ).length;
    // Keep blue, only show red badge in text
    notificationButton.style.backgroundColor = '#007ACC';
  };
  
  notificationButton.onclick = showNotificationHistory;
  document.body.appendChild(notificationButton);

  updateNotificationBadge();
  updateTokenStatusDisplay();
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
    button.innerHTML = `${t('buttons.notifications')} <span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 5px; font-size: 11px;">${unfinishedCount}</span>`;
    button.style.backgroundColor = '#007ACC'; // Keep blue
  } else {
    button.innerHTML = t('buttons.notifications');
    button.style.backgroundColor = '#007ACC'; // Keep blue
  }
}


function showNotificationHistory() {
  const historyOverlay = document.createElement('div');
  historyOverlay.id = 'notificationHistoryOverlay';
  historyOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 15000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const historyContent = document.createElement('div');
  historyContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 10px;
    max-width: 800px;
    width: 90%;
    max-height: 80%;
    overflow-y: auto; 
  `;

  let historyHTML = `
    <h2 style="color: #004080; margin-top: 0; text-align: center;">${t('buttons.notificationsHistory')}</h2>
    <div style="margin-bottom: 20px;">
      <button id="clearHistory" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">${t('buttons.clearHistory')}</button>
    </div>
  `;

 if (notificationsHistory.length === 0) {
    historyHTML += `<p style="text-align: center; color: #666;">${t('notifications.noNotifications')}</p>`;
} else {
    const sortedHistory = [...notificationsHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedHistory.forEach((notification, index) => {
      const isReis = notification.source === 'Reis_KYC';
      const canContinueOnboarding = isReis && !notification.isSanctioned && !notification.onboardingCompleted;
      const statusColor = notification.isSanctioned ? '#dc3545' : '#28a745';
      const statusText = notification.isSanctioned ? 'SANCTIONED' : 'CLEARED';
      const notificationTenant = notification.tenant || 'Unknown';
      
      historyHTML += `
        <div style="
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          background: ${canContinueOnboarding ? '#f8f9fa' : 'white'};
          ${canContinueOnboarding ? 'border-left: 4px solid #007ACC;' : ''}
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <h4 style="margin: 0; color: #004080;">Customer ${notification.customerId}</h4>
              <small style="color: #666; font-weight: normal;">🏦 Tenant: ${notificationTenant}</small>
            </div>
            <span style="
              background: ${statusColor};
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
            ">${statusText}</span>
          </div>
          
          ${isReis ? `
            <div style="font-size: 14px; margin: 5px 0;">
              <span style="color: ${notification.isPEP ? '#ffc107' : '#28a745'};">PEP: ${notification.isPEP ? 'YES' : 'NO'}</span> | 
              <span style="color: ${notification.isSanctioned ? '#dc3545' : '#28a745'};">Sanctions: ${notification.isSanctioned ? 'YES' : 'NO'}</span> | 
              <span style="color: ${notification.isAdverseMedia ? '#ffc107' : '#28a745'};">Adverse Media: ${notification.isAdverseMedia ? 'YES' : 'NO'}</span>
            </div>
          ` : ''}
          
          <p style="margin: 10px 0; color: #666; font-size: 14px;">${notification.message}</p>
          <small style="color: #999;">${new Date(notification.timestamp).toLocaleString()}</small>
          
          ${canContinueOnboarding ? `
            <div style="margin-top: 15px;">
              <button onclick="continueOnboardingFromHistory('${notification.customerId}', ${index})" style="
                background: #28a745;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
              ">Continue Onboarding</button>
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  historyHTML += `
    <div style="text-align: center; margin-top: 20px;">
      <button onclick="closeNotificationHistory()" style="
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
      ">Close</button>
    </div>
  `;

  historyContent.innerHTML = historyHTML;
  historyOverlay.appendChild(historyContent);
  document.body.appendChild(historyOverlay);

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
  
  const currentTenant = localStorage.getItem('tenantName') || 'bankfr';
  const tenantPageMap = {
    'bankfr': 'onboarding_bankfr_PP.html',
    'banque_en': 'onboarding_banque_en.html',
  };
  
  const onboardingPage = tenantPageMap[currentTenant] || 'onboarding_bankfr_PP.html';
  
  console.log(`Continuing onboarding for ${customerId} on ${onboardingPage} (tenant: ${currentTenant})`);
  
  window.location.href = `${onboardingPage}?customerId=${customerId}`;
  updateNotificationBadge();
}

function showNotification(message, type = 'info', duration = 5000) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notification = document.createElement('div');
  notification.style.cssText = `
    background: ${getNotificationColor(type)};
    color: white;
    padding: 15px;
    margin-bottom: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-out;
    position: relative;
    word-wrap: break-word;
  `;

  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 5px;
    right: 10px;
    cursor: pointer;
    font-weight: bold;
    font-size: 18px;
  `;
  closeBtn.onclick = () => notification.remove();

  notification.innerHTML = message;
  notification.appendChild(closeBtn);
  container.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, duration);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  if (!document.querySelector('style[data-notifications]')) {
    style.setAttribute('data-notifications', 'true');
    document.head.appendChild(style);
  }
}

function getNotificationColor(type) {
  switch(type) {
    case 'success': return '#28a745';
    case 'error': return '#dc3545';
    case 'warning': return '#ffc107';
    case 'info': return '#17a2b8';
    default: return '#17a2b8';
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
let lastEventId = parseInt(localStorage.getItem('lastEventId')) || 0;
let pollingInterval = null;
const pollingFrequency = 2000;
let notificationsHistory = JSON.parse(localStorage.getItem('notificationsHistory')) || [];
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
  
  popup.innerHTML = '';
  popup.style.cssText = `
    display: block;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 0;
    border-radius: 10px;
    box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    z-index: 1000;
    min-width: 500px;
    max-width: 600px;
    border: 2px solid #FF9800;
    border-left: 6px solid #FF9800;
    animation: pulse 2s ease-in-out infinite;
  `;
  
  if (!document.querySelector('style[data-pulse-animation]')) {
    const style = document.createElement('style');
    style.setAttribute('data-pulse-animation', 'true');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { box-shadow: 0 5px 25px rgba(0,0,0,0.4); }
        50% { box-shadow: 0 5px 30px rgba(255, 152, 0, 0.6); }
      }
    `;
    document.head.appendChild(style);
  }
  
  const currentTenant = tokenManager.getTenant() || localStorage.getItem('tenantName') || 'BANKFR';
  
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid #e0e0e0;';
  header.innerHTML = `<span style="font-size: 2rem;">🔔</span><h3 style="color: #FF9800; font-size: 1.2rem; font-weight: 600; margin: 0;">${t('popupTitles.reisKycHits')}</h3>`;
  
  const content = document.createElement('div');
  content.style.cssText = 'padding: 20px; color: #333; line-height: 1.6; font-size: 0.95rem;';
  
  const pepText = event.isPEP ? t('status.pepYes') : t('status.pepNo');
  const sanctionText = event.isSanctioned ? t('status.pepYes') : t('status.pepNo');
  const adverseMediaText = event.isAdverseMedia ? t('status.adverseMediaYes') : t('status.adverseMediaNo');
  
  let contentHTML = `<div style="margin-bottom: 15px;"><strong>${t('status.tenant')}</strong> ${currentTenant}</div>`;
  contentHTML += `<div style="margin-bottom: 15px;"><strong>${t('status.customerKycId')}</strong> ${event.customerId}</div>`;
  contentHTML += `<div style="margin-bottom: 15px;"><strong>${t('status.processingResults')}</strong></div>`;
  contentHTML += `<div style="margin-left: 20px; margin-bottom: 10px;">`;
  contentHTML += `• <strong>${t('status.pepStatus')}</strong> ${event.isPEP ? `<span style="color: #ffc107;">⚠️ ${pepText}</span>` : `<span style="color: #28a745;">✅ ${pepText}</span>`} (${event.pepDecision || 'N/A'})<br>`;
  contentHTML += `• <strong>${t('status.sanctions')}</strong> ${event.isSanctioned ? `<span style="color: #dc3545;">🚨 ${sanctionText}</span>` : `<span style="color: #28a745;">✅ ${sanctionText}</span>`} (${event.sanctionDecision || 'N/A'})<br>`;
  contentHTML += `• <strong>${t('status.adverseMedia')}</strong> ${event.isAdverseMedia ? `<span style="color: #ffc107;">⚠️ ${adverseMediaText}</span>` : `<span style="color: #28a745;">✅ ${adverseMediaText}</span>`}`;
  contentHTML += `</div>`;
  contentHTML += `<div style="margin-top: 15px; padding: 15px; background: ${event.isSanctioned ? '#f8d7da' : '#d4edda'}; border-radius: 5px;">`;
  contentHTML += `<strong>${t('status.onboardingDecision')}</strong><br>`;
  if (event.isSanctioned) {
    contentHTML += `<span style="color: #721c24;">${t('status.cannotProceed')}</span>`;
  } else {
    contentHTML += `<span style="color: #155724;">${t('status.canProceed')}</span>`;
  }
  contentHTML += `</div>`;
  
  content.innerHTML = contentHTML;
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = 'padding: 20px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #e0e0e0;';
  
  if (!event.isSanctioned) {
    const continueBtn = document.createElement('button');
    continueBtn.textContent = t('buttons.continueOnboarding');
    continueBtn.style.cssText = 'padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;';
    continueBtn.onclick = () => {
      navigateToOnboarding(event.customerId);
      popup.style.display = 'none';
    };
    buttonsContainer.appendChild(continueBtn);
  }
  
  const closeBtn = document.createElement('button');
closeBtn.textContent = t('buttons.close');
  closeBtn.style.cssText = 'padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;';
  closeBtn.onclick = () => popup.style.display = 'none';
  buttonsContainer.appendChild(closeBtn);
  
  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(buttonsContainer);
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
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 0;
    border-radius: 10px;
    box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    z-index: 1000;
    min-width: 500px;
    max-width: 600px;
    border: 2px solid #007ACC;
    border-left: 6px solid #007ACC;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid #e0e0e0;';
  header.innerHTML = `<span style="font-size: 2rem;">🔍</span><h3 style="color: #007ACC; font-size: 1.2rem; font-weight: 600; margin: 0;">${t('popupTitles.screeningResponse')}</h3>`;
  const content = document.createElement('div');
  content.style.cssText = 'padding: 20px; color: #333; line-height: 1.6; font-size: 0.95rem;';
  content.innerHTML = message; 
  
  if (link) {
    const linkElement = document.createElement('a');
    linkElement.href = link;
    linkElement.target = '_blank';
    linkElement.textContent = link;
    linkElement.style.cssText = 'color: #007ACC; text-decoration: underline; display: block; margin-top: 10px; word-break: break-all;';
    content.appendChild(linkElement);
  }
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = 'padding: 20px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #e0e0e0;';
  
  if (showContinueButton && customerData && apiResponse) {
    const continueBtn = document.createElement('button');
continueBtn.textContent = t('buttons.continueOnboarding');
    continueBtn.style.cssText = 'padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;';
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
  closeBtn.style.cssText = 'padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;';
  closeBtn.onclick = () => popup.style.display = 'none';
  buttonsContainer.appendChild(closeBtn);
  
  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(buttonsContainer);
}


// ALSO UPDATE: navigateToOnboarding to better detect entity type
function navigateToOnboarding(customerId) {
  const currentTenant = localStorage.getItem('tenantName') || 'bankfr';
  
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
      'PP': 'onboarding_banque_en.html', 
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
    initializeEventListeners(); // ← ADD THIS LINE
    updateTokenStatusDisplay();
    
    setTimeout(() => {
        if (!pollingInterval) {
            setupEventPolling();
        }
    }, 1000);
});