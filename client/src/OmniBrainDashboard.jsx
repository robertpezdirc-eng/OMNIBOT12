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

// 🧠 Omni Brain Centralizirani Nadzorni Panel
const socket = io("http://localhost:5001", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 5,
  timeout: 20000,
  forceNew: true
});

export default function OmniBrainDashboard({ token, onClose }) {
  // 🤖 State Management za Agente
  const [agents, setAgents] = useState({
    learning: { status: 'stopped', isRunning: false },
    commercial: { status: 'stopped', isRunning: false },
    optimization: { status: 'stopped', isRunning: false }
  });
  
  const [realTimeStats, setRealTimeStats] = useState({
    monitoring: {},
    cloudSave: {},
    agents: {},
    timestamp: new Date()
  });
  
  const [systemLogs, setSystemLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("agents");
  const [isVisible, setIsVisible] = useState(false);

  // 🎨 Barve za agente
  const AGENT_COLORS = {
    learning: '#4f46e5',
    commercial: '#059669', 
    optimization: '#dc2626',
    running: '#10b981',
    stopped: '#6b7280',
    error: '#ef4444'
  };

  // Animation trigger
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 📡 Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Pridobi status agentov
        const agentsResponse = await fetch("http://localhost:5001/api/agents/status", {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (agentsResponse.ok) {
          const agentsData = await agentsResponse.json();
          setAgents(agentsData);
        }
        
        // Pridobi real-time statistike
        const statsResponse = await fetch("http://localhost:5001/api/system/stats", {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setRealTimeStats(statsData);
        }
        
        // Pridobi sistemske dnevnike
        const logsResponse = await fetch("http://localhost:5001/api/logs?limit=50", {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          setSystemLogs(logsData.logs || []);
        }
        
        setError(null);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(`Napaka pri pridobivanju podatkov: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInitialData();
    }
  }, [token]);

  // 🔌 WebSocket real-time updates
  useEffect(() => {
    // Connection events
    socket.on("connect", () => {
      setSocketConnected(true);
      addNotification("✅ Omni Brain Dashboard povezan", "success");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      addNotification("❌ Omni Brain Dashboard odklopljen", "error");
    });

    // Agent updates
    socket.on("agent_update", (data) => {
      addNotification(`🤖 ${data.agentType} Agent: ${data.message}`, "agent");
      
      setAgents(prev => ({
        ...prev,
        [data.agentType]: {
          ...prev[data.agentType],
          ...data.status
        }
      }));
    });

    // System notifications
    socket.on("system_notification", (data) => {
      addNotification(`🔔 ${data.message}`, data.type || "info");
    });

    // Real-time stats updates
    socket.on("stats_update", (data) => {
      setRealTimeStats(data);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("agent_update");
      socket.off("system_notification");
      socket.off("stats_update");
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

  // 🤖 Agent Control Functions
  const controlAgent = async (agentType, action, config = {}) => {
    try {
      const response = await fetch(`http://localhost:5001/api/agents/${agentType}/control`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, config })
      });
      
      if (response.ok) {
        const result = await response.json();
        addNotification(`✅ ${agentType} Agent: ${result.message}`, "success");
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error(`Error controlling ${agentType} agent:`, err);
      addNotification(`❌ Napaka pri upravljanju ${agentType} agenta: ${err.message}`, "error");
    }
  };

  // 🎯 Tab Navigation Component
  const TabNavigation = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6">
      {[
        { id: 'agents', label: '🤖 Agenti', icon: '🤖' },
        { id: 'monitoring', label: '📊 Monitoring', icon: '📊' },
        { id: 'logs', label: '📋 Dnevniki', icon: '📋' },
        { id: 'cloud', label: '☁️ Oblak', icon: '☁️' }
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

  // 🤖 Agent Card Component
  const AgentCard = ({ agentType, agentData }) => {
    const isRunning = agentData?.isRunning || false;
    const status = agentData?.status || 'unknown';
    
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <h3 className="text-white text-lg font-bold capitalize">{agentType} Agent</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isRunning ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
          }`}>
            {isRunning ? 'Teče' : 'Ustavljen'}
          </span>
        </div>
        
        <div className="space-y-3 mb-4">
          {agentData?.config && (
            <div className="text-sm text-gray-300">
              <p>Konfiguracija:</p>
              <pre className="bg-black/20 p-2 rounded text-xs mt-1 overflow-x-auto">
                {JSON.stringify(agentData.config, null, 2)}
              </pre>
            </div>
          )}
          
          {agentData?.optimizationHistory && agentData.optimizationHistory.length > 0 && (
            <div className="text-sm text-gray-300">
              <p>Zadnja optimizacija: {new Date(agentData.optimizationHistory[0]?.timestamp).toLocaleTimeString()}</p>
            </div>
          )}
          
          {agentData?.opportunities && agentData.opportunities.length > 0 && (
            <div className="text-sm text-gray-300">
              <p>Priložnosti: {agentData.opportunities.length}</p>
            </div>
          )}
          
          {agentData?.simulations && agentData.simulations.length > 0 && (
            <div className="text-sm text-gray-300">
              <p>Povprečna ocena: {agentData.averageScore?.toFixed(2) || 'N/A'}</p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => controlAgent(agentType, isRunning ? 'stop' : 'start')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isRunning 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRunning ? '⏹️ Ustavi' : '▶️ Zaženi'}
          </button>
          <button
            onClick={() => controlAgent(agentType, 'restart')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-300"
          >
            🔄 Restart
          </button>
        </div>
      </div>
    );
  };

  // 📊 Monitoring Card Component
  const MonitoringCard = ({ title, value, unit, color, icon }) => (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-sm">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className={`text-3xl font-bold text-${color}-400`}>{value}</span>
        <span className="text-gray-400 text-sm">{unit}</span>
      </div>
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
            <h3 className="text-xl font-bold mb-2">🧠 Nalagam Omni Brain</h3>
            <p className="text-blue-200">Inicializiram avtonomne agente...</p>
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">🧠 Omni Brain Dashboard</h1>
          <p className="text-blue-200">Centralizirani nadzorni panel za avtonomne agente</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
            socketConnected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            <span className="text-sm font-medium">{socketConnected ? 'Povezano' : 'Odklopljeno'}</span>
          </div>
          <button
            onClick={onClose}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-full transition-all duration-300"
          >
            ✕ Zapri
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Content based on active tab */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">🤖 Avtonomni Agenti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AgentCard agentType="learning" agentData={agents.learning} />
            <AgentCard agentType="commercial" agentData={agents.commercial} />
            <AgentCard agentType="optimization" agentData={agents.optimization} />
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">📊 Sistemski Monitoring</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MonitoringCard 
              title="CPU Uporaba" 
              value={realTimeStats.monitoring?.cpu?.user || 0} 
              unit="%" 
              color="blue" 
              icon="🖥️" 
            />
            <MonitoringCard 
              title="Pomnilnik" 
              value={Math.round((realTimeStats.monitoring?.memory?.heapUsed || 0) / 1024 / 1024)} 
              unit="MB" 
              color="green" 
              icon="💾" 
            />
            <MonitoringCard 
              title="Povezave" 
              value={realTimeStats.monitoring?.connections || 0} 
              unit="aktivnih" 
              color="purple" 
              icon="🔗" 
            />
            <MonitoringCard 
              title="Zahteve" 
              value={realTimeStats.monitoring?.requests || 0} 
              unit="/min" 
              color="yellow" 
              icon="📡" 
            />
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">📋 Sistemski Dnevniki</h2>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {systemLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-black/20 rounded-lg">
                  <span className={`text-sm px-2 py-1 rounded ${
                    log.level === 'error' ? 'bg-red-500/20 text-red-300' :
                    log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-300' :
                    log.level === 'info' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {log.level?.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{log.message}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">☁️ Avtomatsko Shranjevanje</h2>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-white text-lg font-bold mb-3">Status Shranjevanja</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Status:</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      realTimeStats.cloudSave?.isRunning ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {realTimeStats.cloudSave?.isRunning ? 'Aktivno' : 'Neaktivno'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Zadnji backup:</span>
                    <span className="text-white">
                      {realTimeStats.cloudSave?.lastBackup 
                        ? new Date(realTimeStats.cloudSave.lastBackup).toLocaleString()
                        : 'Ni podatka'
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-white text-lg font-bold mb-3">Konfiguracija</h3>
                <div className="text-sm text-gray-300">
                  <pre className="bg-black/20 p-3 rounded overflow-x-auto">
                    {JSON.stringify(realTimeStats.cloudSave?.config || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 w-80 max-h-96 overflow-y-auto space-y-2">
          {notifications.slice(-5).map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg backdrop-blur-lg border transition-all duration-300 ${
                notification.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' :
                notification.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' :
                notification.type === 'agent' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' :
                'bg-gray-500/20 border-gray-500/30 text-gray-300'
              }`}
            >
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs opacity-70 mt-1">{notification.timestamp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}