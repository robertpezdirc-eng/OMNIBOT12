import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

// 🚀 Omni Ultimate Turbo Flow - Admin Dashboard
const socket = io("http://localhost:5001", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 5,
  timeout: 20000,
  forceNew: true
});

export default function AdminDashboard({ token, onClose }) {
  // 📊 State Management
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    expiredUsers: 0,
    revenueEstimate: 0
  });
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [sortBy, setSortBy] = useState("email");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeTab, setActiveTab] = useState("overview");
  const [isVisible, setIsVisible] = useState(false);

  // 🎨 Enhanced Chart Colors with gradients
  const COLORS = {
    demo: '#667eea',
    basic: '#764ba2', 
    premium: '#f093fb',
    expired: '#ff6b6b',
    gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  };

  // Animation trigger
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 📡 Fetch initial users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5001/api/users", {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setUsers(data);
        calculateStats(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(`Napaka pri pridobivanju uporabnikov: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchUsers();
    }
  }, [token]);

  // 📊 Calculate statistics
  const calculateStats = (userData) => {
    const now = new Date();
    const activeUsers = userData.filter(u => 
      !u.plan_expires || new Date(u.plan_expires) > now
    ).length;
    const expiredUsers = userData.filter(u => 
      u.plan_expires && new Date(u.plan_expires) <= now
    ).length;
    
    // Revenue estimate (basic pricing)
    const revenueEstimate = userData.reduce((sum, user) => {
      if (user.plan === 'basic') return sum + 10;
      if (user.plan === 'premium') return sum + 25;
      return sum;
    }, 0);

    setStats({
      totalUsers: userData.length,
      activeUsers,
      expiredUsers,
      revenueEstimate
    });
  };

  // 🔌 WebSocket real-time updates
  useEffect(() => {
    // Connection events
    socket.on("connect", () => {
      setSocketConnected(true);
      addNotification("✅ Admin Dashboard povezan", "success");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      addNotification("❌ Admin Dashboard odklopljen", "error");
    });

    // License updates
    socket.on("license_update", (data) => {
      addNotification(`📡 ${data.email} plan je zdaj ${data.plan}`, "update");
      
      setUsers(prev => {
        const updated = prev.map(u => 
          u.email === data.email 
            ? {...u, plan: data.plan, plan_expires: data.expires} 
            : u
        );
        calculateStats(updated);
        return updated;
      });
    });

    // Plan room updates
    socket.on("plan_room_update", (data) => {
      addNotification(`🏠 Plan room update: ${data.message}`, "room");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("license_update");
      socket.off("plan_room_update");
    };
  }, []);

  // 📝 Add notification helper
  const addNotification = (message, type = "info") => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setNotifications(prev => [...prev.slice(-19), notification]);
  };

  // 🔍 Filter and sort users
  const filteredAndSortedUsers = users
    .filter(u => {
      const matchesFilter = u.email.toLowerCase().includes(filter.toLowerCase()) || 
                           u.plan.toLowerCase().includes(filter.toLowerCase());
      const matchesPlan = selectedPlan === "all" || u.plan === selectedPlan;
      return matchesFilter && matchesPlan;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'plan_expires') {
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // 📊 Chart data preparation
  const planDistributionData = ["demo", "basic", "premium"].map(plan => ({
    plan: plan.charAt(0).toUpperCase() + plan.slice(1),
    users: users.filter(u => u.plan === plan).length,
    fill: COLORS[plan]
  }));

  const statusDistributionData = [
    {
      name: "Aktivni",
      value: stats.activeUsers,
      fill: COLORS.basic
    },
    {
      name: "Potekli",
      value: stats.expiredUsers,
      fill: COLORS.expired
    }
  ];

  // 📈 Enhanced Activity timeline with more data points
  const activityData = [
    { name: 'Pon', registrations: 4, upgrades: 2, revenue: 120 },
    { name: 'Tor', registrations: 3, upgrades: 1, revenue: 85 },
    { name: 'Sre', registrations: 6, upgrades: 3, revenue: 180 },
    { name: 'Čet', registrations: 8, upgrades: 4, revenue: 220 },
    { name: 'Pet', registrations: 5, upgrades: 2, revenue: 150 },
    { name: 'Sob', registrations: 2, upgrades: 1, revenue: 60 },
    { name: 'Ned', registrations: 1, upgrades: 0, revenue: 25 }
  ];

  // 🎯 Tab Navigation Component
  const TabNavigation = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6">
      {[
        { id: 'overview', label: '📊 Pregled', icon: '📊' },
        { id: 'analytics', label: '📈 Analitika', icon: '📈' },
        { id: 'users', label: '👥 Uporabniki', icon: '👥' },
        { id: 'notifications', label: '🔔 Obvestila', icon: '🔔' }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
            activeTab === tab.id
              ? 'bg-white text-blue-600 shadow-lg border-2 border-blue-200'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <span className="text-lg mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-purple-500 rounded-full animate-spin animation-delay-150 mx-auto"></div>
          </div>
          <div className="mt-6 text-white">
            <h3 className="text-xl font-bold mb-2">🚀 Nalagam Omni Dashboard</h3>
            <p className="text-blue-200">Pripravljam napredne analitike...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-pink-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg border border-red-200/20 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-white text-xl font-bold mb-2">Napaka pri nalaganju</h3>
            <p className="text-red-200 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105"
            >
              🔄 Ponovno naloži
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated Background Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* 🎯 Enhanced Header */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-6 transform transition-all duration-700 hover:scale-[1.02]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🚀 OMNI
              </span>
              <span className="ml-3 text-2xl font-normal text-blue-200">Ultimate Dashboard</span>
            </h1>
            <p className="text-blue-200 mt-2 text-lg">Napredni nadzorni center z AI analitiko</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Enhanced Connection Status */}
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20">
              <div className="relative">
                <div className={`w-4 h-4 rounded-full ${
                  socketConnected ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                {socketConnected && (
                  <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
                )}
              </div>
              <span className="text-white font-medium">
                {socketConnected ? '🟢 Povezano' : '🔴 Nepovezano'}
              </span>
            </div>
            
            {/* Enhanced Close Button */}
            <button
              onClick={onClose}
              className="bg-red-500/20 hover:bg-red-500/40 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 border border-red-400/30"
            >
              ✕ Zapri
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* 📊 Enhanced Statistics Cards */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[
              { icon: '👥', label: 'Skupaj uporabnikov', value: stats.totalUsers, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/20' },
              { icon: '✅', label: 'Aktivni uporabniki', value: stats.activeUsers, color: 'from-green-500 to-emerald-500', bg: 'bg-green-500/20' },
              { icon: '⏰', label: 'Potekli plani', value: stats.expiredUsers, color: 'from-red-500 to-pink-500', bg: 'bg-red-500/20' },
              { icon: '💰', label: 'Mesečni prihodek', value: `$${stats.revenueEstimate}`, color: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/20' }
            ].map((stat, index) => (
              <div 
                key={index}
                className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 transform transition-all duration-500 hover:scale-105 hover:bg-white/20 ${stat.bg}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center">
                  <div className={`bg-gradient-to-r ${stat.color} p-4 rounded-xl text-white text-2xl`}>
                    {stat.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-blue-200 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 📈 Enhanced Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Plan Distribution with Gradient */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 transform transition-all duration-500 hover:scale-[1.02]">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Uporabniki po planih
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={planDistributionData}>
                  <defs>
                    <linearGradient id="colorDemo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="colorBasic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#764ba2" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#764ba2" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f093fb" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="plan" tick={{ fill: 'white' }} />
                  <YAxis tick={{ fill: 'white' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: 'white'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="users" fill="url(#colorDemo)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Enhanced Status Pie Chart */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 transform transition-all duration-500 hover:scale-[1.02]">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🥧</span>
                Status uporabnikov
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: 'white'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 📈 Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Enhanced Activity Timeline with Area Chart */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 transform transition-all duration-500 hover:scale-[1.01]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Tedenski pregled aktivnosti
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorUpgrades" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: 'white' }} />
                <YAxis tick={{ fill: 'white' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: 'white'
                  }} 
                />
                <Legend />
                <Area type="monotone" dataKey="registrations" stackId="1" stroke="#8884d8" fill="url(#colorRegistrations)" name="Registracije" />
                <Area type="monotone" dataKey="upgrades" stackId="1" stroke="#82ca9d" fill="url(#colorUpgrades)" name="Nadgradnje" />
                <Area type="monotone" dataKey="revenue" stackId="2" stroke="#ffc658" fill="url(#colorRevenue)" name="Prihodek ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Konverzijska stopnja', value: '12.5%', change: '+2.3%', positive: true },
              { title: 'Povprečna vrednost uporabnika', value: '$18.50', change: '+$3.20', positive: true },
              { title: 'Stopnja ohranitve', value: '87.2%', change: '-1.1%', positive: false }
            ].map((metric, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 transform transition-all duration-500 hover:scale-105">
                <h4 className="text-blue-200 text-sm font-medium mb-2">{metric.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{metric.value}</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    metric.positive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 👥 Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 className="text-xl font-bold text-white mb-4 md:mb-0 flex items-center">
              <span className="text-2xl mr-2">👥</span>
              Upravljanje uporabnikov
            </h3>
            
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
              {/* Enhanced Filter Input */}
              <input
                className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                placeholder="🔍 Filter po emailu ali planu"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
              
              {/* Enhanced Plan Filter */}
              <select
                className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                value={selectedPlan}
                onChange={e => setSelectedPlan(e.target.value)}
              >
                <option value="all" className="bg-gray-800">Vsi plani</option>
                <option value="demo" className="bg-gray-800">Demo</option>
                <option value="basic" className="bg-gray-800">Basic</option>
                <option value="premium" className="bg-gray-800">Premium</option>
              </select>
              
              {/* Enhanced Sort Options */}
              <select
                className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
              >
                <option value="email-asc" className="bg-gray-800">Email ↑</option>
                <option value="email-desc" className="bg-gray-800">Email ↓</option>
                <option value="plan-asc" className="bg-gray-800">Plan ↑</option>
                <option value="plan-desc" className="bg-gray-800">Plan ↓</option>
                <option value="plan_expires-asc" className="bg-gray-800">Poteče ↑</option>
                <option value="plan_expires-desc" className="bg-gray-800">Poteče ↓</option>
              </select>
            </div>
          </div>

          {/* Enhanced Users Table */}
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="border border-white/10 px-6 py-4 text-left text-sm font-medium text-blue-200">Email</th>
                  <th className="border border-white/10 px-6 py-4 text-left text-sm font-medium text-blue-200">Plan</th>
                  <th className="border border-white/10 px-6 py-4 text-left text-sm font-medium text-blue-200">Poteče</th>
                  <th className="border border-white/10 px-6 py-4 text-left text-sm font-medium text-blue-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map((user, index) => {
                  const isExpired = user.plan_expires && new Date(user.plan_expires) <= new Date();
                  return (
                    <tr key={user.email} className={`${index % 2 === 0 ? 'bg-white/5' : 'bg-white/10'} hover:bg-white/20 transition-all duration-300`}>
                      <td className="border border-white/10 px-6 py-4 text-sm text-white">{user.email}</td>
                      <td className="border border-white/10 px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.plan === 'premium' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black' :
                          user.plan === 'basic' ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-black' :
                          'bg-gradient-to-r from-blue-400 to-cyan-400 text-black'
                        }`}>
                          {user.plan.toUpperCase()}
                        </span>
                      </td>
                      <td className="border border-white/10 px-6 py-4 text-sm text-blue-200">
                        {user.plan_expires ? new Date(user.plan_expires).toLocaleDateString('sl-SI') : "-"}
                      </td>
                      <td className="border border-white/10 px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isExpired ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-green-500/20 text-green-300 border border-green-400/30'
                        }`}>
                          {isExpired ? '⏰ Potekel' : '✅ Aktiven'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredAndSortedUsers.length === 0 && (
              <div className="text-center py-12 text-blue-200">
                <span className="text-6xl mb-4 block">🔍</span>
                <p className="text-xl">Ni uporabnikov, ki bi ustrezali filtru</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-sm text-blue-200 bg-white/5 rounded-lg p-3">
            Prikazanih: <span className="font-bold text-white">{filteredAndSortedUsers.length}</span> / <span className="font-bold text-white">{users.length}</span> uporabnikov
          </div>
        </div>
      )}

      {/* 🔔 Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <span className="text-2xl mr-2">🔔</span>
              Real-time obvestila
            </h3>
            <button
              onClick={() => setNotifications([])}
              className="bg-red-500/20 hover:bg-red-500/40 text-red-300 px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 border border-red-400/30"
              disabled={notifications.length === 0}
            >
              🗑️ Počisti
            </button>
          </div>
          
          {notifications.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-3">
              {notifications.slice(-10).reverse().map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl border-l-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                    notification.type === 'error' ? 'bg-red-500/10 border-red-400 text-red-200' :
                    notification.type === 'success' ? 'bg-green-500/10 border-green-400 text-green-200' :
                    notification.type === 'update' ? 'bg-blue-500/10 border-blue-400 text-blue-200' :
                    'bg-gray-500/10 border-gray-400 text-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium">{notification.message}</p>
                    <span className="text-xs opacity-70 ml-4">{notification.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-blue-200">
              <span className="text-6xl mb-4 block">🔔</span>
              <p className="text-xl mb-2">Ni novih obvestil</p>
              <p className="text-sm opacity-70">Real-time obvestila se bodo prikazala tukaj</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}