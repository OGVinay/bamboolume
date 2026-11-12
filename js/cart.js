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

  getComboOffersForProduct(productId) {
    const product = (window.PRODUCTS_DATA || []).find(p => p.id === productId);
    if (!product || !Array.isArray(product.comboOffers) || product.comboOffers.length === 0) {
      return null;
    }
    return product.comboOffers;
  }

  getBundleTier(offers, totalUnits) {
    if (!offers || totalUnits < 2) return null;
    // Quantities over 5 share the Combo of 5 discount percentage
    const qualifying = offers
      .filter(o => o.qty <= totalUnits && o.discountPct > 0)
      .sort((a, b) => b.qty - a.qty);
    return qualifying[0] || null;
  }

  getItemUnitMetrics(item) {
    const packQty = item.comboInfo && item.comboInfo.qty > 1 ? Number(item.comboInfo.qty) : 1;
    const units = packQty * Number(item.quantity || 0);
    const unitPrice = item.comboInfo && item.comboInfo.qty > 1
      ? (item.comboInfo.basePrice !== undefined
          ? Number(item.comboInfo.basePrice)
          : Number((Number(item.comboInfo.regularTotal || item.price) / packQty).toFixed(2)))
      : Number(item.price);
    const lineRegularTotal = Number((unitPrice * units).toFixed(2));
    return { units, unitPrice, lineRegularTotal };
  }

  getProductUnitCounts() {
    const counts = {};
    this.cart.forEach(item => {
      const { units } = this.getItemUnitMetrics(item);
      counts[item.id] = (counts[item.id] || 0) + units;
    });
    return counts;
  }

  getProductBundleTier(productId) {
    const offers = this.getComboOffersForProduct(productId);
    if (!offers) return null;
    const counts = this.getProductUnitCounts();
    return this.getBundleTier(offers, counts[productId] || 0);
  }

  getProductBundlePct(productId) {
    return this.getProductBundleTier(productId)?.discountPct || 0;
  }

  addItem(product, quantity = 1, selectedColor = null, selectedSize = null, customPrice = null, customImage = null, comboInfo = null) {
    const packQty = comboInfo && comboInfo.qty > 1 ? Number(comboInfo.qty) : 1;
    const addedUnits = Number(quantity) * packQty;
    const unitPrice = comboInfo && comboInfo.qty > 1
      ? (comboInfo.basePrice !== undefined
          ? Number(comboInfo.basePrice)
          : Number((Number(customPrice ?? product.price) / packQty).toFixed(2)))
      : (customPrice !== null ? Number(customPrice) : Number(product.price));
    const finalImage = customImage || product.image;
    const finalColor = selectedColor || (product.variants?.colors?.[0] || null);
    const finalSize = selectedSize || null;

    let displayName = product.name;
    if (finalSize) displayName += ` - ${finalSize}`;

    const prevTierPct = this.getProductBundlePct(product.id);

    const existingIndex = this.cart.findIndex(
      item => item.id === product.id &&
              item.selectedColor === finalColor &&
              item.selectedSize === finalSize &&
              !(item.comboInfo && item.comboInfo.qty > 1)
    );

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += addedUnits;
    } else {
      this.cart.push({
        id: product.id,
        name: displayName,
        baseName: product.name,
        price: unitPrice,
        image: finalImage,
        category: product.category,
        quantity: addedUnits,
        selectedColor: finalColor,
        selectedSize: finalSize,
        comboInfo: null
      });
    }

    this.saveCart();
    const newTier = this.getProductBundleTier(product.id);
    if (newTier && newTier.discountPct > prevTierPct) {
      window.showToast(`Added "${displayName}" — ${newTier.label} (${newTier.discountPct}% OFF) applied!`, 'success');
    } else {
      window.showToast(`Added "${displayName}" to cart!`, 'success');
    }
  }

  updateQuantity(index, change) {
    if (index >= 0 && index < this.cart.length) {
      const productId = this.cart[index].id;
      const prevTierPct = this.getProductBundlePct(productId);
      this.cart[index].quantity += change;
      if (this.cart[index].quantity <= 0) {
        this.cart.splice(index, 1);
      }
      this.saveCart();
      const newTier = this.getProductBundleTier(productId);
      if (change > 0 && newTier && newTier.discountPct > prevTierPct) {
        window.showToast(`Bundle unlocked: ${newTier.label} (${newTier.discountPct}% OFF)!`, 'success');
      }
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
    const productCounts = this.getProductUnitCounts();
    let subtotal = 0;
    let bundleDiscount = 0;
    let itemCount = 0;

    const itemBreakdowns = this.cart.map(item => {
      const { units, lineRegularTotal } = this.getItemUnitMetrics(item);
      const totalForProduct = productCounts[item.id] || units;
      const offers = this.getComboOffersForProduct(item.id);
      const tier = offers ? this.getBundleTier(offers, totalForProduct) : null;
      const bundlePct = tier ? tier.discountPct : 0;
      const lineDiscount = Number((lineRegularTotal * (bundlePct / 100)).toFixed(2));
      const lineNetTotal = Number((lineRegularTotal - lineDiscount).toFixed(2));

      subtotal += lineRegularTotal;
      bundleDiscount += lineDiscount;
      itemCount += units;

      return {
        units,
        totalForProduct,
        tier,
        bundlePct,
        lineRegularTotal,
        lineDiscount,
        lineNetTotal
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    bundleDiscount = Number(bundleDiscount.toFixed(2));
    const afterBundleSubtotal = Math.max(0, Number((subtotal - bundleDiscount).toFixed(2)));

    let promoDiscount = 0;
    if (this.appliedPromo && this.appliedPromo.discount) {
      promoDiscount = Number((afterBundleSubtotal * this.appliedPromo.discount).toFixed(2));
    }

    const discount = Number((bundleDiscount + promoDiscount).toFixed(2));
    const netSubtotal = Math.max(0, Number((subtotal - discount).toFixed(2)));
    const shipping = (afterBundleSubtotal >= this.freeShippingGoal || (this.appliedPromo && this.appliedPromo.freeShipping)) || subtotal === 0 ? 0 : 15.00;
    const total = Number((netSubtotal + shipping).toFixed(2));

    return {
      subtotal,
      bundleDiscount,
      promoDiscount,
      discount,
      afterBundleSubtotal,
      shipping,
      total,
      itemCount,
      itemBreakdowns
    };
  }

  updateCartUI() {
    const { subtotal, bundleDiscount, promoDiscount, discount, afterBundleSubtotal, shipping, total, itemCount, itemBreakdowns } = this.getTotals();

    // Update Badge Counter
    const cartCountEl = document.getElementById('cart-count');
    const cartDrawerCountEl = document.getElementById('cart-drawer-count');
    if (cartCountEl) cartCountEl.textContent = itemCount;
    if (cartDrawerCountEl) cartDrawerCountEl.textContent = `(${itemCount})`;

    // Shipping Goal Progress Bar
    const progressText = document.getElementById('shipping-progress-text');
    const progressBar = document.getElementById('shipping-progress-bar');
    if (progressText && progressBar) {
      if (afterBundleSubtotal >= this.freeShippingGoal) {
        progressText.innerHTML = '🎉 You unlocked <strong>FREE Express Shipping!</strong>';
        progressBar.style.width = '100%';
      } else {
        const remaining = (this.freeShippingGoal - afterBundleSubtotal).toFixed(2);
        const percent = Math.min(100, (afterBundleSubtotal / this.freeShippingGoal) * 100);
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
        container.innerHTML = this.cart.map((item, index) => {
          const b = itemBreakdowns[index];
          return `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
              <div>
                <div class="cart-item-title">${item.name}</div>
                <div class="card-category" style="font-size: 0.72rem; display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.2rem;">
                  ${item.selectedSize ? `<span style="color: var(--deep-forest); font-weight: 700; background: rgba(214,166,83,0.22); padding: 0.1rem 0.4rem; border-radius: 4px;">Size: ${item.selectedSize}</span>` : ''}
                  ${b.bundlePct > 0 ? `<span style="color: #065f46; font-weight: 700; background: rgba(16,185,129,0.18); padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3);"><i data-lucide="sparkles" style="width: 10px; height: 10px; vertical-align: middle;"></i> Bundle (${b.totalForProduct}×): ${b.bundlePct}% OFF (Saved $${b.lineDiscount.toFixed(2)})</span>` : ''}
                  ${item.selectedColor ? `<span>Finish: ${item.selectedColor}</span>` : ''}
                </div>
              </div>
              <div class="cart-item-price">
                ${b.bundlePct > 0 ? `<span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.82rem; font-weight: 500; margin-right: 0.35rem;">$${b.lineRegularTotal.toFixed(2)}</span>` : ''}
                $${b.lineNetTotal.toFixed(2)}
              </div>
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
        `;
        }).join('');

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
    const discountLabelEl = document.getElementById('summary-discount-label');
    const discountEl = document.getElementById('summary-discount');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (discountRow && discountEl) {
      if (discount > 0) {
        discountRow.classList.remove('hidden');
        if (discountLabelEl) {
          if (bundleDiscount > 0 && promoDiscount > 0) {
            discountLabelEl.textContent = 'Bundle & Promo Discount';
          } else if (bundleDiscount > 0) {
            discountLabelEl.textContent = 'Bundle Discount';
          } else {
            discountLabelEl.textContent = 'Special Discount';
          }
        }
        discountEl.textContent = `-$${discount.toFixed(2)}`;
      } else {
        discountRow.classList.add('hidden');
      }
    }
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
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
