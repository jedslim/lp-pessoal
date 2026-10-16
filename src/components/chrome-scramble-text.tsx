"use client"

import { useEffect, useRef } from "react"
import { useScramble } from "@/components/chrome-scramble"

/**
 * Rótulo mono que embaralha quando o link/botão em volta recebe o mouse ou o
 * foco do teclado. O leitor de tela lê só o texto final.
 */
export function ScrambleText({
  text,
  className,
  preserveCase,
  duration,
  playOnMount = false,
  playOnView = false,
  delay = 0,
}: {
  text: string
  className?: string
  preserveCase?: boolean
  /** Duração do embaralhar, em ms (padrão do hook: 420). */
  duration?: number
  /** "Decodifica" ao aparecer (menu abrindo), além do hover. */
  playOnMount?: boolean
  /** "Decodifica" uma vez quando entra na tela (links do rodapé). */
  playOnView?: boolean
  /** Atraso do playOnMount / playOnView, em ms. */
  delay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [output, play] = useScramble(text, { preserveCase, duration })

  useEffect(() => {
    const host = ref.current?.closest<HTMLElement>(
      "a, button, [data-scramble-host]",
    )
    if (!host) return
    // No toque o pointerenter vem colado no tap: embaralha como resposta ao toque
    const onEnter = () => play()
    const onFocus = () => {
      if (host.matches(":focus-visible")) play()
    }
    host.addEventListener("pointerenter", onEnter)
    host.addEventListener("focus", onFocus)
    return () => {
      host.removeEventListener("pointerenter", onEnter)
      host.removeEventListener("focus", onFocus)
    }
  }, [play])

  useEffect(() => {
    if (!playOnMount) return
    const id = setTimeout(play, delay)
    return () => clearTimeout(id)
  }, [playOnMount, delay, play])

  // Uma vez só, quando o rótulo fica visível de verdade (não na borda da tela)
  const viewed = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!playOnView || !el || viewed.current) return
    let id: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        io.disconnect()
        id = setTimeout(() => {
          viewed.current = true
          play()
        }, delay)
      },
      { rootMargin: "0px 0px -12% 0px" },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(id)
    }
  }, [playOnView, delay, play])

  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{output}</span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
