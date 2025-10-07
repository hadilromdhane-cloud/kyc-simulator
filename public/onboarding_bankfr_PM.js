/**
 * PM Onboarding Handler - Updated for Personne Morale entities
 * Pre-fills and disables fields that were already provided during screening
 */

const PMOnboardingHandler = (function() {
    'use strict';

    // Private variables
    let formId = null;
    let tenantName = null;
    let customerData = null;
    let currentForm = null;

    // Configuration
    const CONFIG = {
        API_BASE_URL: 'https://greataml.com/kyc-web-restful',
        ONBOARDING_ENDPOINT: '/onboarding/v1/onboardCustomer',
        DEFAULT_TENANT: 'bankfr'
    };

    // Helper functions
    const Utils = {
        getUrlParameter: function(name) {
            name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
            const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
            const results = regex.exec(location.search);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        },

        generateCustomerId: function() {
    // This should never be called in production
    Utils.logError('WARNING: generateCustomerId called - this should not happen');
    return null;
},

        formatDate: function(date) {
            return date ? date : new Date().toISOString();
        },

        log: function(message, data) {
            console.log(`[PMOnboardingHandler] ${message}`, data || '');
        },

        logError: function(message, error) {
            console.error(`[PMOnboardingHandler ERROR] ${message}`, error);
        }
    };

    // Authentication helpers
    const Auth = {
        getToken: function() {
            return localStorage.getItem('authToken') || 
                   sessionStorage.getItem('authToken') || 
                   // Fallback token for demo/testing
                   'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInRlbmFudCI6ImJhbmtmciIsInVzZXJGaW5nZXJwcmludCI6IjIzY2I4NjJkYzZmZjc3MDQyMGVjNzk3YjIyOTI1YjI5ZjdkZTgyYjlhZTE4MThlNzQwNzE5ZmExZGRlNzIyYzEiLCJoYXNoUm9sZXMiOjAsImhhc2hEZW5pYWxzUm9sZXMiOjAsImV4cCI6MTc1ODAxMDM5N30.ORhCrVMhXyTAG7fJLrFG-sydEZBT0ZfG87JxURKNuG9XSfJpc5oe1mLzcMuGgN5sRehBO-g2HARCR60mes_rqQ';
        },

        getTenant: function() {
            return tenantName || 
                   localStorage.getItem('tenantName') || 
                   sessionStorage.getItem('tenantName') || 
                   customerData?.tenant || 
                   CONFIG.DEFAULT_TENANT;
        },

        getHeaders: function() {
            return {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-auth-tenant': this.getTenant(),
                'x-auth-token': this.getToken()
            };
        }
    };

    // Data mapping functions for PM entities
    const DataMapper = {
            mapFormDataToPayload: function(formData) {
                    if (!customerData || !customerData.customerId) {
                        throw new Error('No customer data available. Cannot proceed with onboarding.');
                    }
                    
                    const customerId = parseInt(customerData.customerId || customerData.customer_id);
                    
                    if (!customerId) {
                        throw new Error('Invalid customer ID. Cannot proceed with onboarding.');
                    }
                    
                    Utils.log('Using customerId for payload', customerId);
                    
                    const currentDateTime = new Date().toISOString();

            // Using the exact structure from your real PM payload example
            return {
                customerId: customerId,
                customerRelationName: formData.raisonSociale || "",
                formId: "2", 
                systemName: customerData.systemName || "",
                systemId: customerData.systemId || "",
                items: {
                    isSanctionnedWorkflow: "Non",
                    isPepWorkflow: "",
                    agence: "headquarters",
                    rm_username: "admin",
                    rm_fn: "System",
                    rm_ln: "User",
                    process_type: "",
                    createdOn: currentDateTime,
                    dpr: "",
                    last_update: currentDateTime,
                    
                    // PM specific fields matching your example
                    segment: "npo",
                    birth_date: formData.dateConstitution || "",
                    nationality: formData.country || "",
                    age: this.calculateAge(formData.dateConstitution),
                    adresseDeResidence: formData.adresseSiege || "",
                    PaysDeResidence: formData.PaysDeResidence || "",
                    nid: formData.numeroRegistre || "",
                    tel: formData.telephoneSociete || "",
                    email: formData.emailSociete || "",
                    website: formData.siteWeb || "",
                    canal_de_distribution: formData.canal_de_distribution || "",
                    legal_form: formData.legal_form || "",
                    industry: this.mapIndustryCode(formData.activity),
                    activity: this.mapActivityCode(formData.activity),
                    
                    // Data grids matching your structure
                    dataGrid1: [{
                        "country-1": "",
                        "is_msc": "n",
                        "country": "",
                        "PaysDeResidence": formData.PaysDeResidence || ""
                    }],
                    
                    is_stock: "",
                    is_negoc: "",
                    textField: "",
                    textField1: "",
                    textField2: "",
                    textField3: "",
                    textField4: "",
                    textField5: "",
                    textField6: "",
                    textField7: "",
                    textField8: "",
                    
                    // Document arrays (empty as in your example)
                    id_doc: [],
                    doc_pm_type: "",
                    receptionDate: "",
                    type: "",
                    address_doc: [],
                    tiin_doc: [],
                    source_of_funds_doc: [],
                    
                    dataGrid: [{
                        source_of_funds_doc1: []
                    }],
                    
                    invokeElm: false,
                    containerelm: {
                        LegalName: "",
                        Industry: "",
                        Revenueelm: "",
                        Revenueelm1: "",
                        Revenueelm2: "",
                        Assets: "",
                        NetIncome: "",
                        Liabilities: ""
                    },
                    
                    invokeElm1: false,
                    containerelm1: {
                        Name1: "",
                        Name2: "",
                        contact1: "",
                        contact2: "",
                        OwnershipPercentage1: "",
                        OwnershipPercentage2: ""
                    },
                    
                    businessName: formData.raisonSociale || "",
                    entityType: "PM",
                    id: customerId,
                    customer_type: "search-result", // Changed to match your example
                    createdBy: "admin",
                    creatorId: 2,
                    creatorFirstName: "System",
                    creatorLastName: "User",
                    modificationDate: currentDateTime,
                    extendedProperties: {},
                    listsNames: [],
                    agencyId: 3,
                    agencyName: "headquarters",
                    eaiIds: {},
                    searchId: Math.floor(Math.random() * 100000),
                    outboundSystems: null,
                    AddressDataGrid: [],
                    current_date: currentDateTime,
                    isPEP: false,
                    isSanctionned: false,
                    isSanctioned: false,
                    hasRiskedCountry: false,
                    form_entity_type: "PM",
                    first_name: "",
                    last_name: "",
                    citizenship: "",
                    url: "https://greataml.com/",
                    is_hq_user: false,
                    current_user_name: "System User",
                    current_user_id: 2,
                    agency_location: null,
                    distribution_channel: null,
                    obnl_name: "",
                    customerUrl: "https://greataml.com/",
                    sumMscPercentage: 0,
                    revenuAnnuelNet: parseInt(formData.chiffreAffaires) || 0,
                    business_name: formData.raisonSociale || "",
                    address: []
                }
            };
        },

        // Helper function to calculate age from constitution date
        calculateAge: function(dateConstitution) {
            if (!dateConstitution) return 0;
            const today = new Date();
            const constitutionDate = new Date(dateConstitution);
            return today.getFullYear() - constitutionDate.getFullYear();
        },

        // Helper function to map activity to industry code
        mapIndustryCode: function(activity) {
            // Map activity sectors to industry codes based on your example
            const industryMap = {
                'Agriculture': 360010,
                'Industries': 360020,
                'Manufacture': 360025,
                'Energie': 360030,
                'Construction': 360035,
                'Commerce': 360040,
                'Transport': 360045,
                'Information': 360050,
                'Finance': 360055,
                'Immobilier': 360060,
                'Scientifiques': 360065,
                'Services': 360070,
                'Education': 360075,
                'Sante': 360080
            };
            return industryMap[activity] || 360030; // Default to 360030 like your example
        },

        // Helper function to map activity to activity code
        mapActivityCode: function(activity) {
            // Map activity sectors to activity codes
            const activityMap = {
                'Agriculture': 7100,
                'Industries': 7200,
                'Manufacture': 7250,
                'Energie': 7300,
                'Construction': 7350,
                'Commerce': 7400,
                'Transport': 7450,
                'Information': 7500,
                'Finance': 7550,
                'Immobilier': 7600,
                'Scientifiques': 7650,
                'Services': 7700,
                'Education': 7750,
                'Sante': 7800
            };
            return activityMap[activity] || 7300; // Default to 7300 like your example
        },

        mapRelatedPersons: function(personsData) {
            if (!Array.isArray(personsData)) return [];
            
            return personsData.map(person => ({
                firstName: person.firstName || "",
                lastName: person.lastName || "",
                birthDate: person.birthDate || "",
                nationality: person.nationality || "",
                citizenship: person.citizenship || "",
                relation: person.relation || "",
                isBeneficiary: person.relation === 'beneficiaire'
            }));
        },

        mapBeneficialOwners: function(personsData) {
            if (!Array.isArray(personsData)) return [];
            
            return personsData
                .filter(person => person.relation === 'beneficiaire')
                .map(person => ({
                    firstName: person.firstName || "",
                    lastName: person.lastName || "",
                    birthDate: person.birthDate || "",
                    nationality: person.nationality || "",
                    citizenship: person.citizenship || ""
                }));
        },

        hasBeneficialOwners: function(personsData) {
            if (!Array.isArray(personsData)) return "false";
            return personsData.some(person => person.relation === 'beneficiaire') ? "true" : "false";
        }
    };

    // Form validation functions
    const Validator = {
        validateForm: function() {
            const requiredFields = currentForm.querySelectorAll('input[required], select[required], textarea[required]');
            let isValid = true;
            let firstInvalid = null;

            requiredFields.forEach(field => {
                // Skip validation for disabled fields (pre-populated from screening)
                if (field.disabled) return;
                
                if (!field.value.trim()) {
                    field.style.borderColor = '#dc3545';
                    if (!firstInvalid) {
                        firstInvalid = field;
                    }
                    isValid = false;
                } else {
                    field.style.borderColor = '#e9ecef';
                }
            });

            if (!isValid) {
                alert('Veuillez remplir tous les champs obligatoires marqués d\'un *');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }

            return isValid;
        },

        collectFormData: function() {
            const formData = {};
            const allInputs = currentForm.querySelectorAll('input, select, textarea');
            
            allInputs.forEach(input => {
                if (input.type === 'radio') {
                    if (input.checked) {
                        formData[input.name] = input.value;
                    }
                } else if (input.type === 'checkbox') {
                    if (input.checked) {
                        formData[input.name] = input.value;
                    }
                } else {
                    // Clean the input value to avoid regex issues
                    let value = input.value;
                    if (typeof value === 'string') {
                        value = value.replace(/[*+?^${}()|\\[\]]/g, '');
                    }
                    formData[input.name] = value;
                }
            });

            // Collect persons table data
            const personsData = [];
            const tableRows = document.querySelectorAll('#personsTable tbody tr');
            tableRows.forEach((row, index) => {
                const inputs = row.querySelectorAll('input, select');
                const personData = {};
                inputs.forEach(input => {
                    const fieldName = input.name.split('_').slice(2).join('_'); // Remove person_X_ prefix
                    personData[fieldName] = input.value;
                });
                if (personData.firstName || personData.lastName) { // Only include if has some data
                    personsData.push(personData);
                }
            });
            formData.relatedPersons = personsData;

            return formData;
        }
    };

    // UI functions
  // EXACT REPLACEMENT for the UI object in your PM handler
// Find this section in document 6 and replace it entirely

const UI = {
    showLoading: function(button) {
        const originalText = button.textContent;
        button.textContent = 'Envoi en cours...';
        button.disabled = true;
        return originalText;
    },

    hideLoading: function(button, originalText) {
        button.textContent = originalText;
        button.disabled = false;
    },

    showSuccessMessage: async function(onboardingResult = null) {
        let statusMessage = 'Customer Approved';
        let riskText = '';
        let riskBadgeClass = 'risk-low';
        let isBlocking = false;
        let isHighRisk = false;
        let additionalInfo = '';

        // Fetch risk level if riskCalculationId exists
        if (onboardingResult && onboardingResult.riskCalculationId) {
            try {
                const riskData = await this.fetchRiskLevel(onboardingResult.riskCalculationId);
                if (riskData && riskData.riskLevel) {
                    const riskLevel = riskData.riskLevel.label;
                    const riskValue = riskData.riskLevel.riskLevelValue;
                    
                    if (riskLevel === 'HR' || riskValue >= 80) {
                        riskText = 'High Risk';
                        riskBadgeClass = 'risk-high';
                        isHighRisk = true;
                        statusMessage = 'Entity on Hold';
                    } else if (riskLevel === 'MR' || (riskValue >= 30 && riskValue < 80)) {
                        riskText = 'Medium Risk';
                        riskBadgeClass = 'risk-medium';
                    } else {
                        riskText = 'Low Risk';
                        riskBadgeClass = 'risk-low';
                    }
                }
            } catch (error) {
                Utils.logError('Failed to fetch risk level', error);
            }
        }

        // Handle different status scenarios
        if (onboardingResult) {
            if (onboardingResult.instruction && onboardingResult.instruction.blocking) {
                statusMessage = 'Entity Rejected';
                isBlocking = true;
                additionalInfo = `
                    <div style="background: #f8d7da; border: 2px solid #dc3545; padding: 20px; border-radius: 10px; margin: 25px auto; max-width: 500px; text-align: left;">
                        <h4 style="color: #721c24; margin-bottom: 10px; font-size: 1.1rem;">⚠ Blocking Instruction</h4>
                        <p style="color: #721c24; margin: 0; font-weight: 600;">${onboardingResult.instruction.label}</p>
                        <p style="color: #721c24; margin: 10px 0 0 0; font-size: 0.95rem;">${onboardingResult.instruction.description}</p>
                    </div>
                `;
            } else if (onboardingResult.instruction) {
                statusMessage = 'Entity Approved - Action Required';
                additionalInfo = `
                    <div style="background: #d1ecf1; border: 2px solid #17a2b8; padding: 20px; border-radius: 10px; margin: 25px auto; max-width: 500px; text-align: left;">
                        <h4 style="color: #0c5460; margin-bottom: 10px; font-size: 1.1rem;">ℹ Information Instruction</h4>
                        <p style="color: #0c5460; margin: 0; font-weight: 600;">${onboardingResult.instruction.label}</p>
                        <p style="color: #0c5460; margin: 10px 0 0 0; font-size: 0.95rem;">${onboardingResult.instruction.description}</p>
                    </div>
                `;
            } else if (onboardingResult.errorMessage) {
                statusMessage = 'Entity Approved - With Remarks';
                additionalInfo = `
                    <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 10px; margin: 25px auto; max-width: 500px; text-align: left;">
                        <h4 style="color: #856404; margin-bottom: 10px; font-size: 1.1rem;">📝 Remark</h4>
                        <p style="color: #856404; margin: 0;">${onboardingResult.errorMessage}</p>
                    </div>
                `;
            }
        }

        const container = document.querySelector('.container');
        const customerCardUrl = `https://greataml.com/profiles/customer-card/${customerData.customerId}`;
        
        container.innerHTML = `
            <style>
                .success-page-design1 {
                    text-align: center;
                    padding: 50px 20px;
                    background: white;
                    min-height: 100vh;
                }
                .success-icon {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, ${isBlocking ? '#dc3545, #c82333' : '#28a745, #20c997'});
                    border-radius: 50%;
                    margin: 0 auto 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    color: white;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }
                .success-title {
                    color: #004080;
                    font-size: 1.8rem;
                    margin-bottom: 15px;
                    font-weight: 700;
                }
                .success-subtitle {
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    font-size: 1.1rem;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }
                .risk-badge {
                    display: inline-block;
                    padding: 12px 30px;
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 1.1rem;
                    margin: 20px 0;
                    transition: transform 0.2s ease;
                }
                .risk-badge:hover { transform: scale(1.05); }
                .risk-medium { background: #fff3cd; color: #856404; border: 2px solid #ffc107; }
                .risk-high { background: #f8d7da; color: #721c24; border: 2px solid #dc3545; }
                .risk-low { background: #d4edda; color: #155724; border: 2px solid #28a745; }
                .status-text {
                    margin: 25px 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: ${isBlocking ? '#dc3545' : (isHighRisk ? '#ff8c00' : '#28a745')};
                }
                .btn-primary-custom {
                    display: inline-block;
                    padding: 14px 35px;
                    background: linear-gradient(135deg, #007ACC, #0056b3);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 10px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                }
                .btn-primary-custom:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0, 122, 204, 0.4);
                }
                .btn-secondary-custom {
                    display: inline-block;
                    padding: 14px 35px;
                    background: #6c757d;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 10px;
                    transition: all 0.3s ease;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                }
                .btn-secondary-custom:hover {
                    background: #5a6268;
                    transform: translateY(-2px);
                }
                .entity-info-box {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px auto;
                    max-width: 450px;
                    text-align: left;
                }
                .entity-info-box h4 {
                    margin-bottom: 15px;
                    color: #004080;
                }
                .entity-info-box p {
                    margin: 8px 0;
                    color: #495057;
                }
            </style>
            
            <div class="success-page-design1">
                <div class="success-icon">${isBlocking ? '⚠' : '✓'}</div>
                
                <h2 class="success-title">Transfer Successful</h2>
                
                <p class="success-subtitle">
                    Entity KYC DATA FORM has successfully transferred from your Core System to Reis KYC.
                </p>
                
                ${riskText ? `
                    <div style="margin: 35px 0;">
                        <div style="font-size: 0.9rem; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Risk Assessment</div>
                        <div class="risk-badge ${riskBadgeClass}">${riskText}</div>
                    </div>
                ` : ''}
                
                <p class="status-text">${isBlocking ? '✗' : '✓'} ${statusMessage}</p>
                
                ${additionalInfo}
                
                <div class="entity-info-box">
                    <h4>Entity Information:</h4>
                    <p><strong>Entity ID:</strong> ${customerData.customerId}</p>
                    <p><strong>Business Name:</strong> ${customerData.businessName || 'N/A'}</p>
                    <p><strong>Type:</strong> Personne Morale (PM)</p>
                    <p><strong>Tenant:</strong> ${tenantName.toUpperCase()}</p>
                    <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                    ${onboardingResult && onboardingResult.riskCalculationId ? 
                        `<p><strong>Risk Calculation ID:</strong> ${onboardingResult.riskCalculationId}</p>` : ''}
                </div>
                
                <div style="margin: 35px auto; max-width: 550px;">
                    <p style="color: #666; margin-bottom: 15px; font-size: 1.05rem;">View entity information and risk calculation details:</p>
                    <a href="${customerCardUrl}" target="_blank" class="btn-primary-custom">
                        View Customer Card
                    </a>
                    <br>
                    <button class="btn-secondary-custom" onclick="window.location.href='index.html'">
                        Back to Home
                    </button>
                </div>
            </div>
        `;
    },

    fetchRiskLevel: async function(riskCalculationId) {
        try {
            const token = Auth.getToken();
            const tenant = Auth.getTenant();
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/risk-calculation/risk-calculation-result/${riskCalculationId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-tenant': tenant,
                    'x-auth-token': token
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch risk level: ${response.status}`);
            }
            
            const data = await response.json();
            Utils.log('Risk level data fetched for PM', data);
            return data;
        } catch (error) {
            Utils.logError('Error fetching PM risk level', error);
            return null;
        }
    },

    showErrorMessage: function(errorMessage) {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <div style="font-size: 4em; color: #dc3545; margin-bottom: 20px;">❌</div>
                <h2 style="color: #dc3545; margin-bottom: 20px;">Erreur de soumission</h2>
                <p style="font-size: 1.2em; color: #6c757d; margin-bottom: 30px;">
                    Une erreur s'est produite lors de l'envoi de la demande KYC pour l'entité <strong>${customerData.customerId}</strong>.
                </p>
                
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px;">
                    <h4 style="color: #721c24; margin-bottom: 10px;">Détails de l'erreur:</h4>
                    <p style="color: #721c24; margin: 0; word-break: break-word;">${errorMessage}</p>
                </div>
                
                <div style="margin-top: 30px;">
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-right: 10px; padding: 15px 30px; background: linear-gradient(45deg, #007bff, #0056b3); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Réessayer
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.href='index.html'" style="padding: 15px 30px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        `;
    }
};

    // Data persistence functions
    const Storage = {
        saveFormData: function(data) {
            if (customerData && customerData.customerId) {
                localStorage.setItem(`pm_onboarding_complete_${customerData.customerId}`, JSON.stringify(data));
            }
        },

        saveDraft: function(data) {
            if (customerData && customerData.customerId) {
                localStorage.setItem(`pm_onboarding_draft_${customerData.customerId}`, JSON.stringify(data));
            }
        },

        loadDraft: function() {
            if (customerData && customerData.customerId) {
                const draftData = localStorage.getItem(`pm_onboarding_draft_${customerData.customerId}`);
                if (draftData) {
                    try {
                        return JSON.parse(draftData);
                    } catch (error) {
                        Utils.logError('Error parsing draft data', error);
                    }
                }
            }
            return null;
        },

        clearDraft: function() {
            if (customerData && customerData.customerId) {
                localStorage.removeItem(`pm_onboarding_draft_${customerData.customerId}`);
            }
        }
    };

    // API functions
    const API = {
        submitOnboarding: async function(payload) {
            const url = CONFIG.API_BASE_URL + CONFIG.ONBOARDING_ENDPOINT;
            const headers = Auth.getHeaders();

            Utils.log('Sending PM onboarding request to', url);
            Utils.log('Request headers (sanitized)', {
                ...headers,
                'x-auth-token': headers['x-auth-token'] ? `${headers['x-auth-token'].substring(0, 10)}...` : 'Missing'
            });
            Utils.log('PM onboarding payload', payload);

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            Utils.log('Response status', response.status);
            Utils.log('Response headers', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                let errorData;
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    errorData = await response.json();
                } else {
                    const errorText = await response.text();
                    Utils.log('Error response text', errorText);
                    errorData = { message: errorText || `HTTP ${response.status}` };
                }
                
                Utils.log('Error data', errorData);
                throw new Error(errorData.message || `Server error: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            Utils.log('Success! PM onboarding server response', result);
            return result;
        }
    };

    // Main functions
    const Core = {
        loadCustomerData: function() {
    const customerId = Utils.getUrlParameter('customerId');
    Utils.log('Customer ID from URL:', customerId);
    
    if (!customerId) {
        Utils.logError('CRITICAL: No customerId found in URL');
        alert('Error: No customer ID provided. Please start from the screening process.');
        window.location.href = 'index.html';
        return;
    }
    
    const screeningData = localStorage.getItem(`screeningData_${customerId}`);
    if (screeningData) {
        try {
            customerData = JSON.parse(screeningData);
            customerData.customerId = customerId;
            Utils.log('Loaded PM screening data', customerData);
        } catch (error) {
            Utils.logError('Error parsing PM screening data', error);
            alert('Error: Could not load customer data. Please restart the screening process.');
            window.location.href = 'index.html';
            return;
        }
    } else {
        Utils.logError('No screening data found for customerId:', customerId);
        alert('Error: No screening data found. Please complete the screening process first.');
        window.location.href = 'index.html';
        return;
    }

    Utils.log('Final PM customer data', customerData);
    Utils.log('Final customerId', customerData.customerId);
},
updateCustomerInfo: function() {
    const customerIdElements = [
        document.getElementById('customerId'),
        document.getElementById('entityId'),
        document.querySelector('[data-customer-id]'),
        document.querySelector('.customer-id-display')
    ];
    
    customerIdElements.forEach(element => {
        if (element) {
            element.textContent = customerData.customerId;
            Utils.log('Updated customer ID display', element.id || element.className);
        }
    });

    const hiddenIdInputs = document.querySelectorAll('input[name="customerId"], input[name="entityId"]');
    hiddenIdInputs.forEach(input => {
        input.value = customerData.customerId;
    });

    const pageTitle = document.querySelector('h1, .page-title, .header h2');
    if (pageTitle && !pageTitle.dataset.idUpdated) {
        const currentText = pageTitle.textContent;
        if (!currentText.includes(customerData.customerId)) {
            pageTitle.textContent = `${currentText} - ID: ${customerData.customerId}`;
            pageTitle.dataset.idUpdated = 'true';
        }
    }
},


        prePopulateForm: function() {
            console.log('PM prePopulateForm called with customerData:', customerData);
            
            // Pre-populate form with locked screening data for PM
            if (customerData && customerData.isScreeningDataLocked) {
                console.log('Entering PM security lock branch');
                Utils.log('Pre-populating PM form with locked screening data');
                
                const secureFieldMappings = [
                    { screeningField: 'businessName', onboardingFields: ['raisonSociale'], readonly: true, label: 'Raison Sociale/Business Name' },
                    { screeningField: 'legalForm', onboardingFields: ['formeJuridique'], readonly: true, label: 'Forme Juridique/Legal Form', fieldType: 'select' },
                    { screeningField: 'countryOfIncorporation', onboardingFields: ['paysImmatriculation'], readonly: true, label: 'Pays d\'Immatriculation/Country of Incorporation', fieldType: 'select' },
                    { screeningField: 'registrationNumber', onboardingFields: ['numeroRegistre'], readonly: true, label: 'Numéro d\'Immatriculation/Registration Number' }
                ];
                
                let fieldsLocked = 0;

                secureFieldMappings.forEach(mapping => {
                    const screeningValue = customerData[mapping.screeningField];
                    console.log(`Checking PM mapping for ${mapping.screeningField}: ${screeningValue}`);
                    
                    if (screeningValue) {
                        mapping.onboardingFields.forEach(fieldId => {
                            const field = document.getElementById(fieldId);
                            console.log(`Looking for PM field: ${fieldId}, found:`, field);
                            
                            if (field) {
                                field.value = screeningValue;
                                console.log(`Set ${fieldId} value to: ${screeningValue}`);
                                
                                if (mapping.readonly) {
                                    // Handle select elements differently
                                    const isSelectField = mapping.fieldType === 'select' || field.tagName.toLowerCase() === 'select';
                                    
                                    if (isSelectField) {
                                        field.disabled = true;
                                        field.setAttribute('data-screening-locked', 'true');
                                    } else {
                                        field.readOnly = true;
                                        field.disabled = false;
                                    }
                                    
                                    field.style.backgroundColor = '#f8f9fa';
                                    field.style.border = '2px solid #28a745';
                                    field.style.color = '#495057';
                                    field.style.cursor = 'not-allowed';
                                        
                                    const parentGroup = field.closest('.form-group');
                                    if (parentGroup && !parentGroup.querySelector('.security-lock')) {
                                        const lockIndicator = document.createElement('span');
                                        lockIndicator.className = 'security-lock';
                                        lockIndicator.innerHTML = ' 🔒';
                                        lockIndicator.style.cssText = 'color: #28a745; font-weight: bold; margin-left: 8px;';
                                        lockIndicator.title = `${mapping.label} locked from screening data for security`;
                                        
                                        const label = parentGroup.querySelector('label');
                                        if (label) {
                                            label.appendChild(lockIndicator);
                                        }
                                    }
                                    fieldsLocked++;
                                    console.log(`Locked PM field ${fieldId}, total locked: ${fieldsLocked}`);
                                }
                                Utils.log(`Locked PM field ${fieldId} with screening value: ${screeningValue}`);
                            } else {
                                console.warn(`PM field ${fieldId} not found in DOM`);
                            }
                        });
                    } else {
                        console.log(`No value found for PM ${mapping.screeningField}`);
                    }
                });

                console.log(`Total PM fields locked: ${fieldsLocked}`);

                if (fieldsLocked > 0) {
                    const headerElement = document.querySelector('.header');
                    if (headerElement && !document.querySelector('.security-notice')) {
                        const securityNotice = document.createElement('div');
                        securityNotice.className = 'security-notice';
                        securityNotice.style.cssText = `
                            background: linear-gradient(135deg, #d4edda, #c3e6cb);
                            border: 2px solid #28a745;
                            color: #155724;
                            padding: 15px;
                            border-radius: 10px;
                            margin: 15px 0;
                            font-size: 14px;
                            text-align: left;
                        `;
                        securityNotice.innerHTML = `
                            <strong>🔒 Sécurité PM / Security:</strong> 
                            ${fieldsLocked} champ(s) pré-rempli(s) et verrouillé(s) depuis le screening PM pour des raisons de sécurité. 
                            ${fieldsLocked} field(s) pre-filled and locked from PM screening data for security purposes.
                            <br><small>Entity ID: <code>${customerData.customerId}</code> | Type: <code>PM</code> | Tenant: <code>${customerData.tenant || tenantName}</code></small>
                        `;
                        headerElement.appendChild(securityNotice);
                        console.log('Added PM security notice');
                    }
                }
            } else {
                console.log('PM security lock branch not entered - falling back to legacy method');
                
                // Fallback: if we have some customer data but not marked as secure screening data
                if (customerData && customerData.businessName) {
                    Utils.log('Pre-populating PM form with available customer data (not locked)');
                    
                    const basicMappings = [
                        { screeningField: 'businessName', onboardingFields: ['raisonSociale'] },
                        { screeningField: 'legalForm', onboardingFields: ['formeJuridique'] },
                        { screeningField: 'countryOfIncorporation', onboardingFields: ['paysImmatriculation'] },
                        { screeningField: 'registrationNumber', onboardingFields: ['numeroRegistre'] }
                    ];

                    basicMappings.forEach(mapping => {
                        const screeningValue = customerData[mapping.screeningField];
                        if (screeningValue) {
                            mapping.onboardingFields.forEach(fieldId => {
                                const field = document.getElementById(fieldId);
                                if (field && !field.value) {
                                    field.value = screeningValue;
                                    Utils.log(`Pre-populated PM ${fieldId} with: ${screeningValue}`);
                                }
                            });
                        }
                    });
                } else {
                    // Legacy fallback: parse from customer ID if available
                    Utils.log('Using legacy PM customer ID parsing for pre-population');
                    
                    if (customerData && customerData.customerId) {
                        const parts = customerData.customerId.toString().split('_');
                        if (parts.length >= 1) {
                            const businessNameField = document.getElementById('raisonSociale');
                            if (businessNameField && !businessNameField.value) {
                                businessNameField.value = parts[0] || '';
                            }
                        }
                    }
                }
            }

            // Load draft data for unlocked fields
            const draftData = Storage.loadDraft();
            if (draftData) {
                Object.keys(draftData).forEach(key => {
                    const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                    if (field && !field.readOnly && !field.disabled && draftData[key]) {
                        field.value = draftData[key];
                    }
                });
                Utils.log('Loaded PM draft data for unlocked fields');
            }
        },

        setupAutoSave: function() {
            setInterval(() => {
                const formData = Validator.collectFormData();
                Storage.saveDraft(formData);
            }, 30000); // Auto-save every 30 seconds
        },

        handleFormSubmission: async function(event) {
            event.preventDefault();
            
            if (!Validator.validateForm()) {
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            const originalText = UI.showLoading(submitBtn);

            try {
                const formData = Validator.collectFormData();
                Utils.log('PM Form data collected', formData);

                const authToken = Auth.getToken();
                const tenant = Auth.getTenant();
                
                if (!authToken) {
                    throw new Error('Token d\'authentification manquant. Veuillez vous reconnecter.');
                }
                
                if (!tenant) {
                    throw new Error('Nom de tenant manquant. Veuillez vérifier votre configuration.');
                }

                const payload = DataMapper.mapFormDataToPayload(formData);
                Utils.log('Complete PM payload', payload);

                // Store the completed form data locally as backup
                Storage.saveFormData(payload);

                // Send to API
                const result = await API.submitOnboarding(payload);

                // Show success message
                UI.showSuccessMessage(result);

                // Clear draft data on successful submission
                Storage.clearDraft();

            } catch (error) {
                Utils.logError('PM Submission failed', error);
                
                // Reset button state
                UI.hideLoading(submitBtn, originalText);
                
                // Show error message
                UI.showErrorMessage(error.message);
            }
        }
    };

    // Public API
    return {
            init: function(formElementId, tenant) {
                Utils.log('=== PM Onboarding Handler Initialization ===');
                
                formId = formElementId;
                tenantName = tenant || CONFIG.DEFAULT_TENANT;
                currentForm = document.getElementById(formId);
                
                if (!currentForm) {
                    Utils.logError('PM Form not found', formId);
                    alert('Erreur: Le formulaire PM est introuvable. ID: ' + formId);
                    return;
                }

                Utils.log('Form element found', formId);
                Utils.log('Step 1: Loading customer data...');
                Core.loadCustomerData();
                
                Utils.log('Step 2: Updating customer info display...');
                Core.updateCustomerInfo();
                
                Utils.log('Step 3: Pre-populating form fields...');
                Core.prePopulateForm();
                
                Utils.log('Step 4: Setting up auto-save...');
                Core.setupAutoSave();

                Utils.log('Step 5: Attaching form submission handler...');
                currentForm.addEventListener('submit', Core.handleFormSubmission);

                Utils.log('=== PMOnboardingHandler initialized successfully ===');
                Utils.log('Customer ID:', customerData.customerId);
                Utils.log('Tenant:', tenantName);
                
                console.info('%c✓ PM Onboarding Ready', 'color: green; font-weight: bold; font-size: 14px;');
                console.info('Customer ID:', customerData.customerId);
            },
        // Utility methods that can be used by external code
        getCustomerData: function() {
            return customerData;
        },

        getTenantName: function() {
            return tenantName;
        },

        validateForm: function() {
            return Validator.validateForm();
        },

        collectFormData: function() {
            return Validator.collectFormData();
        }
    };
})();