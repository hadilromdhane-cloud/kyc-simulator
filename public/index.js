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
      { label: 'SystemId', key: 'systemId' },
      { label: 'SystemName', key: 'systemName' },
      { label: 'SearchQuerySource', key: 'searchQuerySource' },
      { label: 'Queue Name', key: 'queueName' }
    ]
  },
  PM: {
    decentralized: [{ label: 'Business Name', key: 'businessName' }],
    centralized: [
      { label: 'Business Name', key: 'businessName' },
      { label: 'SystemName', key: 'systemName' },
      { label: 'SystemId', key: 'systemId' },
      { label: 'SearchQuerySource', key: 'searchQuerySource' }
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
    searchQuerySource: 'KYC'
  }
};

// --- Notification System ---
function createNotificationElements() {
  // Create notification container
  const notificationContainer = document.createElement('div');
  notificationContainer.id = 'notificationContainer';
  notificationContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 350px;
  `;
  document.body.appendChild(notificationContainer);

  // Create log panel
  const logPanel = document.createElement('div');
  logPanel.id = 'logPanel';
  logPanel.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    width: 400px;
    height: 200px;
    background: #000;
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    padding: 10px;
    border-radius: 5px;
    overflow-y: auto;
    z-index: 10000;
    border: 2px solid #333;
  `;
  
  const logHeader = document.createElement('div');
  logHeader.innerHTML = 'System Log';
  logHeader.style.cssText = `
    background: #333;
    color: white;
    padding: 5px 10px;
    margin: -10px -10px 10px -10px;
    border-radius: 3px 3px 0 0;
    font-weight: bold;
    text-align: center;
  `;
  
  const logContent = document.createElement('div');
  logContent.id = 'logContent';
  
  logPanel.appendChild(logHeader);
  logPanel.appendChild(logContent);
  document.body.appendChild(logPanel);

  // Connection status indicator
  const connectionStatus = document.createElement('div');
  connectionStatus.id = 'connectionStatus';
  connectionStatus.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    padding: 8px 15px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    z-index: 10000;
    background: #dc3545;
    color: white;
  `;
  connectionStatus.textContent = '● Disconnected';
  document.body.appendChild(connectionStatus);
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
  const logContent = document.getElementById('logContent');
  if (!logContent) return;

  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.style.color = getLogColor(type);
  logEntry.innerHTML = `[${timestamp}] ${message}`;
  
  logContent.appendChild(logEntry);
  logContent.scrollTop = logContent.scrollHeight;
  
  // Keep only last 50 entries
  while (logContent.children.length > 50) {
    logContent.removeChild(logContent.firstChild);
  }
}

function getLogColor(type) {
  switch(type) {
    case 'success': return '#00ff00';
    case 'error': return '#ff6b6b';
    case 'warning': return '#ffeb3b';
    case 'info': return '#00bfff';
    default: return '#00ff00';
  }
}

function updateConnectionStatus(connected) {
  const status = document.getElementById('connectionStatus');
  if (!status) return;

  if (connected) {
    status.style.background = '#28a745';
    status.textContent = '● Connected';
  } else {
    status.style.background = '#dc3545';
    status.textContent = '● Disconnected';
  }
}

// --- IMPROVED Server-Sent Events Setup ---
function setupEventSource() {
  // Close existing connection
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  // Reset reconnect attempts on manual connection
  if (reconnectAttempts === 0) {
    logMessage('Attempting to connect to event stream...', 'info');
  } else {
    logMessage(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}...`, 'warning');
  }
  
  // Create new EventSource connection
  eventSource = new EventSource('/events');
  
  // Connection opened successfully
  eventSource.onopen = function(event) {
    logMessage('Connected to event stream', 'success');
    updateConnectionStatus(true);
    showNotification('Real-time notifications connected', 'success');
    
    // Reset reconnect attempts on successful connection
    reconnectAttempts = 0;
  };
  
  // Message received from server
  eventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      logMessage(`Event received: ${JSON.stringify(data)}`, 'info');
      
      // Show notification based on event data
      let message = 'New event received';
      let notificationType = 'info';
      
      if (data.type === 'connection') {
        message = data.message || 'Connected to notifications';
        notificationType = 'success';
        // Don't show notification for initial connection message
        return;
      } else if (data.customerId) {
        message = `Alert for customer: ${data.customerId}`;
        notificationType = 'warning';
      } else if (data.message) {
        message = data.message;
        notificationType = 'warning';
      }
      
      showNotification(message, notificationType, 8000);
      
      // Handle specific webhook payloads
      if (data.search_query_id) {
        const link = `https://greataml.com/search/searchdecision/${data.search_query_id}`;
        showPopup('New search result available:', link);
      }
      
    } catch (error) {
      logMessage(`Error parsing event data: ${error.message}`, 'error');
      console.error('Event parsing error:', error, 'Raw data:', event.data);
    }
  };
  
  // Connection error or closed
  eventSource.onerror = function(event) {
    logMessage('Event stream connection lost', 'error');
    updateConnectionStatus(false);
    
    // Close the current connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    
    // Only attempt reconnection if we haven't exceeded max attempts
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      showNotification(`Connection lost. Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`, 'warning');
      
      setTimeout(() => {
        if (!eventSource) { // Only reconnect if not already connected
          setupEventSource();
        }
      }, reconnectDelay);
    } else {
      logMessage('Max reconnection attempts reached. Please refresh the page.', 'error');
      showNotification('Connection failed. Please refresh the page.', 'error', 10000);
    }
  };
}

// Function to manually reset connection (you can call this from console or add a button)
function resetConnection() {
  reconnectAttempts = 0;
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  setupEventSource();
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

  popupText.textContent = message;

  if (link) {
    popupLink.value = link;
    popupLink.style.display = 'block';
  } else {
    popupLink.style.display = 'none';
  }

  popup.style.display = 'block';

  if (link) popupLink.select();
}

// --- Call searchPersonCustomer ---
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

  payload.systemId = `system_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  payload.systemName = defaultValues[entityType].systemName;
  payload.searchQuerySource = defaultValues[entityType].searchQuerySource;

  if (entityType === 'PP') payload.queueName = defaultValues[entityType].queueName;

  try {
    const res = await fetch('https://greataml.com/kyc-web-restful/search/searchPersonCustomer', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-auth-tenant': tenantName,
        'x-auth-token': authToken
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    document.getElementById(responseId).textContent = JSON.stringify(data, null, 2);

    logMessage(`Search completed for ${entityType}`, 'success');
    showNotification('Search completed successfully', 'success');

    if (isDecentralized) {
      if (data.maxScore && data.maxScore > 0) {
        const link = `https://greataml.com/search/searchdecision/${data.search_query_id}`;
        logMessage(`Hits found for customer (Score: ${data.maxScore})`, 'warning');
        showPopup('You can treat the hits via this link:', link);
      } else {
        logMessage('No hits found for customer', 'info');
        showPopup("Your customer doesn't have any hits.");
      }
    }
  } catch (err) {
    const errorMsg = `Search error: ${err.message}`;
    document.getElementById(responseId).textContent = errorMsg;
    logMessage(errorMsg, 'error');
    showNotification('Search failed', 'error');
  }
}

// --- Button Events ---
const closeBtn = document.getElementById('closePopup');
closeBtn.addEventListener('click', () => {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';

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
  setupEventSource();
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  if (eventSource) {
    eventSource.close();
  }
});