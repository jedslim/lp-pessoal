"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import { ArrowUpRight, Pause, Play } from "lucide-react"
import type { Project } from "@/lib/projects"
import { ButtonLink } from "@/components/kit/button-link"
import {
  BrowserBar,
  ProjectVideo,
  Tags,
  VIDEO_ASPECT,
  Via,
  shortHost,
} from "@/components/work-browser"
import { DecodeWord } from "@/components/work-decode"
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe"
import { cn } from "@/lib/utils"

/** Inclinação máxima da tela sob o mouse (graus). */
const TILT = { x: 4.5, y: 6 }
const TILT_SPRING = { stiffness: 140, damping: 18, mass: 0.6 }

const EASE = [0.22, 1, 0.36, 1] as const

/** 00:04 */
const tc = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
}

/**
 * Projeto em destaque. A peça grande é o que foi construído (`keyword`,
 * ex.: "Headless"), não o cliente: o nome do projeto fica em tamanho de
 * título na ficha. A moldura de navegador com o site rodando entra "deitada",
 * se endireita com a rolagem e inclina seguindo o mouse, com reflexo no vidro.
 */
export function WorkFeatured({ project }: { project: Project }) {
  // Hidratação estável: a rolagem abaixo vira estática só depois de montar
  const reduce = useReducedMotionSafe()

  /* ----- Vídeo: toca só visível; reduced motion e rede lenta esperam o play ----- */
  const frameRef = useRef<HTMLDivElement>(null)
  // Autoplay só com metade da tela à vista (não começa com a moldura no rodapé)
  const inView = useInView(frameRef, { amount: 0.5 })
  // O poster só é pedido quando a moldura chega perto: nada pesa no carregamento
  const near = useInView(frameRef, { once: true, margin: "600px 0px" })
  // null = ninguém escolheu ainda; segue o padrão (autoplay se permitido)
  const [choice, setChoice] = useState<"play" | "pause" | null>(null)
  const [autoplay, setAutoplay] = useState(true)
  useEffect(() => {
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    // Economia de dados ou rede 2G/3G: fica o poster com o botão de play
    const slow =
      !!conn?.saveData || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? "")
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência do aparelho só existe no cliente
    setAutoplay(!reduce && !slow)
  }, [reduce])
  const wants = choice ? choice === "play" : autoplay
  const playing = inView && wants

  const progress = useMotionValue(0)
  const timeRef = useRef<HTMLSpanElement>(null)
  const onTime = (cur: number, dur: number) => {
    if (timeRef.current) timeRef.current.textContent = `${tc(cur)} / ${tc(dur)}`
  }

  /* ----- Entrada: a tela levanta conforme a rolagem ----- */
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "center 0.6"],
  })
  const enterX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [22, 0])
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.88, 1])
  const lift = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [80, 0])

  /* ----- Peça tipográfica: camada que anda a 0,6× da rolagem ----- */
  // As letras ficam para trás e afundam na linha da grade; a tela, a 1×,
  // desliza por cima do pé delas
  const wordRef = useRef<HTMLParagraphElement>(null)
  // Só no lg, onde a tela sobe por cima das letras (no celular ela vem
  // abaixo). Afunda até 0,3em (uns 40% da altura da letra) e para ali.
  const sink = useRef({ on: false, max: 0 })
  useEffect(() => {
    const lg = matchMedia("(min-width: 1024px)")
    const read = () => {
      // O mesmo corpo da peça no lg: min((100vw - 6rem) / 5,6, 15rem)
      const size = Math.min((innerWidth - 96) / 5.6, 240)
      sink.current = { on: lg.matches && !reduce, max: 0.3 * size }
    }
    read()
    window.addEventListener("resize", read)
    return () => window.removeEventListener("resize", read)
  }, [reduce])
  const { scrollYProgress: wordProgress } = useScroll({
    target: wordRef,
    offset: ["start 0.75", "start -0.25"],
  })
  const wordY = useTransform(wordProgress, (p) => {
    const { on, max } = sink.current
    if (!on || !p || !max) return 0
    // 1 de progresso = 1 altura de janela rolada; a palavra fica 0,4 disso
    // para trás (anda a 0,6×) e desacelera até parar no fundo da máscara
    const lag = p * 0.4 * window.innerHeight
    return max * (1 - Math.exp(-lag / max))
  })

  /* ----- Mouse: a tela inclina para o lado do cursor e o vidro reflete ----- */
  // -1..1 a partir do centro da tela
  const nx = useMotionValue(0)
  const ny = useMotionValue(0)
  const snx = useSpring(nx, TILT_SPRING)
  const sny = useSpring(ny, TILT_SPRING)
  const rotateX = useTransform(
    [enterX, sny],
    ([e, y]: number[]) => e - y * TILT.x,
  )
  const rotateY = useTransform(snx, (x) => x * TILT.y)
  const glareX = useTransform(snx, [-1, 1], [0, 100])
  const glareY = useTransform(sny, [-1, 1], [0, 100])
  const glare = useMotionTemplate`radial-gradient(42rem circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.09), transparent 42%)`
  const [tilting, setTilting] = useState(false)
  const onTilt = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    nx.set(((e.clientX - r.left) / r.width) * 2 - 1)
    ny.set(((e.clientY - r.top) / r.height) * 2 - 1)
    if (!tilting) setTilting(true)
  }
  const endTilt = () => {
    nx.set(0)
    ny.set(0)
    setTilting(false)
  }

  /* ----- Selo "Abrir" que segue o cursor sobre a tela ----- */
  const [hover, setHover] = useState(false)
  const bx = useMotionValue(0)
  const by = useMotionValue(0)
  const sx = useSpring(bx, { stiffness: 380, damping: 32, mass: 0.5 })
  const sy = useSpring(by, { stiffness: 380, damping: 32, mass: 0.5 })
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    if (!hover) {
      // Primeira entrada: nasce no cursor, sem voar do canto
      bx.jump(x)
      by.jump(y)
      sx.jump(x)
      sy.jump(y)
      setHover(true)
    }
    bx.set(x)
    by.set(y)
  }

  const host = shortHost(project.host)

  return (
    <article className="relative">
      {/* Linha de metadados */}
      <div className="text-label flex items-center justify-between gap-4 border-t border-border pt-4 text-muted-foreground">
        <span>
          <span className="text-red-light">Nº 01</span>
          <span aria-hidden className="mx-2.5 inline-block h-px w-4 bg-border align-middle sm:mx-3 sm:w-6" />
          {/* Label em caixa alta: no celular fica só "destaque" */}
          <span className="hidden sm:inline">Projeto em </span>destaque
        </span>
        <span className="text-right">{project.segment}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-6">
        {/* Peça grande: o que foi construído (decodifica ao entrar e no hover).
            O corpo enche a grade: "Headless" mede ≈ 5,55em (outra palavra pede
            outro divisor). Tracking -0,035em para o "dl" não colar.
            É camada, não título: só o contorno, abaixo de 2:1 contra o fundo,
            para o H2 da seção seguir como o texto mais forte. O parágrafo é a
            máscara: a folga de cima guarda as hastes do "d" e do "l"; a de
            baixo (0,1em, dentro do respiro da ficha) é onde as letras
            afundam. Rolando, elas descem mais devagar que a página e a tela
            passa por cima do pé delas. */}
        <p
          ref={wordRef}
          aria-hidden
          className="text-display relative mt-[calc(1.75rem-0.14em)] -mb-[0.1em] -ml-[0.04em] overflow-y-clip pt-[0.14em] pb-[0.1em] text-[calc((100vw-2.5rem)/5.6)] leading-[0.8] tracking-[-0.035em] text-transparent [-webkit-text-stroke:1px_rgb(242_242_240/0.25)] sm:text-[calc((100vw-4rem)/5.6)] lg:col-span-12 lg:mt-[calc(2.5rem-0.14em)] lg:text-[min(calc((100vw-6rem)/5.6),15rem)]"
        >
          <motion.span className="block" style={{ y: wordY }}>
            <motion.span
              className="block"
              initial={{ y: "40%", opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 1.1, ease: EASE }}
            >
              <DecodeWord text={project.keyword ?? project.segment} />
            </motion.span>
          </motion.span>
        </p>

        {/* Tela */}
        <div
          ref={frameRef}
          onPointerMove={onTilt}
          onPointerLeave={endTilt}
          // A sobreposição acompanha o corpo da peça, que para de crescer em
          // 1440px: dali em diante a tela sobe sempre os mesmos 49px
          // self-start: a caixa não estica até a altura da ficha (o glow mede
          // a base da tela, não a base da linha da grade)
          className="relative z-10 mt-6 lg:col-span-8 lg:col-start-5 lg:row-start-2 lg:-mt-[min(3.4vw,49px)] lg:self-start"
          style={{ perspective: 1600 }}
        >
          {/* O único glow da seção: a luz da tela no chão. Centrado na base
              da moldura (a caixa inclui a legenda, daí os -9%): metade fica
              por baixo da tela e só vaza pela borda de baixo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[14%] -bottom-[9%] h-[30%] rounded-full bg-red-primary/[0.16] blur-[70px]"
          />
          <motion.div
            style={{
              rotateX,
              rotateY,
              scale,
              y: lift,
              transformOrigin: "50% 100%",
            }}
            className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[#0b0b0d] shadow-[0_60px_120px_-40px_rgb(0_0_0/0.95),inset_0_1px_0_rgb(255_255_255/0.06)]"
          >
            <BrowserBar
              host={project.host}
              right={
                <button
                  type="button"
                  onClick={() => setChoice(wants ? "pause" : "play")}
                  aria-label={wants ? "Pausar gravação" : "Reproduzir gravação"}
                  className="relative -mr-1.5 flex size-7 items-center justify-center rounded-full text-white/55 transition-colors outline-none after:absolute after:-inset-2 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-red-light/70"
                >
                  {wants ? (
                    <Pause className="size-3.5" fill="currentColor" />
                  ) : (
                    <Play className="size-3.5" fill="currentColor" />
                  )}
                </button>
              }
            />
            <div data-companion="work" className={cn("relative bg-background", VIDEO_ASPECT)}>
              <ProjectVideo
                project={project}
                playing={playing}
                progress={progress}
                onTime={onTime}
                poster={near}
                label={`Gravação de tela do site ${project.name} em produção`}
              />
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${host} em nova aba`}
                  onPointerMove={onMove}
                  onPointerLeave={() => setHover(false)}
                  className={cn(
                    "absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-red-light/70 focus-visible:ring-inset",
                    hover && "cursor-none",
                  )}
                >
                  {/* Selo vermelho no lugar do cursor */}
                  <motion.span
                    aria-hidden
                    style={{ x: sx, y: sy }}
                    className="pointer-events-none absolute top-0 left-0 hidden pointer-fine:block"
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: hover ? 1 : 0, opacity: hover ? 1 : 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="text-label -mt-12 -ml-12 flex size-24 flex-col items-center justify-center gap-1 rounded-full bg-red-primary text-[10px] text-white shadow-[0_12px_40px_-8px_rgb(229_9_20/0.7)]"
                    >
                      <ArrowUpRight className="size-5" />
                      Abrir site
                    </motion.span>
                  </motion.span>
                </a>
              )}
              {/* Régua de tempo da gravação */}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
                <motion.div
                  style={{ scaleX: progress }}
                  className="h-full origin-left bg-red-light"
                />
              </div>
            </div>
            {/* Reflexo no vidro: acompanha o cursor e só existe com ele em cima */}
            <motion.div
              aria-hidden
              style={{ backgroundImage: glare }}
              initial={false}
              animate={{ opacity: tilting ? 1 : 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="pointer-events-none absolute inset-0"
            />
          </motion.div>

          {/* Legenda de figura, como numa revista técnica */}
          <div className="text-label mt-4 flex items-center justify-between gap-4 text-[10px] text-muted-foreground">
            <span className="truncate">
              Fig. 01 <span className="text-foreground/50">/</span> {host}
              <span className="hidden sm:inline">, gravação de tela</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 tabular-nums">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  playing ? "bg-red-light" : "bg-white/25",
                )}
              />
              <span ref={timeRef}>00:00 / 00:14</span>
            </span>
          </div>
        </div>

        {/* Ficha técnica: o nome do projeto em tamanho de título, como no índice */}
        {/* Ritmo apertado no lg: a ficha termina perto da legenda da figura,
            e o Índice vem logo depois, sem vão preto */}
        <div className="mt-12 lg:col-span-4 lg:row-start-2 lg:mt-1 lg:pt-9 lg:pr-6 xl:pr-10">
          <h3 className="text-display text-[clamp(2.25rem,4.1vw,4.5rem)] leading-[0.95] tracking-[-0.04em]">
            {project.name}
          </h3>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-pretty text-foreground/75 sm:text-base lg:mt-5">
            {project.description}
          </p>

          <dl className="mt-9 border-t border-border text-sm lg:mt-7">
            <Row label="Escopo">
              <span className="text-foreground/90">{project.scope}</span>
            </Row>
            <Row label="Stack">
              <Tags tags={project.tags} />
            </Row>
            {project.agency && (
              <Row label="Via">
                <Via agency={project.agency} prefix={false} logoClassName="h-5" />
              </Row>
            )}
          </dl>

          {project.url && (
            <ButtonLink
              href={project.url}
              variant="ghost"
              className="mt-9 lg:mt-7"
              aria-label={`Ver o site ${project.name} no ar (abre em nova aba)`}
            >
              Ver site no ar
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-baseline gap-4 border-b border-border py-4 lg:py-3.5">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
