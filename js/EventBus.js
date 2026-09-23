// EventBus.js
// Pub/sub central: os módulos comunicam mudanças sem dependências diretas.

export const EVENTS = Object.freeze({
  CHOICE_MADE: "CHOICE_MADE",
  WORLD_STATE_CHANGED: "WORLD_STATE_CHANGED",
  LOCATION_CHANGED: "LOCATION_CHANGED",
  MISSION_AVAILABLE: "MISSION_AVAILABLE",
  MISSION_STARTED: "MISSION_STARTED",
  MISSION_COMPLETED: "MISSION_COMPLETED",
  MISSION_FAILED: "MISSION_FAILED",
  SAVE_COMPLETED: "SAVE_COMPLETED",
  LOAD_COMPLETED: "LOAD_COMPLETED",
  CODEX_UPDATED: "CODEX_UPDATED",
  DIALOGUE_STARTED: "DIALOGUE_STARTED",
  DIALOGUE_ENDED: "DIALOGUE_ENDED"
});

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    this.listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(eventName);
  }

  once(eventName, handler) {
    const off = this.on(eventName, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  emit(eventName, payload) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Erro em listener de "${eventName}":`, err);
      }
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
