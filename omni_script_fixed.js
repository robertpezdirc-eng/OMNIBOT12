// 🚀 Omni Dashboard - Popravljena JavaScript koda
// Popravka: Pravilna uporaba SVG namespace za createElementNS

const linksSVG = document.getElementById("links"); 
const dashboard = document.getElementById("dashboard"); 
const infoBox = document.getElementById("info-box"); 

let nodes = [{id: "global", icon: "🌐", top: 50, left: 600, parent: null}]; 
let lines = []; 
let nodeStatuses = {global: "⏳ Loading..."}; 

// Safe DOM element getter
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

// Safe text content updater
function safeUpdateText(id, text) {
    const element = safeGetElement(id);
    if (element) {
        element.textContent = text;
    }
}

// Kreiranje node-a 
function createNode(id, icon, top = null, left = null, parent = null) { 
    try {
        const div = document.createElement("div"); 
        div.className = "node"; 
        div.id = id; 
        div.style.top = (top || 200) + "px"; 
        div.style.left = (left || 100) + "px"; 
        div.innerHTML = `${icon} ${id}<span class="status" id="status-${id}">⏳ Loading...</span>`; 
        
        const dashboardEl = safeGetElement("dashboard");
        if (dashboardEl) {
            dashboardEl.appendChild(div); 
        }
        
        nodes.push({id, icon, top, left, parent}); 
        nodeStatuses[id] = "⏳ Loading..."; 
        attachNodeClick(div); 
        makeDraggable(div); 
        autoLayout(); 
    } catch (error) {
        console.error('Error creating node:', error);
        showSystemAlert(`Napaka pri ustvarjanju modula ${id}: ${error.message}`, 'error');
    }
} 

// Odstranjevanje node-a 
function removeNode(id) { 
    try {
        if (id === "global") {
            showSystemAlert("Global Optimizer ne more biti odstranjen!", 'warning');
            return;
        }
        
        const div = safeGetElement(id); 
        const dashboardEl = safeGetElement("dashboard");
        
        if (div && dashboardEl) {
            dashboardEl.removeChild(div); 
        }
        
        nodes.filter(n => n.id === id || n.parent === id).forEach(n => { 
            const d = safeGetElement(n.id); 
            if (d && dashboardEl) {
                dashboardEl.removeChild(d); 
            }
            delete nodeStatuses[n.id]; 
        }); 
        
        nodes = nodes.filter(n => n.id !== id && n.parent !== id); 
        updateConnections();
        autoLayout(); 
        showSystemAlert(`Modul ${id} uspešno odstranjen`, 'success');
    } catch (error) {
        console.error('Error removing node:', error);
        showSystemAlert(`Napaka pri odstranjevanju modula ${id}: ${error.message}`, 'error');
    }
} 

// Povezovanje node-ov - POPRAVKA: Pravilna uporaba SVG namespace
function updateConnections() { 
    try {
        const linksEl = safeGetElement("links");
        if (!linksEl) return;
        
        // Odstrani obstoječe linije
        lines.forEach(l => {
            if (l.line && l.line.parentNode) {
                l.line.parentNode.removeChild(l.line);
            }
        }); 
        lines = []; 
        
        nodes.filter(n => n.id !== "global").forEach(n => { 
            const parentId = n.parent || "global"; 
            const source = safeGetElement(parentId); 
            const target = safeGetElement(n.id); 
            
            if (!source || !target) return;
            
            const x1 = source.offsetLeft + source.offsetWidth / 2; 
            const y1 = source.offsetTop + source.offsetHeight / 2; 
            const x2 = target.offsetLeft + target.offsetWidth / 2; 
            const y2 = target.offsetTop + target.offsetHeight / 2; 
            
            // POPRAVKA: Pravilna uporaba SVG namespace
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line"); 
            line.setAttribute("x1", x1); 
            line.setAttribute("y1", y1); 
            line.setAttribute("x2", x2); 
            line.setAttribute("y2", y2); 
            line.setAttribute("class", "link"); 
            
            linksEl.appendChild(line); 
            lines.push({line: line, target: n.id}); 
        }); 
    } catch (error) {
        console.error('Error updating connections:', error);
    }
} 

// Info-box 
function attachNodeClick(div) { 
    if (!div) return;
    
    div.onclick = () => { 
        try {
            const id = div.id; 
            const status = nodeStatuses[id] || "⏳ Loading..."; 
            const infoBoxEl = safeGetElement("info-box");
            
            if (infoBoxEl) {
                infoBoxEl.innerHTML = `<strong>${id.toUpperCase()}</strong><br>Status: ${status}<br>Opis funkcije modula ${id}`; 
            }
        } catch (error) {
            console.error('Error in node click handler:', error);
        }
    } 
} 

// Inicializacija global node click handler
document.addEventListener('DOMContentLoaded', function() {
    const globalNode = safeGetElement("global");
    if (globalNode) {
        attachNodeClick(globalNode); 
    }
});

// Drag & Drop z viewport constraints
function makeDraggable(el) { 
    if (!el) return;
    
    let offsetX, offsetY; 
    el.onmousedown = (e) => { 
        try {
            offsetX = e.clientX - el.offsetLeft; 
            offsetY = e.clientY - el.offsetTop; 
            
            function moveHandler(e) { 
                // Viewport constraints
                const newLeft = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - offsetX));
                const newTop = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - offsetY));
                
                el.style.left = newLeft + "px"; 
                el.style.top = newTop + "px"; 
                updateConnections(); 
            } 
            
            function upHandler() {
                document.removeEventListener("mousemove", moveHandler);
                document.removeEventListener("mouseup", upHandler);
                
                // Posodobi pozicijo v nodes array
                const nodeIndex = nodes.findIndex(n => n.id === el.id);
                if (nodeIndex !== -1) {
                    nodes[nodeIndex].left = parseInt(el.style.left);
                    nodes[nodeIndex].top = parseInt(el.style.top);
                }
            } 
            
            document.addEventListener("mousemove", moveHandler); 
            document.addEventListener("mouseup", upHandler); 
        } catch (error) {
            console.error('Error in drag handler:', error);
        }
    } 
}

// Smart Auto-Layout funkcija
function autoLayout() {
    try {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const radius = Math.min(centerX, centerY) * 0.6;
        
        // Pozicioniraj global node v center
        const globalNode = safeGetElement("global");
        if (globalNode) {
            globalNode.style.left = (centerX - 50) + "px";
            globalNode.style.top = (centerY - 25) + "px";
        }
        
        // Pozicioniraj ostale node-e v krogu
        const otherNodes = nodes.filter(n => n.id !== "global");
        otherNodes.forEach((node, index) => {
            const angle = (2 * Math.PI * index) / otherNodes.length;
            const x = centerX + radius * Math.cos(angle) - 50;
            const y = centerY + radius * Math.sin(angle) - 25;
            
            const nodeEl = safeGetElement(node.id);
            if (nodeEl) {
                nodeEl.style.left = Math.max(0, x) + "px";
                nodeEl.style.top = Math.max(0, y) + "px";
                
                // Posodobi pozicijo v nodes array
                node.left = Math.max(0, x);
                node.top = Math.max(0, y);
            }
        });
        
        // Posodobi povezave
        setTimeout(updateConnections, 100);
        showSystemAlert("Smart Auto-Layout uspešno izveden", 'success');
    } catch (error) {
        console.error('Error in auto layout:', error);
        showSystemAlert(`Napaka pri auto-layout: ${error.message}`, 'error');
    }
}

// System alert funkcija
function showSystemAlert(message, type = 'info') {
    try {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove po 5 sekundah
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('Error showing alert:', error);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    try {
        // Ctrl+A za auto-layout
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            autoLayout();
        }
        
        // Delete za odstranitev izbranega node-a
        if (e.key === 'Delete') {
            const selectedNode = document.querySelector('.node.selected');
            if (selectedNode && selectedNode.id !== 'global') {
                removeNode(selectedNode.id);
            }
        }
        
        // Escape za preklic izbora
        if (e.key === 'Escape') {
            document.querySelectorAll('.node.selected').forEach(node => {
                node.classList.remove('selected');
            });
        }
    } catch (error) {
        console.error('Error in keyboard handler:', error);
    }
});

// Window resize handler z optimizacijo
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        try {
            updateConnections();
            showSystemAlert("Layout prilagojen novi velikosti okna", 'info');
        } catch (error) {
            console.error('Error in resize handler:', error);
        }
    }, 250);
});

// Inicializacija ob nalaganju strani
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('🚀 Omni Dashboard inicializiran');
        
        // Inicializiraj povezave
        setTimeout(() => {
            updateConnections();
        }, 100);
        
        showSystemAlert("Omni Dashboard uspešno naložen", 'success');
    } catch (error) {
        console.error('Error during initialization:', error);
        showSystemAlert(`Napaka pri inicializaciji: ${error.message}`, 'error');
    }
});

// Export funkcij za globalno uporabo
window.OmniDashboard = {
    createNode,
    removeNode,
    updateConnections,
    autoLayout,
    showSystemAlert,
    nodes,
    nodeStatuses
};