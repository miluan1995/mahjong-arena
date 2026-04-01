// SVG 牌面预加载器
const SUIT_MAP = { wan: 'Man', tiao: 'Sou', tong: 'Pin' };
const cache = {};
let loaded = false;
let loadPromise = null;

export function getTileImage(suit, rank) {
  if (!suit || !rank) return null;
  const key = `${SUIT_MAP[suit]}${rank}`;
  return cache[key] || null;
}

export function getBackImage() { return cache['Back'] || null; }
export function getFrontImage() { return cache['Front'] || null; }
export function isLoaded() { return loaded; }

export function preloadTiles() {
  if (loadPromise) return loadPromise;
  const keys = [];
  for (const s of ['Man', 'Sou', 'Pin']) {
    for (let r = 1; r <= 9; r++) keys.push(`${s}${r}`);
  }
  keys.push('Back', 'Front');

  loadPromise = Promise.all(keys.map(k => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { cache[k] = img; resolve(); };
    img.onerror = () => { console.warn('tile load fail:', k); resolve(); };
    img.src = `/tiles/${k}.svg`;
  }))).then(() => { loaded = true; });

  return loadPromise;
}
