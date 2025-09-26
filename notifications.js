// Omni AI Platform - Notifications System
console.log('Notifications module loading...');

// Notification configuration
const NotificationConfig = {
    position: 'top-right', // top-left, top-right, bottom-left, bottom-right, center
    duration: 5000, // Default duration in milliseconds
    maxNotifications: 5, // Maximum number of notifications to show at once
    animation: {
        duration: 300,
        easing: 'ease-in-out'
    },
    types: {
        success: {
            icon: '✓',
            color: '#28a745',
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb'
        },
        error: {
            icon: '✕',
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            borderColor: '#f5c6cb'
        },
        warning: {
            icon: '⚠',
            color: '#ffc107',
            backgroundColor: '#fff3cd',
            borderColor: '#ffeaa7'
        },
        info: {
            icon: 'ℹ',
            color: '#17a2b8',
            backgroundColor: '#d1ecf1',
            borderColor: '#bee5eb'
        }
    }
};

// Notification state management
const NotificationState = {
    notifications: [],
    container: null,
    nextId: 1,
    soundEnabled: true,
    browserNotifications: false
};

// Initialize notifications when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing notifications system...');
    initializeNotifications();
});

function initializeNotifications() {
    try {
        // Create notification container
        createNotificationContainer();
        
        // Request browser notification permission
        requestBrowserNotificationPermission();
        
        // Setup global notification function
        setupGlobalNotificationFunction();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        console.log('Notifications system initialized successfully');
        
    } catch (error) {
        console.error('Error initializing notifications:', error);
    }
}

function createNotificationContainer() {
    // Remove existing container if it exists
    const existingContainer = document.getElementById('notification-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // Create new container
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = `notification-container ${NotificationConfig.position}`;
    
    // Add CSS styles
    container.style.cssText = `
        position: fixed;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
        width: 100%;
    `;
    
    // Position the container
    setContainerPosition(container);
    
    document.body.appendChild(container);
    NotificationState.container = container;
}

function setContainerPosition(container) {
    const position = NotificationConfig.position;
    
    // Reset all positions
    container.style.top = 'auto';
    container.style.bottom = 'auto';
    container.style.left = 'auto';
    container.style.right = 'auto';
    
    switch (position) {
        case 'top-left':
            container.style.top = '20px';
            container.style.left = '20px';
            break;
        case 'top-right':
            container.style.top = '20px';
            container.style.right = '20px';
            break;
        case 'bottom-left':
            container.style.bottom = '20px';
            container.style.left = '20px';
            break;
        case 'bottom-right':
            container.style.bottom = '20px';
            container.style.right = '20px';
            break;
        case 'center':
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            break;
        default:
            container.style.top = '20px';
            container.style.right = '20px';
    }
}

function showNotification(message, type = 'info', options = {}) {
    try {
        // Validate parameters
        if (!message || typeof message !== 'string') {
            console.error('Invalid notification message');
            return null;
        }
        
        // Merge options with defaults
        const notificationOptions = {
            duration: NotificationConfig.duration,
            persistent: false,
            actions: [],
            sound: true,
            browserNotification: false,
            ...options
        };
        
        // Create notification object
        const notification = {
            id: NotificationState.nextId++,
            message: message,
            type: type,
            timestamp: Date.now(),
            options: notificationOptions,
            element: null
        };
        
        // Create notification element
        const element = createNotificationElement(notification);
        notification.element = element;
        
        // Add to state
        NotificationState.notifications.push(notification);
        
        // Add to DOM
        addNotificationToDOM(element);
        
        // Manage notification limit
        manageNotificationLimit();
        
        // Auto-remove if not persistent
        if (!notificationOptions.persistent) {
            setTimeout(() => {
                removeNotification(notification.id);
            }, notificationOptions.duration);
        }
        
        // Play sound if enabled
        if (notificationOptions.sound && NotificationState.soundEnabled) {
            playNotificationSound(type);
        }
        
        // Show browser notification if enabled
        if (notificationOptions.browserNotification && NotificationState.browserNotifications) {
            showBrowserNotification(message, type);
        }
        
        console.log(`Notification shown: ${message} (${type})`);
        return notification.id;
        
    } catch (error) {
        console.error('Error showing notification:', error);
        return null;
    }
}

function createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type}`;
    element.setAttribute('data-notification-id', notification.id);
    
    // Get type configuration
    const typeConfig = NotificationConfig.types[notification.type] || NotificationConfig.types.info;
    
    // Create notification HTML
    element.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${typeConfig.icon}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-actions">
                ${createActionButtons(notification.options.actions)}
                <button class="notification-close" onclick="removeNotification(${notification.id})">×</button>
            </div>
        </div>
        <div class="notification-progress"></div>
    `;
    
    // Apply styles
    applyNotificationStyles(element, typeConfig);
    
    // Add event listeners
    addNotificationEventListeners(element, notification);
    
    return element;
}

function applyNotificationStyles(element, typeConfig) {
    element.style.cssText = `
        background-color: ${typeConfig.backgroundColor};
        border: 1px solid ${typeConfig.borderColor};
        border-left: 4px solid ${typeConfig.color};
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 10px;
        padding: 0;
        pointer-events: auto;
        position: relative;
        transform: translateX(100%);
        transition: all ${NotificationConfig.animation.duration}ms ${NotificationConfig.animation.easing};
        opacity: 0;
        max-width: 100%;
        overflow: hidden;
    `;
    
    // Content styles
    const content = element.querySelector('.notification-content');
    if (content) {
        content.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px 16px;
            gap: 12px;
        `;
    }
    
    // Icon styles
    const icon = element.querySelector('.notification-icon');
    if (icon) {
        icon.style.cssText = `
            color: ${typeConfig.color};
            font-size: 18px;
            font-weight: bold;
            flex-shrink: 0;
        `;
    }
    
    // Message styles
    const message = element.querySelector('.notification-message');
    if (message) {
        message.style.cssText = `
            flex: 1;
            font-size: 14px;
            line-height: 1.4;
            color: #333;
        `;
    }
    
    // Actions styles
    const actions = element.querySelector('.notification-actions');
    if (actions) {
        actions.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        `;
    }
    
    // Close button styles
    const closeBtn = element.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
    }
    
    // Progress bar styles
    const progress = element.querySelector('.notification-progress');
    if (progress) {
        progress.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background-color: ${typeConfig.color};
            width: 100%;
            transform-origin: left;
            animation: notificationProgress ${NotificationConfig.duration}ms linear;
        `;
    }
}

function createActionButtons(actions) {
    if (!actions || actions.length === 0) return '';
    
    return actions.map(action => `
        <button class="notification-action" onclick="${action.handler}" style="
            background: #007bff;
            border: none;
            border-radius: 3px;
            color: white;
            cursor: pointer;
            font-size: 12px;
            padding: 4px 8px;
        ">${action.label}</button>
    `).join('');
}

function addNotificationEventListeners(element, notification) {
    // Hover to pause auto-removal
    element.addEventListener('mouseenter', () => {
        element.style.animationPlayState = 'paused';
    });
    
    element.addEventListener('mouseleave', () => {
        element.style.animationPlayState = 'running';
    });
    
    // Click to focus
    element.addEventListener('click', (e) => {
        if (!e.target.classList.contains('notification-close') && 
            !e.target.classList.contains('notification-action')) {
            focusNotification(notification.id);
        }
    });
}

function addNotificationToDOM(element) {
    if (!NotificationState.container) {
        createNotificationContainer();
    }
    
    // Add to container
    if (NotificationConfig.position.includes('top')) {
        NotificationState.container.appendChild(element);
    } else {
        NotificationState.container.insertBefore(element, NotificationState.container.firstChild);
    }
    
    // Trigger animation
    requestAnimationFrame(() => {
        element.style.transform = 'translateX(0)';
        element.style.opacity = '1';
    });
}

function removeNotification(notificationId) {
    try {
        const notification = NotificationState.notifications.find(n => n.id === notificationId);
        if (!notification || !notification.element) return;
        
        // Animate out
        notification.element.style.transform = 'translateX(100%)';
        notification.element.style.opacity = '0';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            
            // Remove from state
            const index = NotificationState.notifications.findIndex(n => n.id === notificationId);
            if (index > -1) {
                NotificationState.notifications.splice(index, 1);
            }
        }, NotificationConfig.animation.duration);
        
        console.log(`Notification removed: ${notificationId}`);
        
    } catch (error) {
        console.error('Error removing notification:', error);
    }
}

function manageNotificationLimit() {
    while (NotificationState.notifications.length > NotificationConfig.maxNotifications) {
        const oldestNotification = NotificationState.notifications[0];
        removeNotification(oldestNotification.id);
    }
}

function focusNotification(notificationId) {
    const notification = NotificationState.notifications.find(n => n.id === notificationId);
    if (notification && notification.element) {
        notification.element.style.transform = 'scale(1.02)';
        setTimeout(() => {
            notification.element.style.transform = 'scale(1)';
        }, 200);
    }
}

function clearAllNotifications() {
    const notificationIds = NotificationState.notifications.map(n => n.id);
    notificationIds.forEach(id => removeNotification(id));
}

function playNotificationSound(type) {
    try {
        // Create audio context if not exists
        if (!window.audioContext) {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Generate different tones for different types
        const frequencies = {
            success: 800,
            error: 400,
            warning: 600,
            info: 500
        };
        
        const frequency = frequencies[type] || frequencies.info;
        
        // Create and play tone
        const oscillator = window.audioContext.createOscillator();
        const gainNode = window.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(window.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, window.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, window.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, window.audioContext.currentTime + 0.3);
        
        oscillator.start(window.audioContext.currentTime);
        oscillator.stop(window.audioContext.currentTime + 0.3);
        
    } catch (error) {
        console.log('Could not play notification sound:', error);
    }
}

function requestBrowserNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                NotificationState.browserNotifications = (permission === 'granted');
                console.log(`Browser notifications: ${permission}`);
            });
        } else {
            NotificationState.browserNotifications = (Notification.permission === 'granted');
        }
    }
}

function showBrowserNotification(message, type) {
    if (!NotificationState.browserNotifications || !('Notification' in window)) return;
    
    try {
        const typeConfig = NotificationConfig.types[type] || NotificationConfig.types.info;
        
        const notification = new Notification('Omni AI Platform', {
            body: message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `omni-${type}`,
            requireInteraction: type === 'error'
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
        
    } catch (error) {
        console.error('Error showing browser notification:', error);
    }
}

function setupGlobalNotificationFunction() {
    // Make showNotification globally available
    window.showNotification = showNotification;
    window.removeNotification = removeNotification;
    window.clearAllNotifications = clearAllNotifications;
    
    // Convenience functions
    window.showSuccess = (message, options) => showNotification(message, 'success', options);
    window.showError = (message, options) => showNotification(message, 'error', options);
    window.showWarning = (message, options) => showNotification(message, 'warning', options);
    window.showInfo = (message, options) => showNotification(message, 'info', options);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Shift + N to clear all notifications
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
            e.preventDefault();
            clearAllNotifications();
            showNotification('Vsa obvestila počiščena', 'info');
        }
        
        // Escape to close latest notification
        if (e.key === 'Escape' && NotificationState.notifications.length > 0) {
            const latestNotification = NotificationState.notifications[NotificationState.notifications.length - 1];
            removeNotification(latestNotification.id);
        }
    });
}

// Add CSS animations
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes notificationProgress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
        }
        
        .notification:hover .notification-progress {
            animation-play-state: paused;
        }
        
        .notification-action:hover {
            background-color: #0056b3 !important;
        }
        
        .notification-close:hover {
            color: #333 !important;
            background-color: rgba(0, 0, 0, 0.1);
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);
}

// Notification templates for common scenarios
const NotificationTemplates = {
    systemUpdate: (version) => showNotification(
        `Sistem posodobljen na različico ${version}`, 
        'success',
        { duration: 8000 }
    ),
    
    connectionLost: () => showNotification(
        'Povezava s strežnikom prekinjena. Poskušam ponovno povezavo...', 
        'warning',
        { persistent: true }
    ),
    
    connectionRestored: () => showNotification(
        'Povezava s strežnikom obnovljena', 
        'success'
    ),
    
    dataSync: (count) => showNotification(
        `Sinhronizirano ${count} zapisov`, 
        'info'
    ),
    
    taskCompleted: (taskName) => showNotification(
        `Naloga "${taskName}" uspešno dokončana`, 
        'success'
    ),
    
    taskFailed: (taskName, error) => showNotification(
        `Napaka pri nalogi "${taskName}": ${error}`, 
        'error',
        { duration: 10000 }
    ),
    
    moduleLoaded: (moduleName) => showNotification(
        `Modul ${moduleName} naložen`, 
        'info',
        { duration: 3000 }
    ),
    
    settingsSaved: () => showNotification(
        'Nastavitve shranjene', 
        'success',
        { duration: 3000 }
    )
};

// Public API
const NotificationsManager = {
    show: showNotification,
    remove: removeNotification,
    clear: clearAllNotifications,
    templates: NotificationTemplates,
    config: NotificationConfig,
    state: NotificationState,
    setPosition: (position) => {
        NotificationConfig.position = position;
        if (NotificationState.container) {
            setContainerPosition(NotificationState.container);
        }
    },
    setSoundEnabled: (enabled) => {
        NotificationState.soundEnabled = enabled;
    },
    setBrowserNotifications: (enabled) => {
        NotificationState.browserNotifications = enabled;
        if (enabled) {
            requestBrowserNotificationPermission();
        }
    }
};

// Export for global access
window.NotificationsManager = NotificationsManager;

// Add CSS styles
addNotificationStyles();

// Auto-initialize if main app is already loaded
if (typeof window.OmniApp !== 'undefined') {
    // Show welcome notification
    setTimeout(() => {
        showNotification('Omni AI Platform pripravljen za uporabo', 'success');
    }, 1000);
}

console.log('Notifications module loaded successfully');