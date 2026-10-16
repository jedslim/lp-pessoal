"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  ArrowLeft,
  Bell,
  Check,
  ClipboardList,
  LoaderCircle,
  RotateCcw,
  Send,
  SquareKanban,
  Zap,
} from "lucide-react"
import { siN8n, siWhatsapp } from "simple-icons"
import { PlaygroundBar } from "@/components/capabilities-demo-tag"
import { cn } from "@/lib/utils"

/*
 * Integrações, em causa e efeito: a pessoa preenche um mini formulário e vê,
 * em três passos grandes, o que uma integração faz sozinha. O contato vira um
 * card no CRM, chega uma mensagem no WhatsApp com o nome digitado e o time
 * recebe um aviso. Tudo simulado no navegador (nada é enviado).
 */

const EASE = [0.22, 1, 0.36, 1] as const

const INTERESSES = ["Site", "Loja virtual", "Sistema", "Automação"] as const
type Interesse = (typeof INTERESSES)[number]

/** Como o interesse aparece no meio de uma frase. */
const NA_FRASE: Record<Interesse, string> = {
  Site: "um site",
  "Loja virtual": "uma loja virtual",
  Sistema: "um sistema",
  Automação: "uma automação",
}

type Fase = "idle" | "enviando" | "crm" | "whats" | "time" | "fim"
const ORDEM: Fase[] = ["idle", "enviando", "crm", "whats", "time", "fim"]
/** Quanto cada fase dura antes da próxima (ms). */
const DURA: Partial<Record<Fase, number>> = {
  enviando: 550,
  crm: 900,
  whats: 1500,
  time: 800,
}

type Lead = { id: number; nome: string; interesse: Interesse; hora: string }
type Status = "idle" | "running" | "done"

/** Status do passo `i` (0 = CRM, 1 = WhatsApp, 2 = time) em cada fase. */
function statusOf(fase: Fase, i: number): Status {
  const at = ORDEM.indexOf(fase) - 2
  if (at < i) return "idle"
  if (at === i) return "running"
  return "done"
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("fill-current", className)}>
      <path d={siWhatsapp.path} />
    </svg>
  )
}

const primeiro = (nome: string) => nome.trim().split(/\s+/)[0] ?? ""

/* ---------- Os três efeitos ---------- */

/** Cards de exemplo nas colunas do CRM (dados neutros). */
const PIPELINE = [
  { col: "Novos", cards: [] as string[] },
  { col: "Em conversa", cards: ["Contato do site · Sistema"] },
  { col: "Proposta", cards: ["Contato do site · Site"] },
]

function Crm({ leads, fresh }: { leads: Lead[]; fresh: number | null }) {
  return (
    <div className="@container/crm rounded-xl border border-white/[0.08] bg-[#0d0d10] p-2.5">
    <div className="grid grid-cols-2 gap-2 @[21rem]/crm:grid-cols-3">
      {PIPELINE.map((coluna, ci) => {
        const count = coluna.cards.length + (ci === 0 ? leads.length : 0)
        return (
          <div key={coluna.col} className={cn("min-w-0", ci === 2 && "hidden @[21rem]/crm:block")}>
            <p className="text-muted-foreground flex items-center justify-between gap-1 px-1 pb-2 text-[11px] font-medium">
              <span className="truncate">{coluna.col}</span>
              <span className="font-mono text-[10px] tabular-nums text-white/40">{count}</span>
            </p>
            <div className="relative h-[66px] space-y-1.5 overflow-hidden">
              {ci === 0 && (
                <AnimatePresence initial={false}>
                  {leads.slice(0, 1).map((lead) => (
                    // Absoluto: o card novo entra por cima do anterior sem
                    // empurrar nada (sem layout shift)
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, y: -18, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className={cn(
                        "absolute inset-x-0 top-0 rounded-lg border bg-[#16161a] px-2 py-1.5 transition-[border-color,box-shadow] duration-700",
                        fresh === lead.id
                          ? "border-red-light/70 shadow-[0_0_20px_-6px_rgb(255_52_59/0.7)]"
                          : "border-white/[0.08]",
                      )}
                    >
                      <p className="text-foreground truncate text-[12px] leading-tight font-medium">
                        {lead.nome}
                      </p>
                      <p className="text-muted-foreground mt-0.5 truncate text-[10.5px] leading-tight">
                        {lead.interesse} · {lead.hora}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              {coluna.cards.map((c) => (
                <div
                  key={c}
                  className="rounded-lg border border-white/[0.06] bg-[#121215] px-2 py-1.5"
                >
                  <p className="truncate text-[11px] leading-tight text-white/45">{c}</p>
                  <span className="mt-1.5 block h-1 w-2/3 rounded-full bg-white/[0.07]" />
                </div>
              ))}
              {ci === 0 && leads.length === 0 && (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 px-1 text-center text-[10.5px] leading-tight text-white/35">
                  vazio
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
    </div>
  )
}

/** Celular de quem enviou o formulário, recortado: a conversa do WhatsApp. */
function Phone({ lead, status }: { lead: Lead | null; status: Status }) {
  const nome = lead ? primeiro(lead.nome) : ""
  return (
    <div className="relative mx-auto h-[178px] w-full [@media(max-height:820px)]:h-[128px] max-w-[320px] overflow-hidden rounded-t-[26px] border border-b-0 border-white/15 bg-[#0b141a] p-1.5 pb-0 [mask-image:linear-gradient(to_bottom,black_84%,transparent)]">
      <div className="h-full overflow-hidden rounded-t-[20px] bg-[#0b141a]">
        {/* Cabeçalho da conversa */}
        <div className="flex items-center gap-2 bg-[#202c33] px-3 py-2">
          <ArrowLeft aria-hidden className="size-3.5 text-white/60" />
          <span className="flex size-6 items-center justify-center rounded-full bg-[#E50914] text-[10px] font-bold text-white">
            N
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[12px] font-medium text-[#e9edef]">
              Norte Torrefação
            </span>
            <span className="block text-[10px] text-[#8696a0]">
              {status === "running" ? "digitando…" : "online"}
            </span>
          </span>
          <WhatsappIcon className="ml-auto size-3.5 text-[#25d366]" />
        </div>
        {/* Mensagens */}
        <div className="flex flex-col items-start gap-2 px-3 pt-2.5">
          <span className="self-center rounded-md bg-[#182229] px-2 py-0.5 text-[10px] text-[#8696a0]">
            Hoje
          </span>
          <AnimatePresence mode="wait" initial={false}>
            {status === "running" && (
              <motion.span
                key="typing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-1 rounded-lg rounded-tl-none bg-[#202c33] px-3 py-2.5"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 rounded-full bg-[#8696a0] motion-safe:animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </motion.span>
            )}
            {status === "done" && lead && (
              <motion.p
                key={`msg-${lead.id}`}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="max-w-[92%] origin-top-left rounded-lg rounded-tl-none bg-[#202c33] px-2.5 py-1.5 text-[12.5px] leading-snug text-[#e9edef]"
              >
                Oi, <strong className="font-semibold text-white">{nome}</strong>! Recebemos
                seu contato sobre {NA_FRASE[lead.interesse]}. Posso te chamar por aqui?
                <span className="ml-2 inline-block translate-y-0.5 text-[10px] text-[#8696a0]">
                  {lead.hora}
                </span>
              </motion.p>
            )}
            {status === "idle" && (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="self-center pt-3 text-[11px] text-[#8696a0]"
              >
                Nenhuma mensagem ainda
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Team({ lead, status }: { lead: Lead | null; status: Status }) {
  return (
    <div className="relative h-[84px] overflow-hidden rounded-xl border [@media(max-height:820px)]:h-[78px] border-white/[0.08] bg-[#0d0d10]">
      <AnimatePresence mode="wait" initial={false}>
        {status === "done" && lead ? (
          <motion.div
            key={`aviso-${lead.id}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex items-start gap-3 px-3 py-2.5"
          >
            <span className="bg-red-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-white">
              <Bell aria-hidden className="size-3.5" />
            </span>
            <span className="min-w-0 text-[12.5px] leading-snug">
              <span className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px]">
                #comercial <span className="text-white/30">·</span> agora
              </span>
              <span className="text-foreground/90 mt-0.5 block">
                Novo contato pelo site: <strong className="text-foreground font-semibold">{lead.nome}</strong>,
                interesse em {NA_FRASE[lead.interesse]}. Já recebeu a mensagem no WhatsApp.
              </span>
            </span>
          </motion.div>
        ) : (
          <motion.p
            key="vazio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full items-center gap-2 px-3 text-[12px] text-white/35"
          >
            {status === "running" ? (
              <LoaderCircle aria-hidden className="text-red-light size-3.5 animate-spin" />
            ) : (
              <Bell aria-hidden className="size-3.5" />
            )}
            {status === "running" ? "Avisando o time…" : "Nenhum aviso ainda"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Um passo do efeito: marcador na espinha, título legível e o resultado. */
function Effect({
  status,
  title,
  sub,
  last,
  children,
}: {
  status: Status
  title: string
  sub: string
  last?: boolean
  children: ReactNode
}) {
  return (
    <li className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
      {/* Espinha entre os passos: acende quando o passo termina */}
      {!last && (
        <span
          aria-hidden
          className="absolute top-8 bottom-[-1.25rem] left-[calc(0.875rem-0.5px)] w-px bg-white/10"
        >
          <span
            className={cn(
              "bg-red-light absolute inset-x-0 top-0 origin-top transition-transform duration-500",
              status === "done" ? "h-full scale-y-100" : "h-full scale-y-0",
            )}
          />
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "relative flex size-7 items-center justify-center rounded-full border transition-colors duration-300",
          status === "idle" && "border-white/15 text-white/30",
          status === "running" && "border-red-light/70 text-red-light bg-red-light/10",
          status === "done" && "border-red-primary bg-red-primary text-white",
        )}
      >
        {status === "running" ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : status === "done" ? (
          <Check className="size-3.5" />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0 pb-5 [@media(max-height:820px)]:pb-3">
        <p
          className={cn(
            "flex flex-wrap items-baseline gap-x-2 pt-1 leading-tight transition-colors duration-300",
            status === "idle" ? "text-foreground/60" : "text-foreground",
          )}
        >
          <span className="text-[15px] font-medium">{title}</span>
          <span className="text-muted-foreground text-[12.5px]">{sub}</span>
        </p>
        <div className="mt-2.5">{children}</div>
      </div>
    </li>
  )
}

/* ---------- Por trás: o fluxo que liga as pontas ---------- */

const NODES = [
  { label: "Formulário", icon: ClipboardList },
  { label: "CRM", icon: SquareKanban },
  { label: "WhatsApp", icon: WhatsappIcon },
  { label: "Aviso", icon: Bell },
]

/** Status de cada nó: o formulário roda no "enviando", os outros seguem os passos. */
function nodeStatus(fase: Fase, i: number): Status {
  if (i > 0) return statusOf(fase, i - 1)
  if (fase === "idle") return "idle"
  return fase === "enviando" ? "running" : "done"
}

function Backstage({ fase }: { fase: Fase }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-4">
      <p className="text-muted-foreground flex items-start gap-2 text-[12.5px] leading-snug">
        <svg viewBox="0 0 24 24" aria-hidden className="mt-px size-3.5 shrink-0 fill-current text-[#ea4b71]">
          <path d={siN8n.path} />
        </svg>
        <span>
          Por trás, <span className="text-foreground/85">um fluxo no n8n</span> faz cada
          passo sozinho.
        </span>
      </p>
      <ol aria-hidden className="mt-4 flex items-start">
        {NODES.map((node, i) => {
          const st = nodeStatus(fase, i)
          const Icon = node.icon
          return (
            <li key={node.label} className="flex flex-1 items-start last:flex-none">
              <span className="flex w-14 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border transition-colors duration-300",
                    st === "idle" && "border-white/10 bg-white/[0.02] text-white/35",
                    st === "running" &&
                      "border-red-light/70 bg-red-light/10 text-red-light shadow-[0_0_18px_-4px_rgb(255_52_59/0.6)]",
                    st === "done" && "border-red-primary/50 bg-red-primary/15 text-red-light",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={cn(
                    "text-[10.5px] transition-colors duration-300",
                    st === "idle" ? "text-white/35" : "text-foreground/80",
                  )}
                >
                  {node.label}
                </span>
              </span>
              {i < NODES.length - 1 && (
                <span className="relative mt-[18px] h-px flex-1 bg-white/10">
                  <span
                    className={cn(
                      "bg-red-light absolute inset-0 origin-left transition-transform duration-500",
                      nodeStatus(fase, i + 1) === "idle" ? "scale-x-0" : "scale-x-100",
                    )}
                  />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ---------- Cena ---------- */

export function AutomationFlow({ active }: { active: boolean }) {
  const uid = useId()
  const reduce = useReducedMotion()
  const [nome, setNome] = useState("")
  const [interesse, setInteresse] = useState<Interesse>("Loja virtual")
  const [fase, setFase] = useState<Fase>("idle")
  const [leads, setLeads] = useState<Lead[]>([])
  const [lead, setLead] = useState<Lead | null>(null)
  const [erro, setErro] = useState(false)
  const [tocado, setTocado] = useState(false)
  const ids = useRef(0)
  const effectsRef = useRef<HTMLOListElement>(null)

  // Cada fase dura um tanto e passa para a próxima (como o fluxo rodando)
  useEffect(() => {
    const ms = DURA[fase]
    if (!ms) return
    const next = ORDEM[ORDEM.indexOf(fase) + 1]
    const id = setTimeout(
      () => {
        if (next === "crm" && lead) setLeads((l) => [lead, ...l].slice(0, 4))
        setFase(next)
      },
      reduce ? Math.min(ms, 250) : ms,
    )
    return () => clearTimeout(id)
  }, [fase, lead, reduce])

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    const limpo = nome.trim()
    if (!limpo) {
      setErro(true)
      return
    }
    setErro(false)
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    setLead({ id: ++ids.current, nome: limpo, interesse, hora })
    setFase("enviando")
    // No celular os efeitos ficam abaixo do formulário: traz para a vista
    if (window.matchMedia("(max-width: 47.99rem)").matches)
      effectsRef.current?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      })
  }

  const outro = () => {
    setFase("idle")
    setNome("")
    setLead(null)
  }

  const ocupado = fase !== "idle" && fase !== "fim"
  const enviado = fase !== "idle"
  const fresh = fase === "crm" || fase === "whats" ? (lead?.id ?? null) : null

  return (
    <div className="flex h-full flex-col">
      <PlaygroundBar
        icon={<Zap />}
        hint="Digite seu nome, envie e veja o que acontece sozinho em seguida."
      />

      <div className="grid min-h-0 flex-1 gap-5 p-4 sm:p-5 @[40rem]:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] @[40rem]:gap-6">
        {/* Causa: o formulário de um site (claro, como o site do cliente) e,
            embaixo, o fluxo que roda por trás */}
        <div className="flex min-w-0 flex-col gap-4">
        <form
          onSubmit={enviar}
          noValidate
          className="flex flex-col rounded-2xl bg-[#ECEAE4] p-5 text-[#0B0B0C]"
        >
          <p className="font-mono text-[10.5px] tracking-[0.18em] text-[#5D5B56] uppercase">
            O formulário do site
          </p>
          <p className="text-display-2 mt-2 text-[24px] leading-[0.95]">Fale com a gente</p>

          <label htmlFor={`${uid}-nome`} className="mt-5 text-[13px] font-medium">
            Seu nome
          </label>
          <motion.input
            id={`${uid}-nome`}
            type="text"
            value={nome}
            maxLength={28}
            autoComplete="off"
            spellCheck={false}
            disabled={enviado}
            placeholder="Digite seu nome"
            aria-invalid={erro || undefined}
            aria-describedby={erro ? `${uid}-erro` : undefined}
            onChange={(e) => {
              setNome(e.target.value)
              setTocado(true)
              if (erro) setErro(false)
            }}
            animate={erro && !reduce ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
              "mt-1.5 h-11 w-full rounded-lg border bg-white px-3 text-base text-[#0B0B0C] outline-none placeholder:text-[#0B0B0C]/35 transition-[border-color,box-shadow] duration-300 focus:border-[#E50914] focus:ring-3 focus:ring-[#E50914]/15 disabled:opacity-60 lg:text-[15px]",
              erro ? "border-[#E50914]" : "border-[#0B0B0C]/15",
              !tocado && active && "border-[#E50914]/60 ring-3 ring-[#E50914]/15",
            )}
          />
          <p
            id={`${uid}-erro`}
            role={erro ? "alert" : undefined}
            className={cn("mt-1.5 h-4 text-[12px] text-[#c4060f]", !erro && "invisible")}
          >
            Digite seu nome primeiro.
          </p>

          <fieldset className="mt-1">
            <legend className="text-[13px] font-medium">Tenho interesse em</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {INTERESSES.map((op) => (
                <label
                  key={op}
                  className={cn(
                    "flex h-10 cursor-pointer items-center rounded-full border px-3.5 text-[13px] transition-colors duration-300 has-focus-visible:ring-2 has-focus-visible:ring-[#E50914]/50 lg:h-9",
                    interesse === op
                      ? "border-[#0B0B0C] bg-[#0B0B0C] text-[#ECEAE4]"
                      : "border-[#0B0B0C]/15 hover:border-[#0B0B0C]/40",
                    enviado && "pointer-events-none opacity-60",
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-interesse`}
                    value={op}
                    checked={interesse === op}
                    disabled={enviado}
                    onChange={() => setInteresse(op)}
                    className="sr-only"
                  />
                  {op}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            {fase === "fim" ? (
              <button
                type="button"
                onClick={outro}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#0B0B0C]/20 text-[15px] font-medium transition-colors duration-300 outline-none hover:border-[#0B0B0C]/50 focus-visible:ring-3 focus-visible:ring-[#E50914]/40"
              >
                <RotateCcw aria-hidden className="size-4" />
                Enviar outro
              </button>
            ) : (
              <button
                type="submit"
                disabled={ocupado}
                className="group/send flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#E50914] text-[15px] font-medium text-white transition-[background-color,transform] duration-300 outline-none hover:bg-[#FF343B] focus-visible:ring-3 focus-visible:ring-[#E50914]/40 active:scale-[0.98] disabled:opacity-90"
              >
                {fase === "enviando" ? (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                ) : enviado ? (
                  <Check aria-hidden className="size-4" />
                ) : (
                  <Send
                    aria-hidden
                    className="size-4 transition-transform duration-300 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5"
                  />
                )}
                {fase === "enviando" ? "Enviando…" : enviado ? "Enviado" : "Enviar"}
              </button>
            )}
          </div>
        </form>
        <Backstage fase={fase} />
        </div>

        {/* Efeitos: os três passos, de cima para baixo */}
        <div className="flex min-w-0 flex-col">
          <p className="text-label text-muted-foreground mb-4 [@media(max-height:820px)]:mb-2.5">O que acontece depois</p>
          <ol ref={effectsRef} aria-live="polite" className="min-w-0">
            <Effect
              status={statusOf(fase, 0)}
              title="Vira um card no CRM"
              sub="na coluna de novos contatos"
            >
              <Crm leads={leads} fresh={fresh} />
            </Effect>
            <Effect
              status={statusOf(fase, 1)}
              title="Chega no WhatsApp"
              sub="com o seu nome"
            >
              <Phone lead={lead} status={statusOf(fase, 1)} />
            </Effect>
            <Effect
              status={statusOf(fase, 2)}
              title="O time é avisado"
              sub="no canal do comercial"
              last
            >
              <Team lead={lead} status={statusOf(fase, 2)} />
            </Effect>
          </ol>
          <AnimatePresence>
            {fase === "fim" && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-foreground/85 mt-auto flex items-center gap-2 pt-1 text-[13px] leading-snug"
              >
                <Check aria-hidden className="size-3.5 shrink-0 text-emerald-400" />
                Tudo isso em segundos, sem ninguém copiar e colar nada.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
