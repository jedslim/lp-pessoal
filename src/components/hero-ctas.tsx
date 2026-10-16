"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import Image from "next/image"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"
import { ArrowDown, CheckCheck } from "lucide-react"
import { WhatsappIcon } from "@/components/brand-icons"
import { StatusDot } from "@/components/kit/status-dot"
import { projects } from "@/lib/projects"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

/*
 * CTAs da hero: "Ver trabalhos" e "Falar comigo". Aparecem de cara (sem
 * animação de entrada) e cada um mostra, no hover, para onde leva:
 *   Ver trabalhos  três sites do portfólio saem de trás do botão, em leque
 *   Falar comigo   a prévia da conversa no WhatsApp, com a mensagem que já
 *                  vai escrita sendo digitada
 * Os dois são magnéticos (o botão vem até o cursor e o texto vem um pouco
 * mais), o preenchimento claro cresce a partir do ponto onde o cursor
 * entrou e sai pelo ponto onde ele saiu, e um brilho acompanha o cursor por
 * dentro. No teclado, o foco faz o mesmo (prévia incluída). No toque, são
 * links diretos. Reduced motion: sem ímã, sem digitação, sem leque animado.
 */

/** A mensagem que o link do WhatsApp já leva (site.whatsapp). */
const MESSAGE = new URL(site.whatsapp).searchParams.get("text") ?? ""

/** Os sites do leque: três sites de cores bem diferentes. */
const FAN = ["eztec", "afabrica", "s-dot"]
  .map((slug) => projects.find((p) => p.slug === slug))
  .filter((p) => p !== undefined)

const SPRING = { stiffness: 260, damping: 18, mass: 0.6 }
/** Até onde o ímã alcança, além da borda do botão (px). */
const REACH = 56

/** Ponteiro fino e sem reduced motion (o ímã e as prévias). */
function useFinePointer() {
  const [fine, setFine] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)")
    const sync = () => setFine(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return fine
}

export function HeroCtas({ className }: { className?: string }) {
  // O leque só carrega as imagens quando o cursor chega perto dos botões
  const [primed, setPrimed] = useState(false)
  // Prévia aberta: o status, logo abaixo, sai da frente (a conversa já diz
  // "disponível")
  const [work, setWork] = useState(false)
  const [talk, setTalk] = useState(false)

  return (
    <div className={className}>
      {/* `data-hero-ctas`: a cena 3D mantém a tecla ↵ longe desta caixa */}
      <div
        data-hero-ctas
        onPointerEnter={(e) => e.pointerType === "mouse" && setPrimed(true)}
        className="relative grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3 sm:gap-y-4 lg:justify-start"
      >
        <WorkCta primed={primed} open={work} onOpen={setWork} />
        <TalkCta open={talk} onOpen={setTalk} />
      </div>

      <p
        className={cn(
          "text-muted-foreground mt-6 flex items-center gap-2.5 text-[13px] leading-none transition-opacity duration-300 sm:justify-center lg:justify-start",
          (work || talk) && "opacity-0",
        )}
      >
        <StatusDot />
        Disponível para projetos e vagas
      </p>
    </div>
  )
}

/* ---------- Pílula magnética com preenchimento ---------- */

type PillProps = {
  href: string
  label: string
  variant: "primary" | "ghost"
  icon: (on: boolean) => ReactNode
  /** Hover ou foco do teclado (abre a prévia). */
  onActive?: (on: boolean) => void
  external?: boolean
  /** Texto extra para leitor de tela. */
  srHint?: string
}

function MagneticPill({ href, label, variant, icon, onActive, external, srHint }: PillProps) {
  const reduce = useReducedMotion()
  const fine = useFinePointer()
  const wrap = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLAnchorElement>(null)
  const [on, setOn] = useState(false)

  // Ímã: o campo começa antes da borda (REACH) e puxa a pílula; o texto
  // e o ícone andam mais um pouco, como se estivessem soltos dentro dela
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, SPRING)
  const sy = useSpring(y, SPRING)
  const ix = useTransform(sx, (v) => v * 0.45)
  const iy = useTransform(sy, (v) => v * 0.45)

  useEffect(() => {
    const el = wrap.current
    if (!el || !fine || reduce) return
    let frame = 0
    let px = 0
    let py = 0
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        // A caixa de fora não se mexe: é dela que sai o centro
        const r = el.getBoundingClientRect()
        const inside =
          px > r.left - REACH && px < r.right + REACH && py > r.top - REACH && py < r.bottom + REACH
        if (!inside) {
          x.set(0)
          y.set(0)
          return
        }
        const dx = px - (r.left + r.width / 2)
        const dy = py - (r.top + r.height / 2)
        x.set(dx * 0.22)
        y.set(dy * 0.3)
      })
    }
    const reset = () => {
      x.set(0)
      y.set(0)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", reset)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", reset)
    }
  }, [fine, reduce, x, y])

  // Preenchimento: nasce onde o cursor entrou, some por onde ele saiu
  const place = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const a = pill.current
    if (!a) return
    const r = a.getBoundingClientRect()
    a.style.setProperty("--fx", `${(e.clientX - r.left).toFixed(1)}px`)
    a.style.setProperty("--fy", `${(e.clientY - r.top).toFixed(1)}px`)
    a.style.setProperty("--fw", `${r.width.toFixed(1)}px`)
  }
  const glow = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const a = pill.current
    if (!a) return
    const r = a.getBoundingClientRect()
    a.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(1)}px`)
    a.style.setProperty("--my", `${(e.clientY - r.top).toFixed(1)}px`)
  }
  const activate = (v: boolean) => {
    setOn(v)
    onActive?.(v)
  }

  const primary = variant === "primary"

  return (
    <div ref={wrap} className="relative z-10 sm:inline-block">
      <motion.a
        ref={pill}
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        data-on={on ? "" : undefined}
        style={{ x: sx, y: sy }}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return
          place(e)
          glow(e)
          activate(true)
        }}
        onPointerMove={(e) => e.pointerType === "mouse" && glow(e)}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return
          place(e)
          activate(false)
        }}
        onFocus={(e) => {
          if (!e.currentTarget.matches(":focus-visible")) return
          const a = e.currentTarget
          a.style.setProperty("--fx", "50%")
          a.style.setProperty("--fy", "50%")
          a.style.setProperty("--fw", `${a.offsetWidth}px`)
          activate(true)
        }}
        onBlur={() => activate(false)}
        className={cn(
          "group/cta relative flex h-12 w-full shrink-0 items-center justify-between gap-2 overflow-hidden rounded-full pr-1.5 pl-4 text-[14px] font-medium min-[390px]:gap-3 min-[390px]:pl-5 min-[390px]:text-[15px] sm:inline-flex sm:w-auto sm:pl-6 lg:pl-5 xl:pl-7 whitespace-nowrap outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-3 focus-visible:ring-red-light/60 active:scale-[0.97] transition-[box-shadow,scale,border-color] duration-300 [--fw:12rem] [--fx:50%] [--fy:50%] [--mx:50%] [--my:50%] lg:h-[3.25rem]",
          primary
            ? "bg-red-primary text-white shadow-[0_10px_40px_-12px_rgb(229_9_20/0.8)] data-[on]:shadow-[0_16px_50px_-14px_rgb(255_52_59/0.9)]"
            : "text-foreground border border-white/15 bg-white/[0.03] backdrop-blur-sm data-[on]:border-transparent",
        )}
      >
        {/* Preenchimento claro, do ponto de entrada */}
        <span
          aria-hidden
          className="bg-foreground pointer-events-none absolute top-[var(--fy)] left-[var(--fx)] size-[calc(var(--fw)*2.3)] -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-[scale] duration-[650ms] ease-out-expo group-data-[on]/cta:scale-100 motion-reduce:transition-none"
        />
        {/* Brilho que acompanha o cursor por dentro */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-data-[on]/cta:opacity-100",
            "bg-[radial-gradient(90px_circle_at_var(--mx)_var(--my),var(--glow),transparent_70%)]",
            primary ? "[--glow:rgb(255_52_59/0.28)]" : "[--glow:rgb(37_211_102/0.22)]",
          )}
        />

        {/* Texto que rola (a cópia de baixo assume) e anda com o ímã */}
        <motion.span style={{ x: ix, y: iy }} className="relative block overflow-hidden">
          <span className="ease-out-expo block transition-[translate,color] duration-500 group-data-[on]/cta:-translate-y-full motion-reduce:transition-none">
            {label}
          </span>
          <span
            aria-hidden
            className="text-background ease-out-expo absolute inset-0 block translate-y-full transition-[translate] duration-500 group-data-[on]/cta:translate-y-0 motion-reduce:transition-none"
          >
            {label}
          </span>
        </motion.span>
        {srHint && <span className="sr-only">{srHint}</span>}

        <motion.span
          aria-hidden
          style={{ x: ix, y: iy }}
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-500 xl:size-10",
            primary
              ? "bg-black/20 group-data-[on]/cta:bg-red-primary group-data-[on]/cta:text-white"
              : "bg-white/10 group-data-[on]/cta:bg-background",
          )}
        >
          {icon(on)}
        </motion.span>
      </motion.a>
    </div>
  )
}

/* ---------- Ver trabalhos: o leque de sites ---------- */

type Preview = { open: boolean; onOpen: (on: boolean) => void }

function WorkCta({ primed, open, onOpen }: Preview & { primed: boolean }) {
  const reduce = useReducedMotion()

  return (
    <div className="relative" data-companion="hero">
      <MagneticPill
        href="#trabalho"
        label="Ver trabalhos"
        variant="primary"
        onActive={onOpen}
        icon={() => (
          // A seta desce e uma nova entra por cima
          <span className="relative block size-4 overflow-hidden">
            <ArrowDown className="ease-out-expo absolute inset-0 size-4 transition-transform duration-500 group-data-[on]/cta:translate-y-full motion-reduce:transition-none" />
            <ArrowDown className="ease-out-expo absolute inset-0 size-4 -translate-y-full transition-transform duration-500 group-data-[on]/cta:translate-y-0 motion-reduce:transition-none" />
          </span>
        )}
      />

      {/* Os sites saem de trás do botão (z-0, o botão é z-10) */}
      {primed && (
        <div aria-hidden className="pointer-events-none absolute top-[calc(100%-14px)] left-3 z-0">
          <AnimatePresence>
            {open &&
              FAN.map((p, i) => (
                <motion.div
                  key={p.slug}
                  className="absolute top-0 left-0 w-[11rem] origin-top-left overflow-hidden rounded-lg shadow-[0_18px_40px_-12px_rgb(0_0_0/0.9)] ring-1 ring-white/15"
                  style={{ zIndex: 3 - i }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 0, y: -18, rotate: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    x: i * 98,
                    y: [30, 40, 34][i],
                    rotate: [-7, -1, 5][i],
                    scale: 1,
                    transition: reduce
                      ? { duration: 0.2 }
                      : { type: "spring", stiffness: 340, damping: 24, delay: i * 0.05 },
                  }}
                  exit={{
                    opacity: 0,
                    x: 0,
                    y: -18,
                    rotate: 0,
                    scale: 0.8,
                    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: (FAN.length - 1 - i) * 0.03 },
                  }}
                >
                  <Image
                    src={p.image.replace(".jpg", "-poster.webp")}
                    alt=""
                    width={1200}
                    height={594}
                    sizes="176px"
                    className="block aspect-[1200/594] w-full object-cover"
                  />
                  {i === FAN.length - 1 && (
                    <span className="bg-background/85 text-foreground absolute right-1.5 bottom-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] leading-none backdrop-blur-sm">
                      +{projects.length - FAN.length}
                    </span>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/* ---------- Falar comigo: a conversa já começada ---------- */

function TalkCta({ open, onOpen }: Preview) {
  return (
    <div className="relative">
      <MagneticPill
        href={site.whatsapp}
        label="Falar comigo"
        variant="ghost"
        external
        onActive={onOpen}
        srHint={` (abre o WhatsApp em nova aba com a mensagem: ${MESSAGE})`}
        icon={(on) => (
          <motion.span
            className="relative block"
            animate={on ? { rotate: [0, -16, 13, -9, 5, 0] } : { rotate: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <WhatsappIcon className="size-4 transition-colors duration-500 group-data-[on]/cta:text-[#25D366]" />
          </motion.span>
        )}
      />

      <AnimatePresence>{open && <ChatPreview key="chat" />}</AnimatePresence>
    </div>
  )
}

/** A conversa: "digitando…", a mensagem digitada e os dois tiques. */
function ChatPreview() {
  const reduce = useReducedMotion()
  const typed = useTyped(MESSAGE, !!reduce)
  const done = typed.length === MESSAGE.length

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.16 } }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="pointer-events-none absolute top-[calc(100%+12px)] left-0 z-20 w-[19rem] origin-top-left overflow-hidden rounded-2xl border border-white/10 bg-[#0b141a] shadow-[0_24px_60px_-18px_rgb(0_0_0/0.95)]"
    >
      {/* Cabeçalho da conversa */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#1f2c33]/60 px-3.5 py-2.5">
        <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-[#2a3942]">
          <Image
            src="/jed-foto-hd.webp"
            alt=""
            width={2244}
            height={2716}
            sizes="64px"
            className="absolute top-[-4%] left-1/2 w-[260%] max-w-none -translate-x-1/2"
          />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[13px] font-medium text-white">{site.name}</span>
          <span className="block text-[11.5px] text-emerald-400/90">disponível para projetos e vagas</span>
        </span>
        <WhatsappIcon className="ml-auto size-4 shrink-0 text-[#25D366]" />
      </div>

      {/* A mensagem (sai de você) */}
      <div className="flex min-h-[5.25rem] flex-col items-end justify-center gap-1.5 px-3.5 py-3">
        {typed.length === 0 ? (
          <span className="flex items-center gap-1 rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block size-1.5 rounded-full bg-white/70"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </span>
        ) : (
          <span className="relative max-w-[92%] rounded-lg rounded-tr-none bg-[#005c4b] px-3 pt-2 pb-1.5 text-[13.5px] leading-snug text-white">
            {typed}
            {!done && <span className="ml-px inline-block h-[1.05em] w-px translate-y-[0.15em] bg-white/80" />}
            <span className="ml-2 inline-flex translate-y-[2px] items-center gap-1 align-baseline text-[10.5px] text-white/55">
              agora
              <CheckCheck
                className={cn(
                  "size-3.5 transition-colors duration-500",
                  done ? "text-[#53bdeb]" : "text-white/40",
                )}
              />
            </span>
          </span>
        )}
      </div>

      <p className="text-muted-foreground border-t border-white/[0.06] px-3.5 py-2.5 text-[12px] leading-snug">
        A mensagem já vai escrita. É só enviar.
      </p>
    </motion.div>
  )
}

/** Digita o texto letra a letra (depois de um "digitando…" curto). */
function useTyped(text: string, instant: boolean) {
  const [count, setCount] = useState(instant ? text.length : 0)
  useEffect(() => {
    if (instant) return
    let id = 0
    const start = window.setTimeout(() => {
      id = window.setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            window.clearInterval(id)
            return c
          }
          return c + 1
        })
      }, 22)
    }, 420)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(id)
    }
  }, [text, instant])
  return text.slice(0, count)
}
