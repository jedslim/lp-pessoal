/** Logos das agências parceiras; sem logo, mostra o nome. */
const logos: Record<string, { src: string; width: number; height: number }> = {
  "Agência ILI": { src: "/logo-ili.svg", width: 106, height: 27 },
}

/** "via [logo da agência]" nos cards de projeto. */
export function AgencyBadge({
  agency,
  className = "h-3.5",
}: {
  agency: string
  /** Altura da logo (ex.: "h-3.5 md:h-4"). */
  className?: string
}) {
  const logo = logos[agency]
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 normal-case">
      <span className="uppercase">· via</span>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- SVG estático pequeno
        <img
          src={logo.src}
          alt={agency}
          width={logo.width}
          height={logo.height}
          className={`${className} w-auto opacity-80`}
        />
      ) : (
        <span className="uppercase">{agency}</span>
      )}
    </span>
  )
}
