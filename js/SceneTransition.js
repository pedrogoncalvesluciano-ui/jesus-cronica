// SceneTransition.js
// -----------------------------------------------------------------------
// Controlador de transição visual (fade) entre localizações, dirigido
// pelo próprio game loop (via delta time) em vez de setTimeout/Promises —
// consistente com o fato de update()/render() serem chamados
// sincronamente a cada frame por Engine.js. Isso evita misturar um
// modelo assíncrono (que pausaria olhando "de fora" do loop) com o loop
// de jogo baseado em frames.
//
// Fases: "idle" -> "fadeOut" (tela escurece) -> executa a ação pendente
// (ex.: trocar de localização, o que é instantâneo) -> "fadeIn" (tela
// clareia) -> "idle".
// -----------------------------------------------------------------------

const FADE_DURATION_SECONDS = 0.25;

export function createTransitionController() {
  return { phase: "idle", timer: 0, pendingAction: null };
}

/** Inicia uma transição. Ignorada se já houver uma em andamento (evita reentrância). */
export function startTransition(controller, action) {
  if (controller.phase !== "idle") return false;
  controller.phase = "fadeOut";
  controller.timer = 0;
  controller.pendingAction = action;
  return true;
}

export function isTransitioning(controller) {
  return controller.phase !== "idle";
}

/**
 * Avança o estado da transição em `dt` segundos e chama `onOpacityChange`
 * com a opacidade atual do véu (0 = totalmente visível o jogo, 1 = tela
 * totalmente coberta).
 */
export function updateTransition(controller, dt, onOpacityChange) {
  if (controller.phase === "idle") return;

  controller.timer += dt;

  if (controller.phase === "fadeOut") {
    const t = Math.min(controller.timer / FADE_DURATION_SECONDS, 1);
    onOpacityChange(t);
    if (t >= 1) {
      if (controller.pendingAction) controller.pendingAction();
      controller.pendingAction = null;
      controller.phase = "fadeIn";
      controller.timer = 0;
    }
    return;
  }

  if (controller.phase === "fadeIn") {
    const t = Math.min(controller.timer / FADE_DURATION_SECONDS, 1);
    onOpacityChange(1 - t);
    if (t >= 1) {
      controller.phase = "idle";
      controller.timer = 0;
    }
  }
}

