"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_#*+="
const LOWER = "abcdefghijklmnopqrstuvwxyz0123456789/<>_#*+="
const DURATION = 420
// Troca de glifo a cada ~45 ms: ritmo de terminal, não de 60 fps
const FRAME = 45

/** Pontuação e espaço ficam parados: a silhueta da palavra continua legível. */
const isFixed = (ch: string) => !/[\p{L}\p{N}]/u.test(ch)

type Options = {
  /** Minúscula embaralha com minúsculas (texto que não está em caixa alta). */
  preserveCase?: boolean
  /** Duração total em ms (padrão 420). */
  duration?: number
}

/**
 * Texto que "embaralha" e se resolve da esquerda para a direita (hover dos
 * links mono). Em fonte monoespaçada a largura não muda; em fonte display,
 * use onde a largura da palavra não empurra nada (ex.: menu do celular).
 * Devolve o texto da vez, a função que dispara o efeito e uma variante com
 * duração própria (o toque curto antes de navegar).
 */
export function useScramble(text: string, options: Options = {}) {
  const { preserveCase = false, duration = DURATION } = options
  const reduce = useReducedMotion()
  const [output, setOutput] = useState(text)
  const [source, setSource] = useState(text)
  const raf = useRef(0)

  // O texto mudou (prop nova): mostra o novo sem esperar o próximo hover
  if (source !== text) {
    setSource(text)
    setOutput(text)
  }

  const run = useCallback((ms: number) => {
    if (reduce) return
    cancelAnimationFrame(raf.current)
    const start = performance.now()
    let last = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      if (now - last >= FRAME || p === 1) {
        last = now
        const settled = Math.floor(p * text.length)
        let next = ""
        for (let i = 0; i < text.length; i++) {
          const ch = text[i]
          if (i < settled || isFixed(ch)) {
            next += ch
            continue
          }
          const set =
            preserveCase && ch === ch.toLowerCase() && ch !== ch.toUpperCase()
              ? LOWER
              : UPPER
          next += set[Math.floor(Math.random() * set.length)]
        }
        setOutput(next)
      }
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [text, reduce, preserveCase])

  const play = useCallback(() => run(duration), [run, duration])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return [output, play, run] as const
}
