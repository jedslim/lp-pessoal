"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  Check,
  FileText,
  LoaderCircle,
  Mail,
  MessageCircle,
  RotateCcw,
  Search,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from "lucide-react"
import { PlaygroundBar } from "@/components/capabilities-demo-tag"
import { cn } from "@/lib/utils"

/*
 * IA aplicada, sem terminal encenado: a pessoa escolhe uma tarefa, vê o
 * texto de entrada ser lido, cada campo do resultado aparecer com o trecho
 * que o justifica marcado na entrada e, no fim, revisa e aprova. É um roteiro
 * pronto (demo), rotulado como tal: nada é enviado a um modelo.
 */

const EASE = [0.22, 1, 0.36, 1] as const

/** Trecho da entrada: texto corrido ou evidência (`e`) usada no resultado. */
type Seg = string | { e: number; t: string }
type Field = {
  label: string
  value: string
  /** Evidências da entrada que sustentam este campo. */
  ev: number[]
  /** Consulta a um sistema (não é texto gerado): ícone próprio. */
  tool?: boolean
}
type Task = {
  chip: string
  icon: LucideIcon
  source: { kind: string; icon: LucideIcon; text: Seg[] }
  fields: Field[]
  approved: string
}

const TASKS: Task[] = [
  {
    chip: "Resumir um briefing",
    icon: FileText,
    source: {
      kind: "E-mail de um cliente",
      icon: Mail,
      text: [
        "Oi! Somos uma clínica odontológica com duas unidades. ",
        { e: 1, t: "Queremos um site novo" },
        ", mais moderno, ",
        { e: 2, t: "com uma página para cada tratamento" },
        " e ",
        { e: 3, t: "agendamento pelo WhatsApp" },
        ". Hoje ",
        { e: 4, t: "a recepção perde muita ligação" },
        " no horário de pico. ",
        { e: 5, t: "Precisa estar no ar antes de março" },
        ", quando abre a terceira unidade. Ah, ",
        { e: 6, t: "o blog atual tem uns 40 posts" },
        " que não podem se perder.",
      ],
    },
    fields: [
      { label: "Objetivo", value: "Site novo, com agendamento pelo WhatsApp", ev: [1, 3] },
      { label: "Estrutura", value: "Uma página por tratamento, mais o blog", ev: [2, 6] },
      { label: "Problema hoje", value: "Ligações perdidas na recepção", ev: [4] },
      { label: "Prazo", value: "Antes de março (abertura da 3ª unidade)", ev: [5] },
      { label: "A confirmar", value: "Migração dos 40 posts do blog atual", ev: [6] },
    ],
    approved: "Aprovado por você. Vira o escopo da proposta.",
  },
  {
    chip: "Classificar um contato",
    icon: UserCheck,
    source: {
      kind: "Mensagem no WhatsApp",
      icon: MessageCircle,
      text: [
        "Oi! Vi o site de vocês. ",
        { e: 1, t: "Tenho uma marca de roupas e quero vender online" },
        ", ",
        { e: 2, t: "uns 200 produtos" },
        ". ",
        { e: 3, t: "Dá pra ficar pronto antes da Black Friday?" },
        " ",
        { e: 4, t: "Quanto custa mais ou menos?" },
      ],
    },
    fields: [
      { label: "Tipo de projeto", value: "Loja virtual", ev: [1] },
      { label: "Tamanho", value: "Cerca de 200 produtos", ev: [2] },
      { label: "Urgência", value: "Alta: prazo na Black Friday", ev: [3] },
      { label: "Intenção", value: "Pediu orçamento", ev: [4] },
      { label: "Próximo passo", value: "Enviar proposta em até 24 h", ev: [3, 4] },
    ],
    approved: "Aprovado por você. O contato vai para “Proposta” no CRM.",
  },
  {
    chip: "Responder um cliente",
    icon: MessageCircle,
    source: {
      kind: "E-mail para o suporte",
      icon: Mail,
      text: [
        "Boa tarde. ",
        { e: 1, t: "Comprei uma cafeteira no dia 3" },
        " e até agora nada. ",
        { e: 2, t: "O rastreio não atualiza desde sexta" },
        ". ",
        { e: 3, t: "Pedido 48213" },
        ".",
      ],
    },
    fields: [
      {
        label: "Consultou a loja",
        value: "Pedido 48213: em transporte, entrega prevista para 14/11",
        ev: [3],
        tool: true,
      },
      {
        label: "Rascunho da resposta",
        value:
          "Oi! Consultei o pedido 48213: ele está em transporte e a entrega está prevista para 14/11. O rastreio da transportadora às vezes demora a atualizar. Se não chegar até lá, me responde aqui que eu resolvo direto com eles.",
        ev: [1, 2],
      },
    ],
    approved: "Aprovado por você. A resposta foi enviada ao cliente.",
  },
]

type Phase = "idle" | "lendo" | "gerando" | "revisao" | "aprovado"

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

const STEPS = [
  { label: "Lê a entrada", sub: "e separa o que importa" },
  { label: "Escreve o rascunho", sub: "mostrando de onde tirou cada parte" },
  { label: "Você revisa", sub: "e nada segue sem aprovação" },
]
const PHASE_AT: Record<Phase, number> = {
  idle: -1,
  lendo: 0,
  gerando: 1,
  revisao: 2,
  aprovado: 3,
}

/** As três etapas, acesas conforme o trabalho anda. */
function Steps({ phase }: { phase: Phase }) {
  const at = PHASE_AT[phase]
  return (
    <ol aria-hidden className="space-y-1 rounded-2xl border border-white/[0.06] px-4 py-3.5">
      {STEPS.map((s, i) => {
        const st = at > i ? "done" : at === i ? "now" : "idle"
        return (
          <li key={s.label} className="flex items-center gap-3 py-1">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                st === "idle" && "border-white/12 text-white/30",
                st === "now" && "border-red-light/70 bg-red-light/10 text-red-light",
                st === "done" && "border-red-primary bg-red-primary text-white",
              )}
            >
              {st === "done" ? (
                <Check className="size-3" />
              ) : st === "now" && i < 2 ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : st === "now" ? (
                <UserCheck className="size-3" />
              ) : (
                <span className="size-1 rounded-full bg-current" />
              )}
            </span>
            <span className="min-w-0 text-[13px] leading-tight">
              <span className={cn("transition-colors duration-300", st === "idle" ? "text-foreground/50" : "text-foreground")}>
                {s.label}
              </span>{" "}
              <span className="text-muted-foreground">{s.sub}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const STATUS: Record<Phase, string> = {
  idle: "Escolha uma tarefa",
  lendo: "Lendo…",
  gerando: "Escrevendo…",
  revisao: "Sua vez de revisar",
  aprovado: "Aprovado",
}

export function AiPlayground({ active }: { active: boolean }) {
  const reduce = useReducedMotion()
  const [task, setTask] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")
  /** Quantos segmentos da entrada já foram "lidos". */
  const [read, setRead] = useState(0)
  /** Campos já começados e quanto do campo atual já foi escrito. */
  const [shown, setShown] = useState(0)
  const [typed, setTyped] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const started = useRef(false)

  const t = TASKS[task]

  const start = useCallback(
    (i: number) => {
      started.current = true
      setTask(i)
      setHover(null)
      // Sem animação: o resultado entra pronto, já esperando a revisão
      if (reduce) {
        setRead(TASKS[i].source.text.length)
        setShown(TASKS[i].fields.length)
        setTyped(Infinity)
        setPhase("revisao")
        return
      }
      setRun((n) => n + 1)
    },
    [reduce],
  )

  // Primeira vez na tela: roda a primeira tarefa sozinha
  useEffect(() => {
    if (active && !started.current) {
      const id = setTimeout(() => start(0), 500)
      return () => clearTimeout(id)
    }
  }, [active, start])

  // O roteiro: ler, depois escrever campo a campo, e parar na revisão
  useEffect(() => {
    if (run === 0 || reduce) return
    const tk = TASKS[task]
    const tm = timer()
    let cancelled = false
    ;(async () => {
      setPhase("lendo")
      setRead(0)
      setShown(0)
      setTyped(0)
      for (let i = 1; i <= tk.source.text.length; i++) {
        await tm.wait(70)
        if (cancelled) return
        setRead(i)
      }
      await tm.wait(350)
      if (cancelled) return
      setPhase("gerando")
      for (let f = 0; f < tk.fields.length; f++) {
        const len = tk.fields[f].value.length
        setShown(f + 1)
        setTyped(0)
        await tm.wait(tk.fields[f].tool ? 650 : 320)
        if (cancelled) return
        // Texto longo escreve mais rápido (por palavra), curto por letra
        const stepMs = len > 80 ? 22 : 26
        const chunk = len > 80 ? 3 : 1
        for (let c = chunk; c < len + chunk; c += chunk) {
          await tm.wait(stepMs)
          if (cancelled) return
          setTyped(Math.min(c, len))
        }
        await tm.wait(220)
        if (cancelled) return
      }
      setTyped(Infinity)
      setPhase("revisao")
    })()
    return () => {
      cancelled = true
      tm.clear()
    }
  }, [run, task, reduce])

  // Evidência acesa: a do campo sob o mouse, senão a do campo sendo escrito
  const writing = phase === "gerando" ? shown - 1 : -1
  const focusEv = new Set(
    hover !== null
      ? t.fields[hover].ev
      : writing >= 0
        ? t.fields[writing].ev
        : [],
  )
  const usedEv = new Set(t.fields.slice(0, shown).flatMap((f) => f.ev))

  const SourceIcon = t.source.icon
  const busy = phase === "lendo" || phase === "gerando"

  return (
    <div className="flex h-full flex-col">
      <PlaygroundBar
        icon={<Sparkles />}
        hint="Escolha uma tarefa: a IA faz o rascunho e você revisa antes de seguir."
      />

      {/* Tarefas */}
      <div
        role="group"
        aria-label="Tarefa para a IA"
        className="flex gap-1.5 overflow-x-auto px-4 pt-4 [scrollbar-width:none] sm:px-5"
      >
        {TASKS.map((tk, i) => {
          const on = task === i && phase !== "idle"
          const Icon = tk.icon
          return (
            <button
              key={tk.chip}
              type="button"
              aria-pressed={on}
              onClick={() => start(i)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-red-light/60",
                on
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground border-white/12 hover:border-white/30",
              )}
            >
              <Icon aria-hidden className="size-3.5" />
              {tk.chip}
            </button>
          )
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 sm:p-5 @[40rem]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @[40rem]:gap-5">
        {/* Entrada e, embaixo, as etapas (em que pé está o trabalho) */}
        <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-[#0d0d10]">
          <p className="text-muted-foreground flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-[12px]">
            <SourceIcon aria-hidden className="size-3.5" />
            Entrada
            <span className="text-white/25">·</span>
            <span className="text-foreground/80">{t.source.kind}</span>
          </p>
          <p className="px-4 py-4 text-[14px] leading-[1.7] text-pretty">
            {t.source.text.map((seg, i) => {
              const lido = i < read || phase === "idle"
              if (typeof seg === "string")
                return (
                  <span
                    key={i}
                    className={cn(
                      "transition-colors duration-300",
                      lido ? "text-foreground/75" : "text-foreground/25",
                    )}
                  >
                    {seg}
                  </span>
                )
              const foco = focusEv.has(seg.e)
              const usado = usedEv.has(seg.e)
              return (
                <mark
                  key={i}
                  className={cn(
                    "-mx-px rounded-[3px] bg-transparent box-decoration-clone px-px decoration-1 underline-offset-[3px] transition-[background-color,color,text-decoration-color] duration-300",
                    !lido && "text-foreground/25",
                    lido && !usado && "text-foreground/75",
                    usado && "text-foreground decoration-red-light/60 underline",
                    foco && "bg-red-light/25 text-white decoration-red-light",
                  )}
                >
                  {seg.t}
                </mark>
              )
            })}
          </p>
        </div>
        <Steps phase={phase} />
        </div>

        {/* Resultado */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col rounded-2xl border bg-[#0d0d10] transition-[border-color] duration-500",
            phase === "aprovado" ? "border-emerald-400/40" : "border-white/[0.08]",
          )}
        >
          <p className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-[12px]">
            <Sparkles aria-hidden className="text-red-light size-3.5" />
            <span className="text-muted-foreground">Rascunho da IA</span>
            <span
              aria-live="polite"
              className={cn(
                "ml-auto flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] uppercase",
                phase === "aprovado" ? "text-emerald-400" : "text-muted-foreground",
              )}
            >
              {busy && <LoaderCircle aria-hidden className="size-3 animate-spin" />}
              {phase === "aprovado" && <Check aria-hidden className="size-3" />}
              {STATUS[phase]}
            </span>
          </p>

          <dl className="min-h-0 flex-1 space-y-3.5 overflow-hidden px-4 py-4">
            {t.fields.slice(0, shown).map((f, i) => {
              const done = i < shown - 1 || typed === Infinity
              const text = done ? f.value : f.value.slice(0, typed)
              return (
                <motion.div
                  key={`${run}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  className={cn(
                    "-mx-2 rounded-lg px-2 py-1 transition-colors duration-300",
                    hover === i && "bg-white/[0.04]",
                  )}
                >
                  <dt className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] uppercase">
                    {f.tool && <Search aria-hidden className="text-red-light size-3" />}
                    {f.label}
                  </dt>
                  <dd
                    className={cn(
                      "mt-1 leading-snug",
                      f.tool ? "text-foreground/80 text-[13.5px]" : "text-foreground text-[15px]",
                    )}
                  >
                    {text}
                    {!done && phase === "gerando" && (
                      <span
                        aria-hidden
                        className="bg-red-light ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em]"
                      />
                    )}
                  </dd>
                </motion.div>
              )
            })}
            {phase === "lendo" && (
              <p className="text-muted-foreground flex items-center gap-2 text-[13px]">
                <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
                Lendo a entrada e separando o que importa…
              </p>
            )}
            {phase === "idle" && (
              <p className="text-muted-foreground text-[13px]">
                O resultado aparece aqui, com o trecho de onde cada informação saiu.
              </p>
            )}
          </dl>

          {/* Revisão humana */}
          <div className="border-t border-white/[0.06] px-4 py-3">
            <AnimatePresence mode="wait" initial={false}>
              {phase === "aprovado" ? (
                <motion.p
                  key="ok"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex min-h-10 items-center gap-2.5 text-[13.5px] text-emerald-300"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
                    <Check aria-hidden className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">{t.approved}</span>
                  <button
                    type="button"
                    onClick={() => start(task)}
                    className="text-muted-foreground hover:text-foreground flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-red-light/60"
                  >
                    <RotateCcw aria-hidden className="size-3" />
                    De novo
                  </button>
                </motion.p>
              ) : (
                <motion.div
                  key="review"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2"
                >
                  <p
                    className={cn(
                      "flex min-w-0 flex-1 basis-[15rem] items-center gap-2 text-[13px] transition-colors duration-300",
                      phase === "revisao" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <UserCheck aria-hidden className="size-4 shrink-0" />
                    Revisão humana: a IA sugere, você decide.
                  </p>
                  <span className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      disabled={phase !== "revisao"}
                      onClick={() => start(task)}
                      className="text-muted-foreground hover:text-foreground flex h-10 items-center rounded-full border border-white/12 px-3.5 text-[13px] transition-colors duration-300 outline-none hover:border-white/30 focus-visible:ring-2 focus-visible:ring-red-light/60 disabled:pointer-events-none disabled:opacity-40"
                    >
                      Refazer
                    </button>
                    <button
                      type="button"
                      disabled={phase !== "revisao"}
                      onClick={() => setPhase("aprovado")}
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-[background-color,opacity,box-shadow] duration-300 outline-none focus-visible:ring-3 focus-visible:ring-red-light/40 disabled:pointer-events-none disabled:opacity-40",
                        phase === "revisao"
                          ? "bg-red-primary hover:bg-red-light text-white shadow-[0_0_0_4px_rgb(255_52_59/0.12)]"
                          : "bg-white/10 text-white",
                      )}
                    >
                      <Check aria-hidden className="size-3.5" />
                      Aprovar
                    </button>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
