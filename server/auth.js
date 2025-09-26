// 🔐 OMNI-BRAIN Avtentikacijski Sistem
// Implementacija prijave, 2FA, session management in varnostnih preverjanj

const jwt = require('jsonwebtoken');
const { DataEncryption, TwoFactorAuth, AuditLogger } = require('./security');
const { MongoClient } = require('mongodb');

class AuthenticationManager {
  constructor() {
    this.encryption = new DataEncryption();
    this.twoFA = new TwoFactorAuth();
    this.auditLogger = new AuditLogger();
    this.jwtSecret = process.env.JWT_SECRET || 'omni-brain-ultra-secret-key';
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/omni-brain';
    this.db = null;
    this.users = null;
    this.sessions = null;
  }

  // 🔌 Poveži z MongoDB
  async connect() {
    try {
      this.client = new MongoClient(this.mongoUri);
      await this.client.connect();
      this.db = this.client.db();
      this.users = this.db.collection('users');
      this.sessions = this.db.collection('sessions');
      
      // Ustvari indekse
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.users.createIndex({ username: 1 }, { unique: true });
      await this.sessions.createIndex({ token: 1 }, { unique: true });
      await this.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      
      console.log('✅ Avtentikacijski sistem povezan z MongoDB');
    } catch (error) {
      console.error('❌ Napaka pri povezavi z MongoDB:', error);
      throw error;
    }
  }

  // 👤 Ustvari admin uporabnika
  async createAdminUser(email, password, username = 'admin') {
    try {
      // Preveri če admin že obstaja
      const existingAdmin = await this.users.findOne({ 
        $or: [{ email }, { username }, { role: 'admin' }] 
      });
      
      if (existingAdmin) {
        console.log('ℹ️ Admin uporabnik že obstaja');
        return existingAdmin;
      }

      // Šifriraj geslo
      const hashedPassword = await this.encryption.hashPassword(password);
      
      // Generiraj 2FA skrivnost
      const twoFASecret = this.twoFA.generateSecret(email);
      const backupCodes = this.twoFA.generateBackupCodes();
      
      // Šifriraj občutljive podatke
      const encryptedSecret = this.encryption.encrypt(twoFASecret.secret);
      const encryptedBackupCodes = this.encryption.encrypt(JSON.stringify(backupCodes));

      const adminUser = {
        username,
        email,
        password: hashedPassword,
        role: 'admin',
        permissions: ['all'],
        twoFA: {
          enabled: false,
          secret: encryptedSecret,
          backupCodes: encryptedBackupCodes,
          qrCodeUrl: null
        },
        createdAt: new Date(),
        lastLogin: null,
        loginAttempts: 0,
        locked: false,
        lockUntil: null
      };

      const result = await this.users.insertOne(adminUser);
      
      // Generiraj QR kodo
      const qrCodeUrl = await this.twoFA.generateQRCode(twoFASecret.otpauthUrl);
      await this.users.updateOne(
        { _id: result.insertedId },
        { $set: { 'twoFA.qrCodeUrl': qrCodeUrl } }
      );

      console.log('✅ Admin uporabnik ustvarjen:', email);
      console.log('🔑 2FA QR koda generirana');
      console.log('💾 Backup kode:', backupCodes);
      
      this.auditLogger.log('ADMIN_USER_CREATED', result.insertedId, { email, username });
      
      return { ...adminUser, _id: result.insertedId, backupCodes };
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju admin uporabnika:', error);
      throw error;
    }
  }

  // 🔐 Prijava uporabnika
  async login(email, password, twoFAToken = null, req = {}) {
    try {
      const clientIP = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Poišči uporabnika
      const user = await this.users.findOne({ 
        $or: [{ email }, { username: email }] 
      });
      
      if (!user) {
        this.auditLogger.log('LOGIN_FAILED', null, { 
          email, 
          reason: 'USER_NOT_FOUND',
          ip: clientIP,
          userAgent 
        });
        throw new Error('Napačni podatki za prijavo');
      }

      // Preveri če je račun zaklenjen
      if (user.locked && user.lockUntil && user.lockUntil > new Date()) {
        this.auditLogger.log('LOGIN_FAILED', user._id, { 
          email, 
          reason: 'ACCOUNT_LOCKED',
          ip: clientIP,
          userAgent 
        });
        throw new Error('Račun je začasno zaklenjen');
      }

      // Preveri geslo
      const passwordValid = await this.encryption.verifyPassword(password, user.password);
      
      if (!passwordValid) {
        // Povečaj število neuspešnih poskusov
        const loginAttempts = (user.loginAttempts || 0) + 1;
        const updateData = { loginAttempts };
        
        // Zakleni račun po 5 neuspešnih poskusih
        if (loginAttempts >= 5) {
          updateData.locked = true;
          updateData.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minut
        }
        
        await this.users.updateOne({ _id: user._id }, { $set: updateData });
        
        this.auditLogger.log('LOGIN_FAILED', user._id, { 
          email, 
          reason: 'INVALID_PASSWORD',
          attempts: loginAttempts,
          ip: clientIP,
          userAgent 
        });
        
        throw new Error('Napačni podatki za prijavo');
      }

      // Preveri 2FA če je omogočen
      if (user.twoFA && user.twoFA.enabled) {
        if (!twoFAToken) {
          throw new Error('2FA token je potreben');
        }
        
        const decryptedSecret = this.encryption.decrypt(user.twoFA.secret);
        const tokenValid = this.twoFA.verifyToken(twoFAToken, decryptedSecret);
        
        if (!tokenValid) {
          // Preveri backup kode
          const decryptedBackupCodes = JSON.parse(
            this.encryption.decrypt(user.twoFA.backupCodes)
          );
          
          const backupCodeIndex = decryptedBackupCodes.indexOf(twoFAToken.toUpperCase());
          
          if (backupCodeIndex === -1) {
            this.auditLogger.log('LOGIN_FAILED', user._id, { 
              email, 
              reason: 'INVALID_2FA_TOKEN',
              ip: clientIP,
              userAgent 
            });
            throw new Error('Napačen 2FA token');
          }
          
          // Odstrani uporabljeno backup kodo
          decryptedBackupCodes.splice(backupCodeIndex, 1);
          const encryptedBackupCodes = this.encryption.encrypt(JSON.stringify(decryptedBackupCodes));
          
          await this.users.updateOne(
            { _id: user._id },
            { $set: { 'twoFA.backupCodes': encryptedBackupCodes } }
          );
          
          console.log('✅ Backup koda uporabljena za prijavo');
        }
      }

      // Uspešna prijava - počisti poskuse
      await this.users.updateOne(
        { _id: user._id },
        { 
          $set: { 
            lastLogin: new Date(),
            loginAttempts: 0,
            locked: false
          },
          $unset: { lockUntil: 1 }
        }
      );

      // Generiraj JWT token
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      // Shrani session
      const sessionData = {
        token,
        userId: user._id,
        email: user.email,
        role: user.role,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ur
        ip: clientIP,
        userAgent
      };

      await this.sessions.insertOne(sessionData);

      this.auditLogger.log('LOGIN_SUCCESS', user._id, { 
        email, 
        ip: clientIP,
        userAgent 
      });

      console.log('✅ Uspešna prijava:', user.email);

      return {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          twoFAEnabled: user.twoFA?.enabled || false
        }
      };
    } catch (error) {
      console.error('❌ Napaka pri prijavi:', error);
      throw error;
    }
  }

  // 🚪 Odjava uporabnika
  async logout(token) {
    try {
      // Odstrani session
      const result = await this.sessions.deleteOne({ token });
      
      if (result.deletedCount > 0) {
        console.log('✅ Uspešna odjava');
        this.auditLogger.log('LOGOUT_SUCCESS', null, { token: token.substring(0, 10) + '...' });
      }
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('❌ Napaka pri odjavi:', error);
      throw error;
    }
  }

  // 🔍 Preveri token
  async verifyToken(token) {
    try {
      // Preveri JWT
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Preveri session v bazi
      const session = await this.sessions.findOne({ token });
      
      if (!session || session.expiresAt < new Date()) {
        throw new Error('Session je potekel');
      }

      // Pridobi najnovejše podatke uporabnika
      const user = await this.users.findOne({ _id: session.userId });
      
      if (!user) {
        throw new Error('Uporabnik ne obstaja več');
      }

      return {
        userId: user._id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      };
    } catch (error) {
      console.error('❌ Napaka pri preverjanju tokena:', error);
      throw error;
    }
  }

  // 🛡️ Middleware za avtentikacijo
  requireAuth() {
    return async (req, res, next) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '') || 
                     req.cookies?.token ||
                     req.query.token;
        
        if (!token) {
          return res.status(401).json({ 
            error: 'Avtentikacija je potrebna',
            code: 'AUTH_REQUIRED'
          });
        }

        const user = await this.verifyToken(token);
        req.user = user;
        req.token = token;
        
        next();
      } catch (error) {
        return res.status(401).json({ 
          error: 'Neveljaven token',
          code: 'INVALID_TOKEN'
        });
      }
    };
  }

  // 👑 Middleware za admin pravice
  requireAdmin() {
    return (req, res, next) => {
      if (!req.user || req.user.role !== 'admin') {
        this.auditLogger.log('ACCESS_DENIED', req.user?.userId, { 
          reason: 'INSUFFICIENT_PERMISSIONS',
          requiredRole: 'admin',
          userRole: req.user?.role
        });
        
        return res.status(403).json({ 
          error: 'Admin pravice so potrebne',
          code: 'ADMIN_REQUIRED'
        });
      }
      next();
    };
  }

  // 📱 Omogoči 2FA
  async enable2FA(userId) {
    try {
      const user = await this.users.findOne({ _id: userId });
      
      if (!user) {
        throw new Error('Uporabnik ne obstaja');
      }

      await this.users.updateOne(
        { _id: userId },
        { $set: { 'twoFA.enabled': true } }
      );

      this.auditLogger.log('2FA_ENABLED', userId);
      
      console.log('✅ 2FA omogočen za uporabnika:', user.email);
      
      return true;
    } catch (error) {
      console.error('❌ Napaka pri omogočanju 2FA:', error);
      throw error;
    }
  }

  // 📱 Onemogoči 2FA
  async disable2FA(userId) {
    try {
      await this.users.updateOne(
        { _id: userId },
        { $set: { 'twoFA.enabled': false } }
      );

      this.auditLogger.log('2FA_DISABLED', userId);
      
      console.log('✅ 2FA onemogočen za uporabnika');
      
      return true;
    } catch (error) {
      console.error('❌ Napaka pri onemogočanju 2FA:', error);
      throw error;
    }
  }

  // 📊 Pridobi statistike prijav
  async getLoginStats(days = 30) {
    try {
      const auditLogs = await this.auditLogger.getRecentLogs(1000);
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const recentLogs = auditLogs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );
      
      const stats = {
        totalLogins: recentLogs.filter(log => log.event === 'LOGIN_SUCCESS').length,
        failedLogins: recentLogs.filter(log => log.event === 'LOGIN_FAILED').length,
        uniqueUsers: new Set(recentLogs.filter(log => log.event === 'LOGIN_SUCCESS').map(log => log.userId)).size,
        adminLogins: recentLogs.filter(log => log.event === 'LOGIN_SUCCESS' && log.details?.role === 'admin').length
      };
      
      return stats;
    } catch (error) {
      console.error('❌ Napaka pri pridobivanju statistik:', error);
      return null;
    }
  }

  // 🧹 Počisti potekle sessione
  async cleanupExpiredSessions() {
    try {
      const result = await this.sessions.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      if (result.deletedCount > 0) {
        console.log(`🧹 Počiščenih ${result.deletedCount} poteklih sessionov`);
      }
      
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Napaka pri čiščenju sessionov:', error);
      return 0;
    }
  }
}

module.exports = { AuthenticationManager };