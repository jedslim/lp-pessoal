"use client"

import { Fragment, useEffect, useRef, type CSSProperties } from "react"
import { foldKey as fold, isTypingTarget } from "@/components/hero-typing"
import { cn } from "@/lib/utils"

/*
 * H1 da hero: o nome em fonte variável (Archivo, eixos wdth 62–125 e
 * wght 100–900). Em repouso o nome é um fio (expandido, peso 150). Perto do
 * ponteiro as letras ganham corpo até o peso 900, como se o cursor
 * "inflasse" o tipo; ao se afastar, voltam ao fio. Sem ponteiro mexendo,
 * uma onda de peso passa pelas letras de tempos em tempos (mostra que o
 * nome reage, sem pedir nada).
 *
 * Largura reservada: cada letra é um `inline-grid` com um "fantasma" em
 * ::before (o mesmo glifo, invisível, no estado base). No pico a letra fica
 * condensada (wdth 79) para o peso 900 caber na caixa do peso 150 (medido
 * glifo a glifo; o "t" é o mais justo). A largura cai numa curva (v^1.4):
 * no meio do caminho o tipo ainda é largo e o peso já subiu. A palavra nunca
 * muda de largura e a composição em camadas não anda.
 *
 * Digitação: apertar uma letra do teclado (fora de campos de texto) faz as
 * letras iguais do nome pulsarem, junto com as teclas 3D da hero.
 *
 * O texto vem pronto do servidor (sem JS é só o nome estático; o LCP não
 * espera script). O efeito escreve `font-variation-settings` direto no style
 * via rAF + lerp: nenhum setState por frame. Toque: reage ao arrastar.
 * Reduced motion: estático.
 *
 * O cursor de vidro (cursor-companion) também infla o nome: quando ele passa
 * pelas letras, avisa a posição da ponta com o evento `glass-cursor` na
 * window (detail { x, y, on }), que conta como um segundo ponteiro.
 */

/** Estado base e o pico, sob o cursor. */
const BASE = { wdth: 125, wght: 150 }
const PEAK = { wdth: 79, wght: 900 }
const BASE_FVS = `"wdth" ${BASE.wdth}, "wght" ${BASE.wght}`
/** A largura condensa mais tarde do que o peso sobe. */
const WDTH_CURVE = 1.4
/** Raio da influência, em `em` da fonte do H1 (elipse: mais larga que alta). */
const RX = 1.25
const RY = 1
/** Velocidade do lerp (1/s): sobe rápido, desce devagar. */
const ATTACK = 12
const RELEASE = 5.5
/** Depois do último movimento, segue medindo (o parallax da hero leva ~1,1 s). */
const SETTLE_MS = 1300
/** Varredura de abertura: mostra que o nome é "vivo". Atraso e duração (ms). */
const INTRO_DELAY = 1300
const INTRO_MS = 2000
/** Onda de repouso: a cada WAVE_EVERY ms, se o ponteiro está parado há
 *  WAVE_IDLE ms e não está em cima do nome. */
const WAVE_EVERY = 8500
const WAVE_IDLE = 3500
/** Pulso da digitação: quanto dura (s). */
const PULSE_S = 0.55

export type HeroNameLine = {
  text: string
  /** Classes da linha (camada, alinhamento, parallax). */
  className?: string
}

export function HeroName({
  label,
  lines,
  className,
  delay = 0,
  stagger = 0.14,
}: {
  /** Nome acessível do H1 (as letras ficam aria-hidden). */
  label: string
  lines: HeroNameLine[]
  className?: string
  /** Entrada linha a linha, em CSS (igual ao SplitLines `immediate`). */
  delay?: number
  stagger?: number
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const glyphs = Array.from(
      root.querySelectorAll<HTMLElement>("[data-glyph]"),
    )
    // A caixa reservada (pai) não muda de tamanho: é dela que sai o centro
    const cells = glyphs.map((g) => g.parentElement as HTMLElement)
    const chars = glyphs.map((g) => fold(g.textContent ?? ""))
    const lineEls = Array.from(
      root.querySelectorAll<HTMLElement>("[data-name-line]"),
    )
    const n = glyphs.length
    const level = new Float32Array(n) // 0 = base, 1 = pico
    const pulse = new Float32Array(n) // digitação (1 → 0)
    const written: string[] = new Array(n).fill("")

    const pointer = { x: 0, y: 0, on: false }
    // A ponta do cursor de vidro (evento `glass-cursor`)
    const ghost = { x: 0, y: 0, on: false }
    let fontSize = parseFloat(getComputedStyle(root).fontSize)
    let lastMove = 0
    let frame = 0
    let last = 0
    let visible = true
    let sweepStart = 0 // 0 = sem varredura em curso
    let sweepGain = 0.95
    let introDone = false

    const kick = () => {
      if (frame || !visible) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }

    // Ponteiro virtual da varredura: percorre a linha 1 e depois a 2
    const sweepPoint = (now: number) => {
      const t = (now - sweepStart) / INTRO_MS
      if (t >= 1) return null
      const i = t < 0.5 ? 0 : 1
      const u = (t % 0.5) * 2
      const r = lineEls[i]?.getBoundingClientRect()
      if (!r) return null
      const ease = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
      // Mede a palavra (o glifo), não a linha inteira: a linha pode ter
      // recuo para encostar no retrato
      const word = lineEls[i].querySelector("[data-word]")?.getBoundingClientRect() ?? r
      const from = i === 0 ? word.left - fontSize : word.right + fontSize
      const to = i === 0 ? word.right + fontSize : word.left - fontSize
      return { x: from + (to - from) * ease, y: word.top + word.height / 2 }
    }

    // Ponteiro parado em cima do nome: a onda não passa por cima dele
    const overName = () => {
      const r = root.getBoundingClientRect()
      return (
        pointer.on &&
        pointer.x > r.left - fontSize &&
        pointer.x < r.right + fontSize &&
        pointer.y > r.top &&
        pointer.y < r.bottom
      )
    }

    const tick = (now: number) => {
      frame = 0
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const kUp = 1 - Math.exp(-dt * ATTACK)
      const kDown = 1 - Math.exp(-dt * RELEASE)

      const p = pointer.on ? pointer : null
      const gp = ghost.on ? ghost : null
      let w: { x: number; y: number } | null = null
      if (sweepStart) {
        w = sweepPoint(now)
        if (!w) sweepStart = 0
      }

      // Leituras primeiro (layout limpo no início do frame), escritas depois
      const fx = fontSize * RX
      const fy = fontSize * RY
      let busy = false
      for (let i = 0; i < n; i++) {
        let target = 0
        if (p || w || gp) {
          const r = cells[i].getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          if (p) {
            const dx = (p.x - cx) / fx
            const dy = (p.y - cy) / fy
            target = Math.exp(-(dx * dx + dy * dy))
          }
          if (gp) {
            const dx = (gp.x - cx) / fx
            const dy = (gp.y - cy) / fy
            target = Math.max(target, Math.exp(-(dx * dx + dy * dy)))
          }
          if (w) {
            const dx = (w.x - cx) / fx
            const dy = (w.y - cy) / fy
            target = Math.max(target, Math.exp(-(dx * dx + dy * dy)) * sweepGain)
          }
          // Corte: com o cursor nos CTAs o nome fica no fio
          if (target < 0.03) target = 0
        }
        if (pulse[i] > 0) {
          pulse[i] = Math.max(0, pulse[i] - dt / PULSE_S)
          // Sobe no ato e solta em curva (ease-out)
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

      const moving = (pointer.on || ghost.on) && now - lastMove < SETTLE_MS
      if (busy || moving || sweepStart) frame = requestAnimationFrame(tick)
    }

    const startSweep = (gain: number) => {
      sweepGain = gain
      sweepStart = performance.now()
      kick()
    }

    const onPointerMove = (e: PointerEvent) => {
      // O toque é tratado pelos eventos de touch (seguem durante a rolagem)
      if (e.pointerType === "touch") return
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.on = true
      lastMove = performance.now()
      introDone = true
      kick()
    }
    const onGhost = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number; on: boolean }>).detail
      if (!d) return
      ghost.x = d.x
      ghost.y = d.y
      ghost.on = d.on
      if (d.on) {
        lastMove = performance.now()
        sweepStart = 0
        introDone = true
      }
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
      sweepStart = 0
      introDone = true
      kick()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length) return
      pointer.on = false
      kick()
    }
    // Uma letra do teclado acende as letras iguais do nome
    const onKey = (e: KeyboardEvent) => {
      if (!visible || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1 || isTypingTarget(e.target)) return
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

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) kick()
    })
    io.observe(root)

    // Abertura: uma varredura, depois que as linhas subiram, se a pessoa
    // ainda não mexeu o ponteiro
    const introTimer = window.setTimeout(() => {
      if (introDone || !visible) return
      introDone = true
      startSweep(0.95)
    }, INTRO_DELAY)

    // Onda de repouso: ponteiro parado (ou fora da página) e longe do nome
    const waveTimer = window.setInterval(() => {
      if (!visible || sweepStart || document.hidden) return
      if (performance.now() - lastMove < WAVE_IDLE || overName()) return
      startSweep(0.8)
    }, WAVE_EVERY)

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onPointerLeave)
    window.addEventListener("touchstart", onTouch, { passive: true })
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("touchcancel", onTouchEnd, { passive: true })
    window.addEventListener("keydown", onKey)
    window.addEventListener("glass-cursor", onGhost)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(introTimer)
      window.clearInterval(waveTimer)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      )
      window.removeEventListener("touchstart", onTouch)
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("glass-cursor", onGhost)
      for (const g of glyphs) g.style.fontVariationSettings = ""
    }
  }, [])

  return (
    <h1
      ref={ref}
      aria-label={label}
      className={className}
      style={{ fontVariationSettings: BASE_FVS }}
    >
      {lines.map((line, i) => (
        <Fragment key={i}>
          {/* Máscara da entrada: folga vertical para acentos e descendentes */}
          <span className="-my-[0.12em] block overflow-hidden py-[0.12em]">
            <span
              aria-hidden
              data-name-line
              className={cn("split-rise block whitespace-nowrap", line.className)}
              style={{ animationDelay: `${delay + i * stagger}s` } as CSSProperties}
            >
              <span data-word className="inline-block">
                {Array.from(line.text).map((ch, k) => (
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
          </span>
          {/* Espaço entre as linhas no texto do H1 (SEO, copiar e colar) */}
          {i < lines.length - 1 && " "}
        </Fragment>
      ))}
    </h1>
  )
}
