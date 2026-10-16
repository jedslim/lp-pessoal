"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { StatusDot } from "@/components/kit/status-dot"
import { cn } from "@/lib/utils"

/** Trechos da bio que apontam para uma linha do config (e vice-versa). */
export type AboutLink = "cargo" | "formacao" | "curso" | "formatos" | "status"

type Kind = "kw" | "id" | "key" | "str" | "num" | "pun" | "dot"
type Token = [Kind, string]
type Line = { tokens: Token[]; link?: AboutLink }

/** Syntax highlight à mão, só com a paleta: vermelho é palavra-chave e número. */
const tone: Record<Kind, string> = {
  kw: "text-red-light",
  id: "text-bone font-semibold",
  key: "text-bone/55",
  str: "text-bone",
  num: "text-red-light",
  pun: "text-bone/45",
  dot: "",
}

const IND = "  "

/** O arquivo, token a token. O `dot` é o decorador de status (não é texto). */
const lines: Line[] = [
  {
    tokens: [
      ["kw", "export"],
      ["pun", " "],
      ["kw", "const"],
      ["pun", " "],
      ["id", "jedson"],
      ["pun", " = {"],
    ],
  },
  {
    link: "cargo",
    tokens: [
      ["key", `${IND}cargo`],
      ["pun", ": "],
      ["str", '"Desenvolvedor Full Stack"'],
      ["pun", ","],
    ],
  },
  {
    tokens: [
      ["key", `${IND}experiencia`],
      ["pun", ": "],
      ["str", '"4+ anos"'],
      ["pun", ","],
    ],
  },
  {
    tokens: [
      ["key", `${IND}projetosNoAr`],
      ["pun", ": "],
      ["num", "80"],
      ["pun", ","],
    ],
  },
  {
    link: "formacao",
    tokens: [
      ["key", `${IND}formacao`],
      ["pun", ": "],
      ["str", '"Análise e Desenvolvimento de Sistemas"'],
      ["pun", ","],
    ],
  },
  {
    link: "curso",
    tokens: [
      ["key", `${IND}curso`],
      ["pun", ": "],
      // Espaços inquebráveis em volta do "·": no celular "· StartSe" não se separa
      ["str", '"Arquitetura de multiagentes · StartSe"'],
      ["pun", ","],
    ],
  },
  {
    link: "formatos",
    tokens: [
      ["key", `${IND}formatos`],
      ["pun", ": ["],
      ["str", '"agência"'],
      ["pun", ", "],
      ["str", '"freela"'],
      ["pun", ", "],
      ["str", '"produto"'],
      ["pun", "],"],
    ],
  },
  {
    link: "status",
    tokens: [
      ["key", `${IND}status`],
      ["pun", ": "],
      ["dot", ""],
      ["str", '"disponível"'],
      ["pun", ","],
    ],
  },
  {
    tokens: [
      ["pun", "} "],
      ["kw", "as"],
      ["pun", " "],
      ["kw", "const"],
    ],
  },
]

/** Número da linha (1-based) de cada trecho ligado. */
const lineOf = (link: AboutLink) => lines.findIndex((l) => l.link === link) + 1
export const linkLine: Record<AboutLink, number> = {
  cargo: lineOf("cargo"),
  formacao: lineOf("formacao"),
  curso: lineOf("curso"),
  formatos: lineOf("formatos"),
  status: lineOf("status"),
}

const lengths = lines.map((l) => l.tokens.reduce((n, [, t]) => n + t.length, 0))

/** Velocidade da "digitação" (ms por caractere) e pausa no fim de cada linha. */
const PER_CHAR = 9
const LINE_PAUSE = 70
/** Momento (ms) em que cada linha começa a ser digitada. */
const starts = lengths.reduce<number[]>(
  (acc, len, i) => [...acc, i === 0 ? 0 : acc[i - 1] + lengths[i - 1] * PER_CHAR + LINE_PAUSE],
  [],
)
const TOTAL = starts[starts.length - 1] + lengths[lengths.length - 1] * PER_CHAR

/** Quantos caracteres de cada linha já apareceram em `t` ms. */
const typedAt = (t: number) =>
  lengths.map((len, i) => Math.max(0, Math.min(len, Math.floor((t - starts[i]) / PER_CHAR))))

/**
 * Quanto de cada token já apareceu numa linha, e em que token o cursor está
 * (`tokens.length` = fim da linha). O `dot` vale 1 quando o valor já começou.
 */
function reveal(tokens: Token[], typed: number) {
  let left = typed
  let caret = tokens.length
  const shown = tokens.map(([kind, text], k) => {
    if (kind === "dot") return left > 0 ? 1 : 0
    const n = Math.max(0, Math.min(text.length, left))
    if (caret === tokens.length && n < text.length) caret = k
    left -= text.length
    return n
  })
  return { shown, caret }
}

/** Linha onde o cursor está (a última que começou a ser digitada). */
const caretAt = (t: number) => {
  let line = 0
  starts.forEach((s, i) => {
    if (t >= s) line = i
  })
  return line
}

/** Cursor de bloco com largura zero no fluxo: não empurra o texto. */
function Caret({ blink }: { blink: boolean }) {
  return (
    <span aria-hidden className="relative inline-block w-0">
      <span
        className={cn(
          "bg-red-light absolute top-[-0.95em] left-0 h-[1.15em] w-[0.6ch]",
          blink && "motion-safe:animate-blink",
        )}
      />
    </span>
  )
}

/**
 * Card `jedson.config.ts`: o arquivo se digita sozinho ao entrar na tela.
 * O texto inteiro fica no layout desde o início (a parte ainda não digitada
 * é transparente), então nada pula de lugar. Passar o mouse numa linha
 * ligada acende o trecho da bio correspondente, e a barra de status mostra
 * Ln/Col como num editor.
 */
export function AboutConfig({
  active,
  onLink,
  className,
}: {
  active: AboutLink | null
  onLink: (link: AboutLink | null) => void
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { amount: 0.45, once: true })
  const visible = useInView(ref)
  // O servidor entrega o arquivo completo (sem JS, segue legível)
  const [time, setTime] = useState(TOTAL)
  const [hovered, setHovered] = useState<number | null>(null)
  const armed = useRef(false)

  // Fora da tela no carregamento: apaga e digita ao aparecer
  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    const r = el.getBoundingClientRect()
    if (r.top > window.innerHeight * 0.8 || r.bottom < 0) {
      armed.current = true
      setTime(0)
    }
  }, [reduce])

  useEffect(() => {
    if (!inView || !armed.current) return
    armed.current = false
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = now - t0
      setTime(Math.min(t, TOTAL))
      if (t < TOTAL) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView])

  const typed = typedAt(time)
  const caret = caretAt(time)
  const done = time >= TOTAL
  // Ln/Col: segue o cursor enquanto digita; depois, a linha sob o mouse
  const lnIndex = hovered ?? caret
  const col = (hovered !== null ? lengths[hovered] : typed[caret]) + 1

  return (
    <figure
      ref={ref}
      data-companion="about"
      className={cn(
        "bg-ink text-bone relative overflow-hidden rounded-2xl shadow-[0_40px_80px_-40px_rgb(11_11_12/0.55),0_2px_0_0_rgb(11_11_12/0.08)]",
        // Pisca do cursor e pulso do status só rodam com o card na tela
        !visible && "[&_*]:[animation-play-state:paused]",
        className,
      )}
    >
      {/* Aba do arquivo */}
      <figcaption className="flex h-11 items-center justify-between border-b border-white/[0.07] pr-4">
        <span className="flex h-full items-center gap-2.5 border-r border-white/[0.07] bg-white/[0.04] px-4 font-mono text-[12px] text-bone/85">
          <span className="bg-bone text-ink rounded-[3px] px-1 py-px text-[9px] leading-none font-bold">
            TS
          </span>
          jedson.config.ts
        </span>
        <span className="text-label text-bone/50">readonly</span>
      </figcaption>

      <pre
        className="overflow-hidden py-4 font-mono text-[12.5px] leading-[1.8] sm:text-[13.5px]"
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return
          setHovered(null)
          onLink(null)
        }}
      >
        <code className="block">
          {lines.map((line, i) => {
            const on = line.link !== undefined && line.link === active
            const { shown, caret: caretToken } = reveal(line.tokens, typed[i])
            // Sempre no HTML (servidor e cliente iguais); o pisca é motion-safe
            const cursor = i === caret ? <Caret blink={done} /> : null
            return (
              <span
                key={i}
                id={line.link ? `about-cfg-${line.link}` : undefined}
                // Mouse: hover. Toque: o tap numa linha ligada alterna o destaque
                onPointerEnter={(e) => {
                  if (e.pointerType !== "mouse") return
                  setHovered(i)
                  onLink(line.link ?? null)
                }}
                onPointerUp={(e) => {
                  if (e.pointerType === "mouse" || !line.link) return
                  onLink(on ? null : line.link)
                }}
                className={cn(
                  "relative flex transition-colors duration-300",
                  on ? "bg-red-primary/[0.14]" : hovered === i && "bg-white/[0.035]",
                )}
              >
                {/* Marca da linha ligada à bio */}
                <span
                  aria-hidden
                  className={cn(
                    "bg-red-light absolute inset-y-0 left-0 w-0.5 origin-top transition-transform duration-300",
                    on ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "w-10 shrink-0 pr-3.5 text-right tabular-nums transition-colors duration-300 select-none sm:w-14 sm:pr-4",
                    on ? "text-red-light" : "text-bone/25",
                  )}
                >
                  {i + 1}
                </span>
                {/* Quebra com recuo: no celular a linha longa desce alinhada ao valor */}
                <span className="min-w-0 flex-1 pr-4 pl-[4ch] -indent-[4ch] break-words whitespace-pre-wrap">
                  {line.tokens.map(([kind, text], k) => {
                    if (kind === "dot") {
                      return (
                        <StatusDot
                          key={k}
                          className={cn(
                            "mr-[1ch] align-[0.05em] transition-opacity duration-300",
                            shown[k] ? "opacity-100" : "opacity-0",
                          )}
                        />
                      )
                    }
                    const n = shown[k]
                    return (
                      <span key={k} className={tone[kind]}>
                        {text.slice(0, n)}
                        {caretToken === k && cursor}
                        {n < text.length && (
                          <span className="text-transparent">{text.slice(n)}</span>
                        )}
                      </span>
                    )
                  })}
                  {caretToken === line.tokens.length && cursor}
                </span>
              </span>
            )
          })}
        </code>
      </pre>

      {/* Barra de status, como no editor */}
      <div className="text-bone/55 flex h-9 items-center justify-between border-t border-white/[0.07] px-4 font-mono text-[10.5px] tracking-[0.08em] uppercase">
        <span className="flex items-center gap-2">
          <span className="bg-bone/50 size-1.5 rounded-full" />
          TypeScript · UTF-8
        </span>
        <span aria-hidden className="tabular-nums">
          Ln {lnIndex + 1}, Col {col}
        </span>
      </div>
    </figure>
  )
}
