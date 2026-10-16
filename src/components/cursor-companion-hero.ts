import type { Pt } from "@/components/cursor-companion-stops"

/*
 * A coreografia do cursor de vidro na hero (usada por
 * cursor-companion-canvas.tsx enquanto a parada atual é a hero):
 *
 *   1  voa até "Ver trabalhos", pousa a ponta e clica: o botão entra no
 *      hover de verdade (preenchimento, texto que rola e o leque de sites)
 *      e afunda como no :active. Nada navega
 *   2  vai até "Falar comigo" e clica do mesmo jeito (a prévia do WhatsApp
 *      abre e digita; o link não abre)
 *   3  passeia pelas letras de "Jedson" e de "Santos": a ponta avisa o nome
 *      (evento `glass-cursor`) e o peso da fonte sobe onde ela passa
 *   4  descansa ao lado do nome e recomeça, com variações (ordem dos botões,
 *      ponto de pouso, sentido do passeio, tempo de pausa)
 *
 * O hover dos botões é o do próprio React: um par pointerout/pointerover
 * sintético (pointerType "mouse") faz o onPointerEnter/Leave da pílula
 * rodar com a posição da ponta. A pessoa mexeu o mouse na hero: a
 * coreografia solta tudo na hora (sem deixar botão aceso) e o cursor volta a
 * mirar o mouse; recomeça depois de alguns segundos parado.
 */

/** Sem mexer o mouse na hero por este tempo (s), a coreografia volta. */
const RESUME_AFTER = 3.6

type Step =
  | { kind: "button"; index: 0 | 1; fx: number; fy: number; hold: number }
  | { kind: "name"; reverse: boolean }
  | { kind: "rest"; dur: number }

export type HeroShowFrame = {
  /** Ponta: alvo agora (px da janela). */
  tip: Pt
  /** Mira (ângulo de tela) ou null = pose natural de ponteiro. */
  aim: number | null
  /** Dispara o toque (afunda + anel) neste quadro. */
  tap: boolean
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)

export class HeroShow {
  private steps: Step[] = []
  private step = -1
  private at = 0
  private arrived = -1
  private pressed = false
  private hovered: HTMLElement | null = null
  private ghostOn = false
  private lastUser = -1e9
  private cycle = 0

  /** Movimento de verdade do mouse (px da janela). */
  noteUser(now: number, x: number, y: number) {
    const hero = document.querySelector("[data-hero-portrait]")?.closest("section")
    const r = hero?.getBoundingClientRect()
    if (r && y >= r.top && y <= r.bottom && x >= r.left && x <= r.right) {
      this.lastUser = now
      this.release(x, y)
    }
  }

  /** A pessoa está usando a hero (a coreografia espera). */
  yielding(now: number) {
    return now - this.lastUser < RESUME_AFTER
  }

  /** Saiu da hero (rolagem) ou o cursor foi desligado: solta tudo. */
  pause() {
    this.release()
    this.step = -1
  }

  private buttons() {
    return Array.from(document.querySelectorAll<HTMLElement>("[data-hero-ctas] a")).slice(0, 2)
  }

  private plan() {
    this.cycle++
    const talkFirst = this.cycle > 1 && Math.random() < 0.35
    const b = (index: 0 | 1): Step => ({
      kind: "button",
      index,
      fx: rnd(0.52, 0.7),
      fy: rnd(0.5, 0.66),
      hold: index === 0 ? rnd(1.5, 1.9) : rnd(2.1, 2.6),
    })
    this.steps = [
      ...(talkFirst ? [b(1), b(0)] : [b(0), b(1)]),
      { kind: "name", reverse: this.cycle % 2 === 0 },
      { kind: "rest", dur: rnd(2.2, 3.6) },
    ]
    this.step = 0
    this.arrived = -1
    this.pressed = false
  }

  /** Hover sintético: o React vê um ponteiro de mouse entrando/saindo. */
  private hover(el: HTMLElement, x: number, y: number) {
    const host = el.closest("section") ?? document.body
    const base = { bubbles: true, cancelable: true, composed: true, pointerType: "mouse", isPrimary: true, clientX: x, clientY: y }
    host.dispatchEvent(new PointerEvent("pointerout", { ...base, relatedTarget: el }))
    el.dispatchEvent(new PointerEvent("pointerover", { ...base, relatedTarget: host }))
    this.hovered = el
  }

  private release(x?: number, y?: number) {
    const el = this.hovered
    if (el) {
      this.hovered = null
      el.style.removeProperty("scale")
      // O mouse de verdade está em cima dele: o hover agora é da pessoa
      const real = x !== undefined && y !== undefined && document.elementFromPoint(x, y)?.closest("a") === el
      if (!real) {
        const r = el.getBoundingClientRect()
        const host = el.closest("section") ?? document.body
        const base = { bubbles: true, cancelable: true, composed: true, pointerType: "mouse", isPrimary: true, clientX: r.right + 4, clientY: r.top + r.height / 2 }
        el.dispatchEvent(new PointerEvent("pointerout", { ...base, relatedTarget: host }))
        host.dispatchEvent(new PointerEvent("pointerover", { ...base, relatedTarget: el }))
      }
    }
    this.ghost(null)
  }

  /** A ponta passando no nome (hero-name.tsx). */
  ghost(p: Pt | null) {
    if (!p && !this.ghostOn) return
    this.ghostOn = !!p
    window.dispatchEvent(new CustomEvent("glass-cursor", { detail: { x: p?.x ?? 0, y: p?.y ?? 0, on: !!p } }))
  }

  /**
   * Um quadro da coreografia. `tipNow` é onde a ponta está (mola), `rest` o
   * ponto de descanso da parada, `restAim` a mira dele, `s` a altura do cursor.
   */
  update(now: number, tipNow: Pt, rest: Pt, restAim: number, s: number): HeroShowFrame | null {
    if (this.yielding(now)) return null
    if (this.step < 0 || this.step >= this.steps.length) this.plan()
    const st = this.steps[this.step]
    const next = () => {
      this.step++
      this.arrived = -1
      this.pressed = false
      this.at = now
    }
    if (this.arrived < 0 && this.at === 0) this.at = now

    if (st.kind === "button") {
      const el = this.buttons()[st.index]
      const r = el?.getBoundingClientRect()
      if (!el || !r || r.width < 2) {
        next()
        return { tip: rest, aim: restAim, tap: false }
      }
      const tip = { x: r.left + r.width * st.fx, y: r.top + r.height * st.fy }
      const d = Math.hypot(tipNow.x - tip.x, tipNow.y - tip.y)
      if (this.arrived < 0) {
        // Chegou (ou demorou demais): pousa e entra no hover
        if (d < 2.5 || now - this.at > 2.2) {
          this.arrived = now
          this.hover(el, tip.x, tip.y)
        }
        return { tip, aim: null, tap: false }
      }
      const u = now - this.arrived
      let tap = false
      if (!this.pressed && u > 0.32) {
        this.pressed = true
        tap = true
        el.style.scale = "0.96"
      }
      if (this.pressed && u > 0.5) el.style.removeProperty("scale")
      if (u > st.hold) {
        this.release()
        next()
      }
      return { tip, aim: null, tap }
    }

    if (st.kind === "name") {
      const words = Array.from(document.querySelectorAll<HTMLElement>("h1 [data-name-line] [data-word]"))
      if (words.length < 2) {
        next()
        return { tip: rest, aim: restAim, tap: false }
      }
      // Caminho: a altura do meio das letras, um tico antes e depois de cada
      // palavra; "Jedson" e depois "Santos" (ou ao contrário)
      const path: Pt[] = []
      for (const w of words) {
        const r = w.getBoundingClientRect()
        const y = r.top + r.height * 0.56
        path.push({ x: r.left + s * 0.05, y }, { x: r.right - s * 0.05, y })
      }
      if (st.reverse) path.reverse()
      const start = path[0]
      if (this.arrived < 0) {
        if (Math.hypot(tipNow.x - start.x, tipNow.y - start.y) < 4 || now - this.at > 2.4) this.arrived = now
        return { tip: start, aim: null, tap: false }
      }
      const u = now - this.arrived
      // Cada palavra em ~1,6 s; o salto de uma linha para a outra em 0,55 s
      const seg = [1.6, 0.55, 1.6]
      let acc = 0
      let tip = path[path.length - 1]
      for (let i = 0; i < 3; i++) {
        if (u < acc + seg[i]) {
          const k = ease((u - acc) / seg[i])
          const a = path[i]
          const b = path[i + 1]
          tip = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
          break
        }
        acc += seg[i]
      }
      // O nome reage onde a ponta está de fato (a mola anda um tico atrás)
      this.ghost(tipNow)
      if (u > seg[0] + seg[1] + seg[2] + 0.35) {
        this.ghost(null)
        next()
      }
      return { tip, aim: null, tap: false }
    }

    // Descanso ao lado do nome
    if (this.arrived < 0) this.arrived = now
    if (now - this.arrived > st.dur) {
      this.step = -1
      this.at = 0
    }
    return { tip: rest, aim: restAim, tap: false }
  }
}
