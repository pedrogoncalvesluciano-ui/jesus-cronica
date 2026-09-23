// Missions.js
// -----------------------------------------------------------------------
// Ciclo de vida de missões (Especificação Mestra, seção 11).
//
// NOTA DE ENGENHARIA IMPORTANTE — INCONSISTÊNCIA ENCONTRADA NO CANON:
// a seção 11 define 6 status possíveis por missão (LOCKED, AVAILABLE,
// ACTIVE, COMPLETED, FAILED, HIDDEN), mas a seção 3.1 só reserva 4 listas
// dentro de `gameState.missions` (active, completed, failed, hidden) —
// não existe um array para LOCKED nem para AVAILABLE. Isso é uma
// contradição real entre duas seções do mesmo documento.
//
// Resolvida assim, sem inventar um novo array fora do schema documentado:
// uma missão que não está em nenhuma das 4 listas é considerada LOCKED ou
// AVAILABLE dependendo de suas `conditions` serem satisfeitas ou não,
// calculado sob demanda por `getMissionStatus()`. Isso respeita o schema
// exatamente como escrito na seção 3.1, e ainda entrega os 6 status da
// seção 11. Se a intenção original era outra, é só apontar — o registro
// de definições (`definitions`) guarda todo o resto de qualquer forma.
// -----------------------------------------------------------------------

import { gameState, mergeEffects } from "./GameState.js";
import { eventBus, EVENTS } from "./EventBus.js";
import { evaluateConditions } from "./Conditions.js";
import { unlockCodexEntry } from "./Codex.js";

/** @type {Map\<string, object>} */
const definitions = new Map();

export function defineMission(mission) {
  definitions.set(mission.id, {
    conditions: [],
    consequences: [],
    rewards: [],
    revelationIds: [],
    ...mission
  });

  // `startHidden` é uma flag de CONTEÚDO (decidida por quem escreve a
  // missão): missões secretas que não devem aparecer no diário de missões
  // até serem descobertas de alguma outra forma (documento, diálogo).
  // Diferente de LOCKED, que é sobre pré-requisitos ainda não cumpridos.
  if (mission.startHidden && !isTracked(mission.id)) {
    gameState.missions.hidden.push(mission.id);
  }
}

function isTracked(id) {
  return (
    gameState.missions.active.includes(id) ||
    gameState.missions.completed.includes(id) ||
    gameState.missions.failed.includes(id) ||
    gameState.missions.hidden.includes(id)
  );
}

function removeFrom(list, id) {
  const idx = list.indexOf(id);
  if (idx !== -1) list.splice(idx, 1);
}

export function getMissionDefinition(id) {
  return definitions.get(id) || null;
}

export function getMissionStatus(id) {
  if (gameState.missions.active.includes(id)) return "ACTIVE";
  if (gameState.missions.completed.includes(id)) return "COMPLETED";
  if (gameState.missions.failed.includes(id)) return "FAILED";
  if (gameState.missions.hidden.includes(id)) return "HIDDEN";

  const def = definitions.get(id);
  if (!def) return "LOCKED";
  return evaluateConditions(def.conditions, gameState) ? "AVAILABLE" : "LOCKED";
}

export function startMission(id) {
  const status = getMissionStatus(id);
  if (status !== "AVAILABLE") {
    console.warn(`[Missions] Não é possível iniciar "${id}" — status atual: ${status}.`);
    return false;
  }
  removeFrom(gameState.missions.hidden, id);
  gameState.missions.active.push(id);
  eventBus.emit(EVENTS.MISSION_STARTED, { id });
  return true;
}

function applyReward(reward) {
  if (reward.type === "CODEX_UNLOCK") {
    unlockCodexEntry(reward.entryId, reward.status);
  } else if (reward.type === "STAT") {
    mergeEffects({ stats: { [reward.stat]: reward.value } });
  } else if (reward.type === "FLAG") {
    gameState.story.flags[reward.flag] = reward.value ?? true;
  } else {
    console.warn(`[Missions] Tipo de recompensa desconhecido: "${reward.type}".`);
  }
}

export function completeMission(id) {
  if (!gameState.missions.active.includes(id)) {
    console.warn(`[Missions] "${id}" não está ativa; não pode ser completada (status atual: ${getMissionStatus(id)}).`);
    return false;
  }

  removeFrom(gameState.missions.active, id);
  gameState.missions.completed.push(id);

  const def = definitions.get(id);
  if (def) {
    for (const reward of def.rewards) applyReward(reward);
  }

  eventBus.emit(EVENTS.MISSION_COMPLETED, { id });
  notifyNewlyAvailable();
  return true;
}

export function failMission(id) {
  if (!gameState.missions.active.includes(id)) {
    console.warn(`[Missions] "${id}" não está ativa; não pode falhar (status atual: ${getMissionStatus(id)}).`);
    return false;
  }
  removeFrom(gameState.missions.active, id);
  gameState.missions.failed.push(id);
  eventBus.emit(EVENTS.MISSION_FAILED, { id });
  notifyNewlyAvailable();
  return true;
}

/** Emite MISSION_AVAILABLE para toda missão LOCKED que passou a ser AVAILABLE — útil para a UI notificar o jogador. */
function notifyNewlyAvailable() {
  for (const id of definitions.keys()) {
    if (getMissionStatus(id) === "AVAILABLE") {
      eventBus.emit(EVENTS.MISSION_AVAILABLE, { id });
    }
  }
}

export function listMissionsByStatus(status) {
  return Array.from(definitions.keys()).filter((id) => getMissionStatus(id) === status);
}

export function listAllMissionSummaries() {
  return Array.from(definitions.keys()).map((id) => ({
    id,
    status: getMissionStatus(id),
    definition: definitions.get(id)
  }));
}

