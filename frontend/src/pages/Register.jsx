import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
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
    setSuccess('');
    setLoading(true);

    // Preveri gesla
    if (formData.password !== formData.confirmPassword) {
      setError('Gesli se ne ujemata');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Geslo mora imeti vsaj 6 znakov');
      setLoading(false);
      return;
    }

    try {
      const result = await register(formData.email, formData.password, formData.role);
      
      if (result.success) {
        setSuccess('Registracija uspešna! Sedaj se lahko prijavite.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Napaka pri registraciji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="container">
        <div style={styles.registerBox}>
          <div className="card" style={styles.registerCard}>
            <h2 style={styles.title}>Registracija v Omni</h2>
            <p style={styles.subtitle}>
              Ustvarite svoj račun in začnite uporabljati Omni.
            </p>

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
                  placeholder="Najmanj 6 znakov"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Potrdite geslo
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Ponovite geslo"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="role">
                  Tip računa
                </label>
                <select
                  id="role"
                  name="role"
                  className="form-input"
                  value={formData.role}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="client">Uporabnik</option>
                  <option value="admin">Administrator</option>
                </select>
                <small style={styles.roleNote}>
                  * Admin račun omogoča upravljanje uporabnikov
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Registriram...' : 'Registracija'}
              </button>
            </form>

            <div style={styles.footer}>
              <p>
                Že imate račun?{' '}
                <Link to="/login" style={styles.link}>
                  Prijavite se
                </Link>
              </p>
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
  registerBox: {
    maxWidth: '450px',
    margin: '0 auto',
    width: '100%',
  },
  registerCard: {
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
  select: {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  roleNote: {
    color: '#666',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block',
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
};

export default Register;