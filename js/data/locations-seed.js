// data/locations-seed.js
// -----------------------------------------------------------------------
// Localizações do Prólogo. Nomes de lugares são NOMES DE TRABALHO
// (PROVISÓRIO) — a geografia exata do futuro devastado é CANON ABERTO
// (Bíblia do Universo, seção "Elementos em Aberto"). As coordenadas de
// obstáculos/portas são invenção de implementação (preciso de *algum*
// layout para ter um protótipo jogável), não afirmações sobre a
// geografia real do universo.
// -----------------------------------------------------------------------

import { defineLocation } from "../World.js";
import { createNpc, createInteractableObject } from "../Entities.js";
import { defineDialogue } from "../Dialogue.js";

/**
 * Cria um objeto interativo do tipo "inspecionar" e registra, junto, um
 * diálogo de um único nó para exibi-lo — reaproveitando a mesma UI/lógica
 * de diálogo em vez de construir um segundo sistema de popup só para
 * objetos. Ver Renderer.js para a diferença visual (losango vs. retângulo).
 */
function createInspectable({ id, name, x, y, width, height, color, inspectText, codexUnlock }) {
  const dialogueId = `insp_${id}`;

  defineDialogue({
    id: dialogueId,
    canonStatus: "PROVISORIO",
    sourceModule: "GameArchitect:ObjetoInteragivel",
    startNode: "n1",
    nodes: {
      n1: {
        id: "n1",
        speaker: name,
        text: inspectText,
        conditions: [],
        choices: [],
        consequences: codexUnlock
          ? [{ type: "CODEX_UNLOCK", entryId: codexUnlock.entryId, status: codexUnlock.status }]
          : [],
        next: null
      }
    }
  });

  const obj = createInteractableObject({ id, name, x, y, width, height, color, inspectText, codexUnlock });
  obj.dialogueId = dialogueId;
  return obj;
}

export function seedLocations() {
  defineLocation({
    id: "zona_resgate",
    canonStatus: "PROVISORIO",
    name: "Zona de Resgate (nome de trabalho)",
    backgroundColor: "#14181F",
    bounds: { width: 1400, height: 900 },
    obstacles: [
      { x: 300, y: 200, width: 160, height: 200 },
      { x: 700, y: 500, width: 220, height: 120 },
      { x: 1000, y: 150, width: 120, height: 300 },
      { x: 100, y: 600, width: 300, height: 90 }
    ],
    interactables: [
      createNpc({
        id: "membro_organizacao",
        name: "Membro da Organização",
        x: 640,
        y: 380,
        color: "#4C9A94",
        dialogueId: "dlg_prologo_gancho"
      })
    ],
    exits: [
      {
        id: "exit_zona_para_base",
        bounds: { x: 1370, y: 380, width: 30, height: 100 },
        targetLocationId: "base_organizacao",
        targetSpawn: { x: 80, y: 220 }
      }
    ]
  });

  defineLocation({
    id: "base_organizacao",
    canonStatus: "PROVISORIO",
    name: "Base da Organização — interior (nome de trabalho)",
    backgroundColor: "#10131A",
    bounds: { width: 900, height: 500 },
    obstacles: [
      { x: 300, y: 0, width: 40, height: 220 },
      { x: 300, y: 320, width: 40, height: 180 },
      { x: 600, y: 100, width: 200, height: 40 }
    ],
    interactables: [
      createInspectable({
        id: "terminal_cronofago",
        name: "Console do CRONÓFAGO",
        x: 700,
        y: 250,
        width: 36,
        height: 36,
        color: "#8C7BB0",
        inspectText:
          "Um painel de controle cercado de cabos. Símbolos não catalogados piscam em sequência — parecem contar algo, mas não fica claro se é tempo, distância ou algo sem nome ainda.",
        codexUnlock: { entryId: "codex_misterio_quem_controla", status: "SUSPEITA" }
      })
    ],
    exits: [
      {
        id: "exit_base_para_zona",
        bounds: { x: 0, y: 180, width: 30, height: 100 },
        targetLocationId: "zona_resgate",
        targetSpawn: { x: 1250, y: 420 }
      }
    ]
  });
}

