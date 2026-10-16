"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react"
import {
  animate,
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react"
import { useScramble } from "@/components/chrome-scramble"
import { scrollToTarget } from "@/components/smooth-scroll"
import { cn } from "@/lib/utils"

export type Commit = {
  hash: string
  type: string
  scope: string
  subject: string
  body: string
  /** Pais de um commit de merge (vira a linha `Merge:`). */
  merge?: string[]
  /** Refs decoradas: `HEAD -> main`, `tag: v1.0.0`. */
  refs?: string[]
}

export type BranchCommit = { hash: string; type: string; message: string }

type Branch = { name: string; before: number; commits: BranchCommit[] }

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

/** Comando do topo: `| tac` inverte o log, do primeiro commit ao deploy. */
const COMMAND = "git log --graph | tac"

/**
 * A ponta da linha fica a 62% da altura da tela. Um nó "acende" quando passa
 * desse ponto e continua aceso acima dele (a margem de cima é enorme).
 */
const LIT_MARGIN = "100000px 0px -38% 0px" as const

/* Geometria da branch (px). A main corre em x=12; a branch, em x=40. */
const LANE = 12
const LANE_B = 40
const CURVE = 56
const ROW = 40
const branchHeight = (n: number) => CURVE * 2 + ROW * n
const branchPath = (h: number) =>
  `M${LANE} 0 C${LANE} 30 ${LANE_B} 26 ${LANE_B} ${CURVE} L${LANE_B} ${h - CURVE} C${LANE_B} ${h - 26} ${LANE} ${h - 30} ${LANE} ${h}`

/**
 * Git log do processo. No desktop o título fica preso à esquerda com um
 * painel de progresso; o log rola à direita com o grafo como espinha.
 */
export function ProcessLog({
  commits,
  branch,
  intro,
}: {
  commits: Commit[]
  branch: Branch
  intro: ReactNode
}) {
  const reduce = useReduce()
  const [lit, setLit] = useState<boolean[]>(() => commits.map(() => false))
  const onLit = useCallback((index: number, on: boolean) => {
    setLit((prev) =>
      prev[index] === on ? prev : prev.map((v, i) => (i === index ? on : v)),
    )
  }, [])
  const litCount = lit.filter(Boolean).length

  // O HEAD acompanha a linha: fica no último commit aceso e termina no release
  const lastIndex = commits.length - 1
  const headLabel =
    commits[lastIndex].refs?.find((r) => r.startsWith("HEAD")) ?? "HEAD"
  const headIndex = reduce ? lastIndex : Math.max(0, litCount - 1)
  const headVisible = reduce || litCount > 0
  const tagLabel =
    commits[lastIndex].refs
      ?.find((r) => r.startsWith("tag:"))
      ?.replace("tag:", "")
      .trim() ?? "v1.0.0"

  // A linha vai do centro do primeiro nó ao centro do último: medida no cliente
  const wrapRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState<{ top: number; height: number } | null>(
    null,
  )
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
          commits={commits}
          litCount={litCount}
          progress={scrollYProgress}
          reduce={reduce}
          onJump={jumpTo}
        />
      </div>

      {/* O log (o prompt alinha pelo centro com o label da seção) */}
      <div className="min-w-0 max-w-[52rem] xl:-mt-1 xl:max-w-none">
        <Prompt command={COMMAND} reduce={reduce} />

        <div ref={wrapRef} className="relative mt-12 sm:mt-14">
          {/* Espinha do grafo: trilho apagado + traço vermelho que segue a rolagem */}
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
                {/* O único brilho da seção: a "cabeça de leitura" da linha */}
                <span className="absolute top-0 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(229_9_20/0.16),transparent_62%)]" />
                <span data-companion="process" className="bg-red-light absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_14px_3px_rgb(255_52_59/0.65)]" />
              </motion.div>
            )}
          </div>

          <ol className="relative">
            {commits.map((commit, i) => (
              <CommitRow
                key={commit.hash}
                commit={commit}
                index={i}
                total={commits.length}
                last={i === commits.length - 1}
                tight={i === branch.before - 1}
                branch={i === branch.before ? branch : undefined}
                head={i === headIndex ? headLabel : undefined}
                headVisible={headVisible}
                reduce={reduce}
                onLit={onLit}
              />
            ))}
          </ol>
        </div>

        {/* O push que coloca a versão no ar; depois, o prompt esperando */}
        <DeploySession
          from={commits[lastIndex - 1].hash}
          to={commits[lastIndex].hash}
          tag={tagLabel}
          reduce={reduce}
          className="mt-20 sm:mt-24"
        />

        {/* Sem o painel (abaixo do xl): status line presa no rodapé da tela */}
        <StatusLine
          commits={commits}
          litCount={litCount}
          progress={scrollYProgress}
          reduce={reduce}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CommitRow({
  commit,
  index,
  total,
  last,
  tight,
  branch,
  head,
  headVisible,
  reduce,
  onLit,
}: {
  commit: Commit
  index: number
  total: number
  last: boolean
  /** Logo antes da branch: encurta o respiro para a bifurcação colar no commit. */
  tight: boolean
  /** Branch que entra antes deste commit (ele é o merge). */
  branch?: Branch
  /** Rótulo do HEAD, se ele estiver neste commit agora. */
  head?: string
  headVisible: boolean
  reduce: boolean
  onLit: (index: number, on: boolean) => void
}) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const inView = useInView(nodeRef, { margin: LIT_MARGIN })
  useEffect(() => onLit(index, inView), [index, inView, onLit])
  const on = reduce || inView
  const release = Boolean(commit.refs?.length)
  // Passar o mouse num commit aceso "decifra" o hash de novo (mesmo efeito do menu)
  const [replay, setReplay] = useState(0)

  return (
    <>
      {branch && <BranchRow branch={branch} reduce={reduce} />}
      <li
        onPointerEnter={(e) => {
          if (on && e.pointerType === "mouse") setReplay((n) => n + 1)
        }}
        className={cn(
          "group/commit relative pl-10 sm:pl-[72px]",
          // No celular ~64px entre um commit e o próximo: o log fica corrido
          // e a espinha ainda respira entre as etapas
          last ? "pb-0" : tight ? "pb-10 sm:pb-12" : "pb-16 sm:pb-32",
        )}
      >
        <Node ref={nodeRef} on={on} reduce={reduce} release={release} />

        {/* Cabeçalho do commit, como o git imprime */}
        <div
          aria-hidden
          className="text-muted-foreground font-mono text-xs leading-5 sm:text-[13px]"
        >
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span>commit</span>
            <ScrambleHash
              hash={commit.hash}
              on={on}
              replay={replay}
              reduce={reduce}
              className={cn(
                "transition-colors duration-500",
                on && "text-foreground",
              )}
            />
            {/* O mesmo HEAD "pula" de commit em commit (layoutId) */}
            {head ? (
              <motion.span
                layoutId={reduce ? undefined : "process-head"}
                initial={false}
                animate={{ opacity: headVisible ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className={cn(headPill, "border-red-primary bg-red-primary text-white")}
              >
                {head}
              </motion.span>
            ) : (
              // No release a vaga do HEAD fica reservada: no celular estreito
              // a linha quebraria só quando ele chegasse (layout shift)
              release && <span className={cn(headPill, "invisible")}>HEAD -&gt; main</span>
            )}
            {commit.refs
              ?.filter((ref) => !ref.startsWith("HEAD"))
              .map((ref) => (
                <span
                  key={ref}
                  className={cn(
                    "inline-flex h-5 items-center rounded-full border px-2 text-[11px] leading-none whitespace-nowrap transition-colors delay-300 duration-500",
                    on ? "text-foreground border-white/40" : "border-border",
                  )}
                >
                  {ref}
                </span>
              ))}
          </p>
          {commit.merge && <p>Merge: {commit.merge.join(" ")}</p>}
          <p>Author: Jedson Santos &lt;jed&gt;</p>
        </div>

        {/* Mensagem: recuada como no git log. O tamanho do assunto segue a
            largura da coluna (cqi), não a da tela: no desktop largo o título
            da esquerda cresce e a coluna do log encolhe */}
        <div className="@container mt-7 sm:mt-9 sm:pl-8">
          <h3>
            <span className="sr-only">{`Etapa ${index + 1} de ${total}, ${commit.scope}: `}</span>
            <span
              aria-hidden
              className={cn(
                "block font-mono text-sm transition-colors duration-500 sm:text-base",
                on ? "text-red-light" : "text-muted-foreground",
              )}
            >
              {commit.type}({commit.scope}):
            </span>
            <span
              className={cn(
                "text-display-2 mt-3 block text-[clamp(1.5rem,7.6cqi,2.6rem)] leading-[1.04] text-balance transition-colors duration-700",
                on ? "text-foreground" : "text-[#6b6b72]",
              )}
            >
              {commit.subject}
            </span>
          </h3>
          <p className="text-muted-foreground mt-6 max-w-[44ch] text-base leading-relaxed text-pretty sm:text-lg">
            {commit.body}
          </p>
        </div>
      </li>
    </>
  )
}

const headPill =
  "inline-flex h-5 items-center rounded-full border px-2 text-[11px] leading-none whitespace-nowrap"

const HEX = "0123456789abcdef"

/** Hash que "decifra" (embaralha e assenta da esquerda) na 1ª vez que acende
 * e de novo a cada `replay` (hover no commit). */
function ScrambleHash({
  hash,
  on,
  replay = 0,
  reduce,
  className,
}: {
  hash: string
  on: boolean
  replay?: number
  reduce: boolean
  className?: string
}) {
  const [text, setText] = useState(hash)
  const played = useRef(-1)

  useEffect(() => {
    if (!on || reduce || played.current === replay) return
    played.current = replay
    const frames = 16
    let frame = 0
    const id = setInterval(() => {
      frame++
      const settled = Math.floor((frame / frames) * hash.length)
      setText(
        Array.from(hash, (ch, i) =>
          i < settled ? ch : HEX[Math.floor(Math.random() * HEX.length)],
        ).join(""),
      )
      if (frame >= frames) {
        clearInterval(id)
        setText(hash)
      }
    }, 36)
    return () => {
      clearInterval(id)
      setText(hash)
    }
  }, [on, reduce, hash, replay])

  return <span className={cn("tabular-nums", className)}>{text}</span>
}

/** Nó do grafo. O release é um losango (a tag). */
function Node({
  ref,
  on,
  reduce,
  release,
}: {
  ref: React.Ref<HTMLSpanElement>
  on: boolean
  reduce: boolean
  release: boolean
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
          release ? "rotate-45 rounded-[3px]" : "rounded-full",
        )}
        initial={false}
        animate={
          on && !reduce
            ? { scale: [1, release ? 4 : 3], opacity: [0.55, 0] }
            : { scale: 1, opacity: 0 }
        }
        transition={{ duration: release ? 1.2 : 0.9, ease: EASE }}
      />
      <span
        className={cn(
          "absolute inset-0 border-2 transition-[background-color,border-color,box-shadow] duration-500",
          release ? "rotate-45 rounded-[3px]" : "rounded-full",
          on
            ? "border-red-light bg-red-primary shadow-[0_0_0_5px_rgb(229_9_20/0.14)] pointer-fine:group-hover/commit:shadow-[0_0_0_9px_rgb(229_9_20/0.2)]"
            : "bg-background border-[#3a3a40]",
        )}
      />
    </span>
  )
}

/* ------------------------------------------------------------------ */

/** A branch de iteração: sai da main, ganha commits pequenos e volta. */
function BranchRow({ branch, reduce }: { branch: Branch; reduce: boolean }) {
  const ref = useRef<HTMLLIElement>(null)
  const h = branchHeight(branch.commits.length)
  const d = branchPath(h)
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
      style={{ height: h }}
    >
      <svg
        width={LANE_B + 8}
        height={h}
        viewBox={`0 0 ${LANE_B + 8} ${h}`}
        fill="none"
        className="absolute top-0 left-0 overflow-visible"
      >
        <path d={d} stroke="var(--border)" strokeWidth={2} />
        <motion.path
          d={d}
          stroke="var(--text-primary)"
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeLinecap="round"
          // A opacidade vai explícita: sem ela, o 0 do 1º render (antes de a
          // preferência chegar) ficava preso e a branch nunca acendia
          style={
            reduce
              ? { pathLength: 1, opacity: 1 }
              : { pathLength: scrollYProgress, opacity }
          }
        />
      </svg>

      <span className="text-muted-foreground absolute top-3 left-[60px] inline-flex h-5 items-center rounded-full border border-white/15 px-2 font-mono text-[11px] leading-none sm:left-[72px]">
        {branch.name}
      </span>

      {branch.commits.map((c, i) => (
        <MiniCommit
          key={c.hash}
          commit={c}
          top={CURVE + i * ROW}
          reduce={reduce}
        />
      ))}
    </li>
  )
}

function MiniCommit({
  commit,
  top,
  reduce,
}: {
  commit: BranchCommit
  top: number
  reduce: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { margin: LIT_MARGIN })
  const on = reduce || inView
  return (
    <div className="absolute inset-x-0 flex items-center" style={{ top, height: ROW }}>
      <span
        ref={ref}
        className={cn(
          "absolute size-2.5 rounded-full border-2 transition-colors duration-500",
          on
            ? "border-foreground bg-foreground"
            : "bg-background border-[#3a3a40]",
        )}
        style={{ left: LANE_B - 5 }}
      />
      <p
        className={cn(
          "ease-out-expo pl-[60px] font-mono text-xs whitespace-nowrap transition-[opacity,translate] duration-700 sm:pl-[72px] sm:text-[13px]",
          on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-35",
        )}
      >
        <span className="text-muted-foreground">{commit.hash}</span>{" "}
        <span className="text-foreground">{commit.type}:</span>{" "}
        <span className="text-foreground/75">{commit.message}</span>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** Digita `text` na primeira vez que o elemento entra na tela. Se ele já
 * estiver visível no carregamento, fica completo (é o que o servidor entrega).
 * `typed`: quantos caracteres mostrar (null = todos); `pending`: ainda não
 * terminou de digitar. */
function useTypewriter(
  ref: RefObject<HTMLElement | null>,
  text: string,
  reduce: boolean,
  delay = 0.35,
) {
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" })
  const [typed, setTyped] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const armed = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    if (el.getBoundingClientRect().top > window.innerHeight) {
      armed.current = true
      setTyped(0)
      setPending(true)
    }
  }, [ref, reduce])

  useEffect(() => {
    if (!seen || !armed.current || reduce) return
    armed.current = false
    const controls = animate(0, text.length, {
      duration: text.length * 0.045,
      delay,
      ease: "linear",
      onUpdate: (v) => setTyped(Math.round(v)),
      onComplete: () => {
        setTyped(null)
        setPending(false)
      },
    })
    return () => controls.stop()
  }, [seen, text, delay, reduce])

  // A preferência real só chega depois da hidratação (o 1º efeito já pode ter
  // armado a digitação): com reduced motion, o texto fica sempre completo
  if (reduce) return { typed: null, pending: false }
  return { typed, pending }
}

/** `~/seu-projeto (main) $` */
function PromptPrefix() {
  return (
    <>
      <span className="text-muted-foreground">~/seu-projeto</span>{" "}
      <span className="text-muted-foreground/80">(main)</span>{" "}
      <span className="text-red-light">$</span>{" "}
    </>
  )
}

/** Cursor em bloco. Só pisca parado e na tela. */
function Cursor({ blink }: { blink: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-red-light ml-0.5 inline-block h-[1.1em] w-[0.6em] translate-y-[0.2em]",
        blink && "motion-safe:animate-blink",
      )}
    />
  )
}

// No celular, 12px faz o prompt + comando caberem numa linha em 390px;
// em telas menores quebra entre palavras, nunca no meio de uma flag
const termText = "font-mono text-xs leading-6 break-words sm:text-sm"

/** Prompt do topo: digita o `git log` ao entrar na tela. */
function Prompt({ command, reduce }: { command: string; reduce: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const visible = useInView(ref)
  const { typed } = useTypewriter(ref, command, reduce)
  const shown = typed === null ? command : command.slice(0, typed)

  return (
    <p ref={ref} className={termText}>
      <PromptPrefix />
      <span className="sr-only">{command}</span>
      <span aria-hidden className="text-foreground">
        {shown}
      </span>
      <Cursor blink={visible && typed === null} />
    </p>
  )
}

/** Fecho da sessão: o push que coloca a tag no ar, e o prompt esperando. */
const PUSH = "git push --follow-tags"

function DeploySession({
  from,
  to,
  tag,
  reduce,
  className,
}: {
  from: string
  to: string
  tag: string
  reduce: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref)
  const { typed, pending } = useTypewriter(ref, PUSH, reduce, 0.6)
  const shown = typed === null ? PUSH : PUSH.slice(0, typed)
  // A saída "imprime" linha a linha quando o comando termina (sem layout shift)
  const out = (i: number) => ({
    initial: false as const,
    animate: { opacity: pending ? 0 : 1 },
    transition: { duration: 0, delay: pending ? 0 : 0.35 + i * 0.28 },
  })

  return (
    <div ref={ref} className={cn(termText, "whitespace-pre-wrap", className)}>
      <p>
        <PromptPrefix />
        <span className="sr-only">{PUSH}</span>
        <span aria-hidden className="text-foreground">
          {shown}
        </span>
        {pending && <Cursor blink={false} />}
      </p>
      <motion.p {...out(0)} className="text-muted-foreground">
        {`   ${from}..${to}  main -> main`}
      </motion.p>
      <motion.p {...out(1)}>
        <span className="text-red-light"> *</span>
        <span className="text-foreground">{` [new tag]         ${tag} -> ${tag}`}</span>
      </motion.p>
      <motion.p {...out(2)}>
        <PromptPrefix />
        <Cursor blink={visible && !pending} />
      </motion.p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** Painel de progresso (desktop): etapa atual rolando como um odômetro. */
function Hud({
  commits,
  litCount,
  progress,
  reduce,
  onJump,
}: {
  commits: Commit[]
  litCount: number
  progress: MotionValue<number>
  reduce: boolean
  onJump: (index: number) => void
}) {
  const active = Math.max(0, litCount - 1)
  const roll = { duration: reduce ? 0 : 0.8, ease: EASE }
  const total = String(commits.length).padStart(2, "0")

  return (
    <div className="mt-16 hidden xl:block">
      <div
        aria-hidden
        className="text-label text-muted-foreground border-border flex justify-between border-t pt-5"
      >
        <span>Etapa</span>
        <span>HEAD</span>
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
                {commits.map((c, i) => (
                  <span key={c.hash} className="block h-[1em]">
                    {i + 1}
                  </span>
                ))}
              </motion.span>
            </span>
          </p>
          <span className="text-label text-muted-foreground mb-[0.9em] ml-3">
            / {total}
          </span>
        </div>

        <div className="mb-3 h-12 overflow-hidden text-right font-mono text-sm leading-6">
          <motion.div
            initial={false}
            animate={{ y: -active * 48 }}
            transition={roll}
          >
            {commits.map((c) => (
              <div key={c.hash} className="h-12">
                <p className="text-foreground">{c.hash}</p>
                <p className="text-red-light">
                  {c.type}({c.scope})
                </p>
              </div>
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

      {/* Atalhos: cada etapa leva ao seu commit */}
      <nav aria-label="Etapas do processo" className="mt-1">
        <ol className="grid grid-cols-4">
          {commits.map((c, i) => (
            <li key={c.hash}>
              <StepButton
                label={c.scope}
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
        // (w-full: a borda direita do anel para 8px antes do ponto vizinho)
        // Pendente fica legível (≈4,9:1); feito x pendente se separa pelo
        // ponto e pelo branco do texto, não por apagar o rótulo
        "text-label group/step focus-visible:ring-red-light/60 -ml-2 flex h-10 w-full items-center gap-2 rounded-sm pl-2 text-left transition-colors duration-500 outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2",
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
              : "bg-border group-hover/step:bg-foreground/40 group-focus-visible/step:bg-foreground/40",
        )}
      />
      <span aria-hidden>{text}</span>
      <span className="sr-only">{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */

/**
 * Status line (abaixo do xl, onde o painel não cabe): presa no rodapé da tela
 * enquanto o log passa, como a barra do tmux. No fim, pousa sob a sessão.
 */
function StatusLine({
  commits,
  litCount,
  progress,
  reduce,
}: {
  commits: Commit[]
  litCount: number
  progress: MotionValue<number>
  reduce: boolean
}) {
  const active = Math.max(0, litCount - 1)
  const shown = litCount > 0
  const roll = { duration: reduce ? 0 : 0.7, ease: EASE }
  const total = String(commits.length).padStart(2, "0")

  // Saída: depois de pousar sob a sessão, a barra se despede junto com a
  // seção (fim da seção indo do rodapé da tela até 70% dela), em vez de
  // ficar solta no preto até a próxima seção entrar
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
        className="border-border bg-background/85 relative flex h-10 items-center overflow-hidden rounded-md border font-mono text-[11px] leading-none backdrop-blur-md sm:text-xs"
      >
        {/* Sessão, como o nome à esquerda da barra do tmux */}
        <span className="bg-red-primary flex h-full shrink-0 items-center px-2.5 font-medium text-white">
          main
        </span>

        <span className="text-foreground ml-3 shrink-0 tabular-nums">
          <Roll items={commits.map((_, i) => String(i + 1).padStart(2, "0"))} active={active} roll={roll} />
        </span>
        <span className="text-muted-foreground shrink-0">/{total}</span>

        <span className="text-red-light ml-3 min-w-0 truncate">
          <Roll items={commits.map((c) => `${c.type}(${c.scope})`)} active={active} roll={roll} />
        </span>

        <span className="text-muted-foreground mr-3 ml-auto shrink-0 pl-3 tabular-nums">
          <Roll items={commits.map((c) => c.hash)} active={active} roll={roll} />
        </span>

        {/* Progresso do log: o mesmo traço vermelho da espinha */}
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
