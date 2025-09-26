// 📄 License Component - Upravljanje licenc in paketov
import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function License({ token, user, onUserUpdate }) {
  const [plans, setPlans] = useState([]);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 📊 Available Plans
  const availablePlans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '29€/mesec',
      features: [
        '✅ Osnovni dostop do platforme',
        '✅ Do 100 transakcij/mesec',
        '✅ Email podpora',
        '✅ Osnovne analitike'
      ],
      color: '#4CAF50'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '79€/mesec',
      features: [
        '✅ Vse Basic funkcionalnosti',
        '✅ Do 1000 transakcij/mesec',
        '✅ Prednostna podpora',
        '✅ Napredne analitike',
        '✅ API dostop',
        '✅ Rezervacije in naročila'
      ],
      color: '#FF9800'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '199€/mesec',
      features: [
        '✅ Vse Premium funkcionalnosti',
        '✅ Neomejene transakcije',
        '✅ 24/7 podpora',
        '✅ Prilagojene rešitve',
        '✅ Dedicirani account manager',
        '✅ Bela etiketa',
        '✅ Integracijski API'
      ],
      color: '#9C27B0'
    }
  ];

  // 🔄 Load user plan on component mount
  useEffect(() => {
    if (token && user) {
      loadUserPlan();
    }
  }, [token, user]);

  // 📥 Load User Plan
  const loadUserPlan = async () => {
    try {
      const response = await fetch(`${API_URL}/license/plan`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserPlan(data.plan);
      }
    } catch (err) {
      console.error('Error loading user plan:', err);
    }
  };

  // 🛒 Activate Plan
  const activatePlan = async (planId) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/license/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planId })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Paket ${planId.toUpperCase()} je bil uspešno aktiviran!`);
        setUserPlan(data.plan);
        
        // Update user data in parent component
        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            plan: planId,
            plan_expires: data.plan.expiryDate
          });
        }
      } else {
        setError(data.message || "Napaka pri aktivaciji paketa");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Cancel Plan
  const cancelPlan = async () => {
    if (!confirm('Ali ste prepričani, da želite preklicati paket?')) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/license/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Paket je bil uspešno preklican");
        setUserPlan(null);
        
        // Update user data in parent component
        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            plan: null,
            plan_expires: null
          });
        }
      } else {
        setError(data.message || "Napaka pri preklic paketa");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    } finally {
      setLoading(false);
    }
  };

  // 📅 Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!user?.plan_expires) return null;
    
    const expiryDate = new Date(user.plan_expires);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="license-container">
      <div className="license-header">
        <h2>📄 Upravljanje licenc</h2>
        <p>Izberite paket, ki ustreza vašim potrebam</p>
      </div>

      {/* Current Plan Status */}
      {user?.plan && (
        <div className="current-plan">
          <h3>📊 Trenutni paket</h3>
          <div className={`plan-status ${daysUntilExpiry <= 7 ? 'expiring' : 'active'}`}>
            <div className="plan-info">
              <span className="plan-name">{user.plan.toUpperCase()}</span>
              {user.plan_expires && (
                <span className="plan-expiry">
                  Poteče: {new Date(user.plan_expires).toLocaleDateString('sl-SI')}
                  {daysUntilExpiry !== null && (
                    <span className={`days-left ${daysUntilExpiry <= 7 ? 'warning' : ''}`}>
                      ({daysUntilExpiry > 0 ? `${daysUntilExpiry} dni` : 'POTEKLO'})
                    </span>
                  )}
                </span>
              )}
            </div>
            <button 
              onClick={cancelPlan} 
              disabled={loading}
              className="cancel-btn"
            >
              🗑️ Prekliči paket
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          ✅ {success}
        </div>
      )}

      {/* Available Plans */}
      <div className="plans-grid">
        {availablePlans.map((plan) => (
          <div 
            key={plan.id} 
            className={`plan-card ${user?.plan === plan.id ? 'current' : ''}`}
            style={{ borderColor: plan.color }}
          >
            <div className="plan-header" style={{ backgroundColor: plan.color }}>
              <h3>{plan.name}</h3>
              <div className="plan-price">{plan.price}</div>
            </div>
            
            <div className="plan-features">
              {plan.features.map((feature, index) => (
                <div key={index} className="feature">
                  {feature}
                </div>
              ))}
            </div>
            
            <div className="plan-actions">
              {user?.plan === plan.id ? (
                <div className="current-plan-badge">
                  ✅ Trenutni paket
                </div>
              ) : (
                <button
                  onClick={() => activatePlan(plan.id)}
                  disabled={loading}
                  className="activate-btn"
                  style={{ backgroundColor: plan.color }}
                >
                  {loading ? "⏳ Aktiviram..." : "🚀 Aktiviraj"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* License Information */}
      <div className="license-info">
        <h3>ℹ️ Informacije o licencah</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>📅 Trajanje:</strong>
            <p>Vsi paketi se obnovijo mesečno. Lahko jih prekličete kadarkoli.</p>
          </div>
          <div className="info-item">
            <strong>🔄 Nadgradnja:</strong>
            <p>Paket lahko kadarkoli nadgradite. Razlika se zaračuna sorazmerno.</p>
          </div>
          <div className="info-item">
            <strong>💳 Plačilo:</strong>
            <p>Sprejemamo vse glavne kreditne kartice in PayPal.</p>
          </div>
          <div className="info-item">
            <strong>📞 Podpora:</strong>
            <p>Za vprašanja nas kontaktirajte na support@omni-cloud.si</p>
          </div>
        </div>
      </div>
    </div>
  );
}