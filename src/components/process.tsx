import { ButtonLink } from "@/components/kit/button-link"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { ProcessSteps, type Step } from "@/components/process-steps"
import { site } from "@/lib/site"

/** As quatro etapas, na linguagem de quem contrata. */
const steps: Step[] = [
  {
    label: "Conversa",
    title: "Entendo o seu negócio.",
    body: "Antes de tudo, quero saber o que você vende, para quem e o que o site precisa resolver. Assim combinamos prazo e investimento sem surpresa.",
    gets: ["Conversa sem compromisso", "Proposta com prazo e valor"],
  },
  {
    label: "Plano",
    title: "A solução certa para o seu caso.",
    body: "Site, loja, sistema ou automação: indico o que faz sentido hoje e o que vai ser fácil de cuidar depois. Você não paga por complexidade que não vai usar.",
    gets: ["Escopo bem definido", "Estrutura das páginas", "Mapa do site"],
  },
  {
    label: "Criação",
    title: "Você vê o projeto ganhando forma.",
    body: "Mando versões em andamento para você testar no celular e no computador, e ajusto com o seu retorno até ficar do jeito certo.",
    gets: ["Link para testar", "Ajustes com o seu retorno"],
  },
  {
    label: "Lançamento",
    title: "No ar e bem cuidado.",
    body: "Coloco o site no ar no seu domínio, rápido e pronto para aparecer no Google. E sigo por perto depois da entrega.",
    gets: ["Site publicado", "Suporte depois da entrega"],
  },
]

/** Processo em quatro etapas, ligadas por uma linha que a rolagem desenha. */
export function Process() {
  return (
    <section
      id="processo"
      aria-label="Processo"
      className="relative overflow-x-clip py-20 sm:py-28 lg:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <ProcessSteps
          steps={steps}
          branchBefore={2}
          intro={
            <>
              <SectionLabel label="Processo" />
              {/* No desktop a coluna presa tem a largura exata do título */}
              <SplitLines
                as="h2"
                lines={["Da conversa", "ao site no ar."]}
                lineClassName="xl:whitespace-nowrap"
                className="text-display text-h2 mt-8 lg:mt-10"
              />
              <p className="text-muted-foreground mt-8 max-w-[34ch] text-lg leading-relaxed text-balance sm:text-xl">
                Você acompanha cada etapa e fala direto comigo, sem
                intermediário.
              </p>
            </>
          }
          outro={
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
              <ButtonLink href={site.whatsappProject} icon="whatsapp" size="lg">
                Começar pela conversa
              </ButtonLink>
              <p className="text-muted-foreground text-sm">
                A mensagem já vai escrita no WhatsApp.
              </p>
            </div>
          }
        />
      </div>
    </section>
  )
}
