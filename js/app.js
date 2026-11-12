/**
 * BAMBOOLUME Main Application Controller
 * Handcrafted Botanical Solar Lanterns
 */

class App {
  constructor() {
    this.products = window.PRODUCTS_DATA || [];
    this.wishlist = this.loadWishlist();
    this.activeCategory = 'all';
    this.activeSort = 'featured';
    this.searchQuery = '';
    this.currentSimulatorMode = 'night';
    this.selectedCardSizes = {}; // Maps productId -> sizeId
    this.selectedCardCombos = {}; // Maps productId -> comboQty (1 to 5)
    this.modalActiveProductId = null;
    this.modalSelectedSizeId = null;
    this.modalSelectedComboQty = 1;

    this.init();
  }

  getComboDetails(product, qty = 1, sizeId = null) {
    let basePrice = product.price;
    let originalUnit = product.originalPrice || product.price;
    if (sizeId && product.variants?.sizes) {
      const s = product.variants.sizes.find(x => x.id === sizeId);
      if (s) {
        basePrice = s.price;
        originalUnit = s.originalPrice || s.price;
      }
    }
    const combo = product.comboOffers?.find(c => c.qty === qty) || { qty: 1, discountPct: 0, label: 'Single (1x)' };
    const discountPct = combo.discountPct || 0;
    const regularTotal = Number((basePrice * qty).toFixed(2));
    const discountedTotal = Number((regularTotal * (1 - discountPct / 100)).toFixed(2));
    const savedAmount = Number((regularTotal - discountedTotal).toFixed(2));
    const perUnit = (discountedTotal / qty).toFixed(2);

    return {
      qty,
      discountPct,
      label: combo.label,
      basePrice,
      regularTotal,
      discountedTotal,
      savedAmount,
      perUnit
    };
  }

  async syncShopifyStock() {
    if (!window.shopifyIntegration?.fetchLiveInventory) return;
    await window.shopifyIntegration.fetchLiveInventory();
    this.renderProducts();
  }

  getProductStockInfo(product, sizeId = null) {
    if (window.shopifyIntegration?.getStockForProduct) {
      return window.shopifyIntegration.getStockForProduct(product, sizeId);
    }
    const fallback = product?.stockCount ?? 0;
    return {
      inStock: product?.inStock !== false && fallback > 0,
      stockCount: fallback,
      isLiveCount: false
    };
  }

  renderStockPillMarkup(stockInfo) {
    if (!stockInfo.inStock) {
      return '<span class="stock-status-pill sold-out">SOLD OUT</span>';
    }
    const label = typeof stockInfo.stockCount === 'number'
      ? `IN STOCK (${stockInfo.stockCount} LEFT)`
      : 'IN STOCK';
    return `<span class="stock-status-pill in-stock">${label}</span>`;
  }

  ensureInStock(product, sizeId = null) {
    if (this.getProductStockInfo(product, sizeId).inStock) return true;
    this.showToast('This item is currently sold out.', 'info');
    return false;
  }

  init() {
    this.initTheme();
    this.initHero();
    this.initSimulatorVideo();
    this.bindEvents();
    this.renderProducts();
    this.syncShopifyStock();
    this.updateWishlistCount();

    if (window.lucide) window.lucide.createIcons();
  }

  /* ================= THEME TOGGLE ================= */
  initTheme() {
    const saved = localStorage.getItem('bamboolume_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('bamboolume_theme', next);
      this.showToast(`Switched to ${next} theme mode`, 'info');
    });
  }

  /* ================= HERO CONTROLLER ================= */
  initHero() {
    const featured = this.products.find(p => p.id === 'lantern-1');
    const heroImg = document.getElementById('hero-image');
    if (heroImg && featured) {
      heroImg.src = featured.image;
    }
  }

  quickAddFeatured(id) {
    const product = this.products.find(p => p.id === id);
    if (!product || !window.cart) return;

    const activeSizeId = this.selectedCardSizes[id] || (product.variants?.sizes ? product.variants.sizes[0].id : null);
    if (!this.ensureInStock(product, activeSizeId)) return;
    const size = product.variants?.sizes ? (product.variants.sizes.find(s => s.id === activeSizeId) || product.variants.sizes[0]) : null;
    const sizeLabel = size ? `${size.label} (${size.dimension})` : null;
    const sizeImage = size ? size.image : product.image;

    const comboQty = this.selectedCardCombos[id] || 1;
    const comboDetails = this.getComboDetails(product, comboQty, activeSizeId);

    if (comboQty > 1) {
      window.cart.addItem(product, 1, null, sizeLabel, comboDetails.discountedTotal, sizeImage, comboDetails);
    } else {
      window.cart.addItem(product, 1, null, sizeLabel, size ? size.price : product.price, sizeImage);
    }
    window.cart.openCartDrawer();
  }

  /* ================= DAY-TO-NIGHT GARDEN SIMULATOR ================= */
  initSimulatorVideo() {
    const viewport = document.getElementById('sim-viewport');
    const video = document.getElementById('sim-video');
    const dropzone = document.getElementById('sim-dropzone-overlay');

    if (!viewport || !video) return;

    // Drag & Drop MP4 Video onto the simulator viewport
    ['dragenter', 'dragover'].forEach(name => {
      viewport.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone?.classList.remove('hidden');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      viewport.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone?.classList.add('hidden');
      });
    });

    viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files[0] && (files[0].type.startsWith('video/') || files[0].name.toLowerCase().endsWith('.mp4'))) {
        this.loadVideoFile(files[0]);
      } else {
        this.showToast('Please drop a valid .mp4 video file', 'error');
      }
    });

    // Ensure video begins playing seamlessly (muted autoplay)
    video.muted = true;
    video.play().catch(() => {});
  }

  setSimulatorMode(mode) {
    this.currentSimulatorMode = mode;
    const viewport = document.getElementById('sim-viewport');
    const video = document.getElementById('sim-video');
    const btnDay = document.getElementById('sim-btn-day');
    const btnNight = document.getElementById('sim-btn-night');
    const badge = document.getElementById('sim-state-badge');
    const title = document.getElementById('sim-state-title');
    const desc = document.getElementById('sim-state-desc');

    if (mode === 'day') {
      viewport?.classList.remove('mode-night');
      viewport?.classList.add('mode-day');
      btnDay?.classList.add('active');
      btnNight?.classList.remove('active');

      if (badge) badge.innerHTML = `<i data-lucide="sun" style="color: var(--bamboo-gold);"></i> <span>Midday Solar Absorption Active</span>`;
      if (title) title.textContent = 'High-Conversion Monocrystalline Harvest';
      if (desc) desc.textContent = 'During daytime hours, the integrated Grade A monocrystalline solar cell rapidly absorbs daylight, fully charging the internal LiFePO4 battery in just 5–6 hours of sunlight.';
      
      // Speed up slightly for charging demonstration
      if (video) video.playbackRate = 1.0;
    } else {
      viewport?.classList.remove('mode-day');
      viewport?.classList.add('mode-night');
      btnNight?.classList.add('active');
      btnDay?.classList.remove('active');

      if (badge) badge.innerHTML = `<i data-lucide="moon" style="color: var(--bamboo-gold);"></i> <span>Enchanted Twilight Mode (Active)</span>`;
      if (title) title.textContent = 'Automated Twilight Optical Sensor';
      if (desc) desc.textContent = 'As dusk settles below 15 Lux, the optical twilight sensor automatically ignites the 2200K amber LED candle, casting a peaceful flickering flame glow across your garden.';

      if (video) video.playbackRate = 1.0;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  switchSimulatorVideo(src, title, btnElement) {
    const video = document.getElementById('sim-video');
    const titleEl = document.getElementById('sim-vid-title');
    if (!video) return;

    video.src = src;
    video.load();
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });

    if (titleEl) titleEl.textContent = title;

    document.querySelectorAll('.sim-vid-tab').forEach(t => t.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const playBtn = document.getElementById('sim-vid-play-btn');
    if (playBtn) playBtn.innerHTML = `<i data-lucide="pause"></i>`;
    if (window.lucide) window.lucide.createIcons();

    this.showToast(`Active footage: ${title}`, 'info');
  }

  toggleSimulatorVideoPlay() {
    const video = document.getElementById('sim-video');
    const playBtn = document.getElementById('sim-vid-play-btn');
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      if (playBtn) playBtn.innerHTML = `<i data-lucide="pause"></i>`;
      this.showToast('Playing twilight video', 'info');
    } else {
      video.pause();
      if (playBtn) playBtn.innerHTML = `<i data-lucide="play"></i>`;
      this.showToast('Paused twilight video', 'info');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  toggleSimulatorVideoMute() {
    const video = document.getElementById('sim-video');
    const muteBtn = document.getElementById('sim-vid-mute-btn');
    if (!video) return;

    video.muted = !video.muted;
    if (muteBtn) {
      muteBtn.innerHTML = video.muted ? `<i data-lucide="volume-x"></i>` : `<i data-lucide="volume-2"></i>`;
    }
    if (window.lucide) window.lucide.createIcons();
    this.showToast(video.muted ? 'Audio muted' : 'Audio unmuted', 'info');
  }

  toggleSimulatorFullscreen() {
    const viewport = document.getElementById('sim-viewport');
    if (!viewport) return;

    if (!document.fullscreenElement) {
      if (viewport.requestFullscreen) {
        viewport.requestFullscreen().catch(() => {});
      } else if (viewport.webkitRequestFullscreen) {
        viewport.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  handleCustomVideoUpload(event) {
    const file = event.target.files?.[0];
    if (file) {
      this.loadVideoFile(file);
    }
  }

  loadVideoFile(file) {
    const video = document.getElementById('sim-video');
    const titleEl = document.getElementById('sim-vid-title');
    if (!video || !file) return;

    const url = URL.createObjectURL(file);
    video.src = url;
    video.load();
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });

    if (titleEl) titleEl.textContent = `Custom: ${file.name.slice(0, 32)}...`;
    document.querySelectorAll('.sim-vid-tab').forEach(t => t.classList.remove('active'));

    const playBtn = document.getElementById('sim-vid-play-btn');
    if (playBtn) playBtn.innerHTML = `<i data-lucide="pause"></i>`;
    if (window.lucide) window.lucide.createIcons();

    this.showToast(`Loaded "${file.name}" into Twilight Simulator!`, 'success');
  }

  /* ================= WISHLIST ENGINE ================= */
  loadWishlist() {
    try {
      const data = localStorage.getItem('bamboolume_wishlist_v1');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  toggleWishlist(productId) {
    const index = this.wishlist.indexOf(productId);
    const product = this.products.find(p => p.id === productId);

    if (index > -1) {
      this.wishlist.splice(index, 1);
      this.showToast(`Removed "${product?.name}" from Wishlist`, 'info');
    } else {
      this.wishlist.push(productId);
      this.showToast(`Saved "${product?.name}" to Wishlist ♡`, 'success');
    }

    try {
      localStorage.setItem('bamboolume_wishlist_v1', JSON.stringify(this.wishlist));
    } catch (e) {}

    this.updateWishlistCount();
    this.renderProducts();
    if (!document.getElementById('wishlist-drawer-overlay')?.classList.contains('hidden')) {
      this.renderWishlistDrawer();
    }
  }

  updateWishlistCount() {
    const el = document.getElementById('wishlist-count');
    const drawerCount = document.getElementById('wishlist-drawer-count');
    const mobileCount = document.getElementById('mobile-wishlist-count');
    if (el) {
      el.textContent = this.wishlist.length;
      el.classList.toggle('hidden', this.wishlist.length === 0);
    }
    if (drawerCount) {
      drawerCount.textContent = `(${this.wishlist.length})`;
    }
    if (mobileCount) {
      mobileCount.textContent = this.wishlist.length;
    }
  }

  openWishlistDrawer() {
    this.renderWishlistDrawer();
    document.getElementById('wishlist-drawer-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }

  closeWishlistDrawer() {
    document.getElementById('wishlist-drawer-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  renderWishlistDrawer() {
    const container = document.getElementById('wishlist-items-container');
    const footer = document.getElementById('wishlist-footer');
    if (!container) return;

    if (this.wishlist.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon"><i data-lucide="heart"></i></div>
          <h4>Your wishlist is empty</h4>
          <p>Save your favorite handcrafted solar lanterns to review or buy later.</p>
          <button class="btn-primary-gold" onclick="window.app.closeWishlistDrawer()" style="margin-top: 1rem;">
            Explore Lantern Collection
          </button>
        </div>
      `;
      if (footer) footer.style.display = 'none';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    if (footer) footer.style.display = 'block';

    const items = this.wishlist
      .map(id => this.getProductById(id))
      .filter(Boolean);

    container.innerHTML = items.map(p => `
      <div class="wishlist-item-card">
        <img src="${p.image}" alt="${p.name}" class="wishlist-img-thumb">
        <div class="wishlist-details">
          <h4 class="wishlist-item-title">${p.name}</h4>
          <div style="font-size: 0.78rem; color: var(--bamboo-green); margin-bottom: 0.3rem;">
            ★ ${p.rating} • ${p.specs[1] || '14h Runtime'}
          </div>
          <div class="wishlist-item-price">$${Number(p.price).toFixed(2)}</div>
        </div>
        <div class="wishlist-item-actions">
          <button class="btn-primary-gold" onclick="window.app.moveWishlistItemToCart('${p.id}')" style="padding: 0.45rem 0.75rem; font-size: 0.78rem;">
            <i data-lucide="shopping-bag" style="width: 14px; height: 14px;"></i> Move to Cart
          </button>
          <button class="btn-text-danger" onclick="window.app.toggleWishlist('${p.id}')" title="Remove from wishlist" style="text-align: center; font-size: 0.75rem;">
            Remove
          </button>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  moveWishlistItemToCart(productId) {
    const product = this.getProductById(productId);
    if (product && window.cart) {
      window.cart.addItem(product, 1);
      this.toggleWishlist(productId);
      this.closeWishlistDrawer();
      window.cart.openCartDrawer();
      this.showToast(`Moved "${product.name}" to cart!`, 'success');
    }
  }

  moveAllWishlistToCart() {
    if (this.wishlist.length === 0) return;
    const items = [...this.wishlist];
    items.forEach(id => {
      const p = this.getProductById(id);
      if (p && window.cart) {
        window.cart.addItem(p, 1);
      }
    });
    this.wishlist = [];
    try {
      localStorage.setItem('bamboolume_wishlist_v1', JSON.stringify([]));
    } catch (e) {}
    this.updateWishlistCount();
    this.closeWishlistDrawer();
    window.cart?.openCartDrawer();
    this.showToast('All saved lanterns moved to your basket!', 'success');
  }

  clearWishlist() {
    this.wishlist = [];
    try {
      localStorage.setItem('bamboolume_wishlist_v1', JSON.stringify([]));
    } catch (e) {}
    this.updateWishlistCount();
    this.renderWishlistDrawer();
    this.renderProducts();
    this.showToast('Wishlist cleared', 'info');
  }

  /* ================= CATALOG RENDERING & SORTING ================= */
  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let filtered = [...this.products];

    // Category filter
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.activeCategory);
    }

    // Global search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Sorting logic
    if (this.activeSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (this.activeSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (this.activeSort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (this.activeSort === 'runtime') {
      filtered.sort((a, b) => {
        const getHours = str => parseInt(str?.match(/\d+/)?.[0] || '0');
        return getHours(b.specs[1]) - getHours(a.specs[1]);
      });
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <i data-lucide="sun-dim" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--bamboo-gold);"></i>
          <h3>No lanterns found</h3>
          <p>Try clearing your search query or selecting another lantern category.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = filtered.map(product => {
      const isWish = this.wishlist.includes(product.id);
      const hasSizes = product.variants?.sizes && product.variants.sizes.length > 0;
      const activeSizeId = this.selectedCardSizes[product.id] || (hasSizes ? product.variants.sizes[0].id : null);
      const activeSize = hasSizes ? (product.variants.sizes.find(s => s.id === activeSizeId) || product.variants.sizes[0]) : null;

      const hasCombos = product.comboOffers && product.comboOffers.length > 0;
      const activeComboQty = this.selectedCardCombos[product.id] || 1;
      const comboDetails = this.getComboDetails(product, activeComboQty, activeSizeId);

      const displayPrice = comboDetails.discountedTotal;
      const displayOrigPrice = comboDetails.discountPct > 0 
        ? comboDetails.regularTotal 
        : (activeSize ? activeSize.originalPrice : product.originalPrice);
      const displayImg = this.selectedCardSizes[product.id] && activeSize ? activeSize.image : product.image;
      const payLaterVal = (displayPrice / 4).toFixed(2);
      const ratingInfo = window.reviewsManager ? window.reviewsManager.getRatingSummary(product.id) : { average: product.rating, count: product.reviewsCount };
      const stockInfo = this.getProductStockInfo(product, activeSizeId);

      return `
        <article class="product-card" data-id="${product.id}">
          <span class="product-card-badge ${product.badge === 'popular' ? 'popular' : ''}">${product.badgeText}</span>
          
          <button class="product-wish-btn" onclick="window.app.toggleWishlist('${product.id}')" title="Save to Wishlist">
            <i data-lucide="heart" ${isWish ? 'style="fill: #e11d48; color: #e11d48;"' : ''}></i>
          </button>

          <div class="product-img-wrap" onclick="window.app.openProductModal('${product.id}')" style="cursor: pointer;">
            <img src="${displayImg}" alt="${product.name}" class="product-img" id="product-card-img-${product.id}" loading="lazy">
          </div>

          <div class="product-details">
            <span class="product-cat-tag">${product.category.replace('-', ' ')}</span>
            <h3 class="product-title" onclick="window.app.openProductModal('${product.id}')" style="cursor: pointer;">${product.name}</h3>

            <div class="product-card-rating">
              <span class="stars-gold">${'★'.repeat(Math.round(ratingInfo.average))}${'☆'.repeat(5 - Math.round(ratingInfo.average))}</span>
              <strong style="color: var(--deep-forest); font-size: 0.82rem;">${ratingInfo.average}</strong>
              <span class="rating-count-sub">(${ratingInfo.count || product.reviewsCount} reviews)</span>
            </div>

            <div class="product-card-stock-row" id="product-card-stock-${product.id}">
              ${this.renderStockPillMarkup(stockInfo)}
            </div>

            <!-- Size Selector Pills on Card -->
            ${hasSizes ? `
              <div class="product-card-sizes">
                <span class="size-pill-label"><i data-lucide="ruler" style="width: 11px; height: 11px; vertical-align: middle;"></i> ${product.id === 'lantern-1' ? 'Choose Silhouette / Size:' : (product.id === 'lantern-2' ? 'Choose Stalk Size:' : 'Select Size:')}</span>
                <div class="size-pills-row">
                  ${product.variants.sizes.map(s => `
                    <button type="button" class="card-size-pill ${s.id === activeSizeId ? 'active' : ''}" 
                      onclick="window.app.selectCardSize('${product.id}', '${s.id}', event)">
                      ${s.label} (${s.height})${s.id === 'trio' ? ' <span class="pill-badge-save">15% OFF</span>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Combo Multi-Pack Selector (Up to Combo of 5) -->
            ${hasCombos ? `
              <div class="product-card-combos" id="product-card-combos-${product.id}">
                <span class="combo-pill-label">
                  <i data-lucide="sparkles" style="width: 11px; height: 11px; color: var(--bamboo-gold);"></i> Combo Offer (Bundle Up to 5):
                </span>
                <div class="combo-pills-row">
                  ${product.comboOffers.map(c => `
                    <button type="button" class="card-combo-pill ${c.qty === activeComboQty ? 'active' : ''}" 
                      onclick="window.app.selectCardCombo('${product.id}', ${c.qty}, event)">
                      ${c.qty}x ${c.discountPct > 0 ? `<span class="pill-badge-save">${c.discountPct}% OFF</span>` : ''}
                    </button>
                  `).join('')}
                </div>
                <div id="card-savings-${product.id}">
                  ${comboDetails.savedAmount > 0 ? `
                    <span class="card-savings-tag">
                      ✓ Saved $${Number(comboDetails.savedAmount).toFixed(2)} (${comboDetails.discountPct}% Volume Discount)
                    </span>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            <p class="product-desc-snippet">${product.description}</p>

            <div class="product-card-paylater" id="product-card-paylater-${product.id}">
              <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #0070BA;"></i>
              <span>Pay in 4: <strong>$${payLaterVal}</strong> with PayPal</span>
            </div>

            <div class="product-price-row">
              <span class="product-price" id="product-card-price-${product.id}">$${Number(displayPrice).toFixed(2)}</span>
              <span class="product-price-old" id="product-card-oldprice-${product.id}" style="${displayOrigPrice ? 'display: inline;' : 'display: none;'}">$${displayOrigPrice ? Number(displayOrigPrice).toFixed(2) : ''}</span>
            </div>

            <div class="product-actions">
              <button class="btn-add-cart" id="product-card-add-${product.id}" onclick="window.app.addCardItemToCart('${product.id}')" ${stockInfo.inStock ? '' : 'disabled style="opacity: 0.55; cursor: not-allowed;"'}>
                <i data-lucide="shopping-bag" style="width: 16px; height: 16px;"></i> ${stockInfo.inStock ? 'Add to Cart' : 'Sold Out'}
              </button>
              <button class="btn-quick-view" onclick="window.app.openProductModal('${product.id}')" title="Quick View Specs">
                <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  selectCardSize(productId, sizeId, event) {
    if (event) event.stopPropagation();
    this.selectedCardSizes[productId] = sizeId;
    const product = this.getProductById(productId);
    if (!product || !product.variants?.sizes) return;

    const size = product.variants.sizes.find(s => s.id === sizeId);
    if (!size) return;

    const activeComboQty = this.selectedCardCombos[productId] || 1;
    const comboDetails = this.getComboDetails(product, activeComboQty, sizeId);

    const imgEl = document.getElementById(`product-card-img-${productId}`);
    const priceEl = document.getElementById(`product-card-price-${productId}`);
    const oldPriceEl = document.getElementById(`product-card-oldprice-${productId}`);
    const payLaterEl = document.getElementById(`product-card-paylater-${productId}`);
    const savingsEl = document.getElementById(`card-savings-${productId}`);

    if (imgEl) imgEl.src = size.image;
    const stockRowEl = document.getElementById(`product-card-stock-${productId}`);
    const cardAddBtn = document.getElementById(`product-card-add-${productId}`);
    const stockInfo = this.getProductStockInfo(product, sizeId);
    if (stockRowEl) stockRowEl.innerHTML = this.renderStockPillMarkup(stockInfo);
    if (cardAddBtn) {
      cardAddBtn.disabled = !stockInfo.inStock;
      cardAddBtn.style.opacity = stockInfo.inStock ? '' : '0.55';
      cardAddBtn.style.cursor = stockInfo.inStock ? '' : 'not-allowed';
      cardAddBtn.innerHTML = `<i data-lucide="shopping-bag" style="width: 16px; height: 16px;"></i> ${stockInfo.inStock ? 'Add to Cart' : 'Sold Out'}`;
    }
    if (priceEl) priceEl.textContent = `$${Number(comboDetails.discountedTotal).toFixed(2)}`;
    if (oldPriceEl) {
      if (comboDetails.discountPct > 0) {
        oldPriceEl.textContent = `$${Number(comboDetails.regularTotal).toFixed(2)}`;
        oldPriceEl.style.display = 'inline';
      } else if (size.originalPrice) {
        oldPriceEl.textContent = `$${Number(size.originalPrice).toFixed(2)}`;
        oldPriceEl.style.display = 'inline';
      } else {
        oldPriceEl.style.display = 'none';
      }
    }
    if (payLaterEl) {
      payLaterEl.innerHTML = `
        <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #0070BA;"></i>
        <span>Pay in 4: <strong>$${(comboDetails.discountedTotal / 4).toFixed(2)}</strong> with PayPal</span>
      `;
    }
    if (savingsEl) {
      if (comboDetails.savedAmount > 0) {
        savingsEl.innerHTML = `
          <span class="card-savings-tag">
            ✓ Saved $${Number(comboDetails.savedAmount).toFixed(2)} (${comboDetails.discountPct}% Volume Discount)
          </span>
        `;
      } else {
        savingsEl.innerHTML = '';
      }
    }

    // Toggle active pill button
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) {
      card.querySelectorAll('.card-size-pill').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().startsWith(size.label));
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }

  selectCardCombo(productId, qty, event) {
    if (event) event.stopPropagation();
    this.selectedCardCombos[productId] = qty;
    const product = this.getProductById(productId);
    if (!product) return;

    const activeSizeId = this.selectedCardSizes[productId] || (product.variants?.sizes ? product.variants.sizes[0].id : null);
    const comboDetails = this.getComboDetails(product, qty, activeSizeId);

    const priceEl = document.getElementById(`product-card-price-${productId}`);
    const oldPriceEl = document.getElementById(`product-card-oldprice-${productId}`);
    const payLaterEl = document.getElementById(`product-card-paylater-${productId}`);
    const savingsEl = document.getElementById(`card-savings-${productId}`);

    if (priceEl) priceEl.textContent = `$${Number(comboDetails.discountedTotal).toFixed(2)}`;
    if (oldPriceEl) {
      if (comboDetails.discountPct > 0) {
        oldPriceEl.textContent = `$${Number(comboDetails.regularTotal).toFixed(2)}`;
        oldPriceEl.style.display = 'inline';
      } else {
        const activeSize = product.variants?.sizes?.find(s => s.id === activeSizeId);
        const orig = activeSize ? activeSize.originalPrice : product.originalPrice;
        if (orig) {
          oldPriceEl.textContent = `$${Number(orig).toFixed(2)}`;
          oldPriceEl.style.display = 'inline';
        } else {
          oldPriceEl.style.display = 'none';
        }
      }
    }
    if (payLaterEl) {
      payLaterEl.innerHTML = `
        <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #0070BA;"></i>
        <span>Pay in 4: <strong>$${(comboDetails.discountedTotal / 4).toFixed(2)}</strong> with PayPal</span>
      `;
    }
    if (savingsEl) {
      if (comboDetails.savedAmount > 0) {
        savingsEl.innerHTML = `
          <span class="card-savings-tag">
            ✓ Saved $${Number(comboDetails.savedAmount).toFixed(2)} (${comboDetails.discountPct}% Volume Discount)
          </span>
        `;
      } else {
        savingsEl.innerHTML = '';
      }
    }

    // Toggle active combo pill button
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (card) {
      card.querySelectorAll('.card-combo-pill').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().startsWith(`${qty}x`));
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }

  addCardItemToCart(productId) {
    const product = this.getProductById(productId);
    if (!product || !window.cart) return;

    const activeSizeId = this.selectedCardSizes[productId] || (product.variants?.sizes ? product.variants.sizes[0].id : null);
    if (!this.ensureInStock(product, activeSizeId)) return;
    const size = product.variants?.sizes ? (product.variants.sizes.find(s => s.id === activeSizeId) || product.variants.sizes[0]) : null;
    const sizeLabel = size ? `${size.label} (${size.dimension})` : null;
    const sizeImage = size ? size.image : product.image;

    const comboQty = this.selectedCardCombos[productId] || 1;
    const comboDetails = this.getComboDetails(product, comboQty, activeSizeId);

    if (comboQty > 1) {
      window.cart.addItem(product, 1, null, sizeLabel, comboDetails.discountedTotal, sizeImage, comboDetails);
    } else {
      window.cart.addItem(product, 1, null, sizeLabel, size ? size.price : product.price, sizeImage);
    }
    window.cart.openCartDrawer();
  }

  getProductById(id) {
    return this.products.find(p => p.id === id);
  }

  getGalleryTag(imgSrc, matchSize, idx) {
    if (matchSize) return matchSize.label;
    if (imgSrc.includes('patio_primary')) return 'Patio Lifestyle';
    if (imgSrc.includes('dining_canopy')) return 'Dining Canopy';
    if (imgSrc.includes('kadomatsu_pathway_primary')) return 'Pathway Primary';
    if (imgSrc.includes('kadomatsu_lawn_border')) return 'Lawn & Border';
    if (imgSrc.includes('kadomatsu_trio')) return 'Trio Cluster';
    if (imgSrc.includes('terrace_shadow_primary')) return 'Shadow Projection';
    if (imgSrc.includes('terrace_dining_patio')) return 'Patio Dining';
    if (imgSrc.includes('floor_tower_primary')) return 'Freestanding Tower';
    if (imgSrc.includes('floor_tower_dining_patio')) return 'Patio Sanctuary';
    if (imgSrc.includes('floor_tower_dimensions')) return 'Dimensions Diagram';
    if (imgSrc.includes('floor_tower_night')) return 'Night Ambiance';
    if (imgSrc.includes('hanging_lantern')) return 'Garden Scene';
    return idx === 0 ? 'Featured' : 'Detail';
  }

  renderModalThumbnails(product, hasSizes, currentImage) {
    const gallery = product.gallery || [product.image];
    return gallery.map((imgSrc, idx) => {
      const matchSize = hasSizes ? product.variants.sizes.find(s => s.image === imgSrc) : null;
      const tag = this.getGalleryTag(imgSrc, matchSize, idx);
      const sizeId = matchSize ? matchSize.id : '';
      const activeClass = imgSrc === currentImage ? 'active' : '';
      return `
        <button type="button" class="modal-thumb-btn ${activeClass}" 
          onclick="window.app.onModalThumbClick('${imgSrc}', '${sizeId}')">
          <img src="${imgSrc}" alt="Thumbnail">
          <span class="modal-thumb-tag">${tag}</span>
        </button>
      `;
    }).join('');
  }

  /* ================= PRODUCT QUICK VIEW MODAL ================= */
  openProductModal(id) {
    const product = this.getProductById(id);
    if (!product) return;

    this.modalActiveProductId = id;
    const hasSizes = product.variants?.sizes && product.variants.sizes.length > 0;
    this.modalSelectedSizeId = this.selectedCardSizes[id] || (hasSizes ? product.variants.sizes[0].id : null);

    const hasCombos = product.comboOffers && product.comboOffers.length > 0;
    this.modalSelectedComboQty = this.selectedCardCombos[id] || 1;
    const comboDetails = this.getComboDetails(product, this.modalSelectedComboQty, this.modalSelectedSizeId);

    const activeSize = hasSizes ? (product.variants.sizes.find(s => s.id === this.modalSelectedSizeId) || product.variants.sizes[0]) : null;
    const currentPrice = comboDetails.discountedTotal;
    const currentOrigPrice = comboDetails.discountPct > 0 
      ? comboDetails.regularTotal 
      : (activeSize ? activeSize.originalPrice : product.originalPrice);
    const currentImage = this.selectedCardSizes[id] && activeSize ? activeSize.image : product.image;
    const payLaterVal = (currentPrice / 4).toFixed(2);
    const ratingInfo = window.reviewsManager ? window.reviewsManager.getRatingSummary(product.id) : { average: product.rating, count: product.reviewsCount };
    const modalStockInfo = this.getProductStockInfo(product, this.modalSelectedSizeId);

    const modalBody = document.getElementById('modal-content-container');
    const overlay = document.getElementById('product-modal-overlay');

    if (modalBody && overlay) {
      modalBody.innerHTML = `
        <div class="modal-layout-grid">
          <div>
            <div class="modal-product-img-box">
              <img src="${currentImage}" alt="${product.name}" class="modal-product-img" id="modal-main-img">
            </div>

            <!-- Gallery Thumbnails Strip -->
            <div class="modal-thumbnails-strip">
              ${this.renderModalThumbnails(product, hasSizes, currentImage)}
            </div>
          </div>

          <div class="modal-product-info">
            <span class="product-cat-tag">${product.category.toUpperCase()} • 100% MOSO BAMBOO</span>
            <h2>${product.name}</h2>

            <div class="product-rating-row" style="margin-bottom: 0.8rem;">
              <span class="stars-gold">${'★'.repeat(Math.round(ratingInfo.average))}${'☆'.repeat(5 - Math.round(ratingInfo.average))}</span>
              <strong style="margin-left: 0.3rem;">${ratingInfo.average} Rating</strong>
              <span>(${ratingInfo.count || product.reviewsCount} customer reviews) • Handcrafted</span>
            </div>

            <div class="modal-price-strip">
              <span class="modal-main-price" id="modal-price-val">$${Number(currentPrice).toFixed(2)}</span>
              <span style="font-size: 1.1rem; text-decoration: line-through; color: var(--text-muted); ${currentOrigPrice ? 'display: inline;' : 'display: none;'}" id="modal-oldprice-val">$${currentOrigPrice ? Number(currentOrigPrice).toFixed(2) : ''}</span>
              <span id="modal-stock-wrap">${this.renderStockPillMarkup(modalStockInfo)}</span>
            </div>

            <!-- Size Selector Options -->
            ${hasSizes ? `
              <div class="modal-size-section">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--charcoal); display: block; margin-bottom: 0.5rem; letter-spacing: 0.5px;">
                  ${product.id === 'lantern-1' ? 'SELECT LANTERN SILHOUETTE & DIMENSIONS' : (product.id === 'lantern-2' ? 'SELECT BAMBOO STALK SIZE / OPTION' : 'SELECT SIZE OPTION')}
                </label>
                <div class="modal-size-grid">
                  ${product.variants.sizes.map(s => `
                    <div class="modal-size-card ${s.id === this.modalSelectedSizeId ? 'active' : ''}" 
                      id="modal-size-card-${s.id}"
                      onclick="window.app.selectModalSize('${s.id}')">
                      <div class="modal-size-top-row">
                        <strong class="modal-size-title">${s.label}</strong>
                        <span class="modal-size-dim">${s.dimension}</span>
                      </div>
                      <div class="modal-size-price">$${Number(s.price).toFixed(2)}${s.id === 'trio' ? ' <span class="pill-badge-save">15% OFF</span>' : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div id="modal-size-desc" style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.5rem; font-style: italic;">
                  ${activeSize ? activeSize.desc : ''}
                </div>
              </div>
            ` : ''}

            <!-- Combo Multi-Pack Offers (Up to Combo of 5) -->
            ${hasCombos ? `
              <div class="modal-combo-section">
                <div class="modal-combo-header">
                  <div class="modal-combo-title">
                    <i data-lucide="sparkles" style="color: var(--bamboo-gold);"></i>
                    <span>EXCLUSIVE MULTI-PACK COMBOS (SAVE UP TO 20%)</span>
                  </div>
                  <span class="modal-combo-banner-badge">Volume Discount</span>
                </div>
                <div class="modal-combo-grid">
                  ${product.comboOffers.map(c => {
                    const tier = this.getComboDetails(product, c.qty, this.modalSelectedSizeId);
                    return `
                      <div class="modal-combo-card ${c.qty === this.modalSelectedComboQty ? 'active' : ''}" 
                        id="modal-combo-card-${c.qty}"
                        onclick="window.app.selectModalCombo(${c.qty})">
                        ${c.qty === 5 ? '<span class="modal-combo-best-badge">BEST VALUE</span>' : ''}
                        <strong class="modal-combo-qty">${c.label.split(' ')[0]}</strong>
                        <div class="modal-combo-price">$${Number(tier.discountedTotal).toFixed(2)}</div>
                        <span class="modal-combo-perunit">$${tier.perUnit}/ea</span>
                        ${tier.savedAmount > 0 ? `
                          <span class="modal-combo-save-pill">Save $${Number(tier.savedAmount).toFixed(2)}</span>
                        ` : '<span style="font-size: 0.62rem; color: var(--text-muted); margin-top: 0.25rem;">Standard</span>'}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Finish Selector -->
            ${product.variants?.colors ? `
              <div style="margin-bottom: 1.2rem;">
                <label style="font-size: 0.8rem; font-weight: 700; color: var(--charcoal); display: block; margin-bottom: 0.4rem;">SELECT BAMBOO FINISH</label>
                <select id="modal-variant-select" class="custom-select" style="width: 100%;">
                  ${product.variants.colors.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
            ` : ''}

            <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.6;">
              ${product.description}
            </p>

            <!-- PayPal Pay in 4 Callout -->
            <div class="paypal-pay-later-banner" style="margin-bottom: 1.2rem;" id="modal-paylater-banner">
              <i data-lucide="clock" style="color: #0070BA;"></i>
              <span>Pay in 4 interest-free payments of <strong id="modal-paylater-val">$${payLaterVal}</strong> with <span class="pp-brand">PayPal</span></span>
            </div>

            <!-- Solar Specifications Matrix -->
            <div class="modal-solar-matrix">
              <h5>Technical Solar Specifications</h5>
              <ul class="modal-specs-list">
                ${product.specs.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>

            <!-- Actions: Add to Cart + Instant Checkout -->
            <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.5rem;">
              <button class="btn-primary-gold" onclick="window.app.addModalItemToCart('${product.id}')" style="justify-content: center; padding: 0.9rem;">
                <i data-lucide="shopping-bag"></i> Add to Garden Basket
              </button>
              <button class="btn-paypal" onclick="window.app.buyNowWithPayPal('${product.id}')" style="justify-content: center; padding: 0.85rem;">
                <i data-lucide="zap" style="width: 16px; height: 16px;"></i>
                <span>Instant Shopify Checkout</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Verified Reviews & Ratings Block -->
        <div id="modal-reviews-container"></div>
      `;

      // Render Reviews Block
      window.reviewsManager?.renderReviewsSection(product.id, 'modal-reviews-container');

      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  selectModalSize(sizeId) {
    const product = this.getProductById(this.modalActiveProductId);
    if (!product || !product.variants?.sizes) return;

    this.modalSelectedSizeId = sizeId;
    this.selectedCardSizes[product.id] = sizeId;
    const size = product.variants.sizes.find(s => s.id === sizeId);
    if (!size) return;

    // Update main photo with smooth transition
    const mainImg = document.getElementById('modal-main-img');
    if (mainImg) mainImg.src = size.image;

    // Recalculate combo if combos exist
    const activeComboQty = this.modalSelectedComboQty || 1;
    const comboDetails = this.getComboDetails(product, activeComboQty, sizeId);

    // Update prices
    const priceVal = document.getElementById('modal-price-val');
    const oldPriceVal = document.getElementById('modal-oldprice-val');
    const payLaterVal = document.getElementById('modal-paylater-val');
    const descVal = document.getElementById('modal-size-desc');
    const modalStockWrap = document.getElementById('modal-stock-wrap');
    if (modalStockWrap) {
      modalStockWrap.innerHTML = this.renderStockPillMarkup(this.getProductStockInfo(product, sizeId));
    }

    if (priceVal) priceVal.textContent = `$${Number(comboDetails.discountedTotal).toFixed(2)}`;
    if (oldPriceVal) {
      if (comboDetails.discountPct > 0) {
        oldPriceVal.textContent = `$${Number(comboDetails.regularTotal).toFixed(2)}`;
        oldPriceVal.style.display = 'inline';
      } else {
        oldPriceVal.textContent = `$${Number(size.originalPrice).toFixed(2)}`;
        oldPriceVal.style.display = 'inline';
      }
    }
    if (payLaterVal) payLaterVal.textContent = `$${(comboDetails.discountedTotal / 4).toFixed(2)}`;
    if (descVal) descVal.textContent = size.desc;

    // Update prices on modal combo cards
    if (product.comboOffers) {
      product.comboOffers.forEach(c => {
        const tier = this.getComboDetails(product, c.qty, sizeId);
        const card = document.getElementById(`modal-combo-card-${c.qty}`);
        if (card) {
          const pEl = card.querySelector('.modal-combo-price');
          const uEl = card.querySelector('.modal-combo-perunit');
          const sEl = card.querySelector('.modal-combo-save-pill');
          if (pEl) pEl.textContent = `$${Number(tier.discountedTotal).toFixed(2)}`;
          if (uEl) uEl.textContent = `$${tier.perUnit}/ea`;
          if (sEl && tier.savedAmount > 0) sEl.textContent = `Save $${Number(tier.savedAmount).toFixed(2)}`;
        }
      });
    }

    // Update active state on size cards
    document.querySelectorAll('.modal-size-card').forEach(c => {
      c.classList.toggle('active', c.id === `modal-size-card-${sizeId}`);
    });

    // Update active state on thumbnails
    document.querySelectorAll('.modal-thumb-btn').forEach(btn => {
      const img = btn.querySelector('img');
      btn.classList.toggle('active', img && img.src.includes(size.image.replace('./', '')));
    });

    // Sync card if visible
    this.selectCardSize(product.id, sizeId);
  }

  selectModalCombo(qty) {
    const product = this.getProductById(this.modalActiveProductId);
    if (!product || !product.comboOffers) return;

    this.modalSelectedComboQty = qty;
    this.selectedCardCombos[product.id] = qty;

    const comboDetails = this.getComboDetails(product, qty, this.modalSelectedSizeId);

    const priceVal = document.getElementById('modal-price-val');
    const oldPriceVal = document.getElementById('modal-oldprice-val');
    const payLaterVal = document.getElementById('modal-paylater-val');

    if (priceVal) priceVal.textContent = `$${Number(comboDetails.discountedTotal).toFixed(2)}`;
    if (oldPriceVal) {
      if (comboDetails.discountPct > 0) {
        oldPriceVal.textContent = `$${Number(comboDetails.regularTotal).toFixed(2)}`;
        oldPriceVal.style.display = 'inline';
      } else {
        const activeSize = product.variants?.sizes?.find(s => s.id === this.modalSelectedSizeId);
        const orig = activeSize ? activeSize.originalPrice : product.originalPrice;
        if (orig) {
          oldPriceVal.textContent = `$${Number(orig).toFixed(2)}`;
          oldPriceEl.style.display = 'inline';
        } else {
          oldPriceVal.style.display = 'none';
        }
      }
    }
    if (payLaterVal) payLaterVal.textContent = `$${(comboDetails.discountedTotal / 4).toFixed(2)}`;

    // Update active class on combo cards
    document.querySelectorAll('.modal-combo-card').forEach(c => {
      c.classList.toggle('active', c.id === `modal-combo-card-${qty}`);
    });

    // Also sync catalog card if visible
    this.selectCardCombo(product.id, qty);
  }

  onModalThumbClick(imgSrc, sizeId) {
    const mainImg = document.getElementById('modal-main-img');
    if (mainImg) mainImg.src = imgSrc;

    if (sizeId) {
      this.selectModalSize(sizeId);
    } else {
      document.querySelectorAll('.modal-thumb-btn').forEach(btn => {
        const img = btn.querySelector('img');
        btn.classList.toggle('active', img && img.src.includes(imgSrc.replace('./', '')));
      });
    }
  }

  addModalItemToCart(id) {
    const product = this.getProductById(id);
    const select = document.getElementById('modal-variant-select');
    const selectedColor = select ? select.value : (product?.variants?.colors?.[0] || null);

    if (product && window.cart) {
      const activeSize = product.variants?.sizes ? (product.variants.sizes.find(s => s.id === this.modalSelectedSizeId) || product.variants.sizes[0]) : null;
      if (!this.ensureInStock(product, activeSize ? activeSize.id : this.modalSelectedSizeId)) return;
      const sizeLabel = activeSize ? `${activeSize.label} (${activeSize.dimension})` : null;
      const sizeImage = activeSize ? activeSize.image : product.image;

      const comboQty = this.modalSelectedComboQty || 1;
      const comboDetails = this.getComboDetails(product, comboQty, this.modalSelectedSizeId);

      if (comboQty > 1) {
        window.cart.addItem(product, 1, selectedColor, sizeLabel, comboDetails.discountedTotal, sizeImage, comboDetails);
      } else {
        window.cart.addItem(product, 1, selectedColor, sizeLabel, activeSize ? activeSize.price : product.price, sizeImage);
      }
      this.closeProductModal();
      window.cart.openCartDrawer();
    }
  }

  buyNowWithPayPal(id) {
    const product = this.getProductById(id);
    const select = document.getElementById('modal-variant-select');
    const selectedColor = select ? select.value : (product?.variants?.colors?.[0] || null);

    if (product) {
      const activeSize = product.variants?.sizes ? (product.variants.sizes.find(s => s.id === this.modalSelectedSizeId) || product.variants.sizes[0]) : null;
      const sizeId = activeSize ? activeSize.id : this.modalSelectedSizeId;
      if (!this.ensureInStock(product, sizeId)) return;
      const sizeLabel = activeSize ? `${activeSize.label} (${activeSize.dimension})` : null;
      const sizeImage = activeSize ? activeSize.image : product.image;

      const comboQty = this.modalSelectedComboQty || 1;
      const comboDetails = this.getComboDetails(product, comboQty, this.modalSelectedSizeId);

      // Add to local cart for tracking
      if (window.cart) {
        if (comboQty > 1) {
          window.cart.addItem(product, 1, selectedColor, sizeLabel, comboDetails.discountedTotal, sizeImage, comboDetails);
        } else {
          window.cart.addItem(product, 1, selectedColor, sizeLabel, activeSize ? activeSize.price : product.price, sizeImage);
        }
      }

      this.closeProductModal();

      if (window.shopifyIntegration) {
        this.showToast('Redirecting to Shopify & CJ checkout...', 'info');
        window.shopifyIntegration.buyNow(id, sizeId, comboQty);
      } else if (window.checkoutManager) {
        window.checkoutManager.openCheckout(2);
        this.showToast('Opening Shopify Checkout...', 'info');
      }
    }
  }

  closeProductModal() {
    document.getElementById('product-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* ================= LIVE SEARCH AUTOCOMPLETE ================= */
  handleSearchInput(value) {
    this.searchQuery = value.trim();
    const dropdown = document.getElementById('search-autocomplete-dropdown');
    if (!dropdown) return;

    if (!this.searchQuery) {
      dropdown.classList.add('hidden');
      this.renderProducts();
      return;
    }

    const q = this.searchQuery.toLowerCase();
    const matches = this.products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No matching solar lanterns found for "${this.searchQuery}".
        </div>
      `;
      dropdown.classList.remove('hidden');
      this.renderProducts();
      return;
    }

    dropdown.innerHTML = matches.slice(0, 5).map(p => `
      <div class="search-result-item" onclick="window.app.selectSearchResult('${p.id}')">
        <img src="${p.image}" alt="${p.name}" class="search-result-thumb">
        <div class="search-result-info">
          <div class="search-result-name">${p.name}</div>
          <div class="search-result-price">$${Number(p.price).toFixed(2)} • ★ ${p.rating}</div>
        </div>
        <button type="button" class="btn-primary-gold" onclick="event.stopPropagation(); window.app.addCardItemToCart('${p.id}');" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;">
          + Add
        </button>
      </div>
    `).join('');

    dropdown.classList.remove('hidden');
    this.renderProducts();
    if (window.lucide) window.lucide.createIcons();
  }

  selectSearchResult(id) {
    const dropdown = document.getElementById('search-autocomplete-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    this.openProductModal(id);
  }

  /* ================= FAQ & POLICY INFO MODALS ================= */
  openFaqModal() {
    document.getElementById('faq-modal-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }

  closeFaqModal() {
    document.getElementById('faq-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  openInfoModal(topicKey) {
    const infoPages = {
      packaging: {
        title: 'Carbon-Neutral Botanical Packaging',
        body: '<p>Every BAMBOOLUME lantern ships in molded recycled kraft pulp inserts and plastic-free botanical starch tape. Multi-lantern bundles are consolidated whenever possible to reduce transit emissions.</p>'
      },
      warranty: {
        title: '2-Year Solar Performance Warranty',
        body: '<p>Your lantern electronics, monocrystalline solar cap, dusk-to-dawn optical sensor, and LiFePO4 battery cell are covered for 2 full years from delivery against manufacturing or solar-charging defects.</p>'
      },
      shipping: {
        title: 'Shipping & 30-Day Returns Policy',
        body: '<p><strong>Worldwide Tracked Delivery:</strong> Orders placed via Shopify Checkout are automatically synced to fulfillment with carrier tracking emailed upon dispatch.<br><br><strong>Returns &amp; Replacements:</strong> Contact support within 30 days of delivery for damaged-in-transit replacements or eligible returns.</p>'
      },
      maintenance: {
        title: 'Weatherproofing & Bamboo Care',
        body: '<p>Wipe the top monocrystalline solar lid every 4–6 weeks with a damp cloth to keep charging efficiency optimal. Brush seasoned Moso bamboo weaves lightly with a dry cloth; all lanterns are IP65 rain-sealed for outdoor mounting.</p>'
      },
      battery: {
        title: 'LiFePO4 Battery Care Guide',
        body: '<p>Place lanterns outdoors in direct or diffuse daylight for 6–8 hours during initial setup. Each replaceable LiFePO4 cell is rated for 2,500+ nightly discharge cycles and accesses cleanly with a standard screwdriver.</p>'
      },
      terms: {
        title: 'Terms of Service',
        body: '<p>All orders, pricing, taxes, shipping calculations, and payments are securely processed at checkout through our official Shopify store (<code>auv1g7-nc.myshopify.com</code>).</p>'
      },
      sustainability: {
        title: 'Sustainable Bamboo Harvest Report',
        body: '<p>BAMBOOLUME sources seasoned Moso bamboo culms that regenerate naturally from root networks without chemical pesticides, paired with zero-grid solar LED lighting.</p>'
      }
    };

    const entry = infoPages[topicKey];
    if (!entry) return;

    const titleEl = document.getElementById('policy-modal-title');
    const bodyEl = document.getElementById('policy-modal-body');
    if (titleEl) titleEl.textContent = entry.title;
    if (bodyEl) bodyEl.innerHTML = entry.body;

    document.getElementById('policy-modal-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }

  closeInfoModal() {
    document.getElementById('policy-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* ================= EVENTS BINDING ================= */
  bindEvents() {
    // Category tabs
    document.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.activeCategory = e.currentTarget.getAttribute('data-category');
        this.renderProducts();
      });
    });

    // Sorting dropdown
    document.getElementById('catalog-sort-select')?.addEventListener('change', (e) => {
      this.activeSort = e.target.value;
      this.renderProducts();
    });

    // Global Search with Autocomplete
    const searchInput = document.getElementById('global-search-input');
    searchInput?.addEventListener('input', (e) => this.handleSearchInput(e.target.value));

    // Close search dropdown on click outside or Esc
    document.addEventListener('click', (e) => {
      const wrapper = document.querySelector('.search-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('search-autocomplete-dropdown')?.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('search-autocomplete-dropdown')?.classList.add('hidden');
      }
    });

    // Wishlist Drawer Triggers
    document.getElementById('wishlist-btn')?.addEventListener('click', () => this.openWishlistDrawer());
    document.getElementById('close-wishlist-btn')?.addEventListener('click', () => this.closeWishlistDrawer());
    document.getElementById('wishlist-drawer-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'wishlist-drawer-overlay') this.closeWishlistDrawer();
    });
    document.getElementById('wishlist-move-all-btn')?.addEventListener('click', () => this.moveAllWishlistToCart());
    document.getElementById('wishlist-clear-btn')?.addEventListener('click', () => this.clearWishlist());

    // FAQ Modal Triggers
    document.getElementById('faq-btn')?.addEventListener('click', () => this.openFaqModal());
    document.getElementById('footer-faq-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openFaqModal();
    });
    document.getElementById('close-faq-btn')?.addEventListener('click', () => this.closeFaqModal());
    document.getElementById('faq-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'faq-modal-overlay') this.closeFaqModal();
    });

    // Footer Policy & Guide Modal Triggers
    document.querySelectorAll('[data-info-topic]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.openInfoModal(link.getAttribute('data-info-topic'));
      });
    });
    document.getElementById('close-policy-btn')?.addEventListener('click', () => this.closeInfoModal());
    document.getElementById('policy-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'policy-modal-overlay') this.closeInfoModal();
    });

    // Close Product Modal Button
    document.getElementById('close-modal-btn')?.addEventListener('click', () => this.closeProductModal());
    document.getElementById('product-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'product-modal-overlay') this.closeProductModal();
    });

    // Mobile Navigation Drawer Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
    const toggleMobileMenu = (forceClose = false) => {
      if (!mobileNavDrawer) return;
      const shouldOpen = forceClose ? false : mobileNavDrawer.classList.contains('hidden');
      if (shouldOpen) {
        mobileNavDrawer.classList.remove('hidden');
        mobileMenuBtn?.classList.add('active');
        if (mobileMenuBtn) {
          mobileMenuBtn.innerHTML = `<i data-lucide="x"></i>`;
          if (window.lucide) window.lucide.createIcons();
        }
      } else {
        mobileNavDrawer.classList.add('hidden');
        mobileMenuBtn?.classList.remove('active');
        if (mobileMenuBtn) {
          mobileMenuBtn.innerHTML = `<i data-lucide="menu"></i>`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    };

    mobileMenuBtn?.addEventListener('click', () => toggleMobileMenu());

    // Auto-close mobile drawer when any link is tapped
    document.querySelectorAll('[data-mobile-link]').forEach(link => {
      link.addEventListener('click', () => toggleMobileMenu(true));
    });

    // Mobile Search Input
    const mobileSearchInput = document.getElementById('mobile-search-input');
    mobileSearchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      this.handleSearchInput(val);
      if (val.trim().length > 0) {
        document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Mobile Drawer Quick Action Triggers
    document.getElementById('mobile-auth-trigger')?.addEventListener('click', () => {
      toggleMobileMenu(true);
      document.getElementById('nav-auth-btn')?.click();
    });

    document.getElementById('mobile-wishlist-trigger')?.addEventListener('click', () => {
      toggleMobileMenu(true);
      this.openWishlistDrawer();
    });

    document.getElementById('mobile-orders-trigger')?.addEventListener('click', () => {
      toggleMobileMenu(true);
      window.ordersManager?.openOrdersDrawer();
    });

    document.getElementById('mobile-faq-trigger')?.addEventListener('click', () => {
      toggleMobileMenu(true);
      this.openFaqModal();
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'info'}" style="color: var(--bamboo-gold);"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Global App Instance
window.app = new App();
window.showToast = (msg, type) => window.app?.showToast(msg, type);
