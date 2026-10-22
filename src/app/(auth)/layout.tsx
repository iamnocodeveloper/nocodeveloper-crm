import { ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { getBranding } from "@/server/branding";
import { enabledChannels } from "@/server/channels/enabled";
import { productName } from "@/lib/channels";
import { BrandLogo } from "@/components/brand-mark";

const PUNTOS = [
  { icon: Sparkles, label: "Agente con tu conocimiento" },
  { icon: ShieldCheck, label: "Self-hosted, tus datos" },
  { icon: Smartphone, label: "Móvil + PWA" },
];

/**
 * Entrada de Nocodeveloper: panel obsidiana con rejilla lima y el formulario
 * sobre papel cálido. En el teléfono el panel desaparece y queda la marca
 * compacta encima del formulario; `min-h-dvh` mantiene el formulario dentro
 * del área visible cuando el navegador móvil esconde la barra de direcciones.
 */
export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  const producto = productName([...enabledChannels()]);

  return (
    <main className="min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="nav-dark relative hidden overflow-hidden px-10 py-12 text-foreground lg:flex lg:flex-col">
        <div className="brand-grid absolute inset-0 opacity-20" aria-hidden />
        <div className="brand-glow brand-glow-a" aria-hidden />
        <div className="brand-glow brand-glow-b" aria-hidden />

        <div className="relative flex items-center justify-between gap-6">
          <BrandLogo branding={branding} />
          <span className="kicker text-text-3">Open source · MIT</span>
        </div>

        <div className="relative mt-auto max-w-xl">
          <p className="kicker mb-5 text-brand">CRM · WhatsApp · IA</p>
          <h1 className="font-serif text-[clamp(3rem,5.2vw,4.9rem)] font-normal italic leading-[0.95] tracking-[-0.045em]">
            El CRM que{" "}
            <span className="text-brand">se prueba solo.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-2">
            Bandeja en tiempo real, pipeline, un agente con el conocimiento de
            tu negocio y un Laboratorio que mide si de verdad está listo. En tu
            servidor, con tus datos y también en el teléfono.
          </p>

          <div className="mt-9 flex flex-wrap gap-2.5">
            {PUNTOS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-subtle/60 px-3.5 py-2 text-[12px] font-semibold text-text-2"
              >
                <Icon className="h-3.5 w-3.5 text-brand" strokeWidth={1.8} />
                {label}
              </span>
            ))}
          </div>

        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 text-center lg:hidden">
            <BrandLogo branding={branding} size="lg" />
            <p className="text-sm text-text-3">{producto} con agente de IA</p>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
