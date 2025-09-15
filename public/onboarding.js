// Global variables
let currentTab = 0;
let customerData = null;

// Initialize the form on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
});

function initializeForm() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customerId');
    
    // Load customer data from storage or set defaults
    loadCustomerData(customerId);
    
    // Update customer info
    updateCustomerInfo();
    
    // Pre-populate form fields
    prePopulateFields();
}

function loadCustomerData(customerId) {
    if (customerId) {
        // Try to load from screening data
        const screeningData = localStorage.getItem(`screeningData_${customerId}`);
        if (screeningData) {
            customerData = JSON.parse(screeningData);
        }
    }
    
    // Set default customer data if none found
    if (!customerData) {
        customerData = {
            customerId: customerId || 'UNKNOWN',
            source: 'Manual Entry'
        };
    }
}

function updateCustomerInfo() {
    document.getElementById('customerBadge').textContent = `Client: ${customerData.customerId}`;
}

function prePopulateFields() {
    if (customerData && customerData.customerId) {
        // Try to extract name from customer ID if it follows pattern "FirstName_LastName"
        const parts = customerData.customerId.split('_');
        if (parts.length >= 2) {
            document.getElementById('prenom').value = parts[0] || '';
            document.getElementById('nom').value = parts[1] || '';
        }
        
        // Set today's date for date fields that need default values
        const today = new Date().toISOString().split('T')[0];
        // You can set default dates if needed
    }
}

function showTab(tabIndex) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    // Update tabs
    tabs.forEach((tab, index) => {
        tab.classList.toggle('active', index === tabIndex);
    });

    // Update content
    contents.forEach((content, index) => {
        content.classList.toggle('active', index === tabIndex);
    });

    currentTab = tabIndex;
    updateNavigation();
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Show/hide previous button
    if (currentTab === 0) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }
    
    // Show/hide next/submit buttons
    if (currentTab === 1) { // Last tab
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

function previousTab() {
    if (currentTab > 0) {
        showTab(currentTab - 1);
    }
}

function nextTab() {
    if (validateCurrentTab()) {
        if (currentTab < 1) { // We have 2 tabs (0 and 1)
            showTab(currentTab + 1);
        }
    }
}

function validateCurrentTab() {
    const currentContent = document.getElementById(`tab-${currentTab}`);
    const requiredFields = currentContent.querySelectorAll('input[required], select[required], textarea[required]');
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
        alert('Veuillez remplir tous les champs obligatoires marqués d\'un *');
        if (firstInvalid) {
            firstInvalid.focus();
        }
    }

    return isValid;
}

async function submitForm() {
    if (!validateCurrentTab()) {
        return;
    }

    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Envoi en cours...';
    submitBtn.disabled = true;

    try {
        // Collect all form data
        const formData = {};
        const allInputs = document.querySelectorAll('input, select, textarea');
        
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
                formData[input.name] = input.value;
            }
        });

        // Build the payload structure matching the API format
        const payload = {
            customerId: parseInt(customerData.customerId) || Math.floor(Math.random() * 10000), // Generate ID if not provided
            items: {
                // Core identity fields
                first_name: formData.prenom || "",
                last_name: formData.nom || "",
                birth_date: formData.dateNaissance || "",
                nationality: formData.nationalite || "",
                citizenship: formData.nationalite || "",
                pays: getPaysName(formData.nationalite) || "",
                marital_status: formData.etatCivil || "",
                
                // Contact information
                tel1: formData.telephone || "",
                tel2: formData.portable || "",
                email: formData.email || "",
                
                // Address information
                adresseDeResidence: formData.adresse || "",
                postal_code: formData.codePostal || "",
                fiscale_ville: formData.ville || "",
                PaysDeResidence: formData.paysResidence || "",
                
                // Identity document
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
                nid: formData.numeroPiece || "",
                delivery_date: formData.dateDelivrance || "",
                expiry_date: formData.dateExpiration || "",
                
                // Financial information
                profession: getProfessionMapped(formData.profession) || "",
                produit: [mapProductToArray(formData.produits)],
                canal_de_distribution: mapCanalDistribution(formData.canal) || "",
                origine_des_fonds: [mapOrigineFonds(formData.origineFonds)],
                revenuAnnuelNet: parseInt(formData.revenu) || 0,
                
                // System fields
                agence: "headquarters",
                rm_username: "admin",
                rm_fn: "System",
                rm_ln: "User",
                process_type: "",
                createdOn: new Date().toISOString(),
                last_update: new Date().toISOString(),
                entityType: "PP",
                customer_type: "manual-entry",
                createdBy: "admin",
                creatorId: 1,
                creatorFirstName: "System",
                creatorLastName: "User",
                modificationDate: new Date().toISOString(),
                agencyId: 1,
                agencyName: "headquarters",
                form_entity_type: "PP",
                cus_birth_date: formData.dateNaissance || "",
                url: "https://greataml.com/",
                customerUrl: "https://greataml.com/",
                current_date: new Date().toISOString(),
                current_user_name: "System User",
                current_user_id: 1,
                
                // Risk flags (defaults)
                isPEP: false,
                isSanctionned: false,
                isSanctioned: false,
                hasRiskedCountry: false,
                isSanctionnedWorkflow: "Non",
                isPepWorkflow: "<li>Personne politiquement exposée : <b> <span> Non</span></b></li>",
                
                // Empty arrays for optional fields
                dataGrid: [],
                id_doc: [],
                address_proof_type: {},
                address_doc: [],
                tiin_doc: [],
                dataGrid1: [],
                AddressDataGrid: [],
                address: [],
                listsNames: [],
                extendedProperties: {},
                eaiIds: {},
                outboundSystems: null,
                
                // Additional fields
                invokeElm: false,
                containerelm: {},
                is_hq_user: false,
                agency_location: null,
                distribution_channel: null,
                searchId: Math.floor(Math.random() * 100000),
                obnl_name: formData.nom || ""
            },
            formId: "1",
            customerRelationName: ""
        };

        // Store the completed form data locally as backup
        localStorage.setItem(`onboarding_complete_${customerData.customerId}`, JSON.stringify(payload));

        // Send POST request to the real API endpoint
        const response = await fetch('https://greataml.com/kyc-web-restful/onboarding/onboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server error: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        
        // Log payload and response for debugging
        console.log('Payload sent:', payload);
        console.log('Server response:', result);

        // Show success message with server response
        showSuccessMessage(result);

        // Clear draft data on successful submission
        localStorage.removeItem(`onboarding_draft_${customerData.customerId}`);

    } catch (error) {
        console.error('Error submitting form:', error);
        
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Show error message
        showErrorMessage(error.message);
    }
}

// Helper functions to map form values to API expected values
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

function showSuccessMessage(onboardingResult = null) {
    let statusMessage = '';
    let statusColor = '#28a745';
    let additionalInfo = '';

    if (onboardingResult) {
        // Check if there are any instructions or errors
        if (onboardingResult.errorMessage) {
            statusMessage = 'Dossier soumis avec des remarques';
            statusColor = '#ffc107';
            additionalInfo = `
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                    <h4 style="color: #856404; margin-bottom: 10px;">Remarque:</h4>
                    <p style="color: #856404; margin: 0;">${onboardingResult.errorMessage}</p>
                </div>
            `;
        } else if (onboardingResult.instruction) {
            if (onboardingResult.instruction.blocking) {
                statusMessage = 'Dossier rejeté';
                statusColor = '#dc3545';
                additionalInfo = `
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                        <h4 style="color: #721c24; margin-bottom: 10px;">Instruction bloquante:</h4>
                        <p style="color: #721c24; margin: 0;"><strong>${onboardingResult.instruction.label}</strong></p>
                        <p style="color: #721c24; margin: 5px 0 0 0;">${onboardingResult.instruction.description}</p>
                    </div>
                `;
            } else {
                statusMessage = 'Dossier soumis - Action requise';
                statusColor = '#ffc107';
                additionalInfo = `
                    <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                        <h4 style="color: #0c5460; margin-bottom: 10px;">Instruction informative:</h4>
                        <p style="color: #0c5460; margin: 0;"><strong>${onboardingResult.instruction.label}</strong></p>
                        <p style="color: #0c5460; margin: 5px 0 0 0;">${onboardingResult.instruction.description}</p>
                    </div>
                `;
            }
        } else {
            statusMessage = 'Dossier approuvé avec succès';
            additionalInfo = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
                    <h4 style="color: #155724; margin-bottom: 10px;">✓ Validation réussie</h4>
                    <p style="color: #155724; margin: 0;">Le client a été approuvé et peut être intégré au système.</p>
                </div>
            `;
        }
    } else {
        statusMessage = 'Dossier soumis avec succès';
    }

    const container = document.querySelector('.container');
    container.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <div style="font-size: 4em; color: ${statusColor}; margin-bottom: 20px;">
                ${onboardingResult && onboardingResult.instruction && onboardingResult.instruction.blocking ? '⚠' : '✓'}
            </div>
            <h2 style="color: ${statusColor}; margin-bottom: 20px;">${statusMessage}</h2>
            <p style="font-size: 1.2em; color: #6c757d; margin-bottom: 30px;">
                Le dossier KYC pour le client <strong>${customerData.customerId}</strong> a été traité par le système Reis.
            </p>
            
            ${additionalInfo}
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
                <h4 style="margin-bottom: 15px;">Informations du dossier:</h4>
                <p><strong>Client:</strong> ${customerData.customerId}</p>
                <p><strong>Type:</strong> Personne Physique</p>
                <p><strong>Tenant:</strong> BANKFR</p>
                <p><strong>Date de soumission:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                ${onboardingResult && onboardingResult.riskCalculationId ? 
                    `<p><strong>ID Calcul de Risque:</strong> ${onboardingResult.riskCalculationId}</p>` : ''}
            </div>
            
            <button class="btn btn-primary" onclick="window.location.href='index.html'" style="margin-top: 20px; padding: 15px 30px; background: linear-gradient(45deg, #007bff, #0056b3); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Retour à l'accueil
            </button>
        </div>
    `;
}

function showErrorMessage(errorMessage) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <div style="font-size: 4em; color: #dc3545; margin-bottom: 20px;">
                ❌
            </div>
            <h2 style="color: #dc3545; margin-bottom: 20px;">Erreur lors de la soumission</h2>
            <p style="font-size: 1.2em; color: #6c757d; margin-bottom: 30px;">
                Une erreur s'est produite lors de l'envoi du dossier KYC pour le client <strong>${customerData.customerId}</strong>.
            </p>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px;">
                <h4 style="color: #721c24; margin-bottom: 10px;">Détail de l'erreur:</h4>
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

// Auto-save functionality
setInterval(() => {
    const formData = {};
    const allInputs = document.querySelectorAll('input, select, textarea');
    
    allInputs.forEach(input => {
        if (input.type !== 'file') {
            formData[input.name] = input.value;
        }
    });

    if (customerData && customerData.customerId) {
        localStorage.setItem(`onboarding_draft_${customerData.customerId}`, JSON.stringify(formData));
    }
}, 30000); // Auto-save every 30 seconds

// Load draft data on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (customerData && customerData.customerId) {
            const draftData = localStorage.getItem(`onboarding_draft_${customerData.customerId}`);
            if (draftData) {
                const data = JSON.parse(draftData);
                Object.keys(data).forEach(key => {
                    const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                    if (field && data[key]) {
                        field.value = data[key];
                    }
                });
            }
        }
    }, 100);
});