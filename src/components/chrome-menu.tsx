"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Copy,
} from "lucide-react"
import {
  GithubIcon,
  LinkedinIcon,
  WhatsappIcon,
} from "@/components/brand-icons"
import {
  copyText,
  goTo,
  lockScroll,
  sections,
  trapTab,
  type SectionId,
} from "@/components/chrome-nav"
import { useScramble } from "@/components/chrome-scramble"
import { LiveClock } from "@/components/kit/live-clock"
import { StatusDot } from "@/components/kit/status-dot"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

/** id do dialog: o botão "Menu" do header aponta para ele (aria-controls). */
export const MENU_ID = "site-menu"

/** Anel de foco do chrome (header e menu). */
export const menuRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-red-light/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/** Logo JEDTEC: volta ao topo (com Lenis, se já estiver na home). */
export function SiteLogo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      aria-label="JEDTEC, voltar ao início"
      onClick={(e) => {
        onNavigate?.()
        // Já na home: sobe com Lenis em vez de recarregar a rota
        if (window.location.pathname === "/") {
          e.preventDefault()
          goTo(0)
        }
      }}
      // min-h-10: alvo de toque de 40px, o logo continua com 15px de altura
      className={cn("inline-flex min-h-10 items-center rounded-sm", menuRing)}
    >
      <Image
        src="/logo-jedtec.png"
        alt=""
        width={1950}
        height={230}
        loading="eager"
        sizes="160px"
        className="h-[15px] w-auto sm:h-[17px]"
      />
    </Link>
  )
}

/* ---------- Menu aberto: tela cheia ---------- */

/**
 * Menu em tela cheia (desktop e celular). À esquerda, as seções em display
 * grande, cada uma com uma linha do que tem lá; à direita, as ações já
 * abertas, em teclas que afundam no clique (a mesma família das teclas 3D
 * da hero e da tecla "deploy" do contato).
 * Esc, clique no fundo ou o botão fecham; o foco fica preso aqui dentro e
 * volta para o botão "Menu" ao fechar.
 */
export function SiteMenu({
  active,
  onClose,
}: {
  active: SectionId | null
  onClose: (restoreFocus?: boolean) => void
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const firstLink = useRef<HTMLAnchorElement>(null)
  const release = useRef<(() => void) | null>(null)
  const closing = useRef(false)
  const [hovered, setHovered] = useState<SectionId | null>(null)

  const close = useCallback(
    (restoreFocus = true) => {
      if (closing.current) return
      closing.current = true
      release.current?.()
      onClose(restoreFocus)
    },
    [onClose],
  )

  useEffect(() => {
    release.current = lockScroll()
    firstLink.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (closing.current) return
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      } else trapTab(e, ref.current)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      release.current?.()
      window.removeEventListener("keydown", onKey)
    }
  }, [close])

  // Toque num item: a palavra embaralha um instante e só então o menu fecha
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(pending.current), [])
  const navigate = (hash: `#${string}`, wait: number) => {
    if (closing.current || pending.current) return
    const go = () => {
      if (closing.current) return
      close(false)
      goTo(hash)
    }
    if (wait <= 0) go()
    else pending.current = setTimeout(go, wait)
  }

  // Clique no fundo (fora da lista, das ações e dos botões) fecha
  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest("a, button, [data-menu-keep]")) return
    close()
  }

  const curtain = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { clipPath: "inset(0% 0% 100% 0%)" },
        animate: { clipPath: "inset(0% 0% 0% 0%)" },
        exit: {
          clipPath: "inset(0% 0% 100% 0%)",
          transition: { duration: 0.55, ease: EASE },
        },
      }

  return (
    <motion.div
      ref={ref}
      id={MENU_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      {...curtain}
      transition={{ duration: 0.7, ease: EASE }}
      onClick={onBackdrop}
      className="bg-background fixed inset-0 z-[70]"
    >
      {/* Papel milimetrado que some para baixo + um único brilho, atrás das
          ações. Fica fora da rolagem: o brilho não cria altura extra. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(120%_70%_at_20%_0%,black,transparent)]" />
        <div className="bg-red-deep/70 absolute -bottom-72 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-[120px] lg:-right-48 lg:left-auto lg:size-[44rem] lg:translate-x-0" />
      </div>

      {/* A rolagem fica numa camada própria (celular e telas baixas) */}
      <div
        data-lenis-prevent
        className="absolute inset-0 overflow-y-auto overscroll-contain"
      >
        <div className="relative mx-auto flex min-h-full max-w-[1440px] flex-col px-5 sm:px-8 lg:px-12">
          {/* Mesma linha do header: "Fechar" ocupa o lugar do "Menu" */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            <SiteLogo onNavigate={() => close(false)} />
            <CloseButton onClose={() => close()} />
          </div>

          <div className="grid flex-1 content-start gap-y-10 pt-2 pb-10 sm:pt-6 lg:grid-cols-12 lg:gap-x-12 lg:pt-[clamp(1rem,3.5vh,2.5rem)] lg:pb-8">
            <nav aria-label="Seções" data-menu-keep className="lg:col-span-7">
              <MenuHeading delay={0.2}>Seções</MenuHeading>
              <ul
                onPointerLeave={() => setHovered(null)}
                onBlur={(e) => {
                  // O foco saiu da lista (Tab para as ações): ninguém fica apagado
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setHovered(null)
                }}
              >
                {sections.map((s, i) => (
                  <MenuItem
                    key={s.id}
                    id={s.id}
                    label={s.label}
                    blurb={s.blurb}
                    order={i}
                    current={active === s.id}
                    dimmed={hovered !== null && hovered !== s.id}
                    linkRef={i === 0 ? firstLink : undefined}
                    onHover={() => setHovered(s.id)}
                    onNavigate={(wait) => navigate(`#${s.id}`, wait)}
                  />
                ))}
              </ul>
            </nav>

            <aside
              aria-label="Fale comigo"
              data-menu-keep
              className="flex flex-col lg:col-span-5 xl:col-span-4 xl:col-start-9"
            >
              {/* Link externo abre em outra aba: o menu fecha e o foco volta ao
                  botão "Menu", para quem voltar à aba encontrar a página */}
              <Actions onLeave={() => close()} />
            </aside>
          </div>

          {/* Rodapé do menu: a hora daqui e como sair */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-muted-foreground flex min-h-14 shrink-0 items-center justify-between gap-4 border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)] text-sm"
          >
            <p>
              Horário de Brasília{" "}
              <LiveClock zoneLabel={null} className="text-foreground ml-1" />
            </p>
            <div className="flex items-center gap-6">
              <p className="hidden items-center gap-2 pointer-fine:flex">
                <kbd className="text-foreground inline-flex h-6 items-center rounded-md border border-white/15 bg-white/[0.04] px-1.5 font-mono text-xs shadow-[inset_0_-1px_0_rgb(255_255_255/0.08)]">
                  Esc
                </kbd>
                fecha o menu
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

/* ---------- Peças ---------- */

function MenuHeading({
  children,
  delay,
}: {
  children: ReactNode
  delay: number
}) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="text-muted-foreground mb-3 text-sm font-medium lg:mb-4"
    >
      {children}
    </motion.p>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  const [text, scramble] = useScramble("FECHAR")
  return (
    <button
      type="button"
      onClick={onClose}
      onPointerEnter={scramble}
      aria-label="Fechar menu"
      className={cn(
        "group/close text-foreground flex h-10 items-center gap-3 rounded-full border border-white/15 bg-white/[0.05] pr-3 pl-4 font-mono text-[12px] tracking-[0.16em] uppercase transition-[border-color,background-color] duration-300 hover:border-white/35 hover:bg-white/[0.09] active:translate-y-px",
        menuRing,
      )}
    >
      <span aria-hidden className="w-[6.4ch] text-left">
        {text}
      </span>
      <span
        aria-hidden
        className="ease-out-expo relative block size-[18px] transition-transform duration-500 group-hover/close:rotate-90"
      >
        <span className="bg-foreground absolute top-1/2 left-0 h-px w-full rotate-45" />
        <span className="bg-foreground absolute top-1/2 left-0 h-px w-full -rotate-45" />
      </span>
    </button>
  )
}

/** Tempo do embaralhar no toque, antes de o menu fechar e rolar. */
const TAP_SCRAMBLE = 200

/**
 * Uma seção do menu. O nome sobe da máscara e "decodifica" no mesmo stagger
 * (o scramble do nav); no hover embaralha de novo, desliza um passo e as
 * outras recuam, para a leitura ficar só nela. Ao tocar, embaralha por um
 * instante antes de navegar.
 */
function MenuItem({
  id,
  label,
  blurb,
  order,
  current,
  dimmed,
  linkRef,
  onHover,
  onNavigate,
}: {
  id: SectionId
  label: string
  blurb: string
  order: number
  current: boolean
  dimmed: boolean
  linkRef?: RefObject<HTMLAnchorElement | null>
  onHover: () => void
  onNavigate: (wait: number) => void
}) {
  const reduce = useReducedMotion()
  // Mesmo atraso da subida da máscara: a palavra se resolve enquanto pousa
  const delay = 220 + order * 55
  const [text, play, run] = useScramble(label, {
    preserveCase: true,
    duration: 640,
  })
  const pressedAt = useRef<number | null>(null)

  useEffect(() => {
    const t = setTimeout(play, delay)
    return () => clearTimeout(t)
  }, [play, delay])

  return (
    <li className="border-b border-white/[0.09] first:border-t">
      <a
        ref={linkRef}
        href={`#${id}`}
        aria-current={current ? "location" : undefined}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          pressedAt.current = performance.now()
          run(TAP_SCRAMBLE)
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return
          play()
          onHover()
        }}
        onFocus={(e) => {
          if (!e.currentTarget.matches(":focus-visible")) return
          play()
          onHover()
        }}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return
          e.preventDefault()
          // Enter do teclado não passa pelo pointerdown: embaralha aqui
          if (pressedAt.current === null) run(TAP_SCRAMBLE)
          const since =
            pressedAt.current === null ? 0 : performance.now() - pressedAt.current
          pressedAt.current = null
          onNavigate(reduce ? 0 : Math.max(0, TAP_SCRAMBLE - since))
        }}
        className={cn(
          "group/item relative flex items-center gap-4 py-[clamp(0.7rem,1.5vh,1.1rem)] outline-none transition-opacity duration-300 sm:gap-6 lg:py-[clamp(0.6rem,1.5vh,1.1rem)]",
          dimmed && "opacity-40",
        )}
      >
        {/* Filete vermelho que corre pela linha da seção no hover/foco */}
        <span
          aria-hidden
          className="bg-red-light ease-out-expo absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 shadow-[0_0_10px_rgb(255_52_59/0.8)] transition-transform duration-700 group-hover/item:scale-x-100 group-focus-visible/item:scale-x-100"
        />

        <span className="ease-out-expo min-w-0 flex-1 transition-transform duration-500 group-hover/item:translate-x-2 group-focus-visible/item:translate-x-2 lg:group-hover/item:translate-x-4 lg:group-focus-visible/item:translate-x-4">
          {/* Cada nome sobe de dentro da própria máscara */}
          <span className="-my-[0.12em] block overflow-hidden py-[0.12em]">
            <motion.span
              initial={reduce ? false : { y: "110%" }}
              animate={{ y: 0 }}
              transition={{ delay: delay / 1000, duration: 0.85, ease: EASE }}
              className={cn(
                // nowrap: um glifo largo no meio do embaralhar não quebra a linha
                "text-display block text-[clamp(1.85rem,8.2vw,3.5rem)] leading-[0.95] whitespace-nowrap lg:text-[clamp(2.4rem,min(4vw,6.3vh),4rem)]",
                current ? "text-foreground" : "text-foreground/90",
              )}
            >
              <span aria-hidden>{text}</span>
              <span className="sr-only">{label}</span>
            </motion.span>
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + order * 0.055, duration: 0.6 }}
            className="text-foreground/60 group-hover/item:text-foreground/90 group-focus-visible/item:text-foreground/90 mt-1.5 block text-sm leading-snug transition-colors duration-300 sm:text-base lg:mt-2"
          >
            {blurb}
          </motion.span>
        </span>

        {current ? (
          <span className="text-red-light flex shrink-0 items-center gap-2 text-sm font-medium">
            <span
              aria-hidden
              className="bg-red-light size-1.5 rounded-full shadow-[0_0_8px_rgb(255_52_59/0.9)]"
            />
            <span className="hidden sm:inline">Você está aqui</span>
            <span className="sm:hidden">Aqui</span>
          </span>
        ) : (
          <span
            aria-hidden
            // No celular é só a seta (a linha inteira é o alvo); do sm em diante, a bolinha
            className="text-foreground/60 sm:group-hover/item:border-red-light/60 sm:group-hover/item:bg-red-primary sm:group-focus-visible/item:border-red-light/60 sm:group-focus-visible/item:bg-red-primary flex size-6 shrink-0 items-center justify-center rounded-full transition-[background-color,border-color,color] duration-300 group-hover/item:text-white group-focus-visible/item:text-white sm:size-11 sm:border sm:border-white/12 lg:size-12"
          >
            <ArrowRight className="ease-out-expo size-[18px] transition-transform duration-500 group-hover/item:translate-x-0.5 lg:size-5" />
          </span>
        )}
      </a>
    </li>
  )
}

/* ---------- Ações: teclas que afundam ---------- */

/**
 * Tecla física em CSS: corpo grafite, saia escura embaixo (o curso da tecla)
 * e rim vermelho no hover, como os renders do Blender. No clique ela desce
 * o curso inteiro; no hover, um pouco.
 */
const keyBase =
  "group/key relative flex w-full items-center gap-4 rounded-2xl border text-left select-none transition-[translate,box-shadow,border-color,background-color] duration-200 ease-out hover:translate-y-px active:translate-y-[4px] motion-reduce:transition-none " +
  menuRing

const keyTone = {
  graphite:
    "text-foreground border-white/[0.09] bg-[linear-gradient(180deg,#1c1c20_0%,#131316_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_5px_0_#060607,0_16px_30px_-14px_rgb(0_0_0/0.95)] hover:border-red-light/40 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.09),0_4px_0_#060607,0_0_0_1px_rgb(255_52_59/0.1),0_16px_34px_-14px_rgb(229_9_20/0.4)] active:shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_1px_0_#060607,0_6px_14px_-10px_rgb(0_0_0/0.9)]",
  red: "text-white border-red-light/50 bg-[linear-gradient(180deg,#f3141e_0%,#c80711_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_5px_0_#6d060b,0_20px_44px_-14px_rgb(229_9_20/0.8)] hover:bg-[linear-gradient(180deg,#ff2a33_0%,#d60812_100%)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_4px_0_#6d060b,0_20px_48px_-14px_rgb(255_52_59/0.9)] active:shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_0_#6d060b,0_8px_20px_-10px_rgb(229_9_20/0.6)]",
} as const

type Icon = ComponentType<{ className?: string }>

/** O texto que cada link do WhatsApp já leva preenchido (vem do próprio link). */
const messages = {
  project: new URL(site.whatsappProject).searchParams.get("text") ?? "",
  job: new URL(site.whatsappJob).searchParams.get("text") ?? "",
}
type Message = keyof typeof messages

/**
 * Prévia da conversa: mostra a mensagem que vai pronta para o WhatsApp.
 * Passar o mouse (ou o foco) em "Tenho uma vaga" troca a mensagem, com o
 * "digitando…" e a digitação de uma conversa de verdade.
 */
function useChatPreview() {
  const reduce = useReducedMotion()
  const [text, setText] = useState(messages.project)
  const [typing, setTyping] = useState(false)
  const current = useRef<Message>("project")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const raf = useRef(0)

  const stop = useCallback(() => {
    clearTimeout(timer.current)
    cancelAnimationFrame(raf.current)
  }, [])
  useEffect(() => stop, [stop])

  const say = useCallback(
    (next: Message) => {
      if (current.current === next) return
      current.current = next
      stop()
      const full = messages[next]
      if (reduce) {
        setTyping(false)
        setText(full)
        return
      }
      setText("")
      setTyping(true)
      timer.current = setTimeout(() => {
        setTyping(false)
        const start = performance.now()
        const step = (now: number) => {
          const n = Math.min(full.length, Math.ceil((now - start) / 14))
          setText(full.slice(0, n))
          if (n < full.length) raf.current = requestAnimationFrame(step)
        }
        raf.current = requestAnimationFrame(step)
      }, 420)
    },
    [reduce, stop],
  )

  return { text, typing, say }
}

function Actions({ onLeave }: { onLeave: () => void }) {
  const chat = useChatPreview()
  return (
    <>
      <Rise order={0}>
        <MenuHeading delay={0.2}>Fale comigo</MenuHeading>
        {/* Quem atende, como no topo de uma conversa: rosto, nome e o "online" */}
        <div className="flex items-center gap-4">
          <span className="relative size-14 shrink-0 lg:size-16">
            <span className="absolute inset-0 overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_30%,#2a2a2f,#121215_70%)]">
              <Image
                src="/jed-foto-hd.webp"
                alt=""
                width={2244}
                height={2716}
                sizes="160px"
                className="absolute top-[7%] left-1/2 w-[235%] max-w-none -translate-x-1/2"
              />
            </span>
            <StatusDot className="ring-background absolute right-0.5 bottom-0.5 rounded-full ring-[3px]" />
          </span>
          <span className="min-w-0">
            <span className="text-foreground block text-[17px] leading-tight font-medium lg:text-lg">
              Jedson Santos
            </span>
            <span className="mt-1.5 block text-[15px] leading-tight text-emerald-300/90">
              Disponível para projetos e vagas
            </span>
          </span>
        </div>
      </Rise>

      {/* Desktop: a mensagem que vai pronta, como numa conversa */}
      <Rise
        order={1}
        className="hidden flex-1 flex-col justify-center py-8 lg:flex"
      >
        <ChatBubble text={chat.text} typing={chat.typing} />
      </Rise>

      <div className="mt-6 flex flex-col gap-3 lg:mt-0">
        <Rise order={2}>
          <KeyLink
            href={site.whatsappProject}
            tone="red"
            icon={WhatsappIcon}
            onClick={onLeave}
            onPreview={() => chat.say("project")}
          >
            Conversar sobre um projeto
          </KeyLink>
        </Rise>
        <Rise order={3}>
          <KeyLink
            href={site.whatsappJob}
            icon={WhatsappIcon}
            onClick={onLeave}
            onPreview={() => chat.say("job")}
          >
            Tenho uma vaga
          </KeyLink>
        </Rise>
        <Rise order={3} className="lg:hidden">
          <p className="text-muted-foreground px-1 pb-1 text-sm leading-snug">
            Os dois abrem o WhatsApp com a mensagem pronta.
          </p>
        </Rise>
        <Rise order={4}>
          <CopyPhoneKey />
        </Rise>
        <Rise order={5} className="grid grid-cols-2 gap-3">
          <KeyLink
            href={site.linkedin}
            icon={LinkedinIcon}
            compact
            onClick={onLeave}
          >
            LinkedIn
          </KeyLink>
          <KeyLink
            href={site.github}
            icon={GithubIcon}
            compact
            onClick={onLeave}
          >
            GitHub
          </KeyLink>
        </Rise>
      </div>
    </>
  )
}

/** Entrada em cascata das ações, depois das seções. */
function Rise({
  order,
  className,
  children,
}: {
  order: number
  className?: string
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42 + order * 0.06, duration: 0.6, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function KeyLink({
  href,
  tone = "graphite",
  icon: IconCmp,
  compact = false,
  onClick,
  onPreview,
  children,
}: {
  href: string
  tone?: keyof typeof keyTone
  icon: Icon
  compact?: boolean
  onClick?: () => void
  /** Hover ou foco: mostra a mensagem que este link leva (prévia da conversa). */
  onPreview?: () => void
  children: ReactNode
}) {
  const isWhatsapp = IconCmp === WhatsappIcon
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      onPointerEnter={onPreview}
      onFocus={onPreview}
      className={cn(
        keyBase,
        keyTone[tone],
        compact ? "h-14 gap-3 px-4" : "min-h-16 py-3 pr-3 pl-5",
      )}
    >
      {compact && <IconCmp className="size-[18px] shrink-0 opacity-90" />}
      <span
        className={cn(
          "min-w-0 flex-1 leading-tight font-medium",
          compact ? "text-[15px]" : "text-[17px]",
        )}
      >
        {children}
      </span>
      <span className="sr-only">
        {isWhatsapp ? " (abre o WhatsApp em nova aba)" : " (abre em nova aba)"}
      </span>
      {compact ? (
        <ArrowUpRight
          aria-hidden
          className="ease-out-expo size-4 shrink-0 opacity-60 transition-[rotate,opacity] duration-500 group-hover/key:rotate-45 group-hover/key:opacity-100"
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone === "red" ? "bg-black/20" : "bg-white/[0.06]",
          )}
        >
          <IconCmp className="size-[18px]" />
        </span>
      )}
    </a>
  )
}

/**
 * Balão de mensagem enviada (alinhado à direita, como no WhatsApp), nas cores
 * do site. Decorativo para o leitor de tela: o nome do link já diz o destino.
 */
function ChatBubble({ text, typing }: { text: string; typing: boolean }) {
  return (
    <div aria-hidden className="ml-auto w-full max-w-[23rem]">
      {/* Balão "enviado": grafite com um fundo de vermelho, o mesmo da tecla
          que manda esta mensagem */}
      <div className="relative rounded-2xl rounded-tr-none bg-[linear-gradient(180deg,#26141a,#1b1013)] px-4 pt-3.5 pb-2.5 shadow-[inset_0_0_0_1px_rgb(255_52_59/0.16),0_24px_48px_-24px_rgb(0_0_0/0.95)]">
        {/* Rabicho do balão, no canto de cima */}
        <span className="absolute top-0 -right-2.5 h-3.5 w-2.5 [clip-path:polygon(0_0,100%_0,0_100%)] bg-[#26141a]" />
        <p className="text-foreground/90 min-h-[2lh] text-base leading-snug">
          {typing ? (
            <span className="inline-flex h-[1lh] items-center gap-1">
              {[0, 160, 320].map((d) => (
                <span
                  key={d}
                  style={{ animationDelay: `${d}ms` }}
                  className="bg-foreground/50 size-1.5 animate-pulse rounded-full"
                />
              ))}
            </span>
          ) : (
            text
          )}
        </p>
        <p className="text-foreground/40 mt-1.5 flex items-center justify-end gap-1 text-xs">
          agora
          <CheckCheck className="size-3.5" />
        </p>
      </div>
      <p className="text-muted-foreground mt-3 text-right text-sm">
        A mensagem já vai escrita. É só enviar.
      </p>
    </div>
  )
}

/**
 * "Copiar telefone": o número fica à vista (dá para só ler) e, no clique,
 * embaralha e se resolve enquanto a tecla confirma "Copiado".
 */
function CopyPhoneKey() {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [digits, scramble] = useScramble(site.phone, { duration: 560 })
  useEffect(() => () => clearTimeout(timer.current), [])

  const onClick = async () => {
    const ok = await copyText(site.phone.replace(/[^\d+]/g, ""))
    scramble()
    setState(ok ? "done" : "fail")
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState("idle"), 2200)
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Copiar telefone ${site.phone}`}
        className={cn(
          keyBase,
          keyTone.graphite,
          "min-h-16 py-3 pr-3 pl-5",
          state === "done" && "border-emerald-400/40 hover:border-emerald-400/50",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] leading-tight font-medium">
            Copiar telefone
          </span>
          <span className="text-foreground/65 mt-1 block text-[15px] leading-tight tabular-nums">
            <span aria-hidden>{digits}</span>
          </span>
        </span>
        <span
          aria-hidden
          className={cn(
            "flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors duration-300",
            state === "done"
              ? "bg-emerald-400/15 text-emerald-300"
              : state === "fail"
                ? "bg-red-primary/15 text-red-light"
                : "text-foreground/80 bg-white/[0.06]",
          )}
        >
          {state === "done" ? (
            <>
              <Check className="size-4" />
              Copiado
            </>
          ) : state === "fail" ? (
            "Não copiou"
          ) : (
            <Copy className="size-[18px]" />
          )}
        </span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "done"
          ? "Telefone copiado"
          : state === "fail"
            ? `Não foi possível copiar. O número é ${site.phone}`
            : ""}
      </span>
    </>
  )
}
