import React from 'react';
import { useAuth } from '../context/AuthContext';

const PlanUpgrade = ({ currentPlan, onUpgrade }) => {
  const { isPremium, isBasic, isDemo } = useAuth();

  const plans = [
    {
      name: 'Demo',
      price: 'Brezplačno',
      features: [
        'Osnovne funkcionalnosti',
        'Omejen dostop',
        '5 zahtev na dan',
        'Osnovna podpora'
      ],
      current: isDemo,
      buttonText: 'Trenutni plan',
      disabled: true
    },
    {
      name: 'Basic',
      price: '9.99€/mesec',
      features: [
        'Vse Demo funkcionalnosti',
        'Razširjen dostop',
        '100 zahtev na dan',
        'E-mail podpora',
        'Osnovne analize'
      ],
      current: isBasic,
      buttonText: isDemo ? 'Nadgradi na Basic' : 'Trenutni plan',
      disabled: isBasic || isPremium
    },
    {
      name: 'Premium',
      price: '19.99€/mesec',
      features: [
        'Vse Basic funkcionalnosti',
        'Neomejen dostop',
        'Neomejene zahteve',
        'Prednostna podpora',
        'Napredne analize',
        'API dostop',
        'Prilagojene rešitve'
      ],
      current: isPremium,
      buttonText: isPremium ? 'Trenutni plan' : 'Nadgradi na Premium',
      disabled: isPremium,
      popular: true
    }
  ];

  const handleUpgrade = (planName) => {
    if (onUpgrade) {
      onUpgrade(planName.toLowerCase());
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Izberi svoj plan</h2>
      <p style={styles.subtitle}>
        Nadgradi svoj plan za dostop do naprednih funkcionalnosti
      </p>
      
      <div style={styles.plansGrid}>
        {plans.map((plan, index) => (
          <div 
            key={index} 
            style={{
              ...styles.planCard,
              ...(plan.current ? styles.currentPlan : {}),
              ...(plan.popular ? styles.popularPlan : {})
            }}
          >
            {plan.popular && (
              <div style={styles.popularBadge}>Najbolj priljubljen</div>
            )}
            
            <div style={styles.planHeader}>
              <h3 style={styles.planName}>{plan.name}</h3>
              <div style={styles.planPrice}>{plan.price}</div>
            </div>
            
            <ul style={styles.featuresList}>
              {plan.features.map((feature, idx) => (
                <li key={idx} style={styles.feature}>
                  <span style={styles.checkmark}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              style={{
                ...styles.upgradeBtn,
                ...(plan.disabled ? styles.disabledBtn : {}),
                ...(plan.current ? styles.currentBtn : {})
              }}
              onClick={() => handleUpgrade(plan.name)}
              disabled={plan.disabled}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
      
      <div style={styles.note}>
        <p>💡 Vsi plani vključujejo 14-dnevno brezplačno preizkusno obdobje</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2.5rem',
    textAlign: 'center',
    marginBottom: '16px',
    color: 'white',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: '1.1rem',
    textAlign: 'center',
    marginBottom: '40px',
    color: '#ccc',
    maxWidth: '600px',
    margin: '0 auto 40px',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '40px',
  },
  planCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '30px',
    textAlign: 'center',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  currentPlan: {
    border: '2px solid #28a745',
    background: 'rgba(40, 167, 69, 0.1)',
  },
  popularPlan: {
    border: '2px solid #ffd700',
    background: 'rgba(255, 215, 0, 0.1)',
    transform: 'scale(1.05)',
  },
  popularBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#333',
    padding: '6px 20px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: '30px',
  },
  planName: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '8px',
  },
  planPrice: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#667eea',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '30px',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    color: '#ccc',
    fontSize: '14px',
  },
  checkmark: {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  upgradeBtn: {
    width: '100%',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  currentBtn: {
    background: '#28a745',
    cursor: 'default',
  },
  disabledBtn: {
    background: '#6c757d',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  note: {
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
    fontStyle: 'italic',
  },
};

export default PlanUpgrade;