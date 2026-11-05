/**
 * BAMBOOLUME — Product Reviews & Customer Rating System
 */

class ReviewsManager {
  constructor() {
    this.storageKey = 'bamboolume_reviews_v1';
    this.reviews = this.loadReviews();
    this.activeProductId = null;
    this.selectedRating = 5;
    this.init();
  }

  loadReviews() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
    } catch (e) {}

    // Initial curated botanical reviews
    return {
      'lantern-1': [
        {
          id: 'rev-1',
          author: 'Dr. Evelyn Vance',
          rating: 5,
          title: 'Pure botanical enchantment — dusk to dawn glow',
          comment: 'The Moso bamboo cage feels genuinely handcrafted by master artisans. It weathered torrential rainstorms here in the Pacific Northwest without a hitch, and the 2200K amber glow was still luminous at 5:30 AM sunrise!',
          verified: true,
          date: 'Oct 21, 2026',
          helpful: 34
        },
        {
          id: 'rev-2',
          author: 'Marcus Thorne',
          rating: 5,
          title: 'True warm candlelight — no harsh blue tint',
          comment: 'Most solar lights on the market have an artificial, cold blue LED. Bamboolume nailed the gentle warm candle amber. Highly recommend!',
          verified: true,
          date: 'Oct 18, 2026',
          helpful: 19
        },
        {
          id: 'rev-3',
          author: 'Sarah Jenkins',
          rating: 4,
          title: 'Hypnotic patio shadows',
          comment: 'The faceted weave casts stunning geometric bamboo silhouettes across our flagstone terrace. Took 5 hours of midday sun to reach maximum runtime.',
          verified: true,
          date: 'Oct 12, 2026',
          helpful: 8
        }
      ],
      'lantern-2': [
        {
          id: 'rev-4',
          author: 'Kenji Sato',
          rating: 5,
          title: 'Serene Kadomatsu bamboo glow among our garden stones',
          comment: 'The three-tiered natural bamboo stalks look breathtaking nestled on our lawn by the garden stones. The warm amber candlelight glowing from inside each cut stalk creates a peaceful Zen sanctuary at night.',
          verified: true,
          date: 'Oct 15, 2026',
          helpful: 24
        }
      ],
      'lantern-3': [
        {
          id: 'rev-5',
          author: 'Amara Lin',
          rating: 5,
          title: 'Mesmerizing honeycomb shadows across our terrace table',
          comment: 'We placed two of these on our outdoor seaside dining table. The woven bamboo honeycomb pattern creates such an intimate, magical pattern across our tablecloth. Guests compliment them every single evening!',
          verified: true,
          date: 'Oct 19, 2026',
          helpful: 31
        }
      ],
      'lantern-4': [
        {
          id: 'rev-6',
          author: 'Julian Montgomery',
          rating: 5,
          title: 'The radial shadow beams on our patio deck are breathtaking!',
          comment: 'We placed this 58cm tripod floor lantern next to our stucco garden wall. When dusk falls, the vertical bamboo slats cast the most dramatic, high-end architectural shadows across the terrace. Pure luxury without wires.',
          verified: true,
          date: 'Nov 01, 2026',
          helpful: 42
        },
        {
          id: 'rev-7',
          author: 'Helena Rostova',
          rating: 5,
          title: 'Sturdy tripod legs and dusk-to-dawn runtime',
          comment: 'The matte black tripod legs keep it very stable even during breezy autumn evenings. The top solar disc charges quickly and stays illuminated with that rich amber glow until morning.',
          verified: true,
          date: 'Oct 29, 2026',
          helpful: 18
        }
      ]
    };
  }

  saveReviews() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.reviews));
    } catch (e) {
      console.error('Failed to save reviews', e);
    }
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('close-review-modal-btn')?.addEventListener('click', () => this.closeReviewModal());
    document.getElementById('review-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'review-modal-overlay') this.closeReviewModal();
    });

    // Interactive Star Selector in Review Modal
    document.querySelectorAll('.star-rating-select .star-pick').forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-value'));
        this.setStarSelection(rating);
      });
      star.addEventListener('mouseenter', () => {
        const rating = parseInt(star.getAttribute('data-value'));
        this.highlightStars(rating);
      });
    });

    document.querySelector('.star-rating-select')?.addEventListener('mouseleave', () => {
      this.highlightStars(this.selectedRating);
    });

    // Submit Review Form
    document.getElementById('write-review-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmitReview();
    });
  }

  setStarSelection(rating) {
    this.selectedRating = rating;
    this.highlightStars(rating);
    const label = document.getElementById('star-rating-text');
    const descriptions = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Exceptional — Highly Recommended!'];
    if (label) label.textContent = descriptions[rating] || '';
  }

  highlightStars(rating) {
    document.querySelectorAll('.star-rating-select .star-pick').forEach(s => {
      const v = parseInt(s.getAttribute('data-value'));
      s.classList.toggle('selected', v <= rating);
    });
  }

  getRatingSummary(productId) {
    const list = this.reviews[productId] || [];
    if (list.length === 0) {
      return { average: 5.0, count: 0, distribution: { 5: 100, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }

    const total = list.reduce((sum, r) => sum + r.rating, 0);
    const average = (total / list.length).toFixed(1);

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach(r => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[rounded] = (counts[rounded] || 0) + 1;
    });

    const distribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = Math.round((counts[i] / list.length) * 100);
    }

    return { average, count: list.length, distribution };
  }

  openReviewModal(productId) {
    this.activeProductId = productId;
    const product = window.app?.products?.find(p => p.id === productId);
    const modalProductTitle = document.getElementById('review-product-title');
    if (modalProductTitle && product) {
      modalProductTitle.textContent = product.name;
    }

    // Pre-fill reviewer name if user is logged in
    const authorInput = document.getElementById('review-author-name');
    if (authorInput && window.authManager?.currentUser) {
      authorInput.value = window.authManager.currentUser.name;
    }

    this.setStarSelection(5);
    document.getElementById('review-modal-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }

  closeReviewModal() {
    document.getElementById('review-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  handleSubmitReview() {
    if (!this.activeProductId) return;

    const author = document.getElementById('review-author-name')?.value.trim() || 'Verified Solar Enthusiast';
    const title = document.getElementById('review-headline')?.value.trim();
    const comment = document.getElementById('review-comment')?.value.trim();

    if (!title || !comment) {
      window.showToast('Please provide a review headline and comment', 'info');
      return;
    }

    if (!this.reviews[this.activeProductId]) {
      this.reviews[this.activeProductId] = [];
    }

    const newReview = {
      id: `rev-${Date.now()}`,
      author,
      rating: this.selectedRating,
      title,
      comment,
      verified: true,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      helpful: 1
    };

    this.reviews[this.activeProductId].unshift(newReview);
    this.saveReviews();
    this.closeReviewModal();
    document.getElementById('write-review-form')?.reset();

    // Re-render modal reviews section and product catalog cards
    this.renderReviewsSection(this.activeProductId, 'modal-reviews-container');
    window.app?.renderProducts();

    window.showToast('Thank you! Your verified botanical review has been published.', 'success');
  }

  upvoteHelpful(reviewId) {
    for (const pid in this.reviews) {
      const rev = this.reviews[pid].find(r => r.id === reviewId);
      if (rev) {
        rev.helpful = (rev.helpful || 0) + 1;
        this.saveReviews();
        this.renderReviewsSection(pid, 'modal-reviews-container');
        window.showToast('Thank you for your feedback!', 'info');
        break;
      }
    }
  }

  renderReviewsSection(productId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const summary = this.getRatingSummary(productId);
    const list = this.reviews[productId] || [];

    container.innerHTML = `
      <div class="reviews-header-block">
        <div class="rating-overview-card">
          <div class="rating-big-num">${summary.average}</div>
          <div class="rating-stars-gold">
            ${'★'.repeat(Math.round(summary.average))}${'☆'.repeat(5 - Math.round(summary.average))}
          </div>
          <div class="rating-count-text">Based on ${summary.count} verified reviews</div>
        </div>

        <div class="rating-bars-card">
          ${[5, 4, 3, 2, 1].map(stars => `
            <div class="rating-bar-row">
              <span class="bar-star-label">${stars} ★</span>
              <div class="rating-progress-track">
                <div class="rating-progress-fill" style="width: ${summary.distribution[stars] || 0}%;"></div>
              </div>
              <span class="bar-pct-label">${summary.distribution[stars] || 0}%</span>
            </div>
          `).join('')}
        </div>

        <div class="write-review-cta-card">
          <p style="font-size: 0.85rem; color: var(--charcoal); margin-bottom: 0.8rem;">
            Own this handcrafted solar lantern? Share your garden lighting experience.
          </p>
          <button type="button" class="btn-primary-gold" onclick="window.reviewsManager.openReviewModal('${productId}')" style="width: 100%; justify-content: center;">
            <i data-lucide="edit-3"></i> Write a Customer Review
          </button>
        </div>
      </div>

      <div class="customer-reviews-list">
        ${list.length === 0 ? `
          <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i data-lucide="message-square" style="width: 36px; height: 36px; margin-bottom: 0.5rem; color: var(--bamboo-gold);"></i>
            <h4>No reviews yet</h4>
            <p style="font-size: 0.85rem;">Be the first customer to review this handcrafted lantern.</p>
          </div>
        ` : list.map(rev => `
          <div class="review-entry-card">
            <div class="review-entry-top">
              <div>
                <div class="review-stars-row">
                  ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
                </div>
                <strong class="review-entry-title">${rev.title}</strong>
              </div>
              <span class="review-entry-date">${rev.date}</span>
            </div>

            <div class="review-entry-author">
              <i data-lucide="user-check" style="width: 14px; height: 14px; color: var(--bamboo-green);"></i>
              <strong>${rev.author}</strong>
              ${rev.verified ? `<span class="verified-buyer-pill"><i data-lucide="shield-check" style="width: 11px; height: 11px;"></i> Verified Solar Buyer</span>` : ''}
            </div>

            <p class="review-entry-body">${rev.comment}</p>

            <div class="review-entry-actions">
              <button type="button" class="btn-helpful" onclick="window.reviewsManager.upvoteHelpful('${rev.id}')">
                <i data-lucide="thumbs-up" style="width: 12px; height: 12px;"></i> Helpful (${rev.helpful || 0})
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }
}

// Global Reviews Instance
window.reviewsManager = new ReviewsManager();
