import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isPremium, isBasic, isDemo, logout } = useAuth();
  const navigate = useNavigate();

  const getPlanBadge = () => {
    if (isPremium) {
      return { text: '⭐ Premium', style: styles.premiumBadge };
    } else if (isBasic) {
      return { text: '✓ Basic', style: styles.basicBadge };
    } else if (isDemo) {
      return { text: '◯ Demo', style: styles.demoBadge };
    }
    return null;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.navbar}>
      <div className="container" style={styles.navContainer}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoText}>🧠 Omni</span>
        </Link>
        
        <div style={styles.navLinks}>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" style={styles.navLink}>
                Dashboard
              </Link>
              <Link to="/plans" style={styles.navLink}>
                Plani
              </Link>
              {isAdmin && (
                <Link to="/admin" style={styles.navLink}>
                  Admin Panel
                </Link>
              )}
              <div style={styles.userInfo}>
                <span style={styles.userEmail}>{user?.email}</span>
                {user?.plan && getPlanBadge() && (
                  <span style={getPlanBadge().style}>{getPlanBadge().text}</span>
                )}
                <button 
                  onClick={handleLogout}
                  style={styles.logoutBtn}
                >
                  Odjava
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.navLink}>
                Prijava
              </Link>
              <Link to="/register" style={styles.registerBtn}>
                Registracija
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '12px 0',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    textDecoration: 'none',
    color: '#333',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  navLink: {
    textDecoration: 'none',
    color: '#333',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
  },
  registerBtn: {
    textDecoration: 'none',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '500',
    transition: 'transform 0.2s ease',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#666',
  },
  premiumBadge: {
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#333',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  basicBadge: {
    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  demoBadge: {
    background: '#e9ecef',
    color: '#6c757d',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #dc3545',
    color: '#dc3545',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
};

export default Navbar;