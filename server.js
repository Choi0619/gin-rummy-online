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

function emitToPlayer(room, idx, event, data) {
  if (room.players[idx]) io.to(room.players[idx]).emit(event, data);
}

// ===== Socket =====
io.on('connection', socket => {
  console.log('connect', socket.id);

  socket.on('create-room', ({ name }) => {
    const code = makeCode();
    rooms.set(code, {
      code,
      players: [socket.id],
      names: [name || '플레이어1', ''],
      ready: [false, false],
      game: null,
      scores: [0, 0],
    });
    socket.join(code);
    socket.data.room = code;
    socket.data.idx = 0;
    socket.emit('room-created', { code, playerIndex: 0 });
  });

  socket.on('join-room', ({ code, name }) => {
    const room = rooms.get(code.toUpperCase().trim());
    if (!room) { socket.emit('err', '방을 찾을 수 없습니다.'); return; }
    if (room.players.length >= 2 && room.players[1]) { socket.emit('err', '방이 가득 찼습니다.'); return; }
    room.players[1] = socket.id;
    room.names[1] = name || '플레이어2';
    socket.join(code);
    socket.data.room = code;
    socket.data.idx = 1;
    socket.emit('room-joined', { code, playerIndex: 1, opponentName: room.names[0] });
    emitToPlayer(room, 0, 'opponent-joined', { name: room.names[1] });
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
    handleAction(room, socket.data.idx, type, cardId, socket);
  });

  socket.on('play-again', () => {
    const room = rooms.get(socket.data.room);
    if (!room) return;
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
    if (room) {
      io.to(code).emit('opponent-left');
      rooms.delete(code);
    }
  });
});

// ===== Game =====
function startGame(room) {
  const deck = createDeck();
  room.game = {
    deck,
    hands: [deck.splice(0,10), deck.splice(0,10)],
    discardPile: [deck.pop()],
    turn: 0,
    phase: 'draw',
    over: false,
  };
  room.players.forEach((sid, i) => {
    io.to(sid).emit('game-started', {
      hand: room.game.hands[i],
      discardTop: room.game.discardPile[room.game.discardPile.length-1],
      deckCount: room.game.deck.length,
      turn: 0,
      scores: room.scores,
      names: room.names,
      playerIndex: i,
    });
  });
}

function handleAction(room, idx, type, cardId, socket) {
  const g = room.game;
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
    } else {
      const isGin = (type === 'gin');
      const { dw } = bestMelds(g.hands[idx]);
      if (isGin && dw > 0) { g.hands[idx].push(discarded); g.discardPile.pop(); socket.emit('err','진 조건 불충족'); return; }
      if (!isGin && dw > 10) { g.hands[idx].push(discarded); g.discardPile.pop(); socket.emit('err','녹 조건 불충족'); return; }
      resolveRound(room, idx, isGin);
    }
  }
}

function resolveRound(room, knockerIdx, isGin) {
  const g = room.game;
  g.over = true;
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
}

function handleDeckEmpty(room) {
  room.game.over = true;
  io.to(room.code).emit('deck-empty');
  room.rematch = [false, false];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ 진 러미 서버 시작: http://localhost:${PORT}`));
