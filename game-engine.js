// ============================================================
//  CRAB BREAKTHROUGH  -  Game Engine (server-side)
//  Extracted game logic — no rendering, no DOM, no audio
// ============================================================
"use strict";

const TILE = 32;
const COLS = 20;
const ROWS = 15;
const W = COLS * TILE;  // 640
const H = ROWS * TILE;  // 480

const STATE = {
  LOBBY: -1,
  PLAYING: 1,
  DYING: 2,
  LEVEL_CLEAR: 3,
  GAME_OVER: 4,
  WIN: 5,
};

// ---- Level maps ----
// 0 = empty, 1 = coral, 2 = seaweed, 3 = cookie crumb
const LEVEL_TEMPLATES = [
  // Level 1
  {
    map: [
      "00000000000000000000",
      "00000000000000000000",
      "00030003000030000300",
      "00000000000000000000",
      "01000200010002000100",
      "00000000000000000000",
      "00030003000030000300",
      "00000000000000000000",
      "00200100020001000020",
      "00000000000000000000",
      "00030003000030000300",
      "00000000000000000000",
      "00000100000002000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 15, row: 3, dir: -1 },
      { type: "stingray", col: 5, row: 7, dir: 1 },
    ],
    playerStart: { col: 1, row: 13 },
  },
  // Level 2
  {
    map: [
      "00000000000000000000",
      "00300030003000300030",
      "01000010000100001000",
      "00000000000000000000",
      "00030003000300030003",
      "00001002000020010000",
      "00000000000000000000",
      "03000300030003000300",
      "00020001000010020000",
      "00000000000000000000",
      "00300030003000300030",
      "01000100000001000100",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 18, row: 2, dir: -1 },
      { type: "shark", col: 2, row: 8, dir: 1 },
      { type: "stingray", col: 10, row: 5, dir: 1 },
      { type: "porcupinefish", col: 14, row: 10, dir: -1 },
    ],
    playerStart: { col: 0, row: 13 },
  },
  // Level 3
  {
    map: [
      "00000000000000000000",
      "03020300030203000302",
      "00010000010000010000",
      "03000300030003000300",
      "00000100000001000000",
      "00300030003000300030",
      "02000020000200002000",
      "03000300030003000300",
      "00010000010000010000",
      "00300030003000300030",
      "00000200000002000000",
      "03020300030203000300",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 17, row: 1, dir: -1 },
      { type: "shark", col: 3, row: 6, dir: 1 },
      { type: "stingray", col: 10, row: 3, dir: -1 },
      { type: "stingray", col: 8, row: 9, dir: 1 },
      { type: "porcupinefish", col: 15, row: 5, dir: -1 },
      { type: "porcupinefish", col: 5, row: 11, dir: 1 },
    ],
    playerStart: { col: 10, row: 13 },
  },
  // Level 4
  {
    map: [
      "00000000000000000000",
      "03010301030103010301",
      "00000000000000000000",
      "00200030002000300020",
      "00000000000000000000",
      "01030103010301030103",
      "00000000000000000000",
      "00300020003000200030",
      "00000000000000000000",
      "03010301030103010301",
      "00000000000000000000",
      "00200030002000300020",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 18, row: 2, dir: -1 },
      { type: "shark", col: 1, row: 8, dir: 1 },
      { type: "stingray", col: 6, row: 4, dir: 1 },
      { type: "porcupinefish", col: 10, row: 1, dir: 1 },
      { type: "urchin", col: 5, row: 5, dir: 0 },
      { type: "urchin", col: 14, row: 5, dir: 0 },
      { type: "urchin", col: 9, row: 9, dir: 0 },
    ],
    playerStart: { col: 10, row: 13 },
  },
  // Level 5
  {
    map: [
      "00000000000000000000",
      "03000300030003000300",
      "00020002000200020002",
      "03000300030003000300",
      "00010001000100010001",
      "00300030003000300030",
      "02000200020002000200",
      "00300030003000300030",
      "01000100010001000100",
      "03000300030003000300",
      "00020002000200020002",
      "03000300030003000300",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 0, row: 2, dir: 1 },
      { type: "shark", col: 19, row: 8, dir: -1 },
      { type: "stingray", col: 14, row: 5, dir: -1 },
      { type: "urchin", col: 10, row: 4, dir: 0 },
      { type: "urchin", col: 10, row: 8, dir: 0 },
    ],
    playerStart: { col: 10, row: 13 },
  },
  // Level 6
  {
    map: [
      "00000000000000000000",
      "03020103020103020103",
      "01000200010002000100",
      "03000300030003000300",
      "00020100020001000200",
      "00300030003000300030",
      "01000200010002000100",
      "03020103020103020103",
      "00010000010000010000",
      "00300030003000300030",
      "02000100020001000200",
      "03020103020103020103",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 0, row: 2, dir: 1 },
      { type: "shark", col: 19, row: 6, dir: -1 },
      { type: "stingray", col: 8, row: 7, dir: 1 },
      { type: "penguin", col: 5, row: 3, dir: 1 },
      { type: "penguin", col: 15, row: 9, dir: -1 },
      { type: "urchin", col: 10, row: 5, dir: 0 },
      { type: "urchin", col: 10, row: 9, dir: 0 },
    ],
    playerStart: { col: 10, row: 13 },
  },
  // Level 7
  {
    map: [
      "00000000000000000000",
      "03000030000300003000",
      "00100010001000100010",
      "00030000030000030000",
      "02000020000200002000",
      "00003000003000003000",
      "00100010001000100010",
      "03000030000300003000",
      "00002000002000002000",
      "00030000030000030000",
      "01000010001000100010",
      "00300003000030000300",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 17, row: 1, dir: -1 },
      { type: "shark", col: 3, row: 7, dir: 1 },
      { type: "urchin", col: 5, row: 3, dir: 0 },
      { type: "urchin", col: 14, row: 3, dir: 0 },
      { type: "urchin", col: 9, row: 6, dir: 0 },
      { type: "urchin", col: 5, row: 9, dir: 0 },
      { type: "urchin", col: 14, row: 9, dir: 0 },
      { type: "penguin", col: 8, row: 1, dir: 1 },
    ],
    playerStart: { col: 0, row: 13 },
  },
  // Level 8
  {
    map: [
      "00000000000000000000",
      "03010300030103000301",
      "00000200000002000000",
      "00300030003000300030",
      "01000010000100001000",
      "03020300030203000302",
      "00000000000000000000",
      "00300030003000300030",
      "02000100020001000200",
      "03000300030003000300",
      "00010200000002010000",
      "00300030003000300030",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 18, row: 3, dir: -1 },
      { type: "shark", col: 1, row: 9, dir: 1 },
      { type: "penguin", col: 3, row: 1, dir: 1 },
      { type: "penguin", col: 16, row: 1, dir: -1 },
      { type: "penguin", col: 10, row: 5, dir: 1 },
      { type: "penguin", col: 7, row: 9, dir: -1 },
      { type: "urchin", col: 10, row: 2, dir: 0 },
      { type: "urchin", col: 10, row: 8, dir: 0 },
      { type: "porcupinefish", col: 4, row: 11, dir: 1 },
    ],
    playerStart: { col: 10, row: 13 },
  },
  // Level 9
  {
    map: [
      "00000000000000000000",
      "03010201030102010301",
      "00200100020001000020",
      "03000300030003000300",
      "01020001000010020100",
      "00300030003000300030",
      "02010200020102000201",
      "03000300030003000300",
      "00100020001000200010",
      "00300030003000300030",
      "01000102000020100001",
      "03020103020103020103",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "shark", col: 0, row: 2, dir: 1 },
      { type: "shark", col: 19, row: 8, dir: -1 },
      { type: "stingray", col: 5, row: 4, dir: 1 },
      { type: "stingray", col: 14, row: 10, dir: -1 },
      { type: "penguin", col: 3, row: 1, dir: 1 },
      { type: "penguin", col: 16, row: 6, dir: -1 },
      { type: "penguin", col: 10, row: 10, dir: 1 },
      { type: "porcupinefish", col: 6, row: 6, dir: 1 },
      { type: "urchin", col: 10, row: 5, dir: 0 },
      { type: "urchin", col: 4, row: 9, dir: 0 },
      { type: "urchin", col: 16, row: 9, dir: 0 },
    ],
    playerStart: { col: 10, row: 13 },
  },
  // Level 10 — MEGALODON BOSS
  {
    map: [
      "00000000000000000000",
      "00300030003000300030",
      "00000000000000000000",
      "03000300030003000300",
      "00010000000000010000",
      "00300030003000300030",
      "00000000000000000000",
      "03000300030003000300",
      "00000100000001000000",
      "00300030003000300030",
      "00000000000000000000",
      "03000300030003000300",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    enemies: [
      { type: "megalodon", col: 8, row: 2, dir: -1 },
      { type: "shark", col: 0, row: 6, dir: 1 },
      { type: "shark", col: 19, row: 10, dir: -1 },
      { type: "penguin", col: 4, row: 4, dir: 1 },
      { type: "penguin", col: 15, row: 8, dir: -1 },
      { type: "urchin", col: 6, row: 6, dir: 0 },
      { type: "urchin", col: 13, row: 6, dir: 0 },
      { type: "stingray", col: 10, row: 10, dir: 1 },
    ],
    playerStart: { col: 10, row: 13 },
  },
];

// ---- Collision helpers ----
function isSolid(grid, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  return grid[row][col] === 1;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---- GameRoom class ----
class GameRoom {
  constructor(code) {
    this.code = code;
    this.state = STATE.LOBBY;
    this.score = 0;
    this.level = 0;
    this.frame = 0;
    this.stateTimer = 0;
    this.grid = [];
    this.cookies = [];
    this.enemies = [];
    this.players = [];
    this.babyCrab = null;
    this.events = [];       // sound events for clients
    this.paused = false;
    this.pausedBy = -1;     // playerIdx who paused
    this.gameInterval = null;
    this.playerSlots = [null, null, null, null]; // idx -> playerId
    this.playerNames = ["", "", "", ""];
    this.hostId = null;
    this.lastActivity = Date.now();
  }

  addPlayer(playerId, name) {
    for (let i = 0; i < 4; i++) {
      if (!this.playerSlots[i]) {
        this.playerSlots[i] = playerId;
        this.playerNames[i] = name || ("P" + (i + 1));
        if (i === 0 || !this.hostId) this.hostId = playerId;
        this.lastActivity = Date.now();
        return i;
      }
    }
    return -1; // full
  }

  removePlayer(playerId) {
    for (let i = 0; i < 4; i++) {
      if (this.playerSlots[i] === playerId) {
        this.playerSlots[i] = null;
        this.playerNames[i] = "";
        // Deactivate in-game player
        const p = this.players.find(pl => pl.idx === i);
        if (p) { p.active = false; p.lives = 0; }
        // Reassign host
        if (this.hostId === playerId) {
          this.hostId = this.playerSlots.find(id => id != null) || null;
        }
        this.lastActivity = Date.now();
        break;
      }
    }
  }

  getPlayerIdx(playerId) {
    return this.playerSlots.indexOf(playerId);
  }

  getPlayerCount() {
    return this.playerSlots.filter(Boolean).length;
  }

  isEmpty() {
    return this.getPlayerCount() === 0;
  }

  getConnectedPlayers() {
    const list = [];
    for (let i = 0; i < 4; i++) {
      if (this.playerSlots[i]) {
        list.push({ idx: i, name: this.playerNames[i], isHost: this.playerSlots[i] === this.hostId });
      }
    }
    return list;
  }

  setInput(playerId, input) {
    const idx = this.getPlayerIdx(playerId);
    if (idx === -1) return;
    const p = this.players.find(pl => pl.idx === idx);
    if (p) p.input = input;
    this.lastActivity = Date.now();
  }

  togglePause(playerId) {
    if (this.state !== STATE.PLAYING && !this.paused) return;
    this.paused = !this.paused;
    this.pausedBy = this.paused ? this.getPlayerIdx(playerId) : -1;
    this.events.push({ type: this.paused ? "pause" : "unpause" });
  }

  toggleBubble(playerId) {
    const idx = this.getPlayerIdx(playerId);
    if (idx === -1) return;
    const p = this.players.find(pl => pl.idx === idx);
    if (p && p.active) {
      p.bubbled = !p.bubbled;
      this.events.push({ type: "bubble", playerIdx: idx, on: p.bubbled });
    }
  }

  startGame() {
    this.state = STATE.PLAYING;
    this.score = 0;
    this.level = 0;
    this.frame = 0;
    this.events = [];
    this.players = [];
    for (let i = 0; i < 4; i++) {
      if (this.playerSlots[i]) {
        this.players.push({
          x: 0, y: 0, frame: 0, invuln: 0, lives: 3,
          active: true, bubbled: false, idx: i,
          input: { up: false, down: false, left: false, right: false },
        });
      }
    }
    this.loadLevel(0);
  }

  loadLevel(idx) {
    const template = LEVEL_TEMPLATES[idx % LEVEL_TEMPLATES.length];
    const diffMult = 1 + Math.floor(idx / LEVEL_TEMPLATES.length) * 0.3;

    this.grid = [];
    this.cookies = [];
    this.enemies = [];

    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      const rowStr = template.map[r] || "00000000000000000000";
      for (let c = 0; c < COLS; c++) {
        const ch = rowStr[c] || "0";
        this.grid[r][c] = parseInt(ch);
        if (ch === "3") {
          this.cookies.push({ col: c, row: r, collected: false });
          this.grid[r][c] = 0;
        }
      }
    }

    template.enemies.forEach(e => {
      const baseSpeed = { shark: 2.24, stingray: 1.54, porcupinefish: 0.84,
        urchin: 0, penguin: 1.96, megalodon: 1.82 }[e.type] || 0.7;
      const speed = baseSpeed * diffMult;
      this.enemies.push({
        type: e.type,
        x: e.col * TILE, y: e.row * TILE,
        dir: e.dir,
        dirY: e.type === "stingray" ? 1 : e.type === "penguin" ? 1 : 0,
        speed: Math.min(speed, 7),
        frame: 0, puffed: false, puffTimer: 0,
        lunging: false, lungeTimer: 0,
        homeX: e.col * TILE, homeY: e.row * TILE,
      });
    });

    // Position all active players
    const ps = template.playerStart;
    const offsets = [
      { dx: 0, dy: 0 }, { dx: TILE, dy: 0 },
      { dx: 0, dy: -TILE }, { dx: TILE, dy: -TILE },
    ];
    for (const p of this.players) {
      if (!p.active) continue;
      const off = offsets[p.idx] || offsets[0];
      p.x = Math.max(0, Math.min(W - TILE, ps.col * TILE + off.dx));
      p.y = Math.max(0, Math.min(H - TILE, ps.row * TILE + off.dy));
      p.frame = 0;
      p.invuln = 0;
      p.bubbled = false;
    }

    // Remove cookies under urchins
    const urchinSet = new Set();
    for (const e of this.enemies) {
      if (e.type === "urchin") {
        urchinSet.add(Math.floor(e.x / TILE) + "," + Math.floor(e.y / TILE));
      }
    }
    this.cookies = this.cookies.filter(ck => !urchinSet.has(ck.col + "," + ck.row));

    // Baby crab on every 4th level
    this.babyCrab = null;
    if ((idx + 1) % 4 === 0) {
      const empties = [];
      for (let r = 1; r < ROWS - 2; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c] === 0 && !(c === ps.col && r === ps.row) &&
              !this.cookies.some(ck => ck.col === c && ck.row === r)) {
            empties.push({ col: c, row: r });
          }
        }
      }
      if (empties.length > 0) {
        const pick = empties[Math.floor(Math.random() * empties.length)];
        this.babyCrab = { col: pick.col, row: pick.row, collected: false };
      }
    }
  }

  // Find nearest active non-bubbled player for enemy AI
  findNearestPlayer(x, y) {
    let best = null, bestDist = Infinity;
    for (const p of this.players) {
      if (!p.active || p.bubbled) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  }

  // ---- One game tick ----
  tick() {
    this.events = [];
    if (this.paused) return;
    this.frame++;

    switch (this.state) {
      case STATE.PLAYING:
        this.updatePlayers();
        this.updateEnemies();
        break;
      case STATE.DYING:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.loadLevel(this.level);
          this.state = STATE.PLAYING;
        }
        break;
      case STATE.LEVEL_CLEAR:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          if (this.level >= LEVEL_TEMPLATES.length - 1) {
            this.state = STATE.WIN;
            this.stateTimer = 240;
          } else {
            this.level++;
            this.loadLevel(this.level);
            this.state = STATE.PLAYING;
          }
        }
        break;
      case STATE.GAME_OVER:
        if (this.stateTimer > 0) this.stateTimer--;
        break;
    }
  }

  updatePlayers() {
    for (const p of this.players) {
      if (!p.active || p.bubbled) continue;
      if (p.invuln > 0) p.invuln--;

      const speed = 3.36;
      let dx = 0, dy = 0;
      if (p.input.left)  dx = -speed;
      if (p.input.right) dx = speed;
      if (p.input.up)    dy = -speed;
      if (p.input.down)  dy = speed;

      if (dx && dy) { dx *= 0.707; dy *= 0.707; }

      // Try X
      const m = 4;
      if (dx !== 0) {
        const nx = p.x + dx;
        const left = Math.floor((nx + m) / TILE);
        const right = Math.floor((nx + TILE - 1 - m) / TILE);
        const top = Math.floor((p.y + m) / TILE);
        const bot = Math.floor((p.y + TILE - 1 - m) / TILE);
        let blocked = false;
        for (let r = top; r <= bot; r++)
          for (let c = left; c <= right; c++)
            if (isSolid(this.grid, c, r)) blocked = true;
        if (!blocked) p.x = nx;
      }

      // Try Y
      if (dy !== 0) {
        const ny = p.y + dy;
        const left = Math.floor((p.x + m) / TILE);
        const right = Math.floor((p.x + TILE - 1 - m) / TILE);
        const top = Math.floor((ny + m) / TILE);
        const bot = Math.floor((ny + TILE - 1 - m) / TILE);
        let blocked = false;
        for (let r = top; r <= bot; r++)
          for (let c = left; c <= right; c++)
            if (isSolid(this.grid, c, r)) blocked = true;
        if (!blocked) p.y = ny;
      }

      // Clamp
      p.x = Math.max(0, Math.min(W - TILE, p.x));
      p.y = Math.max(0, Math.min(H - TILE, p.y));

      // Animate
      if (dx || dy) p.frame += 0.15;

      // Seaweed bounce
      const pcol = Math.floor((p.x + TILE / 2) / TILE);
      const prow = Math.floor((p.y + TILE / 2) / TILE);
      if (pcol >= 0 && pcol < COLS && prow >= 0 && prow < ROWS && this.grid[prow][pcol] === 2) {
        const swCx = pcol * TILE + TILE / 2;
        const swCy = prow * TILE + TILE / 2;
        let bx = (p.x + TILE / 2) - swCx;
        let by = (p.y + TILE / 2) - swCy;
        const len = Math.hypot(bx, by) || 1;
        bx /= len; by /= len;
        p.x += bx * 3.5;
        p.y += by * 3.5;
        p.x = Math.max(0, Math.min(W - TILE, p.x));
        p.y = Math.max(0, Math.min(H - TILE, p.y));
      }

      // Collect cookies
      for (const ck of this.cookies) {
        if (ck.collected) continue;
        if (rectsOverlap(p.x + 4, p.y + 4, 24, 24, ck.col * TILE + 6, ck.row * TILE + 6, 20, 20)) {
          ck.collected = true;
          this.score += 100;
          this.events.push({ type: "collect", playerIdx: p.idx });
        }
      }

      // Collect baby crab
      if (this.babyCrab && !this.babyCrab.collected) {
        if (rectsOverlap(p.x + 4, p.y + 4, 24, 24,
            this.babyCrab.col * TILE + 6, this.babyCrab.row * TILE + 6, 20, 20)) {
          this.babyCrab.collected = true;
          p.lives++;
          this.score += 250;
          this.events.push({ type: "baby_crab", playerIdx: p.idx });
        }
      }
    }

    // Level complete
    if (this.cookies.length > 0 && this.cookies.every(c => c.collected)) {
      this.score += 500 + this.level * 200;
      this.state = STATE.LEVEL_CLEAR;
      this.stateTimer = 120;
      this.events.push({ type: "level_clear" });
    }
  }

  updateEnemies() {
    for (const e of this.enemies) {
      e.frame += 0.1;
      const target = this.findNearestPlayer(e.x, e.y);

      switch (e.type) {
        case "shark":
          e.x += e.dir * e.speed;
          if (e.x <= 0 || e.x >= W - TILE) e.dir *= -1;
          {
            const fc = e.dir > 0 ? Math.floor((e.x + TILE) / TILE) : Math.floor(e.x / TILE);
            const fr = Math.floor((e.y + TILE / 2) / TILE);
            if (fc < 0 || fc >= COLS || isSolid(this.grid, fc, fr)) e.dir *= -1;
          }
          break;

        case "stingray":
          e.x += e.dir * e.speed;
          e.y += e.dirY * e.speed * 0.7;
          if (e.x <= 0 || e.x >= W - TILE) e.dir *= -1;
          if (e.y <= 0 || e.y >= H - TILE * 2) e.dirY *= -1;
          {
            const fc = Math.floor((e.x + TILE / 2) / TILE);
            const fr = Math.floor((e.y + TILE / 2) / TILE);
            if (isSolid(this.grid, fc, fr)) { e.dir *= -1; e.dirY *= -1; }
          }
          break;

        case "porcupinefish":
          {
            const dist = target ? Math.hypot(target.x - e.x, target.y - e.y) : Infinity;
            if (dist < TILE * 4 && target) {
              e.puffed = true;
              e.puffTimer = 60;
              const angle = Math.atan2(target.y - e.y, target.x - e.x);
              e.x += Math.cos(angle) * e.speed * 0.5;
              e.y += Math.sin(angle) * e.speed * 0.5;
            } else {
              if (e.puffTimer > 0) e.puffTimer--;
              else e.puffed = false;
              e.x += e.dir * e.speed;
              if (e.x <= 0 || e.x >= W - TILE) e.dir *= -1;
            }
            const fc = Math.floor((e.x + TILE / 2) / TILE);
            const fr = Math.floor((e.y + TILE / 2) / TILE);
            if (isSolid(this.grid, fc, fr)) { e.dir *= -1; e.x += e.dir * e.speed * 2; }
            e.x = Math.max(0, Math.min(W - TILE, e.x));
            e.y = Math.max(0, Math.min(H - TILE, e.y));
          }
          break;

        case "urchin":
          break;

        case "penguin":
          {
            const dist = target ? Math.hypot(target.x - e.x, target.y - e.y) : Infinity;
            const boost = dist < TILE * 3 ? 1.8 : 1;
            e.x += e.dir * e.speed * boost;
            e.y += e.dirY * e.speed * 0.8 * boost;
            if (e.x <= 0 || e.x >= W - TILE) e.dir *= -1;
            if (e.y <= 0 || e.y >= H - TILE * 2) e.dirY *= -1;
            const fc = Math.floor((e.x + TILE / 2) / TILE);
            const fr = Math.floor((e.y + TILE / 2) / TILE);
            if (isSolid(this.grid, fc, fr)) { e.dir *= -1; e.dirY *= -1; }
          }
          break;

        case "megalodon":
          {
            const tgt = target;
            const yDiff = tgt ? Math.abs(tgt.y - e.y) : Infinity;
            if (yDiff < TILE * 1.5 && tgt) {
              const chDir = tgt.x > e.x ? 1 : -1;
              e.x += chDir * e.speed * 1.6;
              e.dir = chDir;
            } else {
              e.x += e.dir * e.speed;
            }
            if (tgt) {
              if (tgt.y > e.y + 2) e.y += 0.56;
              else if (tgt.y < e.y - 2) e.y -= 0.56;
            }
            if (e.x <= 0 || e.x >= W - TILE * 2) e.dir *= -1;
            e.x = Math.max(0, Math.min(W - TILE * 2, e.x));
            e.y = Math.max(0, Math.min(H - TILE * 2, e.y));
          }
          break;
      }

      // Collision with active non-bubbled players
      let hitMargin = 6;
      let hw = TILE, hh = TILE;
      if (e.type === "porcupinefish" && e.puffed) hitMargin = 2;
      if (e.type === "urchin") hitMargin = 4;
      if (e.type === "megalodon") { hw = TILE * 2; hh = TILE * 1.2; hitMargin = 4; }
      for (const p of this.players) {
        if (!p.active || p.invuln > 0 || p.bubbled) continue;
        if (rectsOverlap(p.x + 6, p.y + 6, 20, 20,
            e.x + hitMargin, e.y + hitMargin, hw - hitMargin * 2, hh - hitMargin * 2)) {
          this.playerHit(p);
        }
      }
    }
  }

  playerHit(p) {
    p.lives--;
    this.events.push({ type: "hit", playerIdx: p.idx });
    if (p.lives <= 0) {
      p.active = false;
      if (this.players.every(pl => !pl.active)) {
        this.state = STATE.GAME_OVER;
        this.stateTimer = 180;
        this.events.push({ type: "game_over" });
      }
    } else {
      p.invuln = 90;
    }
  }

  // Serializable snapshot for clients
  getState() {
    return {
      state: this.state,
      score: this.score,
      level: this.level,
      frame: this.frame,
      stateTimer: this.stateTimer,
      players: this.players.map(p => ({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        frame: Math.round(p.frame * 10) / 10,
        invuln: p.invuln,
        lives: p.lives,
        active: p.active,
        bubbled: p.bubbled,
        idx: p.idx,
      })),
      enemies: this.enemies.map(e => ({
        type: e.type,
        x: Math.round(e.x * 10) / 10,
        y: Math.round(e.y * 10) / 10,
        dir: e.dir,
        dirY: e.dirY,
        frame: Math.round(e.frame * 10) / 10,
        puffed: e.puffed,
      })),
      cookies: this.cookies.map(c => ({
        col: c.col, row: c.row, collected: c.collected,
      })),
      grid: this.grid,
      babyCrab: this.babyCrab,
      events: this.events,
      paused: this.paused,
      pausedBy: this.pausedBy,
    };
  }

  stopGame() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    this.state = STATE.LOBBY;
  }
}

module.exports = { GameRoom, STATE, LEVEL_TEMPLATES, TILE, COLS, ROWS, W, H };
