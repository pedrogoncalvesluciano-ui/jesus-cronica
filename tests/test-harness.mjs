// test-harness.mjs
// -----------------------------------------------------------------------
// Testa em Node.js todos os módulos que não dependem de DOM/Canvas real.
// NÃO cobre: Engine.js (canvas real), Renderer.js (contexto 2d real),
// UI.js (DOM real), Game.js (bootstrap, exige document/canvas), e as partes
// de Input.js que chamam addEventListener em window/document.
// -----------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(message);
    console.error(`[❌](https://fonts.gstatic.com/s/e/notoemoji/17.0/274c/32.png) FALHA: ${message}`);
  }
}

function assertEqual(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, `${label} — esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
}

// --- Mock mínimo de window/localStorage, necessário para Settings.js e
// SaveSystem.js (que chamam window.localStorage diretamente). -----------
class MemoryStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  removeItem(key) {
    this._data.delete(key);
  }
}
globalThis.window = { localStorage: new MemoryStorage() };

// =========================================================================
console.log("\n=== EventBus ===");
// =========================================================================
{
  const { eventBus, EVENTS } = await import("../js/EventBus.js");
  let received = null;
  const off = eventBus.on("TEST_EVENT", (data) => (received = data));
  eventBus.emit("TEST_EVENT", { value: 42 });
  assertEqual(received, { value: 42 }, "EventBus.on/emit entrega o payload");

  off();
  received = null;
  eventBus.emit("TEST_EVENT", { value: 99 });
  assertEqual(received, null, "EventBus.off() cancela o listener corretamente");

  let onceCount = 0;
  eventBus.once("ONCE_EVENT", () => (onceCount += 1));
  eventBus.emit("ONCE_EVENT");
  eventBus.emit("ONCE_EVENT");
  assertEqual(onceCount, 1, "EventBus.once() só dispara uma vez");

  assert(typeof EVENTS.CHOICE_MADE === "string", "EVENTS.CHOICE_MADE está definido");
}

// =========================================================================
console.log("\n=== GameState ===");
// =========================================================================
{
  const { gameState, mergeEffects, setFlag, getFlag, resetState } = await import("../js/GameState.js");

  assertEqual(gameState.protagonist.stats.hope, 0, "gameState inicial: hope começa em 0");
  assertEqual(gameState.protagonist.identity.name, null, "protagonista sem nome definido (canon aberto)");
  assertEqual(gameState.world.currentLocationId, null, "world.currentLocationId começa null");
  assertEqual(gameState.protagonist.position, { x: null, y: null, locationId: null }, "protagonist.position começa nulo");

  setFlag("testFlag", true);
  assertEqual(getFlag("testFlag"), true, "setFlag/getFlag funcionam");
  assertEqual(getFlag("flagInexistente"), false, "getFlag retorna false para flag desconhecida");

  mergeEffects({ stats: { hope: 2, guilt: 1 } });
  assertEqual(gameState.protagonist.stats.hope, 2, "mergeEffects aplica delta em stats (hope)");
  assertEqual(gameState.protagonist.stats.guilt, 1, "mergeEffects aplica delta em stats (guilt)");

  mergeEffects({ stats: { statInexistente: 5 } });
  assert(!("statInexistente" in gameState.protagonist.stats), "mergeEffects ignora stat desconhecida sem criar campo novo");

  mergeEffects({ relationships: { npc_teste: { trust: 3, flags: ["conheceu"] } } });
  assertEqual(gameState.protagonist.relationships.npc_teste.trust, 3, "mergeEffects cria relacionamento com trust correto");
  assertEqual(gameState.protagonist.relationships.npc_teste.flags, ["conheceu"], "mergeEffects adiciona flag de relacionamento");

  mergeEffects({ temporal: { stabilityDelta: -2 } });
  assertEqual(gameState.world.temporalStability, -2, "mergeEffects aplica delta de estabilidade temporal");

  resetState();
  assertEqual(gameState.protagonist.stats.hope, 0, "resetState volta ao estado inicial");
  assertEqual(getFlag("testFlag"), false, "resetState limpa flags");
}

// =========================================================================
console.log("\n=== Canon ===");
// =========================================================================
{
  const { registerCanonEntry, canValidate, createRetconRecord, approveRetcon, getCanonEntry, listEntriesByStatus, CANON_STATUS, CANON_LEVEL } =
    await import("../js/Canon.js");

  registerCanonEntry({ id: "regra_teste", canonLevel: CANON_LEVEL.PRINCIPIO_FUNDAMENTAL, canonStatus: CANON_STATUS.CONFIRMADO, dependencies: [] });
  const v1 = canValidate({ id: "regra_teste", canonStatus: CANON_STATUS.CONFIRMADO, dependencies: [] });
  assertEqual(v1.valid, true, "canValidate aceita entrada CONFIRMADA sem dependências pendentes");

  const v2 = canValidate({ id: "x", canonStatus: CANON_STATUS.CONTRADICAO });
  assertEqual(v2.valid, false, "canValidate rejeita status CONTRADICAO");

  const v3 = canValidate({ id: "y", canonStatus: CANON_STATUS.PROVISORIO, dependencies: ["nao_existe"] });
  assertEqual(v3.valid, false, "canValidate rejeita dependência não registrada");

  registerCanonEntry({ id: "protagonista_identidade", canonStatus: CANON_STATUS.PROVISORIO, dependencies: [] });
  const overwriteAttempt = registerCanonEntry({ id: "regra_teste", canonStatus: CANON_STATUS.PROVISORIO, description: "tentativa de sobrescrever" });
  assertEqual(overwriteAttempt.canonStatus, CANON_STATUS.CONFIRMADO, "registerCanonEntry recusa sobrescrever CONFIRMADO diretamente");

  const record = createRetconRecord({ originalId: "regra_teste", conflict: "teste", reason: "teste", newInterpretation: "nova" });
  assertEqual(record.approved, false, "createRetconRecord começa não aprovado");
  approveRetcon(record, { description: "atualizado via retcon" });
  assertEqual(record.approved, true, "approveRetcon marca o registro como aprovado");
  assertEqual(getCanonEntry("regra_teste").description, "atualizado via retcon", "approveRetcon de fato atualiza a entrada original");

  assert(listEntriesByStatus(CANON_STATUS.PROVISORIO).some((e) => e.id === "protagonista_identidade"), "listEntriesByStatus filtra corretamente");
}

// =========================================================================
console.log("\n=== Codex ===");
// =========================================================================
{
  const { defineCodexEntry, unlockCodexEntry, getCodexEntry, listCodexEntries, listDiscoveredCodexEntries, setPlayerTheory, flagContradiction, ENTRY_STATUS } =
    await import("../js/Codex.js");

  defineCodexEntry({ id: "codex_teste_a", category: "personagens", title: "Entrada de Teste A" });
  defineCodexEntry({ id: "codex_teste_b", category: "locais", title: "Entrada de Teste B" });

  assertEqual(getCodexEntry("codex_teste_a").status, ENTRY_STATUS.DESCONHECIDO, "entrada de codex começa DESCONHECIDO");
  assertEqual(listDiscoveredCodexEntries().length, 0, "nenhuma entrada descoberta ainda");

  unlockCodexEntry("codex_teste_a", ENTRY_STATUS.DESCOBERTO);
  assertEqual(getCodexEntry("codex_teste_a").status, ENTRY_STATUS.DESCOBERTO, "unlockCodexEntry atualiza status");
  assert(listDiscoveredCodexEntries().some((e) => e.id === "codex_teste_a"), "listDiscoveredCodexEntries inclui entrada descoberta");

  setPlayerTheory("codex_teste_a", "Minha teoria pessoal");
  assertEqual(getCodexEntry("codex_teste_a").playerTheory, "Minha teoria pessoal", "setPlayerTheory registra a teoria do jogador");

  unlockCodexEntry("codex_teste_b", ENTRY_STATUS.CONFIRMADO);
  flagContradiction("codex_teste_a", "codex_teste_b");
  assertEqual(getCodexEntry("codex_teste_a").status, ENTRY_STATUS.CONTRADITO, "flagContradiction marca a primeira entrada como CONTRADITO");
  assertEqual(getCodexEntry("codex_teste_b").status, ENTRY_STATUS.CONTRADITO, "flagContradiction marca a segunda entrada como CONTRADITO");

  assertEqual(getCodexEntry("id_que_nao_existe"), null, "getCodexEntry retorna null para id não definido");
}

// =========================================================================
console.log("\n=== Conditions ===");
// =========================================================================
{
  const { evaluateCondition, evaluateConditions } = await import("../js/Conditions.js");
  const { gameState, setFlag } = await import("../js/GameState.js");

  setFlag("condFlag", true);
  assertEqual(evaluateCondition({ type: "FLAG", flag: "condFlag" }, gameState), true, "FLAG condition (esperando true)");
  assertEqual(evaluateCondition({ type: "FLAG", flag: "condFlag", equals: false }, gameState), false, "FLAG condition (esperando false explícito)");

  gameState.protagonist.stats.hope = 5;
  assertEqual(evaluateCondition({ type: "STAT_AT_LEAST", stat: "hope", value: 3 }, gameState), true, "STAT_AT_LEAST satisfeita");
  assertEqual(evaluateCondition({ type: "STAT_AT_MOST", stat: "hope", value: 3 }, gameState), false, "STAT_AT_MOST não satisfeita");

  gameState.protagonist.relationships.npc_x = { trust: 4, respect: 0, fear: 0, loyalty: 0, flags: [] };
  assertEqual(evaluateCondition({ type: "RELATIONSHIP_AT_LEAST", characterId: "npc_x", value: 2 }, gameState), true, "RELATIONSHIP_AT_LEAST satisfeita");

  assertEqual(evaluateCondition({ type: "TIPO_INEXISTENTE" }, gameState), false, "tipo de condição desconhecido falha fechado (false)");
  assertEqual(evaluateConditions([], gameState), true, "lista vazia de condições é sempre satisfeita");
  assertEqual(
    evaluateConditions([{ type: "STAT_AT_LEAST", stat: "hope", value: 3 }, { type: "STAT_AT_LEAST", stat: "hope", value: 100 }], gameState),
    false,
    "evaluateConditions exige TODAS as condições (E lógico)"
  );
}

// =========================================================================
console.log("\n=== Physics ===");
// =========================================================================
{
  const { aabbIntersect, resolveMovement, clamp, distance } = await import("../js/Physics.js");

  assertEqual(aabbIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }), true, "aabbIntersect detecta sobreposição");
  assertEqual(aabbIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 10, height: 10 }), false, "aabbIntersect detecta ausência de sobreposição");

  const entity = { x: 0, y: 0, width: 10, height: 10 };
  const obstacles = [{ x: 15, y: 0, width: 10, height: 10 }];
  resolveMovement(entity, 20, 0, obstacles); // tentando atravessar o obstáculo
  assert(entity.x <= 15, "resolveMovement bloqueia o eixo X ao colidir com obstáculo");

  assertEqual(clamp(15, 0, 10), 10, "clamp limita ao máximo");
  assertEqual(clamp(-5, 0, 10), 0, "clamp limita ao mínimo");
  assertEqual(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5, "distance calcula distância euclidiana corretamente (3-4-5)");
}

// =========================================================================
console.log("\n=== Camera ===");
// =========================================================================
{
  const { createCamera, updateCamera, worldToScreen, screenToWorld } = await import("../js/Camera.js");

  const camera = createCamera();
  camera.viewportWidth = 200;
  camera.viewportHeight = 100;

  updateCamera(camera, { x: 500, y: 500, width: 10, height: 10 }, { width: 1000, height: 1000 });
  assert(camera.x >= 0 && camera.x <= 1000 - 200, "updateCamera mantém câmera dentro dos limites do mundo (X)");

  updateCamera(camera, { x: 5, y: 5, width: 10, height: 10 }, { width: 50, height: 50 });
  assertEqual(camera.x, -(200 - 50) / 2, "updateCamera centraliza quando a localização é menor que o viewport (X)");

  const screenPos = worldToScreen(camera, 100, 100);
  const worldPos = screenToWorld(camera, screenPos.x, screenPos.y);
  assertEqual(worldPos, { x: 100, y: 100 }, "worldToScreen/screenToWorld são inversos um do outro");
}

// =========================================================================
console.log("\n=== Entities ===");
// =========================================================================
{
  const { createNpc, createInteractableObject, getEntityCenter, distanceBetweenEntities } = await import("../js/Entities.js");

  const npc = createNpc({ id: "npc1", name: "NPC Um", x: 0, y: 0 });
  assertEqual(npc.kind, "npc", "createNpc define kind correto");
  assertEqual(npc.interactionType, "DIALOGUE", "createNpc define interactionType DIALOGUE");

  const obj = createInteractableObject({ id: "obj1", name: "Objeto Um", x: 0, y: 0, inspectText: "texto" });
  assertEqual(obj.kind, "object", "createInteractableObject define kind correto");
  assertEqual(obj.interactionType, "INSPECT", "createInteractableObject define interactionType INSPECT");

  const center = getEntityCenter({ x: 10, y: 10, width: 20, height: 20 });
  assertEqual(center, { x: 20, y: 20 }, "getEntityCenter calcula o centro corretamente");

  const d = distanceBetweenEntities({ x: 0, y: 0, width: 10, height: 10 }, { x: 30, y: 0, width: 10, height: 10 });
  assertEqual(d, 30, "distanceBetweenEntities mede entre os centros");
}

// =========================================================================
console.log("\n=== World ===");
// =========================================================================
{
  const { defineLocation, loadLocation, getCurrentLocation, getObstaclesInCurrentLocation, getInteractablesInCurrentLocation, checkExitTrigger, isLocationDiscovered, listDefinedLocationIds } =
    await import("../js/World.js");
  const { gameState } = await import("../js/GameState.js");

  defineLocation({
    id: "loc_teste",
    name: "Local de Teste",
    bounds: { width: 500, height: 500 },
    obstacles: [{ x: 100, y: 100, width: 50, height: 50 }],
    interactables: [{ id: "int1", name: "Interagível", x: 10, y: 10, width: 10, height: 10, interactionRadius: 20 }],
    exits: [{ id: "exit1", bounds: { x: 480, y: 0, width: 20, height: 500 }, targetLocationId: "outro_local", targetSpawn: { x: 10, y: 10 } }]
  });

  assertEqual(isLocationDiscovered("loc_teste"), false, "localização começa não descoberta");
  const loaded = loadLocation("loc_teste");
  assertEqual(loaded.name, "Local de Teste", "loadLocation retorna a definição correta");
  assertEqual(getCurrentLocation().id, "loc_teste", "getCurrentLocation reflete a localização carregada");
  assertEqual(isLocationDiscovered("loc_teste"), true, "loadLocation marca a localização como descoberta");
  assertEqual(gameState.world.currentLocationId, "loc_teste", "loadLocation sincroniza world.currentLocationId no gameState");

  assertEqual(getObstaclesInCurrentLocation().length, 1, "getObstaclesInCurrentLocation retorna os obstáculos certos");
  assertEqual(getInteractablesInCurrentLocation().length, 1, "getInteractablesInCurrentLocation retorna os interagíveis certos");

  const noExit = checkExitTrigger({ x: 0, y: 0, width: 10, height: 10 });
  assertEqual(noExit, null, "checkExitTrigger retorna null longe de qualquer saída");
  const exitHit = checkExitTrigger({ x: 485, y: 10, width: 10, height: 10 });
  assertEqual(exitHit && exitHit.id, "exit1", "checkExitTrigger detecta sobreposição com a zona de saída");

  assert(listDefinedLocationIds().includes("loc_teste"), "listDefinedLocationIds inclui a localização definida");
}

// =========================================================================
console.log("\n=== Relationships ===");
// =========================================================================
{
  const { getRelationship, listRelationships, hasRelationshipFlag, getDispositionLabel } = await import("../js/Relationships.js");
  const { mergeEffects } = await import("../js/GameState.js");

  assertEqual(getRelationship("npc_desconhecido").trust, 0, "getRelationship retorna default para npc sem relação registrada");

  mergeEffects({ relationships: { npc_rel_teste: { trust: 6, flags: ["marcado"] } } });
  assertEqual(getRelationship("npc_rel_teste").trust, 6, "getRelationship reflete o trust após mergeEffects");
  assert(hasRelationshipFlag("npc_rel_teste", "marcado"), "hasRelationshipFlag detecta flag presente");
  assertEqual(getDispositionLabel("npc_rel_teste"), "Aliado", "getDispositionLabel classifica trust alto como Aliado");
  assert(listRelationships().some((r) => r.characterId === "npc_rel_teste"), "listRelationships inclui o relacionamento criado");
}

// =========================================================================
console.log("\n=== Missions ===");
// =========================================================================
{
  const { defineMission, getMissionStatus, startMission, completeMission, failMission, listMissionsByStatus } = await import("../js/Missions.js");
  const { getCodexEntry, defineCodexEntry } = await import("../js/Codex.js");

  defineCodexEntry({ id: "codex_recompensa_teste", category: "eventos", title: "Recompensa de Teste" });

  defineMission({
    id: "missao_teste",
    title: "Missão de Teste",
    conditions: [],
    rewards: [{ type: "CODEX_UNLOCK", entryId: "codex_recompensa_teste", status: "DESCOBERTO" }]
  });

  assertEqual(getMissionStatus("missao_teste"), "AVAILABLE", "missão sem condições começa AVAILABLE (resolve a contradição LOCKED/AVAILABLE do canon)");
  assertEqual(startMission("missao_teste"), true, "startMission ativa uma missão AVAILABLE");
  assertEqual(getMissionStatus("missao_teste"), "ACTIVE", "status vira ACTIVE após startMission");

  assertEqual(completeMission("missao_teste"), true, "completeMission conclui uma missão ativa");
  assertEqual(getMissionStatus("missao_teste"), "COMPLETED", "status vira COMPLETED");
  assertEqual(getCodexEntry("codex_recompensa_teste").status, "DESCOBERTO", "recompensa CODEX_UNLOCK foi aplicada ao completar a missão");

  defineMission({ id: "missao_bloqueada", conditions: [{ type: "FLAG", flag: "flag_nunca_definida" }] });
  assertEqual(getMissionStatus("missao_bloqueada"), "LOCKED", "missão com condição não satisfeita fica LOCKED");
  assertEqual(startMission("missao_bloqueada"), false, "startMission recusa iniciar missão LOCKED");

  defineMission({ id: "missao_para_falhar", conditions: [] });
  startMission("missao_para_falhar");
  assertEqual(failMission("missao_para_falhar"), true, "failMission falha uma missão ativa");
  assertEqual(getMissionStatus("missao_para_falhar"), "FAILED", "status vira FAILED");

  assert(listMissionsByStatus("COMPLETED").includes("missao_teste"), "listMissionsByStatus filtra corretamente");
}

// =========================================================================
console.log("\n=== Choices ===");
// =========================================================================
{
  const { applyChoice, wasChoiceMade, getChoiceRecord } = await import("../js/Choices.js");
  const { gameState } = await import("../js/GameState.js");

  const before = gameState.protagonist.stats.faith;
  applyChoice({ id: "escolha_teste", text: "Uma escolha", effects: { stats: { faith: 3 } } }, { dialogueId: "dlg_x" }, "major");

  assertEqual(gameState.protagonist.stats.faith, before + 3, "applyChoice aplica os efeitos via mergeEffects");
  assert(wasChoiceMade("escolha_teste"), "wasChoiceMade reconhece a escolha feita");
  assertEqual(getChoiceRecord("escolha_teste").text, "Uma escolha", "getChoiceRecord retorna o registro certo");
  assert(!wasChoiceMade("escolha_nunca_feita"), "wasChoiceMade retorna false para escolha não feita");
}

// =========================================================================
console.log("\n=== Dialogue (fluxo completo do Prólogo) ===");
// =========================================================================
{
  const { defineDialogue, startDialogue, getCurrentNode, advanceDialogue, isDialogueActive, getVisibleChoices } = await import("../js/Dialogue.js");
  const { prologueDialogue } = await import("../js/data/dialogues.js");
  const { getCodexEntry } = await import("../js/Codex.js");
  const { seedCodex } = await import("../js/data/codex-seed.js");
  const { getFlag } = await import("../js/GameState.js");

  seedCodex(); // garante que codex_organizacao_secreta/codex_maquina_tempo existem antes do diálogo os desbloquear
  defineDialogue(prologueDialogue);

  const n1 = startDialogue("dlg_prologo_gancho");
  assertEqual(n1.text, "Você tem certeza de que quer salvar o mundo?", "nó 1 do prólogo tem o texto exato do documento-fonte");
  assert(isDialogueActive(), "isDialogueActive() é true após startDialogue");

  const n2 = advanceDialogue();
  assertEqual(n2.text, "Sim.", "nó 2 (resposta fixa do protagonista) avança corretamente sem escolha");

  const n3 = advanceDialogue();
  assertEqual(n3.text, "Essa resposta será cobrada de você.", "nó 3 avança corretamente");

  const n4 = advanceDialogue(); // aplica consequências do nó 3 (unlocks) e entra no nó de escolha
  assertEqual(getFlag("prologueHookHeard"), true, "consequência FLAG_SET do nó 3 foi aplicada");
  assertEqual(getCodexEntry("codex_organizacao_secreta").status, "DESCOBERTO", "consequência CODEX_UNLOCK do nó 3 foi aplicada");

  const visibleChoices = getVisibleChoices(n4);
  assertEqual(visibleChoices.length, 2, "nó de escolha final expõe as 2 opções (sem condições bloqueando)");

  advanceDialogue(visibleChoices[0].id); // escolhe "Isso só me dá mais motivo para agir."
  assertEqual(isDialogueActive(), false, "diálogo termina após a escolha final (next: null)");
  assertEqual(getCodexEntry("codex_maquina_tempo").status, "DESCOBERTO", "consequência do nó final (CODEX_UNLOCK) foi aplicada mesmo levando a choices");
}

// =========================================================================
console.log("\n=== SceneTransition ===");
// =========================================================================
{
  const { createTransitionController, startTransition, updateTransition, isTransitioning } = await import("../js/SceneTransition.js");

  const controller = createTransitionController();
  assertEqual(isTransitioning(controller), false, "controller começa idle (não transicionando)");

  let actionExecuted = false;
  const started = startTransition(controller, () => (actionExecuted = true));
  assertEqual(started, true, "startTransition inicia quando idle");
  assertEqual(isTransitioning(controller), true, "isTransitioning true durante fadeOut");

  const reStart = startTransition(controller, () => {});
  assertEqual(reStart, false, "startTransition recusa reentrância enquanto já transicionando");

  // Avança tempo suficiente para completar fadeOut inteiro (0.25s) em um passo.
  let lastAlpha = null;
  updateTransition(controller, 0.3, (alpha) => (lastAlpha = alpha));
  assertEqual(actionExecuted, true, "a ação pendente executa ao final do fadeOut");
  assertEqual(controller.phase, "fadeIn", "controller entra em fadeIn após executar a ação");

  updateTransition(controller, 0.3, (alpha) => (lastAlpha = alpha));
  assertEqual(controller.phase, "idle", "controller volta a idle após completar o fadeIn");
  assertEqual(lastAlpha, 0, "opacidade final do fadeIn é 0 (tela totalmente visível)");
}

// =========================================================================
console.log("\n=== AudioManager + Settings (com localStorage mockado) ===");
// =========================================================================
{
  const { setVolume, getVolume, setMuted, isMuted, getEffectiveVolume, registerAudio, playSfx, playMusic, getCurrentMusicId, stopMusic } =
    await import("../js/AudioManager.js");
  const { saveSettings, loadSettings } = await import("../js/Settings.js");

  setVolume("music", 0.5);
  assertEqual(getVolume("music"), 0.5, "setVolume/getVolume funcionam para o canal music");

  setMuted(true);
  assertEqual(getEffectiveVolume("music"), 0, "getEffectiveVolume é 0 quando mudo, mesmo com volume > 0");
  setMuted(false);
  setVolume("master", 0.5);
  assertEqual(getEffectiveVolume("music"), 0.25, "getEffectiveVolume multiplica master * canal (0.5 * 0.5)");

  assertEqual(playSfx("som_nao_registrado"), false, "playSfx retorna false (no-op honesto) para som não registrado — nenhum asset de áudio foi fornecido");
  registerAudio("musica_teste", "musica.mp3", "music");
  assertEqual(playMusic("musica_teste"), true, "playMusic retorna true para música registrada no manifesto");
  assertEqual(getCurrentMusicId(), "musica_teste", "getCurrentMusicId reflete a música tocando");
  stopMusic();
  assertEqual(getCurrentMusicId(), null, "stopMusic limpa a música atual");

  const saved = saveSettings();
  assertEqual(saved, true, "saveSettings grava no localStorage mockado sem erro");
  setVolume("music", 0.1); // muda o valor em memória para garantir que loadSettings de fato recarrega
  const loaded = loadSettings();
  assertEqual(loaded, true, "loadSettings lê de volta do localStorage mockado");
  assertEqual(getVolume("music"), 0.5, "loadSettings restaura o volume salvo (0.5), não o valor alterado depois (0.1)");
}

// =========================================================================
console.log("\n=== SaveSystem (com localStorage mockado) ===");
// =========================================================================
{
  const { saveGame, loadGame, hasSaveGame, deleteSave } = await import("../js/SaveSystem.js");
  const { gameState, setFlag, resetState } = await import("../js/GameState.js");

  resetState();
  assertEqual(hasSaveGame(), false, "hasSaveGame é false antes de qualquer save (chave própria, isolada de Settings)");

  setFlag("flagParaSalvar", true);
  gameState.protagonist.stats.hope = 7;
  gameState.world.currentLocationId = "loc_salva_teste";
  gameState.protagonist.position = { x: 123, y: 456, locationId: "loc_salva_teste" };

  const savedOk = saveGame();
  assertEqual(savedOk, true, "saveGame grava sem erro no localStorage mockado");
  assertEqual(hasSaveGame(), true, "hasSaveGame é true depois de salvar");

  resetState();
  assertEqual(gameState.protagonist.stats.hope, 0, "resetState de fato zera o estado antes do teste de load");

  const loaded = loadGame();
  assertEqual(loaded.protagonist.stats.hope, 7, "loadGame restaura stats salvos");
  assertEqual(loaded.world.currentLocationId, "loc_salva_teste", "loadGame restaura currentLocationId — corrige o gap de posição identificado durante a construção");
  assertEqual(loaded.protagonist.position, { x: 123, y: 456, locationId: "loc_salva_teste" }, "loadGame restaura a posição exata do jogador");
  assertEqual(getFlagFrom(loaded, "flagParaSalvar"), true, "loadGame restaura flags de história");

  deleteSave();
  assertEqual(hasSaveGame(), false, "deleteSave remove o save do localStorage");

  function getFlagFrom(state, flag) {
    return state.story.flags[flag] ?? false;
  }
}

// =========================================================================
console.log("\n=== Seeds de conteúdo real (canon, códice, missões, localizações) ===");
// =========================================================================
{
  const { seedCanon } = await import("../js/data/canon-seed.js");
  const { seedMissions } = await import("../js/data/missions-seed.js");
  const { seedLocations } = await import("../js/data/locations-seed.js");
  const { getCanonRegistry } = await import("../js/Canon.js");
  const { getLocationDefinition, loadLocation, getCurrentLocation } = await import("../js/World.js");
  const { getMissionStatus } = await import("../js/Missions.js");

  seedCanon();
  assert(getCanonRegistry().length >= 7, "seedCanon registra todas as entradas esperadas (>= 7)");

  seedMissions();
  assertEqual(getMissionStatus("missao_prologo_proposta"), "AVAILABLE", "missão do prólogo carregada via seed começa AVAILABLE");
  assertEqual(getMissionStatus("missao_ato1_indefinida"), "LOCKED", "missão do Ato I (condicionada) começa LOCKED, como esperado");

  seedLocations();
  assert(getLocationDefinition("zona_resgate") !== null, "seedLocations define zona_resgate");
  assert(getLocationDefinition("base_organizacao") !== null, "seedLocations define base_organizacao");

  loadLocation("zona_resgate");
  assertEqual(getCurrentLocation().interactables.length, 1, "zona_resgate tem exatamente 1 interagível (o Membro da Organização)");

  loadLocation("base_organizacao");
  assertEqual(getCurrentLocation().interactables[0].id, "terminal_cronofago", "base_organizacao tem o console do CRONÓFAGO como interagível");
}

// =========================================================================
console.log("\n=== Regressão: localStorage inacessível não pode travar o boot ===");
// =========================================================================
{
  // Simula o cenário real que causou o bug corrigido nesta versão: o
  // navegador lança uma exceção só de ACESSAR localStorage (não apenas ao
  // chamar um método específico) — acontece em algumas configurações de
  // aba anônima/privacidade estrita. Antes da correção, isso travava
  // Game.js inteiro na primeira chamada a loadSettings().
  const originalWindow = globalThis.window;
  globalThis.window = {
    get localStorage() {
      throw new DOMException("Acesso a localStorage negado (simulado)", "SecurityError");
    }
  };
