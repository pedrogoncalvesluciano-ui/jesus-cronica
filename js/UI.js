// UI.js
// ============================================================================
// Camada de apresentação em DOM/HTML — separada do Canvas (gameplay) e do
// GameState (regras). UI.js só LÊ estado (via os módulos de sistema) e
// ESCREVE no DOM; a única exceção são ações explicitamente disparadas pelo
// jogador (clicar "Salvar", mover um slider de volume, escolher uma opção de
// diálogo), que chamam funções dos módulos de sistema — nunca mutam
// gameState diretamente daqui.
//
// Painéis laterais (Códice / Missões / Configurações) são mutuamente
// exclusivos: abrir um fecha os outros dois, para não empilhar painéis no
// mesmo espaço da tela.
// ============================================================================

import { getCurrentNode, advanceDialogue, isDialogueActive, getVisibleChoices } from "./Dialogue.js";
import { listCodexEntries, ENTRY_STATUS, CATEGORIES } from "./Codex.js";
import { getCurrentLocation } from "./World.js";
import { listAllMissionSummaries } from "./Missions.js";
import { saveGame, loadGame, hasSaveGame } from "./SaveSystem.js";
import {
  getVolume,
  setVolume,
  isMuted,
  setMuted,
  getSettingsSnapshot
} from "./AudioManager.js";
import { saveSettings } from "./Settings.js";

let els = {};

// ----------------------------------------------------------------------------
// Rótulos de exibição (só apresentação — nenhum dado novo, só tradução de
// enums internos para texto legível).
// ----------------------------------------------------------------------------

const CODEX_STATUS_LABEL = {
  [ENTRY_STATUS.DESCONHECIDO]: "Desconhecido",
  [ENTRY_STATUS.DESCOBERTO]: "Descoberto",
  [ENTRY_STATUS.SUSPEITA]: "Suspeita",
  [ENTRY_STATUS.TEORIA]: "Teoria",
  [ENTRY_STATUS.CONFIRMADO]: "Confirmado",
  [ENTRY_STATUS.CONTRADITO]: "Contraditório"
};

const CATEGORY_LABEL = {
  [CATEGORIES.PERSONAGENS]: "Personagens",
  [CATEGORIES.LOCAIS]: "Locais",
  [CATEGORIES.FACCOES]: "Facções",
  [CATEGORIES.CRIATURAS]: "Criaturas",
  [CATEGORIES.TECNOLOGIA]: "Tecnologia",
  [CATEGORIES.MAGIA]: "Magia",
  [CATEGORIES.EVENTOS]: "Eventos",
  [CATEGORIES.CRONOLOGIA]: "Cronologia",
  [CATEGORIES.MISTERIOS]: "Mistérios",
  [CATEGORIES.PROFECIAS]: "Profecias",
  [CATEGORIES.ARTEFATOS]: "Artefatos",
  [CATEGORIES.VIAGEM_TEMPORAL]: "Viagem Temporal",
  [CATEGORIES.DOCUMENTOS]: "Documentos",
  [CATEGORIES.DECISOES]: "Decisões",
  [CATEGORIES.ESTADO_DO_MUNDO]: "Estado do Mundo"
};

const MISSION_STATUS_LABEL = {
  ACTIVE: "Em andamento",
  COMPLETED: "Concluída",
  FAILED: "Fracassada",
  AVAILABLE: "Disponível",
  LOCKED: "Bloqueada",
  HIDDEN: "Oculta"
};

const SPEAKER_LABEL = {
  protagonist: "Você"
  // Outros speakers caem no fallback (usam o próprio id/nome) — a maioria
  // dos NPCs já passa `name` amigável como `speaker` nos dados de diálogo
  // gerados por Entities.createNpc + World.defineLocation.
};

// ----------------------------------------------------------------------------
// Inicialização
// ----------------------------------------------------------------------------

export function initUI() {
  els = {
    hudLocation: document.getElementById("hud-location"),
    codexToggle: document.getElementById("codex-toggle"),
    missionsToggle: document.getElementById("missions-toggle"),
    settingsToggle: document.getElementById("settings-toggle"),

    interactPrompt: document.getElementById("interact-prompt"),

    dialogueBox: document.getElementById("dialogue-box"),
    dialogueSpeaker: document.getElementById("dialogue-speaker"),
    dialogueText: document.getElementById("dialogue-text"),
    dialogueChoices: document.getElementById("dialogue-choices"),
    dialogueContinue: document.getElementById("dialogue-continue"),

    codexPanel: document.getElementById("codex-panel"),
    codexPanelBody: document.getElementById("codex-panel-body"),
    codexClose: document.getElementById("codex-close"),

    missionsPanel: document.getElementById("missions-panel"),
    missionsPanelBody: document.getElementById("missions-panel-body"),
    missionsClose: document.getElementById("missions-close"),

    settingsPanel: document.getElementById("settings-panel"),
    settingsClose: document.getElementById("settings-close"),
    volMaster: document.getElementById("vol-master"),
    volMusic: document.getElementById("vol-music"),
    volSfx: document.getElementById("vol-sfx"),
    muteToggle: document.getElementById("mute-toggle"),
    saveButton: document.getElementById("save-button"),
    loadButton: document.getElementById("load-button"),
    settingsStatus: document.getElementById("settings-status"),

    pauseOverlay: document.getElementById("pause-overlay"),
    debugOverlay: document.getElementById("debug-overlay")
  };

  els.codexToggle.addEventListener("click", toggleCodexPanel);
  els.codexClose.addEventListener("click", () => setPanelVisible("codex", false));

  els.missionsToggle.addEventListener("click", toggleMissionsPanel);
  els.missionsClose.addEventListener("click", () => setPanelVisible("missions", false));

  els.settingsToggle.addEventListener("click", toggleSettingsPanel);
  els.settingsClose.addEventListener("click", () => setPanelVisible("settings", false));

  initSettingsControls();

  // Clique na caixa de diálogo (fora de um botão de escolha) avança nós que
  // não têm escolha — comportamento padrão de "avançar por clique" em jogos
  // narrativos, além da tecla Espaço (ver handleContinueKey).
  els.dialogueBox.addEventListener("click", (e) => {
    if (e.target.closest(".dialogue-choice-btn")) return;
    const node = getCurrentNode();
    if (node && getVisibleChoices(node).length === 0) {
      advanceDialogue();
      renderDialogue();
    }
  });
}

// ----------------------------------------------------------------------------
// HUD
// ----------------------------------------------------------------------------

export function updateHud() {
  const loc = getCurrentLocation();
  els.hudLocation.textContent = loc ? loc.name : "—";
}

export function setInteractPromptVisible(visible) {
  els.interactPrompt.classList.toggle("hidden", !visible);
}

// ----------------------------------------------------------------------------
// Diálogo
// ----------------------------------------------------------------------------

export function renderDialogue() {
  const active = isDialogueActive();
  els.dialogueBox.classList.toggle("hidden", !active);
  if (!active) return;

  const node = getCurrentNode();
  if (!node) return;

  els.dialogueSpeaker.textContent = speakerLabel(node.speaker);
  els.dialogueText.textContent = node.text;
  els.dialogueChoices.innerHTML = "";

  const visibleChoices = getVisibleChoices(node);
  els.dialogueContinue.classList.toggle("hidden", visibleChoices.length > 0);

  for (const choice of visibleChoices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dialogue-choice-btn";
    btn.textContent = choice.text;
    btn.addEventListener("click", () => {
      advanceDialogue(choice.id);
      renderDialogue();
    });
    els.dialogueChoices.appendChild(btn);
  }
}

function speakerLabel(speakerId) {
  return SPEAKER_LABEL[speakerId] || speakerId;
}

/** Chamado pelo listener global de keydown em Game.js. */
export function handleContinueKey(code) {
  if (code !== "Space") return;
  if (!isDialogueActive()) return;
  const node = getCurrentNode();
  if (node && getVisibleChoices(node).length === 0) {
    advanceDialogue();
    renderDialogue();
  }
}

// ----------------------------------------------------------------------------
// Painéis laterais (Códice / Missões / Configurações) — mutuamente exclusivos
// ----------------------------------------------------------------------------

const panelVisibility = { codex: false, missions: false, settings: false };
const PANEL_ELEMENT_KEY = { codex: "codexPanel", missions: "missionsPanel", settings: "settingsPanel" };

function setPanelVisible(panelName, visible) {
  if (visible) {
    // Fecha os outros painéis antes de abrir este — evita sobreposição.
    for (const other of Object.keys(panelVisibility)) {
      if (other !== panelName) setPanelVisible(other, false);
    }
  }
  panelVisibility[panelName] = visible;
  els[PANEL_ELEMENT_KEY[panelName]].classList.toggle("hidden", !visible);

  if (visible && panelName === "codex") renderCodexPanel();
  if (visible && panelName === "missions") renderMissionsPanel();
  if (visible && panelName === "settings") renderSettingsPanel();
}

export function toggleCodexPanel() {
  setPanelVisible("codex", !panelVisibility.codex);
}
export function toggleMissionsPanel() {
  setPanelVisible("missions", !panelVisibility.missions);
}
export function toggleSettingsPanel() {
  setPanelVisible("settings", !panelVisibility.settings);
}

// ----------------------------------------------------------------------------
// Painel do Códice
// ----------------------------------------------------------------------------

function renderCodexPanel() {
  const entries = listCodexEntries().filter((e) => e.status !== ENTRY_STATUS.DESCONHECIDO);
  els.codexPanelBody.innerHTML = "";

  if (entries.length === 0) {
    els.codexPanelBody.appendChild(emptyMessage("Nada foi descoberto ainda. Explore e converse para preencher o Códice."));
    return;
  }

  const byCategory = groupBy(entries, (e) => e.category || "outros");

  for (const [category, categoryEntries] of byCategory) {
    els.codexPanelBody.appendChild(categoryLabel(CATEGORY_LABEL[category] || category));
    for (const entry of categoryEntries) {
      const card = document.createElement("div");
      card.className = "panel-entry";

      const statusTag = document.createElement("span");
      statusTag.className = `status-tag status-tag--${entry.status.toLowerCase()}`;
      statusTag.textContent = CODEX_STATUS_LABEL[entry.status] || entry.status;

      const title = document.createElement("h3");
      title.textContent = entry.title;

      const summary = document.createElement("p");
      summary.textContent = entry.summary || "";

      card.append(statusTag, title, summary);
      els.codexPanelBody.appendChild(card);
    }
  }
}

// ----------------------------------------------------------------------------
// Painel de Missões
// ----------------------------------------------------------------------------

const MISSION_SECTION_ORDER = ["ACTIVE", "COMPLETED", "FAILED"];

function renderMissionsPanel() {
  const all = listAllMissionSummaries();
  els.missionsPanelBody.innerHTML = "";

  // Só mostramos ACTIVE/COMPLETED/FAILED ao jogador — LOCKED/HIDDEN/AVAILABLE
  // não descobertas ainda seriam spoiler do que está por vir (Codex
  // Especificação, princípio geral de não expor o que o jogador não sabe).
  const visible = all.filter((m) => MISSION_SECTION_ORDER.includes(m.status));

  if (visible.length === 0) {
    els.missionsPanelBody.appendChild(emptyMessage("Nenhuma missão registrada ainda."));
    return;
  }

  for (const status of MISSION_SECTION_ORDER) {
    const inSection = visible.filter((m) => m.status === status);
    if (inSection.length === 0) continue;

    els.missionsPanelBody.appendChild(categoryLabel(MISSION_STATUS_LABEL[status]));

    for (const mission of inSection) {
      const def = mission.definition;
      const card = document.createElement("div");
      card.className = "panel-entry";

      const statusTag = document.createElement("span");
      statusTag.className = `status-tag status-tag--mission-${status.toLowerCase()}`;
      statusTag.textContent = MISSION_STATUS_LABEL[status];

      const title = document.createElement("h3");
      title.textContent = def.title || "(sem título — conteúdo ainda não definido no canon)";

      const objective = document.createElement("p");
      objective.textContent = def.objective || def.context || "";

      card.append(statusTag, title, objective);
      els.missionsPanelBody.appendChild(card);
    }
  }
}

// ----------------------------------------------------------------------------
// Painel de Configurações (áudio + salvar/carregar)
// ----------------------------------------------------------------------------

function initSettingsControls() {
  els.volMaster.addEventListener("input", (e) => {
    setVolume("master", Number(e.target.value));
    saveSettings();
  });
  els.volMusic.addEventListener("input", (e) => {
    setVolume("music", Number(e.target.value));
    saveSettings();
  });
  els.volSfx.addEventListener("input", (e) => {
    setVolume("sfx", Number(e.target.value));
    saveSettings();
  });
  els.muteToggle.addEventListener("change", (e) => {
    setMuted(e.target.checked);
    saveSettings();
  });

  els.saveButton.addEventListener("click", () => {
    const ok = saveGame();
    showSettingsStatus(ok ? "Progresso salvo." : "Falha ao salvar — veja o console.");
  });

  els.loadButton.addEventListener("click", () => {
    if (!hasSaveGame()) {
      showSettingsStatus("Nenhum save encontrado.");
      return;
    }
    const result = loadGame();
    // A reposição de localização/posição do jogador é feita por Game.js, que
    // escuta EVENTS.LOAD_COMPLETED (emitido dentro de loadGame()). UI.js não
    // conhece Player.js/World.js diretamente — ver nota de arquitetura no
    // topo deste arquivo.
    showSettingsStatus(result ? "Progresso carregado." : "Falha ao carregar — veja o console.");
    renderMissionsPanel();
  });
}

function renderSettingsPanel() {
  const snapshot = getSettingsSnapshot();
  els.volMaster.value = String(snapshot.masterVolume);
  els.volMusic.value = String(snapshot.musicVolume);
  els.volSfx.value = String(snapshot.sfxVolume);
  els.muteToggle.checked = isMuted();
  els.loadButton.disabled = !hasSaveGame();
  showSettingsStatus("");
}

function showSettingsStatus(message) {
  els.settingsStatus.textContent = message;
}

// ----------------------------------------------------------------------------
// Pausa e Debug
// ----------------------------------------------------------------------------

export function setPauseVisible(visible) {
  els.pauseOverlay.classList.toggle("hidden", !visible);
}

export function setDebugVisible(visible) {
  els.debugOverlay.classList.toggle("hidden", !visible);
}

export function updateDebugOverlay({ fps, avgFrameMs }) {
  els.debugOverlay.textContent = `${fps} fps · ${avgFrameMs.toFixed(2)} ms/frame`;
}

// ----------------------------------------------------------------------------
// Utilidades de DOM
// ----------------------------------------------------------------------------

function emptyMessage(text) {
  const p = document.createElement("p");
  p.className = "panel-empty";
  p.textContent = text;
  return p;
}

function categoryLabel(text) {
  const div = document.createElement("div");
  div.className = "panel-category-label";
  div.textContent = text;
  return div;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

