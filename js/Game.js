// Game.js
// Bootstrap do protótipo: conecta estado, mundo, input, UI, engine e renderização.

import { eventBus, EVENTS } from "./EventBus.js";
import { gameState } from "./GameState.js";
import { seedCanon } from "./data/canon-seed.js";
import { seedCodex } from "./data/codex-seed.js";
import { prologueDialogue } from "./data/dialogues.js";
import { seedMissions } from "./data/missions-seed.js";
import { seedLocations } from "./data/locations-seed.js";
import { defineDialogue, startDialogue, isDialogueActive } from "./Dialogue.js";
import { startMission, getMissionStatus } from "./Missions.js";
import { loadLocation, getCurrentLocation, getObstaclesInCurrentLocation, checkExitTrigger } from "./World.js";
import { createPlayer, updatePlayer, findInteractable, checkInteraction } from "./Player.js";
import { createCamera, updateCamera } from "./Camera.js";
import { initInput, consumeCodexTogglePress, consumePausePress, consumeDebugTogglePress } from "./Input.js";
import { createTransitionController, startTransition, updateTransition, isTransitioning } from "./SceneTransition.js";
import { createEngine } from "./Engine.js";
import {
  clearCanvas,
  renderLocationBackground,
  renderObstacles,
  renderExits,
  renderInteractables,
  renderPlayer,
  renderFadeOverlay,
  renderPauseDim
} from "./Renderer.js";
import {
  initUI,
  updateHud,
  setInteractPromptVisible,
  renderDialogue,
  handleContinueKey,
  toggleCodexPanel,
  setPauseVisible,
  setDebugVisible,
  updateDebugOverlay
} from "./UI.js";
import { loadSettings } from "./Settings.js";

const canvas = document.getElementById("game-canvas");
const camera = createCamera();
const transition = createTransitionController();
const player = createPlayer(520, 420);

let paused = false;
let debugVisible = false;
let fadeAlpha = 0;
let highlighted = null;
let lastExitId = null;

seedCanon();
seedCodex();
defineDialogue(prologueDialogue);
seedMissions();
seedLocations();
loadSettings();

initInput(window);
initUI();

if (getMissionStatus("missao_prologo_proposta") === "AVAILABLE") {
  startMission("missao_prologo_proposta");
}

loadLocation("zona_resgate", { spawn: { x: player.x, y: player.y } });
syncPlayerToState();
updateHud();

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    handleContinueKey(event.code);
  }
});

eventBus.on(EVENTS.LOCATION_CHANGED, ({ spawn }) => {
  if (spawn) {
    player.x = spawn.x;
    player.y = spawn.y;
  }
  syncPlayerToState();
  updateHud();
});

eventBus.on(EVENTS.LOAD_COMPLETED, () => {
  const savedLocation = gameState.world.currentLocationId;
  const savedPosition = gameState.protagonist.position;
  if (savedLocation) {
    loadLocation(savedLocation, {
      spawn: {
        x: Number.isFinite(savedPosition?.x) ? savedPosition.x : 80,
        y: Number.isFinite(savedPosition?.y) ? savedPosition.y : 80
      }
    });
  }
});

function syncPlayerToState() {
  gameState.protagonist.position = {
    x: player.x,
    y: player.y,
    locationId: gameState.world.currentLocationId
  };
}

function changeLocation(exit) {
  startTransition(transition, () => {
    loadLocation(exit.targetLocationId, { spawn: exit.targetSpawn });
    lastExitId = exit.id;
  });
}

function update(dt) {
  if (consumePausePress()) {
    paused = !paused;
    setPauseVisible(paused);
  }

  if (consumeDebugTogglePress()) {
    debugVisible = !debugVisible;
    setDebugVisible(debugVisible);
  }

  if (consumeCodexTogglePress()) toggleCodexPanel();

  updateTransition(transition, dt, (alpha) => {
    fadeAlpha = alpha;
  });

  if (paused || isDialogueActive() || isTransitioning(transition)) {
    highlighted = findInteractable(player);
    setInteractPromptVisible(Boolean(highlighted) && !isDialogueActive());
    return;
  }

  const location = getCurrentLocation();
  if (!location) return;

  updatePlayer(player, dt, getObstaclesInCurrentLocation());
  syncPlayerToState();

  const interaction = checkInteraction(player);
  highlighted = interaction.entity;
  setInteractPromptVisible(Boolean(highlighted));

  if (interaction.pressed && interaction.entity?.dialogueId) {
    startDialogue(interaction.entity.dialogueId);
    renderDialogue();
  }

  const exit = checkExitTrigger(player);
  if (exit && exit.id !== lastExitId) {
    changeLocation(exit);
  } else if (!exit) {
    lastExitId = null;
  }

  updateCamera(camera, player, location.bounds);
}

function render(ctx, engineState) {
  const location = getCurrentLocation();
  clearCanvas(ctx, camera);

  if (location) {
    renderLocationBackground(ctx, camera, location);
    renderObstacles(ctx, camera, location.obstacles || []);
    renderExits(ctx, camera, location.exits || []);
    renderInteractables(ctx, camera, location.interactables || [], highlighted?.id || null);
    renderPlayer(ctx, camera, player);
  }

  if (paused) renderPauseDim(ctx, camera);
  renderFadeOverlay(ctx, camera, fadeAlpha);

  if (debugVisible) {
    updateDebugOverlay({ fps: engineState.fps, avgFrameMs: engineState.avgFrameMs });
  }
}

const engine = createEngine({
  canvas,
  onUpdate: update,
  onRender: render,
  onResize: ({ width, height }) => {
    camera.viewportWidth = width;
    camera.viewportHeight = height;
    const location = getCurrentLocation();
    if (location) updateCamera(camera, player, location.bounds);
  }
});

engine.start();
