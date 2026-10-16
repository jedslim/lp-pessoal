"use client"

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"
import { useInView } from "motion/react"
import {
  ArrowBigUp,
  ArrowBigUpDash,
  ArrowRightToLine,
  CornerDownLeft,
  Delete,
} from "lucide-react"
import { StackKnob } from "@/components/stack-knob"
import { JMark, StackOled, ToolMark, type Screen } from "@/components/stack-oled"
import { playKey } from "@/components/stack-sound"
import {
  ESC_KEY,
  FULL_WIDTH_U,
  INITIALS,
  KEY_LABEL,
  KEY_ORDER,
  KEYS,
  ROW_ORDER,
  catKeyId,
  matchTools,
  toolKeyId,
  type FnId,
  type KeyDef,
} from "@/components/stack-keys"
import { stack, stackCategories, type StackCategory } from "@/lib/stack"
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe"
import { cn } from "@/lib/utils"
import s from "./stack-keyboard.module.css"

/** Tempo de cada ferramenta na vitrine (antes de alguém tocar no teclado). */
const AUTO_MS = 2600
/** Duração do "boot" do visor depois que o teclado pousa. */
const BOOT_MS = 2700
/** Janela para emendar letras numa busca ("n" + "o" = "no" → Node.js). */
const TYPE_WINDOW = 1200

type Mode =
  | { kind: "boot" }
  | { kind: "idle" }
  | { kind: "tool"; n: number }
  | { kind: "query"; q: string; hits: number[]; pick: number }
  | { kind: "empty"; q: string }
  | { kind: "cat"; cat: StackCategory }
  | { kind: "fn"; fn: "back" | "space" | "artisan" }

const byN = (n: number) => stack.find((t) => t.n === n) ?? stack[0]
const familyOf = (cat: StackCategory) => KEY_ORDER.filter((t) => t.category === cat)

/* Todas as teclas na ordem do DOM (Esc primeiro, depois as fileiras) */
const ALL_KEYS: KeyDef[] = [ESC_KEY, ...KEYS]

/** Telas das teclas de função: ao apertar (back sem busca, espaço, artesanal) e ao passar o mouse. */
const FN_TEXT: Record<"back" | "space" | "artisan", { meta: string; title: string; text: string }> = {
  back: {
    meta: "Apagar",
    title: "Nada para apagar",
    text: "Digite uma letra no seu teclado; esta tecla apaga a última.",
  },
  space: {
    meta: "Dica",
    title: "Digite uma letra",
    text: "No seu teclado: N acende Next.js, Node.js e n8n. W, WordPress e WhatsApp.",
  },
  artisan: {
    meta: "Tecla artesanal",
    title: "JEDTEC",
    text: "O J da marca. Aperte e o teclado inteiro acende.",
  },
}

/** O que cada tecla de função faz, no visor, enquanto o mouse está em cima dela. */
const FN_PEEK: Record<FnId, { meta: string; title: string; text: string }> = {
  esc: { meta: "Esc", title: "Limpar", text: "Apaga a busca e as luzes. Vale o Esc do seu teclado." },
  back: { meta: "Backspace", title: "Apagar", text: "Apaga a última letra que você digitou." },
  enter: { meta: "Enter", title: "Próxima", text: "Passa para a próxima ferramenta. Vale o Enter do seu teclado." },
  shift: { meta: "Shift", title: "Fileira", text: "Acende a fileira seguinte: front-end, integrações, CMS e IA." },
  space: FN_TEXT.space,
  artisan: FN_TEXT.artisan,
}

function screenOf(mode: Mode, fine: boolean): Screen {
  switch (mode.kind) {
    case "boot":
      return { kind: "boot" }
    case "idle":
      return {
        kind: "hint",
        title: "Sua vez",
        text: fine
          ? "Passe o mouse numa tecla ou digite uma letra no seu teclado."
          : "Toque numa tecla para ver para que eu uso cada ferramenta.",
      }
    case "tool": {
      const t = byN(mode.n)
      const fam = familyOf(t.category)
      return {
        kind: "tool",
        tool: t,
        meta: `${stackCategories[t.category].label} · ${fam.indexOf(t) + 1} de ${fam.length}`,
      }
    }
    case "query": {
      const Q = mode.q.toUpperCase()
      if (mode.pick >= 0) {
        const t = byN(mode.hits[mode.pick])
        return {
          kind: "tool",
          tool: t,
          accent: `“${Q}”`,
          meta: mode.hits.length > 1 ? `· ${mode.pick + 1} de ${mode.hits.length}` : "· 1 ferramenta",
        }
      }
      return {
        kind: "list",
        meta: "Começa com",
        title: mode.q,
        typed: true,
        count: `${mode.hits.length} teclas acesas`,
        items: mode.hits.map((n) => byN(n).name),
      }
    }
    case "empty": {
      const Q = mode.q.toUpperCase()
      return {
        kind: "empty",
        meta: "Começa com",
        title: `Nada com ${Q}`,
        text: `Experimente ${INITIALS.slice(0, -1)
          .map((c) => c.toUpperCase())
          .join(", ")} ou ${INITIALS.at(-1)?.toUpperCase()}.`,
      }
    }
    case "cat": {
      const fam = familyOf(mode.cat)
      return {
        kind: "list",
        meta: "Fileira",
        title: stackCategories[mode.cat].label,
        count: `${fam.length} teclas acesas`,
        items: fam.map((t) => t.name),
      }
    }
    case "fn":
      return { kind: "fn", ...FN_TEXT[mode.fn] }
  }
}

/** O que acende, o que fica afundado e se o resto apaga. */
function lightsOf(mode: Mode) {
  switch (mode.kind) {
    case "tool":
      return { lit: [toolKeyId(byN(mode.n))], sel: toolKeyId(byN(mode.n)), dim: false }
    case "query": {
      const ids = mode.hits.map((n) => toolKeyId(byN(n)))
      return { lit: ids, sel: mode.pick >= 0 ? ids[mode.pick] : null, dim: true }
    }
    case "empty":
      return { lit: [], sel: null, dim: true }
    case "cat":
      return {
        lit: [catKeyId(mode.cat), ...familyOf(mode.cat).map(toolKeyId)],
        sel: catKeyId(mode.cat),
        dim: true,
      }
    case "fn":
      return { lit: mode.fn === "artisan" ? [`f-${mode.fn}`] : [], sel: `f-${mode.fn}`, dim: false }
    default:
      return { lit: [], sel: null, dim: false }
  }
}

function announceOf(mode: Mode) {
  const sc = screenOf(mode, true)
  if (sc.kind === "tool") return `${sc.tool.name}, ${stackCategories[sc.tool.category].label}. ${sc.tool.use}`
  if (sc.kind === "list")
    return sc.typed
      ? `${sc.count} com ${sc.title.toUpperCase()}: ${sc.items.join(", ")}.`
      : `${sc.title}, ${sc.count}: ${sc.items.join(", ")}.`
  if (sc.kind === "empty" || sc.kind === "fn") return `${sc.title}. ${sc.text}`
  if (sc.kind === "hint") return sc.text
  return ""
}

const FINE_QUERY = "(pointer: fine)"
const subscribeFine = (cb: () => void) => {
  const mq = matchMedia(FINE_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useFinePointer = () =>
  useSyncExternalStore(subscribeFine, () => matchMedia(FINE_QUERY).matches, () => false)

/** Timbre de cada tecla: da esquerda (grave) para a direita (agudo). */
const toneOf = (k: KeyDef) => k.x / FULL_WIDTH_U

const isTyping = (el: Element | null) =>
  !!el?.closest(
    "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog'], [aria-modal='true']",
  )

export function StackKeyboard() {
  const reduce = useReducedMotionSafe()
  const fine = useFinePointer()
  const stageRef = useRef<HTMLDivElement>(null)
  const caseRef = useRef<HTMLDivElement>(null)
  const keyRefs = useRef(new Map<string, HTMLButtonElement>())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const lastType = useRef(0)
  const autoIdx = useRef(-1)

  const entered = useInView(stageRef, { once: true, margin: "0px 0px -20% 0px" })
  const onScreen = useInView(stageRef, { amount: 0.3 })

  const [mode, setMode] = useState<Mode>({ kind: "boot" })
  const [auto, setAuto] = useState(true)
  const [booted, setBooted] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const [wave, setWave] = useState<"a" | "b" | null>(null)
  const [focusId, setFocusId] = useState(toolKeyId(KEY_ORDER[0]))
  const [said, setSaid] = useState("")
  const [volume, setVolume] = useState<{ value: number; at: number } | null>(null)
  // Mouse sobre uma tecla de função: o visor explica sem mexer no que está aceso
  const [peek, setPeek] = useState<FnId | null>(null)

  const { lit, sel, dim } = lightsOf(mode)
  const litSet = new Set(lit)
  // O visor só liga quando o teclado pousa: o boot "digita" na frente de quem vê
  const screen: Screen = volume
    ? { kind: "volume", value: volume.value }
    : peek
      ? { kind: "fn", ...FN_PEEK[peek] }
      : entered
        ? screenOf(mode, fine)
        : { kind: "off" }
  const toolLit = lit.filter((id) => id.startsWith("t")).length

  /* ---------- Entrada, boot e vitrine ---------- */

  useEffect(() => {
    if (!entered) return
    const boot = setTimeout(
      () => {
        setBooted(true)
        setMode((m) => (m.kind === "boot" ? { kind: "tool", n: KEY_ORDER[0].n } : m))
        autoIdx.current = 0
      },
      reduce ? 0 : BOOT_MS,
    )
    const intro = setTimeout(() => setIntroDone(true), reduce ? 0 : 2800)
    return () => {
      clearTimeout(boot)
      clearTimeout(intro)
    }
  }, [entered, reduce])

  /** Afunda as teclas por um instante (direto no DOM, sem re-render). */
  const press = useCallback((ids: string[], opts: { sound?: boolean; stagger?: number } = {}) => {
    const { sound = true, stagger = 0 } = opts
    ids.forEach((id, i) => {
      const el = keyRefs.current.get(id)
      if (!el) return
      const down = () => {
        el.dataset.down = "true"
        clearTimeout(timers.current.get(id))
        timers.current.set(
          id,
          setTimeout(() => delete el.dataset.down, 150),
        )
      }
      if (stagger && i) setTimeout(down, i * stagger)
      else down()
    })
    if (sound && ids[0]) {
      const k = ALL_KEYS.find((d) => d.id === ids[0])
      playKey(k ? toneOf(k) : 0.5)
    }
  }, [])

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const playing = auto && booted && onScreen && !reduce
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      autoIdx.current = (autoIdx.current + 1) % KEY_ORDER.length
      const t = KEY_ORDER[autoIdx.current]
      setMode({ kind: "tool", n: t.n })
      press([toolKeyId(t)], { sound: false })
    }, AUTO_MS)
    return () => clearInterval(id)
  }, [playing, press])

  // O aviso de volume some sozinho
  useEffect(() => {
    if (!volume) return
    const id = setTimeout(() => setVolume(null), 1500)
    return () => clearTimeout(id)
  }, [volume])

  /* ---------- Inclinação com o mouse (desktop) ---------- */

  useEffect(() => {
    const stage = stageRef.current
    const box = caseRef.current
    if (!stage || !box || reduce) return
    const mq = matchMedia("(min-width: 1024px) and (pointer: fine)")
    let tx = 0
    let ty = 0
    let gx = 0
    let gy = 0
    let raf = 0
    const tick = () => {
      tx += (gx - tx) * 0.08
      ty += (gy - ty) * 0.08
      box.style.setProperty("--tx", `${tx.toFixed(3)}deg`)
      box.style.setProperty("--ty", `${ty.toFixed(3)}deg`)
      raf = Math.abs(gx - tx) + Math.abs(gy - ty) > 0.005 ? requestAnimationFrame(tick) : 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !mq.matches) return
      const r = stage.getBoundingClientRect()
      gy = ((e.clientX - r.left) / r.width - 0.5) * 4
      gx = -((e.clientY - r.top) / r.height - 0.5) * 3
      kick()
    }
    const onLeave = () => {
      gx = 0
      gy = 0
      kick()
    }
    stage.addEventListener("pointermove", onMove)
    stage.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(raf)
      stage.removeEventListener("pointermove", onMove)
      stage.removeEventListener("pointerleave", onLeave)
      box.style.removeProperty("--tx")
      box.style.removeProperty("--ty")
    }
  }, [reduce])

  /* ---------- Ações ---------- */

  const engage = () => {
    if (auto) setAuto(false)
    if (!booted) setBooted(true)
  }

  const act = (next: Mode, opts: { announce?: boolean } = {}) => {
    engage()
    setVolume(null)
    setMode(next)
    if (opts.announce) setSaid(announceOf(next))
  }

  const current = () => {
    if (mode.kind === "tool") return byN(mode.n)
    if (mode.kind === "query" && mode.pick >= 0) return byN(mode.hits[mode.pick])
    return null
  }

  const nextTool = (announce = true) => {
    if (mode.kind === "query" && mode.hits.length > 1) {
      act({ ...mode, pick: (mode.pick + 1) % mode.hits.length }, { announce })
      return
    }
    const cur = current()
    const i = cur ? KEY_ORDER.indexOf(cur) : -1
    const t = KEY_ORDER[(i + 1) % KEY_ORDER.length]
    act({ kind: "tool", n: t.n }, { announce })
    press([toolKeyId(t)], { sound: false })
  }

  const nextRow = () => {
    const from =
      mode.kind === "cat" ? mode.cat : (current()?.category ?? ROW_ORDER[ROW_ORDER.length - 1])
    const cat = ROW_ORDER[(ROW_ORDER.indexOf(from) + 1) % ROW_ORDER.length]
    act({ kind: "cat", cat }, { announce: true })
    press(familyOf(cat).map(toolKeyId), { sound: false, stagger: 35 })
  }

  const backspace = () => {
    if (mode.kind !== "query" && mode.kind !== "empty") {
      act({ kind: "fn", fn: "back" }, { announce: true })
      return
    }
    const q = mode.q.slice(0, -1)
    if (!q) {
      act({ kind: "idle" }, { announce: true })
      return
    }
    const hits = matchTools(q)
    act(
      hits.length
        ? { kind: "query", q, hits: hits.map((t) => t.n), pick: hits.length === 1 ? 0 : -1 }
        : { kind: "empty", q },
      { announce: true },
    )
  }

  const typeLetter = (ch: string) => {
    const now = performance.now()
    const prev = mode.kind === "query" || mode.kind === "empty" ? mode.q : ""
    let q = now - lastType.current < TYPE_WINDOW ? prev + ch : ch
    let hits = matchTools(q)
    if (!hits.length && q.length > 1) {
      q = ch
      hits = matchTools(q)
    }
    lastType.current = now
    if (!hits.length) {
      act({ kind: "empty", q }, { announce: true })
      playKey(0.5, 0.7)
      return
    }
    act(
      { kind: "query", q, hits: hits.map((t) => t.n), pick: hits.length === 1 ? 0 : -1 },
      { announce: true },
    )
    press(hits.map(toolKeyId))
  }

  /** Luz em onda, a partir da tecla artesanal. */
  const lightWave = () => {
    const origin = keyRefs.current.get("f-artisan")?.getBoundingClientRect()
    if (!origin) return
    const ox = origin.left + origin.width / 2
    const oy = origin.top + origin.height / 2
    const dists: { k: KeyDef; d: number }[] = []
    keyRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect()
      const d = Math.hypot(r.left + r.width / 2 - ox, r.top + r.height / 2 - oy)
      el.style.setProperty("--wd", `${Math.round(d / 1.5)}ms`)
      const k = ALL_KEYS.find((x) => x.id === id)
      if (k) dists.push({ k, d })
    })
    setWave((w) => (w === "a" ? "b" : "a"))
    // Com som: uma "chuva" de teclas acompanhando a onda
    dists
      .sort((a, b) => a.d - b.d)
      .filter((_, i) => i % 3 === 0)
      .forEach(({ k, d }) => playKey(toneOf(k), 0.35, d / 1500))
  }

  const run = (k: KeyDef) => {
    setPeek(null)
    if (k.kind === "tool") {
      act({ kind: "tool", n: k.tool.n }, { announce: true })
      press([k.id])
      return
    }
    if (k.kind === "cat") {
      act({ kind: "cat", cat: k.cat }, { announce: true })
      press([k.id])
      press(familyOf(k.cat).map(toolKeyId), { sound: false, stagger: 35 })
      return
    }
    press([k.id])
    switch (k.fn) {
      case "esc":
        act({ kind: "idle" }, { announce: true })
        break
      case "back":
        backspace()
        break
      case "enter":
        nextTool()
        break
      case "shift":
        nextRow()
        break
      case "space":
        act({ kind: "fn", fn: "space" }, { announce: true })
        break
      case "artisan":
        act({ kind: "fn", fn: "artisan" }, { announce: true })
        lightWave()
        break
    }
  }

  const hover = (k: KeyDef | null) => {
    if (!k) {
      setPeek(null)
      return
    }
    if (k.kind === "fn") {
      engage()
      setPeek(k.fn)
      return
    }
    setPeek(null)
    if (k.kind === "tool") act({ kind: "tool", n: k.tool.n })
    else act({ kind: "cat", cat: k.cat })
  }

  /* ---------- Teclado físico: só com a seção na tela ---------- */

  const onPhysicalKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
    const active = document.activeElement
    if (isTyping(active)) return
    const inBoard = !!active && !!stageRef.current?.contains(active)
    // A seção focada pelo menu/âncora (tabindex -1) também conta como "nada"
    const onBody =
      !active ||
      active === document.body ||
      active === document.documentElement ||
      active.matches("section[tabindex='-1']")
    const key = e.key

    if (key === "Escape") {
      if (mode.kind === "idle" || mode.kind === "boot") return
      run(ESC_KEY)
      return
    }
    if (/^[a-z0-9]$/i.test(key)) {
      if (e.repeat) return
      typeLetter(key.toLowerCase())
      return
    }
    // Enter e Backspace: só quando ninguém mais está com o foco (no botão
    // focado, o Enter já é o clique dele)
    if (key === "Backspace" && (onBody || inBoard)) {
      e.preventDefault()
      run(KEYS.find((k) => k.id === "f-back")!)
      return
    }
    if (key === "Enter" && onBody) {
      run(KEYS.find((k) => k.id === "f-enter")!)
    }
  })

  useEffect(() => {
    if (!onScreen) return
    const handler = (e: KeyboardEvent) => onPhysicalKey(e)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onScreen])

  /* ---------- Setas entre as teclas (foco itinerante) ---------- */

  const onGridKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]
    if (!keys.includes(e.key)) return
    const target = e.target as HTMLElement
    if (!target.dataset.keyId) return
    const visible = ALL_KEYS.map((k) => ({ k, el: keyRefs.current.get(k.id) })).filter(
      (x): x is { k: KeyDef; el: HTMLButtonElement } => !!x.el && x.el.offsetParent !== null,
    )
    const i = visible.findIndex((x) => x.k.id === target.dataset.keyId)
    if (i === -1) return
    let next: (typeof visible)[number] | undefined
    if (e.key === "ArrowRight") next = visible[(i + 1) % visible.length]
    else if (e.key === "ArrowLeft") next = visible[(i - 1 + visible.length) % visible.length]
    else if (e.key === "Home") next = visible[0]
    else if (e.key === "End") next = visible[visible.length - 1]
    else {
      const dir = e.key === "ArrowDown" ? 1 : -1
      const from = target.getBoundingClientRect()
      const cx = from.left + from.width / 2
      const cy = from.top + from.height / 2
      const cands = visible
        .map((x) => {
          const r = x.el.getBoundingClientRect()
          const dy = (r.top + r.height / 2 - cy) * dir
          return dy > from.height / 2 ? { x, dy, dx: Math.abs(r.left + r.width / 2 - cx) } : null
        })
        .filter((c) => c !== null)
      if (cands.length) {
        const near = Math.min(...cands.map((c) => c.dy))
        next = cands.filter((c) => c.dy < near + 6).sort((a, b) => a.dx - b.dx)[0].x
      }
    }
    e.preventDefault()
    if (next) {
      setFocusId(next.k.id)
      next.el.focus()
    }
  }

  /* ---------- Render ---------- */

  const register = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) keyRefs.current.set(id, el)
    else keyRefs.current.delete(id)
  }, [])

  const focusKey = (k: KeyDef, visible: boolean) => {
    setFocusId(k.id)
    if (!visible) return
    engage()
    if (k.kind === "tool") act({ kind: "tool", n: k.tool.n }, { announce: true })
    else if (k.kind === "cat") act({ kind: "cat", cat: k.cat }, { announce: true })
  }

  const stateOf = (k: KeyDef) => ({
    lit: litSet.has(k.id),
    sel: sel === k.id,
    dim: dim && !litSet.has(k.id) && k.kind === "tool",
    tabIndex: focusId === k.id ? 0 : -1,
  })

  return (
    <div
      ref={stageRef}
      className={s.stage}
      data-companion="stack"
      data-in={entered}
      data-intro={entered && !introDone ? "run" : undefined}
      data-wave={wave ?? undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && engage()}
    >
      <div
        ref={caseRef}
        className={s.case}
        style={{ "--glow": Math.min(1, toolLit / 6) } as CSSProperties}
      >
        <span aria-hidden className={s.underglow} />
        <div
          role="group"
          aria-label="Teclado do stack: cada tecla é uma ferramenta"
          aria-describedby="stack-kbd-help"
          className={s.grid}
          onKeyDown={onGridKeyDown}
        >
          {/* Fileira do visor: Esc, visor OLED e volume */}
          <div className={s.topbar}>
            <div className={s.escSlot} style={slotVars(ESC_KEY, 0)}>
              <Keycap
                def={ESC_KEY}
                index={0}
                {...stateOf(ESC_KEY)}
                register={register}
                onRun={run}
                onHover={hover}
                onFocusKey={focusKey}
              />
            </div>
            <div className={s.oledSlot} style={{ "--x": 5, "--y": 0, "--i": 0 } as CSSProperties}>
              <StackOled screen={screen} />
            </div>
            <div className={s.knobSlot} style={{ "--x": 10, "--y": 0, "--i": 1 } as CSSProperties}>
              <StackKnob
                onAdjust={(value) => {
                  engage()
                  setVolume({ value, at: performance.now() })
                  setSaid(value > 0 ? `Som das teclas: ${value}%` : "Som das teclas desligado")
                  playKey(0.6, 0.8)
                }}
              />
            </div>
          </div>

          {KEYS.map((k, i) => (
            <Keycap
              key={k.id}
              def={k}
              index={i + 2}
              {...stateOf(k)}
              register={register}
              onRun={run}
              onHover={hover}
              onFocusKey={focusKey}
            />
          ))}
        </div>
        <span aria-hidden className={s.lip} />
      </div>

      <p id="stack-kbd-help" className="sr-only">
        Use as setas para andar entre as teclas. Com a seção na tela, digite uma letra para
        acender as ferramentas que começam com ela; Esc limpa.
      </p>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  )
}

function slotVars(k: KeyDef, i: number) {
  return {
    "--col": k.col,
    "--cs": k.w * 4,
    "--row": k.row,
    "--span": k.span || 1,
    "--x": k.x,
    "--y": k.y,
    "--i": i,
  } as CSSProperties
}

const CAT_GLYPH: Record<StackCategory, ReactNode> = {
  front: <ArrowRightToLine aria-hidden strokeWidth={2} />,
  integracoes: <ArrowBigUpDash aria-hidden strokeWidth={1.8} />,
  cms: <ArrowBigUp aria-hidden strokeWidth={1.8} />,
  ia: "ctrl",
}

const FN_LABEL: Record<FnId, string> = {
  esc: "Esc: limpar",
  back: "Apagar a última letra",
  enter: "Próxima ferramenta",
  shift: "Próxima fileira",
  space: "Dica de uso",
  artisan: "Tecla JEDTEC: acender o teclado",
}

function Keycap({
  def: k,
  index,
  lit,
  sel,
  dim,
  tabIndex,
  register,
  onRun,
  onHover,
  onFocusKey,
}: {
  def: KeyDef
  index: number
  lit: boolean
  sel: boolean
  dim: boolean
  tabIndex: number
  register: (id: string, el: HTMLButtonElement | null) => void
  onRun: (k: KeyDef) => void
  onHover: (k: KeyDef | null) => void
  onFocusKey: (k: KeyDef, visible: boolean) => void
}) {
  const tone =
    k.kind === "tool"
      ? k.red && s.red
      : k.kind === "cat"
        ? s.mod
        : k.fn === "esc" || k.fn === "enter"
          ? s.red
          : k.fn === "artisan"
            ? s.bone
            : s.mod

  const label =
    k.kind === "tool"
      ? `${k.tool.name} (${stackCategories[k.tool.category].label})`
      : k.kind === "cat"
        ? `Fileira ${stackCategories[k.cat].label}, ${familyOf(k.cat).length} ferramentas`
        : FN_LABEL[k.fn]

  const button = (
    <button
      ref={(el) => register(k.id, el)}
      type="button"
      data-key-id={k.id}
      data-lit={lit}
      data-sel={sel || (lit && k.kind === "tool")}
      data-dim={dim}
      aria-label={label}
      aria-current={sel ? "true" : undefined}
      tabIndex={tabIndex}
      className={cn(s.key, tone)}
      onClick={() => onRun(k)}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(k)}
      onPointerLeave={(e) => e.pointerType === "mouse" && k.kind === "fn" && onHover(null)}
      onFocus={(e) => onFocusKey(k, e.currentTarget.matches(":focus-visible"))}
    >
      <span aria-hidden className={s.shadow} />
      <span aria-hidden className={s.led} />
      <span aria-hidden className={s.cap}>
        <span className={s.top} />
        <Legend def={k} />
      </span>
    </button>
  )

  // A Esc já vem dentro do próprio encaixe da fileira do visor
  if (k.kind === "fn" && k.fn === "esc") return button
  return (
    <div
      className={s.slot}
      data-wide={k.kind === "cat" && k.span > 1}
      data-full-only={k.kind === "fn"}
      style={slotVars(k, index)}
    >
      {button}
    </div>
  )
}

function Legend({ def: k }: { def: KeyDef }) {
  if (k.kind === "tool")
    return (
      <span className={s.legend}>
        <ToolMark tool={k.tool} className={s.logo} />
        <span className={s.name}>{KEY_LABEL[k.tool.name] ?? k.tool.name}</span>
      </span>
    )
  if (k.kind === "cat")
    return (
      <span className={s.legend}>
        <span className={s.glyph}>{CAT_GLYPH[k.cat]}</span>
        <span className={s.word}>{stackCategories[k.cat].label}</span>
      </span>
    )
  switch (k.fn) {
    case "esc":
      return (
        <span className={s.legend}>
          <span className={s.glyph}>esc</span>
          <span className={s.word}>limpar</span>
        </span>
      )
    case "back":
      return (
        <span className={s.legend}>
          <span className={s.glyph}>
            <Delete aria-hidden strokeWidth={1.8} />
          </span>
          <span className={s.word}>apagar</span>
        </span>
      )
    case "enter":
      return (
        <span className={s.legend}>
          <span className={s.glyph}>
            <CornerDownLeft aria-hidden strokeWidth={2.2} />
          </span>
          <span className={s.word}>próxima</span>
        </span>
      )
    case "shift":
      return (
        <span className={s.legend}>
          <span className={s.glyph}>
            <ArrowBigUp aria-hidden strokeWidth={1.8} />
          </span>
          <span className={s.word}>fileira</span>
        </span>
      )
    case "space":
      return <span className={cn(s.legend, s.spaceLegend)}>digite uma letra</span>
    case "artisan":
      return (
        <span className={cn(s.legend, s.artisanLegend)}>
          <JMark className={s.artisanJ} />
        </span>
      )
  }
}
