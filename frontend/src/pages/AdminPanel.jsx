import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Pridobi statistike
      const statsResponse = await axios.get('/api/admin');
      setStats(statsResponse.data.stats);
      
      // Pridobi uporabnike
      const usersResponse = await axios.get('/api/admin/users');
      setUsers(usersResponse.data.users);
      
    } catch (err) {
      console.error('Napaka pri pridobivanju admin podatkov:', err);
      setError('Napaka pri nalaganju admin podatkov');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      setError('');
      setSuccess('');
      
      const response = await axios.put(`/api/admin/users/${userId}`, updates);
      
      if (response.data.success) {
        setSuccess('Uporabnik uspešno posodobljen');
        // Posodobi lokalni seznam
        setUsers(users.map(u => 
          u._id === userId ? { ...u, ...updates } : u
        ));
        
        // Posodobi statistike
        fetchAdminData();
      }
    } catch (err) {
      console.error('Napaka pri posodabljanju uporabnika:', err);
      setError(err.response?.data?.error || 'Napaka pri posodabljanju uporabnika');
    }
  };

  const toggleUserRole = (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'client' : 'admin';
    updateUser(userId, { role: newRole });
  };

  const toggleUserPlan = (userId, currentPlan) => {
    // Ciklično spreminjanje planov: demo -> basic -> premium -> demo
    let newPlan;
    switch (currentPlan) {
      case 'demo':
        newPlan = 'basic';
        break;
      case 'basic':
        newPlan = 'premium';
        break;
      case 'premium':
        newPlan = 'demo';
        break;
      default:
        newPlan = 'demo';
    }
    updateUser(userId, { plan: newPlan });
  };

  const setPlan = async (email, plan) => {
    try {
      setError('');
      setSuccess('');
      
      const response = await axios.post('/api/setPlan', { email, plan });
      
      if (response.data.success) {
        setSuccess(response.data.message);
        // Posodobi lokalni seznam
        setUsers(users.map(u => 
          u.email === email ? { ...u, plan } : u
        ));
        
        // Posodobi statistike
        fetchAdminData();
      }
    } catch (err) {
      console.error('Napaka pri spremembi plana:', err);
      setError(err.response?.data?.error || 'Napaka pri spremembi plana');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sl-SI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ color: 'white', marginTop: '16px' }}>Nalagam admin podatke...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="container">
        {/* Header */}
        <section style={styles.header}>
          <h1 style={styles.title}>Admin Panel</h1>
          <p style={styles.subtitle}>
            Dobrodošli v admin panelu, {user?.email}
          </p>
        </section>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* Statistike */}
        {stats && (
          <section style={styles.stats}>
            <h2 style={styles.sectionTitle}>Pregled Sistema</h2>
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
              <div className="card" style={styles.statCard}>
                <div style={styles.statNumber}>{users.filter(u => u.plan === 'basic').length}</div>
                <div style={styles.statLabel}>Basic uporabnikov</div>
              </div>
              <div className="card" style={styles.statCard}>
                <div style={styles.statNumber}>{users.filter(u => u.plan === 'demo').length}</div>
                <div style={styles.statLabel}>Demo uporabnikov</div>
              </div>
            </div>
          </section>
        )}

        {/* Uporabniki */}
        <section style={styles.users}>
          <h2 style={styles.sectionTitle}>Upravljanje Uporabnikov</h2>
          
          {users.length === 0 ? (
            <div className="card" style={styles.noUsers}>
              <p>Ni uporabnikov za prikaz.</p>
            </div>
          ) : (
            <div className="card" style={styles.usersTable}>
              <div style={styles.tableHeader}>
                <div style={styles.headerCell}>Email</div>
                <div style={styles.headerCell}>Vloga</div>
                <div style={styles.headerCell}>Plan</div>
                <div style={styles.headerCell}>Registriran</div>
                <div style={styles.headerCell}>Zadnja prijava</div>
                <div style={styles.headerCell}>Akcije</div>
              </div>
              
              {users.map((userItem) => (
                <div key={userItem._id} style={styles.tableRow}>
                  <div style={styles.cell}>
                    <div style={styles.userEmail}>{userItem.email}</div>
                    {userItem._id === user?.id && (
                      <span style={styles.currentUserBadge}>Vi</span>
                    )}
                  </div>
                  
                  <div style={styles.cell}>
                    <span style={{
                      ...styles.roleBadge,
                      ...(userItem.role === 'admin' ? styles.adminBadge : styles.clientBadge)
                    }}>
                      {userItem.role === 'admin' ? 'Admin' : 'Uporabnik'}
                    </span>
                  </div>
                  
                  <div style={styles.cell}>
                    <span style={{
                      ...styles.planBadge,
                      ...(userItem.plan === 'premium' ? styles.planPremium : 
                          userItem.plan === 'basic' ? styles.planBasic : styles.planDemo)
                    }}>
                      {userItem.plan === 'premium' ? '⭐ Premium' : 
                       userItem.plan === 'basic' ? '🔹 Basic' : '🆓 Demo'}
                    </span>
                  </div>
                  
                  <div style={styles.cell}>
                    <span style={styles.dateText}>
                      {formatDate(userItem.createdAt)}
                    </span>
                  </div>
                  
                  <div style={styles.cell}>
                    <span style={styles.dateText}>
                      {userItem.lastLogin ? formatDate(userItem.lastLogin) : 'Nikoli'}
                    </span>
                  </div>
                  
                  <div style={styles.cell}>
                    <div style={styles.actions}>
                      {userItem._id !== user?.id && (
                        <>
                          <button
                            onClick={() => toggleUserRole(userItem._id, userItem.role)}
                            className="btn btn-secondary"
                            style={styles.actionBtn}
                          >
                            {userItem.role === 'admin' ? 'Odstrani admin' : 'Naredi admin'}
                          </button>
                          
                          <button
                            onClick={() => toggleUserPlan(userItem._id, userItem.plan)}
                            className="btn btn-secondary"
                            style={styles.actionBtn}
                          >
                            Spremeni plan
                          </button>
                          
                          <select
                            value={userItem.plan}
                            onChange={(e) => setPlan(userItem.email, e.target.value)}
                            style={styles.planSelect}
                          >
                            <option value="demo">Demo</option>
                            <option value="basic">Basic</option>
                            <option value="premium">Premium</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    color: 'white',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '1.1rem',
    opacity: '0.9',
  },
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '30px',
    color: 'white',
  },
  stats: {
    marginBottom: '50px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statCard: {
    textAlign: 'center',
    padding: '25px 15px',
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500',
  },
  users: {
    marginBottom: '40px',
  },
  noUsers: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  usersTable: {
    padding: '0',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1.5fr 2fr',
    gap: '16px',
    padding: '20px',
    background: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#495057',
  },
  headerCell: {
    textAlign: 'left',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1.5fr 2fr',
    gap: '16px',
    padding: '20px',
    borderBottom: '1px solid #e9ecef',
    alignItems: 'center',
  },
  cell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userEmail: {
    fontWeight: '500',
  },
  currentUserBadge: {
    background: '#667eea',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  adminBadge: {
    background: '#dc3545',
    color: 'white',
  },
  clientBadge: {
    background: '#6c757d',
    color: 'white',
  },
  premiumBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  premiumActive: {
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#333',
  },
  premiumInactive: {
    background: '#e9ecef',
    color: '#6c757d',
  },
  planBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  planPremium: {
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#333',
  },
  planBasic: {
    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    color: 'white',
  },
  planDemo: {
    background: '#e9ecef',
    color: '#6c757d',
  },
  planSelect: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '12px',
    background: 'white',
  },
  dateText: {
    fontSize: '13px',
    color: '#666',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    fontSize: '12px',
    padding: '6px 12px',
    minWidth: 'auto',
  },
};

export default AdminPanel;