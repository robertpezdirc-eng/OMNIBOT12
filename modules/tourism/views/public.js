// 🚀 TURIZEM & GOSTINSTVO - PUBLIC JAVASCRIPT

class TourismPublic {
    constructor() {
        this.currentView = 'grid';
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.searchResults = [];
        this.totalResults = 0;
        this.filters = {
            type: '',
            region: '',
            rating: '',
            certificates: [],
            priceRange: '',
            amenities: []
        };
        this.map = null;
        this.markers = [];
        this.config = {};
        
        this.init();
    }

    // 🎯 INICIALIZACIJA
    async init() {
        try {
            console.log('🚀 Inicializacija Tourism Public...');
            
            // Naložimo konfiguracijo
            await this.loadConfig();
            
            // Nastavimo event listenerje
            this.setupEventListeners();
            
            // Naložimo statistike
            await this.loadStatistics();
            
            // Naložimo izpostavljene objekte
            await this.loadFeaturedObjects();
            
            // Inicializiramo zemljevid
            this.initializeMap();
            
            // Naložimo kategorije
            this.loadCategories();
            
            console.log('✅ Tourism Public inicializiran');
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji:', error);
            this.showNotification('Napaka pri nalaganju aplikacije', 'error');
        }
    }

    // ⚙️ NALAGANJE KONFIGURACIJE
    async loadConfig() {
        try {
            const response = await fetch('/api/tourism/config');
            if (!response.ok) throw new Error('Napaka pri nalaganju konfiguracije');
            
            this.config = await response.json();
            console.log('📋 Konfiguracija naložena:', this.config);
            
            // Napolnimo dropdown menije
            this.populateDropdowns();
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju konfiguracije:', error);
            // Uporabimo privzeto konfiguracijo
            this.config = this.getDefaultConfig();
        }
    }

    // 📊 NALAGANJE STATISTIK
    async loadStatistics() {
        try {
            const response = await fetch('/api/tourism/statistics');
            if (!response.ok) throw new Error('Napaka pri nalaganju statistik');
            
            const stats = await response.json();
            this.displayStatistics(stats);
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju statistik:', error);
            // Prikažimo privzete statistike
            this.displayStatistics({
                totalObjects: 0,
                totalReviews: 0,
                averageRating: 0,
                totalRegions: 0
            });
        }
    }

    // 🌟 NALAGANJE IZPOSTAVLJENIH OBJEKTOV
    async loadFeaturedObjects() {
        try {
            const response = await fetch('/api/tourism/objects?featured=true&limit=6');
            if (!response.ok) throw new Error('Napaka pri nalaganju izpostavljenih objektov');
            
            const data = await response.json();
            this.displayFeaturedObjects(data.objects || []);
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju izpostavljenih objektov:', error);
        }
    }

    // 🎯 NASTAVITEV EVENT LISTENERJEV
    setupEventListeners() {
        // Iskalni obrazec
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        // Napredni filtri
        const advancedFilters = document.querySelectorAll('.advanced-filter');
        advancedFilters.forEach(filter => {
            filter.addEventListener('change', () => this.updateFilters());
        });

        // Preklapljanje pogleda
        const viewToggle = document.querySelectorAll('.view-toggle .btn');
        viewToggle.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleView(btn.dataset.view);
            });
        });

        // Navigacija
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.dataset.section);
            });
        });

        // Kategorije
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                this.searchByCategory(type);
            });
        });

        // Sortiranje
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.performSearch());
        }

        // Iskanje v realnem času
        const searchInput = document.getElementById('searchQuery');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (searchInput.value.length >= 3 || searchInput.value.length === 0) {
                        this.performSearch();
                    }
                }, 500);
            });
        }
    }

    // 🔍 IZVAJANJE ISKANJA
    async performSearch(page = 1) {
        try {
            this.showLoading(true);
            this.currentPage = page;

            // Pripravimo parametre iskanja
            const params = new URLSearchParams({
                page: page,
                limit: this.itemsPerPage,
                query: document.getElementById('searchQuery')?.value || '',
                type: document.getElementById('objectType')?.value || '',
                region: document.getElementById('region')?.value || '',
                rating: document.getElementById('minRating')?.value || '',
                sortBy: document.getElementById('sortBy')?.value || 'name'
            });

            // Dodamo napredne filtre
            if (this.filters.certificates.length > 0) {
                params.append('certificates', this.filters.certificates.join(','));
            }
            if (this.filters.amenities.length > 0) {
                params.append('amenities', this.filters.amenities.join(','));
            }
            if (this.filters.priceRange) {
                params.append('priceRange', this.filters.priceRange);
            }

            const response = await fetch(`/api/tourism/objects/search?${params}`);
            if (!response.ok) throw new Error('Napaka pri iskanju');

            const data = await response.json();
            this.searchResults = data.objects || [];
            this.totalResults = data.total || 0;

            // Prikažimo rezultate
            this.displaySearchResults();
            this.updatePagination();
            this.updateMapMarkers();

            // Posodobimo URL
            this.updateURL(params);

        } catch (error) {
            console.error('❌ Napaka pri iskanju:', error);
            this.showNotification('Napaka pri iskanju objektov', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 📋 PRIKAZ REZULTATOV ISKANJA
    displaySearchResults() {
        const container = document.getElementById('searchResults');
        if (!container) return;

        // Posodobimo glavo rezultatov
        this.updateResultsHeader();

        // Prikažimo rezultate glede na trenutni pogled
        if (this.currentView === 'grid') {
            container.className = 'results-grid';
            container.innerHTML = this.searchResults.map(obj => this.createObjectCard(obj)).join('');
        } else {
            container.className = 'results-list';
            container.innerHTML = this.searchResults.map(obj => this.createObjectListItem(obj)).join('');
        }

        // Dodamo event listenerje za kartice
        this.setupObjectCardListeners();
    }

    // 🎴 USTVARJANJE KARTICE OBJEKTA
    createObjectCard(obj) {
        const badges = this.createBadges(obj);
        const certificates = this.createCertificates(obj);
        const rating = this.createRatingStars(obj.averageRating || 0);
        const image = obj.gallery && obj.gallery.length > 0 ? obj.gallery[0].url : '/images/placeholder.jpg';

        return `
            <div class="object-card" data-id="${obj.id}">
                <div class="object-image">
                    <img src="${image}" alt="${obj.name}" loading="lazy">
                    <div class="object-badges">
                        ${badges}
                    </div>
                </div>
                <div class="object-content">
                    <div class="object-header">
                        <h5 class="object-title">${obj.name}</h5>
                        <span class="object-type">${this.getTypeLabel(obj.type)}</span>
                    </div>
                    ${obj.slogan ? `<p class="object-slogan">"${obj.slogan}"</p>` : ''}
                    <div class="object-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${obj.city}, ${obj.region}</span>
                    </div>
                    <div class="object-rating">
                        <div class="rating-stars">${rating}</div>
                        <span class="rating-value">${(obj.averageRating || 0).toFixed(1)}</span>
                        <span class="rating-count">(${obj.reviewCount || 0} ocen)</span>
                    </div>
                    ${certificates ? `<div class="object-certificates">${certificates}</div>` : ''}
                    <div class="object-actions">
                        <button class="btn btn-view-details" onclick="tourismPublic.viewObjectDetails(${obj.id})">
                            <i class="fas fa-eye"></i> Podrobnosti
                        </button>
                        <button class="btn btn-view-location" onclick="tourismPublic.showOnMap(${obj.latitude}, ${obj.longitude})">
                            <i class="fas fa-map"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 📝 USTVARJANJE SEZNAMSKEGA ELEMENTA
    createObjectListItem(obj) {
        const badges = this.createBadges(obj);
        const certificates = this.createCertificates(obj);
        const rating = this.createRatingStars(obj.averageRating || 0);
        const image = obj.gallery && obj.gallery.length > 0 ? obj.gallery[0].url : '/images/placeholder.jpg';

        return `
            <div class="object-card object-list-item" data-id="${obj.id}">
                <div class="row g-0">
                    <div class="col-md-4">
                        <div class="object-image">
                            <img src="${image}" alt="${obj.name}" loading="lazy">
                            <div class="object-badges">
                                ${badges}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="object-content">
                            <div class="object-header">
                                <h5 class="object-title">${obj.name}</h5>
                                <span class="object-type">${this.getTypeLabel(obj.type)}</span>
                            </div>
                            ${obj.slogan ? `<p class="object-slogan">"${obj.slogan}"</p>` : ''}
                            <div class="object-location">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${obj.city}, ${obj.region}</span>
                            </div>
                            <div class="object-rating">
                                <div class="rating-stars">${rating}</div>
                                <span class="rating-value">${(obj.averageRating || 0).toFixed(1)}</span>
                                <span class="rating-count">(${obj.reviewCount || 0} ocen)</span>
                            </div>
                            ${obj.description ? `<p class="object-description">${obj.description.substring(0, 200)}...</p>` : ''}
                            ${certificates ? `<div class="object-certificates">${certificates}</div>` : ''}
                            <div class="object-actions">
                                <button class="btn btn-view-details" onclick="tourismPublic.viewObjectDetails(${obj.id})">
                                    <i class="fas fa-eye"></i> Podrobnosti
                                </button>
                                <button class="btn btn-view-location" onclick="tourismPublic.showOnMap(${obj.latitude}, ${obj.longitude})">
                                    <i class="fas fa-map"></i> Zemljevid
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 🏷️ USTVARJANJE ZNAČK
    createBadges(obj) {
        let badges = '';
        
        if (obj.featured) {
            badges += '<span class="object-badge featured"><i class="fas fa-star"></i> Izpostavljeno</span>';
        }
        
        if (obj.verified) {
            badges += '<span class="object-badge verified"><i class="fas fa-check-circle"></i> Preverjeno</span>';
        }
        
        if (obj.status === 'premium') {
            badges += '<span class="object-badge premium"><i class="fas fa-crown"></i> Premium</span>';
        }
        
        return badges;
    }

    // 🎖️ USTVARJANJE CERTIFIKATOV
    createCertificates(obj) {
        if (!obj.certificates || obj.certificates.length === 0) return '';
        
        return obj.certificates.map(cert => {
            const certConfig = this.config.certificates?.find(c => c.id === cert.type) || { name: cert.type, icon: 'fas fa-certificate' };
            return `
                <span class="certificate-badge" title="${certConfig.description || ''}">
                    <i class="${certConfig.icon}"></i>
                    ${certConfig.name}
                </span>
            `;
        }).join('');
    }

    // ⭐ USTVARJANJE ZVEZD ZA OCENO
    createRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Polne zvezde
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Polovična zvezda
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Prazne zvezde
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    // 👁️ PRIKAZ PODROBNOSTI OBJEKTA
    async viewObjectDetails(objectId) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/tourism/objects/${objectId}`);
            if (!response.ok) throw new Error('Napaka pri nalaganju objekta');
            
            const obj = await response.json();
            this.showObjectModal(obj);
            
        } catch (error) {
            console.error('❌ Napaka pri nalaganju objekta:', error);
            this.showNotification('Napaka pri nalaganju podrobnosti objekta', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 📱 PRIKAZ MODALNEGA OKNA Z OBJEKTOM
    showObjectModal(obj) {
        const modal = document.getElementById('objectModal');
        if (!modal) return;

        // Napolnimo vsebino modala
        document.getElementById('modalObjectTitle').textContent = obj.name;
        document.getElementById('modalObjectSlogan').textContent = obj.slogan || '';
        document.getElementById('modalObjectDescription').innerHTML = obj.description || '';
        
        // Galerija
        this.displayObjectGallery(obj.gallery || []);
        
        // Kontaktni podatki
        this.displayObjectContact(obj);
        
        // Ocene
        this.displayObjectReviews(obj.reviews || []);
        
        // Certifikati
        this.displayObjectCertificates(obj.certificates || []);
        
        // Delovni časi
        this.displayObjectHours(obj.operatingHours || []);
        
        // Cene
        this.displayObjectPricing(obj.pricing || []);
        
        // Prikažimo modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    // 🖼️ PRIKAZ GALERIJE
    displayObjectGallery(gallery) {
        const container = document.getElementById('modalGallery');
        if (!container || gallery.length === 0) return;

        const carousel = `
            <div id="objectCarousel" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                    ${gallery.map((img, index) => `
                        <div class="carousel-item ${index === 0 ? 'active' : ''}">
                            <img src="${img.url}" class="d-block w-100" alt="${img.alt || 'Slika objekta'}">
                            ${img.caption ? `<div class="carousel-caption">${img.caption}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${gallery.length > 1 ? `
                    <button class="carousel-control-prev" type="button" data-bs-target="#objectCarousel" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon"></span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#objectCarousel" data-bs-slide="next">
                        <span class="carousel-control-next-icon"></span>
                    </button>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = carousel;
    }

    // 🗺️ INICIALIZACIJA ZEMLJEVIDA
    initializeMap() {
        try {
            // Preverimo, ali je Leaflet na voljo
            if (typeof L === 'undefined') {
                console.warn('⚠️ Leaflet ni na voljo - zemljevid ne bo deloval');
                return;
            }

            const mapContainer = document.getElementById('tourism-map');
            if (!mapContainer) return;

            // Ustvarimo zemljevid
            this.map = L.map('tourism-map').setView([46.1512, 14.9955], 8); // Slovenija

            // Dodamo tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            console.log('🗺️ Zemljevid inicializiran');
            
        } catch (error) {
            console.error('❌ Napaka pri inicializaciji zemljevida:', error);
        }
    }

    // 📍 POSODOBITEV OZNAČEVALCEV NA ZEMLJEVIDU
    updateMapMarkers() {
        if (!this.map) return;

        // Odstranimo obstoječe označevalce
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Dodamo nove označevalce
        this.searchResults.forEach(obj => {
            if (obj.latitude && obj.longitude) {
                const marker = L.marker([obj.latitude, obj.longitude])
                    .bindPopup(`
                        <div class="map-popup">
                            <h6>${obj.name}</h6>
                            <p>${obj.city}, ${obj.region}</p>
                            <button class="btn btn-sm btn-primary" onclick="tourismPublic.viewObjectDetails(${obj.id})">
                                Podrobnosti
                            </button>
                        </div>
                    `)
                    .addTo(this.map);
                
                this.markers.push(marker);
            }
        });

        // Prilagodimo pogled zemljevida
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // 🎯 PRIKAZ NA ZEMLJEVIDU
    showOnMap(lat, lng) {
        if (!this.map) return;
        
        // Preklopimo na sekcijo z zemljevidom
        this.showSection('map');
        
        // Postavimo pogled na lokacijo
        this.map.setView([lat, lng], 15);
        
        // Poiščimo označevalec in odpri popup
        const marker = this.markers.find(m => 
            Math.abs(m.getLatLng().lat - lat) < 0.001 && 
            Math.abs(m.getLatLng().lng - lng) < 0.001
        );
        
        if (marker) {
            marker.openPopup();
        }
    }

    // 🔄 PREKLAPLJANJE POGLEDA
    toggleView(view) {
        this.currentView = view;
        
        // Posodobimo gumbke
        document.querySelectorAll('.view-toggle .btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Ponovno prikažimo rezultate
        this.displaySearchResults();
    }

    // 📄 POSODOBITEV PAGINACIJE
    updatePagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.totalResults / this.itemsPerPage);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagination = '<ul class="pagination">';
        
        // Prejšnja stran
        if (this.currentPage > 1) {
            pagination += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="tourismPublic.performSearch(${this.currentPage - 1})">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
            `;
        }
        
        // Strani
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            pagination += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="tourismPublic.performSearch(${i})">${i}</a>
                </li>
            `;
        }
        
        // Naslednja stran
        if (this.currentPage < totalPages) {
            pagination += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="tourismPublic.performSearch(${this.currentPage + 1})">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
        }
        
        pagination += '</ul>';
        container.innerHTML = pagination;
    }

    // 📊 PRIKAZ STATISTIK
    displayStatistics(stats) {
        const elements = {
            totalObjects: document.getElementById('totalObjects'),
            totalReviews: document.getElementById('totalReviews'),
            averageRating: document.getElementById('averageRating'),
            totalRegions: document.getElementById('totalRegions')
        };

        if (elements.totalObjects) elements.totalObjects.textContent = stats.totalObjects || 0;
        if (elements.totalReviews) elements.totalReviews.textContent = stats.totalReviews || 0;
        if (elements.averageRating) elements.averageRating.textContent = (stats.averageRating || 0).toFixed(1);
        if (elements.totalRegions) elements.totalRegions.textContent = stats.totalRegions || 0;
    }

    // 🌟 PRIKAZ IZPOSTAVLJENIH OBJEKTOV
    displayFeaturedObjects(objects) {
        const container = document.getElementById('featuredObjects');
        if (!container) return;

        if (objects.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Ni izpostavljenih objektov.</p>';
            return;
        }

        container.innerHTML = objects.map(obj => this.createObjectCard(obj)).join('');
        this.setupObjectCardListeners();
    }

    // 🏷️ NALAGANJE KATEGORIJ
    loadCategories() {
        const container = document.getElementById('categoriesGrid');
        if (!container || !this.config.objectTypes) return;

        const categories = this.config.objectTypes.map(type => ({
            id: type.id,
            name: type.name,
            icon: type.icon || 'fas fa-building',
            description: type.description || ''
        }));

        container.innerHTML = categories.map(cat => `
            <div class="col-md-4 col-lg-3">
                <div class="category-card" data-type="${cat.id}">
                    <div class="category-icon">
                        <i class="${cat.icon}"></i>
                    </div>
                    <h5>${cat.name}</h5>
                    <p>${cat.description}</p>
                </div>
            </div>
        `).join('');
    }

    // 🔍 ISKANJE PO KATEGORIJI
    searchByCategory(type) {
        document.getElementById('objectType').value = type;
        this.showSection('search');
        this.performSearch();
    }

    // 📱 PRIKAZ SEKCIJE
    showSection(sectionName) {
        // Skrijemo vse sekcije
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Prikažimo izbrano sekcijo
        const section = document.getElementById(`${sectionName}Section`);
        if (section) {
            section.classList.add('active');
        }
        
        // Posodobimo navigacijo
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const navLink = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }
        
        // Posebne akcije za določene sekcije
        if (sectionName === 'map' && this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
        }
    }

    // 🔄 NALAGANJE
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    // 🔔 OBVESTILA
    showNotification(message, type = 'info') {
        // Ustvarimo obvestilo
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Samodejno odstranimo po 5 sekundah
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // 🎯 POMOŽNE FUNKCIJE
    getTypeLabel(typeId) {
        const type = this.config.objectTypes?.find(t => t.id === typeId);
        return type ? type.name : typeId;
    }

    populateDropdowns() {
        // Tipi objektov
        const typeSelect = document.getElementById('objectType');
        if (typeSelect && this.config.objectTypes) {
            typeSelect.innerHTML = '<option value="">Vsi tipi</option>' +
                this.config.objectTypes.map(type => 
                    `<option value="${type.id}">${type.name}</option>`
                ).join('');
        }

        // Regije
        const regionSelect = document.getElementById('region');
        if (regionSelect && this.config.regions) {
            regionSelect.innerHTML = '<option value="">Vse regije</option>' +
                this.config.regions.map(region => 
                    `<option value="${region.id}">${region.name}</option>`
                ).join('');
        }
    }

    setupObjectCardListeners() {
        // Event listenerji za kartice objektov so že nastavljeni preko onclick atributov
        // Tukaj lahko dodamo dodatne listenerje, če je potrebno
    }

    updateFilters() {
        // Posodobimo filtre na podlagi naprednih filtrov
        // To implementiramo, ko dodamo napredne filtre v HTML
    }

    updateResultsHeader() {
        const header = document.querySelector('.results-header h4');
        if (header) {
            header.textContent = `Najdenih ${this.totalResults} objektov`;
        }
    }

    updateURL(params) {
        // Posodobimo URL z iskalnimi parametri
        const url = new URL(window.location);
        url.search = params.toString();
        window.history.replaceState({}, '', url);
    }

    getDefaultConfig() {
        return {
            objectTypes: [
                { id: 'hotel', name: 'Hotel', icon: 'fas fa-hotel' },
                { id: 'restaurant', name: 'Restavracija', icon: 'fas fa-utensils' },
                { id: 'camp', name: 'Kamp', icon: 'fas fa-campground' },
                { id: 'apartment', name: 'Apartma', icon: 'fas fa-home' }
            ],
            regions: [
                { id: 'ljubljana', name: 'Ljubljana' },
                { id: 'maribor', name: 'Maribor' },
                { id: 'celje', name: 'Celje' },
                { id: 'kranj', name: 'Kranj' }
            ],
            certificates: [
                { id: 'family_friendly', name: 'Družinam prijazno', icon: 'fas fa-child' },
                { id: 'pet_friendly', name: 'Hišni ljubljenčki', icon: 'fas fa-paw' },
                { id: 'eco_certified', name: 'Ekološko', icon: 'fas fa-leaf' }
            ]
        };
    }
}

// 🚀 INICIALIZACIJA
let tourismPublic;

document.addEventListener('DOMContentLoaded', () => {
    tourismPublic = new TourismPublic();
});

// 🌐 GLOBALNE FUNKCIJE
window.tourismPublic = tourismPublic;