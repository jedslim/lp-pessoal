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
import { motion } from "motion/react"
import { ArrowLeft, ArrowRight, ArrowUpRight, LoaderCircle, Pause, Play } from "lucide-react"
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

/** Cópias da fila no carrossel: a do meio é a de verdade, as outras dão a volta. */
const COPIES = 3

/**
 * Celular: carrossel infinito, com o card da vez no centro e os vizinhos
 * aparecendo dos dois lados (recuam a 0,94 e escurecem conforme saem). A fila
 * é renderizada três vezes; quando a rolagem para numa cópia de fora, ela
 * salta em silêncio para o mesmo card na do meio. Tablet e telas de toque
 * maiores: grade, só com a cópia de verdade. Tocar na capa roda o site ali
 * mesmo (um vídeo por vez; para ao sair da tela ou ao passar o card).
 */
export function WorkCards({
  projects,
  start = 2,
}: {
  projects: Project[]
  start?: number
  total?: number
}) {
  const [playing, setPlaying] = useState<string | null>(null)
  const reduce = useReducedMotionSafe()
  const listId = useId()
  const listRef = useRef<HTMLOListElement>(null)
  const n = projects.length
  // Card no centro (índice na fila inteira, com as cópias); -1 = grade
  const [current, setCurrent] = useState(-1)

  useEffect(() => {
    const ol = listRef.current
    if (!ol) return
    let raf = 0
    let idle = 0
    const items = () => Array.from(ol.children) as HTMLElement[]
    const center = (li: HTMLElement) => li.offsetLeft + li.offsetWidth / 2
    const carousel = () => ol.scrollWidth - ol.clientWidth > 1

    const read = () => {
      raf = 0
      const list = items()
      if (!carousel()) {
        for (const li of list) li.style.removeProperty("--d")
        setCurrent(-1)
        return
      }
      const mid = ol.scrollLeft + ol.clientWidth / 2
      const step = list[1] ? center(list[1]) - center(list[0]) : 1
      const f = (mid - center(list[0])) / step
      list.forEach((li, i) => {
        li.style.setProperty("--d", Math.min(1, Math.abs(i - f)).toFixed(3))
      })
      setCurrent(Math.round(f))
    }

    // Parou numa cópia de fora: salta uma volta inteira, sem animação
    const wrap = () => {
      const list = items()
      if (!carousel() || list.length < n * COPIES) return
      const mid = ol.scrollLeft + ol.clientWidth / 2
      const step = center(list[1]) - center(list[0])
      const i = Math.round((mid - center(list[0])) / step)
      const lap = center(list[n]) - center(list[0])
      if (i < n) ol.scrollLeft += lap
      else if (i >= 2 * n) ol.scrollLeft -= lap
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
      clearTimeout(idle)
      idle = window.setTimeout(wrap, 140)
    }

    // Começa no primeiro card de verdade, centralizado
    const first = items()[n]
    if (carousel() && first) ol.scrollLeft = center(first) - ol.clientWidth / 2
    read()
    ol.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(idle)
      ol.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [n])

  const go = (dir: 1 | -1) => {
    const ol = listRef.current
    const next = ol?.children[current + dir] as HTMLElement | undefined
    if (!ol || !next) return
    ol.scrollTo({
      left: next.offsetLeft + next.offsetWidth / 2 - ol.clientWidth / 2,
      behavior: reduce ? "auto" : "smooth",
    })
  }

  // Cópia 0 e 2 só existem no carrossel (no md+ some tudo menos a do meio)
  const rows = Array.from({ length: COPIES }, (_, copy) =>
    projects.map((p, i) => ({ p, i, copy, key: `${copy}-${p.slug}` })),
  ).flat()

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
          aria-label="Mais projetos"
          className={cn(
            "relative flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3",
            // Carrossel (celular): a fila sangra até a borda da tela e o
            // card da vez encaixa no centro
            "max-md:-mx-5 max-md:snap-x max-md:snap-mandatory max-md:flex-row max-md:gap-3 max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain [scrollbar-width:none] sm:max-md:-mx-8 [&::-webkit-scrollbar]:hidden",
          )}
        >
          {rows.map(({ p, i, copy, key }, k) => (
            <WorkCard
              key={key}
              project={p}
              number={pad(start + i)}
              clone={copy !== 1}
              centered={k === current}
              playing={playing === key}
              onToggle={(on) => setPlaying(on ? key : null)}
              stripRef={listRef}
            />
          ))}
        </ol>

        {/* Setas do carrossel (a fila não tem fim: nunca desligam) */}
        <div className="mt-5 flex justify-end gap-2 md:hidden">
          <PagerButton label="Projeto anterior" controls={listId} onClick={() => go(-1)}>
            <ArrowLeft className="size-4" />
          </PagerButton>
          <PagerButton label="Próximo projeto" controls={listId} onClick={() => go(1)}>
            <ArrowRight className="size-4" />
          </PagerButton>
        </div>
      </motion.div>
    </>
  )
}

function PagerButton({
  label,
  controls,
  onClick,
  children,
}: {
  label: string
  controls: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={controls}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-white/15 text-foreground/85 transition-[background-color,opacity] outline-none focus-visible:ring-2 focus-visible:ring-red-light/70 active:bg-white/10"
    >
      {children}
    </button>
  )
}

function WorkCard({
  project: p,
  number,
  clone,
  centered,
  playing,
  onToggle,
  stripRef,
}: {
  project: Project
  number: string
  /** Cópia da volta do carrossel: some no md+ e fica fora do leitor de tela. */
  clone: boolean
  /** O card da vez no carrossel: o vídeo já começa a baixar. */
  centered: boolean
  playing: boolean
  onToggle: (on: boolean) => void
  /** A fila do carrossel (no celular é ela que rola de lado). */
  stripRef: RefObject<HTMLOListElement | null>
}) {
  const ref = useRef<HTMLLIElement>(null)
  const host = shortHost(p.host)
  // Montado quando o card chega ao centro (ou no primeiro toque) e mantido:
  // o vídeo já vem baixando, e voltar a tocar é instantâneo
  const [opened, setOpened] = useState(false)
  if ((playing || centered) && !opened) setOpened(true)
  // Já tem quadro na tela: só então a capa sai (antes disso, nada de preto)
  const [ready, setReady] = useState(false)
  const shown = playing && ready

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

  // Foco pelo teclado num card de fora: ele encaixa no centro, à vista
  // (e nunca por baixo do header fixo)
  const onFocus = (e: FocusEvent<HTMLLIElement>) => {
    const strip = stripRef.current
    if (!strip || strip.scrollWidth <= strip.clientWidth + 1) return
    e.currentTarget.scrollIntoView({
      behavior: "instant",
      inline: "center",
      block: "nearest",
    })
    const r = (e.target as HTMLElement).getBoundingClientRect()
    const top = 80
    const bottom = window.innerHeight - 16
    if (r.top < top) window.scrollBy({ top: r.top - top, behavior: "instant" })
    else if (r.bottom > bottom)
      window.scrollBy({ top: r.bottom - bottom, behavior: "instant" })
  }

  const loading = playing && !ready

  return (
    <li
      ref={ref}
      onFocus={onFocus}
      aria-hidden={clone || undefined}
      inert={clone || undefined}
      className={cn(
        "group/card max-md:w-[78%] max-md:max-w-[21rem] max-md:shrink-0 max-md:snap-center md:max-lg:odd:last:col-span-2",
        // As cópias da volta só existem no carrossel (no md+ fica a grade
        // de verdade) e ficam fora do leitor de tela e do Tab
        clone && "md:hidden",
      )}
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
            "md:max-lg:group-odd/card:group-last/card:grid md:max-lg:group-odd/card:group-last/card:grid-cols-[1.1fr_1fr]",
          )}
        >
          {/* Capa: mockup → site rodando */}
          <div className="relative m-2 aspect-video overflow-hidden rounded-[14px] bg-background md:max-lg:group-odd/card:group-last/card:aspect-auto md:max-lg:group-odd/card:group-last/card:min-h-52">
            <Image
              src={p.image}
              alt={`Mockup do site ${p.name} no desktop e no celular`}
              fill
              sizes="(min-width: 1440px) 440px, (min-width: 1024px) calc(33vw - 3rem), (min-width: 768px) calc(55vw - 3rem), calc(78vw - 1rem)"
              className={cn(
                "ease-out-expo object-cover transition-[scale,filter] duration-700",
                // Enquanto carrega, a capa afunda e escurece um pouco: o
                // toque foi recebido; ela só some debaixo da máscara
                loading && "scale-[1.03] brightness-75",
                shown && "scale-110",
              )}
            />
            {opened && (
              // Máscara: o site nasce num círculo a partir do botão de play
              // e cresce até cobrir a capa
              <motion.div
                initial={false}
                animate={{
                  clipPath: shown
                    ? "circle(150% at 86% 84%)"
                    : "circle(0% at 86% 84%)",
                }}
                transition={{ duration: reduceDuration(shown), ease: EASE }}
                className={cn(
                  "absolute inset-0 flex flex-col bg-background",
                  !shown && "pointer-events-none",
                )}
              >
                <BrowserBar host={p.host} size="sm" className="h-6" />
                <div className="relative min-h-0 flex-1">
                  <ProjectVideo
                    project={p}
                    playing={playing}
                    preload="auto"
                    onReady={setReady}
                    label={`Gravação de tela do site ${p.name}`}
                    className="absolute inset-0"
                  />
                </div>
              </motion.div>
            )}

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
                {loading ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : playing ? (
                  <Pause className="size-3" fill="currentColor" />
                ) : (
                  <Play className="ml-px size-3" fill="currentColor" />
                )}
              </span>
              {loading ? "Carregando" : playing ? "Pausar" : "Ver rodando"}
            </button>
          </div>

          {/* Ficha. Container: o nome mede pela largura do card, não da tela */}
          <div className="@container flex flex-1 flex-col px-5 pt-5 pb-5 sm:px-6 md:max-lg:group-odd/card:group-last/card:pl-4">
            <div className="text-label flex items-center justify-between gap-3 text-[10px] text-muted-foreground max-[380px]:gap-2">
              <span className="text-red-light shrink-0">{number}</span>
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

/** A máscara abre devagar e fecha rápido (pausar não pede cerimônia). */
const reduceDuration = (opening: boolean) => (opening ? 0.9 : 0.35)
