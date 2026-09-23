// GameState.js
// Fonte única de verdade do estado persistente do jogo.

import { eventBus, EVENTS } from "./EventBus.js";

export const SAVE_VERSION = 1;

export function createInitialState() {
  return {
    saveVersion: SAVE_VERSION,
    story: {
      currentAct: "PROLOGO",
      currentScene: null,
      completedModules: [],
      flags: {}
    },
    protagonist: {
      identity: { id: "protagonist", name: null },
      stats: {
        hope: 0,
        freedom: 0,
        control: 0,
        faith: 0,
        guilt: 0,
        corruption: 0,
        temporalStability: 0,
        politicalReputation: 0,
        knowledge: 0,
        allyTrust: 0
      },
      traits: [],
      relationships: {},
      position: { x: null, y: null, locationId: null }
    },
    world: {
      locations: {},
      factions: {},
      politicalState: {},
      temporalStability: null,
      discoveredSecrets: [],
      currentLocationId: null
    },
    choices: {
      major: {},
      minor: {},
      consequences: {}
    },
    missions: {
      active: [],
      completed: [],
      failed: [],
      hidden: []
    },
    inventory: {
      items: [],
      artifacts: [],
      technology: [],
      resources: {}
    },
    dialogue: {
      current: null,
      seen: [],
      unlocked: [],
      relationshipFlags: {}
    },
    codex: {
      unlockedEntries: {},
      theories: [],
      confirmedFacts: []
    },
    endings: {
      conditions: {},
      unlocked: []
    }
  };
}

export const gameState = createInitialState();

export function resetState() {
  const fresh = createInitialState();
  for (const key of Object.keys(gameState)) delete gameState[key];
  Object.assign(gameState, fresh);
  return gameState;
}

export function setFlag(flagName, value = true) {
  gameState.story.flags[flagName] = value;
  eventBus.emit(EVENTS.WORLD_STATE_CHANGED, { flag: flagName, value });
}

export function getFlag(flagName) {
  return gameState.story.flags[flagName] ?? false;
}

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

export function mergeEffects(effects = {}) {
  if (effects.stats) {
    for (const [stat, delta] of Object.entries(effects.stats)) {
      if (!(stat in gameState.protagonist.stats)) {
        console.warn(`[GameState] Stat desconhecida ignorada: "${stat}".`);
        continue;
      }
      gameState.protagonist.stats[stat] += Number(delta) || 0;
    }
  }

  if (effects.relationships) {
    for (const [characterId, patch] of Object.entries(effects.relationships)) {
      const current = gameState.protagonist.relationships[characterId] || {
        trust: 0, respect: 0, fear: 0, loyalty: 0, flags: []
      };
      for (const field of ["trust", "respect", "fear", "loyalty"]) {
        if (patch[field] != null) current[field] = (current[field] || 0) + Number(patch[field] || 0);
      }
      if (Array.isArray(patch.flags)) {
        for (const flag of patch.flags) addUnique(current.flags, flag);
      }
      gameState.protagonist.relationships[characterId] = current;
    }
  }

  if (effects.world && typeof effects.world === "object") {
    Object.assign(gameState.world, effects.world);
  }

  if (effects.temporal) {
    const delta = Number(effects.temporal.stabilityDelta || 0);
    gameState.world.temporalStability = Number(gameState.world.temporalStability || 0) + delta;
  }

  if (effects.missions) {
    for (const key of ["active", "completed", "failed", "hidden"]) {
      const values = effects.missions[key];
      if (Array.isArray(values)) for (const id of values) addUnique(gameState.missions[key], id);
    }
  }

  if (effects.codex && typeof effects.codex === "object") {
    for (const [entryId, patch] of Object.entries(effects.codex)) {
      const current = gameState.codex.unlockedEntries[entryId] || {};
      gameState.codex.unlockedEntries[entryId] = { ...current, ...patch };
    }
  }

  eventBus.emit(EVENTS.WORLD_STATE_CHANGED, { effects });
  return gameState;
}
