"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

// Mesmo alfabeto do scramble do menu (chrome-scramble), nas duas caixas
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_#*+="
const LOWER = "abcdefghijklmnopqrstuvwxyz0123456789/<>_#*+="
// Ritmo de terminal, como no menu
const FRAME = 45
// Hover não repete em rajada: o mouse cruza a palavra a caminho da tela
const COOLDOWN = 2200

/**
 * Palavra display que "decodifica" letra a letra: o scramble do menu em
 * escala de cartaz. Roda ao entrar na tela e de novo no hover do mouse.
 * Cada letra tem a própria caixa e o glifo sorteado é recortado nela, então
 * a largura da palavra nunca muda (fonte proporcional, sem pulo de layout).
 */
export function DecodeWord({
  text,
  className,
  duration = 950,
}: {
  text: string
  className?: string
  /** Tempo até a última letra assentar (ms). */
  duration?: number
}) {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" })
  // null = letra assentada (mostra a letra real)
  const [glyphs, setGlyphs] = useState<(string | null)[]>([])
  const raf = useRef(0)
  const running = useRef(false)
  const lastEnd = useRef(-Infinity)

  // `byUser`: o hover é pedido de quem está lendo e roda mesmo com reduced
  // motion (as letras trocam no lugar, nada se desloca); a decodificação
  // automática, ao entrar na tela, respeita a preferência
  const play = useCallback((byUser = false) => {
    if ((reduce && !byUser) || running.current) return
    running.current = true
    const chars = [...text]
    const start = performance.now()
    let last = -Infinity
    const tick = (now: number) => {
      const t = now - start
      if (t >= duration) {
        setGlyphs([])
        running.current = false
        lastEnd.current = now
        return
      }
      if (now - last >= FRAME) {
        last = now
        setGlyphs(
          chars.map((ch, i) => {
            // Assenta da esquerda para a direita; o primeiro terço é só ruído
            const settle = duration * (0.3 + (0.7 * (i + 1)) / chars.length)
            if (t >= settle || ch === " ") return null
            const set = ch === ch.toLowerCase() ? LOWER : UPPER
            return set[Math.floor(Math.random() * set.length)]
          }),
        )
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [text, duration, reduce])

  useEffect(() => {
    if (inView) play()
  }, [inView, play])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // A próxima letra a assentar é a "agulha" vermelha; as outras são fantasmas
  const front = glyphs.findIndex(Boolean)

  return (
    <span
      ref={ref}
      aria-hidden
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return
        if (performance.now() - lastEnd.current < COOLDOWN) return
        play(true)
      }}
      className={cn("inline-flex whitespace-pre", className)}
    >
      {[...text].map((ch, i) => {
        const g = glyphs[i]
        return (
          <span key={i} className="relative inline-block">
            <span className={g ? "opacity-0" : undefined}>{ch}</span>
            {g && (
              <span
                className={cn(
                  "absolute inset-0 flex justify-center overflow-x-clip",
                  i === front ? "text-red-light" : "text-foreground/25",
                )}
              >
                {g}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
