"use client"

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
} from "react"
import {
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react"
import { ArrowUpRight } from "lucide-react"
import { CAP_ITEMS, toolPath, type CapItem } from "@/components/capabilities-index"
import { LazyPlayground } from "@/components/capabilities-lazy"
import { useScramble } from "@/components/chrome-scramble"
import { scrollToTarget } from "@/components/smooth-scroll"
import { cn } from "@/lib/utils"

/*
 * Capacidades presas no scroll: no desktop (1280+ de largura e 700+ de
 * altura) a seção fica parada enquanto as quatro frentes se revezam. À
 * esquerda, a lista grande com a frente ativa acesa (texto e tecnologias
 * abertos); à direita, o palco com o playground daquela frente. Abaixo
 * disso (celular, tablet, notebook baixo), as frentes empilham: título,
 * texto, chips e o playground logo embaixo, sem nada preso.
 *
 * O layout é todo CSS (a variante de media query abaixo); o JavaScript só
 * decide qual frente está ativa, quem fica inerte e o clique na lista.
 * A variante, escrita por extenso em cada classe (o Tailwind só gera o que
 * está escrito): [@media(min-width:1280px)_and_(min-height:700px)]
 */

const PIN_QUERY = "(min-width: 1280px) and (min-height: 700px)"
const N = CAP_ITEMS.length

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(PIN_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
/** O servidor não sabe o tamanho da tela: assume empilhado e corrige logo. */
const usePinned = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PIN_QUERY).matches,
    () => false,
  )

/**
 * Altura de cada painel empilhado. O da web é fixo (a moldura ocupa a área);
 * os outros crescem com o conteúdo, e o mínimo segura o lugar até montar.
 */
// Os playgrounds viram duas colunas por container query, não no sm: o do
// WordPress com o painel a partir de 714px de tela (44.625rem) e o da
// automação a partir de 706px (44.125rem). Até lá seguem empilhados e bem
// mais altos; com o mínimo do sm, o painel crescia ~250–490px ao montar e
// empurrava a página no meio da rolagem (e as âncoras de baixo erravam).
// O mínimo fica sempre um pouco abaixo da altura real, para não sobrar vão.
const STACKED_H = [
  "h-[560px] sm:h-[600px] lg:h-[640px]",
  "min-h-[870px] sm:min-h-[1000px] min-[44.625rem]:min-h-[760px] lg:min-h-[640px]",
  "min-h-[1140px] min-[44.125rem]:min-h-[660px] lg:min-h-[600px]",
  "min-h-[820px] sm:min-h-[640px] lg:min-h-[560px]",
]

/* ---------- Chip de tecnologia ---------- */

function Chip({ name, play }: { name: string; play: number }) {
  const [text, scramble] = useScramble(name, { preserveCase: true, duration: 520 })
  useEffect(() => {
    if (play) scramble()
  }, [play, scramble])
  const path = toolPath(name)
  return (
    <li className="text-foreground/80 inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 font-mono text-[11.5px] tracking-[0.02em]">
      {path ? (
        <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0 fill-current opacity-80">
          <path d={path} />
        </svg>
      ) : (
        <span aria-hidden className="bg-red-light size-1.5 shrink-0 rounded-[2px]" />
      )}
      <span aria-hidden className="whitespace-nowrap">
        {text}
      </span>
      <span className="sr-only">{name}</span>
    </li>
  )
}

/* ---------- Uma frente na lista ---------- */

function Front({
  item,
  index,
  on,
  pinned,
  y,
  onPick,
}: {
  item: CapItem
  index: number
  on: boolean
  pinned: boolean
  /** Preso: deslocamento vertical na coluna (px). */
  y: number
  onPick: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" })
  // Kicker e chips "decodificam" quando a frente acende (ou entra na tela,
  // empilhada): o mesmo embaralhar do menu
  const [play, setPlay] = useState(0)
  const [kicker, scrambleKicker] = useScramble(item.kicker.toUpperCase(), {
    duration: 560,
  })
  const wasOn = useRef(false)
  useEffect(() => {
    const lit = pinned ? on : seen
    if (lit && !wasOn.current) {
      setPlay((n) => n + 1)
      scrambleKicker()
    }
    wasOn.current = lit
  }, [on, pinned, seen, scrambleKicker])

  return (
    <div
      ref={ref}
      id={item.id}
      data-active={on ? "" : undefined}
      style={{ "--y": `${y}px` } as CSSProperties}
      className={cn(
        "group/front relative scroll-mt-24",
        index > 0 && "mt-24 sm:mt-28",
        // Preso: todas no topo da coluna, cada uma deslocada só por
        // transform. Abrir a ativa não mexe no layout de ninguém (sem layout
        // shift no meio do scroll)
        "[@media(min-width:1280px)_and_(min-height:700px)]:absolute [@media(min-width:1280px)_and_(min-height:700px)]:inset-x-0 [@media(min-width:1280px)_and_(min-height:700px)]:top-0 [@media(min-width:1280px)_and_(min-height:700px)]:col-start-1 [@media(min-width:1280px)_and_(min-height:700px)]:col-end-2 [@media(min-width:1280px)_and_(min-height:700px)]:row-span-5 [@media(min-width:1280px)_and_(min-height:700px)]:row-start-1 [@media(min-width:1280px)_and_(min-height:700px)]:mt-0 [@media(min-width:1280px)_and_(min-height:700px)]:[transform:translateY(var(--y))] [@media(min-width:1280px)_and_(min-height:700px)]:transition-transform [@media(min-width:1280px)_and_(min-height:700px)]:duration-700 [@media(min-width:1280px)_and_(min-height:700px)]:ease-out-expo motion-reduce:transition-none",
      )}
    >
      <div data-front-head className="[@media(min-width:1280px)_and_(min-height:700px)]:py-3.5">
      {/* O que dá para fazer no playground. Preso, o quadradinho da frente
          ativa enche de vermelho; as outras ficam só com o contorno */}
      <p className="text-label text-red-light flex items-center gap-2.5 transition-colors duration-500 [@media(min-width:1280px)_and_(min-height:700px)]:text-white/30 [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:text-red-light">
        <span
          aria-hidden
          className="bg-red-light size-2 shrink-0 rounded-[2px] border border-current transition-[background-color,scale] duration-500 [@media(min-width:1280px)_and_(min-height:700px)]:scale-75 [@media(min-width:1280px)_and_(min-height:700px)]:bg-transparent [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:scale-100 [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:bg-red-light"
        />
        <span aria-hidden>{kicker}</span>
        <span className="sr-only">{item.kicker}</span>
      </p>
      <h3 className="text-display-2 mt-3.5 text-[clamp(2rem,8.4vw,3rem)] leading-[0.95] text-balance transition-colors duration-500 [@media(min-width:1280px)_and_(min-height:700px)]:text-[clamp(1.75rem,2.45vw,2.45rem)] [@media(min-width:1280px)_and_(min-height:700px)]:text-white/25 [@media(min-width:1280px)_and_(min-height:700px)]:group-hover/front:text-white/55 [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:text-foreground">
        {pinned ? (
          <button
            type="button"
            onClick={onPick}
            aria-current={on ? "true" : undefined}
            aria-controls={`${item.id}-panel`}
            className="focus-visible:ring-red-light/50 cursor-pointer rounded-md text-left outline-none focus-visible:ring-3"
          >
            {item.title}
          </button>
        ) : (
          item.title
        )}
      </h3>
      </div>
      {/* Texto e chips: sempre visíveis empilhado; preso, só na frente ativa
          (as outras abrem espaço para ela por transform) */}
      <div
        data-front-body
        className="[@media(min-width:1280px)_and_(min-height:700px)]:pointer-events-none [@media(min-width:1280px)_and_(min-height:700px)]:-translate-y-2 [@media(min-width:1280px)_and_(min-height:700px)]:pb-6 [@media(min-width:1280px)_and_(min-height:700px)]:opacity-0 [@media(min-width:1280px)_and_(min-height:700px)]:transition-[opacity,translate] [@media(min-width:1280px)_and_(min-height:700px)]:duration-150 [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:duration-500 [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:pointer-events-auto [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:translate-y-0 [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:opacity-100 [@media(min-width:1280px)_and_(min-height:700px)]:group-data-[active]/front:delay-300"
      >
        <p className="text-muted-foreground mt-4 max-w-[44ch] text-base leading-relaxed text-pretty sm:text-[17px] [@media(min-width:1280px)_and_(min-height:700px)]:mt-1 [@media(min-width:1280px)_and_(min-height:700px)]:text-base">
          {item.text}
        </p>
        <ul aria-label="Tecnologias" className="mt-5 flex flex-wrap gap-1.5">
          {item.tools.map((t) => (
            <Chip key={t} name={t} play={play} />
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Altura estimada (px) antes da medição: cabeçalho de cada frente e o corpo aberto. */
const EST_HEAD = 92
const EST_BODY = 176

/** Deslocamento de cada frente na coluna presa, com a ativa aberta. */
function offsets(heads: number[], bodies: number[], active: number) {
  const ys: number[] = []
  let y = 0
  for (let i = 0; i < N; i++) {
    ys.push(y)
    y += heads[i] + (i === active ? bodies[i] : 0)
  }
  return ys
}

/* ---------- Painel com o playground ---------- */

function Panel({
  item,
  index,
  state,
  pinned,
  stageOn,
}: {
  item: CapItem
  index: number
  state: "before" | "on" | "after"
  pinned: boolean
  /** Preso: a seção está na tela (só o painel ativo roda). */
  stageOn: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const playing = pinned ? stageOn && state === "on" : inView

  return (
    <div
      ref={ref}
      id={`${item.id}-panel`}
      role="group"
      aria-label={`Demonstração interativa: ${item.title}`}
      data-state={state}
      inert={pinned && state !== "on"}
      className={cn(
        "@container relative mt-8 overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0a0a0c] sm:mt-10",
        STACKED_H[index],
        // Preso: todos no mesmo lugar do palco; o ativo aparece, os outros
        // saem para cima (já vistos) ou esperam embaixo
        "[@media(min-width:1280px)_and_(min-height:700px)]:z-10 [@media(min-width:1280px)_and_(min-height:700px)]:col-start-2 [@media(min-width:1280px)_and_(min-height:700px)]:row-span-5 [@media(min-width:1280px)_and_(min-height:700px)]:row-start-1 [@media(min-width:1280px)_and_(min-height:700px)]:mt-0 [@media(min-width:1280px)_and_(min-height:700px)]:h-auto! [@media(min-width:1280px)_and_(min-height:700px)]:min-h-0! [@media(min-width:1280px)_and_(min-height:700px)]:border-transparent [@media(min-width:1280px)_and_(min-height:700px)]:bg-transparent",
        "[@media(min-width:1280px)_and_(min-height:700px)]:transition-[opacity,translate,filter] [@media(min-width:1280px)_and_(min-height:700px)]:duration-700 [@media(min-width:1280px)_and_(min-height:700px)]:ease-out-expo motion-reduce:transition-none",
        "[@media(min-width:1280px)_and_(min-height:700px)]:data-[state=after]:pointer-events-none [@media(min-width:1280px)_and_(min-height:700px)]:data-[state=after]:translate-y-10 [@media(min-width:1280px)_and_(min-height:700px)]:data-[state=after]:opacity-0 [@media(min-width:1280px)_and_(min-height:700px)]:data-[state=after]:blur-[6px]",
        "[@media(min-width:1280px)_and_(min-height:700px)]:data-[state=before]:pointer-events-none [@media(min-width:1280px)_and_(min-height:700px)]:data-[state=before]:-translate-y-10 [@media(min-width:1280px)_and_(min-height:700px)]:data-[state=before]:opacity-0 [@media(min-width:1280px)_and_(min-height:700px)]:data-[state=before]:blur-[6px]",
      )}
    >
      <LazyPlayground index={index} active={playing} />
    </div>
  )
}

/* ---------- Seção ---------- */

export function CapabilitiesScroller() {
  const pinned = usePinned()
  const reduce = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const stageOn = useInView(trackRef, { amount: 0.05 })
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  })

  const pick = (p: number) => Math.min(N - 1, Math.max(0, Math.floor(p * N)))
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (pinned) setActive(pick(p))
  })
  // Ao entrar no modo preso (ex.: janela aumentou), acerta a frente ativa
  useEffect(() => {
    if (!pinned) return
    const id = requestAnimationFrame(() => setActive(pick(scrollYProgress.get())))
    return () => cancelAnimationFrame(id)
  }, [pinned, scrollYProgress])

  /** Clique na lista: rola até o meio do trecho daquela frente. */
  const goTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const seg = (el.offsetHeight - window.innerHeight) / N
    scrollToTarget(Math.round(top + seg * (i + 0.5)))
  }

  // Luz da borda do palco seguindo o cursor
  const raf = useRef(0)
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduce || !pinned) return
    const { clientX, clientY } = e
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const el = frameRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty("--mx", `${clientX - r.left}px`)
      el.style.setProperty("--my", `${clientY - r.top}px`)
    })
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // Preso: mede o cabeçalho e o corpo de cada frente (fonte carregada, janela
  // mudou) para calcular os deslocamentos da lista
  const gridRef = useRef<HTMLDivElement>(null)
  const [geo, setGeo] = useState<{ heads: number[]; bodies: number[] } | null>(null)
  useEffect(() => {
    const grid = gridRef.current
    if (!pinned || !grid) return
    const heads = [...grid.querySelectorAll<HTMLElement>("[data-front-head]")]
    const bodies = [...grid.querySelectorAll<HTMLElement>("[data-front-body]")]
    // O callback do ResizeObserver roda antes da pintura: sem quadro errado
    const ro = new ResizeObserver(() =>
      setGeo({
        heads: heads.map((el) => el.offsetHeight),
        bodies: bodies.map((el) => el.offsetHeight),
      }),
    )
    ;[...heads, ...bodies].forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [pinned])
  const ys = geo
    ? offsets(geo.heads, geo.bodies, active)
    : offsets(Array(N).fill(EST_HEAD), Array(N).fill(EST_BODY), active)

  return (
    <div
      ref={trackRef}
      className="relative mt-16 lg:mt-24 [@media(min-width:1280px)_and_(min-height:700px)]:mt-16 [@media(min-width:1280px)_and_(min-height:700px)]:h-[420svh]"
    >
      <div className="[@media(min-width:1280px)_and_(min-height:700px)]:sticky [@media(min-width:1280px)_and_(min-height:700px)]:top-0 [@media(min-width:1280px)_and_(min-height:700px)]:flex [@media(min-width:1280px)_and_(min-height:700px)]:h-svh [@media(min-width:1280px)_and_(min-height:700px)]:items-center [@media(min-width:1280px)_and_(min-height:700px)]:pt-16 [@media(min-width:1280px)_and_(min-height:700px)]:pb-6">
        <div
          ref={gridRef}
          onPointerMove={onMove}
          className="group/stage relative grid w-full grid-cols-1 [@media(min-width:1280px)_and_(min-height:700px)]:h-[min(46rem,calc(100svh-7rem))] [@media(min-width:1280px)_and_(min-height:700px)]:grid-cols-[minmax(0,4.6fr)_minmax(0,7.4fr)] [@media(min-width:1280px)_and_(min-height:700px)]:grid-rows-[auto_auto_auto_auto_minmax(0,1fr)] [@media(min-width:1280px)_and_(min-height:700px)]:gap-x-14"
        >
          {/* Moldura do palco, atrás dos painéis (só presa): a borda não
              pisca na troca e a luz do cursor acende o contorno */}
          <div
            ref={frameRef}
            aria-hidden
            data-companion="capabilities"
            style={{ "--mx": "-999px", "--my": "-999px" } as CSSProperties}
            className="relative hidden overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0a0a0c] [@media(min-width:1280px)_and_(min-height:700px)]:col-start-2 [@media(min-width:1280px)_and_(min-height:700px)]:row-span-5 [@media(min-width:1280px)_and_(min-height:700px)]:row-start-1 [@media(min-width:1280px)_and_(min-height:700px)]:block"
          >
            <span
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/stage:opacity-100"
              style={{
                background:
                  "radial-gradient(520px circle at var(--mx) var(--my), rgb(255 255 255 / 0.035), transparent 45%)",
              }}
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-[inherit] p-px opacity-0 transition-opacity duration-500 group-hover/stage:opacity-100"
              style={{
                background:
                  "radial-gradient(360px circle at var(--mx) var(--my), rgb(255 52 59 / 0.7), rgb(255 52 59 / 0.1) 45%, transparent 70%)",
                WebkitMask:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />
          </div>

          {CAP_ITEMS.map((item, i) => (
            <Fragment key={item.id}>
              <Front
                item={item}
                index={i}
                on={active === i}
                pinned={pinned}
                y={ys[i]}
                onPick={() => goTo(i)}
              />
              <Panel
                item={item}
                index={i}
                state={i === active ? "on" : i < active ? "before" : "after"}
                pinned={pinned}
                stageOn={stageOn}
              />
            </Fragment>
          ))}

          {/* Fecho: o convite, no pé da lista */}
          <a
            href="#contato"
            className="group/cta mt-24 flex items-center gap-4 self-start rounded-full outline-none focus-visible:ring-3 focus-visible:ring-red-light/50 sm:mt-28 [@media(min-width:1280px)_and_(min-height:700px)_and_(max-height:779px)]:hidden [@media(min-width:1280px)_and_(min-height:700px)]:col-start-1 [@media(min-width:1280px)_and_(min-height:700px)]:row-start-5 [@media(min-width:1280px)_and_(min-height:700px)]:mt-0 [@media(min-width:1280px)_and_(min-height:700px)]:self-end"
          >
            <span className="text-foreground/85 group-hover/cta:text-foreground text-base transition-colors sm:text-lg">
              De qual delas você precisa?
            </span>
            <span className="group-hover/cta:bg-red-primary group-hover/cta:border-red-primary flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 transition-colors duration-300">
              <ArrowUpRight
                aria-hidden
                className="ease-out-expo size-[18px] transition-transform duration-500 group-hover/cta:rotate-45"
              />
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}
