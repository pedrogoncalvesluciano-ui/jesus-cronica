// World.js
// -----------------------------------------------------------------------
// Representa localizações exploráveis (Especificação Mestra, seção 13).
// "Mundo lógico" (gameState.world.locations, o registro de progresso) é
// mantido separado da representação de exploração (bounds, obstáculos,
// interactables definidos aqui) — uma localização pode existir
// logicamente (`gameState.world.locations[id]`) mesmo que sua definição
// completa de exploração ainda não tenha sido carregada.
//
// Localizações se conectam por `exits`: zonas de gatilho (não sólidas)
// que, quando o jogador entra nelas, disparam a troca de localização
// atual. Isso é o "chunk carregado vs. chunk existente" do princípio
// "SIMULE APENAS O NECESSÁRIO" em miniatura — só uma localização está
// ativa (obstáculos/NPCs sendo simulados) por vez.
// -----------------------------------------------------------------------

import { gameState } from "./GameState.js";
import { eventBus, EVENTS } from "./EventBus.js";
import { aabbIntersect } from "./Physics.js";

/** @type {Map\<string, object>} */
const locationDefinitions = new Map();
let currentLocationId = null;

export function defineLocation(def) {
  locationDefinitions.set(def.id, {
    exits: [],
    interactables: [],
    obstacles: [],
    ...def
  });

  if (!gameState.world.locations[def.id]) {
    gameState.world.locations[def.id] = {
      discovered: false,
      accessible: def.accessible ?? true,
      state: "DEFAULT",
      populationState: null,
      factionControl: null,
      activeEvents: [],
      consequences: []
    };
  }
}

export function getLocationDefinition(id) {
  return locationDefinitions.get(id) || null;
}

export function getCurrentLocationId() {
  return currentLocationId;
}

export function getCurrentLocation() {
  return locationDefinitions.get(currentLocationId) || null;
}

/**
 * Carrega uma localização como atual. Marca `discovered: true` na
 * primeira visita e emite LOCATION_CHANGED para que outros sistemas
 * (câmera, missões, codex) possam reagir sem que World.js precise
 * conhecê-los diretamente.
 */
export function loadLocation(id, { spawn } = {}) {
  const def = locationDefinitions.get(id);
  if (!def) {
    console.error(`[World] Localização "${id}" não foi definida.`);
    return null;
  }

  const previousId = currentLocationId;
  currentLocationId = id;
  // Sincroniza com gameState para que SaveSystem.js consiga persistir e
  // restaurar em qual localização o jogador estava (ver GameState.js,
  // comentário em `world.currentLocationId`). `currentLocationId` acima
  // continua sendo a fonte usada em runtime por getCurrentLocation() —
  // este campo no gameState é a cópia serializável, atualizada aqui no
  // único lugar onde a localização atual muda.
  gameState.world.currentLocationId = id;

  const runtime = gameState.world.locations[id];
  const firstVisit = runtime && !runtime.discovered;
  if (runtime && firstVisit) {
    runtime.discovered = true;
  }

  eventBus.emit(EVENTS.LOCATION_CHANGED, { locationId: id, previousId, firstVisit, spawn });
  return def;
}

export function getObstaclesInCurrentLocation() {
  const loc = getCurrentLocation();
  return loc ? loc.obstacles : [];
}

export function getInteractablesInCurrentLocation() {
  const loc = getCurrentLocation();
  return loc ? loc.interactables : [];
}

/**
 * Verifica se `entity` (tipicamente o jogador) está sobrepondo alguma
 * zona de saída da localização atual. Retorna a definição da saída ou
 * `null`. A checagem de saída é deliberadamente separada da física de
 * colisão sólida: saídas não bloqueiam o movimento, só disparam evento.
 */
export function checkExitTrigger(entity) {
  const loc = getCurrentLocation();
  if (!loc || !loc.exits || loc.exits.length === 0) return null;
  for (const exit of loc.exits) {
    if (aabbIntersect(entity, exit.bounds)) return exit;
  }
  return null;
}

export function isLocationDiscovered(id) {
  const runtime = gameState.world.locations[id];
  return Boolean(runtime && runtime.discovered);
}

export function listDefinedLocationIds() {
  return Array.from(locationDefinitions.keys());
}

