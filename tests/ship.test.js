// tests/ship.test.js
import { createShip } from "../src/ship.js";

describe("Ship", () => {
  test("hit() increases hits and isSunk() only true when hits >= length", () => {
    const ship = createShip(3);
    expect(ship.getHits()).toBe(0);
    expect(ship.isSunk()).toBe(false);

    ship.hit();
    expect(ship.getHits()).toBe(1);
    expect(ship.isSunk()).toBe(false);

    ship.hit();
    ship.hit();
    expect(ship.getHits()).toBe(3);
    expect(ship.isSunk()).toBe(true);

    // extra hit should not increase beyond length
    ship.hit();
    expect(ship.getHits()).toBe(3);
  });

  test("invalid length throws", () => {
    expect(() => createShip(0)).toThrow();
    expect(() => createShip(-1)).toThrow();
    expect(() => createShip("a")).toThrow();
  });
});