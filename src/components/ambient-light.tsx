"use client"

import { useEffect, useRef } from "react"

/**
 * Luz ambiente vermelha atrás do conteúdo: duas manchas grandes e suaves que
 * trocam de lado conforme a rolagem, para o site não ficar preto chapado.
 * Some na hero (que já tem a própria luz) e respeita reduced motion (fica parada).
 */
export function AmbientLight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      const vh = window.innerHeight
      // Entra depois da hero
      const enter = Math.min(1, Math.max(0, (window.scrollY - vh * 0.5) / vh))
      // As manchas atravessam a tela em ondas lentas, uma de cada lado
      const a = reduce ? 0.5 : p
      const x1 = 15 + 70 * (0.5 + 0.5 * Math.sin(a * Math.PI * 5))
      const y1 = 25 + 30 * (0.5 + 0.5 * Math.cos(a * Math.PI * 3))
      const x2 = 100 - x1
      const y2 = 75 - 25 * (0.5 + 0.5 * Math.sin(a * Math.PI * 4))
      el.style.setProperty("--l1x", `${x1}%`)
      el.style.setProperty("--l1y", `${y1}%`)
      el.style.setProperty("--l2x", `${x2}%`)
      el.style.setProperty("--l2y", `${y2}%`)
      el.style.opacity = String(enter)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-0 transition-opacity duration-700"
      style={{
        backgroundImage:
          "radial-gradient(42vw 38vw at var(--l1x, 20%) var(--l1y, 30%), rgb(229 9 20 / 0.16), transparent 70%), radial-gradient(36vw 32vw at var(--l2x, 80%) var(--l2y, 70%), rgb(133 8 14 / 0.22), transparent 70%)",
      }}
    />
  )
}
