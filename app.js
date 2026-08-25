const API = (window.location.protocol.startsWith('http') && (window.location.port === '8001' || window.location.port === ''))
  ? ''
  : 'http://127.0.0.1:8001';
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ─── Auth & session ─── */
if (localStorage.getItem('vconnectAuthVersion') !== '3') {
  localStorage.removeItem('vconnectSession');
  localStorage.removeItem('vconnectRole');
  localStorage.setItem('vconnectAuthVersion', '3');
}

function getSession() {
  try { return JSON.parse(localStorage.getItem('vconnectSession') || 'null'); } catch { return null; }
}
function getUser() { return getSession()?.user || null; }
function getToken() { return getSession()?.token || null; }
function isCustomer() { return getUser()?.role === 'customer'; }
function isWorker() { return getUser()?.role === 'worker'; }
function userName() { return getUser()?.name || 'Guest'; }
function workerId() { return getUser()?.worker_id || 2; }

const CUSTOMER_ROUTES = new Set(['customer', 'emergency', 'groups', 'track']);
const WORKER_ROUTES = new Set(['provider', 'jobs', 'availability', 'earnings', 'join']);

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.token = token;
  const r = await fetch(API + path, { ...opts, headers });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    let msg = err.detail || err.message || 'Something went wrong';
    if (Array.isArray(msg)) {
      msg = msg.map(m => (typeof m === 'object' ? (m.msg || m.message || JSON.stringify(m)) : m)).join(', ');
    }
    throw new Error(msg || 'Something went wrong');
  }
  return r.json();
}

/* ─── Icons (inline SVG) ─── */
const icons = {
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>',
  services: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
  bookings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  track: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
  dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  jobs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
  availability: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>',
  earnings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  help: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 1c0 2-2.5 2-2.5 4M12 17h.01"/></svg>',
  logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  customer: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>',
  worker: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M12 12v2M8 12v2M16 12v2"/></svg>'
};

function currentRoute() {
  return (location.hash.slice(2).split('?')[0].split('/')[0]) || '';
}

function navLink(href, label, icon, routeKey) {
  const active = currentRoute() === routeKey ? ' active' : '';
  return `<a class="nav-link${active}" href="${href}">${icon}<span>${label}</span></a>`;
}

function roleNavItems() {
  if (isCustomer()) {
    return [
      navLink('#/', 'Home', icons.home, ''),
      navLink('#/services', 'Services', icons.services, 'services'),
      navLink('#/customer', 'My Bookings', icons.bookings, 'customer'),
      navLink('#/track', 'Track Booking', icons.track, 'track'),
      navLink('#/notifications', 'Notifications', icons.bell, 'notifications'),
      navLink('#/profile', 'Profile', icons.user, 'profile'),
      navLink('#/help', 'Help', icons.help, 'help')
    ].join('');
  }
  if (isWorker()) {
    return [
      navLink('#/', 'Home', icons.home, ''),
      navLink('#/services', 'Services', icons.services, 'services'),
      navLink('#/provider', 'Dashboard', icons.dashboard, 'provider'),
      navLink('#/jobs', 'Assigned Jobs', icons.jobs, 'jobs'),
      navLink('#/availability', 'Availability', icons.availability, 'availability'),
      navLink('#/earnings', 'Earnings', icons.earnings, 'earnings'),
      navLink('#/notifications', 'Notifications', icons.bell, 'notifications'),
      navLink('#/profile', 'Profile', icons.user, 'profile'),
      navLink('#/help', 'Help', icons.help, 'help')
    ].join('');
  }
  return '';
}

function nav() {
  const user = getUser();
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '';
  const roleBadge = user ? (isCustomer() ? 'Customer' : 'Worker') : '';
  return `<nav class="nav" id="mainNav">
    <div class="nav-left">
      <a class="brand" href="#/"><i>V</i>Connect</a>
      ${user ? `<span class="role-badge ${user.role}">${roleBadge}</span>` : ''}
    </div>
    <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">${icons.menu}</button>
    <div class="nav-center" id="navLinks">${roleNavItems()}</div>
    <div class="nav-right">
      ${user ? `<a class="nav-avatar" href="#/profile" title="${esc(user.name)}"><span>${initials}</span></a>` : ''}
      ${user ? `<button class="btn small ghost nav-logout" onclick="logoutUser()">${icons.logout}<span>Logout</span></button>` : ''}
    </div>
  </nav>`;
}

function authNav() {
  return `<nav class="nav auth-nav"><a class="brand" href="#/"><i>V</i>Connect</a><span class="nav-tagline">Connecting Communities with Trusted Services</span></nav>`;
}

function foot() {
  return `<footer class="footer"><a class="brand" href="#/"><i>V</i>Connect</a><p>Connecting communities with trusted services — built around fair work, local trust, and transparent earnings.</p><small>© 2026 VConnect Cooperative · Demo MVP</small></footer>`;
}

/* ─── Shared components ─── */
function workerCard(w) {
  const bookBtn = isCustomer()
    ? `<a class="btn small" href="#/worker/${w.id}">Book now</a>`
    : `<a class="btn small ghost" href="#/worker/${w.id}">View profile</a>`;
  return `<article class="card worker animate-up">
    <div class="worker-head"><div class="avatar">${w.avatar}</div><div><h3>${esc(w.name)}</h3><span class="badge">✓ Co-op member</span></div></div>
    <p>${esc(w.category)} · ${esc(w.experience)}</p>
    <div><span class="rating">★ ${w.rating}</span> <span class="muted">(${w.reviews || 0} reviews)</span></div>
    <p><span class="badge">VTrust ${w.vtrust_score || '—'}/100</span> <span class="badge">Local Match · ${w.distance} km</span></p>
    <div class="worker-meta"><span>Reduced travel · supports local work</span><strong>₹${w.price}/visit</strong></div>
    ${w.score ? `<p class="badge match-badge">Best Match · ${w.score}/100</p>` : ''}
    <div class="worker-actions"><a class="btn small ghost" href="#/worker/${w.id}">View profile</a>${bookBtn}</div>
  </article>`;
}

function bookingList(items, mode) {
  if (!items.length) return `<div class="empty-state"><div class="empty-icon">${icons.bookings}</div><h3>Nothing here yet</h3><p>Your next local connection starts with a booking.</p>${mode === 'customer' ? '<a class="btn lime" href="#/services">Book a service</a>' : ''}</div>`;
  return `<div class="table-list">${items.map(b => `<article class="card booking animate-up">
    <div class="avatar">${b.avatar}</div>
    <div class="booking-info"><b>${esc(b.service)} with ${esc(b.worker_name)}</b><div class="muted">${b.preferred_date} · ${b.preferred_time}<br>${esc(b.address)}</div></div>
    <span class="status ${b.status.replace(/\s/g, '-')}">${b.status}</span>
    ${mode === 'customer' && ['Pending', 'Accepted'].includes(b.status) ? `<button class="btn small ghost" onclick="changeStatus(${b.id},'Cancelled')">Cancel</button>` : ''}
    ${mode === 'provider' && b.status === 'Pending' ? `<button class="btn small lime" onclick="changeStatus(${b.id},'Accepted')">Accept</button><button class="btn small ghost" onclick="changeStatus(${b.id},'Rejected')">Decline</button>` : ''}
    ${mode === 'provider' && b.status === 'Accepted' ? `<button class="btn small lime" onclick="changeStatus(${b.id},'Completed')">Complete</button>` : ''}
  </article>`).join('')}</div>`;
}

function statCard(label, value, accent) {
  return `<div class="stat ${accent || ''}"><span>${label}</span><b>${value}</b></div>`;
}

/* ─── Auth pages ─── */
let selectedRole = localStorage.getItem('vconnectRole') || '';

function authWelcome() {
  return `<main class="auth-page page-enter">
    <section class="auth-hero">
      <span class="eyebrow">✦ VConnect cooperative</span>
      <h1>Connecting communities with <em>trusted services.</em></h1>
      <p>Choose how you'd like to use VConnect. Your experience is tailored to your role.</p>
    </section>
    <div class="role-cards">
      <button class="role-card ${selectedRole === 'customer' ? 'selected' : ''}" onclick="chooseRole('customer')" type="button">
        <div class="role-icon customer-icon">${icons.customer}</div>
        <h3>Customer</h3>
        <p>Book services, manage your bookings, track requests and get support.</p>
        <span class="role-check">${selectedRole === 'customer' ? '✓ Selected' : 'Select role'}</span>
      </button>
      <button class="role-card ${selectedRole === 'worker' ? 'selected' : ''}" onclick="chooseRole('worker')" type="button">
        <div class="role-icon worker-icon">${icons.worker}</div>
        <h3>Worker</h3>
        <p>Manage assigned jobs, accept requests, update availability and track your work.</p>
        <span class="role-check">${selectedRole === 'worker' ? '✓ Selected' : 'Select role'}</span>
      </button>
    </div>
    <section id="authBox"></section>
  </main>`;
}

function chooseRole(role) {
  selectedRole = role;
  localStorage.setItem('vconnectRole', role);
  $$('.role-card').forEach(c => c.classList.remove('selected'));
  $$('.role-card')[role === 'customer' ? 0 : 1]?.classList.add('selected');
  $$('.role-check').forEach((el, i) => { el.textContent = (i === (role === 'customer' ? 0 : 1)) ? '✓ Selected' : 'Select role'; });
  $('#authBox').innerHTML = `<div class="auth-form-card animate-up">
    <div class="auth-form-header">
      <span class="role-badge ${role}">${role === 'worker' ? 'Worker' : 'Customer'}</span>
      <h2>${role === 'worker' ? 'Worker sign in' : 'Customer sign in'}</h2>
      <p class="muted">${role === 'worker' ? 'Access your dashboard, jobs, and earnings.' : 'Book services and manage your requests.'}</p>
    </div>
    <form class="form" id="authForm">
      <label>Full name<input required name="name" placeholder="Your full name"></label>
      <label>Email<input required type="email" name="email" placeholder="you@email.com"></label>
      <label>Password<input required type="password" minlength="6" name="password" placeholder="At least 6 characters"></label>
      <button class="btn lime btn-block">Create account / Log in</button>
      <p class="muted auth-hint">Already registered? Enter the same email and password.</p>
      <div id="authNotice"></div>
    </form>
  </div>`;
  $('#authForm').addEventListener('submit', handleAuthSubmit);
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const role = selectedRole || localStorage.getItem('vconnectRole');
  if (!role) return $('#authNotice').innerHTML = '<div class="alert error">Please select Customer or Worker first.</div>';
  const d = Object.fromEntries(new FormData(e.target));
  d.role = role;
  $('#authNotice').innerHTML = '<div class="alert info">Connecting...</div>';
  try {
    const r = await api('/auth/signup', { method: 'POST', body: JSON.stringify(d) });
    localStorage.setItem('vconnectSession', JSON.stringify(r));
    location.hash = role === 'worker' ? '#/provider' : '#/';
    guardedMount();
  } catch (signupErr) {
    if (signupErr.message && (signupErr.message.includes('already exists') || signupErr.message.includes('409'))) {
      try {
        const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: d.email, password: d.password }) });
        if (r.user.role !== role) throw new Error('This account is registered as ' + r.user.role + '. Please select the correct role.');
        localStorage.setItem('vconnectSession', JSON.stringify(r));
        location.hash = role === 'worker' ? '#/provider' : '#/';
        guardedMount();
      } catch (loginErr) {
        $('#authNotice').innerHTML = `<div class="alert error">${loginErr.message}</div>`;
      }
    } else {
      $('#authNotice').innerHTML = `<div class="alert error">${signupErr.message}</div>`;
    }
  }
}

function logoutUser() {
  const token = getToken();
  if (token) api('/auth/logout', { method: 'POST' }).catch(() => {});
  localStorage.removeItem('vconnectSession');
  localStorage.removeItem('vconnectRole');
  selectedRole = '';
  location.hash = '#/';
  guardedMount();
}

/* ─── Dashboards ─── */
async function customerDashboard() {
  const name = userName();
  const items = await api('/bookings?customer_name=' + encodeURIComponent(name));
  const services = await api('/services');
  const upcoming = items.filter(b => ['Pending', 'Accepted', 'In Progress'].includes(b.status)).slice(0, 1)[0];
  const recent = items.slice(0, 3);
  return `<main class="page page-enter">
    <div class="dash-header">
      <div>
        <span class="eyebrow">Customer Dashboard</span>
        <h1 class="page-title">Welcome back, ${esc(name.split(' ')[0])}! 👋</h1>
        <p class="lead">Manage your bookings, discover services, and track requests — all in one place.</p>
      </div>
      <a class="btn lime" href="#/services">+ Book a Service</a>
    </div>
    <div class="grid stats">
      ${statCard('Total bookings', items.length)}
      ${statCard('Active', items.filter(b => ['Pending', 'Accepted'].includes(b.status)).length, 'accent-mint')}
      ${statCard('Completed', items.filter(b => b.status === 'Completed').length, 'accent-green')}
      ${statCard('Cancelled', items.filter(b => b.status === 'Cancelled').length, 'accent-coral')}
    </div>
    <div class="dash-grid-2">
      <section class="profile-pane">
        <h2>Upcoming booking</h2>
        ${upcoming ? `<article class="card booking-highlight">
          <div class="avatar">${upcoming.avatar}</div>
          <div><b>${esc(upcoming.service)}</b><p class="muted">${esc(upcoming.worker_name)} · ${upcoming.preferred_date} at ${upcoming.preferred_time}</p></div>
          <span class="status ${upcoming.status}">${upcoming.status}</span>
          <a class="btn small ghost" href="#/track">Track →</a>
        </article>` : '<div class="empty-state compact"><p>No upcoming bookings. <a href="#/services">Book a service</a></p></div>'}
      </section>
      <section class="profile-pane">
        <h2>Quick actions</h2>
        <div class="quick-actions">
          <a class="quick-action" href="#/services">${icons.services}<span>Find services</span></a>
          <a class="quick-action" href="#/customer">${icons.bookings}<span>My bookings</span></a>
          <a class="quick-action emergency-action" href="#/emergency">${icons.track}<span>Emergency</span></a>
          <a class="quick-action" href="#/groups">${icons.jobs}<span>Group booking</span></a>
          <a class="quick-action" href="#/community">${icons.help}<span>Community help</span></a>
          <a class="quick-action" href="#/cooperative">${icons.dashboard}<span>Co-op info</span></a>
        </div>
      </section>
    </div>
    <section class="section-inline">
      <div class="split"><div><h2>Recent bookings</h2><p class="lead">Your latest service requests</p></div><a class="btn ghost" href="#/customer">View all →</a></div>
      ${bookingList(recent, 'customer')}
    </section>
    <section class="section-inline">
      <h2>Available services</h2>
      <div class="grid services compact-grid">${services.slice(0, 4).map(s => `<a class="card service-card" href="#/services?category=${encodeURIComponent(s.name)}"><div class="service-icon">${s.icon}</div><h3>${s.name}</h3><p>${s.description}</p></a>`).join('')}</div>
    </section>
  </main>`;
}

async function workerDashboard() {
  const name = userName();
  const wid = workerId();
  let worker, items;
  try {
    worker = await api('/workers/' + wid);
    items = await api('/bookings?worker_id=' + wid);
  } catch {
    worker = { name, category: 'Service Provider', available: 1, avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2) };
    items = [];
  }
  const earnings = items.filter(x => x.status === 'Completed').reduce((n, x) => n + x.price * .92, 0);
  const pending = items.filter(x => x.status === 'Pending');
  const today = items.filter(x => x.status === 'Accepted').slice(0, 3);
  return `<main class="page page-enter">
    <div class="dash-header">
      <div>
        <span class="eyebrow">Worker Dashboard</span>
        <h1 class="page-title">Welcome back, ${esc(name.split(' ')[0])}! 🔧</h1>
        <p class="lead">Manage your jobs, update availability, and track your earnings.</p>
      </div>
      <span class="availability-pill ${worker.available ? 'online' : 'offline'}">${worker.available ? '● Available today' : '○ Unavailable'}</span>
    </div>
    <div class="grid stats">
      ${statCard('Pending requests', pending.length, 'accent-coral')}
      ${statCard('Upcoming jobs', items.filter(x => x.status === 'Accepted').length, 'accent-mint')}
      ${statCard('Completed', items.filter(x => x.status === 'Completed').length, 'accent-green')}
      ${statCard('Total earnings', '₹' + Math.round(earnings), 'accent-lime')}
    </div>
    <div class="dash-grid-2">
      <section class="profile-pane">
        <h2>Today's assigned jobs</h2>
        ${today.length ? bookingList(today, 'provider') : '<div class="empty-state compact"><p>No jobs scheduled today. <a href="#/jobs">View all requests</a></p></div>'}
      </section>
      <section class="profile-pane">
        <h2>Quick actions</h2>
        <div class="quick-actions">
          <a class="quick-action" href="#/provider">${icons.dashboard}<span>Dashboard</span></a>
          <a class="quick-action" href="#/jobs">${icons.jobs}<span>Assigned jobs</span></a>
          <a class="quick-action" href="#/availability">${icons.availability}<span>Availability</span></a>
          <a class="quick-action" href="#/earnings">${icons.earnings}<span>Earnings</span></a>
          <a class="quick-action" href="#/services">${icons.services}<span>Browse services</span></a>
          <a class="quick-action" href="#/join">${icons.worker}<span>Update profile</span></a>
        </div>
      </section>
    </div>
    <section class="section-inline">
      <div class="split"><div><h2>Pending booking requests</h2><p class="lead">Review and respond to new customer requests</p></div><a class="btn ghost" href="#/provider">Manage all →</a></div>
      ${bookingList(pending.slice(0, 5), 'provider')}
    </section>
  </main>`;
}

async function home() {
  if (isCustomer()) return customerDashboard();
  if (isWorker()) return workerDashboard();
  const services = await api('/services');
  const rec = await api('/workers/recommended');
  return `<section class="hero page-enter"><div class="hero-content"><span class="eyebrow">✦ Community-first local services</span><h1>Trusted help,<br><em>right around</em> the corner.</h1><p>Find skilled local professionals while supporting fair, transparent, community-driven work.</p><form class="searchbox" id="problemForm"><input id="problem" placeholder="Describe what you need help with…"><button class="btn lime">Find my service</button></form><div id="suggestion"></div><div class="trustline"><span>Verified local workers</span><span>Transparent earnings</span><span>Fair co-op model</span></div></div></section>
  <section class="section"><h2>What can we help with?</h2><p class="lead">Experienced neighbours for the work that keeps home running smoothly.</p><div class="grid services">${services.map(s => `<a class="card service-card" href="#/services?category=${encodeURIComponent(s.name)}"><div class="service-icon">${s.icon}</div><h3>${s.name}</h3><p>${s.description}</p></a>`).join('')}</div></section>
  <section class="section tint"><h2>Simple, respectful service.</h2><div class="grid steps">${[['01', 'Tell us what you need', 'Search a service or describe the problem in your own words.'], ['02', 'Choose with confidence', 'Compare local professionals, prices, ratings, and distance.'], ['03', 'Book and stay informed', 'Pick a time, receive updates, and pay with clarity.']].map(x => `<div class="step-card"><div class="number">${x[0]}</div><h3>${x[1]}</h3><p class="muted">${x[2]}</p></div>`).join('')}</div></section>
  <section class="co-op"><div><span class="eyebrow">A better local economy</span><h2>Services that give back.</h2><p>VConnect workers are cooperative members. They earn fairly, help shape the platform, and collectively invest in training and community support.</p><a class="btn lime" href="#/cooperative">See the co-op model</a></div><div class="card co-op-card"><span class="muted">For a ₹500 service</span><h3>₹460 <small>to worker</small></h3><p>₹40 supports training, protection, and local programs.</p></div></section>
  <section class="section"><div class="split"><div><h2>Recommended near you</h2><p class="lead">A clear, explainable match — never a mystery.</p></div><a class="btn ghost" href="#/services">Browse everyone →</a></div><div class="grid worker-grid">${rec.map(workerCard).join('')}</div></section>`;
}

/* ─── Feature pages ─── */
async function services() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  let cat = params.get('category') || 'All';
  const all = await api('/services');
  return `<main class="page page-enter"><span class="eyebrow">Find your local expert</span><h1 class="page-title">Services & professionals</h1><p class="lead">Compare trusted co-op members by skill, availability and location.</p><div class="filterbar"><input id="workerSearch" placeholder="Search skills, names or services"><select id="categoryFilter"><option>All</option>${all.map(s => `<option ${s.name === cat ? 'selected' : ''}>${s.name}</option>`).join('')}</select><label class="toggle-chip"><input id="availableFilter" type="checkbox"><span>Available now</span></label></div><div id="workerResults" class="grid worker-grid"><div class="skeleton-grid">${[1, 2, 3].map(() => '<div class="skeleton-card"></div>').join('')}</div></div><div id="workerMap" class="map"></div></main>`;
}

async function loadWorkers() {
  const q = $('#workerSearch')?.value || '', cat = $('#categoryFilter')?.value || 'All', available = $('#availableFilter')?.checked;
  const p = new URLSearchParams();
  if (q) p.set('search', q);
  if (cat !== 'All') p.set('category', cat);
  if (available) p.set('available', 'true');
  const workers = await api('/workers?' + p);
  $('#workerResults').innerHTML = workers.length ? workers.map(workerCard).join('') : `<div class="empty-state"><h3>No matching professionals</h3><p>Try another service or search term.</p></div>`;
  renderMap(workers);
}

async function profile(id) {
  const w = await api('/workers/' + id);
  const showBooking = isCustomer();
  const todayStr = new Date().toISOString().split('T')[0];
  return `<main class="page page-enter"><a href="#/services" class="back-link">← All professionals</a><div class="profile"><section class="profile-pane"><div class="worker-head"><div class="avatar lg">${esc(w.avatar || 'VC')}</div><div><h1 class="page-title sm">${esc(w.name)}</h1><span class="badge">✓ Verified cooperative member</span></div></div><p class="lead">${esc(w.bio)}</p><p><b>${esc(w.category)}</b><br><span class="muted">${esc(w.skills)}</span></p><div class="grid stats triple"><div class="stat"><span>Rating</span><b>★ ${w.rating}</b></div><div class="stat"><span>Experience</span><b>${esc(w.experience)}</b></div><div class="stat"><span>Distance</span><b>${w.distance} km</b></div></div><h3>Neighbour reviews</h3>${(w.reviews_list || []).map(r => `<p class="card review-card"><b>★ ${r.rating} · ${esc(r.customer)}</b><br>${esc(r.text)}</p>`).join('') || '<p class="muted">New to VConnect reviews, but fully verified.</p>'}</section><section class="profile-pane">${showBooking ? `<span class="eyebrow">₹${w.price}/visit · ${w.available ? 'Available today' : 'Limited availability'}</span><h2>Request a booking</h2><form class="form" id="bookingForm"><label>Your address<input required name="address" placeholder="e.g. 14 Garden Lane, New Delhi"></label><div class="form-grid"><label>Preferred date<input required type="date" name="preferred_date" min="${todayStr}" value="${todayStr}"></label><label>Preferred time<input required type="time" name="preferred_time"></label></div><label>Tell ${esc(w.name.split(' ')[0])} about the task<textarea name="description" placeholder="A few helpful details (optional)"></textarea></label><button class="btn lime btn-block">Send booking request</button><div id="bookingNotice"></div></form>` : `<h2>Professional profile</h2><p class="lead">This is a marketplace profile. Manage your own bookings from the <a href="#/provider">Worker Dashboard</a>.</p><div class="grid stats triple"><div class="stat"><span>Price</span><b>₹${w.price}/visit</b></div><div class="stat"><span>VTrust</span><b>${w.vtrust_score || '—'}/100</b></div><div class="stat"><span>Status</span><b>${w.available ? 'Available' : 'Busy'}</b></div></div>`}<div id="profileMap" class="map"></div></section></div></main>`;
}

async function customer() {
  const items = await api('/bookings?customer_name=' + encodeURIComponent(userName()));
  return `<main class="page page-enter"><span class="eyebrow">Customer space</span><h1 class="page-title">My bookings</h1><p class="lead">Track your local service requests in one calm, clear place.</p><div class="filterbar"><a class="btn lime" href="#/services">+ Book a service</a><a class="btn ghost" href="#/track">Track status</a></div>${bookingList(items, 'customer')}</main>`;
}

async function trackBooking() {
  const items = await api('/bookings?customer_name=' + encodeURIComponent(userName()));
  const steps = ['Pending', 'Accepted', 'In Progress', 'Completed'];
  return `<main class="page page-enter"><span class="eyebrow">Booking tracker</span><h1 class="page-title">Track your bookings</h1><p class="lead">Real-time status for every service request you've made.</p>
  ${items.length ? items.map(b => {
    const idx = steps.indexOf(b.status === 'Cancelled' || b.status === 'Rejected' ? 'Pending' : b.status);
    return `<article class="card track-card animate-up"><div class="track-header"><div class="avatar">${b.avatar}</div><div><b>${esc(b.service)}</b><p class="muted">${esc(b.worker_name)} · ${b.preferred_date} at ${b.preferred_time}</p></div><span class="status ${b.status}">${b.status}</span></div>
    <div class="track-steps">${steps.map((s, i) => `<div class="track-step ${i <= idx ? 'done' : ''} ${b.status === 'Cancelled' || b.status === 'Rejected' ? 'cancelled' : ''}"><span class="step-dot"></span><span>${s}</span></div>`).join('')}</div>
    <p class="muted track-address">${esc(b.address)}</p></article>`;
  }).join('') : '<div class="empty-state"><h3>No bookings to track</h3><p>Book a service to start tracking.</p><a class="btn lime" href="#/services">Find services</a></div>'}
  </main>`;
}

async function provider() {
  const wid = workerId();
  const worker = await api('/workers/' + wid);
  const items = await api('/bookings?worker_id=' + wid);
  const earnings = items.filter(x => x.status === 'Completed').reduce((n, x) => n + x.price * .92, 0);
  return `<main class="page page-enter"><span class="eyebrow">Worker Dashboard · ${esc(worker.name)}</span><h1 class="page-title">Manage your work</h1><div class="dash-grid"><aside class="side-nav"><div class="side-profile"><div class="avatar">${worker.avatar}</div><b>${esc(worker.name)}</b><p class="muted">${esc(worker.category)}</p></div><nav class="side-links"><a class="active" href="#/provider">Overview</a><a href="#/jobs">Assigned jobs</a><a href="#/availability">Availability</a><a href="#/earnings">Earnings</a></nav><button class="btn lime btn-block" id="availability">${worker.available ? '● Available today' : '○ Mark available'}</button></aside><section class="dash-main"><div class="grid stats">${statCard('Pending', items.filter(x => x.status === 'Pending').length, 'accent-coral')}${statCard('Upcoming', items.filter(x => x.status === 'Accepted').length)}${statCard('Completed', items.filter(x => x.status === 'Completed').length, 'accent-green')}${statCard('Earnings', '₹' + Math.round(earnings), 'accent-lime')}</div><h2>Service requests</h2>${bookingList(items, 'provider')}</section></div></main>`;
}

async function jobsPage() {
  const wid = workerId();
  const items = await api('/bookings?worker_id=' + wid);
  const pending = items.filter(x => x.status === 'Pending');
  const active = items.filter(x => ['Accepted', 'In Progress'].includes(x.status));
  const done = items.filter(x => x.status === 'Completed');
  return `<main class="page page-enter"><span class="eyebrow">Assigned jobs</span><h1 class="page-title">Your jobs</h1><p class="lead">Pending requests, active work, and completed jobs.</p>
  <div class="tab-bar"><button class="tab active" data-tab="pending">Pending (${pending.length})</button><button class="tab" data-tab="active">Active (${active.length})</button><button class="tab" data-tab="done">Completed (${done.length})</button></div>
  <div id="tab-pending" class="tab-panel">${bookingList(pending, 'provider')}</div>
  <div id="tab-active" class="tab-panel hidden">${bookingList(active, 'provider')}</div>
  <div id="tab-done" class="tab-panel hidden">${bookingList(done, 'provider')}</div></main>`;
}

async function availabilityPage() {
  const wid = workerId();
  const worker = await api('/workers/' + wid);
  return `<main class="page page-enter"><span class="eyebrow">Availability</span><h1 class="page-title">Your availability</h1><p class="lead">Let customers know when you're ready to take on new work.</p>
  <div class="profile-pane availability-card"><div class="availability-status ${worker.available ? 'online' : 'offline'}"><span class="status-dot"></span><div><h2>${worker.available ? 'You are available' : 'You are unavailable'}</h2><p class="muted">${worker.available ? 'Customers can book you for today.' : 'You won\'t appear in "available now" searches.'}</p></div></div><button class="btn lime btn-block" id="toggleAvailability">${worker.available ? 'Mark as unavailable' : 'Mark as available'}</button></div>
  <div class="profile-pane" style="margin-top:20px"><h3>Schedule tips</h3><ul class="help-list"><li>Keep your availability updated daily for better matches.</li><li>Respond to pending requests within 2 hours when possible.</li><li>High VTrust scores lead to more customer bookings.</li></ul></div></main>`;
}

async function earningsPage() {
  const wid = workerId();
  const items = await api('/bookings?worker_id=' + wid);
  const completed = items.filter(x => x.status === 'Completed');
  const earnings = completed.reduce((n, x) => n + x.price * .92, 0);
  const coOp = completed.reduce((n, x) => n + x.price * .08, 0);
  return `<main class="page page-enter"><span class="eyebrow">Earnings</span><h1 class="page-title">Your earnings</h1><p class="lead">Transparent breakdown of your completed work.</p>
  <div class="grid stats">${statCard('Total earned', '₹' + Math.round(earnings), 'accent-lime')}${statCard('Co-op contribution', '₹' + Math.round(coOp))}${statCard('Jobs completed', completed.length, 'accent-green')}${statCard('Avg. per job', completed.length ? '₹' + Math.round(earnings / completed.length) : '₹0')}</div>
  <section class="profile-pane"><h2>Completed job history</h2>${completed.length ? bookingList(completed, 'provider') : '<div class="empty-state compact"><p>Complete jobs to see earnings here.</p></div>'}</section></main>`;
}

async function profilePage() {
  const user = getUser();
  const roleLabel = isCustomer() ? 'Customer' : 'Worker';
  return `<main class="page page-enter"><span class="eyebrow">Your profile</span><h1 class="page-title">Profile</h1>
  <div class="profile"><section class="profile-pane"><div class="profile-hero"><div class="avatar xl">${user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><div><h2>${esc(user.name)}</h2><span class="role-badge ${user.role}">${roleLabel}</span><p class="muted">${esc(user.email)}</p></div></div></section>
  <section class="profile-pane"><h3>Account details</h3><div class="detail-row"><span>Name</span><b>${esc(user.name)}</b></div><div class="detail-row"><span>Email</span><b>${esc(user.email)}</b></div><div class="detail-row"><span>Role</span><b>${roleLabel}</b></div>
  ${isCustomer() ? '<p class="muted" style="margin-top:20px">As a customer, you can book services, track bookings, and join community programs.</p>' : '<p class="muted" style="margin-top:20px">As a worker, you can manage jobs, set availability, and track earnings from the cooperative platform.</p>'}
  <button class="btn ghost" style="margin-top:20px" onclick="logoutUser()">Sign out</button></section></div></main>`;
}

async function notificationsPage() {
  const user = getUser();
  const notices = isCustomer()
    ? [{ title: 'Booking update', text: 'Your service requests are tracked in My Bookings.', time: 'Just now', type: 'info' }, { title: 'New worker nearby', text: '3 highly-rated professionals are available in your area.', time: '2h ago', type: 'success' }, { title: 'Community tip', text: 'Group bookings save 5–10% when neighbours join together.', time: '1d ago', type: 'tip' }]
    : [{ title: 'New request', text: 'Check your dashboard for pending booking requests.', time: 'Just now', type: 'info' }, { title: 'VTrust update', text: 'Your trust score improves with completed jobs and on-time work.', time: '3h ago', type: 'success' }, { title: 'Co-op reminder', text: '8% of each job supports community training programs.', time: '1d ago', type: 'tip' }];
  return `<main class="page page-enter"><span class="eyebrow">Notifications</span><h1 class="page-title">Notifications</h1><p class="lead">Updates for ${esc(user.name.split(' ')[0])} (${isCustomer() ? 'Customer' : 'Worker'})</p>
  <div class="notif-list">${notices.map(n => `<article class="card notif-card ${n.type} animate-up"><div class="notif-dot"></div><div><b>${n.title}</b><p class="muted">${n.text}</p><small>${n.time}</small></div></article>`).join('')}</div></main>`;
}

async function helpPage() {
  const faqs = isCustomer()
    ? [['How do I book a service?', 'Browse Services, pick a professional, and submit a booking request with your preferred date and time.'], ['How do I track my booking?', 'Go to Track Booking or My Bookings to see real-time status updates.'], ['What is emergency service?', 'For urgent issues like water leaks or power failures, use the Emergency page for priority matching.'], ['How do group bookings work?', 'Create a group request — 3–4 households save 5%, 5+ save 10%.']]
    : [['How do I accept jobs?', 'Go to Dashboard or Assigned Jobs. Pending requests can be accepted or declined.'], ['How do I update availability?', 'Use the Availability page to toggle whether customers can book you today.'], ['How are earnings calculated?', 'You receive 92% of each completed job. 8% supports the cooperative.'], ['What is VTrust?', 'Your trust score reflects ratings, completed jobs, on-time record, and co-op membership.']];
  return `<main class="page page-enter"><span class="eyebrow">Help & Support</span><h1 class="page-title">Help & Support</h1><p class="lead">${isCustomer() ? 'Customer' : 'Worker'} support — we're here to help.</p>
  <div class="profile"><section class="profile-pane"><h2>Frequently asked questions</h2>${faqs.map(([q, a]) => `<details class="faq-item"><summary>${q}</summary><p class="muted">${a}</p></details>`).join('')}</section>
  <section class="profile-pane"><h2>Contact support</h2><form class="form" id="helpForm"><label>Subject<input required placeholder="How can we help?"></label><label>Message<textarea required placeholder="Describe your issue…"></textarea></label><button class="btn lime btn-block">Send message</button><div id="helpNotice"></div></form><p class="muted" style="margin-top:16px">Demo MVP — messages are not sent to a live support team.</p></section></div></main>`;
}

async function coop() {
  const d = await api('/admin/summary');
  return `<main class="page page-enter"><span class="eyebrow">Cooperative dashboard</span><h1 class="page-title">A platform the community owns.</h1><p class="lead">VConnect keeps earnings visible and returns value to the people creating it.</p><div class="grid stats" style="margin-top:30px">${statCard('Co-op members', d.members)}${statCard('Active workers', d.active_workers)}${statCard('Completed services', d.completed_services)}${statCard('Community earnings', '₹' + d.community_earnings.toLocaleString(), 'accent-lime')}</div><div class="profile"><section class="profile-pane"><h2>Transparent by design</h2><p class="lead">${d.commission}</p><div class="card"><b>Customer payment → Worker earnings → Cooperative contribution</b><p class="muted">The 8% contribution is recorded for training, member support, and local community programs.</p></div></section><section class="profile-pane"><h2>Our members</h2>${d.members_list.map(m => `<p class="booking member-row"><span class="avatar">${m.avatar}</span><span class="booking-info"><b>${esc(m.name)}</b><br><span class="muted">${esc(m.category)} · ★ ${m.rating}</span></span></p>`).join('')}</section></div></main>`;
}

async function join() {
  const services = await api('/services');
  return `<main class="page page-enter"><span class="eyebrow">Grow with your community</span><div class="profile"><section><h1 class="page-title">Join VConnect as a worker.</h1><p class="lead">Build your local service career with transparent earnings, community support, and an equal say in the cooperative.</p><div class="card perk-card"><h3>What you receive</h3><p class="muted">✓ A trusted public profile<br>✓ Clear 8% cooperative contribution<br>✓ Fair access to local customer requests<br>✓ Training and community support</p></div></section><section class="profile-pane"><h2>Create your profile</h2><form class="form" id="joinForm"><div class="form-grid"><label>Full name<input required name="name" placeholder="e.g. Anika Rao"></label><label>Phone number<input required name="phone" placeholder="98765 43210"></label></div><label>Primary service<select required name="category">${services.map(s => `<option>${s.name}</option>`).join('')}</select></label><label>Your skills<input required name="skills" placeholder="e.g. Leak repair · fittings · water heaters"></label><div class="form-grid"><label>Experience<input required name="experience" placeholder="e.g. 4 years"></label><label>Starting visit price (₹)<input required type="number" min="100" name="price" placeholder="400"></label></div><label>Short introduction<textarea required name="bio" placeholder="Tell neighbours why they can trust your work."></textarea></label><button class="btn lime btn-block">Create my worker profile</button><div id="joinNotice"></div></form></section></div></main>`;
}

async function emergency() {
  const workers = await api('/workers/recommended?emergency=true');
  return `<main class="page page-enter"><span class="eyebrow emergency-badge">High-priority support</span><h1 class="page-title">Emergency service</h1><p class="lead">For water leaks, power failures, electrical hazards, or urgent appliance issues.</p><div class="profile"><section class="profile-pane"><h2>Nearby emergency matches</h2>${workers.map(w => `<p class="card emergency-worker"><b>${esc(w.name)} · ${esc(w.category)}</b><br><span class="badge">VTrust ${w.vtrust_score}/100</span> <span class="muted">${w.distance} km · ₹${w.price}/visit</span><br><button class="btn small lime" onclick="selectEmergency(${w.id},'${esc(w.category)}')">Select worker</button></p>`).join('')}</section><section class="profile-pane"><h2>Send urgent request</h2><form class="form" id="emergencyForm"><input type="hidden" name="worker_id" id="emWorker"><input type="hidden" name="service" id="emService"><label>Emergency type<select required name="emergency_type"><option>Water leakage</option><option>Electrical emergency</option><option>Power failure</option><option>Urgent appliance issue</option></select></label><label>Service location<input required name="address" placeholder="Your address or community"></label><label>Details<textarea name="description" placeholder="Tell the worker what happened"></textarea></label><button class="btn coral btn-block">Send high-priority request</button><div id="emergencyNotice"></div></form></section></div></main>`;
}

async function groups() {
  const groups = await api('/group-bookings');
  return `<main class="page page-enter"><span class="eyebrow">Save together, serve together</span><h1 class="page-title">Neighbourhood group bookings</h1><p class="lead">One request for your community. 3–4 households save 5%; 5+ households save 10%.</p><div class="profile"><section class="profile-pane"><h2>Create a group request</h2><form class="form" id="groupForm"><label>Service<input required name="service" placeholder="e.g. Deep Cleaning"></label><label>Date<input required type="date" name="date"></label><label>Community / location<input required name="location" placeholder="e.g. Green Park"></label><label>Details<textarea name="description"></textarea></label><button class="btn lime btn-block">Create group booking</button><div id="groupNotice"></div></form></section><section class="profile-pane"><h2>Open nearby requests</h2><div id="groupList">${groups.length ? groups.map(g => `<p class="card"><b>${esc(g.service)}</b><br><span class="muted">${esc(g.location)} · ${g.date}</span><br><span class="badge">${g.participants} households · ${g.discount_percent}% discount</span><br><button class="btn small ghost" onclick="joinGroup(${g.id})">Join this group</button></p>`).join('') : '<div class="empty-state compact"><p>No group requests yet.</p></div>'}</div></section></div></main>`;
}

async function community() {
  const items = await api('/community-help');
  return `<main class="page page-enter"><span class="eyebrow">Neighbour to neighbour</span><h1 class="page-title">Community Help</h1><p class="lead">Request or offer everyday neighbourhood assistance.</p><div class="profile"><section class="profile-pane"><h2>Ask your community</h2><form class="form" id="communityForm"><label>What do you need?<input required name="title" placeholder="e.g. Help moving a small table"></label><label>Help type<select name="help_type"><option>Helping elderly people</option><option>Moving furniture</option><option>Community event</option><option>Lost and found</option><option>Neighbourhood assistance</option></select></label><label>Location<input required name="location" placeholder="Your locality"></label><label>Details<textarea required name="description"></textarea></label><button class="btn lime btn-block">Post community request</button><div id="communityNotice"></div></form></section><section class="profile-pane"><h2>Requests nearby</h2><div id="helpList">${items.length ? items.map(x => `<p class="card"><b>${esc(x.title)}</b><br><span class="muted">${esc(x.help_type)} · ${esc(x.location)}</span><br><span class="badge">${x.volunteers} volunteers · ${x.status}</span><br>${x.status === 'Open' ? `<button class="btn small ghost" onclick="volunteer(${x.id})">Volunteer</button> <button class="btn small lime" onclick="resolveHelp(${x.id})">Mark resolved</button>` : ''}</p>`).join('') : '<div class="empty-state compact"><p>No requests yet.</p></div>'}</div></section></div></main>`;
}

function unauthorizedPage(role) {
  return `<main class="page page-enter"><div class="empty-state"><div class="empty-icon">${icons.logout}</div><h2>Access restricted</h2><p>This page is for ${role === 'customer' ? 'customers' : 'workers'} only.</p><a class="btn lime" href="#/">Go to dashboard</a></div></main>`;
}

/* ─── Map ─── */
function renderMap(workers) {
  const el = $('#workerMap') || $('#profileMap');
  if (!el || !window.L) return;
  if (el._map) {
    try { el._map.remove(); } catch (_) {}
    el._map = null;
  }
  try {
    const map = L.map(el).setView([28.617, 77.21], 13);
    el._map = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.marker([28.617, 77.21]).addTo(map).bindPopup('Your sample service location');
    if (Array.isArray(workers)) {
      workers.forEach(w => {
        if (w && typeof w.lat === 'number' && typeof w.lng === 'number') {
          L.marker([w.lat, w.lng]).addTo(map).bindPopup(`<b>${esc(w.name)}</b><br>${esc(w.category)} · ${w.distance || 0} km`);
        }
      });
    }
  } catch (mapErr) {
    console.warn('Map initialization:', mapErr);
  }
}

/* ─── Actions ─── */
async function changeStatus(id, status) {
  try { await api('/bookings/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) }); mount(); }
  catch (e) { alert(e.message); }
}
function selectEmergency(id, service) { $('#emWorker').value = id; $('#emService').value = service; $('#emergencyNotice').innerHTML = '<div class="alert success">Worker selected. Add location and send request.</div>'; }
async function joinGroup(id) { try { await api('/group-bookings/' + id + '/join?customer_name=' + encodeURIComponent(userName()), { method: 'POST' }); mount(); } catch (e) { alert(e.message); } }
async function volunteer(id) { try { await api('/community-help/' + id + '/volunteer', { method: 'POST' }); mount(); } catch (e) { alert(e.message); } }
async function resolveHelp(id) { try { await api('/community-help/' + id + '/resolve', { method: 'PUT' }); mount(); } catch (e) { alert(e.message); } }

/* ─── Route guard ─── */
function checkAccess(route) {
  if (!getUser()) return true;
  if (isCustomer() && WORKER_ROUTES.has(route)) return false;
  if (isWorker() && CUSTOMER_ROUTES.has(route)) return false;
  return true;
}

function redirectForRole(route) {
  if (isCustomer() && WORKER_ROUTES.has(route)) return '#/';
  if (isWorker() && CUSTOMER_ROUTES.has(route)) return '#/';
  return null;
}

/* ─── Mount & bind ─── */
async function mount() {
  const hash = location.hash.slice(2) || '';
  const [route, id] = hash.split('?')[0].split('/');
  const redirect = redirectForRole(route);
  if (redirect) { location.hash = redirect; return; }

  let content;
  try {
    if (!checkAccess(route)) content = unauthorizedPage(isCustomer() ? 'worker' : 'customer');
    else if (route === 'services') content = await services();
    else if (route === 'worker') content = await profile(id);
    else if (route === 'customer') content = await customer();
    else if (route === 'track') content = await trackBooking();
    else if (route === 'provider') content = await provider();
    else if (route === 'jobs') content = await jobsPage();
    else if (route === 'availability') content = await availabilityPage();
    else if (route === 'earnings') content = await earningsPage();
    else if (route === 'profile') content = await profilePage();
    else if (route === 'notifications') content = await notificationsPage();
    else if (route === 'help') content = await helpPage();
    else if (route === 'cooperative') content = await coop();
    else if (route === 'join') content = await join();
    else if (route === 'emergency') content = await emergency();
    else if (route === 'groups') content = await groups();
    else if (route === 'community') content = await community();
    else content = await home();

    $('#app').innerHTML = nav() + content + foot();
    bindNav();
    bind(route, id);
  } catch (e) {
    if (e.message && (e.message.includes('session has expired') || e.message.includes('log in first') || e.message.includes('401'))) {
      localStorage.removeItem('vconnectSession');
      $('#app').innerHTML = authNav() + authWelcome() + foot();
      if (selectedRole || localStorage.getItem('vconnectRole')) chooseRole(selectedRole || localStorage.getItem('vconnectRole'));
      const notice = $('#authNotice');
      if (notice) notice.innerHTML = '<div class="alert error">Your session has expired. Please sign in again.</div>';
      return;
    }
    $('#app').innerHTML = nav() + `<main class="page"><div class="empty-state"><h2>We couldn't reach VConnect yet.</h2><p>${esc(e.message)}. Start the FastAPI server on port 8001 and refresh.</p><br><button class="btn lime" onclick="guardedMount()">Retry connection</button></div></main>` + foot();
  }
}

function bindNav() {
  $('#navToggle')?.addEventListener('click', () => $('#navLinks')?.classList.toggle('open'));
  $$('.nav-link').forEach(a => a.addEventListener('click', () => $('#navLinks')?.classList.remove('open')));
}

function bind(route, id) {
  if (route === 'services') {
    loadWorkers();
    ['workerSearch', 'categoryFilter', 'availableFilter'].forEach(x => $('#' + x)?.addEventListener(x === 'workerSearch' ? 'input' : 'change', loadWorkers));
  }
  if (route === 'availability' || route === 'provider') {
    const toggleBtn = $('#toggleAvailability') || $('#availability');
    toggleBtn?.addEventListener('click', async () => {
      try {
        const wid = workerId();
        const current = await api('/workers/' + wid);
        const newAvail = current.available ? 0 : 1;
        await api('/workers/' + wid + '/availability', {
          method: 'PUT',
          body: JSON.stringify({ available: newAvail })
        });
        mount();
      } catch (err) { alert(err.message); }
    });
  }
  if (route === 'emergency') {
    $('#emergencyForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      if (!d.worker_id) return $('#emergencyNotice').innerHTML = '<div class="alert error">Please select a nearby worker first.</div>';
      d.worker_id = +d.worker_id;
      d.preferred_date = new Date().toISOString().split('T')[0];
      d.preferred_time = 'ASAP';
      d.priority = 'High';
      d.customer_name = userName();
      const r = await api('/bookings', { method: 'POST', body: JSON.stringify(d) });
      $('#emergencyNotice').innerHTML = `<div class="alert success">✓ ${r.message}</div>`;
    });
  }
  if (route === 'groups') {
    $('#groupForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(e.target));
        data.customer_name = userName();
        const r = await api('/group-bookings', { method: 'POST', body: JSON.stringify(data) });
        $('#groupNotice').innerHTML = `<div class="alert success">✓ ${r.message}</div>`;
        setTimeout(mount, 500);
      } catch (err) { $('#groupNotice').innerHTML = `<div class="alert error">${err.message}</div>`; }
    });
  }
  if (route === 'community') {
    $('#communityForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(e.target));
        data.requester_name = userName();
        const r = await api('/community-help', { method: 'POST', body: JSON.stringify(data) });
        $('#communityNotice').innerHTML = `<div class="alert success">✓ ${r.message}</div>`;
        e.target.reset();
      } catch (err) { $('#communityNotice').innerHTML = `<div class="alert error">${err.message}</div>`; }
    });
  }
  if (route === 'worker') {
    $('#bookingForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.worker_id = +id;
      data.service = $('.profile-pane p b')?.textContent || 'Service';
      data.customer_name = userName();
      try {
        const r = await api('/bookings', { method: 'POST', body: JSON.stringify(data) });
        $('#bookingNotice').innerHTML = `<div class="alert success">✓ ${r.message} <a href="#/customer">View my bookings →</a></div>`;
        e.target.reset();
      } catch (err) { $('#bookingNotice').innerHTML = `<div class="alert error">${err.message}</div>`; }
    });
    api('/workers/' + id).then(w => renderMap([w]));
  }
  if (route === 'join') {
    $('#joinForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.price = Number(data.price);
      try {
        const r = await api('/workers', { method: 'POST', body: JSON.stringify(data) });
        const s = getSession();
        if (s && s.user) {
          s.user.worker_id = r.id;
          localStorage.setItem('vconnectSession', JSON.stringify(s));
        }
        $('#joinNotice').innerHTML = `<div class="alert success">✓ ${r.message} <a href="#/worker/${r.id}">View profile →</a></div>`;
        e.target.reset();
      } catch (err) { $('#joinNotice').innerHTML = `<div class="alert error">${err.message}</div>`; }
    });
  }
  if (route === 'jobs') {
    $$('.tab').forEach(tab => tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      $('#tab-' + tab.dataset.tab)?.classList.remove('hidden');
    }));
  }
  if (route === 'help') {
    $('#helpForm')?.addEventListener('submit', e => {
      e.preventDefault();
      $('#helpNotice').innerHTML = '<div class="alert success">✓ Message sent (demo). Our team will respond within 24 hours.</div>';
      e.target.reset();
    });
  }
  if (!route) {
    $('#problemForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const text = $('#problem')?.value;
      if (!text) return;
      try {
        const s = await api('/service-suggestion', { method: 'POST', body: JSON.stringify({ description: text }) });
        $('#suggestion').innerHTML = `<div class="alert success">${s.message} <a href="#/services?category=${encodeURIComponent(s.suggestion)}">See ${s.suggestion} →</a></div>`;
      } catch (err) {
        $('#suggestion').innerHTML = `<div class="alert error">${err.message}</div>`;
      }
    });
  }
}

async function guardedMount() {
  const saved = getSession();
  if (!saved) {
    $('#app').innerHTML = authNav() + authWelcome() + foot();
    if (selectedRole || localStorage.getItem('vconnectRole')) chooseRole(selectedRole || localStorage.getItem('vconnectRole'));
    return;
  }
  await mount();
}

window.chooseRole = chooseRole;
window.logoutUser = logoutUser;
window.changeStatus = changeStatus;
window.selectEmergency = selectEmergency;
window.joinGroup = joinGroup;
window.volunteer = volunteer;
window.resolveHelp = resolveHelp;
window.addEventListener('hashchange', guardedMount);
guardedMount();
