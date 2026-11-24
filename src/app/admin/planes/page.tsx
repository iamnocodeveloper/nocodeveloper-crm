import { listPlans } from "@/server/saas/admin";
import { PageTitle } from "@/components/admin/ui";
import { PlansEditor } from "@/components/admin/plans-editor";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const plans = await listPlans();
  return (
    <>
      <PageTitle
        title="Planes"
        subtitle="Límites de cada plan. El plan por defecto es el que recibe un negocio nuevo. Los cobros con Stripe llegarán después."
      />
      <PlansEditor plans={plans} />
    </>
  );
}
