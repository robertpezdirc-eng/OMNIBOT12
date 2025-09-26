// 🧭 Module Navigation Component - Navigacija med moduli
import { useState } from "react";

export default function ModuleNavigation({ user, activeModule, onModuleChange }) {
  // 📋 Available Modules Configuration
  const modules = [
    {
      id: 'auth',
      name: 'Avtentikacija',
      icon: '🔐',
      description: 'Upravljanje uporabnikov in prijav',
      requiredPlan: null, // Available to all
      status: 'active'
    },
    {
      id: 'license',
      name: 'Licence',
      icon: '📄',
      description: 'Upravljanje paketov in licenc',
      requiredPlan: null, // Available to all
      status: 'active'
    },
    {
      id: 'tourism',
      name: 'Turizem',
      icon: '🏖️',
      description: 'Rezervacije in turistične ponudbe',
      requiredPlan: ['premium', 'enterprise'],
      status: 'development'
    },
    {
      id: 'horeca',
      name: 'Gostinstvo',
      icon: '🍽️',
      description: 'Meniji, naročila in gostinske storitve',
      requiredPlan: ['premium', 'enterprise'],
      status: 'development'
    },
    {
      id: 'admin',
      name: 'Administracija',
      icon: '⚙️',
      description: 'Sistemska administracija',
      requiredPlan: null,
      status: 'active',
      adminOnly: true
    }
  ];

  // 🔒 Check if user has access to module
  const hasAccess = (module) => {
    // Admin only modules
    if (module.adminOnly && user?.role !== 'admin') {
      return false;
    }

    // No plan requirement - available to all
    if (!module.requiredPlan) {
      return true;
    }

    // Check if user has required plan
    return user?.plan && module.requiredPlan.includes(user.plan);
  };

  // 🎨 Get module status styling
  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return { color: '#4CAF50', badge: '✅' };
      case 'development':
        return { color: '#FF9800', badge: '🟡' };
      case 'inactive':
        return { color: '#f44336', badge: '🔴' };
      default:
        return { color: '#9E9E9E', badge: '⚪' };
    }
  };

  return (
    <div className="module-navigation">
      <div className="navigation-header">
        <h3>🧭 Moduli platforme</h3>
        <div className="user-info">
          <span className="user-name">👤 {user?.firstName} {user?.lastName}</span>
          <span className={`user-plan plan-${user?.plan}`}>
            {user?.plan?.toUpperCase() || 'BREZ PAKETA'}
          </span>
        </div>
      </div>

      <div className="modules-grid">
        {modules.map((module) => {
          const hasModuleAccess = hasAccess(module);
          const statusStyle = getStatusStyle(module.status);
          const isActive = activeModule === module.id;

          return (
            <div
              key={module.id}
              className={`module-card ${isActive ? 'active' : ''} ${!hasModuleAccess ? 'locked' : ''}`}
              onClick={() => hasModuleAccess && onModuleChange(module.id)}
            >
              <div className="module-header">
                <span className="module-icon">{module.icon}</span>
                <div className="module-status">
                  <span 
                    className="status-badge"
                    style={{ color: statusStyle.color }}
                    title={`Status: ${module.status}`}
                  >
                    {statusStyle.badge}
                  </span>
                </div>
              </div>

              <div className="module-content">
                <h4 className="module-name">{module.name}</h4>
                <p className="module-description">{module.description}</p>

                {/* Access Requirements */}
                {module.requiredPlan && (
                  <div className="module-requirements">
                    <small>
                      📋 Potrebuje: {module.requiredPlan.map(plan => plan.toUpperCase()).join(' ali ')}
                    </small>
                  </div>
                )}

                {module.adminOnly && (
                  <div className="module-requirements">
                    <small>👑 Samo za administratorje</small>
                  </div>
                )}

                {/* Access Status */}
                <div className="module-access">
                  {hasModuleAccess ? (
                    <span className="access-granted">✅ Dostop omogočen</span>
                  ) : (
                    <span className="access-denied">
                      {module.adminOnly ? '🔒 Potrebne admin pravice' : '🔒 Potreben višji paket'}
                    </span>
                  )}
                </div>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <div className="active-indicator">
                  <span>📍 Aktiven</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Module Status Legend */}
      <div className="status-legend">
        <h4>📊 Legenda statusov</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span style={{ color: '#4CAF50' }}>✅</span>
            <span>Delujoče</span>
          </div>
          <div className="legend-item">
            <span style={{ color: '#FF9800' }}>🟡</span>
            <span>V razvoju / testni fazi</span>
          </div>
          <div className="legend-item">
            <span style={{ color: '#f44336' }}>🔴</span>
            <span>Še ni implementirano</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>⚡ Hitre akcije</h4>
        <div className="action-buttons">
          {user?.plan && ['premium', 'enterprise'].includes(user.plan) && (
            <>
              <button 
                onClick={() => onModuleChange('tourism')}
                className="quick-action-btn tourism"
              >
                🏖️ Nova rezervacija
              </button>
              <button 
                onClick={() => onModuleChange('horeca')}
                className="quick-action-btn horeca"
              >
                🍽️ Novo naročilo
              </button>
            </>
          )}
          <button 
            onClick={() => onModuleChange('license')}
            className="quick-action-btn license"
          >
            📄 Upravljaj paket
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => onModuleChange('admin')}
              className="quick-action-btn admin"
            >
              ⚙️ Admin panel
            </button>
          )}
        </div>
      </div>

      {/* Platform Info */}
      <div className="platform-info">
        <h4>ℹ️ O platformi</h4>
        <div className="info-items">
          <div className="info-item">
            <strong>🏗️ Arhitektura:</strong>
            <p>React Frontend ↔ Node.js Backend ↔ MongoDB/PostgreSQL</p>
          </div>
          <div className="info-item">
            <strong>🔔 Obvestila:</strong>
            <p>Socket.io za realnočasovne posodobitve</p>
          </div>
          <div className="info-item">
            <strong>⏰ Avtomatizacija:</strong>
            <p>Cron job za upravljanje licenc</p>
          </div>
        </div>
      </div>
    </div>
  );
}