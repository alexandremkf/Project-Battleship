    // src/player.js
import { createGameboard } from "./gameboard.js";

export function createPlayer(name = "Player", type = "human", boardSize = 10) {
  const gameboard = createGameboard(boardSize);
  const movesTried = new Set();

  function attack(opponentBoard, coord) {
    if (!opponentBoard) throw new Error("Opponent board required");
    const result = opponentBoard.receiveAttack(coord);
    const key = `${coord.x},${coord.y}`;
    movesTried.add(key);
    return result;
  }

  function randomMove(opponentBoard) {
    const size = opponentBoard.size;
    let x, y, key;
    do {
      x = Math.floor(Math.random() * size);
      y = Math.floor(Math.random() * size);
      key = `${x},${y}`;
    } while (movesTried.has(key));
    movesTried.add(key);
    return attack(opponentBoard, { x, y });
  }

  return {
    name,
    type,
    gameboard,
    attack,
    randomMove,
    _movesTried: movesTried
  };
}