import type { Metadata } from "next"
import { AmbientLight } from "@/components/ambient-light"
import { Capabilities } from "@/components/capabilities"
import { CursorCompanion } from "@/components/cursor-companion"
import { PortfolioIntro } from "@/components/portfolio-intro"
import { PortfolioProjects } from "@/components/portfolio-projects"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { SmoothScroll } from "@/components/smooth-scroll"
import { StackTable } from "@/components/stack-table"
import { site } from "@/lib/site"

const title = `Portfólio | ${site.name}`
const description =
  "O lado técnico do trabalho de Jedson Santos: stack, capacidades na prática (web, WordPress, automação e IA) e os projetos no ar."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/portfolio" },
  openGraph: { url: "/portfolio", title, description },
  twitter: { title, description },
}

/** Portfólio: para quem avalia o trabalho técnico (a home fala com quem contrata). */
export default function Portfolio() {
  return (
    <>
      <SmoothScroll />
      <AmbientLight />
      <SiteHeader />
      <main id="conteudo" className="relative">
        <PortfolioIntro />
        <PortfolioProjects />
        <Capabilities />
        <StackTable />
      </main>
      <SiteFooter />
      <CursorCompanion />
    </>
  )
}
