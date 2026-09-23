# PROJETO.md — Jesus Chronicles: Protótipo do Motor

Este documento existe para que o contexto do projeto não se perca conforme
ele cresce. Trate-o como vivo: atualize-o sempre que uma decisão de
arquitetura, limitação conhecida ou pendência mudar.

---

## 0. Histórico de correções pós-entrega

- **[Robustez] `Engine.js`: game loop agora blinda `onUpdate`/`onRender` com
  try/catch.** Antes, qualquer exceção não tratada dentro do loop principal
  (por qualquer motivo, presente ou futuro) travava o jogo por completo e em
  silêncio — sem nada visível além de uma linha no console. Motivado por ter
  encontrado exatamente esse padrão de falha uma vez (bug do localStorage
  abaixo) e querer que qualquer *outra* ocorrência do mesmo padrão seja
  visível e diagnosticável, em vez de travar sem explicação. Agora o erro é
  logado claramente a cada frame afetado; se o mesmo erro insistir por 10
  frames seguidos, o loop para de propósito com uma mensagem explicando por
  quê, em vez de spammar o console indefinidamente ou travar sem aviso.

- **[Bug crítico corrigido] `window.localStorage` acessado fora de
  try/catch em 4 pontos** (`Settings.loadSettings`,
  `SaveSystem.hasSaveGame`/`loadGame`/`deleteSave`). Em navegadores/abas onde
  o acesso a `localStorage` é bloqueado (ex.: aba anônima com certas
  configurações de cookies/privacidade), a simples LEITURA da propriedade
  lança uma exceção — não é preciso chamar nenhum método para isso
  acontecer. Como `loadSettings()` roda logo no início do boot de
  `Game.js`, essa exceção não tratada travava a inicialização inteira antes
  do canvas ser desenhado ou dos controles serem ligados: tela preta, HUD
  parado no placeholder, teclado/mouse sem efeito. Reportado pelo usuário
  via screenshot do jogo publicado no GitHub Pages em aba anônima do
  Chrome. Corrigido envolvendo todo acesso a `localStorage` (leitura,
  escrita e remoção) em try/catch — o jogo agora funciona normalmente sem
  persistência quando o storage está bloqueado, em vez de travar. Teste de
  regressão específico adicionado em `tests/test-harness.mjs`
  ("Regressão: localStorage inacessível não pode travar o boot").

- **[Investigado, não resolvido] Diálogo de objeto interagível (Console do
  CRONÓFAGO) relatado como travado em "Pressione Espaço para continuar".**
  Simulei a interação exata (`startDialogue` → `getCurrentNode` →
  `getVisibleChoices` → `advanceDialogue`) com os dados reais de
  `locations-seed.js`/`codex-seed.js` e o motor de diálogo fecha
  corretamente — não achei bug de lógica em `Dialogue.js`, `Codex.js`,
  `UI.js` ou `Input.js` lendo o código e simulando a sequência. A blindagem
  do Engine.js acima foi adicionada em parte por causa deste caso (mesmo
  sem confirmar que é a causa), para que, se for um erro não tratado em
  algum ponto do loop, ele apareça no console em vez de travar em silêncio.
  Pendente: reproduzir com o console do navegador aberto para achar a causa
  real, se ainda ocorrer.

---

## 1. Status atual

Protótipo jogável do **Prólogo**, com o núcleo de engine completo e
funcional: exploração livre em duas localizações conectadas, diálogo
condicional, escolhas com consequências reais, missões, códice, relações,
canon de produção com validação e sistema de retcon, save/load, e
configurações de áudio (sem assets de som ainda).

Isto **não** é o jogo completo — é a fundação técnica sobre a qual o
Ato I em diante será construído, mais os sistemas de magia, tecnologia,
combate, infiltração e diplomacia descritos na Especificação Mestra, que
ainda não têm código (ver seção 6).

---

## 2. Mapa de arquitetura (o que cada arquivo faz)

```
index.html                  Estrutura DOM: HUD, viewport, diálogo, 3 painéis, pausa, debug
style.css                   Design tokens + todos os estilos (ver seção "PAINÉIS LATERAIS" para o padrão compartilhado)

js/
├── EventBus.js              Pub/sub central — todo evento do jogo passa por aqui (EVENTS)
├── GameState.js             gameState (fonte única de verdade) + mergeEffects() + save/load helpers
├── Canon.js                 Registro de canon de PRODUÇÃO: canValidate(), retcon (createRetconRecord/approveRetcon)
├── Codex.js                 Camada de conhecimento do JOGADOR — distinta do Canon.js (ver seção 3)
├── Conditions.js            Avaliador de condições compartilhado (FLAG/STAT/RELATIONSHIP/MISSION/CODEX)
├── Choices.js                Aplica effects de uma escolha ao gameState via mergeEffects()
├── Dialogue.js               Motor de diálogo orientado a nós, com condições e fallback
├── Missions.js                Ciclo de vida de missões (ver nota de contradição de canon, seção 4)
├── Relationships.js            Camada de LEITURA sobre protagonist.relationships (escrita fica em GameState)
├── World.js                     Localizações, obstáculos, interagíveis, saídas entre localizações
├── Entities.js                    createNpc / createInteractableObject (Jesus NUNCA passa por aqui)
├── Physics.js                     AABB: aabbIntersect + resolveMovement (colisão eixo a eixo)
├── Camera.js                      World space <-> screen space, segue o jogador, trava nos limites
├── Player.js                       Movimento (velocidade × deltaTime) + busca de interagível próximo
├── Input.js                        Teclado: movimento contínuo + teclas de ação (pressionar-uma-vez)
├── Renderer.js                     Desenha Canvas a partir do estado — nenhuma lógica de jogo aqui
├── Engine.js                       Game loop (requestAnimationFrame, delta time, DPR, FPS)
├── SceneTransition.js               Fade entre localizações, dirigido por delta time
├── AudioManager.js                   Volume/mute (real) + playback (no-op honesto — sem assets)
├── Settings.js                        Persistência de configurações (localStorage, chave separada do save)
├── SaveSystem.js                       Persistência de progresso narrativo (localStorage)
├── UI.js                               Toda a apresentação DOM: HUD, diálogo, 3 painéis, pausa, debug
├── Game.js                              Bootstrap: conecta tudo, define o que carrega nesta versão
└── data/
    ├── canon-seed.js                    Entradas de canon extraídas literalmente dos documentos-fonte
    ├── codex-seed.js                     Definições de entrada do códice (começam DESCONHECIDO)
    ├── dialogues.js                       Diálogo do Prólogo (nós 1-3 CONFIRMADO, nó 4 PROVISÓRIO)
    ├── locations-seed.js                  zona_resgate + base_organizacao (nomes de trabalho)
    └── missions-seed.js                   missao_prologo_proposta + stub bloqueado do Ato I

tests/
└── test-harness.mjs                       136 testes de lógica (rode: cd tests && node test-harness.mjs)
```

---

## 3. Decisões de arquitetura tomadas (não são canon narrativo)

Estas decisões preencheram lacunas que os documentos de design deixaram em
aberto propositalmente para a implementação resolver. Todas estão comentadas
no código-fonte também; aqui é só o resumo consolidado.

| Decisão | Onde | Por quê |
|---|---|---|
| As 10 variáveis narrativas (seção 9 da Especificação Mestra) vivem em `protagonist.stats` | `GameState.js` | O schema da seção 3.1 não dizia onde elas ficam; são estatísticas do protagonista, não do mundo |
| `effects` ganhou uma chave `stats` além das 5 documentadas | `GameState.mergeEffects` | Sem isso, as variáveis narrativas acima não teriam como ser alteradas por uma escolha |
| Configurações de áudio ficam em uma chave de `localStorage` separada do save narrativo | `Settings.js` | Padrão consolidado em jogos: apagar o save não deveria resetar o volume. Sinalizado para revisão caso a intenção fosse outra |
| Interagíveis (NPCs + objetos) vivem numa lista única `interactables`, diferenciados por `kind` | `World.js` / `Entities.js` | Evita duas listas paralelas para "coisas com que se interage" |
| Posição do jogador e localização atual foram adicionadas ao `gameState` (`protagonist.position`, `world.currentLocationId`) | `GameState.js`, `World.js`, `Game.js` | **Gap real encontrado**: essas duas informações existiam só como variáveis locais em memória (fora do gameState), então `SaveSystem.saveGame()` nunca as capturava — carregar um save sempre reapareceria no spawn inicial do Prólogo. Corrigido adicionando os campos e sincronizando-os no único lugar onde cada um muda |

---

## 4. Uma contradição real encontrada no canon (ainda não resolvida narrativamente)

A **Especificação Mestra, seção 11** define 6 status possíveis de missão
(`LOCKED, AVAILABLE, ACTIVE, COMPLETED, FAILED, HIDDEN`), mas a **seção 3.1**
só reserva 4 arrays em `gameState.missions` (`active, completed, failed,
hidden`) — não existe array para `LOCKED` nem `AVAILABLE`.

**Resolução de implementação** (`Missions.js`, `getMissionStatus()`): uma
missão que não está em nenhuma das 4 listas é considerada `LOCKED` ou
`AVAILABLE` calculado sob demanda, a partir de suas `conditions`. Isso
respeita o schema exatamente como documentado e ainda entrega os 6 status.
Se a intenção original era outra (por exemplo, um 5º/6º array), é só avisar.

---

## 5. Limitações conhecidas (honestas, não escondidas)

- **Sem assets de arte**: todas as entidades são retângulos/losangos coloridos
  com rótulo de texto (`Renderer.js`). Nenhuma imagem foi fornecida e este
  ambiente de desenvolvimento não acessa a internet para gerar/baixar sprites.
- **Sem assets de áudio**: `AudioManager.js` gerencia volume/mute de verdade,
  mas `playSfx`/`playMusic` são no-op (nenhum arquivo `.mp3`/`.ogg` existe
  ainda). Registrar um som real não vai exigir nenhuma mudança estrutural.
- **Física sem CCD**: `Physics.resolveMovement` resolve colisão eixo a eixo,
  mas não é Continuous Collision Detection — em velocidades muito altas
  (maiores que um obstáculo por frame) uma entidade poderia atravessá-lo.
  Não ocorre nas velocidades atuais do protótipo, mas fica registrado.
- **Migração de save não implementada**: `SaveSystem.js` tem o contrato
  (`migrateSave`) para quando o `SAVE_VERSION` mudar, mas nenhuma regra de
  transformação foi escrita, porque ainda não existe uma versão 2 do schema
  para migrar a partir da versão 1.
- **Só o Prólogo tem conteúdo real**: `missao_ato1_indefinida` existe como
  stub bloqueado de propósito (`title`/`objective` = `null`) — o Ato I não
  foi definido nos documentos recebidos, e preencher agora seria inventar
  enredo.
- **Só teclado, sem touch**: `Input.js` só escuta teclado. Controles de toque
  para mobile ainda não existem.
- **`n4_provisional` (segundo NPC de diálogo) é rascunho**: as duas opções de
  escolha no fim do gancho do Prólogo foram escritas para demonstrar o
  sistema de escolhas/consequências funcionando de ponta a ponta — não estão
  nos documentos-fonte e precisam de aprovação antes de virarem canon
  confirmado.
- **Nomes de localização são nomes de trabalho**: "Zona de Resgate" e "Base
  da Organização" são placeholders (`canonStatus: PROVISORIO`) — a geografia
  exata do futuro devastado é Canon Aberto na Bíblia do Universo.

---

## 6. Sistemas descritos na Especificação Mestra que ainda NÃO têm código

Existem no documento de design, mas nada foi implementado ainda:

- `magicSystem` (seção 15) — nenhuma habilidade, custo ou limite definidos
- `technologySystem` (seção 16) — além do CRONÓFAGO citado no canon
- Combate (seção 17)
- Infiltração (seção 18)
- Diplomacia formal entre facções (seção 19) — `world.factions`/`politicalState` existem no schema, mas sem lógica própria ainda
- `timeSystem` / viagem temporal (seção 14) — a regra "nenhuma viagem é grátis" já está registrada no Canon, mas não há mecânica jogável
- Sistema de Finais (seção 23) — `gameState.endings` existe no schema, sem lógica de avaliação de condições ainda
- Um módulo narrativo dedicado para a presença de Jesus (ver regra em `Entities.js` e `Canon.js`: Ele nunca deve ser instanciado como Entity comum)

---

## 7. Como rodar

Não precisa de build nem de `npm install` — é HTML/CSS/JS puro com módulos ES.

1. Sirva a pasta com qualquer servidor estático (abrir `index.html`
   diretamente como `file://` **não funciona** para módulos ES por restrição
   do navegador). Exemplos:
   - `npx serve .`
   - `python3 -m http.server 8000`
2. Abra `http://localhost:PORTA/` no navegador.
3. WASD/Setas move, `E` interage, `C` abre o Códice, `Esc` pausa, `` ` ``
   (crase) mostra FPS. Botões de Missões/Configurações ficam no HUD.

Para rodar os testes de lógica: `cd tests && node test-harness.mjs`
(precisa de Node 18+; usa `.mjs` para não exigir `package.json`).
