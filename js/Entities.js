// Entities.js
// Fábricas de NPCs e objetos interagíveis.
// Jesus não deve ser instanciado como uma Entity comum; sua presença narrativa
// terá um módulo dedicado quando esse sistema for definido.

import { distance } from "./Physics.js";

const DEFAULT_SIZE = 32;

export function createNpc({
  id, name, x, y, width = DEFAULT_SIZE, height = DEFAULT_SIZE,
  color = "#4C9A94", dialogueId = null, interactionRadius = 72
}) {
  if (id === "jesus") {
    throw new Error("[Entities] Jesus não pode ser instanciado como NPC comum.");
  }
  return {
    id, name, kind: "npc", x, y, width, height, color,
    interactionType: "DIALOGUE",
    dialogueId,
    interactionRadius
  };
}

export function createInteractableObject({
  id, name, x, y, width = DEFAULT_SIZE, height = DEFAULT_SIZE,
  color = "#8C7BB0", inspectText = "", codexUnlock = null, interactionRadius = 72
}) {
  return {
    id, name, kind: "object", x, y, width, height, color,
    interactionType: "INSPECT",
    inspectText,
    codexUnlock,
    interactionRadius
  };
}

export function getEntityCenter(entity) {
  return { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
}

export function distanceBetweenEntities(a, b) {
  return distance(getEntityCenter(a), getEntityCenter(b));
}
