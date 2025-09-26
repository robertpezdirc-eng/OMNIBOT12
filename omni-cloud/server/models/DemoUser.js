// 🎯 Demo User Model - V-pomnilniška baza za testiranje
class DemoUser {
  constructor(data) {
    this.id = data.id || Math.random().toString(36).substr(2, 9);
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.plan = data.plan || 'free';
    this.licenseExpiry = data.licenseExpiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dni
    this.isAdmin = data.isAdmin || false;
    this.createdAt = data.createdAt || new Date();
    this.lastLogin = data.lastLogin || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    // Password reset fields
    this.resetPasswordToken = data.resetPasswordToken;
    this.resetPasswordExpires = data.resetPasswordExpires;
  }

  // Simulacija Mongoose metod
  save() {
    // Dodaj uporabnika v v-pomnilniško bazo
    DemoUser.users.push(this);
    return Promise.resolve(this);
  }

  static find(query = {}) {
    return Promise.resolve(DemoUser.getAllUsers().filter(user => {
      if (query.email) return user.email === query.email;
      if (query.username) return user.username === query.username;
      if (query.isAdmin !== undefined) return user.isAdmin === query.isAdmin;
      return true;
    }));
  }

  static findOne(query) {
    return Promise.resolve(DemoUser.getAllUsers().find(user => {
      if (query.email) return user.email === query.email;
      if (query.username) return user.username === query.username;
      if (query.id) return user.id === query.id;
      return false;
    }));
  }

  static findById(id) {
    return Promise.resolve(DemoUser.getAllUsers().find(user => user.id === id));
  }

  static deleteOne(query) {
    const users = DemoUser.getAllUsers();
    const index = users.findIndex(user => {
      if (query.id) return user.id === query.id;
      if (query.email) return user.email === query.email;
      return false;
    });
    if (index > -1) {
      users.splice(index, 1);
      DemoUser.saveUsers(users);
    }
    return Promise.resolve({ deletedCount: index > -1 ? 1 : 0 });
  }

  static countDocuments(query = {}) {
    return Promise.resolve(DemoUser.getAllUsers().filter(user => {
      if (query.isAdmin !== undefined) return user.isAdmin === query.isAdmin;
      if (query.plan) return user.plan === query.plan;
      return true;
    }).length);
  }

  // V-pomnilniška shramba
  static users = [
    new DemoUser({
      id: 'admin1',
      username: 'admin',
      email: 'admin@omni-cloud.com',
      password: '$2a$12$nQmDB0I.aQRW8pC3.SoXvucQO2y.h0MgOLO8ZOWy8OL.2uhrGWMU6', // admin123
      plan: 'enterprise',
      isAdmin: true,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date()
    }),
    new DemoUser({
      id: 'user1',
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$12$sAGaAUZrvqSyRH3Zsqlsc.OhtHlI7pDuK01aNi6pFR36H4k/is6D2', // test123
      plan: 'pro',
      isAdmin: false,
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 uri nazaj
    }),
    new DemoUser({
      id: 'user2',
      username: 'demouser',
      email: 'demo@example.com',
      password: '$2a$12$Dy5uh7T3jvoODRzQ/6FeOuC.Yww2khUGAnNSv5kQHgLVNLTasmHfW', // demo123
      plan: 'free',
      isAdmin: false,
      createdAt: new Date('2024-02-01'),
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 dan nazaj
    })
  ];

  static getAllUsers() {
    return this.users;
  }

  static saveUsers(users) {
    this.users = users;
  }

  static addUser(userData) {
    const user = new DemoUser(userData);
    this.users.push(user);
    return user;
  }
}

module.exports = DemoUser;