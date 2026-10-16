"use client"

import {
  memo,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react"
import { ArrowRight, Lock, Monitor, MoveHorizontal, Plus, Smartphone, Tablet } from "lucide-react"
import { PlaygroundBar } from "@/components/capabilities-demo-tag"
import { cn } from "@/lib/utils"

/*
 * Playground de responsividade: um mini site de verdade numa moldura de
 * navegador, com uma alça que redimensiona do desktop ao celular. O layout
 * reflui ao vivo por container queries (nada de JavaScript decidindo o
 * layout). A largura é "virtual": o site é desenhado em px de verdade (390,
 * 820, 1280) e a moldura mostra tudo em escala, para caber no painel.
 */

const MIN = 320
const MAX = 1280
/** Menor escala da prévia: no celular, a moldura vai do celular ao tablet. */
const MIN_SCALE = 0.42
/** Barra do navegador, fora da escala (px de tela). */
const BAR = 30

type Bp = "celular" | "tablet" | "desktop"
const bpOf = (w: number): Bp =>
  w < 640 ? "celular" : w < 1024 ? "tablet" : "desktop"

const PRESETS = [
  { bp: "celular", w: 390, label: "Celular", icon: Smartphone },
  { bp: "tablet", w: 820, label: "Tablet", icon: Tablet },
  { bp: "desktop", w: MAX, label: "Desktop", icon: Monitor },
] as const

const BP_LABEL: Record<Bp, string> = {
  celular: "Layout de celular",
  tablet: "Layout de tablet",
  desktop: "Layout de desktop",
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/* ---------- Web Vitals reais desta página ---------- */

type Shift = PerformanceEntry & { value: number; hadRecentInput: boolean }

/**
 * LCP, CLS e a interação mais lenta (aproximação do INP), medidos no
 * navegador de quem está vendo. `buffered` traz o que já aconteceu antes de
 * o playground montar.
 */
function useVitals() {
  const [v, setV] = useState<{ lcp?: number; cls: number; inp?: number }>({
    cls: 0,
  })
  useEffect(() => {
    const list: PerformanceObserver[] = []
    const watch = (
      type: string,
      cb: (entries: PerformanceEntry[]) => void,
      extra: Record<string, unknown> = {},
    ) => {
      try {
        const o = new PerformanceObserver((l) => cb(l.getEntries()))
        o.observe({ type, buffered: true, ...extra } as PerformanceObserverInit)
        list.push(o)
      } catch {
        // Navegador sem suporte a esse tipo: o valor fica como "—"
      }
    }
    // CLS como o Chrome calcula: a pior "janela" de shifts (até 5 s, com
    // intervalos menores que 1 s entre eles), não a soma de tudo
    let cls = 0
    let session = 0
    let first = 0
    let last = 0
    watch("largest-contentful-paint", (es) => {
      const end = es.at(-1)
      if (end) setV((s) => ({ ...s, lcp: end.startTime }))
    })
    watch("layout-shift", (es) => {
      for (const e of es as Shift[]) {
        if (e.hadRecentInput) continue
        const t = e.startTime
        if (session && t - last < 1000 && t - first < 5000) session += e.value
        else {
          session = e.value
          first = t
        }
        last = t
        cls = Math.max(cls, session)
      }
      setV((s) => ({ ...s, cls }))
    })
    watch(
      "event",
      (es) => {
        const max = Math.max(0, ...es.map((e) => e.duration))
        if (max) setV((s) => ({ ...s, inp: Math.max(s.inp ?? 0, max) }))
      },
      { durationThreshold: 16 },
    )
    return () => list.forEach((o) => o.disconnect())
  }, [])
  return v
}

const fmt = (n: number, digits: number) => n.toFixed(digits).replace(".", ",")

function Vital({
  id,
  value,
  good,
}: {
  id: string
  value: string | null
  good: boolean
}) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          value === null ? "bg-white/25" : good ? "bg-emerald-400" : "bg-amber-400",
        )}
      />
      <span className="text-muted-foreground">{id}</span>
      <span className="text-foreground tabular-nums">{value ?? "—"}</span>
    </span>
  )
}

/* ---------- O mini site ---------- */

const PRODUTOS = [
  { nome: "Catuaí Amarelo", notas: "Caramelo e laranja", preco: "R$ 48", cor: "#E50914" },
  { nome: "Bourbon Vermelho", notas: "Chocolate e frutas vermelhas", preco: "R$ 52", cor: "#0B0B0C" },
  { nome: "Blend da Casa", notas: "Encorpado, para todo dia", preco: "R$ 39", cor: "#8A867E" },
]

/** Grão de café em SVG (sem imagem para carregar). */
function Bean({ className, fill = "#E50914" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 100 140" aria-hidden className={className}>
      <ellipse cx="50" cy="70" rx="40" ry="58" fill={fill} />
      <path
        d="M50 14 C 28 48, 72 92, 50 126"
        fill="none"
        stroke="#0B0B0C"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}

/**
 * Site de uma torrefação fictícia, desenhado em px de verdade. Três layouts
 * por container query: celular (< 640), tablet (640–1023) e desktop (1024+).
 * Memorizado: arrastar a alça não re-renderiza nada daqui (só o CSS reflui).
 */
const MiniSite = memo(function MiniSite() {
  return (
    <div className="@container/site flex h-full flex-col overflow-hidden bg-[#ECEAE4] font-sans text-[#0B0B0C]">
      {/* Navegação: celular só com o menu; tablet ganha o botão; desktop, os links */}
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#0B0B0C]/10 px-6 @[40rem]/site:px-10 @[64rem]/site:h-[88px] @[64rem]/site:px-14">
        <span className="flex items-center gap-2.5">
          <span className="size-[18px] rounded-[5px] bg-[#E50914]" />
          <span className="text-display text-[22px] tracking-normal">NORTE</span>
        </span>
        <nav className="hidden items-center gap-10 text-[17px] text-[#0B0B0C]/70 @[64rem]/site:flex">
          <span className="text-[#0B0B0C]">Cafés</span>
          <span>Assinatura</span>
          <span>Cafeterias</span>
          <span>Sobre</span>
        </nav>
        <span className="flex items-center gap-3">
          <span className="hidden h-12 items-center rounded-full bg-[#0B0B0C] px-7 text-[16px] font-medium text-[#ECEAE4] @[40rem]/site:inline-flex">
            Assinar
          </span>
          <span className="flex size-12 flex-col items-center justify-center gap-[6px] rounded-full border border-[#0B0B0C]/15 @[64rem]/site:hidden">
            <span className="h-[2px] w-5 rounded-full bg-current" />
            <span className="h-[2px] w-5 rounded-full bg-current" />
          </span>
        </span>
      </header>

      {/* Destaque: empilhado no celular, duas colunas do tablet em diante */}
      <section className="grid gap-7 px-6 pt-7 @[40rem]/site:grid-cols-[1.25fr_1fr] @[40rem]/site:items-center @[40rem]/site:gap-10 @[40rem]/site:px-10 @[40rem]/site:pt-12 @[64rem]/site:grid-cols-[1.15fr_1fr] @[64rem]/site:gap-16 @[64rem]/site:px-14 @[64rem]/site:pt-16">
        <div className="order-2 @[40rem]/site:order-1">
          <p className="font-mono text-[13px] tracking-[0.2em] text-[#5D5B56] uppercase">
            Torrefação artesanal
          </p>
          <p className="text-display-2 mt-4 text-[46px] leading-[0.92] @[40rem]/site:text-[60px] @[64rem]/site:text-[78px]">
            Café fresco
            <br />
            toda semana.
          </p>
          <p className="mt-5 max-w-[32ch] text-[18px] leading-relaxed text-[#5D5B56] @[64rem]/site:mt-7 @[64rem]/site:text-[21px]">
            Torramos em pequenos lotes e entregamos em até 3 dias, em todo o Brasil.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 @[64rem]/site:mt-9">
            <span className="inline-flex h-14 items-center gap-2.5 rounded-full bg-[#E50914] px-7 text-[17px] font-medium text-white">
              Ver os cafés <ArrowRight aria-hidden className="size-5" />
            </span>
            <span className="hidden h-14 items-center rounded-full border border-[#0B0B0C]/20 px-7 text-[17px] font-medium @[64rem]/site:inline-flex">
              Como funciona
            </span>
          </div>
        </div>

        <div className="relative order-1 aspect-[16/10] overflow-hidden rounded-[28px] bg-[#0B0B0C] @[40rem]/site:order-2 @[40rem]/site:aspect-[4/5] @[64rem]/site:aspect-square @[64rem]/site:rounded-[36px]">
          <span className="absolute -top-[20%] -right-[10%] size-[80%] rounded-full bg-[radial-gradient(circle,rgb(229_9_20/0.35),transparent_65%)]" />
          <Bean className="absolute top-[14%] left-[30%] w-[30%] rotate-[24deg] drop-shadow-[0_24px_30px_rgb(0_0_0/0.5)] @[40rem]/site:top-[22%] @[40rem]/site:left-[24%] @[40rem]/site:w-[48%]" />
          <Bean
            fill="#ECEAE4"
            className="absolute top-[52%] left-[10%] w-[12%] -rotate-[30deg] @[40rem]/site:top-[62%] @[40rem]/site:w-[18%]"
          />
          <Bean
            fill="#FF343B"
            className="absolute top-[8%] left-[72%] w-[9%] rotate-[70deg] opacity-70 @[40rem]/site:top-[10%] @[40rem]/site:w-[13%]"
          />
          <span className="absolute bottom-5 left-5 inline-flex h-9 items-center rounded-full bg-[#ECEAE4] px-4 font-mono text-[12px] tracking-[0.12em] uppercase @[64rem]/site:bottom-7 @[64rem]/site:left-7 @[64rem]/site:h-11 @[64rem]/site:text-[14px]">
            Lote 07 · 250 g
          </span>
        </div>
      </section>

      {/* Produtos: 1 coluna no celular, 2 no tablet, 3 no desktop */}
      <section className="mt-12 px-6 @[40rem]/site:px-10 @[64rem]/site:mt-20 @[64rem]/site:px-14">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-display-2 text-[28px] @[64rem]/site:text-[34px]">Mais pedidos</p>
          <span className="text-[16px] text-[#5D5B56]">Ver todos →</span>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 @[40rem]/site:grid-cols-2 @[64rem]/site:grid-cols-3 @[64rem]/site:gap-5">
          {PRODUTOS.map((p, i) => (
            <article
              key={p.nome}
              className={cn(
                "flex items-center gap-5 rounded-[22px] border border-[#0B0B0C]/10 bg-white/55 p-5",
                i === 2 && "@[40rem]/site:hidden @[64rem]/site:flex",
              )}
            >
              <span
                className="relative flex h-24 w-[72px] shrink-0 items-end justify-center rounded-[14px] pb-3"
                style={{ background: p.cor }}
              >
                <span className="h-[3px] w-8 rounded-full bg-white/60" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[19px] font-semibold">{p.nome}</span>
                <span className="mt-1 block truncate text-[15px] text-[#5D5B56]">{p.notas}</span>
                <span className="mt-3 block text-[17px] font-medium">{p.preco}</span>
              </span>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#0B0B0C] text-[#ECEAE4]">
                <Plus aria-hidden className="size-5" />
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
})

/* ---------- Playground ---------- */

/** Promise de espera que o efeito consegue cancelar. */
function timer() {
  const ids = new Set<ReturnType<typeof setTimeout>>()
  return {
    wait: (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => {
          ids.delete(id)
          resolve()
        }, ms)
        ids.add(id)
      }),
    clear: () => {
      ids.forEach(clearTimeout)
      ids.clear()
    },
  }
}

export function WebPlayground({ active }: { active: boolean }) {
  const reduce = useReducedMotion()
  const areaRef = useRef<HTMLDivElement>(null)
  /** Largura "virtual" do site, em px de CSS dele. */
  const width = useMotionValue(MAX)
  const scale = useMotionValue(1)
  const areaH = useMotionValue(520)
  const [maxW, setMaxW] = useState(MAX)
  const maxRef = useRef(MAX)
  const [wNow, setWNow] = useState(MAX)
  const [dragging, setDragging] = useState(false)
  const [touched, setTouched] = useState(false)
  const [hinting, setHinting] = useState(false)
  const anim = useRef<AnimationPlaybackControls | null>(null)
  const drag = useRef<{ x: number; w: number } | null>(null)
  const vitals = useVitals()

  useMotionValueEvent(width, "change", (v) => setWNow(Math.round(v)))

  // Escala = largura disponível / 1280 (com piso). Se o site estava no
  // máximo, continua no máximo quando a área muda
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width: aw, height: ah } = entry.contentRect
      const s = clamp(aw / MAX, MIN_SCALE, 1)
      const mw = Math.max(MIN, Math.min(MAX, Math.floor(aw / s)))
      const wasMax = width.get() >= maxRef.current - 1
      maxRef.current = mw
      scale.set(s)
      areaH.set(ah)
      setMaxW(mw)
      if (wasMax || width.get() > mw) width.set(mw)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [scale, areaH, width])

  const frameW = useTransform(() => width.get() * scale.get())
  const innerH = useTransform(() => Math.max(0, areaH.get() - BAR) / scale.get())

  // Os tamanhos prontos animam em menos de 500 ms: o reflow do mini site fica
  // dentro da janela do clique e não conta como layout shift (CLS) da página
  const go = (w: number) => {
    anim.current?.stop()
    anim.current = animate(
      width,
      clamp(w, MIN, maxRef.current),
      reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
    )
  }

  const take = () => {
    if (!touched) setTouched(true)
    setHinting(false)
  }

  // Dica, na primeira vez que o painel aparece: a alça "chama" o arraste.
  // Só transform (a pílula balança), sem redimensionar o site sozinho: um
  // reflow sem clique contaria como layout shift
  useEffect(() => {
    if (!active || touched || reduce) return
    const t = timer()
    let cancelled = false
    ;(async () => {
      await t.wait(700)
      if (!cancelled) setHinting(true)
      await t.wait(12000)
      if (!cancelled) setHinting(false)
    })()
    return () => {
      cancelled = true
      t.clear()
    }
  }, [active, touched, reduce])

  const onDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    take()
    anim.current?.stop()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, w: width.get() }
    setDragging(true)
  }
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current) return
    const next = drag.current.w + (e.clientX - drag.current.x) / scale.get()
    width.set(clamp(next, MIN, maxRef.current))
  }
  const onUp = () => {
    drag.current = null
    setDragging(false)
  }

  // Clique na área vazia: a moldura vai até ali e o arraste continua. Só
  // mouse: no toque, encostar ali é começar a rolar a página
  const onAreaDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.pointerType !== "mouse" || e.target !== e.currentTarget)
      return
    const r = e.currentTarget.getBoundingClientRect()
    take()
    anim.current?.stop()
    const w = clamp((e.clientX - r.left) / scale.get(), MIN, maxRef.current)
    width.set(w)
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, w }
    setDragging(true)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 100 : 20
    const map: Record<string, number> = {
      ArrowLeft: wNow - step,
      ArrowDown: wNow - step,
      ArrowRight: wNow + step,
      ArrowUp: wNow + step,
      PageDown: wNow - 160,
      PageUp: wNow + 160,
      Home: MIN,
      End: maxRef.current,
    }
    if (!(e.key in map)) return
    e.preventDefault()
    take()
    anim.current?.stop()
    width.set(clamp(map[e.key], MIN, maxRef.current))
  }

  const bp = bpOf(wNow)
  const presets = PRESETS.filter((p) => p.w <= maxW || p.bp !== "desktop")

  return (
    <div className="flex h-full flex-col">
      <PlaygroundBar
        icon={<MoveHorizontal />}
        hint={
          <>
            Arraste a alça: o mesmo site se reorganiza do desktop ao celular.
          </>
        }
      />

      {/* Tamanhos prontos e a largura atual */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 pt-4 sm:px-5">
        <div
          role="group"
          aria-label="Tamanho da tela"
          className="flex rounded-full border border-white/10 bg-white/[0.02] p-1"
        >
          {presets.map((p) => {
            const on = bp === p.bp
            const Icon = p.icon
            return (
              <button
                key={p.bp}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  take()
                  go(p.w)
                }}
                className={cn(
                  "relative flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-red-light/60",
                  on ? "text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="cap-web-preset"
                    transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-foreground absolute inset-0 rounded-full"
                  />
                )}
                <Icon aria-hidden className="relative size-3.5" />
                <span className="relative">{p.label}</span>
              </button>
            )
          })}
        </div>
        <p className="flex items-baseline gap-2.5 font-mono" aria-live="off">
          <span className="text-foreground text-xl tabular-nums sm:text-2xl">
            {wNow}
            <span className="text-muted-foreground ml-1 text-xs">px</span>
          </span>
          <motion.span
            key={bp}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-red-light text-[11px] tracking-[0.14em] uppercase"
          >
            {BP_LABEL[bp]}
          </motion.span>
        </p>
      </div>

      {/* Área de arraste: a moldura do navegador encosta à esquerda */}
      <div
        ref={areaRef}
        onPointerDown={onAreaDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={cn(
          "bg-grid relative mx-4 mt-4 min-h-0 flex-1 rounded-xl bg-[size:32px_32px] sm:mx-5",
          dragging ? "cursor-ew-resize" : "cursor-default",
        )}
      >
        <motion.div
          style={{ width: frameW }}
          className={cn(
            "absolute inset-y-0 left-0 flex flex-col overflow-hidden rounded-xl border bg-[#0b0b0d] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] transition-[border-color] duration-300",
            dragging ? "border-red-light/50" : "border-white/10",
          )}
        >
          {/* Barra do navegador (fora da escala) */}
          <div
            className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3"
            style={{ height: BAR }}
          >
            <span aria-hidden className={cn("flex shrink-0 gap-1.5", wNow < 520 && "hidden")}>
              <span className="size-2 rounded-full bg-white/12" />
              <span className="size-2 rounded-full bg-white/12" />
              <span className="size-2 rounded-full bg-white/12" />
            </span>
            <span className="text-muted-foreground mx-auto flex min-w-0 items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-0.5 font-mono text-[10px]">
              <Lock aria-hidden className="size-2.5 shrink-0" />
              <span className="truncate">norte.com.br</span>
            </span>
          </div>
          <div aria-hidden className="relative min-h-0 flex-1 overflow-hidden">
            <motion.div
              style={{ width, height: innerH, scale, transformOrigin: "0 0" }}
              className="absolute top-0 left-0"
            >
              <MiniSite />
            </motion.div>
          </div>
        </motion.div>

        {/* Alça: faixa larga (toque) com a pílula no meio */}
        <motion.div
          role="slider"
          tabIndex={0}
          aria-label="Largura do site na prévia"
          aria-valuemin={MIN}
          aria-valuemax={maxW}
          aria-valuenow={wNow}
          aria-valuetext={`${wNow} px, ${BP_LABEL[bp].toLowerCase()}`}
          onPointerDown={onDown}
          onKeyDown={onKey}
          style={{ x: frameW }}
          className="group/handle absolute inset-y-0 left-0 z-10 flex w-11 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center outline-none"
        >
          <motion.span
            animate={hinting ? { x: [0, -14, 0, -14, 0, 0] } : { x: 0 }}
            transition={
              hinting
                ? { duration: 2.2, times: [0, 0.14, 0.3, 0.44, 0.6, 1], repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 }
            }
            className={cn(
              "relative flex h-16 w-3.5 flex-col items-center justify-center gap-1 rounded-full bg-[#f2f2f0] shadow-[0_8px_24px_-6px_rgb(0_0_0/0.8)] ring-red-light/60 transition-[scale,background-color] duration-300 group-hover/handle:scale-110 group-focus-visible/handle:ring-3",
              (dragging || hinting) && "bg-red-light",
              dragging && "scale-110",
            )}
          >
            <span className="h-px w-1.5 bg-black/40" />
            <span className="h-px w-1.5 bg-black/40" />
            <span className="h-px w-1.5 bg-black/40" />
          </motion.span>
          {/* Balão da dica, à esquerda da alça */}
          <AnimatePresence>
            {hinting && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="bg-foreground text-background pointer-events-none absolute top-1/2 right-[calc(100%-0.25rem)] flex -translate-y-1/2 items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2.5 text-[12px] font-medium whitespace-nowrap shadow-[0_10px_30px_-10px_rgb(0_0_0/0.8)]"
              >
                <MoveHorizontal className="size-3.5" />
                Arraste
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Números reais desta página, no navegador de quem vê */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 font-mono text-[11px] sm:px-5">
        <span className="text-foreground/70">Esta página, medida agora:</span>
        <Vital
          id="LCP"
          value={vitals.lcp === undefined ? null : `${fmt(vitals.lcp / 1000, 1)} s`}
          good={(vitals.lcp ?? 0) <= 2500}
        />
        <Vital id="CLS" value={fmt(vitals.cls, 2)} good={vitals.cls <= 0.1} />
        <Vital
          id="INP"
          value={vitals.inp === undefined ? null : `${Math.round(vitals.inp)} ms`}
          good={(vitals.inp ?? 0) <= 200}
        />
      </div>
    </div>
  )
}
