import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Napaka pri prijavi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="container">
        <div style={styles.loginBox}>
          <div className="card" style={styles.loginCard}>
            <h2 style={styles.title}>Prijava v Omni</h2>
            <p style={styles.subtitle}>
              Dobrodošli nazaj! Prijavite se v svoj račun.
            </p>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email naslov
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="vnesite@email.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Geslo
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Vnesite geslo"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Prijavljam...' : 'Prijava'}
              </button>
            </form>

            <div style={styles.footer}>
              <p>
                Še nimate računa?{' '}
                <Link to="/register" style={styles.link}>
                  Registrirajte se
                </Link>
              </p>
            </div>

            {/* Demo računi */}
            <div style={styles.demoSection}>
              <h4 style={styles.demoTitle}>Demo računi za testiranje:</h4>
              <div style={styles.demoAccounts}>
                <div style={styles.demoAccount}>
                  <strong>Admin:</strong> admin@omni.si / admin123
                </div>
                <div style={styles.demoAccount}>
                  <strong>Uporabnik:</strong> user@omni.si / user123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 60px)',
    display: 'flex',
    alignItems: 'center',
    paddingTop: '40px',
    paddingBottom: '40px',
  },
  loginBox: {
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%',
  },
  loginCard: {
    padding: '40px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '32px',
  },
  submitBtn: {
    width: '100%',
    fontSize: '16px',
    padding: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '500',
  },
  demoSection: {
    marginTop: '24px',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  demoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#495057',
  },
  demoAccounts: {
    fontSize: '13px',
    color: '#6c757d',
  },
  demoAccount: {
    marginBottom: '4px',
  },
};

export default Login;