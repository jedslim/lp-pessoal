/*
 * Roteiro do cursor de vidro (cursor-companion-canvas.tsx): uma parada por
 * seção. Cada parada lê um alvo marcado no DOM com `data-companion="<id>"`
 * (getBoundingClientRect, ao vivo: alvos sticky funcionam sozinhos) e diz
 * onde a PONTA pousa e para onde ela mira, em px da janela (y para baixo).
 *
 * `s` é a altura do cursor na tela (px). Os desvios são em múltiplos de `s`
 * ou em frações do alvo, para valer em qualquer largura de desktop. A mira
 * gira no máximo ~70° a partir da pose de ponteiro (ponta em cima/esquerda):
 * mais que isso a seta deixa de ler como cursor, então as paradas põem o
 * corpo embaixo/à direita do que ele aponta.
 */

export type Pt = { x: number; y: number }

export type CompanionStop = {
  id: string
  /** Outro elemento (seletor global) que posiciona a ponta; o alvo segue
   *  sendo o que ela mira e o que decide a chegada. */
  spot?: string
  /** Ponta: onde ela pousa (retângulo `r` do spot ou do alvo, cursor `s`). */
  tip: (r: DOMRect, s: number, vw: number, vh: number) => Pt
  /** Para onde ela mira, a partir do alvo (null = pose natural de ponteiro). */
  aim: ((r: DOMRect, s: number) => Pt) | null
  /** Fundo sob o cursor (o que o vidro refrata): 0 escuro, 1 claro. */
  tone: 0 | 1
  /** Escala do cursor nesta parada. */
  scale?: number
  /** Sub-alvo dentro do alvo (a tecla acesa do teclado): vira o alvo. */
  sub?: string
  /** Toque automático: ao trocar o sub-alvo ou a cada `every` s. */
  tap?: { onSubChange?: boolean; every?: number }
}

export const COMPANION_STOPS: readonly CompanionStop[] = [
  {
    // Hero: logo depois de "Santos" (o retrato posiciona: tudo na hero
    // escala com ele), mirando o "Ver trabalhos" do outro lado
    id: "hero",
    spot: "[data-hero-portrait]",
    tip: (r) => ({ x: r.left + r.width * 1.075, y: r.top + r.height * 0.5 }),
    aim: (r) => ({ x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }),
    tone: 0,
    scale: 1.15,
  },
  {
    // Trabalho: pousado no vídeo do destaque, como o ponteiro de quem assiste
    id: "work",
    tip: (r) => ({ x: r.left + r.width * 0.66, y: r.top + r.height * 0.54 }),
    aim: null,
    tone: 0,
  },
  {
    // Capacidades: no canto de baixo à direita do palco, mirando o
    // playground ativo
    id: "capabilities",
    tip: (r) => ({ x: r.right - r.width * 0.18, y: r.bottom - r.height * 0.22 }),
    aim: (r) => ({ x: r.left + r.width * 0.5, y: r.top + r.height * 0.45 }),
    tone: 0,
  },
  {
    // Stack: pairando sobre o teclado; a ponta desce na tecla que a vitrine
    // acende e aperta quando ela troca
    id: "stack",
    sub: '[data-sel="true"]',
    tip: (r) => ({ x: r.left + r.width * 0.56, y: r.top + r.height * 0.5 }),
    aim: null,
    tone: 0,
    tap: { onSubChange: true },
  },
  {
    // Processo: a ponta acompanha a cabeça de leitura do git log, do lado
    // de baixo/direita da linha
    id: "process",
    tip: (r, s) => ({ x: r.left + r.width / 2 + s * 0.08, y: r.top + r.height / 2 + s * 0.08 }),
    aim: (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 }),
    tone: 0,
    scale: 0.9,
  },
  {
    // Sobre: logo abaixo do card de código, no fundo claro, apontando para ele
    id: "about",
    tip: (r, s) => ({ x: r.left + r.width * 0.74, y: r.bottom + s * 0.06 }),
    aim: null,
    tone: 1,
  },
  {
    // Contato: sobre a tecla deploy (topo dela), com um toque de vez em quando
    // (só visual: nada é clicado)
    id: "contact",
    tip: (r) => ({ x: r.left + r.width * 0.6, y: r.top + r.height * 0.17 }),
    aim: null,
    tone: 0,
    scale: 1.08,
    tap: { every: 4.2 },
  },
]
