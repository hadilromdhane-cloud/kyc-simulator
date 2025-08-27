// Fixed SSE connection management with proper reconnection logic
let authToken = null;
let tenantName = null;
let eventSource = null;

// Connection state management
let connectionState = {
  isConnecting: false,
  isConnected: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000, // Start with 1 second
  maxReconnectDelay: 30000, // Max 30 seconds
  reconnectTimer: null,
  lastConnectAttempt: null,
  shouldReconnect: true
};

// Exponential backoff calculation
function getReconnectDelay() {
  const delay = Math.min(
    connectionState.reconnectDelay * Math.pow(2, connectionState.reconnectAttempts),
    connectionState.maxReconnectDelay
  );
  return delay + (Math.random() * 1000); // Add jitter
}

// Reset connection state on successful connection
function resetConnectionState() {
  connectionState.reconnectAttempts = 0;
  connectionState.reconnectDelay = 1000;
  connectionState.isConnecting = false;
  connectionState.isConnected = true;
  if (connectionState.reconnectTimer) {
    clearTimeout(connectionState.reconnectTimer);
    connectionState.reconnectTimer = null;
  }
}

// Enhanced setupEventSource with proper connection management
function setupEventSource() {
  // Prevent multiple simultaneous connection attempts
  if (connectionState.isConnecting) {
    logMessage('Connection attempt already in progress, skipping...', 'warning');
    return;
  }

  // Check if we've exceeded max reconnect attempts
  if (connectionState.reconnectAttempts >= connectionState.maxReconnectAttempts) {
    logMessage(`Max reconnection attempts (${connectionState.maxReconnectAttempts}) reached. Giving up.`, 'error');
    showNotification('Connection failed permanently. Please refresh the page.', 'error', 10000);
    updateConnectionStatus(false);
    return;
  }

  // Close existing connection properly
  if (eventSource) {
    logMessage('Closing existing EventSource connection...', 'info');
    eventSource.close();
    eventSource = null;
  }

  connectionState.isConnecting = true;
  connectionState.lastConnectAttempt = Date.now();
  
  const attemptNumber = connectionState.reconnectAttempts + 1;
  logMessage(`Attempting to connect to event stream (attempt ${attemptNumber}/${connectionState.maxReconnectAttempts})...`, 'info');
  
  try {
    eventSource = new EventSource('/api/events');

    
    // Connection opened successfully
    eventSource.onopen = function(event) {
      logMessage('Connected to event stream successfully', 'success');
      resetConnectionState();
      updateConnectionStatus(true);
      showNotification('Real-time notifications connected', 'success');
    };
    
    // Message received
    eventSource.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        logMessage(`Webhook received: ${JSON.stringify(data)}`, 'info');
        
        // Show notification based on webhook data
        let message = 'New webhook notification received';
        if (data.customerId) {
          message = `Alert for customer: ${data.customerId}`;
        } else if (data.message) {
          message = data.message;
        }
        
        showNotification(message, 'warning', 8000);
        
        // Handle specific webhook payload structures
        if (data.search_query_id) {
          const link = `https://greataml.com/search/searchdecision/${data.search_query_id}`;
          showPopup('New search result available:', link);
        }
        
      } catch (error) {
        logMessage(`Error parsing webhook data: ${error.message}`, 'error');
      }
    };
    
    // Connection error or closed
    eventSource.onerror = function(event) {
      const wasConnected = connectionState.isConnected;
      connectionState.isConnected = false;
      connectionState.isConnecting = false;
      
      // Only log connection lost if we were previously connected
      if (wasConnected) {
        logMessage('Event stream connection lost', 'error');
        updateConnectionStatus(false);
      } else {
        logMessage(`Connection failed (attempt ${attemptNumber})`, 'error');
      }
      
      // Close the current connection
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      // Only attempt reconnection if we should reconnect and haven't exceeded max attempts
      if (connectionState.shouldReconnect && connectionState.reconnectAttempts < connectionState.maxReconnectAttempts) {
        scheduleReconnect();
      } else if (connectionState.reconnectAttempts >= connectionState.maxReconnectAttempts) {
        logMessage('Max reconnection attempts reached', 'error');
        showNotification('Connection failed permanently. Please refresh the page.', 'error', 10000);
      }
    };
    
  } catch (error) {
    connectionState.isConnecting = false;
    logMessage(`Failed to create EventSource: ${error.message}`, 'error');
    scheduleReconnect();
  }
}

// Schedule reconnection with exponential backoff
function scheduleReconnect() {
  if (connectionState.reconnectTimer) {
    clearTimeout(connectionState.reconnectTimer);
  }
  
  connectionState.reconnectAttempts++;
  const delay = getReconnectDelay();
  
  logMessage(`Scheduling reconnection in ${Math.round(delay/1000)}s (attempt ${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts})`, 'info');
  showNotification(`Connection lost. Retrying in ${Math.round(delay/1000)} seconds...`, 'warning', delay);
  
  connectionState.reconnectTimer = setTimeout(() => {
    connectionState.reconnectTimer = null;
    setupEventSource();
  }, delay);
}

// Manual reconnection function (for user-triggered reconnects)
function forceReconnect() {
  logMessage('Manual reconnection requested', 'info');
  
  // Reset connection state for manual reconnect
  connectionState.shouldReconnect = true;
  connectionState.reconnectAttempts = Math.max(0, connectionState.reconnectAttempts - 2); // Give some attempts back
  
  if (connectionState.reconnectTimer) {
    clearTimeout(connectionState.reconnectTimer);
    connectionState.reconnectTimer = null;
  }
  
  setupEventSource();
}

// Stop all reconnection attempts
function stopReconnecting() {
  logMessage('Stopping all reconnection attempts', 'info');
  connectionState.shouldReconnect = false;
  
  if (connectionState.reconnectTimer) {
    clearTimeout(connectionState.reconnectTimer);
    connectionState.reconnectTimer = null;
  }
  
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  
  updateConnectionStatus(false);
}

// Enhanced connection status indicator with retry button
function updateConnectionStatus(connected) {
  const status = document.getElementById('connectionStatus');
  if (!status) return;

  if (connected) {
    status.style.background = '#28a745';
    status.innerHTML = '● Connected';
    status.onclick = null; // Remove click handler when connected
    status.style.cursor = 'default';
  } else {
    status.style.background = '#dc3545';
    status.innerHTML = connectionState.isConnecting ? '● Connecting...' : '● Disconnected (Click to retry)';
    status.style.cursor = 'pointer';
    status.onclick = forceReconnect;
  }
}

// Enhanced notification creation with connection controls
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

  // Create log panel with connection controls
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
  logHeader.innerHTML = `
    System Log 
    <span style="float: right;">
      <button onclick="document.getElementById('logContent').innerHTML = ''; logMessage('Log cleared', 'info');" 
              style="font-size: 10px; padding: 2px 6px; background: #333; color: white; border: 1px solid #666; border-radius: 3px; cursor: pointer; margin-right: 5px;">
        Clear
      </button>
      <button onclick="forceReconnect()" 
              style="font-size: 10px; padding: 2px 6px; background: #333; color: white; border: 1px solid #666; border-radius: 3px; cursor: pointer; margin-right: 5px;">
        Reconnect
      </button>
      <button onclick="stopReconnecting()" 
              style="font-size: 10px; padding: 2px 6px; background: #333; color: white; border: 1px solid #666; border-radius: 3px; cursor: pointer;">
        Stop
      </button>
    </span>
  `;
  logHeader.style.cssText = `
    background: #333;
    color: white;
    padding: 5px 10px;
    margin: -10px -10px 10px -10px;
    border-radius: 3px 3px 0 0;
    font-weight: bold;
    text-align: left;
    font-size: 11px;
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
    cursor: pointer;
  `;
  connectionStatus.textContent = '● Disconnected';
  document.body.appendChild(connectionStatus);
}

// Make functions available globally
window.forceReconnect = forceReconnect;
window.stopReconnecting = stopReconnecting;

// Enhanced page load initialization
document.addEventListener('DOMContentLoaded', function() {
  logMessage('Application initialized', 'info');
  createNotificationElements();
  
  // Add connection info to initial log
  logMessage(`Max reconnect attempts: ${connectionState.maxReconnectAttempts}`, 'info');
  logMessage(`Initial reconnect delay: ${connectionState.reconnectDelay}ms`, 'info');
  
  setupEventSource();
});

// Enhanced cleanup on page unload
window.addEventListener('beforeunload', function() {
  logMessage('Page unloading, cleaning up connections...', 'info');
  stopReconnecting();
});

// Add visibility change handling to pause/resume connections when tab is not visible
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    logMessage('Tab hidden, pausing reconnection attempts', 'info');
    connectionState.shouldReconnect = false;
    if (connectionState.reconnectTimer) {
      clearTimeout(connectionState.reconnectTimer);
      connectionState.reconnectTimer = null;
    }
  } else {
    logMessage('Tab visible, resuming connection monitoring', 'info');
    connectionState.shouldReconnect = true;
    if (!connectionState.isConnected && !connectionState.isConnecting) {
      logMessage('Connection lost while tab was hidden, attempting to reconnect...', 'info');
      setupEventSource();
    }
  }
});