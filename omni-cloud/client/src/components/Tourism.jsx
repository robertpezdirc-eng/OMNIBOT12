// 🏖️ Tourism Component - Turistične rezervacije in ponudbe
import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function Tourism({ token, user }) {
  const [bookings, setBookings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState('offers');

  // 📝 New Booking Form State
  const [newBooking, setNewBooking] = useState({
    offer_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    guests: 1,
    special_requests: ''
  });

  // 🏨 Sample Tourism Offers
  const sampleOffers = [
    {
      id: 'offer_1',
      title: 'Romantični vikend ob Kolpi',
      description: 'Uživajte v miru narave ob kristalno čisti reki Kolpi. Vključuje nastanitev, zajtrk in vožnjo s kanujem.',
      price: 120,
      duration: '2 dni / 1 noč',
      location: 'Kolpa, Bela krajina',
      image: '🏞️',
      features: ['🛏️ Nastanitev', '🥐 Zajtrk', '🛶 Kanu', '🌊 Dostop do reke'],
      available: true
    },
    {
      id: 'offer_2',
      title: 'Družinski oddih v Bohinju',
      description: 'Popoln družinski oddih z aktivnostmi za vse starosti. Vključuje nastanitev, polpenzion in vodene ture.',
      price: 200,
      duration: '3 dni / 2 noči',
      location: 'Bohinj, Gorenjska',
      image: '🏔️',
      features: ['🏠 Družinska soba', '🍽️ Polpenzion', '🥾 Vodene ture', '🎣 Ribolov'],
      available: true
    },
    {
      id: 'offer_3',
      title: 'Wellness vikend v Rogaški Slatini',
      description: 'Sprostitev in regeneracija v termalnih vrelcih. Vključuje nastanitev, wellness storitve in zdrave obroke.',
      price: 180,
      duration: '2 dni / 1 noč',
      location: 'Rogaška Slatina',
      image: '💆',
      features: ['🛁 Termalni bazeni', '💆 Masaže', '🥗 Zdrava prehrana', '🧘 Joga'],
      available: false
    }
  ];

  // 🔄 Load data on component mount
  useEffect(() => {
    if (token && user) {
      loadBookings();
      setOffers(sampleOffers);
    }
  }, [token, user]);

  // 📥 Load User Bookings
  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tourism/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        // If no bookings endpoint, use sample data
        setBookings([
          {
            id: 'booking_1',
            offer_title: 'Romantični vikend ob Kolpi',
            guest_name: 'Janez Novak',
            check_in: '2024-03-15',
            check_out: '2024-03-17',
            guests: 2,
            status: 'confirmed',
            total_price: 240
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // 📝 Create New Booking
  const createBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const selectedOffer = offers.find(offer => offer.id === newBooking.offer_id);
      
      // Calculate total price
      const checkIn = new Date(newBooking.check_in);
      const checkOut = new Date(newBooking.check_out);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const totalPrice = selectedOffer.price * nights * newBooking.guests;

      const bookingData = {
        ...newBooking,
        offer_title: selectedOffer.title,
        total_price: totalPrice,
        status: 'pending'
      };

      const response = await fetch(`${API_URL}/tourism/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Rezervacija je bila uspešno ustvarjena!");
        setBookings(prev => [...prev, { ...bookingData, id: Date.now().toString() }]);
        
        // Reset form
        setNewBooking({
          offer_id: '',
          guest_name: '',
          guest_email: '',
          guest_phone: '',
          check_in: '',
          check_out: '',
          guests: 1,
          special_requests: ''
        });
        
        setActiveTab('bookings');
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Napaka pri ustvarjanju rezervacije");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Cancel Booking
  const cancelBooking = async (bookingId) => {
    if (!confirm('Ali ste prepričani, da želite preklicati rezervacijo?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/tourism/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccess("Rezervacija je bila preklicana");
        setBookings(prev => prev.filter(booking => booking.id !== bookingId));
      } else {
        setError("Napaka pri preklic rezervacije");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    }
  };

  // Check if user has access to tourism module
  if (!user?.plan || !['premium', 'enterprise'].includes(user.plan)) {
    return (
      <div className="access-denied">
        <h2>🔒 Dostop omejen</h2>
        <p>Za dostop do turističnega modula potrebujete Premium ali Enterprise paket.</p>
        <p>Trenutni paket: <strong>{user?.plan?.toUpperCase() || 'BREZ PAKETA'}</strong></p>
      </div>
    );
  }

  return (
    <div className="tourism-container">
      <div className="tourism-header">
        <h2>🏖️ Turistični modul</h2>
        <p>Upravljajte rezervacije in ponudbe</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'offers' ? 'active' : ''}`}
          onClick={() => setActiveTab('offers')}
        >
          🏨 Ponudbe
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📋 Rezervacije
        </button>
        <button 
          className={`tab-btn ${activeTab === 'new-booking' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-booking')}
        >
          ➕ Nova rezervacija
        </button>
      </div>

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

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div className="offers-section">
          <h3>🏨 Dostopne ponudbe</h3>
          <div className="offers-grid">
            {offers.map((offer) => (
              <div key={offer.id} className={`offer-card ${!offer.available ? 'unavailable' : ''}`}>
                <div className="offer-header">
                  <span className="offer-icon">{offer.image}</span>
                  <h4>{offer.title}</h4>
                  <span className="offer-price">{offer.price}€/noč</span>
                </div>
                
                <div className="offer-details">
                  <p>{offer.description}</p>
                  <div className="offer-meta">
                    <span>📍 {offer.location}</span>
                    <span>⏰ {offer.duration}</span>
                  </div>
                  
                  <div className="offer-features">
                    {offer.features.map((feature, index) => (
                      <span key={index} className="feature-tag">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="offer-actions">
                  {offer.available ? (
                    <button 
                      onClick={() => {
                        setNewBooking(prev => ({ ...prev, offer_id: offer.id }));
                        setActiveTab('new-booking');
                      }}
                      className="book-btn"
                    >
                      📝 Rezerviraj
                    </button>
                  ) : (
                    <span className="unavailable-badge">❌ Ni na voljo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bookings-section">
          <h3>📋 Vaše rezervacije</h3>
          {loading ? (
            <div className="loading">⏳ Nalagam rezervacije...</div>
          ) : bookings.length === 0 ? (
            <div className="no-bookings">
              <p>📭 Nimate še nobene rezervacije</p>
              <button 
                onClick={() => setActiveTab('offers')}
                className="browse-offers-btn"
              >
                🏨 Prebrskaj ponudbe
              </button>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <h4>{booking.offer_title}</h4>
                    <span className={`status-badge status-${booking.status}`}>
                      {booking.status === 'confirmed' ? '✅ Potrjeno' : 
                       booking.status === 'pending' ? '⏳ V obdelavi' : 
                       '❌ Preklicano'}
                    </span>
                  </div>
                  
                  <div className="booking-details">
                    <div className="detail-row">
                      <span>👤 Gost:</span>
                      <span>{booking.guest_name}</span>
                    </div>
                    <div className="detail-row">
                      <span>📅 Prihod:</span>
                      <span>{new Date(booking.check_in).toLocaleDateString('sl-SI')}</span>
                    </div>
                    <div className="detail-row">
                      <span>📅 Odhod:</span>
                      <span>{new Date(booking.check_out).toLocaleDateString('sl-SI')}</span>
                    </div>
                    <div className="detail-row">
                      <span>👥 Gostje:</span>
                      <span>{booking.guests}</span>
                    </div>
                    <div className="detail-row">
                      <span>💰 Skupaj:</span>
                      <span><strong>{booking.total_price}€</strong></span>
                    </div>
                  </div>
                  
                  {booking.status !== 'cancelled' && (
                    <div className="booking-actions">
                      <button 
                        onClick={() => cancelBooking(booking.id)}
                        className="cancel-booking-btn"
                      >
                        🗑️ Prekliči
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Booking Tab */}
      {activeTab === 'new-booking' && (
        <div className="new-booking-section">
          <h3>➕ Nova rezervacija</h3>
          <form onSubmit={createBooking} className="booking-form">
            <div className="form-group">
              <label>🏨 Ponudba:</label>
              <select
                value={newBooking.offer_id}
                onChange={(e) => setNewBooking(prev => ({ ...prev, offer_id: e.target.value }))}
                required
              >
                <option value="">Izberite ponudbo</option>
                {offers.filter(offer => offer.available).map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.title} - {offer.price}€/noč
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>👤 Ime gosta:</label>
                <input
                  type="text"
                  value={newBooking.guest_name}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, guest_name: e.target.value }))}
                  required
                  placeholder="Janez Novak"
                />
              </div>
              
              <div className="form-group">
                <label>📧 Email:</label>
                <input
                  type="email"
                  value={newBooking.guest_email}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, guest_email: e.target.value }))}
                  required
                  placeholder="janez@email.com"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>📞 Telefon:</label>
                <input
                  type="tel"
                  value={newBooking.guest_phone}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, guest_phone: e.target.value }))}
                  placeholder="+386 XX XXX XXX"
                />
              </div>
              
              <div className="form-group">
                <label>👥 Število gostov:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newBooking.guests}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>📅 Prihod:</label>
                <input
                  type="date"
                  value={newBooking.check_in}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, check_in: e.target.value }))}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="form-group">
                <label>📅 Odhod:</label>
                <input
                  type="date"
                  value={newBooking.check_out}
                  onChange={(e) => setNewBooking(prev => ({ ...prev, check_out: e.target.value }))}
                  required
                  min={newBooking.check_in || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>📝 Posebne zahteve:</label>
              <textarea
                value={newBooking.special_requests}
                onChange={(e) => setNewBooking(prev => ({ ...prev, special_requests: e.target.value }))}
                placeholder="Dodatne zahteve ali opombe..."
                rows="3"
              />
            </div>
            
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "⏳ Ustvarjam..." : "📝 Ustvari rezervacijo"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}