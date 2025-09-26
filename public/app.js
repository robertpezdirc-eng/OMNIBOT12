// Global variables
let currentPage = 'home';
const output = document.getElementById('output');

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Omnia App initialized');
    initializeNavigation();
    initializeAPITesting();
    checkServerStatus();
    
    // Check status every 30 seconds
    setInterval(checkServerStatus, 30000);
});

// Navigation System
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPage = button.getAttribute('data-page');
            navigateToPage(targetPage);
        });
    });
}

function navigateToPage(pageName) {
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageName) {
            btn.classList.add('active');
        }
    });

    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        if (page.id === pageName) {
            page.classList.add('active');
        }
    });

    currentPage = pageName;
    console.log(`Navigated to: ${pageName}`);
}

// API Testing System
function initializeAPITesting() {
    document.getElementById('test-api').addEventListener('click', testAPI);
    document.getElementById('send-data').addEventListener('click', sendTestData);
    document.getElementById('check-status').addEventListener('click', checkServerStatus);
}

async function testAPI() {
    try {
        showLoading();
        const response = await fetch('/api/test');
        const data = await response.json();
        
        displayOutput({
            type: 'API Test',
            status: 'Success',
            data: data,
            timestamp: new Date().toLocaleString('sl-SI')
        });
        
        console.log('API test successful:', data);
    } catch (error) {
        displayOutput({
            type: 'API Test',
            status: 'Error',
            error: error.message,
            timestamp: new Date().toLocaleString('sl-SI')
        });
        
        console.error('API test failed:', error);
    }
}

async function sendTestData() {
    try {
        showLoading();
        const testData = {
            user: 'Test User',
            action: 'button_click',
            page: currentPage,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language
        };

        const response = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        const data = await response.json();
        
        displayOutput({
            type: 'Data Send',
            status: 'Success',
            sent: testData,
            received: data,
            timestamp: new Date().toLocaleString('sl-SI')
        });
        
        console.log('Data sent successfully:', data);
    } catch (error) {
        displayOutput({
            type: 'Data Send',
            status: 'Error',
            error: error.message,
            timestamp: new Date().toLocaleString('sl-SI')
        });
        
        console.error('Data send failed:', error);
    }
}

async function checkServerStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        updateStatusIndicator('online', `Server online - ${data.status}`);
        
        if (output && currentPage === 'home') {
            displayOutput({
                type: 'Status Check',
                status: 'Online',
                data: data,
                timestamp: new Date().toLocaleString('sl-SI')
            });
        }
        
        console.log('Server status:', data);
    } catch (error) {
        updateStatusIndicator('offline', 'Server offline');
        
        if (output && currentPage === 'home') {
            displayOutput({
                type: 'Status Check',
                status: 'Offline',
                error: error.message,
                timestamp: new Date().toLocaleString('sl-SI')
            });
        }
        
        console.error('Status check failed:', error);
    }
}

// UI Helper Functions
function showLoading() {
    if (output) {
        output.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Nalagam...</div>
            </div>
        `;
    }
}

function displayOutput(data) {
    if (!output) return;

    const outputHTML = `
        <div class="output-item ${data.status.toLowerCase()}">
            <div class="output-header">
                <span class="output-type">${data.type}</span>
                <span class="output-status status-${data.status.toLowerCase()}">${data.status}</span>
                <span class="output-timestamp">${data.timestamp}</span>
            </div>
            <div class="output-content">
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    `;
    
    output.innerHTML = outputHTML;
}

function updateStatusIndicator(status, message) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (statusDot && statusText) {
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = message;
    }
}

// Utility Functions
function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Kopirano v odložišče!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showNotification('Kopiranje ni uspelo', 'error');
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Alt + 1-6 for quick navigation
    if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const pages = ['home', 'multimodal', 'personalization', 'global', 'versatility', 'simplicity'];
        const pageIndex = parseInt(e.key) - 1;
        if (pages[pageIndex]) {
            navigateToPage(pages[pageIndex]);
        }
    }
    
    // Ctrl/Cmd + T for API test
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        testAPI();
    }
    
    // Ctrl/Cmd + D for data send
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        sendTestData();
    }
    
    // F5 for status check
    if (e.key === 'F5') {
        e.preventDefault();
        checkServerStatus();
    }
});

// Handle iframe communication
window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) return;
    
    console.log('Received message from iframe:', event.data);
    
    if (event.data.type === 'navigation') {
        navigateToPage(event.data.page);
    }
});

// Export functions for global access
window.navigateToPage = navigateToPage;
window.testAPI = testAPI;
window.sendTestData = sendTestData;
window.checkServerStatus = checkServerStatus;