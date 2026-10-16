"use client"

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"

/*
 * Porteiro da cena 3D da hero (as teclas do Blender em WebGL).
 *
 * O three.js (e os GLBs, e o decoder Draco) baixa logo depois do primeiro
 * paint da hidratação: as teclas e o cursor chegam voando já na abertura.
 * Só em desktop com mouse, WebGL de verdade (sem renderizador por software)
 * e sem reduced motion. O LCP (foto + nome) já está pintado quando o chunk
 * começa a baixar, e a montagem da cena cede a vez em etapas
 * (hero-scene-canvas.tsx), então ele não espera pelo 3D.
 *
 * Fora disso entra o <HeroKeys /> (renders em WebP). A troca é por CSS e
 * por `data-hero3d` na <section>:
 *   (sem atributo)  desktop: imagens escondidas, esperando o 3D
 *   "on"            cena desenhando
 *   "off"           sem WebGL ou contexto perdido: imagens de volta
 */

const HeroSceneCanvas = dynamic(() => import("@/components/hero-scene-canvas"), {
  ssr: false,
})

/** Mesma condição do `lg:pointer-fine:motion-safe:hidden` do HeroKeys. */
const QUERY = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"

let gpuVerdict: boolean | null = null

/** WebGL com GPU de verdade, sem economia de dados nem CPU fraca. */
export function canRun3D() {
  if (gpuVerdict !== null) return gpuVerdict
  gpuVerdict = false
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
    if (nav.connection?.saveData) return false
    if ((nav.hardwareConcurrency ?? 8) < 4) return false
    const c = document.createElement("canvas")
    const opts: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true }
    const gl = (c.getContext("webgl2", opts) ?? c.getContext("webgl", opts)) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null
    if (!gl) return false
    // Renderizador por software (SwiftShader, llvmpipe, Microsoft Basic
    // Render): o failIfMajorPerformanceCaveat nem sempre pega
    const info = gl.getExtension("WEBGL_debug_renderer_info")
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ""
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return false
    gpuVerdict = true
  } catch {
    gpuVerdict = false
  }
  return gpuVerdict
}

/** Logo depois do primeiro paint (rAF + tarefa nova: o quadro já saiu).
 *  Devolve o cancelamento. */
export function afterPaint(fn: () => void) {
  let timer = 0
  const raf = requestAnimationFrame(() => {
    timer = window.setTimeout(fn, 0)
  })
  return () => {
    cancelAnimationFrame(raf)
    window.clearTimeout(timer)
  }
}

export function HeroScene({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLElement | null>(null)
  const [section, setSection] = useState<HTMLElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current?.closest("section")
    if (!el) return
    host.current = el
    const mq = window.matchMedia(QUERY)
    let cancel = () => {}
    const start = () => {
      if (!canRun3D()) {
        el.dataset.hero3d = "off"
        return
      }
      cancel = afterPaint(() => setSection(el))
    }
    // Janela mudou de tamanho, de ponteiro ou de preferência de movimento
    const onChange = () => {
      cancel()
      cancel = () => {}
      setReady(false)
      setSection(null)
      delete el.dataset.hero3d
      if (mq.matches) start()
    }
    if (mq.matches) start()
    mq.addEventListener("change", onChange)
    return () => {
      cancel()
      mq.removeEventListener("change", onChange)
      delete el.dataset.hero3d
    }
  }, [])

  const onReady = useCallback(() => {
    setReady(true)
    if (host.current) host.current.dataset.hero3d = "on"
  }, [])
  const onLost = useCallback(() => {
    setReady(false)
    setSection(null)
    if (host.current) host.current.dataset.hero3d = "off"
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "transition-opacity duration-500 ease-out",
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {section && (
        <SceneBoundary onError={onLost}>
          <HeroSceneCanvas section={section} onReady={onReady} onLost={onLost} />
        </SceneBoundary>
      )}
    </div>
  )
}

/** Se o chunk, o GLB ou o WebGL falharem, a hero volta para as imagens. */
class SceneBoundary extends Component<
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
