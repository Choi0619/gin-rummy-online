const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ===== In-memory rooms =====
const rooms = new Map(); // code -> Room

// ===== Card logic (server-authoritative) =====
const SUITS   = ['S','H','D','C'];
const SUIT_SYM = { S:'♠', H:'♥', D:'♦', C:'♣' };
const RANKS   = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RANK_VAL = {A:1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:10,Q:10,K:10};
const RANK_ORD = {A:1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:11,Q:12,K:13};

function createDeck() {
  let id = 0, deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ id: id++, suit, rank, val: RANK_VAL[rank] });
  return shuffle(deck);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findAllMelds(cards) {
  const melds = [];
  const byRank = {};
  for (const c of cards) (byRank[c.rank] = byRank[c.rank] || []).push(c);
  for (const g of Object.values(byRank)) {
    if (g.length === 3) melds.push([...g]);
    if (g.length >= 4) {
      melds.push([...g]);
      for (let i = 0; i < g.length; i++) melds.push(g.filter((_,j) => j !== i));
    }
  }
  const bySuit = {};
  for (const c of cards) (bySuit[c.suit] = bySuit[c.suit] || []).push(c);
  for (const g of Object.values(bySuit)) {
    const sorted = [...g].sort((a,b) => RANK_ORD[a.rank] - RANK_ORD[b.rank]);
    let i = 0;
    while (i < sorted.length) {
      let j = i + 1;
      while (j < sorted.length && RANK_ORD[sorted[j].rank] === RANK_ORD[sorted[j-1].rank] + 1) j++;
      const seq = sorted.slice(i, j);
      if (seq.length >= 3)
        for (let len = 3; len <= seq.length; len++)
          for (let s = 0; s <= seq.length - len; s++)
            melds.push(seq.slice(s, s+len));
      i = j;
    }
  }
  return melds;
}

function bestMelds(cards) {
  const all = findAllMelds(cards);
  let bestDW = cards.reduce((s,c) => s+c.val, 0), best = [];
  function try_(idx, used, cur) {
    const dw = cards.filter(c => !used.has(c.id)).reduce((s,c) => s+c.val, 0);
    if (dw < bestDW) { bestDW = dw; best = cur.map(m => [...m]); }
    for (let i = idx; i < all.length; i++) {
      const m = all[i];
      if (!m.some(c => used.has(c.id))) {
        m.forEach(c => used.add(c.id));
        try_(i+1, used, [...cur, m]);
        m.forEach(c => used.delete(c.id));
      }
    }
  }
  try_(0, new Set(), []);
  return { melds: best, dw: bestDW };
}

function canExtendMeld(card, meld) {
  const isSet = meld.every(c => c.rank === meld[0].rank);
  if (isSet) return card.rank === meld[0].rank && !meld.some(c => c.suit === card.suit) && meld.length < 4;
  if (card.suit !== meld[0].suit) return false;
  const orders = meld.map(c => RANK_ORD[c.rank]).sort((a,b) => a-b);
  const o = RANK_ORD[card.rank];
  return o === orders[0]-1 || o === orders[orders.length-1]+1;
}

// Returns { dw, layoffCards } — cards actually laid off onto enemyMelds
function layoffResult(hand, enemyMelds, ownMelds) {
  const ownUsed = new Set(ownMelds.flat().map(c => c.id));
  let dw = hand.filter(c => !ownUsed.has(c.id));
  const layoffCards = [];
  for (const meld of enemyMelds) {
    dw = dw.filter(card => {
      if (canExtendMeld(card, meld)) { meld.push(card); layoffCards.push(card); return false; }
      return true;
    });
  }
  return { dw: dw.reduce((s,c) => s+c.val, 0), layoffCards };
}

// ===== Room helpers =====
function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({length:5}, () => chars[Math.floor(Math.random()*chars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

function getIdx(room, sid) { return room.players.indexOf(sid); }

// Match target score: a multiple of 50 between 100 and 500, or null for unlimited.
function normalizeTargetScore(v) {
  if (v === null || v === 'unlimited') return null;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 100 || n > 500 || n % 50 !== 0) return 100;
  return n;
}

function emitToPlayer(room, idx, event, data) {
  if (room.players[idx]) io.to(room.players[idx]).emit(event, data);
}

// ===== Socket =====
io.on('connection', socket => {
  console.log('connect', socket.id);

  socket.on('create-room', ({ name, char, targetScore }) => {
    const code = makeCode();
    rooms.set(code, {
      code,
      players: [socket.id],
      names: [name || '플레이어1', ''],
      chars: [char || '🐱', ''],
      away: [false, false],
      aiControlled: [false, false],
      ready: [false, false],
      game: null,
      scores: [0, 0],
      endRequest: null,
      targetScore: normalizeTargetScore(targetScore),
    });
    socket.join(code);
    socket.data.room = code;
    socket.data.idx = 0;
    socket.emit('room-created', { code, playerIndex: 0, targetScore: rooms.get(code).targetScore });
  });

  socket.on('create-ai-room', ({ name, char, targetScore }) => {
    const code = makeCode();
    const room = {
      code,
      players: [socket.id],
      names: [name || '플레이어1', 'AI'],
      chars: [char || '🐱', '🤖'],
      away: [false, false],
      ready: [true, true],
      game: null,
      scores: [0, 0],
      endRequest: null,
      vsAI: true,
      targetScore: normalizeTargetScore(targetScore),
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.room = code;
    socket.data.idx = 0;
    startGame(room);
  });

  socket.on('join-room', ({ code, name, char }) => {
    const room = rooms.get(code.toUpperCase().trim());
    if (!room) { socket.emit('err', '방을 찾을 수 없습니다.'); return; }
    if (room.players.length >= 2 && room.players[1]) { socket.emit('err', '방이 가득 찼습니다.'); return; }
    room.players[1] = socket.id;
    room.names[1] = name || '플레이어2';
    room.chars[1] = char || '🐶';
    socket.join(code);
    socket.data.room = code;
    socket.data.idx = 1;
    socket.emit('room-joined', { code, playerIndex: 1, opponentName: room.names[0], opponentChar: room.chars[0], targetScore: room.targetScore });
    emitToPlayer(room, 0, 'opponent-joined', { name: room.names[1], char: room.chars[1] });
  });

  socket.on('set-character', ({ char }) => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    const idx = socket.data.idx;
    room.chars[idx] = char;
    io.to(room.code).emit('char-update', { idx, char });
  });

  socket.on('chat-message', ({ text }) => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    const idx = socket.data.idx;
    const clean = String(text || '').slice(0, 200).trim();
    if (!clean) return;
    io.to(room.code).emit('chat-message', { idx, name: room.names[idx], text: clean, ts: Date.now() });
  });

  socket.on('toggle-status', () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    const idx = socket.data.idx;
    room.away[idx] = !room.away[idx];
    io.to(room.code).emit('status-update', { idx, away: room.away[idx] });

    if (!room.away[idx]) {
      // Returning from away: turn off AI takeover and re-sync this player's view
      if (room.aiControlled && room.aiControlled[idx]) {
        room.aiControlled[idx] = false;
        io.to(room.code).emit('ai-takeover-update', { idx, enabled: false });
      }
      if (room.aiMoveTimer && room.game && room.game.turn === idx) {
        clearTimeout(room.aiMoveTimer); room.aiMoveTimer = null;
      }
      if (room.game && !room.game.over) {
        const g = room.game;
        socket.emit('sync-state', {
          hand: g.hands[idx],
          discardTop: g.discardPile[g.discardPile.length - 1] || null,
          deckCount: g.deck.length,
          turn: g.turn,
          phase: g.phase,
          oppCardCount: g.hands[1 - idx].length,
          scores: room.scores,
        });
      }
    }
    if (room.game && !room.game.over && room.game.turn === idx) startTurnTimer(room);
  });

  socket.on('toggle-ai-takeover', () => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.game || room.game.over || room.vsAI) return;
    const idx = socket.data.idx;
    if (!room.aiControlled) room.aiControlled = [false, false];
    room.aiControlled[idx] = !room.aiControlled[idx];
    const enabled = room.aiControlled[idx];
    io.to(room.code).emit('ai-takeover-update', { idx, enabled });
    if (enabled && room.game.turn === idx) {
      clearTurnTimers(room);
      aiTakeTurn(room, idx);
    } else if (!enabled && room.game.turn === idx) {
      startTurnTimer(room);
    }
  });

  function resolveSurrender(room, idx) {
    const oppIdx = 1 - idx;
    room.game.over = true;
    clearTurnTimers(room);
    if (room.aiMoveTimer) { clearTimeout(room.aiMoveTimer); room.aiMoveTimer = null; }
    room.scores[oppIdx] += 25;
    io.to(room.code).emit('round-end', {
      resultType: 'surrender',
      winnerIdx: oppIdx,
      pts: 25,
      knockerIdx: oppIdx,
      hands: room.game.hands,
      melds: [[], []],
      dw: [0, 0],
      rawDw: [0, 0],
      layoff: [[], []],
      scores: room.scores,
      names: room.names,
      surrenderBy: idx,
    });
    room.rematch = [false, false];
    setTimeout(() => checkMatchEnd(room), 1500);
  }

  socket.on('surrender-request', () => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.game || room.game.over) return;
    const idx = socket.data.idx;
    if (room.vsAI) { resolveSurrender(room, idx); return; }
    room.surrenderRequest = idx;
    emitToPlayer(room, 1 - idx, 'surrender-request-received', { fromName: room.names[idx] });
  });

  socket.on('surrender-respond', ({ accept }) => {
    const room = rooms.get(socket.data.room);
    if (!room || room.surrenderRequest === undefined || room.surrenderRequest === null) return;
    const idx = room.surrenderRequest;
    room.surrenderRequest = null;
    if (!room.game || room.game.over) return;
    if (accept) {
      resolveSurrender(room, idx);
    } else {
      emitToPlayer(room, idx, 'surrender-declined', {});
    }
  });

  socket.on('request-sync', () => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.game) return;
    const idx = socket.data.idx;
    const g = room.game;
    socket.emit('sync-state', {
      hand: g.hands[idx],
      discardTop: g.discardPile[g.discardPile.length - 1] || null,
      deckCount: g.deck.length,
      turn: g.turn,
      phase: g.phase,
      oppCardCount: g.hands[1 - idx].length,
      scores: room.scores,
    });
  });

  socket.on('leave-game', () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    const idx = socket.data.idx;
    room.leaving = true;
    clearTurnTimers(room);
    if (room.aiMoveTimer) { clearTimeout(room.aiMoveTimer); room.aiMoveTimer = null; }
    emitToPlayer(room, 1 - idx, 'player-left', { name: room.names[idx] });
    rooms.delete(room.code);
  });

  socket.on('request-end', () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    const idx = socket.data.idx;
    room.endRequest = idx;
    emitToPlayer(room, 1 - idx, 'end-request-received', { fromName: room.names[idx] });
  });

  socket.on('respond-end', ({ accept }) => {
    const room = rooms.get(socket.data.room);
    if (!room || room.endRequest === null) return;
    const requesterIdx = room.endRequest;
    room.endRequest = null;
    if (accept) {
      const winnerIdx = room.scores[0] === room.scores[1] ? -1 : (room.scores[0] > room.scores[1] ? 0 : 1);
      io.to(room.code).emit('match-ended', { winnerIdx, scores: room.scores, names: room.names });
    } else {
      emitToPlayer(room, requesterIdx, 'end-request-declined', {});
    }
  });

  socket.on('set-ready', () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    const idx = socket.data.idx;
    room.ready[idx] = true;
    io.to(room.code).emit('ready-update', { ready: room.ready, names: room.names });
    if (room.ready[0] && room.ready[1]) startGame(room);
  });

  socket.on('action', ({ type, cardId }) => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.game || room.game.over) return;
    if (type === 'take-upcard' || type === 'pass-upcard') {
      handleUpcardDecision(room, socket.data.idx, type, socket);
    } else {
      handleAction(room, socket.data.idx, type, cardId, socket);
    }
  });

  socket.on('play-again', () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    if (room.vsAI) { room.game = null; startGame(room); return; }
    const idx = socket.data.idx;
    if (!room.rematch) room.rematch = [false, false];
    room.rematch[idx] = true;
    io.to(room.code).emit('rematch-update', { rematch: room.rematch });
    if (room.rematch[0] && room.rematch[1]) {
      room.rematch = [false, false];
      room.ready = [false, false];
      room.game = null;
      startGame(room);
    }
  });

  socket.on('disconnect', () => {
    const code = socket.data.room;
    if (!code) return;
    const room = rooms.get(code);
    if (!room || room.leaving) return;
    const idx = socket.data.idx;
    if (room.players[idx] !== socket.id) return; // stale/duplicate event, ignore

    // A plain disconnect (closed tab, dropped wifi, etc.) does NOT end the
    // room for the other player — only an explicit "leave-game" does that.
    room.players[idx] = null;

    if (room.game && !room.game.over) {
      // Mid-round: let the AI take over so the remaining player can keep playing.
      if (!room.aiControlled) room.aiControlled = [false, false];
      room.aiControlled[idx] = true;
      if (!room.away) room.away = [false, false];
      room.away[idx] = true;
      io.to(code).emit('status-update', { idx, away: true });
      io.to(code).emit('ai-takeover-update', { idx, enabled: true, auto: true });
      emitToPlayer(room, 1 - idx, 'opponent-disconnected-info', { name: room.names[idx] });
      if (room.game.turn === idx) aiTakeTurn(room, idx);
    } else {
      // Not mid-round (waiting room / between rounds): just notify, stay put.
      if (room.ready) room.ready = [false, false];
      emitToPlayer(room, 1 - idx, 'opponent-disconnected-info', { name: room.names[idx] });
    }
  });
});

// ===== Game =====
function startGame(room) {
  const deck = createDeck();

  // The lead ("선") alternates every round.
  room.firstIdx = (room.firstIdx === undefined) ? 0 : 1 - room.firstIdx;
  const firstIdx = room.firstIdx;
  const secondIdx = 1 - firstIdx;

  room.game = {
    deck,
    hands: [deck.splice(0,10), deck.splice(0,10)],
    discardPile: [deck.pop()],
    turn: firstIdx,
    phase: 'upcard-offer',
    upcardStage: 1,
    upcardFirstIdx: firstIdx,
    upcardSecondIdx: secondIdx,
    over: false,
  };
  room.away = [false, false];
  room.aiControlled = [false, false];
  room.players.forEach((sid, i) => {
    io.to(sid).emit('game-started', {
      hand: room.game.hands[i],
      discardTop: room.game.discardPile[room.game.discardPile.length-1],
      deckCount: room.game.deck.length,
      turn: firstIdx,
      phase: 'upcard-offer',
      scores: room.scores,
      names: room.names,
      chars: room.chars,
      playerIndex: i,
      vsAI: !!room.vsAI,
      targetScore: room.targetScore,
    });
  });
  startTurnTimer(room);
  aiTakeTurn(room, firstIdx);
}

// If a player's score has reached/exceeded the room's target, end the match.
function checkMatchEnd(room) {
  if (room.targetScore === null || room.targetScore === undefined) return;
  if (room.scores[0] < room.targetScore && room.scores[1] < room.targetScore) return;
  const winnerIdx = room.scores[0] === room.scores[1] ? -1 : (room.scores[0] > room.scores[1] ? 0 : 1);
  io.to(room.code).emit('match-ended', {
    winnerIdx, scores: room.scores, names: room.names, targetReached: true,
  });
}

// ===== First-card (up-card) offer procedure =====
// Standard Gin Rummy opening: the lead player may take the starting up-card
// or pass; if they pass, the other player gets the same offer; if both
// decline, the lead player draws blind from the stock to begin normal play.
function reclaimControlIfNeeded(room, idx) {
  if ((room.aiControlled && room.aiControlled[idx]) || (room.away && room.away[idx])) {
    if (room.aiMoveTimer) { clearTimeout(room.aiMoveTimer); room.aiMoveTimer = null; }
    if (room.aiControlled) room.aiControlled[idx] = false;
    if (room.away) room.away[idx] = false;
    io.to(room.code).emit('status-update', { idx, away: false });
    io.to(room.code).emit('ai-takeover-update', { idx, enabled: false });
  }
}

function handleUpcardDecision(room, idx, type, socket) {
  const g = room.game;
  if (!g || g.over || g.phase !== 'upcard-offer') { if (socket) socket.emit('err', '지금은 해당되지 않습니다.'); return; }

  reclaimControlIfNeeded(room, idx);
  if (g.turn !== idx) { if (socket) socket.emit('err', '내 차례가 아닙니다.'); return; }

  const oppIdx = 1 - idx;
  const upcard = g.discardPile[g.discardPile.length - 1];

  if (type === 'take-upcard') {
    g.discardPile.pop();
    g.hands[idx].push(upcard);
    g.phase = 'discard';
    const mySid = room.players[idx];
    if (mySid) io.to(mySid).emit('you-drew', { card: upcard, deckCount: g.deck.length, newDiscardTop: null });
    emitToPlayer(room, oppIdx, 'opp-drew', { from: 'discard', deckCount: g.deck.length, newDiscardTop: null });
  } else { // pass-upcard
    if (idx === g.upcardFirstIdx && g.upcardStage === 1) {
      g.upcardStage = 2;
      g.turn = g.upcardSecondIdx;
      io.to(room.code).emit('upcard-pass', { byIdx: idx, nextIdx: g.turn, stage: 2 });
      aiTakeTurn(room, g.turn);
    } else {
      const firstIdx = g.upcardFirstIdx;
      if (g.deck.length === 0) { handleDeckEmpty(room); return; }
      const card = g.deck.pop();
      g.hands[firstIdx].push(card);
      g.phase = 'discard';
      g.turn = firstIdx;
      const sid = room.players[firstIdx];
      if (sid) io.to(sid).emit('you-drew', { card, deckCount: g.deck.length, turn: firstIdx });
      emitToPlayer(room, 1 - firstIdx, 'opp-drew', { from: 'deck', deckCount: g.deck.length, turn: firstIdx });
    }
  }

  if (socket) socket.emit('turn-timer-reset');
  if (room.game && !room.game.over) startTurnTimer(room);
}

// Dispatches an AI (or auto-takeover) decision for whoever currently holds
// the turn, whether that's the upcard offer stage or normal play.
function aiTakeTurn(room, idx) {
  const g = room.game;
  if (!g || g.over || g.turn !== idx) return;
  const isAI = (room.vsAI && idx === 1) || (room.aiControlled && room.aiControlled[idx]);
  if (!isAI) return;

  if (g.phase === 'upcard-offer') {
    room.aiMoveTimer = setTimeout(() => {
      if (!room.game || room.game.over || room.game.phase !== 'upcard-offer' || room.game.turn !== idx) return;
      const upcard = room.game.discardPile[room.game.discardPile.length - 1];
      const curDW = bestMelds(room.game.hands[idx]).dw;
      const testDW = bestMelds([...room.game.hands[idx], upcard]).dw;
      handleUpcardDecision(room, idx, testDW < curDW ? 'take-upcard' : 'pass-upcard', null);
    }, 800 + Math.random() * 600);
  } else {
    room.aiMoveTimer = setTimeout(() => aiPlayTurnFor(room, idx), 800 + Math.random() * 600);
  }
}

// ===== Inactivity auto-AI-takeover =====
// If the active player does nothing for 45s, the AI takes over their turn.
// A warning is sent at 40s (5 seconds before the switch).
const TURN_WARN_MS = 40000;
const TURN_AI_MS = 45000;

function clearTurnTimers(room) {
  if (room.turnWarnTimeout) { clearTimeout(room.turnWarnTimeout); room.turnWarnTimeout = null; }
  if (room.turnAiTimeout) { clearTimeout(room.turnAiTimeout); room.turnAiTimeout = null; }
}

function startTurnTimer(room) {
  clearTurnTimers(room);
  if (!room.game || room.game.over || room.vsAI) return;
  const idx = room.game.turn;
  if (!room.players[idx]) return;
  if (room.aiControlled && room.aiControlled[idx]) return; // AI already plays for them

  room.turnWarnTimeout = setTimeout(() => {
    emitToPlayer(room, idx, 'turn-timeout-warning', {});
  }, TURN_WARN_MS);

  room.turnAiTimeout = setTimeout(() => {
    if (!room.game || room.game.over || room.game.turn !== idx) return;
    if (!room.aiControlled) room.aiControlled = [false, false];
    room.aiControlled[idx] = true;
    io.to(room.code).emit('ai-takeover-update', { idx, enabled: true, auto: true });
    aiTakeTurn(room, idx);
  }, TURN_AI_MS);
}

function handleAction(room, idx, type, cardId, socket) {
  const g = room.game;

  // Taking any action automatically reclaims control: clears "away" and
  // "AI is playing for me" state without needing an explicit "return" click.
  reclaimControlIfNeeded(room, idx);

  if (g.turn !== idx) { socket.emit('err', '내 턴이 아닙니다.'); return; }
  const oppIdx = 1 - idx;

  if (type === 'draw-deck') {
    if (g.phase !== 'draw') { socket.emit('err', '지금은 뽑을 수 없습니다.'); return; }
    if (g.deck.length === 0) { handleDeckEmpty(room); return; }
    const card = g.deck.pop();
    g.hands[idx].push(card);
    g.phase = 'discard';
    socket.emit('you-drew', { card, deckCount: g.deck.length });
    emitToPlayer(room, oppIdx, 'opp-drew', { from: 'deck', deckCount: g.deck.length });

  } else if (type === 'draw-discard') {
    if (g.phase !== 'draw' || g.discardPile.length === 0) { socket.emit('err', '가져올 수 없습니다.'); return; }
    const card = g.discardPile.pop();
    const newTop = g.discardPile[g.discardPile.length-1] || null;
    g.hands[idx].push(card);
    g.phase = 'discard';
    socket.emit('you-drew', { card, deckCount: g.deck.length, newDiscardTop: newTop });
    emitToPlayer(room, oppIdx, 'opp-drew', { from: 'discard', deckCount: g.deck.length, newDiscardTop: newTop });

  } else if (type === 'big-gin') {
    if (g.phase !== 'discard') { socket.emit('err', '지금은 빅진을 선언할 수 없습니다.'); return; }
    const { dw } = bestMelds(g.hands[idx]); // full 11-card hand, no discard
    if (dw !== 0) { socket.emit('err', '빅진 조건 불충족 (11장 전부 멜드여야 합니다).'); return; }
    resolveBigGin(room, idx);

  } else if (['discard','knock','gin'].includes(type)) {
    if (g.phase !== 'discard') { socket.emit('err', '지금은 버릴 수 없습니다.'); return; }
    const ci = g.hands[idx].findIndex(c => c.id === cardId);
    if (ci === -1) { socket.emit('err', '카드가 없습니다.'); return; }
    const [discarded] = g.hands[idx].splice(ci, 1);
    g.discardPile.push(discarded);

    if (type === 'discard') {
      g.phase = 'draw';
      g.turn = oppIdx;
      io.to(room.code).emit('card-discarded', {
        card: discarded,
        byIdx: idx,
        nextTurn: g.turn,
        deckCount: g.deck.length,
      });
      if (room.vsAI && oppIdx === 1) {
        room.aiMoveTimer = setTimeout(() => aiPlayTurnFor(room, 1), 900 + Math.random()*700);
      } else if (room.aiControlled && room.aiControlled[oppIdx]) {
        room.aiMoveTimer = setTimeout(() => aiPlayTurnFor(room, oppIdx), 900 + Math.random()*700);
      }
    } else {
      const isGin = (type === 'gin');
      const { dw } = bestMelds(g.hands[idx]);
      if (isGin && dw > 0) { g.hands[idx].push(discarded); g.discardPile.pop(); socket.emit('err','진 조건 불충족'); return; }
      if (!isGin && dw > 10) { g.hands[idx].push(discarded); g.discardPile.pop(); socket.emit('err','녹 조건 불충족'); return; }
      resolveRound(room, idx, isGin);
    }
  }

  socket.emit('turn-timer-reset');
  if (room.game && !room.game.over) startTurnTimer(room);
}

// Big Gin: all 11 cards (after drawing, before discarding) form valid melds.
// No lay-offs are allowed (same as regular Gin); bonus is 31 instead of 25.
function resolveBigGin(room, knockerIdx) {
  const g = room.game;
  g.over = true;
  clearTurnTimers(room);
  if (room.aiMoveTimer) { clearTimeout(room.aiMoveTimer); room.aiMoveTimer = null; }
  const defIdx = 1 - knockerIdx;
  const { melds: kMelds } = bestMelds(g.hands[knockerIdx]);
  const { melds: dMelds, dw: defDW } = bestMelds(g.hands[defIdx]);

  const pts = 31 + defDW;
  room.scores[knockerIdx] += pts;

  io.to(room.code).emit('round-end', {
    resultType: 'big-gin',
    winnerIdx: knockerIdx,
    pts,
    knockerIdx,
    hands: [g.hands[0], g.hands[1]],
    melds: knockerIdx === 0 ? [kMelds, dMelds] : [dMelds, kMelds],
    dw: knockerIdx === 0 ? [0, defDW] : [defDW, 0],
    rawDw: knockerIdx === 0 ? [0, defDW] : [defDW, 0],
    layoff: [[], []],
    scores: room.scores,
    names: room.names,
  });
  room.rematch = [false, false];
  setTimeout(() => checkMatchEnd(room), 1500);
}

function resolveRound(room, knockerIdx, isGin) {
  const g = room.game;
  g.over = true;
  clearTurnTimers(room);
  if (room.aiMoveTimer) { clearTimeout(room.aiMoveTimer); room.aiMoveTimer = null; }
  const defIdx = 1 - knockerIdx;
  const kHand = g.hands[knockerIdx];
  const dHand = g.hands[defIdx];

  const { melds: kMelds, dw: kDW } = bestMelds(kHand);
  const { melds: dMelds, dw: rawDDW } = bestMelds(dHand);

  let defDW = rawDDW, defLayoff = [];
  if (!isGin) {
    const res = layoffResult(dHand, kMelds.map(m=>[...m]), dMelds);
    defDW = res.dw;
    defLayoff = res.layoffCards;
  }

  let winnerIdx = -1, pts = 0, resultType;

  if (isGin) {
    winnerIdx = knockerIdx; pts = 25 + rawDDW; resultType = 'gin';
  } else if (kDW < defDW) {
    winnerIdx = knockerIdx; pts = defDW - kDW; resultType = 'knock';
  } else if (defDW < kDW) {
    winnerIdx = defIdx; pts = kDW - defDW + 25; resultType = 'undercut';
  } else {
    resultType = 'tie';
  }

  if (winnerIdx >= 0) room.scores[winnerIdx] += pts;

  // layoff[i] = cards player i laid off onto opponent's melds
  const layoff = knockerIdx === 0 ? [[], defLayoff] : [defLayoff, []];

  io.to(room.code).emit('round-end', {
    resultType, winnerIdx, pts, knockerIdx,
    hands: [g.hands[0], g.hands[1]],
    melds: knockerIdx === 0 ? [kMelds, dMelds] : [dMelds, kMelds],
    dw: knockerIdx === 0 ? [kDW, defDW] : [defDW, kDW],
    rawDw: knockerIdx === 0 ? [kDW, rawDDW] : [rawDDW, kDW],
    layoff,
    scores: room.scores,
    names: room.names,
    discardTop: g.discardPile[g.discardPile.length-1],
  });
  room.rematch = [false, false];
  setTimeout(() => checkMatchEnd(room), 1500);
}

// ===== AI plays a turn on behalf of player `idx` (dedicated AI opponent or a "away" takeover) =====
function aiPlayTurnFor(room, idx) {
  const g = room.game;
  if (!g || g.over || g.turn !== idx) return;
  const oppIdx = 1 - idx;
  const notifySid = room.players[oppIdx]; // the other (real) player watches the moves live

  // --- Draw decision: take discard if it strictly improves deadwood, else deck ---
  const topDiscard = g.discardPile[g.discardPile.length - 1];
  let takeDiscard = false;
  if (topDiscard) {
    const curDW = bestMelds(g.hands[idx]).dw;
    const testDW = bestMelds([...g.hands[idx], topDiscard]).dw;
    takeDiscard = testDW < curDW;
  }

  let drawnCard, drewFrom;
  if (takeDiscard) {
    drawnCard = g.discardPile.pop();
    drewFrom = 'discard';
  } else {
    if (g.deck.length === 0) { handleDeckEmpty(room); return; }
    drawnCard = g.deck.pop();
    drewFrom = 'deck';
  }
  g.hands[idx].push(drawnCard);

  const newTop = g.discardPile[g.discardPile.length - 1] || null;
  if (notifySid) {
    io.to(notifySid).emit('opp-drew', {
      from: drewFrom,
      deckCount: g.deck.length,
      newDiscardTop: drewFrom === 'discard' ? newTop : undefined,
    });
  }

  // --- Big Gin check: if all 11 cards already melded, declare immediately, no discard needed ---
  if (bestMelds(g.hands[idx]).dw === 0) {
    setTimeout(() => resolveBigGin(room, idx), 500);
    return;
  }

  // --- Discard decision: full search — try removing each card, keep the hand with lowest deadwood ---
  const hand = g.hands[idx];
  let bestPick = null;
  for (const card of hand) {
    const rest = hand.filter(c => c.id !== card.id);
    const { dw } = bestMelds(rest);
    if (!bestPick || dw < bestPick.dw || (dw === bestPick.dw && card.val > bestPick.card.val)) {
      bestPick = { card, dw };
    }
  }
  const discardCard = bestPick.card;
  g.hands[idx] = hand.filter(c => c.id !== discardCard.id);
  g.discardPile.push(discardCard);

  const { dw: afterDW } = bestMelds(g.hands[idx]);

  room.aiMoveTimer = setTimeout(() => {
    if (afterDW === 0) { resolveRound(room, idx, true); return; }
    if (afterDW <= 10) { resolveRound(room, idx, false); return; }
    g.phase = 'draw';
    g.turn = oppIdx;
    if (notifySid) {
      io.to(notifySid).emit('card-discarded', {
        card: discardCard, byIdx: idx, nextTurn: oppIdx, deckCount: g.deck.length,
      });
    }
    if (room.aiControlled && room.aiControlled[oppIdx]) {
      room.aiMoveTimer = setTimeout(() => aiPlayTurnFor(room, oppIdx), 900 + Math.random() * 700);
    } else {
      startTurnTimer(room);
    }
  }, 500);
}

function handleDeckEmpty(room) {
  room.game.over = true;
  clearTurnTimers(room);
  if (room.aiMoveTimer) { clearTimeout(room.aiMoveTimer); room.aiMoveTimer = null; }
  io.to(room.code).emit('deck-empty');
  room.rematch = [false, false];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ 진 러미 서버 시작: http://localhost:${PORT}`));
