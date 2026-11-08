import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { accentCssVariables, DEFAULT_BRANDING } from "@/lib/branding";
import { faviconHref } from "@/lib/favicon";
import { normalizeThemePreference, THEME_COOKIE } from "@/lib/theme";
import { getBranding } from "@/server/branding";
import { enabledChannels } from "@/server/channels/enabled";
import { productName } from "@/lib/channels";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

// Las tres voces de Nocodeveloper, dentro del repo (`./fonts`, subconjunto
// latino, licencia OFL en `fonts/licencias/`). Antes next/font las bajaba de
// Google en cada BUILD y un hipo de esa red tumbaba el despliegue (mismo
// arreglo que Vocero 2.6.1); así ni el build ni el runtime salen a internet.
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--font-sans",
  display: "swap",
});
const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fraunces-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/fraunces-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: false,
});

export const dynamic = "force-dynamic";

/**
 * `viewport-fit=cover` + las franjas `env(safe-area-inset-*)` son lo que hace
 * que la PWA instalada no meta la barra superior bajo la muesca ni el menú
 * inferior bajo el gesto de inicio del iPhone.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0C0A",
};

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  const producto = productName([...enabledChannels()]);
  return {
    title: `${branding.name} — ${producto}`,
    description: `${producto} con agente de IA y Laboratorio de auto-evaluación`,
    applicationName: branding.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: branding.name,
      statusBarStyle: "black-translucent",
    },
    formatDetection: { telephone: false },
    // El `?v=` cambia con la marca: los navegadores guardan el favicon con una
    // insistencia notable y, sin eso, el logo nuevo tarda días en aparecer.
    icons: {
      icon: faviconHref(branding),
      apple: "/apple-touch-icon.png",
      shortcut: "/pwa-192.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  const theme = normalizeThemePreference(
    (await cookies()).get(THEME_COOKIE)?.value
  );
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
      // La preferencia siempre es explícita: el tema viaja resuelto en el HTML
      // del servidor, así que no hay divergencia con el cliente ni parpadeo.
      data-theme={theme}
    >
      <head>
        {/* iOS anterior a 16.4 no lee `display: standalone` del manifest: sin
            este meta, «Añadir a pantalla de inicio» abre con barra de Safari. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Acento white-label inyectado en SSR: sin flash de tema */}
        <style
          dangerouslySetInnerHTML={{ __html: accentCssVariables(branding.accent) }}
        />
      </head>
      <body className="font-sans">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
