"use client"

import { useRef, type ReactNode } from "react"
import { ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { site } from "@/lib/site"

const UPDATED_AT = "outubro de 2026"

/** Cláusula numerada, no mesmo índice mono do resto do site. */
function Section({
  n,
  title,
  children,
}: {
  n: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-x-5 gap-y-2 sm:grid-cols-[2rem_1fr]">
      <span
        aria-hidden
        className="text-red-light pt-0.5 font-mono text-[11px] tabular-nums"
      >
        {n}
      </span>
      <div className="space-y-2">
        <h3 className="text-foreground text-[15px] font-semibold">{title}</h3>
        <div className="text-muted-foreground space-y-2 leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  )
}

const link = "text-red-light hover:text-foreground underline underline-offset-4"

export function PrivacyDialog({
  className,
  children = "Política de privacidade",
}: {
  className?: string
  /** Conteúdo do gatilho (ex.: o rótulo com scramble do rodapé). */
  children?: ReactNode
}) {
  // Foco inicial no corpo do texto: sem isso o foco cai no 1º link (cláusula
  // 04) e, no celular, a política abre rolada pela metade
  const body = useRef<HTMLDivElement>(null)

  return (
    <Dialog>
      <DialogTrigger className={className}>{children}</DialogTrigger>

      <DialogContent
        initialFocus={body}
        className="flex max-h-[85svh] flex-col gap-0 overflow-hidden rounded-2xl border border-white/[0.09] bg-[rgb(11_11_13/0.96)] p-0 shadow-[0_50px_120px_-30px_rgb(0_0_0/0.95)] ring-0 backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader className="border-b border-white/[0.07] p-6 pr-14 sm:p-8 sm:pr-16">
          <div className="text-label text-muted-foreground mb-3 flex items-center gap-3">
            <ShieldCheck className="text-red-light size-4" />
            <span>LGPD</span>
            <span aria-hidden className="h-px w-10 bg-white/10" />
            <span>Lei 13.709/2018</span>
          </div>
          <DialogTitle className="text-display text-[clamp(1.6rem,4vw,2.25rem)] leading-[0.95]">
            Política de privacidade
          </DialogTitle>
          <DialogDescription className="mt-1 font-mono text-[11px] tracking-[0.06em]">
            Última atualização: {UPDATED_AT}
          </DialogDescription>
        </DialogHeader>

        {/* data-lenis-prevent: a roda do mouse rola o texto, não a página */}
        <div
          ref={body}
          tabIndex={-1}
          data-lenis-prevent
          className="space-y-7 overflow-y-auto overscroll-contain p-6 text-sm outline-none sm:p-8"
        >
          <p className="text-muted-foreground leading-relaxed">
            Esta política explica como este site trata informações pessoais, em
            conformidade com a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018, a LGPD).
          </p>

          <Section n="01" title="Quem é o responsável">
            <p>
              Este site é mantido por {site.name}, desenvolvedor full stack,
              responsável pelo tratamento dos dados descritos aqui.
            </p>
          </Section>

          <Section n="02" title="Quais dados são coletados">
            <p>
              Este site <strong className="text-foreground">não possui formulários</strong>{" "}
              e não solicita nem armazena dados pessoais como nome, e-mail ou
              telefone. A navegação é anônima.
            </p>
          </Section>

          <Section n="03" title="Cookies e rastreamento">
            <p>
              Este site <strong className="text-foreground">não utiliza cookies</strong>{" "}
              e não usa ferramentas de análise, publicidade ou rastreamento
              (como Google Analytics ou pixels de redes sociais).
            </p>
          </Section>

          <Section n="04" title="Hospedagem">
            <p>
              O site é hospedado na Vercel. Como em qualquer servidor, podem ser
              registrados dados técnicos de acesso (como endereço IP, navegador
              e data/hora) em logs, usados apenas para segurança e
              funcionamento do serviço, conforme a{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                política de privacidade da Vercel
              </a>
              .
            </p>
          </Section>

          <Section n="05" title="Contato pelo WhatsApp e outros canais">
            <p>
              Ao entrar em contato pelo WhatsApp, LinkedIn ou GitHub, você
              compartilha seus dados diretamente nessas plataformas, que têm
              políticas próprias. As informações que você enviar são usadas
              somente para responder ao seu contato e conduzir uma eventual
              negociação, e não são vendidas nem compartilhadas com terceiros.
            </p>
          </Section>

          <Section n="06" title="Links externos">
            <p>
              O site contém links para outros sites (como os projetos do
              portfólio). Ao acessá-los, valem as políticas de privacidade de
              cada um.
            </p>
          </Section>

          <Section n="07" title="Seus direitos">
            <p>
              Pela LGPD, você pode solicitar a confirmação, o acesso, a correção
              ou a exclusão de dados pessoais que tenha compartilhado comigo,
              entre outros direitos previstos no art. 18 da lei.
            </p>
          </Section>

          <Section n="08" title="Como falar comigo">
            <p>
              Para dúvidas ou solicitações sobre privacidade, fale comigo pelo{" "}
              <a
                href={site.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                WhatsApp ({site.phone})
              </a>
              {site.email && (
                <>
                  {" "}
                  ou pelo e-mail{" "}
                  <a href={`mailto:${site.email}`} className={link}>
                    {site.email}
                  </a>
                </>
              )}
              .
            </p>
          </Section>

          <Section n="09" title="Alterações">
            <p>
              Esta política pode ser atualizada. Se o site passar a coletar
              dados ou usar cookies, ela será revisada e, quando necessário,
              será solicitado o seu consentimento.
            </p>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
