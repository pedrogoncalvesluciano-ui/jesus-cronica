// Codex.js
// Conhecimento do jogador. O status de uma entrada pertence ao progresso, não ao canon de produção.

import { gameState } from "./GameState.js";
import { eventBus, EVENTS } from "./EventBus.js";

export const ENTRY_STATUS = Object.freeze({
  DESCONHECIDO: "DESCONHECIDO",
  DESCOBERTO: "DESCOBERTO",
  SUSPEITA: "SUSPEITA",
  TEORIA: "TEORIA",
  CONFIRMADO: "CONFIRMADO",
  CONTRADITO: "CONTRADITO"
});

export const CATEGORIES = Object.freeze({
  PERSONAGENS: "personagens",
  LOCAIS: "locais",
  FACCOES: "faccoes",
  CRIATURAS: "criaturas",
  TECNOLOGIA: "tecnologia",
  MAGIA: "magia",
  EVENTOS: "eventos",
  CRONOLOGIA: "cronologia",
  MISTERIOS: "misterios",
  PROFECIAS: "profecias",
  ARTEFATOS: "artefatos",
  VIAGEM_TEMPORAL: "viagem_temporal",
  DOCUMENTOS: "documentos",
  DECISOES: "decisoes",
  ESTADO_DO_MUNDO: "estado_do_mundo"
});

const definitions = new Map();

export function defineCodexEntry(entry) {
  if (!entry?.id) throw new Error("[Codex] Toda entrada precisa de id.");
  const normalized = {
    category: CATEGORIES.MISTERIOS,
    title: entry.id,
    summary: "",
    ...entry
  };
  definitions.set(normalized.id, normalized);
  return getCodexEntry(normalized.id);
}

function runtimeFor(id) {
  return gameState.codex.unlockedEntries[id] || null;
}

export function getCodexEntry(id) {
  const def = definitions.get(id);
  if (!def) return null;
  const runtime = runtimeFor(id);
  return {
    ...def,
    status: runtime?.status || ENTRY_STATUS.DESCONHECIDO,
    discoveredAt: runtime?.discoveredAt || null,
    playerTheory: runtime?.playerTheory || null,
    contradictedBy: runtime?.contradictedBy || []
  };
}

export function unlockCodexEntry(id, status = ENTRY_STATUS.DESCOBERTO) {
  if (!definitions.has(id)) {
    console.warn(`[Codex] Entrada "${id}" não foi definida.`);
    return null;
  }
  const previous = runtimeFor(id) || {};
  gameState.codex.unlockedEntries[id] = {
    ...previous,
    status,
    discoveredAt: previous.discoveredAt || new Date().toISOString()
  };
  if (status === ENTRY_STATUS.CONFIRMADO && !gameState.codex.confirmedFacts.includes(id)) {
    gameState.codex.confirmedFacts.push(id);
  }
  eventBus.emit(EVENTS.CODEX_UPDATED, { id, status });
  return getCodexEntry(id);
}

export function listCodexEntries() {
  return Array.from(definitions.keys()).map(getCodexEntry);
}

export function listDiscoveredCodexEntries() {
  return listCodexEntries().filter((entry) => entry.status !== ENTRY_STATUS.DESCONHECIDO);
}

export function setPlayerTheory(id, theory) {
  if (!definitions.has(id)) return false;
  const previous = runtimeFor(id) || { status: ENTRY_STATUS.DESCONHECIDO, discoveredAt: null };
  gameState.codex.unlockedEntries[id] = { ...previous, playerTheory: theory };
  const existing = gameState.codex.theories.find((x) => x.entryId === id);
  if (existing) existing.text = theory;
  else gameState.codex.theories.push({ entryId: id, text: theory });
  eventBus.emit(EVENTS.CODEX_UPDATED, { id, playerTheory: theory });
  return true;
}

export function flagContradiction(idA, idB) {
  if (!definitions.has(idA) || !definitions.has(idB)) return false;
  for (const [id, other] of [[idA, idB], [idB, idA]]) {
    const previous = runtimeFor(id) || {};
    const contradictedBy = Array.from(new Set([...(previous.contradictedBy || []), other]));
    gameState.codex.unlockedEntries[id] = {
      ...previous,
      status: ENTRY_STATUS.CONTRADITO,
      discoveredAt: previous.discoveredAt || new Date().toISOString(),
      contradictedBy
    };
  }
  eventBus.emit(EVENTS.CODEX_UPDATED, { contradiction: [idA, idB] });
  return true;
}
