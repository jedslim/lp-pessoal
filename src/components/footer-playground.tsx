"use client"

import { memo, useEffect, useImperativeHandle, useRef, type Ref } from "react"
import { Keycap, keyLight, paintKey } from "@/components/footer-keycap"
import {
  DROP_ORDER,
  KEYS,
  arrangedSpots,
  keySet,
  keyUnit,
  keyWidth,
  keysIn,
  type KeySet,
} from "@/components/footer-keys"
import type { KeyWorld, PhysKey } from "@/components/footer-physics"
import { cn } from "@/lib/utils"

/*
 * Palco das teclas do rodapé: J E D T E C e alguns símbolos caem quando o
 * chão do rodapé aparece, se empilham e podem ser arrastadas, jogadas e
 * empurradas (mouse e toque). Digitar uma letra delas faz a tecla pular;
 * digitar "jedtec" arruma tudo em fileiras.
 *
 * O matter-js (e o mundo de física) só carrega quando o rodapé está a ~1 tela
 * de distância. Fora da tela o laço para. Com reduced motion (ou se a física
 * não carregar), as teclas ficam paradas, empilhadas e arrumadas.
 *
 * O palco vai do topo do rodapé até o deck (a placa de teclado no chão),
 * acima do conteúdo, mas só as teclas recebem o ponteiro: os links continuam
 * clicáveis. Na horizontal ele tem a largura útil do deck (o container menos
 * o acolchoamento `--dp`): as paredes invisíveis são as bordas do deck. O
 * chão é a base de `[data-footer-floor]`, a área de jogo dentro do deck, que
 * tem duas fileiras de altura. O tamanho da tecla (`--u`) é escrito no
 * rodapé: o deck e os encaixes medem por ele.
 */

export type PlaygroundState = {
  /** idle: ainda não montou · live: física · still: paradas (reduced motion). */
  mode: "idle" | "live" | "still"
  /** As teclas estão arrumadas em fileiras. */
  arranged: boolean
  /** A pessoa já mexeu (a dica pode sair). */
  touched: boolean
}

export type PlaygroundHandle = { toggle: () => void }

const WORD = "jedtec"
/** Luzes de impacto no chão (rodízio). */
const GLOWS = 5

type Layout = { set: KeySet; width: number; floor: number; u: number }
type MatterModule = typeof import("matter-js")

/** memo: o estado do rodapé (rótulo do botão, dica) muda sem re-renderizar as teclas. */
export const FooterPlayground = memo(function FooterPlayground({
  ref,
  onState,
}: {
  ref?: Ref<PlaygroundHandle>
  onState: (s: PlaygroundState) => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const ctl = useRef<PlaygroundHandle | null>(null)
  useImperativeHandle(ref, () => ({ toggle: () => ctl.current?.toggle() }), [])

  useEffect(() => {
    const stage = stageRef.current
    const footer = stage?.closest("footer")
    const deck = footer?.querySelector<HTMLElement>("[data-footer-deck]")
    const floorEl = deck?.querySelector<HTMLElement>("[data-footer-floor]")
    if (!stage || !footer || !deck || !floorEl) return

    let state: PlaygroundState = { mode: "idle", arranged: false, touched: false }
    const emit = (patch: Partial<PlaygroundState>) => {
      const next = { ...state, ...patch }
      if (
        next.mode === state.mode &&
        next.arranged === state.arranged &&
        next.touched === state.touched
      )
        return
      state = next
      onState(state)
    }

    const els = new Map<string, HTMLElement>()
    stage
      .querySelectorAll<HTMLElement>("[data-key]")
      .forEach((el) => els.set(el.dataset.key ?? "", el))

    // A largura não depende de --u (o acolchoamento do deck é fixo), mas a
    // altura do deck sim: escreve --u antes de medir o chão
    const measure = (): Layout => {
      const width = stage.clientWidth
      const set = keySet(width)
      const u = keyUnit(width, set)
      if (footer.style.getPropertyValue("--u") !== `${u}px`)
        footer.style.setProperty("--u", `${u}px`)
      const floor =
        floorEl.getBoundingClientRect().bottom - stage.getBoundingClientRect().top
      return { set, width, floor, u }
    }

    const slots = new Map<string, HTMLElement>()
    stage
      .querySelectorAll<HTMLElement>("[data-slot]")
      .forEach((el) => slots.set(el.dataset.slot ?? "", el))

    /** Tamanho das teclas, quais entram neste jogo e onde ficam os encaixes. */
    const apply = (L: Layout) => {
      const spots = arrangedSpots(L.set, L.width, L.floor, L.u)
      for (const spec of KEYS) {
        const el = els.get(spec.id)
        const on = L.set === "full" || !spec.fullOnly
        if (el) {
          el.style.display = on ? "" : "none"
          el.style.setProperty("--kw", String(keyWidth(spec, L.set)))
        }
        const slot = slots.get(spec.id)
        const s = spots.get(spec.id)
        if (!slot) continue
        if (!on || !s) {
          slot.style.display = "none"
          continue
        }
        const w = keyWidth(spec, L.set) * L.u
        slot.style.display = "block"
        slot.style.width = `${w}px`
        slot.style.transform = `translate3d(${s.x - w / 2}px, ${s.y - L.u / 2}px, 0)`
      }
    }

    let L: Layout | null = null
    let Matter: MatterModule | null = null
    let world: KeyWorld | null = null
    let visible = false
    let wantDrop = false
    let dropped = false
    let disposed = false

    /* ---------- Paradas (reduced motion ou sem física) ---------- */

    const placeStill = (layout: Layout) => {
      const spots = arrangedSpots(layout.set, layout.width, layout.floor, layout.u)
      for (const spec of keysIn(layout.set)) {
        const el = els.get(spec.id)
        const s = spots.get(spec.id)
        if (!el || !s) continue
        const w = keyWidth(spec, layout.set) * layout.u
        el.style.transform = `translate3d(${s.x - w / 2}px, ${s.y - layout.u / 2}px, 0)`
        paintKey(el, keyLight(spec.tone, 0, layout.u))
      }
      stage.dataset.ready = ""
    }

    const still = () => {
      world?.destroy()
      world = null
      L = measure()
      apply(L)
      placeStill(L)
      stage.dataset.still = ""
      emit({ mode: "still", arranged: true })
    }

    /* ---------- Física ---------- */

    // A faixa de LED do chão acende onde a tecla bate, mais forte quanto
    // maior a queda (rodízio de poucos elementos, animados pelo navegador)
    const glows = [...stage.querySelectorAll<HTMLElement>("[data-glow]")]
    let glowAt = 0
    const flash = (x: number, strength: number) => {
      const g = glows[glowAt++ % glows.length]
      if (!g || !L) return
      g.style.left = `${x}px`
      g.style.top = `${L.floor}px`
      g.animate(
        [
          { opacity: 0.3 + strength * 0.7, transform: "scaleX(0.6)" },
          { opacity: 0, transform: "scaleX(1.4)" },
        ],
        { duration: 600 + strength * 500, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      )
    }

    const build = async () => {
      if (!Matter) return
      const { KeyWorld } = await import("@/components/footer-physics")
      if (disposed) return
      const layout = measure()
      L = layout
      apply(layout)
      const keys: PhysKey[] = keysIn(layout.set).map((spec) => {
        const el = els.get(spec.id)!
        return {
          id: spec.id,
          el,
          w: keyWidth(spec, layout.set) * layout.u,
          h: layout.u,
          keys: spec.keys,
          paint: (a, lift) => paintKey(el, keyLight(spec.tone, a, layout.u, lift)),
        }
      })
      world?.destroy()
      world = new KeyWorld(Matter, keys, layout)
      world.onPush = () => emit({ touched: true, arranged: false })
      world.onImpact = flash
      world.setVisible(visible)
      if (dropped) {
        // Recriado (a largura mudou): as teclas voltam arrumadas, sem nova queda
        world.place(arrangedSpots(layout.set, layout.width, layout.floor, layout.u))
        emit({ arranged: true })
      } else if (wantDrop) {
        dropped = true
        world.drop(DROP_ORDER)
      }
      stage.dataset.ready = ""
      emit({ mode: "live" })
    }

    const load = async () => {
      try {
        const mod = await import("matter-js")
        if (disposed) return
        Matter = (mod as { default?: MatterModule }).default ?? mod
        await build()
      } catch {
        if (!disposed) still()
      }
    }

    const toggle = () => {
      if (!world || !L || world.busy) return
      if (state.arranged) {
        world.scatter()
        emit({ arranged: false, touched: true })
        return
      }
      emit({ touched: true })
      world.arrange(arrangedSpots(L.set, L.width, L.floor, L.u), () =>
        emit({ arranged: true }),
      )
    }
    ctl.current = { toggle }

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches

    /* ---------- Observadores ---------- */

    // Carrega a física com o rodapé a ~1 tela de distância
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return
        near.disconnect()
        void load()
      },
      { rootMargin: "100% 0px 100% 0px" },
    )
    // Pausa fora da tela
    const vis = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
      world?.setVisible(visible)
    })
    // A queda começa quando o deck aparece
    const drop = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return
        drop.disconnect()
        wantDrop = true
        if (world && !dropped) {
          dropped = true
          world.drop(DROP_ORDER)
        }
      },
      { threshold: 0.5 },
    )

    let rz = 0
    const relayout = () => {
      if (!L) return
      const next = measure()
      if (state.mode === "still") {
        L = next
        apply(next)
        placeStill(next)
        return
      }
      if (!world) return
      if (next.width === L.width && next.u === L.u && next.set === L.set) {
        if (Math.abs(next.floor - L.floor) >= 1) {
          world.setFloor(next.floor)
          L = next
          apply(next)
        }
        return
      }
      void build()
    }
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rz)
      rz = requestAnimationFrame(relayout)
    })

    // O chão mexe se o rodapé muda de tamanho (fonte carregando no topo) ou
    // se o deck muda (largura, --u): observa os dois
    const watch = () => {
      ro.observe(footer)
      ro.observe(deck)
    }

    if (reduce) {
      still()
      watch()
      return () => {
        disposed = true
        ro.disconnect()
        cancelAnimationFrame(rz)
        ctl.current = null
      }
    }

    near.observe(footer)
    vis.observe(footer)
    drop.observe(deck)
    watch()

    /* ---------- Ponteiro: arrastar, jogar, empurrar ---------- */

    const toStage = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    let held: {
      id: string
      pid: number
      el: HTMLElement
      t0: number
      x0: number
      y0: number
      moved: boolean
    } | null = null

    const onDown = (e: PointerEvent) => {
      if (!world || e.button !== 0 || held) return
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-key]")
      const id = el?.dataset.key
      if (!el || !id) return
      const p = toStage(e)
      if (!world.grab(id, p.x, p.y)) return
      e.preventDefault()
      el.setPointerCapture?.(e.pointerId)
      el.dataset.held = ""
      held = { id, pid: e.pointerId, el, t0: performance.now(), x0: e.clientX, y0: e.clientY, moved: false }
      emit({ touched: true, arranged: false })
      if (e.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate(6)
    }

    const onMove = (e: PointerEvent) => {
      if (!world) return
      if (held) {
        if (e.pointerId !== held.pid) return
        if (Math.hypot(e.clientX - held.x0, e.clientY - held.y0) > 6) held.moved = true
        const p = toStage(e)
        world.moveGrab(p.x, p.y)
        return
      }
      // Mouse sem botão apertado empurra as teclas (só acima do chão: na linha
      // final, a caminho do "Voltar ao topo", não levanta nada por baixo)
      if (e.pointerType === "mouse" && e.buttons === 0) {
        const p = toStage(e)
        world.setPointer(L && p.y < L.floor - 2 ? p : null)
      }
    }

    const onUp = (e: PointerEvent) => {
      if (!held || e.pointerId !== held.pid) return
      const h = held
      held = null
      delete h.el.dataset.held
      world?.release()
      // Toque rápido, sem arrastar: a tecla pula
      if (!h.moved && performance.now() - h.t0 < 260) {
        world?.hop((k) => k.id === h.id)
      }
    }

    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") world?.setPointer(null)
    }

    /* ---------- Teclado físico ---------- */

    let typed = ""
    const dialogOpen = () =>
      document.documentElement.style.overflow === "hidden" ||
      [...document.querySelectorAll<HTMLElement>("[role='dialog'], [aria-modal='true']")].some(
        (d) => (d.checkVisibility ? d.checkVisibility() : d.offsetParent !== null),
      )
    const onKey = (e: KeyboardEvent) => {
      if (!world || !visible || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return
      // Com um diálogo aberto (política, menu) o rodapé fica quieto
      if (dialogOpen()) return
      const k = e.key.toLowerCase()
      if (!world.hop((key) => key.keys.includes(k))) {
        typed = ""
        return
      }
      emit({ touched: true, arranged: false })
      typed = (typed + k).slice(-WORD.length)
      if (typed === WORD) {
        typed = ""
        toggle()
      }
    }

    stage.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    footer.addEventListener("pointerleave", onLeave)
    window.addEventListener("keydown", onKey)

    return () => {
      disposed = true
      near.disconnect()
      vis.disconnect()
      drop.disconnect()
      ro.disconnect()
      cancelAnimationFrame(rz)
      stage.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      footer.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("keydown", onKey)
      world?.destroy()
      world = null
      ctl.current = null
    }
  }, [onState])

  return (
    // Mesmo container do rodapé; o palco tem a largura útil do deck
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      <div className="mx-auto h-full w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div
          ref={stageRef}
          className="relative mx-[var(--dp)] h-full opacity-0 transition-opacity duration-700 data-[ready]:opacity-100"
        >
          {/* Encaixes do deck: onde cada tecla assenta quando arrumada */}
          {KEYS.map((spec) => (
            <Socket key={spec.id} id={spec.id} wide={spec.w >= 2} />
          ))}
          <Glows />
          {KEYS.map((spec) => (
            <Keycap key={spec.id} spec={spec} />
          ))}
        </div>
      </div>
    </div>
  )
})

/**
 * Encaixe na placa: um rebaixo com um switch de haste vermelha no meio (e os
 * estabilizadores nas teclas largas). Com as teclas arrumadas
 * (`[data-arranged]` no rodapé), o LED do encaixe acende e vaza em volta da
 * tecla, como no teclado do Stack.
 */
function Socket({ id, wide }: { id: string; wide: boolean }) {
  return (
    <span data-slot={id} className="absolute top-0 left-0 hidden h-[var(--u)]">
      {/* Halo do LED: só aparece em volta da tecla assentada */}
      <span className="absolute inset-[calc(var(--u)*0.1)] rounded-[calc(var(--u)*0.16)] opacity-0 shadow-[0_0_calc(var(--u)*0.28)_calc(var(--u)*0.04)_rgb(229_9_20/0.5)] transition-opacity delay-150 duration-700 [[data-arranged]_&]:opacity-100" />
      <span
        className="absolute inset-[calc(var(--u)*0.035)] rounded-[calc(var(--u)*0.15)]"
        style={{
          background: "linear-gradient(180deg, #040405 0%, #08080a 60%, #0b0b0d 100%)",
          boxShadow: [
            "inset 0 calc(var(--u) * 0.06) calc(var(--u) * 0.09) rgb(0 0 0 / 0.95)",
            "inset 0 -1px 0 rgb(255 255 255 / 0.07)",
            "0 0 0 1px rgb(255 255 255 / 0.025)",
          ].join(", "),
        }}
      >
        {wide && (
          <>
            <Stab side="left" />
            <Stab side="right" />
          </>
        )}
        {/* Switch: carcaça, haste em cruz e o LED logo acima */}
        <span
          className="absolute top-1/2 left-1/2 size-[calc(var(--u)*0.46)] -translate-1/2 rounded-[calc(var(--u)*0.06)]"
          style={{
            background: "linear-gradient(180deg, #1b1b1f, #121215)",
            boxShadow:
              "inset 0 1px 0 rgb(255 255 255 / 0.08), 0 calc(var(--u) * 0.03) calc(var(--u) * 0.05) rgb(0 0 0 / 0.85)",
          }}
        >
          <span className="absolute top-1/2 left-1/2 h-[calc(var(--u)*0.045)] w-[calc(var(--u)*0.17)] -translate-1/2 rounded-[1px] bg-[#4d0c10] shadow-[inset_0_1px_0_rgb(255_110_110/0.16)]" />
          <span className="absolute top-1/2 left-1/2 h-[calc(var(--u)*0.17)] w-[calc(var(--u)*0.045)] -translate-1/2 rounded-[1px] bg-[#4d0c10] shadow-[inset_0_1px_0_rgb(255_110_110/0.16)]" />
          <span className="absolute top-[12%] left-1/2 size-[calc(var(--u)*0.045)] -translate-x-1/2 rounded-full bg-[#3a0d10] transition-[background-color,box-shadow] delay-150 duration-700 [[data-arranged]_&]:bg-[#ff3b42] [[data-arranged]_&]:shadow-[0_0_calc(var(--u)*0.06)_rgb(255_52_59/0.9)]" />
        </span>
      </span>
    </span>
  )
}

/** Estabilizador das teclas largas (↵ e espaço): carcaça pequena perto da ponta. */
function Stab({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={cn(
        "absolute top-1/2 h-[calc(var(--u)*0.3)] w-[calc(var(--u)*0.15)] -translate-y-1/2 rounded-[calc(var(--u)*0.035)]",
        side === "left" ? "left-[calc(var(--u)*0.22)]" : "right-[calc(var(--u)*0.22)]",
      )}
      style={{
        background: "linear-gradient(180deg, #19191c, #111113)",
        boxShadow:
          "inset 0 1px 0 rgb(255 255 255 / 0.06), 0 calc(var(--u) * 0.025) calc(var(--u) * 0.04) rgb(0 0 0 / 0.8)",
      }}
    >
      <span className="absolute top-1/2 left-1/2 size-[calc(var(--u)*0.05)] -translate-1/2 rounded-[1px] bg-[#4d0c10]" />
    </span>
  )
}

/** Luzes de impacto no chão do deck (rodízio). */
function Glows() {
  return (
    <>
      {Array.from({ length: GLOWS }, (_, i) => (
        <span
          key={i}
          data-glow
          className="absolute top-0 left-0 h-[calc(var(--u)*1.1)] w-[calc(var(--u)*3.2)] -translate-x-1/2 -translate-y-full opacity-0"
        >
          <span className="absolute inset-0 bg-[radial-gradient(50%_100%_at_50%_100%,rgb(255_52_59/0.5),rgb(229_9_20/0.16)_55%,transparent_100%)]" />
          <span className="via-red-light absolute inset-x-[18%] bottom-0 h-px bg-gradient-to-r from-transparent to-transparent" />
        </span>
      ))}
    </>
  )
}
