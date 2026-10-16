"use client"

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react"
import { useInView } from "motion/react"
import { ArrowDown } from "lucide-react"
import { AboutConfig, linkLine, type AboutLink } from "@/components/about-config"
import { AboutFigure } from "@/components/about-figure"
import { AboutSheet } from "@/components/about-sheet"
import { AboutStrike } from "@/components/about-strike"
import { goTo } from "@/components/chrome-nav"
import { useScramble } from "@/components/chrome-scramble"
import { ButtonLink } from "@/components/kit/button-link"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * Statement em duas vozes: a premissa menor, em cinza (com o grifo de
 * revisor em "mais complexa"), e a resposta enorme. O tamanho do h2 é o da
 * resposta; a premissa encolhe em `em`, então a máscara de cada linha (em
 * `em` do h2) sobra para acentos e cedilha.
 */
const statement: ReactNode[] = [
  "Boas soluções não começam pela",
  <>
    tecnologia <AboutStrike>mais complexa</AboutStrike>.
  </>,
  // No celular a resposta vira um cartaz de 4 linhas, uma palavra por linha
  <>
    Começam
    <br className="sm:hidden" /> pela
  </>,
  <>
    escolha
    <br className="sm:hidden" />{" "}
    <span className="font-serif text-[1.08em] font-normal tracking-[-0.01em] [font-stretch:normal] [font-synthesis:none]">
      certa.
    </span>
  </>,
]

const statementLine = (i: number) =>
  i < 2
    ? cn(
        // No celular a premissa cabe em uma linha cada (sem quebra dentro da máscara)
        "text-ink-muted text-[0.3em] leading-[1.12] font-semibold tracking-[-0.022em] sm:text-[0.34em] sm:leading-[1.08]",
        i === 1 && "mb-[0.6em]",
      )
    : undefined

/**
 * Trecho da bio ligado a uma linha do `jedson.config.ts`, como uma nota de
 * rodapé: a chamada "L2" é a pista; mouse/foco acende os dois lados
 * (marca-texto aqui, linha lá) e, no toque, a chamada alterna.
 */
function Ref({
  link,
  active,
  onLink,
  children,
  after,
  end,
}: {
  link: AboutLink
  active: AboutLink | null
  onLink: (link: AboutLink | null) => void
  children: ReactNode
  /** Pontuação que fecha o trecho: fica antes da chamada, fora do marca-texto. */
  after?: string
  /** O que vem colado depois da chamada (o fim de matéria), sem quebrar dela. */
  end?: ReactNode
}) {
  const on = active === link
  const line = linkLine[link]
  // Último ponteiro que apertou a chamada: com mouse o hover já acendeu e o
  // clique só confirma; no toque (e no teclado) o clique alterna
  const pointer = useRef("")
  const mouse = (fn: () => void) => (e: PointerEvent) => {
    if (e.pointerType === "mouse") fn()
  }
  return (
    <span
      onPointerEnter={mouse(() => onLink(link))}
      onPointerLeave={mouse(() => onLink(null))}
    >
      {/* Sem sublinhado em repouso: a chamada já sinaliza, e o parágrafo
          não vira uma fileira de links */}
      <span
        className={cn(
          "ease-out-expo bg-[linear-gradient(rgb(229_9_20/0.2),rgb(229_9_20/0.2))] bg-left-bottom bg-no-repeat transition-[background-size] duration-700",
          on ? "bg-[length:100%_0.5em]" : "bg-[length:0%_0.5em]",
        )}
      >
        {children}
      </span>
      {/* Pontuação + chamada nunca se separam (a chamada não fica órfã).
          A chamada sobe com `top`, então não abre a entrelinha. */}
      <span className="whitespace-nowrap">
        {after}
        <button
          type="button"
          aria-pressed={on}
          aria-controls={`about-cfg-${link}`}
          aria-label={`Destacar a linha ${line} do jedson.config.ts`}
          onPointerDown={(e) => (pointer.current = e.pointerType)}
          // Só o foco de teclado acende; o foco do toque/clique fica com o onClick
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) onLink(link)
          }}
          // Só apaga se a ligação ainda for desta chamada: no toque, o foco sai
          // daqui depois que o tap numa linha do config já acendeu outra
          onBlur={() => {
            if (on) onLink(null)
          }}
          onClick={() => {
            onLink(pointer.current === "mouse" || !on ? link : null)
            pointer.current = ""
          }}
          className={cn(
            "relative isolate -top-[0.95em] ml-[0.2em] inline-block rounded-[2px] font-mono text-[11px] leading-none font-medium tracking-[0.04em] transition-colors duration-300 outline-none",
            // outline-solid: no Tailwind 4 o outline-none zera o
            // --tw-outline-style e, sem ele, o anel do foco nunca aparecia
            "focus-visible:outline-solid focus-visible:outline-red-primary/60 focus-visible:outline-2 focus-visible:outline-offset-[3px]",
            // Área de toque maior que o desenho
            "before:absolute before:-inset-3 before:content-['']",
            // Fundo do estado aceso: um pseudo-elemento que transborda o texto.
            // Sem padding no botão, a chamada em repouso cola na pontuação como
            // um sobrescrito, e acender não empurra nada
            "after:bg-red-primary after:absolute after:-inset-x-[0.35em] after:-inset-y-[0.25em] after:-z-10 after:rounded-[4px] after:transition-opacity after:duration-300 after:content-['']",
            // Em repouso, só o mono em vermelho mais fechado (o red-primary sobre
            // o bone fica em 3,8:1; este passa no AA)
            on ? "text-white after:opacity-100" : "text-[#c1070f] after:opacity-0",
          )}
        >
          L{line}
        </button>
        {end}
      </span>
    </span>
  )
}

/** Marca de registro de gráfica (⊕), ornamento do cabeçalho. */
function RegMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 text-ink/45">
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" />
      <path d="M8 0v16M0 8h16" stroke="currentColor" />
    </svg>
  )
}

/** Título corrente da página: embaralha e se resolve quando o cabeçalho entra. */
function RunningHead({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, amount: 1 })
  const [out, play] = useScramble(text)
  useEffect(() => {
    if (inView) play()
  }, [inView, play])
  return (
    <p ref={ref} className="text-label text-ink-muted hidden md:block">
      <span aria-hidden>{out}</span>
      <span className="sr-only">{text}</span>
    </p>
  )
}

/**
 * "Vira a folha" para o contato: um link curto (o rótulo "[06] Contato" já
 * abre a seção seguinte logo abaixo). O rótulo embaralha como os links do menu.
 */
function NextPage() {
  const label = "Contato"
  const [text, scramble] = useScramble(label.toUpperCase())
  return (
    <a
      href="#contato"
      onPointerEnter={scramble}
      onFocus={scramble}
      onClick={(e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        goTo("#contato")
      }}
      className="group/next text-label text-ink relative flex min-h-10 items-center gap-3 rounded-sm py-2 outline-none focus-visible:ring-2 focus-visible:ring-red-primary/60"
    >
      <span
        aria-hidden
        // A largura (não scale) cresce: o fio estica e empurra o texto, sem sobrepor
        className="bg-ink/25 ease-out-expo group-hover/next:bg-ink group-focus-visible/next:bg-ink h-px w-6 transition-[width,background-color] duration-500 group-hover/next:w-12 sm:w-10 sm:group-hover/next:w-20"
      />
      <span aria-hidden>{text}</span>
      <span className="sr-only">{label}</span>
      <ArrowDown
        aria-hidden
        className="ease-out-expo size-3.5 transition-transform duration-500 group-hover/next:translate-y-0.5"
      />
    </a>
  )
}

export function About() {
  const ref = useRef<HTMLElement>(null)
  const [link, setLink] = useState<AboutLink | null>(null)

  return (
    <section
      id="sobre"
      ref={ref}
      aria-label="Sobre"
      data-tone="light"
      className="text-ink relative isolate pt-24 pb-8 sm:pt-28 sm:pb-10 lg:pt-40 lg:pb-12"
    >
      <AboutSheet target={ref} />

      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Cabeçalho de revista: seção, título da matéria e a marca de registro */}
        <div className="border-ink/15 flex items-center justify-between gap-6 border-b pb-5">
          {/* O índice num vermelho de texto mais fechado: o red-primary fica em
              3,8:1 sobre o bone; este passa de 5,7:1 */}
          <SectionLabel
            index="05"
            label="Sobre"
            tone="light"
            className="[&>span:first-child]:text-[#B8000D]"
          />
          <RunningHead text={`Perfil · ${site.name}`} />
          <RegMark />
        </div>

        <SplitLines
          as="h2"
          lines={statement}
          lineClassName={statementLine}
          stagger={0.08}
          className="text-display mt-14 text-[14vw] sm:mt-20 sm:text-[min(9.6vw,9.25rem)] lg:mt-24"
        />

        {/* Página dupla: retrato | fio | texto e config */}
        <div className="mt-16 grid gap-16 sm:mt-24 lg:mt-32 lg:grid-cols-[minmax(0,5fr)_1px_minmax(0,6fr)] lg:gap-x-14 xl:gap-x-20">
          {/* No desktop o retrato acompanha a leitura da coluna ao lado */}
          <AboutFigure className="mx-auto w-full max-w-[30rem] lg:sticky lg:top-28 lg:max-w-none lg:self-start" />

          <div aria-hidden className="bg-ink/10 hidden lg:block" />

          <div className="min-w-0">
            <div className="max-w-[38rem]">
              {/* Capitular com o resto da 1ª palavra em versal: "S" + "OU" se
                  leem como "SOU" (e não como "S ou") */}
              <p className="text-ink text-[1.3rem] leading-[1.45] tracking-[-0.012em] text-pretty first-letter:mr-[0.06em] first-letter:font-[family-name:var(--font-archivo)] first-letter:font-extrabold first-letter:[font-stretch:125%] first-letter:[-webkit-initial-letter:3] first-letter:[initial-letter:3] sm:text-[1.6rem]">
                {"S"}
                <span className="text-[0.8em] font-medium tracking-[0.05em] uppercase">
                  ou {site.name},
                </span>{" "}
                <Ref link="cargo" active={link} onLink={setLink} after=".">
                  desenvolvedor full stack
                </Ref>{" "}
                Trabalho do front ao back, sozinho ou junto do time:{" "}
                <Ref link="formatos" active={link} onLink={setLink} after=".">
                  em agência, como freela ou dentro de produto
                </Ref>
              </p>
              <p className="text-ink-muted mt-7 text-base leading-relaxed text-pretty sm:text-lg">
                No momento, estou{" "}
                <Ref link="status" active={link} onLink={setLink} after=".">
                  <strong className="text-ink font-medium">
                    disponível para projetos e também para vagas
                  </strong>
                </Ref>{" "}
                Minha formação é em{" "}
                <Ref link="formacao" active={link} onLink={setLink} after=",">
                  Análise e Desenvolvimento de Sistemas
                </Ref>{" "}
                e fiz o{" "}
                <Ref
                  link="curso"
                  active={link}
                  onLink={setLink}
                  after="."
                  end={
                    // Fim de matéria, como em revista (preso à última chamada)
                    <span
                      aria-hidden
                      className="bg-red-primary ml-2 inline-block size-[0.55em] align-baseline"
                    />
                  }
                >
                  curso de arquitetura de multiagentes da StartSe
                </Ref>
              </p>
            </div>

            <AboutConfig active={link} onLink={setLink} className="mt-14 lg:mt-16" />

            {/* No celular, as duas pílulas lado a lado (a partir de 360px), cada
                uma com metade da largura: alvo fácil para o polegar sem empilhar */}
            <div className="mt-10 grid gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <ButtonLink
                href={site.linkedin}
                variant="dark"
                size="lg"
                className="min-w-0 justify-between pl-5 sm:pl-7"
              >
                LinkedIn
              </ButtonLink>
              <ButtonLink
                href={site.github}
                variant="ink-ghost"
                size="lg"
                className="min-w-0 justify-between pl-5 sm:pl-7"
              >
                GitHub
              </ButtonLink>
              {site.resume && (
                <ButtonLink
                  href={site.resume}
                  variant="ink-ghost"
                  size="lg"
                  icon="none"
                  external={false}
                  download
                  className="justify-center min-[360px]:col-span-2"
                >
                  Baixar currículo
                </ButtonLink>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé da página: espelha o cabeçalho e "vira a folha" para o contato */}
        <div className="border-ink/15 mt-24 flex items-center justify-between gap-6 border-t pt-5 sm:mt-28 lg:mt-32">
          <p className="text-label text-ink-muted">
            {site.url.replace(/^https?:\/\//, "")}
          </p>
          <NextPage />
        </div>
      </div>
    </section>
  )
}
