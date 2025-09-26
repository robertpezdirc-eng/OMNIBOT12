const axios = require('axios');
const { io } = require('socket.io-client');

const API_URL = 'http://localhost:3002/api/license';
const licenseTable = document.getElementById('license_table');
const statisticsDiv = document.getElementById('statistics');

// WebSocket povezava
let socket = null;

// Inicializacija
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    loadLicenses();
    loadStatistics();
    
    // Event listeners
    document.getElementById('create').addEventListener('click', createLicense);
    document.getElementById('refresh').addEventListener('click', () => {
        loadLicenses();
        loadStatistics();
    });
});

// Inicializiraj WebSocket povezavo
function initWebSocket() {
    try {
        console.log('🔌 Vzpostavljanje WebSocket povezave...');
        socket = io('http://localhost:3002');

        socket.on('connect', () => {
            console.log('✅ Admin GUI: WebSocket povezava vzpostavljena');
        });

        socket.on('disconnect', () => {
            console.log('⚠️ Admin GUI: WebSocket povezava prekinjena');
        });

        socket.on('license_update', (license) => {
            console.log('📡 Admin GUI: Prejeta posodobitev licence:', license.client_id);
            
            // Osveži tabelo licenc in statistike
            loadLicenses();
            loadStatistics();
        });

        socket.on('connect_error', (error) => {
            console.log('❌ Admin GUI: Napaka pri WebSocket povezavi:', error.message);
        });

    } catch (error) {
        console.log('❌ Admin GUI: Napaka pri inicializaciji WebSocket:', error.message);
    }
}

// Naloži in prikaži licence
async function loadLicenses() {
    try {
        console.log('Nalagam licence...');
        const res = await axios.get(`${API_URL}/all`);
        console.log('Licence naložene:', res.data);
        
        licenseTable.innerHTML = '';
        
        if (Array.isArray(res.data)) {
            res.data.forEach(license => {
                const row = document.createElement('tr');
                
                const statusClass = license.status === 'active' ? 'active' : 'inactive';
                const validityText = license.is_valid ? '✅ Veljavna' : '❌ Neveljavna';
                
                row.innerHTML = `
                    <td>${license.client_id}</td>
                    <td>${license.plan}</td>
                    <td>${license.expires_at}</td>
                    <td class="${statusClass}">${license.status}</td>
                    <td>${license.active_modules ? license.active_modules.join(', ') : 'N/A'}</td>
                    <td>
                        <button onclick="toggleStatus('${license.client_id}')" class="btn-toggle">
                            ${license.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj'}
                        </button>
                        <button onclick="extendLicense('${license.client_id}')" class="btn-extend">
                            Podaljšaj
                        </button>
                        <button onclick="deleteLicense('${license.client_id}')" class="btn-delete">
                            Briši
                        </button>
                    </td>
                `;
                licenseTable.appendChild(row);
            });
        } else {
            console.error('Nepričakovana struktura podatkov:', res.data);
        }
        
    } catch (err) {
        console.error('Napaka pri nalaganju licenc:', err);
        showError('Napaka pri nalaganju licenc: ' + (err.response?.data?.message || err.message));
    }
}

// Naloži statistike
async function loadStatistics() {
    try {
        const res = await axios.get(`${API_URL}/all`);
        
        if (Array.isArray(res.data)) {
            const licenses = res.data;
            const total = licenses.length;
            const active = licenses.filter(l => l.status === 'active').length;
            const expired = licenses.filter(l => !l.is_valid).length;
            
            if (statisticsDiv) {
                statisticsDiv.innerHTML = `
                    <div class="stat-card">
                        <h3>Skupaj licenc</h3>
                        <div class="stat-number">${total}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Aktivne</h3>
                        <div class="stat-number active">${active}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Potekle</h3>
                        <div class="stat-number inactive">${expired}</div>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error('Napaka pri nalaganju statistik:', err);
    }
}

// Ustvari novo licenco
async function createLicense() {
    const client_id = document.getElementById('client_id').value.trim();
    const plan = document.getElementById('plan').value;
    const expires_in = parseInt(document.getElementById('expires_in').value);

    if (!client_id || !expires_in) {
        showError('Vnesi vse podatke!');
        return;
    }

    try {
        console.log('Ustvarjam licenco:', { client_id, plan, expires_in });
        
        const response = await axios.post(`${API_URL}/create`, { 
            client_id, 
            plan, 
            expires_in 
        });
        
        console.log('Licenca ustvarjena:', response.data);
        showSuccess('Licenca uspešno ustvarjena!');
        
        // Počisti obrazec
        document.getElementById('client_id').value = '';
        document.getElementById('expires_in').value = '';
        
        // Osveži seznam
        await loadLicenses();
        await loadStatistics();
        
    } catch (err) {
        console.error('Napaka pri ustvarjanju licence:', err);
        showError('Napaka pri ustvarjanju licence: ' + (err.response?.data?.message || err.message));
    }
}

// Preklopi status licence
async function toggleStatus(client_id) {
    try {
        console.log('Preklapljam status za:', client_id);
        
        const response = await axios.post(`${API_URL}/toggle`, { client_id });
        console.log('Status preklopljen:', response.data);
        
        showSuccess('Status licence uspešno spremenjen!');
        await loadLicenses();
        await loadStatistics();
        
    } catch (err) {
        console.error('Napaka pri preklapljanju statusa:', err);
        showError('Napaka pri preklapljanju statusa: ' + (err.response?.data?.message || err.message));
    }
}

// Briši licenco
async function deleteLicense(client_id) {
    if (!confirm(`Ali ste prepričani, da želite izbrisati licenco ${client_id}?`)) {
        return;
    }
    
    try {
        console.log('Brišem licenco:', client_id);
        
        const response = await axios.delete(`${API_URL}/delete`, { 
            data: { client_id } 
        });
        
        console.log('Licenca izbrisana:', response.data);
        showSuccess('Licenca uspešno izbrisana!');
        
        await loadLicenses();
        await loadStatistics();
        
    } catch (err) {
        console.error('Napaka pri brisanju licence:', err);
        showError('Napaka pri brisanju licence: ' + (err.response?.data?.message || err.message));
    }
}

// Podaljšaj licenco
async function extendLicense(client_id) {
    const days = prompt('Za koliko dni želite podaljšati licenco?', '30');
    
    if (!days || isNaN(days) || parseInt(days) <= 0) {
        showError('Vnesite veljavno število dni!');
        return;
    }
    
    try {
        console.log('Podaljšujem licenco:', client_id, 'za', days, 'dni');
        
        const response = await axios.post(`${API_URL}/extend`, { 
            client_id, 
            days: parseInt(days) 
        });
        
        console.log('Licenca podaljšana:', response.data);
        showSuccess(`Licenca uspešno podaljšana za ${days} dni!`);
        
        await loadLicenses();
        await loadStatistics();
        
    } catch (err) {
        console.error('Napaka pri podaljševanju licence:', err);
        showError('Napaka pri podaljševanju licence: ' + (err.response?.data?.message || err.message));
    }
}

// Prikaži sporočilo o napaki
function showError(message) {
    const errorDiv = document.getElementById('error-message') || createMessageDiv('error-message', 'error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Prikaži sporočilo o uspehu
function showSuccess(message) {
    const successDiv = document.getElementById('success-message') || createMessageDiv('success-message', 'success');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Ustvari div za sporočila
function createMessageDiv(id, type) {
    const div = document.createElement('div');
    div.id = id;
    div.className = `message ${type}`;
    div.style.display = 'none';
    document.body.insertBefore(div, document.body.firstChild);
    return div;
}