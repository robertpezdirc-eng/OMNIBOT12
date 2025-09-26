const Subscription = require('../models/Subscription');
const License = require('../models/License');
const auditService = require('./auditService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Payment Service za recurring payments
 */
class PaymentService {
  constructor() {
    this.providers = {
      stripe: this.stripeProvider.bind(this),
      paypal: this.paypalProvider.bind(this),
      square: this.squareProvider.bind(this),
      manual: this.manualProvider.bind(this)
    };
    
    this.webhookSecrets = {
      stripe: process.env.STRIPE_WEBHOOK_SECRET,
      paypal: process.env.PAYPAL_WEBHOOK_SECRET,
      square: process.env.SQUARE_WEBHOOK_SECRET
    };
  }

  /**
   * Ustvari novo naročnino
   */
  async createSubscription(subscriptionData) {
    try {
      const provider = this.providers[subscriptionData.paymentProvider];
      if (!provider) {
        throw new Error(`Nepodprt plačilni ponudnik: ${subscriptionData.paymentProvider}`);
      }

      // Ustvari naročnino pri zunanjem ponudniku
      const externalSubscription = await provider.createSubscription(subscriptionData);
      
      // Ustvari lokalno naročnino
      const subscription = new Subscription({
        ...subscriptionData,
        subscriptionId: this.generateSubscriptionId(),
        externalSubscriptionId: externalSubscription.id,
        customerId: externalSubscription.customerId,
        status: externalSubscription.status,
        currentPeriodStart: externalSubscription.currentPeriodStart,
        currentPeriodEnd: externalSubscription.currentPeriodEnd,
        nextPaymentDate: externalSubscription.nextPaymentDate
      });

      await subscription.save();

      // Posodobi licenco
      await this.updateLicenseFromSubscription(subscription);

      // Beleži dogodek
      await auditService.logPaymentEvent({
        type: 'subscription_created',
        subscriptionId: subscription.subscriptionId,
        clientId: subscription.clientId,
        amount: subscription.amount,
        currency: subscription.currency,
        provider: subscription.paymentProvider,
        metadata: {
          plan: subscription.plan,
          interval: subscription.interval
        }
      });

      return subscription;
    } catch (error) {
      await auditService.logSystemError('payment_service_error', {
        action: 'createSubscription',
        error: error.message,
        subscriptionData: this.sanitizeSubscriptionData(subscriptionData)
      });
      throw error;
    }
  }

  /**
   * Posodobi naročnino
   */
  async updateSubscription(subscriptionId, updateData) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Naročnina ni najdena');
      }

      const provider = this.providers[subscription.paymentProvider];
      
      // Posodobi pri zunanjem ponudniku
      const externalUpdate = await provider.updateSubscription(
        subscription.externalSubscriptionId,
        updateData
      );

      // Posodobi lokalno
      Object.assign(subscription, updateData, {
        lastSyncAt: new Date()
      });
      
      await subscription.save();

      // Posodobi licenco, če je potrebno
      if (updateData.plan || updateData.status) {
        await this.updateLicenseFromSubscription(subscription);
      }

      await auditService.logPaymentEvent({
        type: 'subscription_updated',
        subscriptionId: subscription.subscriptionId,
        clientId: subscription.clientId,
        changes: updateData,
        provider: subscription.paymentProvider
      });

      return subscription;
    } catch (error) {
      await auditService.logSystemError('payment_service_error', {
        action: 'updateSubscription',
        subscriptionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Prekliči naročnino
   */
  async cancelSubscription(subscriptionId, immediately = false) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Naročnina ni najdena');
      }

      const provider = this.providers[subscription.paymentProvider];
      
      // Prekliči pri zunanjem ponudniku
      await provider.cancelSubscription(subscription.externalSubscriptionId, immediately);

      // Posodobi lokalno
      subscription.cancel(immediately);
      await subscription.save();

      // Posodobi licenco
      if (immediately) {
        await this.deactivateLicense(subscription.clientId);
      }

      await auditService.logPaymentEvent({
        type: 'subscription_canceled',
        subscriptionId: subscription.subscriptionId,
        clientId: subscription.clientId,
        immediately,
        provider: subscription.paymentProvider
      });

      return subscription;
    } catch (error) {
      await auditService.logSystemError('payment_service_error', {
        action: 'cancelSubscription',
        subscriptionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Ponovno aktiviraj naročnino
   */
  async reactivateSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findOne({ subscriptionId });
      if (!subscription) {
        throw new Error('Naročnina ni najdena');
      }

      const provider = this.providers[subscription.paymentProvider];
      
      // Ponovno aktiviraj pri zunanjem ponudniku
      await provider.reactivateSubscription(subscription.externalSubscriptionId);

      // Posodobi lokalno
      subscription.reactivate();
      await subscription.save();

      // Posodobi licenco
      await this.updateLicenseFromSubscription(subscription);

      await auditService.logPaymentEvent({
        type: 'subscription_reactivated',
        subscriptionId: subscription.subscriptionId,
        clientId: subscription.clientId,
        provider: subscription.paymentProvider
      });

      return subscription;
    } catch (error) {
      await auditService.logSystemError('payment_service_error', {
        action: 'reactivateSubscription',
        subscriptionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obravnavaj webhook dogodke
   */
  async handleWebhook(provider, signature, payload) {
    try {
      const webhookSecret = this.webhookSecrets[provider];
      if (!webhookSecret) {
        throw new Error(`Webhook secret ni nastavljen za ${provider}`);
      }

      // Preveri podpis
      const isValid = await this.verifyWebhookSignature(provider, signature, payload, webhookSecret);
      if (!isValid) {
        throw new Error('Neveljaven webhook podpis');
      }

      const event = JSON.parse(payload);
      const providerHandler = this.providers[provider];
      
      return await providerHandler.handleWebhook(event);
    } catch (error) {
      await auditService.logSecurityEvent({
        type: 'webhook_verification_failed',
        provider,
        error: error.message,
        ip: 'webhook'
      });
      throw error;
    }
  }

  /**
   * Sinhroniziraj naročnine z zunanjimi ponudniki
   */
  async syncSubscriptions(provider = null) {
    try {
      const query = provider ? { paymentProvider: provider } : {};
      const subscriptions = await Subscription.find({
        ...query,
        status: { $in: ['active', 'trialing', 'past_due'] }
      });

      const results = {
        synced: 0,
        errors: 0,
        updated: 0
      };

      for (const subscription of subscriptions) {
        try {
          const providerHandler = this.providers[subscription.paymentProvider];
          const externalData = await providerHandler.getSubscription(
            subscription.externalSubscriptionId
          );

          let updated = false;
          
          // Preveri spremembe
          if (subscription.status !== externalData.status) {
            subscription.status = externalData.status;
            updated = true;
          }

          if (subscription.currentPeriodEnd.getTime() !== externalData.currentPeriodEnd.getTime()) {
            subscription.currentPeriodEnd = externalData.currentPeriodEnd;
            subscription.nextPaymentDate = externalData.nextPaymentDate;
            updated = true;
          }

          if (updated) {
            subscription.lastSyncAt = new Date();
            await subscription.save();
            await this.updateLicenseFromSubscription(subscription);
            results.updated++;
          }

          results.synced++;
        } catch (error) {
          console.error(`Napaka pri sinhronizaciji ${subscription.subscriptionId}:`, error);
          results.errors++;
        }
      }

      await auditService.logSystemEvent({
        type: 'subscriptions_synced',
        provider,
        results
      });

      return results;
    } catch (error) {
      await auditService.logSystemError('payment_service_error', {
        action: 'syncSubscriptions',
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Preveri zapadle naročnine in jih obnovi
   */
  async processRenewals() {
    try {
      const dueSubscriptions = await Subscription.findDueForRenewal(1);
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const subscription of dueSubscriptions) {
        try {
          const provider = this.providers[subscription.paymentProvider];
          const paymentResult = await provider.processPayment(subscription);

          subscription.recordPayment(paymentResult);
          await subscription.save();

          if (paymentResult.status === 'succeeded') {
            await this.updateLicenseFromSubscription(subscription);
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({
              subscriptionId: subscription.subscriptionId,
              error: paymentResult.error
            });
          }

          results.processed++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            subscriptionId: subscription.subscriptionId,
            error: error.message
          });
        }
      }

      await auditService.logSystemEvent({
        type: 'renewals_processed',
        results
      });

      return results;
    } catch (error) {
      await auditService.logSystemError('payment_service_error', {
        action: 'processRenewals',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stripe Provider
   */
  async stripeProvider() {
    return {
      createSubscription: async (data) => {
        const customer = await stripe.customers.create({
          email: data.customerInfo.email,
          name: data.customerInfo.name,
          metadata: { clientId: data.clientId }
        });

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: data.planId }],
          metadata: { clientId: data.clientId }
        });

        return {
          id: subscription.id,
          customerId: customer.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          nextPaymentDate: new Date(subscription.current_period_end * 1000)
        };
      },

      updateSubscription: async (subscriptionId, updateData) => {
        return await stripe.subscriptions.update(subscriptionId, updateData);
      },

      cancelSubscription: async (subscriptionId, immediately) => {
        return await stripe.subscriptions.del(subscriptionId, {
          prorate: !immediately
        });
      },

      reactivateSubscription: async (subscriptionId) => {
        return await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false
        });
      },

      getSubscription: async (subscriptionId) => {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          nextPaymentDate: new Date(subscription.current_period_end * 1000)
        };
      },

      processPayment: async (subscription) => {
        const invoice = await stripe.invoices.create({
          customer: subscription.customerId,
          subscription: subscription.externalSubscriptionId
        });

        const paidInvoice = await stripe.invoices.pay(invoice.id);
        
        return {
          status: paidInvoice.status === 'paid' ? 'succeeded' : 'failed',
          amount: paidInvoice.amount_paid / 100,
          error: paidInvoice.status !== 'paid' ? 'Payment failed' : null
        };
      },

      handleWebhook: async (event) => {
        switch (event.type) {
          case 'invoice.payment_succeeded':
            return await this.handlePaymentSucceeded(event.data.object);
          case 'invoice.payment_failed':
            return await this.handlePaymentFailed(event.data.object);
          case 'customer.subscription.updated':
            return await this.handleSubscriptionUpdated(event.data.object);
          case 'customer.subscription.deleted':
            return await this.handleSubscriptionDeleted(event.data.object);
          default:
            console.log(`Neobravnavan Stripe dogodek: ${event.type}`);
        }
      }
    };
  }

  /**
   * Napredna Stripe integracija z dodatnimi funkcionalnostmi
   */
  async stripeProvider(action, data) {
    switch (action) {
      case 'createSubscription':
        return await this.createStripeSubscription(data);
      case 'createPayment':
        return await this.createStripePayment(data);
      case 'createCustomer':
        return await this.createStripeCustomer(data);
      case 'updatePaymentMethod':
        return await this.updateStripePaymentMethod(data);
      case 'handleWebhook':
        return await this.handleStripeWebhook(data);
      default:
        throw new Error(`Nepodprta Stripe akcija: ${action}`);
    }
  }

  /**
   * Ustvari Stripe stranko z naprednimi možnostmi
   */
  async createStripeCustomer(customerData) {
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        metadata: {
          userId: customerData.userId,
          licenseType: customerData.licenseType,
          registrationDate: new Date().toISOString()
        },
        tax_exempt: customerData.taxExempt ? 'exempt' : 'none',
        preferred_locales: [customerData.locale || 'sl']
      });

      // Dodaj plačilno metodo, če je podana
      if (customerData.paymentMethodId) {
        await stripe.paymentMethods.attach(customerData.paymentMethodId, {
          customer: customer.id
        });

        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: customerData.paymentMethodId
          }
        });
      }

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: new Date(customer.created * 1000)
      };
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju Stripe stranke:', error);
      throw error;
    }
  }

  /**
   * Ustvari Stripe plačilo z naprednimi možnostmi
   */
  async createStripePayment(paymentData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Pretvori v cente
        currency: paymentData.currency || 'eur',
        customer: paymentData.customerId,
        description: paymentData.description,
        metadata: {
          licenseId: paymentData.licenseId,
          licenseType: paymentData.licenseType,
          userId: paymentData.userId,
          orderId: paymentData.orderId
        },
        automatic_payment_methods: {
          enabled: true
        },
        receipt_email: paymentData.receiptEmail,
        setup_future_usage: paymentData.savePaymentMethod ? 'off_session' : null,
        application_fee_amount: paymentData.applicationFee ? Math.round(paymentData.applicationFee * 100) : null,
        transfer_data: paymentData.transferAccount ? {
          destination: paymentData.transferAccount
        } : null
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      };
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju Stripe plačila:', error);
      throw error;
    }
  }

  /**
   * Ustvari Stripe naročnino z naprednimi možnostmi
   */
  async createStripeSubscription(subscriptionData) {
    try {
      // Najprej ustvari ceno, če ne obstaja
      let priceId = subscriptionData.priceId;
      
      if (!priceId) {
        const price = await stripe.prices.create({
          unit_amount: Math.round(subscriptionData.amount * 100),
          currency: subscriptionData.currency || 'eur',
          recurring: {
            interval: subscriptionData.interval || 'month',
            interval_count: subscriptionData.intervalCount || 1
          },
          product_data: {
            name: subscriptionData.productName || `Licenca ${subscriptionData.licenseType}`,
            description: subscriptionData.productDescription,
            metadata: {
              licenseType: subscriptionData.licenseType
            }
          },
          metadata: {
            licenseType: subscriptionData.licenseType,
            features: JSON.stringify(subscriptionData.features || [])
          }
        });
        priceId = price.id;
      }

      // Ustvari naročnino
      const subscription = await stripe.subscriptions.create({
        customer: subscriptionData.customerId,
        items: [{
          price: priceId,
          quantity: subscriptionData.quantity || 1
        }],
        metadata: {
          userId: subscriptionData.userId,
          licenseType: subscriptionData.licenseType,
          licenseId: subscriptionData.licenseId
        },
        trial_period_days: subscriptionData.trialDays,
        proration_behavior: subscriptionData.prorationBehavior || 'create_prorations',
        collection_method: subscriptionData.collectionMethod || 'charge_automatically',
        days_until_due: subscriptionData.daysUntilDue,
        default_payment_method: subscriptionData.paymentMethodId,
        expand: ['latest_invoice.payment_intent']
      });

      return {
        id: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        nextPaymentDate: new Date(subscription.current_period_end * 1000),
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        priceId: priceId
      };
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju Stripe naročnine:', error);
      throw error;
    }
  }

  /**
   * Posodobi Stripe plačilno metodo
   */
  async updateStripePaymentMethod(data) {
    try {
      const { customerId, paymentMethodId, setAsDefault } = data;

      // Pripni plačilno metodo na stranko
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      // Nastavi kot privzeto, če je zahtevano
      if (setAsDefault) {
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      return {
        success: true,
        paymentMethodId,
        isDefault: setAsDefault
      };
    } catch (error) {
      console.error('❌ Napaka pri posodabljanju Stripe plačilne metode:', error);
      throw error;
    }
  }

  /**
   * Obdelaj Stripe webhook
   */
  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object, 'stripe');
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object, 'stripe');
          break;
        
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSuccess(event.data.object, 'stripe');
          break;
        
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailure(event.data.object, 'stripe');
          break;
        
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object, 'stripe');
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object, 'stripe');
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object, 'stripe');
          break;
        
        case 'setup_intent.succeeded':
          await this.handleSetupIntentSuccess(event.data.object, 'stripe');
          break;

        default:
          console.log(`🔔 Neobdelan Stripe webhook: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('❌ Napaka pri obdelavi Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Napredna PayPal integracija
   */
  async paypalProvider(action, data) {
    switch (action) {
      case 'createSubscription':
        return await this.createPayPalSubscription(data);
      case 'createPayment':
        return await this.createPayPalPayment(data);
      case 'handleWebhook':
        return await this.handlePayPalWebhook(data);
      default:
        throw new Error(`Nepodprta PayPal akcija: ${action}`);
    }
  }

  /**
   * Ustvari PayPal plačilo
   */
  async createPayPalPayment(paymentData) {
    try {
      // PayPal implementacija bi bila tukaj
      // Za zdaj vrnemo mock podatke
      return {
        id: `PAYPAL_${Date.now()}`,
        approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK_TOKEN`,
        status: 'CREATED'
      };
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju PayPal plačila:', error);
      throw error;
    }
  }

  /**
   * Ustvari PayPal naročnino
   */
  async createPayPalSubscription(subscriptionData) {
    try {
      // PayPal naročnina implementacija
      return {
        id: `PAYPAL_SUB_${Date.now()}`,
        status: 'APPROVAL_PENDING',
        approvalUrl: `https://www.sandbox.paypal.com/webapps/billing/subscriptions/subscribe?ba_token=MOCK_TOKEN`
      };
    } catch (error) {
      console.error('❌ Napaka pri ustvarjanju PayPal naročnine:', error);
      throw error;
    }
  }

  /**
   * Obdelaj PayPal webhook
   */
  async handlePayPalWebhook(event) {
    try {
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentSuccess(event.resource, 'paypal');
          break;
        
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentFailure(event.resource, 'paypal');
          break;
        
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handleSubscriptionCreated(event.resource, 'paypal');
          break;
        
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handleSubscriptionCancelled(event.resource, 'paypal');
          break;

        default:
          console.log(`🔔 Neobdelan PayPal webhook: ${event.event_type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('❌ Napaka pri obdelavi PayPal webhook:', error);
      throw error;
    }
  }

  /**
   * Obdelaj uspešno plačilo
   */
  async handlePaymentSuccess(paymentObject, provider) {
    try {
      console.log(`✅ Uspešno plačilo (${provider}):`, paymentObject.id);
      
      // Najdi povezano naročnino ali licenco
      const metadata = paymentObject.metadata || {};
      
      if (metadata.licenseId) {
        // Aktiviraj licenco
        await this.activateLicense(metadata.licenseId, paymentObject);
      }
      
      if (metadata.subscriptionId) {
        // Posodobi naročnino
        await this.updateSubscriptionStatus(metadata.subscriptionId, 'active');
      }

      // Zabeleži v audit trail
      await auditService.logEvent({
        action: 'PAYMENT_SUCCESS',
        resource: 'payment',
        resourceId: paymentObject.id,
        metadata: {
          provider,
          amount: paymentObject.amount,
          currency: paymentObject.currency
        }
      });

    } catch (error) {
      console.error('❌ Napaka pri obdelavi uspešnega plačila:', error);
    }
  }

  /**
   * Obdelaj neuspešno plačilo
   */
  async handlePaymentFailure(paymentObject, provider) {
    try {
      console.log(`❌ Neuspešno plačilo (${provider}):`, paymentObject.id);
      
      const metadata = paymentObject.metadata || {};
      
      if (metadata.subscriptionId) {
        // Označi naročnino kot neaktivno
        await this.updateSubscriptionStatus(metadata.subscriptionId, 'past_due');
      }

      // Pošlji obvestilo stranki
      await this.sendPaymentFailureNotification(paymentObject);

      // Zabeleži v audit trail
      await auditService.logEvent({
        action: 'PAYMENT_FAILURE',
        resource: 'payment',
        resourceId: paymentObject.id,
        metadata: {
          provider,
          reason: paymentObject.failure_reason || 'Unknown'
        }
      });

    } catch (error) {
      console.error('❌ Napaka pri obdelavi neuspešnega plačila:', error);
    }
  }

// ... existing code ...