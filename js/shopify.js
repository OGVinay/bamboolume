/**
 * BAMBOOLUME Shopify Storefront & CJ Dropshipping Integration
 * Connected to: auv1g7-nc.myshopify.com
 * Automated Fulfillment: CJ Dropshipping -> Shopify -> Customer
 */

class ShopifyIntegration {
  constructor() {
    this.storeDomain = 'auv1g7-nc.myshopify.com';
    this.storefrontToken = '66bacc09149b1266c889f8371962cdbe';
    this.graphqlEndpoint = `https://${this.storeDomain}/api/2025-01/graphql.json`;
    this.variantInventory = {};

    // Live Product & Variant mappings connected from Shopify & CJ Dropshipping
    this.variantMap = {
      // 1. The Zen Pavilion Hanging Solar Lantern (Shopify Product ID: 10370472837218)
      'lantern-1': {
        'small-cylinder': '50921580494946', // Bamboo Lantern (Small 22cm) - SKU: CJYD247340301AZ
        'large-teardrop': '50921580527714', // Bamboo Lantern Spherical (Large 24cm) - SKU: CJYD247340302BY
        'default': '50921580494946'
      },
      // 2. The Kyoto Kadomatsu Bamboo Stalk Solar (Shopify Product ID: 10372417192034)
      'lantern-2': {
        'small': '50933592162402',  // Power Connection Height 30CM - SKU: CJYD186467001AZ
        'medium': '50933592195170', // Power Connection Height 40CM - SKU: CJYD186467002BY
        'large': '50933592227938',  // Power Connection Height 50CM - SKU: CJYD186467003CX
        'trio': ['50933592162402', '50933592195170', '50933592227938'], // Complete Trio Set (all 3 stalks)
        'default': '50933592162402'
      },
      // 3. The Riviera Terrace Honeycomb Tabletop Solar Lantern (Shopify Product ID: 10372464541794)
      'lantern-3': {
        'default': '50933936324706' // Style 1 - SKU: CJYD202529501AZ
      },
      // 4. The Taketora Patio Tripod Solar Floor Lantern (Shopify Product ID: 10372464541794)
      'lantern-4': {
        'default': '50933936357474' // Style 3 - SKU: CJYD202529503CX
      }
    };

    // Default fallback variant ID for single product dropshipping setups
    this.fallbackVariantId = '50921580494946';
  }

  /**
   * Resolve Shopify Variant ID from local product ID and size ID
   */
  getVariantId(productId, sizeId) {
    const product = this.variantMap[productId];
    if (!product) return this.fallbackVariantId;

    if (sizeId) {
      const lower = sizeId.toLowerCase();

      // lantern-1 (Zen Pavilion Hanging)
      if (lower.includes('large-teardrop') || lower.includes('teardrop') || lower.includes('spherical') || lower.includes('24cm')) {
        return product['large-teardrop'] || product.default;
      }
      if (lower.includes('small-cylinder') || lower.includes('cylinder') || lower.includes('22cm')) {
        return product['small-cylinder'] || product.default;
      }

      // lantern-2 (Kyoto Kadomatsu Stalks)
      if (lower.includes('trio') || lower.includes('complete')) {
        return product['trio'] || product.default;
      }
      if (lower.includes('50cm') || lower === 'large' || lower.includes('large (50cm')) {
        return product['large'] || product.default;
      }
      if (lower.includes('40cm') || lower === 'medium' || lower.includes('medium (40cm')) {
        return product['medium'] || product.default;
      }
      if (lower.includes('30cm') || lower === 'small' || lower.includes('small (30cm')) {
        return product['small'] || product.default;
      }

      if (product[sizeId]) return product[sizeId];
    }

    return product.default || this.fallbackVariantId;
  }

  /**
   * Read currently applied cart promo code, if any
   */
  getActiveDiscountCode() {
    const code = window.cart?.appliedPromo?.code;
    if (!code) return null;
    if (typeof window.cart?.isPromoEligible === 'function' && !window.cart.isPromoEligible()) {
      return null;
    }
    return String(code).trim();
  }

  /**
   * Build direct Shopify Cart Permalink
   * e.g. https://auv1g7-nc.myshopify.com/cart/50921580494946:1
   */
  buildCartPermalink(cartItems, customer = null) {
    if (!cartItems || cartItems.length === 0) return null;

    const parts = [];
    cartItems.forEach(item => {
      const sizeId = item.selectedSize || (item.variants?.sizes?.[0]?.id) || null;
      const variantResolution = this.getVariantId(item.id, sizeId);
      const qty = item.comboInfo && item.comboInfo.qty ? (item.comboInfo.qty * item.quantity) : item.quantity;
      
      if (Array.isArray(variantResolution)) {
        // Multi-variant bundle (e.g. Trio Set contains 1 of each stalk size)
        variantResolution.forEach(vId => {
          parts.push(`${vId}:${qty}`);
        });
      } else {
        parts.push(`${variantResolution}:${qty}`);
      }
    });

    let checkoutUrl = `https://${this.storeDomain}/cart/${parts.join(',')}`;

    // Add optional prefilled checkout fields & active discount code
    const params = new URLSearchParams();
    const discountCode = this.getActiveDiscountCode();
    if (discountCode) {
      params.append('discount', discountCode);
    }
    if (customer) {
      if (customer.email) params.append('checkout[email]', customer.email);
      if (customer.name) {
        const nameParts = customer.name.trim().split(' ');
        params.append('checkout[shipping_address][first_name]', nameParts[0] || '');
        if (nameParts.length > 1) {
          params.append('checkout[shipping_address][last_name]', nameParts.slice(1).join(' '));
        }
      }
      if (customer.address) params.append('checkout[shipping_address][address1]', customer.address);
      if (customer.city) params.append('checkout[shipping_address][city]', customer.city);
      if (customer.zip) params.append('checkout[shipping_address][zip]', customer.zip);
    }

    const qs = params.toString();
    if (qs) {
      checkoutUrl += `?${qs}`;
    }

    return checkoutUrl;
  }

  /**
   * Launch Shopify Checkout in a new tab so Bamboolume stays open behind it
   */
  openCheckoutUrl(url) {
    if (!url) return;
    window.cart?.closeCartDrawer?.();
    window.checkoutManager?.closeCheckout?.();
    // Omit 'noopener' from windowFeatures so browsers return the WindowProxy instead of null
    const popup = window.open(url, '_blank');
    if (popup) {
      try {
        popup.opener = null;
      } catch (_) {}
    } else {
      window.location.href = url;
    }
  }

  /**
   * Fetch live availability & stock counts from Shopify Storefront API
   */
  async fetchLiveInventory() {
    const query = `
      {
        products(first: 20) {
          edges {
            node {
              variants(first: 20) {
                edges {
                  node {
                    id
                    availableForSale
                    quantityAvailable
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken
        },
        body: JSON.stringify({ query })
      });
      const json = await response.json();
      const edges = json?.data?.products?.edges || [];
      const nextMap = {};
      edges.forEach(pe => {
        (pe?.node?.variants?.edges || []).forEach(ve => {
          const v = ve?.node;
          if (!v?.id) return;
          const numericId = v.id.split('/').pop();
          nextMap[numericId] = {
            availableForSale: Boolean(v.availableForSale),
            quantityAvailable: typeof v.quantityAvailable === 'number' ? v.quantityAvailable : null
          };
        });
      });
      if (Object.keys(nextMap).length > 0) {
        this.variantInventory = nextMap;
      }
      return this.variantInventory;
    } catch (e) {
      console.warn('Unable to sync live Shopify inventory, using fallback counts', e);
      return null;
    }
  }

  /**
   * Resolve stock availability & remaining count for a product/size
   */
  getStockForProduct(product, sizeId = null) {
    if (!product) return { inStock: false, stockCount: 0, isLiveCount: false };

    const activeSize = sizeId && product.variants?.sizes
      ? product.variants.sizes.find(s => s.id === sizeId)
      : product.variants?.sizes?.[0];
    const fallbackCount = activeSize?.stockCount ?? product.stockCount ?? 0;

    const resolved = this.getVariantId(product.id, sizeId);
    const variantIds = Array.isArray(resolved) ? resolved : [resolved];
    const records = variantIds.map(id => this.variantInventory[id]).filter(Boolean);

    if (records.length === variantIds.length && records.length > 0) {
      const inStock = records.every(r => r.availableForSale);
      const liveCounts = records.map(r => r.quantityAvailable).filter(q => typeof q === 'number');
      if (liveCounts.length === records.length) {
        return {
          inStock: inStock && Math.min(...liveCounts) > 0,
          stockCount: Math.min(...liveCounts),
          isLiveCount: true
        };
      }
      return {
        inStock,
        stockCount: inStock ? fallbackCount : 0,
        isLiveCount: false
      };
    }

    return {
      inStock: product.inStock !== false && fallbackCount > 0,
      stockCount: fallbackCount,
      isLiveCount: false
    };
  }

  /**
   * Instant 1-Click Buy Now for a specific product and size
   */
  buyNow(productId, sizeId, quantity = 1) {
    const variantResolution = this.getVariantId(productId, sizeId);
    let parts;
    if (Array.isArray(variantResolution)) {
      parts = variantResolution.map(vId => `${vId}:${quantity}`).join(',');
    } else {
      parts = `${variantResolution}:${quantity}`;
    }
    let url = `https://${this.storeDomain}/cart/${parts}`;
    const discountCode = this.getActiveDiscountCode();
    if (discountCode) {
      url += `?discount=${encodeURIComponent(discountCode)}`;
    }
    this.openCheckoutUrl(url);
  }

  /**
   * Create checkout via Storefront API (GraphQL cartCreate)
   */
  async createStorefrontCheckout(cartItems) {
    if (!cartItems || cartItems.length === 0) return null;

    const lines = [];
    cartItems.forEach(item => {
      const sizeId = item.selectedSize || null;
      const variantResolution = this.getVariantId(item.id, sizeId);
      const qty = item.comboInfo && item.comboInfo.qty ? (item.comboInfo.qty * item.quantity) : item.quantity;
      
      if (Array.isArray(variantResolution)) {
        variantResolution.forEach(vId => {
          lines.push({
            merchandiseId: `gid://shopify/ProductVariant/${vId}`,
            quantity: Number(qty)
          });
        });
      } else {
        lines.push({
          merchandiseId: `gid://shopify/ProductVariant/${variantResolution}`,
          quantity: Number(qty)
        });
      }
    });

    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    try {
      const discountCode = this.getActiveDiscountCode();
      const cartInput = discountCode ? { lines, discountCodes: [discountCode] } : { lines };

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken
        },
        body: JSON.stringify({
          query: mutation,
          variables: { input: cartInput }
        })
      });

      const data = await response.json();
      if (data.data?.cartCreate?.cart?.checkoutUrl) {
        return data.data.cartCreate.cart.checkoutUrl;
      }
    } catch (e) {
      console.warn('Storefront API Cart creation fallback to permalink', e);
    }

    // Fallback to direct cart permalink
    return this.buildCartPermalink(cartItems);
  }

  /**
   * Redirect to Shopify Checkout in a new tab
   */
  async proceedToCheckout(cartItems, customer = null) {
    if (window.showToast) window.showToast('Opening Shopify Checkout in a new tab...', 'info');
    
    // First try direct permalink with prefilled address
    const permalink = this.buildCartPermalink(cartItems, customer);
    if (permalink) {
      this.openCheckoutUrl(permalink);
      return;
    }

    // Alternative via API
    const apiUrl = await this.createStorefrontCheckout(cartItems);
    if (apiUrl) {
      this.openCheckoutUrl(apiUrl);
    }
  }
}

// Global Shopify Singleton
window.shopifyIntegration = new ShopifyIntegration();
