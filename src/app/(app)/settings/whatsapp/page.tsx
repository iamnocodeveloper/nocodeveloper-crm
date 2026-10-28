import { WhatsappWizard } from "@/components/settings/whatsapp-wizard";
import { WhatsappZernioCard } from "@/components/settings/whatsapp-zernio-card";
import { whatsappZernioEnabled } from "@/server/whatsapp/zernio-flag";

export const dynamic = "force-dynamic";

export default function WhatsappSettingsPage() {
  // 031: la tarjeta de Zernio solo existe con WHATSAPP_ZERNIO (ADR-001).
  return (
    <div className="space-y-8">
      <WhatsappWizard />
      {whatsappZernioEnabled() && <WhatsappZernioCard />}
    </div>
  );
}
