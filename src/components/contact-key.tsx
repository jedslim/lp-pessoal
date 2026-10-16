"use client"

import dynamic from "next/dynamic"
import Image from "next/image"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import type { KeyInput } from "@/components/contact-key-scene"
import { cn } from "@/lib/utils"

// three + R3F só baixam quando o palco se aproxima da tela
const Scene = dynamic(() => import("@/components/contact-key-scene"), { ssr: false })

// WebGL só com mouse de verdade e sem reduced motion; o resto usa os renders
const QUERY =
  "(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)"

let webgl: boolean | null = null
/** WebGL com aceleração (sem renderizador por software). Testa uma vez. */
function hasWebGL() {
  if (webgl === null) {
    try {
      const c = document.createElement("canvas")
      const opts: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true }
      const gl: WebGLRenderingContext | WebGL2RenderingContext | null =
        c.getContext("webgl2", opts) ?? c.getContext("webgl", opts)
      webgl = !!gl
      gl?.getExtension("WEBGL_lose_context")?.loseContext()
    } catch {
      webgl = false
    }
  }
  return webgl
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}
const getSnapshot = () => window.matchMedia(QUERY).matches && hasWebGL()
const getServerSnapshot = () => false

/**
 * A tecla vermelha "deploy ↵" do contato. No desktop é 3D de verdade: inclina
 * seguindo o mouse, desce um pouco no hover e vai até o fundo com mola ao
 * apertar, com o LED vazando por baixo. Soltar abre o WhatsApp (é um link
 * normal: Enter, clique do meio e leitor de tela funcionam). No toque, sem
 * WebGL ou com reduced motion, os renders up/down trocam no aperto.
 */
export function ContactKey({
  href,
  pressed = false,
  className,
}: {
  href: string
  /** Aperto vindo de fora (Enter global do palco). */
  pressed?: boolean
  className?: string
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const can3d = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [near, setNear] = useState(false)
  const [ready, setReady] = useState(false)
  const [lost, setLost] = useState(false)
  const [down, setDown] = useState(false)
  const input = useRef<KeyInput>({
    hover: false,
    down: false,
    pulse: false,
    visible: false,
    wake: () => {},
  })
  // Hora do último "soltar": o clique que vem logo depois não aperta de novo
  const released = useRef(0)
  const pressedAt = useRef(0)
  const upTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(upTimer.current), [])

  const live = can3d && !lost

  // Carrega antes de chegar; acorda/adormece a cena conforme a visibilidade
  useEffect(() => {
    const el = ref.current
    if (!el || !live) return
    const load = new IntersectionObserver(
      ([e]) => e?.isIntersecting && setNear(true),
      { rootMargin: "900px 0px" },
    )
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e) return
        input.current.visible = e.isIntersecting
        if (e.isIntersecting) input.current.wake()
      },
      // O canvas sangra 20% além do palco
      { rootMargin: "20% 0px" },
    )
    load.observe(el)
    seen.observe(el)
    return () => {
      load.disconnect()
      seen.disconnect()
    }
  }, [live])

  // Onda no piso do palco quando a tecla bate no fundo
  const rings = useRef<(SVGEllipseElement | null)[]>([])
  const ripple = useCallback((strength: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    rings.current.forEach((el, i) =>
      el?.animate(
        [
          { transform: "scale(1)", opacity: Math.min(1, strength) * (0.9 - i * 0.35) },
          { transform: `scale(${1.3 + i * 0.22})`, opacity: 0 },
        ],
        { duration: 800 + i * 260, delay: i * 60, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      ),
    )
  }, [])

  // Sem WebGL quem faz o aperto são os renders (e a onda sai daqui)
  const posterOnly = !live || !ready

  // Enter (global ou no link) aperta a tecla; o eco do clique do mouse, não.
  // Vai direto no DOM: o React não precisa re-renderizar por isso
  useEffect(() => {
    const i = input.current
    const pulse = pressed && performance.now() - released.current > 400
    i.pulse = pulse
    i.wake()
    if (ref.current) ref.current.dataset.pulse = String(pulse)
    if (pulse && posterOnly) ripple(0.7)
  }, [pressed, posterOnly, ripple])

  const set = useCallback((patch: Partial<Pick<KeyInput, "hover" | "down">>) => {
    Object.assign(input.current, patch)
    if (patch.down !== undefined) setDown(patch.down)
    input.current.wake()
  }, [])

  const press = () => {
    window.clearTimeout(upTimer.current)
    pressedAt.current = performance.now()
    set({ down: true })
    if (posterOnly) ripple(0.8)
  }

  const release = () => {
    if (!input.current.down) return
    released.current = performance.now()
    input.current.down = false
    input.current.wake()
    // Um toque dura ~60 ms: segura o render "down" o bastante para ser visto
    const wait = posterOnly ? Math.max(0, 140 - (released.current - pressedAt.current)) : 0
    window.clearTimeout(upTimer.current)
    upTimer.current = window.setTimeout(() => setDown(false), wait)
  }

  const onReady = useCallback(() => setReady(true), [])
  const onLost = useCallback(() => {
    setLost(true)
    setReady(false)
  }, [])

  return (
    <a
      ref={ref}
      data-companion="contact"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp sobre um projeto (abre em nova aba)"
      draggable={false}
      data-down={down}
      className={cn(
        "group/deploy cursor-pointer rounded-2xl outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-red-light/70 focus-visible:ring-offset-8 focus-visible:ring-offset-background",
        className,
      )}
      onPointerEnter={(e: PointerEvent) => e.pointerType === "mouse" && set({ hover: true })}
      onPointerLeave={() => {
        release()
        set({ hover: false })
      }}
      onPointerDown={(e: PointerEvent) => {
        if (e.button !== 0) return
        press()
        // No Android o toque ganha um "tique" de tecla mecânica
        if (e.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate(8)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && set({ hover: true })}
      onBlur={() => set({ hover: false })}
      // Espaço também aperta: desce no keydown, abre no keyup (como um botão)
      onKeyDown={(e: KeyboardEvent<HTMLAnchorElement>) => {
        if (e.key !== " ") return
        e.preventDefault()
        if (!e.repeat) press()
      }}
      onKeyUp={(e: KeyboardEvent<HTMLAnchorElement>) => {
        if (e.key !== " ") return
        release()
        e.currentTarget.click()
      }}
    >
      {/* Onda no piso: sai do trilho tracejado do palco (mesma elipse) */}
      <svg
        aria-hidden
        viewBox="0 0 700 500"
        fill="none"
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
      >
        {[0, 1].map((i) => (
          <ellipse
            key={i}
            ref={(el) => {
              rings.current[i] = el
            }}
            cx="350"
            cy="372"
            rx="238"
            ry="61"
            opacity="0"
            strokeWidth={1.5 - i * 0.5}
            vectorEffect="non-scaling-stroke"
            className="stroke-red-light [transform-box:fill-box] [transform-origin:center]"
          />
        ))}
      </svg>

      {/* Renders do Blender: poster do 3D e fallback (mesma câmera). O
          canvas aparece por cima do poster ainda opaco e só depois o poster
          sai: a troca não "pisca" */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          !posterOnly && "opacity-0 delay-700 duration-0",
        )}
      >
        {/* Aperto quase seco (75 ms), como uma tecla de verdade */}
        <Image
          src="/3d/key-deploy-up.webp"
          alt=""
          fill
          unoptimized
          draggable={false}
          sizes="(min-width: 768px) 44rem, 100vw"
          className="object-contain transition-opacity duration-75 group-data-[down=true]/deploy:opacity-0 group-data-[pulse=true]/deploy:opacity-0"
        />
        <Image
          src="/3d/key-deploy-down.webp"
          alt=""
          fill
          unoptimized
          draggable={false}
          sizes="(min-width: 768px) 44rem, 100vw"
          className="object-contain opacity-0 transition-opacity duration-75 group-data-[down=true]/deploy:opacity-100 group-data-[pulse=true]/deploy:opacity-100"
        />
      </span>

      {live && near && (
        <div
          aria-hidden
          className={cn(
            "ease-out-expo pointer-events-none absolute -inset-[20%] transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <Scene
            inputRef={input}
            stageRef={ref}
            bleed={0.2}
            onReady={onReady}
            onLost={onLost}
            onHit={ripple}
          />
        </div>
      )}
    </a>
  )
}
