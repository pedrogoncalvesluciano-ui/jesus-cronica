// Canon.js
// Registro de canon de PRODUÇÃO. Não confundir com o Códice do jogador.

export const CANON_STATUS = Object.freeze({
  CONFIRMADO: "CONFIRMADO",
  PROVISORIO: "PROVISORIO",
  ABERTO: "ABERTO",
  CONTRADICAO: "CONTRADICAO"
});

export const CANON_LEVEL = Object.freeze({
  PRINCIPIO_FUNDAMENTAL: "PRINCIPIO_FUNDAMENTAL",
  REGRA_DO_MUNDO: "REGRA_DO_MUNDO",
  PERSONAGEM: "PERSONAGEM",
  EVENTO: "EVENTO",
  IMPLEMENTACAO: "IMPLEMENTACAO"
});

const registry = new Map();
const retcons = [];

export function getCanonRegistry() {
  return Array.from(registry.values());
}

export function getCanonEntry(id) {
  return registry.get(id) || null;
}

export function canValidate(entry) {
  if (!entry || !entry.id) return { valid: false, reason: "ID ausente." };
  if (entry.canonStatus === CANON_STATUS.CONTRADICAO) {
    return { valid: false, reason: "Entrada marcada como CONTRADICAO." };
  }
  for (const dependency of entry.dependencies || []) {
    if (!registry.has(dependency)) {
      return { valid: false, reason: `Dependência não registrada: ${dependency}` };
    }
  }
  return { valid: true, reason: null };
}

export function registerCanonEntry(entry) {
  if (!entry?.id) throw new Error("[Canon] Toda entrada precisa de id.");

  const existing = registry.get(entry.id);
  if (existing?.canonStatus === CANON_STATUS.CONFIRMADO) {
    console.warn(`[Canon] Entrada CONFIRMADA "${entry.id}" não pode ser sobrescrita diretamente; use retcon.`);
    return existing;
  }

  const normalized = {
    canonLevel: CANON_LEVEL.REGRA_DO_MUNDO,
    canonStatus: CANON_STATUS.PROVISORIO,
    dependencies: [],
    ...entry
  };
  registry.set(normalized.id, normalized);
  return normalized;
}

export function listEntriesByStatus(status) {
  return getCanonRegistry().filter((entry) => entry.canonStatus === status);
}

export function createRetconRecord({ originalId, conflict, reason, newInterpretation }) {
  const record = {
    id: `retcon_${retcons.length + 1}`,
    originalId,
    conflict,
    reason,
    newInterpretation,
    approved: false,
    createdAt: new Date().toISOString()
  };
  retcons.push(record);
  return record;
}

export function approveRetcon(record, patch = {}) {
  if (!record || record.approved) return false;
  const original = registry.get(record.originalId);
  if (!original) return false;
  registry.set(record.originalId, { ...original, ...patch });
  record.approved = true;
  record.approvedAt = new Date().toISOString();
  return true;
}

export function listRetcons() {
  return [...retcons];
}
