// Renderer.js
// -----------------------------------------------------------------------
// Desenha o mundo em Canvas. Não contém lógica de jogo — apenas lê estado
// e desenha ("DADOS ≠ REPRESENTAÇÃO"). Nenhuma função aqui muta
// gameState, World, Player, etc.
//
// Sem assets de arte (nenhuma imagem foi fornecida e este ambiente não
// tem acesso à internet para gerar/baixar sprites), todas as entidades
// são desenhadas como formas geométricas com cor + rótulo de texto. Isso
// é deliberado e visível — não finge ser arte final.
// -----------------------------------------------------------------------

import { worldToScreen } from "./Camera.js";

export function clearCanvas(ctx, camera) {
  ctx.fillStyle = "#0D0F14";
  ctx.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);
}

export function renderLocationBackground(ctx, camera, location) {
  const pos = worldToScreen(camera, 0, 0);
  ctx.fillStyle = location.backgroundColor || "#12151C";
  ctx.fillRect(pos.x, pos.y, location.bounds.width, location.bounds.height);

  // Grade sutil só para dar noção de escala/movimento — não é parte do
  // canon visual do jogo, é um recurso de depuração/orientação espacial.
  ctx.strokeStyle = "#1D232E";
  ctx.lineWidth = 1;
  const gridSize = 64;
  const startX = Math.floor(0 / gridSize) * gridSize;
  for (let x = startX; x <= location.bounds.width; x += gridSize) {
    const p1 = worldToScreen(camera, x, 0);
    const p2 = worldToScreen(camera, x, location.bounds.height);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  for (let y = 0; y <= location.bounds.height; y += gridSize) {
    const p1 = worldToScreen(camera, 0, y);
    const p2 = worldToScreen(camera, location.bounds.width, y);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Contorno da localização, para deixar claro onde o mundo termina.
  const corner = worldToScreen(camera, 0, 0);
  ctx.strokeStyle = "#333B4A";
  ctx.lineWidth = 2;
  ctx.strokeRect(corner.x, corner.y, location.bounds.width, location.bounds.height);
}

export function renderObstacles(ctx, camera, obstacles) {
  ctx.fillStyle = "#333B4A";
  for (const obs of obstacles) {
    const pos = worldToScreen(camera, obs.x, obs.y);
    ctx.fillRect(pos.x, pos.y, obs.width, obs.height);
  }
}

export function renderExits(ctx, camera, exits) {
  if (!exits) return;
  ctx.save();
  ctx.strokeStyle = "#4C9A94";
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  for (const exit of exits) {
    const pos = worldToScreen(camera, exit.bounds.x, exit.bounds.y);
    ctx.strokeRect(pos.x, pos.y, exit.bounds.width, exit.bounds.height);
  }
  ctx.restore();
}

export function renderInteractables(ctx, camera, interactables, highlightedId) {
  for (const entity of interactables) {
    const pos = worldToScreen(camera, entity.x, entity.y);

    ctx.fillStyle = entity.color;
    if (entity.kind === "object") {
      // Objetos interativos são desenhados como losango para se
      // diferenciarem visualmente de NPCs (retângulos) sem depender de
      // sprites reais.
      ctx.beginPath();
      ctx.moveTo(pos.x + entity.width / 2, pos.y);
      ctx.lineTo(pos.x + entity.width, pos.y + entity.height / 2);
      ctx.lineTo(pos.x + entity.width / 2, pos.y + entity.height);
      ctx.lineTo(pos.x, pos.y + entity.height / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(pos.x, pos.y, entity.width, entity.height);
    }

    ctx.fillStyle = "#C9A24B";
    ctx.font = "12px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(entity.name, pos.x + entity.width / 2, pos.y - 8);

    if (entity.id === highlightedId) {
      ctx.strokeStyle = "#C9A24B";
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x - 4, pos.y - 4, entity.width + 8, entity.height + 8);
    }
  }
}

export function renderPlayer(ctx, camera, player) {
  const pos = worldToScreen(camera, player.x, player.y);
  ctx.fillStyle = player.color;
  ctx.fillRect(pos.x, pos.y, player.width, player.height);

  // Indicador simples de direção: um pequeno círculo no lado do "facing".
  ctx.fillStyle = "#C9A24B";
  const cx = pos.x + player.width / 2;
  const cy = pos.y + player.height / 2;
  const r = 5;
  ctx.beginPath();
  if (player.facing === "up") ctx.arc(cx, pos.y, r, 0, Math.PI * 2);
  else if (player.facing === "down") ctx.arc(cx, pos.y + player.height, r, 0, Math.PI * 2);
  else if (player.facing === "left") ctx.arc(pos.x, cy, r, 0, Math.PI * 2);
  else ctx.arc(pos.x + player.width, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Véu de transição entre localizações (ver SceneTransition.js). alpha: 0 (invisível) a 1 (tela coberta). */
export function renderFadeOverlay(ctx, camera, alpha) {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(13, 15, 20, ${alpha})`;
  ctx.fillRect(0, 0, camera.viewportWidth, camera.viewportHeight);
}

/** Véu de pausa — reaproveita a mesma primitiva do fade, com opacidade fixa. */
export function renderPauseDim(ctx, camera) {
  renderFadeOverlay(ctx, camera, 0.55);
}

