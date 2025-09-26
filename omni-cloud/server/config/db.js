// 🗄️ Database Configuration Module
const mongoose = require('mongoose');

class DatabaseConfig {
  constructor() {
    this.MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/omni-cloud";
    this.DEMO_MODE = process.env.DEMO_MODE === 'true';
    this.USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';
  }

  async connect() {
    try {
      if (this.DEMO_MODE && this.USE_MEMORY_DB) {
        console.log("🎯 Demo mode: Uporabljam v-pomnilniško bazo");
        console.log("✅ Demo MongoDB povezava uspešna");
        return true;
      }

      await mongoose.connect(this.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log("✅ MongoDB povezava uspešna");
      return true;
    } catch (error) {
      console.error("❌ MongoDB napaka:", error);
      return false;
    }
  }

  async disconnect() {
    try {
      if (!this.DEMO_MODE) {
        await mongoose.disconnect();
        console.log("🔌 MongoDB povezava prekinjena");
      }
    } catch (error) {
      console.error("❌ Napaka pri prekinjanju MongoDB povezave:", error);
    }
  }

  getConnectionStatus() {
    if (this.DEMO_MODE && this.USE_MEMORY_DB) {
      return 'demo';
    }
    return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  }
}

module.exports = DatabaseConfig;