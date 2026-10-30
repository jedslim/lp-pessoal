"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { animate, motion, useReducedMotion } from "motion/react"
import { ArrowUpRight, Lock } from "lucide-react"
import { AgencyBadge } from "@/components/agency-badge"
import { cn } from "@/lib/utils"

export type Project = {
  name: string
  segment: string
  description: string
  tags: string[]
  /** Print do projeto em public/ (ex.: "/projetos/ferradura.jpg"). */
  image?: string
  /**
   * Navegação exibida ao interagir com o card. Usa o vídeo quando houver;
   * senão, a página inteira capturada rolando.
   */
  preview?: {
    /** Endereço exibido no card durante a navegação. */
    url: string
    /** Gravação de tela: `node scripts/process-video.mjs <arquivo> <nome>`. */
    video?: { mp4: string; webm?: string }
    /** Página inteira: `node scripts/capture-site.mjs <url> <nome>`. */
    scroll?: { src: string; width: number; height: number }
  }
  url?: string
  /** Agência pela qual o projeto foi feito, quando houver. */
  agency?: string
}

/**
 * Card compacto da faixa de projetos. Quando `active`, cresce devagar e a
 * imagem dá lugar à navegação do site como fundo.
 */
export function ProjectTile({
  project,
  active,
  decorative = false,
  bare = false,
  keepVideo = true,
  expand = true,
  className,
}: {
  project: Project
  active: boolean
  /** Cópia visual do loop: não repete o título como heading. */
  decorative?: boolean
  /** Só imagem/vídeo, sem o texto sobreposto (o texto fica fora do card). */
  bare?: boolean
  /** Mantém o vídeo carregado depois de fechar (troca instantânea no desktop).
   * No carrossel do celular é false: libera memória ao passar de projeto. */
  keepVideo?: boolean
  /** Cresce ao ficar ativo (faixa do desktop). No carrossel do celular, não. */
  expand?: boolean
  className?: string
}) {
  const Title = decorative ? "p" : "h3"
  // Montado na primeira interação e mantido depois: as próximas são instantâneas
  const [mounted, setMounted] = useState(false)
  if (active && !mounted) setMounted(true)
  if (!active && mounted && !keepVideo) setMounted(false)
  // A thumb só sai quando o vídeo já está tocando: nada de card preto
  const [videoReady, setVideoReady] = useState(false)
  if (!mounted && videoReady) setVideoReady(false)
  const showVideo = active && (!project.preview?.video || videoReady)

  return (
    <motion.article
      // Mola macia: começa devagar, cresce e assenta sem tranco
      animate={{ scale: active && expand ? 1.25 : 1 }}
      transition={{ type: "spring", stiffness: 55, damping: 18, mass: 1.1 }}
      className={cn(
        "bg-background-secondary relative aspect-[16/11] w-[360px] shrink-0 overflow-hidden rounded-2xl border sm:w-[456px] lg:w-[504px]",
        "transition-[box-shadow,border-color] duration-1000 ease-in-out",
        active
          ? "border-red-primary/50 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.95),0_0_80px_-24px_rgb(229_9_20/0.55)]"
          : "border-border",
        className,
      )}
    >
      {/* Fundo: mockup → navegação */}
      {project.image ? (
        <Image
          src={project.image}
          alt={`Projeto ${project.name}`}
          fill
          draggable={false}
          // Card grande: até 880px no desktop (64vw), 72vw no celular
          sizes="(min-width: 768px) min(64vw, 880px), 72vw"
          quality={90}
          className={cn(
            "object-cover transition-[transform,opacity] duration-[1400ms] ease-in-out",
            showVideo && project.preview ? "scale-105 opacity-0" : "scale-100",
          )}
        />
      ) : (
        <ProjectPlaceholder name={project.name} />
      )}

      {project.preview && mounted && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-in-out",
            showVideo ? "opacity-100" : "opacity-0",
          )}
        >
          {project.preview.video ? (
            <VideoCapture
              video={project.preview.video}
              playing={active}
              onReady={setVideoReady}
            />
          ) : project.preview.scroll && active ? (
            <ScrollCapture
              scroll={project.preview.scroll}
              name={project.name}
            />
          ) : null}

          <span className="bg-background/70 text-foreground/80 absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] backdrop-blur-md md:top-4 md:right-4 md:px-3 md:py-1 md:text-xs">
            <Lock className="size-2.5" />
            {new URL(project.preview.url).host}
          </span>
        </div>
      )}

      {/* Texto sobre degradê */}
      {!bare && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pt-16 pb-4 md:px-7 md:pt-24 md:pb-6">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.1em] uppercase md:text-xs">
            <span className="text-red-light font-medium">
              {project.segment}
            </span>
            {project.agency && (
              <AgencyBadge agency={project.agency} className="h-3 md:h-4" />
            )}
          </div>
          <Title className="mt-1 text-lg font-semibold tracking-tight md:mt-2 md:text-3xl">
            {project.name}
          </Title>

          {/* Detalhes revelados ao interagir */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-1000 ease-in-out",
              active
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <p className="text-foreground/75 mt-1.5 line-clamp-2 max-w-2xl text-[11px] leading-snug md:mt-3 md:text-base md:leading-relaxed">
                {project.description}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 md:mt-4">
                <ul className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 4).map((tag) => (
                    <li
                      key={tag}
                      className="bg-surface/80 text-foreground/80 rounded px-1.5 py-0.5 text-[9px] md:px-2.5 md:py-1 md:text-xs"
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
                    tabIndex={active ? 0 : -1}
                    className="text-red-light hover:text-foreground pointer-events-auto inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium md:gap-1 md:text-sm transition-colors"
                  >
                    Ver projeto
                    <ArrowUpRight className="size-3 md:size-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  )
}

/* ---------- Navegação ---------- */

const Shimmer = () => (
  <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_30%,rgb(255_255_255/0.04)_50%,transparent_70%)] bg-[length:200%_100%]" />
)

/** Gravação de tela: toca do início ao abrir e pausa ao fechar. */
function VideoCapture({
  video,
  playing,
  onReady,
}: {
  video: NonNullable<NonNullable<Project["preview"]>["video"]>
  playing: boolean
  /** Avisa quando o vídeo começa a tocar de fato (e quando para). */
  onReady: (ready: boolean) => void
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (playing) {
      // O React nem sempre reflete `muted` no DOM; sem ele o autoplay é bloqueado
      el.muted = true
      el.currentTime = 0
      el.play().catch(() => {})
    } else {
      el.pause()
      onReady(false)
    }
  }, [playing, onReady])

  return (
    <div className="absolute inset-0">
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="auto"
        // "playing" = já tem quadro na tela; aí a thumb pode sair
        onPlaying={() => onReady(true)}
        onWaiting={() => onReady(false)}
        className="absolute inset-0 size-full object-cover object-top"
      >
        {video.webm && <source src={video.webm} type="video/webm" />}
        <source src={video.mp4} type="video/mp4" />
      </video>
    </div>
  )
}

/** Paradas da rolagem (fração da página) — imitam alguém lendo seção a seção. */
const STOPS = [0.12, 0.26, 0.42, 0.58, 0.74, 0.88, 1]
const PX_PER_SECOND = 650
const DWELL = 900

/** Página inteira capturada, rolando sozinha. */
function ScrollCapture({
  scroll,
  name,
}: {
  scroll: NonNullable<NonNullable<Project["preview"]>["scroll"]>
  name: string
}) {
  const reduceMotion = useReducedMotion()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = viewportRef.current
    if (!el || !loaded || reduceMotion) return

    let cancelled = false
    let stop: (() => void) | undefined
    const scrollTo = (to: number, duration: number) =>
      new Promise<void>((resolve) => {
        const controls = animate(el.scrollTop, to, {
          duration,
          ease: "easeInOut",
          onUpdate: (v) => (el.scrollTop = v),
          onComplete: resolve,
        })
        stop = () => controls.stop()
      })
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms)
        stop = () => clearTimeout(id)
      })

    const run = async () => {
      await wait(500)
      while (!cancelled) {
        const max = el.scrollHeight - el.clientHeight
        for (const stopAt of STOPS) {
          if (cancelled) return
          const to = max * stopAt
          await scrollTo(to, Math.abs(to - el.scrollTop) / PX_PER_SECOND)
          if (cancelled) return
          await wait(DWELL)
        }
        await wait(800)
        if (!cancelled) await scrollTo(0, 1.2)
        await wait(DWELL)
      }
    }
    run()

    return () => {
      cancelled = true
      stop?.()
    }
  }, [loaded, reduceMotion])

  return (
    <div
      ref={viewportRef}
      className="bg-background absolute inset-0 overflow-hidden"
    >
      <Image
        src={scroll.src}
        alt={`Navegação pelo site ${name}`}
        width={scroll.width}
        height={scroll.height}
        sizes="640px"
        onLoad={() => setLoaded(true)}
        className="block h-auto w-full"
      />
      {!loaded && <Shimmer />}
    </div>
  )
}

/* ---------- Visual provisório ---------- */

function ProjectPlaceholder({ name }: { name: string }) {
  return (
    <div className="bg-background absolute inset-0">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="bg-red-dark/50 absolute -top-1/4 -right-1/4 size-[70%] rounded-full blur-[70px]"
      />
      <div className="border-border/80 bg-background-secondary/80 absolute inset-x-[10%] top-[14%] bottom-0 rounded-t-xl border border-b-0 backdrop-blur-sm">
        <div className="border-border/80 flex items-center gap-1.5 border-b px-3 py-2">
          <span className="size-1.5 rounded-full bg-white/10" />
          <span className="size-1.5 rounded-full bg-white/10" />
          <span className="size-1.5 rounded-full bg-white/10" />
        </div>
        <div className="space-y-2 p-4">
          <div className="bg-red-primary/80 h-1.5 w-10 rounded-full" />
          <p className="pt-2 text-lg font-semibold tracking-tight">{name}</p>
          <div className="h-1.5 w-2/3 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  )
}
