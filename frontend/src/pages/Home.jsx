import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={styles.container}>
      <div className="container">
        {/* Hero sekcija */}
        <section style={styles.hero}>
          <h1 style={styles.title}>
            Dobrodošli v <span style={styles.gradient}>Omni</span>
          </h1>
          <p style={styles.subtitle}>
            Popolnoma univerzalen, inteligenten, avtonomen, samoučeč in praktičen pomočnik 
            za posameznike, podjetja in organizacije vseh velikosti.
          </p>
          
          <div style={styles.cta}>
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary" style={styles.ctaBtn}>
                Pojdi na Dashboard
              </Link>
            ) : (
              <div style={styles.ctaButtons}>
                <Link to="/register" className="btn btn-primary" style={styles.ctaBtn}>
                  Začni Zdaj
                </Link>
                <Link to="/login" className="btn btn-secondary" style={styles.ctaBtn}>
                  Prijava
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Funkcionalnosti */}
        <section style={styles.features}>
          <h2 style={styles.sectionTitle}>Ključne Funkcionalnosti</h2>
          <div style={styles.featureGrid}>
            <div className="card" style={styles.featureCard}>
              <div style={styles.featureIcon}>🏨</div>
              <h3>Turizem & Gostinstvo</h3>
              <p>Itinerarji, aktivnosti, marketing, lokalna kultura, gastronomske izkušnje</p>
            </div>
            
            <div className="card" style={styles.featureCard}>
              <div style={styles.featureIcon}>🌱</div>
              <h3>Kmetijstvo & Živinoreja</h3>
              <p>Pridelava, sezonski nasveti, trženje, rastline, živali, ekološko kmetijstvo</p>
            </div>
            
            <div className="card" style={styles.featureCard}>
              <div style={styles.featureIcon}>💻</div>
              <h3>IT & Programiranje</h3>
              <p>Python, JS, SQL, API integracije, skripte, prototipi, analitika</p>
            </div>
            
            <div className="card" style={styles.featureCard}>
              <div style={styles.featureIcon}>📈</div>
              <h3>Marketing & Prodaja</h3>
              <p>Kampanje, vsebine, social media, ROI, konverzije, SEO, SEM</p>
            </div>
            
            <div className="card" style={styles.featureCard}>
              <div style={styles.featureIcon}>🎓</div>
              <h3>Izobraževanje</h3>
              <p>Učni načrti, gradiva, interaktivni primeri, spletne učilnice</p>
            </div>
            
            <div className="card" style={styles.featureCard}>
              <div style={styles.featureIcon}>💰</div>
              <h3>Finančno Svetovanje</h3>
              <p>Proračuni, investicije, strategije, analize, optimizacija stroškov</p>
            </div>
          </div>
        </section>

        {/* Prednosti */}
        <section style={styles.benefits}>
          <h2 style={styles.sectionTitle}>Zakaj Omni?</h2>
          <div style={styles.benefitsList}>
            <div style={styles.benefit}>
              <span style={styles.checkmark}>✅</span>
              <div>
                <h4>Multidisciplinarne Rešitve</h4>
                <p>Združi različna področja za maksimalno učinkovitost</p>
              </div>
            </div>
            
            <div style={styles.benefit}>
              <span style={styles.checkmark}>✅</span>
              <div>
                <h4>Avtomatizacija Procesov</h4>
                <p>Avtomatiziraj poslovno poročanje, analize in rutinske naloge</p>
              </div>
            </div>
            
            <div style={styles.benefit}>
              <span style={styles.checkmark}>✅</span>
              <div>
                <h4>Praktične Rešitve</h4>
                <p>Takoj uporabne rešitve z jasnimi koraki za izvedbo</p>
              </div>
            </div>
            
            <div style={styles.benefit}>
              <span style={styles.checkmark}>✅</span>
              <div>
                <h4>Prilagodljivost</h4>
                <p>Prilagodi se različnim stilom uporabnikov in potrebam</p>
              </div>
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
  hero: {
    textAlign: 'center',
    padding: '80px 0',
    color: 'white',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    marginBottom: '24px',
    lineHeight: '1.2',
  },
  gradient: {
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.25rem',
    marginBottom: '40px',
    maxWidth: '800px',
    margin: '0 auto 40px',
    lineHeight: '1.6',
    opacity: '0.9',
  },
  cta: {
    marginTop: '40px',
  },
  ctaButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ctaBtn: {
    fontSize: '18px',
    padding: '16px 32px',
    minWidth: '160px',
  },
  features: {
    padding: '80px 0',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    textAlign: 'center',
    marginBottom: '60px',
    color: 'white',
    fontWeight: 'bold',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
  },
  featureCard: {
    textAlign: 'center',
    padding: '40px 24px',
    transition: 'transform 0.3s ease',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '20px',
  },
  benefits: {
    padding: '80px 0',
  },
  benefitsList: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  benefit: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '30px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  checkmark: {
    fontSize: '24px',
    flexShrink: 0,
  },
};

export default Home;