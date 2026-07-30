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
let _angelCursorFeatherPool = [];
let _angelSparkIndex = 0;
let _angelCursorFeatherIndex = 0;
let _angelSparkLast = { x: -100, y: -100, time: 0 };
let _angelTimers = [];
let _angelMiniAngel = null;
let _angelGoldenFeather = null;
let _angelMiniTimer = null;
let _angelFeatherTimer = null;
let _angelBlessingTimer = null;

function angelRandom(min, max) {
  return min + Math.random() * (max - min);
}

function angelMotionProfile() {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = window.innerWidth < 720;
  return {
    reduced,
    compact,
    feathers: reduced ? 3 : (compact ? 7 : 14),
    orbs: reduced ? 3 : (compact ? 5 : 9),
    sigils: reduced ? 0 : (compact ? 1 : 3),
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
  const size = angelRandom(small ? 4 : 6, small ? 6 : 11);
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

function angelEmitCursorFeather(x, y, angle) {
  if (!_angelCursorFeatherPool.length) return;
  const feather = _angelCursorFeatherPool[_angelCursorFeatherIndex % _angelCursorFeatherPool.length];
  const variant = _angelCursorFeatherIndex % 8;
  _angelCursorFeatherIndex += 1;
  feather.style.left = x + 'px';
  feather.style.top = y + 'px';
  feather.style.setProperty('--cursor-feather-x', ((variant % 4) * 33.333).toFixed(3) + '%');
  feather.style.setProperty('--cursor-feather-y', (variant > 3 ? '100%' : '0%'));
  feather.style.setProperty('--cursor-feather-dx', angelRandom(-18, 18).toFixed(1) + 'px');
  feather.style.setProperty('--cursor-feather-dy', angelRandom(-34, -18).toFixed(1) + 'px');
  feather.style.setProperty('--cursor-feather-rot', (angle * 180 / Math.PI + angelRandom(95, 170)).toFixed(0) + 'deg');
  feather.className = 'angel-cursor-feather active';
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
  if (now - _angelSparkLast.time >= 42 && trailX * trailX + trailY * trailY >= 110) {
    angelEmitSparkle(event.clientX, event.clientY, _angelPointer.angle);
    if (_angelSparkIndex % 3 === 0) angelEmitSparkle(event.clientX, event.clientY, _angelPointer.angle, true);
    if (_angelSparkIndex % 4 === 0) angelEmitCursorFeather(event.clientX, event.clientY, _angelPointer.angle);
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
    const variant = i % 8;
    const angle = Math.PI * 2 * i / count + angelRandom(-0.18, 0.18);
    const distance = angelRandom(42, kind === 'win' ? 180 : 92);
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.setProperty('--angel-bx', (Math.cos(angle) * distance).toFixed(1) + 'px');
    particle.style.setProperty('--angel-by', (Math.sin(angle) * distance - (kind === 'win' ? 36 : 10)).toFixed(1) + 'px');
    particle.style.setProperty('--angel-br', angelRandom(-240, 240).toFixed(0) + 'deg');
    particle.style.setProperty('--burst-feather-x', ((variant % 4) * 33.333).toFixed(3) + '%');
    particle.style.setProperty('--burst-feather-y', (variant > 3 ? '100%' : '0%'));
    particle.style.animationDelay = (i * 0.018).toFixed(2) + 's';
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
  }
}

function angelSetMiniFrame(sprite, frame) {
  const x = ['0%', '50%', '100%'][frame % 3];
  const y = frame > 2 ? '100%' : '0%';
  sprite.style.setProperty('--mini-frame-x', x);
  sprite.style.setProperty('--mini-frame-y', y);
}

function angelScheduleMiniAngel(delay = angelRandom(24000, 48000)) {
  clearTimeout(_angelMiniTimer);
  _angelMiniTimer = setTimeout(() => {
    _angelMiniTimer = null;
    if (!document.body.classList.contains('theme-angel') || _angelMiniAngel) {
      angelScheduleMiniAngel();
      return;
    }
    angelSpawnMiniAngel();
  }, delay);
}

function angelSpawnMiniAngel() {
  const motion = angelMotionProfile();
  if (motion.reduced || _angelMiniAngel || !document.body.classList.contains('theme-angel')) return;

  const angel = document.createElement('button');
  angel.type = 'button';
  angel.className = 'angel-mini-angel';
  angel.setAttribute('aria-label', '천상 수호천사');
  const sprite = document.createElement('span');
  sprite.className = 'angel-mini-sprite';
  angelSetMiniFrame(sprite, Math.random() < 0.58 ? 1 : 0);
  angel.appendChild(sprite);

  const fromLeft = Math.random() < 0.5;
  angel.classList.add(fromLeft ? 'from-left' : 'from-right');
  angel.style.left = fromLeft ? (motion.compact ? '-8px' : '1.5vw') : 'auto';
  angel.style.right = fromLeft ? 'auto' : (motion.compact ? '-8px' : '1.5vw');
  angel.style.top = angelRandom(motion.compact ? 22 : 18, motion.compact ? 66 : 72).toFixed(1) + 'vh';
  document.body.appendChild(angel);
  _angelMiniAngel = angel;

  let retired = false;
  const retire = (reacted) => {
    if (retired) return;
    retired = true;
    if (reacted) {
      const rect = angel.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      angelSetMiniFrame(sprite, 4);
      angel.classList.add('reacting');
      angelBurstAt(x, y, motion.compact ? 8 : 13, 'blessing');
      _angelTimers.push(setTimeout(() => angelSpawnGoldenFeather(x, y, true), 280));
    } else {
      angelSetMiniFrame(sprite, 5);
      angel.classList.add('leaving');
    }
    _angelTimers.push(setTimeout(() => {
      angel.remove();
      if (_angelMiniAngel === angel) _angelMiniAngel = null;
      angelScheduleMiniAngel(angelRandom(26000, 52000));
    }, reacted ? 980 : 760));
  };

  angel.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    retire(true);
  });
  _angelTimers.push(setTimeout(() => retire(false), motion.compact ? 6200 : 8200));
}

function angelScheduleGoldenFeather(delay = angelRandom(36000, 72000)) {
  clearTimeout(_angelFeatherTimer);
  _angelFeatherTimer = setTimeout(() => {
    _angelFeatherTimer = null;
    if (!document.body.classList.contains('theme-angel') || _angelGoldenFeather) {
      angelScheduleGoldenFeather();
      return;
    }
    angelSpawnGoldenFeather();
  }, delay);
}

function angelActivateBlessing(x, y) {
  clearTimeout(_angelBlessingTimer);
  document.querySelectorAll('.angel-blessing-wave').forEach(el => el.remove());
  const wave = angelMake('div', 'angel-blessing-wave', document.body);
  wave.style.setProperty('--blessing-x', x.toFixed(1) + 'px');
  wave.style.setProperty('--blessing-y', y.toFixed(1) + 'px');
  document.body.classList.add('angel-blessing-active');
  angelBurstAt(x, y, window.innerWidth < 720 ? 13 : 20, 'blessing');
  _angelBlessingTimer = setTimeout(() => {
    wave.remove();
    document.body.classList.remove('angel-blessing-active');
    _angelBlessingTimer = null;
  }, 3400);
}

function angelSpawnGoldenFeather(originX, originY, fromAngel = false) {
  const motion = angelMotionProfile();
  if (motion.reduced || _angelGoldenFeather || !document.body.classList.contains('theme-angel')) return;

  const feather = document.createElement('button');
  feather.type = 'button';
  feather.className = 'angel-golden-feather';
  feather.setAttribute('aria-label', '황금 깃털');
  const startX = Number.isFinite(originX) ? originX : angelRandom(50, window.innerWidth - 70);
  const startY = Number.isFinite(originY) ? originY : -84;
  const drift = angelRandom(motion.compact ? -48 : -100, motion.compact ? 48 : 100);
  feather.style.setProperty('--gold-start-x', startX.toFixed(1) + 'px');
  feather.style.setProperty('--gold-start-y', startY.toFixed(1) + 'px');
  const fall = window.innerHeight - startY + 130;
  feather.style.setProperty('--gold-x1', (startX + drift * .32).toFixed(1) + 'px');
  feather.style.setProperty('--gold-y1', (startY + fall * .25).toFixed(1) + 'px');
  feather.style.setProperty('--gold-x2', (startX - drift * .2).toFixed(1) + 'px');
  feather.style.setProperty('--gold-y2', (startY + fall * .52).toFixed(1) + 'px');
  feather.style.setProperty('--gold-x3', (startX + drift * .72).toFixed(1) + 'px');
  feather.style.setProperty('--gold-y3', (startY + fall * .78).toFixed(1) + 'px');
  feather.style.setProperty('--gold-end-x', (startX + drift).toFixed(1) + 'px');
  feather.style.setProperty('--gold-end-y', (startY + fall).toFixed(1) + 'px');
  feather.style.setProperty('--gold-duration', (fromAngel ? angelRandom(7.2, 8.4) : angelRandom(9.5, 12)).toFixed(1) + 's');
  document.body.appendChild(feather);
  _angelGoldenFeather = feather;

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    feather.remove();
    if (_angelGoldenFeather === feather) _angelGoldenFeather = null;
    angelScheduleGoldenFeather(angelRandom(38000, 76000));
  };
  feather.addEventListener('animationend', cleanup, { once: true });
  feather.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = feather.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    feather.style.left = x + 'px';
    feather.style.top = y + 'px';
    feather.style.transform = 'none';
    feather.style.animation = 'none';
    void feather.offsetWidth;
    feather.classList.add('caught');
    angelActivateBlessing(x, y);
    _angelTimers.push(setTimeout(cleanup, 680));
  }, { once: true });
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

  const ribbons = angelMake('div', 'angel-light-ribbons', _angelLayer);
  angelMake('i', 'angel-light-ribbon ribbon-a', ribbons);
  angelMake('i', 'angel-light-ribbon ribbon-b', ribbons);

  const gate = angelMake('div', 'angel-lobby-gate', _angelLayer);
  const gateImg = document.createElement('img');
  gateImg.src = ANGEL_ASSET_ROOT + 'lobby-gate-v3.webp';
  gateImg.alt = '';
  gateImg.decoding = 'async';
  gateImg.draggable = false;
  gate.appendChild(gateImg);

  for (let i = 0; i < motion.feathers; i++) {
    const feather = angelMake('i', 'angel-feather', _angelLayer);
    const variant = i % 8;
    feather.style.left = angelRandom(2, 96).toFixed(1) + '%';
    feather.style.top = angelRandom(-18, 90).toFixed(1) + '%';
    feather.style.setProperty('--feather-size', angelRandom(18, motion.compact ? 30 : 42).toFixed(1) + 'px');
    feather.style.setProperty('--feather-x', ((variant % 4) * 33.333).toFixed(3) + '%');
    feather.style.setProperty('--feather-y', (variant > 3 ? '100%' : '0%'));
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
  for (let i = 0; i < motion.sigils; i++) {
    const sigil = angelMake('i', 'angel-ambient-sigil', _angelLayer);
    const size = angelRandom(motion.compact ? 120 : 150, motion.compact ? 180 : 280);
    sigil.style.width = size.toFixed(0) + 'px';
    sigil.style.height = size.toFixed(0) + 'px';
    sigil.style.left = angelRandom(3, 82).toFixed(1) + '%';
    sigil.style.top = angelRandom(9, 76).toFixed(1) + '%';
    sigil.style.setProperty('--sigil-dur', angelRandom(32, 58).toFixed(1) + 's');
    sigil.style.setProperty('--sigil-delay', (-angelRandom(0, 30)).toFixed(1) + 's');
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

  const finePointer = !motion.compact || (window.matchMedia && window.matchMedia('(any-pointer: fine)').matches);
  if (finePointer) {
    _angelFxLayer = angelMake('div', 'angel-cursor-fx', document.body);
    _angelGlow = angelMake('i', 'angel-cursor-glow', _angelFxLayer);
    _angelWake = angelMake('i', 'angel-cursor-wake', _angelFxLayer);
    if (!motion.reduced) {
      for (let i = 0; i < 20; i++) _angelSparkPool.push(angelMake('i', 'angel-cursor-spark', _angelFxLayer));
      for (let i = 0; i < 8; i++) _angelCursorFeatherPool.push(angelMake('i', 'angel-cursor-feather', _angelFxLayer));
    }
    document.addEventListener('pointermove', angelPointerMove, { passive: true });
    document.addEventListener('pointerdown', angelPointerDown, { passive: true });
  }

  document.body.classList.add('angel-theme-enter');
  _angelTimers.push(setTimeout(() => document.body.classList.remove('angel-theme-enter'), 1100));
  if (!motion.reduced) {
    angelScheduleMiniAngel(motion.compact ? 10500 : 7200);
    angelScheduleGoldenFeather(motion.compact ? 24000 : 16500);
  }
}

function stopAngelTheme() {
  document.removeEventListener('pointermove', angelPointerMove);
  document.removeEventListener('pointerdown', angelPointerDown);
  if (_angelRAF) cancelAnimationFrame(_angelRAF);
  clearTimeout(_angelWakeTimer);
  clearTimeout(_angelMiniTimer);
  clearTimeout(_angelFeatherTimer);
  clearTimeout(_angelBlessingTimer);
  _angelTimers.forEach(clearTimeout);
  _angelTimers = [];
  document.getElementById('confirmModalOverlay')?.classList.remove('angel-invite-arrival', 'angel-unlock-arrival');
  document.querySelectorAll('.angel-burst-particle,.angel-result-rays,.angel-lose-veil,.angel-mini-angel,.angel-golden-feather,.angel-blessing-wave').forEach(el => el.remove());
  if (_angelFxLayer) _angelFxLayer.remove();
  if (_angelLayer) _angelLayer.innerHTML = '';
  _angelFxLayer = null;
  _angelLayer = null;
  _angelGlow = null;
  _angelWake = null;
  _angelRAF = null;
  _angelWakeTimer = null;
  _angelMiniTimer = null;
  _angelFeatherTimer = null;
  _angelBlessingTimer = null;
  _angelMiniAngel = null;
  _angelGoldenFeather = null;
  _angelSparkPool = [];
  _angelCursorFeatherPool = [];
  _angelSparkIndex = 0;
  _angelCursorFeatherIndex = 0;
  _angelSparkLast = { x: -100, y: -100, time: 0 };
  _angelPointer = { x: -100, y: -100, px: -100, py: -100, angle: 0, speed: 0 };
  document.body.classList.remove('angel-theme-enter', 'angel-blessing-active');
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
    feather.style.setProperty('--fall-feather-x', ((i % 4) * 33.333).toFixed(3) + '%');
    feather.style.setProperty('--fall-feather-y', (i > 3 ? '100%' : '0%'));
  }
  _angelTimers.push(setTimeout(() => veil.remove(), 3600));
}
