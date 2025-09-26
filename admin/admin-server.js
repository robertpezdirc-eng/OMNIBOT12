const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:8081", "https://localhost:3000"],
  credentials: true
}));

// Static files middleware - but exclude HTML files from auto-serving
app.use(express.static(__dirname, {
    index: false,  // Disable automatic index.html serving
    extensions: ['js', 'css', 'png', 'jpg', 'gif', 'ico']  // Only serve specific file types
}));

// Serve the main admin GUI
app.get('/', (req, res) => {
    console.log('📄 Serving admin-gui-simple.html');
    res.sendFile(path.join(__dirname, 'admin-gui-simple.html'));
});

// Alternative route for enhanced GUI
app.get('/enhanced', (req, res) => {
    console.log('📄 Serving admin-gui-enhanced.html');
    res.sendFile(path.join(__dirname, 'admin-gui-enhanced.html'));
});

// Alternative route for index.html
app.get('/index', (req, res) => {
    console.log('📄 Serving index.html');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-panel' });
});

app.listen(PORT, () => {
  console.log(`🎛️ Admin Panel running on port ${PORT}`);
  console.log(`📊 Admin GUI: http://localhost:${PORT}`);
});

module.exports = app;