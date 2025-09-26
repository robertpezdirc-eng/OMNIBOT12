// 🔔 Redis Configuration Module for Notifications
class RedisConfig {
  constructor() {
    this.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
    this.DEMO_MODE = process.env.DEMO_MODE === 'true';
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.DEMO_MODE) {
        console.log("🎯 Demo mode: Redis simulacija");
        this.isConnected = true;
        return true;
      }

      // V produkciji bi tukaj inicializirali pravi Redis client
      // const redis = require('redis');
      // this.client = redis.createClient({ url: this.REDIS_URL });
      // await this.client.connect();
      
      console.log("✅ Redis povezava uspešna (simulacija)");
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("❌ Redis napaka:", error);
      return false;
    }
  }

  async publish(channel, message) {
    try {
      if (this.DEMO_MODE) {
        console.log(`📢 Demo Redis publish: ${channel} -> ${JSON.stringify(message)}`);
        return true;
      }

      // V produkciji:
      // await this.client.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("❌ Redis publish napaka:", error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (this.DEMO_MODE) {
        console.log(`📡 Demo Redis subscribe: ${channel}`);
        return true;
      }

      // V produkciji:
      // await this.client.subscribe(channel, callback);
      return true;
    } catch (error) {
      console.error("❌ Redis subscribe napaka:", error);
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.client && !this.DEMO_MODE) {
        await this.client.disconnect();
        console.log("🔌 Redis povezava prekinjena");
      }
      this.isConnected = false;
    } catch (error) {
      console.error("❌ Napaka pri prekinjanju Redis povezave:", error);
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      mode: this.DEMO_MODE ? 'demo' : 'production',
      url: this.REDIS_URL
    };
  }
}

module.exports = RedisConfig;