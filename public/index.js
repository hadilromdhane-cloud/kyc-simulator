let authToken = null;
let tenantName = null;

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
    decentralized: ['First Name','Last Name','Birth Date','Citizenship','Nationality'],
    centralized: ['First Name','Last Name','Birth Date','Nationality','Citizenship','SystemId','SystemName','SearchQuerySource','Queue Name']
  },
  PM: {
    decentralized: ['Business Name'], // 
    centralized: ['Business Name','SystemName','SystemId','searchQuerySource']
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
    
    let input;

    // Make dropdown for Citizenship/Nationality
    if (field === 'Citizenship' || field === 'Nationality') {
      input = document.createElement('select');
      input.id = containerId + '_' + field;
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
      input.id = containerId + '_' + field;
      input.type = (field === 'Birth Date') ? 'date' : 'text';
    }

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
