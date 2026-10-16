"use client"

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
} from "react"
import { createPortal } from "react-dom"
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react"
import { ArrowUpRight } from "lucide-react"
import type { Project } from "@/lib/projects"
import { useScramble } from "@/components/chrome-scramble"
import {
  BrowserBar,
  ProjectVideo,
  VIDEO_ASPECT,
  posterOf,
  shortHost,
} from "@/components/work-browser"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const
/** Mola da prévia: segue o cursor com um atraso macio, sem quicar. */
const FOLLOW = { stiffness: 170, damping: 24, mass: 0.7 }

const pad = (n: number) => String(n).padStart(2, "0")
const noop = () => () => {}

/**
 * Índice editorial (desktop com mouse): linhas largas por projeto. Ao passar
 * o mouse, a linha acende e uma prévia com o site rodando segue o cursor.
 * Pelo teclado, o foco no link faz o mesmo, ancorando a prévia na linha.
 */
export function WorkIndex({
  projects,
  start = 2,
  total,
}: {
  projects: Project[]
  /** Número do primeiro item (o destaque é o 01). */
  start?: number
  total: number
}) {
  const reduce = useReducedMotion() ?? false
  const isClient = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
  const listRef = useRef<HTMLOListElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const [active, setActive] = useState<number | null>(null)
  // Último ativo: a prévia some mostrando ele, sem trocar no meio da saída
  const [shown, setShown] = useState(0)
  if (active !== null && active !== shown) setShown(active)
  const visible = active !== null

  /* ----- Posição da prévia (coordenadas da janela) ----- */
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, FOLLOW)
  const sy = useSpring(y, FOLLOW)
  // Inclina na direção do movimento, como um papel arrastado
  const vx = useVelocity(sx)
  const tilt = useSpring(
    useTransform(vx, [-2200, 2200], [-8, 8], { clamp: true }),
    { stiffness: 220, damping: 26 },
  )
  const progress = useMotionValue(0)

  const pointer = useRef({ x: 0, y: 0, inside: false })
  // Nada da prévia (poster, vídeo) carrega antes da primeira aproximação
  const [warmed, setWarmed] = useState(false)

  const size = () => ({
    w: cardRef.current?.offsetWidth ?? 440,
    h: cardRef.current?.offsetHeight ?? 300,
    vw: document.documentElement.clientWidth,
    vh: window.innerHeight,
  })

  const moveTo = (tx: number, ty: number, jump: boolean) => {
    if (jump || reduce) {
      x.jump(tx)
      y.jump(ty)
      sx.jump(tx)
      sy.jump(ty)
    } else {
      x.set(tx)
      y.set(ty)
    }
  }

  /**
   * A prévia segue o cursor nos dois eixos, presa ao retângulo da lista.
   * No x fica ao lado do cursor (à direita; sem espaço, à esquerda), para
   * não tapar o ponto que o mouse aponta. No y fica centrada na linha ativa
   * e acompanha um pouco o cursor dentro dela; o topo nunca sobe acima do
   * cabeçalho das colunas e a base não passa da última linha. Sem cursor
   * (teclado), centrada na linha focada e encostada à direita.
   */
  const place = (
    row: Element,
    cx: number | null,
    cy: number | null,
    jump: boolean,
  ) => {
    const { w, h, vw, vh } = size()
    const r = row.getBoundingClientRect()
    const list = listRef.current?.getBoundingClientRect() ?? r
    const head = headRef.current?.getBoundingClientRect()
    const left = Math.max(list.left, 16)
    const right = Math.min(list.right, vw - 16)
    const gap = 40
    const tx =
      cx === null
        ? right - w - 72
        : cx + gap + w <= right
          ? cx + gap
          : cx - gap - w
    const mid = r.top + r.height / 2
    const center = cy === null ? mid : mid + (cy - mid) * 0.35
    // Teto: abaixo do cabeçalho das colunas e do header fixo do site
    const top = Math.max((head?.bottom ?? list.top) + 12, 80)
    const floor = Math.min(list.bottom, vh - 16)
    moveTo(
      Math.min(Math.max(tx, left), right - w),
      // O teto vence: com pouca lista à vista, a prévia desce, não sobe
      Math.max(Math.min(center - h / 2, floor - h), top),
      jump,
    )
  }
  const focused = useRef<Element | null>(null)

  // Pré-carrega os posters na primeira aproximação: a prévia nunca abre preta
  const warm = () => {
    if (warmed) return
    setWarmed(true)
    for (const p of projects) {
      const img = new Image()
      img.src = posterOf(p)
    }
  }

  const rowAt = (cx: number, cy: number) => {
    const el = document
      .elementFromPoint(cx, cy)
      ?.closest<HTMLElement>("[data-row]")
    if (!el || !listRef.current?.contains(el)) return null
    return el
  }

  // Rolando com o mouse parado, a linha sob o cursor muda: reavalia
  useEffect(() => {
    if (!visible) return
    const onScroll = () => {
      const p = pointer.current
      if (!p.inside) {
        // Foco de teclado: a prévia acompanha a linha
        if (focused.current) place(focused.current, null, null, false)
        return
      }
      const row = rowAt(p.x, p.y)
      setActive(row ? Number(row.dataset.row) : null)
      if (row) place(row, p.x, p.y, false)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  })

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return
    warm()
    const first = !pointer.current.inside || active === null
    pointer.current = { x: e.clientX, y: e.clientY, inside: true }
    const row = rowAt(e.clientX, e.clientY)
    const i = row ? Number(row.dataset.row) : null
    if (i !== active) setActive(i)
    if (row) place(row, e.clientX, e.clientY, first)
  }
  const onPointerLeave = () => {
    pointer.current.inside = false
    setActive(null)
  }

  /* ----- Teclado: a prévia ancora na linha focada ----- */
  const onFocusRow = (i: number, e: FocusEvent<HTMLElement>) => {
    warm()
    const row = e.currentTarget.closest("[data-row]")
    if (!row) return
    focused.current = row
    if (pointer.current.inside) return
    place(row, null, null, active === null)
    setActive(i)
  }
  const onBlurRow = (e: FocusEvent<HTMLElement>) => {
    // Foco indo para outra linha: o próximo onFocus assume, sem piscar
    if (listRef.current?.contains(e.relatedTarget as Node | null)) return
    focused.current = null
    if (!pointer.current.inside) setActive(null)
  }

  const current = projects[shown]

  return (
    <div className="relative">
      {/* Cabeçalho da tabela */}
      <div
        ref={headRef}
        aria-hidden
        className="text-label grid grid-cols-12 gap-x-6 pb-4 text-[10px] text-muted-foreground/80"
      >
        <span>Nº</span>
        <span className="col-span-7">Projeto</span>
        <span className="col-span-3">Segmento / escopo</span>
        <span className="text-right">Link</span>
      </div>

      <ol
        ref={listRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="border-t border-border"
      >
        {projects.map((p, i) => (
          <IndexRow
            key={p.slug}
            project={p}
            index={i}
            number={pad(start + i)}
            active={active === i}
            dim={visible && active !== i}
            onFocus={(e) => onFocusRow(i, e)}
            onBlur={onBlurRow}
          />
        ))}
      </ol>

      {/* Prévia flutuante: fora da árvore da seção, presa à janela */}
      {isClient &&
        createPortal(
          <motion.div
            aria-hidden
            style={{
              x: reduce ? x : sx,
              y: reduce ? y : sy,
              rotate: reduce ? 0 : tilt,
            }}
            className="pointer-events-none fixed top-0 left-0 z-50 hidden lg:pointer-fine:block"
          >
            <motion.div
              ref={cardRef}
              initial={false}
              animate={
                visible
                  ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                  : { opacity: 0, scale: 0.72, filter: "blur(6px)" }
              }
              transition={{ duration: visible ? 0.5 : 0.35, ease: EASE }}
              className="w-[clamp(400px,36vw,540px)] overflow-hidden rounded-[12px] border border-white/[0.12] bg-[#0b0b0d] shadow-[0_50px_100px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(0_0_0/0.6)]"
            >
              <BrowserBar
                size="sm"
                host={<SwapText k={current.slug}>{current.host}</SwapText>}
                right={
                  <span className="font-mono text-[10px] text-white/40 tabular-nums">
                    {pad(start + shown)}/{pad(total)}
                  </span>
                }
              />
              <div
                className={cn(
                  "relative overflow-hidden bg-background",
                  VIDEO_ASPECT,
                )}
              >
                <AnimatePresence initial={false}>
                  {warmed && (
                    <motion.div
                      key={current.slug}
                      className="absolute inset-0"
                      initial={{ clipPath: "inset(100% 0% 0% 0%)", zIndex: 1 }}
                      animate={{ clipPath: "inset(0% 0% 0% 0%)", zIndex: 1 }}
                      // Quem sai escurece e afunda por baixo da cortina nova
                      exit={{
                        zIndex: 0,
                        scale: 1.06,
                        filter: "brightness(0.35)",
                      }}
                      transition={{ duration: 0.6, ease: EASE }}
                    >
                      <PreviewLayer
                        project={current}
                        playing={visible && !reduce}
                        progress={progress}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="absolute inset-x-0 bottom-0 z-10 h-[2px] bg-white/10">
                  <motion.div
                    style={{ scaleX: progress }}
                    className="h-full origin-left bg-red-light"
                  />
                </div>
              </div>
              {/* Legenda: o que foi feito e com o quê */}
              <div className="border-t border-white/[0.06] px-4 pt-3.5 pb-4">
                <SwapText k={current.slug} as="div">
                  <p className="line-clamp-3 text-[13px] leading-snug text-pretty text-foreground/75">
                    {current.description}
                  </p>
                  <p className="mt-3 truncate font-mono text-[10px] tracking-[0.14em] text-white/40 uppercase">
                    {current.tags.join("  ·  ")}
                  </p>
                </SwapText>
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
    </div>
  )
}

/* ---------- Linha ---------- */

function IndexRow({
  project: p,
  index,
  number,
  active,
  dim,
  onFocus,
  onBlur,
}: {
  project: Project
  index: number
  number: string
  active: boolean
  dim: boolean
  onFocus: (e: FocusEvent<HTMLElement>) => void
  onBlur: (e: FocusEvent<HTMLElement>) => void
}) {
  const host = shortHost(p.host)
  // Escopo em mono embaralha ao acender a linha (o mesmo efeito do menu)
  const [scope, scramble] = useScramble(p.scope)
  useEffect(() => {
    if (active) scramble()
  }, [active, scramble])
  // Ativa desliza e abre os eixos da Archivo (100/650 → 125/800, a voz do
  // H2); as outras viram só contorno (esmaecer tipográfico, não opacidade).
  // A altura da linha não muda: só a largura do nome cresce.
  const name = (
    <span
      className={cn(
        "ease-out-expo inline-block [-webkit-text-stroke-width:1px] transition-[translate,color,-webkit-text-stroke-color,font-variation-settings] duration-[700ms,700ms,700ms,500ms] motion-reduce:transition-none",
        active
          ? "translate-x-6 [font-variation-settings:'wdth'_125,'wght'_800]"
          : "[font-variation-settings:'wdth'_100,'wght'_650]",
        // A prévia fica centrada nesta linha: o nome ativo passa por cima
        // dela, em "difference" (branco no preto, invertido sobre a imagem)
        active && "relative z-[51] mix-blend-difference",
        dim
          ? "text-transparent [-webkit-text-stroke-color:rgb(242_242_240/0.26)]"
          : "text-foreground [-webkit-text-stroke-color:transparent]",
      )}
    >
      {p.name}
    </span>
  )
  const fade = cn("transition-opacity duration-500", dim && "opacity-25")

  return (
    <motion.li
      data-row={index}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay: (index % 5) * 0.05 }}
      className="relative"
    >
      <div
        className={cn(
          // Altura mínima igual para todas: a linha com endereço não quebra o ritmo
          "relative grid min-h-32 grid-cols-12 items-center gap-x-6 border-b border-border py-7 xl:py-8",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-red-light/70",
        )}
      >
        {/* Linha de base que corre da esquerda quando ativa */}
        <span
          aria-hidden
          className={cn(
            "ease-out-expo absolute inset-x-0 -bottom-px h-px origin-left bg-foreground/60 transition-transform duration-700",
            active ? "scale-x-100" : "scale-x-0",
          )}
        />

        <span
          className={cn(
            "font-mono text-xs tabular-nums transition-[color,opacity] duration-300",
            dim && "opacity-25",
            active ? "text-red-light" : "text-muted-foreground",
          )}
        >
          {number}
        </span>

        <h3 className="text-display col-span-7 text-[clamp(2.25rem,4.1vw,4.5rem)] leading-[0.95] tracking-[-0.04em] whitespace-nowrap">
          {p.url ? (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onFocus={onFocus}
              onBlur={onBlur}
              className="block outline-none after:absolute after:inset-0 after:z-10"
            >
              {name}
              <span className="sr-only"> (abre {host} em nova aba)</span>
            </a>
          ) : (
            name
          )}
        </h3>
        {/* Sem link público: o teclado ainda chega na linha e vê o site
            rodando na prévia (o botão cobre a linha, como o link das outras) */}
        {!p.url && (
          <button
            type="button"
            aria-label={`Ver o site ${p.name} rodando`}
            onFocus={onFocus}
            onBlur={onBlur}
            // Acima do nome ativo (z-51): o foco nunca fica "por baixo" dele
            className="absolute inset-0 z-[52] outline-none"
          />
        )}

        <div className={cn("col-span-3 min-w-0", fade)}>
          <p className="text-[15px] leading-tight text-foreground/90">
            {p.segment}
          </p>
          <p
            className={cn(
              "text-label mt-2 text-[10px] transition-colors duration-300",
              active ? "text-foreground/70" : "text-muted-foreground",
            )}
          >
            <span aria-hidden>{scope}</span>
            <span className="sr-only">{p.scope}</span>
          </p>
          {!p.url && (
            <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground/80">
              {host}
            </p>
          )}
        </div>

        <div className={cn("flex justify-end", fade)}>
          {p.url ? (
            <span
              aria-hidden
              className={cn(
                "flex size-12 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-500",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-white/15 text-foreground/70",
              )}
            >
              <ArrowUpRight
                className={cn(
                  "ease-out-expo size-5 transition-transform duration-500",
                  active && "rotate-45",
                )}
              />
            </span>
          ) : (
            <span
              title="Sem link público"
              className="flex size-12 items-center justify-center rounded-full border border-dashed border-white/10"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-white/20" />
              <span className="sr-only">sem link público</span>
            </span>
          )}
        </div>

        <p className="sr-only">{p.description}</p>
      </div>
    </motion.li>
  )
}

/* ---------- Prévia ---------- */

/** Uma camada da prévia: poster na hora; o vídeo só monta se o hover durar. */
function PreviewLayer({
  project,
  playing,
  progress,
}: {
  project: Project
  playing: boolean
  progress: MotionValue<number>
}) {
  const present = useIsPresent()
  // Passando rápido pelas linhas, nenhum vídeo é baixado à toa
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    // Camada saindo antes de armar não monta vídeo nenhum
    if (!present) return
    const t = setTimeout(() => setArmed(true), 160)
    return () => clearTimeout(t)
  }, [present])
  // Régua zera ao trocar de projeto
  useEffect(() => {
    progress.set(0)
  }, [progress])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- poster já pré-carregado, troca instantânea */}
      <img
        src={posterOf(project)}
        alt=""
        className="absolute inset-0 size-full object-cover object-top"
      />
      {armed && (
        <ProjectVideo
          project={project}
          playing={playing && present}
          progress={present ? progress : undefined}
          className="absolute inset-0"
        />
      )}
    </>
  )
}

/** Texto que troca subindo (endereço e legenda da prévia). */
function SwapText({
  k,
  children,
  className,
  as = "span",
}: {
  k: string
  children: React.ReactNode
  className?: string
  /** "div" quando o conteúdo tem blocos (parágrafos). */
  as?: "span" | "div"
}) {
  const Wrap = as
  const Item = as === "div" ? motion.div : motion.span
  return (
    <Wrap className={cn("relative block overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <Item
          key={k}
          className="block"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {children}
        </Item>
      </AnimatePresence>
    </Wrap>
  )
}
