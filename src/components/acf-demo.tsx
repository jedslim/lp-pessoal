"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  Check,
  ChevronRight,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LoaderCircle,
  MousePointerClick,
  Pin,
  RotateCcw,
  Settings,
  SquareStack,
} from "lucide-react"
import { siWordpress } from "simple-icons"
import { PlaygroundBar } from "@/components/capabilities-demo-tag"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

/* ---------- Campos do grupo ACF "Hero" ---------- */

type Estilo = "claro" | "escuro" | "marca"
type Imagem = "arcos" | "grade" | "nenhuma"
type Campos = { titulo: string; botao: string; estilo: Estilo; imagem: Imagem }
type Alvo = keyof Campos | "publicar"
type Publicacao = "idle" | "publicando" | "publicado"

const LIMITE = { titulo: 48, botao: 22 }

/** O que aparece antes da demonstração começar (e o que "Restaurar" volta). */
const INICIAL: Campos = {
  titulo: "Agora quem edita é você.",
  botao: "Quero conhecer",
  estilo: "claro",
  imagem: "arcos",
}

/**
 * Roteiro da demonstração automática (roda até a pessoa assumir). São três
 * títulos em loop: o inicial, a promoção e o terceiro, que volta ao início.
 */
const ROTEIRO: Campos[] = [
  {
    titulo: "Promoção de aniversário no ar.",
    botao: "Aproveitar",
    estilo: "escuro",
    imagem: "nenhuma",
  },
  {
    titulo: "Seu conteúdo, do seu jeito.",
    botao: "Ver novidades",
    estilo: "marca",
    imagem: "grade",
  },
  INICIAL,
]

const ESTILOS: { value: Estilo; label: string; swatch: string }[] = [
  { value: "claro", label: "Claro", swatch: "#ECEAE4" },
  { value: "escuro", label: "Escuro", swatch: "#0B0B0C" },
  { value: "marca", label: "Marca", swatch: "#E50914" },
]

/** Cards da seção seguinte na prévia (conteúdo do site fictício). */
const SERVICOS = ["Sites", "Lojas", "Sistemas"]

const IMAGENS: { value: Imagem; label: string }[] = [
  { value: "arcos", label: "Arcos" },
  { value: "grade", label: "Grade" },
  { value: "nenhuma", label: "Nenhuma" },
]

/** Paleta da prévia para cada estilo (sempre dentro das cores da marca). */
const TEMAS: Record<
  Estilo,
  {
    bg: string
    fg: string
    muted: string
    line: string
    btnBg: string
    btnFg: string
    art: string
  }
> = {
  claro: {
    bg: "#ECEAE4",
    fg: "#0B0B0C",
    muted: "#5D5B56",
    line: "rgb(11 11 12 / 0.1)",
    btnBg: "#0B0B0C",
    btnFg: "#ECEAE4",
    art: "#E50914",
  },
  escuro: {
    bg: "#0B0B0C",
    fg: "#F2F2F0",
    muted: "#9A9AA0",
    line: "rgb(255 255 255 / 0.09)",
    btnBg: "#E50914",
    btnFg: "#FFFFFF",
    art: "#FF343B",
  },
  marca: {
    bg: "#E50914",
    fg: "#FFFFFF",
    muted: "rgb(255 255 255 / 0.78)",
    line: "rgb(255 255 255 / 0.22)",
    btnBg: "#FFFFFF",
    btnFg: "#0B0B0C",
    art: "#0B0B0C",
  },
}

/* ---------- Utilitários ---------- */

/** Esperas canceláveis para o roteiro automático. */
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

function WpLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("fill-current", className)}>
      <path d={siWordpress.path} />
    </svg>
  )
}

/* ---------- Prévia do site ---------- */

function Arte({ imagem, cor }: { imagem: Imagem; cor: string }) {
  return (
    <AnimatePresence initial={false}>
      {imagem === "arcos" && (
        <motion.svg
          key="arcos"
          aria-hidden
          viewBox="0 0 100 100"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="absolute -right-[14%] -bottom-[22%] w-[62%] origin-bottom-right"
        >
          {[46, 36, 26, 16].map((r, i) => (
            <circle
              key={r}
              cx="100"
              cy="100"
              r={r * 2}
              fill="none"
              stroke={cor}
              strokeWidth="1.2"
              strokeOpacity={0.25 + i * 0.18}
              style={{ transition: "stroke 0.5s" }}
            />
          ))}
          <circle cx="100" cy="100" r="22" fill={cor} style={{ transition: "fill 0.5s" }} />
        </motion.svg>
      )}
      {imagem === "grade" && (
        <motion.div
          key="grade"
          aria-hidden
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="absolute right-[6%] bottom-[10%] grid w-[34%] grid-cols-5 gap-[6%]"
        >
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-[2px] transition-[background-color,opacity] duration-500"
              style={{
                background: cor,
                opacity: i === 13 ? 1 : i % 3 === 0 ? 0.35 : 0.14,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type Tema = (typeof TEMAS)[Estilo]

/**
 * Contorno tracejado com a etiqueta do campo: mostra qual pedaço do site
 * cada campo do ACF alimenta (o `get_field()` do template).
 */
function Marcador({
  ativo,
  campo,
  tema,
  className,
  etiqueta = "topo",
}: {
  ativo: boolean
  campo: keyof Campos
  tema: Tema
  className?: string
  /** Onde fica a etiqueta: em cima (à direita) ou embaixo (à esquerda). */
  etiqueta?: "topo" | "base"
}) {
  return (
    <AnimatePresence>
      {ativo && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className={cn(
            "pointer-events-none absolute z-20 rounded-md border border-dashed",
            className,
          )}
          style={{ borderColor: tema.fg }}
        >
          <span
            className={cn(
              "absolute rounded-[3px] px-1.5 font-mono text-[8.5px] leading-[15px] font-normal tracking-normal whitespace-nowrap normal-case",
              etiqueta === "topo" ? "-top-[8px] right-2" : "-bottom-[8px] left-2",
            )}
            style={{ background: tema.fg, color: tema.bg }}
          >
            get_field(&apos;{campo}&apos;)
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function Previa({
  campos,
  pub,
  sync,
  marcado,
}: {
  campos: Campos
  pub: Publicacao
  sync: number
  /** Campo em foco no painel (ou na demonstração), contornado na prévia. */
  marcado: keyof Campos | null
}) {
  const tema = TEMAS[campos.estilo]
  const comArte = campos.imagem !== "nenhuma"
  // Título se ajusta ao tamanho do texto (em cqi: relativo à largura da prévia)
  const len = campos.titulo.length
  const base = len <= 18 ? 11.5 : len <= 30 ? 9.4 : 7.6
  const fontSize = `${(comArte ? base * 0.94 : base * 1.1).toFixed(2)}cqi`

  return (
    <div
      className="@container relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] transition-colors duration-500"
      style={{ background: tema.bg, color: tema.fg }}
    >
      {/* Barra do navegador */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2 transition-colors duration-500"
        style={{ borderColor: tema.line }}
      >
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full opacity-30"
              style={{ background: tema.fg }}
            />
          ))}
        </span>
        <span
          className="mx-auto truncate rounded-full px-2.5 py-0.5 font-mono text-[9px] transition-colors duration-500"
          style={{ background: tema.line, color: tema.muted }}
        >
          seusite.com.br
        </span>
        <span className="flex items-center gap-1 font-mono text-[8.5px] tracking-[0.14em] uppercase">
          <motion.span
            key={sync}
            initial={{ scale: 1.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4 }}
            className="size-1.5 rounded-full bg-emerald-400"
          />
          <span style={{ color: tema.muted }}>ao vivo</span>
        </span>
      </div>

      {/* Navegação do site */}
      <div className="flex items-center justify-between px-[6cqi] pt-[4.5cqi] text-[10px]">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className="flex size-4 items-center justify-center rounded-full text-[8px] font-bold transition-colors duration-500"
            style={{ background: tema.fg, color: tema.bg }}
          >
            S
          </span>
          Seu Site
        </span>
        <span className="hidden gap-3 @[18rem]:flex" style={{ color: tema.muted }}>
          <span>Início</span>
          <span>Sobre</span>
          <span>Contato</span>
        </span>
      </div>

      {/* Hero editável */}
      <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-[6cqi] pt-[5cqi] pb-[7cqi]">
        <Arte imagem={campos.imagem} cor={tema.art} />
        <Marcador
          ativo={marcado === "estilo" || marcado === "imagem"}
          campo={marcado === "imagem" ? "imagem" : "estilo"}
          tema={tema}
          className="inset-[3cqi]"
        />
        <p
          className="relative font-mono text-[8.5px] tracking-[0.18em] uppercase transition-colors duration-500"
          style={{ color: tema.muted }}
        >
          Página inicial
        </p>
        <div
          className={cn(
            "relative mt-[3cqi] self-start transition-[max-width] duration-500",
            comArte ? "max-w-[82%]" : "max-w-full",
          )}
        >
          <p
            className={cn(
              "text-display line-clamp-3 break-words",
              !campos.titulo && "opacity-35",
            )}
            style={{ fontSize, lineHeight: 0.98 }}
          >
            {campos.titulo || "Escreva um título"}
          </p>
          <Marcador
            ativo={marcado === "titulo"}
            campo="titulo"
            tema={tema}
            className="-inset-x-[6px] -inset-y-[5px]"
            // Embaixo à esquerda: com título curto a caixa encolhe e a
            // etiqueta à direita vazava pela borda da prévia
            etiqueta="base"
          />
        </div>
        <AnimatePresence initial={false}>
          {campos.botao && (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
              className="relative mt-[5.5cqi] inline-flex h-8 max-w-full items-center gap-2 self-start rounded-full pr-1 pl-3.5 text-[11px] font-medium transition-colors duration-500"
              style={{ background: tema.btnBg, color: tema.btnFg }}
            >
              <span className="truncate">{campos.botao}</span>
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px]"
                style={{ background: "rgb(127 127 127 / 0.22)" }}
              >
                ↗
              </span>
              <Marcador
                ativo={marcado === "botao"}
                campo="botao"
                tema={tema}
                className="-inset-[5px] rounded-full"
                etiqueta="base"
              />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Começo da próxima seção, para a prévia ler como página de verdade
          (só quando painel e prévia ficam lado a lado e sobra altura) */}
      <div
        aria-hidden
        className="hidden border-t px-[6cqi] pt-[4.5cqi] pb-[5.5cqi] transition-colors duration-500 @[38rem]/acf:block"
        style={{ borderColor: tema.line }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            className="font-mono text-[8.5px] tracking-[0.18em] uppercase transition-colors duration-500"
            style={{ color: tema.muted }}
          >
            O que fazemos
          </p>
          <span className="text-[9px]" style={{ color: tema.muted }}>
            ↓
          </span>
        </div>
        <div className="mt-[3.5cqi] grid grid-cols-3 gap-[2.5cqi]">
          {SERVICOS.map((s, i) => (
            <div
              key={s}
              className="rounded-md border px-[3cqi] py-[3cqi] transition-colors duration-500"
              style={{ borderColor: tema.line }}
            >
              <span
                className="font-mono text-[8px] transition-colors duration-500"
                style={{ color: tema.art }}
              >
                0{i + 1}
              </span>
              <p className="mt-[4cqi] truncate text-[10.5px] font-medium">{s}</p>
              <p
                className="mt-0.5 truncate text-[8.5px] transition-colors duration-500"
                style={{ color: tema.muted }}
              >
                Saiba mais →
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Aviso de publicação */}
      <AnimatePresence>
        {pub === "publicado" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0b0b0c] px-3 py-1.5 font-mono text-[10px] whitespace-nowrap text-[#f2f2f0] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.6)] ring-1 ring-white/10"
          >
            <Check aria-hidden className="size-3 text-emerald-400" />
            Publicado · já está no ar
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Painel do WordPress ---------- */

const MENU = [
  { label: "Painel", icon: LayoutDashboard },
  { label: "Posts", icon: Pin },
  { label: "Mídia", icon: ImageIcon },
  { label: "Páginas", icon: FileText, ativo: true },
  { label: "Campos (ACF)", icon: SquareStack },
  { label: "Configurações", icon: Settings },
]

/** `curto`: o tipo quando a coluna estreita, para o nome não ser cortado. */
const OUTROS_GRUPOS = [
  { nome: "Seções da página", tipo: "Conteúdo flexível · 4", curto: "Flexível · 4" },
  { nome: "Perguntas frequentes", tipo: "Repetidor · 6", curto: "Repetidor · 6" },
]

const inputBase =
  "h-10 w-full rounded-md border bg-[#0a0a0c] px-3 text-base text-foreground transition-[border-color,box-shadow] duration-300 outline-none placeholder:text-white/25 focus:border-red-light/70 focus:ring-3 focus:ring-red-light/15 lg:h-9 lg:text-[13px]"

function Contador({ n, max }: { n: number; max: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-mono text-[10px] tabular-nums",
        n >= max ? "text-red-light" : "text-muted-foreground/80",
      )}
    >
      {n}/{max}
    </span>
  )
}

export function AcfDemo({ active }: { active: boolean }) {
  const uid = useId()
  const reduce = useReducedMotion()
  const [campos, setCampos] = useState<Campos>(INICIAL)
  const camposRef = useRef(campos)
  const [salvo, setSalvo] = useState(true)
  const [pub, setPub] = useState<Publicacao>("idle")
  const [ghost, setGhost] = useState<Alvo | null>(null)
  const [tocado, setTocado] = useState(false)
  const [foco, setFoco] = useState<keyof Campos | null>(null)
  const [sync, setSync] = useState(0)
  const salvarId = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pubId = useRef<ReturnType<typeof setTimeout>>(undefined)
  const cena = useRef(0)

  // Toda edição salva sozinha (como o rascunho automático do WordPress)
  const update = useCallback((patch: Partial<Campos>) => {
    const next = { ...camposRef.current, ...patch }
    camposRef.current = next
    setCampos(next)
    setSalvo(false)
    setSync((n) => n + 1)
    clearTimeout(salvarId.current)
    salvarId.current = setTimeout(() => setSalvo(true), 850)
  }, [])

  const publicar = useCallback(() => {
    clearTimeout(pubId.current)
    setPub("publicando")
    pubId.current = setTimeout(() => {
      clearTimeout(salvarId.current)
      setSalvo(true)
      setPub("publicado")
      pubId.current = setTimeout(() => setPub("idle"), 2400)
    }, 750)
  }, [])

  useEffect(
    () => () => {
      clearTimeout(salvarId.current)
      clearTimeout(pubId.current)
    },
    [],
  )

  // Demonstração automática: só com o tile na tela e até a pessoa assumir
  useEffect(() => {
    if (!active || tocado || reduce) return
    const t = timer()
    let cancelled = false

    const digitar = async (campo: "titulo" | "botao", texto: string) => {
      setGhost(campo)
      await t.wait(380)
      // Apaga palavra por palavra (Ctrl+Backspace), depois digita
      let atual = camposRef.current[campo]
      while (atual && !cancelled) {
        atual = atual.replace(/\s*\S+\s*$/, "")
        update({ [campo]: atual })
        await t.wait(70)
      }
      for (let i = 1; i <= texto.length && !cancelled; i++) {
        update({ [campo]: texto.slice(0, i) })
        await t.wait(38 + Math.random() * 60)
      }
    }

    ;(async () => {
      await t.wait(1500)
      while (!cancelled) {
        const alvo = ROTEIRO[cena.current % ROTEIRO.length]
        await digitar("titulo", alvo.titulo)
        await t.wait(450)
        if (cancelled) return
        await digitar("botao", alvo.botao)
        await t.wait(450)
        if (cancelled) return
        setGhost("estilo")
        await t.wait(550)
        if (cancelled) return
        update({ estilo: alvo.estilo })
        await t.wait(750)
        if (cancelled) return
        setGhost("imagem")
        await t.wait(550)
        if (cancelled) return
        update({ imagem: alvo.imagem })
        await t.wait(750)
        if (cancelled) return
        setGhost("publicar")
        await t.wait(600)
        if (cancelled) return
        publicar()
        await t.wait(1100)
        if (cancelled) return
        setGhost(null)
        cena.current++
        await t.wait(3400)
      }
    })()

    return () => {
      cancelled = true
      t.clear()
    }
  }, [active, tocado, reduce, update, publicar])

  // A pessoa clicou ou focou algo: a demonstração para e o painel é dela
  const assumir = () => {
    if (!tocado) setTocado(true)
  }

  const restaurar = () => {
    update(INICIAL)
  }

  // Destaque do "cursor fantasma" só enquanto a demonstração roda
  const g = active && !tocado && !reduce ? ghost : null
  const marcado = foco ?? (g && g !== "publicar" ? g : null)
  const focar = (campo: keyof Campos) => ({
    onFocus: () => setFoco(campo),
    onBlur: () => setFoco(null),
  })
  const ghostRing = "border-red-light/70 ring-3 ring-red-light/15"

  const status =
    pub === "publicando"
      ? "Publicando…"
      : pub === "publicado"
        ? "Publicado"
        : salvo
          ? "Salvo"
          : "Salvando…"

  return (
    <div
      role="group"
      aria-label="Editor do WordPress com campos ACF e prévia do site ao vivo"
      onPointerDownCapture={assumir}
      onFocusCapture={assumir}
      className="flex h-full flex-col"
    >
      <PlaygroundBar
        icon={<MousePointerClick />}
        hint="Edite os campos como no painel do WordPress: o site muda na hora."
        end={
          tocado ? (
            <button
              type="button"
              onClick={restaurar}
              className="text-muted-foreground hover:text-foreground flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 font-mono text-[10.5px] tracking-[0.12em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-red-light/60"
            >
              <RotateCcw aria-hidden className="size-3" />
              <span className="sr-only sm:not-sr-only">Restaurar</span>
            </button>
          ) : null
        }
      />
      {/* Muito larga (empilhado, 1024–1279 px), a prévia passaria da
          altura do painel com títulos de 3 linhas e o painel cresceria no
          meio da demonstração: acima de 64rem ela fica em 32rem */}
      <div className="@container/acf min-h-0 flex-1 p-4 sm:p-5">
      <div className="grid h-full gap-4 @[38rem]:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] @[38rem]:gap-5 @[64rem]:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        {/* ---------- Painel ---------- */}
        <div className="relative z-10 flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#111114] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]">
          {/* Barra do admin */}
          <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-white/[0.06] bg-[#0b0b0d] px-3 text-[11px] lg:h-8">
            <WpLogo className="size-3.5 text-white/70" />
            <span className="text-foreground/80 truncate">Seu Site</span>
            <span className="text-muted-foreground ml-auto flex shrink-0 items-center gap-1.5 text-[11px]">
              Olá, editor
              <span
                aria-hidden
                className="flex size-4 items-center justify-center rounded-full bg-white/10 text-[8px] font-semibold text-white/70"
              >
                E
              </span>
            </span>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Menu lateral do WP */}
            <nav
              aria-label="Menu do painel (ilustrativo)"
              className="hidden w-11 shrink-0 flex-col items-center gap-1 border-r border-white/[0.06] bg-[#0d0d10] py-2.5 @md:flex"
            >
              {MENU.map(({ label, icon: Icon, ativo }) => (
                <span
                  key={label}
                  title={label}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-md",
                    ativo ? "text-foreground bg-white/[0.07]" : "text-white/35",
                  )}
                >
                  {ativo && (
                    <span className="bg-red-primary absolute top-1.5 -left-1.5 h-5 w-0.5 rounded-full" />
                  )}
                  <Icon aria-hidden className="size-4" />
                  <span className="sr-only">{label}</span>
                </span>
              ))}
            </nav>

            <div className="min-w-0 flex-1 p-3.5">
              {/* Cabeçalho da edição, em duas linhas: caminho e status em cima,
                  título e botão embaixo. O status tem a largura de "Salvando…"
                  reservada, então trocar de "Salvo" para "Salvando…" não
                  empurra nada e o caminho nunca é cortado */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <p className="text-muted-foreground/80 col-start-1 row-start-1 font-mono text-[10px] tracking-[0.1em] whitespace-nowrap uppercase">
                  Páginas / Início
                </p>
                <span
                  aria-live={tocado ? "polite" : "off"}
                  className={cn(
                    "text-muted-foreground col-start-2 row-start-1 grid justify-items-end font-mono text-[10px] tracking-[0.1em] uppercase transition-opacity duration-300",
                    // Publicando/publicado: o botão já mostra; o texto some da
                    // tela mas continua para leitor de tela
                    pub !== "idle" && "opacity-0",
                  )}
                >
                  {/* Medida da versão mais longa: reserva o espaço */}
                  <span
                    aria-hidden
                    className="invisible col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className="size-3" />
                    Salvando…
                  </span>
                  <span className="col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap">
                    {salvo && pub !== "publicando" ? (
                      <Check aria-hidden className="size-3 text-emerald-400" />
                    ) : (
                      <LoaderCircle aria-hidden className="size-3 animate-spin" />
                    )}
                    {status}
                  </span>
                </span>
                <p className="text-foreground col-start-1 row-start-2 truncate text-[13px] font-medium">
                  Editar página
                </p>
                <button
                  type="button"
                  onClick={publicar}
                  disabled={pub === "publicando"}
                  className={cn(
                    "bg-red-primary hover:bg-red-light col-start-2 row-start-2 flex h-10 min-w-[6.25rem] items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium text-white transition-[background-color,transform,box-shadow] duration-300 outline-none focus-visible:ring-3 focus-visible:ring-red-light/40 disabled:opacity-80 lg:h-8",
                    g === "publicar" && "ring-red-light/40 scale-[0.96] ring-3",
                  )}
                >
                  {pub === "publicando" ? (
                    <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
                  ) : pub === "publicado" ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : null}
                  {pub === "publicado" ? "Publicado" : "Publicar"}
                </button>
              </div>

              {/* Grupo de campos ACF */}
              <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0d0d10]">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
                  <span className="text-foreground flex items-center gap-2 text-[12px] font-medium">
                    <SquareStack aria-hidden className="text-red-light size-3.5" />
                    Hero
                  </span>
                  <span className="text-muted-foreground/80 truncate font-mono text-[10px]">
                    ACF · group_hero
                  </span>
                </div>

                <div className="space-y-3.5 p-3">
                  {/* Título */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <label
                        htmlFor={`${uid}-titulo`}
                        className="text-foreground/90 text-[12px] font-medium"
                      >
                        Título do banner <span className="text-red-light">*</span>
                      </label>
                      <Contador n={campos.titulo.length} max={LIMITE.titulo} />
                    </div>
                    <input
                      id={`${uid}-titulo`}
                      type="text"
                      value={campos.titulo}
                      maxLength={LIMITE.titulo}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => update({ titulo: e.target.value })}
                      {...focar("titulo")}
                      className={cn(inputBase, "border-white/10", g === "titulo" && ghostRing)}
                    />
                  </div>

                  {/* Botão */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <label
                        htmlFor={`${uid}-botao`}
                        className="text-foreground/90 text-[12px] font-medium"
                      >
                        Texto do botão
                      </label>
                      <Contador n={campos.botao.length} max={LIMITE.botao} />
                    </div>
                    <input
                      id={`${uid}-botao`}
                      type="text"
                      value={campos.botao}
                      maxLength={LIMITE.botao}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Sem botão"
                      onChange={(e) => update({ botao: e.target.value })}
                      {...focar("botao")}
                      className={cn(inputBase, "border-white/10", g === "botao" && ghostRing)}
                    />
                  </div>

                  {/* Estilo */}
                  <fieldset {...focar("estilo")}>
                    <legend className="text-foreground/90 text-[12px] font-medium">
                      Estilo do banner
                    </legend>
                    <div
                      className={cn(
                        "mt-1.5 grid grid-cols-3 gap-1.5 rounded-lg transition-shadow duration-300",
                        g === "estilo" && "ring-red-light/25 ring-3",
                      )}
                    >
                      {ESTILOS.map((o) => (
                        <label
                          key={o.value}
                          className="has-checked:border-red-light/60 has-checked:text-foreground text-muted-foreground has-focus-visible:ring-red-light/50 flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-[#0a0a0c] px-2 text-[12px] transition-colors duration-300 hover:border-white/25 has-checked:bg-white/[0.05] has-focus-visible:ring-2 max-[380px]:gap-1.5 lg:h-9"
                        >
                          <input
                            type="radio"
                            name={`${uid}-estilo`}
                            value={o.value}
                            checked={campos.estilo === o.value}
                            onChange={() => update({ estilo: o.value })}
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className="size-3 shrink-0 rounded-full ring-1 ring-white/25"
                            style={{ background: o.swatch }}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Imagem */}
                  <fieldset {...focar("imagem")} className="@container/img">
                    <legend className="text-foreground/90 text-[12px] font-medium">
                      Imagem de fundo
                    </legend>
                    <div
                      className={cn(
                        // Painel estreito (celular e o desktop lado a lado):
                        // "Nenhuma" não cabe folgado num terço, então a coluna
                        // dela segue o conteúdo e as outras dividem o resto
                        "mt-1.5 grid grid-cols-3 gap-1.5 rounded-full transition-shadow duration-300 @max-[17.5rem]/img:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
                        g === "imagem" && "ring-red-light/25 ring-3",
                      )}
                    >
                      {IMAGENS.map((o) => (
                        <label
                          key={o.value}
                          className="has-checked:border-foreground/70 has-checked:bg-foreground has-checked:text-background text-muted-foreground has-focus-visible:ring-red-light/50 flex h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/10 px-2 text-[12px] transition-colors duration-300 hover:border-white/25 has-focus-visible:ring-2 max-[380px]:gap-1 max-[380px]:px-1.5 lg:h-8"
                        >
                          <input
                            type="radio"
                            name={`${uid}-imagem`}
                            value={o.value}
                            checked={campos.imagem === o.value}
                            onChange={() => update({ imagem: o.value })}
                            className="sr-only"
                          />
                          <MiniArte tipo={o.value} />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>

              {/* Outros grupos, recolhidos: o modelo de conteúdo vai além do hero */}
              <ul className="@container/grupos mt-2 hidden space-y-1.5 @[38rem]/acf:block [@media(max-height:779px)]:hidden!">
                {OUTROS_GRUPOS.map((grupo) => (
                  <li
                    key={grupo.nome}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0d0d10] px-3 py-2"
                  >
                    <span className="text-foreground/65 flex min-w-0 items-center gap-2 text-[12px]">
                      <ChevronRight aria-hidden className="text-muted-foreground/80 size-3.5 shrink-0" />
                      <span className="truncate">{grupo.nome}</span>
                    </span>
                    <span className="text-muted-foreground/80 shrink-0 font-mono text-[10px]">
                      <span className="hidden @[20rem]/grupos:inline">{grupo.tipo}</span>
                      <span className="@[20rem]/grupos:hidden">{grupo.curto}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ---------- Prévia ----------
            Empilhada, a altura vem da largura e não do texto: cabe o título
            mais longo do roteiro (3 linhas), então digitar não muda a altura
            do tile. A mesma conta está no placeholder (capabilities-lazy) */}
        <div className="relative order-first h-[max(250px,calc(6rem+56cqw))] @[38rem]/acf:order-none @[38rem]/acf:h-auto">
          <Previa campos={campos} pub={pub} sync={sync} marcado={marcado} />
          {/* Conexão painel → site: um pulso a cada edição */}
          <span
            aria-hidden
            className="absolute -bottom-4 left-1/2 h-4 w-px bg-white/10 @[38rem]/acf:top-1/2 @[38rem]/acf:bottom-auto @[38rem]/acf:-left-5 @[38rem]/acf:h-px @[38rem]/acf:w-5"
          >
            {sync > 0 && !reduce && (
              <motion.span
                key={sync}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-red-light absolute inset-0 shadow-[0_0_8px_#ff343b]"
              />
            )}
          </span>
        </div>
      </div>
      </div>
    </div>
  )
}

/** Miniatura de cada opção de imagem (para o chip). */
function MiniArte({ tipo }: { tipo: Imagem }) {
  if (tipo === "nenhuma")
    return (
      <span aria-hidden className="size-3 shrink-0 rounded-full border border-current opacity-60" />
    )
  if (tipo === "grade")
    return (
      <span aria-hidden className="grid size-3 shrink-0 grid-cols-2 gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="rounded-[1px] bg-current opacity-70" />
        ))}
      </span>
    )
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0">
      <path d="M12 12a10 10 0 0 0-10-10" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 12a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  )
}
