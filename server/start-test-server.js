// Simple test to start the server
console.log('🔄 Starting test server...');

try {
  require('./test-simple-server.js');
} catch (error) {
  console.error('❌ Error starting server:', error);
  process.exit(1);
}