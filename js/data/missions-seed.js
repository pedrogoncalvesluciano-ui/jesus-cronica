// data/missions-seed.js
// -----------------------------------------------------------------------
// Missões do Prólogo. A segunda missão existe deliberadamente "vazia"
// (title/objective null) para demonstrar a progressão LOCKED -> AVAILABLE
// sem inventar conteúdo do Ato I, que não foi definido nos documentos
// recebidos (Especificação Mestra, seção 31 — nunca preencher dados
// indefinidos com invenção).
// -----------------------------------------------------------------------

import { defineMission } from "../Missions.js";

export function seedMissions() {
  defineMission({
    id: "missao_prologo_proposta",
    type: "MAIN",
    canonStatus: "PROVISORIO", // o enquadramento como "missão" formal é uma decisão de design nossa; a Parte 01 descreve uma cena, não uma missão com esse nome
    title: "A Pergunta",
    objective: "Ouça o que o membro da Organização tem a dizer.",
    context: "Antes da viagem, alguém precisa saber se você está pronto para o que vem a seguir.",
    locationIds: ["zona_resgate"],
    npcIds: ["membro_organizacao"],
    enemyIds: [],
    obstacles: [],
    dialogueIds: ["dlg_prologo_gancho"],
    choiceIds: ["choice_resolve", "choice_doubt"],
    conditions: [],
    consequences: [],
    rewards: [{ type: "CODEX_UNLOCK", entryId: "codex_organizacao_secreta", status: "DESCOBERTO" }],
    revelationIds: []
  });

  defineMission({
    id: "missao_ato1_indefinida",
    type: "MAIN",
    canonStatus: "PROVISORIO",
    // CANON ABERTO: o conteúdo do Ato I não foi especificado nos
    // documentos recebidos. title/objective ficam null de propósito —
    // preencher agora seria inventar enredo, não implementar o que já
    // existe.
    title: null,
    objective: null,
    context: "Aguardando definição do Ato I nos documentos do projeto.",
    locationIds: [],
    npcIds: [],
    enemyIds: [],
    obstacles: [],
    dialogueIds: [],
    choiceIds: [],
    conditions: [{ type: "MISSION_STATUS", missionId: "missao_prologo_proposta", status: "COMPLETED" }],
    consequences: [],
    rewards: [],
    revelationIds: []
  });
}

