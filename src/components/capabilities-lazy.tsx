"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState, type ComponentType } from "react"

/*
 * Os quatro playgrounds das Capacidades ficam fora do HTML do servidor e não
 * hidratam na carga: o código baixa e o componente monta quando o painel
 * chega a 900 px da tela. Até lá, um esqueleto com a barra do topo segura o
 * lugar (no desktop o palco tem altura fixa; no celular cada painel tem uma
 * altura mínima perto da real, definida em capabilities-scroller). No
 * desktop, o código dos quatro vem no ocioso, para estar pronto mesmo quando
 * a pessoa pula direto para a seção.
 */

const MARGIN = "900px 0px"

function Skeleton() {
  return (
    <div aria-hidden className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-3 border-b border-white/[0.07] px-4 sm:px-5">
        <span className="size-7 rounded-full bg-white/[0.04]" />
        <span className="h-2.5 w-2/5 rounded-full bg-white/[0.05]" />
      </div>
    </div>
  )
}

type Props = { active: boolean }

// As opções do next/dynamic precisam ser um objeto literal em cada chamada
const PLAYGROUNDS: ComponentType<Props>[] = [
  dynamic(
    () => import("@/components/capabilities-web").then((m) => m.WebPlayground),
    { ssr: false, loading: Skeleton },
  ),
  dynamic(() => import("@/components/acf-demo").then((m) => m.AcfDemo), {
    ssr: false,
    loading: Skeleton,
  }),
  dynamic(
    () => import("@/components/automation-flow").then((m) => m.AutomationFlow),
    { ssr: false, loading: Skeleton },
  ),
  dynamic(
    () => import("@/components/capabilities-ai").then((m) => m.AiPlayground),
    { ssr: false, loading: Skeleton },
  ),
]

let preloaded = false
/** Desktop: baixa o código dos playgrounds no ocioso (uma vez só). */
function preloadOnIdle() {
  if (preloaded || !window.matchMedia("(pointer: fine)").matches) return
  preloaded = true
  const load = () => {
    void import("@/components/capabilities-web")
    void import("@/components/acf-demo")
    void import("@/components/automation-flow")
    void import("@/components/capabilities-ai")
  }
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(load, { timeout: 4000 })
  else setTimeout(load, 2000)
}

/** Monta o playground `index` quando o painel chega perto da tela. */
export function LazyPlayground({ index, active }: { index: number; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    preloadOnIdle()
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: MARGIN },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const Playground = PLAYGROUNDS[index]
  return (
    <div ref={ref} className="h-full">
      {near ? <Playground active={active} /> : <Skeleton />}
    </div>
  )
}
