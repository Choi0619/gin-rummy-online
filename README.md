# Gin Rummy Online 🃏

A real-time, browser-based implementation of the classic **Gin Rummy** card game, built with **Node.js**, **Express**, and **Socket.IO**. Play head-to-head with a friend over a shareable room code, or practice solo against a built-in AI opponent.

Live deployment: https://gin-rummy-online.onrender.com

---

## Table of Contents

- [Features](#features)
- [Game Rules (Quick Reference)](#game-rules-quick-reference)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How Multiplayer Works](#how-multiplayer-works)
- [AI Opponent](#ai-opponent)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)

---

## Features

### Core gameplay
- Standard 2-player Gin Rummy: draw, discard, knock, and gin, with full **lay-off** support when a defender can extend their hand onto the knocker's melds.
- Server-authoritative game state — all rules (melds, deadwood, knock/gin eligibility, lay-offs, undercuts) are validated on the server, not the client, to prevent cheating.
- Automatic best-meld detection via exhaustive search (tries every combination of non-overlapping sets/runs and keeps the one with the lowest deadwood).
- Hand sorting: by meld grouping, by rank, or by suit.
- Visual highlights for melded cards, the most recently drawn card, and newly discarded cards.

### Multiplayer & rooms
- Create a room and share a 5-character code (or a `?room=CODE` link) with a friend to join.
- Both players pick a name and an animal-emoji character avatar before the match starts.
- Turn indicator on the avatar bar — the active player's card glows.
- **Away / AI takeover**: step away mid-game (e.g. you got pulled into a meeting) and let the built-in AI play your turns until you return; your hand re-syncs automatically when you come back.
- **Surrender**: request to forfeit the current round; the opponent must accept or decline.
- **Request match end**: propose ending the whole match early; if the opponent accepts, the player with the higher cumulative score is declared the winner.
- **Leave game**: notifies the other player by name when you exit mid-match.
- Rematch flow ("Play Again") with a clear waiting/incoming banner so both players know who's waiting on whom.
- Automatic reconnection/state-sync safety net: if an action is rejected by the server (e.g. a stale turn state), the client automatically re-syncs to the authoritative game state.

### Solo / AI mode
- "Play vs AI" starts an instant single-player match — no waiting room needed.
- Selectable AI difficulty (easy / normal / hard).
- The AI evaluates every possible discard by simulating the resulting deadwood for each candidate card and keeps the one that minimizes it (not just "discard the highest-value deadwood card").
- The AI also decides whether to draw from the discard pile or the deck based on whether the discard actually improves its hand.
- Turn timer defaults to unlimited against the AI (no rush against a bot); PvP rooms keep a 20s default, configurable per room.

### Accounts & social (Supabase-backed)
- Optional sign-in (Supabase auth) with a persistent profile: nickname, game ID, animal-emoji character, and a ranked-points (RP) tier badge.
- Friends list, friend requests, and direct messages that persist across sessions.
- A room browser to find and join public games, plus shareable room codes.
- **Spectator mode**: watch a friend's in-progress match live (full board state streamed to spectators), either by joining a full room or spectating directly by code.
- Cosmetic collection system: unlockable profile/card border skins (bronze → challenger tiers) earned through play, shown on avatars, badges, and friend rows.

### Revenge mode
- After a match ends, the loser can challenge the winner to a "Revenge" rematch; if accepted, the loser's avatar gets a burning fire animation for the rest of that revenge match.

### Themes & polish
- Selectable UI themes, including an animated "Aurora" theme with glowing turn indicators and star-crystal card styling.
- Win celebrations (confetti burst + bounce animation), loss shake animation, and bigger disconnect/forfeit effects.
- Animated card draw/discard transitions and a fanned-out dealing animation at the start of each match.
- In-match emoji reactions and text chat between players.
- A "Secret Mode" (Ctrl+Shift+H) disguise screen for playing discreetly, with an optional AI-autopilot toggle.

---

## Game Rules (Quick Reference)

- Each player starts with 10 cards from a shuffled 52-card deck; one card starts the discard pile.
- On your turn: draw one card (from the deck or the discard pile), then discard one card.
- **Meld** = a *set* (3–4 cards of the same rank, different suits) or a *run* (3+ consecutive cards of the same suit).
- **Deadwood** = the point total of cards not part of any meld (A=1, number cards = face value, J/Q/K = 10).
- **Knock**: if your deadwood is 10 or less after discarding, you may end the round. The opponent can then lay off their own deadwood cards onto your melds before final scoring.
  - If your deadwood ends up lower than the opponent's (after lay-offs), you score the difference.
  - If the opponent's deadwood is lower or equal (an "undercut"), they win instead and receive a +25 bonus.
- **Gin**: if your deadwood is exactly 0 after discarding, you may declare Gin immediately. No lay-offs are allowed; you score 25 + the opponent's full deadwood.
- **Surrender**: either player may forfeit the round early (must be accepted by the opponent in multiplayer); the opponent is awarded a flat 25 points.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js, Express |
| Real-time transport | Socket.IO (WebSocket-based) |
| Client | Vanilla HTML / CSS / JavaScript (no build step, no framework) |
| Game state | In-memory (per-process `Map` of rooms) — no database |
| Accounts / social | Supabase (auth, profiles, friends, direct messages) |
| Hosting | Render (free tier) |

---

## Project Structure

```
gin-rummy/
├── server.js           # Express + Socket.IO server: rooms, game rules, AI logic
├── public/
│   └── index.html       # Online multiplayer client (lobby, waiting room, game UI)
├── index.html            # Standalone local single-player prototype (vs. simple AI, no server)
├── package.json
└── README.md
```

- `server.js` is the single source of truth for game rules. The client in `public/index.html` only renders state and sends intent (e.g. "I want to draw from the deck") — the server validates and applies every action.
- The root-level `index.html` is an earlier, fully client-side prototype kept for reference; it is not used by the deployed server.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (LTS recommended)

### Install & run locally

```bash
git clone https://github.com/Choi0619/gin-rummy-online.git
cd gin-rummy-online
npm install
node server.js
```

Then open **http://localhost:3000** in your browser. Open a second tab (or share your local network / a tunnel like `ngrok http 3000`) to test with a second player.

### Scripts

```bash
npm start   # same as `node server.js`
```

---

## How Multiplayer Works

1. **Create a room** → server generates a 5-character room code and creates an in-memory room object.
2. **Join a room** → the second player enters the code (or opens a `?room=CODE` link); the server pairs the two sockets together.
3. **Ready up** → once both players click "Ready," the server shuffles a deck, deals hands, and emits the initial game state to each player individually (each player only ever receives their *own* hand — the opponent's cards are never sent to the client, only the card count).
4. **Turns** → every draw/discard/knock/gin request goes from client → server as an `action` event; the server validates turn order and game phase, mutates the authoritative `room.game` state, and broadcasts the result back to both clients.
5. **Round end** → the server computes melds, deadwood, lay-offs, and the winner, then emits a `round-end` event with full details (both hands revealed) for the result screen.
6. **Rematch** → both players must click "Play Again" before a new round starts (skipped automatically against the AI).

All game state lives in server memory (`const rooms = new Map()`), so **redeploying or restarting the server wipes any in-progress games**. There is currently no database or persistent storage — see [Known Limitations](#known-limitations).

---

## AI Opponent

The AI (used both in solo "Play vs AI" mode and in "AI takeover" while a player is away) makes two decisions per turn:

1. **What to draw**: it simulates adding the top discard card to its hand and compares the resulting best-case deadwood to its current deadwood. It only takes the discard pile card if doing so strictly improves its hand; otherwise it draws from the deck.
2. **What to discard**: it tries removing each card in its hand one at a time, recomputes the optimal meld arrangement for the remaining 10 cards, and keeps whichever discard results in the lowest deadwood (ties are broken by discarding the higher-value card first).

It knocks or declares Gin immediately whenever it becomes eligible — it does not bluff or hold back strategically.

---

## Deployment

The app is deployed on **Render** (free tier):

- **Build command**: `npm install`
- **Start command**: `node server.js`
- Render auto-redeploys on every push to `master`.

⚠️ Because game state is in-memory only, **a redeploy or server restart will disconnect any games in progress**. Avoid pushing to `master` while a match is actively being played, or warn players in advance.

---

## Known Limitations

- **Game state is not persisted**: active rooms/games live in server memory only; a restart or redeploy loses any match in progress. (Player accounts, profiles, friends, and DMs *are* persisted separately via Supabase.)
- **No reconnection across socket IDs**: if a player's browser tab fully disconnects and reconnects with a new socket, they cannot rejoin an in-progress room (only the in-session "away/AI takeover" flow is supported for temporary absences).
- **2 players only**: standard Gin Rummy is a 2-player game; this implementation does not support 3+ player variants.

---

## License

No license specified — personal/hobby project.
