import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PlanUpgrade from '../components/PlanUpgrade';

const Plans = () => {
  const { user, isPremium, isBasic, isDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpgrade = async (planName) => {
    setLoading(true);
    setMessage('');
    
    try {
      // Simulacija API klica za nadgradnjo plana
      // V produkciji bi to bil pravi API klic za plačilo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage(`Uspešno ste se naročili na ${planName} plan! Preusmerjamo vas na plačilo...`);
      
      // Tukaj bi implementirali preusmerjanje na plačilni sistem
      console.log(`Upgrading to ${planName} plan for user ${user?.email}`);
      
    } catch (error) {
      setMessage('Napaka pri nadgradnji plana. Poskusite znova.');
      console.error('Plan upgrade error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlanInfo = () => {
    if (isPremium) {
      return {
        name: 'Premium',
        color: '#ffd700',
        icon: '⭐',
        description: 'Imate dostop do vseh funkcionalnosti'
      };
    } else if (isBasic) {
      return {
        name: 'Basic',
        color: '#28a745',
        icon: '✓',
        description: 'Imate dostop do osnovnih funkcionalnosti'
      };
    } else {
      return {
        name: 'Demo',
        color: '#6c757d',
        icon: '◯',
        description: 'Imate omejen dostop do funkcionalnosti'
      };
    }
  };

  const currentPlan = getCurrentPlanInfo();

  return (
    <div style={styles.container}>
      <div className="container">
        {/* Trenutni plan */}
        <section style={styles.currentPlanSection}>
          <h1 style={styles.pageTitle}>Vaš naročniški plan</h1>
          
          <div style={styles.currentPlanCard}>
            <div style={styles.planIcon}>{currentPlan.icon}</div>
            <div style={styles.planInfo}>
              <h2 style={{...styles.planName, color: currentPlan.color}}>
                {currentPlan.name} Plan
              </h2>
              <p style={styles.planDescription}>{currentPlan.description}</p>
              <div style={styles.userInfo}>
                <span>Uporabnik: {user?.email}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sporočila */}
        {message && (
          <div style={styles.messageCard}>
            <p>{message}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={styles.loadingCard}>
            <div style={styles.spinner}></div>
            <p>Obdelujemo vašo zahtevo...</p>
          </div>
        )}

        {/* Plan upgrade komponenta */}
        <PlanUpgrade 
          currentPlan={user?.plan}
          onUpgrade={handleUpgrade}
        />

        {/* Pogosta vprašanja */}
        <section style={styles.faqSection}>
          <h2 style={styles.sectionTitle}>Pogosta vprašanja</h2>
          
          <div style={styles.faqGrid}>
            <div style={styles.faqItem}>
              <h3>Kako lahko spremenim svoj plan?</h3>
              <p>Plan lahko spremenite kadarkoli z izbiro novega plana zgoraj. Spremembe stopijo v veljavo takoj.</p>
            </div>
            
            <div style={styles.faqItem}>
              <h3>Ali lahko prekličem naročnino?</h3>
              <p>Da, naročnino lahko prekličete kadarkoli. Dostop do plačanih funkcionalnosti bo ostal aktiven do konca obračunskega obdobja.</p>
            </div>
            
            <div style={styles.faqItem}>
              <h3>Kaj vključuje brezplačno preizkusno obdobje?</h3>
              <p>14-dnevno brezplačno preizkusno obdobje vključuje dostop do vseh funkcionalnosti izbranega plana brez omejitev.</p>
            </div>
            
            <div style={styles.faqItem}>
              <h3>Kako deluje plačilo?</h3>
              <p>Plačilo poteka mesečno preko varnih plačilnih sistemov. Podpiramo vse glavne kreditne kartice in PayPal.</p>
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
  },
  pageTitle: {
    fontSize: '2.5rem',
    textAlign: 'center',
    marginBottom: '40px',
    color: 'white',
    fontWeight: 'bold',
  },
  currentPlanSection: {
    marginBottom: '60px',
  },
  currentPlanCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  planIcon: {
    fontSize: '4rem',
    flexShrink: 0,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  planDescription: {
    fontSize: '1.1rem',
    color: '#ccc',
    marginBottom: '16px',
  },
  userInfo: {
    fontSize: '14px',
    color: '#999',
  },
  messageCard: {
    background: 'rgba(40, 167, 69, 0.2)',
    border: '1px solid #28a745',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#28a745',
  },
  loadingCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '30px',
    marginBottom: '30px',
    textAlign: 'center',
    color: 'white',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  faqSection: {
    marginTop: '80px',
  },
  sectionTitle: {
    fontSize: '2rem',
    textAlign: 'center',
    marginBottom: '40px',
    color: 'white',
    fontWeight: 'bold',
  },
  faqGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  faqItem: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '24px',
  },
};

// CSS animacija za spinner
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Dodaj CSS animacijo v head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}

export default Plans;