"use client"

import { useEffect, useRef } from "react"

/*
 * O nome do rodapé no mesmo tratamento da hero: Archivo variável em fio
 * (expandida, peso 200) que ganha corpo perto do ponteiro. Na primeira vez
 * que o rodapé aparece, uma onda passa pelas letras (mostra que reage); e
 * uma letra digitada faz as iguais pulsarem, junto com as teclas do chão.
 *
 * Cada letra reserva a largura do estado base (um "fantasma" invisível em
 * ::before); no pico ela condensa (wdth 80) para o peso caber na mesma caixa,
 * e a linha não anda. O efeito escreve `font-variation-settings` direto no
 * style, via rAF com lerp: nada de setState por quadro. Reduced motion:
 * estático, no fio.
 */

const BASE = { wdth: 125, wght: 200 }
const PEAK = { wdth: 80, wght: 860 }
const BASE_FVS = `"wdth" ${BASE.wdth}, "wght" ${BASE.wght}`
/** A largura condensa mais tarde do que o peso sobe. */
const WDTH_CURVE = 1.4
/** Raio da influência, em `em` (elipse: mais larga que alta). */
const RX = 1.3
const RY = 1
/** Lerp (1/s): sobe rápido, desce devagar. */
const ATTACK = 12
const RELEASE = 5
/** Depois do último movimento, segue medindo (a página pode estar rolando). */
const SETTLE_MS = 900
/** Onda de entrada: atraso e duração (ms). */
const INTRO_DELAY = 500
const INTRO_MS = 1800
/** Pulso da digitação (s). */
const PULSE_S = 0.55

const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

export function FooterName({
  lines,
  className,
}: {
  lines: string[]
  className?: string
}) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const glyphs = Array.from(root.querySelectorAll<HTMLElement>("[data-glyph]"))
    const cells = glyphs.map((g) => g.parentElement as HTMLElement)
    const chars = glyphs.map((g) => fold(g.textContent ?? ""))
    const words = Array.from(root.querySelectorAll<HTMLElement>("[data-word]"))
    const n = glyphs.length
    const level = new Float32Array(n)
    const pulse = new Float32Array(n)
    const written: string[] = new Array(n).fill("")

    const pointer = { x: 0, y: 0, on: false }
    let fontSize = parseFloat(getComputedStyle(root).fontSize)
    let lastMove = 0
    let frame = 0
    let last = 0
    let visible = false
    let sweepStart = 0
    let introDone = false
    let introTimer = 0

    const kick = () => {
      if (frame || !visible) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }

    // Ponteiro virtual da onda: "Jedson" da esquerda para a direita,
    // "Santos" de volta
    const sweepPoint = (now: number) => {
      const t = (now - sweepStart) / INTRO_MS
      if (t >= 1) return null
      const i = t < 0.5 ? 0 : 1
      const u = (t % 0.5) * 2
      const r = words[i]?.getBoundingClientRect()
      if (!r) return null
      const ease = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
      const from = i === 0 ? r.left - fontSize : r.right + fontSize
      const to = i === 0 ? r.right + fontSize : r.left - fontSize
      return { x: from + (to - from) * ease, y: r.top + r.height / 2 }
    }

    const tick = (now: number) => {
      frame = 0
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const kUp = 1 - Math.exp(-dt * ATTACK)
      const kDown = 1 - Math.exp(-dt * RELEASE)

      const p = pointer.on ? pointer : null
      let w: { x: number; y: number } | null = null
      if (sweepStart) {
        w = sweepPoint(now)
        if (!w) sweepStart = 0
      }

      const fx = fontSize * RX
      const fy = fontSize * RY
      let busy = false
      for (let i = 0; i < n; i++) {
        let target = 0
        if (p || w) {
          const r = cells[i].getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          if (p) {
            const dx = (p.x - cx) / fx
            const dy = (p.y - cy) / fy
            target = Math.exp(-(dx * dx + dy * dy))
          }
          if (w) {
            const dx = (w.x - cx) / fx
            const dy = (w.y - cy) / fy
            target = Math.max(target, Math.exp(-(dx * dx + dy * dy)) * 0.9)
          }
          if (target < 0.03) target = 0
        }
        if (pulse[i] > 0) {
          pulse[i] = Math.max(0, pulse[i] - dt / PULSE_S)
          target = Math.max(target, 1 - (1 - pulse[i]) ** 2)
          busy = true
        }
        const k = target > level[i] ? kUp : kDown
        let v = level[i] + (target - level[i]) * k
        if (Math.abs(v - target) < 0.004) v = target
        else busy = true
        level[i] = v
      }
      for (let i = 0; i < n; i++) {
        const v = level[i]
        const s =
          v === 0
            ? ""
            : `"wdth" ${(BASE.wdth + (PEAK.wdth - BASE.wdth) * v ** WDTH_CURVE).toFixed(1)}, "wght" ${Math.round(BASE.wght + (PEAK.wght - BASE.wght) * v)}`
        if (s !== written[i]) {
          glyphs[i].style.fontVariationSettings = s
          written[i] = s
        }
      }

      const moving = pointer.on && now - lastMove < SETTLE_MS
      if (busy || moving || sweepStart) frame = requestAnimationFrame(tick)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.on = true
      lastMove = performance.now()
      kick()
    }
    const onPointerLeave = () => {
      pointer.on = false
      kick()
    }
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      pointer.x = t.clientX
      pointer.y = t.clientY
      pointer.on = true
      lastMove = performance.now()
      kick()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length) return
      pointer.on = false
      kick()
    }
    const onKey = (e: KeyboardEvent) => {
      if (!visible || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return
      const ch = fold(e.key)
      let hit = false
      for (let i = 0; i < n; i++) {
        if (chars[i] === ch) {
          pulse[i] = 1
          hit = true
        }
      }
      if (hit) kick()
    }

    const ro = new ResizeObserver(() => {
      fontSize = parseFloat(getComputedStyle(root).fontSize)
    })
    ro.observe(root)

    const io = new IntersectionObserver(
      ([e]) => {
        visible = !!e?.isIntersecting
        if (!visible) return
        kick()
        // A onda de entrada, uma vez, se o ponteiro não estiver mexendo
        if (!introDone) {
          introDone = true
          introTimer = window.setTimeout(() => {
            if (!visible || performance.now() - lastMove < 400) return
            sweepStart = performance.now()
            kick()
          }, INTRO_DELAY)
        }
      },
      { threshold: 0.6 },
    )
    io.observe(root)

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onPointerLeave)
    window.addEventListener("touchstart", onTouch, { passive: true })
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("touchcancel", onTouchEnd, { passive: true })
    window.addEventListener("keydown", onKey)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(introTimer)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
      document.documentElement.removeEventListener("pointerleave", onPointerLeave)
      window.removeEventListener("touchstart", onTouch)
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
      window.removeEventListener("keydown", onKey)
      for (const g of glyphs) g.style.fontVariationSettings = ""
    }
  }, [])

  return (
    <p
      ref={ref}
      className={className}
      style={{ fontVariationSettings: BASE_FVS }}
    >
      <span className="sr-only">{lines.join(" ")}</span>
      {lines.map((line, i) => (
        <span key={i} aria-hidden className="block whitespace-nowrap">
          <span data-word className="inline-block">
            {Array.from(line).map((ch, k) => (
              <span
                key={k}
                data-ch={ch}
                className="inline-grid before:invisible before:col-start-1 before:row-start-1 before:content-[attr(data-ch)]"
              >
                <span
                  data-glyph
                  className="col-start-1 row-start-1 justify-self-center"
                >
                  {ch}
                </span>
              </span>
            ))}
          </span>
        </span>
      ))}
    </p>
  )
}
