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

function submitForm() {
    if (!validateCurrentTab()) {
        return;
    }

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

    // Add metadata
    formData.customerId = customerData.customerId;
    formData.tenant = 'bankfr';
    formData.entityType = 'PP';
    formData.submissionDate = new Date().toISOString();

    // Store the completed form data
    localStorage.setItem(`onboarding_complete_${customerData.customerId}`, JSON.stringify(formData));

    // Show success message
    showSuccessMessage();
    
    // Log form data for debugging
    console.log('Form submitted with data:', formData);
}

function showSuccessMessage() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <div style="font-size: 4em; color: #28a745; margin-bottom: 20px;">✓</div>
            <h2 style="color: #28a745; margin-bottom: 20px;">Dossier client soumis avec succès</h2>
            <p style="font-size: 1.2em; color: #6c757d; margin-bottom: 30px;">
                Le dossier KYC pour le client <strong>${customerData.customerId}</strong> a été soumis et est en cours de traitement.
            </p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 400px;">
                <h4 style="margin-bottom: 15px;">Informations du dossier:</h4>
                <p><strong>Client:</strong> ${customerData.customerId}</p>
                <p><strong>Type:</strong> Personne Physique</p>
                <p><strong>Tenant:</strong> BANKFR</p>
                <p><strong>Date de soumission:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <button class="btn btn-primary" onclick="window.location.href='index.html'" style="margin-top: 20px; padding: 15px 30px; background: linear-gradient(45deg, #007bff, #0056b3); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Retour à l'accueil
            </button>
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