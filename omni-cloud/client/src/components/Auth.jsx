// 🔐 Auth Component - Avtentikacija uporabnikov
import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function Auth({ onLogin, token, user }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔄 Login Function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('omni_token', data.token);
        onLogin(data.token, data.user);
      } else {
        setError(data.message || "Napaka pri prijavi");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    } finally {
      setLoading(false);
    }
  };

  // 📝 Register Function
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          company
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('omni_token', data.token);
        onLogin(data.token, data.user);
      } else {
        setError(data.message || "Napaka pri registraciji");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Logout Function
  const handleLogout = () => {
    localStorage.removeItem('omni_token');
    onLogin(null, null);
  };

  // If user is logged in, show profile
  if (token && user) {
    return (
      <div className="auth-profile">
        <div className="profile-header">
          <h2>👤 Profil uporabnika</h2>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Odjava
          </button>
        </div>
        
        <div className="profile-info">
          <div className="info-item">
            <strong>Ime:</strong> {user.firstName} {user.lastName}
          </div>
          <div className="info-item">
            <strong>Email:</strong> {user.email}
          </div>
          <div className="info-item">
            <strong>Podjetje:</strong> {user.company || "Ni navedeno"}
          </div>
          <div className="info-item">
            <strong>Paket:</strong> 
            <span className={`plan-badge plan-${user.plan}`}>
              {user.plan?.toUpperCase() || "BREZ PAKETA"}
            </span>
          </div>
          {user.plan_expires && (
            <div className="info-item">
              <strong>Paket poteče:</strong> 
              {new Date(user.plan_expires).toLocaleDateString('sl-SI')}
            </div>
          )}
          <div className="info-item">
            <strong>Vloga:</strong> 
            <span className={`role-badge role-${user.role}`}>
              {user.role?.toUpperCase() || "USER"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Login/Register Form
  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{isRegistering ? "📝 Registracija" : "🔐 Prijava"}</h2>
        
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label>Ime:</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="Vnesite ime"
                />
              </div>
              
              <div className="form-group">
                <label>Priimek:</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Vnesite priimek"
                />
              </div>
              
              <div className="form-group">
                <label>Podjetje:</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Vnesite podjetje (opcijsko)"
                />
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vase.ime@email.com"
            />
          </div>
          
          <div className="form-group">
            <label>Geslo:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Vnesite geslo"
            />
          </div>
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "⏳ Obdelavam..." : (isRegistering ? "📝 Registriraj se" : "🔐 Prijavi se")}
          </button>
        </form>
        
        <div className="auth-switch">
          {isRegistering ? (
            <p>
              Že imate račun?{" "}
              <button 
                type="button" 
                onClick={() => setIsRegistering(false)}
                className="link-btn"
              >
                Prijavite se
              </button>
            </p>
          ) : (
            <p>
              Nimate računa?{" "}
              <button 
                type="button" 
                onClick={() => setIsRegistering(true)}
                className="link-btn"
              >
                Registrirajte se
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}