"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion, type PanInfo } from "motion/react"
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { ProjectTile, type Project } from "@/components/project-card"
import { AgencyBadge } from "@/components/agency-badge"
import { cn } from "@/lib/utils"

/** Distância entre um card e o próximo, em % da largura do card. */
const STEP = 104
/** Quanto arrastar (px) para passar de projeto. */
const SWIPE = 50
/** Tempo em cada projeto antes de passar sozinho (ms). */
const AUTOPLAY = 4200
/** Mola da passagem de um card para o outro: rápida e sem tranco. */
const SLIDE = {
  type: "spring",
  stiffness: 320,
  damping: 36,
  mass: 0.9,
} as const
/** Espera a passagem assentar antes de carregar o vídeo (ms). */
const SETTLE = 420

/**
 * Carrossel de projetos: um projeto grande no centro e um vizinho de cada lado
 * como prévia. Dá a volta nas pontas e navega pelas setas, pelo teclado,
 * arrastando ou clicando na prévia.
 *
 * Com mouse: passa sozinho, devagar; ao passar o mouse, para e o card do
 * centro abre com o vídeo do site. Sem mouse (toque): fica parado e o card do
 * centro já abre tocando.
 */
export function ProjectsCarousel({ projects }: { projects: Project[] }) {
  const total = projects.length
  const [index, setIndex] = useState(0)
  // Índice "assentado": o vídeo só carrega depois que a passagem termina,
  // para não disputar processamento com a animação
  const [settled, setSettled] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setSettled(index), SETTLE)
    return () => clearTimeout(id)
  }, [index])
  const ref = useRef<HTMLDivElement>(null)
  // Só toca (e baixa vídeo) quando o carrossel está na tela
  const [inView, setInView] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hasMouse, setHasMouse] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setHasMouse(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const go = (to: number) => {
    setIndex(((to % total) + total) % total)
  }

  // Passa sozinho com mouse, enquanto visível e sem hover
  const autoplay = hasMouse && inView && !hovered && !reduceMotion
  useEffect(() => {
    if (!autoplay) return
    const id = setTimeout(() => go(index + 1), AUTOPLAY)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go é estável o suficiente
  }, [autoplay, index])

  // Card do centro aberto: com mouse, só no hover; no toque, sempre
  // Com mouse, abre no hover; no toque, o card do centro já toca sozinho
  const open = inView && (hasMouse ? hovered : true)

  // Distância circular até o card central: -1 (esquerda), 0, 1 (direita)...
  const offsetOf = (i: number) => {
    let d = i - index
    if (d > total / 2) d -= total
    if (d < -total / 2) d += total
    return d
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Distância ou um "flick" rápido já passam de projeto
    const { x: dx } = info.offset
    const { x: vx } = info.velocity
    if (dx < -SWIPE || vx < -400) go(index + 1)
    else if (dx > SWIPE || vx > 400) go(index - 1)
  }

  return (
    <div
      ref={ref}
      className="overflow-hidden pb-4"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1)
        if (e.key === "ArrowLeft") go(index - 1)
      }}
    >
      <div className="relative">
        {/* Área do card central; os vizinhos ficam deslocados para os lados */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          // Acompanha o dedo de verdade e volta rápido ao soltar
          dragElastic={0.7}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 520, bounceDamping: 42 }}
          onDragEnd={onDragEnd}
          className="relative mx-auto aspect-[16/10] w-[78vw] max-w-[520px] cursor-grab touch-pan-y active:cursor-grabbing md:aspect-[16/10] md:w-[64vw] md:max-w-[880px]"
          role="region"
          aria-roledescription="carrossel"
          aria-label="Projetos"
        >
          {projects.map((project, i) => {
            const d = offsetOf(i)
            const visible = Math.abs(d) <= 1
            return (
              <motion.div
                key={project.name}
                initial={false}
                animate={{
                  x: `${d * STEP}%`,
                  scale: d === 0 ? 1 : 0.88,
                  opacity: d === 0 ? 1 : visible ? 0.45 : 0,
                }}
                transition={visible ? SLIDE : { duration: 0 }}
                onClick={() => d !== 0 && visible && go(i)}
                aria-hidden={d !== 0}
                className={cn(
                  "absolute inset-0",
                  d === 0 ? "z-10" : "z-0 cursor-pointer",
                  !visible && "pointer-events-none",
                )}
              >
                <ProjectTile
                  project={project}
                  active={open && d === 0 && i === settled}
                  expand={false}
                  decorative={d !== 0}
                  bare
                  keepVideo={false}
                  className="aspect-auto size-full sm:w-full lg:w-full"
                />
              </motion.div>
            )
          })}
        </motion.div>

        {/* Setas sobre as prévias laterais */}
        {[
          {
            dir: -1,
            label: "Projeto anterior",
            icon: ChevronLeft,
            side: "left-3 md:left-8",
          },
          {
            dir: 1,
            label: "Próximo projeto",
            icon: ChevronRight,
            side: "right-3 md:right-8",
          },
        ].map(({ dir, label, icon: Icon, side }) => (
          <button
            key={dir}
            type="button"
            onClick={() => go(index + dir)}
            aria-label={label}
            className={cn(
              "border-border/80 bg-background/70 text-foreground/80 hover:text-foreground hover:border-foreground/30 active:border-red-primary/60 absolute top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-colors md:size-12",
              side,
            )}
          >
            <Icon className="size-5" />
          </button>
        ))}
      </div>

      {/* Informações do projeto do centro, fora do card */}
      <Caption project={projects[index]} />

      <p className="sr-only" aria-live="polite">
        {projects[index].name}
      </p>
    </div>
  )
}

function Caption({ project }: { project: Project }) {
  return (
    <motion.div
      key={project.name}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto mt-6 w-[78vw] max-w-[520px]"
    >
      <div className="flex flex-wrap items-center gap-x-2 text-[11px] tracking-[0.1em] uppercase">
        <span className="text-red-light font-medium">{project.segment}</span>
        {project.agency && (
          <AgencyBadge agency={project.agency} className="h-3.5" />
        )}
      </div>
      <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">
        {project.name}
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {project.description}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="bg-surface text-foreground/80 rounded-md px-2 py-0.5 text-xs"
            >
              {tag}
            </li>
          ))}
        </ul>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-light inline-flex items-center gap-1 text-sm font-medium"
          >
            Ver projeto
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>
    </motion.div>
  )
}
