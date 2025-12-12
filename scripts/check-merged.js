const admin = require('firebase-admin');
const path = require('path');

const keyPath = path.join(__dirname, '..', 'firebase-adminsdk.json');
try {
  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  console.error('Failed to initialize firebase-admin from', keyPath, e.message);
  process.exit(1);
}

const db = admin.firestore();

const normalizeText = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
const matchesDefault = (d, a) => {
  if (!a) return false;
  if (a.id === d.id) return true;
  const an = normalizeText(a.name);
  const dn = normalizeText(d.name);
  if (an.includes(dn) || dn.includes(an)) return true;
  if (an.includes(d.id.replace(/-/g, ' '))) return true;
  const aTokens = new Set(an.split(/\s+/).filter(Boolean));
  const dTokens = new Set(dn.split(/\s+/).filter(Boolean));
  let common = 0;
  aTokens.forEach((t) => { if (dTokens.has(t)) common++; });
  if (common >= 2) return true;
  const minLen = Math.min(aTokens.size || 1, dTokens.size || 1);
  if (common / minLen >= 0.5) return true;
  return false;
};

const DEFAULT_DASHBOARD = [
  { id: 'income-estimator', name: 'Income Estimator', description: 'Estimate your retirement income from various sources', icon: '📊', url: 'http://localhost:5173/', freeAllowed: true, gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' },
  { id: 'retire-abroad', name: 'Retire Abroad', description: 'Plan your retirement in another country', icon: '🌍', url: 'https://retire-abroad-ai.vercel.app/', freeAllowed: true, gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' },
  { id: 'tax-impact-analyzer', name: 'Tax Impact Analyzer', description: 'Analyze tax impacts in retirement with detailed projections', icon: '💰', url: 'http://localhost:3001/', freeAllowed: true },
  { id: 'healthcare-cost', name: 'Healthcare Cost Estimator', description: 'Plan for your retirement healthcare expenses', icon: '❤️', url: 'https://healthcare-cost.vercel.app/', freeAllowed: true, gradient: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)' },
];

const DEFAULT_HOMEPAGE = [
  { id: 'income-estimator', name: 'Monthly Retirement Income Estimator', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', url: 'http://localhost:5173/', icon: '📊' },
  { id: 'retire-abroad', name: 'Retire Abroad AI Recommendations', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', url: 'https://retire-abroad-ai.vercel.app/', icon: '🌍' },
  { id: 'tax-impact-analyzer', name: 'Tax Impact Analyzer', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', url: 'http://localhost:3001/', icon: '💰' },
  { id: 'social-security', name: 'Social Security Optimization', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', url: 'https://social-security.example/', icon: '👥' },
  { id: 'healthcare-cost', name: 'Healthcare Cost Calculator', gradient: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)', url: 'https://healthcare-cost.vercel.app/', icon: '❤️' },
];

(async () => {
  const appsRef = db.collection('apps');
  const snapshot = await appsRef.get();
  const loadedApps = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    loadedApps.push({ id: d.id, name: d.name, description: d.description, icon: d.icon, url: d.url, gradient: d.gradient, freeAllowed: d.freeAllowed });
  });

  console.log('Loaded apps from Firestore:');
  console.log(JSON.stringify(loadedApps, null, 2));

  const mergedDashboard = DEFAULT_DASHBOARD.map((d) => {
    console.log(`\nChecking default: ${d.name}`);
    loadedApps.forEach((a) => {
      // print token intersection details for debugging
      const an = normalizeText(a.name);
      const dn = normalizeText(d.name);
      const aTokens = an.split(/\s+/).filter(Boolean);
      const dTokens = dn.split(/\s+/).filter(Boolean);
      const common = aTokens.filter(t => dTokens.includes(t));
      const minLen = Math.min(new Set(aTokens).size || 1, new Set(dTokens).size || 1);
      const ratio = common.length / minLen;
      console.log(` - ${a.id} (${a.name}) -> matches=${matchesDefault(d,a)} tokens_a=[${aTokens}] tokens_d=[${dTokens}] common=${common.length} ratio=${ratio}`);
    });
    const override = loadedApps.find((a) => matchesDefault(d, a));
    console.log(`Default '${d.name}' matched override: ${override ? override.id : 'none'}`);
    return override ? { id: override.id || d.id, name: override.name || d.name, description: override.description || d.description, icon: override.icon || d.icon, url: override.url || d.url || '', freeAllowed: typeof override.freeAllowed === 'boolean' ? override.freeAllowed : d.freeAllowed, gradient: override.gradient || d.gradient } : d;
  }).concat(loadedApps.filter((a) => !DEFAULT_DASHBOARD.some((d) => matchesDefault(d, a))).map(a => ({ id: a.id, name: a.name, description: a.description, icon: a.icon || '📦', url: a.url || '', freeAllowed: a.freeAllowed, gradient: a.gradient || '' })));

  const mergedHomepage = DEFAULT_HOMEPAGE.map((d) => {
    const override = loadedApps.find((a) => matchesDefault(d, a));
    return override ? { id: override.id || d.id, name: override.name || d.name, gradient: override.gradient || d.gradient, url: override.url || d.url || '', icon: override.icon || d.icon || '📦' } : d;
  }).concat(loadedApps.filter((a) => !DEFAULT_HOMEPAGE.some((d) => matchesDefault(d, a))).map(a => ({ id: a.id, name: a.name, gradient: a.gradient || '', url: a.url || '', icon: a.icon || '📦' })));

  console.log("\nMerged Dashboard apps:");
  console.log(JSON.stringify(mergedDashboard, null, 2));
  console.log("\nMerged Homepage apps:");
  console.log(JSON.stringify(mergedHomepage, null, 2));
})();
