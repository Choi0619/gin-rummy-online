/* Theme asset warm-up and lifecycle coordination.
   Visual theme runtimes remain independent; this module only makes their
   raster assets ready earlier and pauses ambient work while the page is hidden. */
(function () {
  const THEME_ASSETS = {
    abyss: [
      '/assets/abyss/white-jellyfish-sprite.webp',
      '/assets/abyss/lobby-sanctuary.webp',
      '/assets/abyss/anglerfish.webp',
      '/assets/abyss/hatchetfish.webp',
      '/assets/abyss/ribbon-eel.webp',
      '/assets/abyss/lanternfish.webp',
      '/assets/abyss/manta.webp',
      '/assets/abyss/seahorse.webp',
      '/assets/abyss/kelp.webp',
      '/assets/abyss/fan-coral.webp',
      '/assets/abyss/tube-worms.webp',
      '/assets/abyss/glow-grass.webp',
      '/assets/abyss/feather-coral.webp',
      '/assets/abyss/anemones.webp',
      '/assets/abyss/abyss-cursor.svg'
    ],
    angel: [
      '/assets/angel/celestial-bg-desktop.webp',
      '/assets/angel/celestial-bg-mobile.webp',
      '/assets/angel/lobby-gate-v3.webp',
      '/assets/angel/feather-atlas-v3.webp',
      '/assets/angel/celestial-sigil-v3.webp',
      '/assets/angel/turn-wings-v3.webp',
      '/assets/angel/modal-heraldry-atlas-v1.webp',
      '/assets/angel/modal-crest-v1.webp',
      '/assets/angel/victory-seraph-v1.webp',
      '/assets/angel/mini-angel-atlas-v1.webp',
      '/assets/angel/golden-feather-v1.webp',
      '/assets/angel/radiant-butterfly-v1.webp',
      '/assets/angel/starlight-crystal-v1.webp',
      '/assets/angel/celestial-key-v1.webp',
      '/assets/angel/meld-opal-badge-v1.webp',
      '/assets/angel/chat-winged-opal-v1.webp',
      '/assets/angel/angel-quill-cursor-v2.png'
    ]
  };

  const decodedAssets = new Map();
  const preparedThemes = new Map();
  const fullyPreparedThemes = new Set();
  let serviceWorkerReady = null;

  function decodeImage(src) {
    if (decodedAssets.has(src)) return decodedAssets.get(src);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (typeof image.decode === 'function') image.decode().catch(() => {}).finally(resolve);
        else resolve();
      };
      image.onerror = resolve;
      image.src = src;
    });
    decodedAssets.set(src, promise);
    return promise;
  }

  function registerCacheWorker() {
    if (serviceWorkerReady) return serviceWorkerReady;
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null);
    serviceWorkerReady = navigator.serviceWorker.register('/theme-cache-sw.js', { scope: '/' })
      .then(() => navigator.serviceWorker.ready)
      .catch(error => {
        console.warn('[theme-cache] Service worker unavailable:', error.message);
        return null;
      });
    return serviceWorkerReady;
  }

  function warmPersistentCache(theme) {
    const assets = THEME_ASSETS[theme];
    if (!assets) return;
    void registerCacheWorker().then(registration => {
      const worker = registration && (registration.active || registration.waiting || registration.installing);
      if (worker) worker.postMessage({ type: 'WARM_THEME', theme, assets });
    });
  }

  function prepare(theme) {
    const assets = THEME_ASSETS[theme];
    if (!assets) return Promise.resolve();
    warmPersistentCache(theme);
    if (!preparedThemes.has(theme)) {
      // Decode only the first-view artwork immediately. The rest is warmed
      // during idle time so login/game scripts retain network priority.
      preparedThemes.set(theme, Promise.allSettled(assets.slice(0, 5).map(decodeImage)));
      runWhenIdle(() => {
        if (fullyPreparedThemes.has(theme)) return;
        fullyPreparedThemes.add(theme);
        assets.slice(5).forEach(src => void decodeImage(src));
      }, 1800);
    }
    return preparedThemes.get(theme);
  }

  function runWhenIdle(callback, timeout = 2500) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout });
    } else {
      window.setTimeout(callback, Math.min(timeout, 1200));
    }
  }

  function updateVisibilityState() {
    document.documentElement.classList.toggle('theme-effects-paused', document.hidden);
  }

  document.addEventListener('visibilitychange', updateVisibilityState, { passive: true });
  updateVisibilityState();

  const savedTheme = localStorage.getItem('grTheme');
  if (THEME_ASSETS[savedTheme]) void prepare(savedTheme);

  window.addEventListener('load', () => {
    runWhenIdle(() => {
      void registerCacheWorker();
      Object.keys(THEME_ASSETS).forEach((theme, index) => {
        window.setTimeout(() => warmPersistentCache(theme), index * 900);
      });
    });
  }, { once: true });

  window.ThemePerformance = Object.freeze({ prepare, manifests: THEME_ASSETS });
})();
