/**
 * Onboarding Handler - Updated to pre-populate screening data
 * Pre-fills and disables fields that were already provided during screening
 */

const OnboardingHandler = (function() {
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
            return Math.floor(Math.random() * 10000);
        },

        formatDate: function(date) {
            return date ? date : new Date().toISOString();
        },

        log: function(message, data) {
            console.log(`[OnboardingHandler] ${message}`, data || '');
        },

        logError: function(message, error) {
            console.error(`[OnboardingHandler ERROR] ${message}`, error);
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

    // Data mapping functions - now supports both tenants
    const DataMapper = {
        // BankFR document type mappings (original)
        getDocumentTypeId: function(docType) {
            const typeMap = {
                'cin': 1,
                'passeport': 13,
                'titre_sejour': 2,
                'permis_conduire': 3
            };
            return typeMap[docType] || 1;
        },

        getDocumentTypeName: function(docType) {
            const nameMap = {
                'cin': 'Carte d\'identité nationale',
                'passeport': 'Passeport',
                'titre_sejour': 'Titre de séjour',
                'permis_conduire': 'Permis de conduire'
            };
            return nameMap[docType] || 'Carte d\'identité nationale';
        },

        // Banque EN document type mappings
        getDocumentTypeIdEN: function(docType) {
            const typeMap = {
                'cin': 14,
                'passeport': 13,
                'titre_sejour': 2,
                'permis_conduire': 3
            };
            return typeMap[docType] || 14;
        },

        getDocumentTypeNameEN: function(docType) {
            const nameMap = {
                'cin': 'National identity card',
                'passeport': 'Passport',
                'titre_sejour': 'Residence permit',
                'permis_conduire': 'Driver\'s license'
            };
            return nameMap[docType] || 'National identity card';
        },

        mapFormDataToPayload: function(formData) {
            // Built to match the exact payload Reis sends to GreatAML for the
            // banque_en tenant — same field names, same types (arrays vs strings),
            // same English labels in tin_, fatcaIdentification at root, etc.
            const customerId = parseInt(customerData.customerId) || Utils.generateCustomerId();
            const currentDateTime = new Date().toISOString();
            const docTypeId   = this.getDocumentTypeIdEN(formData.typePiece);
            const docTypeName = this.getDocumentTypeNameEN(formData.typePiece);

            return {
                customerId: customerId,
                items: {
                    isSanctionnedWorkflow: "No",
                    isPepWorkflow: "<li>PEP : <b> <span> No </span></b></li>",
                    agence: "headquarters",
                    rm_username: "admin",
                    rm_fn: "System",
                    rm_ln: "User",
                    process_type: "",
                    createdOn: currentDateTime,
                    dpr: "",
                    last_update: currentDateTime,

                    first_name: formData.prenom || "",
                    last_name: formData.nom || "",
                    birth_date: formData.dateNaissance || "",
                    nationality: formData.Nationalite || "",
                    marital_status: formData.etatCivil || "",
                    tel1: formData.telephone || "",
                    email: formData.email || "",
                    adresseDeResidence: formData.adresse || "",
                    postal_code: formData.codePostal || "",
                    fiscale_ville: formData.ville || "",
                    Country_of_residence: formData.PaysDeResidence || "",

                    tin_: {
                        id: docTypeId,
                        name: docTypeName,
                        value: formData.typePiece || "",
                        translate: docTypeName,
                        parentId: null,
                        parentName: null,
                        uniqueCode: `${docTypeName}:${formData.typePiece}:tin`,
                        tags: ["tin"]
                    },
                    nid: formData.numeroPiece || "",
                    delivery_date: formData.dateDelivrance || "",
                    expiry_date: formData.dateExpiration || "",
                    profession: formData.profession || "",
                    product: [formData.produits || ""],
                    onboarding_channel: formData.canal || "",
                    source_of_funds: [formData.origineFonds || ""],

                    dataGrid: [{
                        select: "",
                        nature: "",
                        tx_nature: {}
                    }],
                    mscq: "",
                    is_pep: "",
                    is_am: "",
                    is_sanctionned: "",
                    related_parties: "",
                    pliberal: "",
                    id_doc: [],
                    address_proof_type: {},
                    address_doc: [],
                    tiin_doc: [],
                    dataGrid1: [{
                        source_of_funds_doctype: {},
                        source_of_funds_doc: []
                    }],
                    invokeElm: false,
                    containerelm: {
                        "profession-2": "",
                        retrieved_dob: "",
                        retrieved_last_name: "",
                        retrieved_first_name: "",
                        "citizenship-2": "",
                        retrieved_address: ""
                    },
                    name: "",
                    select: "",
                    businessName: "",
                    entityType: "PP",
                    id: customerId,
                    customer_type: "manual-entry",
                    createdBy: "admin",
                    creatorId: 1,
                    creatorFirstName: "System",
                    creatorLastName: "User",
                    modificationDate: currentDateTime,
                    extendedProperties: {},
                    citizenship: formData.PaysDeResidence || "",
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
                    form_entity_type: "PP",
                    cus_birth_date: formData.dateNaissance || "",
                    url: "https://greataml.com/",
                    is_hq_user: false,
                    current_user_name: "System User",
                    current_user_id: 1,
                    agency_location: null,
                    distribution_channel: null,
                    obnl_name: formData.nom || "",
                    customerUrl: "https://greataml.com/",
                    address: []
                },
                formId: "1",
                customerRelationName: "",
                fatcaIdentification: {
                    americanCitizen: "false",
                    greenCard: "false",
                    americanResident: "false",
                    americanVisit: "false",
                    address: null,
                    beneficialOwners: null,
                    hasBeneficialOwners: null
                }
            };
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
                alert('Please fill in all required fields marked with *');
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
                        // Remove any problematic characters that might be interpreted as regex
                        value = value.replace(/[*+?^${}()|\\[\]]/g, '');
                    }
                    formData[input.name] = value;
                }
            });

            return formData;
        }
    };

    // UI functions
    const UI = {
        showLoading: function(button) {
            const originalText = button.textContent;
            button.textContent = 'Sending...';
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
    let riskColor = '';
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
                    riskColor = '#dc3545';
                    riskBadgeClass = 'risk-high';
                    isHighRisk = true;
                    statusMessage = 'Customer on Hold';
                } else if (riskLevel === 'MR' || (riskValue >= 30 && riskValue < 80)) {
                    riskText = 'Medium Risk';
                    riskColor = '#ffc107';
                    riskBadgeClass = 'risk-medium';
                } else {
                    riskText = 'Low Risk';
                    riskColor = '#28a745';
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
            statusMessage = 'Customer Rejected';
            isBlocking = true;
            additionalInfo = `
                <div style="background: #f8d7da; border: 2px solid #dc3545; padding: 20px; border-radius: 10px; margin: 25px auto; max-width: 500px; text-align: left;">
                    <h4 style="color: #721c24; margin-bottom: 10px; font-size: 1.1rem;">⚠ Blocking Instruction</h4>
                    <p style="color: #721c24; margin: 0; font-weight: 600;">${onboardingResult.instruction.label}</p>
                    <p style="color: #721c24; margin: 10px 0 0 0; font-size: 0.95rem;">${onboardingResult.instruction.description}</p>
                </div>
            `;
        } else if (onboardingResult.instruction) {
            statusMessage = 'Customer Approved - Action Required';
            additionalInfo = `
                <div style="background: #d1ecf1; border: 2px solid #17a2b8; padding: 20px; border-radius: 10px; margin: 25px auto; max-width: 500px; text-align: left;">
                    <h4 style="color: #0c5460; margin-bottom: 10px; font-size: 1.1rem;">ℹ Information Instruction</h4>
                    <p style="color: #0c5460; margin: 0; font-weight: 600;">${onboardingResult.instruction.label}</p>
                    <p style="color: #0c5460; margin: 10px 0 0 0; font-size: 0.95rem;">${onboardingResult.instruction.description}</p>
                </div>
            `;
        } else if (onboardingResult.errorMessage) {
            statusMessage = 'Customer Approved - With Remarks';
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
            
            .risk-badge:hover {
                transform: scale(1.05);
            }
            
            .risk-medium { 
                background: #fff3cd; 
                color: #856404; 
                border: 2px solid #ffc107; 
            }
            
            .risk-high { 
                background: #f8d7da; 
                color: #721c24; 
                border: 2px solid #dc3545; 
            }
            
            .risk-low { 
                background: #d4edda; 
                color: #155724; 
                border: 2px solid #28a745; 
            }
            
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
            
            .info-label {
                color: #666;
                margin-bottom: 15px;
                font-size: 1.05rem;
            }
        </style>
        
        <div class="success-page-design1">
            <div class="success-icon">${isBlocking ? '⚠' : '✓'}</div>
            
            <h2 class="success-title">Transfer Successful</h2>
            
            <p class="success-subtitle">
                Customer KYC DATA FORM has successfully transferred from your Core System to Reis KYC.
            </p>
            
            ${riskText ? `
                <div style="margin: 35px 0;">
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Risk Assessment</div>
                    <div class="risk-badge ${riskBadgeClass}">${riskText}</div>
                </div>
            ` : ''}
            
            <p class="status-text">${isBlocking ? '✗' : '✓'} ${statusMessage}${isHighRisk ? '' : ''}</p>
            
            ${additionalInfo}
            
            <div style="margin: 35px auto; max-width: 550px;">
                <p class="info-label">View customer information and risk calculation details:</p>
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

// Keep the fetchRiskLevel function as is
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
        Utils.log('Risk level data fetched', data);
        return data;
    } catch (error) {
        Utils.logError('Error fetching risk level', error);
        return null;
    }
}
}

    // Data persistence functions
    const Storage = {
        saveFormData: function(data) {
            if (customerData && customerData.customerId) {
                localStorage.setItem(`onboarding_complete_${customerData.customerId}`, JSON.stringify(data));
            }
        },

        saveDraft: function(data) {
            if (customerData && customerData.customerId) {
                localStorage.setItem(`onboarding_draft_${customerData.customerId}`, JSON.stringify(data));
            }
        },

        loadDraft: function() {
            if (customerData && customerData.customerId) {
                const draftData = localStorage.getItem(`onboarding_draft_${customerData.customerId}`);
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
                localStorage.removeItem(`onboarding_draft_${customerData.customerId}`);
            }
        }
    };

    // API functions
    const API = {
        submitOnboarding: async function(payload) {
            const url = CONFIG.API_BASE_URL + CONFIG.ONBOARDING_ENDPOINT;
            const headers = Auth.getHeaders();

            Utils.log('Sending request to', url);
            Utils.log('Request headers (sanitized)', {
                ...headers,
                'x-auth-token': headers['x-auth-token'] ? `${headers['x-auth-token'].substring(0, 10)}...` : 'Missing'
            });
            Utils.log('Request payload', payload);

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
            Utils.log('Success! Server response', result);
            return result;
        }
    };

    // Main functions
    const Core = {
        loadCustomerData: function() {
            const customerId = Utils.getUrlParameter('customerId');
            
            if (customerId) {
                const screeningData = localStorage.getItem(`screeningData_${customerId}`);
                if (screeningData) {
                    try {
                        customerData = JSON.parse(screeningData);
                        Utils.log('Loaded screening data', customerData);
                    } catch (error) {
                        Utils.logError('Error parsing screening data', error);
                    }
                }
            }
            
            if (!customerData) {
                customerData = {
                    customerId: customerId || Utils.generateCustomerId(),
                    source: 'Manual Entry',
                    tenant: tenantName
                };
            }

            Utils.log('Loaded customer data', customerData);
        },

        updateCustomerInfo: function() {
            const customerIdElement = document.getElementById('customerId');
            if (customerIdElement) {
                customerIdElement.textContent = customerData.customerId;
            }
        },

    prePopulateForm: function() {
    console.log('prePopulateForm called with customerData:', customerData); 
    console.log('customerData.isScreeningDataLocked:', customerData?.isScreeningDataLocked); 
    
    // First, try to populate from stored screening data (security-first approach)
    if (customerData && customerData.isScreeningDataLocked) {
        console.log('Entering security lock branch'); 
        Utils.log('Pre-populating form with locked screening data');
        
        // banque_en: pre-fill these fields from screening data, but keep them
        // editable (readonly: false) so the analyst can still adjust before
        // submission. Only the strictly identity-bound fields (name, DOB)
        // remain locked.
        const secureFieldMappings = [
        { screeningField: 'firstName', onboardingFields: ['prenom', 'firstName'], readonly: true, label: 'Prénom/First Name' },
        { screeningField: 'lastName', onboardingFields: ['nom', 'lastName'], readonly: true, label: 'Nom/Last Name' },
        { screeningField: 'birthDate', onboardingFields: ['dateNaissance', 'dateOfBirth'], readonly: true, label: 'Date de naissance/Birth Date' },
        { screeningField: 'Nationalite', onboardingFields: ['Nationalite', 'nationality'], readonly: false, label: 'Nationalité/Nationality', fieldType: 'select' },
        { screeningField: 'PaysDeResidence', onboardingFields: ['PaysDeResidence', 'countryOfResidence','citizenship'], readonly: false, label: 'Pays de Résidence/Country of Residence', fieldType: 'select' }
    ];
        let fieldsLocked = 0;

        secureFieldMappings.forEach(mapping => {
            const screeningValue = customerData[mapping.screeningField];
            console.log(`Checking mapping for ${mapping.screeningField}: ${screeningValue}`);
            
            if (screeningValue) {
                mapping.onboardingFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    console.log(`Looking for field: ${fieldId}, found:`, field);
                    
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
                            console.log(`Locked field ${fieldId}, total locked: ${fieldsLocked}`);
                        }
                        Utils.log(`Locked field ${fieldId} with screening value: ${screeningValue}`);
                    } else {
                        console.warn(`Field ${fieldId} not found in DOM`);
                    }
                });
            } else {
                console.log(`No value found for ${mapping.screeningField}`);
            }
        });

        console.log(`Total fields locked: ${fieldsLocked}`);

    } else {
        console.log('Security lock branch not entered - falling back to legacy method');
        
        // Fallback: if we have some customer data but not marked as secure screening data
        if (customerData && (customerData.firstName || customerData.lastName)) {
            Utils.log('Pre-populating form with available customer data (not locked)');
            
            const basicMappings = [
                { screeningField: 'firstName', onboardingFields: ['prenom', 'firstName'] },
                { screeningField: 'lastName', onboardingFields: ['nom', 'lastName'] },
                { screeningField: 'birthDate', onboardingFields: ['dateNaissance', 'dateOfBirth'] },
                { screeningField: 'nationality', onboardingFields: ['nationalite', 'nationality'] }
            ];

            basicMappings.forEach(mapping => {
                const screeningValue = customerData[mapping.screeningField];
                if (screeningValue) {
                    mapping.onboardingFields.forEach(fieldId => {
                        const field = document.getElementById(fieldId);
                        if (field && !field.value) {
                            field.value = screeningValue;
                            Utils.log(`Pre-populated ${fieldId} with: ${screeningValue}`);
                        }
                    });
                }
            });
        } else {
            // Legacy fallback: parse from customer ID if available
            Utils.log('Using legacy customer ID parsing for pre-population');
            
            if (customerData && customerData.customerId) {
                const parts = customerData.customerId.toString().split('_');
                if (parts.length >= 2) {
                    const firstNameField = document.getElementById('prenom') || document.getElementById('firstName');
                    const lastNameField = document.getElementById('nom') || document.getElementById('lastName');
                    if (firstNameField && !firstNameField.value) firstNameField.value = parts[0] || '';
                    if (lastNameField && !lastNameField.value) lastNameField.value = parts[1] || '';
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
        Utils.log('Loaded draft data for unlocked fields');
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
                Utils.log('Form data collected', formData);

                const authToken = Auth.getToken();
                const tenant = Auth.getTenant();
                
                if (!authToken) {
                    throw new Error('Authentication token missing. Please log in again.');
                }
                
                if (!tenant) {
                    throw new Error('Tenant name missing. Please check your configuration.');
                }

                const payload = DataMapper.mapFormDataToPayload(formData);
                Utils.log('Complete payload', payload);

                // Store the completed form data locally as backup
                Storage.saveFormData(payload);

                // Send to API
                const result = await API.submitOnboarding(payload);

                // Show success message
                UI.showSuccessMessage(result);

                // Clear draft data on successful submission
                Storage.clearDraft();

            } catch (error) {
                Utils.logError('Submission failed', error);
                
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
            
            formId = formElementId;
            tenantName = tenant || CONFIG.DEFAULT_TENANT;
            currentForm = document.getElementById(formId);
            
            if (!currentForm) {
                Utils.logError('Form not found', formId);
                return;
            }

            // Initialize the handler
            Core.loadCustomerData();
            Core.updateCustomerInfo();
            Core.prePopulateForm();
            Core.setupAutoSave();

            // Attach form submission handler
            currentForm.addEventListener('submit', Core.handleFormSubmission);

            Utils.log('OnboardingHandler initialized successfully');
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