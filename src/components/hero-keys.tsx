"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import Image from "next/image"
import {
  motion,
  useAnimate,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
  type Transition,
} from "motion/react"
import {
  HERO_CURSOR,
  HERO_HEAD,
  HERO_KEYS,
  pickTrick,
  type HeroKeyDef,
  type HeroKeyId,
  type HeroKeyTrick,
} from "@/components/hero-scene-layout"
import { isTypingTarget } from "@/components/hero-typing"
import { cn } from "@/lib/utils"

/*
 * Teclas da hero em imagem (renders do Blender em WebP): o fallback da cena
 * 3D no celular, no tablet, com reduced motion ou sem WebGL. Mesmas teclas e
 * mesmas posições da cena (hero-scene-layout.ts), em `em` da composição a
 * partir do centro da cabeça.
 *
 * Fica DENTRO da composição da hero, sem z-index, opacity, transform ou
 * filter na raiz: cada tecla escolhe a própria camada e intercala com o nome
 * e a foto. No desktop com mouse (onde o 3D roda) fica escondida por CSS, e
 * volta se a <section> disser `data-hero3d="off"`.
 *
 * Movimento: flutua devagar, sobe em ritmos diferentes no scroll e, com
 * mouse, segue o mesmo parallax das camadas da hero (--hero-mx/--hero-my).
 * Reduced motion: parado.
 *
 * O cursor de vidro entra como mais uma imagem (o render 3/4 do
 * cursor-glass.glb), flutuando junto: no toque ele afunda, brilha e dá uma
 * volta. Com o cursor 3D da página ligado (html[data-glass-cursor=on]), some.
 *
 * Interação, igual à da cena 3D:
 *   toque/clique  a tecla afunda (a mesma mola da tecla "deploy" do
 *                 contato) e faz uma graça sorteada: afunda de novo como
 *                 um clique, pula, quica, treme ou leva um peteleco
 *   teclado       a tecla correspondente afunda enquanto estiver apertada
 *                 (⌘/Ctrl, K, { }, /, Enter) e as outras dão um pulinho
 * Nenhuma tecla navega: são decorativas (aria-hidden) e não entram no Tab.
 */

/** A imagem é maior que a base da tecla: pose inclinada + margem do recorte. */
const IMG_SCALE = 1.3

/** Mola da tecla "deploy" (contact-key-scene.tsx): desce seca (k 1700,
 *  ζ 0.8) e volta com um quique (k 420, ζ 0.4). damping = 2ζ√k. */
const PRESS: Transition = { type: "spring", stiffness: 1700, damping: 66, mass: 1 }
const RELEASE: Transition = { type: "spring", stiffness: 420, damping: 16.4, mass: 1 }
/** A volta do clique no cursor: mais solta, passa um pouco e volta. */
const SPIN: Transition = { type: "spring", stiffness: 140, damping: 15, mass: 1 }
const INSTANT: Transition = { duration: 0 }

/** As graças do clique, em keyframes (y e x em em, graus). */
function trickFrames(trick: HeroKeyTrick): {
  frames: Record<string, string[] | number[]>
  opts: Transition
} {
  switch (trick) {
    case "press":
      return {
        frames: { y: ["0em", "0.07em", "0em", "0.05em", "0em"], scale: [1, 0.9, 1.02, 0.95, 1] },
        opts: { duration: 0.5, times: [0, 0.18, 0.45, 0.62, 1], ease: "easeOut" },
      }
    case "jump":
      return {
        frames: {
          y: ["0em", "-0.55em", "0em", "-0.05em", "0em"],
          rotate: [0, -180, -360, -360, -360],
          scaleY: [1, 1.04, 0.86, 1.03, 1],
        },
        opts: { duration: 0.85, times: [0, 0.42, 0.78, 0.9, 1], ease: "easeInOut" },
      }
    case "bounce":
      return {
        frames: {
          y: ["0em", "-0.32em", "0em", "-0.16em", "0em", "-0.06em", "0em"],
          scaleY: [1, 1.03, 0.88, 1.02, 0.94, 1, 1],
        },
        opts: { duration: 0.95, times: [0, 0.2, 0.4, 0.56, 0.72, 0.84, 1], ease: "easeOut" },
      }
    case "shake":
      return {
        frames: { rotate: [0, -12, 10, -8, 6, -3, 0], x: ["0em", "-0.04em", "0.04em", "-0.03em", "0.02em", "0em", "0em"] },
        opts: { duration: 0.6, ease: "easeOut" },
      }
    case "flick": {
      const a = Math.random() * Math.PI * 2
      const r = 0.42
      const spin = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 30)
      return {
        frames: {
          x: ["0em", `${(Math.cos(a) * r).toFixed(3)}em`, `${(-Math.cos(a) * r * 0.18).toFixed(3)}em`, "0em"],
          y: ["0em", `${(Math.sin(a) * r).toFixed(3)}em`, `${(-Math.sin(a) * r * 0.18).toFixed(3)}em`, "0em"],
          rotate: [0, spin, -spin * 0.2, 0],
        },
        opts: { duration: 0.8, times: [0, 0.28, 0.66, 1], ease: "easeOut" },
      }
    }
  }
}

/** Camada (celular / desktop) e parallax de mouse por tecla: classes literais. */
const LOOK: Record<
  HeroKeyId,
  { z: string; par: string; drift: number; float: string; tilt?: string }
> = {
  cmd: {
    z: "z-[15]",
    par: "lg:translate-x-[calc(var(--hero-mx,0)*-16px)] lg:translate-y-[calc(var(--hero-my,0)*-9px)]",
    drift: 70,
    float: "[animation-delay:-1.2s] [animation-duration:6.5s]",
  },
  k: {
    z: "z-[15]",
    par: "lg:translate-x-[calc(var(--hero-mx,0)*-12px)] lg:translate-y-[calc(var(--hero-my,0)*-7px)]",
    drift: 46,
    float: "[animation-delay:-3.4s] [animation-duration:7.2s]",
  },
  brackets: {
    z: "z-[15]",
    par: "lg:translate-x-[calc(var(--hero-mx,0)*-7px)] lg:translate-y-[calc(var(--hero-my,0)*-4px)]",
    drift: 30,
    float: "[animation-delay:-2.1s] [animation-duration:8s]",
  },
  slash: {
    z: "z-[15]",
    par: "lg:translate-x-[calc(var(--hero-mx,0)*-8px)] lg:translate-y-[calc(var(--hero-my,0)*-5px)]",
    drift: 34,
    float: "[animation-delay:-4.6s] [animation-duration:7.6s]",
  },
  enter: {
    z: "z-[15]",
    par: "lg:translate-x-[calc(var(--hero-mx,0)*-10px)] lg:translate-y-[calc(var(--hero-my,0)*-6px)]",
    drift: 58,
    float: "[animation-delay:-0.4s] [animation-duration:6.8s]",
    // O render tem a legenda girada ~32° e o ↵ se lia como um ✓: girar a
    // imagem 20° no plano deixa a seta quase reta (a cena 3D usa uma pose
    // própria, de frente, com o mesmo efeito)
    tilt: "-rotate-[20deg]",
  },
}

/** Um "pulinho" das teclas que não foram apertadas. */
type Hop = { n: number; skip: readonly HeroKeyId[] }
const NO_KEYS: ReadonlySet<HeroKeyId> = new Set()

export function HeroKeys({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  // Digitação: quais teclas estão apertadas agora, e o contador de pulinhos
  const [down, setDown] = useState<ReadonlySet<HeroKeyId>>(NO_KEYS)
  const [hop, setHop] = useState<Hop>({ n: 0, skip: [] })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Só na tela e só quando é o fallback que aparece (escondido por CSS,
    // o observer diz "fora")
    let visible = false
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(el)

    // Guarda pelo `code` qual tecla desceu (o `key` do keyup pode mudar se o
    // Shift soltar antes)
    const held = new Map<string, HeroKeyId[]>()
    const sync = () => setDown(new Set([...held.values()].flat()))
    const onKeyDown = (e: KeyboardEvent) => {
      if (!visible || isTypingTarget(e.target)) return
      const ids = HERO_KEYS.filter((d) => d.keys.includes(e.key)).map((d) => d.id)
      if (!e.repeat) setHop((h) => ({ n: h.n + 1, skip: ids }))
      if (ids.length && !held.has(e.code)) {
        held.set(e.code, ids)
        sync()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!held.delete(e.code)) return
      sync()
    }
    const onBlur = () => {
      held.clear()
      sync()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      io.disconnect()
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "lg:pointer-fine:motion-safe:hidden [[data-hero3d=off]_&]:block [[data-hero3d=on]_&]:hidden",
        className,
      )}
    >
      {HERO_KEYS.map((def, i) => (
        <FallbackKey
          key={def.id}
          def={def}
          index={i}
          scrollY={scrollY}
          still={!!reduce}
          typed={down.has(def.id)}
          hop={hop}
        />
      ))}
      <FallbackCursor scrollY={scrollY} still={!!reduce} />
    </div>
  )
}

function FallbackKey({
  def,
  index,
  scrollY,
  still,
  typed,
  hop,
}: {
  def: HeroKeyDef
  index: number
  scrollY: MotionValue<number>
  still: boolean
  /** Apertada no teclado de verdade. */
  typed: boolean
  hop: Hop
}) {
  const look = LOOK[def.id]
  // Parallax de scroll: cada tecla sobe num ritmo
  const y = useTransform(scrollY, [0, 900], [0, -look.drift])
  const sm = def.sm
  const md = def.md ?? sm
  const vars = {
    "--ar": def.img.h / def.img.w,
    "--x": `${HERO_HEAD.sm.x + (sm?.x ?? 0)}em`,
    "--y": `${HERO_HEAD.sm.y + (sm?.y ?? 0)}em`,
    "--w": `${(sm?.size ?? 0) * IMG_SCALE}em`,
    "--xm": `${HERO_HEAD.sm.x + (md?.x ?? 0)}em`,
    "--ym": `${HERO_HEAD.sm.y + (md?.y ?? 0)}em`,
    "--wm": `${(md?.size ?? 0) * IMG_SCALE}em`,
    "--xl": `${HERO_HEAD.lg.x + def.lg.x}em`,
    "--yl": `${HERO_HEAD.lg.y + def.lg.y}em`,
    "--wl": `${def.lg.size * IMG_SCALE}em`,
  } as Record<string, string | number>

  // Aperto: desce no pointerdown, sobe no pointerup. Um toque dura ~60 ms:
  // segura o fundo o bastante para ser visto (como a tecla "deploy")
  const [pressed, setPressed] = useState(false)
  const upTimer = useRef<number | undefined>(undefined)
  const pressedAt = useRef(0)
  useEffect(() => () => window.clearTimeout(upTimer.current), [])

  const press = (e: PointerEvent) => {
    if (e.button !== 0) return
    window.clearTimeout(upTimer.current)
    pressedAt.current = performance.now()
    setPressed(true)
    // No Android o toque ganha um "tique" de tecla mecânica
    if (e.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate(8)
  }
  const release = () => {
    window.clearTimeout(upTimer.current)
    const wait = Math.max(0, 140 - (performance.now() - pressedAt.current))
    upTimer.current = window.setTimeout(() => setPressed(false), wait)
  }

  // Pulinho quando outra tecla do teclado é apertada
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const seen = useRef(hop.n)
  useEffect(() => {
    if (hop.n === seen.current) return
    seen.current = hop.n
    if (still || hop.skip.includes(def.id) || !scope.current) return
    animate(
      scope.current,
      { y: ["0em", "-0.16em", "0em", "-0.035em", "0em"] },
      { duration: 0.55, times: [0, 0.3, 0.62, 0.8, 1], ease: "easeOut", delay: index * 0.035 },
    )
  }, [hop, still, def.id, index, animate, scope])

  // Clique: uma graça sorteada (sem repetir a anterior)
  const [trickScope, animateTrick] = useAnimate<HTMLDivElement>()
  const lastTrick = useRef<HeroKeyTrick | null>(null)
  const playTrick = () => {
    if (still || !trickScope.current) return
    const trick = pickTrick(lastTrick.current)
    lastTrick.current = trick
    const { frames, opts } = trickFrames(trick)
    animateTrick(trickScope.current, frames, opts)
  }

  const down = pressed || typed
  const sink = { y: down ? 4 : 0, scale: down ? 0.94 : 1 }
  const spring = still ? INSTANT : down ? PRESS : RELEASE
  // A sombra encolhe quando a tecla desce (fica mais perto do "chão"). Fica
  // na tecla, não na imagem: assim não gira junto com o `tilt`
  const shadow = cn(
    "transition-[filter] duration-150 ease-out",
    down ? "drop-shadow-[0_3px_4px_rgb(0_0_0/0.5)]" : "drop-shadow-[0_12px_14px_rgb(0_0_0/0.5)]",
  )

  return (
    <motion.div
      data-hero-key={def.id}
      style={{ ...vars, y: still ? 0 : y }}
      className={cn(
        "absolute top-[calc(var(--y)-var(--w)*var(--ar)/2)] left-[calc(50%+var(--x)-var(--w)/2)] w-[var(--w)] md:top-[calc(var(--ym)-var(--wm)*var(--ar)/2)] md:left-[calc(50%+var(--xm)-var(--wm)/2)] md:w-[var(--wm)] lg:top-[calc(var(--yl)-var(--wl)*var(--ar)/2)] lg:left-[calc(50%+var(--xl)-var(--wl)/2)] lg:w-[var(--wl)]",
        !sm && (md ? "max-md:hidden" : "max-lg:hidden"),
        look.z,
      )}
    >
      <div
        className={cn(
          "ease-out-expo transition-[translate] duration-[1100ms] motion-reduce:transition-none",
          look.par,
        )}
      >
        <div className={cn("animate-float motion-reduce:animate-none", look.float)}>
          <div ref={scope}>
            <div ref={trickScope}>
              <motion.div
                animate={sink}
                transition={spring}
                onPointerDown={press}
                onPointerUp={release}
                onPointerCancel={release}
                onPointerLeave={() => pressed && release()}
                onClick={playTrick}
                className={cn(
                  "pointer-events-auto cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent]",
                  shadow,
                )}
              >
                <Image
                  src={def.img.src}
                  alt=""
                  width={def.img.w}
                  height={def.img.h}
                  sizes="(min-width: 1024px) 220px, 120px"
                  draggable={false}
                  className={cn("h-auto w-full select-none", look.tilt)}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** O cursor 3D em imagem: mesmo lugar da cena (HERO_CURSOR), centrado. */
function FallbackCursor({
  scrollY,
  still,
}: {
  scrollY: MotionValue<number>
  still: boolean
}) {
  const c = HERO_CURSOR
  const y = useTransform(scrollY, [0, 900], [0, -64])
  // A imagem tem margem: a seta ocupa `fill` da altura
  const w = (size: number) => `${size / c.img.fill}em`
  const vars = {
    "--x": `${HERO_HEAD.sm.x + c.sm.x}em`,
    "--y": `${HERO_HEAD.sm.y + c.sm.y}em`,
    "--w": w(c.sm.size),
    "--xm": `${HERO_HEAD.sm.x + c.md.x}em`,
    "--ym": `${HERO_HEAD.sm.y + c.md.y}em`,
    "--wm": w(c.md.size),
    "--xl": `${HERO_HEAD.lg.x + c.lg.x}em`,
    "--yl": `${HERO_HEAD.lg.y + c.lg.y}em`,
    "--wl": w(c.lg.size),
  } as Record<string, string | number>

  // Toque: afunda e acende o aro (brilho vermelho); o clique dá uma volta
  const [pressed, setPressed] = useState(false)
  const [spins, setSpins] = useState(0)
  const [flash, setFlash] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const press = (e: PointerEvent) => {
    if (e.button !== 0) return
    setPressed(true)
    setFlash(true)
    if (e.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate(8)
  }
  const release = () => {
    later(() => setPressed(false), 120)
    later(() => setFlash(false), 420)
  }

  return (
    <motion.div
      data-hero-cursor
      style={{ ...vars, y: still ? 0 : y }}
      className="absolute top-[calc(var(--y)-var(--w)/2)] left-[calc(50%+var(--x)-var(--w)/2)] z-[15] [html[data-glass-cursor=on]_&]:hidden w-[var(--w)] md:top-[calc(var(--ym)-var(--wm)/2)] md:left-[calc(50%+var(--xm)-var(--wm)/2)] md:w-[var(--wm)] lg:top-[calc(var(--yl)-var(--wl)/2)] lg:left-[calc(50%+var(--xl)-var(--wl)/2)] lg:w-[var(--wl)]"
    >
      <div className="ease-out-expo transition-[translate] duration-[1100ms] motion-reduce:transition-none lg:translate-x-[calc(var(--hero-mx,0)*-18px)] lg:translate-y-[calc(var(--hero-my,0)*-10px)]">
        <div className="animate-float [animation-delay:-2.7s] [animation-duration:5.8s] motion-reduce:animate-none">
          <motion.div
            animate={{ y: pressed ? 3 : 0, scale: pressed ? 0.93 : 1, rotateY: spins * 360 }}
            transition={still ? INSTANT : { ...(pressed ? PRESS : RELEASE), rotateY: SPIN }}
            onPointerDown={press}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={() => pressed && release()}
            onClick={() => !still && setSpins((s) => s + 1)}
            className={cn(
              "pointer-events-auto cursor-pointer touch-manipulation transition-[filter] duration-200 ease-out [-webkit-tap-highlight-color:transparent]",
              flash
                ? "drop-shadow-[0_0_14px_rgb(255_40_50/0.75)]"
                : "drop-shadow-[0_12px_14px_rgb(0_0_0/0.5)]",
            )}
          >
            <Image
              src={c.img.src}
              alt=""
              width={c.img.w}
              height={c.img.h}
              sizes="(min-width: 1024px) 240px, 96px"
              draggable={false}
              className="h-auto w-full select-none"
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
