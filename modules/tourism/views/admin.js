// 🚀 TURIZEM & GOSTINSTVO - ADMIN JAVASCRIPT

// 🌍 GLOBALNE SPREMENLJIVKE
let currentObjects = [];
let currentConfig = {};
let currentEditingId = null;

// 🎯 INICIALIZACIJA
$(document).ready(function() {
    initializeAdmin();
    loadDashboard();
    loadConfig();
});

// 🏗️ INICIALIZACIJA ADMIN PANELA
function initializeAdmin() {
    // 🔍 Select2 inicializacija
    $('.select2').select2({
        theme: 'bootstrap-5'
    });

    // 📱 Event listeners
    $('#search-input').on('keypress', function(e) {
        if (e.which === 13) {
            searchObjects();
        }
    });

    // 🔄 Filter change listeners
    $('#filter-type, #filter-region, #filter-status').on('change', function() {
        loadObjects();
    });

    // 📋 Form submissions
    $('#object-form').on('submit', function(e) {
        e.preventDefault();
        saveObject();
    });

    $('#settings-form').on('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });

    console.log('✅ Admin panel inicializiran');
}

// 📊 NADZORNA PLOŠČA
function loadDashboard() {
    showLoading();
    
    Promise.all([
        fetch('/api/tourism/objects').then(r => r.json()),
        fetch('/api/tourism/objects/stats').then(r => r.json())
    ]).then(([objectsData, statsData]) => {
        // 📈 Posodobi statistike
        if (objectsData.success) {
            $('#total-objects').text(objectsData.total || 0);
            
            const totalReviews = objectsData.data.reduce((sum, obj) => sum + (obj.total_reviews || 0), 0);
            $('#total-reviews').text(totalReviews);
            
            const avgRating = objectsData.data.reduce((sum, obj) => sum + (obj.overall_rating || 0), 0) / objectsData.data.length;
            $('#avg-rating').text(avgRating ? avgRating.toFixed(1) : '0.0');
        }

        // 📋 Najnovejši objekti
        loadRecentObjects();
        
        hideLoading();
    }).catch(error => {
        console.error('❌ Napaka pri nalaganju nadzorne plošče:', error);
        showAlert('Napaka pri nalaganju nadzorne plošče', 'danger');
        hideLoading();
    });
}

function refreshDashboard() {
    loadDashboard();
    showAlert('Nadzorna plošča osvežena', 'success');
}

// 📋 NAJNOVEJŠI OBJEKTI
function loadRecentObjects() {
    fetch('/api/tourism/objects?limit=10')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = $('#recent-objects-table tbody');
                tbody.empty();

                data.data.forEach(obj => {
                    const row = `
                        <tr>
                            <td>
                                <strong>${obj.name}</strong>
                                ${obj.slogan ? `<br><small class="text-muted">${obj.slogan}</small>` : ''}
                            </td>
                            <td><span class="badge bg-info">${getObjectTypeLabel(obj.type)}</span></td>
                            <td>${obj.city || ''}, ${obj.region || ''}</td>
                            <td>
                                <div class="rating-stars">
                                    ${generateStars(obj.overall_rating || 0)}
                                    <small class="text-muted">(${obj.total_reviews || 0})</small>
                                </div>
                            </td>
                            <td><span class="badge ${getStatusBadgeClass(obj.status)}">${obj.status}</span></td>
                            <td><small>${formatDate(obj.created_at)}</small></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" onclick="editObject(${obj.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-info" onclick="viewObject(${obj.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            }
        })
        .catch(error => {
            console.error('❌ Napaka pri nalaganju najnovejših objektov:', error);
        });
}

// 🏨 TURISTIČNI OBJEKTI
function loadObjects() {
    showLoading();
    
    const filters = {
        type: $('#filter-type').val(),
        region: $('#filter-region').val(),
        status: $('#filter-status').val()
    };

    // 🔗 Sestavi URL z filtri
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
        if (filters[key]) {
            params.append(key, filters[key]);
        }
    });

    fetch(`/api/tourism/objects?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentObjects = data.data;
                renderObjectsTable(data.data);
            } else {
                showAlert('Napaka pri nalaganju objektov', 'danger');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('❌ Napaka pri nalaganju objektov:', error);
            showAlert('Napaka pri nalaganju objektov', 'danger');
            hideLoading();
        });
}

function renderObjectsTable(objects) {
    const tbody = $('#objects-table tbody');
    tbody.empty();

    if (objects.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <br>Ni najdenih objektov
                </td>
            </tr>
        `);
        return;
    }

    objects.forEach(obj => {
        const row = `
            <tr>
                <td>
                    ${obj.main_image ? 
                        `<img src="${obj.main_image.thumbnail_path || obj.main_image.image_url}" 
                             class="image-preview" alt="${obj.name}">` : 
                        '<div class="bg-light rounded d-flex align-items-center justify-content-center" style="width:60px;height:60px;"><i class="fas fa-image text-muted"></i></div>'
                    }
                </td>
                <td>
                    <strong>${obj.name}</strong>
                    ${obj.slogan ? `<br><small class="text-muted">${obj.slogan}</small>` : ''}
                    ${obj.featured ? '<br><span class="badge bg-warning">Izpostavljeno</span>' : ''}
                    ${obj.verified ? '<br><span class="badge bg-success">Preverjeno</span>' : ''}
                </td>
                <td><span class="badge bg-info">${getObjectTypeLabel(obj.type)}</span></td>
                <td>
                    ${obj.city || ''}<br>
                    <small class="text-muted">${obj.region || ''}</small>
                </td>
                <td>
                    <div class="rating-stars">
                        ${generateStars(obj.overall_rating || 0)}
                        <br><small>${(obj.overall_rating || 0).toFixed(1)}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">${obj.total_reviews || 0}</span>
                </td>
                <td><span class="badge ${getStatusBadgeClass(obj.status)}">${obj.status}</span></td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editObject(${obj.id})" title="Uredi">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="viewObject(${obj.id})" title="Poglej">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="manageGallery(${obj.id})" title="Galerija">
                            <i class="fas fa-images"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteObject(${obj.id})" title="Izbriši">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

// 🔍 ISKANJE OBJEKTOV
function searchObjects() {
    const searchTerm = $('#search-input').val().trim();
    
    if (searchTerm.length < 2) {
        showAlert('Vnesite vsaj 2 znaka za iskanje', 'warning');
        return;
    }

    showLoading();

    const filters = {
        type: $('#filter-type').val(),
        region: $('#filter-region').val(),
        min_rating: $('#filter-min-rating').val()
    };

    const params = new URLSearchParams({ q: searchTerm });
    Object.keys(filters).forEach(key => {
        if (filters[key]) {
            params.append(key, filters[key]);
        }
    });

    fetch(`/api/tourism/objects/search?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderObjectsTable(data.data);
                showAlert(`Najdenih ${data.total} rezultatov za "${searchTerm}"`, 'info');
            } else {
                showAlert('Napaka pri iskanju', 'danger');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('❌ Napaka pri iskanju:', error);
            showAlert('Napaka pri iskanju', 'danger');
            hideLoading();
        });
}

// 🆕 DODAJANJE/UREJANJE OBJEKTA
function showAddObjectModal() {
    currentEditingId = null;
    $('#modal-title').text('Dodaj nov objekt');
    $('#object-form')[0].reset();
    populateFormSelects();
    $('#objectModal').modal('show');
}

function editObject(id) {
    currentEditingId = id;
    $('#modal-title').text('Uredi objekt');
    
    showLoading();
    
    fetch(`/api/tourism/objects/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateObjectForm(data.data);
                $('#objectModal').modal('show');
            } else {
                showAlert('Napaka pri nalaganju objekta', 'danger');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('❌ Napaka pri nalaganju objekta:', error);
            showAlert('Napaka pri nalaganju objekta', 'danger');
            hideLoading();
        });
}

function populateObjectForm(obj) {
    $('#object-name').val(obj.name || '');
    $('#object-type').val(obj.type || '');
    $('#object-slogan').val(obj.slogan || '');
    $('#object-description').val(obj.description || '');
    $('#object-address').val(obj.address || '');
    $('#object-city').val(obj.city || '');
    $('#object-region').val(obj.region || '');
    $('#object-latitude').val(obj.gps_latitude || '');
    $('#object-longitude').val(obj.gps_longitude || '');
    $('#object-phone').val(obj.phone || '');
    $('#object-email').val(obj.email || '');
    $('#object-website').val(obj.website || '');
    $('#object-status').val(obj.status || 'aktivno');
    $('#object-featured').prop('checked', obj.featured === 1);
    $('#object-verified').prop('checked', obj.verified === 1);
}

function saveObject() {
    const formData = {
        name: $('#object-name').val(),
        type: $('#object-type').val(),
        slogan: $('#object-slogan').val(),
        description: $('#object-description').val(),
        address: $('#object-address').val(),
        city: $('#object-city').val(),
        region: $('#object-region').val(),
        gps_latitude: parseFloat($('#object-latitude').val()) || null,
        gps_longitude: parseFloat($('#object-longitude').val()) || null,
        phone: $('#object-phone').val(),
        email: $('#object-email').val(),
        website: $('#object-website').val(),
        status: $('#object-status').val(),
        featured: $('#object-featured').is(':checked'),
        verified: $('#object-verified').is(':checked')
    };

    // ✅ Validacija
    if (!formData.name || !formData.type) {
        showAlert('Naziv in tip objekta sta obvezna', 'warning');
        return;
    }

    showLoading();

    const url = currentEditingId ? 
        `/api/tourism/objects/${currentEditingId}` : 
        '/api/tourism/objects';
    
    const method = currentEditingId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            $('#objectModal').modal('hide');
            loadObjects();
            showAlert(currentEditingId ? 'Objekt uspešno posodobljen' : 'Objekt uspešno dodan', 'success');
        } else {
            showAlert(data.error || 'Napaka pri shranjevanju objekta', 'danger');
        }
        hideLoading();
    })
    .catch(error => {
        console.error('❌ Napaka pri shranjevanju objekta:', error);
        showAlert('Napaka pri shranjevanju objekta', 'danger');
        hideLoading();
    });
}

function deleteObject(id) {
    if (!confirm('Ali ste prepričani, da želite izbrisati ta objekt? Ta dejanja ni mogoče razveljaviti.')) {
        return;
    }

    showLoading();

    fetch(`/api/tourism/objects/${id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadObjects();
            showAlert('Objekt uspešno izbrisan', 'success');
        } else {
            showAlert(data.error || 'Napaka pri brisanju objekta', 'danger');
        }
        hideLoading();
    })
    .catch(error => {
        console.error('❌ Napaka pri brisanju objekta:', error);
        showAlert('Napaka pri brisanju objekta', 'danger');
        hideLoading();
    });
}

// 📸 GALERIJA
function manageGallery(objectId) {
    // TODO: Implementiraj upravljanje galerije
    showAlert('Upravljanje galerije bo kmalu na voljo', 'info');
}

// ⭐ OCENE
function loadPendingReviews() {
    // TODO: Implementiraj nalaganje čakajočih ocen
    showAlert('Upravljanje ocen bo kmalu na voljo', 'info');
}

function loadApprovedReviews() {
    // TODO: Implementiraj nalaganje odobrenih ocen
    showAlert('Upravljanje ocen bo kmalu na voljo', 'info');
}

// 🔧 KONFIGURACIJA
function loadConfig() {
    fetch('/api/tourism/config')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentConfig = data.data;
                populateFormSelects();
            }
        })
        .catch(error => {
            console.error('❌ Napaka pri nalaganju konfiguracije:', error);
        });
}

function populateFormSelects() {
    // 🏢 Tipi objektov
    const typeSelect = $('#object-type, #filter-type');
    typeSelect.empty().append('<option value="">Izberi tip</option>');
    
    if (currentConfig.object_types) {
        Object.entries(currentConfig.object_types).forEach(([key, value]) => {
            typeSelect.append(`<option value="${value}">${getObjectTypeLabel(value)}</option>`);
        });
    }

    // 🌍 Regije
    const regionSelect = $('#object-region, #filter-region');
    regionSelect.empty().append('<option value="">Izberi regijo</option>');
    
    if (currentConfig.slovenian_regions) {
        currentConfig.slovenian_regions.forEach(region => {
            regionSelect.append(`<option value="${region}">${region}</option>`);
        });
    }
}

// 🎨 HELPER FUNKCIJE
function showSection(sectionName) {
    // 🔄 Skrij vse sekcije
    $('.content-section').hide();
    
    // 📋 Prikaži izbrano sekcijo
    $(`#${sectionName}-section`).show();
    
    // 🎯 Posodobi navigacijo
    $('.sidebar .nav-link').removeClass('active');
    $(`.sidebar .nav-link[onclick="showSection('${sectionName}')"]`).addClass('active');
    
    // 📊 Naloži podatke za sekcijo
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'objects':
            loadObjects();
            break;
        case 'reviews':
            loadPendingReviews();
            break;
        case 'gallery':
            // loadGallery();
            break;
        case 'certificates':
            // loadCertificates();
            break;
        case 'analytics':
            // loadAnalytics();
            break;
    }
}

function toggleSidebar() {
    $('#sidebar').toggleClass('show');
}

function showLoading() {
    $('#loading').show();
}

function hideLoading() {
    $('#loading').hide();
}

function showAlert(message, type = 'info') {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // 📍 Dodaj alert na vrh glavne vsebine
    $('.main-content').prepend(alertHtml);
    
    // 🕐 Samodejno skrij po 5 sekundah
    setTimeout(() => {
        $('.alert').fadeOut();
    }, 5000);
}

function getObjectTypeLabel(type) {
    const labels = {
        'hotel': 'Hotel',
        'hostel': 'Hostel',
        'kamp': 'Kamp',
        'apartma': 'Apartma',
        'penzion': 'Penzion',
        'restavracija': 'Restavracija',
        'kavarna': 'Kavarna',
        'wellness_center': 'Wellness center',
        'vinoteka': 'Vinoteka',
        'spa': 'SPA',
        'resort': 'Resort',
        'glamping': 'Glamping',
        'turistični_apartma': 'Turistični apartma',
        'hiša_za_najem': 'Hiša za najem',
        'motel': 'Motel',
        'bed_and_breakfast': 'B&B'
    };
    return labels[type] || type;
}

function getStatusBadgeClass(status) {
    const classes = {
        'aktivno': 'bg-success',
        'neaktivno': 'bg-secondary',
        'sezonsko': 'bg-warning',
        'podaljšan_delovni_čas': 'bg-info',
        'delno_zaprto': 'bg-warning'
    };
    return classes[status] || 'bg-secondary';
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // ⭐ Polne zvezde
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // 🌟 Polovična zvezda
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // ☆ Prazne zvezde
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('sl-SI', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function viewObject(id) {
    // 🔗 Odpri objekt v novem zavihku
    window.open(`/tourism/object/${id}`, '_blank');
}

// 📱 RESPONSIVE HANDLING
$(window).resize(function() {
    if ($(window).width() > 768) {
        $('#sidebar').removeClass('show');
    }
});

console.log('✅ Admin JavaScript naložen');