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
            return 'PM-' + Math.floor(Math.random() * 10000);
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
            const customerId = parseInt(customerData.customerId.replace('PM-', '')) || Utils.generateCustomerId();
            const currentDateTime = new Date().toISOString();

            // Using the exact structure from your real PM payload example
            return {
                customerId: customerId,
                customerRelationName: formData.raisonSociale || "",
                formId: "2", // PM uses formId "2"
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

        showSuccessMessage: function(onboardingResult = null) {
            let statusMessage = '';
            let statusColor = '#28a745';
            let additionalInfo = '';

            if (onboardingResult) {
                if (onboardingResult.errorMessage) {
                    statusMessage = 'Demande soumise avec remarques';
                    statusColor = '#ffc107';
                    additionalInfo = `
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                            <h4 style="color: #856404; margin-bottom: 10px;">Remarque:</h4>
                            <p style="color: #856404; margin: 0;">${onboardingResult.errorMessage}</p>
                        </div>
                    `;
                } else if (onboardingResult.instruction) {
                    if (onboardingResult.instruction.blocking) {
                        statusMessage = 'Demande rejetée';
                        statusColor = '#dc3545';
                        additionalInfo = `
                            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                                <h4 style="color: #721c24; margin-bottom: 10px;">Instruction bloquante:</h4>
                                <p style="color: #721c24; margin: 0;"><strong>${onboardingResult.instruction.label}</strong></p>
                                <p style="color: #721c24; margin: 5px 0 0 0;">${onboardingResult.instruction.description}</p>
                            </div>
                        `;
                    } else {
                        statusMessage = 'Demande soumise - Action requise';
                        statusColor = '#ffc107';
                        additionalInfo = `
                            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                                <h4 style="color: #0c5460; margin-bottom: 10px;">Instruction d'information:</h4>
                                <p style="color: #0c5460; margin: 0;"><strong>${onboardingResult.instruction.label}</strong></p>
                                <p style="color: #0c5460; margin: 5px 0 0 0;">${onboardingResult.instruction.description}</p>
                            </div>
                        `;
                    }
                } else {
                    statusMessage = 'Onboarding PM terminé avec succès';
                    additionalInfo = `
                        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                            <h4 style="color: #155724; margin-bottom: 10px;">✓ Validation réussie</h4>
                            <p style="color: #155724; margin: 0;">L'entité a été approuvée et peut être intégrée dans le système.</p>
                        </div>
                    `;
                }
            } else {
                statusMessage = 'Onboarding PM terminé avec succès';
            }

            const container = document.querySelector('.container');
            const customerCardUrl = `https://greataml.com/profiles/customer-card/${customerData.customerId}`;
            
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <div style="font-size: 4em; color: ${statusColor}; margin-bottom: 20px;">
                        ${onboardingResult && onboardingResult.instruction && onboardingResult.instruction.blocking ? '⚠' : '✓'}
                    </div>
                    <h2 style="color: ${statusColor}; margin-bottom: 20px;">${statusMessage}</h2>
                    <p style="font-size: 1.2em; color: #6c757d; margin-bottom: 30px;">
                        Demande KYC pour l'entité <strong>${customerData.customerId}</strong> traitée par le système Reis.
                    </p>
                    
                    ${additionalInfo}
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
                        <h4 style="margin-bottom: 15px;">Informations de la demande:</h4>
                        <p><strong>Entité:</strong> ${customerData.customerId}</p>
                        <p><strong>Type:</strong> Personne Morale</p>
                        <p><strong>Tenant:</strong> ${tenantName.toUpperCase()}</p>
                        <p><strong>Date de soumission:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                        ${onboardingResult && onboardingResult.riskCalculationId ? 
                            `<p><strong>ID de calcul de risque:</strong> ${onboardingResult.riskCalculationId}</p>` : ''}
                    </div>
                    
                    <div style="margin: 30px auto; max-width: 500px;">
                        <p style="font-size: 1.1em; color: #495057; margin-bottom: 15px;">
                            Vous pouvez consulter les informations de l'entité et ses détails de calcul de risque via:
                        </p>
                        <a href="${customerCardUrl}" target="_blank" style="
                            display: inline-block;
                            background: linear-gradient(45deg, #007bff, #0056b3);
                            color: white;
                            padding: 12px 25px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 1rem;
                            transition: transform 0.2s ease;
                            box-shadow: 0 3px 8px rgba(0,123,255,0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            Voir la Fiche Client
                        </a>
                    </div>
                    
                    <button class="btn btn-primary" onclick="window.location.href='index.html'" style="margin-top: 20px; padding: 15px 30px; background: linear-gradient(45deg, #28a745, #20c997); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Retour à l'accueil
                    </button>
                </div>
            `;
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
            
            if (customerId) {
                const screeningData = localStorage.getItem(`screeningData_${customerId}`);
                if (screeningData) {
                    try {
                        customerData = JSON.parse(screeningData);
                        // Ensure customerId is preserved from URL
                        if (!customerData.customerId) {
                            customerData.customerId = customerId;
                        }
                        Utils.log('Loaded PM screening data', customerData);
                    } catch (error) {
                        Utils.logError('Error parsing PM screening data', error);
                        customerData = {
                            customerId: customerId,
                            source: 'Manual Entry',
                            tenant: tenantName,
                            entityType: 'PM'
                        };
                    }
                } else {
                    Utils.log('No screening data found, using customerId from URL', customerId);
                    customerData = {
                        customerId: customerId,
                        source: 'Manual Entry',
                        tenant: tenantName,
                        entityType: 'PM'
                    };
                }
            } else {
                customerData = {
                    customerId: Utils.generateCustomerId(),
                    source: 'Manual Entry',
                    tenant: tenantName,
                    entityType: 'PM'
                };
            }

            Utils.log('Final PM customer data', customerData);
            Utils.log('Final customerId', customerData.customerId);
        },

        updateCustomerInfo: function() {
            // Update multiple possible customer ID display locations
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

            // Update hidden input fields
            const hiddenIdInputs = document.querySelectorAll('input[name="customerId"], input[name="entityId"]');
            hiddenIdInputs.forEach(input => {
                input.value = customerData.customerId;
            });

            // Update page title
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