import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import {
  ProcessLog,
  type BranchCommit,
  type Commit,
} from "@/components/process-log"

/** Os quatro commits do processo, em ordem cronológica. */
const commits: Commit[] = [
  {
    hash: "a1f3c2e",
    type: "feat",
    scope: "entender",
    subject: "negócio, objetivo e quem vai usar.",
    body: "Antes da primeira linha de código, quero entender o problema: o que o negócio precisa, quem vai usar e como vamos saber que deu certo.",
  },
  {
    hash: "7be9d04",
    type: "feat",
    scope: "escolher",
    subject: "a ferramenta que o projeto pede.",
    body: "Next.js, WordPress, um fluxo no n8n ou só uma landing bem-feita: escolho pelo que o projeto precisa hoje e pelo que dá para manter depois.",
  },
  {
    hash: "3c4e11b",
    type: "feat",
    scope: "construir",
    subject: "código limpo, rápido e fácil de manter.",
    body: "Componentes tipados, conteúdo editável, performance medida. A IA acelera o repetitivo; a revisão é minha.",
    // Commit de merge: junta a branch de iteração de volta na main
    merge: ["7be9d04", "b83a6e1"],
  },
  {
    hash: "9d2f8a1",
    type: "release",
    scope: "entregar",
    subject: "no ar e acompanhado de perto.",
    body: "Deploy, ajustes finos e suporte depois do lançamento.",
    refs: ["HEAD -> main", "tag: v1.0.0"],
  },
]

/** Branch de iteração: sai depois do "escolher" e volta no "construir". */
const branch: { name: string; before: number; commits: BranchCommit[] } = {
  name: "feature/construir",
  before: 2,
  commits: [
    { hash: "e41c0a9", type: "feat", message: "componentes" },
    { hash: "5f0b7d2", type: "perf", message: "imagens" },
    { hash: "b83a6e1", type: "fix", message: "ajuste no mobile" },
  ],
}

/**
 * Processo como um `git log --graph`: a linha do grafo é desenhada pela
 * rolagem e cada etapa é um commit que acende quando a linha chega nele.
 */
export function Process() {
  return (
    <section
      id="processo"
      aria-label="Processo"
      className="relative overflow-x-clip py-20 sm:py-28 lg:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <ProcessLog
          commits={commits}
          branch={branch}
          intro={
            <>
              <SectionLabel label="Processo" />
              {/* No desktop a coluna presa tem a largura exata do título */}
              <SplitLines
                as="h2"
                lines={["Da conversa", "ao deploy."]}
                lineClassName="xl:whitespace-nowrap"
                className="text-display text-h2 mt-8 lg:mt-10"
              />
              <p className="text-muted-foreground mt-8 max-w-[34ch] text-lg leading-relaxed text-balance sm:text-xl">
                Você acompanha cada etapa e fala direto com quem escreve o
                código.
              </p>
            </>
          }
        />
      </div>
    </section>
  )
}
