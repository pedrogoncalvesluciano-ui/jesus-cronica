// Dialogue.js
// Motor de diálogos orientado a nós, com condições e consequências.

import { gameState, setFlag, mergeEffects } from "./GameState.js";
import { evaluateConditions } from "./Conditions.js";
import { applyChoice } from "./Choices.js";
import { unlockCodexEntry } from "./Codex.js";
import { eventBus, EVENTS } from "./EventBus.js";

const definitions = new Map();

export function defineDialogue(dialogue) {
  if (!dialogue?.id) throw new Error("[Dialogue] Diálogo sem id.");
  const normalized = {
    startNode: null,
    nodes: {},
    ...dialogue
  };
  definitions.set(normalized.id, normalized);
  return normalized;
}

export function getDialogueDefinition(id) {
  return definitions.get(id) || null;
}

export function isDialogueActive() {
  return Boolean(gameState.dialogue.current?.dialogueId);
}

export function startDialogue(dialogueId) {
  const def = definitions.get(dialogueId);
  if (!def) {
    console.warn(`[Dialogue] Diálogo "${dialogueId}" não definido.`);
    return null;
  }
  const startNodeId = def.startNode || Object.keys(def.nodes)[0] || null;
  if (!startNodeId || !def.nodes[startNodeId]) return null;
  gameState.dialogue.current = { dialogueId, nodeId: startNodeId };
  eventBus.emit(EVENTS.DIALOGUE_STARTED, { dialogueId });
  return getCurrentNode();
}

export function getCurrentNode() {
  const current = gameState.dialogue.current;
  if (!current) return null;
  return definitions.get(current.dialogueId)?.nodes?.[current.nodeId] || null;
}

export function getVisibleChoices(node = getCurrentNode()) {
  if (!node) return [];
  return (node.choices || []).filter((choice) => evaluateConditions(choice.conditions || [], gameState));
}

function applyConsequence(consequence) {
  if (!consequence?.type) return;
  switch (consequence.type) {
    case "FLAG_SET":
      setFlag(consequence.flag, consequence.value ?? true);
      break;
    case "CODEX_UNLOCK":
      unlockCodexEntry(consequence.entryId, consequence.status);
      break;
    case "EFFECTS":
      mergeEffects(consequence.effects || {});
      break;
    default:
      console.warn(`[Dialogue] Consequência desconhecida: "${consequence.type}".`);
  }
}

function leaveCurrentNode(node) {
  for (const consequence of node?.consequences || []) applyConsequence(consequence);
  const current = gameState.dialogue.current;
  if (current) {
    const key = `${current.dialogueId}:${current.nodeId}`;
    if (!gameState.dialogue.seen.includes(key)) gameState.dialogue.seen.push(key);
  }
}

function endDialogue(dialogueId) {
  gameState.dialogue.current = null;
  eventBus.emit(EVENTS.DIALOGUE_ENDED, { dialogueId });
  return null;
}

export function advanceDialogue(choiceId = null) {
  const current = gameState.dialogue.current;
  if (!current) return null;

  const def = definitions.get(current.dialogueId);
  const node = getCurrentNode();
  if (!def || !node) return endDialogue(current.dialogueId);

  const visibleChoices = getVisibleChoices(node);
  leaveCurrentNode(node);

  let nextNodeId = node.next ?? null;

  if (visibleChoices.length > 0) {
    if (!choiceId) return node;
    const choice = visibleChoices.find((item) => item.id === choiceId);
    if (!choice) {
      console.warn(`[Dialogue] Escolha "${choiceId}" não está disponível.`);
      return node;
    }
    applyChoice(choice, { dialogueId: current.dialogueId }, choice.importance || "minor");
    nextNodeId = choice.next ?? nextNodeId;
  }

  if (!nextNodeId) return endDialogue(current.dialogueId);

  if (!def.nodes[nextNodeId]) {
    console.warn(`[Dialogue] Nó "${nextNodeId}" não existe em "${current.dialogueId}".`);
    return endDialogue(current.dialogueId);
  }

  gameState.dialogue.current = { dialogueId: current.dialogueId, nodeId: nextNodeId };
  return getCurrentNode();
}
