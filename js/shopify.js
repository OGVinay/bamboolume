/**
 * BAMBOOLUME Shopify Storefront & CJ Dropshipping Integration
 * Connected to: auv1g7-nc.myshopify.com
 * Automated Fulfillment: CJ Dropshipping -> Shopify -> Customer
 */

class ShopifyIntegration {
  constructor() {
    this.storeDomain = 'auv1g7-nc.myshopify.com';
    this.storefrontToken = '66bacc09149b1266c889f8371962cdbe';
    this.graphqlEndpoint = `https://${this.storeDomain}/api/2024-01/graphql.json`;

    // Live Product & Variant mappings from Shopify & CJ Dropshipping
    this.variantMap = {
      'lantern-1': {
        'small-cylinder': '50921580494946', // Bamboo Lantern (Small 22cm)
        'large-teardrop': '50921580527714', // Bamboo Lantern Spherical (Large 24cm)
        'default': '50921580494946'
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
      if (lower.includes('large') || lower.includes('teardrop') || lower.includes('spherical')) {
        return product['large-teardrop'] || product.default;
      }
      if (lower.includes('small') || lower.includes('cylinder')) {
        return product['small-cylinder'] || product.default;
      }
      if (product[sizeId]) return product[sizeId];
    }

    return product.default || this.fallbackVariantId;
  }

  /**
   * Build direct Shopify Cart Permalink
   * e.g. https://auv1g7-nc.myshopify.com/cart/50921580494946:1
   */
  buildCartPermalink(cartItems, customer = null) {
    if (!cartItems || cartItems.length === 0) return null;

    const parts = cartItems.map(item => {
      const sizeId = item.selectedSize || (item.variants?.sizes?.[0]?.id) || null;
      const variantId = this.getVariantId(item.id, sizeId);
      const qty = item.comboInfo && item.comboInfo.qty ? (item.comboInfo.qty * item.quantity) : item.quantity;
      return `${variantId}:${qty}`;
    });

    let checkoutUrl = `https://${this.storeDomain}/cart/${parts.join(',')}`;

    // Add optional prefilled checkout fields
    const params = new URLSearchParams();
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
   * Instant 1-Click Buy Now for a specific product and size
   */
  buyNow(productId, sizeId, quantity = 1) {
    const variantId = this.getVariantId(productId, sizeId);
    const url = `https://${this.storeDomain}/cart/${variantId}:${quantity}`;
    window.location.href = url;
  }

  /**
   * Create checkout via Storefront API (GraphQL cartCreate)
   */
  async createStorefrontCheckout(cartItems) {
    if (!cartItems || cartItems.length === 0) return null;

    const lines = cartItems.map(item => {
      const sizeId = item.selectedSize || null;
      const variantId = this.getVariantId(item.id, sizeId);
      const qty = item.comboInfo && item.comboInfo.qty ? (item.comboInfo.qty * item.quantity) : item.quantity;
      return {
        merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
        quantity: Number(qty)
      };
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
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken
        },
        body: JSON.stringify({
          query: mutation,
          variables: { input: { lines } }
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
   * Redirect to Shopify Checkout
   */
  async proceedToCheckout(cartItems, customer = null) {
    if (window.showToast) window.showToast('Redirecting to secure Shopify checkout...', 'info');
    
    // First try direct permalink with prefilled address
    const permalink = this.buildCartPermalink(cartItems, customer);
    if (permalink) {
      window.location.href = permalink;
      return;
    }

    // Alternative via API
    const apiUrl = await this.createStorefrontCheckout(cartItems);
    if (apiUrl) {
      window.location.href = apiUrl;
    }
  }
}

// Global Shopify Singleton
window.shopifyIntegration = new ShopifyIntegration();
