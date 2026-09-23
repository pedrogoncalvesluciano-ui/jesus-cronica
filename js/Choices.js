// Choices.js
// Registra escolhas do jogador e aplica seus efeitos pelo GameState.

import { gameState, mergeEffects } from "./GameState.js";
import { eventBus, EVENTS } from "./EventBus.js";

export function applyChoice(choice, context = {}, importance = "minor") {
  if (!choice?.id) throw new Error("[Choices] Escolha sem id.");

  const bucket = importance === "major" ? "major" : "minor";
  const record = {
    id: choice.id,
    text: choice.text || "",
    dialogueId: context.dialogueId || null,
    madeAt: new Date().toISOString(),
    effects: choice.effects || {}
  };

  gameState.choices[bucket][choice.id] = record;
  mergeEffects(choice.effects || {});
  eventBus.emit(EVENTS.CHOICE_MADE, record);
  return record;
}

export function getChoiceRecord(id) {
  return gameState.choices.major[id] || gameState.choices.minor[id] || null;
}

export function wasChoiceMade(id) {
  return Boolean(getChoiceRecord(id));
}
