/**
 * BAMBOOLUME — Authentication, Password Security & User Profile Manager
 */

class AuthManager {
  constructor() {
    this.sessionKey = 'bamboolume_user_session_v1';
    this.usersDbKey = 'bamboolume_users_db_v1';
    this.initUsersDb();
    this.currentUser = this.loadSession();
    this.init();
  }

  initUsersDb() {
    if (!localStorage.getItem(this.usersDbKey)) {
      const defaultUsers = [
        {
          name: 'Vinay Kumar',
          email: 'vinay@bamboolume.com',
          password: 'Password123!',
          memberSince: 'March 2026',
          tier: 'Botanical Connoisseur (VIP)',
          rewardPoints: 480,
          savedAddresses: [
            {
              id: 'addr-1',
              label: 'Garden Residence (Primary)',
              fullName: 'Vinay Kumar',
              address: '742 Evergreen Terrace, Suite 4B',
              city: 'Seattle',
              state: 'WA',
              zip: '98101',
              country: 'United States'
            }
          ]
        }
      ];
      localStorage.setItem(this.usersDbKey, JSON.stringify(defaultUsers));
    }
  }

  getUsersDb() {
    try {
      return JSON.parse(localStorage.getItem(this.usersDbKey)) || [];
    } catch (e) {
      return [];
    }
  }

  saveUsersDb(users) {
    try {
      localStorage.setItem(this.usersDbKey, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users database', e);
    }
  }

  loadSession() {
    try {
      const session = localStorage.getItem(this.sessionKey);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  }

  saveSession(user) {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(this.sessionKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.sessionKey);
      }
    } catch (e) {
      console.error('Failed to persist session', e);
    }
    this.updateNavbarUser();
  }

  init() {
    this.bindEvents();
    this.updateNavbarUser();
  }

  bindEvents() {
    // Open/Close Auth Modal
    document.getElementById('nav-auth-btn')?.addEventListener('click', () => {
      if (this.currentUser) {
        this.toggleProfileDropdown();
      } else {
        this.openAuthModal('signin');
      }
    });

    document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => this.closeAuthModal());
    document.getElementById('auth-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'auth-modal-overlay') this.closeAuthModal();
    });

    // Profile Dropdown items
    document.getElementById('profile-view-btn')?.addEventListener('click', () => {
      this.closeProfileDropdown();
      this.openProfileModal();
    });

    document.getElementById('profile-orders-btn')?.addEventListener('click', () => {
      this.closeProfileDropdown();
      window.ordersManager?.openOrdersDrawer();
    });

    document.getElementById('profile-wishlist-btn')?.addEventListener('click', () => {
      this.closeProfileDropdown();
      window.app?.openWishlistDrawer();
    });

    document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
      this.closeProfileDropdown();
      this.logout();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      const container = document.getElementById('user-menu-container');
      if (container && !container.contains(e.target)) {
        this.closeProfileDropdown();
      }
    });

    // Auth Modal Tabs
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Password Show/Hide Toggles
    this.setupPasswordToggle('signin-password', 'toggle-signin-pw-btn');
    this.setupPasswordToggle('register-password', 'toggle-register-pw-btn');
    this.setupPasswordToggle('register-confirm-password', 'toggle-register-confirm-pw-btn');

    // Password Strength Meter
    const regPasswordInput = document.getElementById('register-password');
    if (regPasswordInput) {
      regPasswordInput.addEventListener('input', (e) => this.handlePasswordStrength(e.target.value));
    }

    // Sign In Form Submit
    document.getElementById('signin-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSignIn();
    });

    // Register Form Submit
    document.getElementById('register-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    // Forgot Password Form Submit
    document.getElementById('forgot-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleForgotPassword();
    });

    // 1-Click Demo Login Button
    document.getElementById('demo-login-btn')?.addEventListener('click', () => {
      this.demoLogin();
    });

    // Forgot Password Link in Signin
    document.getElementById('switch-to-forgot')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchTab('forgot');
    });

    document.getElementById('switch-to-signin-from-forgot')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchTab('signin');
    });

    // Profile Modal Close
    document.getElementById('close-profile-modal-btn')?.addEventListener('click', () => this.closeProfileModal());
    document.getElementById('profile-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'profile-modal-overlay') this.closeProfileModal();
    });

    // Save New Address Form
    document.getElementById('add-address-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddAddress();
    });
  }

  setupPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(buttonId);
    if (!input || !btn) return;

    btn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword 
        ? '<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>' 
        : '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      if (window.lucide) window.lucide.createIcons();
    });
  }

  handlePasswordStrength(password) {
    const meterBar = document.getElementById('pw-strength-bar');
    const label = document.getElementById('pw-strength-label');
    if (!meterBar || !label) return;

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const config = [
      { text: 'Too Short', width: '15%', color: '#ef4444' },
      { text: 'Weak', width: '30%', color: '#f97316' },
      { text: 'Fair', width: '60%', color: '#eab308' },
      { text: 'Good', width: '80%', color: '#84cc16' },
      { text: 'Strong & Secure 🔒', width: '100%', color: '#10b981' }
    ];

    if (!password) {
      meterBar.style.width = '0%';
      label.textContent = '';
      return;
    }

    const res = config[score];
    meterBar.style.width = res.width;
    meterBar.style.backgroundColor = res.color;
    label.textContent = res.text;
    label.style.color = res.color;
  }

  openAuthModal(tab = 'signin') {
    document.getElementById('auth-modal-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.switchTab(tab);
    if (window.lucide) window.lucide.createIcons();
  }

  closeAuthModal() {
    document.getElementById('auth-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  switchTab(tab) {
    document.querySelectorAll('.auth-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });

    document.getElementById('auth-panel-signin')?.classList.toggle('hidden', tab !== 'signin');
    document.getElementById('auth-panel-register')?.classList.toggle('hidden', tab !== 'register');
    document.getElementById('auth-panel-forgot')?.classList.toggle('hidden', tab !== 'forgot');
  }

  handleSignIn() {
    const email = document.getElementById('signin-email')?.value.trim().toLowerCase();
    const password = document.getElementById('signin-password')?.value;

    if (!email || !password) {
      window.showToast('Please enter both email and password', 'info');
      return;
    }

    const users = this.getUsersDb();
    const user = users.find(u => u.email.toLowerCase() === email);

    if (!user || user.password !== password) {
      window.showToast('Invalid email or password. Try the 1-Click Demo Sign In!', 'info');
      return;
    }

    this.saveSession(user);
    this.closeAuthModal();
    window.showToast(`Welcome back, ${user.name.split(' ')[0]}! Botanical VIP benefits active.`, 'success');
  }

  handleRegister() {
    const name = document.getElementById('register-name')?.value.trim();
    const email = document.getElementById('register-email')?.value.trim().toLowerCase();
    const password = document.getElementById('register-password')?.value;
    const confirm = document.getElementById('register-confirm-password')?.value;

    if (!name || !email || !password) {
      window.showToast('Please fill in all registration fields', 'info');
      return;
    }

    if (password.length < 6) {
      window.showToast('Password should be at least 6 characters long', 'info');
      return;
    }

    if (password !== confirm) {
      window.showToast('Passwords do not match', 'info');
      return;
    }

    const users = this.getUsersDb();
    if (users.some(u => u.email.toLowerCase() === email)) {
      window.showToast('An account with this email already exists', 'info');
      return;
    }

    const newUser = {
      name,
      email,
      password,
      memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      tier: 'Bamboolume Member',
      rewardPoints: 100,
      savedAddresses: []
    };

    users.push(newUser);
    this.saveUsersDb(users);
    this.saveSession(newUser);
    this.closeAuthModal();

    window.showToast(`Welcome to Bamboolume, ${name}! $15 Welcome credit added.`, 'success');
  }

  demoLogin() {
    const users = this.getUsersDb();
    const demoUser = users.find(u => u.email === 'vinay@bamboolume.com') || {
      name: 'Vinay Kumar',
      email: 'vinay@bamboolume.com',
      memberSince: 'March 2026',
      tier: 'Botanical Connoisseur (VIP)',
      rewardPoints: 480,
      savedAddresses: [
        {
          id: 'addr-1',
          label: 'Garden Residence (Primary)',
          fullName: 'Vinay Kumar',
          address: '742 Evergreen Terrace, Suite 4B',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
          country: 'United States'
        }
      ]
    };

    this.saveSession(demoUser);
    this.closeAuthModal();
    window.showToast('Signed in as Vinay Kumar (Botanical VIP)!', 'success');
  }

  handleForgotPassword() {
    const email = document.getElementById('forgot-email')?.value.trim();
    if (!email || !email.includes('@')) {
      window.showToast('Please enter a valid email address', 'info');
      return;
    }

    const statusEl = document.getElementById('forgot-status-msg');
    if (statusEl) {
      statusEl.classList.remove('hidden');
      statusEl.innerHTML = `
        <div style="background: rgba(72,107,69,0.12); border: 1px solid var(--bamboo-green); padding: 0.8rem; border-radius: 8px; color: var(--deep-forest); font-size: 0.85rem;">
          <i data-lucide="check-circle" style="color: var(--bamboo-green); width: 16px; height: 16px; vertical-align: middle;"></i>
          <strong>Password Reset Sent:</strong> A secure reset link has been dispatched to <strong>${email}</strong>. For instant demo testing, you may use password: <code>Password123!</code>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    window.showToast(`Reset instructions sent to ${email}`, 'success');
  }

  logout() {
    this.saveSession(null);
    window.showToast('You have been signed out safely.', 'info');
  }

  toggleProfileDropdown() {
    const dropdown = document.getElementById('user-profile-dropdown');
    dropdown?.classList.toggle('hidden');
  }

  closeProfileDropdown() {
    const dropdown = document.getElementById('user-profile-dropdown');
    dropdown?.classList.add('hidden');
  }

  updateNavbarUser() {
    const navBtn = document.getElementById('nav-auth-btn');
    if (!navBtn) return;

    if (this.currentUser) {
      const firstName = this.currentUser.name ? this.currentUser.name.split(' ')[0] : 'Account';
      navBtn.classList.add('logged-in');
      navBtn.innerHTML = `
        <div class="user-avatar-pill">
          <div class="user-avatar-letter">${firstName.charAt(0).toUpperCase()}</div>
          <span class="user-name-label">${firstName}</span>
          <span class="vip-crown-badge" title="${this.currentUser.tier}">VIP</span>
          <i data-lucide="chevron-down" style="width: 14px; height: 14px; opacity: 0.7;"></i>
        </div>
      `;
    } else {
      navBtn.classList.remove('logged-in');
      navBtn.innerHTML = `
        <i data-lucide="user"></i>
        <span>Sign In</span>
      `;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  openProfileModal() {
    if (!this.currentUser) return;
    const overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) return;

    document.getElementById('profile-user-name').textContent = this.currentUser.name;
    document.getElementById('profile-user-email').textContent = this.currentUser.email;
    document.getElementById('profile-user-tier').textContent = this.currentUser.tier;
    document.getElementById('profile-user-points').textContent = `${this.currentUser.rewardPoints || 100} Botanical Pts`;
    document.getElementById('profile-member-since').textContent = `Member since ${this.currentUser.memberSince || '2026'}`;

    this.renderSavedAddresses();
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }

  closeProfileModal() {
    document.getElementById('profile-modal-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  renderSavedAddresses() {
    const list = document.getElementById('profile-addresses-list');
    if (!list) return;

    const addrs = this.currentUser.savedAddresses || [];
    if (addrs.length === 0) {
      list.innerHTML = `
        <p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No saved addresses yet. Add your primary garden shipping destination below.</p>
      `;
      return;
    }

    list.innerHTML = addrs.map((a, idx) => `
      <div class="saved-address-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
          <strong style="color: var(--deep-forest); font-size: 0.9rem;">${a.label || 'Delivery Address'}</strong>
          <button type="button" class="btn-text-danger" onclick="window.authManager.deleteAddress(${idx})" title="Delete address">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
        <div style="font-size: 0.85rem; color: var(--charcoal);">${a.fullName}</div>
        <div style="font-size: 0.82rem; color: var(--text-muted);">${a.address}, ${a.city}, ${a.state} ${a.zip}</div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  handleAddAddress() {
    const label = document.getElementById('new-addr-label')?.value.trim() || 'Garden Destination';
    const fullName = document.getElementById('new-addr-name')?.value.trim() || this.currentUser.name;
    const address = document.getElementById('new-addr-street')?.value.trim();
    const city = document.getElementById('new-addr-city')?.value.trim();
    const state = document.getElementById('new-addr-state')?.value.trim();
    const zip = document.getElementById('new-addr-zip')?.value.trim();

    if (!address || !city || !state || !zip) {
      window.showToast('Please fill in complete street, city, state and zip', 'info');
      return;
    }

    if (!this.currentUser.savedAddresses) {
      this.currentUser.savedAddresses = [];
    }

    this.currentUser.savedAddresses.push({
      id: `addr-${Date.now()}`,
      label,
      fullName,
      address,
      city,
      state,
      zip,
      country: 'United States'
    });

    // Update in users database
    const users = this.getUsersDb();
    const idx = users.findIndex(u => u.email.toLowerCase() === this.currentUser.email.toLowerCase());
    if (idx > -1) {
      users[idx] = this.currentUser;
      this.saveUsersDb(users);
    }
    this.saveSession(this.currentUser);

    // Reset form & re-render
    document.getElementById('add-address-form')?.reset();
    this.renderSavedAddresses();
    window.showToast('New shipping address saved!', 'success');
  }

  deleteAddress(index) {
    if (this.currentUser?.savedAddresses && index >= 0 && index < this.currentUser.savedAddresses.length) {
      this.currentUser.savedAddresses.splice(index, 1);
      const users = this.getUsersDb();
      const idx = users.findIndex(u => u.email.toLowerCase() === this.currentUser.email.toLowerCase());
      if (idx > -1) {
        users[idx] = this.currentUser;
        this.saveUsersDb(users);
      }
      this.saveSession(this.currentUser);
      this.renderSavedAddresses();
      window.showToast('Address removed', 'info');
    }
  }
}

// Global Auth Instance
window.authManager = new AuthManager();
