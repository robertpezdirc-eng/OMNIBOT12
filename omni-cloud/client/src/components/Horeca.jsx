// 🍽️ Horeca Component - Gostinstvo, meniji in naročila
import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function Horeca({ token, user }) {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState('menu');

  // 🍽️ Sample Menu Items
  const sampleMenu = [
    {
      id: 'item_1',
      name: 'Goveja juha z rezanci',
      description: 'Tradicionalna goveja juha z domačimi rezanci in zelenjavo',
      price: 4.50,
      category: 'Juhe',
      image: '🍲',
      available: true,
      allergens: ['gluten']
    },
    {
      id: 'item_2',
      name: 'Dunajski zrezek s krompirjem',
      description: 'Hrustljav dunajski zrezek z ocvrtim krompirjem in solato',
      price: 12.90,
      category: 'Glavne jedi',
      image: '🥩',
      available: true,
      allergens: ['gluten', 'eggs']
    },
    {
      id: 'item_3',
      name: 'Cezar solata s piščancem',
      description: 'Sveža solata z ocvrtim piščancem, krutonci in cezar dresingom',
      price: 8.50,
      category: 'Solate',
      image: '🥗',
      available: true,
      allergens: ['gluten', 'dairy']
    },
    {
      id: 'item_4',
      name: 'Pica Margherita',
      description: 'Klasična pica z mozzarello, paradižnikovo omako in baziliko',
      price: 9.80,
      category: 'Pice',
      image: '🍕',
      available: true,
      allergens: ['gluten', 'dairy']
    },
    {
      id: 'item_5',
      name: 'Tiramisu',
      description: 'Italijanski desert z mascarpone sirom in kavo',
      price: 5.20,
      category: 'Deserti',
      image: '🍰',
      available: false,
      allergens: ['dairy', 'eggs']
    },
    {
      id: 'item_6',
      name: 'Coca Cola 0.33l',
      description: 'Osvežilna pijača',
      price: 2.50,
      category: 'Pijače',
      image: '🥤',
      available: true,
      allergens: []
    }
  ];

  // 🔄 Load data on component mount
  useEffect(() => {
    if (token && user) {
      loadOrders();
      setMenu(sampleMenu);
    }
  }, [token, user]);

  // 📥 Load User Orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/horeca/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        // If no orders endpoint, use sample data
        setOrders([
          {
            id: 'order_1',
            items: [
              { name: 'Dunajski zrezek s krompirjem', quantity: 1, price: 12.90 },
              { name: 'Coca Cola 0.33l', quantity: 2, price: 2.50 }
            ],
            total: 17.90,
            status: 'completed',
            created_at: '2024-01-15T12:30:00Z',
            table_number: 5
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // 🛒 Add to Cart
  const addToCart = (item) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
    setSuccess(`${item.name} dodano v košarico`);
    setTimeout(() => setSuccess(""), 2000);
  };

  // 🗑️ Remove from Cart
  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // 📝 Update Cart Quantity
  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // 💰 Calculate Cart Total
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  // 📝 Place Order
  const placeOrder = async () => {
    if (cart.length === 0) {
      setError("Košarica je prazna");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const orderData = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: parseFloat(getCartTotal()),
        table_number: Math.floor(Math.random() * 20) + 1 // Random table number for demo
      };

      const response = await fetch(`${API_URL}/horeca/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Naročilo je bilo uspešno oddano!");
        
        // Add to orders list
        setOrders(prev => [...prev, {
          ...orderData,
          id: Date.now().toString(),
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
        
        // Clear cart
        setCart([]);
        setActiveTab('orders');
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Napaka pri oddaji naročila");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Cancel Order
  const cancelOrder = async (orderId) => {
    if (!confirm('Ali ste prepričani, da želite preklicati naročilo?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/horeca/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccess("Naročilo je bilo preklicano");
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' }
            : order
        ));
      } else {
        setError("Napaka pri preklic naročila");
      }
    } catch (err) {
      setError("Napaka pri povezavi s strežnikom");
    }
  };

  // Group menu items by category
  const menuByCategory = menu.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // Check if user has access to horeca module
  if (!user?.plan || !['premium', 'enterprise'].includes(user.plan)) {
    return (
      <div className="access-denied">
        <h2>🔒 Dostop omejen</h2>
        <p>Za dostop do gostinskega modula potrebujete Premium ali Enterprise paket.</p>
        <p>Trenutni paket: <strong>{user?.plan?.toUpperCase() || 'BREZ PAKETA'}</strong></p>
      </div>
    );
  }

  return (
    <div className="horeca-container">
      <div className="horeca-header">
        <h2>🍽️ Gostinski modul</h2>
        <p>Upravljajte meni in naročila</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          📋 Meni
        </button>
        <button 
          className={`tab-btn ${activeTab === 'cart' ? 'active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          🛒 Košarica ({cart.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Naročila
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

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <div className="menu-section">
          <h3>📋 Naš meni</h3>
          {Object.entries(menuByCategory).map(([category, items]) => (
            <div key={category} className="menu-category">
              <h4 className="category-title">{category}</h4>
              <div className="menu-items">
                {items.map((item) => (
                  <div key={item.id} className={`menu-item ${!item.available ? 'unavailable' : ''}`}>
                    <div className="item-header">
                      <span className="item-icon">{item.image}</span>
                      <div className="item-info">
                        <h5>{item.name}</h5>
                        <p>{item.description}</p>
                        {item.allergens.length > 0 && (
                          <div className="allergens">
                            <small>⚠️ Alergeni: {item.allergens.join(', ')}</small>
                          </div>
                        )}
                      </div>
                      <div className="item-price">
                        {item.price.toFixed(2)}€
                      </div>
                    </div>
                    
                    <div className="item-actions">
                      {item.available ? (
                        <button 
                          onClick={() => addToCart(item)}
                          className="add-to-cart-btn"
                        >
                          🛒 Dodaj
                        </button>
                      ) : (
                        <span className="unavailable-badge">❌ Ni na voljo</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Tab */}
      {activeTab === 'cart' && (
        <div className="cart-section">
          <h3>🛒 Košarica</h3>
          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>🛒 Košarica je prazna</p>
              <button 
                onClick={() => setActiveTab('menu')}
                className="browse-menu-btn"
              >
                📋 Prebrskaj meni
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <span className="item-icon">{item.image}</span>
                      <div className="item-details">
                        <h5>{item.name}</h5>
                        <p>{item.price.toFixed(2)}€ / kos</p>
                      </div>
                    </div>
                    
                    <div className="quantity-controls">
                      <button 
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="quantity-btn"
                      >
                        ➖
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="quantity-btn"
                      >
                        ➕
                      </button>
                    </div>
                    
                    <div className="item-total">
                      {(item.price * item.quantity).toFixed(2)}€
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="remove-btn"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="cart-summary">
                <div className="cart-total">
                  <strong>Skupaj: {getCartTotal()}€</strong>
                </div>
                <button 
                  onClick={placeOrder}
                  disabled={loading}
                  className="place-order-btn"
                >
                  {loading ? "⏳ Oddajam..." : "📝 Oddaj naročilo"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="orders-section">
          <h3>📋 Vaša naročila</h3>
          {loading ? (
            <div className="loading">⏳ Nalagam naročila...</div>
          ) : orders.length === 0 ? (
            <div className="no-orders">
              <p>📭 Nimate še nobenih naročil</p>
              <button 
                onClick={() => setActiveTab('menu')}
                className="browse-menu-btn"
              >
                📋 Prebrskaj meni
              </button>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <h4>Naročilo #{order.id}</h4>
                      <span className="order-date">
                        {new Date(order.created_at).toLocaleDateString('sl-SI')} {new Date(order.created_at).toLocaleTimeString('sl-SI')}
                      </span>
                      {order.table_number && (
                        <span className="table-number">Miza: {order.table_number}</span>
                      )}
                    </div>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status === 'completed' ? '✅ Dokončano' : 
                       order.status === 'pending' ? '⏳ V pripravi' : 
                       order.status === 'preparing' ? '👨‍🍳 Pripravlja se' :
                       '❌ Preklicano'}
                    </span>
                  </div>
                  
                  <div className="order-items">
                    {order.items.map((item, index) => (
                      <div key={index} className="order-item">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{(item.price * item.quantity).toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="order-total">
                    <strong>Skupaj: {order.total.toFixed(2)}€</strong>
                  </div>
                  
                  {order.status === 'pending' && (
                    <div className="order-actions">
                      <button 
                        onClick={() => cancelOrder(order.id)}
                        className="cancel-order-btn"
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
    </div>
  );
}