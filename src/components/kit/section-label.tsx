import { cn } from "@/lib/utils"

/**
 * Label de seção: um filete curto e o texto (`──── TRABALHO SELECIONADO`).
 * Sem índice numérico, coerente com o menu.
 */
export function SectionLabel({
  label,
  tone = "dark",
  className,
}: {
  /** Legado: o número da seção não é mais exibido (pode continuar passando). */
  index?: string
  label: string
  /** "light" para a seção clara (bone). */
  tone?: "dark" | "light"
  className?: string
}) {
  const light = tone === "light"
  return (
    <p
      className={cn(
        "text-label flex items-center gap-3",
        light ? "text-ink-muted" : "text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-px w-8 shrink-0 sm:w-12",
          light ? "bg-red-primary/70" : "bg-red-light/70",
        )}
      />
      <span>{label}</span>
    </p>
  )
}
