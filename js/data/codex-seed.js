// data/codex-seed.js

import { defineCodexEntry, CATEGORIES } from "../Codex.js";

export function seedCodex() {
  defineCodexEntry({
    id: "codex_organizacao_secreta",
    category: CATEGORIES.FACCOES,
    title: "A Organização",
    summary: "Uma organização ligada aos acontecimentos do Prólogo."
  });

  defineCodexEntry({
    id: "codex_maquina_tempo",
    category: CATEGORIES.TECNOLOGIA,
    title: "Viagem Temporal",
    summary: "Tecnologia temporal existe, mas seus limites e custos ainda exigem investigação."
  });

  defineCodexEntry({
    id: "codex_misterio_quem_controla",
    category: CATEGORIES.MISTERIOS,
    title: "Quem controla o CRONÓFAGO?",
    summary: "O console sugere que há mais por trás da máquina do que o jogador sabe."
  });
}
