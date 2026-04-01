// SVG 牌面贴图加载器
const TILE_MAP = {
  wan: 'Man', tiao: 'Sou', tong: 'Pin'
};

const imageCache = {};
let loadCount = 0, totalCount = 0;

export function preloadTiles(onProgress) {
  const promises = [];
  // 27张牌面 + Front + Back
  const files = ['Front', 'Back'];
  for (const prefix of ['Man', 'Pin', 'Sou']) {
    for (let r = 1; r <= 9; r++) files.push(`${prefix}${r}`);
  }
  totalCount = files.length;

  for (const name of files) {
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        imageCache[name] = img;
        loadCount++;
        if (onProgress) onProgress(loadCount, totalCount);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load ${name}.svg`);
        loadCount++;
        if (onProgress) onProgress(loadCount, totalCount);
        resolve();
      };
      img.src = `tiles/${name}.svg`;
    });
    promises.push(p);
  }
  return Promise.all(promises);
}

export function getTileImage(suit, rank) {
  if (!suit || !rank) return null;
  const prefix = TILE_MAP[suit];
  if (!prefix) return null;
  return imageCache[`${prefix}${rank}`] || null;
}

export function getFrontImage() { return imageCache['Front'] || null; }
export function getBackImage() { return imageCache['Back'] || null; }
export function isLoaded() { return loadCount >= totalCount; }
