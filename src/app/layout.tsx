import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/kit/motion-provider";
import { site } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display expandida (eixo wdth até 125%): conversa com o logo JEDTEC
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Acento editorial: no máximo três palavras no site inteiro
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  // Sem preload: a hero não usa mais serifa (só a seção Sobre, abaixo da dobra)
  preload: false,
});

export const metadata: Metadata = {
  // Base para URLs absolutas (canonical, og:image, sitemap)
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  applicationName: "JEDTEC",
  authors: [{ name: site.name, url: site.linkedin }],
  creator: site.name,
  keywords: [
    "desenvolvedor full stack",
    "desenvolvedor Next.js",
    "desenvolvedor React",
    "desenvolvedor WordPress",
    "WordPress headless",
    "ACF",
    "integrações e APIs",
    "automação com IA",
    "n8n",
    "landing page",
    "Jedson Santos",
    "JEDTEC",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "JEDTEC",
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
