// Conditions.js
// Avaliador compartilhado de pré-requisitos. Tipos desconhecidos falham fechado.

function missionStatusFromState(missionId, state) {
  if (state.missions.active.includes(missionId)) return "ACTIVE";
  if (state.missions.completed.includes(missionId)) return "COMPLETED";
  if (state.missions.failed.includes(missionId)) return "FAILED";
  if (state.missions.hidden.includes(missionId)) return "HIDDEN";
  return null;
}

export function evaluateCondition(condition, state) {
  if (!condition || !condition.type) return false;

  switch (condition.type) {
    case "FLAG": {
      const expected = "equals" in condition ? condition.equals : true;
      return (state.story.flags[condition.flag] ?? false) === expected;
    }

    case "STAT_AT_LEAST":
      return Number(state.protagonist.stats[condition.stat] ?? -Infinity) >= Number(condition.value);

    case "STAT_AT_MOST":
      return Number(state.protagonist.stats[condition.stat] ?? Infinity) <= Number(condition.value);

    case "RELATIONSHIP_AT_LEAST": {
      const rel = state.protagonist.relationships[condition.characterId];
      const field = condition.field || "trust";
      return Number(rel?.[field] ?? 0) >= Number(condition.value);
    }

    case "RELATIONSHIP_AT_MOST": {
      const rel = state.protagonist.relationships[condition.characterId];
      const field = condition.field || "trust";
      return Number(rel?.[field] ?? 0) <= Number(condition.value);
    }

    case "MISSION_STATUS":
      return missionStatusFromState(condition.missionId, state) === condition.status;

    case "CODEX_STATUS":
      return (state.codex.unlockedEntries[condition.entryId]?.status || "DESCONHECIDO") === condition.status;

    default:
      console.warn(`[Conditions] Tipo desconhecido: "${condition.type}".`);
      return false;
  }
}

export function evaluateConditions(conditions = [], state) {
  return conditions.every((condition) => evaluateCondition(condition, state));
}
