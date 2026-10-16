"use client"

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { keySound } from "@/components/stack-sound"
import s from "./stack-keyboard.module.css"

/** Curso do botão: de -135° (mudo) a +135° (100%). */
const SWEEP = 270
const DOTS = 11

const angleOf = (v: number) => -SWEEP / 2 + (v / 100) * SWEEP

/**
 * O botão giratório dos teclados custom, aqui fazendo o que ele faz lá:
 * volume. Começa mudo. Girar (arrastar em volta, rodinha do mouse ou setas)
 * ajusta; um clique liga e desliga. O anel de LEDs mostra o nível.
 */
export function StackKnob({ onAdjust }: { onAdjust: (value: number) => void }) {
  const value = useSyncExternalStore(keySound.subscribe, keySound.get, () => 0)
  const ref = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ id: number; last: number; moved: number; x: number; y: number } | null>(null)

  const set = (v: number) => {
    keySound.prime()
    keySound.set(v)
    onAdjust(keySound.get())
  }

  // Rodinha: listener próprio, não passivo, para não rolar a página junto
  // (o data-lenis-prevent tira o Lenis do caminho)
  const onAdjustRef = useRef(onAdjust)
  useEffect(() => {
    onAdjustRef.current = onAdjust
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      keySound.prime()
      keySound.set(keySound.get() + (e.deltaY < 0 ? 5 : -5))
      onAdjustRef.current(keySound.get())
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const centerAngle = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    // O gesto que libera o áudio no navegador: o contexto nasce aqui
    keySound.prime()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, last: centerAngle(e), moved: 0, x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const a = centerAngle(e)
    let delta = a - d.last
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    d.last = a
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y))
    if (d.moved > 4) set(keySound.get() + (delta / SWEEP) * 100)
  }
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId) return
    // Toque sem arrastar: liga/desliga
    if (d.moved <= 4) {
      keySound.toggle()
      onAdjust(keySound.get())
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowUp: 10, ArrowRight: 10, ArrowDown: -10, ArrowLeft: -10, PageUp: 25, PageDown: -25 }[
      e.key
    ]
    if (step !== undefined) set(keySound.get() + step)
    else if (e.key === "Home") set(0)
    else if (e.key === "End") set(100)
    else if (e.key === "Enter" || e.key === " ") {
      keySound.toggle()
      onAdjust(keySound.get())
    } else return
    e.preventDefault()
  }

  const on = value > 0
  return (
    <button
      ref={ref}
      type="button"
      role="slider"
      aria-label="Som das teclas"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={on ? `Volume ${value}%` : "Mudo"}
      data-on={on}
      data-lenis-prevent
      data-stack-knob
      className={s.knobBtn}
      style={{ "--angle": `${angleOf(value)}deg` } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: DOTS }, (_, i) => {
        const v = (i / (DOTS - 1)) * 100
        return (
          <span key={i} className={s.arm} style={{ "--a": `${angleOf(v)}deg` } as CSSProperties}>
            <span className={s.dot} data-on={on && value >= v - 0.5} />
          </span>
        )
      })}
      <span className={s.knurl} />
      <span className={s.knobCap} />
      <span className={s.mark} />
      <span className={s.knobLabel}>{on ? "som" : "mudo"}</span>
    </button>
  )
}
