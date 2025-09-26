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
  ResponsiveContainer 
} from "recharts";

// 🚀 Omni Cloud Ultimate Admin Dashboard
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

  // 🎨 Chart Colors
  const COLORS = {
    demo: '#8884d8',
    basic: '#82ca9d', 
    premium: '#ffc658',
    expired: '#ff7c7c'
  };

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

  // 🔌 Socket.IO Event Handlers
  useEffect(() => {
    socket.on('connect', () => {
      console.log('🔌 Admin Dashboard connected to Socket.IO');
      setSocketConnected(true);
      socket.emit('join_plan', 'admin');
    });

    socket.on('disconnect', () => {
      console.log('❌ Admin Dashboard disconnected from Socket.IO');
      setSocketConnected(false);
    });

    socket.on('user_update', (data) => {
      console.log('👤 User update received:', data);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'update',
        message: `Uporabnik ${data.email} je posodobil plan na ${data.plan}`,
        timestamp: new Date().toLocaleTimeString('sl-SI')
      }]);
      
      // Refresh users data
      if (token) {
        fetchUsers();
      }
    });

    socket.on('license_expired', (data) => {
      console.log('⏰ License expired:', data);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Licenca uporabnika ${data.email} je potekla`,
        timestamp: new Date().toLocaleTimeString('sl-SI')
      }]);
    });

    socket.on('global_update', (data) => {
      console.log('🌍 Global update:', data);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'info',
        message: data.message,
        timestamp: new Date().toLocaleTimeString('sl-SI')
      }]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('user_update');
      socket.off('license_expired');
      socket.off('global_update');
    };
  }, [token]);

  // 🔄 Refresh users data function
  const fetchUsers = async () => {
    try {
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
    } catch (err) {
      console.error("Error refreshing users:", err);
    }
  };

  // 📊 Prepare chart data
  const chartData = users.reduce((acc, user) => {
    const plan = user.plan || 'demo';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  const barChartData = Object.entries(chartData).map(([plan, count]) => ({
    plan: plan.toUpperCase(),
    count,
    fill: COLORS[plan] || '#8884d8'
  }));

  const pieChartData = Object.entries(chartData).map(([plan, count]) => ({
    name: plan.toUpperCase(),
    value: count,
    fill: COLORS[plan] || '#8884d8'
  }));

  // 🔍 Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesFilter = user.email.toLowerCase().includes(filter.toLowerCase()) ||
                           user.plan.toLowerCase().includes(filter.toLowerCase());
      const matchesPlan = selectedPlan === 'all' || user.plan === selectedPlan;
      return matchesFilter && matchesPlan;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'plan_expires') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Nalagam admin nadzorno ploščo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-800">🚀 Omni Cloud Admin Dashboard</h2>
            <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {socketConnected ? '🟢 Povezan' : '🔴 Nepovezan'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ✕ Zapri
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-500 text-xl mr-2">⚠️</span>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Skupaj uporabnikov</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <span className="text-4xl">👥</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Aktivni uporabniki</p>
                  <p className="text-3xl font-bold">{stats.activeUsers}</p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Potekli uporabniki</p>
                  <p className="text-3xl font-bold">{stats.expiredUsers}</p>
                </div>
                <span className="text-4xl">⏰</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Ocena prihodkov</p>
                  <p className="text-3xl font-bold">${stats.revenueEstimate}</p>
                </div>
                <span className="text-4xl">💰</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Uporabniki po planih</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🥧 Distribucija planov</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">👥 Seznam uporabnikov</h3>
              <button
                onClick={fetchUsers}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔄 Osveži
              </button>
            </div>
            
            {/* Filters */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-3">
                {/* Search Filter */}
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="🔍 Filter po emailu ali planu"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
                
                {/* Plan Filter */}
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                >
                  <option value="all">Vsi plani</option>
                  <option value="demo">Demo</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
                
                {/* Sort Options */}
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={e => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                >
                  <option value="email-asc">Email ↑</option>
                  <option value="email-desc">Email ↓</option>
                  <option value="plan-asc">Plan ↑</option>
                  <option value="plan-desc">Plan ↓</option>
                  <option value="plan_expires-asc">Poteče ↑</option>
                  <option value="plan_expires-desc">Poteče ↓</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Plan</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Poteče</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedUsers.map((user, index) => {
                    const isExpired = user.plan_expires && new Date(user.plan_expires) <= new Date();
                    return (
                      <tr key={user.email} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-800">{user.email}</td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.plan === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                            user.plan === 'basic' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {user.plan.toUpperCase()}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-600">
                          {user.plan_expires ? new Date(user.plan_expires).toLocaleDateString('sl-SI') : "-"}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
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
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">🔍</span>
                  <p>Ni uporabnikov, ki bi ustrezali filtru</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              Prikazanih: {filteredAndSortedUsers.length} / {users.length} uporabnikov
            </div>
          </div>

          {/* 🔔 Real-time Notifications */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">🔔 Real-time obvestila</h3>
              <button
                onClick={() => setNotifications([])}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                disabled={notifications.length === 0}
              >
                🗑️ Počisti
              </button>
            </div>
            
            {notifications.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.slice(-10).reverse().map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      notification.type === 'error' ? 'bg-red-50 border-red-400' :
                      notification.type === 'success' ? 'bg-green-50 border-green-400' :
                      notification.type === 'update' ? 'bg-blue-50 border-blue-400' :
                      'bg-gray-50 border-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-800">{notification.message}</p>
                      <span className="text-xs text-gray-500 ml-2">{notification.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">🔔</span>
                <p>Ni novih obvestil</p>
                <p className="text-sm mt-1">Real-time obvestila se bodo prikazala tukaj</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}