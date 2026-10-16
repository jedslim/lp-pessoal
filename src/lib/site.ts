const PHONE = "5522988687417"

/** Link do WhatsApp com a mensagem já preenchida. */
function whatsapp(message: string) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`
}

/** Links e contatos usados no site. */
export const site = {
  name: "Jedson Santos",
  /** Domínio de produção (sem barra no final). */
  url: "https://jedtec.com.br",
  title: "Jedson Santos | Desenvolvedor Full Stack | JEDTEC",
  description:
    "Jedson Santos, desenvolvedor full stack. Sites, sistemas e automações com Next.js, React, WordPress e IA aplicada. Mais de 4 anos e 80+ projetos no ar.",
  // Enquanto for null, o e-mail não aparece no site.
  email: null as string | null,
  phone: "+55 22 98868-7417",
  linkedin: "https://www.linkedin.com/in/jedson-santos-05a0381a1/",
  github: "https://github.com/jedslim",
  /** CTA geral, com mensagem já preenchida. */
  whatsapp: whatsapp("Oi, Jedson! Vim pelo seu site e queria conversar."),
  /** Caminhos do contato: cada um abre a conversa com a mensagem certa. */
  whatsappProject: whatsapp(
    "Oi, Jedson! Vim pelo seu site e tenho um projeto para conversar.",
  ),
  whatsappJob: whatsapp(
    "Oi, Jedson! Vim pelo seu site e tenho uma oportunidade de trabalho para você.",
  ),
  // Coloque o PDF em public/ e informe o caminho (ex.: "/curriculo-jedson-santos.pdf").
  // Enquanto for null, o botão "Baixar currículo" não aparece.
  resume: null as string | null,
}
