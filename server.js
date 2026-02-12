// ============================================================
//  CRAB BREAKTHROUGH  -  Online Multiplayer Server
//  Node.js + Express + WebSocket
// ============================================================
"use strict";

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");
const { GameRoom, STATE } = require("./game-engine");

const PORT = process.env.PORT || 3000;
const TICK_RATE = 60;
const BROADCAST_EVERY = 3; // broadcast state every N ticks (~20/sec)
const ROOM_TIMEOUT = 120_000; // 2 min idle before room cleanup

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ---- Room management ----
const rooms = new Map();     // code -> GameRoom
const clients = new Map();   // ws -> { id, roomCode, playerIdx }

let nextClientId = 1;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code;
  do {
    code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function send(ws, msg) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(roomCode, msg, excludeWs) {
  for (const [ws, info] of clients) {
    if (info.roomCode === roomCode && ws !== excludeWs) {
      send(ws, msg);
    }
  }
}

function getClientsInRoom(roomCode) {
  const list = [];
  for (const [ws, info] of clients) {
    if (info.roomCode === roomCode) list.push({ ws, ...info });
  }
  return list;
}

// ---- Game loop per room ----
function startRoomGameLoop(room) {
  if (room.gameInterval) return;
  let tickCount = 0;
  room.gameInterval = setInterval(() => {
    room.tick();
    tickCount++;

    // Broadcast state at reduced rate
    if (tickCount % BROADCAST_EVERY === 0) {
      const state = room.getState();
      const msg = JSON.stringify({ type: "state", ...state });
      for (const [ws, info] of clients) {
        if (info.roomCode === room.code && ws.readyState === 1) {
          ws.send(msg);
        }
      }
    }

    // If game ended, stop the loop after a delay
    if (room.state === STATE.GAME_OVER || room.state === STATE.WIN) {
      if (room.stateTimer <= 0) {
        setTimeout(() => {
          room.stopGame();
          broadcastToRoom(room.code, {
            type: "game_ended",
            finalScore: room.score,
            players: room.getConnectedPlayers(),
          });
        }, 3000);
      }
    }
  }, 1000 / TICK_RATE);
}

// ---- Periodic cleanup of empty/stale rooms ----
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.isEmpty() && now - room.lastActivity > ROOM_TIMEOUT) {
      room.stopGame();
      rooms.delete(code);
      console.log(`Room ${code} cleaned up (empty)`);
    }
  }
}, 30_000);

// ---- WebSocket connection handling ----
wss.on("connection", (ws) => {
  const clientId = "c" + nextClientId++;
  clients.set(ws, { id: clientId, roomCode: null, playerIdx: -1 });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const info = clients.get(ws);
    if (!info) return;

    switch (msg.type) {
      case "create_room": {
        // Leave current room if in one
        if (info.roomCode) leaveRoom(ws);

        const code = generateCode();
        const room = new GameRoom(code);
        rooms.set(code, room);
        const idx = room.addPlayer(clientId, msg.name || "HOST");
        info.roomCode = code;
        info.playerIdx = idx;
        send(ws, {
          type: "room_created",
          code,
          playerIdx: idx,
          players: room.getConnectedPlayers(),
        });
        console.log(`Room ${code} created by ${msg.name || "HOST"}`);
        break;
      }

      case "join_room": {
        if (info.roomCode) leaveRoom(ws);

        const code = (msg.code || "").toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) {
          send(ws, { type: "error", msg: "Room not found" });
          break;
        }
        if (room.state !== STATE.LOBBY) {
          send(ws, { type: "error", msg: "Game already in progress" });
          break;
        }
        if (room.getPlayerCount() >= 4) {
          send(ws, { type: "error", msg: "Room is full" });
          break;
        }

        const idx = room.addPlayer(clientId, msg.name || "GUEST");
        info.roomCode = code;
        info.playerIdx = idx;

        send(ws, {
          type: "room_joined",
          code,
          playerIdx: idx,
          players: room.getConnectedPlayers(),
        });
        broadcastToRoom(code, {
          type: "player_joined",
          playerIdx: idx,
          name: msg.name || "GUEST",
          players: room.getConnectedPlayers(),
        }, ws);
        console.log(`${msg.name || "GUEST"} joined room ${code} as P${idx + 1}`);
        break;
      }

      case "start_game": {
        const room = rooms.get(info.roomCode);
        if (!room) break;
        if (room.hostId !== clientId) {
          send(ws, { type: "error", msg: "Only the host can start" });
          break;
        }
        if (room.state !== STATE.LOBBY) break;

        room.startGame();
        broadcastToRoom(info.roomCode, {
          type: "game_started",
          state: room.getState(),
        });
        startRoomGameLoop(room);
        console.log(`Room ${info.roomCode} game started`);
        break;
      }

      case "input": {
        const room = rooms.get(info.roomCode);
        if (!room || room.state !== STATE.PLAYING) break;
        room.setInput(clientId, {
          up: !!msg.up,
          down: !!msg.down,
          left: !!msg.left,
          right: !!msg.right,
        });
        break;
      }

      case "bubble": {
        const room = rooms.get(info.roomCode);
        if (!room || room.state !== STATE.PLAYING) break;
        room.toggleBubble(clientId);
        break;
      }

      case "leave": {
        leaveRoom(ws);
        break;
      }

      case "restart": {
        const room = rooms.get(info.roomCode);
        if (!room) break;
        if (room.hostId !== clientId) break;
        if (room.state === STATE.LOBBY) break;
        room.stopGame();
        broadcastToRoom(info.roomCode, {
          type: "game_ended",
          finalScore: room.score,
          players: room.getConnectedPlayers(),
        });
        break;
      }
    }
  });

  ws.on("close", () => {
    leaveRoom(ws);
    clients.delete(ws);
  });

  ws.on("error", () => {
    leaveRoom(ws);
    clients.delete(ws);
  });
});

function leaveRoom(ws) {
  const info = clients.get(ws);
  if (!info || !info.roomCode) return;

  const room = rooms.get(info.roomCode);
  const code = info.roomCode;
  info.roomCode = null;
  info.playerIdx = -1;

  if (!room) return;

  const wasHost = room.hostId === info.id;
  room.removePlayer(info.id);

  if (room.isEmpty()) {
    room.stopGame();
    rooms.delete(code);
    console.log(`Room ${code} deleted (last player left)`);
  } else {
    broadcastToRoom(code, {
      type: "player_left",
      playerIdx: info.playerIdx,
      players: room.getConnectedPlayers(),
      hostLeft: wasHost,
    });
    if (wasHost) {
      // Notify new host
      const newHostId = room.hostId;
      for (const [ws2, info2] of clients) {
        if (info2.id === newHostId) {
          send(ws2, { type: "you_are_host" });
          break;
        }
      }
    }
    // If all in-game players are gone, stop the game
    if (room.state !== STATE.LOBBY && room.players.every(p => !p.active)) {
      room.stopGame();
      broadcastToRoom(code, {
        type: "game_ended",
        finalScore: room.score,
        players: room.getConnectedPlayers(),
      });
    }
  }
}

server.listen(PORT, () => {
  console.log(`Crab Breakthrough server running on http://localhost:${PORT}`);
});
