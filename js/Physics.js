// Physics.js
// -----------------------------------------------------------------------
// Colisão AABB (Axis-Aligned Bounding Box) simples e previsível
// (Especificação Mestra do briefing original: "priorize sistemas
// previsíveis e estáveis"). Detecção (aabbIntersect) é mantida separada
// de resolução (resolveMovement) — detectar colisão sozinho nunca é
// tratado como suficiente.
// -----------------------------------------------------------------------

/** Retorna true se dois retângulos {x, y, width, height} se sobrepõem. */
export function aabbIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Move `entity` por (dx, dy) resolvendo colisão eixo a eixo contra
 * `obstacles`. Resolver X e Y separadamente (em vez de mover nos dois
 * eixos e testar uma vez) evita que o personagem "grude" em quinas ao
 * encostar diagonalmente em um obstáculo — um problema clássico de
 * colisão ingênua em jogos top-down.
 *
 * Isto NÃO é Continuous Collision Detection: em velocidades muito altas
 * (maiores que o tamanho de um obstáculo por frame) a entidade pode
 * atravessar um obstáculo fino. Para as velocidades usadas neste
 * protótipo (dezenas a poucas centenas de pixels/segundo, obstáculos de
 * dezenas de pixels) isso não ocorre — mas é uma limitação real, não
 * testada para todos os casos, e fica registrada aqui para quando a
 * velocidade máxima do jogo mudar no futuro.
 */
export function resolveMovement(entity, dx, dy, obstacles) {
  entity.x += dx;
  for (const obstacle of obstacles) {
    if (aabbIntersect(entity, obstacle)) {
      if (dx > 0) entity.x = obstacle.x - entity.width;
      else if (dx < 0) entity.x = obstacle.x + obstacle.width;
    }
  }

  entity.y += dy;
  for (const obstacle of obstacles) {
    if (aabbIntersect(entity, obstacle)) {
      if (dy > 0) entity.y = obstacle.y - entity.height;
      else if (dy < 0) entity.y = obstacle.y + obstacle.height;
    }
  }
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Distância euclidiana entre dois pontos {x, y}. */
export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

