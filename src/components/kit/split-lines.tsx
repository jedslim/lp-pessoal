"use client"

import type { CSSProperties, ReactNode } from "react"
import { motion, useReducedMotion, type Variants } from "motion/react"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

const parent = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

// O ponto de partida não depende do reduced motion (o servidor não sabe a
// preferência: mudar o `hidden` quebrava a hidratação); só a duração zera
const line = (reduce: boolean): Variants => ({
  hidden: { y: "108%" },
  show: { y: 0, transition: { duration: reduce ? 0 : 0.95, ease: EASE } },
})

const tags = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  div: motion.div,
}

/**
 * Título que entra linha a linha, cada uma subindo de dentro de uma máscara.
 * As quebras são explícitas (`lines`): quem desenha decide onde a frase quebra.
 *
 * `immediate`: anima no carregamento via CSS (antes do JavaScript), para a
 * hero. Sem ele, anima ao entrar na tela.
 */
export function SplitLines({
  as = "h2",
  lines,
  className,
  lineClassName,
  delay = 0,
  stagger = 0.09,
  immediate = false,
}: {
  as?: keyof typeof tags
  lines: ReactNode[]
  className?: string
  /** Classe de cada linha (ex.: alinhar uma linha à direita). */
  lineClassName?: string | ((index: number) => string | undefined)
  delay?: number
  stagger?: number
  immediate?: boolean
}) {
  const reduce = useReducedMotion() ?? false
  const lineClass = (i: number) =>
    typeof lineClassName === "function" ? lineClassName(i) : lineClassName

  // Folga vertical na máscara: acentos (Ã, É) e descendentes (ç, p) não cortam
  const mask = "block overflow-hidden py-[0.12em] -my-[0.12em]"

  if (immediate) {
    const Tag = as
    return (
      <Tag className={className}>
        {lines.map((content, i) => (
          <span key={i} className={mask}>
            <span
              className={cn("split-rise block", lineClass(i))}
              style={
                {
                  animationDelay: `${delay + i * stagger}s`,
                } as CSSProperties
              }
            >
              {content}
            </span>
          </span>
        ))}
      </Tag>
    )
  }

  const Tag = tags[as]
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      variants={parent(stagger, delay)}
    >
      {lines.map((content, i) => (
        <span key={i} className={mask}>
          <motion.span className={cn("block", lineClass(i))} variants={line(reduce)}>
            {content}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
