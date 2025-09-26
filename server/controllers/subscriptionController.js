const Subscription = require('../models/Subscription');
const paymentService = require('../services/paymentService');
const auditService = require('../services/auditService');

/**
 * Subscription Controller
 */
class SubscriptionController {
  
  /**
   * Ustvari novo naročnino
   */
  async createSubscription(req, res) {
    try {
      const {
        clientId,
        plan,
        paymentProvider = 'stripe',
        customerInfo,
        paymentMethod,
        planId,
        interval = 'month',
        intervalCount = 1,
        trialDays = 0
      } = req.body;

      // Validacija
      if (!clientId || !plan || !customerInfo || !planId) {
        await auditService.logSecurityEvent({
          type: 'invalid_subscription_request',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          missingFields: { clientId: !clientId, plan: !plan, customerInfo: !customerInfo, planId: !planId }
        });
        
        return res.status(400).json({
          success: false,
          error: 'Manjkajo obvezni podatki'
        });
      }

      // Preveri, če naročnina že obstaja
      const existingSubscription = await Subscription.getByClientId(clientId);
      if (existingSubscription && existingSubscription.isActive) {
        await auditService.logPaymentEvent({
          type: 'subscription_creation_failed',
          clientId,
          reason: 'subscription_already_exists',
          existingSubscriptionId: existingSubscription.subscriptionId
        });
        
        return res.status(409).json({
          success: false,
          error: 'Aktivna naročnina že obstaja',
          existingSubscription: {
            subscriptionId: existingSubscription.subscriptionId,
            plan: existingSubscription.plan,
            status: existingSubscription.status
          }
        });
      }

      // Določi ceno glede na plan
      const planPricing = this.getPlanPricing(plan, interval);
      
      const subscriptionData = {
        clientId,
        plan,
        planId,
        paymentProvider,
        amount: planPricing.amount,
        currency: planPricing.currency,
        interval,
        intervalCount,
        customerInfo,
        paymentMethod,
        settings: {
          autoRenew: true,
          sendInvoices: true,
          gracePeriodDays: 3,
          maxRetryAttempts: 3
        }
      };

      // Dodaj trial period, če je določen
      if (trialDays > 0) {
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + trialDays);
        
        subscriptionData.trialStart = trialStart;
        subscriptionData.trialEnd = trialEnd;
      }

      const subscription = await paymentService.createSubscription(subscriptionData);

      await auditService.logPaymentEvent({
        type: 'subscription_created',
        subscriptionId: subscription.subscriptionId,
        clientId: subscription.clientId,
        plan: subscription.plan,
        amount: subscription.amount,
        currency: subscription.currency,
        provider: subscription.paymentProvider,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        subscription: {
          subscriptionId: subscription.subscriptionId,
          clientId: subscription.clientId,
          plan: subscription.plan,
          status: subscription.status,
          amount: subscription.amount,
          currency: subscription.currency,
          interval: subscription.interval,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          nextPaymentDate: subscription.nextPaymentDate,
          trialEnd: subscription.trialEnd,
          isActive: subscription.isActive
        }
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'createSubscription',
        error: error.message,
        clientId: req.body.clientId,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri ustvarjanju naročnine',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Pridobi naročnino po client ID
   */
  async getSubscription(req, res) {
    try {
      const { clientId } = req.params;

      if (!clientId) {
        return res.status(400).json({
          success: false,
          error: 'Client ID je obvezen'
        });
      }

      const subscription = await Subscription.getByClientId(clientId);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Naročnina ni najdena'
        });
      }

      res.json({
        success: true,
        subscription: {
          subscriptionId: subscription.subscriptionId,
          clientId: subscription.clientId,
          plan: subscription.plan,
          status: subscription.status,
          amount: subscription.amount,
          currency: subscription.currency,
          interval: subscription.interval,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          nextPaymentDate: subscription.nextPaymentDate,
          trialEnd: subscription.trialEnd,
          isActive: subscription.isActive,
          isExpired: subscription.isExpired,
          daysUntilRenewal: subscription.daysUntilRenewal,
          isInGracePeriod: subscription.isInGracePeriod,
          failedPaymentCount: subscription.failedPaymentCount,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          settings: subscription.settings
        }
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'getSubscription',
        error: error.message,
        clientId: req.params.clientId,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri pridobivanju naročnine'
      });
    }
  }

  /**
   * Posodobi naročnino
   */
  async updateSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      const updateData = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: 'Subscription ID je obvezen'
        });
      }

      // Filtriraj dovoljene posodobitve
      const allowedUpdates = ['plan', 'planId', 'settings', 'customerInfo'];
      const filteredUpdates = {};
      
      for (const key of allowedUpdates) {
        if (updateData[key] !== undefined) {
          filteredUpdates[key] = updateData[key];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Ni podatkov za posodobitev'
        });
      }

      // Če se spreminja plan, posodobi tudi ceno
      if (filteredUpdates.plan) {
        const subscription = await Subscription.findOne({ subscriptionId });
        if (subscription) {
          const planPricing = this.getPlanPricing(filteredUpdates.plan, subscription.interval);
          filteredUpdates.amount = planPricing.amount;
        }
      }

      const updatedSubscription = await paymentService.updateSubscription(subscriptionId, filteredUpdates);

      await auditService.logPaymentEvent({
        type: 'subscription_updated',
        subscriptionId,
        clientId: updatedSubscription.clientId,
        changes: filteredUpdates,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        subscription: {
          subscriptionId: updatedSubscription.subscriptionId,
          clientId: updatedSubscription.clientId,
          plan: updatedSubscription.plan,
          status: updatedSubscription.status,
          amount: updatedSubscription.amount,
          currency: updatedSubscription.currency,
          currentPeriodEnd: updatedSubscription.currentPeriodEnd,
          nextPaymentDate: updatedSubscription.nextPaymentDate,
          isActive: updatedSubscription.isActive
        }
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'updateSubscription',
        error: error.message,
        subscriptionId: req.params.subscriptionId,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri posodabljanju naročnine'
      });
    }
  }

  /**
   * Prekliči naročnino
   */
  async cancelSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      const { immediately = false, reason } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: 'Subscription ID je obvezen'
        });
      }

      const canceledSubscription = await paymentService.cancelSubscription(subscriptionId, immediately);

      await auditService.logPaymentEvent({
        type: 'subscription_canceled',
        subscriptionId,
        clientId: canceledSubscription.clientId,
        immediately,
        reason,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: immediately ? 'Naročnina je bila takoj preklicana' : 'Naročnina bo preklicana ob koncu obdobja',
        subscription: {
          subscriptionId: canceledSubscription.subscriptionId,
          status: canceledSubscription.status,
          canceledAt: canceledSubscription.canceledAt,
          cancelAtPeriodEnd: canceledSubscription.cancelAtPeriodEnd,
          currentPeriodEnd: canceledSubscription.currentPeriodEnd
        }
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'cancelSubscription',
        error: error.message,
        subscriptionId: req.params.subscriptionId,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri preklicu naročnine'
      });
    }
  }

  /**
   * Ponovno aktiviraj naročnino
   */
  async reactivateSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: 'Subscription ID je obvezen'
        });
      }

      const reactivatedSubscription = await paymentService.reactivateSubscription(subscriptionId);

      await auditService.logPaymentEvent({
        type: 'subscription_reactivated',
        subscriptionId,
        clientId: reactivatedSubscription.clientId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Naročnina je bila ponovno aktivirana',
        subscription: {
          subscriptionId: reactivatedSubscription.subscriptionId,
          status: reactivatedSubscription.status,
          isActive: reactivatedSubscription.isActive,
          currentPeriodEnd: reactivatedSubscription.currentPeriodEnd,
          nextPaymentDate: reactivatedSubscription.nextPaymentDate
        }
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'reactivateSubscription',
        error: error.message,
        subscriptionId: req.params.subscriptionId,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri ponovni aktivaciji naročnine'
      });
    }
  }

  /**
   * Pridobi seznam vseh naročnin (admin)
   */
  async getAllSubscriptions(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        plan,
        paymentProvider,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      
      if (status) query.status = status;
      if (plan) query.plan = plan;
      if (paymentProvider) query.paymentProvider = paymentProvider;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
      };

      const subscriptions = await Subscription.find(query)
        .sort(options.sort)
        .limit(options.limit)
        .skip((options.page - 1) * options.limit)
        .select('-customerInfo.address -paymentMethod -metadata');

      const total = await Subscription.countDocuments(query);

      res.json({
        success: true,
        subscriptions,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit)
        }
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'getAllSubscriptions',
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri pridobivanju naročnin'
      });
    }
  }

  /**
   * Pridobi statistike naročnin
   */
  async getSubscriptionStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Osnovne statistike
      const totalActive = await Subscription.countDocuments({ status: 'active' });
      const totalCanceled = await Subscription.countDocuments({ status: 'canceled' });
      const totalPastDue = await Subscription.countDocuments({ status: 'past_due' });

      // Statistike po planih
      const planStats = await Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan', count: { $sum: 1 }, revenue: { $sum: '$amount' } } }
      ]);

      // Prihodki
      const revenueStats = await Subscription.getRevenue(start, end);

      // Mesečni trend
      const monthlyTrend = await Subscription.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            newSubscriptions: { $sum: 1 },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      res.json({
        success: true,
        stats: {
          overview: {
            totalActive,
            totalCanceled,
            totalPastDue,
            total: totalActive + totalCanceled + totalPastDue
          },
          planStats,
          revenue: revenueStats[0] || { totalRevenue: 0, totalSubscriptions: 0, averageAmount: 0 },
          monthlyTrend
        }
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'getSubscriptionStats',
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri pridobivanju statistik'
      });
    }
  }

  /**
   * Sinhroniziraj naročnine z zunanjimi ponudniki
   */
  async syncSubscriptions(req, res) {
    try {
      const { provider } = req.query;

      const results = await paymentService.syncSubscriptions(provider);

      await auditService.logSystemEvent({
        type: 'manual_sync_triggered',
        provider,
        results,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Sinhronizacija je bila uspešno izvedena',
        results
      });

    } catch (error) {
      await auditService.logSystemError('subscription_controller_error', {
        action: 'syncSubscriptions',
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Napaka pri sinhronizaciji naročnin'
      });
    }
  }

  /**
   * Obravnavaj webhook dogodke
   */
  async handleWebhook(req, res) {
    try {
      const { provider } = req.params;
      const signature = req.get('stripe-signature') || req.get('paypal-signature') || req.get('x-signature');
      const payload = req.body;

      if (!signature) {
        await auditService.logSecurityEvent({
          type: 'webhook_missing_signature',
          provider,
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          error: 'Manjka podpis webhook-a'
        });
      }

      const result = await paymentService.handleWebhook(provider, signature, payload);

      await auditService.logPaymentEvent({
        type: 'webhook_processed',
        provider,
        eventType: payload.type || 'unknown',
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Webhook je bil uspešno obravnavan',
        result
      });

    } catch (error) {
      await auditService.logSecurityEvent({
        type: 'webhook_processing_failed',
        provider: req.params.provider,
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: 'Napaka pri obravnavi webhook-a'
      });
    }
  }

  /**
   * Pomožne metode
   */
  getPlanPricing(plan, interval = 'month') {
    const pricing = {
      demo: { month: 0, year: 0 },
      basic: { month: 29, year: 290 },
      premium: { month: 79, year: 790 },
      enterprise: { month: 199, year: 1990 }
    };

    return {
      amount: pricing[plan]?.[interval] || 0,
      currency: 'EUR'
    };
  }
}

module.exports = new SubscriptionController();