/**
 * AuraMart Shopping Cart & Coupon Engine
 */

class CartManager {
  constructor() {
    this.cartKey = 'bamboolume_cart_v1';
    this.promoKey = 'bamboolume_promo_v1';
    this.cart = this.loadCart();
    this.appliedPromo = this.loadPromo();
    this.freeShippingGoal = 100.00; // Free shipping above $100

    this.init();
  }

  loadCart() {
    try {
      const data = localStorage.getItem(this.cartKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load cart', e);
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem(this.cartKey, JSON.stringify(this.cart));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
    this.updateCartUI();
  }

  loadPromo() {
    try {
      const data = localStorage.getItem(this.promoKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  savePromo(promo) {
    this.appliedPromo = promo;
    if (promo) {
      localStorage.setItem(this.promoKey, JSON.stringify(promo));
    } else {
      localStorage.removeItem(this.promoKey);
    }
    this.updateCartUI();
  }

  init() {
    this.bindEvents();
    this.updateCartUI();
  }

  getDrawerOverlay() {
    return document.getElementById('cart-drawer-overlay');
  }

  bindEvents() {
    // Cart open/close triggers
    document.getElementById('cart-btn')?.addEventListener('click', () => this.openCartDrawer());
    document.getElementById('close-cart-btn')?.addEventListener('click', () => this.closeCartDrawer());
    this.getDrawerOverlay()?.addEventListener('click', (e) => {
      if (e.target === this.getDrawerOverlay()) this.closeCartDrawer();
    });
    document.getElementById('cart-start-shopping')?.addEventListener('click', () => this.closeCartDrawer());

    // Promo code form
    document.getElementById('apply-promo-btn')?.addEventListener('click', () => this.applyPromoCode());
    document.getElementById('remove-promo-btn')?.addEventListener('click', () => this.removePromoCode());
  }

  openCartDrawer() {
    this.getDrawerOverlay()?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.updateCartUI();
  }

  closeCartDrawer() {
    this.getDrawerOverlay()?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  addItem(product, quantity = 1, selectedColor = null, selectedSize = null, customPrice = null, customImage = null, comboInfo = null) {
    const finalPrice = customPrice !== null ? Number(customPrice) : Number(product.price);
    const finalImage = customImage || product.image;
    const finalColor = selectedColor || (product.variants?.colors?.[0] || null);
    const finalSize = selectedSize || null;
    
    let displayName = product.name;
    if (finalSize) displayName += ` - ${finalSize}`;
    if (comboInfo && comboInfo.qty > 1) displayName += ` (Combo of ${comboInfo.qty})`;

    const existingIndex = this.cart.findIndex(
      item => item.id === product.id && 
              item.selectedColor === finalColor && 
              item.selectedSize === finalSize &&
              (item.comboInfo ? item.comboInfo.qty : 1) === (comboInfo ? comboInfo.qty : 1)
    );

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += quantity;
    } else {
      this.cart.push({
        id: product.id,
        name: displayName,
        baseName: product.name,
        price: finalPrice,
        image: finalImage,
        category: product.category,
        quantity: quantity,
        selectedColor: finalColor,
        selectedSize: finalSize,
        comboInfo: comboInfo
      });
    }

    this.saveCart();
    window.showToast(`Added "${displayName}" to cart!`, 'success');
  }

  updateQuantity(index, change) {
    if (index >= 0 && index < this.cart.length) {
      this.cart[index].quantity += change;
      if (this.cart[index].quantity <= 0) {
        this.cart.splice(index, 1);
      }
      this.saveCart();
    }
  }

  removeItem(index) {
    if (index >= 0 && index < this.cart.length) {
      const removed = this.cart.splice(index, 1)[0];
      this.saveCart();
      window.showToast(`Removed "${removed.name}"`, 'info');
    }
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }

  applyPromoCode() {
    const input = document.getElementById('promo-code-input');
    const code = input?.value.trim().toUpperCase();

    if (!code) return;

    if (code === 'NATURE15') {
      this.savePromo({ code: 'NATURE15', discount: 0.15, label: '15% OFF Botanical Coupon' });
      window.showToast('Promo NATURE15 applied! 15% discount added.', 'success');
    } else if (code === 'SOLAR20') {
      this.savePromo({ code: 'SOLAR20', discount: 0.20, label: '20% OFF Solar Special' });
      window.showToast('Promo SOLAR20 applied! 20% discount added.', 'success');
    } else if (code === 'FREESHIP') {
      this.savePromo({ code: 'FREESHIP', discount: 0, freeShipping: true, label: 'Free Carbon-Neutral Shipping' });
      window.showToast('Free shipping promo applied!', 'success');
    } else {
      window.showToast('Invalid promo code. Try NATURE15 or SOLAR20', 'info');
    }
    if (input) input.value = '';
  }

  removePromoCode() {
    this.savePromo(null);
    window.showToast('Promo code removed', 'info');
  }

  getTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let discount = 0;
    if (this.appliedPromo && this.appliedPromo.discount) {
      discount = subtotal * this.appliedPromo.discount;
    }

    const shipping = (subtotal >= this.freeShippingGoal || (this.appliedPromo && this.appliedPromo.freeShipping)) || subtotal === 0 ? 0 : 15.00;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * 0.08;
    const total = taxableAmount + shipping + tax;
    const itemCount = this.cart.reduce((sum, item) => sum + (item.comboInfo && item.comboInfo.qty ? (item.comboInfo.qty * item.quantity) : item.quantity), 0);

    return {
      subtotal,
      discount,
      shipping,
      tax,
      total,
      itemCount
    };
  }

  updateCartUI() {
    const { subtotal, discount, shipping, tax, total, itemCount } = this.getTotals();

    // Update Badge Counter
    const cartCountEl = document.getElementById('cart-count');
    const cartDrawerCountEl = document.getElementById('cart-drawer-count');
    if (cartCountEl) cartCountEl.textContent = itemCount;
    if (cartDrawerCountEl) cartDrawerCountEl.textContent = `(${itemCount})`;

    // Shipping Goal Progress Bar
    const progressText = document.getElementById('shipping-progress-text');
    const progressBar = document.getElementById('shipping-progress-bar');
    if (progressText && progressBar) {
      if (subtotal >= this.freeShippingGoal) {
        progressText.innerHTML = '🎉 You unlocked <strong>FREE Express Shipping!</strong>';
        progressBar.style.width = '100%';
      } else {
        const remaining = (this.freeShippingGoal - subtotal).toFixed(2);
        const percent = Math.min(100, (subtotal / this.freeShippingGoal) * 100);
        progressText.innerHTML = `Add <strong>$${remaining}</strong> more for FREE Express Shipping!`;
        progressBar.style.width = `${percent}%`;
      }
    }

    // Render Cart Items
    const container = document.getElementById('cart-items-container');
    const emptyView = document.getElementById('cart-empty-view');
    const cartFooter = document.getElementById('cart-footer');

    if (this.cart.length === 0) {
      if (container) container.innerHTML = '';
      if (emptyView) emptyView.classList.remove('hidden');
      if (cartFooter) cartFooter.classList.add('hidden');
    } else {
      if (emptyView) emptyView.classList.add('hidden');
      if (cartFooter) cartFooter.classList.remove('hidden');

      if (container) {
        container.innerHTML = this.cart.map((item, index) => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
              <div>
                <div class="cart-item-title">${item.name}</div>
                <div class="card-category" style="font-size: 0.72rem; display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.2rem;">
                  ${item.selectedSize ? `<span style="color: var(--deep-forest); font-weight: 700; background: rgba(214,166,83,0.22); padding: 0.1rem 0.4rem; border-radius: 4px;">Size: ${item.selectedSize}</span>` : ''}
                  ${item.comboInfo && item.comboInfo.qty > 1 ? `<span style="color: #065f46; font-weight: 700; background: rgba(16,185,129,0.18); padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3);"><i data-lucide="sparkles" style="width: 10px; height: 10px; vertical-align: middle;"></i> Combo of ${item.comboInfo.qty} (Saved $${Number(item.comboInfo.savedAmount).toFixed(2)})</span>` : ''}
                  ${item.selectedColor ? `<span>Finish: ${item.selectedColor}</span>` : ''}
                </div>
              </div>
              <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
              <div class="cart-qty-ctrl">
                <button class="qty-btn" onclick="window.cart.updateQuantity(${index}, -1)">-</button>
                <span class="qty-val">${item.quantity}</span>
                <button class="qty-btn" onclick="window.cart.updateQuantity(${index}, 1)">+</button>
              </div>
            </div>
            <button class="remove-item-btn" onclick="window.cart.removeItem(${index})">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `).join('');

        if (window.lucide) window.lucide.createIcons();
      }
    }

    // Promo UI
    const promoStatus = document.getElementById('promo-status');
    const promoName = document.getElementById('promo-name');
    if (promoStatus && promoName) {
      if (this.appliedPromo) {
        promoStatus.classList.remove('hidden');
        promoName.textContent = `${this.appliedPromo.code} Applied (${this.appliedPromo.label})`;
      } else {
        promoStatus.classList.add('hidden');
      }
    }

    // Summary Calculations
    const subtotalEl = document.getElementById('summary-subtotal');
    const discountRow = document.getElementById('summary-discount-row');
    const discountEl = document.getElementById('summary-discount');
    const shippingEl = document.getElementById('summary-shipping');
    const taxEl = document.getElementById('summary-tax');
    const totalEl = document.getElementById('summary-total');

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (discountRow && discountEl) {
      if (discount > 0) {
        discountRow.classList.remove('hidden');
        discountEl.textContent = `-$${discount.toFixed(2)}`;
      } else {
        discountRow.classList.add('hidden');
      }
    }
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    // Update PayPal Pay Later Installment in Cart Drawer
    const payLaterEl = document.getElementById('cart-pay-later-installment');
    if (payLaterEl) {
      payLaterEl.textContent = `$${(total / 4).toFixed(2)}`;
    }

    // Keep Checkout final amount banner in sync if checkout modal is active
    const checkoutFinalEl = document.getElementById('checkout-final-amount');
    if (checkoutFinalEl) {
      checkoutFinalEl.textContent = `$${total.toFixed(2)}`;
    }
  }
}

// Global Cart Instance
window.cart = new CartManager();
