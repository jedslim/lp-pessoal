"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type RefObject,
} from "react"
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import {
  MENU_ID,
  SiteLogo,
  SiteMenu,
  menuRing,
} from "@/components/chrome-menu"
import { goTo, sections, type SectionId } from "@/components/chrome-nav"
import { useScramble } from "@/components/chrome-scramble"
import { ButtonLink } from "@/components/kit/button-link"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

/** Rolagem mínima (px) antes de o header poder sumir. */
const HIDE_AFTER = 140

/** Seção que cruza a faixa logo acima do meio da tela (null na hero). */
function useActiveSection() {
  const [active, setActive] = useState<SectionId | null>(null)
  useEffect(() => {
    const crossing = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id)
          else crossing.delete(entry.target.id)
        }
        setActive(sections.find((s) => crossing.has(s.id))?.id ?? null)
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])
  return active
}

/** Clique na âncora: rola com Lenis e leva o foco junto. */
const onAnchor = (hash: `#${string}`) => (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  goTo(hash)
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [keyboardInside, setKeyboardInside] = useState(false)
  const [hovered, setHovered] = useState<SectionId | null>(null)
  const active = useActiveSection()
  const toggleRef = useRef<HTMLButtonElement>(null)

  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 40,
    restDelta: 0.0005,
  })
  // O vidro entra aos poucos nos primeiros pixels de rolagem
  const glass = useTransform(scrollY, [0, 96], [0, 1])

  // Some ao descer, volta ao subir. Acumula o deslocamento na mesma direção
  // para o fim suave do Lenis (passos de 1px) não fazer o header piscar.
  const travel = useRef(0)
  useMotionValueEvent(scrollY, "change", (y) => {
    const delta = y - (scrollY.getPrevious() ?? y)
    if (y < HIDE_AFTER) {
      travel.current = 0
      setHidden(false)
      return
    }
    if (delta === 0) return
    if (Math.sign(delta) !== Math.sign(travel.current)) travel.current = 0
    travel.current += delta
    if (travel.current > 48) setHidden(true)
    else if (travel.current < -12) setHidden(false)
  })

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false)
    if (restoreFocus)
      requestAnimationFrame(() =>
        toggleRef.current?.focus({ preventScroll: true }),
      )
  }, [])

  // Quem navega por teclado nunca fica com o foco num header escondido
  const onFocus = (e: FocusEvent) =>
    setKeyboardInside((e.target as HTMLElement).matches(":focus-visible"))
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null))
      setKeyboardInside(false)
  }

  const visible = !hidden || menuOpen || keyboardInside

  return (
    <>
      {/* 1º Tab da página: pula o header direto para o trabalho */}
      <a
        href="#trabalho"
        onClick={(e) => {
          e.preventDefault()
          goTo("#trabalho")
        }}
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-5 focus:z-[80] focus:inline-flex focus:h-10 focus:items-center focus:rounded-full focus:border focus:border-white/15 focus:bg-[rgb(11_11_13/0.92)] focus:px-4 focus:text-sm focus:font-medium focus:whitespace-nowrap focus:shadow-[0_12px_40px_-12px_rgb(0_0_0/0.9)] focus:backdrop-blur-xl sm:focus:left-8 lg:focus:left-12",
          menuRing,
        )}
      >
        Pular para o conteúdo
      </a>

      {/* Progresso da leitura: 1px vermelho, sempre visível */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="bg-red-light fixed top-0 left-0 right-[var(--lock-gap,0px)] z-[62] h-px origin-left shadow-[0_0_10px_rgb(255_52_59/0.85)]"
      />

      <motion.header
        onFocus={onFocus}
        onBlur={onBlur}
        initial={false}
        // -120px: some junto a sombra do CTA, que vaza abaixo do header
        animate={{ y: visible ? 0 : -120 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="fixed top-0 left-0 right-[var(--lock-gap,0px)] z-[60]"
      >
        {/* Vidro escuro: legível também sobre a seção clara (Sobre) */}
        <motion.div
          aria-hidden
          style={{ opacity: glass }}
          className="absolute inset-0 border-b border-white/[0.07] bg-[rgb(5_5_6/0.8)] backdrop-blur-xl backdrop-saturate-150"
        />

        <div className="relative mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 xl:grid xl:grid-cols-[1fr_auto_1fr] lg:px-12">
          <div className="justify-self-start">
            <SiteLogo />
          </div>

          <nav aria-label="Principal" className="hidden lg:block">
            <LayoutGroup id="jt-header-nav">
              <ul
                className="flex items-center"
                onPointerLeave={() => setHovered(null)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setHovered(null)
                }}
              >
                {sections.map((s) => (
                  <li key={s.id}>
                    <NavLink
                      id={s.id}
                      label={s.label}
                      active={active === s.id}
                      hovered={hovered === s.id}
                      onHover={() => setHovered(s.id)}
                    />
                  </li>
                ))}
              </ul>
            </LayoutGroup>
          </nav>

          <div className="flex items-center justify-end gap-2 justify-self-end sm:gap-3">
            {/* Entre lg e xl o nav ocupa o meio: o CTA fica dentro do menu */}
            <ButtonLink
              href={site.whatsapp}
              icon="whatsapp"
              className="hidden h-10 text-[13px] md:inline-flex lg:hidden xl:inline-flex"
            >
              Falar comigo
            </ButtonLink>
            <MenuButton
              buttonRef={toggleRef}
              open={menuOpen}
              onOpen={() => setMenuOpen(true)}
            />
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <SiteMenu key="menu" active={active} onClose={closeMenu} />
        )}
      </AnimatePresence>
    </>
  )
}

/* ---------- Peças do header ---------- */

function NavLink({
  id,
  label,
  active,
  hovered,
  onHover,
}: {
  id: SectionId
  label: string
  active: boolean
  hovered: boolean
  onHover: () => void
}) {
  const [text, scramble] = useScramble(label.toUpperCase())
  return (
    <a
      href={`#${id}`}
      aria-current={active ? "location" : undefined}
      onPointerEnter={() => {
        scramble()
        onHover()
      }}
      onFocus={() => {
        scramble()
        onHover()
      }}
      onClick={onAnchor(`#${id}`)}
      className={cn(
        "relative flex h-10 items-center rounded-full px-3 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors duration-300 xl:px-4 xl:text-[12px]",
        menuRing,
        active
          ? "text-foreground"
          : "text-foreground/60 hover:text-foreground",
      )}
    >
      {/* Pílula de hover: desliza de um link para o outro atrás do texto */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            layoutId="jt-nav-hover"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="absolute inset-x-0 inset-y-1.5 rounded-full border border-white/[0.06] bg-white/[0.05]"
          />
        )}
      </AnimatePresence>
      <span aria-hidden className="relative">
        {text}
      </span>
      <span className="sr-only">{label}</span>
      {/* Sinal da seção ativa: desliza entre os links e pousa no filete do header */}
      {active && (
        <motion.span
          layoutId="jt-nav-active"
          aria-hidden
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="bg-red-light absolute inset-x-3 -bottom-3 h-px shadow-[0_0_10px_rgb(255_52_59/0.9)] xl:inset-x-4"
        />
      )}
    </a>
  )
}

/**
 * Botão "Menu": a palavra embaralha no hover (o scramble do nav) e as duas
 * linhas se alinham, como quem vai abrir uma gaveta.
 */
function MenuButton({
  buttonRef,
  open,
  onOpen,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>
  open: boolean
  onOpen: () => void
}) {
  const [text, scramble] = useScramble("MENU")
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      onPointerEnter={scramble}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && scramble()}
      aria-label="Abrir menu"
      aria-haspopup="dialog"
      aria-expanded={open}
      // Só aponta para o menu quando ele existe no DOM
      aria-controls={open ? MENU_ID : undefined}
      className={cn(
        "group/menu text-foreground flex h-10 items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] pr-3.5 pl-4 font-mono text-[12px] tracking-[0.16em] uppercase transition-[border-color,background-color] duration-300 hover:border-white/30 hover:bg-white/[0.08] active:translate-y-px",
        menuRing,
      )}
    >
      <span aria-hidden className="w-[4.6ch] text-left">
        {text}
      </span>
      {/* Duas linhas editoriais no lugar do hambúrguer de três */}
      <span aria-hidden className="flex w-[18px] flex-col gap-[5px]">
        <span className="bg-foreground ease-out-expo h-px w-full transition-[width] duration-500 group-hover/menu:w-2/3" />
        <span className="bg-foreground ease-out-expo h-px w-2/3 self-end transition-[width] duration-500 group-hover/menu:w-full" />
      </span>
    </button>
  )
}
