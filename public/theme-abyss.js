// ===================================================================
// Theme: Abyss (심연) — jellyfish / anglerfish / bubble spawners.
// Kept in its own file (loaded only via <script src>, never inlined into
// index.html's giant <style>/<script> blocks) so the artwork here can be
// as detailed as it needs to be without bloating the main file. Everything
// this file creates is driven by CSS animations in theme-abyss.css that
// only touch transform/opacity — this file's job is just to build the DOM
// once and schedule when new creatures appear, not to animate anything
// itself (no per-frame JS at all).
// ===================================================================

// A real jellyfish silhouette: a domed, scalloped bell lit from within by a
// layered glow (core hotspot + mid color + outer bloom, like the reference
// photo), four long independently-swaying tentacles (each its own
// <g class="tentacle"> with a naturally wavy pre-drawn curve — no path
// morphing needed) with small bioluminescent dots strung along them, and
// frilly oral arms underneath. `uid` makes every gradient id unique per
// instance — reusing the same id ("bellGrad" etc.) across multiple jellies
// on the same page is an SVG id collision, and every instance had silently
// been resolving to the FIRST jelly's gradient regardless of its own colors.
let _abyssJellyUidSeq = 0;
function abyssJellySvg(bell, glow, core) {
  core = core || '#ffffff';
  const uid = 'j' + (_abyssJellyUidSeq++);
  return `
  <svg width="94" height="190" viewBox="0 0 94 190" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <defs>
      <radialGradient id="bellGrad-${uid}" cx="44%" cy="26%" r="68%">
        <stop offset="0%" stop-color="${core}" stop-opacity="0.98"/>
        <stop offset="30%" stop-color="${bell}" stop-opacity="0.85"/>
        <stop offset="68%" stop-color="${bell}" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="${bell}" stop-opacity="0.08"/>
      </radialGradient>
      <radialGradient id="coreGlow-${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${core}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${core}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <g class="bell">
      <path d="M8 54 C8 20 30 3 47 3 C64 3 86 20 86 54 C86 70 74 78 62 81 C67 89 62 94 54 91 C57 99 48 102 44 94 C40 102 31 99 34 91 C26 94 21 89 26 81 C14 78 8 70 8 54 Z"
            fill="url(#bellGrad-${uid})" stroke="${bell}" stroke-width="1.2" stroke-opacity="0.75"/>
      <ellipse cx="47" cy="34" rx="30" ry="22" fill="url(#coreGlow-${uid})" opacity="0.55"/>
      <path d="M18 26 C26 44 26 62 21 76" fill="none" stroke="${core}" stroke-opacity="0.4" stroke-width="1.1"/>
      <path d="M47 10 C50 32 50 56 47 81" fill="none" stroke="${core}" stroke-opacity="0.5" stroke-width="1.2"/>
      <path d="M76 26 C68 44 68 62 73 76" fill="none" stroke="${core}" stroke-opacity="0.35" stroke-width="1.1"/>
      <ellipse cx="34" cy="22" rx="8" ry="12" fill="#ffffff" opacity="0.55"/>
    </g>
    <g class="tentacle" style="--sway-dur:4.1s;--sway-delay:0s" stroke="${glow}" stroke-opacity="0.62" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M24 84 C13 108 34 124 21 146 C11 162 29 175 18 192"/>
      <circle cx="18" cy="110" r="1.4" fill="${core}" opacity="0.85"/>
      <circle cx="15" cy="150" r="1.2" fill="${core}" opacity="0.7"/>
    </g>
    <g class="tentacle" style="--sway-dur:5.2s;--sway-delay:0.6s" stroke="${glow}" stroke-opacity="0.55" stroke-width="1.8" fill="none" stroke-linecap="round">
      <path d="M40 89 C35 114 51 128 40 152 C33 170 46 180 38 196"/>
      <circle cx="42" cy="118" r="1.3" fill="${core}" opacity="0.8"/>
    </g>
    <g class="tentacle" style="--sway-dur:4.6s;--sway-delay:1.1s" stroke="${glow}" stroke-opacity="0.55" stroke-width="1.8" fill="none" stroke-linecap="round">
      <path d="M55 89 C60 114 44 128 55 152 C62 170 49 180 57 196"/>
      <circle cx="53" cy="122" r="1.3" fill="${core}" opacity="0.8"/>
    </g>
    <g class="tentacle" style="--sway-dur:4.9s;--sway-delay:0.3s" stroke="${glow}" stroke-opacity="0.62" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M70 84 C81 108 60 124 73 146 C83 162 65 175 76 192"/>
      <circle cx="76" cy="112" r="1.4" fill="${core}" opacity="0.85"/>
      <circle cx="79" cy="152" r="1.2" fill="${core}" opacity="0.7"/>
    </g>
    <g class="tentacle" style="--sway-dur:3.8s;--sway-delay:0.8s" stroke="${glow}" stroke-opacity="0.4" stroke-width="1.2" fill="none" stroke-linecap="round">
      <path d="M47 82 C44 96 50 106 47 122 C44 136 50 144 47 158"/>
    </g>
  </svg>`;
}

// A simplified anglerfish: bulbous body, jagged teeth line, and the
// signature glowing lure on a stalk. The lure's pulse is its own CSS
// animation (abyssLurePulse) so it keeps glowing independent of the swim.
function abyssAnglerSvg() {
  return `
  <svg width="120" height="70" viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <defs>
      <radialGradient id="lureGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff7c9"/>
        <stop offset="60%" stop-color="#ffe27a" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#ffe27a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1c2e40"/>
        <stop offset="100%" stop-color="#060d16"/>
      </linearGradient>
    </defs>
    <path d="M20 38 C20 20 42 10 62 14 C82 18 96 28 108 34 L96 38 L108 42 C96 46 82 50 66 52 C44 56 20 52 16 40 Z"
          fill="url(#bodyGrad)" stroke="#4a6a82" stroke-width="1" stroke-opacity="0.6"/>
    <path d="M22 34 L14 30 L16 38 L14 46 L22 42 Z" fill="#0a1420"/>
    <circle cx="46" cy="30" r="2.6" fill="#bfe8ff" opacity="0.85"/>
    <path d="M30 42 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6" fill="none" stroke="#8fa9bd" stroke-width="1" opacity="0.5"/>
    <path d="M50 16 C54 4 62 2 64 8 C66 4 72 6 70 12" fill="none" stroke="#6a889e" stroke-width="1.3"/>
    <g class="lure">
      <circle cx="70" cy="10" r="9" fill="url(#lureGlow)"/>
      <circle cx="70" cy="10" r="2.6" fill="#fff7c9"/>
    </g>
  </svg>`;
}

// Three small, cheap background-swimmer silhouettes instead of one repeated
// shape — a round school fish, a slim ribbon/eel, and a spiny lanternfish.
// Still deliberately simple (a handful of these can be on screen at once),
// but three shapes read as a real ecosystem instead of one sprite copy-pasted.
function abyssFishSvgRound(color) {
  return `
  <svg width="34" height="18" viewBox="0 0 34 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 9 C8 2 20 2 26 9 C20 16 8 16 2 9 Z" fill="${color}" opacity="0.82"/>
    <path d="M26 9 L34 3 L30 9 L34 15 Z" fill="${color}" opacity="0.82"/>
    <circle cx="8" cy="8" r="1" fill="#04121c"/>
  </svg>`;
}
function abyssFishSvgRibbon(color) {
  return `
  <svg width="46" height="14" viewBox="0 0 46 14" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 7 C10 1 20 12 30 6 C36 3 42 5 45 7 C42 9 36 11 30 8 C20 2 10 13 1 7 Z" fill="${color}" opacity="0.75"/>
    <circle cx="6" cy="7" r="0.9" fill="#04121c"/>
  </svg>`;
}
function abyssFishSvgLantern(color, lureColor) {
  return `
  <svg width="30" height="20" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <path d="M3 10 C3 3 12 1 18 4 C24 7 26 13 22 16 C15 20 5 17 3 10 Z" fill="${color}" opacity="0.85"/>
    <path d="M22 10 L29 6 L26 10 L29 14 Z" fill="${color}" opacity="0.85"/>
    <path d="M9 3 C9 -2 13 -2 12 2" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="12" cy="1" r="1.6" fill="${lureColor || '#fff3c4'}" opacity="0.9"/>
    <circle cx="9" cy="9" r="1" fill="#04121c"/>
  </svg>`;
}

const ABYSS_JELLY_PALETTE = [
  { bell: '#6fe3ff', glow: '#4dfff0', core: '#eafcff' },
  { bell: '#a98bff', glow: '#8a6bff', core: '#f0e8ff' },
  { bell: '#7fd9ff', glow: '#6fc9ff', core: '#ffffff' },
  // Warm bioluminescent variant, closer to the reference photo's golden bell.
  { bell: '#ff9d4d', glow: '#ffb347', core: '#fff3c4' },
];
const ABYSS_FISH_COLORS = ['#3fd8c8', '#6a8fff', '#4db8e8', '#ffb347'];
const ABYSS_FISH_BUILDERS = [abyssFishSvgRound, abyssFishSvgRibbon, abyssFishSvgLantern];

let _abyssJellyEls = [];
let _abyssBubbleTimer = null;
let _abyssClusterTimer = null;
let _abyssAnglerTimer = null;
let _abyssFishTimer = null;
let _abyssGlowEl = null;
let _abyssGlowRAF = null;
let _abyssGlowTarget = { x: -100, y: -100 };

function _abyssPointerMove(e) {
  _abyssGlowTarget.x = e.clientX;
  _abyssGlowTarget.y = e.clientY;
  // rAF-throttled: no matter how fast mousemove fires, the glow element is
  // repositioned at most once per rendered frame, and only ever via
  // `transform` (never left/top), so this never triggers layout.
  if (!_abyssGlowRAF) _abyssGlowRAF = requestAnimationFrame(_abyssGlowTick);
}
function _abyssGlowTick() {
  _abyssGlowRAF = null;
  if (_abyssGlowEl) _abyssGlowEl.style.transform = `translate3d(${_abyssGlowTarget.x}px, ${_abyssGlowTarget.y}px, 0)`;
}

function startAbyssTheme() {
  stopAbyssTheme();
  const layer = document.getElementById('abyssLayer');
  if (!layer) return;

  // Underwater light-ray sweep across the whole board (see theme-abyss.css
  // for why this is transform-panned rather than the cheaper-looking but
  // actually-expensive background-position approach).
  const caustics = document.createElement('div');
  caustics.className = 'abyss-caustics';
  layer.appendChild(caustics);

  // Cursor glow trail — one element, repositioned via JS on pointermove.
  _abyssGlowEl = document.createElement('div');
  _abyssGlowEl.className = 'abyss-cursor-glow';
  layer.appendChild(_abyssGlowEl);
  document.addEventListener('pointermove', _abyssPointerMove);

  // 6 jellyfish, placed once and left to drift in place for as long as the
  // theme is active — no re-creation, no per-frame cost, just a handful of
  // long-running CSS loops on a handful of elements. Spread across more of
  // the viewport (including a couple of mid-height spots, not just corners)
  // and sized up a bit — 3 tucked at 0.6x in the edges read as "almost
  // nothing" on a lobby screen where the eye is mostly on the center card.
  const spots = [
    { top: '10%', left: '6%' }, { top: '58%', left: '88%' }, { top: '72%', left: '14%' },
    { top: '34%', left: '92%' }, { top: '46%', left: '3%' }, { top: '82%', left: '70%' },
  ];
  spots.forEach((pos, i) => {
    const palette = ABYSS_JELLY_PALETTE[i % ABYSS_JELLY_PALETTE.length];
    const el = document.createElement('div');
    el.className = 'abyss-jelly';
    el.style.top = pos.top;
    el.style.left = pos.left;
    el.style.setProperty('--glow', palette.glow + '59');
    el.style.setProperty('--float-dur', (8 + i * 1.4) + 's');
    el.style.setProperty('--float-delay', (i * 1.1) + 's');
    el.style.setProperty('--pulse-dur', (3.2 + i * 0.35) + 's');
    el.style.setProperty('--pulse-delay', (i * 0.4) + 's');
    el.style.opacity = '0.9';
    const scale = 0.72 + (i % 3) * 0.08;
    // A single scale(x,y) call with a negative x mirrors horizontally without
    // compounding two separate scale transforms (scaleX(-s) followed by
    // scale(s) multiplies to s*-s, silently shrinking/warping it further).
    el.style.transform = i % 2 ? `scale(${-scale}, ${scale})` : `scale(${scale})`;
    el.innerHTML = abyssJellySvg(palette.bell, palette.glow, palette.core);
    layer.appendChild(el);
    _abyssJellyEls.push(el);
  });

  // Rising bubbles, one-shot elements that self-remove after their CSS
  // animation finishes.
  const spawnBubble = (fromLeft) => {
    const el = document.createElement('div');
    const size = 4 + Math.random() * 9;
    el.className = 'abyss-bubble';
    el.style.left = (fromLeft !== undefined ? fromLeft : Math.random() * 100) + 'vw';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.setProperty('--drift', (Math.random() * 40 - 20) + 'px');
    el.style.animationDuration = (7 + Math.random() * 6) + 's';
    document.getElementById('abyssLayer')?.appendChild(el);
    setTimeout(() => el.remove(), 14000);
  };
  const scheduleBubble = () => {
    _abyssBubbleTimer = setTimeout(() => {
      if (document.body.classList.contains('theme-abyss')) spawnBubble();
      scheduleBubble();
    }, 900 + Math.random() * 1400);
  };
  scheduleBubble();

  // Periodic bubble-cluster burst — a handful of bubbles rising together
  // from roughly the same spot (like a real cluster breaking off the
  // seafloor/a vent), instead of only the steady single-bubble trickle
  // above. Same spawnBubble() one-shot elements, just several fired in a
  // tight burst from a shared origin with slight spread.
  const spawnBubbleCluster = () => {
    const originVw = 8 + Math.random() * 84;
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      setTimeout(() => spawnBubble(originVw + (Math.random() * 8 - 4)), i * 90 + Math.random() * 60);
    }
  };
  const scheduleBubbleCluster = () => {
    _abyssClusterTimer = setTimeout(() => {
      if (document.body.classList.contains('theme-abyss')) spawnBubbleCluster();
      scheduleBubbleCluster();
    }, 7000 + Math.random() * 8000);
  };
  scheduleBubbleCluster();

  // Rare anglerfish crossing — the deep-sea "wow" moment. Self-removes.
  const spawnAngler = () => {
    const el = document.createElement('div');
    el.className = 'abyss-anglerfish';
    el.style.setProperty('--y', (15 + Math.random() * 55) + '%');
    el.style.setProperty('--swim-dur', (18 + Math.random() * 8) + 's');
    el.innerHTML = abyssAnglerSvg();
    // Same reasoning as the fish above: mirror the inner <svg>, since `el`'s
    // transform belongs to the abyssAnglerSwim animation.
    if (Math.random() < 0.5) el.firstElementChild.style.transform = 'scaleX(-1)';
    document.getElementById('abyssLayer')?.appendChild(el);
    setTimeout(() => el.remove(), 30000);
  };
  const scheduleAngler = () => {
    _abyssAnglerTimer = setTimeout(() => {
      if (document.body.classList.contains('theme-abyss')) spawnAngler();
      scheduleAngler();
    }, 16000 + Math.random() * 14000);
  };
  scheduleAngler();
  // Also fire one shortly after the theme is switched on, instead of making
  // the first sighting wait a full 16-30s.
  setTimeout(() => { if (document.body.classList.contains('theme-abyss')) spawnAngler(); }, 3000);

  // Occasional small background fish, cheap and frequent.
  const spawnFish = () => {
    const el = document.createElement('div');
    const color = ABYSS_FISH_COLORS[Math.floor(Math.random() * ABYSS_FISH_COLORS.length)];
    const rtl = Math.random() < 0.5;
    el.className = 'abyss-fish';
    el.style.top = (10 + Math.random() * 70) + '%';
    el.style.left = rtl ? '100%' : '-40px';
    el.style.setProperty('--dx', (rtl ? -1 : 1) * (window.innerWidth + 80) + 'px');
    el.style.setProperty('--swim-dur', (14 + Math.random() * 10) + 's');
    const builder = ABYSS_FISH_BUILDERS[Math.floor(Math.random() * ABYSS_FISH_BUILDERS.length)];
    el.innerHTML = builder(color, '#fff3c4');
    // Mirror the inner <svg>, not `el` itself — `el`'s transform is owned by
    // the abyssFishSwim CSS animation (translateX), and an animated
    // transform fully replaces any inline transform on the same element for
    // its whole run, so setting the flip on `el` would just be discarded.
    if (rtl) el.firstElementChild.style.transform = 'scaleX(-1)';
    document.getElementById('abyssLayer')?.appendChild(el);
    setTimeout(() => el.remove(), 26000);
  };
  const scheduleFish = () => {
    _abyssFishTimer = setTimeout(() => {
      if (document.body.classList.contains('theme-abyss')) spawnFish();
      scheduleFish();
    }, 6000 + Math.random() * 9000);
  };
  scheduleFish();
}

function stopAbyssTheme() {
  clearTimeout(_abyssBubbleTimer); _abyssBubbleTimer = null;
  clearTimeout(_abyssClusterTimer); _abyssClusterTimer = null;
  clearTimeout(_abyssAnglerTimer); _abyssAnglerTimer = null;
  clearTimeout(_abyssFishTimer); _abyssFishTimer = null;
  document.removeEventListener('pointermove', _abyssPointerMove);
  if (_abyssGlowRAF) { cancelAnimationFrame(_abyssGlowRAF); _abyssGlowRAF = null; }
  _abyssGlowEl = null;
  const layer = document.getElementById('abyssLayer');
  if (layer) layer.innerHTML = '';
  _abyssJellyEls = [];
}

// ===== Win/lose celebration effects =====
// Called from index.html's showResult()/match-ended handlers, gated behind
// `document.body.classList.contains('theme-abyss')`, the same pattern
// already used there for Aurora/Rainbow's celebration functions.

function spawnAbyssWinBurst(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  // Bubble burst rising past the darkened result overlay (inline z-index
  // above the overlay's own z-index:300) instead of the slow ambient trickle.
  for (let i = 0; i < 26; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      const size = 5 + Math.random() * 12;
      el.className = 'abyss-bubble';
      el.style.left = (10 + Math.random() * 80) + 'vw';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.zIndex = 350;
      el.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
      el.style.animationDuration = (1.5 + Math.random() * 1.3) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3200);
    }, i * 35);
  }
  // Large jellyfish drifting behind the result card — golden colorway, real
  // multi-tentacle anatomy reused from the ambient jellyfish builder.
  const box = overlay.querySelector('.result-box');
  const jelly = document.createElement('div');
  const rtl = Math.random() < 0.5;
  jelly.className = 'abyss-win-jelly' + (rtl ? ' rtl' : '');
  jelly.innerHTML = abyssJellySvg('#ffe27a', '#ffd76a', '#fffbe6');
  if (box) overlay.insertBefore(jelly, box); else overlay.appendChild(jelly);
  setTimeout(() => jelly.remove(), 3600);
}

function spawnAbyssLoseEffect() {
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      const size = 4 + Math.random() * 8;
      el.className = 'abyss-sink-bubble';
      el.style.left = (20 + Math.random() * 60) + 'vw';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.zIndex = 350;
      el.style.setProperty('--sink-drift', (Math.random() * 40 - 20) + 'px');
      el.style.animationDuration = (2 + Math.random()) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3300);
    }, i * 90);
  }
}
