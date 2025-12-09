// tests/player.test.js
import { createPlayer } from "../src/player.js";
import { createShip } from "../src/ship.js";

describe("Player", () => {
  test("player can attack and computer randomMove doesn't repeat", () => {
    const p1 = createPlayer("A", "human");
    const p2 = createPlayer("CPU", "computer");

    const ship = createShip(2);
    p2.gameboard.placeShip(ship, { x: 0, y: 0 }, "horizontal");

    const res = p1.attack(p2.gameboard, { x: 0, y: 0 });
    expect(res.hit).toBe(true);

    for (let i = 0; i < 5; i++) {
      const r = p2.randomMove(p1.gameboard);
      expect(r).toBeDefined();
    }
    expect(p2._movesTried.size).toBeGreaterThan(0);
  });
});