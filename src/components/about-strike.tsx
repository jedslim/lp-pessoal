"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

/**
 * Marcador de revisor: um traço vermelho à mão, desenhado na base do trecho
 * depois que o título sobe. É o único vermelho do statement (sinal, não
 * enfeite). Ele grifa, não risca: a frase continua dizendo o que diz, e o
 * trecho grifado escurece junto, como quem sublinha a palavra ao ler em voz
 * alta.
 */
export function AboutStrike({
  children,
  delay = 1,
}: {
  children: ReactNode
  /** Espera o título terminar de subir (s). */
  delay?: number
}) {
  const reduce = useReducedMotion()
  const viewport = { once: true, margin: "0px 0px -12% 0px" }
  return (
    // `isolate`: o traço fica atrás das letras, e a descendente do "p" passa
    // por cima dele (como o skip-ink de um sublinhado)
    <span className="relative isolate inline-block">
      {/* Do cinza da premissa ao ink, no ritmo do traço */}
      <motion.span
        className="inline-block"
        initial={{ color: "var(--ink-muted)" }}
        whileInView={{ color: "var(--ink)" }}
        viewport={viewport}
        transition={
          reduce ? { duration: 0 } : { duration: 0.7, delay: delay + 0.15, ease: "easeOut" }
        }
      >
        {children}
      </motion.span>
      <svg
        aria-hidden
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        // Logo abaixo da baseline: o topo do traço encosta no pé das letras
        className="pointer-events-none absolute top-[83%] -left-[1.5%] -z-10 h-[0.3em] w-[103%] overflow-visible"
      >
        {/* Sem non-scaling-stroke: ele quebra o traçado do pathLength em
            tracejado. A espessura sai da escala vertical (≈0.09em): firme
            como um marcador, sem virar uma barra. */}
        <motion.path
          d="M1 4.6 C 20 6.2, 44 5.4, 66 5.6 S 90 4.4, 99 3.4"
          fill="none"
          stroke="var(--red-primary)"
          strokeLinecap="round"
          strokeWidth="3"
          // `initial` igual no servidor e no cliente; com reduced motion o
          // traço só aparece pronto (duração zero). A opacidade esconde o
          // ponto que a ponta redonda desenha com pathLength 0
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={viewport}
          transition={
            reduce
              ? { duration: 0 }
              : {
                  pathLength: { duration: 0.7, delay, ease: [0.65, 0, 0.35, 1] },
                  opacity: { duration: 0.01, delay },
                }
          }
        />
      </svg>
    </span>
  )
}
