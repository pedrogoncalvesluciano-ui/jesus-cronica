// Player.js
// -----------------------------------------------------------------------
// Estado e comportamento do jogador. Movimento usa velocidade * deltaTime
// (nunca "por frame"), consistente com a exigência de a lógica não
// depender da quantidade de frames renderizados.
// -----------------------------------------------------------------------

import { getMovementVector, consumeInteractPress } from "./Input.js";
import { resolveMovement } from "./Physics.js";
import { getInteractablesInCurrentLocation } from "./World.js";
import { distanceBetweenEntities } from "./Entities.js";

const SPEED_PX_PER_SECOND = 180;

export function createPlayer(x, y) {
  return {
    id: "player",
    kind: "player",
    x,
    y,
    width: 28,
    height: 36,
    color: "#E8E3D6",
    facing: "down",
    moving: false
  };
}

export function updatePlayer(player, dt, obstacles) {
  const { dx, dy } = getMovementVector();

  player.moving = dx !== 0 || dy !== 0;
  if (dx > 0) player.facing = "right";
  else if (dx < 0) player.facing = "left";
  else if (dy > 0) player.facing = "down";
  else if (dy < 0) player.facing = "up";

  resolveMovement(player, dx * SPEED_PX_PER_SECOND * dt, dy * SPEED_PX_PER_SECOND * dt, obstacles);
}

/** Encontra o interactable elegível mais próximo (NPC ou objeto) dentro do raio de interação dele. Não consome nenhum estado — pode ser chamado quantas vezes forem necessárias por frame. */
export function findInteractable(player) {
  const interactables = getInteractablesInCurrentLocation();
  let closest = null;
  let closestDist = Infinity;

  for (const entity of interactables) {
    const dist = distanceBetweenEntities(player, entity);
    if (dist <= entity.interactionRadius && dist < closestDist) {
      closest = entity;
      closestDist = dist;
    }
  }
  return closest;
}

/** Combina a busca de interactable com o consumo de "uma pressão" da tecla de interação. Chamar no máximo uma vez por frame. */
export function checkInteraction(player) {
  const entity = findInteractable(player);
  const pressed = consumeInteractPress();
  return { entity, pressed };
}

