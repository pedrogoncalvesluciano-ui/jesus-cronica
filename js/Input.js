// Input.js
// -----------------------------------------------------------------------
// Estado de teclado. Não depende de nenhum outro módulo do jogo — pode
// ser testado isoladamente (as funções que não chamam `initInput` não
// tocam em `window`/`document`).
//
// Teclas de ação (interagir, códice, pausar, depuração) usam semântica de
// "pressionar uma vez" via as funções `consumeXPress()`: cada uma mantém
// seu próprio estado de "já consumido nesta pressão" para não disparar a
// cada frame enquanto a tecla continua fisicamente para baixo.
// -----------------------------------------------------------------------

const keysDown = new Set();

const MOVE_KEYS = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"]
};

export function initInput(target = window) {
  target.addEventListener("keydown", (e) => {
    keysDown.add(e.code);
  });
  target.addEventListener("keyup", (e) => {
    keysDown.delete(e.code);
  });
  // Evita que perder o foco da janela deixe teclas "presas" para baixo
  // (por exemplo, alt-tab enquanto WASD está pressionado).
  target.addEventListener("blur", () => keysDown.clear());
}

export function isKeyDown(code) {
  return keysDown.has(code);
}

function isActionActive(action) {
  const codes = MOVE_KEYS[action];
  return codes ? codes.some((code) => keysDown.has(code)) : false;
}

export function getMovementVector() {
  let dx = 0;
  let dy = 0;
  if (isActionActive("left")) dx -= 1;
  if (isActionActive("right")) dx += 1;
  if (isActionActive("up")) dy -= 1;
  if (isActionActive("down")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }
  return { dx, dy };
}

/**
 * Fábrica de "botão de pressionar uma vez": dado um código de tecla,
 * retorna uma função que só retorna `true` na transição de solto→pressionado,
 * mesmo que a tecla continue para baixo por vários frames.
 */
function createSinglePressTracker(code) {
  let consumed = false;
  return function consume() {
    const active = keysDown.has(code);
    if (active && !consumed) {
      consumed = true;
      return true;
    }
    if (!active) consumed = false;
    return false;
  };
}

export const consumeInteractPress = createSinglePressTracker("KeyE");
export const consumeCodexTogglePress = createSinglePressTracker("KeyC");
export const consumePausePress = createSinglePressTracker("Escape");
export const consumeDebugTogglePress = createSinglePressTracker("Backquote");

