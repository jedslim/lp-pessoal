"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react"
import { Check } from "lucide-react"
import { useScramble } from "@/components/chrome-scramble"
import { scrollToTarget } from "@/components/smooth-scroll"
import { cn } from "@/lib/utils"

export type Step = {
  /** Nome curto da etapa (atalhos do painel e barra do celular). */
  label: string
  title: string
  body: string
  /** O que a pessoa tem em mãos ao fim da etapa. */
  gets: string[]
}

const EASE = [0.22, 1, 0.36, 1] as const

/* Reduced motion sem quebrar a hidratação: o servidor (e a 1ª passada do
 * cliente) assume "sem preferência"; o valor real entra logo depois. */
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)"
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useReduce = () =>
  useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  )

/**
 * A ponta da linha fica a 62% da altura da tela. Uma etapa "acende" quando o
 * nó dela passa desse ponto e continua acesa acima dele.
 */
const LIT_MARGIN = "100000px 0px -38% 0px" as const

/* Geometria (px). A linha principal corre em x=12; o desvio, em x=40. */
const LANE = 12
const LANE_B = 40
const CURVE = 56
const ROW = 40
/** Bolinhas do desvio (as rodadas de ajuste). */
const ROUNDS = 3
const branchHeight = CURVE * 2 + ROW * ROUNDS
const branchPath = `M${LANE} 0 C${LANE} 30 ${LANE_B} 26 ${LANE_B} ${CURVE} L${LANE_B} ${branchHeight - CURVE} C${LANE_B} ${branchHeight - 26} ${LANE} ${branchHeight - 30} ${LANE} ${branchHeight}`

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * Linha do tempo do processo. No desktop o título fica preso à esquerda com
 * um painel de progresso; as etapas rolam à direita, ligadas por uma linha
 * que a rolagem desenha.
 */
export function ProcessSteps({
  steps,
  branchBefore,
  intro,
  outro,
}: {
  steps: Step[]
  /** Etapa antes da qual a linha faz o desvio das rodadas de ajuste. */
  branchBefore?: number
  intro: ReactNode
  /** Fecho depois da última etapa (o convite para começar). */
  outro?: ReactNode
}) {
  const reduce = useReduce()
  const [lit, setLit] = useState<boolean[]>(() => steps.map(() => false))
  const onLit = useCallback((index: number, on: boolean) => {
    setLit((prev) =>
      prev[index] === on ? prev : prev.map((v, i) => (i === index ? on : v)),
    )
  }, [])
  const litCount = lit.filter(Boolean).length

  // A linha vai do centro do primeiro nó ao centro do último: medida no cliente
  const wrapRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState<{ top: number; height: number } | null>(null)
  // Última medida: o ResizeObserver dispara à toa e não deve re-renderizar
  const last = useRef<{ top: number; height: number } | null>(null)
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measure = () => {
      const nodes = wrap.querySelectorAll<HTMLElement>("[data-node]")
      if (nodes.length < 2) return
      const base = wrap.getBoundingClientRect().top
      const a = nodes[0].getBoundingClientRect()
      const b = nodes[nodes.length - 1].getBoundingClientRect()
      const top = a.top + a.height / 2 - base
      const height = b.top + b.height / 2 - base - top
      if (last.current?.top === top && last.current.height === height) return
      last.current = { top, height }
      setLine({ top, height })
      // O useScroll só remede o alvo ao rolar: avisa que a linha mudou
      requestAnimationFrame(() => window.dispatchEvent(new Event("scroll")))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ["start 0.62", "end 0.62"],
  })
  const tipY = useTransform(scrollYProgress, (v) => `${v * 100}%`)
  const tipOpacity = useTransform(
    scrollYProgress,
    [0, 0.004, 0.996, 1],
    [0, 1, 1, 0],
  )

  // Atalho do painel: leva o nó da etapa para o meio da tela (já aceso)
  const jumpTo = useCallback((index: number) => {
    const node =
      wrapRef.current?.querySelectorAll<HTMLElement>("[data-node]")[index]
    if (!node) return
    const top = node.getBoundingClientRect().top
    scrollToTarget(Math.max(0, window.scrollY + top - window.innerHeight * 0.5))
  }, [])

  return (
    <div className="grid gap-y-20 xl:grid-cols-[auto_minmax(0,1fr)] xl:gap-x-16">
      {/* Coluna presa: título + painel de progresso */}
      <div className="xl:sticky xl:top-28 xl:self-start">
        {intro}
        <Hud
          steps={steps}
          litCount={litCount}
          progress={scrollYProgress}
          reduce={reduce}
          onJump={jumpTo}
        />
      </div>

      <div className="min-w-0 max-w-[52rem] xl:max-w-none xl:pt-2">
        <div ref={wrapRef} className="relative">
          {/* Trilho apagado + traço vermelho que segue a rolagem */}
          <div
            ref={lineRef}
            aria-hidden
            className="pointer-events-none absolute w-0.5"
            style={{
              left: LANE - 1,
              top: line?.top ?? 0,
              height: line?.height ?? 0,
            }}
          >
            <div className="bg-border absolute inset-0" />
            <motion.div
              className="bg-red-primary absolute inset-0 origin-top"
              style={{ scaleY: reduce ? 1 : scrollYProgress }}
            />
            {!reduce && (
              <motion.div
                className="absolute inset-x-0 top-0 h-full"
                style={{ y: tipY, opacity: tipOpacity }}
              >
                {/* O único brilho da seção: a ponta da linha */}
                <span className="absolute top-0 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(229_9_20/0.16),transparent_62%)]" />
                <span
                  data-companion="process"
                  className="bg-red-light absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_14px_3px_rgb(255_52_59/0.65)]"
                />
              </motion.div>
            )}
          </div>

          <ol className="relative">
            {steps.map((step, i) => (
              <StepRow
                key={step.label}
                step={step}
                index={i}
                total={steps.length}
                last={i === steps.length - 1}
                tight={i === (branchBefore ?? -1) - 1}
                branch={i === branchBefore}
                reduce={reduce}
                onLit={onLit}
              />
            ))}
          </ol>
        </div>

        {outro && (
          <div className="mt-20 pl-10 sm:mt-24 sm:pl-[72px]">{outro}</div>
        )}

        {/* Sem o painel (abaixo do xl): barra de progresso presa no rodapé da tela */}
        <StatusLine
          steps={steps}
          litCount={litCount}
          progress={scrollYProgress}
          reduce={reduce}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function StepRow({
  step,
  index,
  total,
  last,
  tight,
  branch,
  reduce,
  onLit,
}: {
  step: Step
  index: number
  total: number
  last: boolean
  /** Logo antes do desvio: encurta o respiro para a curva colar na etapa. */
  tight: boolean
  /** O desvio entra antes desta etapa. */
  branch: boolean
  reduce: boolean
  onLit: (index: number, on: boolean) => void
}) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const inView = useInView(nodeRef, { margin: LIT_MARGIN })
  useEffect(() => onLit(index, inView), [index, inView, onLit])
  const on = reduce || inView

  return (
    <>
      {branch && <BranchRow reduce={reduce} />}
      <li
        className={cn(
          "group/step relative pl-10 sm:pl-[72px]",
          last ? "pb-0" : tight ? "pb-10 sm:pb-12" : "pb-16 sm:pb-28",
        )}
      >
        <Node ref={nodeRef} on={on} reduce={reduce} final={last} />

        {/* O tamanho do título segue a largura da coluna (cqi), não a da tela */}
        <div className="@container">
          <h3>
            <span
              className={cn(
                "text-label block transition-colors duration-500",
                on ? "text-red-light" : "text-muted-foreground",
              )}
            >
              <span className="sr-only">{`Etapa ${index + 1} de ${total}: `}</span>
              <span aria-hidden>{pad(index + 1)} · </span>
              {step.label}
            </span>
            <span
              className={cn(
                "text-display-2 mt-4 block text-[clamp(1.5rem,7.6cqi,2.6rem)] leading-[1.04] text-balance transition-colors duration-700",
                on ? "text-foreground" : "text-[#6b6b72]",
              )}
            >
              {step.title}
            </span>
          </h3>
          <p className="text-muted-foreground mt-6 max-w-[44ch] text-base leading-relaxed text-pretty sm:text-lg">
            {step.body}
          </p>

          {/* O que fica com a pessoa ao fim da etapa */}
          <ul aria-label="Você recebe" className="mt-6 flex flex-wrap gap-2">
            {step.gets.map((g, i) => (
              <li
                key={g}
                className={cn(
                  "ease-out-expo inline-flex h-8 items-center gap-2 rounded-full border pr-3.5 pl-2.5 text-[13px] transition-[border-color,color,opacity,translate] duration-700",
                  on
                    ? "text-foreground translate-y-0 border-white/20 opacity-100"
                    : "text-muted-foreground border-border translate-y-1 opacity-60",
                )}
                style={{
                  transitionDelay: on && !reduce ? `${150 + i * 90}ms` : "0ms",
                }}
              >
                <Check
                  aria-hidden
                  className={cn(
                    "size-3.5 transition-colors duration-500",
                    on ? "text-red-light" : "text-muted-foreground",
                  )}
                />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </li>
    </>
  )
}

/** O desvio: a linha sai da principal, passa por três bolinhas e volta. */
function BranchRow({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.62", "end 0.62"],
  })
  // Sem isso a ponta arredondada vira um ponto solto antes de a linha chegar
  const opacity = useTransform(scrollYProgress, [0, 0.02], [0, 1])

  return (
    <li
      ref={ref}
      aria-hidden
      className="relative mb-12 sm:mb-16"
      style={{ height: branchHeight }}
    >
      <svg
        width={LANE_B + 8}
        height={branchHeight}
        viewBox={`0 0 ${LANE_B + 8} ${branchHeight}`}
        fill="none"
        className="absolute top-0 left-0 overflow-visible"
      >
        <path d={branchPath} stroke="var(--border)" strokeWidth={2} />
        <motion.path
          d={branchPath}
          stroke="var(--text-primary)"
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeLinecap="round"
          style={
            reduce
              ? { pathLength: 1, opacity: 1 }
              : { pathLength: scrollYProgress, opacity }
          }
        />
      </svg>
      {Array.from({ length: ROUNDS }, (_, i) => (
        <BranchDot key={i} top={CURVE + i * ROW + ROW / 2} reduce={reduce} />
      ))}
    </li>
  )
}

function BranchDot({ top, reduce }: { top: number; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { margin: LIT_MARGIN })
  const on = reduce || inView
  return (
    <span
      ref={ref}
      className={cn(
        "absolute size-2.5 -translate-y-1/2 rounded-full border-2 transition-colors duration-500",
        on
          ? "border-foreground bg-foreground"
          : "bg-background border-[#3a3a40]",
      )}
      style={{ top, left: LANE_B - 5 }}
    />
  )
}

/** Nó da linha. O da última etapa (o lançamento) é um losango. */
function Node({
  ref,
  on,
  reduce,
  final,
}: {
  ref: React.Ref<HTMLSpanElement>
  on: boolean
  reduce: boolean
  final: boolean
}) {
  return (
    <span
      ref={ref}
      data-node
      aria-hidden
      className="absolute top-[3px] size-[14px]"
      style={{ left: LANE - 7 }}
    >
      {/* Onda que sai do nó quando ele acende */}
      <motion.span
        className={cn(
          "bg-red-light absolute inset-0",
          final ? "rotate-45 rounded-[3px]" : "rounded-full",
        )}
        initial={false}
        animate={
          on && !reduce
            ? { scale: [1, final ? 4 : 3], opacity: [0.55, 0] }
            : { scale: 1, opacity: 0 }
        }
        transition={{ duration: final ? 1.2 : 0.9, ease: EASE }}
      />
      <span
        className={cn(
          "absolute inset-0 border-2 transition-[background-color,border-color,box-shadow] duration-500",
          final ? "rotate-45 rounded-[3px]" : "rounded-full",
          on
            ? "border-red-light bg-red-primary shadow-[0_0_0_5px_rgb(229_9_20/0.14)] pointer-fine:group-hover/step:shadow-[0_0_0_9px_rgb(229_9_20/0.2)]"
            : "bg-background border-[#3a3a40]",
        )}
      />
    </span>
  )
}

/* ------------------------------------------------------------------ */

/** Painel de progresso (desktop): etapa atual rolando como um odômetro. */
function Hud({
  steps,
  litCount,
  progress,
  reduce,
  onJump,
}: {
  steps: Step[]
  litCount: number
  progress: MotionValue<number>
  reduce: boolean
  onJump: (index: number) => void
}) {
  const active = Math.max(0, litCount - 1)
  const roll = { duration: reduce ? 0 : 0.8, ease: EASE }

  return (
    <div className="mt-16 hidden xl:block">
      <div
        aria-hidden
        className="text-label text-muted-foreground border-border border-t pt-5"
      >
        Etapa
      </div>

      <div aria-hidden className="mt-3 flex items-end justify-between gap-6">
        <div className="flex items-end">
          {/* Altura limitada pela tela: o painel inteiro cabe na coluna presa */}
          <p className="text-display flex text-[min(9vw,15vh,9rem)] leading-none">
            <span className="text-transparent [-webkit-text-stroke:1.5px_rgb(255_255_255/0.22)]">
              0
            </span>
            <span className="relative block h-[1em] overflow-hidden">
              <motion.span
                className="block"
                initial={false}
                animate={{ y: `${-active}em` }}
                transition={roll}
              >
                {steps.map((s, i) => (
                  <span key={s.label} className="block h-[1em]">
                    {i + 1}
                  </span>
                ))}
              </motion.span>
            </span>
          </p>
          <span className="text-label text-muted-foreground mb-[0.9em] ml-3">
            / {pad(steps.length)}
          </span>
        </div>

        <div className="text-red-light mb-3 h-6 overflow-hidden text-right text-base font-medium leading-6">
          <motion.div
            initial={false}
            animate={{ y: -active * 24 }}
            transition={roll}
          >
            {steps.map((s) => (
              <p key={s.label} className="h-6">
                {s.label}
              </p>
            ))}
          </motion.div>
        </div>
      </div>

      <div aria-hidden className="bg-border relative mt-5 h-px">
        <motion.div
          className="bg-red-primary absolute inset-0 origin-left"
          style={{ scaleX: reduce ? 1 : progress }}
        />
      </div>

      {/* Atalhos: cada um leva à sua etapa */}
      <nav aria-label="Etapas do processo" className="mt-1">
        <ol className="grid grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.label}>
              <StepButton
                label={s.label}
                current={litCount > 0 && i === active}
                done={i < litCount}
                onClick={() => onJump(i)}
              />
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}

/** Atalho do painel: o rótulo embaralha no hover/foco, como os links do menu. */
function StepButton({
  label,
  current,
  done,
  onClick,
}: {
  label: string
  current: boolean
  done: boolean
  onClick: () => void
}) {
  const [text, scramble] = useScramble(label.toUpperCase())
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={scramble}
      onFocus={scramble}
      aria-current={current ? "step" : undefined}
      className={cn(
        // -ml-2/pl-2: o anel de foco ganha respiro sem tirar o ponto do alinhamento
        "text-label group/btn focus-visible:ring-red-light/60 -ml-2 flex h-10 w-full items-center gap-2 rounded-sm pl-2 text-left transition-colors duration-500 outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2",
        done ? "text-foreground" : "text-muted-foreground/80",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors duration-500",
          current
            ? "bg-red-light"
            : done
              ? "bg-foreground/40"
              : "bg-border group-hover/btn:bg-foreground/40 group-focus-visible/btn:bg-foreground/40",
        )}
      />
      <span aria-hidden>{text}</span>
      <span className="sr-only">{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */

/**
 * Barra de progresso (abaixo do xl, onde o painel não cabe): presa no rodapé
 * da tela enquanto as etapas passam. No fim, se despede junto com a seção.
 */
function StatusLine({
  steps,
  litCount,
  progress,
  reduce,
}: {
  steps: Step[]
  litCount: number
  progress: MotionValue<number>
  reduce: boolean
}) {
  const active = Math.max(0, litCount - 1)
  const shown = litCount > 0
  const roll = { duration: reduce ? 0 : 0.7, ease: EASE }

  const ref = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    sectionRef.current = ref.current?.closest("section") ?? null
  }, [])
  const { scrollYProgress: exit } = useScroll({
    target: sectionRef,
    offset: ["end end", "end 70%"],
  })
  const exitOpacity = useTransform(exit, [0, 1], [1, 0])
  const exitY = useTransform(exit, [0, 1], [0, 8])
  // Reduced motion: some de uma vez, na metade do trecho, sem deslizar
  const exitCut = useTransform(exit, (v) => (v < 0.5 ? 1 : 0))

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={reduce ? { opacity: exitCut } : { opacity: exitOpacity, y: exitY }}
      className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mt-10 xl:hidden"
    >
      <motion.div
        initial={false}
        animate={{ opacity: shown ? 1 : 0, y: shown || reduce ? 0 : 12 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
        className="border-border bg-background/85 relative flex h-10 items-center overflow-hidden rounded-md border text-[13px] leading-none backdrop-blur-md"
      >
        <span className="bg-red-primary flex h-full shrink-0 items-center px-3 font-medium text-white">
          Etapa
        </span>

        <span className="text-foreground ml-3 shrink-0 font-mono tabular-nums">
          <Roll
            items={steps.map((_, i) => pad(i + 1))}
            active={active}
            roll={roll}
          />
        </span>
        <span className="text-muted-foreground shrink-0 font-mono">
          /{pad(steps.length)}
        </span>

        <span className="text-red-light ml-3 min-w-0 truncate font-medium">
          <Roll items={steps.map((s) => s.label)} active={active} roll={roll} />
        </span>

        <span className="bg-border absolute inset-x-0 bottom-0 h-px">
          <motion.span
            className="bg-red-primary absolute inset-0 origin-left"
            style={{ scaleX: reduce ? 1 : progress }}
          />
        </span>
      </motion.div>
    </motion.div>
  )
}

/** Lista que rola na vertical até o item ativo (odômetro de uma linha). */
function Roll({
  items,
  active,
  roll,
}: {
  items: string[]
  active: number
  roll: { duration: number; ease: typeof EASE }
}) {
  return (
    <span className="relative block h-[1.4em] overflow-hidden leading-[1.4em]">
      <motion.span
        className="block"
        initial={false}
        animate={{ y: `${-active * 1.4}em` }}
        transition={roll}
      >
        {items.map((item, i) => (
          <span key={i} className="block h-[1.4em] whitespace-nowrap">
            {item}
          </span>
        ))}
      </motion.span>
    </span>
  )
}
