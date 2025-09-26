const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const License = require('../models/License');
const auditService = require('../services/auditService');
const paymentService = require('../services/paymentService');

class PayPalWebhookHandler {
  constructor() {
    this.webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET;
  }

  /**
   * Verifikacija PayPal webhook podpisa
   */
  verifyWebhook(body, headers) {
    try {
      const signature = headers['paypal-transmission-sig'];
      const certId = headers['paypal-cert-id'];
      const authAlgo = headers['paypal-auth-algo'];
      const transmissionId = headers['paypal-transmission-id'];
      const timestamp = headers['paypal-transmission-time'];

      // PayPal webhook verifikacija je kompleksnejša in zahteva dodatne korake
      // Za demo namen uporabljamo osnovni HMAC pristop
      if (this.webhookSecret) {
        const expectedSignature = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(body)
          .digest('hex');
        
        return signature === expectedSignature;
      }

      return true; // V produkciji implementiraj pravilno verifikacijo
    } catch (error) {
      throw new Error(`PayPal webhook verification failed: ${error.message}`);
    }
  }

  /**
   * Glavna funkcija za obravnavo webhook dogodkov
   */
  async handleWebhook(event) {
    try {
      await auditService.log({
        action: 'webhook_received',
        resource: 'paypal',
        details: {
          event_type: event.event_type,
          event_id: event.id
        },
        metadata: {
          provider: 'paypal',
          webhook_version: event.event_version
        }
      });

      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          await this.handleSubscriptionCreated(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handleSubscriptionActivated(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.UPDATED':
          await this.handleSubscriptionUpdated(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handleSubscriptionCancelled(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await this.handleSubscriptionSuspended(event.resource);
          break;

        case 'PAYMENT.SALE.COMPLETED':
          await this.handlePaymentCompleted(event.resource);
          break;

        case 'PAYMENT.SALE.DENIED':
        case 'PAYMENT.SALE.REFUNDED':
          await this.handlePaymentFailed(event.resource);
          break;

        default:
          console.log(`Unhandled PayPal event type: ${event.event_type}`);
      }

      return { received: true };
    } catch (error) {
      await auditService.log({
        action: 'webhook_error',
        resource: 'paypal',
        details: {
          event_type: event.event_type,
          event_id: event.id,
          error: error.message
        },
        metadata: {
          provider: 'paypal',
          error_stack: error.stack
        }
      });
      throw error;
    }
  }

  /**
   * Obravnava ustvarjene naročnine
   */
  async handleSubscriptionCreated(paypalSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': paypalSubscription.id
      });

      if (subscription) {
        subscription.status = this.mapPayPalStatus(paypalSubscription.status);
        subscription.updated_at = new Date();

        await subscription.save();

        await auditService.log({
          action: 'subscription_created',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            paypal_subscription_id: paypalSubscription.id,
            status: subscription.status,
            plan: subscription.plan
          }
        });
      }
    } catch (error) {
      console.error('Error handling PayPal subscription created:', error);
      throw error;
    }
  }

  /**
   * Obravnava aktivirane naročnine
   */
  async handleSubscriptionActivated(paypalSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': paypalSubscription.id
      });

      if (subscription) {
        subscription.status = 'active';
        subscription.activated_at = new Date();
        subscription.updated_at = new Date();

        // Nastavi obdobje naročnine
        if (paypalSubscription.billing_info && paypalSubscription.billing_info.next_billing_time) {
          subscription.current_period_end = new Date(paypalSubscription.billing_info.next_billing_time);
        }

        await subscription.save();
        await this.updateLicenseStatus(subscription);

        await auditService.log({
          action: 'subscription_activated',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            paypal_subscription_id: paypalSubscription.id,
            activation_date: subscription.activated_at
          }
        });
      }
    } catch (error) {
      console.error('Error handling PayPal subscription activated:', error);
      throw error;
    }
  }

  /**
   * Obravnava posodobljene naročnine
   */
  async handleSubscriptionUpdated(paypalSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': paypalSubscription.id
      });

      if (subscription) {
        const oldStatus = subscription.status;
        subscription.status = this.mapPayPalStatus(paypalSubscription.status);
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
            paypal_subscription_id: paypalSubscription.id,
            old_status: oldStatus,
            new_status: subscription.status
          }
        });
      }
    } catch (error) {
      console.error('Error handling PayPal subscription updated:', error);
      throw error;
    }
  }

  /**
   * Obravnava prekinjene naročnine
   */
  async handleSubscriptionCancelled(paypalSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': paypalSubscription.id
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
            paypal_subscription_id: paypalSubscription.id,
            cancellation_reason: 'paypal_webhook'
          }
        });
      }
    } catch (error) {
      console.error('Error handling PayPal subscription cancelled:', error);
      throw error;
    }
  }

  /**
   * Obravnava suspendirane naročnine
   */
  async handleSubscriptionSuspended(paypalSubscription) {
    try {
      const subscription = await Subscription.findOne({
        'payment_provider.subscription_id': paypalSubscription.id
      });

      if (subscription) {
        subscription.status = 'suspended';
        subscription.updated_at = new Date();

        await this.updateLicenseStatus(subscription);
        await subscription.save();

        await auditService.log({
          action: 'subscription_suspended',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            paypal_subscription_id: paypalSubscription.id,
            suspension_reason: paypalSubscription.status_update_time
          }
        });
      }
    } catch (error) {
      console.error('Error handling PayPal subscription suspended:', error);
      throw error;
    }
  }

  /**
   * Obravnava uspešnega plačila
   */
  async handlePaymentCompleted(paymentResource) {
    try {
      // Poišči naročnino preko billing agreement ID ali custom field
      const subscription = await Subscription.findOne({
        $or: [
          { 'payment_provider.subscription_id': paymentResource.billing_agreement_id },
          { 'payment_provider.customer_id': paymentResource.custom }
        ]
      });

      if (subscription) {
        // Dodaj plačilo v zgodovino
        const payment = {
          payment_id: paymentResource.id,
          amount: parseFloat(paymentResource.amount.total),
          currency: paymentResource.amount.currency,
          status: 'completed',
          payment_date: new Date(paymentResource.create_time),
          metadata: {
            paypal_payment_id: paymentResource.id,
            paypal_sale_id: paymentResource.parent_payment
          }
        };

        subscription.payment_history.push(payment);
        subscription.last_payment_date = payment.payment_date;
        subscription.status = 'active';
        subscription.updated_at = new Date();

        await subscription.save();
        await this.updateLicenseStatus(subscription);

        await auditService.log({
          action: 'payment_succeeded',
          resource: 'subscription',
          resource_id: subscription._id,
          client_id: subscription.client_id,
          details: {
            amount: payment.amount,
            currency: payment.currency,
            paypal_payment_id: paymentResource.id
          }
        });
      }
    } catch (error) {
      console.error('Error handling PayPal payment completed:', error);
      throw error;
    }
  }

  /**
   * Obravnava neuspešnega plačila
   */
  async handlePaymentFailed(paymentResource) {
    try {
      const subscription = await Subscription.findOne({
        $or: [
          { 'payment_provider.subscription_id': paymentResource.billing_agreement_id },
          { 'payment_provider.customer_id': paymentResource.custom }
        ]
      });

      if (subscription) {
        // Dodaj neuspešno plačilo v zgodovino
        const payment = {
          payment_id: paymentResource.id,
          amount: parseFloat(paymentResource.amount.total),
          currency: paymentResource.amount.currency,
          status: 'failed',
          payment_date: new Date(),
          failure_reason: paymentResource.reason_code || 'Payment failed',
          metadata: {
            paypal_payment_id: paymentResource.id,
            paypal_reason_code: paymentResource.reason_code
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
            paypal_payment_id: paymentResource.id,
            failure_reason: payment.failure_reason
          }
        });

        // Pošlji obvestilo o neuspešnem plačilu
        await paymentService.sendPaymentFailedNotification(subscription, payment);
      }
    } catch (error) {
      console.error('Error handling PayPal payment failed:', error);
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
            license.is_active = true;
            license.expires_at = subscription.current_period_end;
            break;
          case 'suspended':
          case 'past_due':
            // Ohrani aktivno za grace period
            license.is_active = true;
            break;
          case 'cancelled':
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
   * Preslika PayPal status v naš sistem
   */
  mapPayPalStatus(paypalStatus) {
    const statusMap = {
      'APPROVAL_PENDING': 'pending',
      'APPROVED': 'pending',
      'ACTIVE': 'active',
      'SUSPENDED': 'suspended',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'expired'
    };

    return statusMap[paypalStatus] || 'unknown';
  }
}

module.exports = new PayPalWebhookHandler();