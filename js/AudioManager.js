// AudioManager.js
// Estado de volume/mute real; playback degrada de forma segura quando não há Audio.

const settings = {
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 1,
  muted: false
};

const manifest = new Map();
let currentMusicId = null;
let currentMusicAudio = null;

function channelKey(channel) {
  if (channel === "master") return "masterVolume";
  if (channel === "music") return "musicVolume";
  if (channel === "sfx") return "sfxVolume";
  return null;
}

export function setVolume(channel, value) {
  const key = channelKey(channel);
  if (!key) return false;
  settings[key] = Math.max(0, Math.min(1, Number(value)));
  if (currentMusicAudio) currentMusicAudio.volume = getEffectiveVolume("music");
  return true;
}

export function getVolume(channel) {
  const key = channelKey(channel);
  return key ? settings[key] : null;
}

export function setMuted(value) {
  settings.muted = Boolean(value);
  if (currentMusicAudio) currentMusicAudio.volume = getEffectiveVolume("music");
}

export function isMuted() {
  return settings.muted;
}

export function getEffectiveVolume(channel) {
  if (settings.muted) return 0;
  const channelVolume = channel === "master" ? 1 : (getVolume(channel) ?? 1);
  return settings.masterVolume * channelVolume;
}

export function getSettingsSnapshot() {
  return { ...settings };
}

export function applySettingsSnapshot(snapshot = {}) {
  if ("masterVolume" in snapshot) setVolume("master", snapshot.masterVolume);
  if ("musicVolume" in snapshot) setVolume("music", snapshot.musicVolume);
  if ("sfxVolume" in snapshot) setVolume("sfx", snapshot.sfxVolume);
  if ("muted" in snapshot) setMuted(snapshot.muted);
}

export function registerAudio(id, src, type = "sfx") {
  manifest.set(id, { id, src, type });
  return true;
}

function makeAudio(entry) {
  if (typeof Audio === "undefined") return null;
  const audio = new Audio(entry.src);
  audio.preload = "auto";
  return audio;
}

export function playSfx(id) {
  const entry = manifest.get(id);
  if (!entry || entry.type !== "sfx") return false;
  const audio = makeAudio(entry);
  if (audio) {
    audio.volume = getEffectiveVolume("sfx");
    audio.play().catch(() => {});
  }
  return true;
}

export function playMusic(id) {
  const entry = manifest.get(id);
  if (!entry || entry.type !== "music") return false;
  stopMusic();
  currentMusicId = id;
  const audio = makeAudio(entry);
  if (audio) {
    audio.loop = true;
    audio.volume = getEffectiveVolume("music");
    audio.play().catch(() => {});
    currentMusicAudio = audio;
  }
  return true;
}

export function getCurrentMusicId() {
  return currentMusicId;
}

export function stopMusic() {
  if (currentMusicAudio) {
    currentMusicAudio.pause();
    currentMusicAudio.currentTime = 0;
  }
  currentMusicAudio = null;
  currentMusicId = null;
}
