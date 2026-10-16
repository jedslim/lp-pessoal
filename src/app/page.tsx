import { About } from "@/components/about"
import { AmbientLight } from "@/components/ambient-light"
import { Capabilities } from "@/components/capabilities"
import { ConsoleGreeting } from "@/components/console-greeting"
import { CursorCompanion } from "@/components/cursor-companion"
import { Contact } from "@/components/contact"
import { Hero } from "@/components/hero"
import { Process } from "@/components/process"
import { ProofBand } from "@/components/proof-band"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { SmoothScroll } from "@/components/smooth-scroll"
import { StackTable } from "@/components/stack-table"
import { Work } from "@/components/work"
import { projects } from "@/lib/projects"
import { stack } from "@/lib/stack"
import { site } from "@/lib/site"

/** Dados estruturados (schema.org) para o Google entender quem é o site. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  url: site.url,
  image: `${site.url}/jed-foto.png`,
  jobTitle: "Desenvolvedor Full Stack",
  description: site.description,
  brand: { "@type": "Brand", name: "JEDTEC" },
  knowsAbout: [
    "Desenvolvimento web",
    "WordPress headless",
    "Integrações de APIs",
    "Automação",
    "Inteligência Artificial",
    ...stack.map((tool) => tool.name),
  ],
  hasOccupation: {
    "@type": "Occupation",
    name: "Desenvolvedor Full Stack",
    skills: stack.map((tool) => tool.name).join(", "),
  },
  workExample: projects
    .filter((p) => p.url)
    .map((p) => ({ "@type": "WebSite", name: p.name, url: p.url })),
  sameAs: [site.linkedin, site.github],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SmoothScroll />
      <AmbientLight />
      <ConsoleGreeting />
      <SiteHeader />
      <main className="relative">
        <Hero />
        <ProofBand />
        <Work />
        <Capabilities />
        <StackTable />
        <Process />
        <About />
        <Contact />
      </main>
      <SiteFooter />
      {/* O cursor de vidro do Blender visitando as seções (desktop com mouse e GPU) */}
      <CursorCompanion />
    </>
  )
}
