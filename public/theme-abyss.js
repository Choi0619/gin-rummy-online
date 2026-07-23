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

// A real jellyfish silhouette: a domed bell with rib lines, four long
// independently-swaying tentacles (each its own <g class="tentacle"> with a
// naturally wavy pre-drawn curve — no path morphing needed), and a cluster
// of shorter frilly oral arms underneath. `hue`/`glow` let us recolor the
// same detailed artwork per-instance for variety without duplicating markup.
function abyssJellySvg(bell, glow) {
  return `
  <svg width="70" height="150" viewBox="0 0 70 150" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <defs>
      <radialGradient id="bellGrad" cx="42%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="45%" stop-color="${bell}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${bell}" stop-opacity="0.12"/>
      </radialGradient>
    </defs>
    <g class="bell">
      <path d="M6 40 C6 14 24 2 35 2 C46 2 64 14 64 40 C64 52 56 58 46 60 C50 66 46 70 40 68 C42 74 36 76 33 70 C30 76 24 74 26 68 C20 70 16 64 20 58 C12 56 6 50 6 40 Z"
            fill="url(#bellGrad)" stroke="${bell}" stroke-width="1.1" stroke-opacity="0.7"/>
      <path d="M14 20 C20 34 20 46 16 56" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1"/>
      <path d="M35 8 C37 24 37 42 35 60" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1"/>
      <path d="M54 20 C48 34 48 46 52 56" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1"/>
      <ellipse cx="26" cy="18" rx="6" ry="9" fill="#ffffff" opacity="0.5"/>
    </g>
    <g class="tentacle" style="--sway-dur:4.1s;--sway-delay:0s" stroke="${glow}" stroke-opacity="0.55" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M18 62 C10 80 26 92 16 108 C8 120 22 130 14 144"/>
    </g>
    <g class="tentacle" style="--sway-dur:5.2s;--sway-delay:0.6s" stroke="${glow}" stroke-opacity="0.5" stroke-width="1.5" fill="none" stroke-linecap="round">
      <path d="M30 66 C26 86 38 96 30 114 C24 128 34 136 28 148"/>
    </g>
    <g class="tentacle" style="--sway-dur:4.6s;--sway-delay:1.1s" stroke="${glow}" stroke-opacity="0.5" stroke-width="1.5" fill="none" stroke-linecap="round">
      <path d="M42 66 C46 86 34 96 42 114 C48 128 38 136 44 148"/>
    </g>
    <g class="tentacle" style="--sway-dur:4.9s;--sway-delay:0.3s" stroke="${glow}" stroke-opacity="0.55" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M52 62 C60 80 44 92 54 108 C62 120 48 130 56 144"/>
    </g>
    <g class="tentacle" style="--sway-dur:3.8s;--sway-delay:0.8s" stroke="${glow}" stroke-opacity="0.35" stroke-width="1" fill="none" stroke-linecap="round">
      <path d="M35 64 C33 76 37 84 35 96 C33 106 37 112 35 122"/>
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

// A tiny, cheap silhouette for background swimmers — deliberately simple
// since several of these can be inferred on screen; detail budget is spent
// on the jellyfish/anglerfish instead.
function abyssFishSvg(color) {
  return `
  <svg width="34" height="18" viewBox="0 0 34 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 9 C8 2 20 2 26 9 C20 16 8 16 2 9 Z" fill="${color}" opacity="0.8"/>
    <path d="M26 9 L34 3 L30 9 L34 15 Z" fill="${color}" opacity="0.8"/>
    <circle cx="8" cy="8" r="1" fill="#04121c"/>
  </svg>`;
}

const ABYSS_JELLY_PALETTE = [
  { bell: '#6fe3ff', glow: '#4dfff0' },
  { bell: '#a98bff', glow: '#8a6bff' },
  { bell: '#7fd9ff', glow: '#6fc9ff' },
];
const ABYSS_FISH_COLORS = ['#3fd8c8', '#6a8fff', '#4db8e8'];

let _abyssJellyEls = [];
let _abyssBubbleTimer = null;
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

  // 3 jellyfish, placed once and left to drift in place for as long as the
  // theme is active — no re-creation, no per-frame cost, just a handful of
  // long-running CSS loops on a handful of elements.
  const spots = [
    { top: '12%', left: '8%' }, { top: '55%', left: '85%' }, { top: '70%', left: '18%' },
  ];
  spots.forEach((pos, i) => {
    const palette = ABYSS_JELLY_PALETTE[i % ABYSS_JELLY_PALETTE.length];
    const el = document.createElement('div');
    el.className = 'abyss-jelly';
    el.style.top = pos.top;
    el.style.left = pos.left;
    el.style.setProperty('--glow', palette.glow + '59');
    el.style.setProperty('--float-dur', (9 + i * 1.7) + 's');
    el.style.setProperty('--float-delay', (i * 1.3) + 's');
    el.style.setProperty('--pulse-dur', (3.2 + i * 0.4) + 's');
    el.style.setProperty('--pulse-delay', (i * 0.5) + 's');
    el.style.opacity = '0.85';
    el.style.transform = i % 2 ? 'scaleX(-0.6) scale(0.6)' : 'scale(0.6)';
    el.innerHTML = abyssJellySvg(palette.bell, palette.glow);
    layer.appendChild(el);
    _abyssJellyEls.push(el);
  });

  // Rising bubbles, one-shot elements that self-remove after their CSS
  // animation finishes.
  const spawnBubble = () => {
    const el = document.createElement('div');
    const size = 4 + Math.random() * 9;
    el.className = 'abyss-bubble';
    el.style.left = (Math.random() * 100) + 'vw';
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

  // Rare anglerfish crossing — the deep-sea "wow" moment. Self-removes.
  const spawnAngler = () => {
    const el = document.createElement('div');
    el.className = 'abyss-anglerfish';
    el.style.setProperty('--y', (15 + Math.random() * 55) + '%');
    el.style.setProperty('--swim-dur', (22 + Math.random() * 10) + 's');
    if (Math.random() < 0.5) el.style.transform = 'scaleX(-1)';
    el.innerHTML = abyssAnglerSvg();
    document.getElementById('abyssLayer')?.appendChild(el);
    setTimeout(() => el.remove(), 34000);
  };
  const scheduleAngler = () => {
    _abyssAnglerTimer = setTimeout(() => {
      if (document.body.classList.contains('theme-abyss')) spawnAngler();
      scheduleAngler();
    }, 25000 + Math.random() * 20000);
  };
  scheduleAngler();

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
    if (rtl) el.style.transform = 'scaleX(-1)';
    el.innerHTML = abyssFishSvg(color);
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
  jelly.innerHTML = abyssJellySvg('#ffe27a', '#ffd76a');
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
