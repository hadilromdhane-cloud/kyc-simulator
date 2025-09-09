let authToken = null;
let tenantName = null;
let eventSource = null;

// NEW: Add these variables at the top
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds

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

  // Update button badge
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const button = document.getElementById('notificationHistoryBtn');
  if (!button) return;

  const unfinishedCount = notificationsHistory.filter(n => 
    n.source === 'Reis_KYC' && !n.isSanctioned && !n.onboardingCompleted
  ).length;

  if (unfinishedCount > 0) {
    button.innerHTML = `Notifications (${unfinishedCount})`;
    button.style.backgroundColor = '#dc3545'; // Red background for pending items
  } else {
    button.innerHTML = 'Notifications';
    button.style.backgroundColor = '#007ACC'; // Default blue
  }
}

function showNotificationHistory() {
  // Create history overlay
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
    // Sort by timestamp, newest first
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

  // Add event listener for clear history
  document.getElementById('clearHistory').onclick = () => {
  if (confirm('Clear all notification history and reset event tracking?')) {
    notificationsHistory = [];
    localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
    
    // Add this: Reset event tracking too
    localStorage.setItem('lastEventId', '0');
    lastEventId = 0;
    
    updateNotificationBadge();
    closeNotificationHistory();
    
    showNotification('History cleared and event tracking reset', 'success');
    console.log('Reset complete. lastEventId is now:', lastEventId);
  }
};

  // Close on background click
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
  // Mark as onboarding started
  notificationsHistory[historyIndex].onboardingCompleted = false;
  notificationsHistory[historyIndex].onboardingStarted = true;
  localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
  
  // Navigate to onboarding
  window.location.href = `onboarding.html?customerId=${customerId}`;
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

  // Auto remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, duration);

  // Add CSS animation
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
  // Keep function for backward compatibility but only log to console
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function getLogColor(type) {
  // Keep function for backward compatibility
  return '#00ff00';
}

function updateConnectionStatus(connected) {
  // Keep function for backward compatibility but do nothing
  // No connection status display anymore
}

// --- POLLING-BASED Event System (instead of SSE) ---
let lastEventId = parseInt(localStorage.getItem('lastEventId')) || 0;
let pollingInterval = null;
const pollingFrequency = 2000; // Poll every 2 seconds
let notificationsHistory = JSON.parse(localStorage.getItem('notificationsHistory')) || [];

function setupEventPolling() {
  // Clear existing polling
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  if (reconnectAttempts === 0) {
    logMessage('Starting event polling...', 'info');
  } else {
    logMessage(`Polling reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}...`, 'warning');
  }

  // Start polling
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/events?lastId=${lastEventId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Connection successful
      if (reconnectAttempts > 0) {
        logMessage('Connected to event polling', 'success');
        updateConnectionStatus(true);
        showNotification('Real-time notifications connected', 'success');
        reconnectAttempts = 0;
      }

      // Process new events
      if (data.events && data.events.length > 0) {
        data.events.forEach(event => {
          logMessage(`Event received: ${JSON.stringify(event)}`, 'info');
          
          // Update last event ID and save to localStorage
          if (event.id > lastEventId) {
            lastEventId = event.id;
            localStorage.setItem('lastEventId', lastEventId.toString());
          }

          // Show notification based on event data
          let message = 'New event received';
          let notificationType = 'info';
          
          if (event.type === 'connection') {
            // Skip connection events in polling mode
            return;
          } else if (event.source === 'Reis_KYC' && event.customerId) {
            message = `Hits processed for customer ${event.customerId}`;
            notificationType = 'warning';
          } else if (event.customerId) {
            message = `Alert for customer: ${event.customerId}`;
            notificationType = 'warning';
          } else if (event.message) {
            message = event.message;
            notificationType = 'warning';
          }
          
          showNotification(message, notificationType, 8000);
          
          // Handle Reis KYC screening results with detailed popup
          if (event.source === 'Reis_KYC' && event.customerId) {
            console.log('Processing Reis KYC event:', event);
            
            // Find and link the systemId from the screening request
            const linkedSystemId = linkCustomerToSystemId(event.customerId, event.search_query_id);
            if (linkedSystemId) {
              event.originalSystemId = linkedSystemId;
              // Store the permanent mapping
              storeSystemIdForScreening(event.customerId, linkedSystemId, {
                searchQueryId: event.search_query_id,
                source: event.source
              });
              console.log('Successfully linked systemId to customer:', {
                customerId: event.customerId,
                systemId: linkedSystemId,
                searchQueryId: event.search_query_id
              });
            } else {
              console.warn('Could not find systemId for customer:', event.customerId);
            }
            
            // Save to history
            const existingIndex = notificationsHistory.findIndex(n => n.customerId === event.customerId && n.search_query_id === event.search_query_id);
            if (existingIndex === -1) {
              notificationsHistory.unshift(event); // Add to beginning
              // Keep only last 50 notifications
              if (notificationsHistory.length > 50) {
                notificationsHistory = notificationsHistory.slice(0, 50);
              }
              localStorage.setItem('notificationsHistory', JSON.stringify(notificationsHistory));
              updateNotificationBadge();
            }
            
            console.log('About to show screening popup');
            showScreeningResultsPopup(event);
          } else if (event.search_query_id) {
            const link = `https://greataml.com/search/searchdecision/${event.search_query_id}`;
            showPopup('New search result available:', link);
          }
        });
      }

    } catch (error) {
      console.error('Polling error:', error);
      
      // Handle connection errors
      if (reconnectAttempts === 0) {
        logMessage('Event polling connection lost', 'error');
        updateConnectionStatus(false);
      }
      
      // Stop polling and attempt reconnection
      clearInterval(pollingInterval);
      pollingInterval = null;
      
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        showNotification(`Connection lost. Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`, 'warning');
        
        setTimeout(() => {
          if (!pollingInterval) { // Only reconnect if not already connected
            setupEventPolling();
          }
        }, reconnectDelay);
      } else {
        logMessage('Max reconnection attempts reached. Please refresh the page.', 'error');
        showNotification('Connection failed. Please refresh the page.', 'error', 10000);
      }
    }
  }, pollingFrequency);
}

// Helper function to link customer ID to systemId using search_query_id
function linkCustomerToSystemId(customerId, searchQueryId) {
  try {
    console.log('Attempting to link customer to systemId:', { customerId, searchQueryId });
    
    // Look for temporary screening data that matches this search_query_id
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
            
            // Clean up temporary data
            localStorage.removeItem(key);
            console.log('Cleaned up temporary screening data:', key);
            
            return screeningData.systemId;
          }
        } catch (parseError) {
          console.error('Error parsing temp screening data:', key, parseError);
          // Remove corrupted data
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

// Helper function to store systemId for screening
function storeSystemIdForScreening(customerId, systemId, additionalData = {}) {
  try {
    const screeningData = {
      systemId: systemId,
      customerId: customerId,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    // Store by customerId for easy lookup during onboarding
    localStorage.setItem(`customerSystemId_${customerId}`, systemId);
    
    // Store detailed screening data
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

// Function to manually reset connection
function resetConnection() {
  reconnectAttempts = 0;
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  setupEventPolling();
}

// --- Authentication ---
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
    logMessage('Authentication successful', 'success');
    showNotification('Authenticated successfully!', 'success');

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('tenantName', tenantName);
    console.log('Auth tokens stored for onboarding page');
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
      // Queue Name as select field
      input = document.createElement('select');
      input.id = containerId + '_' + field.key;

      const queueOptions = ['Default', 'Maker', 'Checker'];
      queueOptions.forEach(queueOption => {
        const option = document.createElement('option');
        option.value = queueOption;
        option.textContent = queueOption;
        input.appendChild(option);
      });
      
      // Set default to 'Default'
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

// --- Popup function ---
function showPopup(message, link = '') {
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

  if (link) {
    popupLink.value = link;
    popupLink.style.display = 'block';
    popupLink.readOnly = true;
    popupLink.onclick = null;
    popupLink.style.cursor = 'default';
  } else {
    popupLink.style.display = 'none';
  }

  // Ensure the original close button exists and is functional
  let closeButton = document.getElementById('closePopup');
  if (!closeButton) {
    // Create the close button if it doesn't exist
    closeButton = document.createElement('button');
    closeButton.id = 'closePopup';
    closeButton.textContent = 'Close';
    closeButton.style.cssText = 'padding:8px 15px; font-size:1rem;';
    popup.appendChild(closeButton);
  }
  
  // Make sure it's visible and functional
  closeButton.style.display = 'block';
  closeButton.onclick = () => {
    popup.style.display = 'none';
    popupText.style.whiteSpace = 'normal';
    popupText.style.fontSize = '';
    popupText.style.lineHeight = '';
    popupText.textContent = '';
    
    // Reset link field
    popupLink.onclick = null;
    popupLink.style.cursor = 'default';
    popupLink.style.display = 'none';
    popupLink.readOnly = true;
    popupLink.value = '';
    popupLink.placeholder = '';
    
    // Remove any extra buttons that might have been added
    const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
    extraButtons.forEach(btn => btn.remove());
    
    // Remove any extra divs that might have been added
    const extraDivs = popup.querySelectorAll('div');
    extraDivs.forEach(div => div.remove());
    
    const sel = window.getSelection();
    sel.removeAllRanges();
  };

  popup.style.display = 'block';

  if (link) popupLink.select();
}

// --- Enhanced popup for screening results ---
// --- Enhanced popup for screening results (FIXED VERSION) ---
function showScreeningResultsPopup(event) {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');

  // Clean up any previous content first
  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  const extraDivs = popup.querySelectorAll('div');
  extraDivs.forEach(div => div.remove());

  // Create message
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

  // Hide the link field
  popupLink.style.display = 'none';

  // Only add Continue Onboarding button if not sanctioned
  if (!event.isSanctioned) {
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue Onboarding';
    continueButton.id = 'continueOnboardingBtn'; // Give it an ID for cleanup
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
    
    // Insert the button before the close button
    const closeButton = document.getElementById('closePopup');
    closeButton.parentNode.insertBefore(continueButton, closeButton);
  }

  popup.style.display = 'block';
}

// Helper function to reset popup to clean state
function resetPopup() {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');
  
  // Reset text styling
  popupText.style.whiteSpace = 'normal';
  popupText.style.fontSize = '';
  popupText.style.lineHeight = '';
  popupText.textContent = '';
  
  // Reset link field
  popupLink.onclick = null;
  popupLink.style.cursor = 'default';
  popupLink.style.display = 'none';
  popupLink.readOnly = true;
  popupLink.value = '';
  popupLink.placeholder = '';
  
  // Remove any extra buttons (keep only the original close button)
  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  
  // Remove any extra divs
  const extraDivs = popup.querySelectorAll('div');
  extraDivs.forEach(div => div.remove());
  
  // Clear text selection
  const sel = window.getSelection();
  sel.removeAllRanges();
}

// --- Update the close button event handler ---
document.getElementById('closePopup').addEventListener('click', () => {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';
  resetPopup();
});

// --- Navigate to onboarding function ---
function navigateToOnboarding(customerId) {
  // Navigate to a new onboarding page
  window.location.href = `onboarding.html?customerId=${customerId}`;
}

// --- Show onboarding page ---
function showOnboardingPage(customerId) {
  // This function is no longer needed since we're navigating to a new page
  // Keeping it for backward compatibility but it won't be called
}

// --- Call searchPersonCustomer ---
// Updated callSearch function - add this to your index.js
async function callSearch(entityType, containerId, responseId, isDecentralized = false) {
  if (!tenantName || !authToken) { 
    showNotification('Please authenticate first!', 'warning');
    return; 
  }

  logMessage(`Starting search for ${entityType}...`, 'info');

  let payload = {};
  document.querySelectorAll(`#${containerId} input, #${containerId} select`).forEach(input => {
    payload[input.id.replace(containerId + '_', '')] = input.value;
  });

  // Generate systemId with the exact format: system_timestamp_random
  const generatedSystemId = `system_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  payload.systemId = generatedSystemId;
  payload.systemName = defaultValues[entityType].systemName;
  payload.searchQuerySource = defaultValues[entityType].searchQuerySource;

  // Store the systemId for this customer for later use in onboarding
  const customerIdentifier = payload.firstName + '_' + payload.lastName + '_' + payload.birthDate;
  localStorage.setItem(`systemId_${customerIdentifier}`, generatedSystemId);
  console.log('Stored systemId for customer:', customerIdentifier, '→', generatedSystemId);

  // Add queueName for both PP and PM in centralized process
  if (!isDecentralized) {
    payload.queueName = payload.queueName || defaultValues[entityType].queueName;
  }

  try {
    // Use different endpoint based on entity type
    const endpoint = entityType === 'PM' 
      ? 'https://greataml.com/kyc-web-restful/search/searchEntityCustomer'
      : 'https://greataml.com/kyc-web-restful/search/searchPersonCustomer';
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-auth-tenant': tenantName,
        'x-auth-token': authToken
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    logMessage(`Search completed for ${entityType}`, 'success');
    showNotification('Search completed successfully', 'success');

    if (isDecentralized) {
      // Decentralized process - show popup based on hits
      if (data.maxScore && data.maxScore > 0) {
        const link = `https://greataml.com/search/searchdecision/${data.search_query_id}`;
        logMessage(`Hits found for customer (Score: ${data.maxScore})`, 'warning');
        showPopup('You can treat the hits via this link:', link);
      } else {
        logMessage('No hits found for customer', 'info');
        showPopup("Your customer doesn't have any hits.");
      }
    } else {
      // Centralized synchronous process - new popup logic
      if (data.maxScore && data.maxScore > 0) {
        logMessage(`Hits found for customer (Score: ${data.maxScore})`, 'warning');
        showCentralizedPopup("The alert is being treated by the compliance team. You will receive a notification once it is processed.", false);
      } else {
        logMessage('No hits found for customer', 'info');
        showCentralizedPopup("Your customer doesn't have any matches. You can continue the onboarding.", true);
      }
    }
  } catch (err) {
    const errorMsg = `Search error: ${err.message}`;
    logMessage(errorMsg, 'error');
    showNotification('Search failed', 'error');
  }
}

// New function for centralized popup
function showCentralizedPopup(message, showContinueButton = false) {
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

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: center;
  `;

  if (showContinueButton) {
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
      margin-right: 10px;
    `;
    continueButton.onclick = () => {
      // You can add onboarding logic here if needed
      popup.style.display = 'none';
      showNotification('Continuing with onboarding process...', 'success');
    };
    buttonContainer.appendChild(continueButton);
  }

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.id = 'closePopup';
  closeButton.style.cssText = `
    padding: 10px 20px;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `;
  closeButton.onclick = () => {
    popup.style.display = 'none';
    popupText.style.whiteSpace = 'normal';
    popupText.style.fontSize = '';
    popupText.style.lineHeight = '';
    popupText.textContent = '';
    
    // Reset link field
    popupLink.onclick = null;
    popupLink.style.cursor = 'default';
    popupLink.style.display = 'none';
    popupLink.readOnly = true;
    popupLink.value = '';
    popupLink.placeholder = '';
    
    // Remove any extra elements
    const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
    extraButtons.forEach(btn => btn.remove());
    const extraDivs = popup.querySelectorAll('div');
    extraDivs.forEach(div => div.remove());
    
    const sel = window.getSelection();
    sel.removeAllRanges();
  };

  buttonContainer.appendChild(closeButton);
  popup.appendChild(buttonContainer);
  popup.style.display = 'block';
}
// --- Button Events ---
const closeBtn = document.getElementById('closePopup');
closeBtn.addEventListener('click', () => {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  const popupLink = document.getElementById('popupLink');
  
  // Hide popup
  popup.style.display = 'none';
  
  // Reset all popup content and styling
  popupText.style.whiteSpace = 'normal';
  popupText.style.fontSize = '';
  popupText.style.lineHeight = '';
  popupText.textContent = '';
  
  // Reset link field
  popupLink.onclick = null;
  popupLink.style.cursor = 'default';
  popupLink.style.display = 'none';
  popupLink.readOnly = true;
  popupLink.value = '';
  popupLink.placeholder = '';
  
  // Remove any extra buttons that might have been added
  const extraButtons = popup.querySelectorAll('button:not(#closePopup)');
  extraButtons.forEach(btn => btn.remove());
  
  // Remove any extra divs that might have been added
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

// --- Entity type change events ---
document.getElementById('entityTypeDecentralized')
  .addEventListener('change', () => renderFields('decentralizedFields', document.getElementById('entityTypeDecentralized').value, 'decentralized'));

document.getElementById('entityTypeSync')
  .addEventListener('change', () => renderFields('syncFields', document.getElementById('entityTypeSync').value, 'centralized'));

document.getElementById('entityTypeAsync')
  .addEventListener('change', () => renderFields('asyncFields', document.getElementById('entityTypeAsync').value, 'centralized'));

// --- Initialize on page load ---
document.addEventListener('DOMContentLoaded', function() {
  logMessage('Application initialized', 'info');
  createNotificationElements();
  setupEventPolling();
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

// Global functions for HTML onclick handlers
window.closeNotificationHistory = closeNotificationHistory;
window.continueOnboardingFromHistory = continueOnboardingFromHistory;