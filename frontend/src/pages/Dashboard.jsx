import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, isAdmin, isPremium, isBasic, isDemo } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Poskusi pridobiti admin statistike, če je uporabnik admin
      if (isAdmin) {
        const response = await axios.get('/api/admin');
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Napaka pri pridobivanju podatkov:', err);
      setError('Napaka pri nalaganju podatkov');
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadge = () => {
    if (isPremium) {
      return { text: '⭐ Premium', style: styles.premiumBanner };
    } else if (isBasic) {
      return { text: '🔹 Basic', style: styles.basicBanner };
    } else {
      return { text: '🆓 Demo', style: styles.demoBanner };
    }
  };

  const isFeatureAccessible = (featureLevel) => {
    if (isPremium) return true;
    if (isBasic && featureLevel !== 'premium') return true;
    if (isDemo && featureLevel === 'demo') return true;
    return false;
  };

  const features = [
    {
      icon: '🏨',
      title: 'Turizem & Gostinstvo',
      description: 'Itinerarji, aktivnosti, marketing, lokalna kultura',
      status: 'Kmalu na voljo',
      level: 'demo'
    },
    {
      icon: '🌱',
      title: 'Kmetijstvo & Živinoreja',
      description: 'Pridelava, sezonski nasveti, trženje, ekološko kmetijstvo',
      status: 'Kmalu na voljo',
      level: 'basic'
    },
    {
      icon: '💻',
      title: 'IT & Programiranje',
      description: 'Python, JS, SQL, API integracije, skripte, prototipi',
      status: 'Kmalu na voljo',
      level: 'basic'
    },
    {
      icon: '📈',
      title: 'Marketing & Prodaja',
      description: 'Kampanje, vsebine, social media, ROI, konverzije',
      status: 'Kmalu na voljo',
      level: 'premium'
    },
    {
      icon: '🎓',
      title: 'Izobraževanje',
      description: 'Učni načrti, gradiva, interaktivni primeri',
      status: 'Kmalu na voljo',
      level: 'basic'
    },
    {
      icon: '💰',
      title: 'Finančno Svetovanje',
      description: 'Proračuni, investicije, strategije, analize',
      status: 'Kmalu na voljo',
      level: 'premium'
    }
  ];

  return (
    <div style={styles.container}>
      <div className="container">
        {/* Pozdrav */}
        <section style={styles.welcome}>
          <h1 style={styles.welcomeTitle}>
            Dobrodošli, {user?.email}! 👋
          </h1>
          <p style={styles.welcomeText}>
            Vaš osebni Omni dashboard je pripravljen za uporabo.
          </p>
          
          {user?.plan && (
            <div style={getPlanBadge().style}>
              <span>{getPlanBadge().text}</span>
            </div>
          )}
        </section>

        {/* Admin statistike */}
        {isAdmin && (
          <section style={styles.adminStats}>
            <h2 style={styles.sectionTitle}>Admin Pregled</h2>
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : error ? (
              <div className="alert alert-error">{error}</div>
            ) : stats ? (
              <div style={styles.statsGrid}>
                <div className="card" style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.totalUsers}</div>
                  <div style={styles.statLabel}>Skupaj uporabnikov</div>
                </div>
                <div className="card" style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.adminUsers}</div>
                  <div style={styles.statLabel}>Admin uporabnikov</div>
                </div>
                <div className="card" style={styles.statCard}>
                  <div style={styles.statNumber}>{stats.premiumUsers}</div>
                  <div style={styles.statLabel}>Premium uporabnikov</div>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* Funkcionalnosti */}
        <section style={styles.features}>
          <h2 style={styles.sectionTitle}>Dostopne Funkcionalnosti</h2>
          <div style={styles.featureGrid}>
            {features.map((feature, index) => {
              const accessible = isFeatureAccessible(feature.level);
              return (
                <div 
                  key={index} 
                  className="card" 
                  style={{
                    ...styles.featureCard,
                    ...(accessible ? {} : styles.lockedFeature)
                  }}
                >
                  <div style={styles.featureIcon}>{feature.icon}</div>
                  <h3 style={styles.featureTitle}>{feature.title}</h3>
                  <p style={styles.featureDescription}>{feature.description}</p>
                  <div style={styles.featureStatus}>
                    {accessible ? (
                      <span style={styles.statusBadge}>{feature.status}</span>
                    ) : (
                      <div>
                        <span style={styles.lockedBadge}>🔒 Zaklenjeno</span>
                        <p style={styles.upgradeText}>
                          Potreben {feature.level === 'premium' ? 'Premium' : 'Basic'} plan
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hitri dostop */}
        <section style={styles.quickAccess}>
          <h2 style={styles.sectionTitle}>Hitri Dostop</h2>
          <div style={styles.quickGrid}>
            <div className="card" style={styles.quickCard}>
              <h4>💎 Upravljaj Plan</h4>
              <p>Nadgradi ali spremeni svoj naročniški plan</p>
              <button className="btn btn-primary">
                Upravljaj Plan
              </button>
            </div>
            
            <div className="card" style={styles.quickCard}>
              <h4>📊 Analitika</h4>
              <p>Pregled vaših projektov in aktivnosti</p>
              <button className="btn btn-secondary" disabled>
                Kmalu na voljo
              </button>
            </div>
            
            <div className="card" style={styles.quickCard}>
              <h4>⚙️ Nastavitve</h4>
              <p>Konfigurirajte svoje nastavitve</p>
              <button className="btn btn-secondary" disabled>
                Kmalu na voljo
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 60px)',
    paddingTop: '40px',
    paddingBottom: '40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  welcome: {
    textAlign: 'center',
    marginBottom: '60px',
    color: 'white',
  },
  welcomeTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  welcomeText: {
    fontSize: '1.2rem',
    opacity: '0.9',
    marginBottom: '20px',
  },
  premiumBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#333',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
  },
  basicBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
  },
  demoBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#e9ecef',
    color: '#6c757d',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
  },
  lockedFeature: {
    opacity: '0.6',
    background: '#f8f9fa',
    border: '2px dashed #dee2e6',
  },
  lockedBadge: {
    background: '#dc3545',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  upgradeText: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  premiumIcon: {
    fontSize: '16px',
  },
  adminStats: {
    marginBottom: '60px',
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '40px',
    color: 'white',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statCard: {
    textAlign: 'center',
    padding: '30px 20px',
  },
  statNumber: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500',
  },
  features: {
    marginBottom: '60px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  featureCard: {
    textAlign: 'center',
    padding: '30px 20px',
    position: 'relative',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#333',
  },
  featureDescription: {
    color: '#666',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  featureStatus: {
    marginTop: '16px',
  },
  statusBadge: {
    background: '#e9ecef',
    color: '#6c757d',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  quickAccess: {
    marginBottom: '40px',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  quickCard: {
    textAlign: 'center',
    padding: '30px 20px',
  },
};

export default Dashboard;