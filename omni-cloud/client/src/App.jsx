// 🚀 Omni Cloud - Main Application Component
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// 📦 Import Module Components
import Auth from "./components/Auth.jsx";
import License from "./components/License.jsx";
import Tourism from "./components/Tourism.jsx";
import Horeca from "./components/Horeca.jsx";
import Admin from "./components/Admin.jsx";
import ModuleNavigation from "./components/ModuleNavigation.jsx";

// 🌐 API Configuration
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 10,
  timeout: 20000,
  forceNew: true,
  transports: ['websocket', 'polling']
});

export default function App() {
  // 🔐 Authentication State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem('omni_token'));
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // 🧭 Module Navigation State
  const [activeModule, setActiveModule] = useState('navigation');
  
  // 👤 User Profile State
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    company: ""
  });

  // 📊 Admin State
  const [adminStats, setAdminStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [usersFilter, setUsersFilter] = useState({ 
    plan: 'all', 
    role: 'all', 
    expired: 'all',
    search: ''
  });
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // 🔔 Notifications & Connection State
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [heartbeatStatus, setHeartbeatStatus] = useState("disconnected");
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [currentRoom, setCurrentRoom] = useState(null);

  // 🎨 UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔄 Auto-login from stored token
  useEffect(() => {
    if (token && !user) {
      validateToken();
    }
  }, [token]);

  // 🏠 Room Management
  useEffect(() => {
    if (socketConnected && user?.plan && user.plan !== currentRoom) {
      if (currentRoom) {
        socket.emit("leave_plan", currentRoom);
        console.log(`👋 Leaving previous room: ${currentRoom}`);
      }
      
      socket.emit("join_plan", user.plan);
      setCurrentRoom(user.plan);
      console.log(`👥 Joining room: ${user.plan}`);
    }
  }, [user?.plan, socketConnected, currentRoom]);

  // Socket.io connection and event handlers
  useEffect(() => {
    if (user && socket) {
      // Join user's plan room for license notifications
      socket.emit('join_plan', user.plan);
      
      // Listen for license updates
      socket.on('license_update', (data) => {
        console.log('📄 License update received:', data);
        addNotification(`Licenca posodobljena: ${data.message}`, 'info');
        
        // Update user profile if it's for current user
        if (data.email === user.email) {
          setUser(prev => ({
            ...prev,
            plan: data.plan,
            plan_expires: data.expires
          }));
        }
      });

      // Listen for admin notifications (if user is admin)
      if (user.role === 'admin') {
        socket.on('admin_notification', (data) => {
          console.log('🔔 Admin notification:', data);
          addNotification(`Admin: ${data.type} - ${data.user}`, 'warning');
        });

        socket.on('system_error', (data) => {
          console.log('❌ System error:', data);
          addNotification(`System Error: ${data.message}`, 'error');
        });
      }

      // Heartbeat system
      const heartbeat = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping');
        }
      }, 30000);

      socket.on('pong', (data) => {
        console.log('💓 Heartbeat response:', data.timestamp);
      });

      return () => {
        socket.off('license_update');
        socket.off('admin_notification');
        socket.off('system_error');
        socket.off('pong');
        clearInterval(heartbeat);
      };
    }
  }, [user, socket]);

  // 💓 Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketConnected) {
        socket.emit("ping");
        setHeartbeatStatus("pinging");
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [socketConnected]);

  // 🔧 Helper Functions
  const addNotification = (message, type = "info", data = {}) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
      data
    };
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
  };

  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  };

  // 🔐 Authentication Functions
  const validateToken = async () => {
    try {
      setLoading(true);
      const data = await apiCall("/license/check", { method: "POST" });
      setUser(data.license);
      setError("");
    } catch (error) {
      console.error("Token validation failed:", error);
      localStorage.removeItem('omni_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      
      const data = await apiCall("/license/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('omni_token', data.token);
      
      addNotification("Uspešna prijava v Omni Cloud", "success");
      
      // Join plan room
      if (socketConnected && data.user.plan) {
        socket.emit("join_plan", data.user.plan);
      }

    } catch (error) {
      setError(error.message);
      addNotification(`Napaka pri prijavi: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError("");
      
      const data = await apiCall("/license/register", {
        method: "POST",
        body: JSON.stringify({ 
          email, 
          password,
          firstName: profile.firstName,
          lastName: profile.lastName,
          company: profile.company
        })
      });

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('omni_token', data.token);
      
      addNotification("Uspešna registracija v Omni Cloud", "success");
      setIsRegistering(false);

    } catch (error) {
      setError(error.message);
      addNotification(`Napaka pri registraciji: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('omni_token');
    setNotifications([]);
    setCurrentRoom(null);
    addNotification("Uspešna odjava", "info");
  };

  // 📊 Admin Functions
  const fetchAdminStats = async () => {
    try {
      const data = await apiCall("/license/stats");
      setAdminStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      addNotification(`Napaka pri pridobivanju statistik: ${error.message}`, "error");
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiCall("/users");
      setUsersList(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      addNotification(`Napaka pri pridobivanju uporabnikov: ${error.message}`, "error");
    }
  };

  // 🎨 Status Colors
  const getStatusColor = (status) => {
    switch (status) {
      case "connected": case "active": return "text-green-500";
      case "reconnecting": case "pinging": return "text-yellow-500";
      case "disconnected": case "error": case "failed": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "connected": case "active": return "🟢";
      case "reconnecting": case "pinging": return "🟡";
      case "disconnected": case "error": case "failed": return "🔴";
      default: return "⚪";
    }
  };

  // 🎨 Render Functions
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Nalagam Omni Cloud...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🌟 Omni Cloud</h1>
            <p className="text-gray-600">Univerzalna platforma za vse vaše potrebe</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email naslov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="password"
              placeholder="Geslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {isRegistering && (
              <>
                <input
                  type="text"
                  placeholder="Ime"
                  value={profile.firstName}
                  onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <input
                  type="text"
                  placeholder="Priimek"
                  value={profile.lastName}
                  onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <input
                  type="text"
                  placeholder="Podjetje (opcijsko)"
                  value={profile.company}
                  onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </>
            )}

            <button
              onClick={isRegistering ? handleRegister : handleLogin}
              disabled={loading || !email || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? "⏳ Obdelavam..." : (isRegistering ? "📝 Registracija" : "🔑 Prijava")}
            </button>

            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="w-full text-blue-600 hover:text-blue-700 font-medium py-2"
            >
              {isRegistering ? "← Nazaj na prijavo" : "📝 Ustvari nov račun"}
            </button>
          </div>

          {/* Connection Status */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span>{getStatusIcon(heartbeatStatus)}</span>
              <span className={getStatusColor(heartbeatStatus)}>
                {socketConnected ? "Povezan" : "Nepovezan"}
              </span>
              {connectionAttempts > 0 && (
                <span className="text-gray-500">({connectionAttempts} poskusov)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🏠 Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">🌟 Omni Cloud</h1>
              <div className="flex items-center space-x-2">
                <span>{getStatusIcon(heartbeatStatus)}</span>
                <span className={`text-sm ${getStatusColor(heartbeatStatus)}`}>
                  {socketConnected ? "Povezan" : "Nepovezan"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                👤 {user.firstName} {user.lastName}
                {user.company && <span className="text-gray-500"> • {user.company}</span>}
              </div>
              <div className="text-sm">
                📦 <span className="font-medium text-blue-600">{user.plan}</span>
              </div>
              {user.role === 'admin' && (
                <button
                  onClick={() => setShowAdminDashboard(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
                >
                  👑 Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
              >
                🚪 Odjava
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeModule === 'navigation' && (
          <ModuleNavigation 
            user={user}
            onModuleSelect={setActiveModule}
            notifications={notifications}
          />
        )}
        
        {activeModule === 'auth' && (
          <Auth 
            user={user}
            token={token}
            onLogout={handleLogout}
            apiUrl={API_URL}
            addNotification={addNotification}
          />
        )}
        
        {activeModule === 'license' && (
          <License 
            user={user}
            token={token}
            apiUrl={API_URL}
            addNotification={addNotification}
          />
        )}
        
        {activeModule === 'tourism' && (
          <Tourism 
            user={user}
            token={token}
            apiUrl={API_URL}
            addNotification={addNotification}
          />
        )}
        
        {activeModule === 'horeca' && (
          <Horeca 
            user={user}
            token={token}
            apiUrl={API_URL}
            addNotification={addNotification}
          />
        )}
        
        {activeModule === 'admin' && user.role === 'admin' && (
          <Admin 
            user={user}
            token={token}
            socket={socket}
            apiUrl={API_URL}
            addNotification={addNotification}
          />
        )}
      </main>

      {/* Notifications Panel */}
      <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white rounded-xl shadow-xl border overflow-hidden z-50">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">🔔 Obvestila</h3>
            <div className="flex space-x-2">
              {notifications.length > 0 && (
                <button
                  onClick={() => setNotifications([])}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-4">
          {notifications.length > 0 ? (
            notifications.slice(0, 5).map((notif) => (
              <div
                key={notif.id}
                className={`p-3 mb-2 rounded-lg border-l-4 ${
                  notif.type === 'success' ? 'bg-green-50 border-green-400' :
                  notif.type === 'error' ? 'bg-red-50 border-red-400' :
                  'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-gray-800">{notif.message}</p>
                  <span className="text-xs text-gray-500">{notif.timestamp}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">🔔</div>
              <p className="text-sm">Ni obvestil</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && (
        <Admin 
          token={token}
          onClose={() => setShowAdminDashboard(false)}
          socket={socket}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
}