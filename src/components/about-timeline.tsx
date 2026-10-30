"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react"
import { timeline } from "@/lib/timeline"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const
/** Tempo de cada marco na demonstração (ms). */
const DEMO_STEP = 900

/**
 * Linha do tempo da carreira, na folha clara do Sobre. A régua se desenha
 * ao entrar na tela; cada ano é um ponto. Clicar, arrastar pela régua
 * (mouse ou dedo) ou usar as setas do teclado escolhe o marco, que acende
 * em vermelho e abre a frase dele logo abaixo.
 *
 * Ao entrar na tela, uma demonstração (uma vez): os marcos acendem um a um,
 * do primeiro até "Hoje", e a seta de vidro toca cada um (data-companion).
 * Qualquer mexida da pessoa interrompe.
 */
export function AboutTimeline({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const last = timeline.length - 1
  const [active, setActive] = useState(last)
  const rail = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const step = (i: number) => (last === 0 ? 0 : i / last)

  // Demonstração: começa quando a régua está bem à vista
  const seen = useInView(rail, { once: true, amount: 0.9 })
  const touched = useRef(false)
  const select = (i: number) => {
    touched.current = true
    setActive(i)
  }
  useEffect(() => {
    if (!seen || reduce || touched.current) return
    let i = 0
    let id = 0
    const tick = () => {
      if (touched.current) return
      setActive(i)
      if (i++ < last) id = window.setTimeout(tick, DEMO_STEP)
    }
    // Um respiro depois da régua se desenhar
    id = window.setTimeout(tick, 700)
    return () => window.clearTimeout(id)
  }, [seen, reduce, last])

  // Arrastar: o marco mais perto do dedo/cursor
  const pick = (clientX: number) => {
    const r = rail.current?.getBoundingClientRect()
    if (!r) return
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    select(Math.round(f * last))
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    pick(e.clientX)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) pick(e.clientX)
  }
  const onUp = () => {
    dragging.current = false
  }

  const onKey = (e: KeyboardEvent) => {
    const next =
      e.key === "ArrowRight" ? active + 1
      : e.key === "ArrowLeft" ? active - 1
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null
    if (next === null) return
    e.preventDefault()
    const i = Math.min(last, Math.max(0, next))
    select(i)
    document.getElementById(`tl-${i}`)?.focus()
  }

  const m = timeline[active]

  return (
    <div className={className}>
      <p className="text-label text-ink-muted">Trajetória</p>

      {/* Régua: a área toda recebe o arraste; os anos são os botões */}
      <div
        ref={rail}
        data-companion="timeline"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative mt-6 cursor-grab touch-pan-y pt-2 pb-9 select-none active:cursor-grabbing"
      >
        {/* Trilho e o trecho já percorrido até o marco ativo */}
        <motion.div
          aria-hidden
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 1.2, ease: EASE }}
          className="bg-ink/15 absolute inset-x-0 top-[13px] h-px origin-left"
        />
        <motion.div
          aria-hidden
          initial={false}
          animate={{ scaleX: step(active) }}
          transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
          className="bg-red-primary absolute inset-x-0 top-[12.5px] h-[2px] origin-left"
        />

        <div role="tablist" aria-label="Marcos da carreira" onKeyDown={onKey} className="relative flex justify-between">
          {timeline.map((t, i) => {
            const on = i === active
            const past = i < active
            return (
              <motion.button
                key={t.when}
                id={`tl-${i}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="tl-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => select(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && e.isTrusted && select(i)}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.12, ease: EASE }}
                className={cn(
                  "group/tl relative flex flex-col items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-red-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-bone",
                  // As pontas alinham com o começo e o fim do trilho
                  i === 0 && "items-start",
                  i === last && "items-end",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "block size-3 rounded-full border-2 transition-[background-color,border-color,scale] duration-500",
                    on
                      ? "border-red-primary bg-red-primary scale-125 shadow-[0_0_0_5px_rgb(229_9_20/0.14)]"
                      : past
                        ? "border-red-primary bg-bone"
                        : "border-ink/30 bg-bone group-hover/tl:border-ink/60",
                  )}
                />
                <span
                  className={cn(
                    "absolute top-6 font-mono text-[12px] whitespace-nowrap tabular-nums transition-colors duration-300",
                    i === 0 ? "left-0" : i === last ? "right-0" : "left-1/2 -translate-x-1/2",
                    on ? "text-ink font-medium" : "text-ink-muted",
                  )}
                >
                  {t.when}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* O marco ativo: troca deslizando no sentido da régua */}
      <div id="tl-panel" role="tabpanel" aria-labelledby={`tl-${active}`} className="relative mt-3 min-h-[6.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <p className="text-ink text-lg font-medium sm:text-xl">{m.title}</p>
            <p className="text-ink-muted mt-2 max-w-[44ch] text-base leading-relaxed text-pretty">
              {m.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
