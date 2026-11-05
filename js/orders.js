/**
 * Bamboolume Orders & Live Status Tracker
 */

class OrdersManager {
  constructor() {
    this.storageKey = 'bamboolume_orders_v1';
    this.orders = this.loadOrders();
    this.init();
  }

  loadOrders() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
      
      // Default Demo Order if none exists
      return [
        {
          orderId: '#BL-84192',
          date: 'Oct 24, 2026',
          total: 89.00,
          paymentMethod: 'PayPal Express',
          transactionId: 'PAYID-MN68192A',
          items: [
            { name: 'The Zen Pavilion Hanging Solar Lantern', quantity: 1, price: 89.00, image: './assets/bamboo_hanging_lantern.jpg' }
          ],
          statusStage: 3, // 1: Confirmed, 2: Processing, 3: Shipped, 4: Out for Delivery, 5: Delivered
          estimatedDelivery: 'Tomorrow by 4:00 PM'
        }
      ];
    } catch (e) {
      return [];
    }
  }

  saveOrders() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.orders));
    } catch (e) {
      console.error('Failed to save orders', e);
    }
    this.renderOrdersList();
  }

  addOrder(orderData) {
    const newOrder = {
      ...orderData,
      statusStage: 2, // Processing
      estimatedDelivery: 'In 2-3 Business Days'
    };
    this.orders.unshift(newOrder);
    this.saveOrders();
  }

  init() {
    this.bindEvents();
    this.renderOrdersList();
  }

  bindEvents() {
    document.getElementById('orders-btn')?.addEventListener('click', () => this.openOrdersDrawer());
    document.getElementById('footer-orders-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openOrdersDrawer();
    });
    document.getElementById('close-orders-btn')?.addEventListener('click', () => this.closeOrdersDrawer());
    document.getElementById('orders-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'orders-overlay') this.closeOrdersDrawer();
    });
  }

  openOrdersDrawer() {
    document.getElementById('orders-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.renderOrdersList();
  }

  closeOrdersDrawer() {
    document.getElementById('orders-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  renderOrdersList() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    if (this.orders.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon"><i data-lucide="package-open"></i></div>
          <h4>No active orders</h4>
          <p>Once you make a purchase, track live delivery status here.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = this.orders.map(order => {
      const stage = order.statusStage || 2;
      return `
        <div class="order-card-track">
          <div class="track-header">
            <div>
              <strong>${order.orderId}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${order.date}</div>
            </div>
            <div style="text-align: right;">
              <strong style="color: var(--deep-forest); font-size: 1.05rem;">$${order.total.toFixed(2)}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: flex-end; gap: 0.3rem;">
                ${order.paymentMethod && order.paymentMethod.includes('PayPal') ? '<img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" style="width: 13px; height: 13px; vertical-align: middle;">' : ''}
                ${order.paymentMethod}
              </div>
              ${order.transactionId ? `<div style="font-size: 0.68rem; font-family: monospace; color: #0070BA; font-weight: 600;">${order.transactionId}</div>` : ''}
            </div>
          </div>

          <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem;">
            Estimated Delivery: <span style="color: var(--success);">${order.estimatedDelivery}</span>
          </div>

          <!-- Timeline -->
          <div class="track-timeline">
            <div class="track-step ${stage >= 1 ? 'done' : ''} ${stage === 1 ? 'active' : ''}">
              <div class="track-dot"><i data-lucide="check" style="width: 12px; height: 12px;"></i></div>
              <div class="track-info">
                <strong>Order Placed & Confirmed</strong>
                <span>Payment verified & order recorded</span>
              </div>
            </div>

            <div class="track-step ${stage >= 2 ? 'done' : ''} ${stage === 2 ? 'active' : ''}">
              <div class="track-dot"><i data-lucide="package" style="width: 12px; height: 12px;"></i></div>
              <div class="track-info">
                <strong>Warehouse Processing</strong>
                <span>Packed with eco-cushioning at Bamboolume Artisan Nursery Hub</span>
              </div>
            </div>

            <div class="track-step ${stage >= 3 ? 'done' : ''} ${stage === 3 ? 'active' : ''}">
              <div class="track-dot"><i data-lucide="truck" style="width: 12px; height: 12px;"></i></div>
              <div class="track-info">
                <strong>In Transit (FedEx Express)</strong>
                <span>Tracking # FX-9082194</span>
              </div>
            </div>

            <div class="track-step ${stage >= 4 ? 'done' : ''} ${stage === 4 ? 'active' : ''}">
              <div class="track-dot"><i data-lucide="map-pin" style="width: 12px; height: 12px;"></i></div>
              <div class="track-info">
                <strong>Out for Delivery</strong>
                <span>Driver on route to your location</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }
}

// Global Orders Instance
window.ordersManager = new OrdersManager();
