// src/dom.js
import createGame from "./index.js";

export default function domController() {
  const game = createGame();

  // HTML elements (crie-os no index.html)
  const messageBox = document.querySelector("#message");
  const playerBoardDiv = document.querySelector("#player-board");
  const computerBoardDiv = document.querySelector("#computer-board");
  const restartBtn = document.querySelector("#restart-btn");
  const autoPlaceBtn = document.querySelector("#autoplace-btn");
  const placeModePanel = document.querySelector("#placement-panel"); // panel with controls
  const startGameBtn = document.querySelector("#start-game-btn");

  // --- NEW: fleet + setup state (Option A manual placement) ---
  const FLEET = [
    { name: "Carrier", length: 5 },
    { name: "Battleship", length: 4 },
    { name: "Cruiser", length: 3 },
    { name: "Submarine", length: 3 },
    { name: "Destroyer", length: 2 }
  ];

  let setupMode = true; // true while placing player's ships manually
  let placingIndex = 0; // index into FLEET - which ship we are placing now
  let currentOrientation = "horizontal"; // or "vertical"

  // Note: 'placementMode' still used to toggle UI visibility of placement panel,
  // but actual prevention of attacking is controlled by setupMode.
  let placementMode = true; // initially show placement UI (so user can place ships)

  // animation helpers
  function animateCellHit(cell) {
    cell.classList.add("anim-hit");
    setTimeout(() => cell.classList.remove("anim-hit"), 600);
  }
  function animateCellMiss(cell) {
    cell.classList.add("anim-miss");
    setTimeout(() => cell.classList.remove("anim-miss"), 600);
  }

  // render helpers
  function clearBoardDiv(container) {
    container.innerHTML = "";
  }

  function renderBoards() {
    renderPlayerBoard();
    renderComputerBoard();
  }

  function renderPlayerBoard() {
    clearBoardDiv(playerBoardDiv);
    const size = 10;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;

        // show player's ships
        const pstate = game.getPlayerCellState(x, y);
        if (pstate.hasShip) cell.classList.add("ship");
        if (pstate.hit) cell.classList.add("hit");
        if (pstate.miss) cell.classList.add("miss");

        // If in placement mode (setupMode AND UI placementMode), enable placement events
        if (placementMode && setupMode) {
          cell.classList.add("placement-cell");
          cell.addEventListener("click", onPlayerPlacementClick);
          // drag & drop support (making cell a drop target)
          cell.addEventListener("dragover", (ev) => ev.preventDefault());
          cell.addEventListener("drop", onPlayerDrop);
        }

        playerBoardDiv.appendChild(cell);
      }
    }
  }

  function renderComputerBoard() {
    clearBoardDiv(computerBoardDiv);
    const size = 10;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;

        const cstate = game.getComputerCellState(x, y);
        if (cstate.hit) cell.classList.add("hit");
        if (cstate.miss) cell.classList.add("miss");

        // only allow clicking if setup finished and game not over and it's player's turn
        if (!setupMode && !game.isGameOver && game.currentTurn === "player") {
          cell.addEventListener("click", onPlayerAttackClick);
        }

        computerBoardDiv.appendChild(cell);
      }
    }
  }

  // --- Placement UI handlers (manual per FLEET) ---
  function onPlayerPlacementClick(e) {
    const x = Number(e.currentTarget.dataset.x);
    const y = Number(e.currentTarget.dataset.y);

    if (!setupMode) {
      showMessage("Posicionamento já finalizado.");
      return;
    }

    const shipInfo = FLEET[placingIndex];
    try {
      game.placePlayerShip(shipInfo.length, x, y, currentOrientation);
    } catch (err) {
      showMessage("Posição inválida! Tente outra.");
      return;
    }

    // Successfully placed
    placingIndex++;
    renderBoards();

    if (placingIndex >= FLEET.length) {
      setupMode = false;
      // reveal start button
      if (startGameBtn) startGameBtn.style.display = "inline-block";
      // hide placement panel
      createPlacementItems();
      showMessage("Todos os navios posicionados. Clique em Iniciar Jogo.");
      return;
    }

    // update placement panel / message to next ship
    createPlacementItems();
    showMessage(`Coloque agora: ${FLEET[placingIndex].name} (tamanho ${FLEET[placingIndex].length}) — orientação: ${currentOrientation}`);
  }

  // Drag source creation (for optional drag & drop)
  // createPlacementItems() - create draggable element for the *current* ship to place
  function createPlacementItems() {
    const panel = placeModePanel;
    if (!panel) return;
    panel.innerHTML = "";

    if (!setupMode) {
      // nothing to place
      const p = document.createElement("div");
      p.textContent = "Todos navios posicionados";
      panel.appendChild(p);
      return;
    }

    const current = FLEET[placingIndex];
    const el = document.createElement("div");
    el.className = "ship-item";
    el.draggable = true;
    el.dataset.length = current.length;
    el.textContent = `${current.name} (${current.length}) — arraste para o tabuleiro`;
    el.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", String(current.length));
    });
    panel.appendChild(el);

    // also show remaining list
    const rem = document.createElement("div");
    rem.className = "remaining-ships";
    rem.textContent = "Próximos: " + FLEET.slice(placingIndex).map(s => s.length).join(", ");
    panel.appendChild(rem);
  }

  function onPlayerDrop(ev) {
    ev.preventDefault();
    if (!setupMode) {
      showMessage("Posicionamento já finalizado.");
      return;
    }

    const lenStr = ev.dataTransfer.getData("text/plain");
    const len = Number(lenStr);
    const expectedLen = FLEET[placingIndex].length;
    if (len !== expectedLen) {
      showMessage(`Você deve posicionar primeiro o navio de tamanho ${expectedLen}.`);
      return;
    }

    const x = Number(ev.currentTarget.dataset.x);
    const y = Number(ev.currentTarget.dataset.y);
    try {
      game.placePlayerShip(len, x, y, currentOrientation);
    } catch (err) {
      showMessage("Falha ao colocar (drag). Tente outro local/orientação.");
      return;
    }

    placingIndex++;
    createPlacementItems();
    renderBoards();

    if (placingIndex >= FLEET.length) {
      setupMode = false;
      if (startGameBtn) startGameBtn.style.display = "inline-block";
      showMessage("Todos os navios posicionados. Clique em Iniciar Jogo.");
      return;
    }

    showMessage(`Navio ${len} colocado. Próximo: ${FLEET[placingIndex].name} (${FLEET[placingIndex].length})`);
  }

  // Player attack handler
  async function onPlayerAttackClick(e) {
    const x = Number(e.currentTarget.dataset.x);
    const y = Number(e.currentTarget.dataset.y);

    // send attack
    const res = game.playerAttack(x, y);
    if (res?.error) {
      showMessage(res.error);
      return;
    }
    if (res?.alreadyTried) {
      showMessage("Você já atirou nessa coordenada.");
      return;
    }

    // animate this cell
    const cell = e.currentTarget;
    if (res.hit) animateCellHit(cell);
    else animateCellMiss(cell);

    renderBoards();

    if (res.winner === "player" || game.isGameOver) {
      showVictory("Você venceu!");
      return;
    }

    // CPU turn (allow a tiny delay for UX)
    showMessage("Computador pensando...");
    await sleep(500);
    const cres = game.cpuMove();

    renderBoards();
    if (cres && cres.winner === "cpu") {
      showVictory("Computador venceu!");
      return;
    }

    showMessage("Sua vez!");
  }

  // CPU placement helper (place CPU ships randomly without touching player's board)
  function cpuRandomlyPlaceShips() {
    // place only CPU ships (use the same FLEET lengths)
    for (const ship of FLEET) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 2000) {
        attempts++;
        const dir = Math.random() < 0.5 ? "horizontal" : "vertical";
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        try {
          game.placeCpuShip(ship.length, x, y, dir);
          placed = true;
        } catch (e) {
          // try again
        }
      }
      if (!placed) {
        throw new Error("Não foi possível posicionar navios do CPU (rng).");
      }
    }
  }

  // Utility sleep
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // UI helpers
  function showMessage(msg) {
    if (messageBox) messageBox.textContent = msg;
  }

  function showVictory(text) {
    showMessage(text);
    // disable further clicks on enemy board
    const cells = computerBoardDiv.querySelectorAll(".cell");
    cells.forEach(c => {
      const clone = c.cloneNode(true);
      c.replaceWith(clone);
    });
    // show restart button prominently
    if (restartBtn) restartBtn.classList.add("show");
  }

  // Controls
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      game.restart();
      // reset placement state
      setupMode = true;
      placingIndex = 0;
      currentOrientation = "horizontal";
      placementMode = true;
      // hide start button again
      if (startGameBtn) startGameBtn.style.display = "none";
      createPlacementItems();
      renderBoards();
      showMessage("Jogo reiniciado. Posicione seus navios.");
      restartBtn.classList.remove("show");
    });
  }

  if (autoPlaceBtn) {
    autoPlaceBtn.addEventListener("click", () => {
      game.autoPlaceAll();
      // auto-placing both boards -> disable manual placement
      setupMode = false;
      placingIndex = FLEET.length;
      placementMode = false;
      createPlacementItems();
      renderBoards();
      showMessage("Tabuleiros preenchidos aleatoriamente. Clique em Iniciar Jogo para começar (ou jogue).");
      // show start
      if (startGameBtn) startGameBtn.style.display = "inline-block";
    });
  }

  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      // If player manually placed ships, CPU might still need placement
      // If cpu has ships already (from autoPlaceAll), skip; otherwise place CPU ships.
      // We'll attempt to place CPU ships if cpu board doesn't have full ships.
      try {
        // A simple heuristic: if cpu board has fewer ships than fleet length, place them.
        const cpuShips = game.computerBoard.getShips();
        if (!cpuShips || cpuShips.length < FLEET.length) {
          cpuRandomlyPlaceShips();
        }
      } catch (err) {
        console.error("Erro ao posicionar navios do CPU:", err);
      }

      // finalize setup
      setupMode = false;
      placementMode = false;
      renderBoards();
      showMessage("Jogo iniciado. Sua vez!");
      // hide start button
      if (startGameBtn) startGameBtn.style.display = "none";
    });
  }

  // Placement UI toggles (assumes you have buttons to pick orientation and ship length)
  const dirBtn = document.querySelector("#placement-direction");
  if (dirBtn) {
    dirBtn.addEventListener("click", () => {
      currentOrientation = currentOrientation === "horizontal" ? "vertical" : "horizontal";
      dirBtn.textContent = `Direction: ${currentOrientation}`;
      showMessage(`Orientação agora: ${currentOrientation}`);
    });
  }

  const shipSelect = document.querySelector("#select-ship-length");
  if (shipSelect) {
    shipSelect.addEventListener("change", (ev) => {
      // keep this as an alternative (not recommended while using sequential placement),
      // but do not allow selecting a ship length that isn't the current expected one.
      const val = Number(ev.target.value);
      const expected = FLEET[placingIndex]?.length;
      if (setupMode && val !== expected) {
        showMessage(`No modo sequencial você deve posicionar primeiro o navio de tamanho ${expected}.`);
        // reset select to expected
        ev.target.value = expected;
        return;
      }
    });
  }

  // entry for toggle placement mode (just shows/hides placement UI)
  const togglePlacementBtn = document.querySelector("#toggle-placement-btn");
  if (togglePlacementBtn) {
    togglePlacementBtn.addEventListener("click", () => {
      placementMode = !placementMode;
      createPlacementItems();
      renderBoards();
      showMessage(placementMode ? "Modo de posicionamento ativado." : "Modo de jogo.");
    });
  }

  // initial render
  createPlacementItems();
  renderBoards();
  showMessage(`Bem-vindo! Posicione: ${FLEET[placingIndex].name} (tamanho ${FLEET[placingIndex].length}). Orientação: ${currentOrientation}`);

  // expose for debug (opcional)
  return {
    renderBoards,
    game
  };
}