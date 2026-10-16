"use client"

import { Component, useCallback, useEffect, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { afterPaint, canRun3D } from "@/components/hero-scene"
import { cn } from "@/lib/utils"

/*
 * O cursor de vidro vermelho que acompanha a página inteira (Blender:
 * public/3d/cursor-glass.glb). Não substitui o ponteiro do sistema: é um
 * personagem que visita as seções conforme a rolagem (o roteiro está em
 * cursor-companion-stops.ts, a cena em cursor-companion-canvas.tsx).
 *
 * Porteiro: só com mouse (pointer fine), GPU de verdade (o mesmo teste da
 * hero) e sem reduced motion. O chunk do three baixa logo depois do primeiro
 * paint da hidratação. Fora disso não entra nada aqui; o celular continua
 * com o PNG do cursor de vidro na hero (hero-keys.tsx).
 *
 * Camada: canvas fixo cobrindo a janela, sem ponteiro, acima do conteúdo e
 * abaixo do header (z-60) e do menu (z-70). Com ele ligado, o <html> ganha
 * `data-glass-cursor="on"` (o PNG da hero some).
 */

const CompanionCanvas = dynamic(() => import("@/components/cursor-companion-canvas"), {
  ssr: false,
})

const QUERY = "(pointer: fine) and (min-width: 768px) and (prefers-reduced-motion: no-preference)"

export function CursorCompanion() {
  const [on, setOn] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    let cancel = () => {}
    const start = () => {
      if (mq.matches && canRun3D()) cancel = afterPaint(() => setOn(true))
    }
    // Janela mudou de ponteiro, de tamanho ou de preferência de movimento
    const onChange = () => {
      cancel()
      cancel = () => {}
      setOn(false)
      setReady(false)
      start()
    }
    start()
    mq.addEventListener("change", onChange)
    return () => {
      cancel()
      mq.removeEventListener("change", onChange)
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    if (ready) html.dataset.glassCursor = "on"
    else delete html.dataset.glassCursor
    return () => {
      delete html.dataset.glassCursor
    }
  }, [ready])

  const onReady = useCallback(() => setReady(true), [])
  const onLost = useCallback(() => {
    setReady(false)
    setOn(false)
  }, [])

  if (!on) return null
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-[55] transition-opacity duration-700 ease-out",
        ready ? "opacity-100" : "opacity-0",
      )}
    >
      <CompanionBoundary onError={onLost}>
        <CompanionCanvas onReady={onReady} onLost={onLost} />
      </CompanionBoundary>
    </div>
  )
}

/** Chunk, GLB ou WebGL falhou: o cursor simplesmente não aparece. */
class CompanionBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
