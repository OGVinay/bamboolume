/**
 * BAMBOOLUME Checkout Flow Engine (Routes directly to Official Shopify & CJ Checkout)
 */

class CheckoutManager {
  constructor() {
    this.currentStep = 1;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Open/Close triggers
    document.getElementById('proceed-checkout-btn')?.addEventListener('click', () => this.openCheckout());
    document.getElementById('close-checkout-btn')?.addEventListener('click', () => this.closeCheckout());

    // Step navigation
    document.getElementById('to-step-2')?.addEventListener('click', () => {
      const form = document.getElementById('step-1-form');
      if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      this.goToStep(2);
    });
    document.getElementById('back-to-step-1')?.addEventListener('click', () => this.goToStep(1));

    // Official Shopify & CJ Dropshipping Checkout Trigger
    document.getElementById('shopify-checkout-btn')?.addEventListener('click', () => {
      if (!window.cart || window.cart.cart.length === 0) {
        window.showToast('Your cart is empty!', 'info');
        return;
      }
      const customer = {
        name: document.getElementById('cust-name')?.value || '',
        email: document.getElementById('cust-email')?.value || '',
        address: document.getElementById('cust-addr')?.value || '',
        city: document.getElementById('cust-city')?.value || '',
        zip: document.getElementById('cust-zip')?.value || ''
      };
      if (window.shopifyIntegration) {
        window.shopifyIntegration.proceedToCheckout(window.cart.cart, customer);
      } else {
        window.showToast('Checkout service is still loading. Please try again.', 'info');
      }
    });

    // Quick Checkout CTA in Cart Drawer routes directly to Shopify Checkout
    document.getElementById('cart-paypal-express-btn')?.addEventListener('click', () => {
      if (!window.cart || window.cart.cart.length === 0) {
        window.showToast('Your cart is empty!', 'info');
        return;
      }
      if (window.shopifyIntegration) {
        window.shopifyIntegration.proceedToCheckout(window.cart.cart);
      } else {
        this.openCheckout(2);
      }
    });

    // Close on overlay backdrop click
    document.getElementById('checkout-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'checkout-modal-overlay') this.closeCheckout();
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

  openCheckout(startAtStep = 1) {
    if (!window.cart || window.cart.cart.length === 0) {
      window.showToast('Your cart is empty!', 'info');
      return;
    }

    window.cart.closeCartDrawer();
    document.getElementById('checkout-modal-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.goToStep(startAtStep);

    const { total } = window.cart.getTotals();
    const finalAmtEl = document.getElementById('checkout-final-amount');
    if (finalAmtEl) finalAmtEl.textContent = `$${total.toFixed(2)}`;
  }

  closeCheckout() {
    document.getElementById('checkout-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  goToStep(step) {
    this.currentStep = step;

    document.querySelectorAll('.step-indicator .step').forEach(el => {
      const s = parseInt(el.getAttribute('data-step'), 10);
      el.classList.toggle('active', s <= step);
    });

    document.getElementById('step-1-form')?.classList.toggle('hidden', step !== 1);
    document.getElementById('step-2-panel')?.classList.toggle('hidden', step !== 2);
    document.getElementById('step-3-panel')?.classList.toggle('hidden', step !== 3);

    if (window.lucide) window.lucide.createIcons();
  }
}

// Global Checkout Manager Instance
window.checkoutManager = new CheckoutManager();
