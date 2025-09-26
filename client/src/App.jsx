import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { io } from "socket.io-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import VerifyEmail from "./VerifyEmail";
import AdminDashboard from "./AdminDashboard.jsx";
import OmniBrainDashboard from "./OmniBrainDashboard.jsx";
import OmniLanding from "./OmniLanding.jsx";

// 🚀 Initialize socket connection with auto-reconnect and advanced configuration
const socket = io("http://localhost:5000", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 5,
  timeout: 20000,
  forceNew: true
});

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/landing" element={<OmniLanding />} />
        <Route path="/" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

function MainApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [plan, setPlan] = useState(null);
  const [plan_expires, setPlanExpires] = useState('')
  const [adminStats, setAdminStats] = useState(null)
  const [usersList, setUsersList] = useState([])
  const [usersFilter, setUsersFilter] = useState({ plan: 'all', role: 'all', expired: 'all' });
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [heartbeatStatus, setHeartbeatStatus] = useState("disconnected");
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showOmniBrainDashboard, setShowOmniBrainDashboard] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // 🔐 Check for saved credentials on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('omni_token');
    const savedRole = localStorage.getItem('omni_role');
    const savedPlan = localStorage.getItem('omni_plan');
    const savedPlanExpires = localStorage.getItem('omni_plan_expires');
    const savedEmail = localStorage.getItem('omni_email');
    const savedPassword = localStorage.getItem('omni_password');
    const savedRememberMe = localStorage.getItem('omni_remember_me');
    const autoLogin = localStorage.getItem('omni_auto_login');
    
    // Avtomatska prijava za ta računalnik
    if (autoLogin === 'true' && savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
      setPlan(savedPlan);
      setPlanExpires(savedPlanExpires);
      setEmail(savedEmail || '');
      return; // Preskoči prijavno formo
    }
    
    if (savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
      setPlan(savedPlan);
      setPlanExpires(savedPlanExpires);
    }
    
    // Napolni prijavne podatke, če so shranjeni
    if (savedRememberMe === 'true') {
      setEmail(savedEmail || '');
      setPassword(savedPassword || '');
      setRememberMe(true);
    }
  }, []);

  // 🏠 Advanced Rooms Management with Auto-Reconnect and Real-Time Updates
  useEffect(() => {
    // Join room based on current plan
    if (socketConnected && plan && plan !== currentRoom) {
      // Leave previous room if exists
      if (currentRoom) {
        socket.emit("leave_plan", currentRoom);
        console.log(`👋 Zapuščam prejšnji room: ${currentRoom}`);
      }
      
      // Join new room
      socket.emit("join_plan", plan);
      setCurrentRoom(plan);
      console.log(`👥 Pridružujem se room: ${plan}`);
    }
  }, [plan, socketConnected, currentRoom]);

  // 🌐 Comprehensive Socket.IO Event Management
  useEffect(() => {
    // Connection events
    socket.on("connect", () => {
      console.log("🔗 Povezan na WebSocket strežnik z auto-reconnect");
      setSocketConnected(true);
      setHeartbeatStatus("connected");
      setConnectionAttempts(0);
      
      // Auto-join room after connection
      if (plan) {
        socket.emit("join_plan", plan);
        setCurrentRoom(plan);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Odklopljen od WebSocket strežnika:", reason);
      setSocketConnected(false);
      setHeartbeatStatus("disconnected");
      setCurrentRoom(null);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Uspešno ponovno povezan po ${attemptNumber} poskusih`);
      setConnectionAttempts(attemptNumber);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Poskus ponovne povezave: ${attemptNumber}`);
      setConnectionAttempts(attemptNumber);
      setHeartbeatStatus("reconnecting");
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Napaka pri ponovni povezavi:", error);
      setHeartbeatStatus("error");
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Ponovna povezava neuspešna po vseh poskusih");
      setHeartbeatStatus("failed");
    });

    // License update listener with enhanced data
    socket.on("license_update", (data) => {
      const timestamp = new Date().toLocaleTimeString();
      setNotifications((prev) => [...prev, {
        message: `${data.email} plan je zdaj ${data.plan}`,
        timestamp: timestamp,
        type: "license_update",
        data: data
      }]);
      console.log("📡 License update prejeto:", data);
    });

    // Room management events
    socket.on("room_joined", (data) => {
      console.log(`👥 Uspešno pridružen room: ${data.plan}`);
      setNotifications((prev) => [...prev, {
        message: `Pridružili ste se ${data.plan} skupini`,
        timestamp: new Date().toLocaleTimeString(),
        type: "room_joined",
        data: data
      }]);
    });

    // Connection health check
    socket.on("pong", (data) => {
      setHeartbeatStatus("active");
      console.log("✅ Connection heartbeat OK:", data.timestamp);
    });

    // Comprehensive error handling
    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error.message);
      setHeartbeatStatus("error");
      setNotifications((prev) => [...prev, {
        message: `Napaka povezave: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "error",
        data: { error: error.message }
      }]);
    });

    socket.on("error", (data) => {
      console.error("❌ Socket napaka:", data.message);
      setNotifications((prev) => [...prev, {
        message: `Napaka: ${data.message}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "error",
        data: data
      }]);
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("reconnect");
      socket.off("reconnect_attempt");
      socket.off("reconnect_error");
      socket.off("reconnect_failed");
      socket.off("license_update");
      socket.off("room_joined");
      socket.off("pong");
      socket.off("connect_error");
      socket.off("error");
    };
  }, [plan]);

  // 💓 Maintain connection with periodic ping (enhanced)
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketConnected) {
        socket.emit("ping");
        setHeartbeatStatus("pinging");
        console.log("💓 Sending ping to maintain connection");
      }
    }, 60000); // Ping every 60 seconds
    
    return () => clearInterval(interval);
  }, [socketConnected]);

  const login = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password,
          rememberMe 
        }),
      });
      
      if (!res.ok) throw new Error("Napaka pri povezavi s strežnikom");
      
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setRole(data.user.role);
        setPlan(data.user.plan);
        setPlanExpires(data.user.plan_expires);
        
        // 🔐 Save credentials if "Remember Me" is checked
        if (rememberMe) {
          localStorage.setItem('omni_token', data.token);
          localStorage.setItem('omni_role', data.user.role);
          localStorage.setItem('omni_plan', data.user.plan);
          localStorage.setItem('omni_plan_expires', data.user.plan_expires);
          localStorage.setItem('omni_email', email);
          localStorage.setItem('omni_password', password); // ⚠️ Varnostno opozorilo: geslo se shranjuje lokalno
          localStorage.setItem('omni_remember_me', 'true');
        } else {
          // Počisti shranjene podatke, če "Remember Me" ni označen
          localStorage.removeItem('omni_email');
          localStorage.removeItem('omni_password');
          localStorage.removeItem('omni_remember_me');
        }
        
        // 👥 Pridruži se plan room po uspešni prijavi
        if (socketConnected && data.user.plan) {
          socket.emit("join_plan", data.user.plan);
        }
        
        // Če je admin, pridobi statistike
        if (data.user.role === "admin") {
          fetchAdminStats(data.token);
          fetchUsers();
        }
      } else {
        alert("Neveljavni prijavni podatki");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const setPlanAdmin = async (targetEmail, newPlan) => {
    try {
      const res = await fetch("http://localhost:5001/api/setPlan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email: targetEmail, plan: newPlan }),
      });
      
      if (!res.ok) throw new Error("Napaka pri nastavljanju plana");
      
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      alert(error.message);
    }
  };

  const extendPlanAdmin = async (targetEmail, days) => {
    try {
      const res = await fetch("http://localhost:5001/api/extendPlan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email: targetEmail, days: parseInt(days) }),
      });
      
      if (!res.ok) throw new Error("Napaka pri podaljšanju naročnine");
      
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      alert(error.message);
    }
  };

  const fetchAdminStats = async (authToken) => {
    try {
      const res = await fetch("http://localhost:5001/api/admin", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      
      if (!res.ok) throw new Error("Napaka pri pridobivanju statistik");
      
      const data = await res.json();
      setAdminStats(data.stats);
    } catch (error) {
      console.error("Napaka pri pridobivanju admin statistik:", error);
    }
  };

  const fetchUsers = async (filters = usersFilter) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.plan !== 'all') queryParams.append('plan', filters.plan);
      if (filters.role !== 'all') queryParams.append('role', filters.role);
      if (filters.expired !== 'all') queryParams.append('expired', filters.expired);
      if (filters.search && filters.search.trim()) queryParams.append('search', filters.search.trim());
      
      const res = await fetch(`http://localhost:5001/api/users?${queryParams}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Napaka pri pridobivanju uporabnikov");
      
      const data = await res.json();
      setUsersList(data.users);
    } catch (error) {
      console.error("Napaka pri pridobivanju uporabnikov:", error);
    }
  };

  // 🔐 Logout function with localStorage cleanup
  const logout = () => {
    setToken(null);
    setRole(null);
    setPlan(null);
    setPlanExpires(null);
    setEmail('');
    setPassword('');
    setRememberMe(false);
    
    // Clear all saved credentials including password and remember me state
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_role');
    localStorage.removeItem('omni_plan');
    localStorage.removeItem('omni_plan_expires');
    localStorage.removeItem('omni_email');
    localStorage.removeItem('omni_password');
    localStorage.removeItem('omni_remember_me');
    localStorage.removeItem('omni_auto_login'); // Počisti tudi avtomatsko prijavo
  };

  // 🔐 Forgot password function
  const forgotPassword = async () => {
    if (!resetEmail) {
      alert('Prosim vnesite email naslov');
      return;
    }
    
    try {
      const res = await fetch("http://localhost:5001/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('Navodila za ponastavitev gesla so bila poslana na vaš email');
        setShowForgotPassword(false);
        setResetEmail('');
      } else {
        alert(data.message || 'Napaka pri pošiljanju emaila');
      }
    } catch (error) {
      alert('Napaka pri povezavi s strežnikom');
    }
  };

  // 📝 Register function
  const register = async () => {
    if (!registerData.username || !registerData.email || !registerData.password) {
      alert('Prosim izpolnite vsa polja');
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      alert('Gesli se ne ujemata');
      return;
    }
    
    if (registerData.password.length < 6) {
      alert('Geslo mora imeti vsaj 6 znakov');
      return;
    }
    
    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registerData.username,
          email: registerData.email,
          password: registerData.password
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('Registracija uspešna! Preverite svoj email za potrditev.');
        setShowRegister(false);
        setRegisterData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        alert(data.message || 'Napaka pri registraciji');
      }
    } catch (error) {
      alert('Napaka pri povezavi s strežnikom');
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...usersFilter, [filterType]: value };
    setUsersFilter(newFilters);
    fetchUsers(newFilters);
  };

  return (
    <div className="p-6 font-sans max-w-md mx-auto">
      {!token ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-center">
            {showRegister ? 'Registracija' : 'Omni Login'}
          </h1>
          
          {!showForgotPassword && !showRegister ? (
            <>
              {/* Login Form */}
              <div className="space-y-2">
                <input
                  className="border p-2 w-full rounded"
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="border p-2 w-full rounded"
                  placeholder="Geslo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {/* Remember Me checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="rememberMe" className="text-sm text-gray-600">
                  Zapomni si me
                </label>
              </div>
              
              {/* Auto Login for this computer */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border border-purple-200">
                <button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded w-full font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
                  onClick={() => {
                    localStorage.setItem('omni_auto_login', 'true');
                    alert('🔓 Avtomatska prijava je omogočena za ta računalnik!\nNaslednjič se boste prijavili avtomatsko.');
                  }}
                >
                  🔓 Omogoči prost vstop na tem računalniku
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Naslednjič se boste prijavili avtomatsko brez gesla
                </p>
              </div>
              
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
                onClick={login}
              >
                Prijava
              </button>
              
              {/* Links */}
              <div className="text-center space-y-2">
                <button
                  className="text-blue-500 hover:text-blue-600 text-sm underline block w-full"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Pozabljeno geslo?
                </button>
                
                <button
                  className="text-green-500 hover:text-green-600 text-sm underline block w-full"
                  onClick={() => setShowRegister(true)}
                >
                  Nimate računa? Registrirajte se
                </button>
              </div>
            </>
          ) : showRegister ? (
            <>
              {/* Registration Form */}
              <div className="space-y-2">
                <input
                  className="border p-2 w-full rounded"
                  placeholder="Uporabniško ime"
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                  required
                />
                <input
                  className="border p-2 w-full rounded"
                  placeholder="Email"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                  required
                />
                <input
                  type="password"
                  className="border p-2 w-full rounded"
                  placeholder="Geslo (min. 6 znakov)"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  required
                />
                <input
                  type="password"
                  className="border p-2 w-full rounded"
                  placeholder="Potrdite geslo"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <button
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
                  onClick={register}
                >
                  Registriraj se
                </button>
                
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
                  onClick={() => {
                    setShowRegister(false);
                    setRegisterData({
                      username: '',
                      email: '',
                      password: '',
                      confirmPassword: ''
                    });
                  }}
                >
                  Nazaj na prijavo
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-center">Pozabljeno geslo</h2>
                <p className="text-sm text-gray-600 text-center">
                  Vnesite vaš email naslov in poslali vam bomo navodila za ponastavitev gesla.
                </p>
                <input
                  className="border p-2 w-full rounded"
                  placeholder="Email naslov"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
                  onClick={forgotPassword}
                >
                  Pošlji navodila
                </button>
                
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                  }}
                >
                  Nazaj na prijavo
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-semibold">Prijavljen kot: {role}</h2>
          
          {/* Prikaz plana z vizualnimi indikatorji */}
          <div className="mt-2 mb-4">
            {plan === "premium" && (
              <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                <span className="mr-1">👑</span>
                Premium Plan
              </div>
            )}
            {plan === "basic" && (
              <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <span className="mr-1">⭐</span>
                Basic Plan
              </div>
            )}
            {plan === "demo" && (
              <div className="inline-flex items-center bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                <span className="mr-1">🔒</span>
                Demo Plan
              </div>
            )}
          </div>
          
          {/* Prikaz opozorila o poteku plana */}
          {role !== "admin" && plan !== "demo" && plan_expires && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">
                ⏰ Vaš plan poteče: {new Date(plan_expires).toLocaleDateString()}
              </p>
              <p className="text-xs text-red-500 mt-1">
                Kontaktirajte administratorja za podaljšanje naročnine
              </p>
            </div>
          )}
          
          {role === "admin" ? (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <p>⚡ Admin konzola – upravljanje modulov, cenikov in premium funkcij</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAdminDashboard(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    🚀 Odpri Ultimate Dashboard
                  </button>
                  <button
                    onClick={() => setShowOmniBrainDashboard(true)}
                    className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    🧠 Omni Brain Dashboard
                  </button>
                </div>
              </div>
              
              {/* Admin statistike in grafikoni */}
              {adminStats && (
                <div className="mb-6 space-y-4">
                  <h3 className="font-semibold text-lg">📊 Statistike sistema</h3>
                  
                  {/* Osnovne statistike */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded border">
                      <div className="text-2xl font-bold text-blue-600">{adminStats.totalUsers}</div>
                      <div className="text-sm text-blue-500">Skupaj uporabnikov</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded border">
                      <div className="text-2xl font-bold text-green-600">{adminStats.newUsersThisWeek}</div>
                      <div className="text-sm text-green-500">Novi (7 dni)</div>
                    </div>
                  </div>
                  
                  {/* Recharts - Distribucija planov (Bar Chart) */}
                  <div className="bg-gray-50 p-4 rounded border">
                    <h4 className="font-medium mb-3">📊 Distribucija planov</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { plan: "Premium", users: adminStats.planDistribution.premium, fill: "#fbbf24" },
                        { plan: "Basic", users: adminStats.planDistribution.basic, fill: "#60a5fa" },
                        { plan: "Demo", users: adminStats.planDistribution.demo, fill: "#9ca3af" }
                      ]}>
                        <XAxis dataKey="plan" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} uporabnikov`, "Število"]} />
                        <Bar dataKey="users" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Recharts - Aktivni vs Potekli plani (Pie Chart) */}
                  <div className="bg-gray-50 p-4 rounded border">
                    <h4 className="font-medium mb-3">🔄 Status planov</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Aktivni", value: adminStats.activePlans.basic + adminStats.activePlans.premium, fill: "#10b981" },
                            { name: "Potekli", value: adminStats.expiredPlans, fill: "#ef4444" }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {/* Spreminjanje plana */}
                <div className="border rounded p-3 bg-gray-50">
                  <h3 className="font-semibold mb-2">Spreminjanje plana</h3>
                  <input
                    className="border p-2 w-full rounded text-sm mb-2"
                    placeholder="Email uporabnika"
                    id="adminEmail"
                  />
                  <div className="flex gap-2">
                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex-1"
                      onClick={() => {
                        const targetEmail = document.getElementById('adminEmail').value;
                        if (targetEmail) setPlanAdmin(targetEmail, 'premium');
                      }}
                    >
                      Premium
                    </button>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex-1"
                      onClick={() => {
                        const targetEmail = document.getElementById('adminEmail').value;
                        if (targetEmail) setPlanAdmin(targetEmail, 'basic');
                      }}
                    >
                      Basic
                    </button>
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex-1"
                      onClick={() => {
                        const targetEmail = document.getElementById('adminEmail').value;
                        if (targetEmail) setPlanAdmin(targetEmail, 'demo');
                      }}
                    >
                      Demo
                    </button>
                  </div>
                </div>

                {/* Podaljšanje naročnine */}
                <div className="border rounded p-3 bg-green-50">
                  <h3 className="font-semibold mb-2">Podaljšanje naročnine</h3>
                  <input
                    className="border p-2 w-full rounded text-sm mb-2"
                    placeholder="Email uporabnika"
                    id="extendEmail"
                  />
                  <div className="flex gap-2 mb-2">
                    <input
                      className="border p-2 flex-1 rounded text-sm"
                      placeholder="Število dni"
                      type="number"
                      id="extendDays"
                      min="1"
                      max="365"
                    />
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                      onClick={() => {
                        const targetEmail = document.getElementById('extendEmail').value;
                        const days = document.getElementById('extendDays').value;
                        if (targetEmail && days) extendPlanAdmin(targetEmail, days);
                      }}
                    >
                      Podaljšaj
                    </button>
                  </div>
                  <div className="flex gap-1 text-xs">
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex-1"
                      onClick={() => {
                        document.getElementById('extendDays').value = '30';
                      }}
                    >
                      30 dni
                    </button>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex-1"
                      onClick={() => {
                        document.getElementById('extendDays').value = '90';
                      }}
                    >
                      90 dni
                    </button>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex-1"
                      onClick={() => {
                        document.getElementById('extendDays').value = '365';
                      }}
                    >
                      1 leto
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtri za upravljanje uporabnikov */}
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="text-purple-700 font-medium mb-3">🔍 Napredni filtri uporabnikov</h3>
                
                {/* Iskalno polje */}
                <div className="mb-4">
                  <label className="block text-xs text-purple-600 mb-1">Iskanje po imenu ali emailu:</label>
                  <input
                    type="text"
                    className="w-full border border-purple-200 rounded px-3 py-2 text-sm"
                    placeholder="Vnesite ime ali email uporabnika..."
                    value={usersFilter.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <label className="block text-xs text-purple-600 mb-1">Plan:</label>
                    <select 
                      className="w-full border border-purple-200 rounded px-2 py-1 text-xs"
                      value={usersFilter.plan}
                      onChange={(e) => handleFilterChange('plan', e.target.value)}
                    >
                      <option value="all">Vsi</option>
                      <option value="premium">Premium</option>
                      <option value="basic">Basic</option>
                      <option value="demo">Demo</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-purple-600 mb-1">Vloga:</label>
                    <select 
                      className="w-full border border-purple-200 rounded px-2 py-1 text-xs"
                      value={usersFilter.role}
                      onChange={(e) => handleFilterChange('role', e.target.value)}
                    >
                      <option value="all">Vse</option>
                      <option value="admin">Admin</option>
                      <option value="user">Uporabnik</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-purple-600 mb-1">Status:</label>
                    <select 
                      className="w-full border border-purple-200 rounded px-2 py-1 text-xs"
                      value={usersFilter.expired}
                      onChange={(e) => handleFilterChange('expired', e.target.value)}
                    >
                      <option value="all">Vsi</option>
                      <option value="active">Aktivni</option>
                      <option value="expired">Potekli</option>
                    </select>
                  </div>
                </div>

                {/* Seznam uporabnikov */}
                <div className="max-h-60 overflow-y-auto">
                  <div className="text-xs text-purple-600 mb-2">
                    Najdenih uporabnikov: {usersList.length}
                  </div>
                  
                  {usersList.length > 0 ? (
                    <div className="space-y-2">
                      {usersList.map((user, index) => (
                        <div key={index} className="bg-white p-2 rounded border border-purple-100">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-xs font-medium text-gray-800">{user.email}</div>
                              <div className="flex gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  user.plan === 'premium' ? 'bg-green-100 text-green-700' :
                                  user.plan === 'basic' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {user.plan}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {user.role}
                                </span>
                                {user.plan_expires && (
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    new Date(user.plan_expires) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {new Date(user.plan_expires) < new Date() ? 'Potekel' : 'Aktiven'}
                                  </span>
                                )}
                              </div>
                              {user.plan_expires && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Poteče: {new Date(user.plan_expires).toLocaleDateString('sl-SI')}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-1 ml-2">
                              <button
                                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  document.getElementById('targetEmail').value = user.email;
                                }}
                              >
                                Izberi
                              </button>
                              <button
                                className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  document.getElementById('extendEmail').value = user.email;
                                }}
                              >
                                Podaljšaj
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 text-center py-4">
                      Ni uporabnikov, ki bi ustrezali filtrom
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="mb-3 font-medium">👤 Client Panel – upravljanje z osebnimi ceniki in moduli</p>
              
              {/* Funkcionalnosti glede na plan */}
              <div className="space-y-3">
                {plan === "premium" && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm font-medium mb-2">✅ Premium funkcionalnosti</p>
                    <ul className="text-xs text-green-600 space-y-1">
                      <li>• Neomejeno število poizvedb</li>
                      <li>• Dostop do vseh AI modulov</li>
                      <li>• Prioritetna podpora</li>
                      <li>• Napredne analitike</li>
                      <li>• API dostop</li>
                    </ul>
                  </div>
                )}
                
                {plan === "basic" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm font-medium mb-2">⭐ Basic funkcionalnosti</p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• 100 poizvedb na dan</li>
                      <li>• Dostop do osnovnih modulov</li>
                      <li>• Email podpora</li>
                      <li>• Osnovne analitike</li>
                    </ul>
                    <p className="text-xs text-yellow-600 mt-2 font-medium">
                      💡 Nadgradite na Premium za več funkcionalnosti
                    </p>
                  </div>
                )}
                
                {plan === "demo" && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-700 text-sm font-medium mb-2">🔒 Demo omejitve</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• 10 poizvedb na dan</li>
                      <li>• Omejen dostop do modulov</li>
                      <li>• Brez podpore</li>
                      <li>• Brez analitik</li>
                    </ul>
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      🚀 Kontaktirajte administratorja za nadgradnjo
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 🚀 Omni Ultimate Turbo Flow - Real-time obvestila z naprednim UI */}
          <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-blue-800 font-bold text-lg flex items-center">
                🔔 Omni Ultimate Turbo Flow
                <span className="ml-2 text-sm font-normal text-blue-600">Real-time Notifications</span>
              </h3>
              <div className="flex items-center space-x-3">
                {/* Connection Status Indicator */}
                <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full shadow-sm">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    socketConnected ? 'bg-green-500' : 
                    heartbeatStatus === 'reconnecting' ? 'bg-yellow-500' : 
                    heartbeatStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-xs font-medium text-gray-700">
                    {socketConnected ? 'Povezano' : 
                     heartbeatStatus === 'reconnecting' ? 'Povezujem...' : 
                     heartbeatStatus === 'error' ? 'Napaka' : 'Nepovezano'}
                  </span>
                </div>
                
                {/* Heartbeat Status */}
                <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-full shadow-sm">
                  <span className="text-xs text-gray-500">💓</span>
                  <span className="text-xs font-medium text-gray-600">{heartbeatStatus}</span>
                </div>
                
                {/* Connection Attempts Counter */}
                {connectionAttempts > 0 && (
                  <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                    Poskusi: {connectionAttempts}
                  </div>
                )}
                
                {/* Current Room Indicator */}
                {currentRoom && (
                  <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                    Room: {currentRoom}
                  </div>
                )}
              </div>
            </div>
            
            {/* Enhanced Notifications Display */}
            {notifications.length > 0 ? (
              <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-blue-200 shadow-inner">
                <ul className="divide-y divide-gray-100">
                  {notifications.slice(-15).reverse().map((notification, index) => (
                    <li key={index} className={`p-3 hover:bg-gray-50 transition-colors duration-200 ${
                      notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-400' :
                      notification.type === 'room_joined' ? 'bg-blue-50 border-l-4 border-blue-400' :
                      notification.type === 'license_update' ? 'bg-green-50 border-l-4 border-green-400' :
                      'bg-white border-l-4 border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            notification.type === 'error' ? 'text-red-800' :
                            notification.type === 'room_joined' ? 'text-blue-800' :
                            notification.type === 'license_update' ? 'text-green-800' :
                            'text-gray-800'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.timestamp}
                          </p>
                        </div>
                        <div className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          notification.type === 'error' ? 'bg-red-100 text-red-700' :
                          notification.type === 'room_joined' ? 'bg-blue-100 text-blue-700' :
                          notification.type === 'license_update' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {notification.type === 'error' ? '❌' :
                           notification.type === 'room_joined' ? '👥' :
                           notification.type === 'license_update' ? '📡' : '📝'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-blue-200 p-8 text-center">
                <div className="text-blue-300 text-4xl mb-2">🔔</div>
                <p className="text-blue-600 font-medium">Ni novih obvestil</p>
                <p className="text-blue-400 text-sm mt-1">Obvestila se bodo prikazala tukaj v realnem času</p>
              </div>
            )}
            
            {/* Enhanced Action Buttons */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-blue-600">
                Prikazanih: {Math.min(notifications.length, 15)} / {notifications.length} obvestil
              </div>
              
              <div className="flex space-x-2">
                {notifications.length > 0 && (
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm"
                    onClick={() => setNotifications([])}
                  >
                    🗑️ Počisti obvestila
                  </button>
                )}
                
                {/* Manual Reconnect Button */}
                {!socketConnected && (
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm"
                    onClick={() => {
                      socket.disconnect();
                      socket.connect();
                    }}
                  >
                    🔄 Ponovno poveži
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full mt-4"
            onClick={logout}
          >
            Odjava
          </button>
        </div>
      )}

      {/* 🚀 Admin Dashboard Modal */}
      {showAdminDashboard && (
        <AdminDashboard 
          token={token}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}

      {/* 🧠 Omni Brain Dashboard Modal */}
      {showOmniBrainDashboard && (
        <OmniBrainDashboard 
          token={token}
          onClose={() => setShowOmniBrainDashboard(false)}
        />
      )}
    </div>
  );
}