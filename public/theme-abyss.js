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

// A real jellyfish silhouette, redesigned for a smoother, softer, more
// luminescent read (the scalloped bell edge + hard tentacle dots in the
// previous version read as "spiky"/uncanny rather than glowing). Changes:
// a single smooth dome (no notches), three stacked glow layers so the bell
// looks lit from deep within rather than just tinted, and thin translucent
// ribbon tentacles that taper (wide+soft near the bell, hairline by the tip)
// instead of a uniform-width stroke with hard dots. `mirror` bakes the flip
// as an SVG-internal <g transform> (not a CSS transform on the element),
// which matters because the element itself may also carry an independent
// CSS drift/bob animation — animated CSS transforms fully replace whatever
// inline transform was on that same element, so mirroring at the DOM level
// would keep getting silently discarded (this bit us twice already on the
// fish/anglerfish). Baking it into the SVG's own markup sidesteps that
// entirely. `uid` keeps gradient ids collision-free across instances.
let _abyssJellyUidSeq = 0;
function abyssJellySvgBell(bell, glow, core, mirror) {
  core = core || '#ffffff';
  const uid = 'j' + (_abyssJellyUidSeq++);
  const g = mirror ? `<g transform="translate(94,0) scale(-1,1)">` : `<g>`;
  return `
  <svg width="94" height="190" viewBox="0 0 94 190" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <defs>
      <radialGradient id="bellGrad-${uid}" cx="46%" cy="24%" r="72%">
        <stop offset="0%" stop-color="${core}" stop-opacity="1"/>
        <stop offset="22%" stop-color="${core}" stop-opacity="0.92"/>
        <stop offset="50%" stop-color="${bell}" stop-opacity="0.68"/>
        <stop offset="100%" stop-color="${bell}" stop-opacity="0.16"/>
      </radialGradient>
      <radialGradient id="coreGlow-${uid}" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="${core}" stop-opacity="1"/>
        <stop offset="55%" stop-color="${glow}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="tentGrad-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${glow}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${g}
      <!-- Outer soft bloom, sitting behind the bell for a "lit from within" halo -->
      <ellipse cx="47" cy="42" rx="52" ry="52" fill="url(#coreGlow-${uid})" opacity="0.85"/>
      <g class="bell">
        <path d="M6 52 C6 16 24 2 47 2 C70 2 88 16 88 52 C88 66 78 76 66 80 C60 84 54 84 47 84 C40 84 34 84 28 80 C16 76 6 66 6 52 Z"
              fill="url(#bellGrad-${uid})" stroke="${core}" stroke-width="0.9" stroke-opacity="0.7"/>
        <ellipse cx="47" cy="30" rx="26" ry="19" fill="url(#coreGlow-${uid})" opacity="0.75"/>
        <path d="M20 22 C27 38 27 54 23 70" fill="none" stroke="${core}" stroke-opacity="0.35" stroke-width="1"/>
        <path d="M47 8 C49 30 49 54 47 76" fill="none" stroke="${core}" stroke-opacity="0.55" stroke-width="1.2"/>
        <path d="M74 22 C67 38 67 54 71 70" fill="none" stroke="${core}" stroke-opacity="0.32" stroke-width="1"/>
        <ellipse cx="33" cy="18" rx="9" ry="13" fill="#ffffff" opacity="0.55"/>
      </g>
      <!-- Ribbon tentacles: a tapered fill shape (wide at the bell, hairline at
           the tip) filled with a top-to-bottom fade, instead of a uniform
           stroke — reads as translucent membrane rather than a hard line. -->
      <g class="tentacle" style="--sway-dur:6.5s;--sway-delay:0s">
        <path d="M20 78 C10 104 30 122 16 150 C9 168 22 178 14 194 C13 194 12 193 12 192 C18 178 8 168 14 150 C26 122 8 104 16 78 Z" fill="url(#tentGrad-${uid})"/>
      </g>
      <g class="tentacle" style="--sway-dur:7.8s;--sway-delay:0.9s">
        <path d="M38 82 C33 108 49 124 39 154 C33 172 44 182 37 196 C36 196 35 195 35 194 C41 182 31 172 36 154 C46 124 30 108 35 82 Z" fill="url(#tentGrad-${uid})" opacity="0.85"/>
      </g>
      <g class="tentacle" style="--sway-dur:6.9s;--sway-delay:1.6s">
        <path d="M56 82 C61 108 45 124 55 154 C61 172 50 182 57 196 C58 196 59 195 59 194 C53 182 63 172 58 154 C48 124 64 108 59 82 Z" fill="url(#tentGrad-${uid})" opacity="0.85"/>
      </g>
      <g class="tentacle" style="--sway-dur:7.2s;--sway-delay:0.4s">
        <path d="M74 78 C84 104 64 122 78 150 C85 168 72 178 80 194 C81 194 82 193 82 192 C76 178 86 168 80 150 C68 122 86 104 78 78 Z" fill="url(#tentGrad-${uid})"/>
      </g>
      <g class="tentacle" style="--sway-dur:5.6s;--sway-delay:1.1s">
        <path d="M47 80 C45 96 51 108 47 126 C44 142 51 150 47 164 C46.5 164 46 163.5 46 163 C50 150 43 142 46 126 C50 108 44 96 46 80 Z" fill="url(#tentGrad-${uid})" opacity="0.6"/>
      </g>
    </g>
  </svg>`;
}

// A second, visually distinct species: a flatter, wider "moon jelly" — real
// moon jellies are famous for a near-flat saucer bell with a visible
// four-leaf-clover gonad pattern showing through the translucent top, and
// only short frilly oral arms (no long trailing tentacles). Deliberately
// a different silhouette, not just a recolor of the bell-jelly above.
function abyssJellySvgMoon(bell, glow, core, mirror) {
  core = core || '#ffffff';
  const uid = 'm' + (_abyssJellyUidSeq++);
  const g = mirror ? `<g transform="translate(120,0) scale(-1,1)">` : `<g>`;
  return `
  <svg width="120" height="70" viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <defs>
      <radialGradient id="mBellGrad-${uid}" cx="50%" cy="38%" r="60%">
        <stop offset="0%" stop-color="${core}" stop-opacity="1"/>
        <stop offset="30%" stop-color="${core}" stop-opacity="0.85"/>
        <stop offset="62%" stop-color="${bell}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${bell}" stop-opacity="0.12"/>
      </radialGradient>
      <radialGradient id="mCoreGlow-${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${core}" stop-opacity="1"/>
        <stop offset="55%" stop-color="${glow}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${g}
      <ellipse cx="60" cy="34" rx="62" ry="42" fill="url(#mCoreGlow-${uid})" opacity="0.8"/>
      <ellipse cx="60" cy="30" rx="56" ry="26" fill="url(#mBellGrad-${uid})" stroke="${core}" stroke-width="0.8" stroke-opacity="0.6"/>
      <!-- Four-leaf-clover gonad pattern, the moon jelly's signature marking -->
      <g opacity="0.55" fill="${glow}">
        <ellipse cx="46" cy="24" rx="8" ry="6"/>
        <ellipse cx="74" cy="24" rx="8" ry="6"/>
        <ellipse cx="46" cy="36" rx="8" ry="6"/>
        <ellipse cx="74" cy="36" rx="8" ry="6"/>
      </g>
      <!-- Short frilly oral arms instead of long tentacles -->
      <g class="tentacle" style="--sway-dur:5.4s;--sway-delay:0s" stroke="${glow}" stroke-opacity="0.6" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M40 50 C36 60 42 66 38 74"/>
      </g>
      <g class="tentacle" style="--sway-dur:6.1s;--sway-delay:0.5s" stroke="${glow}" stroke-opacity="0.55" stroke-width="2" fill="none" stroke-linecap="round">
        <path d="M52 54 C49 63 54 68 51 76"/>
      </g>
      <g class="tentacle" style="--sway-dur:5.8s;--sway-delay:0.9s" stroke="${glow}" stroke-opacity="0.55" stroke-width="2" fill="none" stroke-linecap="round">
        <path d="M68 54 C71 63 66 68 69 76"/>
      </g>
      <g class="tentacle" style="--sway-dur:6.4s;--sway-delay:0.3s" stroke="${glow}" stroke-opacity="0.6" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M80 50 C84 60 78 66 82 74"/>
      </g>
    </g>
  </svg>`;
}

const ABYSS_JELLY_BUILDERS = [abyssJellySvgBell, abyssJellySvgMoon];
function abyssJellySvg(bell, glow, core, mirror) {
  const builder = ABYSS_JELLY_BUILDERS[Math.floor(Math.random() * ABYSS_JELLY_BUILDERS.length)];
  return builder(bell, glow, core, mirror);
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

// Two more species: a manta/ray with wide sweeping fins, and a tiny curled
// seahorse (which doesn't really "swim forward" horizontally in real life,
// but drifting slowly sideways like the others reads fine here and adds
// silhouette variety).
function abyssFishSvgManta(color) {
  return `
  <svg width="46" height="22" viewBox="0 0 46 22" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 4 C14 -2 2 4 1 11 C2 9 10 6 20 10 C10 13 2 15 1 13 C4 19 16 22 23 16 C30 22 42 19 45 13 C44 15 36 13 26 10 C36 6 44 9 45 11 C44 4 32 -2 23 4 Z" fill="${color}" opacity="0.72"/>
    <circle cx="23" cy="8" r="1" fill="#04121c"/>
  </svg>`;
}
function abyssFishSvgSeahorse(color) {
  return `
  <svg width="18" height="30" viewBox="0 0 18 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 2 C14 2 15 6 12 8 C16 9 16 14 12 15 C15 17 14 22 10 22 C11 24 9 26 7 25 C4 24 5 21 7 21 C4 20 3 16 6 14 C3 13 3 9 6 8 C4 7 5 3 9 2 Z" fill="${color}" opacity="0.8"/>
    <path d="M9 4 L6 1" fill="none" stroke="${color}" stroke-width="1" opacity="0.7"/>
    <circle cx="10" cy="6" r="0.9" fill="#04121c"/>
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
const ABYSS_FISH_BUILDERS = [
  abyssFishSvgRound, abyssFishSvgRibbon, abyssFishSvgLantern,
  abyssFishSvgManta, abyssFishSvgSeahorse,
];

let _abyssJellyEls = [];
let _abyssJellyTimer = null;
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

  // Jellyfish now actually swim across the screen (slowly, real jellyfish
  // aren't fast) instead of bobbing in place forever. Each one is spawned
  // with a random start point, a random long-ish travel distance/duration
  // (so speed visibly varies between individuals), and removes itself when
  // its drift finishes — same self-cleaning spawn/schedule pattern as the
  // fish/anglerfish. Size is set via the <svg>'s own width/height (a plain
  // CSS box size, not a `transform`), so it can't collide with the drift
  // animation on the outer element or the bob animation on the inner one.
  const spawnJelly = () => {
    const palette = ABYSS_JELLY_PALETTE[Math.floor(Math.random() * ABYSS_JELLY_PALETTE.length)];
    const el = document.createElement('div');
    el.className = 'abyss-jelly';
    const startTop = 4 + Math.random() * 78;
    const startLeft = 4 + Math.random() * 78;
    el.style.top = startTop + '%';
    el.style.left = startLeft + '%';
    el.style.setProperty('--glow', palette.glow + 'a8'); // stronger glow alpha (was ~35%, now ~66%)
    el.style.setProperty('--jelly-opacity', (0.75 + Math.random() * 0.2).toFixed(2));
    // Long, slow, mostly-horizontal wander with a little vertical drift —
    // real jellyfish pulse gently and mostly get pushed sideways by current.
    const dx = (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 45); // vw
    const dy = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 18); // vh
    el.style.setProperty('--dx', dx + 'vw');
    el.style.setProperty('--dy', dy + 'vh');
    const driftDur = 32 + Math.random() * 40; // 32-72s: visibly different speeds
    el.style.setProperty('--drift-dur', driftDur + 's');
    el.style.setProperty('--float-dur', (7 + Math.random() * 4) + 's');
    el.style.setProperty('--pulse-dur', (3 + Math.random() * 1.4) + 's');
    el.innerHTML = abyssJellySvg(palette.bell, palette.glow, palette.core, Math.random() < 0.5);
    const svg = el.firstElementChild;
    // Scale from the SVG's own native viewBox size rather than a hardcoded
    // base — the bell-jelly (94x190) and moon-jelly (120x70) builders have
    // very different native aspect ratios, so a one-size-fits-all base
    // would badly stretch/squash whichever one wasn't picked.
    const [, , vbW, vbH] = (svg.getAttribute('viewBox') || '0 0 94 190').split(' ').map(Number);
    const scale = 0.55 + Math.random() * 0.55;
    svg.setAttribute('width', Math.round(vbW * scale));
    svg.setAttribute('height', Math.round(vbH * scale));
    layer.appendChild(el);
    _abyssJellyEls.push(el);
    setTimeout(() => { el.remove(); _abyssJellyEls = _abyssJellyEls.filter(j => j !== el); }, driftDur * 1000 + 500);
  };
  // Seed a handful right away, staggered, so the screen doesn't start empty
  // while waiting for the first scheduled spawn.
  for (let i = 0; i < 6; i++) setTimeout(spawnJelly, i * 400);
  const scheduleJelly = () => {
    _abyssJellyTimer = setTimeout(() => {
      if (document.body.classList.contains('theme-abyss')) spawnJelly();
      scheduleJelly();
    }, 5000 + Math.random() * 6000);
  };
  scheduleJelly();

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
    // abyssAnglerSwim always moves left-to-right (there's no rtl variant),
    // and the artwork's mouth/head is drawn facing left by default — so it
    // must always be mirrored to actually face the direction it swims.
    // Previously this was a coin flip unrelated to the real (fixed) travel
    // direction, so it was facing backward about half the time.
    el.firstElementChild.style.transform = 'scaleX(-1)';
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
    // The fish artwork is drawn facing LEFT by default (eye/head on the
    // left, tail fin on the right) — so it only needs flipping when it's
    // actually swimming RIGHT (rtl === false). Previously this condition
    // was backwards, so every fish visibly swam tail-first.
    if (!rtl) el.firstElementChild.style.transform = 'scaleX(-1)';
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
  clearTimeout(_abyssJellyTimer); _abyssJellyTimer = null;
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
