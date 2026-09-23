// data/dialogues.js
// Os três primeiros nós reproduzem o texto confirmado do Prólogo.
// O nó final permanece PROVISÓRIO, conforme PROJETO.md.

export const prologueDialogue = {
  id: "dlg_prologo_gancho",
  canonStatus: "PROVISORIO",
  startNode: "n1",
  nodes: {
    n1: {
      id: "n1",
      speaker: "Membro da Organização",
      text: "Você tem certeza de que quer salvar o mundo?",
      conditions: [],
      choices: [],
      consequences: [],
      next: "n2"
    },
    n2: {
      id: "n2",
      speaker: "protagonist",
      text: "Sim.",
      conditions: [],
      choices: [],
      consequences: [],
      next: "n3"
    },
    n3: {
      id: "n3",
      speaker: "Membro da Organização",
      text: "Essa resposta será cobrada de você.",
      conditions: [],
      choices: [],
      consequences: [
        { type: "FLAG_SET", flag: "prologueHookHeard", value: true },
        { type: "CODEX_UNLOCK", entryId: "codex_organizacao_secreta", status: "DESCOBERTO" }
      ],
      next: "n4_provisional"
    },
    n4_provisional: {
      id: "n4_provisional",
      speaker: "Membro da Organização",
      text: "Então escolha o que fazer com esse peso antes de seguirmos.",
      conditions: [],
      consequences: [
        { type: "CODEX_UNLOCK", entryId: "codex_maquina_tempo", status: "DESCOBERTO" }
      ],
      choices: [
        {
          id: "choice_resolve",
          text: "Isso só me dá mais motivo para agir.",
          importance: "major",
          conditions: [],
          effects: { stats: { hope: 1, freedom: 1 } },
          next: null
        },
        {
          id: "choice_doubt",
          text: "Eu preciso entender no que estou me metendo.",
          importance: "major",
          conditions: [],
          effects: { stats: { knowledge: 1, guilt: 1 } },
          next: null
        }
      ],
      next: null
    }
  }
};

export function seedDialogues(defineDialogue) {
  defineDialogue(prologueDialogue);
}
