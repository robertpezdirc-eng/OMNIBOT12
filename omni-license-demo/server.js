require('dotenv').config();
const express = require('express');
const app = express();
const licenseRoutes = require('./routes/license');

app.use(express.json());
app.use('/api/license', licenseRoutes);

// Dodajamo health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Omni License API teče na vratih ${PORT}`));