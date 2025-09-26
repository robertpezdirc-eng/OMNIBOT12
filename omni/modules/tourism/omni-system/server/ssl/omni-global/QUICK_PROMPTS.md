# 🚀 Omni Global License System - Kratki natančni prompti

## 1️⃣ Server (Node.js + WebSocket + HTTPS)

### Prompt za konfiguracijo serverja:
```
1. Ustvari Express app z HTTPS
2. SSL certifikate: privkey.pem + fullchain.pem
3. API endpoints: /api/license/create, /api/license/check, /api/license/toggle
4. Socket.IO za globalne posodobitve
5. MongoDB povezava: URI iz .env
6. Broadcast funkcija: io.emit('license_update', license)
7. JWT za license token (expires_at)
8. Log vsake povezave in spremembe licence
```

### Minimalna server koda:
```javascript
const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
const server = https.createServer({
  key: fs.readFileSync('./certs/privkey.pem'),
  cert: fs.readFileSync('./certs/fullchain.pem')
}, app);
const io = socketIo(server);

mongoose.connect(process.env.MONGO_URI);

const licenseSchema = new mongoose.Schema({
  client_id: String,
  modules: [String],
  expires_at: Date,
  active: Boolean
});
const License = mongoose.model('License', licenseSchema);

app.post('/api/license/create', async (req, res) => {
  const license = new License(req.body);
  await license.save();
  io.emit('license_update', license);
  res.json(license);
});

app.get('/api/license/check/:client_id', async (req, res) => {
  const license = await License.findOne({client_id: req.params.client_id});
  res.json(license);
});

app.post('/api/license/toggle/:id', async (req, res) => {
  const license = await License.findByIdAndUpdate(req.params.id, 
    {active: !license.active}, {new: true});
  io.emit('license_update', license);
  res.json(license);
});

server.listen(3000);
```

## 2️⃣ Admin GUI (HTML + WebSocket)

### Prompt za Admin Panel:
```
1. HTML tabela za prikaz licenc
2. WebSocket povezava na wss://yourdomain.com:3000
3. Forme za ustvarjanje novih licenc
4. Toggle gumbi za aktivacijo/deaktivacijo
5. Real-time posodobitve preko socket.on('license_update')
6. Axios za API klice
7. Bootstrap za styling
8. Error handling za vse API klice
```

### Minimalna Admin GUI koda:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Admin Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>License Manager</h1>
        <table class="table" id="licenseTable">
            <thead>
                <tr><th>Client ID</th><th>Modules</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>

    <script>
        const socket = io('wss://yourdomain.com:3000');
        
        socket.on('license_update', (license) => {
            refreshLicenses();
        });
        
        async function refreshLicenses() {
            const response = await axios.get('/api/license');
            const licenses = response.data;
            const tbody = document.querySelector('#licenseTable tbody');
            tbody.innerHTML = licenses.map(license => `
                <tr>
                    <td>${license.client_id}</td>
                    <td>${license.modules.join(', ')}</td>
                    <td>${license.active ? 'Active' : 'Inactive'}</td>
                    <td><button onclick="toggleLicense('${license._id}')">Toggle</button></td>
                </tr>
            `).join('');
        }
        
        async function toggleLicense(id) {
            await axios.post(`/api/license/toggle/${id}`);
        }
        
        refreshLicenses();
    </script>
</body>
</html>
```

## 3️⃣ Client Panel (HTML + WebSocket)

### Prompt za Client Panel:
```
1. Input polje za client_id
2. Gumb "Check License"
3. WebSocket povezava za real-time posodobitve
4. Prikaz modulov in statusa licence
5. Avtomatsko preverjanje ob spremembi licence
6. Visual indikatorji (zeleno/rdeče)
7. Error handling za neobstoječe licence
8. Responsive design
```

### Minimalna Client Panel koda:
```html
<!DOCTYPE html>
<html>
<head>
    <title>License Check</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>License Checker</h1>
        <div class="mb-3">
            <input type="text" id="clientId" class="form-control" placeholder="Enter Client ID">
            <button onclick="checkLicense()" class="btn btn-primary">Check License</button>
        </div>
        <div id="licenseResult"></div>
    </div>

    <script>
        const socket = io('wss://yourdomain.com:3000');
        
        socket.on('license_update', (license) => {
            const currentClientId = document.getElementById('clientId').value;
            if (license.client_id === currentClientId) {
                displayLicense(license);
            }
        });
        
        async function checkLicense() {
            const clientId = document.getElementById('clientId').value;
            try {
                const response = await axios.get(`/api/license/check/${clientId}`);
                displayLicense(response.data);
            } catch (error) {
                document.getElementById('licenseResult').innerHTML = 
                    '<div class="alert alert-danger">License not found</div>';
            }
        }
        
        function displayLicense(license) {
            const status = license.active ? 'success' : 'danger';
            document.getElementById('licenseResult').innerHTML = `
                <div class="alert alert-${status}">
                    <h4>Client: ${license.client_id}</h4>
                    <p>Status: ${license.active ? 'Active' : 'Inactive'}</p>
                    <p>Modules: ${license.modules.join(', ')}</p>
                    <p>Expires: ${new Date(license.expires_at).toLocaleDateString()}</p>
                </div>
            `;
        }
    </script>
</body>
</html>
```

## 4️⃣ Docker Compose (Produkcija)

### Prompt za Docker setup:
```
1. MongoDB storitev z persistent volume
2. Server storitev z SSL certifikati
3. Admin storitev na portu 4000
4. Client storitev na portu 5000
5. Nginx reverse proxy za HTTPS
6. Health checks za vse storitve
7. Environment variables iz .env
8. Restart policies: unless-stopped
```

### Minimalna docker-compose.yml:
```yaml
version: '3.9'
services:
  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    restart: unless-stopped

  server:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./certs:/app/certs
    environment:
      MONGO_URI: mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@mongo:27017/omni
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mongo
    restart: unless-stopped

  admin:
    build: ./admin
    ports:
      - "4000:4000"
    restart: unless-stopped

  client:
    build: ./client
    ports:
      - "5000:5000"
    restart: unless-stopped

volumes:
  mongo-data:
```

## 5️⃣ Deployment (En ukaz)

### Prompt za deployment:
```
1. Kopiraj SSL certifikate v ./certs/
2. Nastavi .env datoteko z gesli
3. Zaženi: docker-compose up --build -d
4. Preveri zdravje: curl -k https://localhost:3000/health
5. Dostopne točke: admin:4000, client:5000, api:3000
```

### Deployment ukazi:
```bash
# 1. SSL certifikati
cp /etc/letsencrypt/live/yourdomain.com/*.pem ./certs/

# 2. Environment
echo "MONGO_USERNAME=omni" > .env
echo "MONGO_PASSWORD=secure_password" >> .env
echo "JWT_SECRET=your_jwt_secret_32_chars_long" >> .env

# 3. Deploy
docker-compose up --build -d

# 4. Test
curl -k https://localhost:3000/health
```

## 🔧 Troubleshooting

### Pogosti problemi:
- **Port 4100 napaka**: Preveri, ali je Admin na portu 4000
- **WebSocket napaka**: Preveri SSL certifikate
- **MongoDB napaka**: Preveri MONGO_URI v .env
- **CORS napaka**: Dodaj cors middleware v Express

### Quick fix ukazi:
```bash
# Preveri porte
netstat -an | findstr :3000
netstat -an | findstr :4000
netstat -an | findstr :5000

# Restart storitev
docker-compose restart server
docker-compose restart admin
docker-compose restart client

# Logi
docker-compose logs -f server
```

---
**Opomba**: Zamenjaj `yourdomain.com` s svojo domeno in nastavi pravilna gesla v .env datoteki!