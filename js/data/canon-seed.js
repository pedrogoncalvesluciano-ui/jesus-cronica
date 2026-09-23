// data/canon-seed.js
// Entradas mínimas extraídas/derivadas apenas do estado documentado do protótipo.

import { registerCanonEntry, CANON_LEVEL, CANON_STATUS } from "../Canon.js";

export function seedCanon() {
  const entries = [
    {
      id: "regra_jesus_nao_entidade_comum",
      canonLevel: CANON_LEVEL.PRINCIPIO_FUNDAMENTAL,
      canonStatus: CANON_STATUS.CONFIRMADO,
      description: "Jesus não deve ser instanciado como uma Entity comum.",
      dependencies: []
    },
    {
      id: "regra_viagem_temporal_tem_custo",
      canonLevel: CANON_LEVEL.REGRA_DO_MUNDO,
      canonStatus: CANON_STATUS.CONFIRMADO,
      description: "Nenhuma viagem temporal é grátis.",
      dependencies: []
    },
    {
      id: "tecnologia_cronofago",
      canonLevel: CANON_LEVEL.REGRA_DO_MUNDO,
      canonStatus: CANON_STATUS.CONFIRMADO,
      description: "O CRONÓFAGO existe no canon registrado do projeto.",
      dependencies: []
    },
    {
      id: "organizacao_prologo",
      canonLevel: CANON_LEVEL.EVENTO,
      canonStatus: CANON_STATUS.CONFIRMADO,
      description: "O prólogo inclui um membro de uma Organização.",
      dependencies: []
    },
    {
      id: "protagonista_identidade_aberta",
      canonLevel: CANON_LEVEL.PERSONAGEM,
      canonStatus: CANON_STATUS.PROVISORIO,
      description: "Nome e ficha completa do protagonista permanecem em aberto.",
      dependencies: []
    },
    {
      id: "geografia_futuro_aberta",
      canonLevel: CANON_LEVEL.REGRA_DO_MUNDO,
      canonStatus: CANON_STATUS.PROVISORIO,
      description: "A geografia exata do futuro devastado ainda não foi definida.",
      dependencies: []
    },
    {
      id: "nomes_localizacoes_provisorios",
      canonLevel: CANON_LEVEL.IMPLEMENTACAO,
      canonStatus: CANON_STATUS.PROVISORIO,
      description: "Zona de Resgate e Base da Organização são nomes de trabalho.",
      dependencies: []
    }
  ];

  for (const entry of entries) registerCanonEntry(entry);
}
