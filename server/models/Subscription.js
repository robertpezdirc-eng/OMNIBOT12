const mongoose = require('mongoose');

/**
 * Subscription Schema za recurring payments
 */
const subscriptionSchema = new mongoose.Schema({
  // Osnovni podatki naročnine
  subscriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  clientId: {
    type: String,
    required: true,
    index: true,
    ref: 'License'
  },
  
  // Podatki o plačilnem ponudniku
  paymentProvider: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'square', 'manual'],
    default: 'stripe'
  },
  
  externalSubscriptionId: {
    type: String,
    required: true,
    index: true // ID pri zunanjem ponudniku (Stripe, PayPal, itd.)
  },
  
  customerId: {
    type: String,
    required: true,
    index: true // ID stranke pri zunanjem ponudniku
  },
  
  // Podatki o načrtu
  plan: {
    type: String,
    required: true,
    enum: ['demo', 'basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  
  planId: {
    type: String,
    required: true // ID načrta pri zunanjem ponudniku
  },
  
  // Cenovni podatki
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    required: true,
    default: 'EUR',
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  
  // Interval plačevanja
  interval: {
    type: String,
    required: true,
    enum: ['day', 'week', 'month', 'year'],
    default: 'month'
  },
  
  intervalCount: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  
  // Status naročnine
  status: {
    type: String,
    required: true,
    enum: ['active', 'past_due', 'canceled', 'unpaid', 'paused', 'trialing'],
    default: 'active',
    index: true
  },
  
  // Datumi
  currentPeriodStart: {
    type: Date,
    required: true
  },
  
  currentPeriodEnd: {
    type: Date,
    required: true,
    index: true
  },
  
  trialStart: {
    type: Date
  },
  
  trialEnd: {
    type: Date
  },
  
  canceledAt: {
    type: Date
  },
  
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  
  // Podatki o stranki
  customerInfo: {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    phone: String,
    vatNumber: String
  },
  
  // Plačilni podatki
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_account', 'paypal', 'sepa_debit'],
      default: 'card'
    },
    last4: String,
    brand: String,
    expMonth: Number,
    expYear: Number,
    fingerprint: String
  },
  
  // Zgodovina plačil
  lastPaymentDate: {
    type: Date
  },
  
  lastPaymentAmount: {
    type: Number
  },
  
  lastPaymentStatus: {
    type: String,
    enum: ['succeeded', 'failed', 'pending', 'canceled']
  },
  
  nextPaymentDate: {
    type: Date,
    index: true
  },
  
  failedPaymentCount: {
    type: Number,
    default: 0
  },
  
  // Popusti in kuponi
  discount: {
    couponId: String,
    percentOff: Number,
    amountOff: Number,
    validUntil: Date
  },
  
  // Metapodatki
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  
  // Nastavitve
  settings: {
    autoRenew: {
      type: Boolean,
      default: true
    },
    sendInvoices: {
      type: Boolean,
      default: true
    },
    gracePeriodDays: {
      type: Number,
      default: 3,
      min: 0,
      max: 30
    },
    maxRetryAttempts: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    }
  },
  
  // Sistemski podatki
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  lastSyncAt: {
    type: Date // Zadnja sinhronizacija z zunanjim ponudnikom
  }
}, {
  timestamps: true,
  collection: 'subscriptions'
});

// Indeksi za optimizacijo
subscriptionSchema.index({ clientId: 1, status: 1 });
subscriptionSchema.index({ paymentProvider: 1, externalSubscriptionId: 1 });
subscriptionSchema.index({ nextPaymentDate: 1, status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });

// Virtualni atributi
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' || this.status === 'trialing';
});

subscriptionSchema.virtual('isExpired').get(function() {
  return new Date() > this.currentPeriodEnd;
});

subscriptionSchema.virtual('daysUntilRenewal').get(function() {
  const now = new Date();
  const renewal = this.nextPaymentDate || this.currentPeriodEnd;
  const diffTime = renewal - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

subscriptionSchema.virtual('isInGracePeriod').get(function() {
  if (this.status !== 'past_due') return false;
  const gracePeriodEnd = new Date(this.currentPeriodEnd);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.settings.gracePeriodDays);
  return new Date() <= gracePeriodEnd;
});

// Middleware
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Nastavi nextPaymentDate, če ni nastavljen
  if (!this.nextPaymentDate && this.isActive) {
    this.calculateNextPaymentDate();
  }
  
  next();
});

// Metode
subscriptionSchema.methods.calculateNextPaymentDate = function() {
  const current = this.currentPeriodEnd || new Date();
  const next = new Date(current);
  
  switch (this.interval) {
    case 'day':
      next.setDate(next.getDate() + this.intervalCount);
      break;
    case 'week':
      next.setDate(next.getDate() + (this.intervalCount * 7));
      break;
    case 'month':
      next.setMonth(next.getMonth() + this.intervalCount);
      break;
    case 'year':
      next.setFullYear(next.getFullYear() + this.intervalCount);
      break;
  }
  
  this.nextPaymentDate = next;
  return next;
};

subscriptionSchema.methods.updatePeriod = function() {
  this.currentPeriodStart = this.currentPeriodEnd || new Date();
  this.calculateNextPaymentDate();
  this.currentPeriodEnd = new Date(this.nextPaymentDate);
};

subscriptionSchema.methods.recordPayment = function(paymentData) {
  this.lastPaymentDate = new Date();
  this.lastPaymentAmount = paymentData.amount || this.amount;
  this.lastPaymentStatus = paymentData.status || 'succeeded';
  
  if (paymentData.status === 'succeeded') {
    this.failedPaymentCount = 0;
    this.updatePeriod();
    if (this.status === 'past_due') {
      this.status = 'active';
    }
  } else if (paymentData.status === 'failed') {
    this.failedPaymentCount += 1;
    if (this.failedPaymentCount >= this.settings.maxRetryAttempts) {
      this.status = 'unpaid';
    } else {
      this.status = 'past_due';
    }
  }
};

subscriptionSchema.methods.cancel = function(immediately = false) {
  if (immediately) {
    this.status = 'canceled';
    this.canceledAt = new Date();
  } else {
    this.cancelAtPeriodEnd = true;
  }
};

subscriptionSchema.methods.reactivate = function() {
  if (this.status === 'canceled' && !this.isExpired) {
    this.status = 'active';
    this.canceledAt = null;
    this.cancelAtPeriodEnd = false;
    this.failedPaymentCount = 0;
  }
};

// Statične metode
subscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({ 
    status: { $in: ['active', 'trialing'] },
    $or: [
      { cancelAtPeriodEnd: false },
      { cancelAtPeriodEnd: { $exists: false } }
    ]
  });
};

subscriptionSchema.statics.findDueForRenewal = function(daysAhead = 1) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  
  return this.find({
    status: { $in: ['active', 'trialing'] },
    nextPaymentDate: { $lte: targetDate },
    'settings.autoRenew': true
  });
};

subscriptionSchema.statics.findExpiredSubscriptions = function() {
  return this.find({
    status: { $in: ['past_due', 'unpaid'] },
    currentPeriodEnd: { $lt: new Date() }
  });
};

subscriptionSchema.statics.getByClientId = function(clientId) {
  return this.findOne({ clientId, status: { $ne: 'canceled' } })
    .sort({ createdAt: -1 });
};

subscriptionSchema.statics.getRevenue = function(startDate, endDate) {
  const match = {
    lastPaymentStatus: 'succeeded',
    lastPaymentDate: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$lastPaymentAmount' },
        totalSubscriptions: { $sum: 1 },
        averageAmount: { $avg: '$lastPaymentAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);