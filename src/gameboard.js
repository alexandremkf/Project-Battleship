// src/gameboard.js
export function createGameboard(size = 10) {
  if (!Number.isInteger(size) || size <= 0) throw new Error("Invalid size");

  const ships = [];
  const occupied = new Map(); // "x,y" -> shipIndex
  const missedAttacks = new Set();

  function coordKey({ x, y }) {
    return `${x},${y}`;
  }

  function inBounds({ x, y }) {
    return x >= 0 && x < size && y >= 0 && y < size;
  }

  function canPlace({ x, y }, length, direction) {
    for (let i = 0; i < length; i++) {
      const cx = direction === "horizontal" ? x + i : x;
      const cy = direction === "vertical" ? y + i : y;
      if (!inBounds({ x: cx, y: cy })) return false;
      if (occupied.has(`${cx},${cy}`)) return false;
    }
    return true;
  }

  function placeShip(shipObj, start, direction = "horizontal") {
    const len = shipObj.length;
    if (!canPlace(start, len, direction)) throw new Error("Invalid placement");
    const coords = [];
    for (let i = 0; i < len; i++) {
      const cx = direction === "horizontal" ? start.x + i : start.x;
      const cy = direction === "vertical" ? start.y + i : start.y;
      const key = coordKey({ x: cx, y: cy });
      occupied.set(key, ships.length);
      coords.push({ x: cx, y: cy });
    }
    ships.push({ shipObj, coords });
    return coords;
  }

  function receiveAttack(coord) {
    if (!inBounds(coord)) throw new Error("Attack out of bounds");
    const key = coordKey(coord);
    // if previously missed here
    if (missedAttacks.has(key)) return { alreadyTried: true };
    if (occupied.has(key)) {
      const shipIndex = occupied.get(key);
      const entry = ships[shipIndex];
      entry._hitCoords = entry._hitCoords || new Set();
      if (entry._hitCoords.has(key)) {
        return { alreadyTried: true, hit: true };
      }
      entry._hitCoords.add(key);
      entry.shipObj.hit();
      const sunk = entry.shipObj.isSunk();
      return { hit: true, sunk, ship: entry.shipObj };
    } else {
      missedAttacks.add(key);
      return { hit: false };
    }
  }

  function getMissedAttacks() {
    return Array.from(missedAttacks).map(s => {
      const [x, y] = s.split(",").map(Number);
      return { x, y };
    });
  }

  function allShipsSunk() {
    return ships.length > 0 && ships.every(e => e.shipObj.isSunk());
  }

  function getShips() {
    return ships.map(e => ({ coords: e.coords.slice(), ship: e.shipObj }));
  }

  return {
    placeShip,
    receiveAttack,
    getMissedAttacks,
    allShipsSunk,
    getShips,
    size
  };
}