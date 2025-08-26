let authToken = null;
let tenantName = null;

// Visible fields per process
const visibleTemplates = {
  PP: {
    decentralized: ['firstName','lastName','birthDate','citizenship','nationality'],
    centralized: ['firstName','lastName','birthDate','nationality','citizenship','systemId','systemName','searchQuerySource','queueName']
  },
  PM: {
    decentralized: ['businessName'], // adjust if needed
    centralized: ['systemName','systemId','businessName','searchQuerySource']
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

// --- Authentication ---
const authBtn = document.getElementById('authBtn');
authBtn.addEventListener('click', async () => {
  tenantName = document.getElementById('tenantName').value;
  const user_name = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!tenantName || !user_name || !password) { 
    alert('Select tenant and enter credentials'); 
    return; 
  }

  try {
    const res = await fetch('https://greataml.com/kyc-web-restful/xauth/authenticate/', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-auth-tenant': tenantName },
      body: JSON.stringify({ user_name, password })
    });

    const data = await res.json();
    if (!res.ok) { 
      alert('Authentication failed!'); 
      return; 
    }

    authToken = data.token;
    alert('Authenticated successfully!');
  } catch(err) {
    alert('Authentication failed!');
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

  // Render fields for Centralized if tab is centralized
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

  // Render fields if entity type selected
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
  if (!entityType) return;

  const fields = visibleTemplates[entityType]?.[processType] || [];
  fields.forEach(field => {
    const label = document.createElement('label');
    label.textContent = field + ':';

    let input = document.createElement('input');
    input.id = containerId + '_' + field;
    input.type = (field === 'birthDate') ? 'date' : 'text';

    container.appendChild(label);
    container.appendChild(input);
  });
}

// --- Popup function ---
function showPopup(message, link = '') {
  const popup = document.getElementById('popup');
  const overlay = document.getElementById('overlay');
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
  overlay.style.display = 'block';

  if (link) popupLink.select();
}

// Close popup button
document.getElementById('closePopup').addEventListener('click', () => {
  document.getElementById('popup').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
});

// --- Call searchPersonCustomer ---
async function callSearch(entityType, containerId, responseId, isDecentralized = false) {
  if (!tenantName || !authToken) { alert('Authenticate first!'); return; }
  let payload = {};

  document.querySelectorAll(`#${containerId} input`).forEach(input => {
    payload[input.id.replace(containerId+'_','')] = input.value;
  });

  Object.assign(payload, defaultValues[entityType] || {});

  try {
    const res = await fetch('https://greataml.com/kyc-web-restful/search/searchPersonCustomer', {
      method:'POST',
      headers:{ 'Content-Type':'application/json','x-auth-tenant':tenantName,'x-auth-token':authToken },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    document.getElementById(responseId).textContent = JSON.stringify(data,null,2);

    // --- Decentralized popup ---
    if (isDecentralized) {
      if (data.maxScore && data.maxScore > 0) {
        const link = `https://greataml.com/search/searchdecision/${data.search_query_id}`;
        showPopup('You can treat the hits via this link:', link);
      } else {
        showPopup("Your customer doesn't have any hits.");
      }
    }
  } catch(err) { document.getElementById(responseId).textContent = `Error: ${err.message}`; }
}

// --- Button Events ---
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



const evtSource = new EventSource('/events'); // server sends updates
evtSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  alert(`Alert treated for customer ${data.customerId}`);
};
