import { WhatsappWizard } from "@/components/settings/whatsapp-wizard";
import { WhatsappZernioCard } from "@/components/settings/whatsapp-zernio-card";
import { whatsappZernioEnabled } from "@/server/whatsapp/zernio-flag";
import { saasModeEnabled } from "@/server/saas/mode";

export const dynamic = "force-dynamic";

export default function WhatsappSettingsPage() {
  const saas = saasModeEnabled();
  // 031: la tarjeta de Zernio solo existe con WHATSAPP_ZERNIO (ADR-001).
  // K7: en el SaaS el negocio conecta con un clic por la plataforma; el
  // asistente técnico de Meta (WABA ID, Phone Number ID, token) no se enseña.
  return (
    <div className="space-y-8">
      {!(saas && whatsappZernioEnabled()) && <WhatsappWizard />}
      {whatsappZernioEnabled() && <WhatsappZernioCard manual={!saas} />}
    </div>
  );
}
