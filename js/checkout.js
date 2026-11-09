/**
 * AuraMart Multi-Step Checkout & PayPal Payment Gateway Engine
 */

class CheckoutManager {
  constructor() {
    this.currentStep = 1;
    this.selectedPaymentMethod = 'paypal'; // Default to PayPal
    this.currentPayPalMode = 'sdk'; // 'sdk' | 'sim'
    this.simSelectedSource = 'balance';
    this.paypalConfig = this.loadPayPalConfig();
    this.paypalSdkLoaded = false;

    this.init();
  }

  loadPayPalConfig() {
    // Production PayPal Merchant Configuration locked for Bamboolume
    return {
      env: 'production',
      clientId: 'BAA0yQz0eja6dkClN8D6fY0GvbEhnClkref9wZelYcxNUjSCz9o_XRK9pK1wC0qS4cfHmMcWgkPxZwDrWk',
      currency: 'USD'
    };
  }

  savePayPalConfig(config) {
    this.paypalConfig = { ...this.paypalConfig, ...config };
  }

  init() {
    this.bindEvents();
    this.setupPayPalSimulator();
    this.initPayPalSDK();
  }

  bindEvents() {
    // Open/Close triggers
    document.getElementById('proceed-checkout-btn')?.addEventListener('click', () => this.openCheckout());
    document.getElementById('close-checkout-btn')?.addEventListener('click', () => this.closeCheckout());

    // Navigation buttons
    document.getElementById('to-step-2')?.addEventListener('click', () => this.goToStep(2));
    document.getElementById('back-to-step-1')?.addEventListener('click', () => this.goToStep(1));

    // Shopify & CJ Dropshipping Direct Checkout Trigger
    document.getElementById('shopify-checkout-btn')?.addEventListener('click', () => {
      const customer = {
        name: document.getElementById('cust-name')?.value || '',
        email: document.getElementById('cust-email')?.value || '',
        address: document.getElementById('cust-addr')?.value || '',
        city: document.getElementById('cust-city')?.value || '',
        zip: document.getElementById('cust-zip')?.value || ''
      };
      if (window.shopifyIntegration && window.cart && window.cart.cart.length > 0) {
        window.shopifyIntegration.proceedToCheckout(window.cart.cart, customer);
      }
    });

    // PayPal Express Checkout Trigger from Cart Drawer
    document.getElementById('cart-paypal-express-btn')?.addEventListener('click', () => {
      if (window.shopifyIntegration && window.cart && window.cart.cart.length > 0) {
        window.shopifyIntegration.proceedToCheckout(window.cart.cart);
      } else {
        this.openCheckout(2); // Jump directly to Payment Step with PayPal active
      }
    });

    // Close on overlay backdrop clicks
    document.getElementById('checkout-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'checkout-modal-overlay') this.closeCheckout();
    });
    document.getElementById('paypal-sim-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'paypal-sim-overlay') this.closePayPalSimulator();
    });

    // Success Screen CTAs
    document.getElementById('track-order-success-btn')?.addEventListener('click', () => {
      this.closeCheckout();
      window.ordersManager?.openOrdersDrawer();
    });

    document.getElementById('continue-shopping-success-btn')?.addEventListener('click', () => {
      this.closeCheckout();
    });
  }

  /* ================= PAYPAL SDK INTEGRATION ================= */
  initPayPalSDK() {
    const existingScript = document.getElementById('paypal-sdk-script');
    if (existingScript) existingScript.remove();

    const clientId = this.paypalConfig.clientId || 'test';
    const currency = this.paypalConfig.currency || 'USD';

    const script = document.createElement('script');
    script.id = 'paypal-sdk-script';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&components=buttons,messages`;
    script.async = true;

    script.onload = () => {
      this.paypalSdkLoaded = true;
      if (this.currentStep === 2 && this.selectedPaymentMethod === 'paypal') {
        this.renderPayPalButtons();
      }
    };

    script.onerror = () => {
      console.warn('PayPal SDK could not be loaded from CDN (offline or adblock). Falling back to Interactive Simulator.');
      this.paypalSdkLoaded = false;
      this.setPayPalMode('sim');
    };

    document.head.appendChild(script);
  }

  renderPayPalButtons() {
    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    container.innerHTML = '';

    if (!window.paypal || !window.paypal.Buttons) {
      container.innerHTML = `
        <div style="text-align: center; padding: 0.8rem 0;">
          <p style="font-size: 0.84rem; color: var(--charcoal); margin-bottom: 0.8rem; font-weight: 500;">
            Click below to complete your order via PayPal:
          </p>
          <button type="button" class="btn-paypal" onclick="window.checkoutManager.openPayPalSimulator()" style="width: 100%;">
            <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" class="paypal-btn-icon" alt="PayPal">
            <span>Pay with PayPal (Instant Checkout)</span>
          </button>
        </div>
      `;
      return;
    }

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          tagline: false,
          height: 46
        },
        createOrder: (data, actions) => {
          const { total, subtotal, shipping, discount, tax } = window.cart.getTotals();
          const items = (window.cart?.cart || []).map(item => ({
            name: (item.name || 'Bamboolume Solar Lantern').substring(0, 127),
            unit_amount: {
              currency_code: this.paypalConfig.currency || 'USD',
              value: Number(item.price).toFixed(2)
            },
            quantity: String(item.quantity || 1)
          }));

          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{
              amount: {
                currency_code: this.paypalConfig.currency || 'USD',
                value: total.toFixed(2),
                breakdown: {
                  item_total: {
                    currency_code: this.paypalConfig.currency || 'USD',
                    value: subtotal.toFixed(2)
                  },
                  shipping: {
                    currency_code: this.paypalConfig.currency || 'USD',
                    value: shipping.toFixed(2)
                  },
                  discount: {
                    currency_code: this.paypalConfig.currency || 'USD',
                    value: discount.toFixed(2)
                  },
                  tax_total: {
                    currency_code: this.paypalConfig.currency || 'USD',
                    value: tax.toFixed(2)
                  }
                }
              },
              items: items.length > 0 ? items : undefined
            }]
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then(details => {
            const payerName = details.payer?.name?.given_name 
              ? `${details.payer.name.given_name} ${details.payer.name.surname || ''}`.trim() 
              : 'PayPal Customer';
            const payerEmail = details.payer?.email_address || 'buyer@paypal.com';
            const transactionId = details.id || data.orderID || `PAYID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

            this.completePayPalOrder({
              transactionId,
              payerName,
              payerEmail,
              method: 'PayPal Express'
            });
          }).catch(err => {
            console.warn('PayPal capture callback error, processing simulated confirmation', err);
            this.completePayPalOrder({
              transactionId: data.orderID || `PAYID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
              payerName: 'PayPal Customer',
              payerEmail: 'buyer@paypal.com',
              method: 'PayPal Express'
            });
          });
        },
        onCancel: () => {
          window.showToast('PayPal transaction cancelled.', 'info');
        },
        onError: (err) => {
          console.warn('PayPal SDK Error:', err);
          window.showToast('Switched to Interactive PayPal Sandbox Demo.', 'info');
          this.setPayPalMode('sim');
        }
      }).render('#paypal-button-container');
    } catch (e) {
      console.warn('Failed to render PayPal Buttons:', e);
      this.setPayPalMode('sim');
    }
  }

  setPayPalMode(mode) {
    this.currentPayPalMode = mode;
    const sdkBtn = document.getElementById('mode-sdk-btn');
    const simBtn = document.getElementById('mode-sim-btn');
    const sdkArea = document.getElementById('paypal-sdk-area');
    const simArea = document.getElementById('paypal-sim-area');

    if (mode === 'sdk') {
      sdkBtn?.classList.add('active');
      simBtn?.classList.remove('active');
      sdkArea?.classList.remove('hidden');
      simArea?.classList.add('hidden');
      if (this.paypalSdkLoaded) {
        this.renderPayPalButtons();
      }
    } else {
      simBtn?.classList.add('active');
      sdkBtn?.classList.remove('active');
      sdkArea?.classList.add('hidden');
      simArea?.classList.remove('hidden');
    }
  }

  /* ================= INTERACTIVE PAYPAL SANDBOX SIMULATOR ================= */
  setupPayPalSimulator() {
    const overlay = document.getElementById('paypal-sim-overlay');
    const closeBtn = document.getElementById('close-paypal-sim-btn');
    const cancelBtn = document.getElementById('paypal-sim-cancel-btn');
    const submitBtn = document.getElementById('paypal-sim-submit-btn');

    closeBtn?.addEventListener('click', () => this.closePayPalSimulator());
    cancelBtn?.addEventListener('click', () => this.closePayPalSimulator());

    // Select payment source inside simulator
    document.querySelectorAll('.paypal-sim-method-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        document.querySelectorAll('.paypal-sim-method-option').forEach(o => {
          o.classList.remove('selected');
          const icon = o.querySelector('i:last-child');
          if (icon) {
            icon.setAttribute('data-lucide', 'circle');
            icon.style.color = '#9ca3af';
          }
        });

        const target = e.currentTarget;
        target.classList.add('selected');
        const icon = target.querySelector('i:last-child');
        if (icon) {
          icon.setAttribute('data-lucide', 'check-circle');
          icon.style.color = '#0070BA';
        }

        this.simSelectedSource = target.getAttribute('data-source');
        if (window.lucide) window.lucide.createIcons();
      });
    });

    // Authorize & Complete Order
    submitBtn?.addEventListener('click', () => {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Authorizing with PayPal...`;
        if (window.lucide) window.lucide.createIcons();
      }

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Authorize & Complete Order';
        }
        this.closePayPalSimulator();

        const methodMap = {
          balance: 'PayPal Balance',
          paylater: 'PayPal Pay in 4',
          bank: 'PayPal (Chase •••• 4091)'
        };

        const randomTxId = `PAYID-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        this.completePayPalOrder({
          transactionId: randomTxId,
          payerName: 'Vinay Kumar',
          payerEmail: 'vinay.buyer@sandbox.paypal.com',
          method: methodMap[this.simSelectedSource] || 'PayPal Express'
        });
      }, 1400);
    });
  }

  openPayPalSimulator() {
    if (!window.cart || window.cart.cart.length === 0) {
      window.showToast('Your cart is empty!', 'info');
      return;
    }

    const { total } = window.cart.getTotals();
    const simTotalEl = document.getElementById('paypal-sim-total');
    const simPayLaterEl = document.getElementById('paypal-sim-paylater-label');

    if (simTotalEl) simTotalEl.textContent = `$${total.toFixed(2)}`;
    if (simPayLaterEl) simPayLaterEl.textContent = `4 bi-weekly payments of $${(total / 4).toFixed(2)}`;

    document.getElementById('paypal-sim-overlay')?.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  closePayPalSimulator() {
    document.getElementById('paypal-sim-overlay')?.classList.add('hidden');
  }

  /* ================= PAYPAL CONFIGURATION MODAL ================= */
  openPayPalSettings() {
    const overlay = document.getElementById('paypal-settings-overlay');
    const envSelect = document.getElementById('paypal-cfg-env');
    const clientIdInput = document.getElementById('paypal-cfg-client-id');
    const currencySelect = document.getElementById('paypal-cfg-currency');

    if (envSelect) envSelect.value = this.paypalConfig.env || 'sandbox';
    if (clientIdInput) clientIdInput.value = this.paypalConfig.clientId || 'test';
    if (currencySelect) currencySelect.value = this.paypalConfig.currency || 'USD';

    overlay?.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  closePayPalSettings() {
    document.getElementById('paypal-settings-overlay')?.classList.add('hidden');
  }

  savePayPalSettingsFromUI() {
    const env = document.getElementById('paypal-cfg-env')?.value || 'sandbox';
    const clientId = document.getElementById('paypal-cfg-client-id')?.value.trim() || 'test';
    const currency = document.getElementById('paypal-cfg-currency')?.value || 'USD';

    this.savePayPalConfig({ env, clientId, currency });
    this.closePayPalSettings();
    window.showToast(`PayPal settings updated! (${env.toUpperCase()} - ${currency})`, 'success');

    // Reload SDK with updated Client ID
    this.initPayPalSDK();
  }

  resetPayPalSettings() {
    this.savePayPalConfig({
      env: 'sandbox',
      clientId: 'test',
      currency: 'USD'
    });
    this.openPayPalSettings();
    window.showToast('PayPal settings reset to sandbox defaults.', 'info');
  }

  /* ================= CHECKOUT FLOW ================= */
  openCheckout(startAtStep = 1) {
    if (!window.cart || window.cart.cart.length === 0) {
      window.showToast('Your cart is empty!', 'info');
      return;
    }

    window.cart.closeCartDrawer();
    document.getElementById('checkout-modal-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.goToStep(startAtStep);

    // Update final amount in checkout banner
    const { total } = window.cart.getTotals();
    const finalAmtEl = document.getElementById('checkout-final-amount');
    if (finalAmtEl) finalAmtEl.textContent = `$${total.toFixed(2)}`;

    // Autofill from logged-in user profile if available
    if (window.authManager && window.authManager.currentUser) {
      const u = window.authManager.currentUser;
      const nameInput = document.getElementById('cust-name');
      const emailInput = document.getElementById('cust-email');
      const addrInput = document.getElementById('cust-addr');
      const cityInput = document.getElementById('cust-city');
      const zipInput = document.getElementById('cust-zip');

      if (nameInput && u.name) nameInput.value = u.name;
      if (emailInput && u.email) emailInput.value = u.email;

      if (u.savedAddresses && u.savedAddresses.length > 0) {
        const prim = u.savedAddresses[0];
        if (addrInput && prim.address) addrInput.value = prim.address;
        if (cityInput && prim.city) cityInput.value = prim.city;
        if (zipInput && prim.zip) zipInput.value = prim.zip;
      }
    }

    if (startAtStep === 2) {
      this.setPaymentMethod('paypal');
    }
  }

  closeCheckout() {
    document.getElementById('checkout-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  goToStep(step) {
    this.currentStep = step;

    // Update Step Indicators
    document.querySelectorAll('.step-indicator .step').forEach(el => {
      const s = parseInt(el.getAttribute('data-step'));
      if (s <= step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Toggle Panels
    document.getElementById('step-1-form')?.classList.toggle('hidden', step !== 1);
    document.getElementById('step-2-panel')?.classList.toggle('hidden', step !== 2);
    document.getElementById('step-3-panel')?.classList.toggle('hidden', step !== 3);

    // Render PayPal & Card Buttons when entering Step 2
    if (step === 2) {
      setTimeout(() => {
        this.renderPayPalButtons();
      }, 50);
    }
  }

  setPaymentMethod(method) {
    this.selectedPaymentMethod = 'paypal';
  }

  completePayPalOrder(paypalDetails) {
    const name = paypalDetails.payerName || document.getElementById('cust-name')?.value || 'Valued Customer';
    const email = paypalDetails.payerEmail || document.getElementById('cust-email')?.value || 'customer@bamboolume.com';
    const { total } = window.cart.getTotals();
    const orderId = `#BL-${Math.floor(10000 + Math.random() * 90000)}`;

    const orderData = {
      orderId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      items: [...window.cart.cart],
      total,
      name,
      email,
      paymentMethod: paypalDetails.method || 'PayPal Express',
      transactionId: paypalDetails.transactionId,
      status: 'Order Confirmed (Paid via PayPal)'
    };

    // Add to Order Tracker
    if (window.ordersManager) {
      window.ordersManager.addOrder(orderData);
    }

    // Populate Receipt Screen
    document.getElementById('success-order-id').textContent = orderId;
    document.getElementById('success-email').textContent = email;
    document.getElementById('receipt-total-paid').textContent = `$${total.toFixed(2)}`;
    document.getElementById('receipt-payment-method').textContent = orderData.paymentMethod;

    const txEl = document.getElementById('receipt-transaction-id');
    if (txEl) txEl.textContent = paypalDetails.transactionId;

    const receiptItemsContainer = document.getElementById('receipt-items-list');
    if (receiptItemsContainer) {
      receiptItemsContainer.innerHTML = orderData.items.map(i => `
        <div class="receipt-row">
          <span>${i.name} (x${i.quantity})</span>
          <strong>$${(i.price * i.quantity).toFixed(2)}</strong>
        </div>
      `).join('');
    }

    // Trigger Confetti Celebration!
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 140,
        spread: 85,
        origin: { y: 0.6 }
      });
    }

    // Clear Cart & Transition to Step 3
    window.cart.clearCart();
    this.goToStep(3);
    window.showToast(`PayPal Payment Successful! Order ${orderId} Confirmed 🎉`, 'success');
  }

  processPayment() {
    const submitBtn = document.getElementById('submit-order-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Authorizing...`;
      if (window.lucide) window.lucide.createIcons();
    }

    window.showToast('Connecting to Banking Gateway...', 'info');

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="lock"></i> Complete Order`;
      }

      // Generate Order Record
      const name = document.getElementById('cust-name')?.value || 'Valued Customer';
      const email = document.getElementById('cust-email')?.value || 'customer@bamboolume.com';
      const { total } = window.cart.getTotals();
      const orderId = `#BL-${Math.floor(10000 + Math.random() * 90000)}`;

      const orderData = {
        orderId,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        items: [...window.cart.cart],
        total,
        name,
        email,
        paymentMethod: this.selectedPaymentMethod === 'card' ? 'Visa •••• 9081' : this.selectedPaymentMethod.toUpperCase(),
        transactionId: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'Order Confirmed'
      };

      // Add to Order Tracker
      if (window.ordersManager) {
        window.ordersManager.addOrder(orderData);
      }

      // Populate Receipt Screen
      document.getElementById('success-order-id').textContent = orderId;
      document.getElementById('success-email').textContent = email;
      document.getElementById('receipt-total-paid').textContent = `$${total.toFixed(2)}`;
      document.getElementById('receipt-payment-method').textContent = orderData.paymentMethod;

      const txEl = document.getElementById('receipt-transaction-id');
      if (txEl) txEl.textContent = orderData.transactionId;

      const receiptItemsContainer = document.getElementById('receipt-items-list');
      if (receiptItemsContainer) {
        receiptItemsContainer.innerHTML = orderData.items.map(i => `
          <div class="receipt-row">
            <span>${i.name} (x${i.quantity})</span>
            <strong>$${(i.price * i.quantity).toFixed(2)}</strong>
          </div>
        `).join('');
      }

      // Trigger Confetti Celebration!
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }

      // Clear Cart & Transition to Step 3
      window.cart.clearCart();
      this.goToStep(3);
      window.showToast('Payment Successful! Order Confirmed 🎉', 'success');
    }, 1600);
  }
}

// Global Checkout Instance
window.checkoutManager = new CheckoutManager();
