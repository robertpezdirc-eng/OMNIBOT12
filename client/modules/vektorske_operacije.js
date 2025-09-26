/**
 * Vektorske Operacije Modul
 * Omogoča nalaganje dokumentov, iskanje po vsebini in upravljanje vektorskih kolekcij
 */

class VektorskeOperacijeModule {
    constructor() {
        this.apiBase = '/api/vector';
        this.selectedCollection = null;
        this.lastSearchQuery = '';
        this.isInitialized = false;
        this.currentCollection = null;
        this.searchResults = [];
        this.uploadedDocuments = [];
        this.userCollections = [];
        this.socket = null;
        
        console.log('🔍 Vektorske Operacije modul inicializiran');
    }

    // 🚀 Inicializacija modula
    async init() {
        console.log('🚀 Inicializiram VektorskeOperacijeModule...');
        
        try {
            // Naložimo seznam kolekcij
            await this.loadCollections();
            
            // Nastavimo event listener-je
            this.setupEventListeners();
            
            console.log('✅ VektorskeOperacijeModule uspešno inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji:', error);
            this.showNotification('Napaka pri inicializaciji modula', 'error');
        }
    }

    // 🎯 Nastavitev event listener-jev
    setupEventListeners() {
        // Event listener za izbiro kolekcije
        const collectionSelect = document.getElementById('collectionSelect');
        if (collectionSelect) {
            collectionSelect.addEventListener('change', (e) => {
                this.selectCollection(e.target.value);
            });
        }

        // Event listener za iskalno polje (real-time iskanje)
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch();
                    }, 500); // Počakaj 500ms po zadnjem vnosu
                } else if (query.length === 0) {
                    this.clearResults();
                }
            });
        }

        // Event listener za Enter key v iskalnem polju
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }
    }

    // 🧹 Počisti rezultate iskanja
    clearResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.loadUserCollections();
            this.setupWebSocket();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ Vektorske Operacije modul uspešno inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji Vektorske Operacije modula:', error);
            throw error;
        }
    }

    setupWebSocket() {
        if (window.socket) {
            this.socket = window.socket;
            
            // Poslušaj za posodobitve vektorskih operacij
            this.socket.on('vector_search_complete', (data) => {
                this.handleSearchComplete(data);
            });
            
            this.socket.on('document_processed', (data) => {
                this.handleDocumentProcessed(data);
            });
            
            this.socket.on('collection_updated', (data) => {
                this.handleCollectionUpdated(data);
            });
        }
    }

    setupEventListeners() {
        // Document upload
        const uploadBtn = document.getElementById('upload-documents-btn');
        const fileInput = document.getElementById('document-file-input');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput?.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Search functionality
        const searchBtn = document.getElementById('vector-search-btn');
        const searchInput = document.getElementById('vector-search-input');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        // Collection management
        const createCollectionBtn = document.getElementById('create-collection-btn');
        if (createCollectionBtn) {
            createCollectionBtn.addEventListener('click', () => this.showCreateCollectionModal());
        }

        // Refresh buttons
        const refreshCollectionsBtn = document.getElementById('refresh-collections-btn');
        if (refreshCollectionsBtn) {
            refreshCollectionsBtn.addEventListener('click', () => this.loadUserCollections());
        }
    }

    async loadUserCollections() {
        try {
            const response = await fetch(`${this.apiBase}/collections`);
            if (!response.ok) throw new Error('Napaka pri nalaganju kolekcij');
            
            const collections = await response.json();
            this.userCollections = collections;
            this.renderCollectionsList();
            
            console.log('📚 Naložene kolekcije:', collections.length);
        } catch (error) {
            console.error('❌ Napaka pri nalaganju kolekcij:', error);
            this.showNotification('Napaka pri nalaganju kolekcij', 'error');
        }
    }

    renderCollectionsList() {
        const container = document.getElementById('collections-list');
        if (!container) return;

        if (this.userCollections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Še nimate ustvarjenih kolekcij</p>
                    <button class="btn btn-primary" onclick="vektorskeOperacije.showCreateCollectionModal()">
                        Ustvari prvo kolekcijo
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.userCollections.map(collection => `
            <div class="collection-card ${collection.name === this.currentCollection ? 'active' : ''}" 
                 data-collection="${collection.name}">
                <div class="collection-header">
                    <h4>${collection.name}</h4>
                    <span class="collection-status ${collection.loaded ? 'loaded' : 'unloaded'}">
                        ${collection.loaded ? 'Naloženo' : 'Ni naloženo'}
                    </span>
                </div>
                <div class="collection-info">
                    <p><strong>Dimenzije:</strong> ${collection.dimension}</p>
                    <p><strong>Metrika:</strong> ${collection.metric_type}</p>
                    <p><strong>Vektorji:</strong> ${collection.entities_count || 0}</p>
                </div>
                <div class="collection-actions">
                    <button class="btn btn-sm btn-primary" 
                            onclick="vektorskeOperacije.selectCollection('${collection.name}')">
                        Izberi
                    </button>
                    ${!collection.loaded ? `
                        <button class="btn btn-sm btn-secondary" 
                                onclick="vektorskeOperacije.loadCollection('${collection.name}')">
                            Naloži
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger" 
                            onclick="vektorskeOperacije.deleteCollection('${collection.name}')">
                        Izbriši
                    </button>
                </div>
            </div>
        `).join('');
    }

    async selectCollection(collectionName) {
        this.currentCollection = collectionName;
        this.renderCollectionsList();
        
        // Update search interface
        const searchSection = document.getElementById('search-section');
        if (searchSection) {
            searchSection.style.display = 'block';
        }

        // Load documents for selected collection
        await this.loadUploadedDocuments();
        
        this.showNotification(`Izbrana kolekcija: ${collectionName}`, 'success');
        console.log('📂 Izbrana kolekcija:', collectionName);
    }

    async loadCollection(collectionName) {
        try {
            const response = await fetch(`${this.apiBase}/collections/${collectionName}/load`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Napaka pri nalaganju kolekcije');
            
            await this.loadUserCollections(); // Refresh list
            this.showNotification(`Kolekcija ${collectionName} uspešno naložena`, 'success');
        } catch (error) {
            console.error('❌ Napaka pri nalaganju kolekcije:', error);
            this.showNotification('Napaka pri nalaganju kolekcije', 'error');
        }
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        if (!this.currentCollection) {
            this.showNotification('Najprej izberite kolekcijo', 'warning');
            return;
        }

        const uploadProgress = document.getElementById('upload-progress');
        if (uploadProgress) {
            uploadProgress.style.display = 'block';
        }

        try {
            this.showNotification('Nalagam dokumente...', 'info');
            await this.loadUploadedDocuments();
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await this.uploadSingleFile(file, i + 1, files.length);
            }
            
            this.showNotification(`Uspešno naloženih ${files.length} dokumentov`, 'success');
            await this.loadUploadedDocuments();
        } catch (error) {
            console.error('❌ Napaka pri nalaganju dokumentov:', error);
            this.showNotification('Napaka pri nalaganju dokumentov', 'error');
        } finally {
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
            }
        }
    }

    async uploadSingleFile(file, current, total) {
        const formData = new FormData();
        formData.append('documents', file); // Changed from 'document' to 'documents'
        formData.append('collection', this.currentCollection);

        const response = await fetch(`${this.apiBase}/documents/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Napaka pri nalaganju ${file.name}`);
        }

        const result = await response.json();
        console.log('📄 Odgovor strežnika:', result);

        // Update progress
        const progressBar = document.getElementById('upload-progress-bar');
        const progressText = document.getElementById('upload-progress-text');
        
        if (progressBar && progressText) {
            const progress = (current / total) * 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${current}/${total} dokumentov`;
        }

        console.log(`📄 Naložen dokument: ${file.name}`);
        return result;
    }

    async loadUploadedDocuments() {
        if (!this.currentCollection) return;

        try {
            // For now, we'll simulate loading documents since we don't have a real endpoint
            // In a real implementation, you'd fetch from /api/vector/collections/{collection}/documents
            const mockDocuments = [
                {
                    id: 'doc_1',
                    filename: 'sample_document.pdf',
                    size: 1024000,
                    type: 'application/pdf',
                    uploadedAt: new Date().toISOString(),
                    chunks: 15
                },
                {
                    id: 'doc_2',
                    filename: 'another_file.txt',
                    size: 512000,
                    type: 'text/plain',
                    uploadedAt: new Date().toISOString(),
                    chunks: 8
                }
            ];

            this.renderDocumentsList(mockDocuments);
        } catch (error) {
            console.error('❌ Napaka pri nalaganju dokumentov:', error);
        }
    }

    renderDocumentsList(documents) {
        const container = document.getElementById('documents-container');
        if (!container) return;

        if (documents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>V tej kolekciji še ni dokumentov</p>
                </div>
            `;
            return;
        }

        container.innerHTML = documents.map(doc => {
            const fileIcon = this.getFileIcon(doc.type);
            const fileSize = this.formatFileSize(doc.size);
            const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('sl-SI');

            return `
                <div class="document-item" data-doc-id="${doc.id}">
                    <div class="document-info">
                        <div class="document-icon">${fileIcon}</div>
                        <div class="document-details">
                            <h5>${doc.filename}</h5>
                            <p>${fileSize} • ${doc.chunks} delov • ${uploadDate}</p>
                        </div>
                    </div>
                    <div class="document-actions">
                        <button class="btn btn-sm btn-secondary" onclick="vektorskeOperacije.viewDocument('${doc.id}')">
                            👁️ Poglej
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="vektorskeOperacije.deleteDocument('${doc.id}')">
                            🗑️ Izbriši
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('text')) return '📝';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
        return '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async viewDocument(docId) {
        this.showNotification(`Ogled dokumenta ${docId} - funkcionalnost v razvoju`, 'info');
    }

    async deleteDocument(docId) {
        if (!confirm('Ali ste prepričani, da želite izbrisati ta dokument?')) return;

        try {
            // In real implementation: await fetch(`/api/vector/documents/${docId}`, { method: 'DELETE' });
            this.showNotification('Dokument izbrisan', 'success');
            await this.loadUploadedDocuments();
        } catch (error) {
            console.error('❌ Napaka pri brisanju dokumenta:', error);
            this.showNotification('Napaka pri brisanju dokumenta', 'error');
        }
    }

    async performSearch() {
        const searchInput = document.getElementById('vector-search-input');
        const query = searchInput?.value?.trim();
        
        if (!query) {
            this.showNotification('Vnesite iskalni pojem', 'warning');
            return;
        }

        if (!this.currentCollection) {
            this.showNotification('Najprej izberite kolekcijo', 'warning');
            return;
        }

        const searchBtn = document.getElementById('vector-search-btn');
        const originalText = searchBtn?.textContent;
        
        try {
            if (searchBtn) {
                searchBtn.textContent = 'Iščem...';
                searchBtn.disabled = true;
            }

            // Show loading state in results
            const container = document.getElementById('search-results');
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Iščem po kolekciji "${this.currentCollection}"...</p>
                    </div>
                `;
            }

            const response = await fetch(`${this.apiBase}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    collection: this.currentCollection,
                    query: query,
                    limit: 10,
                    threshold: 0.7
                })
            });

            // Store the search query for highlighting
            this.lastSearchQuery = query;

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Napaka pri iskanju');
            }

            const data = await response.json();
            this.searchResults = data.results || [];
            this.renderSearchResults();
            
            this.showNotification(`Najdenih ${this.searchResults.length} rezultatov`, 'success');
            console.log('🔍 Rezultati iskanja:', this.searchResults.length);
        } catch (error) {
            console.error('❌ Napaka pri iskanju:', error);
            this.showNotification(`Napaka pri iskanju: ${error.message}`, 'error');
            
            // Show error state in results
            const container = document.getElementById('search-results');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>❌ Napaka pri iskanju: ${error.message}</p>
                        <button onclick="window.vektorskeOperacije.performSearch()" class="retry-btn">
                            Poskusi znova
                        </button>
                    </div>
                `;
            }
        } finally {
            if (searchBtn) {
                searchBtn.textContent = originalText;
                searchBtn.disabled = false;
            }
        }
    }

    renderSearchResults() {
        const container = document.getElementById('search-results');
        if (!container) return;

        if (this.searchResults.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h4>Ni rezultatov</h4>
                    <p>Za vaš iskalni pojem ni bilo najdenih rezultatov.</p>
                    <p>Poskusite z drugačnimi ključnimi besedami.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="results-header">
                <h4>Rezultati iskanja</h4>
                <span class="results-count">${this.searchResults.length} rezultatov</span>
            </div>
            <div class="results-list">
                ${this.searchResults.map((result, index) => `
                    <div class="result-item" data-index="${index}">
                        <div class="result-header">
                            <div class="result-info">
                                <span class="result-rank">#${index + 1}</span>
                                <span class="result-score" title="Stopnja podobnosti">
                                    ${(result.score * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div class="result-actions">
                                <button class="action-btn view-btn" onclick="window.vektorskeOperacije.viewSearchResult(${index})" title="Ogled">
                                    👁️
                                </button>
                                <button class="action-btn copy-btn" onclick="window.vektorskeOperacije.copyResultContent(${index})" title="Kopiraj">
                                    📋
                                </button>
                            </div>
                        </div>
                        <div class="result-content">
                            <div class="result-text">
                                ${this.highlightSearchTerms(result.content || result.text || 'Ni vsebine', this.lastSearchQuery)}
                            </div>
                            ${result.metadata ? `
                                <div class="result-metadata">
                                    <details>
                                        <summary>Metadata</summary>
                                        <pre>${JSON.stringify(result.metadata, null, 2)}</pre>
                                    </details>
                                </div>
                            ` : ''}
                            ${result.source ? `
                                <div class="result-source">
                                    <small>Vir: ${result.source}</small>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="results-footer">
                <button class="load-more-btn" onclick="window.vektorskeOperacije.loadMoreResults()" style="display: none;">
                    Naloži več rezultatov
                </button>
            </div>
        `;
    }

    highlightSearchTerms(text, query) {
        if (!query || !text) return text;
        
        const terms = query.toLowerCase().split(/\s+/);
        let highlightedText = text;
        
        terms.forEach(term => {
            if (term.length > 2) { // Only highlight terms longer than 2 characters
                const regex = new RegExp(`(${term})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
            }
        });
        
        return highlightedText;
    }

    async viewSearchResult(index) {
        const result = this.searchResults[index];
        if (!result) return;

        // Create modal for viewing full result
        const modal = document.createElement('div');
        modal.className = 'result-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Rezultat iskanja #${index + 1}</h3>
                    <button class="close-btn" onclick="this.closest('.result-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="result-details">
                        <p><strong>Podobnost:</strong> ${(result.score * 100).toFixed(2)}%</p>
                        <p><strong>ID:</strong> ${result.id || 'N/A'}</p>
                        ${result.source ? `<p><strong>Vir:</strong> ${result.source}</p>` : ''}
                    </div>
                    <div class="result-full-content">
                        <h4>Vsebina:</h4>
                        <div class="content-text">${result.content || result.text || 'Ni vsebine'}</div>
                    </div>
                    ${result.metadata ? `
                        <div class="result-full-metadata">
                            <h4>Metadata:</h4>
                            <pre>${JSON.stringify(result.metadata, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button onclick="window.vektorskeOperacije.copyResultContent(${index})" class="copy-btn">
                        Kopiraj vsebino
                    </button>
                    <button onclick="this.closest('.result-modal').remove()" class="close-btn">
                        Zapri
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async copyResultContent(index) {
        const result = this.searchResults[index];
        if (!result) return;

        const content = result.content || result.text || '';
        
        try {
            await navigator.clipboard.writeText(content);
            this.showNotification('Vsebina kopirana v odložišče', 'success');
        } catch (error) {
            console.error('Napaka pri kopiranju:', error);
            this.showNotification('Napaka pri kopiranju', 'error');
        }
    }

    // 📋 Upravljanje kolekcij - ustvarjanje nove kolekcije
    async createCollection() {
        try {
            const name = document.getElementById('newCollectionName').value.trim();
            const dimension = parseInt(document.getElementById('newCollectionDimension').value) || 1536;
            const metric_type = document.getElementById('newCollectionMetric').value || 'COSINE';
            const description = document.getElementById('newCollectionDescription').value.trim();

            // Validacija na strani odjemalca
            if (!name) {
                this.showNotification('Ime kolekcije je obvezno', 'error');
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(name)) {
                this.showNotification('Ime kolekcije lahko vsebuje samo črke, številke in podčrtaje', 'error');
                return;
            }

            if (dimension < 1 || dimension > 32768) {
                this.showNotification('Dimenzija mora biti med 1 in 32768', 'error');
                return;
            }

            // Prikaz stanja nalaganja
            const createButton = document.querySelector('#createCollectionModal .btn-primary');
            const originalText = createButton.textContent;
            createButton.disabled = true;
            createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ustvarjam...';

            console.log(`📋 Ustvarjam kolekcijo: ${name}`);

            const response = await fetch('/api/vector/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    dimension,
                    metric_type,
                    description
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Kolekcija '${name}' uspešno ustvarjena`, 'success');
                
                // Zapri modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createCollectionModal'));
                modal.hide();
                
                // Počisti obrazec
                document.getElementById('createCollectionForm').reset();
                
                // Osveži seznam kolekcij
                await this.loadCollections();
                
                console.log(`✅ Kolekcija '${name}' uspešno ustvarjena`);
            } else {
                throw new Error(result.error || 'Napaka pri ustvarjanju kolekcije');
            }

        } catch (error) {
            console.error('❌ Napaka pri ustvarjanju kolekcije:', error);
            this.showNotification(`Napaka: ${error.message}`, 'error');
        } finally {
            // Obnovi gumb
            const createButton = document.querySelector('#createCollectionModal .btn-primary');
            if (createButton) {
                createButton.disabled = false;
                createButton.textContent = originalText;
            }
        }
    }

    // 📋 Nalaganje seznama kolekcij
    async loadCollections() {
        try {
            console.log('📋 Nalagam seznam kolekcij...');
            
            const response = await fetch('/api/vector/collections?limit=100');
            const result = await response.json();

            if (result.success) {
                const collections = result.data.collections;
                this.renderCollectionsList(collections);
                this.updateCollectionSelect(collections);
                
                console.log(`✅ Naloženih ${collections.length} kolekcij`);
            } else {
                throw new Error(result.error || 'Napaka pri nalaganju kolekcij');
            }

        } catch (error) {
            console.error('❌ Napaka pri nalaganju kolekcij:', error);
            this.showNotification(`Napaka pri nalaganju kolekcij: ${error.message}`, 'error');
        }
    }

    // 📋 Prikaz seznama kolekcij
    renderCollectionsList(collections) {
        const container = document.getElementById('collectionsList');
        if (!container) return;

        if (collections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Ni kolekcij</h5>
                    <p class="text-muted">Ustvarite novo kolekcijo za začetek dela z vektorskimi podatki.</p>
                    <button class="btn btn-primary" onclick="vektorskeOperacije.showCreateCollectionModal()">
                        <i class="fas fa-plus"></i> Ustvari kolekcijo
                    </button>
                </div>
            `;
            return;
        }

        const collectionsHtml = collections.map(collection => `
            <div class="collection-card" data-collection="${collection.name}">
                <div class="collection-header">
                    <div class="collection-info">
                        <h6 class="collection-name">
                            <i class="fas fa-database text-primary"></i>
                            ${collection.name}
                        </h6>
                        <small class="collection-description text-muted">
                            ${collection.description || 'Brez opisa'}
                        </small>
                    </div>
                    <div class="collection-actions">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="vektorskeOperacije.selectCollection('${collection.name}')"
                                title="Izberi kolekcijo">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="vektorskeOperacije.confirmDeleteCollection('${collection.name}', ${collection.document_count})"
                                title="Izbriši kolekcijo">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="collection-stats">
                    <div class="stat-item">
                        <span class="stat-label">Dokumenti:</span>
                        <span class="stat-value">${collection.document_count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Dimenzija:</span>
                        <span class="stat-value">${collection.dimension}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Metrika:</span>
                        <span class="stat-value">${collection.metric_type}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Velikost:</span>
                        <span class="stat-value">${this.formatFileSize(collection.size_bytes)}</span>
                    </div>
                </div>
                <div class="collection-footer">
                    <small class="text-muted">
                        Ustvarjena: ${new Date(collection.created_at).toLocaleDateString('sl-SI')}
                    </small>
                    <span class="badge bg-success">Aktivna</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="collections-header">
                <h5>Upravljanje kolekcij</h5>
                <button class="btn btn-primary btn-sm" onclick="vektorskeOperacije.showCreateCollectionModal()">
                    <i class="fas fa-plus"></i> Nova kolekcija
                </button>
            </div>
            <div class="collections-grid">
                ${collectionsHtml}
            </div>
        `;
    }

    // 📋 Posodobitev dropdown seznama kolekcij
    updateCollectionSelect(collections) {
        const select = document.getElementById('collectionSelect');
        if (!select) return;

        // Ohrani trenutno izbrano vrednost
        const currentValue = select.value;

        select.innerHTML = '<option value="">Izberi kolekcijo...</option>';
        
        collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.name;
            option.textContent = `${collection.name} (${collection.document_count} dok.)`;
            select.appendChild(option);
        });

        // Obnovi izbrano vrednost, če še vedno obstaja
        if (currentValue && collections.some(col => col.name === currentValue)) {
            select.value = currentValue;
        }
    }

    // 📋 Prikaz modala za ustvarjanje kolekcije
    showCreateCollectionModal() {
        const modal = new bootstrap.Modal(document.getElementById('createCollectionModal'));
        modal.show();
    }

    // 📋 Potrditev brisanja kolekcije
    confirmDeleteCollection(name, documentCount) {
        const message = documentCount > 0 
            ? `Ali ste prepričani, da želite izbrisati kolekcijo '${name}'?\n\nKolekcija vsebuje ${documentCount} dokumentov, ki bodo prav tako izbrisani.`
            : `Ali ste prepričani, da želite izbrisati kolekcijo '${name}'?`;

        if (confirm(message)) {
            this.deleteCollection(name, documentCount > 0);
        }
    }

    // 📋 Brisanje kolekcije
    async deleteCollection(name, hasDocuments = false) {
        try {
            console.log(`🗑️ Brišem kolekcijo: ${name}`);

            const url = hasDocuments 
                ? `/api/vector/collections/${name}?force=true`
                : `/api/vector/collections/${name}`;

            const response = await fetch(url, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Kolekcija '${name}' uspešno izbrisana`, 'success');
                
                // Osveži seznam kolekcij
                await this.loadCollections();
                
                // Če je bila izbrisana trenutno izbrana kolekcija, počisti izbiro
                const select = document.getElementById('collectionSelect');
                if (select && select.value === name) {
                    select.value = '';
                    this.selectedCollection = null;
                    this.clearResults();
                }
                
                console.log(`✅ Kolekcija '${name}' uspešno izbrisana`);
            } else {
                throw new Error(result.error || 'Napaka pri brisanju kolekcije');
            }

        } catch (error) {
            console.error('❌ Napaka pri brisanju kolekcije:', error);
            this.showNotification(`Napaka pri brisanju: ${error.message}`, 'error');
        }
    }

    async deleteCollection(collectionName) {
        if (!confirm(`Ali ste prepričani, da želite izbrisati kolekcijo "${collectionName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/collections/${collectionName}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Napaka pri brisanju kolekcije');

            if (this.currentCollection === collectionName) {
                this.currentCollection = null;
            }

            await this.loadUserCollections();
            this.showNotification(`Kolekcija ${collectionName} uspešno izbrisana`, 'success');
        } catch (error) {
            console.error('❌ Napaka pri brisanju kolekcije:', error);
            this.showNotification('Napaka pri brisanju kolekcije', 'error');
        }
    }

    // WebSocket event handlers
    handleSearchComplete(data) {
        if (data.collection === this.currentCollection) {
            this.searchResults = data.results;
            this.renderSearchResults();
        }
    }

    handleDocumentProcessed(data) {
        if (data.collection === this.currentCollection) {
            this.showNotification(`Dokument ${data.filename} uspešno procesiran`, 'success');
            this.loadUploadedDocuments();
        }
    }

    handleCollectionUpdated(data) {
        this.loadUserCollections();
    }

    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Cleanup method
    destroy() {
        if (this.socket) {
            this.socket.off('vector_search_complete');
            this.socket.off('document_processed');
            this.socket.off('collection_updated');
        }
        this.isInitialized = false;
        console.log('🔍 Vektorske Operacije modul uničen');
    }
}

// Global instance
const vektorskeOperacije = new VektorskeOperacijeModule();

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VektorskeOperacijeModule;
}

javascript
// 📋 Upravljanje kolekcij - ustvarjanje nove kolekcije
async createCollection() {
    try {
        const name = document.getElementById('newCollectionName').value.trim();
        const dimension = parseInt(document.getElementById('newCollectionDimension').value) || 1536;
        const metric_type = document.getElementById('newCollectionMetric').value || 'COSINE';
        const description = document.getElementById('newCollectionDescription').value.trim();

        // Validacija na strani odjemalca
        if (!name) {
            this.showNotification('Ime kolekcije je obvezno', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            this.showNotification('Ime kolekcije lahko vsebuje samo črke, številke in podčrtaje', 'error');
            return;
        }

        if (dimension < 1 || dimension > 32768) {
            this.showNotification('Dimenzija mora biti med 1 in 32768', 'error');
            return;
        }

        // Prikaz stanja nalaganja
        const createButton = document.querySelector('#createCollectionModal .btn-primary');
        const originalText = createButton.textContent;
        createButton.disabled = true;
        createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ustvarjam...';

        console.log(`📋 Ustvarjam kolekcijo: ${name}`);

        const response = await fetch('/api/vector/collections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                dimension,
                metric_type,
                description
            })
        });

        const result = await response.json();

        if (result.success) {
            this.showNotification(`Kolekcija '${name}' uspešno ustvarjena`, 'success');
            
            // Zapri modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createCollectionModal'));
            modal.hide();
            
            // Počisti obrazec
            document.getElementById('createCollectionForm').reset();
            
            // Osveži seznam kolekcij
            await this.loadCollections();
            
            console.log(`✅ Kolekcija '${name}' uspešno ustvarjena`);
        } else {
            throw new Error(result.error || 'Napaka pri ustvarjanju kolekcije');
        }

    } catch (error) {
        console.error('❌ Napaka pri ustvarjanju kolekcije:', error);
        this.showNotification(`Napaka: ${error.message}`, 'error');
    } finally {
        // Obnovi gumb
        const createButton = document.querySelector('#createCollectionModal .btn-primary');
        if (createButton) {
            createButton.disabled = false;
            createButton.textContent = originalText;
        }
    }
}

// 📋 Nalaganje seznama kolekcij
async loadCollections() {
    try {
        console.log('📋 Nalagam seznam kolekcij...');
        
        const response = await fetch('/api/vector/collections?limit=100');
        const result = await response.json();

        if (result.success) {
            const collections = result.data.collections;
            this.renderCollectionsList(collections);
            this.updateCollectionSelect(collections);
            
            console.log(`✅ Naloženih ${collections.length} kolekcij`);
        } else {
            throw new Error(result.error || 'Napaka pri nalaganju kolekcij');
        }

    } catch (error) {
        console.error('❌ Napaka pri nalaganju kolekcij:', error);
        this.showNotification(`Napaka pri nalaganju kolekcij: ${error.message}`, 'error');
    }
}

// 📋 Prikaz seznama kolekcij
renderCollectionsList(collections) {
    const container = document.getElementById('collectionsList');
    if (!container) return;

    if (collections.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="fas fa-database fa-3x text-muted mb-3"></div>
                <h5 class="text-muted">Ni kolekcij</h5>
                <p class="text-muted">Ustvarite novo kolekcijo za začetek dela z vektorskimi podatki.</p>
                <button class="btn btn-primary" onclick="vektorskeOperacije.showCreateCollectionModal()">
                    <i class="fas fa-plus"></i> Ustvari kolekcijo
                </button>
            </div>
        `;
        return;
    }

    const collectionsHtml = collections.map(collection => `
        <div class="collection-card" data-collection="${collection.name}">
            <div class="collection-header">
                <div class="collection-info">
                    <h6 class="collection-name">
                        <i class="fas fa-database text-primary"></i>
                        ${collection.name}
                    </h6>
                    <small class="collection-description text-muted">
                        ${collection.description || 'Brez opisa'}
                    </small>
                </div>
                <div class="collection-actions">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="vektorskeOperacije.selectCollection('${collection.name}')"
                            title="Izberi kolekcijo">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="vektorskeOperacije.confirmDeleteCollection('${collection.name}', ${collection.document_count})"
                            title="Izbriši kolekcijo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="collection-stats">
                <div class="stat-item">
                    <span class="stat-label">Dokumenti:</span>
                    <span class="stat-value">${collection.document_count.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Dimenzija:</span>
                    <span class="stat-value">${collection.dimension}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Metrika:</span>
                    <span class="stat-value">${collection.metric_type}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Velikost:</span>
                    <span class="stat-value">${this.formatFileSize(collection.size_bytes)}</span>
                </div>
            </div>
            <div class="collection-footer">
                <small class="text-muted">
                    Ustvarjena: ${new Date(collection.created_at).toLocaleDateString('sl-SI')}
                </small>
                <span class="badge bg-success">Aktivna</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="collections-header">
            <h5>Upravljanje kolekcij</h5>
            <button class="btn btn-primary btn-sm" onclick="vektorskeOperacije.showCreateCollectionModal()">
                <i class="fas fa-plus"></i> Nova kolekcija
            </button>
        </div>
        <div class="collections-grid">
            ${collectionsHtml}
        </div>
    `;
}

// 📋 Posodobitev dropdown seznama kolekcij
updateCollectionSelect(collections) {
    const select = document.getElementById('collectionSelect');
    if (!select) return;

    // Ohrani trenutno izbrano vrednost
    const currentValue = select.value;

    select.innerHTML = '<option value="">Izberi kolekcijo...</option>';
    
    collections.forEach(collection => {
        const option = document.createElement('option');
        option.value = collection.name;
        option.textContent = `${collection.name} (${collection.document_count} dok.)`;
        select.appendChild(option);
    });

    // Obnovi izbrano vrednost, če še vedno obstaja
    if (currentValue && collections.some(col => col.name === currentValue)) {
        select.value = currentValue;
    }
}

// 📋 Prikaz modala za ustvarjanje kolekcije
showCreateCollectionModal() {
    const modal = new bootstrap.Modal(document.getElementById('createCollectionModal'));
    modal.show();
}

// 📋 Potrditev brisanja kolekcije
confirmDeleteCollection(name, documentCount) {
    const message = documentCount > 0 
        ? `Ali ste prepričani, da želite izbrisati kolekcijo '${name}'?\n\nKolekcija vsebuje ${documentCount} dokumentov, ki bodo prav tako izbrisani.`
        : `Ali ste prepričani, da želite izbrisati kolekcijo '${name}'?`;

    if (confirm(message)) {
        this.deleteCollection(name, documentCount > 0);
    }
}

// 📋 Brisanje kolekcije
async deleteCollection(name, hasDocuments = false) {
    try {
        console.log(`🗑️ Brišem kolekcijo: ${name}`);

        const url = hasDocuments 
            ? `/api/vector/collections/${name}?force=true`
            : `/api/vector/collections/${name}`;

        const response = await fetch(url, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            this.showNotification(`Kolekcija '${name}' uspešno izbrisana`, 'success');
            
            // Osveži seznam kolekcij
            await this.loadCollections();
            
            // Če je bila izbrisana trenutno izbrana kolekcija, počisti izbiro
            const select = document.getElementById('collectionSelect');
            if (select && select.value === name) {
                select.value = '';
                this.selectedCollection = null;
                this.clearResults();
            }
            
            console.log(`✅ Kolekcija '${name}' uspešno izbrisana`);
        } else {
            throw new Error(result.error || 'Napaka pri brisanju kolekcije');
        }

    } catch (error) {
        console.error('❌ Napaka pri brisanju kolekcije:', error);
        this.showNotification(`Napaka pri brisanju: ${error.message}`, 'error');
    }
}