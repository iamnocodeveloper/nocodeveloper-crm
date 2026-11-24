import { LoginForm } from "@/components/auth/login-form";
import { saasModeEnabled, saasSignupClosed, trialDays } from "@/server/saas/mode";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // K7: el aviso de «crea tu cuenta» solo con el registro abierto del SaaS.
  const saas = saasModeEnabled() && !saasSignupClosed();
  return <LoginForm saas={saas} diasPrueba={saas ? trialDays() : 0} />;
}
