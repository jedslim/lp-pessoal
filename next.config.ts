import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // 90 para as thumbs dos projetos, que aparecem grandes
    qualities: [75, 90],
    // Versões otimizadas (WebP) ficam guardadas 7 dias, em vez de 4 horas
    minimumCacheTTL: 604800,
  },
  // Arquivos de public/ não têm hash no nome: cache de 7 dias e, depois disso,
  // o navegador usa o que tem enquanto confere se mudou (sem esperar).
  // Ao trocar um arquivo, use outro nome para quem já visitou ver na hora.
  async headers() {
    const cache = [
      {
        key: "Cache-Control",
        value: "public, max-age=604800, stale-while-revalidate=2592000",
      },
    ]
    return [
      { source: "/projetos/:path*", headers: cache },
      { source: "/processo/:path*", headers: cache },
      { source: "/:file(logo-.*|jed-foto.png|jed-foto-hd.webp)", headers: cache },
    ]
  },
};

export default nextConfig;
