/**
 * Onboarding Handler - Reusable JavaScript module for handling KYC onboarding forms
 * This module can be used across multiple HTML forms by simply including it and calling init()
 * Supports both BankFR and Banque EN tenants with different payload structures
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
        ONBOARDING_ENDPOINT: '/onboarding/onboard',
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
            const customerId = parseInt(customerData.customerId) || Utils.generateCustomerId();
            const currentDateTime = new Date().toISOString();

            // Check tenant and create appropriate payload
            const isBanqueEN = tenantName === 'banque_en';
            
            if (isBanqueEN) {
                // Banque EN payload structure (based on successful example)
                return {
                    customerId: customerId,
                    customerRelationName: "",
                    formId: "1",
                    items: {
                        isSanctionnedWorkflow: "No",
                        isPepWorkflow: "<li>PEP : <b> <span id=\"m_-6565793956881070177m_5147999647471681674is_pep\"> No </span></b></li>",
                        agence: "headquarters",
                        rm_username: "admin",
                        rm_fn: "System",
                        rm_ln: "User",
                        process_type: "",
                        createdOn: currentDateTime,
                        dpr: "",
                        last_update: currentDateTime,
                        first_name: formData.firstName || "",
                        last_name: formData.lastName || "",
                        birth_date: formData.dateOfBirth || "",
                        nationality: formData.nationality || "",
                        marital_status: formData.civilStatus || "",
                        tel1: "", // Keep empty like successful example
                        email: formData.email || "",
                        adresseDeResidence: formData.residentialAddress || "",
                        postal_code: formData.postalCode || "",
                        fiscale_ville: formData.city || "",
                        Country_of_residence: formData.countryOfResidence || "",
                        tin_: {
                            id: this.getDocumentTypeIdEN(formData.idType),
                            name: this.getDocumentTypeNameEN(formData.idType),
                            value: formData.idType || "",
                            translate: this.getDocumentTypeNameEN(formData.idType),
                            parentId: null,
                            parentName: null,
                            uniqueCode: `${this.getDocumentTypeNameEN(formData.idType)}:${formData.idType}:tin`,
                            tags: ["tin"]
                        },
                        nid: formData.idNumber || "",
                        delivery_date: formData.dateOfIssue || "",
                        expiry_date: formData.expiryDate || "",
                        profession: formData.profession || "",
                        product: [formData.productsServices || ""],
                        onboarding_channel: formData.onboardingChannel || "",
                        source_of_funds: [formData.sourceOfFunds || ""],
                        dataGrid: [{"select": "", "nature": "", "tx_nature": {}}],
                        mscq: "",
                        pep: "",
                        pliberal: "",
                        id_doc: [],
                        address_proof_type: {},
                        address_doc: [],
                        tiin_doc: [],
                        dataGrid1: [{"source_of_funds_doctype": {}, "source_of_funds_doc": []}],
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
                        customer_type: "manual-entry", // Changed from search-result to manual-entry
                        createdBy: "admin",
                        creatorId: 2,
                        creatorFirstName: "System",
                        creatorLastName: "User",
                        modificationDate: currentDateTime,
                        extendedProperties: {},
                        citizenship: formData.nationality || "",
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
                        cus_birth_date: formData.dateOfBirth || "",
                        url: "https://greataml.com/",
                        is_hq_user: false,
                        current_user_name: "System User",
                        current_user_id: 2,
                        agency_location: null,
                        distribution_channel: null,
                        obnl_name: formData.lastName || "",
                        customerUrl: "https://greataml.com/",
                        revenuAnnuelNet: parseInt(formData.netAnnualIncome) || 0,
                        address: []
                    },
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
            } else {
                // BankFR payload structure (keep the exact working structure)
                return {
                    customerId: customerId,
                    customerRelationName: "",
                    formId: "1",
                    items: {
                        isSanctionnedWorkflow: "Non",
                        AddressDataGrid: [],
                        PaysDeResidence: formData.paysResidence || "",
                        address: [],
                        address_doc: [],
                        address_proof_type: {},
                        adresseDeResidence: formData.adresse || "",
                        agence: "headquarters",
                        agencyId: 3,
                        agencyName: "headquarters",
                        agency_location: null,
                        birth_date: formData.dateNaissance || "",
                        businessName: "",
                        canal_de_distribution: formData.canal || "",
                        citizenship: formData.nationalite || "",
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
                        cus_birth_date: formData.dateNaissance || "",
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
                        delivery_date: formData.dateDelivrance || "",
                        distribution_channel: null,
                        dpr: "",
                        eaiIds: {},
                        email: formData.email || "",
                        entityType: "PP",
                        expiry_date: formData.dateExpiration || "",
                        extendedProperties: {},
                        first_name: formData.prenom || "",
                        fiscale_ville: formData.ville || "",
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
                        last_name: formData.nom || "",
                        last_update: currentDateTime,
                        listsNames: [],
                        luneDeVosRelationsPresenteTElleLunDesIndicesDamericaniteDefinisParLaLoiFatca: "",
                        marital_status: formData.etatCivil || "",
                        modificationDate: currentDateTime,
                        mscq: "",
                        nationality: formData.nationalite || "",
                        nid: formData.numeroPiece || "",
                        obnl_name: formData.nom || "",
                        origine_des_fonds: [formData.origineFonds || ""],
                        outboundSystems: null,
                        pays: formData.nationalite || "",
                        pep: "",
                        pliberal: "",
                        postal_code: formData.codePostal || "",
                        process_type: "",
                        produit: [formData.produits || ""],
                        profession: formData.profession || "",
                        revenuAnnuelNet: parseInt(formData.revenu) || 0,
                        rm_fn: "System",
                        rm_ln: "User",
                        rm_username: "admin",
                        searchId: Math.floor(Math.random() * 100000),
                        tel1: formData.telephone || "",
                        tel2: formData.portable || "",
                        tiin_doc: [],
                        tin_: {
                            id: this.getDocumentTypeId(formData.typePiece),
                            name: this.getDocumentTypeName(formData.typePiece),
                            value: formData.typePiece || "",
                            translate: this.getDocumentTypeName(formData.typePiece),
                            parentId: null,
                            parentName: null,
                            uniqueCode: `${this.getDocumentTypeName(formData.typePiece)}:${formData.typePiece}:tin`,
                            tags: ["tin"]
                        },
                        url: "https://greataml.com/"
                    }
                };
            }
        }
    };

    // Form validation functions
    const Validator = {
        validateForm: function() {
            const requiredFields = currentForm.querySelectorAll('input[required], select[required], textarea[required]');
            let isValid = true;
            let firstInvalid = null;

            requiredFields.forEach(field => {
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
                        value = value.replace(/[*+?^${}()|[\]\\]/g, '');
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

        showSuccessMessage: function(onboardingResult = null) {
            let statusMessage = '';
            let statusColor = '#28a745';
            let additionalInfo = '';

            if (onboardingResult) {
                if (onboardingResult.errorMessage) {
                    statusMessage = 'Application submitted with remarks';
                    statusColor = '#ffc107';
                    additionalInfo = `
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                            <h4 style="color: #856404; margin-bottom: 10px;">Remark:</h4>
                            <p style="color: #856404; margin: 0;">${onboardingResult.errorMessage}</p>
                        </div>
                    `;
                } else if (onboardingResult.instruction) {
                    if (onboardingResult.instruction.blocking) {
                        statusMessage = 'Application rejected';
                        statusColor = '#dc3545';
                        additionalInfo = `
                            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                                <h4 style="color: #721c24; margin-bottom: 10px;">Blocking instruction:</h4>
                                <p style="color: #721c24; margin: 0;"><strong>${onboardingResult.instruction.label}</strong></p>
                                <p style="color: #721c24; margin: 5px 0 0 0;">${onboardingResult.instruction.description}</p>
                            </div>
                        `;
                    } else {
                        statusMessage = 'Application submitted - Action required';
                        statusColor = '#ffc107';
                        additionalInfo = `
                            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                                <h4 style="color: #0c5460; margin-bottom: 10px;">Information instruction:</h4>
                                <p style="color: #0c5460; margin: 0;"><strong>${onboardingResult.instruction.label}</strong></p>
                                <p style="color: #0c5460; margin: 5px 0 0 0;">${onboardingResult.instruction.description}</p>
                            </div>
                        `;
                    }
                } else {
                    statusMessage = 'Application approved successfully';
                    additionalInfo = `
                        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                            <h4 style="color: #155724; margin-bottom: 10px;">✓ Validation successful</h4>
                            <p style="color: #155724; margin: 0;">The customer has been approved and can be integrated into the system.</p>
                        </div>
                    `;
                }
            } else {
                statusMessage = 'Application submitted successfully';
            }

            const container = document.querySelector('.container');
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <div style="font-size: 4em; color: ${statusColor}; margin-bottom: 20px;">
                        ${onboardingResult && onboardingResult.instruction && onboardingResult.instruction.blocking ? '⚠' : '✓'}
                    </div>
                    <h2 style="color: ${statusColor}; margin-bottom: 20px;">${statusMessage}</h2>
                    <p style="font-size: 1.2em; color: #6c757d; margin-bottom: 30px;">
                        KYC application for customer <strong>${customerData.customerId}</strong> has been processed by the Reis system.
                    </p>
                    
                    ${additionalInfo}
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
                        <h4 style="margin-bottom: 15px;">Application Information:</h4>
                        <p><strong>Customer:</strong> ${customerData.customerId}</p>
                        <p><strong>Type:</strong> Individual</p>
                        <p><strong>Tenant:</strong> ${tenantName.toUpperCase()}</p>
                        <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString('en-US')}</p>
                        ${onboardingResult && onboardingResult.riskCalculationId ? 
                            `<p><strong>Risk Calculation ID:</strong> ${onboardingResult.riskCalculationId}</p>` : ''}
                    </div>
                    
                    <button class="btn btn-primary" onclick="window.location.href='index.html'" style="margin-top: 20px; padding: 15px 30px; background: linear-gradient(45deg, #007bff, #0056b3); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Back to Home
                    </button>
                </div>
            `;
        },

        showErrorMessage: function(errorMessage) {
            const container = document.querySelector('.container');
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <div style="font-size: 4em; color: #dc3545; margin-bottom: 20px;">❌</div>
                    <h2 style="color: #dc3545; margin-bottom: 20px;">Submission Error</h2>
                    <p style="font-size: 1.2em; color: #6c757d; margin-bottom: 30px;">
                        An error occurred while sending the KYC application for customer <strong>${customerData.customerId}</strong>.
                    </p>
                    
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px;">
                        <h4 style="color: #721c24; margin-bottom: 10px;">Error Details:</h4>
                        <p style="color: #721c24; margin: 0; word-break: break-word;">${errorMessage}</p>
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <button class="btn btn-primary" onclick="location.reload()" style="margin-right: 10px; padding: 15px 30px; background: linear-gradient(45deg, #007bff, #0056b3); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Try Again
                        </button>
                        <button class="btn btn-secondary" onclick="window.location.href='index.html'" style="padding: 15px 30px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Back to Home
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
            // Auto-populate from customer data
            if (customerData && customerData.customerId) {
                const parts = customerData.customerId.toString().split('_');
                if (parts.length >= 2) {
                    // Try both naming conventions
                    const firstNameField = document.getElementById('prenom') || document.getElementById('firstName');
                    const lastNameField = document.getElementById('nom') || document.getElementById('lastName');
                    if (firstNameField) firstNameField.value = parts[0] || '';
                    if (lastNameField) lastNameField.value = parts[1] || '';
                }
            }

            // Load draft data
            const draftData = Storage.loadDraft();
            if (draftData) {
                Object.keys(draftData).forEach(key => {
                    const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                    if (field && draftData[key]) {
                        field.value = draftData[key];
                    }
                });
                Utils.log('Loaded draft data', draftData);
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