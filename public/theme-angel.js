/* Angel theme runtime: low-count ambient layers, pooled cursor particles,
   invitation arrivals and result effects. Looping motion only changes
   transform and opacity; visual textures are rasterized once by CSS. */

const ANGEL_ASSET_ROOT = '/assets/angel/';

let _angelLayer = null;
let _angelFxLayer = null;
let _angelGlow = null;
let _angelWake = null;
let _angelRAF = null;
let _angelWakeTimer = null;
let _angelPointer = { x: -100, y: -100, px: -100, py: -100, angle: 0, speed: 0 };
let _angelSparkPool = [];
let _angelSparkIndex = 0;
let _angelSparkLast = { x: -100, y: -100, time: 0 };
let _angelObserver = null;
let _angelTimers = [];

function angelRandom(min, max) {
  return min + Math.random() * (max - min);
}

function angelMotionProfile() {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = window.innerWidth < 720;
  return {
    reduced,
    compact,
    feathers: reduced ? 3 : (compact ? 6 : 11),
    orbs: reduced ? 3 : (compact ? 5 : 9),
  };
}

function angelMake(tag, className, parent) {
  const el = document.createElement(tag);
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  if (parent) parent.appendChild(el);
  return el;
}

function angelEmitSparkle(x, y, angle, small = false) {
  if (!_angelSparkPool.length) return;
  const sparkle = _angelSparkPool[_angelSparkIndex % _angelSparkPool.length];
  _angelSparkIndex += 1;
  const size = angelRandom(small ? 3 : 4.5, small ? 5 : 8);
  const tail = small ? 7 : 13;
  sparkle.style.width = size.toFixed(1) + 'px';
  sparkle.style.height = size.toFixed(1) + 'px';
  sparkle.style.setProperty('--angel-sx', (x - Math.cos(angle) * tail + angelRandom(-5, 5)).toFixed(1) + 'px');
  sparkle.style.setProperty('--angel-sy', (y - Math.sin(angle) * tail + angelRandom(-5, 5)).toFixed(1) + 'px');
  sparkle.style.setProperty('--angel-dx', angelRandom(-20, 20).toFixed(1) + 'px');
  sparkle.style.setProperty('--angel-dy', angelRandom(-22, -8).toFixed(1) + 'px');
  sparkle.style.setProperty('--angel-rot', angelRandom(120, 300).toFixed(0) + 'deg');
  sparkle.style.setProperty('--angel-dur', angelRandom(0.72, 1.08).toFixed(2) + 's');
  sparkle.className = 'angel-cursor-spark ' + (_angelSparkIndex % 2 ? 'spark-a' : 'spark-b');
}

function angelPointerMove(event) {
  if (event.pointerType === 'touch') return;
  const first = _angelPointer.px < 0;
  const dx = first ? 0 : event.clientX - _angelPointer.px;
  const dy = first ? 0 : event.clientY - _angelPointer.py;
  const distance = Math.hypot(dx, dy);
  _angelPointer.x = event.clientX;
  _angelPointer.y = event.clientY;
  _angelPointer.px = event.clientX;
  _angelPointer.py = event.clientY;
  if (distance > 0.5) _angelPointer.angle = Math.atan2(dy, dx);
  _angelPointer.speed = Math.min(distance, 24);
  if (!_angelRAF) _angelRAF = requestAnimationFrame(angelPointerTick);

  const now = Date.now();
  if (_angelSparkLast.x < 0) {
    _angelSparkLast = { x: event.clientX, y: event.clientY, time: now };
    return;
  }
  const trailX = event.clientX - _angelSparkLast.x;
  const trailY = event.clientY - _angelSparkLast.y;
  if (now - _angelSparkLast.time >= 72 && trailX * trailX + trailY * trailY >= 324) {
    angelEmitSparkle(event.clientX, event.clientY, _angelPointer.angle);
    if (_angelSparkIndex % 4 === 0) angelEmitSparkle(event.clientX, event.clientY, _angelPointer.angle, true);
    _angelSparkLast = { x: event.clientX, y: event.clientY, time: now };
  }
}

function angelPointerTick() {
  _angelRAF = null;
  if (_angelGlow) {
    _angelGlow.style.transform = `translate3d(${_angelPointer.x}px, ${_angelPointer.y}px, 0)`;
  }
  if (_angelWake) {
    const stretch = 1 + _angelPointer.speed / 34;
    _angelWake.style.transform = `translate3d(${_angelPointer.x}px, ${_angelPointer.y}px, 0) rotate(${_angelPointer.angle}rad) scaleX(${stretch})`;
    _angelWake.style.opacity = Math.min(0.38, 0.1 + _angelPointer.speed / 82).toFixed(2);
    clearTimeout(_angelWakeTimer);
    _angelWakeTimer = setTimeout(() => {
      if (_angelWake) _angelWake.style.opacity = '0';
    }, 90);
  }
}

function angelPointerDown(event) {
  if (event.pointerType === 'touch' || !_angelFxLayer) return;
  const ring = angelMake('i', 'angel-click-ring', _angelFxLayer);
  ring.style.left = event.clientX + 'px';
  ring.style.top = event.clientY + 'px';
  ring.addEventListener('animationend', () => ring.remove(), { once: true });
}

function angelDecorateConfirm() {
  const overlay = document.getElementById('confirmModalOverlay');
  if (!overlay) return;
  const title = document.getElementById('confirmModalTitle')?.textContent || '';
  const isVisible = overlay.classList.contains('show');
  overlay.classList.toggle('angel-invite-arrival', isVisible && title.includes('초대'));
  overlay.classList.toggle('angel-unlock-arrival', isVisible && title.includes('천상'));
  if (isVisible && (title.includes('초대') || title.includes('천상'))) {
    angelBurstAt(window.innerWidth / 2, Math.min(window.innerHeight * 0.42, 360), 10, 'arrival');
  }
}

function angelBurstAt(x, y, count, kind = 'spark') {
  const host = document.body;
  for (let i = 0; i < count; i++) {
    const particle = angelMake('i', 'angel-burst-particle ' + kind, host);
    const angle = Math.PI * 2 * i / count + angelRandom(-0.18, 0.18);
    const distance = angelRandom(42, kind === 'win' ? 180 : 92);
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.setProperty('--angel-bx', (Math.cos(angle) * distance).toFixed(1) + 'px');
    particle.style.setProperty('--angel-by', (Math.sin(angle) * distance - (kind === 'win' ? 36 : 10)).toFixed(1) + 'px');
    particle.style.setProperty('--angel-br', angelRandom(-240, 240).toFixed(0) + 'deg');
    particle.style.animationDelay = (i * 0.018).toFixed(2) + 's';
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
  }
}

function startAngelTheme() {
  stopAngelTheme();
  _angelLayer = document.getElementById('angelLayer');
  if (!_angelLayer) return;
  const motion = angelMotionProfile();

  const rays = angelMake('div', 'angel-godrays', _angelLayer);
  rays.appendChild(angelMake('i', 'angel-ray ray-a'));
  rays.appendChild(angelMake('i', 'angel-ray ray-b'));
  rays.appendChild(angelMake('i', 'angel-ray ray-c'));

  const clouds = angelMake('div', 'angel-clouds', _angelLayer);
  angelMake('i', 'angel-cloud-bank cloud-far', clouds);
  angelMake('i', 'angel-cloud-bank cloud-near', clouds);

  const gate = angelMake('div', 'angel-lobby-gate', _angelLayer);
  const gateImg = document.createElement('img');
  gateImg.src = ANGEL_ASSET_ROOT + 'lobby-gate.webp';
  gateImg.alt = '';
  gateImg.decoding = 'async';
  gateImg.draggable = false;
  gate.appendChild(gateImg);

  for (let i = 0; i < motion.feathers; i++) {
    const feather = angelMake('i', 'angel-feather', _angelLayer);
    feather.style.left = angelRandom(2, 96).toFixed(1) + '%';
    feather.style.top = angelRandom(-18, 90).toFixed(1) + '%';
    feather.style.setProperty('--feather-size', angelRandom(10, motion.compact ? 19 : 25).toFixed(1) + 'px');
    feather.style.setProperty('--feather-drift', angelRandom(-90, 90).toFixed(1) + 'px');
    feather.style.setProperty('--feather-dur', angelRandom(18, 34).toFixed(1) + 's');
    feather.style.setProperty('--feather-delay', (-angelRandom(0, 30)).toFixed(1) + 's');
  }
  for (let i = 0; i < motion.orbs; i++) {
    const orb = angelMake('i', 'angel-orb', _angelLayer);
    const size = angelRandom(3, motion.compact ? 7 : 10);
    orb.style.width = size.toFixed(1) + 'px';
    orb.style.height = size.toFixed(1) + 'px';
    orb.style.left = angelRandom(3, 97).toFixed(1) + '%';
    orb.style.top = angelRandom(8, 92).toFixed(1) + '%';
    orb.style.setProperty('--orb-dur', angelRandom(6, 12).toFixed(1) + 's');
    orb.style.setProperty('--orb-delay', (-angelRandom(0, 10)).toFixed(1) + 's');
  }

  if (!motion.reduced) {
    const flockA = angelMake('div', 'angel-flock flock-a', _angelLayer);
    const flockB = angelMake('div', 'angel-flock flock-b', _angelLayer);
    for (let i = 0; i < 7; i++) {
      const birdA = angelMake('i', 'angel-bird', flockA);
      birdA.style.setProperty('--bird-x', (i * 24) + 'px');
      birdA.style.setProperty('--bird-y', (Math.abs(3 - i) * 9) + 'px');
      const birdB = angelMake('i', 'angel-bird', flockB);
      birdB.style.setProperty('--bird-x', (i * 20) + 'px');
      birdB.style.setProperty('--bird-y', (Math.abs(3 - i) * 7) + 'px');
    }
  }

  const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (finePointer) {
    _angelFxLayer = angelMake('div', 'angel-cursor-fx');
    _angelGlow = angelMake('i', 'angel-cursor-glow', _angelFxLayer);
    _angelWake = angelMake('i', 'angel-cursor-wake', _angelFxLayer);
    if (!motion.reduced) {
      for (let i = 0; i < 15; i++) _angelSparkPool.push(angelMake('i', 'angel-cursor-spark', _angelFxLayer));
    }
    document.addEventListener('pointermove', angelPointerMove, { passive: true });
    document.addEventListener('pointerdown', angelPointerDown, { passive: true });
  }

  const confirmOverlay = document.getElementById('confirmModalOverlay');
  if (confirmOverlay) {
    const Observer = confirmOverlay.ownerDocument.defaultView.MutationObserver;
    _angelObserver = new Observer(angelDecorateConfirm);
    _angelObserver.observe(confirmOverlay, { attributes: true, attributeFilter: ['class'] });
  }
  document.body.classList.add('angel-theme-enter');
  _angelTimers.push(setTimeout(() => document.body.classList.remove('angel-theme-enter'), 1100));
}

function stopAngelTheme() {
  document.removeEventListener('pointermove', angelPointerMove);
  document.removeEventListener('pointerdown', angelPointerDown);
  if (_angelRAF) cancelAnimationFrame(_angelRAF);
  clearTimeout(_angelWakeTimer);
  _angelTimers.forEach(clearTimeout);
  _angelTimers = [];
  if (_angelObserver) _angelObserver.disconnect();
  _angelObserver = null;
  document.getElementById('confirmModalOverlay')?.classList.remove('angel-invite-arrival', 'angel-unlock-arrival');
  document.querySelectorAll('.angel-burst-particle,.angel-result-rays,.angel-lose-veil').forEach(el => el.remove());
  if (_angelFxLayer) _angelFxLayer.remove();
  if (_angelLayer) _angelLayer.innerHTML = '';
  _angelFxLayer = null;
  _angelLayer = null;
  _angelGlow = null;
  _angelWake = null;
  _angelRAF = null;
  _angelWakeTimer = null;
  _angelSparkPool = [];
  _angelSparkIndex = 0;
  _angelSparkLast = { x: -100, y: -100, time: 0 };
  _angelPointer = { x: -100, y: -100, px: -100, py: -100, angle: 0, speed: 0 };
  document.body.classList.remove('angel-theme-enter');
}

function spawnAngelWinBurst(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.querySelectorAll('.angel-result-rays').forEach(el => el.remove());
  const rays = angelMake('div', 'angel-result-rays', overlay);
  const box = overlay.querySelector('.result-box');
  if (box) overlay.insertBefore(rays, box);
  angelBurstAt(window.innerWidth / 2, window.innerHeight * 0.43, 32, 'win');
  _angelTimers.push(setTimeout(() => rays.remove(), 4200));
}

function spawnAngelLoseEffect() {
  const veil = angelMake('div', 'angel-lose-veil', document.body);
  for (let i = 0; i < 9; i++) {
    const feather = angelMake('i', 'angel-fall-feather', veil);
    feather.style.left = angelRandom(12, 88).toFixed(1) + '%';
    feather.style.setProperty('--fall-delay', (i * 0.14).toFixed(2) + 's');
    feather.style.setProperty('--fall-drift', angelRandom(-55, 55).toFixed(1) + 'px');
  }
  _angelTimers.push(setTimeout(() => veil.remove(), 3600));
}
