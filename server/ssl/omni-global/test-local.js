#!/usr/bin/env node

/**
 * Omni Global License System - Local Test Script
 * 
 * This script tests the system locally without Docker
 * by starting all services in separate processes.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Omni Global License System - Local Test');
console.log('=' .repeat(60));

// Check if SSL certificates exist
const certsDir = path.join(__dirname, 'certs');
const privKeyPath = path.join(certsDir, 'privkey.pem');
const certPath = path.join(certsDir, 'fullchain.pem');

if (!fs.existsSync(privKeyPath) || !fs.existsSync(certPath)) {
  console.log('🔐 SSL certificates not found. Generating...');
  
  const generateSSL = spawn('node', ['generate-ssl.js'], {
    cwd: certsDir,
    stdio: 'inherit'
  });
  
  generateSSL.on('close', (code) => {
    if (code === 0) {
      console.log('✅ SSL certificates generated successfully');
      startServices();
    } else {
      console.error('❌ Failed to generate SSL certificates');
      process.exit(1);
    }
  });
} else {
  console.log('✅ SSL certificates found');
  startServices();
}

function startServices() {
  console.log('\n📦 Starting services...\n');
  
  const services = [];
  
  // Start MongoDB (if available)
  console.log('🍃 Note: Make sure MongoDB is running on localhost:27017');
  console.log('   You can start it with: mongod --dbpath ./data/db\n');
  
  // Start Server
  console.log('🔧 Starting Omni Server (HTTPS + WebSocket)...');
  const server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    env: {
      ...process.env,
      MONGO_URI: 'mongodb://localhost:27017/omni',
      JWT_SECRET: 'test_secret_key',
      PORT: '3100'
    }
  });
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
  });
  
  services.push({ name: 'Server', process: server, port: 3000 });
  
  // Wait a bit before starting other services
  setTimeout(() => {
    // Start Admin Panel
    console.log('👨‍💼 Starting Admin Panel...');
    const admin = spawn('node', ['main.js'], {
      cwd: path.join(__dirname, 'admin'),
      stdio: 'inherit',
      env: {
        ...process.env,
        SERVER_URL: 'https://localhost:3100',
        ADMIN_PORT: '4100'
      }
    });
    
    admin.on('error', (err) => {
      console.error('❌ Admin error:', err.message);
    });
    
    services.push({ name: 'Admin', process: admin, port: 4000 });
    
    // Start Client Panel
    console.log('👥 Starting Client Panel...');
    const client = spawn('node', ['main.js'], {
      cwd: path.join(__dirname, 'client'),
      stdio: 'inherit',
      env: {
        ...process.env,
        SERVER_URL: 'https://localhost:3100',
        CLIENT_PORT: '5100'
      }
    });
    
    client.on('error', (err) => {
      console.error('❌ Client error:', err.message);
    });
    
    services.push({ name: 'Client', process: client, port: 5000 });
    
    // Show access URLs after a delay
    setTimeout(() => {
      console.log('\n' + '='.repeat(60));
      console.log('🌐 Omni Global License System - Ready!');
      console.log('='.repeat(60));
      console.log('📊 Server API:    https://localhost:3100');
      console.log('👨‍💼 Admin Panel:   http://localhost:4100');
      console.log('👥 Client Panel:  http://localhost:5100');
      console.log('='.repeat(60));
      console.log('\n💡 Tips:');
      console.log('   • Accept SSL certificate warnings in browser');
      console.log('   • Use Ctrl+C to stop all services');
      console.log('   • Check logs above for any errors');
      console.log('\n🔍 Health Checks:');
      console.log('   • Server: https://localhost:3100/health');
      console.log('   • Admin:  http://localhost:4100/health');
      console.log('   • Client: http://localhost:5100/health');
      console.log('');
    }, 3000);
    
  }, 2000);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down services...');
    
    services.forEach(service => {
      console.log(`   Stopping ${service.name}...`);
      service.process.kill('SIGTERM');
    });
    
    setTimeout(() => {
      console.log('✅ All services stopped');
      process.exit(0);
    }, 2000);
  });
  
  // Handle service exits
  services.forEach(service => {
    service.process.on('close', (code) => {
      if (code !== 0) {
        console.log(`❌ ${service.name} exited with code ${code}`);
      } else {
        console.log(`✅ ${service.name} stopped gracefully`);
      }
    });
  });
}