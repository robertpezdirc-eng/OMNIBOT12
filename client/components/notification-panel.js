/**
 * Notification Panel Component
 * Prikazuje obvestila o licencah in omogoča upravljanje
 */

class NotificationPanel {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isVisible = false;
    this.clientId = null;
    
    this.init();
  }

  async init() {
    try {
      // Pridobi client ID
      this.clientId = await window.electronAPI.invoke('get-client-id');
      
      // Ustvari UI komponente
      this.createNotificationUI();
      
      // Naloži obvestila
      await this.loadNotifications();
      
      // Nastavi periodično preverjanje
      this.startPeriodicCheck();
      
      console.log('✅ Notification panel initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification panel:', error);
    }
  }

  createNotificationUI() {
    // Ustvari notification bell ikono
    const notificationBell = document.createElement('div');
    notificationBell.id = 'notification-bell';
    notificationBell.className = 'notification-bell';
    notificationBell.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
    `;
    
    // Ustvari notification panel
    const notificationPanel = document.createElement('div');
    notificationPanel.id = 'notification-panel';
    notificationPanel.className = 'notification-panel hidden';
    notificationPanel.innerHTML = `
      <div class="notification-header">
        <h3>Obvestila</h3>
        <div class="notification-actions">
          <button id="mark-all-read" class="btn-secondary">Označi vse kot prebrano</button>
          <button id="close-notifications" class="btn-close">×</button>
        </div>
      </div>
      <div class="notification-list" id="notification-list">
        <div class="notification-empty">
          <p>Ni novih obvestil</p>
        </div>
      </div>
      <div class="notification-footer">
        <div class="notification-stats" id="notification-stats"></div>
      </div>
    `;

    // Dodaj v DOM
    const header = document.querySelector('.header') || document.body;
    header.appendChild(notificationBell);
    document.body.appendChild(notificationPanel);

    // Dodaj event listener-je
    this.attachEventListeners();
  }

  attachEventListeners() {
    const bell = document.getElementById('notification-bell');
    const panel = document.getElementById('notification-panel');
    const closeBtn = document.getElementById('close-notifications');
    const markAllReadBtn = document.getElementById('mark-all-read');

    // Toggle panel
    bell.addEventListener('click', () => {
      this.togglePanel();
    });

    // Zapri panel
    closeBtn.addEventListener('click', () => {
      this.hidePanel();
    });

    // Označi vse kot prebrano
    markAllReadBtn.addEventListener('click', async () => {
      await this.markAllAsRead();
    });

    // Zapri panel ob kliku zunaj
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !bell.contains(e.target)) {
        this.hidePanel();
      }
    });
  }

  async loadNotifications() {
    try {
      if (!this.clientId) return;

      // Pridobi obvestila
      this.notifications = await window.electronAPI.invoke('notifications:get-all', this.clientId);
      
      // Pridobi število neprebranih
      this.unreadCount = await window.electronAPI.invoke('notifications:get-unread-count', this.clientId);
      
      // Posodobi UI
      this.updateUI();
      
    } catch (error) {
      console.error('Napaka pri nalaganju obvestil:', error);
    }
  }

  updateUI() {
    this.updateBadge();
    this.updateNotificationList();
    this.updateStats();
  }

  updateBadge() {
    const badge = document.getElementById('notification-badge');
    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  updateNotificationList() {
    const list = document.getElementById('notification-list');
    
    if (this.notifications.length === 0) {
      list.innerHTML = `
        <div class="notification-empty">
          <p>Ni novih obvestil</p>
        </div>
      `;
      return;
    }

    const notificationsHTML = this.notifications.map(notification => {
      const isUnread = notification.status === 'pending';
      const typeIcon = this.getNotificationIcon(notification.type);
      const timeAgo = this.getTimeAgo(new Date(notification.createdAt));
      
      return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification._id}">
          <div class="notification-icon ${notification.type}">
            ${typeIcon}
          </div>
          <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${timeAgo}</div>
          </div>
          <div class="notification-actions">
            ${isUnread ? `<button class="btn-mark-read" data-id="${notification._id}">Prebrano</button>` : ''}
            <button class="btn-dismiss" data-id="${notification._id}">Zavrzi</button>
          </div>
        </div>
      `;
    }).join('');

    list.innerHTML = notificationsHTML;

    // Dodaj event listener-je za akcije
    this.attachNotificationActions();
  }

  attachNotificationActions() {
    const list = document.getElementById('notification-list');
    
    // Mark as read buttons
    list.querySelectorAll('.btn-mark-read').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const notificationId = btn.dataset.id;
        await this.markAsRead(notificationId);
      });
    });

    // Dismiss buttons
    list.querySelectorAll('.btn-dismiss').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const notificationId = btn.dataset.id;
        await this.dismissNotification(notificationId);
      });
    });
  }

  updateStats() {
    const statsElement = document.getElementById('notification-stats');
    const total = this.notifications.length;
    const unread = this.unreadCount;
    const read = total - unread;
    
    statsElement.innerHTML = `
      <span>Skupaj: ${total}</span>
      <span>Neprebrana: ${unread}</span>
      <span>Prebrana: ${read}</span>
    `;
  }

  getNotificationIcon(type) {
    const icons = {
      'license_expiring': '⏰',
      'license_expired': '❌',
      'license_revoked': '🚫',
      'payment_failed': '💳',
      'system_update': '🔄',
      'security_alert': '🔒'
    };
    return icons[type] || '📢';
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Pravkar';
    if (diffMins < 60) return `${diffMins} min nazaj`;
    if (diffHours < 24) return `${diffHours} ur nazaj`;
    if (diffDays < 7) return `${diffDays} dni nazaj`;
    
    return date.toLocaleDateString('sl-SI');
  }

  async markAsRead(notificationId) {
    try {
      const success = await window.electronAPI.invoke('notifications:mark-as-read', notificationId);
      if (success) {
        await this.loadNotifications();
      }
    } catch (error) {
      console.error('Napaka pri označevanju obvestila kot prebrano:', error);
    }
  }

  async markAllAsRead() {
    try {
      if (!this.clientId) return;
      
      const success = await window.electronAPI.invoke('notifications:mark-all-as-read', this.clientId);
      if (success) {
        await this.loadNotifications();
      }
    } catch (error) {
      console.error('Napaka pri označevanju vseh obvestil kot prebrana:', error);
    }
  }

  async dismissNotification(notificationId) {
    try {
      const success = await window.electronAPI.invoke('notifications:dismiss', notificationId);
      if (success) {
        await this.loadNotifications();
      }
    } catch (error) {
      console.error('Napaka pri zavračanju obvestila:', error);
    }
  }

  togglePanel() {
    if (this.isVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    const panel = document.getElementById('notification-panel');
    panel.classList.remove('hidden');
    this.isVisible = true;
    
    // Osveži obvestila ob odprtju
    this.loadNotifications();
  }

  hidePanel() {
    const panel = document.getElementById('notification-panel');
    panel.classList.add('hidden');
    this.isVisible = false;
  }

  startPeriodicCheck() {
    // Preveri nova obvestila vsakih 30 sekund
    setInterval(async () => {
      if (!this.isVisible) {
        await this.loadNotifications();
      }
    }, 30000);
  }

  // Javne metode za zunanje upravljanje
  async refresh() {
    await this.loadNotifications();
  }

  getUnreadCount() {
    return this.unreadCount;
  }

  hasUnreadNotifications() {
    return this.unreadCount > 0;
  }
}

// Izvozi razred
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationPanel;
} else {
  window.NotificationPanel = NotificationPanel;
}