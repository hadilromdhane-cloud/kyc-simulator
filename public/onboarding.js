// Onboarding Page JavaScript Logic

// Global variables
let customerId = null;
let authToken = localStorage.getItem('authToken');
let tenantName = localStorage.getItem('tenantName');
let riskCalculationId = null;

// Countries array (same as in main app)
const countries = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina",
  "Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados",
  "Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana",
  "Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon",
  "Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo",
  "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica",
  "Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia",
  "Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
  "Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia",
  "Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali",
  "Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco",
  "Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
  "Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone",
  "Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania",
  "Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu",
  "Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  initializePage();
  populateCountries();
  setupEventHandlers();
});

/**
 * Initialize the page with customer data and authentication check
 */
function initializePage() {
  // Get customer ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  customerId = urlParams.get('customerId');
  
  if (customerId) {
    document.getElementById('displayCustomerId').textContent = customerId;
    document.getElementById('systemId').value = customerId;
  } else {
    document.getElementById('displayCustomerId').textContent = 'Not specified';
    document.getElementById('systemId').value = `CUST_${Date.now()}`;
  }

  // Check authentication
  if (!authToken || !tenantName) {
    showNotification('Authentication required. Redirecting to main page...', 'warning');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
  }

  console.log('Onboarding page initialized for customer:', customerId);
}

/**
 * Populate the citizenship dropdown with countries
 */
function populateCountries() {
  const citizenshipSelect = document.getElementById('citizenship');
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    citizenshipSelect.appendChild(option);
  });
  console.log('Countries populated in citizenship dropdown');
}

/**
 * Set up all event handlers for form interactions
 */
function setupEventHandlers() {
  // Form submission
  const form = document.getElementById('onboardingForm');
  form.addEventListener('submit', handleFormSubmit);
  
  // Back button
  const backBtn = document.getElementById('backBtn');
  backBtn.addEventListener('click', goBackToSimulator);
  
  // Reset button
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', resetForm);
  
  // Complete button
  const completeBtn = document.getElementById('completeBtn');
  completeBtn.addEventListener('click', completeOnboarding);
  
  console.log('Event handlers set up');
}

/**
 * Handle form submission and onboarding API call
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  
  // Show loading state
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="loading-spinner"></span>Processing...';
  
  try {
    // Collect and validate form data
    const formData = collectFormData();
    console.log('Submitting onboarding data:', formData);
    
    // Validate required fields
    if (!validateFormData(formData)) {
      throw new Error('Please fill in all required fields');
    }
    
    // Submit to onboarding API
    const response = await fetch('https://greataml.com/kyc-web-restful/onboarding/v1/onboardCustomer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-tenant': tenantName,
        'x-auth-token': authToken
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    console.log('Onboarding API response:', result);
    
    if (!response.ok) {
      throw new Error(result.errorMessage || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle successful response
    handleOnboardingResult(result);
    
  } catch (error) {
    console.error('Onboarding error:', error);
    showNotification(`Onboarding failed: ${error.message}`, 'error');
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitText.textContent = 'Process Onboarding';
  }
}

/**
 * Collect form data and build API payload
 */
function collectFormData() {
  const form = document.getElementById('onboardingForm');
  const formData = new FormData(form);
  
  // Build the items object with form data
  const items = {};
  formData.forEach((value, key) => {
    if (key !== 'systemName' && key !== 'systemId' && key !== 'formId' && key !== 'useEntityRiskValues') {
      // Handle boolean fields properly
      if (key === 'resident' || key === 'is_us_citizen') {
        items[key] = value === 'on' || value === 'true';
      } else {
        items[key] = value;
      }
    }
  });

  // Build the complete payload according to API specification
  const payload = {
    systemName: formData.get('systemName'),
    systemId: formData.get('systemId'),
    formId: parseInt(formData.get('formId')),
    useEntityRiskValues: formData.has('useEntityRiskValues'),
    items: items
  };

  return payload;
}

/**
 * Validate form data before submission
 */
function validateFormData(formData) {
  const required = ['systemName', 'systemId', 'formId'];
  const requiredItems = ['first_name', 'last_name', 'birth_date', 'citizenship', 'product', 'distribution_channel'];
  
  // Check main required fields
  for (const field of required) {
    if (!formData[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  // Check required items
  for (const field of requiredItems) {
    if (!formData.items[field]) {
      console.error(`Missing required item: ${field}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Handle the onboarding API response
 */
function handleOnboardingResult(result) {
  riskCalculationId = result.riskCalculationId;
  
  // Hide form and show results
  document.getElementById('onboardingForm').classList.add('hidden');
  document.getElementById('resultsSection').classList.remove('hidden');
  
  // Display results
  let resultsHTML = `
    <div class="risk-score">Risk Calculation ID: ${result.riskCalculationId}</div>
  `;
  
  // Handle instructions (blocking or non-blocking)
  if (result.instruction) {
    const instruction = result.instruction;
    const boxClass = instruction.blocking ? 'blocking' : '';
    const iconClass = instruction.blocking ? '🚫' : 'ℹ️';
    const titleText = instruction.blocking ? 'Blocking Instruction' : 'Information';
    
    resultsHTML += `
      <div class="instruction-box ${boxClass}">
        <h4>${iconClass} ${titleText}</h4>
        <p><strong>Label:</strong> ${instruction.label}</p>
        <p><strong>Description:</strong> ${instruction.description}</p>
        <p><strong>Rule:</strong> ${instruction.name}</p>
        <p><strong>Created:</strong> ${new Date(instruction.createdOn).toLocaleString()}</p>
      </div>
    `;
    
    // Disable completion button for blocking instructions
    if (instruction.blocking) {
      const completeBtn = document.getElementById('completeBtn');
      completeBtn.disabled = true;
      completeBtn.textContent = 'Onboarding Blocked';
      completeBtn.classList.remove('btn-success');
      completeBtn.classList.add('btn-secondary');
      
      showNotification('Customer onboarding blocked due to business rules', 'error');
    } else {
      showNotification('Non-blocking instruction received - review required', 'warning');
    }
  } else {
    resultsHTML += `
      <div class="notification success">
        ✅ No blocking instructions. Customer cleared for onboarding.
      </div>
    `;
    showNotification('Risk assessment completed - customer cleared', 'success');
  }
  
  // Handle error messages
  if (result.errorMessage) {
    resultsHTML += `
      <div class="notification error">
        ❌ Error: ${result.errorMessage}
      </div>
    `;
  }
  
  document.getElementById('riskResults').innerHTML = resultsHTML;
  
  // Scroll to results
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Show notification message to user
 */
function showNotification(message, type) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    if (notification.parentNode) {
      notification.remove();
    }
  });
  
  // Create new notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Insert at top of container
  const container = document.querySelector('.container');
  container.insertBefore(notification, container.firstChild);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  console.log(`Notification [${type}]: ${message}`);
}

/**
 * Navigate back to the main simulator
 */
function goBackToSimulator() {
  if (confirm('Are you sure you want to go back? Any unsaved changes will be lost.')) {
    console.log('Navigating back to main simulator');
    window.location.href = 'index.html';
  }
}

/**
 * Reset form for processing another customer
 */
function resetForm() {
  console.log('Resetting form for new customer');
  
  // Reset form and show it again
  document.getElementById('onboardingForm').reset();
  document.getElementById('onboardingForm').classList.remove('hidden');
  document.getElementById('resultsSection').classList.add('hidden');
  
  // Generate new system ID using the same format as screening
  const newSystemId = `system_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  document.getElementById('systemId').value = newSystemId;
  // Keep systemName consistent with screening (T24)
  document.getElementById('systemName').value = 'T24';
  
  // Reset complete button to default state
  const completeBtn = document.getElementById('completeBtn');
  completeBtn.disabled = false;
  completeBtn.textContent = 'Complete Onboarding';
  completeBtn.classList.remove('btn-secondary');
  completeBtn.classList.add('btn-success');
  
  // Reset global variables
  riskCalculationId = null;
  
  // Show success notification
  showNotification('Form reset. Ready for next customer.', 'info');
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  console.log('New SystemId for reset form:', newSystemId);
}

/**
 * Complete the onboarding process
 */
function completeOnboarding() {
  if (!riskCalculationId) {
    showNotification('No risk calculation to complete.', 'warning');
    return;
  }
  
  console.log('Completing onboarding for risk calculation ID:', riskCalculationId);
  
  // Update notification history if customer was from screening
  if (customerId) {
    updateCustomerOnboardingStatus(customerId);
  }
  
  showNotification('Onboarding completed successfully!', 'success');
  
  // Redirect to main page after delay
  setTimeout(() => {
    console.log('Redirecting to main simulator');
    window.location.href = 'index.html';
  }, 2000);
}

/**
 * Update customer onboarding status in notification history
 */
function updateCustomerOnboardingStatus(customerId) {
  try {
    const notificationHistory = JSON.parse(localStorage.getItem('notificationsHistory')) || [];
    const customerIndex = notificationHistory.findIndex(n => n.customerId === customerId);
    
    if (customerIndex !== -1) {
      notificationHistory[customerIndex].onboardingCompleted = true;
      notificationHistory[customerIndex].onboardingCompletedAt = new Date().toISOString();
      localStorage.setItem('notificationsHistory', JSON.stringify(notificationHistory));
      console.log('Updated customer onboarding status in history for customer:', customerId);
    } else {
      console.warn('Customer not found in notification history:', customerId);
    }
  } catch (error) {
    console.error('Error updating customer onboarding status:', error);
  }
}

/**
 * Store authentication info for future use
 */
function storeAuthInfo() {
  if (authToken && tenantName) {
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('tenantName', tenantName);
    console.log('Authentication info stored in localStorage');
  }
}

/**
 * Utility function to format date for display
 */
function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Utility function to log API calls for debugging
 */
function logApiCall(method, url, payload, response) {
  console.group('API Call');
  console.log('Method:', method);
  console.log('URL:', url);
  console.log('Payload:', payload);
  console.log('Response:', response);
  console.groupEnd();
}

/**
 * Handle unexpected errors gracefully
 */
window.addEventListener('error', function(event) {
  console.error('Unexpected error:', event.error);
  showNotification('An unexpected error occurred. Please try again.', 'error');
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  showNotification('A network or processing error occurred. Please try again.', 'error');
});

// Store auth info on page load
storeAuthInfo();