import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import { WhatsappIcon } from "@/components/brand-icons"
import { cn } from "@/lib/utils"

const variants = {
  /** Vermelho da marca: a ação principal da tela. */
  primary:
    "bg-red-primary text-white shadow-[0_10px_40px_-12px_rgb(229_9_20/0.8)] hover:bg-red-light",
  /** Contorno discreto sobre o escuro. */
  ghost:
    "border border-white/15 bg-white/[0.03] text-foreground backdrop-blur-sm hover:border-white/40 hover:bg-white/[0.06]",
  /** Branco sobre o escuro. */
  light: "bg-foreground text-background hover:bg-white",
  /** Ink sobre a seção clara. */
  dark: "bg-ink text-bone hover:bg-black",
  /** Contorno sobre a seção clara. */
  "ink-ghost": "border border-ink/20 text-ink hover:border-ink/50",
} as const

const iconWrap = {
  primary: "bg-black/20",
  ghost: "bg-white/10",
  light: "bg-black/10",
  dark: "bg-white/10",
  "ink-ghost": "bg-ink/10",
} as const

const sizes = {
  md: "h-11 gap-3 pr-1.5 pl-5 text-sm",
  lg: "h-14 gap-4 pr-2 pl-7 text-base",
} as const

/**
 * Botão-link em pílula. No hover o texto "rola" (sai por cima e entra por
 * baixo) e a seta gira para a diagonal.
 */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  icon = "arrow",
  external,
  className,
  ...rest
}: {
  href: string
  children: ReactNode
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: "arrow" | "whatsapp" | "none"
  /** Abre em nova aba (WhatsApp, LinkedIn...). Padrão: links http. */
  external?: boolean
  className?: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">) {
  const isExternal = external ?? href.startsWith("http")
  const Icon = icon === "whatsapp" ? WhatsappIcon : ArrowUpRight
  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group/btn relative inline-flex shrink-0 items-center rounded-full font-medium whitespace-nowrap transition-[background-color,border-color,box-shadow,transform] duration-300 outline-none select-none focus-visible:ring-3 focus-visible:ring-red-light/60 active:translate-y-px",
        variants[variant],
        sizes[size],
        icon === "none" && (size === "lg" ? "pr-7" : "pr-5"),
        className,
      )}
      {...rest}
    >
      {/* Texto que rola: a cópia de baixo assume no hover */}
      <span className="relative block overflow-hidden">
        <span className="ease-out-expo block transition-transform duration-500 group-hover/btn:-translate-y-full">
          {children}
        </span>
        <span
          aria-hidden
          className="ease-out-expo absolute inset-0 block translate-y-full transition-transform duration-500 group-hover/btn:translate-y-0"
        >
          {children}
        </span>
      </span>
      {/* O nome acessível avisa que sai do site */}
      {icon === "whatsapp" && (
        <span className="sr-only"> (abre o WhatsApp em nova aba)</span>
      )}
      {icon !== "none" && (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            size === "lg" ? "size-10" : "size-8",
            iconWrap[variant],
          )}
        >
          <Icon
            className={cn(
              "ease-out-expo transition-transform duration-500",
              size === "lg" ? "size-[18px]" : "size-4",
              icon === "arrow" && "group-hover/btn:rotate-45",
            )}
          />
        </span>
      )}
    </a>
  )
}
