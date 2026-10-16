"use client"

import { useEffect, useRef, type ReactNode } from "react"
import type { MotionValue } from "motion/react"
import { Lock } from "lucide-react"
import type { Project } from "@/lib/projects"
import { cn } from "@/lib/utils"

/** Primeiro quadro do vídeo (0,35 s, depois do aviso do gravador): o poster
 * casa com o início da gravação, sem "pulo" quando o vídeo começa. */
export const posterOf = (p: Project) => `/projetos/${p.slug}-poster.webp`

/** Proporção das gravações de tela (1200×594). */
export const VIDEO_ASPECT = "aspect-[1200/594]"

/** Até onde vale a gravação de 640px (`video.small`). */
const SMALL = "(max-width: 767px)"

/* ---------- Moldura de navegador ---------- */

const bar = {
  sm: { h: "h-7 px-2.5 gap-2", dot: "size-[7px]", url: "h-[18px] px-2 text-[10px]" },
  md: { h: "h-9 px-3.5 gap-3 sm:h-10", dot: "size-2.5", url: "h-6 px-3 text-[11px]" },
} as const

/** Barra do navegador: três bolinhas, endereço com cadeado e um slot à direita. */
export function BrowserBar({
  host,
  size = "md",
  right,
  className,
}: {
  host: ReactNode
  size?: keyof typeof bar
  right?: ReactNode
  className?: string
}) {
  const s = bar[size]
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center border-b border-white/[0.07] bg-[#0e0e11]",
        s.h,
        className,
      )}
    >
      <span aria-hidden className="flex shrink-0 gap-1.5">
        <span className={cn("rounded-full bg-white/[0.14]", s.dot)} />
        <span className={cn("rounded-full bg-white/[0.14]", s.dot)} />
        <span className={cn("rounded-full bg-white/[0.14]", s.dot)} />
      </span>
      {/* Endereço centralizado na barra, como no Safari */}
      <span className="pointer-events-none absolute inset-x-0 flex justify-center">
        <span
          className={cn(
            "flex max-w-[62%] items-center gap-1.5 rounded-full bg-white/[0.05] font-mono text-white/55",
            s.url,
          )}
        >
          <Lock aria-hidden className="size-[0.85em] shrink-0" />
          <span className="truncate">{host}</span>
        </span>
      </span>
      {right && <span className="relative ml-auto flex items-center">{right}</span>}
    </div>
  )
}

/* ---------- Vídeo do projeto ---------- */

/**
 * Gravação de tela do site rodando. Não carrega nada até `playing` ligar
 * (preload="none"; o poster segura a tela até lá). `progress` recebe a
 * fração tocada (0–1) a cada quadro, para a régua de tempo.
 */
export function ProjectVideo({
  project,
  playing,
  progress,
  label,
  className,
  onTime,
  poster = true,
}: {
  project: Project
  playing: boolean
  progress?: MotionValue<number>
  /** Rótulo acessível; sem ele o vídeo é decorativo. */
  label?: string
  className?: string
  /** Tempo atual e duração (s), a cada quadro, para o timecode. */
  onTime?: (current: number, duration: number) => void
  /** false: segura o poster (nem baixa) até o vídeo chegar perto da tela. */
  poster?: boolean
}) {
  const small = project.video.small
  const ref = useRef<HTMLVideoElement>(null)
  // Callback em ref: o loop de quadros não reinicia a cada render do pai
  const onTimeRef = useRef(onTime)
  useEffect(() => {
    onTimeRef.current = onTime
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (playing) {
      // O React nem sempre reflete `muted` no DOM; sem ele o autoplay é bloqueado
      el.muted = true
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [playing])

  // Régua e timecode: rAF só enquanto toca
  useEffect(() => {
    if (!playing || (!progress && !onTimeRef.current)) return
    let id = 0
    const tick = () => {
      const el = ref.current
      if (el && el.duration) {
        progress?.set(el.currentTime / el.duration)
        onTimeRef.current?.(el.currentTime, el.duration)
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, progress])

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={poster ? posterOf(project) : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block size-full object-cover object-top", className)}
    >
      {/* Celular: a versão de 640px (o navegador escolhe a primeira fonte que serve) */}
      {small && (
        <source media={SMALL} src={small.webm} type="video/webm" />
      )}
      {small?.mp4 && <source media={SMALL} src={small.mp4} type="video/mp4" />}
      <source src={project.video.webm} type="video/webm" />
      <source src={project.video.mp4} type="video/mp4" />
    </video>
  )
}

/* ---------- Agência ---------- */

/** Logos das agências parceiras; sem logo, mostra o nome. */
const agencyLogos: Record<string, { src: string; width: number; height: number }> = {
  "Agência ILI": { src: "/logo-ili.svg", width: 106, height: 27 },
}

/** "via [logo]": projeto feito por meio de uma agência. */
export function Via({
  agency,
  className,
  logoClassName = "h-4",
  prefix = true,
}: {
  agency: string
  className?: string
  logoClassName?: string
  /** Mostra o "via" antes da logo (some quando o rótulo já está ao lado). */
  prefix?: boolean
}) {
  const logo = agencyLogos[agency]
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {prefix && <span className="text-label text-muted-foreground">via</span>}
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- SVG estático pequeno
        <img
          src={logo.src}
          alt={agency}
          width={logo.width}
          height={logo.height}
          loading="lazy"
          className={cn("w-auto opacity-85", logoClassName)}
        />
      ) : (
        <span className="text-label text-foreground/80">{agency}</span>
      )}
    </span>
  )
}

/** Endereço sem "www." (mais limpo nas listas). */
export const shortHost = (host: string) => host.replace(/^www\./, "")

/** Chips de stack em mono. */
export function Tags({ tags, className }: { tags: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-[5px] border border-white/[0.08] bg-surface px-2 py-1 font-mono text-[11px] leading-none text-foreground/75"
        >
          {tag}
        </li>
      ))}
    </ul>
  )
}
