// Relationships.js
// -----------------------------------------------------------------------
// Camada de CONSULTA sobre gameState.protagonist.relationships
// (Especificação Mestra, seção 12). A ESCRITA desses dados acontece em
// GameState.mergeEffects() — não duplicada aqui — porque Choices.js já
// chama mergeEffects() para aplicar `effects.relationships`, e ter dois
// lugares que escrevem o mesmo dado é exatamente o anti-padrão que a
// arquitetura pede para evitar ("DUAS FONTES DIFERENTES PARA O MESMO
// ESTADO"). Este módulo existe para dar à UI e ao Codex uma forma
// conveniente e só-leitura de interpretar esses números.
//
// "Esses campos são mecânicos; o significado narrativo deve ser definido
// por personagem" (Especificação Mestra, seção 12) — por isso as faixas
// de "disposição" abaixo são um recurso de exibição genérico, não uma
// afirmação sobre o que cada personagem específico sente.
// -----------------------------------------------------------------------

import { gameState } from "./GameState.js";

const DEFAULT_RELATIONSHIP = Object.freeze({ trust: 0, respect: 0, fear: 0, loyalty: 0, flags: [] });

export function getRelationship(characterId) {
  return gameState.protagonist.relationships[characterId] || { ...DEFAULT_RELATIONSHIP, flags: [] };
}

export function listRelationships() {
  return Object.entries(gameState.protagonist.relationships).map(([characterId, data]) => ({
    characterId,
    ...data
  }));
}

export function hasRelationshipFlag(characterId, flag) {
  return getRelationship(characterId).flags.includes(flag);
}

/**
 * Classificação genérica de disposição a partir de `trust`, só para dar
 * um rótulo textual à UI. Os limiares são uma escolha de exibição, não um
 * dado de canon — nenhum personagem foi definido como tendo limiares
 * diferentes ainda, então todos usam a mesma escala por padrão.
 */
export function getDispositionLabel(characterId) {
  const { trust } = getRelationship(characterId);
  if (trust <= -5) return "Hostil";
  if (trust < 0) return "Desconfiado";
  if (trust === 0) return "Neutro";
  if (trust < 5) return "Receptivo";
  return "Aliado";
}

