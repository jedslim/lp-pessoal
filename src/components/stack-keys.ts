import { stack, type StackCategory, type StackElement } from "@/lib/stack"

/*
 * Layout do teclado do Stack. Cada fileira é uma família do stack e começa
 * por um modificador cada vez mais largo, como Tab, Caps e Shift num teclado
 * de verdade; o fim da fileira fecha a largura com teclas de função que
 * fazem alguma coisa aqui (apagar, próxima, trocar de fileira).
 *
 * Teclado completo (lg+): 10,5 u de largura, numa grade de 42 colunas
 * (quartos de u). Fileira 1 = Esc + visor + volume; fileira 2 = respiro.
 * Grade compacta (celular e tablet): só as famílias. Cada família soma 8
 * células (o modificador ocupa 8 − n), então fecha 2 linhas de 4 no celular
 * e 1 linha de 8 no tablet, sem sobra.
 */

export type FnId = "esc" | "back" | "enter" | "shift" | "space" | "artisan"

type Base = {
  id: string
  /** Largura em u no teclado completo. */
  w: number
  /** Coluna inicial (1–42) e linha na grade do teclado completo. */
  col: number
  row: number
  /** Centro em u, a partir da borda esquerda (varredura de luz da entrada). */
  x: number
  /** Linha visual (0 = visor), para a mesma varredura. */
  y: number
  /** Células na grade compacta (0 = some fora do teclado completo). */
  span: number
}

export type KeyDef = Base &
  (
    | { kind: "tool"; tool: StackElement; red: boolean }
    | { kind: "cat"; cat: StackCategory }
    | { kind: "fn"; fn: FnId }
  )

type Draft =
  | { kind: "tool"; tool: StackElement; w: number }
  | { kind: "cat"; cat: StackCategory; w: number }
  | { kind: "fn"; fn: FnId; w: number }

const family = (cat: StackCategory) => stack.filter((t) => t.category === cat)

const tools = (cat: StackCategory, w = 1): Draft[] =>
  family(cat).map((tool) => ({ kind: "tool", tool, w }))

const ia = tools("ia", 1.25)

/** Ordem das fileiras: 7, 6, 5 e 5 ferramentas, como o escalonamento real. */
const DRAFT: Draft[][] = [
  [{ kind: "cat", cat: "front", w: 1.5 }, ...tools("front"), { kind: "fn", fn: "back", w: 2 }],
  [
    { kind: "cat", cat: "integracoes", w: 1.75 },
    ...tools("integracoes"),
    { kind: "fn", fn: "enter", w: 2.75 },
  ],
  [
    { kind: "cat", cat: "cms", w: 2.25 },
    ...tools("cms"),
    { kind: "fn", fn: "shift", w: 2.25 },
    { kind: "fn", fn: "artisan", w: 1 },
  ],
  // Fileira de baixo: os modelos à esquerda do espaço, os editores à direita
  [
    { kind: "cat", cat: "ia", w: 1.25 },
    ...ia.slice(0, 3),
    { kind: "fn", fn: "space", w: 3 },
    ...ia.slice(3),
  ],
]

export const FULL_WIDTH_U = 10.5

const idOf = (d: Draft) =>
  d.kind === "tool" ? `t${d.tool.n}` : d.kind === "cat" ? `c-${d.cat}` : `f-${d.fn}`

/** Teclas das fileiras, na ordem de leitura (também a ordem do DOM). */
export const ROWS: KeyDef[][] = DRAFT.map((row, r) => {
  let u = 0
  return row.map((d) => {
    const col = Math.round(u * 4) + 1
    const x = u + d.w / 2
    u += d.w
    const n = d.kind === "cat" ? family(d.cat).length : 0
    const base: Base = {
      id: idOf(d),
      w: d.w,
      col,
      row: r + 3,
      x,
      y: r + 1,
      span: d.kind === "tool" ? 1 : d.kind === "cat" ? 8 - n : 0,
    }
    if (d.kind === "tool") return { ...base, kind: "tool", tool: d.tool, red: d.tool.category === "ia" }
    if (d.kind === "cat") return { ...base, kind: "cat", cat: d.cat }
    return { ...base, kind: "fn", fn: d.fn }
  })
})

export const KEYS: KeyDef[] = ROWS.flat()

/** A Esc mora na fileira do visor, à esquerda. */
export const ESC_KEY: KeyDef = {
  id: "f-esc",
  kind: "fn",
  fn: "esc",
  w: 1,
  col: 1,
  row: 1,
  x: 0.5,
  y: 0,
  span: 0,
}

export const toolKeyId = (t: StackElement) => `t${t.n}`
export const catKeyId = (c: StackCategory) => `c-${c}`

/** As ferramentas na ordem do teclado (a vitrine e o ↵ seguem esta ordem). */
export const KEY_ORDER: StackElement[] = KEYS.flatMap((k) => (k.kind === "tool" ? [k.tool] : []))

/** Ordem das fileiras (o ⇧ passa de uma para a outra). */
export const ROW_ORDER: StackCategory[] = ["front", "integracoes", "cms", "ia"]

/** Nome curto na tecla, quando o nome inteiro não cabe numa capa de 1 u. */
export const KEY_LABEL: Record<string, string> = {
  "Tailwind CSS": "Tailwind",
}

/** Sem acento, sem pontuação: "Next.js" vira "nextjs", "shadcn/ui" vira "shadcnui". */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

/** Ferramentas cujo nome começa com o que foi digitado. */
export function matchTools(query: string) {
  const q = norm(query)
  if (!q) return []
  return KEY_ORDER.filter((t) => norm(t.name).startsWith(q))
}

/** Iniciais que acendem alguma coisa (para a dica de "nada com X"). */
export const INITIALS = [...new Set(KEY_ORDER.map((t) => norm(t.name)[0]))].sort()
