"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react"
import { useScramble } from "@/components/chrome-scramble"
import { ContactKey } from "@/components/contact-key"
import { ContactLinks } from "@/components/contact-links"
import { ContactPath, type PathKind } from "@/components/contact-path"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * Contato: a pergunta fica piscando como um prompt `[S/n]` esperando o
 * Enter, e a tecla 3D é a resposta (o LED dela é o único brilho da seção).
 * Passar o mouse na tecla "arma" a seção: "conversar?" acende, a linha que
 * desce até o footer engrossa e as anotações embaralham (o scramble do
 * menu). Embaixo, os dois caminhos (cliente e recrutador) e o contato direto.
 */
export function Contact() {
  const ref = useRef<HTMLElement>(null)
  // Loops (cursor, órbita) só rodam com a seção perto da tela
  const live = useInView(ref, { margin: "200px 0px" })
  const [armed, setArmed] = useState(false)
  // Card em hover/foco: o ramo dele na bifurcação "recebe o sinal"
  const [hot, setHot] = useState<PathKind | null>(null)
  const hotOn = (kind: PathKind) => (on: boolean) =>
    setHot((cur) => (on ? kind : cur === kind ? null : cur))

  return (
    <section
      ref={ref}
      id="contato"
      aria-label="Contato"
      data-live={live}
      data-armed={armed}
      className="group/contact relative isolate overflow-hidden pt-24 sm:pt-28 lg:pt-36"
    >
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionLabel index="06" label="Contato" />

        {/* A pergunta, com o cursor do terminal esperando o Enter */}
        <SplitLines
          as="h2"
          // "conversar?" + cursor ≈ 6,75em: no celular ocupa a largura toda
          // (alinhado à esquerda); daí em diante desce em diagonal à direita
          className="text-display mt-12 text-[clamp(2.5rem,13vw,6rem)] sm:mt-16 sm:text-[clamp(3rem,11vw,11rem)]"
          lineClassName={(i) => (i === 1 ? "sm:text-right" : undefined)}
          lines={[
            "Vamos",
            <>
              {/* Acende sem halo (o LED da tecla é o único brilho); quem
                  ganha força é a linha que desce até o footer */}
              <span
                data-ask
                className="ease-out-expo hover:text-red-light group-data-[armed=true]/contact:text-red-light transition-colors duration-500"
              >
                conversar?
              </span>
              <Caret />
            </>,
          ]}
        />

        <KeyStage
          armed={armed}
          onArm={setArmed}
          className="mt-10 lg:mt-6"
        />

        {/* A legenda se divide nos dois caminhos (só com duas colunas) */}
        <PathFork hot={hot} armed={armed} />

        {/* Dois caminhos: cada um abre a conversa com a mensagem certa */}
        <div className="mt-20 grid gap-4 sm:mt-28 md:mt-0 md:grid-cols-2 lg:gap-6">
          <ContactPath
            kind="projeto"
            index="01"
            title="Tenho um projeto"
            text="Site, sistema, integração ou automação. Me conta do que você precisa e eu respondo com os próximos passos."
            cta="Conversar sobre o projeto"
            // Abaixo de 380px o rótulo longo não cabe na pílula
            ctaShort="Falar do projeto"
            href={site.whatsappProject}
            onHot={hotOn("projeto")}
          />
          <ContactPath
            kind="vaga"
            index="02"
            title="Tenho uma vaga"
            text="Procurando dev full stack para o time? Já atuei em agência, como freela e em produto."
            cta="Falar sobre a vaga"
            href={site.whatsappJob}
            onHot={hotOn("vaga")}
          />
        </div>

        <ContactLinks className="mt-4 lg:mt-6" />

        {/* Os ramos voltam a se juntar e o tronco desce até o footer */}
        <PathMerge className="h-40 sm:h-52 lg:h-64" />
      </div>
    </section>
  )
}

/**
 * Bifurcação entre a tecla e os cards: a linha de cota da legenda desce e
 * se divide nos dois caminhos. O ramo do card em hover/foco acende; com a
 * tecla armada acende o de "projeto" (é a conversa que ela abre), em
 * cascata: tronco → ramo → nó, como um sinal descendo.
 * Os pés caem no centro de cada coluna (25% menos 1/4 do gap da grade).
 * As flags (`--projeto`, `--vaga`) são as opções do "conversar" da
 * pergunta: embaralham quando o sinal chega no ramo delas.
 */
function PathFork({ hot, armed }: { hot: PathKind | null; armed: boolean }) {
  const line =
    "ease-out-expo border-white/15 transition-[border-color] duration-500"
  const node =
    "ease-out-expo bg-background absolute bottom-0 size-[7px] translate-y-1/2 rounded-full border border-white/30 transition-[background-color,border-color,box-shadow] duration-500"
  const flag =
    "ease-out-expo absolute -top-6 font-mono text-[11px] text-white/35 transition-colors duration-500"
  return (
    <div aria-hidden className="relative mt-4 hidden h-24 md:block lg:h-28">
      {/* Tronco: continua a linha que vem da tecla */}
      <span className="ease-out-expo group-has-[[data-path]:hover]/contact:bg-red-light group-has-[[data-path]_a:focus-visible]/contact:bg-red-light group-data-[armed=true]/contact:bg-red-light absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-white/15 transition-colors duration-500 group-data-[armed=true]/contact:delay-100" />

      {/* Ramo do projeto */}
      <span
        className={cn(
          line,
          "group-has-[[data-path=projeto]:hover]/contact:border-red-light group-has-[[data-path=projeto]_a:focus-visible]/contact:border-red-light group-data-[armed=true]/contact:border-red-light absolute top-1/2 right-1/2 bottom-0 left-[calc(25%-0.25rem)] rounded-tl-2xl border-t border-l group-data-[armed=true]/contact:delay-200 lg:left-[calc(25%-0.375rem)]",
        )}
      >
        <Flag
          text="--projeto"
          on={hot === "projeto" || armed}
          className={cn(
            flag,
            "group-has-[[data-path=projeto]:hover]/contact:text-red-light group-has-[[data-path=projeto]_a:focus-visible]/contact:text-red-light group-data-[armed=true]/contact:text-red-light left-6 group-data-[armed=true]/contact:delay-200",
          )}
        />
        <span
          className={cn(
            node,
            "group-has-[[data-path=projeto]:hover]/contact:border-red-light group-has-[[data-path=projeto]:hover]/contact:bg-red-light group-has-[[data-path=projeto]_a:focus-visible]/contact:border-red-light group-has-[[data-path=projeto]_a:focus-visible]/contact:bg-red-light group-data-[armed=true]/contact:border-red-light group-data-[armed=true]/contact:bg-red-light -left-px -translate-x-1/2 group-data-[armed=true]/contact:delay-300",
          )}
        />
      </span>

      {/* Ramo da vaga */}
      <span
        className={cn(
          line,
          "group-has-[[data-path=vaga]:hover]/contact:border-red-light group-has-[[data-path=vaga]_a:focus-visible]/contact:border-red-light absolute top-1/2 right-[calc(25%-0.25rem)] bottom-0 left-1/2 rounded-tr-2xl border-t border-r lg:right-[calc(25%-0.375rem)]",
        )}
      >
        <Flag
          text="--vaga"
          on={hot === "vaga"}
          className={cn(
            flag,
            "group-has-[[data-path=vaga]:hover]/contact:text-red-light group-has-[[data-path=vaga]_a:focus-visible]/contact:text-red-light right-6",
          )}
        />
        <span
          className={cn(
            node,
            "group-has-[[data-path=vaga]:hover]/contact:border-red-light group-has-[[data-path=vaga]:hover]/contact:bg-red-light group-has-[[data-path=vaga]_a:focus-visible]/contact:border-red-light group-has-[[data-path=vaga]_a:focus-visible]/contact:bg-red-light -right-px translate-x-1/2",
          )}
        />
      </span>
    </div>
  )
}

/** Flag mono da bifurcação: embaralha (o scramble do menu) ao acender. */
function Flag({
  text,
  on,
  className,
}: {
  text: string
  on: boolean
  className?: string
}) {
  // Minúsculas embaralham com minúsculas: o mesmo glifo do kicker do card
  const [output, play] = useScramble(text, { preserveCase: true })
  useEffect(() => {
    if (on) play()
  }, [on, play])
  return <span className={className}>{output}</span>
}

/** Cursor de terminal: bloco vermelho piscando depois da pergunta. */
function Caret() {
  return (
    <span
      aria-hidden
      className="bg-red-light ml-[0.08em] inline-block h-[0.74em] w-[0.11em] translate-y-[0.02em] align-baseline motion-safe:animate-[blink_1.1s_steps(1)_infinite] group-data-[live=false]/contact:[animation-play-state:paused]"
    />
  )
}

/**
 * Palco da tecla 3D: a área fica reservada (7:5, a proporção do render) e
 * ganha uma marcação técnica, para nunca virar um buraco no layout.
 */
function KeyStage({
  armed,
  onArm,
  className,
}: {
  armed: boolean
  onArm: (armed: boolean) => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, { amount: 0.6 })
  const [pressed, setPressed] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  // Mouse ou foco na tecla: depois do "press" a seção continua armada
  const hover = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const arm = (on: boolean) => {
    hover.current = on
    onArm(on)
  }

  // Feedback do aperto (clique na tecla ou Enter): ↵ afunda e "no ar?" acende
  const press = useCallback(() => {
    setPressed(true)
    onArm(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setPressed(false)
      onArm(hover.current)
    }, 700)
  }, [onArm])

  // A legenda fala sério: com a tecla na tela, Enter abre a conversa
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      // Só sem foco em nada: Enter em link, botão ou campo segue o normal
      // (a seção focada pelo menu/âncora, tabindex -1, conta como "nada")
      const active = document.activeElement
      const idle =
        !active ||
        active === document.body ||
        active.matches("section[tabindex='-1']")
      if (!idle) return
      e.preventDefault()
      press()
      window.open(site.whatsappProject, "_blank", "noopener,noreferrer")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [visible, press])

  return (
    <div
      ref={ref}
      data-pressed={pressed}
      className={cn("group/stage relative mx-auto w-full max-w-[44rem]", className)}
    >
      {/* Bancada milimetrada, sumindo nas bordas */}
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute -inset-x-[18%] -inset-y-[12%] [mask-image:radial-gradient(closest-side,black_35%,transparent)]"
      />

      {/* `group/key` + data-pressed: a tecla 3D pode reagir ao Enter também */}
      <div
        data-key-zone
        data-pressed={pressed}
        className="group/key relative aspect-[7/5]"
        onPointerEnter={(e) => e.pointerType === "mouse" && arm(true)}
        onPointerLeave={() => arm(false)}
        onFocus={() => arm(true)}
        onBlur={() => arm(false)}
        // O link da tecla abre a conversa sozinho; aqui só o feedback
        onClick={press}
      >
        <StageMarks armed={armed} />
        <ContactKey
          href={site.whatsappProject}
          pressed={pressed}
          className="absolute inset-0 z-10 block size-full"
        />
      </div>

      {/* Legenda ligada à tecla por uma linha de cota */}
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden
          className="relative h-8 w-px bg-gradient-to-b from-transparent to-white/30 sm:h-10"
        >
          {/* Acende junto com a tecla: o sinal desce até os caminhos */}
          <span className="ease-out-expo to-red-light absolute inset-0 bg-gradient-to-b from-transparent opacity-0 transition-opacity duration-500 group-data-[armed=true]/contact:opacity-100" />
        </span>
        {/* A pergunta vira prompt de terminal: [S/n], Enter aceita o "sim" */}
        <p className="text-label text-muted-foreground mt-3 flex items-center gap-3">
          <span aria-hidden className="tracking-[0.08em] text-white/35 normal-case">
            [S/n]
          </span>
          {/* No toque não existe Enter: a legenda aponta para a tecla */}
          <span className="pointer-coarse:hidden">pressione</span>
          <kbd className="ease-out-expo border-border text-foreground group-data-[armed=true]/contact:border-red-light group-data-[armed=true]/contact:text-red-light group-data-[pressed=true]/stage:bg-red-primary group-data-[pressed=true]/stage:border-red-primary group-data-[pressed=true]/stage:text-white inline-flex h-7 min-w-7 items-center justify-center rounded-md border bg-white/[0.03] px-1.5 font-mono text-sm tracking-normal shadow-[inset_0_-2px_0_rgb(255_255_255/0.06)] transition-[color,background-color,border-color,translate,box-shadow] duration-300 group-data-[pressed=true]/stage:translate-y-0.5 group-data-[pressed=true]/stage:shadow-none pointer-coarse:hidden">
            <span aria-hidden>↵</span>
            <span className="sr-only">Enter</span>
          </kbd>
          <span className="pointer-coarse:hidden">para responder</span>
          <span className="hidden pointer-coarse:inline">toque na tecla para responder</span>
        </p>
      </div>
    </div>
  )
}

/**
 * Marcações do palco: cantos de corte, a base onde a tecla assenta e duas
 * anotações de código. A de baixo diz o que a tecla faz e embaralha
 * quando ela é armada.
 */
function StageMarks({ armed }: { armed: boolean }) {
  const corner = "absolute size-4 border-white/25"
  const note = "absolute font-mono text-[11px] text-white/40"
  const [action, play] = useScramble("// abre o WhatsApp")
  useEffect(() => {
    if (armed) play()
  }, [armed, play])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className={cn(corner, "top-0 left-0 border-t border-l")} />
      <span className={cn(corner, "top-0 right-0 border-t border-r")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(corner, "right-0 bottom-0 border-r border-b")} />

      <svg
        viewBox="0 0 700 500"
        fill="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        {/* Base onde a tecla assenta: aro fixo e trilho tracejado girando */}
        <ellipse cx="350" cy="372" rx="300" ry="78" stroke="rgb(255 255 255 / 0.07)" />
        <ellipse
          cx="350"
          cy="372"
          rx="238"
          ry="61"
          strokeDasharray="2 9"
          className="ease-out-expo stroke-white/25 transition-[stroke] duration-500 group-data-[armed=true]/contact:stroke-red-light motion-safe:animate-[dash-flow_1.6s_linear_infinite] group-data-[live=false]/contact:[animation-play-state:paused]"
        />
      </svg>

      <span className={cn(note, "top-3 left-6")}>key=&quot;Enter&quot;</span>
      <span
        className={cn(
          note,
          "ease-out-expo group-data-[armed=true]/contact:text-red-light right-6 bottom-3 transition-colors duration-500",
        )}
      >
        {action}
      </span>
    </div>
  )
}

type MergeBox = { w: number; h: number; split: boolean; gap: number }

/** Meio pixel: traço de 1px cai inteiro numa coluna, sem borrar. */
const px = (v: number) => Math.round(v) + 0.5

// Estados da linha. Tecla armada ou "conversar?" em hover: a linha toda
// ganha força (opacidade e espessura), em cascata depois do garfo
const strength =
  "ease-out-expo stroke-1 opacity-50 transition-[opacity,stroke-width] duration-500 group-data-[armed=true]/contact:stroke-2 group-data-[armed=true]/contact:opacity-100 group-has-[[data-ask]:hover]/contact:stroke-2 group-has-[[data-ask]:hover]/contact:opacity-100"
const hotProjeto =
  "group-has-[[data-path=projeto]:hover]/contact:opacity-100 group-has-[[data-path=projeto]_a:focus-visible]/contact:opacity-100"
const hotVaga =
  "group-has-[[data-path=vaga]:hover]/contact:opacity-100 group-has-[[data-path=vaga]_a:focus-visible]/contact:opacity-100"
const mergeNode =
  "ease-out-expo fill-background stroke-white/30 transition-[fill,stroke] duration-500"

/**
 * O garfo fecha: abaixo do contato direto, os ramos `--projeto` e `--vaga`
 * voltam a se juntar e o tronco desce até a borda do footer, onde o sinal
 * se espalha pela régua. Hairline vermelha de 1px, sem halo (o LED da tecla
 * é o único brilho da seção), desenhada pelo scroll. Card em hover/foco: o
 * ramo dele acende, como no garfo de cima. Em uma coluna (celular) fica só
 * o tronco. Com reduced motion a linha já vem pronta, parada.
 */
function PathMerge({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const fade = `merge-fade-${useId().replace(/[^\w-]/g, "")}`
  // Geometria em px reais: num viewBox esticado o canto deformaria, e o
  // pathLength não convive com non-scaling-stroke (vira tracejado)
  const [box, setBox] = useState<MergeBox | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Os mesmos pontos de quebra da grade dos cards (md: 2 colunas, lg: gap-6)
    const md = window.matchMedia("(min-width: 48rem)")
    const lg = window.matchMedia("(min-width: 64rem)")
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      // Fora do layout (0×0) não há o que desenhar
      if (!w || !h) return
      setBox({ w, h, split: md.matches, gap: lg.matches ? 24 : 16 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 0 quando a linha entra por baixo da tela, 1 com a borda do footer já
  // a 15% do pé da tela (o footer aparecendo)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end 0.85"],
  })
  // Sinal descendo: ramos → tronco → régua do footer
  const branchLen = useTransform(scrollYProgress, [0, 0.45], [0, 1])
  const trunkLen = useTransform(scrollYProgress, [0.45, 0.9], [0, 1])
  const soloLen = useTransform(scrollYProgress, [0, 0.9], [0, 1])
  const landLen = useTransform(scrollYProgress, [0.9, 1], [0, 1])
  const draw = (len: MotionValue<number>) =>
    reduce ? undefined : { pathLength: len }

  let art = null
  if (box) {
    const { w, h, split, gap } = box
    const c = px(w / 2)
    const r = 16 // o mesmo raio dos cantos do garfo (rounded-2xl)
    const m = Math.round(Math.min(h * 0.3, 72))
    // Pés no centro de cada coluna, alinhados aos nós do garfo
    const x1 = px(w / 4 - gap / 4)
    const x2 = px((3 * w) / 4 + gap / 4) - 1
    const land = Math.round(Math.min(112, w * 0.14))
    const base = h - 0.5

    art = (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        className="absolute inset-0 overflow-visible"
      >
        <defs>
          <linearGradient
            id={fade}
            gradientUnits="userSpaceOnUse"
            x1={c - land}
            y1={0}
            x2={c + land}
            y2={0}
          >
            <stop offset="0" style={{ stopColor: "var(--red-light)", stopOpacity: 0 }} />
            <stop offset="0.5" style={{ stopColor: "var(--red-light)" }} />
            <stop offset="1" style={{ stopColor: "var(--red-light)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {split ? (
          <>
            <motion.path
              d={`M${x1} 0V${m - r}A${r} ${r} 0 0 0 ${x1 + r} ${m}H${c}`}
              style={draw(branchLen)}
              className={cn(strength, hotProjeto, "stroke-red-light group-data-[armed=true]/contact:delay-[400ms]")}
            />
            <motion.path
              d={`M${x2} 0V${m - r}A${r} ${r} 0 0 1 ${x2 - r} ${m}H${c}`}
              style={draw(branchLen)}
              className={cn(strength, hotVaga, "stroke-red-light group-data-[armed=true]/contact:delay-[400ms]")}
            />
            <motion.path
              d={`M${c} ${m}V${h}`}
              style={draw(trunkLen)}
              className={cn(strength, "stroke-red-light group-data-[armed=true]/contact:delay-500")}
            />
          </>
        ) : (
          <motion.path
            d={`M${c} 0V${h}`}
            style={draw(soloLen)}
            className={cn(strength, "stroke-red-light group-data-[armed=true]/contact:delay-[400ms]")}
          />
        )}

        {/* Chegada: o sinal se abre pelos dois lados da borda do footer */}
        {[-land, land].map((dx, i) => (
          <motion.path
            key={i}
            d={`M${c} ${base}H${c + dx}`}
            stroke={`url(#${fade})`}
            style={draw(landLen)}
            className={cn(strength, "group-data-[armed=true]/contact:delay-[600ms]")}
          />
        ))}

        {/* Nós onde os ramos saem da caixa do contato direto */}
        {split ? (
          <>
            <circle
              cx={x1}
              cy={0}
              r={3}
              className={cn(
                mergeNode,
                "group-has-[[data-path=projeto]:hover]/contact:fill-red-light group-has-[[data-path=projeto]:hover]/contact:stroke-red-light group-has-[[data-path=projeto]_a:focus-visible]/contact:fill-red-light group-has-[[data-path=projeto]_a:focus-visible]/contact:stroke-red-light group-data-[armed=true]/contact:fill-red-light group-data-[armed=true]/contact:stroke-red-light group-data-[armed=true]/contact:delay-[400ms]",
              )}
            />
            <circle
              cx={x2}
              cy={0}
              r={3}
              className={cn(
                mergeNode,
                "group-has-[[data-path=vaga]:hover]/contact:fill-red-light group-has-[[data-path=vaga]:hover]/contact:stroke-red-light group-has-[[data-path=vaga]_a:focus-visible]/contact:fill-red-light group-has-[[data-path=vaga]_a:focus-visible]/contact:stroke-red-light",
              )}
            />
          </>
        ) : (
          <circle
            cx={c}
            cy={0}
            r={3}
            className={cn(
              mergeNode,
              "group-data-[armed=true]/contact:fill-red-light group-data-[armed=true]/contact:stroke-red-light",
            )}
          />
        )}
      </svg>
    )
  }

  return (
    <div ref={ref} data-merge aria-hidden className={cn("relative", className)}>
      {art}
    </div>
  )
}
