// MongoDB inicializacijska skripta za Omni License System
// Ta skripta se izvede ob prvem zagonu MongoDB container-ja

// Preklopi na admin bazo za ustvarjanje uporabnikov
db = db.getSiblingDB('admin');

// Ustvari aplikacijskega uporabnika z omejenimi pravicami
db.createUser({
  user: 'omni_app',
  pwd: 'secure_app_password_change_this',
  roles: [
    {
      role: 'readWrite',
      db: 'omni_licenses'
    },
    {
      role: 'dbAdmin',
      db: 'omni_licenses'
    }
  ]
});

// Preklopi na aplikacijsko bazo
db = db.getSiblingDB('omni_licenses');

// Ustvari osnovne kolekcije z indeksi za optimalno delovanje

// Kolekcija za licence
db.createCollection('licenses');
db.licenses.createIndex({ "licenseKey": 1 }, { unique: true });
db.licenses.createIndex({ "email": 1 });
db.licenses.createIndex({ "status": 1 });
db.licenses.createIndex({ "expirationDate": 1 });
db.licenses.createIndex({ "createdAt": 1 });
db.licenses.createIndex({ "productId": 1 });

// Kolekcija za uporabnike
db.createCollection('users');
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "createdAt": 1 });

// Kolekcija za API ključe
db.createCollection('apikeys');
db.apikeys.createIndex({ "keyHash": 1 }, { unique: true });
db.apikeys.createIndex({ "userId": 1 });
db.apikeys.createIndex({ "isActive": 1 });
db.apikeys.createIndex({ "expiresAt": 1 });

// Kolekcija za obvestila
db.createCollection('notifications');
db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "type": 1 });
db.notifications.createIndex({ "status": 1 });
db.notifications.createIndex({ "createdAt": 1 });
db.notifications.createIndex({ "scheduledFor": 1 });

// Kolekcija za revizijsko sled
db.createCollection('audittrail');
db.audittrail.createIndex({ "userId": 1 });
db.audittrail.createIndex({ "action": 1 });
db.audittrail.createIndex({ "timestamp": 1 });
db.audittrail.createIndex({ "ipAddress": 1 });
db.audittrail.createIndex({ "resourceType": 1 });

// Kolekcija za plačila
db.createCollection('payments');
db.payments.createIndex({ "licenseId": 1 });
db.payments.createIndex({ "paymentProvider": 1 });
db.payments.createIndex({ "status": 1 });
db.payments.createIndex({ "createdAt": 1 });
db.payments.createIndex({ "externalId": 1 });

// Kolekcija za naročnine
db.createCollection('subscriptions');
db.subscriptions.createIndex({ "licenseId": 1 });
db.subscriptions.createIndex({ "status": 1 });
db.subscriptions.createIndex({ "nextBillingDate": 1 });
db.subscriptions.createIndex({ "createdAt": 1 });

// Kolekcija za varnostne kopije
db.createCollection('backups');
db.backups.createIndex({ "type": 1 });
db.backups.createIndex({ "status": 1 });
db.backups.createIndex({ "createdAt": 1 });
db.backups.createIndex({ "size": 1 });

// Kolekcija za sistemske nastavitve
db.createCollection('settings');
db.settings.createIndex({ "key": 1 }, { unique: true });

// Kolekcija za statistike
db.createCollection('statistics');
db.statistics.createIndex({ "date": 1 });
db.statistics.createIndex({ "type": 1 });
db.statistics.createIndex({ "createdAt": 1 });

// Vstavi osnovne sistemske nastavitve
db.settings.insertMany([
  {
    key: 'system_initialized',
    value: true,
    description: 'Označuje, da je sistem inicializiran',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'license_expiry_warning_days',
    value: 30,
    description: 'Število dni pred potekom licence za pošiljanje opozoril',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'max_api_requests_per_hour',
    value: 1000,
    description: 'Maksimalno število API zahtev na uro',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'backup_retention_days',
    value: 90,
    description: 'Število dni za hranjenje varnostnih kopij',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: 'notification_cleanup_days',
    value: 90,
    description: 'Število dni za hranjenje obvestil',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Ustvari privzeti admin račun (samo za razvoj - spremenite v produkciji!)
db.users.insertOne({
  username: 'admin',
  email: 'admin@localhost',
  passwordHash: '$2b$10$rQZ8fGFVGGGvGvGvGvGvGe7GvGvGvGvGvGvGvGvGvGvGvGvGvGvGv', // geslo: admin123 - SPREMENITE!
  role: 'admin',
  isActive: true,
  permissions: ['all'],
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null,
  loginAttempts: 0,
  lockUntil: null
});

print('MongoDB inicializacija končana uspešno!');
print('POMEMBNO: Spremenite privzeto admin geslo v produkciji!');
print('Ustvarjene kolekcije:', db.getCollectionNames());