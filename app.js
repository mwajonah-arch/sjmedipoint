import React, { useState, useEffect, useRef, useCallback, useMemo } from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18/client';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, LogOut, Package, TrendingUp,
  AlertTriangle, Users, Settings as SettingsIcon, Receipt, CheckCircle, X,
  Pill, Edit2, ChevronRight, Banknote, CreditCard, Smartphone, LayoutDashboard,
  ClipboardList, Info, ScanLine
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
  { id: 'p1', name: 'Paracetamol 500mg', category: 'Pain Relief', sku: 'PCM-500', barcode: '6161100000017', price: 50, stock: 200, reorderLevel: 30, expiry: '2027-03-01', requiresRx: false },
  { id: 'p2', name: 'Ibuprofen 400mg', category: 'Pain Relief', sku: 'IBU-400', barcode: '6161100000024', price: 80, stock: 150, reorderLevel: 25, expiry: '2026-11-15', requiresRx: false },
  { id: 'p3', name: 'Amoxicillin 500mg', category: 'Antibiotics', sku: 'AMX-500', barcode: '6161100000031', price: 250, stock: 60, reorderLevel: 20, expiry: '2026-09-10', requiresRx: true },
  { id: 'p4', name: 'Metformin 500mg', category: 'Diabetes', sku: 'MET-500', barcode: '6161100000048', price: 180, stock: 40, reorderLevel: 15, expiry: '2027-01-20', requiresRx: true },
  { id: 'p5', name: 'Amlodipine 5mg', category: 'Cardiovascular', sku: 'AML-5', barcode: '6161100000055', price: 220, stock: 8, reorderLevel: 10, expiry: '2026-12-05', requiresRx: true },
  { id: 'p6', name: 'Cetirizine 10mg', category: 'Allergy', sku: 'CET-10', barcode: '6161100000062', price: 90, stock: 100, reorderLevel: 20, expiry: '2027-05-01', requiresRx: false },
  { id: 'p7', name: 'Omeprazole 20mg', category: 'Digestive', sku: 'OMP-20', barcode: '6161100000079', price: 150, stock: 55, reorderLevel: 15, expiry: '2026-10-18', requiresRx: true },
  { id: 'p8', name: 'ORS Sachets', category: 'First Aid', sku: 'ORS-01', barcode: '6161100000086', price: 40, stock: 300, reorderLevel: 50, expiry: '2027-08-01', requiresRx: false },
  { id: 'p9', name: 'Vitamin C 1000mg', category: 'Vitamins', sku: 'VITC-1000', barcode: '6161100000093', price: 350, stock: 70, reorderLevel: 15, expiry: '2027-02-14', requiresRx: false },
  { id: 'p10', name: 'Cough Syrup 100ml', category: 'Respiratory', sku: 'CGH-100', barcode: '6161100000109', price: 280, stock: 45, reorderLevel: 10, expiry: '2026-08-30', requiresRx: false },
  { id: 'p11', name: 'Elastic Bandage', category: 'First Aid', sku: 'BND-01', barcode: '6161100000116', price: 120, stock: 80, reorderLevel: 15, expiry: '2028-01-01', requiresRx: false },
  { id: 'p12', name: 'Hand Sanitizer 250ml', category: 'Hygiene', sku: 'SNT-250', barcode: '6161100000123', price: 200, stock: 90, reorderLevel: 20, expiry: '2028-06-01', requiresRx: false },
  { id: 'p13', name: 'Multivitamin Syrup (Kids)', category: 'Vitamins', sku: 'MVK-100', barcode: '6161100000130', price: 320, stock: 6, reorderLevel: 10, expiry: '2026-09-05', requiresRx: false },
];

const DEFAULT_STAFF = [
  { id: 's1', name: 'Admin', role: 'admin' },
  { id: 's2', name: 'Grace Wanjiru', role: 'staff', canManageInventory: false },
  { id: 's3', name: 'Kevin Otieno', role: 'staff', canManageInventory: false },
];

const DEFAULT_SETTINGS = { pharmacyName: 'Amani Pharmacy', currency: 'KSh', taxRate: 16, sessionTimeoutMinutes: 5 };

const EXPIRY_WINDOW_DAYS = 30;

// Whole days between today and a product's expiry date. Negative means
// already expired. Returns null when there's no expiry date on file.
function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function expiryLabel(days) {
  if (days === null) return '';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `Expires in ${days}d`;
}

/* ---------------------------------------------------------------------- */
/* Storage helpers — backed by Supabase, shared across every device       */
/*                                                                        */
/* Every key also mirrors into localStorage on this device. If a save     */
/* can't reach Supabase (no signal / wifi down), the change still applies */
/* immediately on screen and is marked "dirty" locally. Dirty keys are    */
/* retried automatically — on a timer, and the moment the browser         */
/* reports it's back online — until they successfully sync.               */
/* ---------------------------------------------------------------------- */

const STORE_KEYS = ['inventory', 'sales', 'staff', 'settings', 'inventoryLog'];
const CACHE_PREFIX = 'pos_cache_';
const DIRTY_PREFIX = 'pos_dirty_';

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw === null ? null : JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('local cache write failed for', key, e);
  }
}

function markDirty(key) {
  try { localStorage.setItem(DIRTY_PREFIX + key, '1'); } catch (e) { /* ignore */ }
}
function clearDirty(key) {
  try { localStorage.removeItem(DIRTY_PREFIX + key); } catch (e) { /* ignore */ }
}
function isDirty(key) {
  try { return localStorage.getItem(DIRTY_PREFIX + key) === '1'; } catch (e) { return false; }
}
function getDirtyKeys() {
  return STORE_KEYS.filter(isDirty);
}

async function getOrInit(key, defaultValue) {
  // Trust the local copy while it has unsynced changes — a server read
  // right now would just be stale and would clobber what's on screen.
  if (isDirty(key)) {
    const cached = readCache(key);
    if (cached !== null) return cached;
  }
  try {
    const { data, error } = await supabase.from('kv_store').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    if (!data) {
      await saveShared(key, defaultValue);
      return defaultValue;
    }
    writeCache(key, data.value);
    return data.value;
  } catch (e) {
    const cached = readCache(key);
    if (cached !== null) return cached;
    return defaultValue;
  }
}

async function saveShared(key, value) {
  // Always cache locally first so the UI and any offline session reflect
  // the change immediately, regardless of what the network does.
  writeCache(key, value);
  try {
    const { error } = await supabase.from('kv_store').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    clearDirty(key);
    return true;
  } catch (e) {
    markDirty(key);
    return false;
  }
}

// Attempt to push any keys that failed to sync earlier. Safe to call often —
// it's a no-op when nothing is dirty.
async function flushDirtyKeys() {
  for (const key of getDirtyKeys()) {
    const cached = readCache(key);
    if (cached !== null) await saveShared(key, cached);
  }
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

// Exact-match lookup used by both the scanner-gun (keyboard wedge) flow and
// the camera scanner — matches on the printed barcode first, falling back
// to the internal SKU, since some scanned stock may only have one or the
// other on file.
function findProductByCode(inventory, code) {
  const c = (code || '').trim().toLowerCase();
  if (!c) return null;
  return inventory.find((p) => (p.barcode && p.barcode.trim().toLowerCase() === c) || (p.sku && p.sku.trim().toLowerCase() === c)) || null;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

// Downloads the given sales as a CSV file — used for accounting / KRA
// records, since sales otherwise only ever live inside the app.
function exportSalesCsv(salesList, settings) {
  const header = ['Date/Time', 'Sale ID', 'Cashier', 'Payment Method', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Status'];
  const rows = salesList.map((s) => [
    new Date(s.timestamp).toLocaleString(),
    s.id,
    s.cashier,
    s.paymentMethod + (s.paymentMethod === 'account' ? (s.settled ? ' (settled)' : ' (unpaid)') : ''),
    s.customerName || '',
    s.items.map((i) => `${i.qty} x ${i.name}`).join('; '),
    Number(s.subtotal).toFixed(2),
    Number(s.tax).toFixed(2),
    Number(s.total).toFixed(2),
    s.voided ? `Voided${s.voidReason ? ': ' + s.voidReason : ''}` : 'Completed',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

@keyframes pos-spin { to { transform: rotate(360deg); } }

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
.pos-modal-backdrop { position: fixed; inset: 0; background: rgba(22,66,60,0.35); display: flex; align-items: center; justify-content: center; z-index: 90; padding: 16px; }
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

function LoginScreen({ settings, onLogin, notice }) {
  const [tab, setTab] = useState('staff');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // PIN checking happens server-side now — the browser never holds
      // the full staff/PIN list, so there's nothing here to inspect.
      const { data, error: fnError } = await supabase.functions.invoke('staff-login', { body: { pin, role: tab } });
      if (fnError || !data || data.error || !data.user) {
        setError((data && data.error) || (fnError && fnError.message) || 'Incorrect PIN for this login type.');
        setPin('');
        inputRef.current?.focus();
        return;
      }
      onLogin(data.user);
    } catch (err) {
      setError('Could not reach the login service. Check your connection.');
    } finally {
      setLoading(false);
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

        {notice && (
          <div style={{ background: 'var(--amber-pale)', color: '#5C3A12', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 16, textAlign: 'left' }}>
            {notice}
          </div>
        )}

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

          <button type="submit" disabled={!pin || loading} style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600,
            background: pin && !loading ? 'var(--pine)' : '#B9C4B4', color: '#fff'
          }}>{loading ? 'Checking…' : 'Log in'}</button>
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

function StaffPOS({ inventory, sales, settings, user, addSale, updateStock, lastSynced, onLogout, saveInventory, logInventoryChange, voidSale }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [drugInfoProduct, setDrugInfoProduct] = useState(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFlash, setScanFlash] = useState(null);
  const scanFlashTimer = useRef(null);

  const myTodaySales = sales.filter((s) => s.cashier === user.name && isSameDay(s.timestamp, new Date()) && !s.voided);
  const myTodayRevenue = myTodaySales.reduce((sum, s) => sum + s.total, 0);

  const categories = ['All', ...Array.from(new Set(inventory.map((p) => p.category)))];

  useEffect(() => () => clearTimeout(scanFlashTimer.current), []);

  const filtered = inventory.filter((p) => {
    const q = query.toLowerCase();
    const matchQ = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q);
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

  // Handles a scanned code from either source: a USB/Bluetooth scanner gun
  // (which types into the search box and sends Enter) or the camera
  // scanner modal. Shows a brief flash so the cashier gets feedback
  // without looking away from the basket they're scanning into.
  const flashScan = (type, text) => {
    setScanFlash({ type, text });
    clearTimeout(scanFlashTimer.current);
    scanFlashTimer.current = setTimeout(() => setScanFlash(null), 2200);
  };

  const handleScanCode = (code) => {
    const match = findProductByCode(inventory, code);
    if (!match) {
      flashScan('error', `No product matches "${code}"`);
      return;
    }
    if (match.stock <= 0) {
      flashScan('error', `${match.name} is out of stock`);
      return;
    }
    addToCart(match);
    flashScan('success', `Added ${match.name}`);
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
      mpesaReceipt: payment.mpesaReceipt || null,
      customerName: payment.customerName || null,
      customerPhone: payment.customerPhone || null,
      settled: payment.method !== 'account',
      voided: false,
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
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const code = query.trim();
                  if (!code) return;
                  const exact = findProductByCode(inventory, code);
                  if (exact) {
                    e.preventDefault();
                    handleScanCode(code);
                    setQuery('');
                  }
                }}
                placeholder="Search, or scan with a barcode gun"
                style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14 }}
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 14 }}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setScannerOpen(true)} title="Scan with camera" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: '#fff', color: 'var(--pine)', fontSize: 13, fontWeight: 600
            }}>
              <ScanLine size={15} /> Scan
            </button>
            {user.canManageInventory && (
              <button onClick={() => setInventoryOpen(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontSize: 13
              }}>
                <Package size={15} color="var(--pine)" />
                Manage Inventory
              </button>
            )}
            <button onClick={() => setSummaryOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', fontSize: 13
            }}>
              <TrendingUp size={15} color="var(--pine)" />
              <span style={{ fontWeight: 600 }} className="pos-mono">{formatMoney(myTodayRevenue, settings.currency)}</span>
              <span style={{ color: 'var(--muted)' }}>today</span>
            </button>
          </div>

          <div className="pos-product-grid">
            {filtered.map((p) => {
              const low = p.stock <= p.reorderLevel;
              const out = p.stock <= 0;
              const expDays = daysUntilExpiry(p.expiry);
              const expiringSoon = expDays !== null && expDays <= EXPIRY_WINDOW_DAYS;
              return (
                <div key={p.id} onClick={() => !out && addToCart(p)} role="button" tabIndex={0} style={{
                  textAlign: 'left', background: 'var(--paper)', border: '1px dashed var(--border)',
                  borderRadius: 10, padding: '14px 14px 12px', position: 'relative',
                  opacity: out ? 0.5 : 1, cursor: out ? 'not-allowed' : 'pointer'
                }}>
                  <button onClick={(e) => { e.stopPropagation(); setDrugInfoProduct(p); }} title="AI dosage / side effects / interactions lookup" style={{
                    position: 'absolute', top: 8, left: 8, background: 'none', border: 'none', color: 'var(--muted)', padding: 4
                  }}><Info size={14} /></button>
                  {p.requiresRx && (
                    <span style={{
                      position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700,
                      color: 'var(--amber)', border: '1px solid var(--amber)', borderRadius: 5,
                      padding: '1px 5px', transform: 'rotate(4deg)'
                    }}>℞ Rx</span>
                  )}
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 4, marginLeft: 18 }}>{p.category}</div>
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
                  {expiringSoon && (
                    <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 600, color: expDays < 0 ? 'var(--red)' : 'var(--amber)' }}>
                      {expiryLabel(expDays)}
                    </div>
                  )}
                </div>

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
            <button onClick={() => { setCheckoutOpen(true); setCartOpen(false); }} disabled={cart.length === 0} style={{
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
      {summaryOpen && <CashierSummaryModal sales={sales} settings={settings} user={user} onClose={() => setSummaryOpen(false)} voidSale={voidSale} />}
      {scannerOpen && (
        <BarcodeScannerModal continuous
          subtitle="Point the camera at a product barcode. Keep scanning to add more items to the cart."
          onDetect={handleScanCode} onClose={() => setScannerOpen(false)} />
      )}
      {scanFlash && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          background: scanFlash.type === 'success' ? 'var(--pine)' : 'var(--red)', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,.18)'
        }}>
          {scanFlash.text}
        </div>
      )}
      {drugInfoProduct && <DrugInfoModal product={drugInfoProduct} onClose={() => setDrugInfoProduct(null)} />}
      {inventoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 95, overflow: 'auto', padding: 20 }} className="pos-scroll">
          <button onClick={() => setInventoryOpen(false)} style={{ marginBottom: 16, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to sales
          </button>
          <InventoryTab inventory={inventory} settings={settings} saveInventory={saveInventory} user={user} logInventoryChange={logInventoryChange} />
        </div>
      )}
    </div>
  );
}

const PAYMENT_METHOD_META = {
  cash: { label: 'Cash', Icon: Banknote },
  card: { label: 'Card', Icon: CreditCard },
  mpesa: { label: 'M-Pesa', Icon: Smartphone },
  account: { label: 'On account', Icon: Users },
};

// Simple, dependency-free bar breakdown — reused by the cashier's daily
// summary and the admin dashboard.
function PaymentMethodBars({ sales, settings }) {
  const totals = Object.keys(PAYMENT_METHOD_META).map((method) => {
    const matching = sales.filter((s) => s.paymentMethod === method);
    return { method, total: matching.reduce((sum, s) => sum + s.total, 0), count: matching.length };
  });
  const max = Math.max(1, ...totals.map((t) => t.total));

  if (sales.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--muted)' }}>No sales yet.</p>;
  }

  return (
    <div>
      {totals.map((t) => {
        const { label, Icon } = PAYMENT_METHOD_META[t.method];
        return (
          <div key={t.method} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}><Icon size={13} />{label}</span>
              <span className="pos-mono">{formatMoney(t.total, settings.currency)} · {t.count}</span>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${(t.total / max) * 100}%`, height: '100%', background: 'var(--pine)', borderRadius: 6, transition: 'width .2s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CashierSummaryModal({ sales, settings, user, onClose, voidSale }) {
  const today = new Date();
  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);

  const allMySales = sales
    .filter((s) => s.cashier === user.name && isSameDay(s.timestamp, today))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const activeMySales = allMySales.filter((s) => !s.voided);
  const revenue = activeMySales.reduce((sum, s) => sum + s.total, 0);

  const confirmVoid = async (id) => {
    if (!voidSale) return;
    setBusy(true);
    await voidSale(id, voidReason.trim());
    setBusy(false);
    setVoidingId(null);
    setVoidReason('');
  };

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>Your day so far</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, background: 'var(--pine-pale)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Sales rung up</div>
            <div className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>{activeMySales.length}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--pine-pale)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Total revenue</div>
            <div className="pos-mono" style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(revenue, settings.currency)}</div>
          </div>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>By payment method</h3>
        <PaymentMethodBars sales={activeMySales} settings={settings} />

        {allMySales.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 10px' }}>Today's sales</h3>
            {allMySales.map((s) => (
              <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>
                    {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {s.items.length} item{s.items.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="pos-mono" style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>{formatMoney(s.total, settings.currency)}</span>
                    {s.voided ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-pale)', padding: '2px 6px', borderRadius: 5 }}>Voided</span>
                    ) : voidSale && (
                      <button onClick={() => { setVoidingId(voidingId === s.id ? null : s.id); setVoidReason(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, textDecoration: 'underline' }}>
                        Void
                      </button>
                    )}
                  </span>
                </div>
                {voidingId === s.id && (
                  <div style={{ marginTop: 8, padding: 10, background: 'var(--red-pale)', borderRadius: 8 }}>
                    <label style={{ fontSize: 11, color: '#7A2530' }}>Reason for reversing this sale</label>
                    <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. wrong item rung up"
                      style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, marginTop: 4, marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={busy} onClick={() => confirmVoid(s.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
                        {busy ? 'Voiding…' : 'Confirm void'}
                      </button>
                      <button onClick={() => setVoidingId(null)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// AI-assisted pharmacology reference lookup. Results are cached in this
// browser (drug info rarely changes) to avoid repeat API calls/cost, but
// always shown with a disclaimer — this is a reference aid, not a
// substitute for the product's package insert or a pharmacist's judgment.
function DrugInfoModal({ product, onClose }) {
  const [state, setState] = useState('loading'); // loading | done | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const cacheKey = 'pos_drug_info_' + product.name.toLowerCase().trim();

  useEffect(() => {
    let cancelled = false;

    const cached = readCache(cacheKey);
    if (cached) {
      setInfo(cached);
      setState('done');
      return;
    }

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('drug-info', { body: { drugName: product.name } });
        if (cancelled) return;
        if (fnError || !data || data.error) {
          setError((data && data.error) || (fnError && fnError.message) || 'Could not fetch drug information.');
          setState('error');
          return;
        }
        setInfo(data);
        writeCache(cacheKey, data);
        setState('done');
      } catch (e) {
        if (!cancelled) { setError('Could not reach the AI lookup service.'); setState('error'); }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.name]);

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{value}</div>
    </div>
  );

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span className="pos-serif" style={{ fontSize: 18, fontWeight: 700 }}>{product.name}{product.requiresRx ? ' ℞' : ''}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>AI-generated reference · not medical advice</div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 30, height: 30, margin: '0 auto 10px', border: '3px solid var(--pine-pale)', borderTopColor: 'var(--pine)', borderRadius: '50%', animation: 'pos-spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Looking this up…</p>
          </div>
        )}

        {state === 'error' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 4 }}>{error}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Check the product's package insert, or ask the pharmacist-in-charge.</p>
          </div>
        )}

        {state === 'done' && info && (
          <>
            {info.notARealDrug && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontStyle: 'italic' }}>This doesn't look like a medicine — showing what I could find anyway.</p>
            )}
            <Field label="Typical dosage" value={info.dosage} />
            <Field label="Common side effects" value={info.sideEffects} />
            <Field label="Interactions" value={info.interactions} />
            <Field label="Other considerations" value={info.considerations} />
            <div style={{ marginTop: 4, padding: 10, background: 'var(--amber-pale)', borderRadius: 8, fontSize: 11.5, color: '#5C3A12', lineHeight: 1.4 }}>
              This is AI-generated reference information, not a clinical decision. Always verify against the product's official package insert, a current formulary, or the pharmacist-in-charge before advising a customer or dispensing.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Camera-based barcode scanner. Loads the decoding library on demand (no
// point shipping it to every visit) and falls back to a plain text field
// if the camera can't start — no camera, permission denied, or the library
// fails to load shouldn't be a dead end.
//
// Pass `continuous` to keep the modal open and scanning after each hit
// (checkout: scan several items in a row); omit it for a single-shot
// capture that closes itself (e.g. filling in a product's barcode field).
function BarcodeScannerModal({ onDetect, onClose, continuous, subtitle }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const lastSeenRef = useRef({ code: '', at: 0 });
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [lastDetected, setLastDetected] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('https://esm.sh/@zxing/browser@0.1.5');
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (!result) return;
          const code = result.getText();
          const now = Date.now();
          // Ignore the same code re-firing while it's still in frame.
          if (lastSeenRef.current.code === code && now - lastSeenRef.current.at < 2000) return;
          lastSeenRef.current = { code, at: now };
          setLastDetected(code);
          onDetect(code);
        });
        if (cancelled) { try { controls.stop(); } catch (e) {} return; }
        controlsRef.current = controls;
        setStatus('scanning');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(err && err.name === 'NotAllowedError' ? 'Camera access was denied.' : "Couldn't start the camera scanner on this device.");
      }
    })();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    setLastDetected(code);
    onDetect(code);
    setManualCode('');
  };

  return (
    <div className="pos-modal-backdrop">
      <div style={{ width: 380, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="pos-serif" style={{ fontSize: 16, fontWeight: 700 }}>Scan barcode</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={18} /></button>
        </div>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4, marginBottom: 12 }}>{subtitle}</p>}

        {status !== 'error' && (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
            <video ref={videoRef} style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }} muted playsInline />
            {status === 'starting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>
                Starting camera…
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div style={{ background: 'var(--amber-pale)', color: '#5C3A12', borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 12 }}>
            {errorMsg} You can still type the code below — or use a USB/Bluetooth scanner gun, which works straight into the search box.
          </div>
        )}

        {lastDetected && (
          <div style={{ fontSize: 12, color: 'var(--pine)', marginBottom: 10 }}>Last scanned: <span className="pos-mono">{lastDetected}</span></div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            placeholder="Or type the code" style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
          <button onClick={submitManual} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: 'var(--pine)', color: '#fff', fontSize: 13, fontWeight: 600 }}>Use</button>
        </div>

        {continuous && (
          <button onClick={onClose} style={{ width: '100%', marginTop: 14, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600 }}>
            Done scanning
          </button>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ cart, subtotal, tax, total, settings, onClose, onComplete }) {
  const [method, setMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [rxConfirmed, setRxConfirmed] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState('idle'); // idle | sending | waiting | success | failed | timeout
  const [mpesaError, setMpesaError] = useState('');
  const [mpesaReceipt, setMpesaReceipt] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const pollTimer = useRef(null);
  const needsRx = cart.some((i) => i.requiresRx);
  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === 'cash' ? Math.max(0, tenderedNum - total) : 0;
  const canComplete = (!needsRx || rxConfirmed) && (method !== 'cash' || tenderedNum >= total) && (method !== 'account' || customerName.trim().length > 0);

  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  // Once M-Pesa confirms payment, finish the sale automatically.
  useEffect(() => {
    if (method === 'mpesa' && mpesaStatus === 'success') {
      onComplete({ method: 'mpesa', tendered: total, change: 0, mpesaReceipt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpesaStatus]);

  const watchMpesaStatus = (checkoutRequestId) => {
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await supabase.from('mpesa_transactions')
          .select('status, mpesa_receipt, result_desc')
          .eq('checkout_request_id', checkoutRequestId)
          .maybeSingle();
        if (data && data.status !== 'pending') {
          clearInterval(pollTimer.current);
          if (data.status === 'success') {
            setMpesaReceipt(data.mpesa_receipt);
            setMpesaStatus('success');
          } else {
            setMpesaError(data.result_desc || 'The customer did not complete the payment.');
            setMpesaStatus('failed');
          }
          return;
        }
      } catch (e) { /* keep polling */ }
      if (attempts >= 30) { // ~60 seconds
        clearInterval(pollTimer.current);
        setMpesaStatus((s) => (s === 'waiting' ? 'timeout' : s));
      }
    }, 2000);
  };

  const sendMpesaRequest = async () => {
    setMpesaError('');
    setMpesaStatus('sending');
    const saleRef = 'POS' + Date.now().toString().slice(-8);
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: { phone: mpesaPhone, amount: total, saleRef },
      });
      if (error || !data || data.error) {
        setMpesaStatus('failed');
        setMpesaError((data && data.error) || (error && error.message) || 'Could not send the payment request.');
        return;
      }
      setMpesaStatus('waiting');
      watchMpesaStatus(data.checkoutRequestId);
    } catch (e) {
      setMpesaStatus('failed');
      setMpesaError('Could not reach the payment service. Check your connection and try again.');
    }
  };

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

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'cash', label: 'Cash', Icon: Banknote },
            { key: 'card', label: 'Card', Icon: CreditCard },
            { key: 'mpesa', label: 'M-Pesa', Icon: Smartphone },
            { key: 'account', label: 'On account', Icon: Users },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setMethod(key)} style={{
              flex: '1 1 70px', padding: '10px 0', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
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

        {method === 'account' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Customer name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Wanjiku Kamau"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4, marginBottom: 10 }} />
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Phone (optional)</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>This sale will be recorded as unpaid on the customer's account until it's settled from the Accounts tab.</p>
          </div>
        )}

        {method === 'mpesa' && (
          <div style={{ marginBottom: 16 }}>
            {(mpesaStatus === 'idle' || mpesaStatus === 'sending' || mpesaStatus === 'failed') && (
              <>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Customer's M-Pesa number</label>
                <input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginTop: 4 }} />
                {mpesaError && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{mpesaError}</p>}
                <button type="button" onClick={sendMpesaRequest}
                  disabled={!mpesaPhone || mpesaStatus === 'sending' || (needsRx && !rxConfirmed)}
                  style={{
                    marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 8,
                    border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontWeight: 600, fontSize: 14,
                    opacity: (!mpesaPhone || mpesaStatus === 'sending' || (needsRx && !rxConfirmed)) ? 0.5 : 1
                  }}>
                  {mpesaStatus === 'sending' ? 'Sending request…' : mpesaError ? 'Try again' : 'Send payment request'}
                </button>
              </>
            )}
            {(mpesaStatus === 'waiting' || mpesaStatus === 'timeout') && (
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div style={{ width: 34, height: 34, margin: '0 auto 10px', border: '3px solid var(--pine-pale)', borderTopColor: 'var(--pine)', borderRadius: '50%', animation: 'pos-spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  {mpesaStatus === 'timeout' ? 'Still waiting — ask the customer to check their phone.' : `A prompt was sent to ${mpesaPhone}.`}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Ask them to enter their M-Pesa PIN to complete the payment.</p>
                {mpesaStatus === 'timeout' && (
                  <button type="button" onClick={sendMpesaRequest} style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--pine)', background: '#fff', color: 'var(--pine)', fontSize: 13 }}>
                    Resend request
                  </button>
                )}
              </div>
            )}
            {mpesaStatus === 'success' && (
              <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--pine)' }}>
                <CheckCircle size={24} style={{ marginBottom: 6 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>Payment received{mpesaReceipt ? ` — ${mpesaReceipt}` : ''}</p>
              </div>
            )}
          </div>
        )}

        {needsRx && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, marginBottom: 16, padding: 10, background: 'var(--amber-pale)', borderRadius: 8, color: '#5C3A12' }}>
            <input type="checkbox" checked={rxConfirmed} onChange={(e) => setRxConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
            I have verified a valid prescription for the item(s) marked ℞.
          </label>
        )}

        {method !== 'mpesa' && (
          <button onClick={() => onComplete({
            method, tendered: method === 'cash' ? tenderedNum : total, change,
            customerName: method === 'account' ? customerName.trim() : undefined,
            customerPhone: method === 'account' ? customerPhone.trim() : undefined,
          })} disabled={!canComplete} style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 15,
            background: canComplete ? 'var(--pine)' : '#B9C4B4', color: '#fff'
          }}>Confirm payment</button>
        )}
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
        {sale.paymentMethod === 'mpesa' && sale.mpesaReceipt && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>M-Pesa receipt</span><span>{sale.mpesaReceipt}</span></div>
        )}
        {sale.paymentMethod === 'account' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Customer</span><span>{sale.customerName}{sale.customerPhone ? ` (${sale.customerPhone})` : ''}</span></div>
            <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--amber)', marginTop: 8 }}>UNPAID — on account</div>
          </>
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
  saveInventory, saveStaff, saveSettings, inventoryLog, logInventoryChange, voidSale, settleAccountSale }) {
  const [tab, setTab] = useState('dashboard');
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { key: 'analytics', label: 'Analytics', Icon: TrendingUp },
    { key: 'inventory', label: 'Inventory', Icon: Package },
    { key: 'activity', label: 'Activity', Icon: Receipt },
    { key: 'sales', label: 'Sales history', Icon: ClipboardList },
    { key: 'accounts', label: 'Accounts', Icon: CreditCard },
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
          {tab === 'analytics' && <AnalyticsTab inventory={inventory} sales={sales} settings={settings} />}
          {tab === 'inventory' && <InventoryTab inventory={inventory} settings={settings} saveInventory={saveInventory} user={user} logInventoryChange={logInventoryChange} />}
          {tab === 'activity' && <ActivityTab inventoryLog={inventoryLog} />}
          {tab === 'sales' && <SalesTab sales={sales} settings={settings} voidSale={voidSale} />}
          {tab === 'accounts' && <AccountsTab sales={sales} settings={settings} settleAccountSale={settleAccountSale} />}
          {tab === 'staff' && <StaffTab staffList={staffList} saveStaff={saveStaff} />}
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

// Interactive 7-day revenue chart — tap/click a day to see its totals.
// Plain divs sized by percentage, no charting library needed.
function RevenueTrend({ sales, settings }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const daySales = sales.filter((s) => isSameDay(s.timestamp, d) && !s.voided);
      arr.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dateLabel: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        revenue: daySales.reduce((sum, s) => sum + s.total, 0),
        count: daySales.length,
      });
    }
    return arr;
  }, [sales]);

  const [selected, setSelected] = useState(6); // default to today
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const sel = days[selected];

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600 }}>Last 7 days</h3>
        <div style={{ textAlign: 'right' }}>
          <div className="pos-mono" style={{ fontSize: 17, fontWeight: 700 }}>{formatMoney(sel.revenue, settings.currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sel.count} sale{sel.count !== 1 ? 's' : ''} · {sel.dateLabel}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
        {days.map((d, i) => (
          <button key={i} onClick={() => setSelected(i)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', height: '100%', justifyContent: 'flex-end', padding: 0
          }}>
            <div style={{
              width: '100%', maxWidth: 30, borderRadius: 4,
              height: `${Math.max(4, (d.revenue / max) * 66)}px`,
              background: i === selected ? 'var(--pine)' : 'var(--pine-pale)',
              transition: 'background .15s, height .2s'
            }} />
            <span style={{ fontSize: 10, color: i === selected ? 'var(--pine)' : 'var(--muted)', fontWeight: i === selected ? 700 : 500 }}>{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardTab({ inventory, sales, settings }) {
  const today = new Date();
  const todaySales = sales.filter((s) => isSameDay(s.timestamp, today) && !s.voided);
  const revenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const lowStock = inventory.filter((p) => p.stock <= p.reorderLevel);
  const expiringSoon = inventory
    .filter((p) => p.stock > 0 && daysUntilExpiry(p.expiry) !== null && daysUntilExpiry(p.expiry) <= EXPIRY_WINDOW_DAYS)
    .sort((a, b) => daysUntilExpiry(a.expiry) - daysUntilExpiry(b.expiry));
  const recent = [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Today at a glance</h2>
      <div className="pos-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Revenue today" value={formatMoney(revenue, settings.currency)} />
        <StatCard label="Transactions today" value={todaySales.length} />
        <StatCard label="Products tracked" value={inventory.length} />
        <StatCard label="Low stock alerts" value={lowStock.length} accent={lowStock.length ? 'var(--red)' : undefined} />
        <StatCard label="Expiring within 30d" value={expiringSoon.length} accent={expiringSoon.length ? 'var(--red)' : undefined} />
      </div>

      <div className="pos-dash-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <RevenueTrend sales={sales} settings={settings} />
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Today's payments</h3>
          <PaymentMethodBars sales={todaySales} settings={settings} />
        </div>
      </div>

      <div className="pos-dash-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
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
            <AlertTriangle size={15} color="var(--red)" /> Expiring within 30 days
          </h3>
          {expiringSoon.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nothing in stock is close to expiry.</p>}
          {expiringSoon.map((p) => {
            const days = daysUntilExpiry(p.expiry);
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{p.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({p.stock} in stock)</span></span>
                <span className="pos-mono" style={{ color: days < 0 ? 'var(--red)' : 'var(--amber)' }}>{expiryLabel(days)}</span>
              </div>
            );
          })}
        </div>
        <div>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Receipt size={15} /> Recent transactions
          </h3>
          {recent.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No sales recorded yet.</p>}
          {recent.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>{s.cashier} · {new Date(s.timestamp).toLocaleTimeString()}</span>
              <span className="pos-mono" style={{ color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>{s.voided ? 'Voided' : formatMoney(s.total, settings.currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Advanced analytics                                                     */
/* ---------------------------------------------------------------------- */

const ANALYTICS_PERIODS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '180 days' },
  { days: 365, label: '365 days' },
];

// Aggregates completed (non-voided) sales from the last `periodDays` into
// per-product totals — units sold, revenue, and an estimated cost of goods
// sold. Cost is based on each product's *current* cost price, since sale
// records only ever stored the selling price, not what it cost at the time
// — close enough for trend analysis, but not a substitute for real
// landed-cost accounting. Every product in inventory is included even with
// zero sales, so dead stock is visible everywhere it should be.
function buildProductSalesStats(inventory, sales, periodDays) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);

  const stats = new Map();
  inventory.forEach((p) => {
    stats.set(p.id, { product: p, unitsSold: 0, revenue: 0, cost: 0 });
  });

  sales.forEach((s) => {
    if (s.voided || new Date(s.timestamp) < cutoff) return;
    (s.items || []).forEach((item) => {
      let entry = stats.get(item.id);
      if (!entry) {
        // Product has since been deleted from inventory — still counts
        // toward historical revenue, it just has no live stock to compare.
        entry = { product: { id: item.id, name: item.name, category: 'Discontinued', costPrice: 0, stock: 0, reorderLevel: 0 }, unitsSold: 0, revenue: 0, cost: 0 };
        stats.set(item.id, entry);
      }
      entry.unitsSold += item.qty;
      entry.revenue += item.price * item.qty;
      entry.cost += (Number(entry.product.costPrice) || 0) * item.qty;
    });
  });

  return Array.from(stats.values());
}

function PeriodPicker({ periodDays, setPeriodDays }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
      {ANALYTICS_PERIODS.map((p) => (
        <button key={p.days} onClick={() => setPeriodDays(p.days)} style={{
          padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: '1px solid var(--border)', background: periodDays === p.days ? 'var(--pine)' : '#fff',
          color: periodDays === p.days ? '#fff' : 'var(--muted)',
        }}>{p.label}</button>
      ))}
    </div>
  );
}

function AnalyticsCard({ title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <h3 className="pos-serif" style={{ fontSize: 16, fontWeight: 700, marginBottom: subtitle ? 2 : 12 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

const badgeStyle = (color, bg) => ({
  display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color, background: bg,
});

/* ----- Inventory turnover ------------------------------------------- */

function TurnoverSection({ inventory, sales, periodDays }) {
  const rows = useMemo(() => {
    const stats = buildProductSalesStats(inventory, sales, periodDays).filter((r) => r.product.category !== 'Discontinued');
    return stats.map((r) => {
      const stock = Math.max(0, Number(r.product.stock) || 0);
      const dailyRate = r.unitsSold / periodDays;
      // Turnover rate = units sold / average inventory on hand, annualized.
      // We don't keep historical stock snapshots, so current stock stands
      // in for average inventory — a standard approximation for POS systems
      // without a dedicated inventory-valuation ledger.
      const annualTurns = stock > 0 ? (dailyRate * 365) / stock : (r.unitsSold > 0 ? Infinity : 0);
      const daysOfStock = dailyRate > 0 ? stock / dailyRate : null;
      let status = 'No sales';
      if (r.unitsSold > 0) status = annualTurns >= 12 ? 'Fast-moving' : annualTurns >= 3 ? 'Normal' : 'Slow-moving';
      else if (stock > 0) status = 'Dead stock';
      return { ...r, stock, annualTurns, daysOfStock, status };
    }).sort((a, b) => b.annualTurns - a.annualTurns);
  }, [inventory, sales, periodDays]);

  const STATUS_META = {
    'Fast-moving': badgeStyle('#fff', 'var(--pine)'),
    'Normal': badgeStyle('var(--ink)', 'var(--bg)'),
    'Slow-moving': badgeStyle('#8A5A00', 'var(--amber-pale)'),
    'Dead stock': badgeStyle('var(--red)', 'var(--red-pale)'),
    'No sales': badgeStyle('var(--muted)', 'var(--bg)'),
  };

  return (
    <AnalyticsCard title="Inventory turnover rate" subtitle="How many times each product's stock would cycle in a year, based on units sold in the selected period vs. current stock on hand.">
      <div className="pos-table-scroll" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ minWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 1fr 1.1fr', padding: '9px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <span>Product</span><span>Category</span><span>Units sold</span><span>Stock</span><span>Turnover/yr</span><span>Status</span>
          </div>
          {rows.length === 0 && <p style={{ padding: 14, fontSize: 13, color: 'var(--muted)' }}>No products to analyze.</p>}
          {rows.map((r) => (
            <div key={r.product.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 1fr 1.1fr', padding: '9px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span>{r.product.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{r.product.category}</span>
              <span className="pos-mono">{r.unitsSold}</span>
              <span className="pos-mono">{r.stock}</span>
              <span className="pos-mono">{!isFinite(r.annualTurns) ? 'Sold out' : r.annualTurns.toFixed(1) + 'x'}</span>
              <span style={badgeStyle(STATUS_META[r.status].color, STATUS_META[r.status].background)}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </AnalyticsCard>
  );
}

/* ----- ABC analysis --------------------------------------------------- */

function classifyABC(rows) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  let cumulative = 0;
  return rows.map((r) => {
    cumulative += r.revenue;
    const cumulativePct = total > 0 ? (cumulative / total) * 100 : 100;
    const revenueSharePct = total > 0 ? (r.revenue / total) * 100 : 0;
    const cls = cumulativePct <= 80 ? 'A' : cumulativePct <= 95 ? 'B' : 'C';
    return { ...r, cumulativePct, revenueSharePct, class: cls };
  });
}

function ABCSection({ inventory, sales, settings, periodDays }) {
  const [filter, setFilter] = useState('All');
  const ranked = useMemo(() => {
    const stats = buildProductSalesStats(inventory, sales, periodDays).filter((r) => r.revenue > 0);
    stats.sort((a, b) => b.revenue - a.revenue);
    return classifyABC(stats);
  }, [inventory, sales, periodDays]);

  const summary = ['A', 'B', 'C'].map((cls) => {
    const items = ranked.filter((r) => r.class === cls);
    return {
      cls,
      count: items.length,
      revenue: items.reduce((s, r) => s + r.revenue, 0),
      revenuePct: items.reduce((s, r) => s + r.revenueSharePct, 0),
    };
  });

  const CLASS_META = {
    A: { label: 'A — top priority', color: '#fff', bg: 'var(--pine)' },
    B: { label: 'B — moderate priority', color: '#8A5A00', bg: 'var(--amber-pale)' },
    C: { label: 'C — low priority', color: 'var(--muted)', bg: 'var(--bg)' },
  };

  const visible = filter === 'All' ? ranked : ranked.filter((r) => r.class === filter);

  return (
    <AnalyticsCard title="ABC inventory analysis" subtitle="Products ranked by revenue contribution in the selected period. A = top ~80% of revenue, B = next ~15%, C = the long tail.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {summary.map((s) => (
          <div key={s.cls} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <span style={badgeStyle(CLASS_META[s.cls].color, CLASS_META[s.cls].bg)}>{CLASS_META[s.cls].label}</span>
            <div className="pos-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{s.count} products</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.revenuePct.toFixed(1)}% of revenue · {formatMoney(s.revenue, settings.currency)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['All', 'A', 'B', 'C'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--border)', background: filter === f ? 'var(--pine)' : '#fff', color: filter === f ? '#fff' : 'var(--muted)',
          }}>{f}</button>
        ))}
      </div>

      <div className="pos-table-scroll" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ minWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '0.4fr 2fr 1fr 1fr 1fr 1fr 0.6fr', padding: '9px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <span>#</span><span>Product</span><span>Category</span><span>Revenue</span><span>% of total</span><span>Cumulative</span><span>Class</span>
          </div>
          {visible.length === 0 && <p style={{ padding: 14, fontSize: 13, color: 'var(--muted)' }}>No sales revenue in this period yet.</p>}
          {visible.map((r, i) => (
            <div key={r.product.id} style={{ display: 'grid', gridTemplateColumns: '0.4fr 2fr 1fr 1fr 1fr 1fr 0.6fr', padding: '9px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span className="pos-mono" style={{ color: 'var(--muted)' }}>{ranked.indexOf(r) + 1}</span>
              <span>{r.product.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{r.product.category}</span>
              <span className="pos-mono">{formatMoney(r.revenue, settings.currency)}</span>
              <span className="pos-mono">{r.revenueSharePct.toFixed(1)}%</span>
              <span className="pos-mono">{r.cumulativePct.toFixed(1)}%</span>
              <span style={badgeStyle(CLASS_META[r.class].color, CLASS_META[r.class].bg)}>{r.class}</span>
            </div>
          ))}
        </div>
      </div>
    </AnalyticsCard>
  );
}

/* ----- Gross margin ---------------------------------------------------- */

function MarginSection({ inventory, sales, settings, periodDays }) {
  const missingCostCount = inventory.filter((p) => !(Number(p.costPrice) > 0)).length;

  const productRows = useMemo(() => {
    return buildProductSalesStats(inventory, sales, periodDays)
      .filter((r) => r.product.category !== 'Discontinued' && r.revenue > 0)
      .map((r) => {
        const hasCost = Number(r.product.costPrice) > 0;
        const margin = r.revenue - r.cost;
        const marginPct = hasCost && r.revenue > 0 ? (margin / r.revenue) * 100 : null;
        return { ...r, hasCost, margin, marginPct };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [inventory, sales, periodDays]);

  const categoryRows = useMemo(() => {
    const map = new Map();
    productRows.forEach((r) => {
      const cat = r.product.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, { category: cat, revenue: 0, cost: 0, missingCost: false });
      const c = map.get(cat);
      c.revenue += r.revenue;
      if (r.hasCost) c.cost += r.cost; else c.missingCost = true;
    });
    return Array.from(map.values()).map((c) => ({
      ...c, margin: c.revenue - c.cost, marginPct: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : null,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [productRows]);

  const marginColor = (pct) => {
    if (pct === null) return 'var(--muted)';
    if (pct < 15) return 'var(--red)';
    if (pct < 30) return '#8A5A00';
    return 'var(--pine)';
  };

  return (
    <AnalyticsCard title="Gross margin by product & category" subtitle="Revenue minus cost of goods sold, for the selected period. Set a cost price on a product (Inventory → edit) to include it in margin figures.">
      {missingCostCount > 0 && (
        <div style={{ background: 'var(--amber-pale)', color: '#8A5A00', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>
          {missingCostCount} product{missingCostCount !== 1 ? 's have' : ' has'} no cost price set, so their margin can't be calculated yet — figures below only reflect products with a cost price on file.
        </div>
      )}

      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>By category</h4>
      <div style={{ marginBottom: 18 }}>
        {categoryRows.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No sales revenue in this period yet.</p>}
        {categoryRows.map((c) => (
          <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{c.category}{c.missingCost ? <span style={{ color: 'var(--muted)', fontSize: 11 }}> *</span> : ''}</span>
            <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="pos-mono" style={{ color: 'var(--muted)' }}>{formatMoney(c.revenue, settings.currency)}</span>
              <span className="pos-mono" style={{ fontWeight: 700, color: marginColor(c.marginPct) }}>
                {c.marginPct === null ? '—' : `${c.marginPct.toFixed(1)}%`}
              </span>
            </span>
          </div>
        ))}
        {categoryRows.some((c) => c.missingCost) && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>* includes at least one product with no cost price — actual margin is likely lower than shown.</p>}
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>By product</h4>
      <div className="pos-table-scroll" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ minWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '9px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <span>Product</span><span>Revenue</span><span>Cost</span><span>Margin</span><span>Margin %</span>
          </div>
          {productRows.length === 0 && <p style={{ padding: 14, fontSize: 13, color: 'var(--muted)' }}>No sales revenue in this period yet.</p>}
          {productRows.map((r) => (
            <div key={r.product.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '9px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span>{r.product.name}</span>
              <span className="pos-mono">{formatMoney(r.revenue, settings.currency)}</span>
              <span className="pos-mono">{r.hasCost ? formatMoney(r.cost, settings.currency) : '—'}</span>
              <span className="pos-mono">{r.hasCost ? formatMoney(r.margin, settings.currency) : '—'}</span>
              <span className="pos-mono" style={{ fontWeight: 700, color: marginColor(r.marginPct) }}>{r.marginPct === null ? '—' : `${r.marginPct.toFixed(1)}%`}</span>
            </div>
          ))}
        </div>
      </div>
    </AnalyticsCard>
  );
}

/* ----- Predictive stock forecasting ------------------------------------ */

function ForecastSection({ inventory, sales, settings }) {
  const LEAD_TIME_DAYS = 14;

  const rows = useMemo(() => {
    const now = new Date();
    const recentCutoff = new Date(now); recentCutoff.setDate(now.getDate() - 14);
    const priorCutoff = new Date(now); priorCutoff.setDate(now.getDate() - 28);

    const recentQty = new Map();
    const priorQty = new Map();
    sales.forEach((s) => {
      if (s.voided) return;
      const t = new Date(s.timestamp);
      if (t >= recentCutoff) {
        (s.items || []).forEach((i) => recentQty.set(i.id, (recentQty.get(i.id) || 0) + i.qty));
      } else if (t >= priorCutoff) {
        (s.items || []).forEach((i) => priorQty.set(i.id, (priorQty.get(i.id) || 0) + i.qty));
      }
    });

    return inventory.map((p) => {
      const recent = recentQty.get(p.id) || 0;
      const prior = priorQty.get(p.id) || 0;
      const recentDaily = recent / 14;
      const priorDaily = prior / 14;
      // Weight the recent window more heavily so the forecast reacts to
      // fresh trends, but still smooths out single-week noise.
      const projectedDaily = priorDaily > 0 ? recentDaily * 0.7 + priorDaily * 0.3 : recentDaily;

      let trend = 'steady';
      if (recentDaily > priorDaily * 1.2 + 0.01) trend = 'rising';
      else if (recentDaily < priorDaily * 0.8 - 0.01) trend = 'falling';

      const stock = Math.max(0, Number(p.stock) || 0);
      const daysOfStock = projectedDaily > 0 ? stock / projectedDaily : null;
      const projectedNeed = projectedDaily * LEAD_TIME_DAYS;
      const suggestedReorder = Math.max(0, Math.ceil(projectedNeed - stock));

      let urgency = 'ok';
      if (projectedDaily > 0 && daysOfStock <= 7) urgency = 'urgent';
      else if (projectedDaily > 0 && daysOfStock <= LEAD_TIME_DAYS) urgency = 'soon';
      else if (projectedDaily === 0 && stock <= (Number(p.reorderLevel) || 0)) urgency = 'watch';

      return { product: p, stock, recent, prior, projectedDaily, trend, daysOfStock, suggestedReorder, urgency };
    })
      .filter((r) => r.recent > 0 || r.prior > 0 || r.stock <= (Number(r.product.reorderLevel) || 0))
      .sort((a, b) => (a.daysOfStock ?? Infinity) - (b.daysOfStock ?? Infinity));
  }, [inventory, sales]);

  const TREND_META = {
    rising: { symbol: '↑', color: '#8A5A00' },
    falling: { symbol: '↓', color: 'var(--muted)' },
    steady: { symbol: '→', color: 'var(--muted)' },
  };
  const URGENCY_META = {
    urgent: badgeStyle('#fff', 'var(--red)'),
    soon: badgeStyle('#8A5A00', 'var(--amber-pale)'),
    watch: badgeStyle('var(--muted)', 'var(--bg)'),
    ok: badgeStyle('#fff', 'var(--pine)'),
  };
  const URGENCY_LABEL = { urgent: 'Reorder now', soon: 'Reorder soon', watch: 'Watch', ok: 'Healthy' };

  return (
    <AnalyticsCard title="Predictive stock forecasting" subtitle={`Projects daily demand from the last 28 days of sales (weighted toward the most recent 14) and estimates when each product runs out, assuming a ${LEAD_TIME_DAYS}-day supplier lead time.`}>
      <div className="pos-table-scroll" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ minWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.9fr 1fr 1fr 1.1fr 1fr', padding: '9px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <span>Product</span><span>Stock</span><span>Trend</span><span>Daily demand</span><span>Days left</span><span>Suggested reorder</span><span>Status</span>
          </div>
          {rows.length === 0 && <p style={{ padding: 14, fontSize: 13, color: 'var(--muted)' }}>No recent sales activity or low-stock items to forecast yet.</p>}
          {rows.map((r) => (
            <div key={r.product.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.9fr 1fr 1fr 1.1fr 1fr', padding: '9px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span>{r.product.name}</span>
              <span className="pos-mono">{r.stock}</span>
              <span style={{ color: TREND_META[r.trend].color, fontWeight: 700 }}>{TREND_META[r.trend].symbol} {r.trend}</span>
              <span className="pos-mono">{r.projectedDaily.toFixed(2)}/day</span>
              <span className="pos-mono">{r.daysOfStock === null ? '—' : Math.round(r.daysOfStock) + 'd'}</span>
              <span className="pos-mono">{r.suggestedReorder > 0 ? `+${r.suggestedReorder}` : '—'}</span>
              <span style={badgeStyle(URGENCY_META[r.urgency].color, URGENCY_META[r.urgency].background)}>{URGENCY_LABEL[r.urgency]}</span>
            </div>
          ))}
        </div>
      </div>
    </AnalyticsCard>
  );
}

/* ----- Tab shell -------------------------------------------------------- */

function AnalyticsTab({ inventory, sales, settings }) {
  const [periodDays, setPeriodDays] = useState(90);

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Advanced analytics</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Turnover, ABC ranking, and margin below use the period selected here. Forecasting always looks at the last 28 days.</p>
      <PeriodPicker periodDays={periodDays} setPeriodDays={setPeriodDays} />

      <TurnoverSection inventory={inventory} sales={sales} periodDays={periodDays} />
      <ABCSection inventory={inventory} sales={sales} settings={settings} periodDays={periodDays} />
      <MarginSection inventory={inventory} sales={sales} settings={settings} periodDays={periodDays} />
      <ForecastSection inventory={inventory} sales={sales} settings={settings} />
    </div>
  );
}

const emptyProduct = { name: '', category: '', sku: '', barcode: '', price: '', costPrice: '', stock: '', reorderLevel: '', expiry: '', requiresRx: false };

// Builds a short, human-readable summary of what changed between two
// versions of a product — e.g. "Stock 40 → 60, Price KSh180 → KSh190".
// Only reports fields that actually changed, so a name-only edit doesn't
// show a wall of unchanged numbers.
function summarizeProductChange(before, after, settings) {
  const parts = [];
  if (before.name !== after.name) parts.push(`Name "${before.name}" → "${after.name}"`);
  if (Number(before.price) !== Number(after.price)) parts.push(`Price ${formatMoney(before.price, settings.currency)} → ${formatMoney(after.price, settings.currency)}`);
  if (Number(before.costPrice || 0) !== Number(after.costPrice || 0)) parts.push(`Cost price ${formatMoney(before.costPrice || 0, settings.currency)} → ${formatMoney(after.costPrice || 0, settings.currency)}`);
  if (Number(before.stock) !== Number(after.stock)) parts.push(`Stock ${before.stock} → ${after.stock}`);
  if (Number(before.reorderLevel) !== Number(after.reorderLevel)) parts.push(`Reorder level ${before.reorderLevel} → ${after.reorderLevel}`);
  if (before.expiry !== after.expiry) parts.push(`Expiry ${before.expiry || '—'} → ${after.expiry || '—'}`);
  if (before.category !== after.category) parts.push(`Category ${before.category} → ${after.category}`);
  if (before.sku !== after.sku) parts.push(`SKU ${before.sku} → ${after.sku}`);
  if ((before.barcode || '') !== (after.barcode || '')) parts.push(`Barcode ${before.barcode || '—'} → ${after.barcode || '—'}`);
  if (!!before.requiresRx !== !!after.requiresRx) parts.push(after.requiresRx ? 'Marked as Rx' : 'Unmarked as Rx');
  return parts.length ? parts.join(', ') : 'No field changes';
}

function InventoryTab({ inventory, settings, saveInventory, user, logInventoryChange }) {
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = new, obj = edit
  const [drugInfoProduct, setDrugInfoProduct] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = inventory.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()) || (p.barcode || '').toLowerCase().includes(query.toLowerCase()));

  const upsert = (product) => {
    if (product.id) {
      const before = inventory.find((p) => p.id === product.id);
      saveInventory(inventory.map((p) => (p.id === product.id ? product : p)));
      if (logInventoryChange && before) {
        logInventoryChange({
          action: 'edit',
          productName: product.name,
          sku: product.sku,
          detail: summarizeProductChange(before, product, settings),
        });
      }
    } else {
      const created = { ...product, id: genId('p') };
      saveInventory([...inventory, created]);
      if (logInventoryChange) {
        logInventoryChange({
          action: 'add',
          productName: created.name,
          sku: created.sku,
          detail: `Added with ${created.stock} in stock at ${formatMoney(created.price, settings.currency)}`,
        });
      }
    }
    setModalProduct(null);
  };

  const remove = (id) => {
    const product = inventory.find((p) => p.id === id);
    saveInventory(inventory.filter((p) => p.id !== id));
    if (logInventoryChange && product) {
      logInventoryChange({
        action: 'delete',
        productName: product.name,
        sku: product.sku,
        detail: `Removed (had ${product.stock} in stock)`,
      });
    }
  };

  return (
    <div>
      <div className="pos-inv-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>Inventory</h2>
        <button onClick={() => setModalProduct({ ...emptyProduct })} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <Plus size={14} /> Add product
        </button>
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inventory by name, SKU, or barcode"
        style={{ width: '100%', maxWidth: 320, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginBottom: 14 }} />

      <div className="pos-table-scroll" style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ minWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr 1fr 84px', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <span>Product</span><span>Category</span><span>SKU</span><span>Price</span><span>Stock</span><span>Expiry</span><span></span>
          </div>
          {filtered.map((p) => {
            const expDays = daysUntilExpiry(p.expiry);
            const expiringSoon = expDays !== null && expDays <= EXPIRY_WINDOW_DAYS;
            return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr 1fr 84px', padding: '10px 16px', fontSize: 13, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span>{p.name}{p.requiresRx ? ' ℞' : ''}</span>
              <span style={{ color: 'var(--muted)' }}>{p.category}</span>
              <span className="pos-mono" style={{ fontSize: 12 }}>{p.sku}</span>
              <span className="pos-mono">{formatMoney(p.price, settings.currency)}</span>
              <span style={{ color: p.stock <= p.reorderLevel ? 'var(--red)' : 'var(--ink)' }}>{p.stock}</span>
              <span style={{ color: expiringSoon ? (expDays < 0 ? 'var(--red)' : 'var(--amber)') : 'var(--muted)', fontSize: 12, fontWeight: expiringSoon ? 600 : 400 }} title={expiringSoon ? expiryLabel(expDays) : ''}>{p.expiry}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setDrugInfoProduct(p)} title="AI dosage / side effects / interactions lookup" style={{ background: 'none', border: 'none', color: 'var(--pine)' }}><Info size={14} /></button>
                <button onClick={() => setModalProduct(p)} style={{ background: 'none', border: 'none', color: 'var(--muted)' }}><Edit2 size={14} /></button>
                <button onClick={() => remove(p.id)} style={{ background: 'none', border: 'none', color: 'var(--red)' }}><Trash2 size={14} /></button>
              </span>
            </div>
            );
          })}
        </div>
      </div>

      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onSave={upsert} />}
      {drugInfoProduct && <DrugInfoModal product={drugInfoProduct} onClose={() => setDrugInfoProduct(null)} />}
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({ ...product });
  const [scannerOpen, setScannerOpen] = useState(false);
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
          ['price', 'Selling price', 'number'], ['costPrice', 'Cost price (optional — powers margin analytics)', 'number'],
          ['stock', 'Stock quantity', 'number'], ['reorderLevel', 'Reorder level', 'number'], ['expiry', 'Expiry date', 'date'],
        ].map(([key, label, type]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
            <input type={type} value={form[key]} onChange={(e) => set(key, type === 'number' ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value)}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Barcode (printed on packaging, optional)</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
            <input value={form.barcode || ''} onChange={(e) => set('barcode', e.target.value)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
            <button type="button" onClick={() => setScannerOpen(true)} title="Scan with camera" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--pine)'
            }}>
              <ScanLine size={15} />
            </button>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
          <input type="checkbox" checked={form.requiresRx} onChange={(e) => set('requiresRx', e.target.checked)} /> Requires a prescription
        </label>
        <button disabled={!valid} onClick={() => onSave({ ...form, price: parseFloat(form.price) || 0, costPrice: parseFloat(form.costPrice) || 0, stock: parseInt(form.stock) || 0, reorderLevel: parseInt(form.reorderLevel) || 0 })}
          style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: valid ? 'var(--pine)' : '#B9C4B4', color: '#fff', fontWeight: 600 }}>
          Save product
        </button>
      </div>
      {scannerOpen && (
        <BarcodeScannerModal
          subtitle="Scan the barcode printed on the product packaging."
          onDetect={(code) => { set('barcode', code); setScannerOpen(false); }}
          onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
}

const ACTIVITY_ACTION_META = {
  add: { label: 'Added', color: 'var(--pine)', bg: 'var(--pine-pale)' },
  edit: { label: 'Edited', color: 'var(--amber)', bg: 'var(--amber-pale)' },
  delete: { label: 'Deleted', color: 'var(--red)', bg: 'var(--red-pale)' },
};

function ActivityTab({ inventoryLog }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('All');

  const staffNames = ['All', ...Array.from(new Set(inventoryLog.map((e) => e.staffName)))];

  const filtered = inventoryLog.filter((e) => {
    const d = new Date(e.timestamp);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    if (staffFilter !== 'All' && e.staffName !== staffFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Inventory activity</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Every product added, edited, or removed — by admin or staff with inventory access.</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
          {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{filtered.length} change{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 && <p style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>No inventory changes in this range.</p>}
        {filtered.map((e) => {
          const meta = ACTIVITY_ACTION_META[e.action] || ACTIVITY_ACTION_META.edit;
          return (
            <div key={e.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  <span style={{ fontWeight: 600 }}>{e.productName}</span>
                  {e.sku && <span className="pos-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{e.sku}</span>}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{e.staffName} · {new Date(e.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', paddingLeft: 2 }}>{e.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SalesTab({ sales, settings, voidSale }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = sales.filter((s) => {
    const d = new Date(s.timestamp);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = filtered.filter((s) => !s.voided).reduce((sum, s) => sum + s.total, 0);

  const confirmVoid = async (id) => {
    if (!voidSale) return;
    setBusy(true);
    await voidSale(id, voidReason.trim());
    setBusy(false);
    setVoidingId(null);
    setVoidReason('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700 }}>Sales history</h2>
        <button onClick={() => exportSalesCsv(filtered, settings)} disabled={filtered.length === 0} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: '#fff', fontSize: 13, fontWeight: 600, color: filtered.length === 0 ? 'var(--muted)' : 'var(--pine)'
        }}>
          <ClipboardList size={14} /> Export CSV
        </button>
      </div>
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
                <span style={{ textDecoration: s.voided ? 'line-through' : 'none', color: s.voided ? 'var(--muted)' : 'var(--ink)' }}>
                  {new Date(s.timestamp).toLocaleString()} · {s.cashier}
                </span>
                {s.voided && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-pale)', padding: '2px 6px', borderRadius: 5 }}>Voided</span>}
                {s.paymentMethod === 'account' && !s.settled && !s.voided && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-pale)', padding: '2px 6px', borderRadius: 5 }}>Unpaid</span>}
              </span>
              <span className="pos-mono" style={{ color: s.voided ? 'var(--muted)' : 'var(--ink)', textDecoration: s.voided ? 'line-through' : 'none' }}>{formatMoney(s.total, settings.currency)}</span>
            </div>
            {expanded === s.id && (
              <div style={{ padding: '4px 16px 14px 37px', fontSize: 12.5, color: 'var(--muted)' }}>
                {s.items.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{i.qty} x {i.name}</span><span className="pos-mono">{formatMoney(i.price * i.qty, settings.currency)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4 }}>Paid via {s.paymentMethod}{s.customerName ? ` — ${s.customerName}` : ''}</div>
                {s.voided && <div style={{ marginTop: 4, color: 'var(--red)' }}>Voided by {s.voidedBy} on {new Date(s.voidedAt).toLocaleString()}{s.voidReason ? `: ${s.voidReason}` : ''}</div>}

                {!s.voided && voidSale && (
                  voidingId === s.id ? (
                    <div style={{ marginTop: 10, padding: 10, background: 'var(--red-pale)', borderRadius: 8 }}>
                      <label style={{ fontSize: 11, color: '#7A2530' }}>Reason for reversing this sale</label>
                      <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. customer changed their mind"
                        style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, marginTop: 4, marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={busy} onClick={() => confirmVoid(s.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
                          {busy ? 'Voiding…' : 'Confirm void'}
                        </button>
                        <button onClick={() => setVoidingId(null)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setVoidingId(s.id); setVoidReason(''); }} style={{ marginTop: 8, background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 7, padding: '6px 12px', fontSize: 12 }}>
                      Void this sale
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountsTab({ sales, settings, settleAccountSale }) {
  const [settleMethod, setSettleMethod] = useState({});
  const [busyId, setBusyId] = useState(null);

  const accountSales = sales.filter((s) => s.paymentMethod === 'account' && !s.voided);
  const outstanding = accountSales.filter((s) => !s.settled).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const settledRecently = accountSales.filter((s) => s.settled).sort((a, b) => new Date(b.settledAt || b.timestamp) - new Date(a.settledAt || a.timestamp)).slice(0, 10);

  const byCustomer = {};
  outstanding.forEach((s) => {
    const key = s.customerName || 'Unknown customer';
    if (!byCustomer[key]) byCustomer[key] = { name: key, phone: s.customerPhone, sales: [], total: 0 };
    byCustomer[key].sales.push(s);
    byCustomer[key].total += s.total;
  });
  const customers = Object.values(byCustomer).sort((a, b) => b.total - a.total);
  const totalOutstanding = outstanding.reduce((sum, s) => sum + s.total, 0);

  const markPaid = async (id) => {
    if (!settleAccountSale) return;
    setBusyId(id);
    await settleAccountSale(id, settleMethod[id] || 'cash');
    setBusyId(null);
  };

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Customer accounts</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Sales rung up "on account" — track who owes what, and mark them settled once collected.</p>

      <div style={{ marginBottom: 20 }}>
        <StatCard label="Total outstanding" value={formatMoney(totalOutstanding, settings.currency)} accent={totalOutstanding ? 'var(--red)' : undefined} />
      </div>

      {customers.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No outstanding balances right now.</p>}

      {customers.map((c) => (
        <div key={c.name} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.phone}</div>}
            </div>
            <div className="pos-mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)' }}>{formatMoney(c.total, settings.currency)}</div>
          </div>
          {c.sales.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, padding: '8px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: 'var(--muted)' }}>{new Date(s.timestamp).toLocaleDateString()} · {s.items.length} item{s.items.length !== 1 ? 's' : ''} · {s.cashier}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pos-mono">{formatMoney(s.total, settings.currency)}</span>
                {settleAccountSale && (
                  <>
                    <select value={settleMethod[s.id] || 'cash'} onChange={(e) => setSettleMethod({ ...settleMethod, [s.id]: e.target.value })}
                      style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11 }}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mpesa">M-Pesa</option>
                    </select>
                    <button disabled={busyId === s.id} onClick={() => markPaid(s.id)} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, opacity: busyId === s.id ? 0.6 : 1 }}>
                      {busyId === s.id ? 'Saving…' : 'Mark as paid'}
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}

      {settledRecently.length > 0 && (
        <>
          <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 10px' }}>Recently settled</h3>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {settledRecently.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '10px 16px', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <span>{s.customerName} · settled {s.settledAt ? new Date(s.settledAt).toLocaleDateString() : '—'}{s.settledMethod ? ` via ${s.settledMethod}` : ''}</span>
                <span className="pos-mono">{formatMoney(s.total, settings.currency)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StaffTab({ staffList, saveStaff }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Every PIN add/change/delete is confirmed server-side against the
  // admin's own PIN — the browser never stores or reads anyone's real
  // PIN value, it just relays what was typed to staff-admin and reports
  // back whether that succeeded.
  const callStaffAdmin = async (body) => {
    setActionError('');
    if (!adminPin || adminPin.length !== 4) {
      setActionError('Enter your admin PIN above to make staff changes.');
      return false;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-admin', { body: { adminPin, ...body } });
      if (error || !data || data.error) {
        setActionError((data && data.error) || (error && error.message) || 'Could not save. Check your admin PIN and try again.');
        return false;
      }
      return true;
    } catch (e) {
      setActionError('Could not reach the server.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!name || pin.length !== 4) return;
    const id = genId('s');
    const ok = await callStaffAdmin({ action: 'set', staffId: id, pin, role: 'staff' });
    if (!ok) return;
    saveStaff([...staffList, { id, name, role: 'staff', canManageInventory: false }]);
    setName(''); setPin('');
  };

  const remove = async (id) => {
    const ok = await callStaffAdmin({ action: 'delete', staffId: id });
    if (!ok) return;
    saveStaff(staffList.filter((s) => s.id !== id));
  };

  const startEdit = (s) => { setEditingId(s.id); setEditName(s.name); setEditPin(''); };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (id) => {
    if (!editName) return;
    if (editPin && editPin.length !== 4) return; // only validate PIN if actually changing it
    if (editPin) {
      const target = staffList.find((s) => s.id === id);
      const ok = await callStaffAdmin({ action: 'set', staffId: id, pin: editPin, role: target.role });
      if (!ok) return;
    }
    saveStaff(staffList.map((s) => (s.id === id ? { ...s, name: editName } : s)));
    setEditingId(null);
  };

  const toggleInventoryAccess = (id, checked) => {
    saveStaff(staffList.map((s) => (s.id === id ? { ...s, canManageInventory: checked } : s)));
  };

  return (
    <div>
      <h2 className="pos-serif" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Staff accounts</h2>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Your admin PIN — required to add, edit, or remove a PIN below</label>
        <input type="password" inputMode="numeric" autoComplete="off" value={adminPin}
          onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
          style={{ width: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 4, display: 'block' }} />
      </div>
      {actionError && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{actionError}</p>}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 20 }}>
        {staffList.map((s) => (
          editingId === s.id ? (
            <div key={s.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name"
                style={{ flex: '1 1 140px', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
              <input value={editPin} onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="New PIN (optional)"
                style={{ width: 140, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
              <button onClick={() => saveEdit(s.id)} disabled={busy} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>Save</button>
              <button onClick={cancelEdit} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: 'var(--muted)' }}>Cancel</button>
            </div>
          ) : (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, flexWrap: 'wrap', gap: 8 }}>
              <span>{s.name} <span style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', marginLeft: 6 }}>{s.role}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {s.role !== 'admin' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                    <input
                      type="checkbox"
                      checked={!!s.canManageInventory}
                      onChange={(e) => toggleInventoryAccess(s.id, e.target.checked)}
                    />
                    Can add inventory
                  </label>
                )}
                <span className="pos-mono" style={{ color: 'var(--muted)' }}>PIN ••••</span>
                <button onClick={() => startEdit(s)} title="Change name or PIN" style={{ background: 'none', border: 'none', color: 'var(--muted)' }}><Edit2 size={14} /></button>
                {s.role !== 'admin' && <button onClick={() => remove(s.id)} disabled={busy} style={{ background: 'none', border: 'none', color: 'var(--red)' }}><Trash2 size={14} /></button>}
              </span>
            </div>
          )
        ))}
      </div>
      <h3 className="pos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Add cashier</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={{ flex: '1 1 140px', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4-digit PIN" style={{ width: 120, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <button onClick={add} disabled={busy} style={{ background: 'var(--pine)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>Add</button>
      </div>
    </div>
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
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Auto logout after inactivity (minutes)</label>
          <input type="number" min="0" value={form.sessionTimeoutMinutes} onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginTop: 3 }} />
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Cashiers and admins are logged out after this many minutes with no activity on a terminal. Set to 0 to disable.</p>
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
  const [inventoryLog, setInventoryLog] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [lastSynced, setLastSynced] = useState('just now');
  const [pendingCount, setPendingCount] = useState(0);
  const [loginNotice, setLoginNotice] = useState('');
  const pollRef = useRef(null);
  const sessionRestored = useRef(false);

  const refreshPending = () => setPendingCount(getDirtyKeys().length);

  const loadAll = useCallback(async () => {
    await flushDirtyKeys();
    const [inv, sls, stf, cfg, invLog] = await Promise.all([
      getOrInit('inventory', DEFAULT_INVENTORY),
      getOrInit('sales', []),
      getOrInit('staff', DEFAULT_STAFF),
      getOrInit('settings', DEFAULT_SETTINGS),
      getOrInit('inventoryLog', []),
    ]);
    setInventory(inv); setSales(sls); setStaffList(stf); setSettings({ ...DEFAULT_SETTINGS, ...cfg }); setInventoryLog(invLog);
    setLastSynced(new Date().toLocaleTimeString());
    refreshPending();
    setReady(true);
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

    // Slow fallback poll — also doubles as the offline retry loop, in case
    // realtime and the 'online' browser event both miss a reconnect.
    pollRef.current = setInterval(loadAll, 15000);

    // React immediately when the browser regains a connection, instead of
    // waiting for the next poll.
    const handleOnline = () => loadAll();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(pollRef.current);
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
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
    setLoginNotice('');
    localStorage.setItem(SESSION_KEY, staffMember.id);
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  // Auto-logout after inactivity — shared/left-open terminals shouldn't stay
  // signed in indefinitely under whoever's PIN unlocked them. Any mouse,
  // keyboard, or touch activity resets the timer; a fresh page load also
  // resets it. Configurable per-pharmacy in Settings; 0 disables it.
  useEffect(() => {
    if (!user) return undefined;
    const minutes = Number(settings.sessionTimeoutMinutes);
    if (!minutes || minutes <= 0) return undefined;
    const limitMs = minutes * 60 * 1000;
    let timer = null;

    const trigger = () => {
      setLoginNotice("You were logged out after a period of inactivity.");
      handleLogout();
    };
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(trigger, limitMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.sessionTimeoutMinutes]);

  const saveInventory = async (next) => {
    setInventory(next);
    await saveShared('inventory', next);
    setLastSynced(new Date().toLocaleTimeString());
  };
  const logInventoryChange = async ({ action, productName, sku, detail }) => {
    const entry = {
      id: genId('log'),
      timestamp: new Date().toISOString(),
      staffId: user?.id,
      staffName: user?.name || 'Unknown',
      action, productName, sku, detail,
    };
    const next = [...inventoryLog, entry];
    setInventoryLog(next);
    await saveShared('inventoryLog', next);
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

  // Reverses a completed sale: marks it voided (kept in the record for the
  // audit trail, not deleted) and restocks whatever it sold. Available to
  // both admins (any sale) and cashiers (their own same-day sales).
  const voidSale = async (saleId, reason) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.voided) return false;

    const nextSales = sales.map((s) => (s.id === saleId ? {
      ...s,
      voided: true,
      voidReason: reason || '',
      voidedAt: new Date().toISOString(),
      voidedBy: user?.name || 'Unknown',
    } : s));
    setSales(nextSales);
    await saveShared('sales', nextSales);

    const nextInventory = inventory.map((p) => {
      const found = sale.items.find((i) => i.id === p.id);
      return found ? { ...p, stock: p.stock + found.qty } : p;
    });
    setInventory(nextInventory);
    await saveShared('inventory', nextInventory);

    setLastSynced(new Date().toLocaleTimeString());
    return true;
  };

  // Marks a "sale on account" as collected — used once the customer pays
  // off what they owe, recording how and by whom.
  const settleAccountSale = async (saleId, method) => {
    const nextSales = sales.map((s) => (s.id === saleId ? {
      ...s,
      settled: true,
      settledAt: new Date().toISOString(),
      settledBy: user?.name || 'Unknown',
      settledMethod: method || 'cash',
    } : s));
    setSales(nextSales);
    await saveShared('sales', nextSales);
    setLastSynced(new Date().toLocaleTimeString());
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
    return <LoginScreen settings={settings} onLogin={handleLogin} notice={loginNotice} />;
  }

  if (user.role === 'admin') {
    return (
      <AdminConsole inventory={inventory} sales={sales} staffList={staffList} settings={settings}
        user={user} onLogout={handleLogout} lastSynced={lastSynced}
        saveInventory={saveInventory} saveStaff={saveStaffList} saveSettings={saveSettingsFn}
        inventoryLog={inventoryLog} logInventoryChange={logInventoryChange}
        voidSale={voidSale} settleAccountSale={settleAccountSale} />
    );
  }

  return (
    <StaffPOS inventory={inventory} sales={sales} settings={settings} user={user}
      addSale={addSale} updateStock={updateStock} lastSynced={lastSynced} onLogout={handleLogout}
      saveInventory={saveInventory} logInventoryChange={logInventoryChange} voidSale={voidSale} />
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
