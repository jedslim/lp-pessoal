import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { StackKeyboard } from "@/components/stack-keyboard"

/**
 * Stack (#stack): o stack do dia a dia como um teclado mecânico. Cada tecla é
 * uma ferramenta, cada fileira é uma família, e o visor no lugar da fileira de
 * funções diz para que eu uso cada uma. Dá para digitar no teclado de verdade.
 */
export function StackTable() {
  return (
    <section
      id="stack"
      aria-label="Stack"
      className="relative overflow-x-clip py-20 sm:py-28 lg:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="grid gap-y-8 lg:gap-y-10 xl:grid-cols-12 xl:gap-x-8">
          <div className="xl:col-span-9 xl:row-start-1">
            <SectionLabel label="Stack" />
            <SplitLines
              as="h2"
              lines={["As teclas que", "eu mais aperto."]}
              className="text-display text-h2 mt-8 lg:mt-10"
            />
          </div>
          <div className="xl:col-span-3 xl:col-start-10 xl:row-start-1 xl:self-end xl:pb-h2-base">
            <p className="max-w-[26rem] text-lg leading-relaxed text-pretty text-muted-foreground xl:max-w-none">
              Cada tecla é uma ferramenta que eu domino.{" "}
              <span className="text-foreground">
                O visor diz para que eu uso cada uma.
              </span>
            </p>
          </div>
        </header>

        {/* No celular o estojo encosta quase na borda: teclas maiores, nomes inteiros */}
        <div className="-mx-3 mt-14 sm:mx-auto sm:mt-16 sm:max-w-[1180px] lg:mt-20">
          <StackKeyboard />
        </div>
      </div>
    </section>
  )
}
