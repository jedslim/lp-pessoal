"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
  type RefObject,
} from "react"
import Image from "next/image"
import { AnimatePresence, motion, useMotionValue } from "motion/react"
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react"
import type { Project } from "@/lib/projects"
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe"
import {
  BrowserBar,
  ProjectVideo,
  Tags,
  Via,
  shortHost,
} from "@/components/work-browser"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const
const pad = (n: number) => String(n).padStart(2, "0")

/** Escurecimento máximo do card fora do centro, no carrossel. */
const SHADE = 0.55

/**
 * Celular: carrossel horizontal com snap. O card no centro fica inteiro e
 * aceso; os vizinhos recuam (0,94) e escurecem conforme saem, a mesma
 * profundidade do baralho de antes, agora no eixo X. Tablet e telas de
 * toque maiores: grade. Tocar na capa roda o site ali mesmo (um vídeo por
 * vez; para ao sair da tela ou ao passar o card para o lado).
 */
export function WorkCards({
  projects,
  start = 2,
  total,
}: {
  projects: Project[]
  start?: number
  total: number
}) {
  const [playing, setPlaying] = useState<string | null>(null)
  const reduce = useReducedMotionSafe()
  const listId = useId()
  const listRef = useRef<HTMLOListElement>(null)

  // Paginação: card da vez, pontas e régua (fração já vista da fila)
  const [current, setCurrent] = useState(0)
  const [edge, setEdge] = useState({ start: true, end: false })
  const seen = useMotionValue(0)

  useEffect(() => {
    const ol = listRef.current
    if (!ol) return
    let raf = 0
    const read = () => {
      raf = 0
      const items = Array.from(ol.children) as HTMLElement[]
      const max = ol.scrollWidth - ol.clientWidth
      if (max <= 1 || items.length === 0) {
        // Grade (md+): sem profundidade nem paginação
        for (const li of items) li.style.removeProperty("--d")
        return
      }
      const padLeft = parseFloat(getComputedStyle(ol).scrollPaddingLeft) || 0
      const x = ol.scrollLeft
      // Onde cada card encaixa; o último pode não chegar à margem (fim da fila)
      const snaps = items.map((li) =>
        Math.min(Math.max(li.offsetLeft - padLeft, 0), max),
      )
      // Posição fracionária na fila: 0 no primeiro card, n-1 no último
      let f = items.length - 1
      for (let k = 0; k < snaps.length - 1; k++) {
        if (x <= snaps[k + 1]) {
          const span = snaps[k + 1] - snaps[k]
          f = k + (span > 0 ? Math.max(0, x - snaps[k]) / span : 1)
          break
        }
      }
      items.forEach((li, i) => {
        li.style.setProperty("--d", Math.min(1, Math.abs(i - f)).toFixed(3))
      })
      seen.set((ol.clientWidth + x) / ol.scrollWidth)
      setCurrent(Math.round(f))
      setEdge({ start: x <= 1, end: x >= max - 1 })
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    ol.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(raf)
      ol.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [seen])

  const go = (dir: 1 | -1) => {
    const ol = listRef.current
    if (!ol) return
    const items = Array.from(ol.children) as HTMLElement[]
    const next = items[Math.min(Math.max(current + dir, 0), items.length - 1)]
    if (!next) return
    const padLeft = parseFloat(getComputedStyle(ol).scrollPaddingLeft) || 0
    ol.scrollTo({
      left: next.offsetLeft - padLeft,
      behavior: reduce ? "auto" : "smooth",
    })
  }

  return (
    <>
      {/* No celular, a fila entra deslizando da direita (uma vez); do md em
          diante cada card entra sozinho, e este invólucro fica parado */}
      <motion.div
        initial={{ opacity: 0, x: 56 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "0px 0px -8% 0px" }}
        transition={{ duration: 0.9, ease: EASE }}
        className="md:[transform:none]! md:opacity-100!"
      >
        <ol
          id={listId}
          ref={listRef}
          aria-label={`Projetos ${pad(start)} a ${pad(total)}`}
          className={cn(
            "relative flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3",
            // Carrossel (celular): a fila sangra até a borda da tela e
            // encaixa cada card na margem da grade
            "max-md:-mx-5 max-md:snap-x max-md:snap-mandatory max-md:scroll-px-5 max-md:flex-row max-md:gap-3 max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain max-md:px-5 [scrollbar-width:none] sm:max-md:-mx-8 sm:max-md:scroll-px-8 sm:max-md:px-8 [&::-webkit-scrollbar]:hidden",
          )}
        >
          {projects.map((p, i) => (
            <WorkCard
              key={p.slug}
              project={p}
              number={pad(start + i)}
              total={pad(total)}
              playing={playing === p.slug}
              onToggle={(on) => setPlaying(on ? p.slug : null)}
              stripRef={listRef}
            />
          ))}
        </ol>

        {/* Paginação do carrossel: 02 / 10, régua ligada à rolagem e setas */}
        <div className="mt-5 flex items-center gap-4 md:hidden">
          <p
            aria-live="polite"
            className="font-mono text-[12px] text-muted-foreground tabular-nums"
          >
            <span className="sr-only">Projeto </span>
            <span className="text-foreground">{pad(start + current)}</span>
            <span aria-hidden> / </span>
            <span className="sr-only"> de </span>
            {pad(total)}
          </p>
          <span
            aria-hidden
            className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/10"
          >
            <motion.span
              style={{ scaleX: seen }}
              className="absolute inset-0 origin-left bg-red-light"
            />
          </span>
          <div className="flex gap-2">
            <PagerButton
              label="Projeto anterior"
              controls={listId}
              disabled={edge.start}
              onClick={() => go(-1)}
            >
              <ArrowLeft className="size-4" />
            </PagerButton>
            <PagerButton
              label="Próximo projeto"
              controls={listId}
              disabled={edge.end}
              onClick={() => go(1)}
            >
              <ArrowRight className="size-4" />
            </PagerButton>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function PagerButton({
  label,
  controls,
  disabled,
  onClick,
  children,
}: {
  label: string
  controls: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-white/15 text-foreground/85 transition-[background-color,opacity] outline-none focus-visible:ring-2 focus-visible:ring-red-light/70 active:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function WorkCard({
  project: p,
  number,
  total,
  playing,
  onToggle,
  stripRef,
}: {
  project: Project
  number: string
  total: string
  playing: boolean
  onToggle: (on: boolean) => void
  /** A fila do carrossel (no celular é ela que rola de lado). */
  stripRef: RefObject<HTMLOListElement | null>
}) {
  const ref = useRef<HTMLLIElement>(null)
  const host = shortHost(p.host)
  // Montado no primeiro toque e mantido: voltar a tocar é instantâneo
  const [opened, setOpened] = useState(false)
  if (playing && !opened) setOpened(true)

  // Saiu da tela tocando, ou foi passado para o lado no carrossel: para
  // (economiza bateria e dados; só um vídeo à vista por vez)
  useEffect(() => {
    const el = ref.current
    if (!el || !playing) return
    const stop = () => onToggle(false)
    const page = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) stop()
    })
    const strip = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio < 0.6) stop()
      },
      { root: stripRef.current, threshold: 0.6 },
    )
    page.observe(el)
    strip.observe(el)
    return () => {
      page.disconnect()
      strip.disconnect()
    }
  }, [playing, onToggle, stripRef])

  // Foco pelo teclado num card de fora: ele encaixa na margem, à vista
  // (e nunca por baixo do header fixo)
  const onFocus = (e: FocusEvent<HTMLLIElement>) => {
    const strip = stripRef.current
    if (!strip || strip.scrollWidth <= strip.clientWidth + 1) return
    e.currentTarget.scrollIntoView({
      behavior: "instant",
      inline: "start",
      block: "nearest",
    })
    const r = (e.target as HTMLElement).getBoundingClientRect()
    const top = 80
    const bottom = window.innerHeight - 16
    if (r.top < top) window.scrollBy({ top: r.top - top, behavior: "instant" })
    else if (r.bottom > bottom)
      window.scrollBy({ top: r.bottom - bottom, behavior: "instant" })
  }

  return (
    <li
      ref={ref}
      onFocus={onFocus}
      className="group/card max-md:w-[85%] max-md:max-w-[22rem] max-md:shrink-0 max-md:snap-start md:max-lg:last:col-span-2"
    >
      {/* Profundidade do carrossel: --d (0 no centro, 1 fora) vem da rolagem */}
      <div className="relative h-full max-md:motion-safe:[scale:calc(1-0.06*var(--d,0))]">
        <motion.article
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className={cn(
            "flex h-full flex-col overflow-hidden rounded-[20px] border border-white/[0.09] bg-[#0c0c0e] md:shadow-[0_-24px_60px_-20px_rgb(0_0_0/0.9)]",
            // No carrossel a fila inteira entra junta (o invólucro anima)
            "max-md:[transform:none]! max-md:opacity-100!",
            // Tablet: o último card (sozinho na linha) deita, capa e ficha lado a lado
            "md:max-lg:group-last/card:grid md:max-lg:group-last/card:grid-cols-[1.1fr_1fr]",
          )}
        >
          {/* Capa: mockup → site rodando */}
          <div className="relative m-2 aspect-video overflow-hidden rounded-[14px] bg-background md:max-lg:group-last/card:aspect-auto md:max-lg:group-last/card:min-h-52">
            <Image
              src={p.image}
              alt={`Mockup do site ${p.name} no desktop e no celular`}
              fill
              sizes="(min-width: 1440px) 440px, (min-width: 1024px) calc(33vw - 3rem), (min-width: 768px) calc(55vw - 3rem), calc(85vw - 2rem)"
              className={cn(
                "object-cover transition-[opacity,transform] duration-700",
                playing && "scale-105 opacity-0",
              )}
            />
            <AnimatePresence>
              {opened && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: playing ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={cn(
                    "absolute inset-0 flex flex-col",
                    !playing && "pointer-events-none",
                  )}
                >
                  <BrowserBar host={p.host} size="sm" className="h-6" />
                  <div className="relative min-h-0 flex-1">
                    <ProjectVideo
                      project={p}
                      playing={playing}
                      label={`Gravação de tela do site ${p.name}`}
                      className="absolute inset-0"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => onToggle(!playing)}
              aria-pressed={playing}
              aria-label={
                playing ? `Pausar ${p.name}` : `Ver o site ${p.name} rodando`
              }
              className="text-label absolute right-2.5 bottom-2.5 flex h-10 items-center gap-2 rounded-full bg-black/65 pr-4 pl-1.5 text-[10px] text-white backdrop-blur-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-light/80 active:bg-black/80"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-red-primary">
                {playing ? (
                  <Pause className="size-3" fill="currentColor" />
                ) : (
                  <Play className="ml-px size-3" fill="currentColor" />
                )}
              </span>
              {playing ? "Pausar" : "Ver rodando"}
            </button>
          </div>

          {/* Ficha. Container: o nome mede pela largura do card, não da tela */}
          <div className="@container flex flex-1 flex-col px-5 pt-5 pb-5 sm:px-6 md:max-lg:group-last/card:pl-4">
            <div className="text-label flex items-center justify-between gap-3 text-[10px] text-muted-foreground max-[380px]:gap-2">
              <span className="shrink-0">
                <span className="text-red-light">{number}</span>
                {/* Tela bem estreita: o total já está na paginação logo abaixo */}
                <span className="text-foreground/50 max-[380px]:hidden">
                  {" "}
                  / {total}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-3 max-[380px]:gap-2">
                <span className="truncate">{p.segment}</span>
                {/* Tela bem estreita: a agência sobe para cá (só o logo, o
                    "via" fica para o leitor de tela) e o rodapé fica inteiro
                    para o endereço */}
                {p.agency && (
                  <span className="hidden shrink-0 items-center max-[380px]:inline-flex">
                    <span className="sr-only">via </span>
                    <Via agency={p.agency} prefix={false} logoClassName="h-3" />
                  </span>
                )}
              </span>
            </div>

            <h3 className="text-display mt-4 text-[clamp(1.6rem,10.8cqw,2.6rem)] leading-[0.95] tracking-[-0.04em] text-balance">
              {p.name}
            </h3>
            <p className="text-label mt-3 text-[10px] text-foreground/60 max-md:text-[11px] max-md:text-foreground/70">
              {p.scope}
            </p>

            <p className="mt-4 text-[15px] leading-relaxed text-pretty text-foreground/70">
              {p.description}
            </p>

            <Tags tags={p.tags} className="mt-5 mb-6" />

            {/* Rodapé preso embaixo: no grid do tablet os cards ficam alinhados.
                O logo nunca encolhe; o endereço corta com "…" quando não cabe */}
            <div className="mt-auto flex min-h-11 items-center justify-between gap-4 border-t border-border pt-4">
              {p.agency && (
                <Via
                  agency={p.agency}
                  logoClassName="h-3.5"
                  className="shrink-0 max-[380px]:hidden"
                />
              )}
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link -my-2 -mr-2 ml-auto flex min-h-11 min-w-0 items-center gap-1.5 rounded-full px-2 font-mono text-[12px] text-foreground/85 outline-none focus-visible:ring-2 focus-visible:ring-red-light/70"
                >
                  <span className="truncate">{host}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-red-light" />
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              ) : (
                <span className="ml-auto min-w-0 truncate font-mono text-[12px] text-muted-foreground">
                  {host}
                </span>
              )}
            </div>
          </div>
        </motion.article>

        {/* Fora do centro, o card escurece (só no carrossel) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[20px] bg-black md:hidden"
          style={{ opacity: `calc(var(--d, 0) * ${SHADE})` }}
        />
      </div>
    </li>
  )
}
