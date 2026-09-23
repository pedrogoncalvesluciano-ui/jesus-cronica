// Engine.js
// Game loop baseado em requestAnimationFrame, delta time e Canvas com DPR.

export function createEngine({ canvas, onUpdate, onRender, onResize = null }) {
  const ctx = canvas.getContext("2d");
  const state = {
    running: false,
    rafId: null,
    lastTime: 0,
    fps: 0,
    avgFrameMs: 0,
    consecutiveErrors: 0
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize?.({ width, height, dpr });
  }

  function frame(now) {
    if (!state.running) return;

    const frameMs = state.lastTime ? Math.min(now - state.lastTime, 100) : 16.67;
    state.lastTime = now;
    const dt = frameMs / 1000;
    state.avgFrameMs = state.avgFrameMs === 0 ? frameMs : state.avgFrameMs * 0.9 + frameMs * 0.1;
    state.fps = Math.round(1000 / Math.max(1, state.avgFrameMs));

    try {
      onUpdate?.(dt, state);
      onRender?.(ctx, state);
      state.consecutiveErrors = 0;
    } catch (err) {
      state.consecutiveErrors += 1;
      console.error(`[Engine] Erro no frame (${state.consecutiveErrors}/10):`, err);
      if (state.consecutiveErrors >= 10) {
        state.running = false;
        console.error("[Engine] Loop interrompido após 10 frames consecutivos com erro.");
        return;
      }
    }

    state.rafId = requestAnimationFrame(frame);
  }

  return {
    state,
    ctx,
    resize,
    start() {
      if (state.running) return;
      state.running = true;
      state.lastTime = 0;
      resize();
      window.addEventListener("resize", resize);
      state.rafId = requestAnimationFrame(frame);
    },
    stop() {
      state.running = false;
      if (state.rafId) cancelAnimationFrame(state.rafId);
      window.removeEventListener("resize", resize);
    }
  };
}
