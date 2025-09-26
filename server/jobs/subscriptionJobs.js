const cron = require('node-cron');
const paymentService = require('../services/paymentService');
const auditService = require('../services/auditService');
const Subscription = require('../models/Subscription');

/**
 * Subscription Jobs za avtomatsko obravnavo naročnin
 */
class SubscriptionJobs {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Zaženi vse cron job-e
   */
  start() {
    if (this.isRunning) {
      console.log('Subscription jobs so že zagnani');
      return;
    }

    console.log('Zaganjam subscription jobs...');

    // Job za obravnavo zapadlih plačil - vsako uro
    this.jobs.set('renewals', cron.schedule('0 * * * *', async () => {
      await this.processRenewals();
    }, {
      scheduled: false,
      timezone: 'Europe/Ljubljana'
    }));

    // Job za sinhronizacijo z zunanjimi ponudniki - vsakih 6 ur
    this.jobs.set('sync', cron.schedule('0 */6 * * *', async () => {
      await this.syncSubscriptions();
    }, {
      scheduled: false,
      timezone: 'Europe/Ljubljana'
    }));

    // Job za čiščenje poteklih naročnin - enkrat dnevno ob 2:00
    this.jobs.set('cleanup', cron.schedule('0 2 * * *', async () => {
      await this.cleanupExpiredSubscriptions();
    }, {
      scheduled: false,
      timezone: 'Europe/Ljubljana'
    }));

    // Job za pošiljanje opozoril - enkrat dnevno ob 9:00
    this.jobs.set('notifications', cron.schedule('0 9 * * *', async () => {
      await this.sendRenewalNotifications();
    }, {
      scheduled: false,
      timezone: 'Europe/Ljubljana'
    }));

    // Job za generiranje poročil - enkrat tedensko v ponedeljek ob 8:00
    this.jobs.set('reports', cron.schedule('0 8 * * 1', async () => {
      await this.generateWeeklyReport();
    }, {
      scheduled: false,
      timezone: 'Europe/Ljubljana'
    }));

    // Zaženi vse job-e
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✓ ${name} job zagnan`);
    });

    this.isRunning = true;
    console.log('Vsi subscription jobs so uspešno zagnani');

    // Beleži zagon
    auditService.logSystemEvent({
      type: 'subscription_jobs_started',
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    });
  }

  /**
   * Ustavi vse cron job-e
   */
  stop() {
    if (!this.isRunning) {
      console.log('Subscription jobs niso zagnani');
      return;
    }

    console.log('Ustavljam subscription jobs...');

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`✓ ${name} job ustavljen`);
    });

    this.isRunning = false;
    console.log('Vsi subscription jobs so ustavljeni');

    // Beleži ustavitev
    auditService.logSystemEvent({
      type: 'subscription_jobs_stopped',
      jobCount: this.jobs.size
    });
  }

  /**
   * Obravnavaj zapadla plačila
   */
  async processRenewals() {
    try {
      console.log('Začenjam obravnavo zapadlih plačil...');
      
      const results = await paymentService.processRenewals();
      
      console.log(`Obravnava zapadlih plačil končana:`, results);

      // Beleži rezultate
      await auditService.logSystemEvent({
        type: 'renewals_job_completed',
        results,
        timestamp: new Date()
      });

      // Če so bile napake, pošlji opozorilo
      if (results.failed > 0) {
        await this.notifyAdminsOfFailures('renewals', results);
      }

    } catch (error) {
      console.error('Napaka pri obravnavi zapadlih plačil:', error);
      
      await auditService.logSystemError('subscription_job_error', {
        job: 'processRenewals',
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Sinhroniziraj naročnine z zunanjimi ponudniki
   */
  async syncSubscriptions() {
    try {
      console.log('Začenjam sinhronizacijo naročnin...');
      
      const providers = ['stripe', 'paypal', 'square'];
      const allResults = {};

      for (const provider of providers) {
        try {
          const results = await paymentService.syncSubscriptions(provider);
          allResults[provider] = results;
          console.log(`Sinhronizacija ${provider}:`, results);
        } catch (error) {
          console.error(`Napaka pri sinhronizaciji ${provider}:`, error);
          allResults[provider] = { error: error.message };
        }
      }

      console.log('Sinhronizacija naročnin končana:', allResults);

      // Beleži rezultate
      await auditService.logSystemEvent({
        type: 'sync_job_completed',
        results: allResults,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Napaka pri sinhronizaciji naročnin:', error);
      
      await auditService.logSystemError('subscription_job_error', {
        job: 'syncSubscriptions',
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Počisti potekle naročnine
   */
  async cleanupExpiredSubscriptions() {
    try {
      console.log('Začenjam čiščenje poteklih naročnin...');
      
      const gracePeriodDays = 30; // 30 dni grace period za potekle naročnine
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

      // Najdi potekle naročnine, ki so starejše od grace period
      const expiredSubscriptions = await Subscription.find({
        status: { $in: ['canceled', 'unpaid'] },
        $or: [
          { canceledAt: { $lt: cutoffDate } },
          { currentPeriodEnd: { $lt: cutoffDate } }
        ]
      });

      let cleanedCount = 0;
      let archivedCount = 0;

      for (const subscription of expiredSubscriptions) {
        try {
          // Arhiviraj podatke pred brisanjem
          await auditService.logPaymentEvent({
            type: 'subscription_archived',
            subscriptionId: subscription.subscriptionId,
            clientId: subscription.clientId,
            plan: subscription.plan,
            status: subscription.status,
            totalRevenue: subscription.lastPaymentAmount || 0,
            createdAt: subscription.createdAt,
            endedAt: subscription.canceledAt || subscription.currentPeriodEnd
          });

          // Označi kot arhiviran namesto brisanja
          subscription.status = 'archived';
          subscription.metadata.set('archivedAt', new Date());
          await subscription.save();

          archivedCount++;
        } catch (error) {
          console.error(`Napaka pri arhiviranju naročnine ${subscription.subscriptionId}:`, error);
        }
      }

      console.log(`Čiščenje končano: ${archivedCount} naročnin arhiviranih`);

      // Beleži rezultate
      await auditService.logSystemEvent({
        type: 'cleanup_job_completed',
        archivedCount,
        gracePeriodDays,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Napaka pri čiščenju poteklih naročnin:', error);
      
      await auditService.logSystemError('subscription_job_error', {
        job: 'cleanupExpiredSubscriptions',
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Pošlji opozorila o prihajajoči obnovi
   */
  async sendRenewalNotifications() {
    try {
      console.log('Začenjam pošiljanje opozoril o obnovi...');
      
      const notificationDays = [7, 3, 1]; // Opozorila 7, 3 in 1 dan pred obnovo
      let totalSent = 0;

      for (const days of notificationDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Najdi naročnine, ki se obnovijo v določenem številu dni
        const subscriptions = await Subscription.find({
          status: 'active',
          nextPaymentDate: {
            $gte: targetDate,
            $lt: nextDay
          },
          'settings.sendInvoices': true
        });

        for (const subscription of subscriptions) {
          try {
            // Preveri, če opozorilo še ni bilo poslano
            const notificationKey = `renewal_${days}d_${subscription.subscriptionId}`;
            const alreadySent = subscription.metadata.get(notificationKey);

            if (!alreadySent) {
              await this.sendRenewalNotification(subscription, days);
              
              // Označi kot poslano
              subscription.metadata.set(notificationKey, new Date());
              await subscription.save();
              
              totalSent++;
            }
          } catch (error) {
            console.error(`Napaka pri pošiljanju opozorila za ${subscription.subscriptionId}:`, error);
          }
        }
      }

      console.log(`Opozorila poslana: ${totalSent}`);

      // Beleži rezultate
      await auditService.logSystemEvent({
        type: 'notifications_job_completed',
        totalSent,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Napaka pri pošiljanju opozoril:', error);
      
      await auditService.logSystemError('subscription_job_error', {
        job: 'sendRenewalNotifications',
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Generiraj tedensko poročilo
   */
  async generateWeeklyReport() {
    try {
      console.log('Generiram tedensko poročilo...');
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Statistike za pretekli teden
      const stats = {
        period: {
          start: startDate,
          end: endDate
        },
        newSubscriptions: await Subscription.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate }
        }),
        canceledSubscriptions: await Subscription.countDocuments({
          canceledAt: { $gte: startDate, $lte: endDate }
        }),
        totalActive: await Subscription.countDocuments({ status: 'active' }),
        totalRevenue: 0,
        failedPayments: 0,
        topPlans: []
      };

      // Prihodki
      const revenueData = await Subscription.aggregate([
        {
          $match: {
            lastPaymentDate: { $gte: startDate, $lte: endDate },
            lastPaymentStatus: 'succeeded'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$lastPaymentAmount' }
          }
        }
      ]);

      stats.totalRevenue = revenueData[0]?.total || 0;

      // Neuspešna plačila
      stats.failedPayments = await Subscription.countDocuments({
        lastPaymentDate: { $gte: startDate, $lte: endDate },
        lastPaymentStatus: 'failed'
      });

      // Najbolj priljubljeni plani
      const planData = await Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      stats.topPlans = planData;

      console.log('Tedensko poročilo generirano:', stats);

      // Beleži poročilo
      await auditService.logSystemEvent({
        type: 'weekly_report_generated',
        stats,
        timestamp: new Date()
      });

      // Pošlji poročilo administratorjem
      await this.sendWeeklyReportToAdmins(stats);

    } catch (error) {
      console.error('Napaka pri generiranju tedenske poročila:', error);
      
      await auditService.logSystemError('subscription_job_error', {
        job: 'generateWeeklyReport',
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Pošlji opozorilo o obnovi naročnine
   */
  async sendRenewalNotification(subscription, daysUntilRenewal) {
    // Implementacija pošiljanja e-pošte ali push obvestila
    console.log(`Pošiljam opozorilo o obnovi za ${subscription.subscriptionId} (${daysUntilRenewal} dni)`);
    
    // Tu bi implementirali pošiljanje e-pošte preko nodemailer ali podobno
    // Za zdaj samo beležimo dogodek
    await auditService.logPaymentEvent({
      type: 'renewal_notification_sent',
      subscriptionId: subscription.subscriptionId,
      clientId: subscription.clientId,
      daysUntilRenewal,
      email: subscription.customerInfo.email,
      amount: subscription.amount,
      currency: subscription.currency
    });
  }

  /**
   * Obvesti administratorje o napakah
   */
  async notifyAdminsOfFailures(jobType, results) {
    console.log(`Obveščam administratorje o napakah v ${jobType}:`, results);
    
    // Tu bi implementirali pošiljanje e-pošte administratorjem
    await auditService.logSystemEvent({
      type: 'admin_notification_sent',
      jobType,
      results,
      timestamp: new Date()
    });
  }

  /**
   * Pošlji tedensko poročilo administratorjem
   */
  async sendWeeklyReportToAdmins(stats) {
    console.log('Pošiljam tedensko poročilo administratorjem:', stats);
    
    // Tu bi implementirali pošiljanje e-pošte z poročilom
    await auditService.logSystemEvent({
      type: 'weekly_report_sent',
      stats,
      timestamp: new Date()
    });
  }

  /**
   * Pridobi status vseh job-ov
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running,
        lastDate: job.lastDate,
        nextDate: job.nextDate
      };
    });

    return status;
  }

  /**
   * Zaženi določen job ročno
   */
  async runJob(jobName) {
    const jobMethods = {
      renewals: this.processRenewals.bind(this),
      sync: this.syncSubscriptions.bind(this),
      cleanup: this.cleanupExpiredSubscriptions.bind(this),
      notifications: this.sendRenewalNotifications.bind(this),
      reports: this.generateWeeklyReport.bind(this)
    };

    const method = jobMethods[jobName];
    if (!method) {
      throw new Error(`Neznan job: ${jobName}`);
    }

    console.log(`Ročno zaganjam job: ${jobName}`);
    await method();
    console.log(`Job ${jobName} uspešno končan`);
  }
}

module.exports = new SubscriptionJobs();