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

// Global token manager instance
const tokenManager = new TokenManager();

// Visible fields per process
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

const visibleTemplates = {
  PP: {
    decentralized: [
      { label: 'Name', key: 'firstName' },
      { label: 'Last Name', key: 'lastName' },
      { label: 'Birth Date', key: 'birthDate' },
      { label: 'Citizenship', key: 'citizenship' },
      { label: 'Nationality', key: 'nationality' }
    ],
    centralized: [
      { label: 'Name', key: 'firstName' },
      { label: 'Last Name', key: 'lastName' },
      { label: 'Birth Date', key: 'birthDate' },
      { label: 'Nationality', key: 'nationality' },
      { label: 'Citizenship', key: 'citizenship' },
      { label: 'Queue Name', key: 'queueName' }
    ]
  },
  PM: {
    decentralized: [{ label: 'Business Name', key: 'businessName' }],
    centralized: [
      { label: 'Business Name', key: 'businessName' },
      { label: 'Queue Name', key: 'queueName' }
    ]
  }
};

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
  
  const realEvent = {
    id: sessionEventCounter,
    timestamp: new Date().toISOString(),
    customerId: webhookData.customerId,
    source: 'Reis_KYC',
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
  
  // Store in session
  sessionEvents.unshift(realEvent);
  if (sessionEvents.length > 50) {
    sessionEvents = sessionEvents.slice(0, 50);
  }
  
  sessionStorage.setItem('kycEvents', JSON.stringify(sessionEvents));
  sessionStorage.setItem('kycEventCounter', sessionEventCounter.toString());
  
  // Show notifications
  showNotification(`Real webhook received for customer ${realEvent.customerId}`, 'warning');
  showScreeningResultsPopup(realEvent);
  
  // Update history
  notificationsHistory.unshift(realEvent);
  localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
  updateNotificationBadge();
  
  console.log('Real webhook event processed:', realEvent);
}

// --- Notification System ---
function createNotificationElements() {
  // Create notification container
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

  // Create notifications history button
  const notificationButton = document.createElement('button');
  notificationButton.id = 'notificationHistoryBtn';
  notificationButton.innerHTML = 'Notifications';
  notificationButton.style.cssText = `
    position: fixed;
    top: 85px;
    right: 20px;
    z-index: 10000;
    padding: 10px 15px;
    background-color: #007ACC;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Roboto', sans-serif;
    box-shadow: 0 3px 8px rgb(0 0 0 / 0.1);
    transition: background-color 0.2s ease;
    width: auto;
    margin-top: 0;
    min-width: 120px;
  `;
  
  // Add hover effect that matches your button styles
  notificationButton.onmouseover = () => {
    notificationButton.style.backgroundColor = '#004080';
  };
  notificationButton.onmouseout = () => {
    const unfinishedCount = notificationsHistory.filter(n => 
      n.source === 'Reis_KYC' && !n.isSanctioned && !n.onboardingCompleted
    ).length;
    notificationButton.style.backgroundColor = unfinishedCount > 0 ? '#dc3545' : '#007ACC';
  };
  
  notificationButton.onclick = showNotificationHistory;
  document.body.appendChild(notificationButton);

  // Create token status button - NEW ADDITION
  const tokenStatusButton = document.createElement('button');
  tokenStatusButton.id = 'tokenStatusBtn';
  tokenStatusButton.innerHTML = 'Token Status';
  tokenStatusButton.style.cssText = `
    position: fixed;
    top: 35px;
    right: 20px;
    z-index: 10000;
    padding: 10px 15px;
    background-color: #007ACC;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Roboto', sans-serif;
    box-shadow: 0 3px 8px rgb(0 0 0 / 0.1);
    transition: background-color 0.2s ease;
    width: auto;
    margin-top: 0;
    min-width: 120px;
  `;
  tokenStatusButton.onclick = showTokenStatus;
  document.body.appendChild(tokenStatusButton);

  // Update button badge
  updateNotificationBadge();
  updateTokenStatusButton();
}

// Token status functions
function updateTokenStatusButton() {
  const button = document.getElementById('tokenStatusBtn');
  if (!button) return;

  const status = tokenManager.getTokenStatus();
  button.innerHTML = `Token: ${status}`;
  
  if (status.includes('Expired')) {
    button.style.backgroundColor = '#dc3545';
  } else if (status.includes('Needs refresh')) {
    button.style.backgroundColor = '#ffc107';
  } else if (status.includes('Valid')) {
    button.style.backgroundColor = '#28a745';
  } else {
    button.style.backgroundColor = '#17a2b8';
  }
}

function showTokenStatus() {
  const status = tokenManager.getTokenStatus();
  const token = tokenManager.getToken();
  const tenant = tokenManager.getTenant();
  
  showPopup(`Token Status: ${status}\nTenant: ${tenant}\nToken: ${token ? `${token.substring(0, 20)}...` : 'None'}`);
}

// Update token status button every 10 seconds
setInterval(updateTokenStatusButton, 10000);

function updateNotificationBadge() {
  const button = document.getElementById('notificationHistoryBtn');
  if (!button) return;

  const unfinishedCount = notificationsHistory.filter(n => 
    n.source === 'Reis_KYC' && !n.isSanctioned && !n.onboardingCompleted
  ).length;

  if (unfinishedCount > 0) {
    button.innerHTML = `Notifications (${unfinishedCount})`;
    button.style.backgroundColor = '#dc3545';
  } else {
    button.innerHTML = 'Notifications';
    button.style.backgroundColor = '#007ACC';
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
    <h2 style="color: #004080; margin-top: 0; text-align: center;">Notifications History</h2>
    <div style="margin-bottom: 20px;">
      <button id="clearHistory" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Clear All History</button>
    </div>
  `;

  if (notificationsHistory.length === 0) {
    historyHTML += '<p style="text-align: center; color: #666;">No notifications yet.</p>';
  } else {
    const sortedHistory = [...notificationsHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedHistory.forEach((notification, index) => {
      const isReis = notification.source === 'Reis_KYC';
      const canContinueOnboarding = isReis && !notification.isSanctioned && !notification.onboardingCompleted;
      const statusColor = notification.isSanctioned ? '#dc3545' : '#28a745';
      const statusText = notification.isSanctioned ? 'SANCTIONED' : 'CLEARED';
      
      historyHTML += `
        <div style="
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          background: ${canContinueOnboarding ? '#f8f9fa' : 'white'};
          ${canContinueOnboarding ? 'border-left: 4px solid #007ACC;' : ''}
        ">
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #004080;">Customer ${notification.customerId}</h4>
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
    if (confirm('Clear all notification history and reset event tracking?')) {
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
    'bankfr': 'onboarding_bankfr.html',
    'banque_en': 'onboarding_banque_en.html',
  };
  
  const onboardingPage = tenantPageMap[currentTenant] || 'onboarding_bankfr.html';
  
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
  // Don't reset lastEventId to 0 - keep the existing value to avoid reprocessing old events
  // Only reset if there's no stored value (first time)
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
        data.events.forEach(event => {
          console.log('Processing event:', event.customerId);
          
          // Only show popups for events that are newer than what we had when the page loaded
          const wasEventProcessedBefore = notificationsHistory.some(n => 
            n.customerId === event.customerId && n.search_query_id === event.search_query_id
          );
          
          // Update lastEventId
          lastEventId = event.id;
          localStorage.setItem('lastEventId', lastEventId.toString());
          
          if (event.source === 'Reis_KYC' && !wasEventProcessedBefore) {
            console.log('Showing popup for new event:', event.customerId);
            showScreeningResultsPopup(event);
            showNotification(`Screening completed for ${event.customerId}`, 'warning');
            
            // Add to notifications history
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
    showNotification('Authenticated successfully!', 'success');

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('tenantName', tenantName);
    console.log('Auth tokens stored for onboarding page');
    
    updateTokenStatusButton();
  } catch(err) {
    logMessage(`Authentication error: ${err.message}`, 'error');
    showNotification('Authentication failed!', 'error');
  }
});

// --- Tabs ---
const tabButtons = document.querySelectorAll('.tabBtn');
const tabContents = document.querySelectorAll('.tabContent');
tabButtons.forEach(btn => btn.addEventListener('click', () => {
  tabButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  tabContents.forEach(tc => tc.style.display = 'none');
  const activeTab = document.getElementById(btn.dataset.tab);
  activeTab.style.display = 'block';

  if (btn.dataset.tab === 'centralized') {
    const syncType = document.getElementById('entityTypeSync').value;
    const asyncType = document.getElementById('entityTypeAsync').value;
    if (syncType) renderFields('syncFields', syncType, 'centralized');
    if (asyncType) renderFields('asyncFields', asyncType, 'centralized');
  }
}));

// --- Subtabs ---
const subTabButtons = document.querySelectorAll('.subTabBtn');
const subTabContents = document.querySelectorAll('.subTabContent');
subTabButtons.forEach(btn => btn.addEventListener('click', () => {
  subTabButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  subTabContents.forEach(tc => tc.style.display = 'none');
  const activeSubtab = document.getElementById(btn.dataset.subtab);
  activeSubtab.style.display = 'block';

  if (btn.dataset.subtab === 'sync') {
    const syncType = document.getElementById('entityTypeSync').value;
    if (syncType) renderFields('syncFields', syncType, 'centralized');
  } else if (btn.dataset.subtab === 'async') {
    const asyncType = document.getElementById('entityTypeAsync').value;
    if (asyncType) renderFields('asyncFields', asyncType, 'centralized');
  }
}));

// --- Render input fields ---
function renderFields(containerId, entityType, processType) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const fields = visibleTemplates[entityType]?.[processType] || [];

  fields.forEach(field => {
    const label = document.createElement('label');
    label.textContent = field.label + ':';

    let input;
    if (field.key === 'citizenship' || field.key === 'nationality') {
      input = document.createElement('select');
      input.id = containerId + '_' + field.key;

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select Country';
      input.appendChild(defaultOption);

      countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        input.appendChild(option);
      });
    } else if (field.key === 'queueName') {
      input = document.createElement('select');
      input.id = containerId + '_' + field.key;

      const queueOptions = ['Default', 'Maker', 'Checker'];
      queueOptions.forEach(queueOption => {
        const option = document.createElement('option');
        option.value = queueOption;
        option.textContent = queueOption;
        input.appendChild(option);
      });
      
      input.value = 'Default';
    } else {
      input = document.createElement('input');
      input.id = containerId + '_' + field.key;
      input.type = (field.key === 'birthDate') ? 'date' : 'text';
    }

    container.appendChild(label);
    container.appendChild(input);
  });
}

// --- Popup function with clickable link ---
function showPopup(message, link = '') {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');

  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  const extraDivs = popup.querySelectorAll('div');
  extraDivs.forEach(div => div.remove());

  popupText.style.whiteSpace = 'normal';
  popupText.style.fontSize = '';
  popupText.style.lineHeight = '';
  
  if (link && message.includes('You can treat the hits via this link:')) {
    popupText.innerHTML = `You can treat the hits via this <a href="${link}" target="_blank" style="color: #007bff; text-decoration: underline; cursor: pointer;">link</a>:`;
    
    popupLink.value = link;
    popupLink.style.display = 'block';
    popupLink.readOnly = true;
    popupLink.onclick = () => popupLink.select();
    popupLink.style.cursor = 'text';
  } else {
    popupText.textContent = message;
    
    if (link) {
      popupLink.value = link;
      popupLink.style.display = 'block';
      popupLink.readOnly = true;
      popupLink.onclick = () => popupLink.select();
      popupLink.style.cursor = 'text';
    } else {
      popupLink.style.display = 'none';
    }
  }

  let closeButton = document.getElementById('closePopup');
  if (!closeButton) {
    closeButton = document.createElement('button');
    closeButton.id = 'closePopup';
    closeButton.textContent = 'Close';
    closeButton.style.cssText = 'padding:8px 15px; font-size:1rem;';
    popup.appendChild(closeButton);
  }
  
  closeButton.style.display = 'block';
  closeButton.onclick = () => {
    popup.style.display = 'none';
    popupText.style.whiteSpace = 'normal';
    popupText.style.fontSize = '';
    popupText.style.lineHeight = '';
    popupText.innerHTML = '';
    
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
  };

  popup.style.display = 'block';

  if (link && !message.includes('You can treat the hits via this link:')) {
    popupLink.select();
  }
}

function showNoHitsPopup(customerData, apiResponse) {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');

  // Clean up any previous content first
  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  const extraDivs = popup.querySelectorAll('div');
  extraDivs.forEach(div => div.remove());

  // Reset text styling
  popupText.style.whiteSpace = 'normal';
  popupText.style.fontSize = '';
  popupText.style.lineHeight = '';
  
  // Set message
  popupText.textContent = "Your customer doesn't have any hits. You can continue with the onboarding process.";

  // Hide the link field
  popupLink.style.display = 'none';

  // Create Continue Onboarding button
  const continueButton = document.createElement('button');
  continueButton.textContent = 'Continue Onboarding';
  continueButton.style.cssText = `
    padding: 10px 20px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    margin: 20px 10px 0 0;
  `;
  
  continueButton.onclick = () => {
    // FIXED: Create customer ID from the payload data we sent
    const customerId = `${customerData.firstName}_${customerData.lastName}_${Date.now()}`;
    
    // Store customer data for onboarding using the payload data
    localStorage.setItem(`screeningData_${customerId}`, JSON.stringify({
      customerId: customerId,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      birthDate: customerData.birthDate,
      nationality: customerData.nationality,
      citizenship: customerData.citizenship,
      systemId: customerData.systemId,
      searchQueryId: apiResponse.search_query_id,
      screeningResult: 'NO_HITS',
      maxScore: 0,
      timestamp: new Date().toISOString(),
      apiResponse: apiResponse
    }));
    
    console.log('Stored screening data for customer:', customerId);
    
    // Navigate to onboarding with the correct customer ID
    navigateToOnboarding(customerId);
    popup.style.display = 'none';
    resetPopup();
  };

  // Insert the button before the close button
  const closeButton = document.getElementById('closePopup');
  closeButton.parentNode.insertBefore(continueButton, closeButton);

  popup.style.display = 'block';
}
// New function for centralized popup
function showCentralizedPopup(message, showContinueButton = false, customerData = null, apiResponse = null) {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');

  // Clean up any previous content first
  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  const extraDivs = popup.querySelectorAll('div');
  extraDivs.forEach(div => div.remove());

  // Reset text styling
  popupText.style.whiteSpace = 'normal';
  popupText.style.fontSize = '';
  popupText.style.lineHeight = '';
  
  // Set content
  popupText.textContent = message;

  // Hide the link field
  popupLink.style.display = 'none';

  if (showContinueButton && customerData && apiResponse) {
    // Show Continue Onboarding button
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue Onboarding';
    continueButton.style.cssText = `
      padding: 10px 20px;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin: 20px 10px 0 0;
    `;
    continueButton.onclick = () => {
      // Use the customer ID from the API response
      const customerId = apiResponse.customerId || apiResponse.customer_id || apiResponse.id;
      
      if (!customerId) {
        console.error('No customer ID found in API response:', apiResponse);
        showNotification('Error: Customer ID not found in response', 'error');
        return;
      }
      
      // Store customer data for onboarding with the correct ID from API response
      localStorage.setItem(`screeningData_${customerId}`, JSON.stringify({
        customerId: customerId,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        birthDate: customerData.birthDate,
        nationality: customerData.nationality,
        citizenship: customerData.citizenship,
        systemId: customerData.systemId,
        searchQueryId: apiResponse.search_query_id,
        screeningResult: apiResponse.maxScore > 0 ? 'HITS_FOUND' : 'NO_HITS',
        maxScore: apiResponse.maxScore || 0,
        timestamp: new Date().toISOString(),
        apiResponse: apiResponse
      }));
      
      console.log('Stored screening data for customer:', customerId);
      
      navigateToOnboarding(customerId);
      popup.style.display = 'none';
      resetPopup();
    };

    // Insert the button before the close button
    const closeButton = document.getElementById('closePopup');
    closeButton.parentNode.insertBefore(continueButton, closeButton);
  }

  popup.style.display = 'block';
}

function showScreeningResultsPopup(event) {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');

  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  const extraDivs = popup.querySelectorAll('div');
  extraDivs.forEach(div => div.remove());

  let message = `Customer ${event.customerId} Screening Results:\n`;
  message += `🔍 Risk Assessment:\n`;
  message += `• PEP Status: ${event.isPEP ? '⚠️ YES' : '✅ NO'} (${event.pepDecision || 'N/A'})\n`;
  message += `• Sanctions: ${event.isSanctioned ? '🚨 YES' : '✅ NO'} (${event.sanctionDecision || 'N/A'})\n`;
  message += `• Adverse Media: ${event.isAdverseMedia ? '⚠️ YES' : '✅ NO'}\n\n`;
  message += `Onboarding decision:\n`;
  
  if (event.isSanctioned) {
    message += `Your customer is confirmed as sanctioned. You cannot proceed with the onboarding.`;
  } else {
    message += `Customer cleared for onboarding. You can proceed with the onboarding process.`;
  }

  popupText.style.whiteSpace = 'pre-line';
  popupText.style.fontSize = '14px';
  popupText.style.lineHeight = '1.4';
  popupText.textContent = message;

  popupLink.style.display = 'none';

  if (!event.isSanctioned) {
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue Onboarding';
    continueButton.id = 'continueOnboardingBtn';
    continueButton.style.cssText = `
      padding: 10px 20px;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin: 20px 10px 0 0;
    `;
    continueButton.onclick = () => {
      navigateToOnboarding(event.customerId);
      popup.style.display = 'none';
      resetPopup();
    };
    
    const closeButton = document.getElementById('closePopup');
    closeButton.parentNode.insertBefore(continueButton, closeButton);
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

function navigateToOnboarding(customerId) {
  const currentTenant = localStorage.getItem('tenantName') || 'bankfr';
  
  const tenantPageMap = {
    'bankfr': 'onboarding_bankfr.html',
    'banque_en': 'onboarding_banque_en.html',
  };
  
  const onboardingPage = tenantPageMap[currentTenant] || 'onboarding_bankfr.html';
  
  console.log(`Navigating to tenant-specific onboarding: ${onboardingPage} for tenant: ${currentTenant}`);
  
  window.location.href = `${onboardingPage}?customerId=${customerId}`;
}

// --- Call searchPersonCustomer with TOKEN REFRESH ---
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

    const customerIdentifier = payload.firstName + '_' + payload.lastName + '_' + payload.birthDate;
    localStorage.setItem(`systemId_${customerIdentifier}`, generatedSystemId);
    console.log('Stored systemId for customer:', customerIdentifier, '→', generatedSystemId);

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
    
    storeSearchEventForWebhook(payload, data);

    logMessage(`Search completed for ${entityType}`, 'success');
    showNotification('Search completed successfully', 'success');
    
    if (isDecentralized) {
      if (data.maxScore && data.maxScore > 0) {
        const link = `https://greataml.com/search/searchdecision/${data.search_query_id}`;
        logMessage(`Hits found for customer (Score: ${data.maxScore})`, 'warning');
        showPopup('You can treat the hits via this link:', link);
      } else {
        logMessage('No hits found for customer', 'info');
        showNoHitsPopup(payload, data);
      }
    } else {
      // Determine if this is sync or async based on containerId
      const isAsync = containerId === 'asyncFields';
      
      // Centralized process - different behavior for sync vs async
      if (data.maxScore && data.maxScore > 0) {
        logMessage(`Hits found for customer (Score: ${data.maxScore})`, 'warning');
        if (isAsync) {
          // Async: allow continuing onboarding even with hits
          showCentralizedPopup("The alert is being treated by the compliance team. You can now continue the onboarding.", true, payload, data);
        } else {
          // Sync: wait for compliance team
          showCentralizedPopup("The alert is being treated by the compliance team. You will receive a notification once it is processed.", false);
        }
      } else {
        logMessage('No hits found for customer', 'info');
        showCentralizedPopup("Your customer doesn't have any matches. You can continue the onboarding.", true, payload, data);
      }
    }
  } catch (err) {
    const errorMsg = `Search error: ${err.message}`;
    logMessage(errorMsg, 'error');
    showNotification('Search failed', 'error');
  }
}

// --- Button Events ---
const closeBtn = document.getElementById('closePopup');
closeBtn.addEventListener('click', () => {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');
  
  popup.style.display = 'none';
  
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
});

document.getElementById('submitDecentralized')
  .addEventListener('click', () => 
    callSearch(
      document.getElementById('entityTypeDecentralized').value,
      'decentralizedFields',
      'responseDecentralized',
      true
    )
  );

document.getElementById('submitSync')
  .addEventListener('click', () => 
    callSearch(document.getElementById('entityTypeSync').value, 'syncFields', 'responseSync')
  );

document.getElementById('submitAsync')
  .addEventListener('click', () => 
    callSearch(document.getElementById('entityTypeAsync').value, 'asyncFields', 'responseAsync')
  );

document.getElementById('entityTypeDecentralized')
  .addEventListener('change', () => renderFields('decentralizedFields', document.getElementById('entityTypeDecentralized').value, 'decentralized'));

document.getElementById('entityTypeSync')
  .addEventListener('change', () => renderFields('syncFields', document.getElementById('entityTypeSync').value, 'centralized'));

document.getElementById('entityTypeAsync')
  .addEventListener('change', () => renderFields('asyncFields', document.getElementById('entityTypeAsync').value, 'centralized'));

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

document.addEventListener('DOMContentLoaded', function() {
  logMessage('Application initialized', 'info');
  createNotificationElements();
  
  updateTokenStatusButton();
  
  setTimeout(() => {
    if (!pollingInterval) {
      setupEventPolling();
    }
  }, 1000);
});

window.addEventListener('beforeunload', function() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

window.closeNotificationHistory = closeNotificationHistory;
window.continueOnboardingFromHistory = continueOnboardingFromHistory;