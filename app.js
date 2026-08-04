import React, { useState, useEffect, useRef, useCallback } from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18/client';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, LogOut, Package, TrendingUp,
  AlertTriangle, Users, Settings as SettingsIcon, Receipt, CheckCircle, X,
  Pill, Edit2, ChevronRight, Banknote, CreditCard, Smartphone, LayoutDashboard,
  ClipboardList
} from 'https://esm.sh/lucide-react@0.383.0?deps=react@18';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ---------------------------------------------------------------------- */
/* Supabase connection                                                    */
/* ---------------------------------------------------------------------- */
/* URL and anon key come from config.js, loaded before this file. */

const configCheck = (() => {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    return { ready: false, reason: 'config.js is missing SUPABASE_URL or SUPABASE_ANON_KEY.' };
  }
  if (window.SUPABASE_URL.includes('YOUR_') || window.SUPABASE_ANON_KEY.includes('YOUR_')) {
    return { ready: false, reason: 'config.js still has the placeholder text — paste your real Project URL and anon key.' };
  }
  try {
    // eslint-disable-next-line no-new
    new URL(window.SUPABASE_URL);
  } catch (e) {
    return { ready: false, reason: `SUPABASE_URL isn't a valid web address: "${window.SUPABASE_URL}". It should look like https://abcdefgh.supabase.co (with https:// at the front, no extra spaces or quotes).` };
  }
  return { ready: true, reason: '' };
})();
const configReady = configCheck.ready;

// A valid-looking placeholder URL so createClient doesn't throw before we can
// show the "finish setup" screen further down.
const supabase = createClient(
  configReady ? window.SUPABASE_URL : 'https://placeholder.supabase.co',
  configReady ? window.SUPABASE_ANON_KEY : 'placeholder'
);

/* ---------------------------------------------------------------------- */
/* Seed data                                                               */
/* ---------------------------------------------------------------------- */

const DEFAULT_INVENTORY = [
  { id: 'p1', name: 'Paracetamol 500mg', category: 'Pain Relief', sku: 'PCM-500', price: 50, stock: 200, reorderLevel: 30, expiry: '2027-03-01', requiresRx: false },
  { id: 'p2', name: 'Ibuprofen 400mg', category: 'Pain Relief', sku: 'IBU-400', price: 80, stock: 150, reorderLevel: 25, expiry: '2026-11-15', requiresRx: false },
  { id: 'p3', name: 'Amoxicillin 500mg', category: 'Antibiotics', sku: 'AMX-500', price: 250, stock: 60, reorderLevel: 20, expiry: '2026-09-10', requiresRx: true },
  { id: 'p4', name: 'Metformin 500mg', category: 'Diabetes', sku: 'MET-500', price: 180, stock: 40, reorderLevel: 15, expiry: '2027-01-20', requiresRx: true },
  { id: 'p5', name: 'Amlodipine 5mg', category: 'Cardiovascular', sku: 'AML-5', price: 220, stock: 8, reorderLevel: 10, expiry: '2026-12-05', requiresRx: true },
  { id: 'p6', name: 'Cetirizine 10mg', category: 'Allergy', sku: 'CET-10', price: 90, stock: 100, reorderLevel: 20, expiry: '2027-05-01', requiresRx: false },
  { id: 'p7', name: 'Omeprazole 20mg', category: 'Digestive', sku: 'OMP-20', price: 150, stock: 55, reorderLevel: 15, expiry: '2026-10-18', requiresRx: true },
  { id: 'p8', name: 'ORS Sachets', category: 'First Aid', sku: 'ORS-01', price: 40, stock: 300, reorderLevel: 50, expiry: '2027-08-01', requiresRx: false },
  { id: 'p9', name: 'Vitamin C 1000mg', category: 'Vitamins', sku: 'VITC-1000', price: 350, stock: 70, reorderLevel: 15, expiry: '2027-02-14', requiresRx: false },
  { id: 'p10', name: 'Cough Syrup 100ml', category: 'Respiratory', sku: 'CGH-100', price: 280, stock: 45, reorderLevel: 10, expiry: '2026-08-30', requiresRx: false },
  { id: 'p11', name: 'Elastic Bandage', category: 'First Aid', sku: 'BND-01', price: 120, stock: 80, reorderLevel: 15, expiry: '2028-01-01', requiresRx: false },
  { id: 'p12', name: 'Hand Sanitizer 250ml', category: 'Hygiene', sku: 'SNT-250', price: 200, stock: 90, reorderLevel: 20, expiry: '2028-06-01', requiresRx: false },
  { id: 'p13', name: 'Multivitamin Syrup (Kids)', category: 'Vitamins', sku: 'MVK-100', price: 320, stock: 6, reorderLevel: 10, expiry: '2026-09-05', requiresRx: false },
];

const DEFAULT_STAFF = [
  { id: 's1', name: 'Admin', pin: '1234', role: 'admin' },
  { id: 's2', name: 'Grace Wanjiru', pin: '1111', role: 'staff' },
  { id: 's3', name: 'Kevin Otieno', pin: '2222', role: 'staff' },
];

const DEFAULT_SETTINGS = { pharmacyName: 'Amani Pharmacy', currency: 'KSh', taxRate: 16 };

/* ---------------------------------------------------------------------- */
/* Storage helpers — backed by Supabase, shared across every device       */
/* ---------------------------------------------------------------------- */

async function getOrInit(key, defaultValue) {
  const { data, error } = await supabase.from('kv_store').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.error('load failed for', key, error);
    return defaultValue;
  }
  if (!data) {
    await saveShared(key, defaultValue);
    return defaultValue;
  }
  return data.value;
}

async function saveShared(key, value) {
  const { error } = await supabase.from('kv_store').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) console.error('sync failed for', key, error);
}

const SESSION_KEY = 'pos_session_staff_id';

function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatMoney(amount, currency) {
  return currency + ' ' + Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function isSameDay(iso, ref) {
  const d = new Date(iso);
  return d.toDateString() === ref.toDateString();
}

/* ---------------------------------------------------------------------- */
/* Global styles                                                          */
/* ---------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.pos-root {
  --pine: #16423C;
  --pine-light: #2F6B57;
  --pine-pale: #E7EEE9;
  --paper: #FBF9F3;
  --bg: #EEF1EA;
  --ink: #202822;
  --muted: #6B776E;
  --border: #D9DFD4;
  --amber: #C97A2B;
  --amber-pale: #FBEEDD;
  --red: #B23A48;
  --red-pale: #FBE7E8;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
}
.pos-root *, .pos-root *::before, .pos-root *::after { box-sizing: border-box; }
.pos-serif { font-family: 'Zilla Slab', serif; }
.pos-mono { font-family: 'IBM Plex Mono', monospace; }
.pos-root button { font-family: 'Inter', sans-serif; cursor: pointer; }
.pos-root input, .pos-root select { font-family: 'Inter', sans-serif; }
.pos-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.pos-scroll::-webkit-scrollbar-thumb { background: #C7D0C0; border-radius: 4px; }

/* Structural classes (kept plain on desktop, overridden below on mobile) */
.pos-topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: var(--pine); color: #fff; flex-wrap: wrap; gap: 8px; }
.pos-topbar-right { display: flex; align-items: center; gap: 16px; }
.pos-staff-layout { display: flex; height: calc(100vh - 62px); }
.pos-product-panel { flex: 1; padding: 20px; overflow-y: auto; }
.pos-filter-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.pos-product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.pos-cart-panel { width: 340px; background: var(--paper); border-left: 1px solid var(--border); display: flex; flex-direction: column; }
.pos-cart-close-btn { display: none; }
.pos-cart-mobile-bar { display: none; }
.pos-admin-layout { display: flex; height: calc(100vh - 62px); }
.pos-admin-nav { width: 200px; background: var(--paper); border-right: 1px solid var(--border); padding: 18px 12px; }
.pos-admin-nav-btn { width: 100%; }
.pos-admin-content { flex: 1; overflow-y: auto; padding: 24px; }
.pos-table-scroll { overflow-x: auto; }
.pos-modal-backdrop { position: fixed; inset: 0; background: rgba(22,66,60,0.35); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
.pos-modal { width: 380px; max-width: 100%; }

@media (max-width: 860px) {
  .pos-topbar { padding: 12px 16px; }
  .pos-topbar-right { gap: 10px; }
  .pos-sync-indicator { display: none; }

  .pos-staff-layout { display: block; height: auto; min-height: calc(100vh - 62px); }
  .pos-product-panel { padding: 14px 14px 96px; }
  .pos-product-grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 8px; }

  .pos-cart-panel { display: none; }
  .pos-cart-panel.pos-cart-open {
    display: flex; position: fixed; inset: 0; z-index: 70; width: 100%; border-left: none;
  }
  .pos-cart-close-btn { display: flex; }
  .pos-cart-mobile-bar {
    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; width: 100%;
    background: var(--pine); color: #fff; padding: 12px 16px; align-items: center; border: none;
    justify-content: space-between; box-shadow: 0 -4px 14px rgba(0,0,0,0.15);
  }

  .pos-admin-layout { display: block; height: auto; min-height: calc(100vh - 62px); }
  .pos-admin-nav { width: 100%; display: flex; overflow-x: auto; padding: 10px 12px; border-right: none; border-bottom: 1px solid var(--border); gap: 6px; }
  .pos-admin-nav-btn { width: auto; white-space: nowrap; margin-bottom: 0 !important; }
  .pos-admin-content { padding: 16px; }

  .pos-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .pos-dash-columns { grid-template-columns: 1fr !important; gap: 20px !important; }
  .pos-inv-toolbar { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
}
`;

/* ---------------------------------------------------------------------- */
/* Login                                                                   */
/* ---------------------------------------------------------------------- */

function LoginScreen({ staffList, settings, onLogin }) {
  const [tab, setTab] = useState('staff');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  const submit = (e) => {
    e.preventDefault();
    const match = staffList.find((s) => s.pin === pin && s.role === tab);
    if (match) {
      onLogin(match);
    } else {
      setError('Incorrect PIN for this login type.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="pos-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <style>{STYLES}</style>
      <div style={{ width: 360, maxWidth: '100%', background: 'var(--paper)', borderRadius: 16, border: '1px solid var(--border)', padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--pine)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Pill size={26} />
        </div>
        <h1 className="pos-serif" style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px' }}>{settings.pharmacyName}</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>Point of sale</p>

        <div style={{ display: 'flex', background: 'var(--pine-pale)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {['staff', 'admin'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPin(''); setError(''); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                background: tab === t ? 'var(--pine)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--pine)',
                fontWeight: 600, fontSize: 13, transition: 'all .15s'
              }}
            >
              {t === 'staff' ? 'Cashier' : 'Admin'}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="Enter PIN"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 10, fontSize: 18,
              border: error ? '1px solid var(--red)' : '1px solid var(--border)',
              textAlign: 'center', letterSpacing: 4, marginBottom: 12, background: '#fff'
            }}
          />

          {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <button type="submit" disabled={!pin} style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600,
            background: pin ? 'var(--pine)' : '#B9C4B4', color: '#fff'
          }}>Log in</button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared header                                                          */
/* ---------------------------------------------------------------------- */

function TopBar({ settings, user, onLogout, lastSynced, right }) {
  return (
    <div className="pos-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Pill size={18} />
        </div>
        <div>
          <div className="pos-serif" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>{settings.pharmacyName}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{user.role === 'admin' ? 'Admin console' : 'Cashier terminal'} · {user.name}</div>
        </div>
      </div>
      <div className="pos-topbar-right">
        {right}
        <div className="pos-sync-indicator" style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7FD99A', display: 'inline-block' }} />
          Synced {lastSynced}
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Staff / Cashier POS                                                     */
/* ---------------------------------------------------------------------- */

function StaffPOS({ inventory, settings, user, addSale, updateStock, lastSynced, onLogout }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  const categories = ['All', ...Array.from(new Set(inventory.map((p) => p.category)))];

  const filtered = inventory.filter((p) => {
    const matchQ = p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
    const matchC = category === 'All' || p.category === category;
    return matchQ && matchC;
  });

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return c;
        return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { id: product.id, name: product.name, price: product.price, qty: 1, requiresRx: product.requiresRx, maxStock: product.stock }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((c) => c.map((i) => {
      if (i.id !== id) return i;
      const next = i.qty + delta;
      if (next <= 0) return i;
      if (next > i.maxStock) return i;
      return { ...i, qty: next };
    }));
  };

  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * (settings.taxRate / 100);
  const total = subtotal + tax;

  const completeSale = (payment) => {
    const sale = {
      id: genId('sale'),
      timestamp: new Date().toISOString(),
      cashier: user.name,
      items: cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      subtotal, tax, total,
      paymentMethod: payment.method,
      amountTendered: payment.tendered ?? total,
      change: payment.change ?? 0,
    };
    addSale(sale);
    updateStock(cart.map((i) => ({ id: i.id, qty: i.qty })));
    setReceipt(sale);
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  return (
    <div className="pos-root" style={{ minHeight: '100vh' }}>
      <style>{STYLES}</style>
      <TopBar settings={settings} user={user} onLogout={onLogout} lastSynced={lastSynced}
        right={<div style={{ fontSize: 12, opacity: 0.85 }}>{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</div>} />

      <div className="pos-staff-layout">
        {/* Product browser */}
        <div className="pos-product-panel pos-scroll">
          <div className="pos-filter-row">
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }} />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or SKU"
                style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14 }}
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14 }}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="pos-product-grid">
            {filtered.map((p) => {
              const low = p.stock <= p.reorderLevel;
              const out = p.stock <= 0;
              return (
                <button key={p.id} onClick={() => addToCart(p)} disabled={out} style={{
                  textAlign: 'left', background: 'var(--paper)', border: '1px dashed var(--border)',
                  borderRadius: 10, padding: '14px 14px 12px', position: 'relative',
                  opacity: out ? 0.5 : 1, cursor: out ? 'not-allowed' : 'pointer'
                }}>
                  {p.requiresRx && (
                    <span style={{
                      position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700,
                      color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 5,
                      padding: '1px 5px', transform: 'rotate(4deg)'
                    }}>℞ Rx</span>
                  )}
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 4 }}>{p.category}</div>
                  <div className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, lineHeight: 1.25 }}>{p.name}</div>
                  <div className="pos-mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{p.sku}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="pos-mono" style={{ fontSize: 15, fontWeight: 500 }}>{formatMoney(p.price, settings.currency)}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                      background: out ? 'var(--red-pale)' : low ? 'var(--amber-pale)' : 'var(--pine-pale)',
                      color: out ? 'var(--red)' : low ? 'var(--amber)' : 'var(--pine)'
                    }}>{out ? 'Out of stock' : low ? `${p.stock} left` : `${p.stock} in stock`}</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No products match your search.</p>}
          </div>
        </div>

        {/* Cart — a fixed sidebar on desktop, a full-screen drawer on mobile */}
        <div className={'pos-cart-panel' + (cartOpen ? ' pos-cart-open' : '')}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} />
              <span className="pos-serif" style={{ fontWeight: 600, fontSize: 15 }}>Current sale</span>
            </div>
            <button className="pos-cart-close-btn" onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }} className="pos-scroll">
            {cart.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 20 }}>Tap a product to add it to the sale.</p>}
            {cart.map((i) => (
              <div key={i.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{i.name}{i.requiresRx ? ' ℞' : ''}</span>
                  <button onClick={() => removeFromCart(i.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)' }}><Trash2 size={13} /></button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => changeQty(i.id, -1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                    <span className="pos-mono" style={{ fontSize: 13, minWidth: 16, textAlign: 'center' }}>{i.qty}</span>
                    <button onClick={() => changeQty(i.id, 1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                  </div>
                  <span className="pos-mono" style={{ fontSize: 13 }}>{formatMoney(i.price * i.qty, settings.currency)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
              <span>Subtotal</span><span className="pos-mono">{formatMoney(subtotal, settings.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
              <span>Tax ({settings.taxRate}%)</span><span className="pos-mono">{formatMoney(tax, settings.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              <span className="pos-serif">Total</span><span className="pos-mono">{formatMoney(total, settings.currency)}</span>
            </div>
            <button onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: cart.length === 0 ? '#B9C4B4' : 'var(--pine)', color: '#fff', fontWeight: 600, fontSize: 15
            }}>Charge {cart.length > 0 ? formatMoney(total, settings.currency) : ''}</button>
          </div>
        </div>

        {/* Mobile-only: tap to open the cart drawer */}
        {cart.length > 0 && !cartOpen && (
          <button className="pos-cart-mobile-bar" onClick={() => setCartOpen(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <ShoppingCart size={16} />
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
              <span className="pos-mono">{formatMoney(total, settings.currency)}</span>
              <ChevronRight size={16} />
            </span>
          </button>
        )}
      </div>

      {checkoutOpen && (
        <CheckoutModal cart={cart} subtotal={subtotal} tax={tax} total={total} settings={settings}
          onClose={() => setCheckoutOpen(false)} onComplete={completeSale} />
      )}
      {receipt && <ReceiptModal sale={receipt} settings={settings} onClose={() => { setReceipt(null); setCartOpen(false); }} />}
    </div>
  );
}

function CheckoutModal({ cart, subtotal, tax, total, settings, onClose, onComplete }) {
  const [method, setMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [rxConfirmed, setRxConfirmed] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaProcessing, setMpesaProcessing] = useState(false);
  const [mpesaError, setMpesaError] = useState('');
  const [mpesaCheckoutId, setMpesaCheckoutId] = useState('');
  const needsRx = cart.some((i) => i.requiresRx);
  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === 'cash' ? Math.max(0, tenderedNum - total) : 0;
  const canComplete =
    (!needsRx || rxConfirmed) &&
    (method !== 'cash' ? tenderedNum >= total : true) && // For card/MPesa, we assume amount is covered
    (method !== 'mpesa' || (mpesaPhone && !mpesaProcessing && !mpesaError)) // For MPesa, we need a valid phone number

  // Refs to store subscription and checkout ID for cleanup
  const mpesaSubscriptionRef = useRef(null);
  const mpesaCheckoutIdRef = useRef('');

  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      if (mpesaSubscriptionRef.current) {
        supabase.removeChannel(mpesaSubscriptionRef.current);
      }
    };
  }, []);

  const handleMpesaPayment = async () => {
    if (!mpesaPhone) {
      setMpesaError('Please enter a phone number');
      return;
    }

    // Validate Kenyan phone number format (simplified)
    const phoneRegex = /^\+?254[17]\d{8}$/;
    if (!phoneRegex.test(mpesaPhone)) {
      setMpesaError('Please enter a valid Kenyan phone number (e.g., +2547XXXXXXXX or 07XXXXXXXX)');
      return;
    }

    setMpesaProcessing(true);
    setMpesaError('');

    try {
      // Call our Supabase Edge Function to initiate STK push
      const response = await fetch('/functions/v1/mpesa-stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: mpesaPhone,
          amount: total, // Total amount to charge
          accountReference: 'MedipointPOS',
          transactionDesc: 'Payment for medicines'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      // Store the checkout request ID to match with callback later
      const checkoutRequestId = result.CheckoutRequestID;
      setMpesaCheckoutId(checkoutRequestId);
      mpesaCheckoutIdRef.current = checkoutRequestId;

      // Clean up any existing subscription
      if (mpesaSubscriptionRef.current) {
        supabase.removeChannel(mpesaSubscriptionRef.current);
      }

      // Set up a real-time subscription to listen for updates to this specific checkout
      const checkoutKey = `mpesa_checkout_${checkoutRequestId}`;
      mpesaSubscriptionRef.current = supabase
        .channel(`mpesa-checkout-${checkoutRequestId}`)
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'kv_store',
            filter: `key=eq.${checkoutKey}`
          },
          async (payload) => {
            // Handle the update from the M-Pesa callback
            const newValue = payload.new.value;

            // Check if the payment has been processed
            if (newValue && newValue.resultCode !== undefined) {
              const isSuccessful = newValue.resultCode === 0;
              const status = isSuccessful ? 'completed' : 'failed';

              // Clean up subscription
              supabase.removeChannel(mpesaSubscriptionRef.current);
              mpesaSubscriptionRef.current = null;

              if (isSuccessful) {
                // Payment successful - complete the sale
                await onComplete({
                  method,
                  tendered: total,
                  change: 0,
                  mpesaPhone,
                  mpesaReceiptNumber: newValue.mpesaReceiptNumber || ''
                });
                setMpesaProcessing(false);
                onClose(); // Close the modal on success
              } else {
                // Payment failed
                setMpesaError(`Payment failed: ${newValue.resultDescription || 'Unknown error'}`);
                setMpesaProcessing(false);
              }
            }
          }
        )
        .subscribe();

      // Show processing message
      setMpesaError('Processing payment... Please check your phone to complete the transaction.');
    } catch (error) {
      console.error('M-Pesa error:', error);
      setMpesaError(error.message || 'Network error. Please check your connection and try again.');
      setMpesaProcessing(false);

      // Clean up subscription on error
      if (mpesaSubscriptionRef.current) {
        supabase.removeChannel(mpesaSubscriptionRef.current);
        mpesaSubscriptionRef.current = null;
      }
    }
  };

  // Clean up subscription when component unmounts or when MPesa process completes/resets
  useEffect(() => {
    return () => {
      if (mpesaSubscriptionRef.current) {
        supabase.removeChannel(mpesaSubscriptionRef.current);
      }
    };
  }, [mpesaProcessing, mpesaError]); // Re-run when processing state or error changes

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>Complete sale</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          <span className="pos-serif">Total due</span>
          <span className="pos-mono">{formatMoney(total, settings.currency)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'cash', label: 'Cash', Icon: Banknote },
            { key: 'card', label: 'Card', Icon: CreditCard },
            { key: 'mpesa', label: 'M-Pesa', Icon: Smartphone },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => {
              setMethod(key);
              if (key === 'mpesa') {
                setMpesaPhone('');
                setMpesaError('');
              }
            }} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              border: method === key ? '1px solid var(--pine)' : '1px solid var(--border)',
              background: method === key ? 'var(--pine-pale)' : '#fff', color: method === key ? 'var(--pine)' : 'var(--ink)', fontSize: 12, fontWeight: 500
            }}><Icon size={16} />{label}</button>
          ))}
        </div>

        {method === 'cash' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Amount tendered</label>
            <input type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={formatMoney(total, settings.currency)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
            {tenderedNum > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8, color: tenderedNum < total ? 'var(--red)' : 'var(--muted)' }}>
                <span>{tenderedNum < total ? 'Insufficient amount' : 'Change due'}</span>
                <span className="pos-mono">{tenderedNum < total ? '' : formatMoney(change, settings.currency)}</span>
              </div>
            )}
          </div>
        )}

        {method === 'mpesa' && !mpesaProcessing && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Phone Number</label>
            <input
              type="tel"
              value={mpesaPhone}
              onChange={(e) => {
                // Format phone number as user types
                let value = e.target.value.replace(/\s+/g, ''); // Remove spaces
                if (value.startsWith('0')) {
                  value = '+254' + value.substring(1);
                } else if (!value.startsWith('+254') && value.length >= 9) {
                  value = '+254' + value;
                }
                setMpesaPhone(value);
                setMpesaError('');
              }}
              placeholder="+2547XXXXXXXX"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4
              }}
            />
            {mpesaError && (
              <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{mpesaError}</p>
            )}
          </div>
        )}

        {needsRx && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, marginBottom: 16, padding: 10, background: 'var(--amber-pale)', borderRadius: 8, color: '#5C3A12' }}>
            <input type="checkbox" checked={rxConfirmed} onChange={(e) => setRxConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
            I have verified a valid prescription for the item(s) marked ℞.
          </label>
        )}

        <button
          onClick={method === 'mpesa' ? handleMpesaPayment : () => onComplete({ method, tendered: method === 'cash' ? tenderedNum : total, change })}
          disabled={!canComplete || mpesaProcessing}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15,
            background: canComplete && !mpesaProcessing ? 'var(--pine)' : '#B9C4B4', color: '#fff',
            opacity: mpesaProcessing ? 0.7 : 1
          }}
        >
          {mpesaProcessing ? 'Processing...' : 'Confirm payment'}
        </button>
      </div>
    </div>
  );
}

function ReceiptModal({ sale, settings, onClose }) {
  return (
    <div className="pos-modal-backdrop">
      <div className="pos-mono" style={{ width: 320, maxWidth: '100%', background: '#fff', borderRadius: 4, padding: '22px 20px', fontSize: 12.5, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <CheckCircle size={28} color="var(--pine)" style={{ marginBottom: 6 }} />
          <div className="pos-serif" style={{ fontSize: 16, fontWeight: 700 }}>{settings.pharmacyName}</div>
          <div style={{ color: 'var(--muted)' }}>{new Date(sale.timestamp).toLocaleString()}</div>
          <div style={{ color: 'var(--muted)' }}>Cashier: {sale.cashier}</div>
        </div>
        <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '10px 0', margin: '10px 0' }}>
          {sale.items.map((i) => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>{i.qty} x {i.name}</span>
              <span>{formatMoney(i.price * i.qty, settings.currency)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{formatMoney(sale.subtotal, settings.currency)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><span>{formatMoney(sale.tax, settings.currency)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, margin: '4px 0' }}><span>Total</span><span>{formatMoney(sale.total, settings.currency)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Paid via</span><span>{sale.paymentMethod}</span></div>
        {sale.paymentMethod === 'cash' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Change</span><span>{formatMoney(sale.change, settings.currency)}</span></div>
        )}
        <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 12 }}>Thank you — get well soon</div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--pine)', color: '#fff', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>New sale</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Admin console                                                          */
/* ---------------------------------------------------------------------- */

function AdminConsole({ inventory, sales, staffList, settings, user, onLogout, lastSynced,
  saveInventory, saveStaff, saveSettings }) {
  const [tab, setTab] = useState('dashboard');
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { key: 'inventory', label: 'Inventory', Icon: Package },
    { key: 'sales', label: 'Sales history', Icon: ClipboardList },
    { key: 'staff', label: 'Staff', Icon: Users },
    { key: 'settings', label: 'Settings', Icon: SettingsIcon },
  ];

  return (
    <div className="pos-root" style={{ minHeight: '100vh' }}>
      <style>{STYLES}</style>
      <TopBar settings={settings} user={user} onLogout={onLogout} lastSynced={lastSynced} right={null} />
      <div className="pos-admin-layout">
        <div className="pos-admin-nav">
          {navItems.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)} className="pos-admin-nav-btn" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: 'none', marginBottom: 4, textAlign: 'left', fontSize: 14,
              background: tab === key ? 'var(--pine)' : 'transparent', color: tab === key ? '#fff' : 'var(--ink)'
            }}><Icon size={16} />{label}</button>
          ))}
        </div>
        <div className="pos-admin-content pos-scroll">
          {tab === 'dashboard' && <DashboardTab inventory={inventory} sales={sales} settings={settings} />}
          {tab === 'inventory' && <InventoryTab inventory={inventory} settings={settings} saveInventory={saveInventory} />}
          {tab === 'sales' && <SalesTab sales={sales} settings={settings} />}
          {tab === 'staff' && <StaffTab staffList={staffList} saveStaff={saveStaff} user={user} />}
          {tab === 'settings' && <SettingsTab settings={settings} saveSettings={saveSettings} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div className="pos-serif" style={{ fontSize: 24, fontWeight: 700, color: accent || 'var(--ink)' }}>{value}</div>
    </div>
  );
}

function DashboardTab({ inventory, sales, settings }) {
  const today = new Date();
  const todaySales = sales.filter((s) => isSameDay(s.timestamp, today));
  const revenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const lowStock = inventory.filter((p) => p.stock <= p.reorderLevel);
  const recent = [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Today at a glance</h2>
      <div className="pos-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Revenue today" value={formatMoney(revenue, settings.currency)} />
        <StatCard label="Transactions today" value={todaySales.length} />
        <StatCard label="Products tracked" value={inventory.length} />
        <StatCard label="Low stock alerts" value={lowStock.length} accent={lowStock.length ? 'var(--red)' : undefined} />
      </div>

      <div className="pos-dash-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} color="var(--amber)" /> Needs reordering
          </h3>
          {lowStock.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>All stock levels are healthy.</p>}
          {lowStock.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{p.name}</span>
              <span className="pos-mono" style={{ color: p.stock === 0 ? 'var(--red)' : 'var(--amber)' }}>{p.stock} left (reorder at {p.reorderLevel})</span>
            </div>
          ))}
        </div>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Receipt size={15} /> Recent transactions
          </h3>
          {recent.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No sales recorded yet.</p>}
          {recent.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{s.cashier} · {new Date(s.timestamp).toLocaleTimeString()}</span>
              <span className="pos-mono">{formatMoney(s.total, settings.currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const emptyProduct = { name: '', category: '', sku: '', price: '', stock: '', reorderLevel: '', expiry: '', requiresRx: false };

function InventoryTab({ inventory, settings, saveInventory }) {
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = new, obj = edit
  const [query, setQuery] = useState('');

  const filtered = inventory.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()));

  const upsert = (product) => {
    if (product.id) {
      saveInventory(inventory.map((p) => (p.id === product.id ? product : p)));
    } else {
      saveInventory([...inventory, { ...product, id: genId('p') }]);
    }
    setModalProduct(null);
  };

  const remove = (id) => saveInventory(inventory.filter((p) => p.id !== id));

  return (
    <div>
      <div className="pos-inv-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>Inventory</h2>
        <button onClick={() => setModalProduct({ ...emptyProduct })} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <Plus size={14} /> Add product
        </button>
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inventory"
        style={{ width: '100%', maxWidth: 320, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginBottom: 14 }} />

      <div className="pos-table-scroll" style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ minWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr 1fr 60px', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <span>Product</span><span>Category</span><span>SKU</span><span>Price</span><span>Stock</span><span>Expiry</span><span></span>
          </div>
          {filtered.map((p) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr 1fr 60px', padding: '10px 16px', fontSize: 13, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span>{p.name}{p.requiresRx ? ' ℞' : ''}</span>
              <span style={{ color: 'var(--muted)' }}>{p.category}</span>
              <span className="pos-mono" style={{ fontSize: 12 }}>{p.sku}</span>
              <span className="pos-mono">{formatMoney(p.price, settings.currency)}</span>
              <span style={{ color: p.stock <= p.reorderLevel ? 'var(--red)' : 'var(--ink)' }}>{p.stock}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{p.expiry}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setModalProduct(p)} style={{ background: 'none', border: 'none', color: 'var(--muted)' }}><Edit2 size={14} /></button>
                <button onClick={() => remove(p.id)} style={{ background: 'none', border: 'none', color: 'var(--red)' }}><Trash2 size={14} /></button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onSave={upsert} />}
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({ ...product });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name && form.category && form.sku && form.price !== '' && form.stock !== '';

  return (
    <div className="pos-modal-backdrop">
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: 24, maxHeight: '85vh', overflowY: 'auto' }} className="pos-scroll">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="pos-serif" style={{ fontSize: 17, fontWeight: 700 }}>{product.id ? 'Edit product' : 'Add product'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={18} /></button>
        </div>
        {[
          ['name', 'Product name', 'text'], ['category', 'Category', 'text'], ['sku', 'SKU', 'text'],
          ['price', 'Price', 'number'], ['stock', 'Stock quantity', 'number'], ['reorderLevel', 'Reorder level', 'number'], ['expiry', 'Expiry date', 'date'],
        ].map(([key, label, type]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
            <input type={type} value={form[key]} onChange={(e) => set(key, type === 'number' ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value)}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
          </div>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
          <input type="checkbox" checked={form.requiresRx} onChange={(e) => set('requiresRx', e.target.checked)} /> Requires a prescription
        </label>
        <button disabled={!valid} onClick={() => onSave({ ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0, reorderLevel: parseInt(form.reorderLevel) || 0 })}
          style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: valid ? 'var(--pine)' : '#B9C4B4', color: '#fff', fontWeight: 600 }}>
          Save product
        </button>
      </div>
    </div>
  );
}

function SalesTab({ sales, settings }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = sales.filter((s) => {
    const d = new Date(s.timestamp);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = filtered.reduce((sum, s) => sum + s.total, 0);

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Sales history</h2>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} transactions · <b className="pos-mono" style={{ color: 'var(--ink)' }}>{formatMoney(total, settings.currency)}</b></span>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 && <p style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>No transactions in this range.</p>}
        {filtered.map((s) => (
          <div key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <div onClick={() => setExpanded(expanded === s.id ? null : s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={13} style={{ transform: expanded === s.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                {new Date(s.timestamp).toLocaleString()} · {s.cashier}
              </span>
              <span className="pos-mono">{formatMoney(s.total, settings.currency)}</span>
            </div>
            {expanded === s.id && (
              <div style={{ padding: '4px 16px 14px 37px', fontSize: 12.5, color: 'var(--muted)' }}>
                {s.items.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{i.qty} x {i.name}</span><span className="pos-mono">{formatMoney(i.price * i.qty, settings.currency)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4 }}>Paid via {s.paymentMethod}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTab({ staffList, saveStaff, user }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const add = () => {
    if (!name || pin.length !== 4) return;
    saveStaff([...staffList, { id: genId('s'), name, pin, role: 'staff' }]);
    setName(''); setPin('');
  };
  const remove = (id) => saveStaff(staffList.filter((s) => s.id !== id));

  const handleSavePin = () => {
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    // Update the staff list
    const updatedStaff = staffList.map(s =>
      s.id === user.id ? { ...s, pin: newPin } : s
    );
    saveStaff(updatedStaff);
    setChangePinOpen(false);
    setPinError('');
    setNewPin('');
    setConfirmPin('');
  };

  return (
    <>
      <div>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Staff accounts</h2>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 20 }}>
          {staffList.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span>{s.name} <span style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', marginLeft: 6 }}>{s.role}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="pos-mono" style={{ color: 'var(--muted)' }}>PIN ••••</span>
                {s.role !== 'admin' && <button onClick={() => remove(s.id)} style={{ background: 'none', border: 'none', color: 'var(--red)' }}><Trash2 size={14} /></button>}
                {s.id === user.id && s.role === 'admin' && (
                  <button onClick={() => {
                    setChangePinOpen(true);
                    setNewPin('');
                    setConfirmPin('');
                    setPinError('');
                  }} style={{ background: 'none', border: 'none', color: 'var(--pine)' }}>
                    Change PIN
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
        <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Add cashier</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4-digit PIN" style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
          <button onClick={add} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600 }}>Add</button>
        </div>
      </div>

      {/* Change PIN Modal */}
      {changePinOpen && (
        <div className="pos-modal-backdrop">
          <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>Change PIN</span>
              <button onClick={() => setChangePinOpen(false)} style={{ background: 'none', border: 'none' }}><X size={18} /></button>
            </div>

            {pinError && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{pinError}</p>}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>New PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter new 4-digit PIN"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 10, fontSize: 18,
                  border: '1px solid var(--border)',
                  textAlign: 'center', letterSpacing: 4, marginBottom: 12, background: '#fff'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Confirm 4-digit PIN"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 10, fontSize: 18,
                  border: '1px solid var(--border)',
                  textAlign: 'center', letterSpacing: 4, marginBottom: 12, background: '#fff'
                }}
              />
            </div>

            <button onClick={handleSavePin} disabled={!(newPin && confirmPin)} style={{
              width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600,
              background: newPin && confirmPin ? 'var(--pine)' : '#B9C4B4', color: '#fff'
            }}>Save PIN</button>
          </div>
        </div>
      )}
    </>
  );
}

function SettingsTab({ settings, saveSettings }) {
  const [form, setForm] = useState({ ...settings });
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Settings</h2>
      <div style={{ maxWidth: 340 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Pharmacy name</label>
          <input value={form.pharmacyName} onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Currency symbol</label>
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Tax rate (%)</label>
          <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
        </div>
        <button disabled={!dirty} onClick={() => saveSettings(form)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: dirty ? 'var(--pine)' : '#B9C4B4', color: '#fff', fontWeight: 600 }}>Save changes</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* App root — auth + live sync                                            */
/* ---------------------------------------------------------------------- */

function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [lastSynced, setLastSynced] = useState('just now');
  const pollRef = useRef(null);
  const sessionRestored = useRef(false);

  const loadAll = useCallback(async () => {
    // Create a promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    );

    try {
      // Race the actual loading against the timeout
      const [inv, sls, stf, cfg] = await Promise.race([
        Promise.all([
          getOrInit('inventory', DEFAULT_INVENTORY),
          getOrInit('sales', []),
          getOrInit('staff', DEFAULT_STAFF),
          getOrInit('settings', DEFAULT_SETTINGS),
        ]),
        timeoutPromise
      ]);

      setInventory(inv); setSales(sls); setStaffList(stf); setSettings(cfg);
      setLastSynced(new Date().toLocaleTimeString());
      setReady(true);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Even if loading fails, set ready to true so the app Doesn't remain stuck
      // Users can still use the app with default data, and data will sync when connection is restored
      setInventory(DEFAULT_INVENTORY);
      setSales([]);
      setStaffList(DEFAULT_STAFF);
      setSettings(DEFAULT_SETTINGS);
      setLastSynced(new Date().toLocaleTimeString());
      setReady(true); // Critical: always set ready to true to avoid permanent loading state
    }
  }, []);

  useEffect(() => {
    loadAll();

    // Instant sync: any device that writes to kv_store pushes an update here.
    const channel = supabase
      .channel('kv_store_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store' }, () => {
        loadAll();
      })
      .subscribe();

    // Slow fallback poll in case realtime is unavailable (e.g. not enabled on the table).
    pollRef.current = setInterval(loadAll, 15000);

    return () => {
      clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  // Session persistence: keep the cashier/admin logged in across a page
  // refresh by remembering their staff id in this browser only.
  useEffect(() => {
    if (!ready || sessionRestored.current) return;
    sessionRestored.current = true;
    const savedId = localStorage.getItem(SESSION_KEY);
    if (!savedId) return;
    const match = staffList.find((s) => s.id === savedId);
    if (match) {
      setUser(match);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [ready, staffList]);

  const handleLogin = (staffMember) => {
    setUser(staffMember);
    localStorage.setItem(SESSION_KEY, staffMember.id);
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const saveInventory = async (next) => {
    setInventory(next);
    await saveShared('inventory', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const saveStaffList = async (next) => {
    setStaffList(next);
    await saveShared('staff', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const saveSettingsFn = async (next) => {
    setSettings(next);
    await saveShared('settings', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const addSale = async (sale) => {
    const next = [...sales, sale];
    setSales(next);
    await saveShared('sales', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const updateStock = async (items) => {
    const next = inventory.map((p) => {
      const sold = items.find((i) => i.id === p.id);
      return sold ? { ...p, stock: Math.max(0, p.stock - sold.qty) } : p;
    });
    setInventory(next);
    await saveShared('inventory', next);
  };

  if (!ready) {
    return (
      <div className="pos-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{STYLES}</style>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading pharmacy data…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen staffList={staffList} settings={settings} onLogin={handleLogin} />;
  }

  if (user.role === 'admin') {
    return (
      <AdminConsole inventory={inventory} sales={sales} staffList={staffList} settings={settings}
        user={user} onLogout={handleLogout} lastSynced={lastSynced}
        saveInventory={saveInventory} saveStaff={saveStaffList} saveSettings={saveSettingsFn} />
    );
  }

  return (
    <StaffPOS inventory={inventory} settings={settings} user={user}
      addSale={addSale} updateStock={updateStock} lastSynced={lastSynced} onLogout={handleLogout} />
  );
}

/* ---------------------------------------------------------------------- */
/* Mount                                                                  */
/* ---------------------------------------------------------------------- */

function ConfigMissing() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', padding: 24, background: '#EEF1EA'
    }}>
      <div style={{ maxWidth: 460, background: '#FBF9F3', border: '1px solid #D9DFD4', borderRadius: 14, padding: 28 }}>
        <h1 style={{ fontSize: 18, marginBottom: 10 }}>Almost there</h1>
        <p style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>
          {configCheck.reason} See <code>SETUP-GUIDE.md</code> for exact steps.
        </p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(configReady ? <App /> : <ConfigMissing />);
