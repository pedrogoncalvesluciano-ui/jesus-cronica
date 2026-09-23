// Settings.js
// -----------------------------------------------------------------------
// Persistência de CONFIGURAÇÕES (volume, mute), separada da persistência
// de PROGRESSO NARRATIVO (SaveSystem.js).
//
// DECISÃO DE ARQUITETURA: a Especificação Mestra, seção 28, lista
// "OPTIONS/SETTINGS" entre os dados que o jogo deve salvar, no mesmo
// parágrafo que progresso/escolhas/relações. Interpretamos isso como
// "configurações também devem persistir entre sessões" — não
// necessariamente como "precisam estar dentro do mesmo blob que o save de
// progresso". Optamos por uma chave de localStorage separada porque é o
// padrão consolidado em jogos (mudar de save, começar Novo Jogo, ou até
// apagar o save não deveria resetar o volume que a pessoa configurou).
// Se isso não for o que vocês tinham em mente, é uma mudança de uma
// linha (mover para dentro de gameState) — sinalizando aqui para revisão.
// -----------------------------------------------------------------------

import { getSettingsSnapshot, applySettingsSnapshot } from "./AudioManager.js";

const STORAGE_KEY = "jesusChronicles.settings";

export function saveSettings() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getSettingsSnapshot()));
    return true;
  } catch (err) {
    console.error("[Settings] Falha ao salvar configurações:", err);
    return false;
  }
}

export function loadSettings() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    // Alguns navegadores/configurações (abas anônimas com cookies bloqueados,
    // políticas de privacidade estritas, certas extensões) lançam erro só de
    // ACESSAR localStorage — nem precisa de um método específico falhar.
    // Sem este try/catch, isso travava toda a inicialização do Game.js, já
    // que loadSettings() é chamada antes do canvas/engine serem criados.
    console.error("[Settings] localStorage indisponível neste navegador/aba — configurações não serão persistidas:", err);
    return false;
  }

  if (!raw) return false;

  try {
    applySettingsSnapshot(JSON.parse(raw));
    return true;
  } catch (err) {
    console.error("[Settings] Configurações corrompidas, ignorando:", err);
    return false;
  }
}

