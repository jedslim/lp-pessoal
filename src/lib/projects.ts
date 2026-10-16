/** Projeto da seção "Trabalho". Copy revisada: só fatos que temos. */
export type Project = {
  slug: string
  name: string
  segment: string
  /** O que foi feito, em poucas palavras (aparece no índice). */
  scope: string
  description: string
  tags: string[]
  /** Mockup do projeto em public/ (16:9, com tipografia própria do mockup). */
  image: string
  /** Gravação de tela do site rodando: `node scripts/process-video.mjs <arquivo> <nome>`.
   * `small`: versão de 640px para celular (só onde o vídeo toca sozinho). */
  video: { webm: string; mp4: string; small?: { webm: string; mp4?: string } }
  /** Endereço exibido na moldura de navegador. */
  host: string
  /** Link público, quando o cliente permite. */
  url?: string
  /** Agência pela qual o projeto foi feito, quando houver. */
  agency?: string
  /** Projeto em destaque no topo da seção. */
  featured?: boolean
  /** No destaque: a palavra que resume o trabalho e vira a peça tipográfica grande. */
  keyword?: string
}

const media = (slug: string) => ({
  image: `/projetos/${slug}.jpg`,
  video: { webm: `/projetos/${slug}.webm`, mp4: `/projetos/${slug}.mp4` },
})

export const projects: Project[] = [
  {
    slug: "eztec",
    name: "EZTEC",
    segment: "Mercado imobiliário",
    scope: "Front em Next.js + WordPress headless",
    description:
      "Portal imobiliário com lançamentos, obras em andamento e imóveis prontos. Front-end em Next.js consumindo WordPress headless pela REST API, com todo o conteúdo editável via ACF.",
    tags: ["Next.js", "React", "WordPress headless", "ACF", "REST API"],
    ...media("eztec"),
    video: {
      ...media("eztec").video,
      small: { webm: "/projetos/eztec-m.webm", mp4: "/projetos/eztec-m.mp4" },
    },
    host: "www.eztec.com.br",
    url: "https://www.eztec.com.br/",
    agency: "Agência ILI",
    featured: true,
    keyword: "Headless",
  },
  {
    slug: "banijay",
    name: "Banijay Studios",
    segment: "Audiovisual",
    scope: "Implementação técnica",
    description:
      "Site de estúdios de produção audiovisual, em WordPress. Minha parte foi a implementação técnica, com foco na experiência de navegação.",
    tags: ["WordPress", "PHP", "JavaScript"],
    ...media("banijay"),
    host: "banijayestudios.com.br",
    url: "https://banijayestudios.com.br/",
    agency: "Agência ILI",
  },
  {
    slug: "afabrica",
    name: "A Fábrica",
    segment: "Audiovisual",
    scope: "Vitrine, catálogo e notícias",
    description:
      "Site de produtora de filmes e séries, com vitrine de projetos, catálogo e notícias gerenciados no WordPress.",
    tags: ["WordPress", "PHP", "JavaScript"],
    ...media("afabrica"),
    host: "afabrica.etc.br",
    url: "https://afabrica.etc.br/",
    agency: "Agência ILI",
  },
  {
    slug: "intex",
    name: "Intex Bank",
    segment: "Câmbio & Finanças",
    scope: "Páginas de produto + área de conteúdo",
    description:
      "Site de banco de câmbio para empresas, com páginas de câmbio comercial, hedge e remessas internacionais, e uma área de conteúdo própria.",
    tags: ["WordPress", "PHP", "JavaScript"],
    ...media("intex"),
    host: "intexbank.com.br",
    url: "https://intexbank.com.br/",
    agency: "Agência ILI",
  },
  {
    slug: "verso",
    name: "Verso Investimentos",
    segment: "Mercado financeiro",
    scope: "Site institucional",
    description:
      "Site institucional em WordPress que apresenta os serviços de uma empresa do mercado financeiro.",
    tags: ["WordPress"],
    ...media("verso"),
    host: "versoinvestimentos.com.br",
    url: "https://versoinvestimentos.com.br/",
    agency: "Agência ILI",
  },
  {
    slug: "s-dot",
    name: "S-Dot",
    segment: "Design & Embalagens",
    scope: "Portfólio de cases no WordPress",
    description:
      "Site de agência de design de marcas e embalagens, com portfólio de cases gerenciado pelo WordPress.",
    tags: ["WordPress", "PHP", "JavaScript"],
    ...media("s-dot"),
    host: "s-dot.com.br",
    url: "https://s-dot.com.br/",
    agency: "Agência ILI",
  },
  {
    slug: "ferradura",
    name: "Ferradura Resort",
    segment: "Hotelaria & Turismo",
    scope: "Arquitetura de conteúdo + integrações",
    description:
      "Site de resort com acomodações, gastronomia, lazer e eventos, mais a consulta de disponibilidade integrada.",
    tags: ["WordPress", "PHP", "ACF", "APIs"],
    ...media("ferradura"),
    host: "ferradurahotel.com.br/resort",
  },
  {
    slug: "ferradura-private",
    name: "Ferradura Private",
    segment: "Hotelaria boutique",
    scope: "Site + reserva integrada",
    description:
      "Site de hotel boutique com suítes, pacotes e casamentos, identidade própria e reserva feita sem sair do site.",
    tags: ["WordPress", "PHP", "ACF", "APIs"],
    ...media("ferradura-private"),
    host: "ferradurahotel.com.br/ferradura-private",
  },
  {
    slug: "vans-mil",
    name: "Vans Mil",
    segment: "Transporte",
    scope: "Desenvolvimento e evolução contínua",
    description:
      "Plataforma de empresa de transporte que sigo evoluindo: novas funcionalidades, melhorias de usabilidade e SEO.",
    tags: ["WordPress", "PHP", "JavaScript", "SEO"],
    ...media("vans-mil"),
    host: "vansmil.com.br",
    url: "https://vansmil.com.br/",
  },
  {
    slug: "victoria-teles",
    name: "Chef Victoria Teles",
    segment: "Gastronomia",
    scope: "Landing page",
    description:
      "Landing page de consultoria gastronômica, pensada para levar o visitante direto à conversa no WhatsApp.",
    tags: ["Landing page", "SEO", "Conversão"],
    ...media("victoria-teles"),
    host: "porvictoriateles.com.br",
    url: "https://porvictoriateles.com.br/",
  },
]

/** Nomes dos projetos, na ordem da seção Trabalho. */
export const clientNames = projects.map((p) => p.name)
