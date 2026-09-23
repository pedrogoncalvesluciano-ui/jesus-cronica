// SaveSystem.js
// -----------------------------------------------------------------------
// Persistência de progresso narrativo via localStorage (Especificação
// Mestra, seção 28). Salva o gameState inteiro — que já é, por
// construção, só dados persistentes (o registro de canon em Canon.js e
// as definições de conteúdo em Codex.js/Missions.js/World.js/Dialogue.js
// NÃO fazem parte do gameState; são recarregadas do código/dados na
// inicialização, não do save). Isso corresponde à distinção pedida na
// seção 28: salvar progresso, não redefinir o mundo inteiro.
// -----------------------------------------------------------------------

import { gameState, SAVE_VERSION, resetState } from "./GameState.js";
import { eventBus, EVENTS } from "./EventBus.js";

const STORAGE_KEY = "jesusChronicles.save";

export function saveGame() {
  try {
    const payload = JSON.stringify(gameState);
    window.localStorage.setItem(STORAGE_KEY, payload);
    eventBus.emit(EVENTS.SAVE_COMPLETED, { success: true });
    return true;
  } catch (err) {
    console.error("[SaveSystem] Falha ao salvar:", err);
    eventBus.emit(EVENTS.SAVE_COMPLETED, { success: false, error: String(err) });
    return false;
  }
}

export function hasSaveGame() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch (err) {
    console.error("[SaveSystem] localStorage indisponível neste navegador/aba:", err);
    return false;
  }
}

/**
 * Carrega o save. Se a versão salva for diferente de SAVE_VERSION, a
 * migração ainda não tem regras escritas — o contrato existe
 * (`migrateSave`) mas nenhuma transformação foi implementada, porque
 * ainda não existe uma versão 2 do schema para migrar. Isso é uma
 * limitação conhecida e documentada, não um bug silencioso: o aviso no
 * console deixa isso explícito caso o schema mude no futuro sem que
 * ninguém lembre de escrever a migração.
 */
export function loadGame() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.error("[SaveSystem] localStorage indisponível neste navegador/aba:", err);
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("[SaveSystem] Save corrompido (JSON inválido), ignorando:", err);
    return null;
  }

  if (parsed.saveVersion !== SAVE_VERSION) {
    parsed = migrateSave(parsed);
  }

  resetState();
  Object.assign(gameState, parsed);
  eventBus.emit(EVENTS.LOAD_COMPLETED, {});
  return gameState;
}

function migrateSave(oldState) {
  console.warn(
    `[SaveSystem] Save na versão ${oldState.saveVersion} não corresponde à versão atual (${SAVE_VERSION}). ` +
      `Nenhuma regra de migração está registrada ainda — usando os dados como estão, o que pode causar campos ausentes.`
  );
  return oldState;
}

export function deleteSave() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("[SaveSystem] localStorage indisponível neste navegador/aba:", err);
  }
}

