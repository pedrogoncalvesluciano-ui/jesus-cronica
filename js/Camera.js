// Camera.js
// Conversão entre world space e screen space e acompanhamento do jogador.

import { clamp } from "./Physics.js";

export function createCamera() {
  return { x: 0, y: 0, viewportWidth: 1, viewportHeight: 1 };
}

function axisCamera(targetCenter, viewportSize, worldSize) {
  if (worldSize <= viewportSize) return -(viewportSize - worldSize) / 2;
  return clamp(targetCenter - viewportSize / 2, 0, worldSize - viewportSize);
}

export function updateCamera(camera, target, worldBounds) {
  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;
  camera.x = axisCamera(centerX, camera.viewportWidth, worldBounds.width);
  camera.y = axisCamera(centerY, camera.viewportHeight, worldBounds.height);
  return camera;
}

export function worldToScreen(camera, x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

export function screenToWorld(camera, x, y) {
  return { x: x + camera.x, y: y + camera.y };
}
