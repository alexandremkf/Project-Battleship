// src/index.js
import { createPlayer } from "./player.js";
import { createShip } from "./ship.js";

/**
 * createGame() retorna um objeto que encapsula o jogo e expõe
 * funções úteis para a UI (dom.js):
 * - placePlayerShip(length, x, y, dir)
 * - autoPlaceAll() // random
 * - playerAttack(x,y)
 * - cpuMove() // cpu joga uma vez (usado internamente)
 * - restart()
 * - getters: playerBoard, computerBoard, isGameOver, winner
 *
 * Implementa CPU com estratégia hunt/target (mais inteligente).
 */
export default function createGame(boardSize = 10) {
  // players
  let player = createPlayer("You", "human", boardSize);
  let cpu = createPlayer("CPU", "computer", boardSize);

  // turn control: 'player' or 'cpu'
  let currentTurn = "player";
  let gameOver = false;
  let winner = null;

  // CPU intelligence state
  const cpuState = {
    mode: "hunt", // 'hunt' or 'target'
    // for 'target' mode:
    hitStack: [], // coords to try next (queue)
    hitsHistory: [] // consecutive successful hits on same ship
  };

  // Helpers
  function coordKey({ x, y }) {
    return `${x},${y}`;
  }

  function inBounds(x, y) {
    return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
  }

  // API: placing ships for player
  function placePlayerShip(length, x, y, direction = "horizontal") {
    if (gameOver) throw new Error("Game over");
    const ship = createShip(length);
    return player.gameboard.placeShip(ship, { x, y }, direction);
  }

  function placeCpuShip(length, x, y, direction = "horizontal") {
    const ship = createShip(length);
    return cpu.gameboard.placeShip(ship, { x, y }, direction);
  }

  // Auto-place ships randomly (simple)
  function autoPlaceBoard(board, shipsLengths = [5,4,3,3,2]) {
    for (const len of shipsLengths) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 1000) {
        attempts++;
        const dir = Math.random() < 0.5 ? "horizontal" : "vertical";
        const x = Math.floor(Math.random() * boardSize);
        const y = Math.floor(Math.random() * boardSize);
        try {
          const ship = createShip(len);
          board.placeShip(ship, { x, y }, dir);
          placed = true;
        } catch (e) {
          // try again
        }
      }
      if (!placed) throw new Error("Could not place ship (bad RNG)"); // extremely unlikely
    }
  }

  function autoPlaceAll() {
    // clear boards by recreating players
    player = createPlayer("You", "human", boardSize);
    cpu = createPlayer("CPU", "computer", boardSize);
    autoPlaceBoard(player.gameboard);
    autoPlaceBoard(cpu.gameboard);
    currentTurn = "player";
    gameOver = false;
    winner = null;
    cpuState.mode = "hunt";
    cpuState.hitStack = [];
    cpuState.hitsHistory = [];
  }

  // Game start default: auto place both
  autoPlaceAll();

  // Attack API (player attacks CPU)
  function playerAttack(x, y) {
    if (gameOver) return { error: "Game over" };
    if (currentTurn !== "player") return { error: "Not player's turn" };
    if (!inBounds(x, y)) return { error: "Out of bounds" };

    // Send attack to cpu board
    const res = cpu.gameboard.receiveAttack({ x, y });

    // If already tried, signal that
    if (res && res.alreadyTried) {
      return { alreadyTried: true };
    }

    // If hit -> change CPU state? CPU doesn't care
    // Check for win
    if (cpu.gameboard.allShipsSunk()) {
      gameOver = true;
      winner = "player";
      return { ...res, winner };
    }

    // switch to cpu turn
    currentTurn = "cpu";
    return { ...res, next: "cpu" };
  }

  // CPU move: implements hunt/target
  function cpuMove() {
    if (gameOver) return { error: "Game over" };
    if (currentTurn !== "cpu") return { error: "Not CPU turn" };

    // helper to pick a random legal coordinate not tried before
    function pickRandomUntried() {
      let x, y, key;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * boardSize);
        y = Math.floor(Math.random() * boardSize);
        key = `${x},${y}`;
        attempts++;
        if (attempts > 10000) throw new Error("CPU stuck");
      } while (player.gameboard.shots?.has(key) || player.gameboard._localShotSet?.has?.(key));
      return { x, y };
    }

    // try next from hitStack if in 'target' mode
    let targetCoord = null;
    while (cpuState.mode === "target" && cpuState.hitStack.length > 0) {
      const { x, y } = cpuState.hitStack.shift();
      const key = coordKey({ x, y });
      if (!player.gameboard.shots?.has(key)) {
        targetCoord = { x, y };
        break;
      }
      // otherwise keep popping
    }

    // If no targetCoord from stack, and mode is target but empty, fall back to hunt
    if (!targetCoord) {
      cpuState.mode = "hunt";
    }

    let attackCoord = null;
    if (cpuState.mode === "hunt") {
      // pick random untried
      attackCoord = pickRandomUntried();
    } else {
      attackCoord = targetCoord;
    }

    // perform attack
    const res = player.gameboard.receiveAttack(attackCoord);

    // handle result
    if (res.hit) {
      // switch to target mode and add adjacent squares to stack
      cpuState.mode = "target";
      // record this hit
      cpuState.hitsHistory.push(attackCoord);

      // generate adjacent coords (up, down, left, right)
      const adj = [
        { x: attackCoord.x + 1, y: attackCoord.y },
        { x: attackCoord.x - 1, y: attackCoord.y },
        { x: attackCoord.x, y: attackCoord.y + 1 },
        { x: attackCoord.x, y: attackCoord.y - 1 },
      ];
      for (const c of adj) {
        if (inBounds(c.x, c.y)) {
          const key = coordKey(c);
          // only add if not already tried and not already queued
          if (!player.gameboard.shots?.has(key) && !cpuState.hitStack.some(h => h.x === c.x && h.y === c.y)) {
            cpuState.hitStack.push(c);
          }
        }
      }
      // if sunk, clear target mode (ship is sunk)
      if (res.sunk) {
        cpuState.mode = "hunt";
        cpuState.hitStack = [];
        cpuState.hitsHistory = [];
      }
    }

    // Check for win
    if (player.gameboard.allShipsSunk()) {
      gameOver = true;
      winner = "cpu";
      return { ...res, winner };
    }

    // switch to player turn
    currentTurn = "player";
    return res;
  }

  // Restart function
  function restart() {
    player = createPlayer("You", "human", boardSize);
    cpu = createPlayer("CPU", "computer", boardSize);
    autoPlaceAll();
    currentTurn = "player";
    gameOver = false;
    winner = null;
    cpuState.mode = "hunt";
    cpuState.hitStack = [];
    cpuState.hitsHistory = [];
  }

  // Game-inspection helpers (for UI rendering)
  function getPlayerCellState(x, y) {
    // returns: { hasShip: bool, hit: bool, miss: bool }
    const key = coordKey({ x, y });
    const hasShip = !!player.gameboard.getShips().some(s =>
      s.coords.some(c => c.x === x && c.y === y)
    );
    const hit = !!player.gameboard.getShips().some(s => s.ship.getHits && s.ship.getHits() && false); // avoid duplicating; we'll check shot sets
    const shotIsHit = player.gameboard._localHitSet?.has(key) || false;
    const shotIsMiss = player.gameboard.getMissedAttacks().some(c => c.x === x && c.y === y);
    // fallback: check board.shots or missedShots if those exist
    const shotsSet = player.gameboard.shots;
    const missedSet = player.gameboard.missedShots || new Set(player.gameboard.getMissedAttacks().map(c => coordKey(c)));
    return {
      hasShip,
      hit: shotsSet ? shotsSet.has(key) : shotIsHit,
      miss: missedSet ? missedSet.has(key) : shotIsMiss
    };
  }

  function getComputerCellState(x, y) {
    const key = coordKey({ x, y });
    const shotsSet = cpu.gameboard.shots;
    const missedSet = cpu.gameboard.missedShots || new Set(cpu.gameboard.getMissedAttacks().map(c => coordKey(c)));
    return {
      hit: shotsSet ? shotsSet.has(key) : false,
      miss: missedSet ? missedSet.has(key) : false,
      // do not reveal ships
    };
  }

  return {
    // actions
    placePlayerShip,
    placeCpuShip,
    autoPlaceAll,
    playerAttack,
    cpuMove,
    restart,
    // inspection
    get playerBoard() {
      return player.gameboard;
    },
    get computerBoard() {
      return cpu.gameboard;
    },
    get currentTurn() {
      return currentTurn;
    },
    get isGameOver() {
      return gameOver;
    },
    get winner() {
      return winner;
    },
    getPlayerCellState,
    getComputerCellState,
  };
}