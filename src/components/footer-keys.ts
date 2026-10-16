/*
 * Teclas do rodapé: quais são, de que tamanho e onde ficam quando estão
 * "arrumadas". Unidade = 1u (a largura de uma tecla comum); o tamanho em px
 * sai da largura útil do deck (`keyUnit`).
 */

export type KeyTone = "graphite" | "red"

export type KeySpec = {
  id: string
  /** Largura em u na versão completa. */
  w: number
  /** Largura em u na versão compacta (celular), se for diferente. */
  wCompact?: number
  /** Legenda (as letras saem em caixa alta). */
  legend?: string
  /** Tamanho da legenda, em fração de u (padrão 0.42). */
  size?: number
  /** Grafite (JED, símbolos) ou vermelha (TEC), como o logo JEDTEC. */
  tone: KeyTone
  /** Legenda vermelha numa tecla grafite (o ↵). */
  accent?: boolean
  /** Saliência de "home row" (a do J de um teclado de verdade). */
  homing?: boolean
  /** Teclas do teclado físico (`KeyboardEvent.key`, minúsculo) que fazem esta pular. */
  keys: string[]
  /** Só na versão completa (≥ 640px de largura). */
  fullOnly?: boolean
  /** Barra de espaço com a marca gravada (como as de teclado custom). */
  brand?: boolean
}

export const KEYS: KeySpec[] = [
  { id: "j", w: 1, legend: "J", tone: "graphite", homing: true, keys: ["j"] },
  { id: "e1", w: 1, legend: "E", tone: "graphite", keys: ["e"] },
  { id: "d", w: 1, legend: "D", tone: "graphite", keys: ["d"] },
  { id: "t", w: 1, legend: "T", tone: "red", keys: ["t"] },
  { id: "e2", w: 1, legend: "E", tone: "red", keys: ["e"] },
  { id: "c", w: 1, legend: "C", tone: "red", keys: ["c"] },
  { id: "enter", w: 2, wCompact: 1.5, legend: "↵", tone: "graphite", accent: true, keys: ["enter"] },
  { id: "slash", w: 1, legend: "/", tone: "graphite", keys: ["/"] },
  { id: "braces", w: 1, legend: "{ }", size: 0.34, tone: "graphite", keys: ["{", "}", "[", "]"], fullOnly: true },
  { id: "semi", w: 1, legend: ";", tone: "graphite", keys: [";"], fullOnly: true },
  { id: "tag", w: 1, legend: "</>", size: 0.3, tone: "graphite", keys: ["<", ">"], fullOnly: true },
  { id: "space", w: 4, tone: "graphite", brand: true, keys: [" "], fullOnly: true },
]

/** Abaixo disso (largura útil do deck, em px) o rodapé usa o jogo compacto. */
export const COMPACT_BELOW = 640

/** Fileiras quando arrumadas, de baixo para cima. */
const ROWS = {
  full: [
    ["tag", "braces", "slash", "space", "semi", "enter"],
    ["j", "e1", "d", "t", "e2", "c"],
  ],
  compact: [
    ["j", "e1", "d", "t", "e2", "c"],
    ["slash", "enter"],
  ],
} as const

/** Folga entre teclas vizinhas, em u. */
const GAP = 0.08

export type KeySet = keyof typeof ROWS

export const keySet = (width: number): KeySet =>
  width < COMPACT_BELOW ? "compact" : "full"

export const keyWidth = (spec: KeySpec, set: KeySet) =>
  set === "compact" ? (spec.wCompact ?? spec.w) : spec.w

export const keysIn = (set: KeySet) =>
  KEYS.filter((k) => set === "full" || !k.fullOnly)

/**
 * Tamanho de 1u em px, a partir da largura útil do deck (entre as paredes):
 * as fileiras arrumadas (a de baixo, 10.4u na completa e 6.4u na compacta)
 * ocupam ~90% dela, com uma margem de placa dos dois lados. Até 112px.
 */
export function keyUnit(width: number, set: KeySet) {
  if (set === "compact") return Math.floor(Math.min(64, width / 6.9))
  return Math.floor(Math.max(56, Math.min(112, width / 11.5)))
}

export type Spot = { x: number; y: number }

/**
 * Centro de cada tecla arrumada, em px, com x a partir da esquerda do palco
 * e y a partir do topo. As fileiras ficam centradas e apoiadas no chão.
 */
export function arrangedSpots(
  set: KeySet,
  width: number,
  floor: number,
  u: number,
): Map<string, Spot> {
  const spots = new Map<string, Spot>()
  const byId = new Map(KEYS.map((k) => [k.id, k]))
  const gap = GAP * u
  ROWS[set].forEach((row, r) => {
    const widths = row.map((id) => keyWidth(byId.get(id)!, set) * u)
    const total = widths.reduce((a, b) => a + b, 0) + gap * (row.length - 1)
    let left = (width - total) / 2
    // Meio px de folga vertical: a fileira assenta sem nascer sobreposta
    const y = floor - u / 2 - r * (u + 0.5) - 0.5
    row.forEach((id, i) => {
      spots.set(id, { x: left + widths[i] / 2, y })
      left += widths[i] + gap
    })
  })
  return spots
}

/** Ordem em que as teclas caem (embaralhada à mão: J E D T E C chegam espalhadas). */
export const DROP_ORDER = [
  "space", "t", "slash", "j", "enter", "e2", "braces", "d", "semi", "c", "tag", "e1",
]
