// src/ship.js
export function createShip(length) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("length must be a positive integer");
  }

  let hits = 0;

  return {
    length,
    getHits() {
      return hits;
    },
    hit() {
      if (hits < length) hits += 1;
    },
    isSunk() {
      return hits >= length;
    }
  };
}