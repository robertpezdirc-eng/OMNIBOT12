# 🔌 Omni Ultimate Turbo Flow System - WebSocket Dokumentacija

## 🌐 Pregled WebSocket API-ja

WebSocket API omogoča real-time komunikacijo med klientom in strežnikom za takojšnje posodobitve licenc, obvestila in sistemske dogodke.

**WebSocket URL**: `ws://localhost:3001` (razvoj) / `wss://your-domain.com` (produkcija)  
**Protocol**: Socket.IO v4.x  
**Namespace**: `/` (default)

## 🔗 Povezovanje

### Osnovna Povezava

```javascript
// Browser/Node.js
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to Omni WebSocket server');
  console.log('Socket ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Povezava z Avtentikacijo

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token',
    license_key: 'OMNI-PREM-ABCD-1234-EFGH'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Authenticated connection established');
});

socket.on('auth_error', (error) => {
  console.error('Authentication failed:', error);
});
```

### Povezava z Opcijami

```javascript
const socket = io('http://localhost:3001', {
  // Avtentikacija
  auth: {
    token: 'jwt-token',
    license_key: 'license-key'
  },
  
  // Reconnection nastavitve
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  
  // Transport nastavitve
  transports: ['websocket'],
  upgrade: true,
  
  // Timeout nastavitve
  timeout: 20000,
  
  // Dodatne možnosti
  forceNew: false,
  multiplex: true
});
```

## 📡 Dogodki (Events)

### 🔄 Sistemski Dogodki

#### `connect`
Sproži se ob uspešni povezavi s strežnikom.

```javascript
socket.on('connect', () => {
  console.log('Connected with ID:', socket.id);
});
```

#### `disconnect`
Sproži se ob prekinitvi povezave.

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  // Možni razlogi:
  // - 'io server disconnect' - strežnik je prekinil povezavo
  // - 'io client disconnect' - klient je prekinil povezavo
  // - 'ping timeout' - ping timeout
  // - 'transport close' - transport se je zaprl
  // - 'transport error' - napaka v transportu
});
```

#### `connect_error`
Sproži se ob napaki pri povezovanju.

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### 💓 Heartbeat Sistem

#### `heartbeat` (pošlji)
Pošlje heartbeat signal strežniku.

```javascript
// Pošlji heartbeat
socket.emit('heartbeat', {
  timestamp: Date.now(),
  client_info: {
    version: '1.0.0',
    platform: 'web'
  }
});
```

#### `heartbeat_response` (prejmi)
Prejme odgovor na heartbeat.

```javascript
socket.on('heartbeat_response', (data) => {
  console.log('Heartbeat response:', data);
  // {
  //   server_timestamp: 1642248000000,
  //   latency: 45,
  //   status: 'healthy'
  // }
});
```

### 🏠 Upravljanje Sob (Rooms)

#### `join_room` (pošlji)
Pridruži se sobi za prejemanje specifičnih dogodkov.

```javascript
// Pridruži se sobi za licenco
socket.emit('join_room', {
  room: 'license_OMNI-PREM-ABCD-1234-EFGH',
  type: 'license'
});

// Pridruži se sobi za uporabnika
socket.emit('join_room', {
  room: 'user_12345',
  type: 'user'
});

// Pridruži se administratorski sobi
socket.emit('join_room', {
  room: 'admin_dashboard',
  type: 'admin'
});
```

#### `leave_room` (pošlji)
Zapusti sobo.

```javascript
socket.emit('leave_room', {
  room: 'license_OMNI-PREM-ABCD-1234-EFGH'
});
```

#### `room_joined` (prejmi)
Potrditev pridružitve sobi.

```javascript
socket.on('room_joined', (data) => {
  console.log('Joined room:', data);
  // {
  //   room: 'license_OMNI-PREM-ABCD-1234-EFGH',
  //   type: 'license',
  //   members_count: 5
  // }
});
```

#### `room_left` (prejmi)
Potrditev zapustitve sobe.

```javascript
socket.on('room_left', (data) => {
  console.log('Left room:', data.room);
});
```

### 🎫 Licenčni Dogodki

#### `license_created` (prejmi)
Nova licenca je bila ustvarjena.

```javascript
socket.on('license_created', (license) => {
  console.log('New license created:', license);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   client_id: 'client_123',
  //   plan: 'premium',
  //   status: 'active',
  //   created_at: '2024-01-15T10:30:00.000Z'
  // }
});
```

#### `license_updated` (prejmi)
Licenca je bila posodobljena.

```javascript
socket.on('license_updated', (data) => {
  console.log('License updated:', data);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   changes: {
  //     status: { old: 'active', new: 'suspended' },
  //     updated_at: '2024-01-15T11:00:00.000Z'
  //   }
  // }
});
```

#### `license_expired` (prejmi)
Licenca je potekla.

```javascript
socket.on('license_expired', (data) => {
  console.log('License expired:', data);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   expired_at: '2024-01-15T10:30:00.000Z',
  //   grace_period_days: 7
  // }
  
  // Prikaži opozorilo uporabniku
  showExpirationWarning(data);
});
```

#### `license_renewed` (prejmi)
Licenca je bila podaljšana.

```javascript
socket.on('license_renewed', (data) => {
  console.log('License renewed:', data);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   old_expires_at: '2024-01-15T10:30:00.000Z',
  //   new_expires_at: '2025-01-15T10:30:00.000Z',
  //   renewed_at: '2024-01-15T12:00:00.000Z'
  // }
});
```

#### `license_deleted` (prejmi)
Licenca je bila izbrisana.

```javascript
socket.on('license_deleted', (data) => {
  console.log('License deleted:', data);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   deleted_at: '2024-01-15T13:00:00.000Z',
  //   reason: 'User request'
  // }
});
```

#### `license_check` (pošlji/prejmi)
Preveri licenco v real-time.

```javascript
// Pošlji zahtevo za preverjanje
socket.emit('license_check', {
  license_key: 'OMNI-PREM-ABCD-1234-EFGH'
});

// Prejmi rezultat
socket.on('license_check_result', (result) => {
  console.log('License check result:', result);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   valid: true,
  //   status: 'active',
  //   expires_at: '2025-01-15T10:30:00.000Z',
  //   days_remaining: 365
  // }
});
```

### 👤 Uporabniški Dogodki

#### `user_login` (prejmi)
Uporabnik se je prijavil.

```javascript
socket.on('user_login', (data) => {
  console.log('User logged in:', data);
  // {
  //   user_id: 'user_12345',
  //   username: 'john_doe',
  //   login_at: '2024-01-15T14:30:00.000Z',
  //   ip_address: '192.168.1.100'
  // }
});
```

#### `user_logout` (prejmi)
Uporabnik se je odjavil.

```javascript
socket.on('user_logout', (data) => {
  console.log('User logged out:', data);
  // {
  //   user_id: 'user_12345',
  //   logout_at: '2024-01-15T16:30:00.000Z',
  //   session_duration: 7200
  // }
});
```

### 🔔 Obvestila

#### `notification` (prejmi)
Novo obvestilo za uporabnika.

```javascript
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // {
  //   id: 'notif_123',
  //   type: 'license_expiry',
  //   title: 'License Expiring Soon',
  //   message: 'Your license will expire in 7 days',
  //   priority: 'high',
  //   created_at: '2024-01-15T10:30:00.000Z',
  //   data: {
  //     license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //     expires_at: '2024-01-22T10:30:00.000Z'
  //   }
  // }
  
  // Prikaži obvestilo v UI
  showNotification(notification);
});
```

#### `notification_read` (pošlji)
Označi obvestilo kot prebrano.

```javascript
socket.emit('notification_read', {
  notification_id: 'notif_123'
});
```

### 📊 Sistemski Dogodki

#### `system_status` (prejmi)
Posodobitev sistemskega statusa.

```javascript
socket.on('system_status', (status) => {
  console.log('System status update:', status);
  // {
  //   status: 'healthy',
  //   services: {
  //     mongodb: 'connected',
  //     redis: 'connected',
  //     api: 'operational'
  //   },
  //   load: {
  //     cpu: 45.2,
  //     memory: 67.8,
  //     connections: 1250
  //   },
  //   timestamp: '2024-01-15T10:30:00.000Z'
  // }
});
```

#### `maintenance_mode` (prejmi)
Sistem vstopa v vzdrževalni način.

```javascript
socket.on('maintenance_mode', (data) => {
  console.log('Maintenance mode:', data);
  // {
  //   enabled: true,
  //   message: 'System maintenance in progress',
  //   estimated_duration: 1800, // sekunde
  //   started_at: '2024-01-15T02:00:00.000Z'
  // }
  
  // Prikaži vzdrževalno sporočilo
  showMaintenanceMessage(data);
});
```

### 📈 Analitični Dogodki

#### `usage_update` (prejmi)
Posodobitev podatkov o uporabi.

```javascript
socket.on('usage_update', (usage) => {
  console.log('Usage update:', usage);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   api_calls: 1250,
  //   storage_used_gb: 15.5,
  //   active_users: 12,
  //   timestamp: '2024-01-15T10:30:00.000Z'
  // }
  
  // Posodobi dashboard
  updateUsageDashboard(usage);
});
```

#### `quota_warning` (prejmi)
Opozorilo o približevanju kvoti.

```javascript
socket.on('quota_warning', (warning) => {
  console.log('Quota warning:', warning);
  // {
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   type: 'api_calls',
  //   current: 9500,
  //   limit: 10000,
  //   percentage: 95,
  //   message: 'You have used 95% of your API calls quota'
  // }
  
  // Prikaži opozorilo
  showQuotaWarning(warning);
});
```

## 🔐 Avtentikacija in Avtorizacija

### JWT Token Avtentikacija

```javascript
// Pošlji token ob povezavi
const socket = io('http://localhost:3001', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});

// Posodobi token med sejo
socket.auth.token = 'new-jwt-token';
socket.disconnect().connect();
```

### Licenčna Avtentikacija

```javascript
// Avtentikacija z licenčnim ključem
const socket = io('http://localhost:3001', {
  auth: {
    license_key: 'OMNI-PREM-ABCD-1234-EFGH'
  }
});

// Preveri avtentikacijo
socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data);
  // {
  //   user_id: 'user_12345',
  //   license_key: 'OMNI-PREM-ABCD-1234-EFGH',
  //   permissions: ['read', 'write'],
  //   expires_at: '2025-01-15T10:30:00.000Z'
  // }
});

socket.on('auth_error', (error) => {
  console.error('Authentication error:', error);
  // {
  //   code: 'INVALID_LICENSE',
  //   message: 'License key is invalid or expired'
  // }
});
```

### Administratorska Avtentikacija

```javascript
// Admin avtentikacija
const socket = io('http://localhost:3001', {
  auth: {
    token: 'admin-jwt-token',
    role: 'admin'
  }
});

// Pridruži se admin sobi
socket.on('authenticated', () => {
  socket.emit('join_room', {
    room: 'admin_dashboard',
    type: 'admin'
  });
});
```

## 🚨 Napake in Obravnavanje

### Error Eventi

```javascript
// Splošne napake
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // {
  //   code: 'RATE_LIMITED',
  //   message: 'Too many requests',
  //   retry_after: 60
  // }
});

// Napake pri avtentikaciji
socket.on('auth_error', (error) => {
  console.error('Auth error:', error);
  handleAuthError(error);
});

// Napake pri pridruževanju sobi
socket.on('room_error', (error) => {
  console.error('Room error:', error);
  // {
  //   room: 'license_INVALID',
  //   code: 'ROOM_NOT_FOUND',
  //   message: 'Room does not exist'
  // }
});
```

### Reconnection Handling

```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Strežnik je prekinil povezavo - poskusi ponovno
    socket.connect();
  }
  // Za ostale razloge se Socket.IO samodejno poskuša ponovno povezati
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection failed:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect after maximum attempts');
  // Prikaži sporočilo uporabniku
  showConnectionError();
});
```

## 📊 Rate Limiting

### Omejitve WebSocket Dogodkov

| Dogodek | Limit | Okno |
|---------|-------|------|
| `heartbeat` | 60/min | 1 minuta |
| `license_check` | 100/min | 1 minuta |
| `join_room` | 20/min | 1 minuta |
| `notification_read` | 200/min | 1 minuta |
| Ostali | 30/min | 1 minuta |

### Rate Limit Dogodki

```javascript
socket.on('rate_limited', (data) => {
  console.warn('Rate limited:', data);
  // {
  //   event: 'license_check',
  //   limit: 100,
  //   window: 60,
  //   retry_after: 30
  // }
  
  // Počakaj pred naslednjim poskusom
  setTimeout(() => {
    // Poskusi ponovno
  }, data.retry_after * 1000);
});
```

## 🔧 Napredne Funkcionalnosti

### Binary Data Support

```javascript
// Pošlji binary podatke
const buffer = new ArrayBuffer(1024);
socket.emit('binary_data', buffer);

// Prejmi binary podatke
socket.on('binary_response', (data) => {
  console.log('Received binary data:', data);
});
```

### Compression

```javascript
// Omogoči kompresijo
const socket = io('http://localhost:3001', {
  compression: true,
  perMessageDeflate: {
    threshold: 1024 // Kompresija za sporočila > 1KB
  }
});
```

### Custom Namespaces

```javascript
// Povezava na custom namespace
const adminSocket = io('http://localhost:3001/admin');
const analyticsSocket = io('http://localhost:3001/analytics');

adminSocket.on('connect', () => {
  console.log('Connected to admin namespace');
});

analyticsSocket.on('real_time_stats', (stats) => {
  updateAnalyticsDashboard(stats);
});
```

## 🧪 Testiranje WebSocket

### Unit Testi

```javascript
const Client = require('socket.io-client');

describe('WebSocket API', () => {
  let socket;
  
  beforeEach((done) => {
    socket = Client('http://localhost:3001');
    socket.on('connect', done);
  });
  
  afterEach(() => {
    socket.disconnect();
  });
  
  it('should authenticate with valid token', (done) => {
    socket.auth = { token: 'valid-jwt-token' };
    socket.on('authenticated', (data) => {
      expect(data.user_id).toBeDefined();
      done();
    });
    socket.disconnect().connect();
  });
  
  it('should receive license updates', (done) => {
    socket.on('license_updated', (data) => {
      expect(data.license_key).toBeDefined();
      done();
    });
    
    // Sproži posodobitev licence
    triggerLicenseUpdate();
  });
});
```

### Load Testing

```javascript
const io = require('socket.io-client');

// Ustvari več sočasnih povezav
const connections = [];
const numConnections = 1000;

for (let i = 0; i < numConnections; i++) {
  const socket = io('http://localhost:3001');
  
  socket.on('connect', () => {
    console.log(`Connection ${i} established`);
    
    // Pošlji heartbeat
    setInterval(() => {
      socket.emit('heartbeat', { timestamp: Date.now() });
    }, 30000);
  });
  
  connections.push(socket);
}

// Počisti po testiranju
setTimeout(() => {
  connections.forEach(socket => socket.disconnect());
}, 60000);
```

## 📱 Client Implementacije

### React Hook

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useOmniSocket = (token, licenseKey) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      auth: { token, license_key: licenseKey }
    });
    
    newSocket.on('connect', () => {
      setConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      setConnected(false);
    });
    
    newSocket.on('notification', (notification) => {
      setNotifications(prev => [...prev, notification]);
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [token, licenseKey]);
  
  return { socket, connected, notifications };
};

// Uporaba v komponenti
function Dashboard() {
  const { socket, connected, notifications } = useOmniSocket(
    localStorage.getItem('jwt_token'),
    localStorage.getItem('license_key')
  );
  
  return (
    <div>
      <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
      <div>Notifications: {notifications.length}</div>
    </div>
  );
}
```

### Vue.js Plugin

```javascript
// omni-socket.js
import io from 'socket.io-client';

export default {
  install(app, options) {
    const socket = io(options.url, {
      auth: options.auth
    });
    
    app.config.globalProperties.$omniSocket = socket;
    app.provide('omniSocket', socket);
  }
};

// main.js
import { createApp } from 'vue';
import OmniSocket from './plugins/omni-socket';

const app = createApp(App);

app.use(OmniSocket, {
  url: 'http://localhost:3001',
  auth: {
    token: localStorage.getItem('jwt_token'),
    license_key: localStorage.getItem('license_key')
  }
});

// Uporaba v komponenti
export default {
  inject: ['omniSocket'],
  
  mounted() {
    this.omniSocket.on('notification', (notification) => {
      this.showNotification(notification);
    });
  }
};
```

## 📞 Podpora in Debugging

### Debug Mode

```javascript
// Omogoči debug mode
localStorage.debug = 'socket.io-client:socket';

// Ali z environment variable
DEBUG=socket.io-client:* node your-app.js
```

### Monitoring

```javascript
// Spremljaj WebSocket metrike
socket.on('connect', () => {
  console.log('Connected at:', new Date());
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected at:', new Date(), 'Reason:', reason);
});

// Meri latency
const startTime = Date.now();
socket.emit('heartbeat', { timestamp: startTime });

socket.on('heartbeat_response', (data) => {
  const latency = Date.now() - startTime;
  console.log('Latency:', latency, 'ms');
});
```

---

**🔌 Ta dokumentacija pokriva vse WebSocket funkcionalnosti sistema Omni Ultimate Turbo Flow System. Za dodatne informacije se obrnite na našo tehnično podporo.**