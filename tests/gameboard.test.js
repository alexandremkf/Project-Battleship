// tests/gameboard.test.js
import { createShip } from "../src/ship.js";
import { createGameboard } from "../src/gameboard.js";

describe("Gameboard", () => {
  test("placeShip and receiveAttack hit / miss logic", () => {
    const gb = createGameboard();
    const ship = createShip(3);
    const coords = gb.placeShip(ship, { x: 0, y: 0 }, "horizontal");
    expect(coords).toHaveLength(3);

    const r1 = gb.receiveAttack({ x: 5, y: 5 });
    expect(r1.hit).toBe(false);
    expect(gb.getMissedAttacks()).toContainEqual({ x: 5, y: 5 });

    const r2 = gb.receiveAttack({ x: 0, y: 0 });
    expect(r2.hit).toBe(true);
    expect(r2.sunk).toBe(false);

    gb.receiveAttack({ x: 1, y: 0 });
    const r3 = gb.receiveAttack({ x: 2, y: 0 });
    expect(r3.hit).toBe(true);
    expect(r3.sunk).toBe(true);

    expect(gb.allShipsSunk()).toBe(true);
  });

  test("prevent placing overlapping or out of bounds", () => {
    const gb = createGameboard(5);
    const s1 = createShip(3);
    gb.placeShip(s1, { x: 0, y: 0 }, "horizontal");
    const s2 = createShip(2);
    expect(() => gb.placeShip(s2, { x: 2, y: 0 }, "vertical")).toThrow();
    expect(() => gb.placeShip(createShip(3), { x: 3, y: 4 }, "horizontal")).toThrow();
  });

  test("double attack same coord is handled gracefully", () => {
    const gb = createGameboard();
    const s = createShip(2);
    gb.placeShip(s, { x: 0, y: 0 }, "horizontal");
    const a1 = gb.receiveAttack({ x: 0, y: 0 });
    expect(a1.hit).toBe(true);
    const a2 = gb.receiveAttack({ x: 0, y: 0 });
    expect(a2.alreadyTried).toBe(true);
  });
});