"use client"

import type { RefObject } from "react"
import { motion, useScroll, useTransform } from "motion/react"

/** Quanto a folha encolhe nas bordas da tela (fração da largura). */
const INSET = 0.06

/**
 * Fundo da seção clara: uma folha de papel (bone) com cantos arredondados
 * sobre o site escuro. Ela cresce até a largura toda ao entrar e volta a
 * encolher ao sair, então a troca escuro → claro → escuro tem começo e fim.
 * Só o fundo escala (transform): o conteúdo não distorce nem repinta.
 */
export function AboutSheet({
  target,
}: {
  target: RefObject<HTMLElement | null>
}) {
  const { scrollYProgress: enter } = useScroll({
    target,
    offset: ["start end", "start 0.15"],
  })
  const { scrollYProgress: leave } = useScroll({
    target,
    offset: ["end 0.85", "end start"],
  })
  const scaleX = useTransform(() =>
    Math.min(1 - INSET + INSET * enter.get(), 1 - INSET * leave.get()),
  )

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      // Reduced motion no CSS (vence o estilo inline): folha parada, e o HTML
      // do servidor bate com o do cliente
      className="bg-bone pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[1.75rem] will-change-transform motion-reduce:transform-none! lg:rounded-[3rem]"
    >
      {/* Papel milimetrado só no topo, sumindo para baixo */}
      <div className="bg-grid-ink absolute inset-x-0 top-0 h-[70vh] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      {/* Luz suave no topo: a folha não fica chapada */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgb(255_255_255/0.5),transparent_60%)]" />
    </motion.div>
  )
}
