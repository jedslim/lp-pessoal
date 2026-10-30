"use client"

import { useState } from "react"
import { AboutConfig, type AboutLink } from "@/components/about-config"

/** O jedson.config.ts na abertura do portfólio (as linhas acendem no hover). */
export function PortfolioEditor({ className }: { className?: string }) {
  const [link, setLink] = useState<AboutLink | null>(null)
  return <AboutConfig active={link} onLink={setLink} className={className} />
}
