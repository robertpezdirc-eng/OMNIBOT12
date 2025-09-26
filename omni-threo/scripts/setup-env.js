#!/usr/bin/env node

/**
 * Omni Threo Environment Setup Script
 * 
 * This script helps set up environment variables and MongoDB Atlas integration
 * for the Omni Threo project deployment.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Omni Threo Environment Setup');
console.log('================================\n');

// Generate secure JWT secret
function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Generate secure admin password
function generateAdminPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Environment configurations for different platforms
const environments = {
  development: {
    NODE_ENV: 'development',
    PORT: '3000',
    MONGO_URI: 'mongodb://localhost:27017/omni_threo',
    JWT_SECRET: generateJWTSecret(),
    JWT_EXPIRES_IN: '7d',
    API_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:3001,http://localhost:3002',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: generateAdminPassword(),
    CORS_ORIGIN: '*',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    LOG_LEVEL: 'debug'
  },
  
  production: {
    NODE_ENV: 'production',
    PORT: '10000',
    MONGO_URI: 'REPLACE_WITH_MONGODB_ATLAS_URI',
    JWT_SECRET: generateJWTSecret(),
    JWT_EXPIRES_IN: '7d',
    API_URL: 'REPLACE_WITH_RENDER_URL',
    FRONTEND_URL: 'REPLACE_WITH_VERCEL_URLS',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: generateAdminPassword(),
    CORS_ORIGIN: 'REPLACE_WITH_VERCEL_URLS',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    LOG_LEVEL: 'info'
  },
  
  render: {
    NODE_ENV: 'production',
    PORT: '10000',
    MONGO_URI: 'REPLACE_WITH_MONGODB_ATLAS_URI',
    JWT_SECRET: generateJWTSecret(),
    JWT_EXPIRES_IN: '7d',
    API_URL: 'https://your-app-name.onrender.com',
    FRONTEND_URL: 'https://your-admin.vercel.app,https://your-client.vercel.app',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: generateAdminPassword(),
    CORS_ORIGIN: 'https://your-admin.vercel.app,https://your-client.vercel.app',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    LOG_LEVEL: 'info'
  }
};

// Create .env file
function createEnvFile(envType = 'development') {
  const envConfig = environments[envType];
  const envContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const envPath = path.join(process.cwd(), '.env');
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Created .env file for ${envType} environment`);
  console.log(`📁 Location: ${envPath}\n`);
  
  return envConfig;
}

// Create React environment files
function createReactEnvFiles(apiUrl) {
  const adminEnvPath = path.join(process.cwd(), 'admin', '.env');
  const clientEnvPath = path.join(process.cwd(), 'client', '.env');
  
  const reactEnvContent = `REACT_APP_API_URL=${apiUrl}\n`;
  
  // Create admin .env
  if (!fs.existsSync(path.dirname(adminEnvPath))) {
    fs.mkdirSync(path.dirname(adminEnvPath), { recursive: true });
  }
  fs.writeFileSync(adminEnvPath, reactEnvContent);
  
  // Create client .env
  if (!fs.existsSync(path.dirname(clientEnvPath))) {
    fs.mkdirSync(path.dirname(clientEnvPath), { recursive: true });
  }
  fs.writeFileSync(clientEnvPath, reactEnvContent);
  
  console.log('✅ Created React environment files');
  console.log(`📁 Admin: ${adminEnvPath}`);
  console.log(`📁 Client: ${clientEnvPath}\n`);
}

// MongoDB Atlas setup instructions
function showMongoDBAtlasInstructions() {
  console.log('🍃 MongoDB Atlas Setup Instructions');
  console.log('===================================');
  console.log('1. Go to https://cloud.mongodb.com/');
  console.log('2. Create a new account or sign in');
  console.log('3. Create a new cluster (M0 Sandbox is free)');
  console.log('4. Create a database user with read/write permissions');
  console.log('5. Add your IP address to the IP Access List (or use 0.0.0.0/0 for all IPs)');
  console.log('6. Get your connection string from "Connect" > "Connect your application"');
  console.log('7. Replace "REPLACE_WITH_MONGODB_ATLAS_URI" in your .env file with the connection string');
  console.log('8. Make sure to replace <password> in the URI with your actual password\n');
  
  console.log('Example MongoDB Atlas URI:');
  console.log('mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/omni_threo?retryWrites=true&w=majority\n');
}

// Render.com deployment instructions
function showRenderInstructions() {
  console.log('🚀 Render.com Deployment Instructions');
  console.log('=====================================');
  console.log('1. Go to https://render.com/ and create an account');
  console.log('2. Connect your GitHub repository');
  console.log('3. Create a new Web Service');
  console.log('4. Select your repository and branch');
  console.log('5. Set the following configuration:');
  console.log('   - Environment: Node');
  console.log('   - Build Command: npm install');
  console.log('   - Start Command: npm start');
  console.log('   - Auto-Deploy: Yes');
  console.log('6. Add the following environment variables:');
  
  const renderEnv = environments.render;
  Object.entries(renderEnv).forEach(([key, value]) => {
    if (value.includes('REPLACE_WITH')) {
      console.log(`   - ${key}: [REPLACE WITH ACTUAL VALUE]`);
    } else {
      console.log(`   - ${key}: ${value}`);
    }
  });
  
  console.log('7. Deploy the service\n');
}

// Vercel deployment instructions
function showVercelInstructions() {
  console.log('⚡ Vercel Deployment Instructions');
  console.log('=================================');
  console.log('1. Install Vercel CLI: npm i -g vercel');
  console.log('2. Login to Vercel: vercel login');
  console.log('3. Deploy Admin GUI:');
  console.log('   cd admin && vercel --prod');
  console.log('4. Deploy Client Panel:');
  console.log('   cd client && vercel --prod');
  console.log('5. Set environment variables in Vercel dashboard:');
  console.log('   - REACT_APP_API_URL: [YOUR_RENDER_URL]');
  console.log('6. Update CORS settings in your backend with Vercel URLs\n');
}

// Security checklist
function showSecurityChecklist() {
  console.log('🔒 Security Checklist');
  console.log('=====================');
  console.log('✅ Generate strong JWT secret (done)');
  console.log('✅ Generate secure admin password (done)');
  console.log('⚠️  Update CORS origins with actual frontend URLs');
  console.log('⚠️  Use MongoDB Atlas IP whitelist (not 0.0.0.0/0 in production)');
  console.log('⚠️  Enable MongoDB Atlas network access restrictions');
  console.log('⚠️  Use environment variables for all secrets');
  console.log('⚠️  Enable HTTPS in production');
  console.log('⚠️  Regularly rotate JWT secrets and passwords');
  console.log('⚠️  Monitor API usage and set up alerts\n');
}

// Main setup function
function main() {
  const args = process.argv.slice(2);
  const envType = args[0] || 'development';
  
  if (!environments[envType]) {
    console.error(`❌ Invalid environment type: ${envType}`);
    console.log('Available types: development, production, render');
    process.exit(1);
  }
  
  console.log(`Setting up ${envType} environment...\n`);
  
  // Create environment files
  const config = createEnvFile(envType);
  createReactEnvFiles(config.API_URL);
  
  // Show setup instructions
  if (envType === 'production' || envType === 'render') {
    showMongoDBAtlasInstructions();
    showRenderInstructions();
    showVercelInstructions();
  }
  
  showSecurityChecklist();
  
  console.log('🎉 Environment setup complete!');
  console.log('===============================');
  console.log('Next steps:');
  console.log('1. Update MongoDB URI in .env file');
  console.log('2. Update API URLs after deployment');
  console.log('3. Test the application locally: npm run dev');
  console.log('4. Deploy to Render.com and Vercel');
  console.log('5. Update CORS settings with production URLs\n');
  
  // Save credentials for reference
  const credentialsPath = path.join(process.cwd(), 'CREDENTIALS.txt');
  const credentials = `
Omni Threo Deployment Credentials
================================

Admin Login:
Username: ${config.ADMIN_USERNAME}
Password: ${config.ADMIN_PASSWORD}

JWT Secret: ${config.JWT_SECRET}

Generated on: ${new Date().toISOString()}

⚠️  IMPORTANT: Keep these credentials secure and delete this file after setup!
`;
  
  fs.writeFileSync(credentialsPath, credentials);
  console.log(`📋 Credentials saved to: ${credentialsPath}`);
  console.log('⚠️  Remember to delete this file after setup for security!\n');
}

// Run the setup
if (require.main === module) {
  main();
}

module.exports = {
  createEnvFile,
  createReactEnvFiles,
  generateJWTSecret,
  generateAdminPassword,
  environments
};