const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const License = require('../models/License');
const auditService = require('../services/auditService');
const paymentService = require('../services/paymentService');

class StripeWebhookHandler {
  constructor() {
    this.endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Verifikacija Stripe webhook podpisa
   */
  verifyWebhook(body, signature) {
    try {
      return stripe.webhooks.constructEvent(body, signature, this.endpointSecret);
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Glavna funkcija za obravnavo webhook dogodkov
   */
  async handleWebhook(event) {
    try {
      await auditService.log({
        action: 'webhook_received',
        resource: 'stripe',
        details: {
          event_type: event.type,
          event_id: event.id
        },
        metadata: {
          provider: 'stripe',
          webhook_version: event.api_version
        }
      });

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object);
          break;

        case 'invoice.upcoming':
          await this.handleUpcomingInvoice(event.data.object);
          break;

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      await auditService.log({
        action: 'webhook_error',
        resource: 'stripe',
        details: {
          event_type: event.type,
          event_id: event.id,
          error: error.message
        },
        metadata: {
          provider: 'stripe',
          error_stack: error.stack
        }
      });
      throw error;
    }
  }

  /**
   * Obravnava ustvarjene naročnine
   */
  async handleSubscriptionCreated(stripeSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': stripeSubscription.id
      });

      if (subscription) {
        subscription.status = this.mapStripeStatus(stripeSubscription.status);
        subscription.current_period_start = new Date(stripeSubscription.current_period_start * 1000);
        subscription.current_period_end = new Date(stripeSubscription.current_period_end * 1000);
        subscription.updated_at = new Date();

        await subscription.save();

        await auditService.log({
          action: 'subscription_created',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            stripe_subscription_id: stripeSubscription.id,
            status: subscription.status,
            plan: subscription.plan
          }
        });
      }
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Obravnava posodobljene naročnine
   */
  async handleSubscriptionUpdated(stripeSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': stripeSubscription.id
      });

      if (subscription) {
        const oldStatus = subscription.status;
        subscription.status = this.mapStripeStatus(stripeSubscription.status);
        subscription.current_period_start = new Date(stripeSubscription.current_period_start * 1000);
        subscription.current_period_end = new Date(stripeSubscription.current_period_end * 1000);
        subscription.updated_at = new Date();

        // Posodobi licenco, če se je status spremenil
        if (oldStatus !== subscription.status) {
          await this.updateLicenseStatus(subscription);
        }

        await subscription.save();

        await auditService.log({
          action: 'subscription_updated',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            stripe_subscription_id: stripeSubscription.id,
            old_status: oldStatus,
            new_status: subscription.status,
            plan: subscription.plan
          }
        });
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Obravnava prekinjene naročnine
   */
  async handleSubscriptionDeleted(stripeSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': stripeSubscription.id
      });

      if (subscription) {
        subscription.status = 'cancelled';
        subscription.cancelled_at = new Date();
        subscription.updated_at = new Date();

        await this.updateLicenseStatus(subscription);
        await subscription.save();

        await auditService.log({
          action: 'subscription_cancelled',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            stripe_subscription_id: stripeSubscription.id,
            cancellation_reason: 'stripe_webhook'
          }
        });
      }
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Obravnava uspešnega plačila
   */
  async handlePaymentSucceeded(invoice) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': invoice.subscription
      });

      if (subscription) {
        // Dodaj plačilo v zgodovino
        const payment = {
          payment_id: invoice.payment_intent,
          amount: invoice.amount_paid / 100, // Stripe uporablja cente
          currency: invoice.currency.toUpperCase(),
          status: 'completed',
          payment_date: new Date(invoice.status_transitions.paid_at * 1000),
          invoice_id: invoice.id,
          metadata: {
            stripe_invoice_id: invoice.id,
            stripe_payment_intent: invoice.payment_intent
          }
        };

        subscription.payment_history.push(payment);
        subscription.last_payment_date = payment.payment_date;
        subscription.status = 'active';
        subscription.updated_at = new Date();

        await subscription.save();

        // Posodobi licenco
        await this.updateLicenseStatus(subscription);

        await auditService.log({
          action: 'payment_succeeded',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            amount: payment.amount,
            currency: payment.currency,
            invoice_id: invoice.id,
            payment_intent: invoice.payment_intent
          }
        });
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Obravnava neuspešnega plačila
   */
  async handlePaymentFailed(invoice) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': invoice.subscription
      });

      if (subscription) {
        // Dodaj neuspešno plačilo v zgodovino
        const payment = {
          payment_id: invoice.payment_intent || `failed_${Date.now()}`,
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'failed',
          payment_date: new Date(),
          invoice_id: invoice.id,
          failure_reason: invoice.last_finalization_error?.message || 'Payment failed',
          metadata: {
            stripe_invoice_id: invoice.id,
            attempt_count: invoice.attempt_count
          }
        };

        subscription.payment_history.push(payment);
        subscription.failed_payment_count = (subscription.failed_payment_count || 0) + 1;
        subscription.updated_at = new Date();

        // Če je preveč neuspešnih plačil, prekini naročnino
        if (subscription.failed_payment_count >= 3) {
          subscription.status = 'past_due';
        }

        await subscription.save();
        await this.updateLicenseStatus(subscription);

        await auditService.log({
          action: 'payment_failed',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            amount: payment.amount,
            currency: payment.currency,
            invoice_id: invoice.id,
            failure_reason: payment.failure_reason,
            attempt_count: invoice.attempt_count
          }
        });

        // Pošlji obvestilo o neuspešnem plačilu
        await paymentService.sendPaymentFailedNotification(subscription, payment);
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }

  /**
   * Obravnava konca preizkusnega obdobja
   */
  async handleTrialWillEnd(stripeSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': stripeSubscription.id
      });

      if (subscription) {
        await auditService.log({
          action: 'trial_ending',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            trial_end: new Date(stripeSubscription.trial_end * 1000),
            days_remaining: Math.ceil((stripeSubscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
          }
        });

        // Pošlji obvestilo o koncu preizkusnega obdobja
        await paymentService.sendTrialEndingNotification(subscription);
      }
    } catch (error) {
      console.error('Error handling trial will end:', error);
      throw error;
    }
  }

  /**
   * Obravnava prihajajoče fakture
   */
  async handleUpcomingInvoice(invoice) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': invoice.subscription
      });

      if (subscription) {
        await auditService.log({
          action: 'invoice_upcoming',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            amount: invoice.amount_due / 100,
            currency: invoice.currency.toUpperCase(),
            due_date: new Date(invoice.next_payment_attempt * 1000)
          }
        });

        // Pošlji obvestilo o prihajajoči fakturi
        await paymentService.sendUpcomingInvoiceNotification(subscription, {
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          due_date: new Date(invoice.next_payment_attempt * 1000)
        });
      }
    } catch (error) {
      console.error('Error handling upcoming invoice:', error);
      throw error;
    }
  }

  /**
   * Posodobi status licence na podlagi naročnine
   */
  async updateLicenseStatus(subscription) {
    try {
      const license = await License.findOne({ client_id: subscription.client_id });
      
      if (license) {
        const wasActive = license.is_active;
        
        // Določi nov status licence
        switch (subscription.status) {
          case 'active':
          case 'trialing':
            license.is_active = true;
            license.expires_at = subscription.current_period_end;
            break;
          case 'past_due':
            // Ohrani aktivno za grace period
            license.is_active = true;
            break;
          case 'cancelled':
          case 'unpaid':
            license.is_active = false;
            break;
        }

        license.updated_at = new Date();
        await license.save();

        // Beleži spremembo statusa licence
        if (wasActive !== license.is_active) {
          await auditService.log({
            action: 'license_status_changed',
            resource: 'license',
            resource_id: license._id,
            client_id: subscription.client_id,
            details: {
              old_status: wasActive ? 'active' : 'inactive',
              new_status: license.is_active ? 'active' : 'inactive',
              subscription_status: subscription.status,
              expires_at: license.expires_at
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating license status:', error);
      throw error;
    }
  }

  /**
   * Preslika Stripe status v naš sistem
   */
  mapStripeStatus(stripeStatus) {
    const statusMap = {
      'active': 'active',
      'trialing': 'trialing',
      'past_due': 'past_due',
      'canceled': 'cancelled',
      'unpaid': 'unpaid',
      'incomplete': 'pending',
      'incomplete_expired': 'cancelled'
    };

    return statusMap[stripeStatus] || 'unknown';
  }
}

module.exports = new StripeWebhookHandler();