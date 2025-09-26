/**
 * Omni Global Admin Dashboard - JavaScript
 * Comprehensive license management system with real-time updates
 */

class OmniAdminDashboard {
    constructor() {
        // Configuration
        this.config = {
            apiBaseUrl: window.location.protocol === 'https:' 
                ? `https://${window.location.hostname}:3443/api`
                : `http://${window.location.hostname}:3000/api`,
            socketUrl: window.location.protocol === 'https:' 
                ? `https://${window.location.hostname}:3443`
                : `http://${window.location.hostname}:3000`,
            refreshInterval: 30000, // 30 seconds
            toastDuration: 5000, // 5 seconds
            pageSize: 10
        };

        // State management
        this.state = {
            licenses: [],
            filteredLicenses: [],
            selectedLicenses: new Set(),
            currentPage: 1,
            totalPages: 1,
            totalLicenses: 0,
            sortColumn: 'created_at',
            sortDirection: 'desc',
            searchQuery: '',
            statusFilter: 'all',
            isLoading: false,
            socket: null,
            connectionStatus: 'disconnected'
        };

        // DOM elements cache
        this.elements = {};
        
        // Initialize the dashboard
        this.init();
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            this.initializeSocket();
            await this.loadLicenses();
            this.updateStats();
            this.startPeriodicRefresh();
            
            this.showToast('success', 'Dashboard Initialized', 'Admin dashboard loaded successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showToast('error', 'Initialization Error', 'Failed to load admin dashboard');
        }
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            // Header elements
            connectionStatus: document.getElementById('connection-status'),
            connectionText: document.getElementById('connection-text'),
            
            // Stats elements
            totalLicensesCount: document.getElementById('total-licenses'),
            activeLicensesCount: document.getElementById('active-licenses'),
            expiredLicensesCount: document.getElementById('expired-licenses'),
            
            // Search and filter elements
            searchInput: document.getElementById('search-input'),
            statusFilter: document.getElementById('status-filter'),
            
            // Table elements
            licenseTableBody: document.getElementById('license-table-body'),
            tableLoading: document.getElementById('table-loading'),
            emptyState: document.getElementById('empty-state'),
            selectAllCheckbox: document.getElementById('select-all'),
            selectedCount: document.getElementById('selected-count'),
            
            // Pagination elements
            paginationInfo: document.getElementById('pagination-info'),
            pageNumbers: document.getElementById('page-numbers'),
            pageSizeSelect: document.getElementById('page-size'),
            
            // Action buttons
            createBtn: document.getElementById('create-license-btn'),
            extendBtn: document.getElementById('extend-license-btn'),
            toggleBtn: document.getElementById('toggle-license-btn'),
            deleteBtn: document.getElementById('delete-license-btn'),
            refreshBtn: document.getElementById('refresh-btn'),
            
            // Modals
            createModal: document.getElementById('create-license-modal'),
            extendModal: document.getElementById('extend-license-modal'),
            
            // Forms
            createForm: document.getElementById('create-license-form'),
            extendForm: document.getElementById('extend-license-form'),
            
            // Loading overlay
            loadingOverlay: document.getElementById('loading-overlay'),
            
            // Toast container
            toastContainer: document.getElementById('toast-container')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search and filter events
        this.elements.searchInput?.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        this.elements.statusFilter?.addEventListener('change', this.handleStatusFilter.bind(this));
        
        // Action button events
        this.elements.createBtn?.addEventListener('click', this.showCreateModal.bind(this));
        this.elements.extendBtn?.addEventListener('click', this.showExtendModal.bind(this));
        this.elements.toggleBtn?.addEventListener('click', this.handleToggleLicenses.bind(this));
        this.elements.deleteBtn?.addEventListener('click', this.handleDeleteLicenses.bind(this));
        this.elements.refreshBtn?.addEventListener('click', this.handleRefresh.bind(this));
        
        // Table events
        this.elements.selectAllCheckbox?.addEventListener('change', this.handleSelectAll.bind(this));
        
        // Pagination events
        this.elements.pageSizeSelect?.addEventListener('change', this.handlePageSizeChange.bind(this));
        
        // Form events
        this.elements.createForm?.addEventListener('submit', this.handleCreateLicense.bind(this));
        this.elements.extendForm?.addEventListener('submit', this.handleExtendLicense.bind(this));
        
        // Modal events
        document.addEventListener('click', this.handleModalClose.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }

    /**
     * Initialize Socket.IO connection
     */
    initializeSocket() {
        try {
            this.updateConnectionStatus('connecting');
            
            this.state.socket = io(this.config.socketUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000
            });

            // Connection events
            this.state.socket.on('connect', () => {
                console.log('Socket.IO connected');
                this.updateConnectionStatus('connected');
                this.showToast('success', 'Connected', 'Real-time updates enabled');
            });

            this.state.socket.on('disconnect', (reason) => {
                console.log('Socket.IO disconnected:', reason);
                this.updateConnectionStatus('disconnected');
                this.showToast('warning', 'Disconnected', 'Real-time updates disabled');
            });

            this.state.socket.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error);
                this.updateConnectionStatus('disconnected');
                this.showToast('error', 'Connection Error', 'Failed to connect to server');
            });

            // License update events
            this.state.socket.on('license_update', (data) => {
                console.log('License update received:', data);
                this.handleLicenseUpdate(data);
            });

            this.state.socket.on('license_created', (data) => {
                console.log('License created:', data);
                this.handleLicenseCreated(data);
            });

            this.state.socket.on('license_deleted', (data) => {
                console.log('License deleted:', data);
                this.handleLicenseDeleted(data);
            });

        } catch (error) {
            console.error('Failed to initialize socket:', error);
            this.updateConnectionStatus('disconnected');
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        this.state.connectionStatus = status;
        
        if (this.elements.connectionStatus && this.elements.connectionText) {
            this.elements.connectionStatus.className = `status-indicator ${status}`;
            
            const statusTexts = {
                connected: 'Connected',
                connecting: 'Connecting...',
                disconnected: 'Disconnected'
            };
            
            this.elements.connectionText.textContent = statusTexts[status] || 'Unknown';
        }
    }

    /**
     * Load licenses from API
     */
    async loadLicenses(showLoading = true) {
        try {
            if (showLoading) {
                this.setLoading(true);
            }

            const params = new URLSearchParams({
                page: this.state.currentPage,
                limit: this.config.pageSize,
                sort: this.state.sortColumn,
                order: this.state.sortDirection,
                search: this.state.searchQuery,
                status: this.state.statusFilter !== 'all' ? this.state.statusFilter : ''
            });

            const response = await this.apiCall(`/license/list?${params}`);
            
            if (response.success) {
                this.state.licenses = response.data.licenses || [];
                this.state.totalLicenses = response.data.total || 0;
                this.state.totalPages = Math.ceil(this.state.totalLicenses / this.config.pageSize);
                
                this.renderTable();
                this.renderPagination();
                this.updateStats();
            } else {
                throw new Error(response.message || 'Failed to load licenses');
            }

        } catch (error) {
            console.error('Failed to load licenses:', error);
            this.showToast('error', 'Load Error', 'Failed to load licenses');
            this.renderEmptyState();
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Render license table
     */
    renderTable() {
        if (!this.elements.licenseTableBody) return;

        if (this.state.licenses.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.elements.licenseTableBody.innerHTML = this.state.licenses.map(license => `
            <tr data-license-id="${license._id}" ${this.state.selectedLicenses.has(license._id) ? 'class="selected"' : ''}>
                <td>
                    <input type="checkbox" 
                           class="license-checkbox" 
                           value="${license._id}"
                           ${this.state.selectedLicenses.has(license._id) ? 'checked' : ''}>
                </td>
                <td>
                    <div class="client-info">
                        <strong>${this.escapeHtml(license.client_id)}</strong>
                        <small class="text-muted">${license._id}</small>
                    </div>
                </td>
                <td>
                    <span class="plan-badge plan-${license.plan?.toLowerCase() || 'basic'}">
                        ${this.escapeHtml(license.plan || 'Basic')}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${license.status?.toLowerCase() || 'inactive'}">
                        <i class="fas fa-circle"></i>
                        ${this.escapeHtml(license.status || 'Inactive')}
                    </span>
                </td>
                <td>
                    <div class="expiration-info">
                        <strong>${this.formatDate(license.expires_at)}</strong>
                        <small class="text-muted">${this.getTimeRemaining(license.expires_at)}</small>
                    </div>
                </td>
                <td>
                    <div class="module-tags">
                        ${(license.modules || []).map(module => 
                            `<span class="module-tag">${this.escapeHtml(module)}</span>`
                        ).join('')}
                    </div>
                </td>
                <td>
                    <div class="usage-progress">
                        <div class="usage-bar">
                            <div class="usage-fill ${this.getUsageClass(license.usage_count, license.usage_limit)}" 
                                 style="width: ${this.getUsagePercentage(license.usage_count, license.usage_limit)}%"></div>
                        </div>
                        <span class="usage-text">${license.usage_count || 0}/${license.usage_limit || 'Unlimited'}</span>
                    </div>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-info" onclick="adminDashboard.viewLicense('${license._id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="adminDashboard.editLicense('${license._id}')" title="Edit License">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm ${license.status === 'active' ? 'btn-secondary' : 'btn-success'}" 
                                onclick="adminDashboard.toggleSingleLicense('${license._id}')" 
                                title="${license.status === 'active' ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-${license.status === 'active' ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteSingleLicense('${license._id}')" title="Delete License">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Bind checkbox events
        this.elements.licenseTableBody.querySelectorAll('.license-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', this.handleLicenseSelect.bind(this));
        });

        // Hide loading and empty states
        if (this.elements.tableLoading) this.elements.tableLoading.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'none';
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        if (this.elements.licenseTableBody) {
            this.elements.licenseTableBody.innerHTML = '';
        }
        
        if (this.elements.tableLoading) this.elements.tableLoading.style.display = 'none';
        if (this.elements.emptyState) this.elements.emptyState.style.display = 'block';
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        // Update pagination info
        if (this.elements.paginationInfo) {
            const start = (this.state.currentPage - 1) * this.config.pageSize + 1;
            const end = Math.min(this.state.currentPage * this.config.pageSize, this.state.totalLicenses);
            this.elements.paginationInfo.textContent = 
                `Showing ${start}-${end} of ${this.state.totalLicenses} licenses`;
        }

        // Update page numbers
        if (this.elements.pageNumbers) {
            const pages = this.generatePageNumbers();
            this.elements.pageNumbers.innerHTML = pages.map(page => {
                if (page === '...') {
                    return '<span class="page-ellipsis">...</span>';
                }
                return `
                    <a href="#" class="page-number ${page === this.state.currentPage ? 'active' : ''}" 
                       data-page="${page}">${page}</a>
                `;
            }).join('');

            // Bind page click events
            this.elements.pageNumbers.querySelectorAll('.page-number').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(e.target.dataset.page);
                    if (page !== this.state.currentPage) {
                        this.state.currentPage = page;
                        this.loadLicenses();
                    }
                });
            });
        }
    }

    /**
     * Generate page numbers for pagination
     */
    generatePageNumbers() {
        const pages = [];
        const current = this.state.currentPage;
        const total = this.state.totalPages;

        if (total <= 7) {
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            
            if (current > 4) {
                pages.push('...');
            }
            
            const start = Math.max(2, current - 1);
            const end = Math.min(total - 1, current + 1);
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (current < total - 3) {
                pages.push('...');
            }
            
            pages.push(total);
        }

        return pages;
    }

    /**
     * Update dashboard statistics
     */
    updateStats() {
        const stats = this.calculateStats();
        
        if (this.elements.totalLicensesCount) {
            this.elements.totalLicensesCount.textContent = stats.total;
        }
        
        if (this.elements.activeLicensesCount) {
            this.elements.activeLicensesCount.textContent = stats.active;
        }
        
        if (this.elements.expiredLicensesCount) {
            this.elements.expiredLicensesCount.textContent = stats.expired;
        }
    }

    /**
     * Calculate license statistics
     */
    calculateStats() {
        const now = new Date();
        return this.state.licenses.reduce((stats, license) => {
            stats.total++;
            
            if (license.status === 'active') {
                stats.active++;
            }
            
            if (new Date(license.expires_at) < now) {
                stats.expired++;
            }
            
            return stats;
        }, { total: 0, active: 0, expired: 0 });
    }

    /**
     * Handle search input
     */
    handleSearch(event) {
        this.state.searchQuery = event.target.value.trim();
        this.state.currentPage = 1;
        this.loadLicenses();
    }

    /**
     * Handle status filter change
     */
    handleStatusFilter(event) {
        this.state.statusFilter = event.target.value;
        this.state.currentPage = 1;
        this.loadLicenses();
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAll(event) {
        const isChecked = event.target.checked;
        this.state.selectedLicenses.clear();
        
        if (isChecked) {
            this.state.licenses.forEach(license => {
                this.state.selectedLicenses.add(license._id);
            });
        }
        
        // Update individual checkboxes
        document.querySelectorAll('.license-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        this.updateSelectedCount();
        this.updateBulkActionButtons();
    }

    /**
     * Handle individual license selection
     */
    handleLicenseSelect(event) {
        const licenseId = event.target.value;
        const isChecked = event.target.checked;
        
        if (isChecked) {
            this.state.selectedLicenses.add(licenseId);
        } else {
            this.state.selectedLicenses.delete(licenseId);
        }
        
        // Update select all checkbox
        if (this.elements.selectAllCheckbox) {
            const totalCheckboxes = document.querySelectorAll('.license-checkbox').length;
            const checkedCheckboxes = this.state.selectedLicenses.size;
            
            this.elements.selectAllCheckbox.checked = checkedCheckboxes === totalCheckboxes;
            this.elements.selectAllCheckbox.indeterminate = checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes;
        }
        
        this.updateSelectedCount();
        this.updateBulkActionButtons();
    }

    /**
     * Update selected count display
     */
    updateSelectedCount() {
        if (this.elements.selectedCount) {
            const count = this.state.selectedLicenses.size;
            this.elements.selectedCount.textContent = `${count} selected`;
        }
    }

    /**
     * Update bulk action button states
     */
    updateBulkActionButtons() {
        const hasSelection = this.state.selectedLicenses.size > 0;
        
        if (this.elements.extendBtn) this.elements.extendBtn.disabled = !hasSelection;
        if (this.elements.toggleBtn) this.elements.toggleBtn.disabled = !hasSelection;
        if (this.elements.deleteBtn) this.elements.deleteBtn.disabled = !hasSelection;
    }

    /**
     * Show create license modal
     */
    showCreateModal() {
        if (this.elements.createModal) {
            this.elements.createModal.classList.add('show');
            this.resetCreateForm();
        }
    }

    /**
     * Show extend license modal
     */
    showExtendModal() {
        if (this.state.selectedLicenses.size === 0) {
            this.showToast('warning', 'No Selection', 'Please select licenses to extend');
            return;
        }
        
        if (this.elements.extendModal) {
            this.elements.extendModal.classList.add('show');
            this.populateExtendForm();
        }
    }

    /**
     * Handle modal close events
     */
    handleModalClose(event) {
        if (event.target.classList.contains('modal') || 
            event.target.classList.contains('modal-close') ||
            event.target.closest('.modal-close')) {
            
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(event) {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    }

    /**
     * Handle create license form submission
     */
    async handleCreateLicense(event) {
        event.preventDefault();
        
        try {
            this.setLoading(true);
            
            const formData = new FormData(event.target);
            const licenseData = {
                client_id: formData.get('client_id'),
                plan: formData.get('plan'),
                expires_at: formData.get('expires_at'),
                usage_limit: parseInt(formData.get('usage_limit')) || null,
                modules: formData.getAll('modules')
            };

            const response = await this.apiCall('/license/create', 'POST', licenseData);
            
            if (response.success) {
                this.showToast('success', 'License Created', `License for ${licenseData.client_id} created successfully`);
                this.elements.createModal.classList.remove('show');
                await this.loadLicenses();
            } else {
                throw new Error(response.message || 'Failed to create license');
            }

        } catch (error) {
            console.error('Failed to create license:', error);
            this.showToast('error', 'Creation Error', error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle extend license form submission
     */
    async handleExtendLicense(event) {
        event.preventDefault();
        
        try {
            this.setLoading(true);
            
            const formData = new FormData(event.target);
            const extensionData = {
                license_ids: Array.from(this.state.selectedLicenses),
                extend_by_days: parseInt(formData.get('extend_by_days')),
                new_expiry_date: formData.get('new_expiry_date') || null
            };

            const response = await this.apiCall('/license/extend', 'POST', extensionData);
            
            if (response.success) {
                this.showToast('success', 'Licenses Extended', `${extensionData.license_ids.length} license(s) extended successfully`);
                this.elements.extendModal.classList.remove('show');
                this.state.selectedLicenses.clear();
                await this.loadLicenses();
            } else {
                throw new Error(response.message || 'Failed to extend licenses');
            }

        } catch (error) {
            console.error('Failed to extend licenses:', error);
            this.showToast('error', 'Extension Error', error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle toggle licenses
     */
    async handleToggleLicenses() {
        if (this.state.selectedLicenses.size === 0) {
            this.showToast('warning', 'No Selection', 'Please select licenses to toggle');
            return;
        }

        try {
            this.setLoading(true);
            
            const licenseIds = Array.from(this.state.selectedLicenses);
            const promises = licenseIds.map(id => 
                this.apiCall(`/license/toggle`, 'POST', { license_id: id })
            );

            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            if (successful > 0) {
                this.showToast('success', 'Licenses Toggled', `${successful} license(s) toggled successfully`);
            }
            
            if (failed > 0) {
                this.showToast('warning', 'Partial Success', `${failed} license(s) failed to toggle`);
            }

            this.state.selectedLicenses.clear();
            await this.loadLicenses();

        } catch (error) {
            console.error('Failed to toggle licenses:', error);
            this.showToast('error', 'Toggle Error', 'Failed to toggle licenses');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle delete licenses
     */
    async handleDeleteLicenses() {
        if (this.state.selectedLicenses.size === 0) {
            this.showToast('warning', 'No Selection', 'Please select licenses to delete');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete ${this.state.selectedLicenses.size} license(s)? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            this.setLoading(true);
            
            const licenseIds = Array.from(this.state.selectedLicenses);
            const response = await this.apiCall('/license/delete', 'DELETE', { license_ids: licenseIds });
            
            if (response.success) {
                this.showToast('success', 'Licenses Deleted', `${licenseIds.length} license(s) deleted successfully`);
                this.state.selectedLicenses.clear();
                await this.loadLicenses();
            } else {
                throw new Error(response.message || 'Failed to delete licenses');
            }

        } catch (error) {
            console.error('Failed to delete licenses:', error);
            this.showToast('error', 'Deletion Error', error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle refresh button
     */
    async handleRefresh() {
        await this.loadLicenses();
        this.showToast('info', 'Refreshed', 'License data refreshed');
    }

    /**
     * Handle page size change
     */
    handlePageSizeChange(event) {
        this.config.pageSize = parseInt(event.target.value);
        this.state.currentPage = 1;
        this.loadLicenses();
    }

    /**
     * Toggle single license
     */
    async toggleSingleLicense(licenseId) {
        try {
            const response = await this.apiCall('/license/toggle', 'POST', { license_id: licenseId });
            
            if (response.success) {
                this.showToast('success', 'License Toggled', 'License status updated successfully');
                await this.loadLicenses(false);
            } else {
                throw new Error(response.message || 'Failed to toggle license');
            }

        } catch (error) {
            console.error('Failed to toggle license:', error);
            this.showToast('error', 'Toggle Error', error.message);
        }
    }

    /**
     * Delete single license
     */
    async deleteSingleLicense(licenseId) {
        const confirmed = confirm('Are you sure you want to delete this license? This action cannot be undone.');
        if (!confirmed) return;

        try {
            const response = await this.apiCall('/license/delete', 'DELETE', { license_ids: [licenseId] });
            
            if (response.success) {
                this.showToast('success', 'License Deleted', 'License deleted successfully');
                await this.loadLicenses(false);
            } else {
                throw new Error(response.message || 'Failed to delete license');
            }

        } catch (error) {
            console.error('Failed to delete license:', error);
            this.showToast('error', 'Deletion Error', error.message);
        }
    }

    /**
     * Handle real-time license updates
     */
    handleLicenseUpdate(data) {
        // Find and update the license in current data
        const licenseIndex = this.state.licenses.findIndex(l => l._id === data.license_id);
        if (licenseIndex !== -1) {
            this.state.licenses[licenseIndex] = { ...this.state.licenses[licenseIndex], ...data.updates };
            this.renderTable();
            this.updateStats();
        }
        
        this.showToast('info', 'License Updated', `License ${data.license_id} has been updated`);
    }

    /**
     * Handle real-time license creation
     */
    handleLicenseCreated(data) {
        this.loadLicenses(false);
        this.showToast('info', 'New License', `New license created for ${data.client_id}`);
    }

    /**
     * Handle real-time license deletion
     */
    handleLicenseDeleted(data) {
        this.state.licenses = this.state.licenses.filter(l => l._id !== data.license_id);
        this.renderTable();
        this.updateStats();
        this.showToast('info', 'License Deleted', `License ${data.license_id} has been deleted`);
    }

    /**
     * Start periodic refresh
     */
    startPeriodicRefresh() {
        setInterval(() => {
            if (this.state.connectionStatus !== 'connected') {
                this.loadLicenses(false);
            }
        }, this.config.refreshInterval);
    }

    /**
     * Make API call
     */
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.toggle('show', isLoading);
        }
        
        if (this.elements.tableLoading) {
            this.elements.tableLoading.style.display = isLoading ? 'flex' : 'none';
        }
    }

    /**
     * Show toast notification
     */
    showToast(type, title, message) {
        if (!this.elements.toastContainer) return;

        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <i class="toast-icon fas fa-${this.getToastIcon(type)}"></i>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" onclick="adminDashboard.closeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.elements.toastContainer.appendChild(toast);

        // Auto-remove toast
        setTimeout(() => {
            this.closeToast(toastId);
        }, this.config.toastDuration);
    }

    /**
     * Close toast notification
     */
    closeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.remove();
        }
    }

    /**
     * Get toast icon based on type
     */
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Reset create form
     */
    resetCreateForm() {
        if (this.elements.createForm) {
            this.elements.createForm.reset();
            
            // Set default expiry date (30 days from now)
            const defaultExpiry = new Date();
            defaultExpiry.setDate(defaultExpiry.getDate() + 30);
            
            const expiryInput = this.elements.createForm.querySelector('input[name="expires_at"]');
            if (expiryInput) {
                expiryInput.value = defaultExpiry.toISOString().split('T')[0];
            }
        }
    }

    /**
     * Populate extend form with selected licenses info
     */
    populateExtendForm() {
        if (!this.elements.extendForm) return;

        const selectedLicenses = this.state.licenses.filter(l => 
            this.state.selectedLicenses.has(l._id)
        );

        const licenseList = this.elements.extendForm.querySelector('#selected-licenses-list');
        if (licenseList) {
            licenseList.innerHTML = selectedLicenses.map(license => `
                <div class="current-license-info">
                    <strong>${this.escapeHtml(license.client_id)}</strong> - 
                    Expires: ${this.formatDate(license.expires_at)}
                </div>
            `).join('');
        }
    }

    /**
     * Utility functions
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getTimeRemaining(dateString) {
        if (!dateString) return 'N/A';
        
        const now = new Date();
        const expiry = new Date(dateString);
        const diff = expiry - now;
        
        if (diff < 0) return 'Expired';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 0) return `${days} days`;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours > 0) return `${hours} hours`;
        
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minutes`;
    }

    getUsagePercentage(used, limit) {
        if (!limit || limit === 0) return 0;
        return Math.min((used / limit) * 100, 100);
    }

    getUsageClass(used, limit) {
        const percentage = this.getUsagePercentage(used, limit);
        if (percentage >= 90) return 'danger';
        if (percentage >= 75) return 'warning';
        return '';
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.state.socket) {
            this.state.socket.disconnect();
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new OmniAdminDashboard();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OmniAdminDashboard;
}